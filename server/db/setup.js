require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

async function setup() {
  const sql = neon(process.env.DATABASE_URL);

  console.log('Dropping existing tables...');

  // Bench tables first (they reference users and matters)
  await sql`DROP TABLE IF EXISTS bench_case_details CASCADE`;
  await sql`DROP TABLE IF EXISTS bench_blocked_slots CASCADE`;
  await sql`DROP TABLE IF EXISTS bench_judge_slots CASCADE`;
  await sql`DROP TABLE IF EXISTS bench_bookings CASCADE`;
  await sql`DROP TABLE IF EXISTS bench_judges CASCADE`;

  await sql`DROP TABLE IF EXISTS advocate_reviews CASCADE`;
  await sql`DROP TABLE IF EXISTS advocate_availability CASCADE`;
  await sql`DROP TABLE IF EXISTS advocate_earnings CASCADE`;
  await sql`DROP TABLE IF EXISTS retainer_clients CASCADE`;
  await sql`DROP TABLE IF EXISTS consultation_sessions CASCADE`;
  await sql`DROP TABLE IF EXISTS consultation_requests CASCADE`;
  await sql`DROP TABLE IF EXISTS consultations CASCADE`;
  await sql`DROP TABLE IF EXISTS invoices CASCADE`;
  await sql`DROP TABLE IF EXISTS documents CASCADE`;
  await sql`DROP TABLE IF EXISTS hearings CASCADE`;
  await sql`DROP TABLE IF EXISTS matter_assignments CASCADE`;
  await sql`DROP TABLE IF EXISTS matter_documents CASCADE`;
  await sql`DROP TABLE IF EXISTS matter_messages CASCADE`;
  await sql`DROP TABLE IF EXISTS matter_notes CASCADE`;
  await sql`DROP TABLE IF EXISTS matter_advocates CASCADE`;
  await sql`DROP TABLE IF EXISTS matters CASCADE`;
  await sql`DROP TABLE IF EXISTS cases CASCADE`;
  await sql`DROP TABLE IF EXISTS messages CASCADE`;
  await sql`DROP TABLE IF EXISTS audit_logs CASCADE`;
  await sql`DROP TABLE IF EXISTS notifications CASCADE`;
  await sql`DROP TABLE IF EXISTS advocates CASCADE`;
  await sql`DROP TABLE IF EXISTS clients CASCADE`;
  await sql`DROP TABLE IF EXISTS users CASCADE`;

  console.log('Creating tables...');

  await sql`
    CREATE TABLE users (
      user_id       TEXT PRIMARY KEY,
      full_name     TEXT NOT NULL,
      email         TEXT UNIQUE NOT NULL,
      phone         TEXT UNIQUE NOT NULL,
      role          TEXT NOT NULL CHECK(role IN ('managing_partner','senior_advocate','junior_advocate','billing','reception','client','advisor','judge')),
      password_hash TEXT NOT NULL,
      mfa_enabled   SMALLINT DEFAULT 0,
      is_active     SMALLINT DEFAULT 1,
      last_login    TIMESTAMPTZ,
      created_at    TIMESTAMPTZ DEFAULT NOW(),
      updated_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE clients (
      client_id      TEXT PRIMARY KEY,
      user_id        TEXT REFERENCES users(user_id),
      full_name      TEXT NOT NULL,
      email          TEXT,
      phone          TEXT,
      address        TEXT,
      client_type    TEXT CHECK(client_type IN ('individual','corporate','hnwi')),
      onboarded_by   TEXT REFERENCES users(user_id),
      referral_source TEXT,
      kyc_verified   SMALLINT DEFAULT 0,
      created_at     TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE cases (
      matter_id           TEXT PRIMARY KEY,
      matter_number       TEXT UNIQUE NOT NULL,
      client_id           TEXT NOT NULL REFERENCES clients(client_id),
      matter_type         TEXT NOT NULL CHECK(matter_type IN ('criminal','civil','corporate','family','real_estate','arbitration')),
      title               TEXT NOT NULL,
      description         TEXT,
      status              TEXT NOT NULL CHECK(status IN ('intake','active','hearing_pending','awaiting_docs','judgment','closed')),
      court_name          TEXT,
      opposing_party      TEXT,
      conflict_checked    SMALLINT DEFAULT 0,
      conflict_checked_by TEXT REFERENCES users(user_id),
      urgency             TEXT DEFAULT 'standard' CHECK(urgency IN ('standard','urgent','critical')),
      created_at          TIMESTAMPTZ DEFAULT NOW(),
      updated_at          TIMESTAMPTZ,
      closed_at           TIMESTAMPTZ
    )
  `;

  await sql`
    CREATE TABLE matter_assignments (
      assignment_id  TEXT PRIMARY KEY,
      matter_id      TEXT NOT NULL REFERENCES cases(matter_id),
      advocate_id    TEXT NOT NULL REFERENCES users(user_id),
      role_on_matter TEXT NOT NULL CHECK(role_on_matter IN ('lead_senior','supporting_senior','junior')),
      assigned_by    TEXT REFERENCES users(user_id),
      assigned_at    TIMESTAMPTZ DEFAULT NOW(),
      is_active      SMALLINT DEFAULT 1
    )
  `;

  await sql`
    CREATE TABLE hearings (
      hearing_id        TEXT PRIMARY KEY,
      matter_id         TEXT NOT NULL REFERENCES cases(matter_id),
      hearing_date      DATE NOT NULL,
      hearing_time      TEXT,
      court_name        TEXT NOT NULL,
      courtroom_number  TEXT,
      purpose           TEXT,
      outcome           TEXT,
      next_date         DATE,
      notified_client   SMALLINT DEFAULT 0,
      created_at        TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE documents (
      document_id      TEXT PRIMARY KEY,
      matter_id        TEXT NOT NULL REFERENCES cases(matter_id),
      uploaded_by      TEXT NOT NULL REFERENCES users(user_id),
      filename         TEXT NOT NULL,
      stored_path      TEXT NOT NULL,
      file_type        TEXT,
      file_size_bytes  INTEGER NOT NULL,
      is_client_visible SMALLINT DEFAULT 1,
      uploaded_at      TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE invoices (
      invoice_id     TEXT PRIMARY KEY,
      matter_id      TEXT NOT NULL REFERENCES cases(matter_id),
      client_id      TEXT NOT NULL REFERENCES clients(client_id),
      invoice_number TEXT UNIQUE NOT NULL,
      amount_base    REAL NOT NULL,
      gst_amount     REAL,
      total_amount   REAL NOT NULL,
      billing_type   TEXT CHECK(billing_type IN ('per_case','milestone','retainer','flat_fee')),
      status         TEXT NOT NULL CHECK(status IN ('draft','sent','paid','overdue','waived')),
      due_date       DATE NOT NULL,
      paid_at        TIMESTAMPTZ,
      created_at     TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE messages (
      message_id    TEXT PRIMARY KEY,
      matter_id     TEXT NOT NULL REFERENCES cases(matter_id),
      sender_id     TEXT NOT NULL REFERENCES users(user_id),
      content       TEXT NOT NULL,
      attachment_id TEXT REFERENCES documents(document_id),
      is_read       SMALLINT DEFAULT 0,
      sent_at       TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE audit_logs (
      log_id        TEXT PRIMARY KEY,
      actor_id      TEXT NOT NULL REFERENCES users(user_id),
      action        TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id   TEXT,
      ip_address    TEXT,
      user_agent    TEXT,
      timestamp     TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE consultations (
      consultation_id   TEXT PRIMARY KEY,
      guest_name        TEXT NOT NULL,
      guest_phone       TEXT NOT NULL,
      matter_type       TEXT NOT NULL CHECK(matter_type IN ('criminal','civil','corporate','family','real_estate','other')),
      description       TEXT,
      urgency           TEXT DEFAULT 'normal' CHECK(urgency IN ('normal','high')),
      consultation_mode TEXT CHECK(consultation_mode IN ('video','phone','office')),
      preferred_date    TEXT,
      preferred_time    TEXT,
      status            TEXT DEFAULT 'booked' CHECK(status IN ('booked','confirmed','completed','cancelled')),
      created_at        TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE advocates (
      advocate_id     TEXT PRIMARY KEY,
      user_id         TEXT REFERENCES users(user_id),
      bar_number      TEXT UNIQUE NOT NULL,
      experience_years INTEGER NOT NULL,
      specializations TEXT NOT NULL,
      state           TEXT NOT NULL,
      city            TEXT NOT NULL,
      bio             TEXT,
      languages       TEXT,
      rating          REAL DEFAULT 0,
      review_count    INTEGER DEFAULT 0,
      success_rate    INTEGER DEFAULT 0,
      cases_handled   INTEGER DEFAULT 0,
      is_verified     SMALLINT DEFAULT 0,
      is_available    SMALLINT DEFAULT 1,
      profile_photo   TEXT,
      created_at      TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE consultation_requests (
      request_id     TEXT PRIMARY KEY,
      user_id        TEXT REFERENCES users(user_id),
      advocate_id    TEXT NOT NULL REFERENCES advocates(advocate_id),
      client_name    TEXT,
      client_phone   TEXT,
      client_email   TEXT,
      matter_type    TEXT NOT NULL,
      brief          TEXT,
      urgency        TEXT DEFAULT 'normal' CHECK(urgency IN ('normal','high')),
      preferred_mode TEXT CHECK(preferred_mode IN ('video','phone','office')),
      preferred_date TEXT,
      preferred_time TEXT,
      status         TEXT DEFAULT 'pending' CHECK(status IN ('pending','accepted','declined','completed')),
      submitted_at   TIMESTAMPTZ DEFAULT NOW(),
      responded_at   TIMESTAMPTZ,
      updated_at     TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE consultation_sessions (
      session_id       TEXT PRIMARY KEY,
      request_id       TEXT REFERENCES consultation_requests(request_id),
      advocate_id      TEXT NOT NULL REFERENCES advocates(advocate_id),
      client_name      TEXT NOT NULL,
      client_phone     TEXT NOT NULL,
      scheduled_date   DATE NOT NULL,
      scheduled_time   TEXT NOT NULL,
      duration_minutes INTEGER DEFAULT 30,
      session_mode     TEXT CHECK(session_mode IN ('video','phone','office')),
      status           TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled','active','completed','cancelled')),
      started_at       TIMESTAMPTZ,
      ended_at         TIMESTAMPTZ,
      meeting_link     TEXT,
      calendar_event_id TEXT,
      instant_service  SMALLINT DEFAULT 0,
      notes            TEXT,
      created_at       TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE retainer_clients (
      retainer_id     TEXT PRIMARY KEY,
      advocate_id     TEXT NOT NULL REFERENCES advocates(advocate_id),
      client_name     TEXT NOT NULL,
      client_phone    TEXT NOT NULL,
      client_email    TEXT,
      plan_type       TEXT NOT NULL CHECK(plan_type IN ('Essential','Standard','Premium')),
      monthly_fee     REAL NOT NULL,
      matter_type     TEXT,
      status          TEXT DEFAULT 'active' CHECK(status IN ('active','inactive','terminated')),
      since_date      DATE NOT NULL,
      next_hearing    DATE,
      unread_messages INTEGER DEFAULT 0,
      created_at      TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE advocate_earnings (
      earning_id   TEXT PRIMARY KEY,
      advocate_id  TEXT NOT NULL REFERENCES advocates(advocate_id),
      session_id   TEXT REFERENCES consultation_sessions(session_id),
      retainer_id  TEXT REFERENCES retainer_clients(retainer_id),
      amount       REAL NOT NULL,
      fee_type     TEXT CHECK(fee_type IN ('consultation','retainer','bonus')),
      description  TEXT,
      status       TEXT DEFAULT 'pending' CHECK(status IN ('pending','paid','cancelled')),
      payout_date  DATE,
      created_at   TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE advocate_availability (
      availability_id TEXT PRIMARY KEY,
      advocate_id     TEXT NOT NULL REFERENCES advocates(advocate_id),
      day_of_week     TEXT NOT NULL CHECK(day_of_week IN ('Mon','Tue','Wed','Thu','Fri','Sat','Sun')),
      is_available    SMALLINT DEFAULT 1,
      start_time      TEXT DEFAULT '09:00',
      end_time        TEXT DEFAULT '18:00',
      created_at      TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(advocate_id, day_of_week)
    )
  `;

  await sql`
    CREATE TABLE advocate_reviews (
      review_id    TEXT PRIMARY KEY,
      advocate_id  TEXT NOT NULL REFERENCES advocates(advocate_id),
      client_name  TEXT NOT NULL,
      rating       INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
      review_text  TEXT,
      created_at   TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE notifications (
      notification_id TEXT PRIMARY KEY,
      user_id         TEXT NOT NULL REFERENCES users(user_id),
      title           TEXT NOT NULL,
      message         TEXT NOT NULL,
      type            TEXT,
      is_read         SMALLINT DEFAULT 0,
      created_at      TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // ── Bench tables ────────────────────────────────────────────────────
  await sql`
    CREATE TABLE bench_judges (
      judge_id       TEXT PRIMARY KEY,
      user_id        TEXT UNIQUE REFERENCES users(user_id),
      name           TEXT NOT NULL,
      initials       VARCHAR(4) NOT NULL,
      tier           TEXT NOT NULL CHECK(tier IN ('hc','district','senior','junior')),
      retired_year   INTEGER NOT NULL,
      years_on_bench INTEGER NOT NULL,
      city           TEXT NOT NULL,
      state          TEXT NOT NULL,
      areas          TEXT NOT NULL,
      bio            TEXT NOT NULL,
      education      TEXT,
      notable_areas  TEXT,
      languages      TEXT NOT NULL,
      total_slots    INTEGER NOT NULL DEFAULT 8,
      is_active      SMALLINT DEFAULT 1,
      created_at     TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE bench_bookings (
      booking_id     TEXT PRIMARY KEY,
      booking_ref    TEXT UNIQUE NOT NULL,
      judge_id       TEXT NOT NULL REFERENCES bench_judges(judge_id),
      user_id        TEXT REFERENCES users(user_id),
      guest_name     TEXT,
      guest_phone    TEXT,
      guest_email    TEXT,
      service_type   TEXT NOT NULL CHECK(service_type IN ('review','second','prehear','settle')),
      preferred_date DATE NOT NULL,
      preferred_slot TEXT NOT NULL,
      session_format TEXT NOT NULL CHECK(session_format IN ('video','phone')),
      status         TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','intake_scheduled','intake_done','session_scheduled','completed','cancelled')),
      record_session SMALLINT DEFAULT 0,
      intake_notes   TEXT,
      session_notes  TEXT,
      judge_notes    TEXT,
      client_notes   TEXT,
      confirmed_date DATE,
      confirmed_slot TEXT,
      created_at     TIMESTAMPTZ DEFAULT NOW(),
      updated_at     TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE bench_judge_slots (
      slot_id      TEXT PRIMARY KEY,
      judge_id     TEXT NOT NULL REFERENCES bench_judges(judge_id),
      month_year   TEXT NOT NULL,
      slots_booked INTEGER NOT NULL DEFAULT 0,
      UNIQUE(judge_id, month_year)
    )
  `;

  await sql`
    CREATE TABLE bench_blocked_slots (
      id         TEXT PRIMARY KEY,
      judge_id   TEXT NOT NULL REFERENCES bench_judges(judge_id),
      slot_date  DATE NOT NULL,
      time_slot  TEXT NOT NULL,
      UNIQUE(judge_id, slot_date, time_slot)
    )
  `;

  await sql`
    CREATE TABLE bench_case_details (
      detail_id          TEXT PRIMARY KEY,
      booking_id         TEXT UNIQUE NOT NULL REFERENCES bench_bookings(booking_id) ON DELETE CASCADE,
      case_summary       TEXT,
      linked_matter_id   TEXT REFERENCES cases(matter_id),
      linked_matter_ref  TEXT,
      created_at         TIMESTAMPTZ DEFAULT NOW(),
      updated_at         TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // ── Lightweight matters tables (depend on consultation_requests + bench_bookings) ──
  await sql`
    CREATE TABLE matters (
      matter_id        TEXT PRIMARY KEY,
      matter_ref       TEXT UNIQUE NOT NULL,
      client_id        TEXT NOT NULL REFERENCES clients(client_id) ON DELETE CASCADE,
      user_id          TEXT REFERENCES users(user_id),
      matter_type      TEXT NOT NULL CHECK(matter_type IN ('corporate','tax','immigration','criminal','civil','family','real_estate','bench')),
      title            TEXT NOT NULL,
      status           TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','in_progress','resolved','closed')),
      brief            TEXT,
      vertical_data    JSONB,
      consultation_id  TEXT REFERENCES consultation_requests(request_id),
      bench_booking_id TEXT REFERENCES bench_bookings(booking_id),
      case_id          TEXT REFERENCES cases(matter_id),
      created_by       TEXT REFERENCES users(user_id),
      created_at       TIMESTAMPTZ DEFAULT NOW(),
      updated_at       TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE matter_advocates (
      id                TEXT PRIMARY KEY,
      matter_id         TEXT NOT NULL REFERENCES matters(matter_id) ON DELETE CASCADE,
      advocate_id       TEXT NOT NULL REFERENCES users(user_id),
      access_granted_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE matter_notes (
      note_id    TEXT PRIMARY KEY,
      matter_id  TEXT NOT NULL REFERENCES matters(matter_id) ON DELETE CASCADE,
      author_id  TEXT NOT NULL REFERENCES users(user_id),
      content    TEXT NOT NULL,
      is_private SMALLINT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE matter_messages (
      message_id TEXT PRIMARY KEY,
      matter_id  TEXT NOT NULL REFERENCES matters(matter_id) ON DELETE CASCADE,
      sender_id  TEXT NOT NULL REFERENCES users(user_id),
      content    TEXT NOT NULL,
      is_read    SMALLINT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE matter_documents (
      doc_id      TEXT PRIMARY KEY,
      matter_id   TEXT NOT NULL REFERENCES matters(matter_id) ON DELETE CASCADE,
      uploader_id TEXT NOT NULL REFERENCES users(user_id),
      filename    TEXT NOT NULL,
      blob_url    TEXT NOT NULL,
      size_bytes  INTEGER,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  console.log('Seeding data...');

  const hash = bcrypt.hashSync('password123', 10);

  const partnerId     = uuidv4();
  const seniorAdv1Id  = uuidv4();
  const seniorAdv2Id  = uuidv4();
  const juniorAdv1Id  = uuidv4();
  const juniorAdv2Id  = uuidv4();
  const seniorAdv3Id  = uuidv4();
  const juniorAdv3Id  = uuidv4();
  const billingId     = uuidv4();
  const receptionId   = uuidv4();
  const clientUserId1 = uuidv4();
  const clientUserId2 = uuidv4();
  const clientUserId3 = uuidv4();
  const advisorId     = uuidv4();

  const matter1Id = uuidv4(); const matter2Id = uuidv4(); const matter3Id = uuidv4();
  const client1Id = uuidv4(); const client2Id = uuidv4(); const client3Id = uuidv4();
  const doc1Id    = uuidv4(); const doc2Id    = uuidv4();
  const req1Id    = uuidv4(); const req2Id    = uuidv4(); const req3Id = uuidv4();
  const req4Id    = uuidv4(); const req5Id    = uuidv4();
  const adv1Id    = uuidv4(); const adv2Id    = uuidv4(); const adv3Id = uuidv4();
  const adv4Id    = uuidv4(); const adv5Id    = uuidv4(); const adv6Id = uuidv4();
  const ret1Id    = uuidv4(); const ret2Id    = uuidv4(); const ret3Id = uuidv4();

  // Users
  const users = [
    [partnerId,     'Prashanth Kumar',           'prashanth@clearcase.in',    '9876543210', 'managing_partner', hash],
    [seniorAdv1Id,  'Adv. Meera Pillai',          'meera@clearcase.in',        '9876543211', 'senior_advocate',  hash],
    [seniorAdv2Id,  'Adv. Arvind Kumar',           'arvind@clearcase.in',       '9876543212', 'senior_advocate',  hash],
    [juniorAdv1Id,  'Adv. Suresh Naik',            'suresh@clearcase.in',       '9876543213', 'junior_advocate',  hash],
    [juniorAdv2Id,  'Adv. Priya Menon',            'priya@clearcase.in',        '9876543214', 'junior_advocate',  hash],
    [seniorAdv3Id,  'Adv. Priya Singh',            'priya.singh@clearcase.in',  '9876543223', 'senior_advocate',  hash],
    [juniorAdv3Id,  'Adv. Amit Kumar',             'amit@clearcase.in',         '9876543224', 'junior_advocate',  hash],
    [billingId,     'Anita Desai',                 'billing@clearcase.in',      '9876543215', 'billing',          hash],
    [receptionId,   'Kavitha Rao',                 'reception@clearcase.in',    '9876543216', 'reception',        hash],
    [clientUserId1, 'Rahul Sharma',                'rahul@example.com',         '9876543217', 'client',           hash],
    [clientUserId2, 'Sneha Patel',                 'sneha@example.com',         '9876543218', 'client',           hash],
    [clientUserId3, 'Kiran Patel',                 'kiran@example.com',         '9876543225', 'client',           hash],
    [advisorId,     'Justice (Retd.) K.N. Rao',    'rao@clearcase.in',          '9876543219', 'advisor',          hash],
  ];
  for (const [id, name, email, phone, role, pw] of users) {
    await sql`INSERT INTO users (user_id,full_name,email,phone,role,password_hash) VALUES (${id},${name},${email},${phone},${role},${pw})`;
  }

  // Clients
  await sql`INSERT INTO clients (client_id,user_id,full_name,email,phone,address,client_type,onboarded_by) VALUES (${client1Id},${clientUserId1},'Rahul Sharma','rahul@example.com','9876543217','42 MG Road, Bengaluru 560001','individual',${seniorAdv1Id})`;
  await sql`INSERT INTO clients (client_id,user_id,full_name,email,phone,address,client_type,onboarded_by) VALUES (${client2Id},${clientUserId2},'Sneha Patel','sneha@example.com','9876543218','15 Bandra West, Mumbai 400050','corporate',${seniorAdv2Id})`;
  await sql`INSERT INTO clients (client_id,user_id,full_name,email,phone,address,client_type,onboarded_by) VALUES (${client3Id},${clientUserId3},'Kiran Patel','kiran@example.com','9876543225','22 Bandra East, Mumbai 400051','individual',${seniorAdv3Id})`;

  // Matters
  await sql`INSERT INTO cases (matter_id,matter_number,client_id,matter_type,title,description,status,court_name,opposing_party,conflict_checked,urgency) VALUES (${matter1Id},'CC-2025-0047',${client1Id},'civil','Property Dispute — Civil','Dispute regarding ownership of plot #42 in Whitefield, Bengaluru. Defendant claims prior possession.','hearing_pending','District Court, Bengaluru','Vikram Reddy',1,'urgent')`;
  await sql`INSERT INTO cases (matter_id,matter_number,client_id,matter_type,title,description,status,court_name,opposing_party,conflict_checked,urgency) VALUES (${matter2Id},'CC-2025-0051',${client1Id},'corporate','Employment Contract Review — Corporate','Review of employment contract with TechCorp India Pvt Ltd regarding non-compete clause validity.','awaiting_docs',null,'TechCorp India Pvt Ltd',1,'standard')`;
  await sql`INSERT INTO cases (matter_id,matter_number,client_id,matter_type,title,description,status,court_name,opposing_party,conflict_checked,urgency) VALUES (${matter3Id},'CC-2025-0052',${client2Id},'criminal','Cheque Bounce Case — Criminal','Section 138 NI Act case. Cheque of Rs 15,00,000 returned unpaid.','active','Metropolitan Magistrate Court, Mumbai','Raj Enterprises',1,'critical')`;

  // Matter Assignments
  const assignments = [
    [matter1Id, seniorAdv1Id, 'lead_senior',   partnerId],
    [matter1Id, juniorAdv1Id, 'junior',        seniorAdv1Id],
    [matter2Id, seniorAdv1Id, 'lead_senior',   partnerId],
    [matter3Id, seniorAdv2Id, 'lead_senior',   partnerId],
    [matter3Id, juniorAdv2Id, 'junior',        seniorAdv2Id],
  ];
  for (const [mid, aid, role, by] of assignments) {
    await sql`INSERT INTO matter_assignments (assignment_id,matter_id,advocate_id,role_on_matter,assigned_by) VALUES (${uuidv4()},${mid},${aid},${role},${by})`;
  }

  // Hearings
  const hearings = [
    [matter1Id, '2025-01-15', '10:30', 'District Court, Bengaluru',          '4A', 'Initial hearing — Date setting',         'Next date set for plaint filing',                      '2025-02-03'],
    [matter1Id, '2025-02-03', '11:00', 'District Court, Bengaluru',          '4A', 'Plaint filed',                            'Plaint accepted. Notice to defendant ordered.',         '2025-02-28'],
    [matter1Id, '2025-02-28', '10:30', 'District Court, Bengaluru',          '4A', 'Defendant served notice',                 'Defendant acknowledged. Written statement date set.',   '2025-03-14'],
    [matter1Id, '2025-03-14', '10:30', 'District Court, Bengaluru',          '4A', 'Written statement hearing',               null,                                                    null],
    [matter3Id, '2025-02-10', '14:00', 'Metropolitan Magistrate Court, Mumbai','2B','Complaint filing',                       'Complaint registered. Summons issued.',                 '2025-03-20'],
  ];
  for (const [mid, hdate, htime, court, room, purpose, outcome, nextDate] of hearings) {
    await sql`INSERT INTO hearings (hearing_id,matter_id,hearing_date,hearing_time,court_name,courtroom_number,purpose,outcome,next_date,notified_client) VALUES (${uuidv4()},${mid},${hdate},${htime},${court},${room},${purpose},${outcome},${nextDate},1)`;
  }

  // Documents
  await sql`INSERT INTO documents (document_id,matter_id,uploaded_by,filename,stored_path,file_type,file_size_bytes,is_client_visible) VALUES (${doc1Id},${matter1Id},${seniorAdv1Id},'Plaint_Draft_v2.pdf','/uploads/plaint_draft_v2.pdf','pdf',2400000,1)`;
  await sql`INSERT INTO documents (document_id,matter_id,uploaded_by,filename,stored_path,file_type,file_size_bytes,is_client_visible) VALUES (${doc2Id},${matter1Id},${clientUserId1},'PropertyDeed_Original.pdf','/uploads/property_deed.pdf','pdf',5300000,1)`;
  await sql`INSERT INTO documents (document_id,matter_id,uploaded_by,filename,stored_path,file_type,file_size_bytes,is_client_visible) VALUES (${uuidv4()},${matter3Id},${seniorAdv2Id},'Cheque_Copy.pdf','/uploads/cheque_copy.pdf','pdf',1200000,1)`;
  await sql`INSERT INTO documents (document_id,matter_id,uploaded_by,filename,stored_path,file_type,file_size_bytes,is_client_visible) VALUES (${uuidv4()},${matter3Id},${clientUserId2},'Bank_Statement.pdf','/uploads/bank_statement.pdf','pdf',890000,1)`;

  // Invoices
  await sql`INSERT INTO invoices (invoice_id,matter_id,client_id,invoice_number,amount_base,gst_amount,total_amount,billing_type,status,due_date,paid_at) VALUES (${uuidv4()},${matter1Id},${client1Id},'INV-2025-0234',50000,9000,59000,'per_case','sent','2025-03-31',null)`;
  await sql`INSERT INTO invoices (invoice_id,matter_id,client_id,invoice_number,amount_base,gst_amount,total_amount,billing_type,status,due_date,paid_at) VALUES (${uuidv4()},${matter1Id},${client1Id},'INV-2025-0180',25000,4500,29500,'milestone','paid','2025-02-15','2025-02-12')`;
  await sql`INSERT INTO invoices (invoice_id,matter_id,client_id,invoice_number,amount_base,gst_amount,total_amount,billing_type,status,due_date,paid_at) VALUES (${uuidv4()},${matter3Id},${client2Id},'INV-2025-0240',75000,13500,88500,'per_case','overdue','2025-03-01',null)`;
  await sql`INSERT INTO invoices (invoice_id,matter_id,client_id,invoice_number,amount_base,gst_amount,total_amount,billing_type,status,due_date,paid_at) VALUES (${uuidv4()},${matter2Id},${client1Id},'INV-2025-0250',15000,2700,17700,'flat_fee','draft','2025-04-15',null)`;

  // Messages
  const msgs = [
    [matter1Id, seniorAdv1Id,  'The next hearing is on 14 March. Please bring original property deed.',                    1, '2025-03-10 10:23:00'],
    [matter1Id, clientUserId1, 'Understood. I have the original deed. Should I bring any other documents?',               1, '2025-03-10 10:25:00'],
    [matter1Id, seniorAdv1Id,  'Please also bring the sale agreement and any correspondence with the opposing party.',     0, '2025-03-10 10:30:00'],
    [matter3Id, seniorAdv2Id,  'We have filed the complaint. Summons will be issued to the accused.',                      1, '2025-02-10 15:00:00'],
    [matter3Id, clientUserId2, 'Thank you. When is the next hearing date?',                                                0, '2025-02-10 15:15:00'],
  ];
  for (const [mid, sid, content, isRead, sentAt] of msgs) {
    await sql`INSERT INTO messages (message_id,matter_id,sender_id,content,is_read,sent_at) VALUES (${uuidv4()},${mid},${sid},${content},${isRead},${sentAt})`;
  }

  // Notifications
  await sql`INSERT INTO notifications (notification_id,user_id,title,message,type,is_read) VALUES (${uuidv4()},${clientUserId1},'Hearing Scheduled','Hearing for Matter #CC-2025-0047 on 14 March at District Court, Bengaluru','hearing',0)`;
  await sql`INSERT INTO notifications (notification_id,user_id,title,message,type,is_read) VALUES (${uuidv4()},${clientUserId1},'New Message','New message from Adv. Meera Pillai regarding Matter #CC-2025-0047','message',0)`;
  await sql`INSERT INTO notifications (notification_id,user_id,title,message,type,is_read) VALUES (${uuidv4()},${partnerId},'Overdue Invoice','Invoice INV-2025-0240 is overdue by 10 days','invoice',0)`;
  await sql`INSERT INTO notifications (notification_id,user_id,title,message,type,is_read) VALUES (${uuidv4()},${partnerId},'No Update Alert','Matter #CC-2025-0052 has not been updated in 51 hours','alert',0)`;

  // Audit logs
  await sql`INSERT INTO audit_logs (log_id,actor_id,action,resource_type,resource_id,ip_address) VALUES (${uuidv4()},${partnerId},'VIEW_MATTER','matter',${matter1Id},'127.0.0.1')`;
  await sql`INSERT INTO audit_logs (log_id,actor_id,action,resource_type,resource_id,ip_address) VALUES (${uuidv4()},${seniorAdv1Id},'UPLOAD_DOC','document',${doc1Id},'127.0.0.1')`;

  // Guest consultations
  const consults = [
    [uuidv4(), 'Amit Joshi',    '9988776655', 'criminal', 'Need advice regarding an FIR filed against me',  'high',   'video', '2025-03-15', '10:00',   'booked'],
    [uuidv4(), 'Priyanka Das',  '8877665544', 'family',   'Divorce proceedings guidance needed',             'normal', 'phone', '2025-03-16', '14:00',   'confirmed'],
    [uuidv4(), 'Alice Brown',   '9876543229', 'family',   'Divorce advice',                                  'normal', 'video', '2025-01-15', '3:00 PM', 'completed'],
    [uuidv4(), 'Charlie Wilson','9876543230', 'civil',    'Recovery of dues',                                'high',   'phone', '2025-01-16', '1:00 PM', 'booked'],
  ];
  for (const [id, name, phone, type, desc, urgency, mode, date, time, status] of consults) {
    await sql`INSERT INTO consultations (consultation_id,guest_name,guest_phone,matter_type,description,urgency,consultation_mode,preferred_date,preferred_time,status) VALUES (${id},${name},${phone},${type},${desc},${urgency},${mode},${date},${time},${status})`;
  }

  // Advocates
  await sql`INSERT INTO advocates (advocate_id,user_id,bar_number,experience_years,specializations,state,city,bio,languages,rating,review_count,success_rate,cases_handled,is_verified,is_available) VALUES (${adv1Id},${seniorAdv1Id},'TS/HC/2011/1234',14,${JSON.stringify(['Criminal','Family','Civil'])},'Telangana','Hyderabad','Senior High Court advocate with 14 years in criminal defense and family law. Former public prosecutor with deep knowledge of Telangana courts.',${JSON.stringify(['Telugu','English','Hindi'])},4.9,63,81,420,1,1)`;
  await sql`INSERT INTO advocates (advocate_id,user_id,bar_number,experience_years,specializations,state,city,bio,languages,rating,review_count,success_rate,cases_handled,is_verified,is_available) VALUES (${adv2Id},${seniorAdv2Id},'AP/HC/2009/5678',16,${JSON.stringify(['Corporate','Banking','Civil'])},'Andhra Pradesh','Vijayawada','Corporate specialist with expertise in banking disputes, NCLT insolvency matters, and commercial litigation across AP courts.',${JSON.stringify(['Telugu','English'])},4.6,38,74,210,1,1)`;
  await sql`INSERT INTO advocates (advocate_id,user_id,bar_number,experience_years,specializations,state,city,bio,languages,rating,review_count,success_rate,cases_handled,is_verified,is_available) VALUES (${adv3Id},${juniorAdv1Id},'TS/HC/2018/9012',7,${JSON.stringify(['Civil','Real Estate','Consumer'])},'Telangana','Hyderabad','Specialises in property disputes, consumer protection, and civil litigation. Known for transparent client communication.',${JSON.stringify(['Telugu','English','Tamil'])},4.7,29,79,156,1,0)`;
  await sql`INSERT INTO advocates (advocate_id,user_id,bar_number,experience_years,specializations,state,city,bio,languages,rating,review_count,success_rate,cases_handled,is_verified,is_available) VALUES (${adv4Id},${juniorAdv2Id},'KA/7890/2019',4,${JSON.stringify(['Family','Corporate'])},'Karnataka','Bengaluru','Focused on family and corporate law.',${JSON.stringify(['English','Kannada','Tamil'])},4.6,12,78,35,1,1)`;
  await sql`INSERT INTO advocates (advocate_id,user_id,bar_number,experience_years,specializations,state,city,bio,languages,rating,review_count,success_rate,cases_handled,is_verified,is_available) VALUES (${adv5Id},${seniorAdv3Id},'DL/9012/2012',10,${JSON.stringify(['Real Estate','Arbitration'])},'Delhi','New Delhi','Expert in real estate and arbitration law.',${JSON.stringify(['English','Hindi'])},4.7,30,80,95,1,1)`;
  await sql`INSERT INTO advocates (advocate_id,user_id,bar_number,experience_years,specializations,state,city,bio,languages,rating,review_count,success_rate,cases_handled,is_verified,is_available) VALUES (${adv6Id},${juniorAdv3Id},'DL/1234/2020',3,${JSON.stringify(['Civil','Real Estate'])},'Delhi','New Delhi','New advocate in civil and real estate law.',${JSON.stringify(['English','Hindi'])},4.4,8,70,25,1,1)`;

  // Advocate Availability
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const availConfig = [
    { id: adv1Id, offDays: ['Sat','Sun'], start: '09:00', end: '18:00' },
    { id: adv2Id, offDays: ['Sun'],       start: '10:00', end: '17:00' },
    { id: adv3Id, offDays: ['Sat','Sun'], start: '09:00', end: '18:00' },
    { id: adv4Id, offDays: ['Sun'],       start: '09:00', end: '18:00' },
    { id: adv5Id, offDays: ['Sun'],       start: '10:00', end: '19:00' },
    { id: adv6Id, offDays: ['Sat','Sun'], start: '09:00', end: '17:00' },
  ];
  for (const { id, offDays, start, end } of availConfig) {
    for (const day of days) {
      const isAvail = offDays.includes(day) ? 0 : 1;
      await sql`INSERT INTO advocate_availability (availability_id,advocate_id,day_of_week,is_available,start_time,end_time) VALUES (${uuidv4()},${id},${day},${isAvail},${start},${end})`;
    }
  }

  // Consultation Requests
  await sql`INSERT INTO consultation_requests (request_id,user_id,advocate_id,client_name,client_phone,client_email,matter_type,brief,urgency,preferred_mode,preferred_date,preferred_time,status,submitted_at) VALUES (${req1Id},${clientUserId1},${adv1Id},'Rahul Sharma','9876543217','rahul@example.com','criminal','FIR filed against me under section 420. Need urgent guidance on bail and next steps.','high','video','2025-03-12','11:00 AM','pending','2025-03-10 14:00:00')`;
  await sql`INSERT INTO consultation_requests (request_id,user_id,advocate_id,client_name,client_phone,client_email,matter_type,brief,urgency,preferred_mode,preferred_date,preferred_time,status,submitted_at) VALUES (${req2Id},${clientUserId2},${adv1Id},'Priya Reddy','8765432198','priya@example.com','family','Mutual divorce proceedings. Already separated for 18 months. Need to understand the process and timeline.','normal','phone','2025-03-13','14:00 PM','pending','2025-03-10 17:00:00')`;
  await sql`INSERT INTO consultation_requests (request_id,user_id,advocate_id,client_name,client_phone,client_email,matter_type,brief,urgency,preferred_mode,preferred_date,preferred_time,status,submitted_at) VALUES (${req3Id},null,${adv2Id},'Anjaneyulu G.','7654321987','anjaneyulu@example.com','civil','Inherited ancestral property dispute with siblings. Patta documents available.','normal','office','2025-03-14','15:30 PM','accepted','2025-03-09 10:00:00')`;
  await sql`INSERT INTO consultation_requests (request_id,user_id,advocate_id,client_name,client_phone,client_email,matter_type,brief,urgency,preferred_mode,preferred_date,preferred_time,status,submitted_at) VALUES (${req4Id},null,${adv4Id},'John Doe','9876543226','john@example.com','criminal','Need advice on theft case','normal','video','2025-01-20','10:00 AM','pending','2025-03-11 10:00:00')`;
  await sql`INSERT INTO consultation_requests (request_id,user_id,advocate_id,client_name,client_phone,client_email,matter_type,brief,urgency,preferred_mode,preferred_date,preferred_time,status,submitted_at) VALUES (${req5Id},null,${adv5Id},'Jane Smith','9876543227','jane@example.com','corporate','Contract review needed','high','phone','2025-01-21','2:00 PM','accepted','2025-03-11 11:00:00')`;

  // Consultation Session
  const sess1Id = uuidv4();
  await sql`INSERT INTO consultation_sessions (session_id,request_id,advocate_id,client_name,client_phone,scheduled_date,scheduled_time,duration_minutes,session_mode,status) VALUES (${sess1Id},${req3Id},${adv2Id},'Anjaneyulu G.','7654321987','2025-03-14','15:30',45,'office','scheduled')`;

  // Retainer Clients
  await sql`INSERT INTO retainer_clients (retainer_id,advocate_id,client_name,client_phone,plan_type,monthly_fee,matter_type,since_date,next_hearing,unread_messages) VALUES (${ret1Id},${adv1Id},'Vikram Joshi','6543219876','Standard',9999,'Banking dispute','2025-01-01','2025-03-15',2)`;
  await sql`INSERT INTO retainer_clients (retainer_id,advocate_id,client_name,client_phone,plan_type,monthly_fee,matter_type,since_date,next_hearing,unread_messages) VALUES (${ret2Id},${adv2Id},'Lakshmi Industries','5432198765','Premium',19999,'NCLT matter','2024-11-01','2025-03-22',0)`;
  await sql`INSERT INTO retainer_clients (retainer_id,advocate_id,client_name,client_phone,plan_type,monthly_fee,matter_type,since_date,unread_messages) VALUES (${ret3Id},${adv1Id},'K. Ramesh','4321987654','Essential',4999,'Property partition','2025-02-01',1)`;

  // Advocate Earnings
  await sql`INSERT INTO advocate_earnings (earning_id,advocate_id,session_id,retainer_id,amount,fee_type,description,status,payout_date) VALUES (${uuidv4()},${adv1Id},null,${ret1Id},9999,'retainer','Standard retainer - Vikram Joshi','paid','2025-03-01')`;
  await sql`INSERT INTO advocate_earnings (earning_id,advocate_id,session_id,retainer_id,amount,fee_type,description,status,payout_date) VALUES (${uuidv4()},${adv2Id},null,${ret2Id},19999,'retainer','Premium retainer - Lakshmi Industries','pending','2025-03-15')`;
  await sql`INSERT INTO advocate_earnings (earning_id,advocate_id,session_id,retainer_id,amount,fee_type,description,status,payout_date) VALUES (${uuidv4()},${adv1Id},${sess1Id},null,1500,'consultation','Office consultation - Anjaneyulu G.','pending',null)`;

  // Advocate Reviews
  await sql`INSERT INTO advocate_reviews (review_id,advocate_id,client_name,rating,review_text) VALUES (${uuidv4()},${adv1Id},'Vikram Joshi',5,'Excellent guidance on banking dispute. Very professional.')`;
  await sql`INSERT INTO advocate_reviews (review_id,advocate_id,client_name,rating,review_text) VALUES (${uuidv4()},${adv1Id},'Sneha Patil',5,'Handled my consumer complaint perfectly. Highly recommended.')`;
  await sql`INSERT INTO advocate_reviews (review_id,advocate_id,client_name,rating,review_text) VALUES (${uuidv4()},${adv2Id},'Corporate Client',4,'Good corporate law expertise, but could be more responsive.')`;

  // ── Bench judges ────────────────────────────────────────────────────
  console.log('Seeding bench judges...');

  const judges = [
    {
      id: uuidv4(), name: "Hon. Justice K.V. Ramaswamy Naidu (Retd.)", initials: "RN",
      tier: "hc", retired_year: 2019, years_on_bench: 22, city: "Hyderabad", state: "Telangana",
      areas: JSON.stringify(["Criminal","Civil","Constitutional"]),
      bio: "Former Judge of the Telangana High Court with 22 years on the bench. Deep experience in criminal appeals, bail jurisprudence, and civil appellate matters before the High Court.",
      education: "LLB — Osmania University · Enrolled 1978 · Elevated to HC Bench 1997",
      notable_areas: "Criminal appeals, bail, constitutional challenges in HC",
      languages: JSON.stringify(["Telugu","English","Hindi"]), total_slots: 6, slots_booked: 3,
    },
    {
      id: uuidv4(), name: "Hon. Justice Padmavathi Subramaniam (Retd.)", initials: "PS",
      tier: "hc", retired_year: 2021, years_on_bench: 18, city: "Vijayawada", state: "Andhra Pradesh",
      areas: JSON.stringify(["Family","Civil","Consumer"]),
      bio: "Former Judge of the Andhra Pradesh High Court. 18 years presiding over family law appeals, civil appellate matters, and consumer protection cases at the High Court level.",
      education: "LLB — Andhra University · Enrolled 1980 · Elevated to HC Bench 2003",
      notable_areas: "Matrimonial appeals, civil appellate, consumer law",
      languages: JSON.stringify(["Telugu","English"]), total_slots: 6, slots_booked: 2,
    },
    {
      id: uuidv4(), name: "Shri. B. Venkateswara Rao (Retd.)", initials: "VR",
      tier: "district", retired_year: 2022, years_on_bench: 16, city: "Hyderabad", state: "Telangana",
      areas: JSON.stringify(["Criminal","Revenue","Civil"]),
      bio: "Retired District & Sessions Judge with 16 years presiding over criminal sessions, revenue matters, and civil trials in Hyderabad district courts. Extensive first-hand knowledge of ground-level court procedure.",
      education: "LLB — Osmania University · Enrolled 1986 · District Judge 2006",
      notable_areas: "Sessions trials, bail, revenue disputes, civil execution",
      languages: JSON.stringify(["Telugu","English","Urdu"]), total_slots: 8, slots_booked: 3,
    },
    {
      id: uuidv4(), name: "Shri. G. Nagabhushanam (Retd.)", initials: "GN",
      tier: "district", retired_year: 2023, years_on_bench: 14, city: "Vijayawada", state: "Andhra Pradesh",
      areas: JSON.stringify(["Civil","Family","Revenue"]),
      bio: "Retired District Judge with 14 years across AP district courts. Particularly experienced in land and property disputes, family matters, and revenue tribunal appeals.",
      education: "LLB — Andhra University · Enrolled 1989 · District Judge 2009",
      notable_areas: "Land disputes, property litigation, family matters",
      languages: JSON.stringify(["Telugu","English"]), total_slots: 8, slots_booked: 2,
    },
    {
      id: uuidv4(), name: "Smt. Lakshmi Devi Prasanna (Retd.)", initials: "LP",
      tier: "senior", retired_year: 2023, years_on_bench: 14, city: "Warangal", state: "Telangana",
      areas: JSON.stringify(["Family","Civil","Consumer"]),
      bio: "Retired Principal Judge, Family Court. 14 years presiding over matrimonial matters, child custody disputes, maintenance proceedings, and domestic violence cases across Telangana.",
      education: "LLB — Kakatiya University · Enrolled 1989 · Principal Family Judge 2009",
      notable_areas: "Matrimonial law, child custody, domestic violence, maintenance",
      languages: JSON.stringify(["Telugu","English"]), total_slots: 8, slots_booked: 8,
    },
    {
      id: uuidv4(), name: "Shri. T. Srinivasulu (Retd.)", initials: "TS",
      tier: "senior", retired_year: 2022, years_on_bench: 12, city: "Hyderabad", state: "Telangana",
      areas: JSON.stringify(["Civil","Consumer","Revenue"]),
      bio: "Retired Senior Civil Judge with 12 years handling civil suits, consumer disputes, and revenue matters in Hyderabad. Known for clear and thorough written orders.",
      education: "LLB — Osmania University · Enrolled 1990 · Civil Judge 2010",
      notable_areas: "Civil suits, consumer protection, small causes",
      languages: JSON.stringify(["Telugu","English"]), total_slots: 10, slots_booked: 3,
    },
    {
      id: uuidv4(), name: "Smt. M. Anuradha (Retd.)", initials: "MA",
      tier: "junior", retired_year: 2024, years_on_bench: 10, city: "Visakhapatnam", state: "Andhra Pradesh",
      areas: JSON.stringify(["Civil","Family","Consumer"]),
      bio: "Recently retired Junior Civil Judge with 10 years in Visakhapatnam civil courts. Fresh judicial perspective combined with knowledge of evolving court practice and procedure.",
      education: "LLB — Andhra University · Enrolled 1994 · Civil Judge 2014",
      notable_areas: "Civil suits, consumer cases, family matters",
      languages: JSON.stringify(["Telugu","English"]), total_slots: 10, slots_booked: 2,
    },
  ];

  const now = new Date();
  const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  for (const j of judges) {
    const judgeUserId = uuidv4();
    const judgeEmail = `judge.${j.initials.toLowerCase()}@clearcase.legal`;
    const judgePhone = `+91${Math.floor(Math.random() * 9000000000) + 1000000000}`;
    const judgeHash = bcrypt.hashSync('password123', 10);

    await sql`
      INSERT INTO users (user_id, full_name, email, phone, role, password_hash, is_active)
      VALUES (${judgeUserId}, ${j.name}, ${judgeEmail}, ${judgePhone}, 'judge', ${judgeHash}, 1)
    `;

    await sql`
      INSERT INTO bench_judges
        (judge_id, user_id, name, initials, tier, retired_year, years_on_bench, city, state, areas, bio, education, notable_areas, languages, total_slots)
      VALUES
        (${j.id}, ${judgeUserId}, ${j.name}, ${j.initials}, ${j.tier}, ${j.retired_year}, ${j.years_on_bench},
         ${j.city}, ${j.state}, ${j.areas}, ${j.bio}, ${j.education}, ${j.notable_areas},
         ${j.languages}, ${j.total_slots})
    `;

    if (j.slots_booked > 0) {
      await sql`
        INSERT INTO bench_judge_slots (slot_id, judge_id, month_year, slots_booked)
        VALUES (${uuidv4()}, ${j.id}, ${monthYear}, ${j.slots_booked})
      `;
    }
  }

  console.log('\nDatabase seeded successfully!');
  console.log('\nDemo accounts (password: password123):');
  console.log('  Managing Partner: prashanth@clearcase.in');
  console.log('  Senior Advocate:  meera@clearcase.in');
  console.log('  Junior Advocate:  suresh@clearcase.in');
  console.log('  Client (Rahul):   rahul@example.com');
  console.log('  Client (Sneha):   sneha@example.com');
  console.log('\nBench judges (password: password123):');
  console.log('  judge.rn@clearcase.legal  (HC · Hyderabad)');
  console.log('  judge.ps@clearcase.legal  (HC · Vijayawada)');
  console.log('  judge.vr@clearcase.legal  (District · Hyderabad)');
  console.log('  judge.gn@clearcase.legal  (District · Vijayawada)');
  console.log('  judge.lp@clearcase.legal  (Senior · Warangal)');
  console.log('  judge.ts@clearcase.legal  (Senior · Hyderabad)');
  console.log('  judge.ma@clearcase.legal  (Junior · Visakhapatnam)');
}

setup().catch(err => { console.error('Setup failed:', err); process.exit(1); });
