// ── DOM refs ──
const marketsRows    = document.getElementById('marketsRows');
const marketsTabs    = document.getElementById('marketsTabs');
const mkSearch       = document.getElementById('mkSearch');
const mkCount        = document.getElementById('mkCount');
const mkTickerTrack  = document.getElementById('mkTickerTrack');
const marketsMenuToggle  = document.getElementById('marketsMenuToggle');
const marketsNavDrawer   = document.getElementById('marketsNavDrawer');
const marketsNavOverlay  = document.getElementById('marketsNavOverlay');
const marketsNavClose    = document.getElementById('marketsNavClose');
const marketsLoginBtn    = document.getElementById('marketsLoginBtn');
const marketsSignupBtn   = document.getElementById('marketsSignupBtn');

// ── Config ──
const SYMBOLS = [
  'BTCUSDT','ETHUSDT','XRPUSDT','SOLUSDT','BNBUSDT',
  'TRXUSDT','DOGEUSDT','ADAUSDT','AVAXUSDT','LINKUSDT',
  'DOTUSDT','LTCUSDT','MATICUSDT','UNIUSDT','ATOMUSDT',
  'NEARUSDT','APTUSDT','ARBUSDT','OPUSDT','WIFUSDT'
];

const COIN_NAMES = {
  BTCUSDT:'Bitcoin',   ETHUSDT:'Ethereum',    BNBUSDT:'BNB',
  XRPUSDT:'XRP',       SOLUSDT:'Solana',       TRXUSDT:'TRON',
  ADAUSDT:'Cardano',   DOGEUSDT:'Dogecoin',    WIFUSDT:'Dogwifhat',
  AVAXUSDT:'Avalanche',LINKUSDT:'Chainlink',   DOTUSDT:'Polkadot',
  LTCUSDT:'Litecoin',  MATICUSDT:'Polygon',    UNIUSDT:'Uniswap',
  ATOMUSDT:'Cosmos',   NEARUSDT:'NEAR',        APTUSDT:'Aptos',
  ARBUSDT:'Arbitrum',  OPUSDT:'Optimism'
};

const COIN_CODES = {
  BTC:'btc', ETH:'eth', BNB:'bnb', XRP:'xrp', SOL:'sol',
  TRX:'trx', ADA:'ada', DOGE:'doge', WIF:'wif', AVAX:'avax',
  LINK:'link',DOT:'dot',LTC:'ltc', MATIC:'matic',UNI:'uni',
  ATOM:'atom',NEAR:'near',APT:'apt',ARB:'arb', OP:'op'
};

const COINGECKO_IDS = {
  BTCUSDT:'bitcoin',       ETHUSDT:'ethereum',       BNBUSDT:'binancecoin',
  XRPUSDT:'ripple',        SOLUSDT:'solana',          TRXUSDT:'tron',
  ADAUSDT:'cardano',       DOGEUSDT:'dogecoin',       WIFUSDT:'dogwifcoin',
  AVAXUSDT:'avalanche-2',  LINKUSDT:'chainlink',      DOTUSDT:'polkadot',
  LTCUSDT:'litecoin',      MATICUSDT:'matic-network', UNIUSDT:'uniswap',
  ATOMUSDT:'cosmos',       NEARUSDT:'near',           APTUSDT:'aptos',
  ARBUSDT:'arbitrum',      OPUSDT:'optimism'
};

// ── State ──
let allRows    = [];
let currentTab = 'spot';
let sortKey    = 'volume';
let sortDir    = 'desc';
let searchQ    = '';
let refreshTimer = null;

// ── Helpers ──
function fmtPrice(v) {
  const n = Number(v);
  if (!n || !isFinite(n)) return '$--';
  if (n >= 10000) return '$' + n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (n >= 1)     return '$' + n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (n >= 0.01)  return '$' + n.toFixed(4);
  return '$' + n.toFixed(6);
}

function fmtVol(v) {
  const n = Number(v || 0);
  if (!isFinite(n)) return '--';
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(2) + 'K';
  return n.toFixed(2);
}

function coinIco(base) {
  const code = COIN_CODES[base];
  const fb   = (base || '?').slice(0, 1);
  const img  = code
    ? `<img src="https://assets.coincap.io/assets/icons/${code}@2x.png" alt="${base}" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.style.display='none'" />`
    : '';
  return `<span class="mk-coin-ico">${img}<span class="mk-coin-fb">${fb}</span></span>`;
}

