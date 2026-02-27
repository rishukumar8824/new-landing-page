const form = document.getElementById('leadForm');
const message = document.getElementById('message');
const topSignupBtn = document.getElementById('topSignupBtn');
const heroUsers = document.getElementById('heroUsers');
const marketList = document.getElementById('marketList');
const marketTabs = document.getElementById('marketTabs');
const newsList = document.getElementById('newsList');
const spotPairsList = document.getElementById('spotPairsList');
const derivPairsList = document.getElementById('derivPairsList');
const eventsTrack = document.getElementById('eventsTrack');
const eventsCount = document.querySelector('.cf-events-count');

const otpRow = document.getElementById('otpRow');
const otpInput = document.getElementById('otpInput');
const verifyOtpBtn = document.getElementById('verifyOtpBtn');

const homeNavToggle = document.getElementById('homeNavToggle');
const homeNavClose = document.getElementById('homeNavClose');
const homeNavDrawer = document.getElementById('homeNavDrawer');
const homeNavOverlay = document.getElementById('homeNavOverlay');

const chartModal = document.getElementById('chartModal');
const chartModalTitle = document.getElementById('chartModalTitle');
const orderbookSource = document.getElementById('orderbookSource');
const closeChartBtn = document.getElementById('closeChartBtn');
const closeChartBackdrop = document.getElementById('closeChartBackdrop');
const obLastPrice = document.getElementById('obLastPrice');
const obChange24h = document.getElementById('obChange24h');
const obHigh24h = document.getElementById('obHigh24h');
const obLow24h = document.getElementById('obLow24h');
const obVolume24h = document.getElementById('obVolume24h');
const obAsksRows = document.getElementById('obAsksRows');
const obBidsRows = document.getElementById('obBidsRows');
const obTradesRows = document.getElementById('obTradesRows');

const MARKET_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'SOLUSDT', 'ADAUSDT'];
const MARKET_TAB_ORDER = {
  popular: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT'],
  new: ['ADAUSDT', 'SOLUSDT', 'XRPUSDT', 'BNBUSDT', 'ETHUSDT', 'BTCUSDT']
};
const COIN_NAMES = {
  BTCUSDT: 'Bitcoin',
  ETHUSDT: 'Ethereum',
  BNBUSDT: 'BNB',
  XRPUSDT: 'XRP',
  SOLUSDT: 'Solana',
  ADAUSDT: 'Cardano'
};

const COIN_ICONS = {
  BTC: '₿',
  ETH: '◆',
  BNB: '⬢',
  XRP: '✕',
  SOL: '◎',
  ADA: '◉'
};

const COIN_ICON_CODES = {
  BTC: 'btc',
  ETH: 'eth',
  BNB: 'bnb',
  XRP: 'xrp',
  SOL: 'sol',
  ADA: 'ada',
  DOGE: 'doge',
  AVAX: 'avax',
  LINK: 'link',
  LTC: 'ltc',
  TRX: 'trx'
};

const NEWS_ITEMS = [
  'Bitcoin dominates market flows as spot demand rises across major venues.',
  'Ether network activity rebounds after latest layer-2 upgrade cycle.',
  'Global payment rails expand stablecoin settlement for cross-border transfers.',
  'Institutional desks increase crypto allocation with tighter risk models.'
];

let pendingContact = '';
let pendingName = 'Website Lead';
let activeBookSymbol = '';
let depthRefreshTimer = null;
let marketTab = 'popular';
let eventsAutoSlide = null;

function setMessage(text, type = '') {
  if (!message) {
    return;
  }
  message.textContent = text;
  message.className = 'message';
  if (type) {
    message.classList.add(type);
  }
}

function setHomeNavOpen(open) {
  if (!homeNavDrawer || !homeNavOverlay || !homeNavToggle) {
    return;
  }

  const shouldOpen = Boolean(open);
  document.body.classList.toggle('cf-nav-open', shouldOpen);
  homeNavDrawer.classList.toggle('is-open', shouldOpen);
  homeNavOverlay.classList.toggle('hidden', !shouldOpen);
  homeNavDrawer.setAttribute('aria-hidden', shouldOpen ? 'false' : 'true');
  homeNavOverlay.setAttribute('aria-hidden', shouldOpen ? 'false' : 'true');
  homeNavToggle.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
}

