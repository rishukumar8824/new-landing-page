const BITEGIT_API = (window.BITEGIT_API_BASE || 'http://localhost:3000/api/v1');
function mktFetch(path, opts) {
  var token = localStorage.getItem('bitegit_token') || '';
  opts = opts || {};
  var headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return fetch(BITEGIT_API + path, Object.assign({}, opts, { headers: headers, credentials: 'include' }));
}

const marketsRows = document.getElementById('marketsRows');
const marketsTabs = document.getElementById('marketsTabs');

const marketsMenuToggle = document.getElementById('marketsMenuToggle');
const marketsNavDrawer = document.getElementById('marketsNavDrawer');
const marketsNavOverlay = document.getElementById('marketsNavOverlay');
const marketsNavClose = document.getElementById('marketsNavClose');
const marketsThemeToggle = document.getElementById('marketsThemeToggle');
const marketsDrawerThemeToggle = document.getElementById('marketsDrawerThemeToggle');
const marketsLoginBtn = document.getElementById('marketsLoginBtn');
const marketsSignupBtn = document.getElementById('marketsSignupBtn');

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT', 'ADAUSDT', 'DOGEUSDT', 'AVAXUSDT', 'LINKUSDT', 'LTCUSDT'];

const ICONS = {
  BTC: '₿',
  ETH: '◆',
  BNB: '⬢',
  SOL: '◎',
  XRP: '✕',
  ADA: '◉',
  DOGE: 'Ð',
  AVAX: 'A',
  LINK: 'L',
  LTC: 'Ł'
};

const ICON_CODES = {
  BTC: 'btc',
  ETH: 'eth',
  BNB: 'bnb',
  SOL: 'sol',
  XRP: 'xrp',
  ADA: 'ada',
  DOGE: 'doge',
  AVAX: 'avax',
  LINK: 'link',
  LTC: 'ltc'
};

let currentTab = 'popular';
let cacheRows = [];
let currentUser = null;

function buildTradeChartUrl(symbol, market = 'spot') {
  const cleanSymbol = String(symbol || 'BTCUSDT')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  const finalSymbol = cleanSymbol || 'BTCUSDT';
  const finalMarket = String(market || 'spot').toLowerCase() === 'perp' ? 'perp' : 'spot';
  return `/trade/${finalMarket}/${encodeURIComponent(finalSymbol)}?view=chart`;
}

function syncMarketsInteractionState() {
  const hasOverlay = Boolean(marketsNavOverlay && !marketsNavOverlay.classList.contains('hidden'));
  document.body.style.overflow = hasOverlay ? 'hidden' : 'auto';
  document.body.style.pointerEvents = 'auto';
}

function formatPrice(value) {
  return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 5 });
}

function getCoinIconMarkup(base) {
  const coin = String(base || '').toUpperCase();
  const fallback = ICONS[coin] || coin.slice(0, 1) || '?';
  const code = ICON_CODES[coin];

  if (!code) {
    return `<span class="market-logo"><span class="coin-fallback">${fallback}</span></span>`;
  }

  return `
    <span class="market-logo">
      <img src="https://assets.coincap.io/assets/icons/${code}@2x.png" alt="${coin}" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.style.display='none'" />
      <span class="coin-fallback">${fallback}</span>
    </span>
  `;
}

function applyTabOrder(rows) {
  const copy = [...rows];

  if (currentTab === 'trends') {
    copy.sort((a, b) => Number(b.volume24h || 0) - Number(a.volume24h || 0));
    return copy;
  }

  if (currentTab === 'change') {
    copy.sort((a, b) => Math.abs(Number(b.change24h || 0)) - Math.abs(Number(a.change24h || 0)));
    return copy;
  }

  if (currentTab === 'new') {
    const preferred = ['ADAUSDT', 'SOLUSDT', 'AVAXUSDT', 'LINKUSDT', 'DOGEUSDT', 'XRPUSDT'];
    const bySymbol = new Map(copy.map((item) => [item.symbol, item]));
    return preferred.map((symbol) => bySymbol.get(symbol)).filter(Boolean);
  }

  const preferred = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT', 'ADAUSDT'];
  const bySymbol = new Map(copy.map((item) => [item.symbol, item]));
  return preferred.map((symbol) => bySymbol.get(symbol)).filter(Boolean);
}

