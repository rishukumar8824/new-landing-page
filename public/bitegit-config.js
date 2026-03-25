// ─── Bitegit Global Config ────────────────────────────────────────────────────
// Change BACKEND_URL here when tunnel URL changes. Frontend picks it up automatically.
(function () {
  var BACKEND_URL = 'https://mtey5d-ip-182-69-48-119.tunnelmole.net/api/v1';

  // Auto-switch: localhost uses local backend, any other domain uses tunnel
  if (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  ) {
    BACKEND_URL = 'http://localhost:3000/api/v1';
  }

  window.BITEGIT_API_BASE = BACKEND_URL;
})();
