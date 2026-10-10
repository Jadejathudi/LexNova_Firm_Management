const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

function toStringList(value) {
  if (Array.isArray(value)) return value.map(item => String(item).trim()).filter(Boolean);
  return String(value || '').split(',').map(item => item.trim()).filter(Boolean);
}

function isValidProfilePhoto(profilePhoto) {
  if (profilePhoto == null || profilePhoto === '') return true;
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(profilePhoto);
  if (!match) return false;
  const padding = match[2].endsWith('==') ? 2 : match[2].endsWith('=') ? 1 : 0;
  return Math.floor(match[2].length * 3 / 4) - padding <= 500 * 1024;
}

module.exports = function (sql) {
  const router = express.Router();

  // GET /api/users
  router.get('/', authenticateToken, requireRole('managing_partner', 'advisor'), async (req, res) => {
    try {
      const users = await sql`
        SELECT u.user_id, u.full_name, u.email, u.phone, u.role, u.is_active, u.last_login, u.created_at,
           bj.judge_id,
           bj.name AS judge_name, bj.initials AS judge_initials, bj.tier AS judge_tier,
           bj.retired_year, bj.years_on_bench, bj.city AS judge_city, bj.state AS judge_state,
           bj.areas AS judge_areas, bj.bio AS judge_bio, bj.education AS judge_education,
           bj.notable_areas AS judge_notable_areas, bj.languages AS judge_languages,
           bj.profile_photo AS judge_profile_photo,
           a.advocate_id, a.bar_number, a.experience_years,
           a.specializations AS advocate_specializations, a.state AS advocate_state,
           a.city AS advocate_city, a.bio AS advocate_bio, a.languages AS advocate_languages,
           a.is_verified, a.profile_photo AS advocate_profile_photo
        FROM users u
        LEFT JOIN bench_judges bj ON bj.user_id = u.user_id
         LEFT JOIN advocates a ON a.user_id = u.user_id
        WHERE u.role != 'client'
        ORDER BY u.role, u.full_name
      `;
      res.json(users);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/users/advocates
  router.get('/advocates', authenticateToken, async (req, res) => {
    try {
      const advocates = await sql`
        SELECT user_id, full_name, email, phone, role
        FROM users WHERE role IN ('senior_advocate', 'junior_advocate') AND is_active = 1
        ORDER BY role, full_name
      `;

      const result = await Promise.all(advocates.map(async a => {
        const wl = await sql`
          SELECT COUNT(*) as active_cases FROM matter_assignments ma
          JOIN cases m ON ma.matter_id = m.matter_id
          WHERE ma.advocate_id = ${a.user_id} AND ma.is_active = 1 AND m.status != 'closed'
        `;
        return { ...a, active_cases: Number(wl[0].active_cases) };
      }));

      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // PATCH /api/users/team/:id — update account and profile details without touching scheduling data
  router.patch('/team/:id', authenticateToken, requireRole('managing_partner'), async (req, res) => {
    const { id } = req.params;
    const { full_name, email, phone, profile = {} } = req.body;

    if (!full_name?.trim() || !email?.trim() || !phone?.trim() || !profile || typeof profile !== 'object' || Array.isArray(profile)) {
      return res.status(400).json({ error: 'Full name, email, phone, and a valid profile are required.' });
    }

    try {
      const memberRows = await sql`
        SELECT user_id, role FROM users WHERE user_id = ${id} AND role != 'client'
      `;
      if (memberRows.length === 0) return res.status(404).json({ error: 'Team member not found.' });

      const memberRole = memberRows[0].role;
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedPhone = phone.trim();
      const duplicates = await sql`
        SELECT user_id FROM users
        WHERE user_id != ${id} AND (LOWER(email) = ${normalizedEmail} OR phone = ${normalizedPhone})
      `;
      if (duplicates.length > 0) return res.status(409).json({ error: 'Email or phone already in use.' });

      const updates = [
        sql`UPDATE users SET full_name = ${full_name.trim()}, email = ${normalizedEmail}, phone = ${normalizedPhone}, updated_at = NOW()
          WHERE user_id = ${id}`,
      ];

      if (memberRole === 'senior_advocate' || memberRole === 'junior_advocate') {
        const specializations = toStringList(profile.specializations);
        const languages = toStringList(profile.languages);
        const experienceYears = Number(profile.experience_years);
        if (!profile.bar_number?.trim() || !Number.isInteger(experienceYears) || experienceYears < 0 ||
            !profile.state?.trim() || !profile.city?.trim() || specializations.length === 0) {
          return res.status(400).json({ error: 'Complete the required advocate profile fields.' });
        }
        if (!isValidProfilePhoto(profile.profile_photo)) {
          return res.status(400).json({ error: 'Profile photo must be a JPG, PNG, or WebP data image no larger than 500 KB.' });
        }

        updates.push(sql`
          UPDATE advocates SET
            bar_number = ${profile.bar_number.trim()},
            experience_years = ${experienceYears},
            specializations = ${JSON.stringify(specializations)},
            state = ${profile.state.trim()},
            city = ${profile.city.trim()},
            bio = ${profile.bio?.trim() || null},
            languages = ${JSON.stringify(languages)},
            profile_photo = ${profile.profile_photo || null},
            is_verified = ${profile.is_verified ? 1 : 0}
          WHERE user_id = ${id}
        `);
      } else if (memberRole === 'judge') {
        const areas = toStringList(profile.areas);
        const languages = toStringList(profile.languages);
        const retiredYear = Number(profile.retired_year);
        const yearsOnBench = Number(profile.years_on_bench);
        if (!profile.initials?.trim() || profile.initials.trim().length > 4 ||
            !['hc', 'district', 'senior', 'junior'].includes(profile.tier) ||
            !Number.isInteger(retiredYear) || retiredYear < 1900 || retiredYear > new Date().getFullYear() ||
            !Number.isInteger(yearsOnBench) || yearsOnBench < 0 ||
            !profile.city?.trim() || !profile.state?.trim() || areas.length === 0 || languages.length === 0 || !profile.bio?.trim()) {
          return res.status(400).json({ error: 'Complete the required judge profile fields.' });
        }
        if (!isValidProfilePhoto(profile.profile_photo)) {
          return res.status(400).json({ error: 'Judge portrait must be a JPG, PNG, or WebP data image no larger than 500 KB.' });
        }

        updates.push(sql`
          UPDATE bench_judges SET
            name = ${full_name.trim()},
            initials = ${profile.initials.trim().toUpperCase()},
            tier = ${profile.tier},
            retired_year = ${retiredYear},
            years_on_bench = ${yearsOnBench},
            city = ${profile.city.trim()},
            state = ${profile.state.trim()},
            areas = ${JSON.stringify(areas)},
            bio = ${profile.bio.trim()},
            education = ${profile.education?.trim() || null},
            notable_areas = ${profile.notable_areas?.trim() || null},
            languages = ${JSON.stringify(languages)},
            profile_photo = ${profile.profile_photo || null}
          WHERE user_id = ${id}
        `);
      }

      await sql.transaction(updates);
      res.json({ message: 'Team member details updated successfully.' });
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ error: 'A unique field value is already in use.' });
      console.error('PATCH /users/team/:id:', err);
      res.status(500).json({ error: 'Failed to update team member details.' });
    }
  });

  // GET /api/users/notifications/unread-count  (must be before /:id style routes)
  router.get('/notifications/unread-count', authenticateToken, async (req, res) => {
    try {
      const rows = await sql`SELECT COUNT(*) as c FROM notifications WHERE user_id = ${req.user.user_id} AND is_read = 0`;
      res.json({ count: Number(rows[0].c) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/users/notifications
  router.get('/notifications', authenticateToken, async (req, res) => {
    try {
      const notifications = await sql`
        SELECT * FROM notifications WHERE user_id = ${req.user.user_id}
        ORDER BY created_at DESC LIMIT 50
      `;
      res.json(notifications);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // PATCH /api/users/notifications/:id/read
  router.patch('/notifications/:id/read', authenticateToken, async (req, res) => {
    try {
      await sql`UPDATE notifications SET is_read = 1 WHERE notification_id = ${req.params.id} AND user_id = ${req.user.user_id}`;
      res.json({ message: 'Marked as read' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
