const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const DB_PATH = path.join(__dirname, 'lexnova.db');

function setup() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      user_id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('managing_partner','senior_advocate','junior_advocate','billing','reception','client','advisor')),
      password_hash TEXT NOT NULL,
      mfa_enabled INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      last_login TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS clients (
      client_id TEXT PRIMARY KEY,
      user_id TEXT,
      full_name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      address TEXT,
      client_type TEXT CHECK(client_type IN ('individual','corporate','hnwi')),
      onboarded_by TEXT,
      referral_source TEXT,
      kyc_verified INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(user_id),
      FOREIGN KEY (onboarded_by) REFERENCES users(user_id)
    );

    CREATE TABLE IF NOT EXISTS matters (
      matter_id TEXT PRIMARY KEY,
      matter_number TEXT UNIQUE NOT NULL,
      client_id TEXT NOT NULL,
      matter_type TEXT NOT NULL CHECK(matter_type IN ('criminal','civil','corporate','family','real_estate','arbitration')),
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL CHECK(status IN ('intake','active','hearing_pending','awaiting_docs','judgment','closed')),
      court_name TEXT,
      opposing_party TEXT,
      conflict_checked INTEGER DEFAULT 0,
      conflict_checked_by TEXT,
      urgency TEXT DEFAULT 'standard' CHECK(urgency IN ('standard','urgent','critical')),
      created_at TEXT DEFAULT (datetime('now')),
      closed_at TEXT,
      FOREIGN KEY (client_id) REFERENCES clients(client_id),
      FOREIGN KEY (conflict_checked_by) REFERENCES users(user_id)
    );

    CREATE TABLE IF NOT EXISTS matter_assignments (
      assignment_id TEXT PRIMARY KEY,
      matter_id TEXT NOT NULL,
      advocate_id TEXT NOT NULL,
      role_on_matter TEXT NOT NULL CHECK(role_on_matter IN ('lead_senior','supporting_senior','junior')),
      assigned_by TEXT,
      assigned_at TEXT DEFAULT (datetime('now')),
      is_active INTEGER DEFAULT 1,
      FOREIGN KEY (matter_id) REFERENCES matters(matter_id),
      FOREIGN KEY (advocate_id) REFERENCES users(user_id),
      FOREIGN KEY (assigned_by) REFERENCES users(user_id)
    );

    CREATE TABLE IF NOT EXISTS hearings (
      hearing_id TEXT PRIMARY KEY,
      matter_id TEXT NOT NULL,
      hearing_date TEXT NOT NULL,
      hearing_time TEXT,
      court_name TEXT NOT NULL,
      courtroom_number TEXT,
      purpose TEXT,
      outcome TEXT,
      next_date TEXT,
      notified_client INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (matter_id) REFERENCES matters(matter_id)
    );

    CREATE TABLE IF NOT EXISTS documents (
      document_id TEXT PRIMARY KEY,
      matter_id TEXT NOT NULL,
      uploaded_by TEXT NOT NULL,
      filename TEXT NOT NULL,
      stored_path TEXT NOT NULL,
      file_type TEXT,
      file_size_bytes INTEGER NOT NULL,
      is_client_visible INTEGER DEFAULT 1,
      uploaded_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (matter_id) REFERENCES matters(matter_id),
      FOREIGN KEY (uploaded_by) REFERENCES users(user_id)
    );

    CREATE TABLE IF NOT EXISTS invoices (
      invoice_id TEXT PRIMARY KEY,
      matter_id TEXT NOT NULL,
      client_id TEXT NOT NULL,
      invoice_number TEXT UNIQUE NOT NULL,
      amount_base REAL NOT NULL,
      gst_amount REAL,
      total_amount REAL NOT NULL,
      billing_type TEXT CHECK(billing_type IN ('per_case','milestone','retainer','flat_fee')),
      status TEXT NOT NULL CHECK(status IN ('draft','sent','paid','overdue','waived')),
      due_date TEXT NOT NULL,
      paid_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (matter_id) REFERENCES matters(matter_id),
      FOREIGN KEY (client_id) REFERENCES clients(client_id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      message_id TEXT PRIMARY KEY,
      matter_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      content TEXT NOT NULL,
      attachment_id TEXT,
      is_read INTEGER DEFAULT 0,
      sent_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (matter_id) REFERENCES matters(matter_id),
      FOREIGN KEY (sender_id) REFERENCES users(user_id),
      FOREIGN KEY (attachment_id) REFERENCES documents(document_id)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      log_id TEXT PRIMARY KEY,
      actor_id TEXT NOT NULL,
      action TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT,
      ip_address TEXT,
      user_agent TEXT,
      timestamp TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (actor_id) REFERENCES users(user_id)
    );

    CREATE TABLE IF NOT EXISTS consultations (
      consultation_id TEXT PRIMARY KEY,
      guest_name TEXT NOT NULL,
      guest_phone TEXT NOT NULL,
      matter_type TEXT NOT NULL,
      description TEXT,
      urgency TEXT DEFAULT 'standard',
      consultation_mode TEXT CHECK(consultation_mode IN ('video','phone','office')),
      preferred_date TEXT,
      preferred_time TEXT,
      status TEXT DEFAULT 'booked' CHECK(status IN ('booked','confirmed','completed','cancelled')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notifications (
      notification_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT,
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(user_id)
    );
  `);

  // Seed data
  const existingUser = db.prepare('SELECT user_id FROM users LIMIT 1').get();
  if (existingUser) {
    console.log('Database already seeded.');
    db.close();
    return;
  }

  const hash = bcrypt.hashSync('password123', 10);

  // Users
  const partnerId = uuidv4();
  const seniorAdv1Id = uuidv4();
  const seniorAdv2Id = uuidv4();
  const juniorAdv1Id = uuidv4();
  const juniorAdv2Id = uuidv4();
  const billingId = uuidv4();
  const receptionId = uuidv4();
  const clientUserId1 = uuidv4();
  const clientUserId2 = uuidv4();
  const advisorId = uuidv4();

  const insertUser = db.prepare(`INSERT INTO users (user_id, full_name, email, phone, role, password_hash) VALUES (?,?,?,?,?,?)`);
  insertUser.run(partnerId, 'Prashanth Kumar', 'prashanth@lexnova.in', '9876543210', 'managing_partner', hash);
  insertUser.run(seniorAdv1Id, 'Adv. Meera Pillai', 'meera@lexnova.in', '9876543211', 'senior_advocate', hash);
  insertUser.run(seniorAdv2Id, 'Adv. Arvind Kumar', 'arvind@lexnova.in', '9876543212', 'senior_advocate', hash);
  insertUser.run(juniorAdv1Id, 'Adv. Suresh Naik', 'suresh@lexnova.in', '9876543213', 'junior_advocate', hash);
  insertUser.run(juniorAdv2Id, 'Adv. Priya Menon', 'priya@lexnova.in', '9876543214', 'junior_advocate', hash);
  insertUser.run(billingId, 'Anita Desai', 'billing@lexnova.in', '9876543215', 'billing', hash);
  insertUser.run(receptionId, 'Kavitha Rao', 'reception@lexnova.in', '9876543216', 'reception', hash);
  insertUser.run(clientUserId1, 'Rahul Sharma', 'rahul@example.com', '9876543217', 'client', hash);
  insertUser.run(clientUserId2, 'Sneha Patel', 'sneha@example.com', '9876543218', 'client', hash);
  insertUser.run(advisorId, 'Justice (Retd.) K.N. Rao', 'rao@lexnova.in', '9876543219', 'advisor', hash);

  // Clients
  const client1Id = uuidv4();
  const client2Id = uuidv4();
  const insertClient = db.prepare(`INSERT INTO clients (client_id, user_id, full_name, email, phone, address, client_type, onboarded_by) VALUES (?,?,?,?,?,?,?,?)`);
  insertClient.run(client1Id, clientUserId1, 'Rahul Sharma', 'rahul@example.com', '9876543217', '42 MG Road, Bengaluru 560001', 'individual', seniorAdv1Id);
  insertClient.run(client2Id, clientUserId2, 'Sneha Patel', 'sneha@example.com', '9876543218', '15 Bandra West, Mumbai 400050', 'corporate', seniorAdv2Id);

  // Matters
  const matter1Id = uuidv4();
  const matter2Id = uuidv4();
  const matter3Id = uuidv4();
  const insertMatter = db.prepare(`INSERT INTO matters (matter_id, matter_number, client_id, matter_type, title, description, status, court_name, opposing_party, conflict_checked, urgency) VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
  insertMatter.run(matter1Id, 'LN-2025-0047', client1Id, 'civil', 'Property Dispute — Civil', 'Dispute regarding ownership of plot #42 in Whitefield, Bengaluru. Defendant claims prior possession.', 'hearing_pending', 'District Court, Bengaluru', 'Vikram Reddy', 1, 'urgent');
  insertMatter.run(matter2Id, 'LN-2025-0051', client1Id, 'corporate', 'Employment Contract Review — Corporate', 'Review of employment contract with TechCorp India Pvt Ltd regarding non-compete clause validity.', 'awaiting_docs', null, 'TechCorp India Pvt Ltd', 1, 'standard');
  insertMatter.run(matter3Id, 'LN-2025-0052', client2Id, 'criminal', 'Cheque Bounce Case — Criminal', 'Section 138 NI Act case. Cheque of Rs 15,00,000 returned unpaid.', 'active', 'Metropolitan Magistrate Court, Mumbai', 'Raj Enterprises', 1, 'critical');

  // Matter Assignments
  const insertAssignment = db.prepare(`INSERT INTO matter_assignments (assignment_id, matter_id, advocate_id, role_on_matter, assigned_by) VALUES (?,?,?,?,?)`);
  insertAssignment.run(uuidv4(), matter1Id, seniorAdv1Id, 'lead_senior', partnerId);
  insertAssignment.run(uuidv4(), matter1Id, juniorAdv1Id, 'junior', seniorAdv1Id);
  insertAssignment.run(uuidv4(), matter2Id, seniorAdv1Id, 'lead_senior', partnerId);
  insertAssignment.run(uuidv4(), matter3Id, seniorAdv2Id, 'lead_senior', partnerId);
  insertAssignment.run(uuidv4(), matter3Id, juniorAdv2Id, 'junior', seniorAdv2Id);

  // Hearings
  const insertHearing = db.prepare(`INSERT INTO hearings (hearing_id, matter_id, hearing_date, hearing_time, court_name, courtroom_number, purpose, outcome, next_date, notified_client) VALUES (?,?,?,?,?,?,?,?,?,?)`);
  insertHearing.run(uuidv4(), matter1Id, '2025-01-15', '10:30', 'District Court, Bengaluru', '4A', 'Initial hearing — Date setting', 'Next date set for plaint filing', '2025-02-03', 1);
  insertHearing.run(uuidv4(), matter1Id, '2025-02-03', '11:00', 'District Court, Bengaluru', '4A', 'Plaint filed', 'Plaint accepted. Notice to defendant ordered.', '2025-02-28', 1);
  insertHearing.run(uuidv4(), matter1Id, '2025-02-28', '10:30', 'District Court, Bengaluru', '4A', 'Defendant served notice', 'Defendant acknowledged. Written statement date set.', '2025-03-14', 1);
  insertHearing.run(uuidv4(), matter1Id, '2025-03-14', '10:30', 'District Court, Bengaluru', '4A', 'Written statement hearing', null, null, 1);
  insertHearing.run(uuidv4(), matter3Id, '2025-02-10', '14:00', 'Metropolitan Magistrate Court, Mumbai', '2B', 'Complaint filing', 'Complaint registered. Summons issued.', '2025-03-20', 1);

  // Documents
  const insertDoc = db.prepare(`INSERT INTO documents (document_id, matter_id, uploaded_by, filename, stored_path, file_type, file_size_bytes, is_client_visible) VALUES (?,?,?,?,?,?,?,?)`);
  const doc1Id = uuidv4();
  const doc2Id = uuidv4();
  insertDoc.run(doc1Id, matter1Id, seniorAdv1Id, 'Plaint_Draft_v2.pdf', '/uploads/plaint_draft_v2.pdf', 'pdf', 2400000, 1);
  insertDoc.run(doc2Id, matter1Id, clientUserId1, 'PropertyDeed_Original.pdf', '/uploads/property_deed.pdf', 'pdf', 5300000, 1);
  insertDoc.run(uuidv4(), matter3Id, seniorAdv2Id, 'Cheque_Copy.pdf', '/uploads/cheque_copy.pdf', 'pdf', 1200000, 1);
  insertDoc.run(uuidv4(), matter3Id, clientUserId2, 'Bank_Statement.pdf', '/uploads/bank_statement.pdf', 'pdf', 890000, 1);

  // Invoices
  const insertInvoice = db.prepare(`INSERT INTO invoices (invoice_id, matter_id, client_id, invoice_number, amount_base, gst_amount, total_amount, billing_type, status, due_date, paid_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
  insertInvoice.run(uuidv4(), matter1Id, client1Id, 'INV-2025-0234', 50000, 9000, 59000, 'per_case', 'sent', '2025-03-31', null);
  insertInvoice.run(uuidv4(), matter1Id, client1Id, 'INV-2025-0180', 25000, 4500, 29500, 'milestone', 'paid', '2025-02-15', '2025-02-12');
  insertInvoice.run(uuidv4(), matter3Id, client2Id, 'INV-2025-0240', 75000, 13500, 88500, 'per_case', 'overdue', '2025-03-01', null);
  insertInvoice.run(uuidv4(), matter2Id, client1Id, 'INV-2025-0250', 15000, 2700, 17700, 'flat_fee', 'draft', '2025-04-15', null);

  // Messages
  const insertMsg = db.prepare(`INSERT INTO messages (message_id, matter_id, sender_id, content, is_read, sent_at) VALUES (?,?,?,?,?,?)`);
  insertMsg.run(uuidv4(), matter1Id, seniorAdv1Id, 'The next hearing is on 14 March. Please bring original property deed.', 1, '2025-03-10 10:23:00');
  insertMsg.run(uuidv4(), matter1Id, clientUserId1, 'Understood. I have the original deed. Should I bring any other documents?', 1, '2025-03-10 10:25:00');
  insertMsg.run(uuidv4(), matter1Id, seniorAdv1Id, 'Please also bring the sale agreement and any correspondence with the opposing party.', 0, '2025-03-10 10:30:00');
  insertMsg.run(uuidv4(), matter3Id, seniorAdv2Id, 'We have filed the complaint. Summons will be issued to the accused.', 1, '2025-02-10 15:00:00');
  insertMsg.run(uuidv4(), matter3Id, clientUserId2, 'Thank you. When is the next hearing date?', 0, '2025-02-10 15:15:00');

  // Notifications
  const insertNotif = db.prepare(`INSERT INTO notifications (notification_id, user_id, title, message, type, is_read) VALUES (?,?,?,?,?,?)`);
  insertNotif.run(uuidv4(), clientUserId1, 'Hearing Scheduled', 'Hearing for Matter #LN-2025-0047 on 14 March at District Court, Bengaluru', 'hearing', 0);
  insertNotif.run(uuidv4(), clientUserId1, 'New Message', 'New message from Adv. Meera Pillai regarding Matter #LN-2025-0047', 'message', 0);
  insertNotif.run(uuidv4(), partnerId, 'Overdue Invoice', 'Invoice INV-2025-0240 is overdue by 10 days', 'invoice', 0);
  insertNotif.run(uuidv4(), partnerId, 'No Update Alert', 'Matter #LN-2025-0052 has not been updated in 51 hours', 'alert', 0);

  // Audit log
  const insertAudit = db.prepare(`INSERT INTO audit_logs (log_id, actor_id, action, resource_type, resource_id, ip_address) VALUES (?,?,?,?,?,?)`);
  insertAudit.run(uuidv4(), partnerId, 'VIEW_MATTER', 'matter', matter1Id, '127.0.0.1');
  insertAudit.run(uuidv4(), seniorAdv1Id, 'UPLOAD_DOC', 'document', doc1Id, '127.0.0.1');

  // Guest consultations
  const insertConsult = db.prepare(`INSERT INTO consultations (consultation_id, guest_name, guest_phone, matter_type, description, urgency, consultation_mode, preferred_date, preferred_time, status) VALUES (?,?,?,?,?,?,?,?,?,?)`);
  insertConsult.run(uuidv4(), 'Amit Joshi', '9988776655', 'criminal', 'Need advice regarding an FIR filed against me', 'urgent', 'video', '2025-03-15', '10:00', 'booked');
  insertConsult.run(uuidv4(), 'Priyanka Das', '8877665544', 'family', 'Divorce proceedings guidance needed', 'standard', 'phone', '2025-03-16', '14:00', 'confirmed');

  console.log('Database seeded successfully!');
  console.log('Demo accounts:');
  console.log('  Managing Partner: prashanth@lexnova.in / password123');
  console.log('  Senior Advocate:  meera@lexnova.in / password123');
  console.log('  Junior Advocate:  suresh@lexnova.in / password123');
  console.log('  Billing:          billing@lexnova.in / password123');
  console.log('  Reception:        reception@lexnova.in / password123');
  console.log('  Client (Rahul):   rahul@example.com / password123');
  console.log('  Client (Sneha):   sneha@example.com / password123');

  db.close();
}

setup();

module.exports = { DB_PATH };