function setupHomeNav() {
  if (!homeNavToggle || !homeNavDrawer || !homeNavOverlay) {
    return;
  }

  homeNavToggle.addEventListener('click', () => setHomeNavOpen(true));
  homeNavClose?.addEventListener('click', () => setHomeNavOpen(false));
  homeNavOverlay.addEventListener('click', () => setHomeNavOpen(false));

  homeNavDrawer.addEventListener('click', (event) => {
    const link = event.target.closest('a[href]');
    if (link) {
      setHomeNavOpen(false);
    }
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      setHomeNavOpen(false);
    }
  });
}

function animateCounter(targetValue) {
  if (!heroUsers) {
    return;
  }

  const start = 300000000;
  const end = targetValue;
  const duration = 1600;
  const startTime = performance.now();

  function tick(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const value = Math.floor(start + (end - start) * progress);
    heroUsers.textContent = value.toLocaleString('en-US');
    if (progress < 1) {
      requestAnimationFrame(tick);
    }
  }

  requestAnimationFrame(tick);
}

function renderNews() {
  if (!newsList) {
    return;
  }

  newsList.innerHTML = NEWS_ITEMS.map((item) => `<li>${item}</li>`).join('');
}

function initScrollReveal() {
  const nodes = document.querySelectorAll('.cf-reveal');
  if (!nodes.length) {
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.18 }
  );

  nodes.forEach((node) => {
    if (!node.classList.contains('is-visible')) {
      observer.observe(node);
    }
  });
}

function formatPrice(value) {
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatLarge(value, digits = 2) {
  return Number(value || 0).toLocaleString(undefined, {
    maximumFractionDigits: digits
  });
}

function formatTradeTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '--:--:--';
  }
  return date.toLocaleTimeString([], { hour12: false });
}

function getCoinIconMarkup(base, size = 64, wrapperClass = 'bnx-coin-dot') {
  const coin = String(base || '').toUpperCase();
  const fallback = COIN_ICONS[coin] || coin.slice(0, 1) || '?';
  const code = COIN_ICON_CODES[coin];

  if (!code) {
    return `<span class="${wrapperClass}"><span class="coin-fallback">${fallback}</span></span>`;
  }

  return `
    <span class="${wrapperClass}">
      <img src="https://assets.coincap.io/assets/icons/${code}@2x.png" alt="${coin}" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.style.display='none'" />
      <span class="coin-fallback">${fallback}</span>
    </span>
  `;
}

function setRows(target, rows, htmlFactory, colspan) {
  if (!target) {
    return;
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    target.innerHTML = `<tr><td colspan="${colspan}">No data</td></tr>`;
    return;
  }
  target.innerHTML = rows.map(htmlFactory).join('');
}

function renderOrderBook(data) {
  const ticker = data?.ticker || {};
  const change = Number(ticker.change24h || 0);

  if (orderbookSource) {
    const sourceLabel = String(data?.source || 'fallback').toUpperCase();
    orderbookSource.textContent = `Source: ${sourceLabel}`;
  }
  if (obLastPrice) {
    obLastPrice.textContent = `$${formatLarge(ticker.lastPrice, 4)}`;
  }
  if (obHigh24h) {
    obHigh24h.textContent = `$${formatLarge(ticker.high24h, 4)}`;
  }
  if (obLow24h) {
    obLow24h.textContent = `$${formatLarge(ticker.low24h, 4)}`;
  }
  if (obVolume24h) {
    obVolume24h.textContent = formatLarge(ticker.volume24h, 2);
  }
  if (obChange24h) {
    obChange24h.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
    obChange24h.classList.remove('up', 'down');
    obChange24h.classList.add(change >= 0 ? 'up' : 'down');
  }

  setRows(
    obAsksRows,
    data?.orderBook?.asks,
    (row) => `
      <tr>
        <td class="price-down">${formatLarge(row.price, 4)}</td>
        <td>${formatLarge(row.quantity, 5)}</td>
        <td>${formatLarge(row.total, 2)}</td>
      </tr>
    `,
    3
  );

  setRows(
    obBidsRows,
    data?.orderBook?.bids,
    (row) => `
      <tr>
        <td class="price-up">${formatLarge(row.price, 4)}</td>
        <td>${formatLarge(row.quantity, 5)}</td>
        <td>${formatLarge(row.total, 2)}</td>
      </tr>
    `,
    3
  );

  setRows(
    obTradesRows,
    data?.trades,
    (trade) => `
      <tr>
        <td>${formatTradeTime(trade.time)}</td>
        <td class="${trade.side === 'sell' ? 'price-down' : 'price-up'}">${formatLarge(trade.price, 4)}</td>
        <td>${formatLarge(trade.quantity, 5)}</td>
        <td>${trade.side === 'sell' ? 'Sell' : 'Buy'}</td>
      </tr>
    `,
    4
  );
}

