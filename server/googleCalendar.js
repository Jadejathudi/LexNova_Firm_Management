// Generates a deterministic Jitsi Meet URL from a session ID.
//
// WHY Jitsi instead of Google Meet:
//   Google Meet room codes (xxx-yyyy-zzz) must be created via Google's API — any
//   code we fabricate is rejected with a 302 → /unsupported redirect. Jitsi Meet
//   (meet.jit.si) works with arbitrary room names: the room is created automatically
//   when the first participant visits the link. No credentials, no OAuth, no API key.
//   Users can optionally sign in with their Google account inside Jitsi.
//
// Room name format: ClearCase-<first 16 hex chars of UUID>
// e.g. https://meet.jit.si/ClearCase-daf04c16e3b04e20
function generateMeetUrl(sessionId) {
  const hex = sessionId.replace(/-/g, '').slice(0, 16);
  return `https://meet.jit.si/ClearCase-${hex}`;
}

module.exports = { generateMeetUrl };
