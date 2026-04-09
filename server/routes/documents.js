const express = require('express');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/auth');
const { canAccessMatter } = require('../middleware/rbac');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed. Supported: PDF, JPG, PNG, DOCX'));
    }
  },
});

module.exports = function (db) {
  const router = express.Router();

  // GET /api/matters/:matterId/documents
  router.get('/matter/:matterId', authenticateToken, (req, res) => {
    const matterId = req.params.matterId;
    if (!canAccessMatter(db, req.user, matterId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    let docs;
    if (req.user.role === 'client') {
      docs = db.prepare(`
        SELECT d.*, u.full_name as uploader_name FROM documents d
        JOIN users u ON d.uploaded_by = u.user_id
        WHERE d.matter_id = ? AND d.is_client_visible = 1
        ORDER BY d.uploaded_at DESC
      `).all(matterId);
    } else if (req.user.role === 'billing' || req.user.role === 'reception') {
      return res.status(403).json({ error: 'Document access not permitted for your role' });
    } else {
      docs = db.prepare(`
        SELECT d.*, u.full_name as uploader_name FROM documents d
        JOIN users u ON d.uploaded_by = u.user_id
        WHERE d.matter_id = ?
        ORDER BY d.uploaded_at DESC
      `).all(matterId);
    }

    res.json(docs);
  });

  // GET /api/documents/my — All documents for current client
  router.get('/my', authenticateToken, (req, res) => {
    let docs;
    if (req.user.role === 'client') {
      docs = db.prepare(`
        SELECT d.*, u.full_name as uploader_name, m.matter_number, m.title as matter_title
        FROM documents d
        JOIN users u ON d.uploaded_by = u.user_id
        JOIN matters m ON d.matter_id = m.matter_id
        JOIN clients c ON m.client_id = c.client_id
        WHERE c.user_id = ? AND d.is_client_visible = 1
        ORDER BY d.uploaded_at DESC
      `).all(req.user.user_id);
    } else {
      docs = db.prepare(`
        SELECT d.*, u.full_name as uploader_name, m.matter_number, m.title as matter_title
        FROM documents d
        JOIN users u ON d.uploaded_by = u.user_id
        JOIN matters m ON d.matter_id = m.matter_id
        ORDER BY d.uploaded_at DESC
      `).all();
    }
    res.json(docs);
  });

  // POST /api/documents/upload
  router.post('/upload', authenticateToken, upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const { matter_id } = req.body;
    if (!matter_id) return res.status(400).json({ error: 'matter_id is required' });

    if (!canAccessMatter(db, req.user, matter_id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const document_id = uuidv4();
    const ext = path.extname(req.file.originalname).slice(1);

    db.prepare(`
      INSERT INTO documents (document_id, matter_id, uploaded_by, filename, stored_path, file_type, file_size_bytes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(document_id, matter_id, req.user.user_id, req.file.originalname, req.file.path, ext, req.file.size);

    db.prepare(`INSERT INTO audit_logs (log_id, actor_id, action, resource_type, resource_id, ip_address) VALUES (?,?,?,?,?,?)`)
      .run(uuidv4(), req.user.user_id, 'UPLOAD_DOC', 'document', document_id, req.ip);

    res.status(201).json({ document_id, filename: req.file.originalname, size: req.file.size });
  });

  // GET /api/documents/:id/download
  router.get('/:id/download', authenticateToken, (req, res) => {
    const doc = db.prepare('SELECT * FROM documents WHERE document_id = ?').get(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    if (!canAccessMatter(db, req.user, doc.matter_id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (req.user.role === 'client' && !doc.is_client_visible) {
      return res.status(403).json({ error: 'Document not available' });
    }

    db.prepare(`INSERT INTO audit_logs (log_id, actor_id, action, resource_type, resource_id, ip_address) VALUES (?,?,?,?,?,?)`)
      .run(uuidv4(), req.user.user_id, 'DOWNLOAD_DOC', 'document', doc.document_id, req.ip);

    res.download(doc.stored_path, doc.filename);
  });

  return router;
};
