/**
 * app-nav.js — Native app-like instant navigation
 * Intercepts all internal <a> clicks, preloads pages,
 * slides between them with no white flash.
 */
(function(){
  const CACHE = {};
  const PRELOAD = [
    '/', '/markets.html', '/chart.html?symbol=BTCUSDT',
    '/assets', '/p2p', '/auth.html'
  ];

  // ── Inject transition styles once ──
  const style = document.createElement('style');
  style.textContent = `
    html { background: #000 !important; }
    body { opacity: 1; transition: opacity .15s ease; }
    body.nav-out { opacity: 0; }
    body.nav-in  { animation: navFadeIn .2s ease forwards; }
    @keyframes navFadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    /* Instant tap feedback on all tappable elements */
    a, button { -webkit-tap-highlight-color: transparent; }
    /* Remove 300ms tap delay on iOS */
    a, button, [onclick], [data-href] { touch-action: manipulation; }
  `;
  document.head.appendChild(style);

  // ── Fade in current page ──
  document.body.classList.add('nav-in');

  // ── Preload pages silently ──
  function preload(url) {
    if (CACHE[url]) return;
    CACHE[url] = true;
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    document.head.appendChild(link);
  }

  // Start preloading after page is interactive
  requestIdleCallback
    ? requestIdleCallback(() => PRELOAD.forEach(preload), { timeout: 2000 })
    : setTimeout(() => PRELOAD.forEach(preload), 800);

  // ── Intercept internal link clicks ──
  function navigate(url) {
    if (!url || url.startsWith('#') || url.startsWith('mailto:') || url.startsWith('tel:')) return false;
    try {
      const u = new URL(url, location.origin);
      if (u.origin !== location.origin) return false;
      if (u.pathname === location.pathname && u.search === location.search) return false;
    } catch(e) { return false; }

    document.body.classList.add('nav-out');
    setTimeout(() => { location.href = url; }, 160);
    return true;
  }

  document.addEventListener('click', function(e) {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (navigate(href)) e.preventDefault();
  });

  // iOS: touchend for zero-delay tap
  document.addEventListener('touchend', function(e) {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (navigate(href)) { e.preventDefault(); e.stopPropagation(); }
  }, { passive: false });

})();
