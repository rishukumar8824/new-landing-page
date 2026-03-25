const form = document.getElementById('leadForm');
const message = document.getElementById('message');
const topLoginBtn = document.getElementById('topLoginBtn');
const topSignupBtn = document.getElementById('topSignupBtn');
const topAssetsBtn = document.getElementById('topAssetsBtn');
const topLogoutBtn = document.getElementById('topLogoutBtn');
const drawerLoginLink = document.getElementById('drawerLoginLink');
const drawerSignupLink = document.getElementById('drawerSignupLink');
const drawerAssetsLink = document.getElementById('drawerAssetsLink');
const drawerLogoutBtn = document.getElementById('drawerLogoutBtn');
const contactInput = document.getElementById('mobile');
const heroGuestPanel = document.getElementById('heroGuestPanel');
const heroUserPanel = document.getElementById('heroUserPanel');
const heroUserName = document.getElementById('heroUserName');
const heroUserMeta = document.getElementById('heroUserMeta');
const heroLogoutBtn = document.getElementById('heroLogoutBtn');
const heroUsers = document.getElementById('heroUsers');
const marketList = document.getElementById('marketList');
const marketTabs = document.getElementById('marketTabs');
const newsList = document.getElementById('newsList');
const spotPairsList = document.getElementById('spotPairsList');
const derivPairsList = document.getElementById('derivPairsList');
const eventsTrack = document.getElementById('eventsTrack');
const eventsCount = document.querySelector('.cf-events-count');
const exchangeTickerTrack = document.getElementById('exchangeTickerTrack');
const socialSignupButtons = Array.from(document.querySelectorAll('.social-pill[data-provider]'));
const guestOnlyNodes = Array.from(document.querySelectorAll('[data-auth-guest-only]'));
const userOnlyNodes = Array.from(document.querySelectorAll('[data-auth-user-only]'));

const otpRow = document.getElementById('otpRow');
const otpInput = document.getElementById('otpInput');
const verifyOtpBtn = document.getElementById('verifyOtpBtn');
const signupPromptModal = document.getElementById('signupPromptModal');
const signupPromptBackdrop = document.getElementById('signupPromptBackdrop');
const signupPromptEmail = document.getElementById('signupPromptEmail');
const signupPromptMessage = document.getElementById('signupPromptMessage');
const signupPromptContinue = document.getElementById('signupPromptContinue');
const signupPromptClose = document.getElementById('signupPromptClose');

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

const MARKET_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'XRPUSDT', 'SOLUSDT', 'TRXUSDT', 'DOGEUSDT', 'WIFUSDT', 'BNBUSDT'];
const MARKET_TAB_ORDER = {
  hotspot: ['BTCUSDT', 'ETHUSDT', 'XRPUSDT', 'SOLUSDT', 'TRXUSDT', 'DOGEUSDT', 'WIFUSDT'],
  hotfutures: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'DOGEUSDT', 'WIFUSDT']
};
const COIN_NAMES = {
  BTCUSDT: 'Bitcoin',
  ETHUSDT: 'Ethereum',
  BNBUSDT: 'BNB',
  XRPUSDT: 'XRP',
  SOLUSDT: 'Solana',
  TRXUSDT: 'TRON',
  ADAUSDT: 'Cardano',
  DOGEUSDT: 'Dogecoin',
  WIFUSDT: 'Dogwifhat'
};

const COIN_ICONS = {
  BTC: '₿',
  ETH: '◆',
  BNB: '⬢',
  XRP: '✕',
  SOL: '◎',
  ADA: '◉',
  XAUT: '✦',
  DOGE: 'Ð',
  WIF: 'W'
};