// ── Render ──
function renderTable() {
  if (currentTab === 'new') {
    marketsRows.innerHTML = `<tr class="mk-loading-row"><td colspan="5">New listings coming soon — stay tuned.</td></tr>`;
    if (mkCount) mkCount.textContent = '';
    return;
  }

  let rows = [...allRows];

  // Search filter
  const q = searchQ.toLowerCase().trim();
  if (q) {
    rows = rows.filter(r => {
      const base = r.symbol.replace('USDT', '');
      return base.toLowerCase().includes(q) ||
        (COIN_NAMES[r.symbol] || '').toLowerCase().includes(q);
    });
  }

  // Sort
  rows.sort((a, b) => {
    let va, vb;
    if      (sortKey === 'price')  { va = Number(a.lastPrice || 0);  vb = Number(b.lastPrice || 0); }
    else if (sortKey === 'change') { va = Number(a.change24h || 0);  vb = Number(b.change24h || 0); }
    else if (sortKey === 'volume') { va = Number(a.volume24h || 0);  vb = Number(b.volume24h || 0); }
    else                           { va = a.symbol; vb = b.symbol; }
    if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
    return sortDir === 'asc' ? va - vb : vb - va;
  });

  if (mkCount) mkCount.textContent = `${rows.length} coins`;

  if (!rows.length) {
    marketsRows.innerHTML = `<tr class="mk-loading-row"><td colspan="5">No results for "${searchQ}".</td></tr>`;
    return;
  }

  const market = currentTab === 'futures' ? 'perp' : 'spot';

  marketsRows.innerHTML = rows.map(item => {
    const base  = item.symbol.replace('USDT', '');
    const name  = COIN_NAMES[item.symbol] || base;
    const chg   = Number(item.change24h || 0);
    const sign  = chg >= 0 ? '+' : '';
    const cls   = chg >= 0 ? 'up' : 'dn';
    const href  = `/chart.html?symbol=${encodeURIComponent(item.symbol)}`;

    return `<tr class="mk-market-row" onclick="window.location.href='${href}'" style="cursor:pointer">
      <td>
        <div class="mk-coin-cell">
          ${coinIco(base)}
          <div class="mk-coin-names">
            <span class="mk-coin-sym">${base}</span>
            <span class="mk-coin-name">${name}</span>
          </div>
        </div>
      </td>
      <td><span class="mk-price">${fmtPrice(item.lastPrice)}</span></td>
      <td><span class="mk-chg ${cls}">${sign}${chg.toFixed(2)}%</span></td>
      <td><span class="mk-vol">${fmtVol(item.volume24h)}</span></td>
      <td><a class="mk-trade-btn" href="${href}" onclick="event.stopPropagation()">Chart</a></td>
    </tr>`;
  }).join('');
}

// ── Ticker ──
function renderTicker(rows) {
  if (!mkTickerTrack || !rows.length) return;
  const html = rows.slice(0, 10).map(item => {
    const sym = item.symbol.replace('USDT', '/USDT');
    const chg = Number(item.change24h || 0);
    const cls = chg >= 0 ? 'up' : 'dn';
    const sign = chg >= 0 ? '+' : '';
    return `<span class="mk-ticker-item ${cls}">${sym} <strong>${fmtPrice(item.lastPrice)}</strong> <em>${sign}${chg.toFixed(2)}%</em></span>`;
  }).join('');
  mkTickerTrack.innerHTML = html + html; // duplicate for seamless loop
}

// ── Data fetch ──
async function fetchFromServer() {
  try {
    const params = new URLSearchParams({ symbols: SYMBOLS.join(','), _t: Date.now() });
    const res  = await fetch(`/api/p2p/exchange-ticker?${params}`, { cache: 'no-store' });
    const data = await res.json();
    if (res.ok && Array.isArray(data?.ticker) && data.ticker.length) {
      return data.ticker;
    }
  } catch (_) {}
  return null;
}