async function loadMarketDepth(symbol) {
  const response = await fetch(`/api/p2p/market-depth?symbol=${encodeURIComponent(symbol)}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Market feed unavailable');
  }
  renderOrderBook(data);
}

async function refreshDepth() {
  if (!activeBookSymbol) {
    return;
  }
  try {
    await loadMarketDepth(activeBookSymbol);
  } catch (error) {
    if (orderbookSource) {
      orderbookSource.textContent = error.message;
    }
  }
}

function openChart(symbol) {
  if (!chartModal || !chartModalTitle) {
    return;
  }
  const pair = symbol.replace('USDT', '/USDT');
  chartModalTitle.textContent = `${pair} Live Order Book`;
  activeBookSymbol = symbol;
  chartModal.classList.remove('hidden');
  chartModal.setAttribute('aria-hidden', 'false');

  if (depthRefreshTimer) {
    clearInterval(depthRefreshTimer);
  }
  refreshDepth();
  depthRefreshTimer = setInterval(refreshDepth, 3000);
}

function closeChart() {
  if (!chartModal) {
    return;
  }
  activeBookSymbol = '';
  if (depthRefreshTimer) {
    clearInterval(depthRefreshTimer);
    depthRefreshTimer = null;
  }
  chartModal.classList.add('hidden');
  chartModal.setAttribute('aria-hidden', 'true');
}

function openTradePage(symbol, marketType = 'spot') {
  const market = marketType === 'perp' ? 'perp' : 'spot';
  const safeSymbol = String(symbol || 'BTCUSDT')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  const finalSymbol = safeSymbol.endsWith('USDTP') ? safeSymbol.replace(/USDTP$/, 'USDT') : safeSymbol;
  window.location.href = `/trade/${market}/${encodeURIComponent(finalSymbol || 'BTCUSDT')}`;
}

function renderMiniMarketRows(ticker) {
  if (!marketList) {
    return;
  }

  if (!Array.isArray(ticker) || ticker.length === 0) {
    marketList.innerHTML = '<p class="bnx-loading">Market feed unavailable.</p>';
    return;
  }

  const tickerBySymbol = new Map(ticker.map((item) => [item.symbol, item]));
  let selectedRows = [...ticker];

  if (marketTab === 'trends') {
    selectedRows.sort((a, b) => Number(b.volume24h || 0) - Number(a.volume24h || 0));
  } else if (marketTab === 'change') {
    selectedRows.sort((a, b) => Math.abs(Number(b.change24h || 0)) - Math.abs(Number(a.change24h || 0)));
  } else if (MARKET_TAB_ORDER[marketTab]) {
    selectedRows = MARKET_TAB_ORDER[marketTab].map((symbol) => tickerBySymbol.get(symbol)).filter(Boolean);
  }

  marketList.innerHTML = selectedRows
    .slice(0, 6)
    .map((item) => {
      const change = Number(item.change24h || 0);
      const sign = change >= 0 ? '+' : '';
      const cls = change >= 0 ? 'up' : 'down';
      const symbol = item.symbol;
      const base = symbol.replace('USDT', '');
      const name = COIN_NAMES[symbol] || base;
      return `
        <a class="bnx-market-row" href="/trade/spot/${encodeURIComponent(symbol)}" data-symbol="${symbol}">
          <div class="bnx-market-symbol">
            ${getCoinIconMarkup(base, 64, 'bnx-coin-dot')}
            <p>${base} <small>${name}</small></p>
          </div>
          <p class="bnx-market-price">$${formatPrice(item.lastPrice)}</p>
          <p class="bnx-market-change ${cls}">${sign}${change.toFixed(2)}%</p>
        </a>
      `;
    })
    .join('');
}

function renderOpportunities(ticker) {
  if ((!spotPairsList && !derivPairsList) || !Array.isArray(ticker)) {
    return;
  }

  const top = ticker.slice(0, 5);

  if (spotPairsList) {
    if (top.length === 0) {
      spotPairsList.innerHTML = '<p class="bnx-loading">Spot pairs unavailable.</p>';
    } else {
      spotPairsList.innerHTML = top
        .map((item) => {
          const base = item.symbol.replace('USDT', '');
          const change = Number(item.change24h || 0);
          const cls = change >= 0 ? 'up' : 'down';
          const sign = change >= 0 ? '+' : '';

          return `
            <a class="cf-pair-row" href="/trade/spot/${encodeURIComponent(item.symbol)}" data-market="spot" data-symbol="${item.symbol}">
              <div class="cf-pair-main">
                ${getCoinIconMarkup(base, 64, 'cf-pair-icon')}
                <p>${base}/USDT</p>
              </div>
              <p class="cf-pair-price">${formatPrice(item.lastPrice)}</p>
              <p class="cf-pair-change ${cls}">${sign}${change.toFixed(2)}%</p>
            </a>
          `;
        })
        .join('');
    }
  }

  if (derivPairsList) {
    if (top.length === 0) {
      derivPairsList.innerHTML = '<p class="bnx-loading">Derivatives unavailable.</p>';
    } else {
      derivPairsList.innerHTML = top
        .map((item) => {
          const base = item.symbol.replace('USDT', '');
          const change = Number(item.change24h || 0);
          const cls = change >= 0 ? 'up' : 'down';
          const sign = change >= 0 ? '+' : '';

          return `
            <a class="cf-pair-row" href="/trade/perp/${encodeURIComponent(item.symbol)}" data-market="perp" data-symbol="${item.symbol}">
              <div class="cf-pair-main">
                ${getCoinIconMarkup(base, 64, 'cf-pair-icon')}
                <p>${base}USDT-P</p>
              </div>
              <p class="cf-pair-price">${formatPrice(item.lastPrice)}</p>
              <p class="cf-pair-change ${cls}">${sign}${change.toFixed(2)}%</p>
            </a>
          `;
        })
        .join('');
    }
  }
}

function setMarketTab(tab) {
  const safeTab = ['popular', 'trends', 'change', 'new'].includes(tab) ? tab : 'popular';
  marketTab = safeTab;

  if (marketTabs) {
    marketTabs.querySelectorAll('button[data-market-tab]').forEach((btn) => {
      const isActive = btn.dataset.marketTab === safeTab;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
  }
}

function updateEventsCount() {
  if (!eventsTrack || !eventsCount) {
    return;
  }
  const cards = Array.from(eventsTrack.querySelectorAll('.cf-event-card'));
  if (!cards.length) {
    return;
  }
  const cardWidth = cards[0].offsetWidth || 1;
  const activeIndex = Math.min(cards.length - 1, Math.max(0, Math.round(eventsTrack.scrollLeft / cardWidth)));
  eventsCount.textContent = `${activeIndex + 1}/${cards.length}`;
}

function setupEventsCarousel() {
  if (!eventsTrack) {
    return;
  }
  const cards = Array.from(eventsTrack.querySelectorAll('.cf-event-card'));
  if (!cards.length) {
    return;
  }

  const scrollToCard = (index) => {
    const safeIndex = ((index % cards.length) + cards.length) % cards.length;
    const nextCard = cards[safeIndex];
    if (!nextCard) {
      return;
    }
    const left = Math.max(0, nextCard.offsetLeft - eventsTrack.offsetLeft);
    eventsTrack.scrollTo({ left, behavior: 'smooth' });
  };

  eventsTrack.addEventListener('scroll', updateEventsCount, { passive: true });
  updateEventsCount();

  if (window.matchMedia('(max-width: 768px)').matches) {
    let current = 0;
    if (eventsAutoSlide) {
      clearInterval(eventsAutoSlide);
    }
    eventsAutoSlide = setInterval(() => {
      current = (current + 1) % cards.length;
      scrollToCard(current);
    }, 3200);
  }
}

async function loadMarket() {
  try {
    const params = new URLSearchParams({
      symbols: MARKET_SYMBOLS.join(',')
    });
    const response = await fetch(`/api/p2p/exchange-ticker?${params.toString()}`);
    const data = await response.json();

    if (!response.ok || !Array.isArray(data.ticker)) {
      throw new Error('Ticker unavailable');
    }

    renderMiniMarketRows(data.ticker);
    renderOpportunities(data.ticker);
  } catch (error) {
    renderMiniMarketRows([]);
    renderOpportunities([]);
  }
}

function normalizeContact(rawValue) {
  const raw = String(rawValue || '').trim();
  const digits = raw.replace(/\D/g, '');
  const isPhone = /^\d{10}$/.test(digits);
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw);

  if (isPhone) {
    return digits;
  }
  if (isEmail) {
    return raw.toLowerCase();
  }
  return '';
}

async function sendOtp(contact, name) {
  const response = await fetch('/api/signup/send-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contact, name })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Unable to send verification code.');
  }
  return data;
}

async function verifyOtp(contact, name, code) {
  const response = await fetch('/api/signup/verify-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contact, name, code })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Verification failed.');
  }
  return data;
}

if (form) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const name = String(document.getElementById('name')?.value || 'Website Lead').trim() || 'Website Lead';
    const contactInput = String(document.getElementById('mobile')?.value || '').trim();
    const contact = normalizeContact(contactInput);

    if (!contact) {
      setMessage('Please enter a valid email or 10-digit mobile number.', 'error');
      return;
    }

    try {
      const data = await sendOtp(contact, name);
      pendingContact = contact;
      pendingName = name;
      otpRow?.classList.remove('hidden');
      setMessage(data.message, 'success');

      if (data.devCode) {
        setMessage(`${data.message} Demo code: ${data.devCode}`, 'success');
      }
    } catch (error) {
      setMessage(error.message, 'error');
    }
  });
}

if (verifyOtpBtn) {
  verifyOtpBtn.addEventListener('click', async () => {
    const code = String(otpInput?.value || '').trim();

    if (!pendingContact) {
      setMessage('Please request verification code first.', 'error');
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      setMessage('Please enter valid 6-digit code.', 'error');
      return;
    }

    try {
      const data = await verifyOtp(pendingContact, pendingName, code);
      setMessage(data.message, 'success');
      form?.reset();
      if (otpInput) {
        otpInput.value = '';
      }
      otpRow?.classList.add('hidden');
      pendingContact = '';
      pendingName = 'Website Lead';
    } catch (error) {
      setMessage(error.message, 'error');
    }
  });
}

if (topSignupBtn) {
  topSignupBtn.addEventListener('click', () => {
    form?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}

if (marketList) {
  marketList.addEventListener('click', (event) => {
    const row = event.target.closest('[data-symbol]');
    if (!row?.dataset?.symbol) {
      return;
    }
    openTradePage(row.dataset.symbol, 'spot');
  });
}

if (marketTabs) {
  marketTabs.addEventListener('click', (event) => {
    const tabBtn = event.target.closest('button[data-market-tab]');
    if (!tabBtn) {
      return;
    }
    setMarketTab(tabBtn.dataset.marketTab || 'popular');
    loadMarket();
  });
}

[spotPairsList, derivPairsList].forEach((container) => {
  if (!container) {
    return;
  }

  container.addEventListener('click', (event) => {
    const row = event.target.closest('[data-symbol]');
    if (!row?.dataset?.symbol) {
      return;
    }
    const marketType = row.dataset.market === 'perp' ? 'perp' : 'spot';
    openTradePage(row.dataset.symbol, marketType);
  });
});

document.querySelectorAll('.cf-view-more[data-market]').forEach((button) => {
  button.addEventListener('click', () => {
    const marketType = button.dataset.market === 'perp' ? 'perp' : 'spot';
    openTradePage('BTCUSDT', marketType);
  });
});

if (closeChartBtn) {
  closeChartBtn.addEventListener('click', closeChart);
}
if (closeChartBackdrop) {
  closeChartBackdrop.addEventListener('click', closeChart);
}

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && chartModal && !chartModal.classList.contains('hidden')) {
    closeChart();
  }
});

setupHomeNav();
setupEventsCarousel();
setMarketTab('popular');
animateCounter(309497423);
renderNews();
initScrollReveal();
loadMarket();
setInterval(loadMarket, 12000);