const COIN_ICON_CODES = {
  BTC: 'btc',
  ETH: 'eth',
  BNB: 'bnb',
  XRP: 'xrp',
  SOL: 'sol',
  ADA: 'ada',
  DOGE: 'doge',
  XAUT: 'xaut',
  WIF: 'wif',
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

const MARKET_REFRESH_INTERVAL_MS = 5000;
const COINGECKO_IDS = {
  BTCUSDT: 'bitcoin',
  ETHUSDT: 'ethereum',
  BNBUSDT: 'binancecoin',
  XRPUSDT: 'ripple',
  SOLUSDT: 'solana',
  TRXUSDT: 'tron',
  DOGEUSDT: 'dogecoin',
  WIFUSDT: 'dogwifcoin'
};

let pendingContact = '';
let pendingName = 'Website Lead';
let activeBookSymbol = '';
let depthRefreshTimer = null;
let marketTab = 'hotspot';
let eventsAutoSlide = null;
let marketRefreshTimer = null;
let marketLoadSeq = 0;
let currentSessionUser = null;

const openSignupFromQuery = new URLSearchParams(window.location.search).get('signup') === '1';

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

function setSignupPromptMessage(text, type = '') {
  if (!signupPromptMessage) {
    return;
  }
  signupPromptMessage.textContent = text;
  signupPromptMessage.className = 'cf-signup-modal-message';
  if (type) {
    signupPromptMessage.classList.add(type);
  }
}

function updateHomeAuthUi(user) {
  currentSessionUser = user || null;
  const loggedIn = Boolean(currentSessionUser);

  guestOnlyNodes.forEach((node) => {
    node.classList.toggle('hidden', loggedIn);
  });
  userOnlyNodes.forEach((node) => {
    node.classList.toggle('hidden', !loggedIn);
  });

  if (heroGuestPanel) {
    heroGuestPanel.classList.toggle('hidden', loggedIn);
  }
  if (heroUserPanel) {
    heroUserPanel.classList.toggle('hidden', !loggedIn);
  }

  if (heroUserName) {
    heroUserName.textContent = currentSessionUser?.username || currentSessionUser?.email || 'Bitegit User';
  }
  if (heroUserMeta) {
    if (currentSessionUser?.email) {
      const kycStatus = String(currentSessionUser?.kyc?.statusLabel || currentSessionUser?.kyc?.status || 'Not submitted')
        .replace(/_/g, ' ')
        .trim();
      heroUserMeta.textContent = `${currentSessionUser.email} • KYC ${kycStatus || 'Not submitted'}`;
    } else {
      heroUserMeta.textContent = 'Your account is ready for markets, P2P and assets.';
    }
  }
}

async function loadHomeSession() {
  try {
    const response = await fetch('/api/p2p/me', { credentials: 'include' });
    const data = await response.json().catch(() => ({}));
    updateHomeAuthUi(response.ok && data?.loggedIn ? data.user : null);
  } catch (_) {
    updateHomeAuthUi(null);
  }
}

async function logoutHomeSession() {
  try {
    await fetch('/api/p2p/logout', {
      method: 'POST',
      credentials: 'include'
    });
  } catch (_) {
    // Ignore logout network failures and reset local UI state anyway.
  }
  updateHomeAuthUi(null);
  setHomeNavOpen(false);
  window.location.href = '/';
}

function syncHomeInteractionState() {
  const hasBlockingLayer =
    document.body.classList.contains('cf-nav-open') ||
    document.body.classList.contains('cf-signup-open') ||
    Boolean(chartModal && !chartModal.classList.contains('hidden'));

  document.body.style.overflow = hasBlockingLayer ? 'hidden' : 'auto';
  document.body.style.pointerEvents = 'auto';
}

function setSignupPromptOpen(open) {
  if (!signupPromptModal) {
    return;
  }
  const shouldOpen = Boolean(open);
  signupPromptModal.classList.toggle('hidden', !shouldOpen);
  signupPromptModal.setAttribute('aria-hidden', shouldOpen ? 'false' : 'true');
  document.body.classList.toggle('cf-signup-open', shouldOpen);
  if (shouldOpen) {
    setSignupPromptMessage('');
    window.requestAnimationFrame(() => signupPromptEmail?.focus());
  }
  syncHomeInteractionState();
}

function focusLeadForm() {
  form?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  form?.classList.add('is-focus');
  window.setTimeout(() => form?.classList.remove('is-focus'), 900);
  window.setTimeout(() => contactInput?.focus(), 260);
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
  syncHomeInteractionState();
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

function setupEveryone3DReveal() {
  const everyoneSection = document.querySelector('.cf-everyone');
  if (!everyoneSection || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  let inViewport = false;
  let rafId = 0;

  const resetEffect = () => {
    everyoneSection.classList.remove('cf-everyone-3d-active');
    everyoneSection.style.removeProperty('transform');
    everyoneSection.style.removeProperty('box-shadow');
  };

  const updateEffect = () => {
    rafId = 0;
    if (!inViewport || document.hidden || !everyoneSection.classList.contains('is-visible')) {
      return;
    }

    const rect = everyoneSection.getBoundingClientRect();
    const viewportHeight = window.innerHeight || 1;
    const progressRaw = (viewportHeight - rect.top) / (viewportHeight + rect.height * 0.45);
    const progress = Math.min(1, Math.max(0, progressRaw));
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const riseMax = isMobile ? 7 : 16;
    const tiltMax = isMobile ? 2.2 : 5.4;
    const rise = (1 - progress) * riseMax;
    const tilt = (1 - progress) * tiltMax;
    const shadowY = Math.round(22 + progress * 14);
    const shadowBlur = Math.round(52 + progress * 16);
    const shadowAlpha = (0.28 + progress * 0.16).toFixed(3);

    everyoneSection.classList.add('cf-everyone-3d-active');
    everyoneSection.style.transform = `translate3d(0, ${rise.toFixed(2)}px, 0) rotateX(${tilt.toFixed(2)}deg)`;
    everyoneSection.style.boxShadow = `0 ${shadowY}px ${shadowBlur}px rgba(0, 0, 0, ${shadowAlpha})`;
  };

  const scheduleUpdate = () => {
    if (rafId || !inViewport || document.hidden) {
      return;
    }
    rafId = window.requestAnimationFrame(updateEffect);
  };

  const sectionObserver = new IntersectionObserver(
    (entries) => {
      inViewport = Boolean(entries[0]?.isIntersecting);
      if (!inViewport) {
        resetEffect();
        return;
      }
      scheduleUpdate();
      window.setTimeout(scheduleUpdate, 120);
    },
    { threshold: [0, 0.15, 0.35], rootMargin: '120px 0px 120px 0px' }
  );

  sectionObserver.observe(everyoneSection);
  window.addEventListener('scroll', scheduleUpdate, { passive: true });
  window.addEventListener('resize', scheduleUpdate, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      return;
    }
    scheduleUpdate();
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
  if (!chartModal.classList.contains('hidden') && activeBookSymbol === symbol) {
    return;
  }
  const pair = symbol.replace('USDT', '/USDT');
  chartModalTitle.textContent = `${pair} Live Order Book`;
  activeBookSymbol = symbol;
  document.body.classList.add('cf-chart-open');
  chartModal.classList.remove('hidden');
  chartModal.setAttribute('aria-hidden', 'false');

  if (depthRefreshTimer) {
    clearInterval(depthRefreshTimer);
  }
  refreshDepth();
  depthRefreshTimer = setInterval(refreshDepth, 3000);
  syncHomeInteractionState();
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
  document.body.classList.remove('cf-chart-open');
  syncHomeInteractionState();
}

function openTradePage(symbol, marketType = 'spot') {
  const market = marketType === 'perp' ? 'perp' : 'spot';
  const safeSymbol = String(symbol || 'BTCUSDT')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  const finalSymbol = safeSymbol.endsWith('USDTP') ? safeSymbol.replace(/USDTP$/, 'USDT') : safeSymbol;
  window.location.href = `/chart.html?symbol=${encodeURIComponent(finalSymbol || 'BTCUSDT')}`;
}

function openCopyTradingChart(symbol) {
  const safeSymbol = String(symbol || 'BTCUSDT')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  const finalSymbol = safeSymbol.endsWith('USDTP') ? safeSymbol.replace(/USDTP$/, 'USDT') : safeSymbol || 'BTCUSDT';

  if (chartModal) {
    openChart(finalSymbol);
    return;
  }

  openTradePage(finalSymbol, 'spot');
}

function renderMiniMarketRows(ticker) {
  if (!marketList) {
    return;
  }

  if (!Array.isArray(ticker) || ticker.length === 0) {
    marketList.innerHTML = '<tr><td colspan="5" class="bnx-loading">Market feed unavailable.</td></tr>';
    return;
  }

  const tickerBySymbol = new Map(ticker.map((item) => [item.symbol, item]));
  let selectedRows = [...ticker];

  if (MARKET_TAB_ORDER[marketTab]) {
    selectedRows = MARKET_TAB_ORDER[marketTab].map((symbol) => tickerBySymbol.get(symbol)).filter(Boolean);
  }

  const rowMarket = marketTab === 'hotfutures' ? 'perp' : 'spot';
  const isFuturesTab = rowMarket === 'perp';

  marketList.innerHTML = selectedRows
    .slice(0, 7)
    .map((item) => {
      const change = Number(item.change24h || 0);
      const sign = change >= 0 ? '+' : '';
      const cls = change >= 0 ? 'positive' : 'negative';
      const symbol = item.symbol;
      const base = symbol.replace('USDT', '');
      const coinName = COIN_NAMES[symbol] || base;
      const volume = Number(item.volume24h || 0);
      const volumeFormatted = volume >= 1e6
        ? (volume / 1e6).toFixed(2) + 'M'
        : volume >= 1e3
          ? (volume / 1e3).toFixed(2) + 'K'
          : formatLarge(volume, 2);
      const tradeHref = `/chart.html?symbol=${encodeURIComponent(symbol)}`;
      const priceFmt = Number(item.lastPrice) >= 1
        ? '$' + formatLarge(item.lastPrice, 2)
        : '$' + formatLarge(item.lastPrice, 4);
      return `
        <tr class="cf-gate-market-row" data-href="${tradeHref}" data-symbol="${symbol}" data-market="${rowMarket}" style="cursor:pointer">
          <td class="cf-gate-coin-cell">
            ${getCoinIconMarkup(base, 64, 'cf-gate-coin-icon')}
            <div class="cf-gate-coin-names">
              <span class="cf-gate-coin-sym">${base}</span>
              <span class="cf-gate-coin-name">${coinName}</span>
            </div>
          </td>
          <td class="cf-gate-price-cell">${priceFmt}</td>
          <td class="cf-gate-change-cell ${cls}">${sign}${change.toFixed(2)}%</td>
          <td class="cf-gate-vol-cell">${volumeFormatted}</td>
          <td class="cf-gate-action-cell">
            <a class="cf-gate-trade-btn" href="${tradeHref}">Trade</a>
          </td>
        </tr>
      `;
    })
    .join('');
}

function renderExchangeTicker(ticker) {
  if (!exchangeTickerTrack) {
    return;
  }

  const hasLiveData = Array.isArray(ticker) && ticker.length > 0;
  const sourceRows = hasLiveData
    ? ticker.slice(0, 8)
    : MARKET_SYMBOLS.slice(0, 6).map((symbol) => ({ symbol, lastPrice: null, change24h: null }));

  const trackMarkup = sourceRows
    .map((item) => {
      const symbol = String(item?.symbol || 'BTCUSDT').toUpperCase();
      const pair = symbol.replace(/USDT$/, '/USDT');
      const change = Number(item?.change24h);
      const hasNumericChange = Number.isFinite(change);
      const hasNumericPrice = Number.isFinite(Number(item?.lastPrice)) && Number(item?.lastPrice) > 0;
      const cls = hasNumericChange && change < 0 ? 'down' : 'up';
      const sign = hasNumericChange && change >= 0 ? '+' : '';
      const priceText = hasNumericPrice ? `$${formatLarge(item.lastPrice, Number(item.lastPrice) >= 100 ? 2 : 4)}` : '$--';
      const changeText = hasNumericChange ? `${sign}${change.toFixed(2)}%` : '--%';
      return `<a class="cf-exchange-ticker-item ${cls}" href="/chart.html?symbol=${encodeURIComponent(symbol)}" style="text-decoration:none">${pair}<strong>${priceText}</strong><em>${changeText}</em></a>`;
    })
    .join('');

  exchangeTickerTrack.innerHTML = `${trackMarkup}${trackMarkup}`;
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
            <a class="cf-pair-row" href="/chart.html?symbol=${encodeURIComponent(item.symbol)}" data-market="spot" data-symbol="${item.symbol}">
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
            <a class="cf-pair-row" href="/chart.html?symbol=${encodeURIComponent(item.symbol)}" data-market="perp" data-symbol="${item.symbol}">
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
  const safeTab = ['hotspot', 'hotfutures', 'new'].includes(tab) ? tab : 'hotspot';
  marketTab = safeTab;

  if (marketTabs) {
    marketTabs.querySelectorAll('button[data-market-tab]').forEach((btn) => {
      const isActive = btn.dataset.marketTab === safeTab;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
  }

  if (safeTab === 'new' && marketList) {
    marketList.innerHTML = '<tr><td colspan="5" class="bnx-loading">New listings coming soon.</td></tr>';
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

function setupCopyTradingCarousel() {
  const copyTrack = document.querySelector('.cf-copy-grid');
  if (!copyTrack) {
    return;
  }

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isCompactViewport = window.matchMedia('(max-width: 1023px)').matches;
  if (prefersReducedMotion || !isCompactViewport) {
    return;
  }

  let scrollTimer = null;
  let resumeTimer = null;
  let sectionVisible = true;
  const speed = 1.25;
  const tickMs = 40;

  const stopAutoScroll = () => {
    if (resumeTimer) {
      clearTimeout(resumeTimer);
      resumeTimer = null;
    }
    if (scrollTimer !== null) {
      clearInterval(scrollTimer);
      scrollTimer = null;
    }
  };

  const startAutoScroll = () => {
    if (scrollTimer !== null || document.hidden || !sectionVisible) {
      return;
    }
    scrollTimer = setInterval(() => {
      const max = Math.max(0, copyTrack.scrollWidth - copyTrack.clientWidth);
      if (max <= 1) {
        return;
      }
      const next = copyTrack.scrollLeft + speed;
      copyTrack.scrollLeft = next >= max ? 0 : next;
    }, tickMs);
  };

  const pauseThenResume = () => {
    stopAutoScroll();
    resumeTimer = setTimeout(() => {
      startAutoScroll();
    }, 1200);
  };

  copyTrack.addEventListener('touchstart', stopAutoScroll, { passive: true });
  copyTrack.addEventListener('touchend', pauseThenResume);
  copyTrack.addEventListener('pointerdown', stopAutoScroll);
  copyTrack.addEventListener('pointerup', pauseThenResume);
  copyTrack.addEventListener('mouseenter', stopAutoScroll);
  copyTrack.addEventListener('mouseleave', startAutoScroll);

  const visibilityObserver = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      sectionVisible = Boolean(entry?.isIntersecting);
      if (sectionVisible) {
        startAutoScroll();
      } else {
        stopAutoScroll();
      }
    },
    { threshold: 0.2 }
  );
  visibilityObserver.observe(copyTrack);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopAutoScroll();
      return;
    }
    startAutoScroll();
  });

  startAutoScroll();
}

function safeVideoPlay(video) {
  if (!video) {
    return;
  }
  const maybePromise = video.play();
  if (maybePromise && typeof maybePromise.catch === 'function') {
    maybePromise.catch(() => {});
  }
}

function setupMediaPlaybackOptimization() {
  const heroVideo = document.querySelector('.cf-hero-video');
  const secondaryVideos = Array.from(document.querySelectorAll('.cf-feature-media-video, .cf-mobile-video'));

  if (!heroVideo && !secondaryVideos.length) {
    return;
  }

  secondaryVideos.forEach((video) => {
    const mediaCard = video.closest('.cf-feature-media-card');
    if (mediaCard) {
      mediaCard.classList.remove('cf-media-ready');
      const markReady = () => mediaCard.classList.add('cf-media-ready');
      const markFallback = () => mediaCard.classList.remove('cf-media-ready');
      video.addEventListener('loadeddata', markReady, { once: true });
      video.addEventListener('canplay', markReady, { once: true });
      video.addEventListener('error', markFallback);
      if (video.readyState >= 2) {
        markReady();
      }
    }

    video.preload = 'none';
    video.autoplay = false;
    video.dataset.inViewport = '0';
    video.pause();
  });

  if (secondaryVideos.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target;
          const isVisible = Boolean(entry.isIntersecting);
          video.dataset.inViewport = isVisible ? '1' : '0';

          if (isVisible && !document.hidden) {
            safeVideoPlay(video);
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.35, rootMargin: '120px 0px 120px 0px' }
    );

    secondaryVideos.forEach((video) => observer.observe(video));
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      secondaryVideos.forEach((video) => video.pause());
      heroVideo?.pause?.();
      return;
    }

    if (heroVideo?.autoplay) {
      safeVideoPlay(heroVideo);
    }

    secondaryVideos.forEach((video) => {
      if (video.dataset.inViewport === '1') {
        safeVideoPlay(video);
      }
    });
  });
}

