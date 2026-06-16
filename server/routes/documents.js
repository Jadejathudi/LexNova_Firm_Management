const express = require('express');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const { put, del } = require('@vercel/blob');
const { authenticateToken } = require('../middleware/auth');
const { canAccessMatter } = require('../middleware/rbac');

const CAN_UPLOAD_ROLES = ['managing_partner', 'advisor', 'senior_advocate', 'junior_advocate'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    allowed.includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error('File type not allowed. Supported: PDF, JPG, PNG, DOCX'));
  },
});

module.exports = function (sql) {
  const router = express.Router();

  // GET /api/documents/matter/:matterId
  router.get('/matter/:matterId', authenticateToken, async (req, res) => {
    const matterId = req.params.matterId;
    try {
      if (!(await canAccessMatter(sql, req.user, matterId))) return res.status(403).json({ error: 'Forbidden' });
      if (req.user.role === 'billing' || req.user.role === 'reception') {
        return res.status(403).json({ error: 'Document access not permitted for your role' });
      }

      const docs = req.user.role === 'client'
        ? await sql`
            SELECT d.document_id, d.matter_id, d.filename, d.stored_path, d.file_type, d.file_size_bytes, d.uploaded_at, d.is_client_visible
            FROM documents d
            WHERE d.matter_id = ${matterId} AND d.is_client_visible = 1 AND d.stored_path LIKE 'http%'
            ORDER BY d.uploaded_at DESC
          `
        : await sql`
            SELECT d.document_id, d.matter_id, d.filename, d.stored_path, d.file_type, d.file_size_bytes, d.uploaded_at, d.is_client_visible
            FROM documents d
            WHERE d.matter_id = ${matterId} AND d.stored_path LIKE 'http%'
            ORDER BY d.uploaded_at DESC
          `;

      res.json(docs);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/documents/my
  router.get('/my', authenticateToken, async (req, res) => {
    try {
      const docs = req.user.role === 'client'
        ? await sql`
            SELECT d.document_id, d.matter_id, d.filename, d.stored_path, d.file_type, d.file_size_bytes, d.uploaded_at,
                   m.matter_number, m.title as matter_title
            FROM documents d
            JOIN cases m ON d.matter_id = m.matter_id
            JOIN clients c ON m.client_id = c.client_id
            WHERE c.user_id = ${req.user.user_id} AND d.is_client_visible = 1 AND d.stored_path LIKE 'http%'
            ORDER BY d.uploaded_at DESC
          `
        : await sql`
            SELECT d.document_id, d.matter_id, d.filename, d.stored_path, d.file_type, d.file_size_bytes, d.uploaded_at,
                   m.matter_number, m.title as matter_title
            FROM documents d
            JOIN cases m ON d.matter_id = m.matter_id
            WHERE d.stored_path LIKE 'http%'
            ORDER BY d.uploaded_at DESC
          `;

      res.json(docs);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/documents/upload
  router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    if (!CAN_UPLOAD_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Only advocates and managing partners can upload documents' });
    }

    const { matter_id, is_client_visible } = req.body;
    if (!matter_id) return res.status(400).json({ error: 'matter_id is required' });

    try {
      if (!(await canAccessMatter(sql, req.user, matter_id))) return res.status(403).json({ error: 'Forbidden' });

      const document_id = uuidv4();
      const safeName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      const blobPath = `documents/${document_id}/${safeName}`;

      const blob = await put(blobPath, req.file.buffer, {
        access: 'public',
        contentType: req.file.mimetype,
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });

      const ext = req.file.originalname.split('.').pop().toLowerCase();
      const clientVisible = is_client_visible === '0' || is_client_visible === 'false' ? 0 : 1;

      await sql`
        INSERT INTO documents (document_id, matter_id, uploaded_by, filename, stored_path, file_type, file_size_bytes, is_client_visible)
        VALUES (${document_id}, ${matter_id}, ${req.user.user_id}, ${req.file.originalname}, ${blob.url}, ${ext}, ${req.file.size}, ${clientVisible})
      `;

      await sql`
        INSERT INTO audit_logs (log_id, actor_id, action, resource_type, resource_id, ip_address)
        VALUES (${uuidv4()}, ${req.user.user_id}, 'UPLOAD_DOC', 'document', ${document_id}, ${req.ip})
      `;

      res.status(201).json({ document_id, filename: req.file.originalname, size: req.file.size, url: blob.url });
    } catch (err) {
      console.error('Upload error:', err);
      res.status(500).json({ error: err.message || 'Upload failed' });
    }
  });

  // GET /api/documents/:id/download — logs access then redirects to blob URL
  router.get('/:id/download', authenticateToken, async (req, res) => {
    try {
      const rows = await sql`SELECT * FROM documents WHERE document_id = ${req.params.id}`;
      if (rows.length === 0) return res.status(404).json({ error: 'Document not found' });
      const doc = rows[0];

      if (!(await canAccessMatter(sql, req.user, doc.matter_id))) return res.status(403).json({ error: 'Forbidden' });
      if (req.user.role === 'client' && !doc.is_client_visible) return res.status(403).json({ error: 'Document not available' });

      await sql`
        INSERT INTO audit_logs (log_id, actor_id, action, resource_type, resource_id, ip_address)
        VALUES (${uuidv4()}, ${req.user.user_id}, 'DOWNLOAD_DOC', 'document', ${doc.document_id}, ${req.ip})
      `;

      res.redirect(doc.stored_path);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/documents/:id
  router.delete('/:id', authenticateToken, async (req, res) => {
    try {
      const rows = await sql`SELECT * FROM documents WHERE document_id = ${req.params.id}`;
      if (rows.length === 0) return res.status(404).json({ error: 'Document not found' });
      const doc = rows[0];

      const canDelete =
        req.user.role === 'managing_partner' ||
        req.user.role === 'advisor' ||
        req.user.user_id === doc.uploaded_by;
      if (!canDelete) return res.status(403).json({ error: 'You do not have permission to delete this document' });

      try {
        await del(doc.stored_path, { token: process.env.BLOB_READ_WRITE_TOKEN });
      } catch (blobErr) {
        console.warn('Blob delete warning (continuing):', blobErr.message);
      }

      await sql`DELETE FROM documents WHERE document_id = ${req.params.id}`;
      await sql`
        INSERT INTO audit_logs (log_id, actor_id, action, resource_type, resource_id, ip_address)
        VALUES (${uuidv4()}, ${req.user.user_id}, 'DELETE_DOC', 'document', ${req.params.id}, ${req.ip})
      `;

      res.json({ message: 'Document deleted' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
