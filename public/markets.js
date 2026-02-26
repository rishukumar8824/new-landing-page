const marketsRows = document.getElementById('marketsRows');
const marketsTabs = document.getElementById('marketsTabs');

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

const ICON_SLUGS = {
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

function formatPrice(value) {
  return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 5 });
}

function getCoinIconMarkup(base, size = 64) {
  const coin = String(base || '').toUpperCase();
  const fallback = ICONS[coin] || coin.slice(0, 1) || '?';
  const slug = ICON_SLUGS[coin];

  if (!slug) {
    return `<span class="market-logo"><span class="coin-fallback">${fallback}</span></span>`;
  }

  return `
    <span class="market-logo">
      <img src="https://cryptoicons.org/api/icon/${slug}/${size}" alt="${coin}" loading="lazy" onerror="this.remove()" />
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
        <button type="button" class="market-row" data-symbol="${symbol}">
          <div class="market-pair">
            ${getCoinIconMarkup(base)}
            <p class="market-symbol">${base}<small>/USDT</small></p>
          </div>
          <p class="market-price">${formatPrice(item.lastPrice)}</p>
          <span class="market-change ${isUp ? 'up' : 'down'}">${isUp ? '+' : ''}${change.toFixed(2)}%</span>
        </button>
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

async function loadMarkets() {
  try {
    const params = new URLSearchParams({ symbols: SYMBOLS.join(',') });
    const response = await fetch(`/api/p2p/exchange-ticker?${params.toString()}`);
    const payload = await response.json();

    if (!response.ok || !Array.isArray(payload.ticker)) {
      throw new Error(payload.message || 'Market feed unavailable.');
    }

    cacheRows = payload.ticker;
    renderRows(cacheRows);
  } catch (error) {
    renderRows([]);
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
  const symbol = String(row.dataset.symbol).toUpperCase().replace(/[^A-Z0-9]/g, '');
  window.location.href = `/trade/spot/${encodeURIComponent(symbol || 'BTCUSDT')}`;
});

setTab('popular');
loadMarkets();
setInterval(loadMarkets, 10000);