function renderRows(rows) {
  if (!marketsRows) {
    return;
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    marketsRows.innerHTML = '<p class="markets-loading">Market feed unavailable.</p>';
    return;
  }

  const data = applyTabOrder(rows);

  marketsRows.innerHTML = data
    .map((item) => {
      const symbol = String(item.symbol || 'BTCUSDT').toUpperCase();
      const base = symbol.replace('USDT', '');
      const change = Number(item.change24h || 0);
      const isUp = change >= 0;

      return `
        <a class="market-row" href="${buildTradeChartUrl(symbol, 'spot')}" data-symbol="${symbol}" data-market="spot">
          <div class="market-pair">
            ${getCoinIconMarkup(base)}
            <p class="market-symbol">${base}<small>/USDT</small></p>
          </div>
          <p class="market-price">${formatPrice(item.lastPrice)}</p>
          <span class="market-change ${isUp ? 'up' : 'down'}">${isUp ? '+' : ''}${change.toFixed(2)}%</span>
        </a>
      `;
    })
    .join('');
}

function setTab(nextTab) {
  currentTab = ['popular', 'trends', 'new', 'change'].includes(nextTab) ? nextTab : 'popular';

  if (marketsTabs) {
    marketsTabs.querySelectorAll('button[data-tab]').forEach((btn) => {
      const active = btn.dataset.tab === currentTab;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });
  }

  renderRows(cacheRows);
}

function setMarketsNavOpen(open) {
  if (!marketsNavDrawer || !marketsNavOverlay || !marketsMenuToggle) {
    return;
  }

  const shouldOpen = Boolean(open);
  marketsNavDrawer.classList.toggle('is-open', shouldOpen);
  marketsNavOverlay.classList.toggle('hidden', !shouldOpen);
  marketsNavDrawer.setAttribute('aria-hidden', shouldOpen ? 'false' : 'true');
  marketsNavOverlay.setAttribute('aria-hidden', shouldOpen ? 'false' : 'true');
  marketsMenuToggle.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
  document.body.classList.toggle('markets-nav-open', shouldOpen);
  syncMarketsInteractionState();
}

function setLoginUi() {
  const loggedIn = Boolean(currentUser);
  if (marketsLoginBtn) {
    marketsLoginBtn.style.display = loggedIn ? 'none' : 'inline-flex';
  }
  if (marketsSignupBtn) {
    marketsSignupBtn.style.display = loggedIn ? 'none' : 'inline-flex';
  }

  const drawerLogin = marketsNavDrawer?.querySelector('[data-drawer-login]');
  const drawerSignup = marketsNavDrawer?.querySelector('[data-drawer-signup]');
  if (drawerLogin) {
    drawerLogin.style.display = loggedIn ? 'none' : 'inline-flex';
  }
  if (drawerSignup) {
    drawerSignup.style.display = loggedIn ? 'none' : 'inline-flex';
  }
}

async function loadCurrentUser() {
  try {
    const response = await mktFetch('/auth/me');
    const data = await response.json();
    currentUser = response.ok && (data?.success || data?.user) ? data.user : null;
  } catch (_) {
    currentUser = null;
  }
  setLoginUi();
}

async function loadMarkets() {
  try {
    const params = new URLSearchParams({ symbols: SYMBOLS.join(',') });
    const response = await mktFetch(`/market/tickers?${params.toString()}`);
    const payload = await response.json();

    if (!response.ok || !Array.isArray(payload.ticker)) {
      throw new Error(payload.message || 'Market feed unavailable.');
    }

    cacheRows = payload.ticker;
    renderRows(cacheRows);
  } catch (_) {
    renderRows([]);
  }
}

function initThemeControls() {
  if (window.BitegitTheme?.initThemeToggle) {
    window.BitegitTheme.initThemeToggle([marketsThemeToggle, marketsDrawerThemeToggle]);
  }
}

marketsTabs?.addEventListener('click', (event) => {
  const targetButton = event.target.closest('button[data-tab]');
  if (!targetButton) {
    return;
  }
  setTab(targetButton.dataset.tab || 'popular');
});

marketsRows?.addEventListener('click', (event) => {
  const row = event.target.closest('[data-symbol]');
  if (!row?.dataset?.symbol) {
    return;
  }
  event.preventDefault();
  const symbol = String(row.dataset.symbol).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const market = String(row.dataset.market || 'spot').toLowerCase();
  window.location.href = buildTradeChartUrl(symbol, market);
});

marketsMenuToggle?.addEventListener('click', () => setMarketsNavOpen(true));
marketsNavClose?.addEventListener('click', () => setMarketsNavOpen(false));
marketsNavOverlay?.addEventListener('click', () => setMarketsNavOpen(false));

marketsNavDrawer?.addEventListener('click', (event) => {
  const link = event.target.closest('a[href]');
  if (link) {
    setMarketsNavOpen(false);
  }
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    setMarketsNavOpen(false);
  }
});

window.addEventListener('pagehide', () => {
  document.body.style.overflow = 'auto';
  document.body.style.pointerEvents = 'auto';
});

initThemeControls();
setTab('popular');
loadCurrentUser();
loadMarkets();
setInterval(loadMarkets, 10000);
syncMarketsInteractionState();
