require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

async function setupBench() {
  const sql = neon(process.env.DATABASE_URL);

  console.log('Dropping existing bench tables...');
  await sql`DROP TABLE IF EXISTS bench_blocked_slots CASCADE`;
  await sql`DROP TABLE IF EXISTS bench_judge_slots CASCADE`;
  await sql`DROP TABLE IF EXISTS bench_bookings CASCADE`;
  await sql`DROP TABLE IF EXISTS bench_judges CASCADE`;

  console.log('Creating bench tables...');

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
    CREATE TABLE IF NOT EXISTS bench_case_details (
      detail_id          TEXT PRIMARY KEY,
      booking_id         TEXT UNIQUE NOT NULL REFERENCES bench_bookings(booking_id) ON DELETE CASCADE,
      case_summary       TEXT,
      linked_matter_id   TEXT REFERENCES matters(matter_id),
      linked_matter_ref  TEXT,
      created_at         TIMESTAMPTZ DEFAULT NOW(),
      updated_at         TIMESTAMPTZ DEFAULT NOW()
    )
  `;

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
    // Create judge user account
    const userId = uuidv4();
    const email = `judge.${j.initials.toLowerCase()}@clearcase.legal`;
    const phone = `+91${Math.floor(Math.random() * 9000000000) + 1000000000}`;
    const defaultPassword = 'password123'; // Dev default — consistent with other seeded accounts
    const passwordHash = bcrypt.hashSync(defaultPassword, 10);

    await sql`
      INSERT INTO users (user_id, full_name, email, phone, role, password_hash, is_active)
      VALUES (${userId}, ${j.name}, ${email}, ${phone}, 'judge', ${passwordHash}, 1)
      ON CONFLICT (email) DO NOTHING
    `;

    // Insert judge and link to user
    await sql`
      INSERT INTO bench_judges
        (judge_id, user_id, name, initials, tier, retired_year, years_on_bench, city, state, areas, bio, education, notable_areas, languages, total_slots)
      VALUES
        (${j.id}, ${userId}, ${j.name}, ${j.initials}, ${j.tier}, ${j.retired_year}, ${j.years_on_bench},
         ${j.city}, ${j.state}, ${j.areas}, ${j.bio}, ${j.education}, ${j.notable_areas},
         ${j.languages}, ${j.total_slots})
    `;
    if (j.slots_booked > 0) {
      await sql`
        INSERT INTO bench_judge_slots (slot_id, judge_id, month_year, slots_booked)
        VALUES (${uuidv4()}, ${j.id}, ${monthYear}, ${j.slots_booked})
        ON CONFLICT (judge_id, month_year) DO UPDATE SET slots_booked = EXCLUDED.slots_booked
      `;
    }
  }

  console.log(`Bench setup complete — ${judges.length} judges seeded with user accounts.`);
}

setupBench().catch(err => { console.error(err); process.exit(1); });
