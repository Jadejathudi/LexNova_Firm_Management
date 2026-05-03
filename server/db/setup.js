const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const DB_PATH = path.join(__dirname, 'clearcase.db');

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

    CREATE TABLE IF NOT EXISTS advocates (
      advocate_id TEXT PRIMARY KEY,
      user_id TEXT,
      bar_number TEXT UNIQUE NOT NULL,
      experience_years INTEGER NOT NULL,
      specializations TEXT NOT NULL, -- JSON array
      state TEXT NOT NULL,
      city TEXT NOT NULL,
      bio TEXT,
      languages TEXT, -- JSON array
      rating REAL DEFAULT 0,
      review_count INTEGER DEFAULT 0,
      success_rate INTEGER DEFAULT 0,
      cases_handled INTEGER DEFAULT 0,
      is_verified INTEGER DEFAULT 0,
      is_available INTEGER DEFAULT 1,
      profile_photo TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(user_id)
    );

    CREATE TABLE IF NOT EXISTS consultation_requests (
      request_id TEXT PRIMARY KEY,
      advocate_id TEXT NOT NULL,
      client_name TEXT NOT NULL,
      client_phone TEXT NOT NULL,
      client_email TEXT,
      matter_type TEXT NOT NULL,
      brief TEXT NOT NULL,
      urgency TEXT DEFAULT 'normal' CHECK(urgency IN ('normal','high')),
      preferred_mode TEXT CHECK(preferred_mode IN ('video','phone','office')),
      preferred_date TEXT,
      preferred_time TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','accepted','declined','completed')),
      submitted_at TEXT DEFAULT (datetime('now')),
      responded_at TEXT,
      FOREIGN KEY (advocate_id) REFERENCES advocates(advocate_id)
    );

    CREATE TABLE IF NOT EXISTS consultation_sessions (
      session_id TEXT PRIMARY KEY,
      request_id TEXT,
      advocate_id TEXT NOT NULL,
      client_name TEXT NOT NULL,
      client_phone TEXT NOT NULL,
      scheduled_date TEXT NOT NULL,
      scheduled_time TEXT NOT NULL,
      duration_minutes INTEGER DEFAULT 30,
      session_mode TEXT CHECK(session_mode IN ('video','phone','office')),
      status TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled','active','completed','cancelled')),
      started_at TEXT,
      ended_at TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (request_id) REFERENCES consultation_requests(request_id),
      FOREIGN KEY (advocate_id) REFERENCES advocates(advocate_id)
    );

    CREATE TABLE IF NOT EXISTS retainer_clients (
      retainer_id TEXT PRIMARY KEY,
      advocate_id TEXT NOT NULL,
      client_name TEXT NOT NULL,
      client_phone TEXT NOT NULL,
      client_email TEXT,
      plan_type TEXT NOT NULL CHECK(plan_type IN ('Essential','Standard','Premium')),
      monthly_fee REAL NOT NULL,
      matter_type TEXT,
      status TEXT DEFAULT 'active' CHECK(status IN ('active','inactive','terminated')),
      since_date TEXT NOT NULL,
      next_hearing TEXT,
      unread_messages INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (advocate_id) REFERENCES advocates(advocate_id)
    );

    CREATE TABLE IF NOT EXISTS advocate_earnings (
      earning_id TEXT PRIMARY KEY,
      advocate_id TEXT NOT NULL,
      session_id TEXT,
      retainer_id TEXT,
      amount REAL NOT NULL,
      fee_type TEXT CHECK(fee_type IN ('consultation','retainer','bonus')),
      description TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','paid','cancelled')),
      payout_date TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (advocate_id) REFERENCES advocates(advocate_id),
      FOREIGN KEY (session_id) REFERENCES consultation_sessions(session_id),
      FOREIGN KEY (retainer_id) REFERENCES retainer_clients(retainer_id)
    );

    CREATE TABLE IF NOT EXISTS advocate_availability (
      availability_id TEXT PRIMARY KEY,
      advocate_id TEXT NOT NULL,
      day_of_week TEXT NOT NULL CHECK(day_of_week IN ('Mon','Tue','Wed','Thu','Fri','Sat','Sun')),
      is_available INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (advocate_id) REFERENCES advocates(advocate_id),
      UNIQUE(advocate_id, day_of_week)
    );

    CREATE TABLE IF NOT EXISTS advocate_reviews (
      review_id TEXT PRIMARY KEY,
      advocate_id TEXT NOT NULL,
      client_name TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK(rating >=1 AND rating <=5),
      review_text TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (advocate_id) REFERENCES advocates(advocate_id)
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
  insertUser.run(partnerId, 'Prashanth Kumar', 'prashanth@clearcase.in', '9876543210', 'managing_partner', hash);
  insertUser.run(seniorAdv1Id, 'Adv. Meera Pillai', 'meera@clearcase.in', '9876543211', 'senior_advocate', hash);
  insertUser.run(seniorAdv2Id, 'Adv. Arvind Kumar', 'arvind@clearcase.in', '9876543212', 'senior_advocate', hash);
  insertUser.run(juniorAdv1Id, 'Adv. Suresh Naik', 'suresh@clearcase.in', '9876543213', 'junior_advocate', hash);
  insertUser.run(juniorAdv2Id, 'Adv. Priya Menon', 'priya@clearcase.in', '9876543214', 'junior_advocate', hash);
  insertUser.run(billingId, 'Anita Desai', 'billing@clearcase.in', '9876543215', 'billing', hash);
  insertUser.run(receptionId, 'Kavitha Rao', 'reception@clearcase.in', '9876543216', 'reception', hash);
  insertUser.run(clientUserId1, 'Rahul Sharma', 'rahul@example.com', '9876543217', 'client', hash);
  insertUser.run(clientUserId2, 'Sneha Patel', 'sneha@example.com', '9876543218', 'client', hash);
  insertUser.run(advisorId, 'Justice (Retd.) K.N. Rao', 'rao@clearcase.in', '9876543219', 'advisor', hash);

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

  // Advocates
  const adv1Id = uuidv4();
  const adv2Id = uuidv4();
  const adv3Id = uuidv4();
  const insertAdvocate = db.prepare(`INSERT INTO advocates (advocate_id, user_id, bar_number, experience_years, specializations, state, city, bio, languages, rating, review_count, success_rate, cases_handled, is_verified, is_available) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  insertAdvocate.run(adv1Id, seniorAdv1Id, 'TS/HC/2011/1234', 14, JSON.stringify(['Criminal','Family','Civil']), 'Telangana', 'Hyderabad', 'Senior High Court advocate with 14 years in criminal defense and family law. Former public prosecutor with deep knowledge of Telangana courts.', JSON.stringify(['Telugu','English','Hindi']), 4.9, 63, 81, 420, 1, 1);
  insertAdvocate.run(adv2Id, seniorAdv2Id, 'AP/HC/2009/5678', 16, JSON.stringify(['Corporate','Banking','Civil']), 'Andhra Pradesh', 'Vijayawada', 'Corporate specialist with expertise in banking disputes, NCLT insolvency matters, and commercial litigation across AP courts.', JSON.stringify(['Telugu','English']), 4.6, 38, 74, 210, 1, 1);
  insertAdvocate.run(adv3Id, juniorAdv1Id, 'TS/HC/2018/9012', 7, JSON.stringify(['Civil','Real Estate','Consumer']), 'Telangana', 'Hyderabad', 'Specialises in property disputes, consumer protection, and civil litigation. Known for transparent client communication.', JSON.stringify(['Telugu','English','Tamil']), 4.7, 29, 79, 156, 1, 0);

  // Advocate Availability
  const insertAvailability = db.prepare(`INSERT INTO advocate_availability (availability_id, advocate_id, day_of_week, is_available) VALUES (?,?,?,?)`);
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  days.forEach(day => {
    insertAvailability.run(uuidv4(), adv1Id, day, day !== 'Sat' && day !== 'Sun' ? 1 : 0);
    insertAvailability.run(uuidv4(), adv2Id, day, day !== 'Sun' ? 1 : 0);
    insertAvailability.run(uuidv4(), adv3Id, day, day !== 'Sat' && day !== 'Sun' ? 1 : 0);
  });

  // Consultation Requests
  const req1Id = uuidv4();
  const req2Id = uuidv4();
  const req3Id = uuidv4();
  const insertRequest = db.prepare(`INSERT INTO consultation_requests (request_id, advocate_id, client_name, client_phone, matter_type, brief, urgency, preferred_mode, preferred_date, preferred_time, status, submitted_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
  insertRequest.run(req1Id, adv1Id, 'Rahul Sharma', '9876543217', 'Criminal', 'FIR filed against me under section 420. Need urgent guidance on bail and next steps.', 'high', 'video', '2025-03-12', '11:00 AM', 'pending', '2025-03-10 14:00:00');
  insertRequest.run(req2Id, adv1Id, 'Priya Reddy', '8765432198', 'Family', 'Mutual divorce proceedings. Already separated for 18 months. Need to understand the process and timeline.', 'normal', 'phone', '2025-03-13', '14:00 PM', 'pending', '2025-03-10 17:00:00');
  insertRequest.run(req3Id, adv2Id, 'Anjaneyulu G.', '7654321987', 'Civil', 'Inherited ancestral property dispute with siblings. Patta documents available.', 'normal', 'office', '2025-03-14', '15:30 PM', 'accepted', '2025-03-09 10:00:00');

  // Consultation Sessions
  const sess1Id = uuidv4();
  const insertSession = db.prepare(`INSERT INTO consultation_sessions (session_id, request_id, advocate_id, client_name, client_phone, scheduled_date, scheduled_time, duration_minutes, session_mode, status) VALUES (?,?,?,?,?,?,?,?,?,?)`);
  insertSession.run(sess1Id, req3Id, adv2Id, 'Anjaneyulu G.', '7654321987', '2025-03-14', '15:30', 45, 'office', 'scheduled');

  // Retainer Clients
  const ret1Id = uuidv4();
  const ret2Id = uuidv4();
  const ret3Id = uuidv4();
  const insertRetainer = db.prepare(`INSERT INTO retainer_clients (retainer_id, advocate_id, client_name, client_phone, plan_type, monthly_fee, matter_type, since_date, next_hearing, unread_messages) VALUES (?,?,?,?,?,?,?,?,?,?)`);
  insertRetainer.run(ret1Id, adv1Id, 'Vikram Joshi', '6543219876', 'Standard', 9999, 'Banking dispute', '2025-01-01', '2025-03-15', 2);
  insertRetainer.run(ret2Id, adv2Id, 'Lakshmi Industries', '5432198765', 'Premium', 19999, 'NCLT matter', '2024-11-01', '2025-03-22', 0);
  insertRetainer.run(ret3Id, adv1Id, 'K. Ramesh', '4321987654', 'Essential', 4999, 'Property partition', '2025-02-01', null, 1);

  // Advocate Earnings
  const insertEarning = db.prepare(`INSERT INTO advocate_earnings (earning_id, advocate_id, session_id, retainer_id, amount, fee_type, description, status, payout_date) VALUES (?,?,?,?,?,?,?,?,?)`);
  insertEarning.run(uuidv4(), adv1Id, null, ret1Id, 9999, 'retainer', 'Standard retainer - Vikram Joshi', 'paid', '2025-03-01');
  insertEarning.run(uuidv4(), adv2Id, null, ret2Id, 19999, 'retainer', 'Premium retainer - Lakshmi Industries', 'pending', '2025-03-15');
  insertEarning.run(uuidv4(), adv1Id, sess1Id, null, 1500, 'consultation', 'Office consultation - Anjaneyulu G.', 'pending', null);

  // Advocate Reviews
  const insertReview = db.prepare(`INSERT INTO advocate_reviews (review_id, advocate_id, client_name, rating, review_text) VALUES (?,?,?,?,?)`);
  insertReview.run(uuidv4(), adv1Id, 'Vikram Joshi', 5, 'Excellent guidance on banking dispute. Very professional.');
  insertReview.run(uuidv4(), adv1Id, 'Sneha Patil', 5, 'Handled my consumer complaint perfectly. Highly recommended.');
  insertReview.run(uuidv4(), adv2Id, 'Corporate Client', 4, 'Good corporate law expertise, but could be more responsive.');

  console.log('Database seeded successfully!');
  console.log('Demo accounts:');
  console.log('  Managing Partner: prashanth@clearcase.in / password123');
  console.log('  Senior Advocate:  meera@clearcase.in / password123');
  console.log('  Junior Advocate:  suresh@clearcase.in / password123');
  console.log('  Billing:          billing@clearcase.in / password123');
  console.log('  Reception:        reception@clearcase.in / password123');
  console.log('  Client (Rahul):   rahul@example.com / password123');
  console.log('  Client (Sneha):   sneha@example.com / password123');

  db.close();
}

setup();

module.exports = { DB_PATH };