function stopMarketAutoRefresh() {
  if (!marketRefreshTimer) {
    return;
  }
  clearInterval(marketRefreshTimer);
  marketRefreshTimer = null;
}

function startMarketAutoRefresh() {
  if (marketRefreshTimer || document.hidden) {
    return;
  }

  marketRefreshTimer = setInterval(() => {
    if (!document.hidden) {
      loadMarket();
    }
  }, MARKET_REFRESH_INTERVAL_MS);
}

function normalizeTickerRows(symbols, rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return [];
  }

  const bySymbol = new Map(
    rows
      .map((item) => ({
        symbol: String(item?.symbol || '').toUpperCase(),
        lastPrice: Number(item?.lastPrice || 0),
        change24h: Number(item?.change24h || 0)
      }))
      .filter((item) => symbols.includes(item.symbol) && Number.isFinite(item.lastPrice) && item.lastPrice > 0)
      .map((item) => [item.symbol, item])
  );

  return symbols.map((symbol) => bySymbol.get(symbol)).filter(Boolean);
}

async function fetchBinanceClientTicker(symbols, host = 'api.binance.com') {
  const encodedSymbols = encodeURIComponent(JSON.stringify(symbols));
  const url = `https://${host}/api/v3/ticker/24hr?symbols=${encodedSymbols}`;
  const response = await fetch(url, { cache: 'no-store' });
  const data = await response.json();
  if (!response.ok || !Array.isArray(data)) {
    throw new Error(`Client ticker unavailable from ${host}`);
  }

  const mapped = data.map((item) => ({
    symbol: item.symbol,
    lastPrice: Number(item.lastPrice),
    change24h: Number(item.priceChangePercent)
  }));
  return normalizeTickerRows(symbols, mapped);
}