async function fetchFromCoinGecko() {
  try {
    const ids = SYMBOLS.map(s => COINGECKO_IDS[s]).filter(Boolean).join(',');
    const res  = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&per_page=50&sparkline=false&price_change_percentage=24h`,
      { cache: 'no-store' }
    );
    const data = await res.json();
    if (!Array.isArray(data)) return null;

    const idToSym = {};
    for (const [sym, id] of Object.entries(COINGECKO_IDS)) idToSym[id] = sym;

    return data.map(coin => ({
      symbol:    idToSym[coin.id] || coin.symbol.toUpperCase() + 'USDT',
      lastPrice: coin.current_price,
      change24h: coin.price_change_percentage_24h,
      volume24h: coin.total_volume
    }));
  } catch (_) {}
  return null;
}

async function loadMarkets() {
  if (currentTab === 'new') { renderTable(); return; }

  let rows = await fetchFromServer();
  if (!rows) rows = await fetchFromCoinGecko();

  if (rows && rows.length) {
    allRows = rows;
    renderTable();
    renderTicker(rows);
  }
}

// ── Tab switching ──
function setTab(tab) {
  currentTab = ['spot', 'futures', 'new'].includes(tab) ? tab : 'spot';
  if (marketsTabs) {
    marketsTabs.querySelectorAll('button[data-tab]').forEach(btn => {
      const active = btn.dataset.tab === currentTab;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });
  }
  clearInterval(refreshTimer);
  loadMarkets();
  startRefresh();
}

function startRefresh() {
  clearInterval(refreshTimer);
  if (currentTab !== 'new') {
    refreshTimer = setInterval(loadMarkets, 6000);
  }
}

// ── Sort ──
function setSort(key) {
  if (sortKey === key) {
    sortDir = sortDir === 'desc' ? 'asc' : 'desc';
  } else {
    sortKey = key;
    sortDir = key === 'name' ? 'asc' : 'desc';
  }
  document.querySelectorAll('.mk-table thead th[data-sort]').forEach(th => {
    th.classList.remove('sort-asc', 'sort-desc');
    if (th.dataset.sort === sortKey) {
      th.classList.add(sortDir === 'asc' ? 'sort-asc' : 'sort-desc');
    }
  });
  renderTable();
}

// ── Nav drawer ──
function setNavOpen(open) {
  if (!marketsNavDrawer || !marketsNavOverlay || !marketsMenuToggle) return;
  const shouldOpen = Boolean(open);
  marketsNavDrawer.classList.toggle('is-open', shouldOpen);
  marketsNavOverlay.classList.toggle('hidden', !shouldOpen);
  marketsNavDrawer.setAttribute('aria-hidden', shouldOpen ? 'false' : 'true');
  marketsNavOverlay.setAttribute('aria-hidden', shouldOpen ? 'false' : 'true');
  marketsMenuToggle.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
  document.body.classList.toggle('markets-nav-open', shouldOpen);
}

// ── Auth UI ──
async function loadCurrentUser() {
  try {
    const res  = await fetch('/api/p2p/me');
    const data = await res.json();
    const loggedIn = res.ok && data?.loggedIn;
    if (loggedIn) {
      if (marketsLoginBtn)  marketsLoginBtn.style.display  = 'none';
      if (marketsSignupBtn) marketsSignupBtn.style.display = 'none';
    }
  } catch (_) {}
}

// ── Event listeners ──
marketsTabs?.addEventListener('click', e => {
  const btn = e.target.closest('button[data-tab]');
  if (btn) setTab(btn.dataset.tab);
});

document.querySelector('.mk-table thead')?.addEventListener('click', e => {
  const th = e.target.closest('th[data-sort]');
  if (th) setSort(th.dataset.sort);
});

mkSearch?.addEventListener('input', e => {
  searchQ = e.target.value;
  renderTable();
});

marketsMenuToggle?.addEventListener('click', () => setNavOpen(true));
marketsNavClose?.addEventListener('click', () => setNavOpen(false));
marketsNavOverlay?.addEventListener('click', () => setNavOpen(false));
marketsNavDrawer?.addEventListener('click', e => {
  if (e.target.closest('a[href]')) setNavOpen(false);
});

window.addEventListener('keydown', e => {
  if (e.key === 'Escape') setNavOpen(false);
});

// ── Init ──
setTab('spot');
loadCurrentUser();
