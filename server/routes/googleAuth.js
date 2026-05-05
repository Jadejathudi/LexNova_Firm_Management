const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { getAuthUrl, handleAuthCallback, isCalendarConfigured } = require('../googleCalendar');

module.exports = function () {
  const router = express.Router();

  // GET /api/admin/google-status — check whether Google Calendar is connected
  router.get('/google-status', authenticateToken, requireRole('managing_partner', 'advisor'), (req, res) => {
    res.json({ connected: isCalendarConfigured() });
  });

  // GET /api/admin/google-auth — return the OAuth2 authorization URL
  router.get('/google-auth', authenticateToken, requireRole('managing_partner', 'advisor'), (req, res) => {
    try {
      const url = getAuthUrl();
      res.json({ url });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/admin/google-callback?code=... — exchange auth code for tokens
  // Google redirects the browser here after the user approves access
  router.get('/google-callback', async (req, res) => {
    const { code, error } = req.query;

    if (error) {
      return res.send(`
        <html><body style="font-family:sans-serif;padding:40px;text-align:center">
          <h2 style="color:#B91C1C">❌ Authorization Denied</h2>
          <p>${error}</p>
          <p><a href="javascript:window.close()">Close this tab</a> and try again.</p>
        </body></html>
      `);
    }

    if (!code) {
      return res.status(400).send(`
        <html><body style="font-family:sans-serif;padding:40px;text-align:center">
          <h2 style="color:#B91C1C">❌ Missing authorization code</h2>
          <p><a href="javascript:window.close()">Close this tab</a> and try again.</p>
        </body></html>
      `);
    }

    try {
      await handleAuthCallback(code);
      res.send(`
        <html><body style="font-family:sans-serif;padding:40px;text-align:center;background:#F0FDF4">
          <h2 style="color:#166534">✅ Google Calendar Connected!</h2>
          <p style="color:#15803D;font-size:16px">
            ClearCase can now create Google Meet links automatically when sessions are scheduled.
          </p>
          <p style="color:#64748B;font-size:14px;margin-top:24px">
            You can close this tab and return to the CRM.
          </p>
          <script>
            // Notify opener window if possible, then close
            try { window.opener && window.opener.postMessage('google-calendar-connected', '*'); } catch(e) {}
            setTimeout(() => window.close(), 3000);
          </script>
        </body></html>
      `);
    } catch (err) {
      console.error('Google OAuth callback error:', err);
      res.status(500).send(`
        <html><body style="font-family:sans-serif;padding:40px;text-align:center">
          <h2 style="color:#B91C1C">❌ Authorization Failed</h2>
          <p style="color:#64748B">${err.message}</p>
          <p><a href="javascript:window.close()">Close this tab</a> and try again from the CRM.</p>
        </body></html>
      `);
    }
  });

  return router;
};
