const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { put } = require('@vercel/blob');
const multer = require('multer');
const { authenticateToken } = require('../middleware/auth');
const { requireRole, canAccessLightMatter } = require('../middleware/rbac');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

const INELIGIBLE_FOR_CONVERSION = ['tax', 'immigration', 'bench'];

async function generateMatterRef(sql) {
  const year = new Date().getFullYear();
  const countRows = await sql`SELECT COUNT(*) as c FROM matters`;
  const count = Number(countRows[0].c);
  return `M-${year}-${String(count + 1).padStart(4, '0')}`;
}

module.exports = function (sql) {
  const router = express.Router();

  // POST /api/matters — create matter directly (advocate/partner or client)
  router.post('/', authenticateToken, requireRole('managing_partner', 'advisor', 'senior_advocate', 'junior_advocate', 'client'), async (req, res) => {
    const { client_id, user_id: bodyUserId, matter_type, title, brief, vertical_data, consultation_id, bench_booking_id, advocate_user_id } = req.body;
    const { user_id, role } = req.user;

    if (!matter_type || !title) return res.status(400).json({ error: 'matter_type and title are required' });

    const validTypes = ['corporate', 'tax', 'immigration', 'criminal', 'civil', 'family', 'real_estate', 'bench'];
    if (!validTypes.includes(matter_type)) return res.status(400).json({ error: 'Invalid matter_type' });

    try {
      let resolvedClientId = client_id;
      let resolvedUserId = bodyUserId || user_id;

      if (role === 'client') {
        const clientRows = await sql`SELECT client_id FROM clients WHERE user_id = ${user_id}`;
        if (clientRows.length === 0) return res.status(400).json({ error: 'Client profile not found' });
        resolvedClientId = clientRows[0].client_id;
        resolvedUserId = user_id;
      } else if (!resolvedClientId) {
        return res.status(400).json({ error: 'client_id is required' });
      }

      const matter_id = uuidv4();
      const matter_ref = await generateMatterRef(sql);

      await sql`
        INSERT INTO matters (matter_id, matter_ref, client_id, user_id, matter_type, title, status, brief, vertical_data, consultation_id, bench_booking_id, created_by)
        VALUES (${matter_id}, ${matter_ref}, ${resolvedClientId}, ${resolvedUserId || null}, ${matter_type}, ${title}, 'open',
                ${brief || null}, ${vertical_data ? JSON.stringify(vertical_data) : null},
                ${consultation_id || null}, ${bench_booking_id || null}, ${user_id})
      `;

      if (advocate_user_id) {
        await sql`INSERT INTO matter_advocates (id, matter_id, advocate_id) VALUES (${uuidv4()}, ${matter_id}, ${advocate_user_id})`;
      }

      res.status(201).json({ matter_id, matter_ref });
    } catch (err) {
      console.error('[POST /matters]', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/matters — list matters visible to caller
  router.get('/', authenticateToken, async (req, res) => {
    const { role, user_id } = req.user;
    try {
      let rows;
      if (role === 'managing_partner' || role === 'advisor') {
        rows = await sql`
          SELECT m.*, c.full_name as client_name,
            (SELECT u.full_name FROM matter_advocates ma JOIN users u ON ma.advocate_id = u.user_id WHERE ma.matter_id = m.matter_id LIMIT 1) as advocate_name
          FROM matters m LEFT JOIN clients c ON m.client_id = c.client_id
          ORDER BY m.created_at DESC
        `;
      } else if (role === 'senior_advocate' || role === 'junior_advocate' || role === 'judge') {
        rows = await sql`
          SELECT m.*, c.full_name as client_name, u.full_name as advocate_name
          FROM matters m
          JOIN matter_advocates ma ON m.matter_id = ma.matter_id
          JOIN users u ON ma.advocate_id = u.user_id
          LEFT JOIN clients c ON m.client_id = c.client_id
          WHERE ma.advocate_id = ${user_id}
          ORDER BY m.created_at DESC
        `;
      } else if (role === 'client') {
        rows = await sql`
          SELECT m.*, c.full_name as client_name,
            (SELECT u.full_name FROM matter_advocates ma JOIN users u ON ma.advocate_id = u.user_id WHERE ma.matter_id = m.matter_id LIMIT 1) as advocate_name
          FROM matters m LEFT JOIN clients c ON m.client_id = c.client_id
          WHERE m.user_id = ${user_id}
          ORDER BY m.created_at DESC
        `;
      } else {
        return res.status(403).json({ error: 'Forbidden' });
      }
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/matters/:id
  router.get('/:id', authenticateToken, async (req, res) => {
    try {
      if (!(await canAccessLightMatter(sql, req.user, req.params.id))) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      const rows = await sql`
        SELECT m.*, c.full_name as client_name, c.email as client_email, c.phone as client_phone
        FROM matters m LEFT JOIN clients c ON m.client_id = c.client_id
        WHERE m.matter_id = ${req.params.id}
      `;
      if (rows.length === 0) return res.status(404).json({ error: 'Matter not found' });

      const advocates = await sql`
        SELECT u.user_id, u.full_name, u.email, u.role, ma.access_granted_at
        FROM matter_advocates ma JOIN users u ON ma.advocate_id = u.user_id
        WHERE ma.matter_id = ${req.params.id}
      `;

      const unreadRows = await sql`
        SELECT COUNT(*) as c FROM matter_messages
        WHERE matter_id = ${req.params.id} AND sender_id != ${req.user.user_id} AND is_read = 0
      `;

      res.json({ ...rows[0], advocates, unread_count: Number(unreadRows[0].c) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/matters/:id/advocates — grant an advocate access to this matter
  router.post('/:id/advocates', authenticateToken, requireRole('managing_partner', 'advisor'), async (req, res) => {
    try {
      const { advocate_id } = req.body;
      if (!advocate_id) return res.status(400).json({ error: 'advocate_id is required' });

      const matterRows = await sql`SELECT matter_id FROM matters WHERE matter_id = ${req.params.id}`;
      if (matterRows.length === 0) return res.status(404).json({ error: 'Matter not found' });

      const userRows = await sql`SELECT user_id, full_name, role FROM users WHERE user_id = ${advocate_id}`;
      if (userRows.length === 0) return res.status(404).json({ error: 'User not found' });
      if (!['senior_advocate', 'junior_advocate', 'managing_partner', 'advisor', 'judge'].includes(userRows[0].role)) {
        return res.status(400).json({ error: 'User is not an advocate or judge' });
      }

      const existing = await sql`SELECT id FROM matter_advocates WHERE matter_id = ${req.params.id} AND advocate_id = ${advocate_id}`;
      if (existing.length > 0) return res.status(409).json({ error: 'Already has access to this matter' });

      await sql`INSERT INTO matter_advocates (id, matter_id, advocate_id) VALUES (${uuidv4()}, ${req.params.id}, ${advocate_id})`;

      res.status(201).json({ user_id: userRows[0].user_id, full_name: userRows[0].full_name, role: userRows[0].role });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/matters/:id/advocates/:advocateId — revoke an advocate's access
  router.delete('/:id/advocates/:advocateId', authenticateToken, requireRole('managing_partner', 'advisor'), async (req, res) => {
    try {
      const rows = await sql`
        DELETE FROM matter_advocates WHERE matter_id = ${req.params.id} AND advocate_id = ${req.params.advocateId}
        RETURNING id
      `;
      if (rows.length === 0) return res.status(404).json({ error: 'Advocate not found on this matter' });
      res.json({ message: 'Advocate removed' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // PATCH /api/matters/:id
  router.patch('/:id', authenticateToken, async (req, res) => {
    try {
      if (!(await canAccessLightMatter(sql, req.user, req.params.id))) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      if (req.user.role === 'judge') {
        const typeRows = await sql`SELECT matter_type FROM matters WHERE matter_id = ${req.params.id}`;
        if (typeRows.length === 0 || typeRows[0].matter_type !== 'bench') {
          return res.status(403).json({ error: 'Forbidden' });
        }
      }

      const allowed = ['title', 'brief', 'status', 'vertical_data'];
      const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
      const sets = [];
      const vals = [];

      for (const field of allowed) {
        if (req.body[field] !== undefined) {
          if (field === 'status' && !validStatuses.includes(req.body[field])) {
            return res.status(400).json({ error: 'Invalid status' });
          }
          const val = field === 'vertical_data' ? JSON.stringify(req.body[field]) : req.body[field];
          sets.push(`${field} = $${sets.length + 1}`);
          vals.push(val);
        }
      }

      if (sets.length === 0) return res.status(400).json({ error: 'No valid fields' });
      sets.push('updated_at = NOW()');
      vals.push(req.params.id);

      const rows = await sql(`UPDATE matters SET ${sets.join(', ')} WHERE matter_id = $${vals.length} RETURNING matter_id`, vals);
      if (rows.length === 0) return res.status(404).json({ error: 'Matter not found' });

      res.json({ message: 'Matter updated' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/matters/:id/convert-to-case — advocate/partner only; eligible types only
  router.post('/:id/convert-to-case', authenticateToken, requireRole('managing_partner', 'advisor', 'senior_advocate', 'junior_advocate'), async (req, res) => {
    try {
      if (!(await canAccessLightMatter(sql, req.user, req.params.id))) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const mRows = await sql`SELECT * FROM matters WHERE matter_id = ${req.params.id}`;
      if (mRows.length === 0) return res.status(404).json({ error: 'Matter not found' });
      const matter = mRows[0];

      if (INELIGIBLE_FOR_CONVERSION.includes(matter.matter_type)) {
        return res.status(400).json({ error: `${matter.matter_type} matters cannot be converted to cases` });
      }
      if (matter.case_id) {
        return res.status(400).json({ error: 'Matter already linked to a case' });
      }

      const { court_name, opposing_party, urgency } = req.body;

      const case_id = uuidv4();
      const year = new Date().getFullYear();
      const countRows = await sql`SELECT COUNT(*) as c FROM cases`;
      const count = Number(countRows[0].c);
      const matter_number = `CC-${year}-${String(count + 1).padStart(4, '0')}`;

      await sql`
        INSERT INTO cases (matter_id, matter_number, client_id, matter_type, title, description, status, court_name, opposing_party, urgency)
        VALUES (${case_id}, ${matter_number}, ${matter.client_id}, ${matter.matter_type}, ${matter.title},
                ${matter.brief || null}, 'intake', ${court_name || null}, ${opposing_party || null}, ${urgency || 'standard'})
      `;

      await sql`UPDATE matters SET case_id = ${case_id}, updated_at = NOW() WHERE matter_id = ${req.params.id}`;

      // Preserve advocate access on the new case — without this, advocates
      // linked via matter_advocates lose all access once the matter converts.
      const matterAdvocates = await sql`
        SELECT ma.advocate_id, u.role FROM matter_advocates ma
        JOIN users u ON ma.advocate_id = u.user_id
        WHERE ma.matter_id = ${req.params.id}
      `;
      for (const ma of matterAdvocates) {
        const role_on_matter = ma.role === 'junior_advocate' ? 'junior' : 'lead_senior';
        await sql`
          INSERT INTO matter_assignments (assignment_id, matter_id, advocate_id, role_on_matter, assigned_by)
          VALUES (${uuidv4()}, ${case_id}, ${ma.advocate_id}, ${role_on_matter}, ${req.user.user_id})
        `;
      }

      res.status(201).json({ case_id, matter_number });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Notes ──────────────────────────────────────────────────────────────

  router.get('/:id/notes', authenticateToken, async (req, res) => {
    try {
      if (!(await canAccessLightMatter(sql, req.user, req.params.id))) return res.status(403).json({ error: 'Forbidden' });

      const { role, user_id } = req.user;
      let notes;
      if (role === 'client') {
        notes = await sql`
          SELECT n.*, u.full_name as author_name FROM matter_notes n
          JOIN users u ON n.author_id = u.user_id
          WHERE n.matter_id = ${req.params.id} AND n.is_private = 0
          ORDER BY n.created_at ASC
        `;
      } else {
        notes = await sql`
          SELECT n.*, u.full_name as author_name FROM matter_notes n
          JOIN users u ON n.author_id = u.user_id
          WHERE n.matter_id = ${req.params.id} AND (n.is_private = 0 OR n.author_id = ${user_id})
          ORDER BY n.created_at ASC
        `;
      }
      res.json(notes);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/:id/notes', authenticateToken, async (req, res) => {
    try {
      if (!(await canAccessLightMatter(sql, req.user, req.params.id))) return res.status(403).json({ error: 'Forbidden' });

      const { content, is_private } = req.body;
      if (!content?.trim()) return res.status(400).json({ error: 'content is required' });

      const { role, user_id } = req.user;
      const privateFlag = role === 'client' ? 0 : (is_private ? 1 : 0);

      const note_id = uuidv4();
      await sql`
        INSERT INTO matter_notes (note_id, matter_id, author_id, content, is_private)
        VALUES (${note_id}, ${req.params.id}, ${user_id}, ${content.trim()}, ${privateFlag})
      `;

      res.status(201).json({ note_id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.patch('/:id/notes/:noteId', authenticateToken, async (req, res) => {
    try {
      if (!(await canAccessLightMatter(sql, req.user, req.params.id))) return res.status(403).json({ error: 'Forbidden' });

      const { content } = req.body;
      if (!content?.trim()) return res.status(400).json({ error: 'content is required' });

      const rows = await sql`
        UPDATE matter_notes SET content = ${content.trim()}, updated_at = NOW()
        WHERE note_id = ${req.params.noteId} AND author_id = ${req.user.user_id}
        RETURNING note_id
      `;
      if (rows.length === 0) return res.status(404).json({ error: 'Note not found or not yours' });

      res.json({ message: 'Note updated' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.delete('/:id/notes/:noteId', authenticateToken, async (req, res) => {
    try {
      if (!(await canAccessLightMatter(sql, req.user, req.params.id))) return res.status(403).json({ error: 'Forbidden' });

      const rows = await sql`
        DELETE FROM matter_notes WHERE note_id = ${req.params.noteId} AND author_id = ${req.user.user_id} RETURNING note_id
      `;
      if (rows.length === 0) return res.status(404).json({ error: 'Note not found or not yours' });

      res.json({ message: 'Note deleted' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Documents ──────────────────────────────────────────────────────────

  router.get('/:id/documents', authenticateToken, async (req, res) => {
    try {
      if (!(await canAccessLightMatter(sql, req.user, req.params.id))) return res.status(403).json({ error: 'Forbidden' });

      const docs = await sql`
        SELECT d.*, u.full_name as uploader_name FROM matter_documents d
        JOIN users u ON d.uploader_id = u.user_id
        WHERE d.matter_id = ${req.params.id}
        ORDER BY d.created_at DESC
      `;
      res.json(docs);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/:id/documents', authenticateToken, upload.single('file'), async (req, res) => {
    try {
      if (!(await canAccessLightMatter(sql, req.user, req.params.id))) return res.status(403).json({ error: 'Forbidden' });
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

      const { originalname, buffer, size } = req.file;
      const blobName = `matters/${req.params.id}/${Date.now()}_${originalname}`;

      const blob = await put(blobName, buffer, { access: 'public' });

      const doc_id = uuidv4();
      await sql`
        INSERT INTO matter_documents (doc_id, matter_id, uploader_id, filename, blob_url, size_bytes)
        VALUES (${doc_id}, ${req.params.id}, ${req.user.user_id}, ${originalname}, ${blob.url}, ${size})
      `;

      res.status(201).json({ doc_id, filename: originalname, blob_url: blob.url, size_bytes: size });
    } catch (err) {
      console.error('[POST /matters/:id/documents]', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  router.delete('/:id/documents/:docId', authenticateToken, async (req, res) => {
    try {
      if (!(await canAccessLightMatter(sql, req.user, req.params.id))) return res.status(403).json({ error: 'Forbidden' });

      const { role, user_id } = req.user;
      let rows;
      if (role === 'managing_partner' || role === 'advisor') {
        rows = await sql`DELETE FROM matter_documents WHERE doc_id = ${req.params.docId} AND matter_id = ${req.params.id} RETURNING doc_id`;
      } else {
        rows = await sql`DELETE FROM matter_documents WHERE doc_id = ${req.params.docId} AND matter_id = ${req.params.id} AND uploader_id = ${user_id} RETURNING doc_id`;
      }
      if (rows.length === 0) return res.status(404).json({ error: 'Document not found or not yours' });

      res.json({ message: 'Document deleted' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Messages (chat) ─────────────────────────────────────────────────────

  router.get('/:id/messages', authenticateToken, async (req, res) => {
    try {
      if (!(await canAccessLightMatter(sql, req.user, req.params.id))) return res.status(403).json({ error: 'Forbidden' });

      const msgs = await sql`
        SELECT mm.*, u.full_name as sender_name, u.role as sender_role FROM matter_messages mm
        JOIN users u ON mm.sender_id = u.user_id
        WHERE mm.matter_id = ${req.params.id}
        ORDER BY mm.created_at ASC
      `;

      await sql`
        UPDATE matter_messages SET is_read = 1
        WHERE matter_id = ${req.params.id} AND sender_id != ${req.user.user_id} AND is_read = 0
      `;

      res.json(msgs);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/:id/messages', authenticateToken, async (req, res) => {
    try {
      if (!(await canAccessLightMatter(sql, req.user, req.params.id))) return res.status(403).json({ error: 'Forbidden' });

      const { content } = req.body;
      if (!content?.trim()) return res.status(400).json({ error: 'content is required' });

      const message_id = uuidv4();
      await sql`
        INSERT INTO matter_messages (message_id, matter_id, sender_id, content)
        VALUES (${message_id}, ${req.params.id}, ${req.user.user_id}, ${content.trim()})
      `;

      res.status(201).json({ message_id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