async function fetchCoinGeckoTicker(symbols) {
  const idEntries = symbols.map((symbol) => [symbol, COINGECKO_IDS[symbol]]).filter(([, id]) => Boolean(id));
  if (!idEntries.length) {
    return [];
  }

  const ids = idEntries.map(([, id]) => id).join(',');
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(
    ids
  )}&vs_currencies=usd&include_24hr_change=true`;
  const response = await fetch(url, { cache: 'no-store' });
  const data = await response.json();
  if (!response.ok || !data || typeof data !== 'object') {
    throw new Error('CoinGecko ticker unavailable');
  }

  const mapped = idEntries
    .map(([symbol, id]) => ({
      symbol,
      lastPrice: Number(data?.[id]?.usd || 0),
      change24h: Number(data?.[id]?.usd_24h_change || 0)
    }))
    .filter((item) => Number.isFinite(item.lastPrice) && item.lastPrice > 0);

  return normalizeTickerRows(symbols, mapped);
}

async function fetchClientSideLiveTicker(symbols) {
  const attempts = [
    () => fetchBinanceClientTicker(symbols, 'api.binance.com'),
    () => fetchBinanceClientTicker(symbols, 'data-api.binance.vision'),
    () => fetchCoinGeckoTicker(symbols)
  ];

  for (const attempt of attempts) {
    try {
      const ticker = await attempt();
      if (ticker.length) {
        return ticker;
      }
    } catch (_) {
      // Try next provider
    }
  }

  return [];
}

async function loadMarket() {
  if (marketTab === 'new') {
    return;
  }
  const requestId = ++marketLoadSeq;
  try {
    const params = new URLSearchParams({
      symbols: MARKET_SYMBOLS.join(',')
    });
    params.set('_t', String(Date.now()));
    const response = await fetch(`/api/p2p/exchange-ticker?${params.toString()}`, {
      cache: 'no-store'
    });
    const data = await response.json();

    if (requestId !== marketLoadSeq) {
      return;
    }

    let tickerRows = Array.isArray(data?.ticker) ? normalizeTickerRows(MARKET_SYMBOLS, data.ticker) : [];
    const needsClientFallback = !response.ok || data?.source === 'fallback' || tickerRows.length === 0;

    if (needsClientFallback) {
      const clientTicker = await fetchClientSideLiveTicker(MARKET_SYMBOLS);
      if (requestId !== marketLoadSeq) {
        return;
      }
      if (clientTicker.length) {
        tickerRows = clientTicker;
      }
    }

    if (!tickerRows.length) {
      throw new Error('Ticker unavailable');
    }

    renderMiniMarketRows(tickerRows);
    renderExchangeTicker(tickerRows);
    renderOpportunities(tickerRows);
  } catch (error) {
    if (requestId !== marketLoadSeq) {
      return;
    }
    renderMiniMarketRows([]);
    renderExchangeTicker([]);
    renderOpportunities([]);
  }
}

function normalizeContact(rawValue) {
  const raw = String(rawValue || '').trim();
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw);

  if (isEmail) {
    return raw.toLowerCase();
  }
  return '';
}

function buildSignupUrl({ provider = '', email = '', name = '' } = {}) {
  const params = new URLSearchParams();
  params.set('mode', 'signup');
  if (provider) {
    params.set('via', provider);
  }
  if (email) {
    params.set('email', email);
  }
  if (name) {
    params.set('name', name);
  }
  return `/auth.html?${params.toString()}`;
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

async function startEmailSignup(email, name = 'Website Lead') {
  const data = await sendOtp(email, name);
  pendingContact = email;
  pendingName = name;
  otpRow?.classList.remove('hidden');
  setMessage(data.message, 'success');
  focusLeadForm();
  return data;
}

if (form) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const name = String(document.getElementById('name')?.value || 'Website Lead').trim() || 'Website Lead';
    const contact = normalizeContact(contactInput?.value || '');

    if (!contact) {
      setMessage('Please enter a valid email address.', 'error');
      return;
    }

    const nextUrl = `/auth.html?mode=signup&email=${encodeURIComponent(contact)}&name=${encodeURIComponent(name)}`;
    window.location.href = nextUrl;
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
  topSignupBtn.addEventListener('click', (event) => {
    event.preventDefault();
    window.location.href = '/auth.html?mode=signup';
  });
}

[topLogoutBtn, drawerLogoutBtn, heroLogoutBtn].forEach((button) => {
  button?.addEventListener('click', async (event) => {
    event.preventDefault();
    await logoutHomeSession();
  });
});

socialSignupButtons.forEach((button) => {
  button.addEventListener('click', (event) => {
    event.preventDefault();
    const provider = String(button.dataset.provider || '').trim().toLowerCase();
    const email = normalizeContact(contactInput?.value || '');
    const leadName = String(document.getElementById('name')?.value || 'Website Lead').trim() || 'Website Lead';
    window.location.href = buildSignupUrl({
      provider,
      email,
      name: leadName
    });
  });
});

signupPromptContinue?.addEventListener('click', async () => {
  const email = normalizeContact(signupPromptEmail?.value || '');
  if (!email) {
    setSignupPromptMessage('Please enter a valid email address.', 'error');
    return;
  }

  signupPromptContinue.disabled = true;
  signupPromptContinue.textContent = 'Sending...';
  setSignupPromptMessage('');

  try {
    if (contactInput) {
      contactInput.value = email;
    }
    await startEmailSignup(email, 'Website Lead');
    setSignupPromptOpen(false);
  } catch (error) {
    setSignupPromptMessage(error.message, 'error');
  } finally {
    signupPromptContinue.disabled = false;
    signupPromptContinue.textContent = 'Continue';
  }
});

signupPromptClose?.addEventListener('click', () => setSignupPromptOpen(false));
signupPromptBackdrop?.addEventListener('click', () => setSignupPromptOpen(false));

signupPromptEmail?.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    signupPromptContinue?.click();
  }
});

if (marketList) {
  const _mlNav = (e) => {
    if (e.target.closest('a')) return;
    const row = e.target.closest('tr[data-href]');
    if (row) { if(e.type==='touchend') e.preventDefault(); window.location.href = row.dataset.href; }
  };
  marketList.addEventListener('click', _mlNav);
  marketList.addEventListener('touchend', _mlNav, {passive:false});
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

document.addEventListener('click', (event) => {
  const copyTrigger = event.target.closest('.cf-copy-btn');
  if (!copyTrigger) {
    return;
  }

  const symbol = String(copyTrigger.dataset.copySymbol || copyTrigger.closest('[data-copy-symbol]')?.dataset.copySymbol || 'BTCUSDT');
  openCopyTradingChart(symbol);
});

if (closeChartBtn) {
  closeChartBtn.addEventListener('click', closeChart);
}
if (closeChartBackdrop) {
  closeChartBackdrop.addEventListener('click', closeChart);
}

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && signupPromptModal && !signupPromptModal.classList.contains('hidden')) {
    setSignupPromptOpen(false);
  }
  if (event.key === 'Escape' && chartModal && !chartModal.classList.contains('hidden')) {
    closeChart();
  }
});

window.addEventListener('pagehide', () => {
  document.body.style.overflow = 'auto';
  document.body.style.pointerEvents = 'auto';
});

setupHomeNav();
setupEventsCarousel();
setupCopyTradingCarousel();
setupMediaPlaybackOptimization();
loadHomeSession();
renderExchangeTicker([]);
setMarketTab('hotspot');
animateCounter(309497423);
renderNews();
initScrollReveal();
setupEveryone3DReveal();
syncHomeInteractionState();
loadMarket();
startMarketAutoRefresh();

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    stopMarketAutoRefresh();
    return;
  }
  loadMarket();
  startMarketAutoRefresh();
});

if (openSignupFromQuery) {
  window.setTimeout(() => {
    window.location.href = '/auth.html?mode=signup';
  }, 120);
}

/* ══════════════════════════════════════
   Homepage Full-width Market Section
   ══════════════════════════════════════ */
(function () {
  const HM_SYMBOLS = [
    'BTCUSDT','ETHUSDT','XRPUSDT','SOLUSDT','BNBUSDT',
    'TRXUSDT','DOGEUSDT','ADAUSDT','AVAXUSDT','LINKUSDT',
    'DOTUSDT','LTCUSDT','MATICUSDT','UNIUSDT','ATOMUSDT',
    'NEARUSDT','APTUSDT','ARBUSDT','OPUSDT','WIFUSDT'
  ];

  const HM_NAMES = {
    BTCUSDT:'Bitcoin', ETHUSDT:'Ethereum', BNBUSDT:'BNB',
    XRPUSDT:'XRP', SOLUSDT:'Solana', TRXUSDT:'TRON',
    ADAUSDT:'Cardano', DOGEUSDT:'Dogecoin', WIFUSDT:'Dogwifhat',
    AVAXUSDT:'Avalanche', LINKUSDT:'Chainlink', DOTUSDT:'Polkadot',
    LTCUSDT:'Litecoin', MATICUSDT:'Polygon', UNIUSDT:'Uniswap',
    ATOMUSDT:'Cosmos', NEARUSDT:'NEAR', APTUSDT:'Aptos',
    ARBUSDT:'Arbitrum', OPUSDT:'Optimism'
  };

  const HM_CODES = {
    BTC:'btc', ETH:'eth', BNB:'bnb', XRP:'xrp', SOL:'sol',
    TRX:'trx', ADA:'ada', DOGE:'doge', WIF:'wif', AVAX:'avax',
    LINK:'link', DOT:'dot', LTC:'ltc', MATIC:'matic', UNI:'uni',
    ATOM:'atom', NEAR:'near', APT:'apt', ARB:'arb', OP:'op'
  };

  const HM_GECKO = {
    BTCUSDT:'bitcoin', ETHUSDT:'ethereum', BNBUSDT:'binancecoin',
    XRPUSDT:'ripple', SOLUSDT:'solana', TRXUSDT:'tron',
    ADAUSDT:'cardano', DOGEUSDT:'dogecoin', WIFUSDT:'dogwifcoin',
    AVAXUSDT:'avalanche-2', LINKUSDT:'chainlink', DOTUSDT:'polkadot',
    LTCUSDT:'litecoin', MATICUSDT:'matic-network', UNIUSDT:'uniswap',
    ATOMUSDT:'cosmos', NEARUSDT:'near', APTUSDT:'aptos',
    ARBUSDT:'arbitrum', OPUSDT:'optimism'
  };

  const hmTabs   = document.getElementById('homeMktTabs');
  const hmCatTabsEl = document.getElementById('homeCatTabs');
  const hmBody   = document.getElementById('homeMktBody');

  if (!hmBody) return;

  // Delegated click — works on iOS Safari too
  // Track touch start position to distinguish tap vs scroll
  let _hmTouchStartX = 0, _hmTouchStartY = 0;
  hmBody.addEventListener('touchstart', (e) => {
    _hmTouchStartX = e.touches[0].clientX;
    _hmTouchStartY = e.touches[0].clientY;
  }, {passive: true});
  hmBody.addEventListener('touchend', (e) => {
    if (e.target.closest('a')) return;
    const dx = Math.abs(e.changedTouches[0].clientX - _hmTouchStartX);
    const dy = Math.abs(e.changedTouches[0].clientY - _hmTouchStartY);
    if (dx > 8 || dy > 8) return; // was a scroll, not a tap
    const row = e.target.closest('tr[data-href]');
    if (row) { e.preventDefault(); window.location.href = row.dataset.href; }
  }, {passive:false});
  hmBody.addEventListener('click', (e) => {
    if (e.target.closest('a')) return;
    const row = e.target.closest('tr[data-href]');
    if (row) window.location.href = row.dataset.href;
  });

  let hmRows   = [];
  let hmTab    = 'spot';
  let hmCatTab = 'popular';
  let hmTimer  = null;

  function hmFmtPrice(v) {
    const n = Number(v);
    if (!n || !isFinite(n)) return '$--';
    if (n >= 10000) return '$' + n.toLocaleString(undefined, { maximumFractionDigits: 0 });
    if (n >= 1)     return '$' + n.toLocaleString(undefined, { maximumFractionDigits: 2 });
    if (n >= 0.01)  return '$' + n.toFixed(4);
    return '$' + n.toFixed(6);
  }

  function hmFmtVol(v) {
    const n = Number(v || 0);
    if (!isFinite(n)) return '--';
    if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(2) + 'K';
    return n.toFixed(2);
  }

  function hmCoinIco(base) {
    const code = HM_CODES[base];
    const fb = (base || '?').slice(0, 1);
    const img = code
      ? `<img src="https://assets.coincap.io/assets/icons/${code}@2x.png" alt="${base}" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.style.display='none'" />`
      : '';
    return `<span class="cf-fullmkt-coin-ico">${img}</span>`;
  }

  function hmRender() {
    if (hmCatTab === 'newcoin') {
      hmBody.innerHTML = `<tr class="cf-fullmkt-loading"><td colspan="3">New listings coming soon — stay tuned.</td></tr>`;
      return;
    }

    let rows = [...hmRows];

    // Sort by category
    if (hmCatTab === 'popular') {
      rows.sort((a, b) => Number(b.volume24h || 0) - Number(a.volume24h || 0));
    } else if (hmCatTab === 'trends') {
      rows.sort((a, b) => Number(b.change24h || 0) - Number(a.change24h || 0));
    } else if (hmCatTab === 'change24h') {
      rows.sort((a, b) => Math.abs(Number(b.change24h || 0)) - Math.abs(Number(a.change24h || 0)));
    }

    if (!rows.length) {
      hmBody.innerHTML = `<tr class="cf-fullmkt-loading"><td colspan="3">Loading...</td></tr>`;
      return;
    }

    hmBody.innerHTML = rows.slice(0, 7).map(item => {
      const base = item.symbol.replace('USDT', '');
      const name = HM_NAMES[item.symbol] || base;
      const chg  = Number(item.change24h || 0);
      const sign = chg >= 0 ? '+' : '';
      const cls  = chg >= 0 ? 'up' : 'dn';
      const href = `/chart.html?symbol=${encodeURIComponent(item.symbol)}`;
      return `<tr class="cf-fullmkt-row" data-href="${href}" style="cursor:pointer">
        <td>
          <div class="cf-fullmkt-coin-cell">
            ${hmCoinIco(base)}
            <div class="cf-fullmkt-coin-names">
              <span class="cf-fullmkt-coin-sym">${base}/USDT</span>
              <span class="cf-fullmkt-coin-name">${name}</span>
            </div>
          </div>
        </td>
        <td><span class="cf-fullmkt-price">${hmFmtPrice(item.lastPrice)}</span></td>
        <td><span class="cf-fullmkt-chg ${cls}">${sign}${chg.toFixed(2)}%</span></td>
      </tr>`;
    }).join('');
  }

  async function hmLoad() {
    if (hmCatTab === 'newcoin') { hmRender(); return; }
    try {
      const params = new URLSearchParams({ symbols: HM_SYMBOLS.join(','), _t: Date.now() });
      const res  = await fetch(`/api/p2p/exchange-ticker?${params}`, { cache: 'no-store' });
      const data = await res.json();
      if (res.ok && Array.isArray(data?.ticker) && data.ticker.length) {
        hmRows = data.ticker;
        hmRender();
        return;
      }
    } catch (_) {}
    // CoinGecko fallback
    try {
      const ids = HM_SYMBOLS.map(s => HM_GECKO[s]).filter(Boolean).join(',');
      const res = await fetch(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&per_page=50&sparkline=false&price_change_percentage=24h`,
        { cache: 'no-store' }
      );
      const data = await res.json();
      if (Array.isArray(data)) {
        const idToSym = {};
        for (const [sym, id] of Object.entries(HM_GECKO)) idToSym[id] = sym;
        hmRows = data.map(c => ({
          symbol: idToSym[c.id] || c.symbol.toUpperCase() + 'USDT',
          lastPrice: c.current_price,
          change24h: c.price_change_percentage_24h,
          volume24h: c.total_volume
        }));
        hmRender();
      }
    } catch (_) {}
  }

  function hmSetTab(tab) {
    hmTab = ['spot', 'futures'].includes(tab) ? tab : 'spot';
    if (hmTabs) {
      hmTabs.querySelectorAll('button[data-hmtab]').forEach(btn => {
        const active = btn.dataset.hmtab === hmTab;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-selected', active ? 'true' : 'false');
      });
    }
    clearInterval(hmTimer);
    hmLoad();
    if (hmCatTab !== 'newcoin') hmTimer = setInterval(hmLoad, 6000);
  }

  function hmSetCatTab(cat) {
    hmCatTab = ['popular','trends','change24h','newcoin'].includes(cat) ? cat : 'popular';
    if (hmCatTabsEl) {
      hmCatTabsEl.querySelectorAll('button[data-cattab]').forEach(btn => {
        const active = btn.dataset.cattab === hmCatTab;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-selected', active ? 'true' : 'false');
      });
    }
    clearInterval(hmTimer);
    hmLoad();
    if (hmCatTab !== 'newcoin') hmTimer = setInterval(hmLoad, 6000);
  }

  // Sub-tabs (Spot / Futures)
  hmTabs?.addEventListener('click', e => {
    const btn = e.target.closest('button[data-hmtab]');
    if (btn) hmSetTab(btn.dataset.hmtab);
  });

  // Category tabs
  hmCatTabsEl?.addEventListener('click', e => {
    const btn = e.target.closest('button[data-cattab]');
    if (btn) hmSetCatTab(btn.dataset.cattab);
  });

  // Init
  hmSetTab('spot');
})();
