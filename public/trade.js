const pathParts = window.location.pathname.split('/').filter(Boolean);
const routeMarket = pathParts[1] === 'perp' ? 'perp' : 'spot';

function normalizeRouteSymbol(rawSymbol) {
  const cleaned = String(rawSymbol || 'BTCUSDT')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

  if (!cleaned) {
    return 'BTCUSDT';
  }

  const normalized = cleaned.replace(/USDTP$/, 'USDT');
  if (!/^[A-Z0-9]{5,12}$/.test(normalized)) {
    return 'BTCUSDT';
  }
  return normalized;
}

const routeSymbol = normalizeRouteSymbol(pathParts[2] || 'BTCUSDT');

const state = {
  market: routeMarket,
  symbol: routeSymbol,
  interval: '15m',
  tradeSide: 'buy',
  mobileTab: 'chart',
  klines: [],
  ticker: null,
  orderBook: null,
  trades: []
};

const pairTitle = document.getElementById('pairTitle');
const pairSelector = document.getElementById('pairSelector');
const pairCoin = document.getElementById('pairCoin');
const pairMarketLabel = document.querySelector('.pair-chip p');
const pairPrice = document.getElementById('pairPrice');
const pairChange = document.getElementById('pairChange');
const pairHigh = document.getElementById('pairHigh');
const pairLow = document.getElementById('pairLow');
const pairVolume = document.getElementById('pairVolume');
const chartStatus = document.getElementById('chartStatus');
const chartUpdatedAt = document.getElementById('chartUpdatedAt');
const bookSource = document.getElementById('bookSource');
const midPrice = document.getElementById('midPrice');

const askRows = document.getElementById('askRows');
const bidRows = document.getElementById('bidRows');
const tradeRows = document.getElementById('tradeRows');
const panelOrderBook = document.getElementById('panelOrderBook');
const panelTrades = document.getElementById('panelTrades');
const tabOrderBook = document.getElementById('tabOrderBook');
const tabRecentTrades = document.getElementById('tabRecentTrades');
const intervalTabs = document.getElementById('intervalTabs');
const chartViewTabs = document.getElementById('chartViewTabs');
const flashModeBtn = document.getElementById('flashModeBtn');
const proModeBtn = document.getElementById('proModeBtn');
const canvas = document.getElementById('klineCanvas');
const tvChartHost = document.getElementById('tvChart');
const chartColumn = document.getElementById('chartColumn');
const bookColumn = document.getElementById('bookColumn');
const mobileMarketTabs = document.getElementById('mobileMarketTabs');
const mobileBookCollapseBtn = document.getElementById('mobileBookCollapseBtn');

const tradeSideSwitch = document.getElementById('tradeSideSwitch');
const orderTypeTabs = document.getElementById('orderTypeTabs');
const tradeOrderType = document.getElementById('tradeOrderType');
const tradeAmountUsdt = document.getElementById('tradeAmountUsdt');
const tradePriceView = document.getElementById('tradePriceView');
const tradeRiskSlider = document.getElementById('tradeRiskSlider');
const tradeEstimateQty = document.getElementById('tradeEstimateQty');
const placeTradeBtn = document.getElementById('placeTradeBtn');
const tradeActionMessage = document.getElementById('tradeActionMessage');

const mobileTradeSideSwitch = document.getElementById('mobileTradeSideSwitch');
const mobileTradeAmountUsdt = document.getElementById('mobileTradeAmountUsdt');
const mobilePlaceTradeBtn = document.getElementById('mobilePlaceTradeBtn');
const mobileQuickBuyBtn = document.getElementById('mobileQuickBuyBtn');
const mobileQuickSellBtn = document.getElementById('mobileQuickSellBtn');
const mobileBuyPrice = document.getElementById('mobileBuyPrice');
const mobileSellPrice = document.getElementById('mobileSellPrice');

const tradeMenuToggle = document.getElementById('tradeMenuToggle');
const tradeNavClose = document.getElementById('tradeNavClose');
const tradeNavDrawer = document.getElementById('tradeNavDrawer');
const tradeNavOverlay = document.getElementById('tradeNavOverlay');
const tradeThemeToggle = document.getElementById('tradeThemeToggle');
const tradeDrawerThemeToggle = document.getElementById('tradeDrawerThemeToggle');
const tradeDrawerLogout = document.getElementById('tradeDrawerLogout');
const tradeLoginBtn = document.getElementById('tradeLoginBtn');
const tradeSignupBtn = document.getElementById('tradeSignupBtn');
const tradeUserAvatar = document.getElementById('tradeUserAvatar');

let depthTimer = null;
let klineTimer = null;
let resizeTimer = null;
let lightweightChart = null;
let candleSeries = null;
let volumeSeries = null;
let useLightweightChart = Boolean(window.LightweightCharts && tvChartHost);
let chartNeedsAutoFit = true;
let activeChartMode = 'tradingview';
let tradingViewScriptPromise = null;
let tradingViewWidget = null;
let tvWidgetContainerId = null;
let activeTradeUser = null;
const COIN_ICON_CODES = {
  BTC: 'btc',
  ETH: 'eth',
  BNB: 'bnb',
  SOL: 'sol',
  XRP: 'xrp',
  ADA: 'ada',
  DOGE: 'doge',
  AVAX: 'avax',
  LINK: 'link',
  LTC: 'ltc',
  TRX: 'trx'
};
const chartView = {
  offset: 0,
  visible: 90,
  minVisible: 28,
  maxVisible: 220,
  dragging: false,
  dragStartX: 0,
  dragStartOffset: 0,
  rafPending: false
};
const activePointers = new Map();
let pinchState = null;

function isMobileViewport() {
  return window.matchMedia('(max-width: 767px)').matches;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getVisibleBounds(total) {
  if (!Number.isFinite(total) || total <= 0) {
    return { min: 0, max: 0 };
  }
  const max = Math.max(1, Math.min(chartView.maxVisible, total));
  const min = Math.max(1, Math.min(chartView.minVisible, max));
  return { min, max };
}

function requestChartRedraw() {
  if (chartView.rafPending) {
    return;
  }
  chartView.rafPending = true;
  window.requestAnimationFrame(() => {
    chartView.rafPending = false;
    drawCandles(state.klines);
  });
}

function getVisibleKlines(data) {
  if (!Array.isArray(data) || data.length === 0) {
    return { rows: [], total: 0 };
  }

  const bounds = getVisibleBounds(data.length);
  chartView.visible = clamp(chartView.visible, bounds.min, bounds.max);

  const maxOffset = Math.max(0, data.length - chartView.visible);
  chartView.offset = clamp(chartView.offset, 0, maxOffset);

  const start = Math.max(0, data.length - chartView.visible - chartView.offset);
  const end = Math.min(data.length, start + chartView.visible);

  return {
    rows: data.slice(start, end),
    start,
    end,
    total: data.length
  };
}

function formatPrice(value, digits = 6) {
  return Number(value || 0).toLocaleString(undefined, {
    maximumFractionDigits: digits
  });
}

function formatVolume(value) {
  return Number(value || 0).toLocaleString(undefined, {
    maximumFractionDigits: 2
  });
}

function formatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '--:--:--';
  }
  return date.toLocaleTimeString([], { hour12: false });
}

function getTradingViewInterval(interval) {
  const map = {
    '5m': '5',
    '15m': '15',
    '30m': '30',
    '1h': '60',
    '4h': '240',
    '1d': '1D'
  };
  return map[interval] || '15';
}

function getTradingViewSymbol() {
  return `BINANCE:${state.symbol}`;
}

function getThemeMode() {
  const mode = document.documentElement.getAttribute('data-theme') || document.body?.getAttribute('data-theme') || 'dark';
  return mode === 'light' ? 'light' : 'dark';
}

function getDrawerLoginLink() {
  return tradeNavDrawer?.querySelector('[data-drawer-login]') || null;
}

function getDrawerSignupLink() {
  return tradeNavDrawer?.querySelector('[data-drawer-signup]') || null;
}

function setAccountUi() {
  const user = activeTradeUser;
  const loggedIn = Boolean(user);
  const initial = String(user?.username || user?.email || 'U')
    .trim()
    .slice(0, 1)
    .toUpperCase() || 'U';

  if (tradeUserAvatar) {
    tradeUserAvatar.textContent = initial;
    tradeUserAvatar.style.display = loggedIn ? 'inline-flex' : 'none';
    tradeUserAvatar.title = loggedIn ? String(user?.email || user?.username || 'Account') : '';
  }
  if (tradeLoginBtn) {
    tradeLoginBtn.style.display = loggedIn ? 'none' : 'inline-flex';
  }
  if (tradeSignupBtn) {
    tradeSignupBtn.style.display = loggedIn ? 'none' : 'inline-flex';
  }
  if (tradeDrawerLogout) {
    tradeDrawerLogout.style.display = loggedIn ? 'inline-flex' : 'none';
  }

  const drawerLogin = getDrawerLoginLink();
  const drawerSignup = getDrawerSignupLink();
  if (drawerLogin) {
    drawerLogin.style.display = loggedIn ? 'none' : 'inline-flex';
  }
  if (drawerSignup) {
    drawerSignup.style.display = loggedIn ? 'none' : 'inline-flex';
  }
}

async function loadTradeUserSession() {
  try {
    const response = await fetch('/api/p2p/me');
    const data = await response.json();
    if (response.ok && data?.loggedIn && data?.user) {
      activeTradeUser = data.user;
    } else {
      activeTradeUser = null;
    }
  } catch (_) {
    activeTradeUser = null;
  }
  setAccountUi();
}

async function logoutTradeSession() {
  try {
    await fetch('/api/p2p/logout', { method: 'POST' });
  } catch (_) {
    // ignore logout errors
  }
  activeTradeUser = null;
  setAccountUi();
  setTradeNavOpen(false);
}

function initTradeTheme() {
  const syncThemeDependentUi = () => {
    document.body?.setAttribute('data-theme', getThemeMode());
    if (activeChartMode === 'tradingview') {
      void renderTradingViewWidget(true);
    }
  };

  if (window.BitegitTheme?.initThemeToggle) {
    window.BitegitTheme.initThemeToggle([tradeThemeToggle, tradeDrawerThemeToggle]);
  }

  tradeThemeToggle?.addEventListener('click', () => {
    window.setTimeout(syncThemeDependentUi, 0);
  });
  tradeDrawerThemeToggle?.addEventListener('click', () => {
    window.setTimeout(syncThemeDependentUi, 0);
  });

  syncThemeDependentUi();
}

function loadTradingViewScript() {
  if (window.TradingView?.widget) {
    return Promise.resolve();
  }
  if (tradingViewScriptPromise) {
    return tradingViewScriptPromise;
  }

  tradingViewScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-tv-widget="advanced"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('TradingView script failed to load.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.dataset.tvWidget = 'advanced';
    script.onload = () => {
      if (window.TradingView?.widget) {
        resolve();
      } else {
        reject(new Error('TradingView widget unavailable.'));
      }
    };
    script.onerror = () => reject(new Error('TradingView script failed to load.'));
    document.head.appendChild(script);
  }).catch((error) => {
    tradingViewScriptPromise = null;
    throw error;
  });

  return tradingViewScriptPromise;
}

function destroyTradingViewWidget() {
  if (tradingViewWidget && typeof tradingViewWidget.remove === 'function') {
    try {
      tradingViewWidget.remove();
    } catch (_) {
      // ignore widget remove errors
    }
  }
  tradingViewWidget = null;
  tvWidgetContainerId = null;
  if (tvChartHost) {
    tvChartHost.innerHTML = '';
    tvChartHost.classList.remove('is-widget-active');
  }
}

async function renderTradingViewWidget(forceRecreate = false) {
  if (!tvChartHost || activeChartMode !== 'tradingview') {
    return false;
  }

  if (canvas) {
    canvas.style.display = 'none';
  }

  tvChartHost.style.display = 'block';
  tvChartHost.style.touchAction = 'auto';
  tvChartHost.classList.remove('is-standard');
  tvChartHost.classList.add('is-widget-active');

  await loadTradingViewScript();
  if (!window.TradingView?.widget) {
    throw new Error('TradingView widget unavailable.');
  }

  if (forceRecreate || tradingViewWidget) {
    destroyTradingViewWidget();
  }

  tvChartHost.style.display = 'block';
  tvChartHost.classList.add('is-widget-active');

  tvWidgetContainerId = `tv-widget-${Date.now()}`;
  tvChartHost.innerHTML = `<div class="tv-widget-shell"><div id="${tvWidgetContainerId}" class="tv-widget-host"></div></div>`;

  tradingViewWidget = new window.TradingView.widget({
    autosize: true,
    symbol: getTradingViewSymbol(),
    interval: getTradingViewInterval(state.interval),
    timezone: 'Etc/UTC',
    theme: getThemeMode(),
    style: '1',
    locale: 'en',
    toolbar_bg: getThemeMode() === 'light' ? '#f5f8fd' : '#070c14',
    hide_top_toolbar: false,
    hide_side_toolbar: false,
    hide_legend: false,
    withdateranges: true,
    save_image: true,
    allow_symbol_change: false,
    enable_publishing: false,
    container_id: tvWidgetContainerId,
    studies: ['Volume@tv-basicstudies'],
    loading_screen: {
      backgroundColor: '#070c14'
    }
  });

  if (chartStatus) {
    chartStatus.textContent = `TradingView ${state.interval} • trendline/tools enabled`;
  }
  if (chartUpdatedAt) {
    chartUpdatedAt.textContent = `Updated ${new Date().toLocaleTimeString()}`;
  }
  return true;
}

async function setChartMode(mode, options = {}) {
  const { suppressLoad = false } = options;
  const normalized = ['standard', 'tradingview', 'depth'].includes(mode) ? mode : 'standard';
  activeChartMode = normalized;

  chartViewTabs?.querySelectorAll('button[data-chart-view]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.chartView === normalized);
  });

  if (normalized === 'tradingview') {
    try {
      await renderTradingViewWidget(true);
      return;
    } catch (error) {
      activeChartMode = 'standard';
      if (chartStatus) {
        chartStatus.textContent = `${error.message} Switching to compatibility chart.`;
      }
      chartViewTabs?.querySelectorAll('button[data-chart-view]').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.chartView === 'standard');
      });
    }
  }

  destroyTradingViewWidget();
  if (tvChartHost) {
    tvChartHost.style.touchAction = 'none';
    tvChartHost.classList.add('is-standard');
  }

  chartNeedsAutoFit = true;
  if (!suppressLoad) {
    await loadKlines();
    return;
  }

  if (Array.isArray(state.klines) && state.klines.length) {
    requestChartRedraw();
  } else {
    drawNoChartState('Loading chart...');
  }
}

function setPairIdentity() {
  const base = state.symbol.replace('USDT', '') || state.symbol;
  const displayPair = state.market === 'perp' ? `${base}/USDT-P` : `${base}/USDT`;
  if (pairTitle) {
    pairTitle.textContent = displayPair;
  }
  if (pairSelector) {
    pairSelector.value = state.symbol;
  }
  if (pairMarketLabel) {
    pairMarketLabel.textContent = state.market === 'perp' ? 'Perpetual' : 'Spot';
  }
  if (pairCoin) {
    const code = COIN_ICON_CODES[base];
    if (code) {
      pairCoin.innerHTML = `
        <img src="https://assets.coincap.io/assets/icons/${code}@2x.png" alt="${base}" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.style.display='none'" />
        <span class="coin-fallback">${base.slice(0, 1)}</span>
      `;
    } else {
      pairCoin.innerHTML = `<span class="coin-fallback">${base.slice(0, 1)}</span>`;
    }
  }
  document.title = `${displayPair} | Bitegit Trade`;
  chartNeedsAutoFit = true;
}

function setTradeActionMessage(text, type = '') {
  if (!tradeActionMessage) {
    return;
  }
  tradeActionMessage.textContent = text;
  tradeActionMessage.classList.remove('success', 'error');
  if (type) {
    tradeActionMessage.classList.add(type);
  }
}

function syncAmountInputs(amount) {
  const normalized = Number(amount);
  if (Number.isNaN(normalized)) {
    return;
  }

  if (tradeAmountUsdt && Number(tradeAmountUsdt.value || 0) !== normalized) {
    tradeAmountUsdt.value = normalized <= 0 ? '' : normalized.toFixed(2);
  }

  if (mobileTradeAmountUsdt && Number(mobileTradeAmountUsdt.value || 0) !== normalized) {
    mobileTradeAmountUsdt.value = normalized <= 0 ? '' : normalized.toFixed(2);
  }
}

function renderEstimatedQty() {
  if (!tradeEstimateQty) {
    return;
  }

  const amountUsdt = Number(tradeAmountUsdt?.value || 0);
  const lastPrice = Number(state.ticker?.lastPrice || 0);
  if (!Number.isFinite(amountUsdt) || amountUsdt <= 0 || !Number.isFinite(lastPrice) || lastPrice <= 0) {
    tradeEstimateQty.textContent = '--';
    return;
  }

  const qty = amountUsdt / lastPrice;
  tradeEstimateQty.textContent = `${qty.toFixed(8)} ${state.symbol.replace('USDT', '') || state.symbol}`;
}

function syncTradeActionButton() {
  const label = state.tradeSide === 'sell' ? 'Sell' : 'Buy';

  if (placeTradeBtn) {
    placeTradeBtn.textContent = label;
    placeTradeBtn.classList.toggle('is-sell', state.tradeSide === 'sell');
  }

  if (mobilePlaceTradeBtn) {
    mobilePlaceTradeBtn.textContent = label;
    mobilePlaceTradeBtn.classList.toggle('is-sell', state.tradeSide === 'sell');
  }

  if (mobileQuickBuyBtn) {
    mobileQuickBuyBtn.classList.toggle('active', state.tradeSide === 'buy');
  }
  if (mobileQuickSellBtn) {
    mobileQuickSellBtn.classList.toggle('active', state.tradeSide === 'sell');
  }
}

function setTradeSide(side) {
  state.tradeSide = side === 'sell' ? 'sell' : 'buy';
  syncTradeActionButton();

  tradeSideSwitch?.querySelectorAll('button[data-side]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.side === state.tradeSide);
  });

  mobileTradeSideSwitch?.querySelectorAll('button[data-side]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.side === state.tradeSide);
  });
}

function setPriceChangeStyle(value) {
  if (!pairChange || !pairPrice) {
    return;
  }

  const numeric = Number(value || 0);
  pairChange.classList.remove('price-up', 'price-down');
  pairPrice.classList.remove('price-up', 'price-down');

  if (numeric >= 0) {
    pairChange.classList.add('price-up');
    pairPrice.classList.add('price-up');
  } else {
    pairChange.classList.add('price-down');
    pairPrice.classList.add('price-down');
  }
}

function updateMobileQuickPrices(price, change) {
  const numericPrice = Number(price || 0);
  if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
    return;
  }
  const text = formatPrice(numericPrice, 4);
  if (mobileBuyPrice) {
    mobileBuyPrice.textContent = text;
  }
  if (mobileSellPrice) {
    mobileSellPrice.textContent = text;
  }
  const isUp = Number(change || 0) >= 0;
  if (mobileBuyPrice) {
    mobileBuyPrice.classList.toggle('price-up', isUp);
    mobileBuyPrice.classList.toggle('price-down', !isUp);
  }
  if (mobileSellPrice) {
    mobileSellPrice.classList.toggle('price-up', isUp);
    mobileSellPrice.classList.toggle('price-down', !isUp);
  }
}

function renderTicker(ticker) {
  if (!ticker) {
    return;
  }

  const change = Number(ticker.change24h || 0);
  if (pairPrice) {
    pairPrice.textContent = formatPrice(ticker.lastPrice, 6);
  }
  if (pairChange) {
    pairChange.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
  }
  if (pairHigh) {
    pairHigh.textContent = formatPrice(ticker.high24h, 6);
  }
  if (pairLow) {
    pairLow.textContent = formatPrice(ticker.low24h, 6);
  }
  if (pairVolume) {
    pairVolume.textContent = formatVolume(ticker.volume24h);
  }
  if (tradePriceView) {
    tradePriceView.value = formatPrice(ticker.lastPrice, 6);
  }

  setPriceChangeStyle(change);
  updateMobileQuickPrices(ticker.lastPrice, change);
  renderEstimatedQty();
}

function renderOrderBook(orderBook) {
  if (!askRows || !bidRows || !orderBook) {
    return;
  }

  const asks = Array.isArray(orderBook.asks) ? orderBook.asks : [];
  const bids = Array.isArray(orderBook.bids) ? orderBook.bids : [];

  askRows.innerHTML = asks.length
    ? asks
        .map(
          (row) => `
            <tr>
              <td class="price-down">${formatPrice(row.price, 6)}</td>
              <td>${formatPrice(row.quantity, 4)}</td>
              <td>${formatPrice(row.total, 2)}</td>
            </tr>
          `
        )
        .join('')
    : '<tr><td colspan="3">No ask orders</td></tr>';

  bidRows.innerHTML = bids.length
    ? bids
        .map(
          (row) => `
            <tr>
              <td class="price-up">${formatPrice(row.price, 6)}</td>
              <td>${formatPrice(row.quantity, 4)}</td>
              <td>${formatPrice(row.total, 2)}</td>
            </tr>
          `
        )
        .join('')
    : '<tr><td colspan="3">No bid orders</td></tr>';

  if (midPrice) {
    midPrice.textContent = formatPrice(state.ticker?.lastPrice || 0, 6);
    setPriceChangeStyle(state.ticker?.change24h || 0);
  }
}

function renderTrades(trades) {
  if (!tradeRows) {
    return;
  }

  const data = Array.isArray(trades) ? trades : [];
  tradeRows.innerHTML = data.length
    ? data
        .map(
          (trade) => `
            <tr>
              <td>${formatTime(trade.time)}</td>
              <td class="${trade.side === 'sell' ? 'price-down' : 'price-up'}">${formatPrice(trade.price, 6)}</td>
              <td>${formatPrice(trade.quantity, 5)}</td>
              <td>${trade.side === 'sell' ? 'Sell' : 'Buy'}</td>
            </tr>
          `
        )
        .join('')
    : '<tr><td colspan="4">No recent trades</td></tr>';
}

function ensureLightweightChart() {
  if (activeChartMode === 'tradingview') {
    return false;
  }

  if (!useLightweightChart || !tvChartHost) {
    if (tvChartHost) {
      tvChartHost.classList.remove('is-standard');
      tvChartHost.style.display = 'none';
    }
    if (canvas) {
      canvas.style.display = 'block';
    }
    return false;
  }
  if (lightweightChart && candleSeries && volumeSeries) {
    tvChartHost.classList.add('is-standard');
    tvChartHost.style.display = 'block';
    if (canvas) {
      canvas.style.display = 'none';
    }
    return true;
  }

  const hostWidth = Math.max(300, tvChartHost.clientWidth || 0);
  const hostHeight = Math.max(320, tvChartHost.clientHeight || 0);
  const lc = window.LightweightCharts;
  if (!lc?.createChart) {
    useLightweightChart = false;
    tvChartHost.classList.remove('is-standard');
    tvChartHost.style.display = 'none';
    if (canvas) {
      canvas.style.display = 'block';
    }
    return false;
  }

  lightweightChart = lc.createChart(tvChartHost, {
    width: hostWidth,
    height: hostHeight,
    layout: {
      background: { color: '#070c14' },
      textColor: '#8ea0bd',
      fontSize: 12,
      fontFamily: 'Manrope, Segoe UI, sans-serif'
    },
    grid: {
      vertLines: { color: 'rgba(142,160,189,0.10)' },
      horzLines: { color: 'rgba(142,160,189,0.10)' }
    },
    crosshair: {
      mode: lc.CrosshairMode.Normal
    },
    rightPriceScale: {
      borderColor: 'rgba(142,160,189,0.24)'
    },
    timeScale: {
      borderColor: 'rgba(142,160,189,0.24)',
      timeVisible: true,
      secondsVisible: false
    },
    handleScale: {
      pinch: true,
      mouseWheel: true,
      axisPressedMouseMove: true
    },
    handleScroll: {
      mouseWheel: true,
      pressedMouseMove: true,
      horzTouchDrag: true,
      vertTouchDrag: false
    },
    kineticScroll: {
      mouse: true,
      touch: true
    }
  });

  candleSeries = lightweightChart.addCandlestickSeries({
    upColor: '#00d084',
    downColor: '#ff4d6d',
    borderUpColor: '#00d084',
    borderDownColor: '#ff4d6d',
    wickUpColor: '#00d084',
    wickDownColor: '#ff4d6d',
    priceLineVisible: true,
    priceLineColor: '#9cff00',
    lastValueVisible: true
  });

  volumeSeries = lightweightChart.addHistogramSeries({
    priceFormat: {
      type: 'volume'
    },
    priceScaleId: '',
    scaleMargins: {
      top: 0.8,
      bottom: 0
    }
  });

  tvChartHost.classList.add('is-standard');
  tvChartHost.style.display = 'block';
  tvChartHost.style.touchAction = 'none';
  if (canvas) {
    canvas.style.display = 'none';
  }
  return true;
}

function resizeLightweightChart() {
  if (!lightweightChart || !tvChartHost) {
    return;
  }
  const width = Math.max(280, tvChartHost.clientWidth || 0);
  const height = Math.max(320, tvChartHost.clientHeight || 0);
  lightweightChart.applyOptions({ width, height });
}

function toChartSeriesRows(data) {
  const rows = Array.isArray(data) ? data : [];
  const mapped = rows
    .map((item) => {
      const rawTime = item.openTime ?? item.time ?? item.closeTime;
      let unixTime = Number(rawTime);
      if (!Number.isFinite(unixTime) && rawTime) {
        unixTime = new Date(rawTime).getTime();
      }

      let time = 0;
      if (Number.isFinite(unixTime)) {
        if (unixTime > 100000000000) {
          time = Math.floor(unixTime / 1000);
        } else {
          time = Math.floor(unixTime);
        }
      }

      return {
        time,
        open: Number(item.open),
        high: Number(item.high),
        low: Number(item.low),
        close: Number(item.close),
        volume: Number(item.volume || 0)
      };
    })
    .filter(
      (item) =>
        Number.isFinite(item.time) &&
        item.time > 0 &&
        Number.isFinite(item.open) &&
        Number.isFinite(item.high) &&
        Number.isFinite(item.low) &&
        Number.isFinite(item.close)
    )
    .sort((a, b) => a.time - b.time);

  if (!mapped.length) {
    return mapped;
  }

  const deduped = [];
  for (const row of mapped) {
    const last = deduped[deduped.length - 1];
    if (last && last.time === row.time) {
      deduped[deduped.length - 1] = row;
    } else {
      deduped.push(row);
    }
  }

  return deduped;
}

function drawNoChartState(text) {
  if (activeChartMode === 'tradingview') {
    if (chartStatus) {
      chartStatus.textContent = text;
    }
    return;
  }

  if (ensureLightweightChart()) {
    candleSeries?.setData([]);
    volumeSeries?.setData([]);
    if (chartStatus) {
      chartStatus.textContent = text;
    }
    return;
  }

  if (!canvas) {
    return;
  }

  const ctx = canvas.getContext('2d');
  const rect = canvas.getBoundingClientRect();
  if (!ctx || rect.width <= 0 || rect.height <= 0) {
    return;
  }

  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(rect.width * dpr);
  canvas.height = Math.floor(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  ctx.fillStyle = '#0d121a';
  ctx.fillRect(0, 0, rect.width, rect.height);
  ctx.fillStyle = '#8f9eb5';
  ctx.font = '13px Manrope';
  ctx.textAlign = 'center';
  ctx.fillText(text, rect.width / 2, rect.height / 2);
}

function drawCandles(data) {
  if (activeChartMode === 'tradingview') {
    return;
  }

  if (ensureLightweightChart()) {
    try {
      const rows = toChartSeriesRows(data);
      if (!rows.length) {
        candleSeries?.setData([]);
        volumeSeries?.setData([]);
        if (chartStatus) {
          chartStatus.textContent = 'No chart data';
        }
        return;
      }

      candleSeries.setData(
        rows.map((item) => ({
          time: item.time,
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close
        }))
      );
      volumeSeries.setData(
        rows.map((item) => ({
          time: item.time,
          value: item.volume,
          color: item.close >= item.open ? 'rgba(0,208,132,0.45)' : 'rgba(255,77,109,0.45)'
        }))
      );
      if (chartNeedsAutoFit) {
        const visibleWindow = Math.min(96, rows.length);
        lightweightChart.timeScale().setVisibleLogicalRange({
          from: Math.max(0, rows.length - visibleWindow),
          to: rows.length + 3
        });
        chartNeedsAutoFit = false;
      }
      resizeLightweightChart();
      return;
    } catch (error) {
      useLightweightChart = false;
      if (tvChartHost) {
        tvChartHost.style.display = 'none';
      }
      if (canvas) {
        canvas.style.display = 'block';
      }
      drawCandles(data);
      if (chartStatus) {
        chartStatus.textContent = 'Compatibility chart mode enabled';
      }
      return;
    }
  }

  if (!canvas) {
    return;
  }

  const ctx = canvas.getContext('2d');
  const rect = canvas.getBoundingClientRect();
  if (!ctx || rect.width <= 0 || rect.height <= 0) {
    return;
  }

  const visibleWindow = getVisibleKlines(data);
  const chartRows = visibleWindow.rows;

  if (!Array.isArray(chartRows) || chartRows.length === 0) {
    drawNoChartState('No chart data');
    return;
  }

  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(rect.width * dpr);
  canvas.height = Math.floor(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const width = rect.width;
  const height = rect.height;
  const padding = { top: 16, right: 62, bottom: 20, left: 10 };
  const volumeHeight = Math.max(70, Math.floor(height * 0.23));
  const chartBottom = height - volumeHeight - 22;
  const chartTop = padding.top;
  const chartHeight = chartBottom - chartTop;
  const usableWidth = width - padding.left - padding.right;

  ctx.fillStyle = '#0d121a';
  ctx.fillRect(0, 0, width, height);

  const lows = chartRows.map((item) => item.low);
  const highs = chartRows.map((item) => item.high);
  const volumes = chartRows.map((item) => item.volume);

  let minPrice = Math.min(...lows);
  let maxPrice = Math.max(...highs);
  if (!Number.isFinite(minPrice) || !Number.isFinite(maxPrice)) {
    drawNoChartState('Chart unavailable');
    return;
  }

  const priceRange = Math.max(maxPrice - minPrice, maxPrice * 0.0008 || 1);
  minPrice -= priceRange * 0.08;
  maxPrice += priceRange * 0.08;

  const maxVolume = Math.max(...volumes, 1);
  const priceToY = (price) => chartTop + ((maxPrice - price) / (maxPrice - minPrice)) * chartHeight;
  const stepX = usableWidth / chartRows.length;
  const candleWidth = Math.max(2, stepX * 0.58);

  ctx.strokeStyle = 'rgba(164, 178, 201, 0.12)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i += 1) {
    const y = chartTop + (chartHeight / 5) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    const label = maxPrice - ((maxPrice - minPrice) / 5) * i;
    ctx.fillStyle = '#8b9ab2';
    ctx.font = '11px Manrope';
    ctx.textAlign = 'left';
    ctx.fillText(formatPrice(label, 4), width - padding.right + 6, y + 4);
  }

  for (let i = 0; i < chartRows.length; i += 1) {
    const candle = chartRows[i];
    const x = padding.left + i * stepX + stepX / 2;
    const openY = priceToY(candle.open);
    const closeY = priceToY(candle.close);
    const highY = priceToY(candle.high);
    const lowY = priceToY(candle.low);
    const isUp = candle.close >= candle.open;
    const color = isUp ? '#16d57d' : '#f0567b';

    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, highY);
    ctx.lineTo(x, lowY);
    ctx.stroke();

    ctx.fillStyle = color;
    const bodyTop = Math.min(openY, closeY);
    const bodyHeight = Math.max(1, Math.abs(closeY - openY));
    ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);

    const volumeTop = chartBottom + 14;
    const volumeHeightMax = height - volumeTop - padding.bottom;
    const volumeBarHeight = (Math.max(candle.volume, 0) / maxVolume) * volumeHeightMax;
    ctx.globalAlpha = 0.45;
    ctx.fillRect(x - candleWidth / 2, volumeTop + (volumeHeightMax - volumeBarHeight), candleWidth, volumeBarHeight);
    ctx.globalAlpha = 1;
  }

  const lastClose = chartRows[chartRows.length - 1].close;
  const lastY = priceToY(lastClose);
  ctx.strokeStyle = 'rgba(184, 248, 11, 0.55)';
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(padding.left, lastY);
  ctx.lineTo(width - padding.right, lastY);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#b8f80b';
  ctx.font = '11px Manrope';
  ctx.textAlign = 'left';
  ctx.fillText(formatPrice(lastClose, 4), width - padding.right + 6, lastY + 4);
}

async function loadDepth() {
  try {
    const response = await fetch(`/api/p2p/market-depth?symbol=${encodeURIComponent(state.symbol)}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Depth unavailable');
    }

    state.ticker = data.ticker;
    state.orderBook = data.orderBook;
    state.trades = data.trades;

    renderTicker(data.ticker);
    renderOrderBook(data.orderBook);
    renderTrades(data.trades);
    if (bookSource) {
      bookSource.textContent = `Source: ${String(data.source || 'fallback').toUpperCase()}`;
    }
  } catch (error) {
    if (chartStatus) {
      chartStatus.textContent = error.message;
    }
  }
}

async function loadKlines() {
  if (activeChartMode === 'tradingview') {
    if (chartStatus) {
      chartStatus.textContent = `TradingView ${state.interval} • trendline/tools enabled`;
    }
    if (chartUpdatedAt) {
      chartUpdatedAt.textContent = `Updated ${new Date().toLocaleTimeString()}`;
    }
    return;
  }

  if (chartStatus) {
    chartStatus.textContent = `Loading ${state.interval} chart...`;
  }

  try {
    const params = new URLSearchParams({
      symbol: state.symbol,
      interval: state.interval,
      limit: '320'
    });
    const response = await fetch(`/api/p2p/klines?${params.toString()}`);
    const data = await response.json();

    if (!response.ok || !Array.isArray(data.klines)) {
      throw new Error(data.message || 'Chart unavailable');
    }

    state.klines = data.klines;
    const bounds = getVisibleBounds(state.klines.length);
    if (bounds.max > 0) {
      chartView.visible = clamp(chartView.visible, bounds.min, bounds.max);
      chartView.offset = clamp(chartView.offset, 0, Math.max(0, state.klines.length - chartView.visible));
    }

    requestChartRedraw();

    if (chartStatus) {
      chartStatus.textContent = useLightweightChart
        ? `${state.interval} candles • ${data.klines.length} points • pinch/drag to explore`
        : `${state.interval} candles • ${data.klines.length} points • drag to pan • wheel to zoom`;
    }
    if (chartUpdatedAt) {
      chartUpdatedAt.textContent = `Updated ${new Date().toLocaleTimeString()}`;
    }
  } catch (error) {
    drawNoChartState('Unable to load chart');
    if (chartStatus) {
      chartStatus.textContent = error.message;
    }
  }
}

async function placeTradeOrder() {
  const amountUsdt = Number(tradeAmountUsdt?.value || 0);
  if (!Number.isFinite(amountUsdt) || amountUsdt < 10) {
    setTradeActionMessage('Minimum amount is 10 USDT.', 'error');
    return;
  }

  const disabledButtons = [placeTradeBtn, mobilePlaceTradeBtn].filter(Boolean);
  disabledButtons.forEach((btn) => {
    btn.disabled = true;
    btn.dataset.originalText = btn.textContent;
    btn.textContent = 'Placing...';
  });

  try {
    const response = await fetch('/api/trade/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        market: state.market,
        symbol: state.symbol,
        side: state.tradeSide,
        orderType: String(tradeOrderType?.value || 'market'),
        amountUsdt
      })
    });
    const data = await response.json();

    if (!response.ok || !data.order) {
      throw new Error(data.message || 'Unable to place order right now.');
    }

    setTradeActionMessage(
      `Order ${data.order.id} filled at ${formatPrice(data.order.referencePrice, 6)} (${data.order.estimatedQty} ${state.symbol.replace('USDT', '')}).`,
      'success'
    );
  } catch (error) {
    setTradeActionMessage(error.message, 'error');
  } finally {
    disabledButtons.forEach((btn) => {
      btn.disabled = false;
      btn.textContent = btn.dataset.originalText || (state.tradeSide === 'sell' ? 'Sell' : 'Buy');
    });
    syncTradeActionButton();
  }
}

function openBookPanel(mode) {
  const showTrades = mode === 'trades';
  panelOrderBook?.classList.toggle('hidden', showTrades);
  panelTrades?.classList.toggle('hidden', !showTrades);
  tabOrderBook?.classList.toggle('active', !showTrades);
  tabRecentTrades?.classList.toggle('active', showTrades);
}

function setMode(mode) {
  const isPro = mode === 'pro';
  flashModeBtn?.classList.toggle('active', !isPro);
  proModeBtn?.classList.toggle('active', isPro);
}

function setOrderType(orderType) {
  const normalized = ['limit', 'market', 'tpsl'].includes(orderType) ? orderType : 'limit';
  if (tradeOrderType) {
    tradeOrderType.value = normalized;
  }
  orderTypeTabs?.querySelectorAll('button[data-order-type]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.orderType === normalized);
  });
}

function setMobileTab(tab) {
  const target = ['chart', 'book', 'trades'].includes(tab) ? tab : 'chart';
  state.mobileTab = target;

  mobileMarketTabs?.querySelectorAll('button[data-mobile-tab]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.mobileTab === target);
  });

  if (!isMobileViewport()) {
    chartColumn?.classList.remove('mobile-hidden');
    bookColumn?.classList.remove('mobile-hidden');
    return;
  }

  if (target === 'chart') {
    chartColumn?.classList.remove('mobile-hidden');
    bookColumn?.classList.add('mobile-hidden');
  } else {
    chartColumn?.classList.add('mobile-hidden');
    bookColumn?.classList.remove('mobile-hidden');
  }

  if (target === 'trades') {
    openBookPanel('trades');
  }
  if (target === 'book') {
    openBookPanel('book');
  }
}

function toggleBookCollapse() {
  if (!bookColumn || !isMobileViewport()) {
    return;
  }
  const collapsed = bookColumn.classList.toggle('is-collapsed');
  if (mobileBookCollapseBtn) {
    mobileBookCollapseBtn.textContent = collapsed ? 'Expand' : 'Collapse';
  }
}

function setTradeNavOpen(open) {
  if (!tradeNavDrawer || !tradeNavOverlay || !tradeMenuToggle) {
    return;
  }

  const shouldOpen = Boolean(open);
  document.body.classList.toggle('trade-nav-open', shouldOpen);
  tradeNavDrawer.classList.toggle('is-open', shouldOpen);
  tradeNavOverlay.classList.toggle('hidden', !shouldOpen);
  tradeNavDrawer.setAttribute('aria-hidden', shouldOpen ? 'false' : 'true');
  tradeNavOverlay.setAttribute('aria-hidden', shouldOpen ? 'false' : 'true');
  tradeMenuToggle.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
}

function setupChartInteractions() {
  if (useLightweightChart) {
    if (tvChartHost && activeChartMode !== 'tradingview') {
      tvChartHost.style.touchAction = 'none';
    }
    return;
  }
  if (!canvas) {
    return;
  }

  const getPinchDistance = () => {
    const points = Array.from(activePointers.values());
    if (points.length < 2) {
      return 0;
    }
    return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
  };

  const getPinchCenterX = () => {
    const points = Array.from(activePointers.values());
    if (points.length < 2) {
      return 0;
    }
    return (points[0].x + points[1].x) / 2;
  };

  const stopPinch = () => {
    pinchState = null;
    canvas.classList.remove('zooming');
  };

  const stopDrag = (pointerId) => {
    if (!chartView.dragging) {
      return;
    }
    chartView.dragging = false;
    canvas.classList.remove('dragging');
    if (pointerId != null && canvas.hasPointerCapture?.(pointerId)) {
      canvas.releasePointerCapture(pointerId);
    }
  };

  canvas.addEventListener('pointerdown', (event) => {
    if (!Array.isArray(state.klines) || state.klines.length === 0) {
      return;
    }
    activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    canvas.setPointerCapture?.(event.pointerId);

    if (activePointers.size >= 2) {
      chartView.dragging = false;
      canvas.classList.remove('dragging');
      const startDistance = Math.max(getPinchDistance(), 1);
      pinchState = {
        startDistance,
        startVisible: chartView.visible,
        startOffset: chartView.offset,
        focusX: getPinchCenterX()
      };
      canvas.classList.add('zooming');
      return;
    }

    event.preventDefault();
    chartView.dragging = true;
    chartView.dragStartX = event.clientX;
    chartView.dragStartOffset = chartView.offset;
    canvas.classList.add('dragging');
  });

  canvas.addEventListener('pointermove', (event) => {
    if (!Array.isArray(state.klines) || state.klines.length === 0) {
      return;
    }

    if (activePointers.has(event.pointerId)) {
      activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }

    if (pinchState && activePointers.size >= 2) {
      event.preventDefault();
      const currentDistance = Math.max(getPinchDistance(), 1);
      const zoomRatio = pinchState.startDistance / currentDistance;
      const bounds = getVisibleBounds(state.klines.length);
      if (bounds.max <= 0) {
        return;
      }

      const prevVisible = chartView.visible;
      const nextVisible = clamp(Math.round(pinchState.startVisible * zoomRatio), bounds.min, bounds.max);
      if (nextVisible !== prevVisible) {
        chartView.visible = nextVisible;
      }

      const rect = canvas.getBoundingClientRect();
      const focusRatio = clamp((pinchState.focusX - rect.left) / Math.max(rect.width, 1), 0, 1);
      const prevMaxOffset = Math.max(0, state.klines.length - pinchState.startVisible);
      const prevOffset = clamp(pinchState.startOffset, 0, prevMaxOffset);
      const prevStart = Math.max(0, state.klines.length - pinchState.startVisible - prevOffset);
      const focusIndex = prevStart + Math.round(focusRatio * Math.max(pinchState.startVisible - 1, 0));
      const nextStart = clamp(
        focusIndex - Math.round(focusRatio * Math.max(chartView.visible - 1, 0)),
        0,
        Math.max(state.klines.length - chartView.visible, 0)
      );
      const nextOffset = state.klines.length - chartView.visible - nextStart;
      chartView.offset = clamp(nextOffset, 0, Math.max(0, state.klines.length - chartView.visible));

      requestChartRedraw();
      return;
    }

    if (!chartView.dragging) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const chartWidth = Math.max(120, rect.width - 72);
    const pxPerCandle = chartWidth / Math.max(1, chartView.visible);
    const movedX = event.clientX - chartView.dragStartX;
    const shiftedCandles = Math.round(movedX / Math.max(1, pxPerCandle));

    const maxOffset = Math.max(0, state.klines.length - chartView.visible);
    chartView.offset = clamp(chartView.dragStartOffset + shiftedCandles, 0, maxOffset);
    requestChartRedraw();
  });

  const stopPointer = (event) => {
    activePointers.delete(event.pointerId);
    if (canvas.hasPointerCapture?.(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
    if (activePointers.size < 2) {
      stopPinch();
    }
    if (activePointers.size === 0) {
      stopDrag(event.pointerId);
    }
  };

  canvas.addEventListener('pointerup', stopPointer);
  canvas.addEventListener('pointercancel', stopPointer);
  canvas.addEventListener('pointerleave', () => {
    activePointers.clear();
    stopPinch();
    stopDrag();
  });

  canvas.addEventListener(
    'wheel',
    (event) => {
      if (!Array.isArray(state.klines) || state.klines.length === 0) {
        return;
      }
      event.preventDefault();

      const delta = event.deltaY > 0 ? 8 : -8;
      const bounds = getVisibleBounds(state.klines.length);
      if (bounds.max <= 0) {
        return;
      }

      const prevVisible = chartView.visible;
      const nextVisible = clamp(prevVisible + delta, bounds.min, bounds.max);
      if (nextVisible === prevVisible) {
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const focusRatio = clamp((event.clientX - rect.left) / Math.max(rect.width, 1), 0, 1);
      const prevMaxOffset = Math.max(0, state.klines.length - prevVisible);
      const prevOffset = clamp(chartView.offset, 0, prevMaxOffset);
      const prevStart = Math.max(0, state.klines.length - prevVisible - prevOffset);
      const focusIndex = prevStart + Math.round(focusRatio * Math.max(prevVisible - 1, 0));

      chartView.visible = nextVisible;
      const nextStart = clamp(
        focusIndex - Math.round(focusRatio * Math.max(nextVisible - 1, 0)),
        0,
        Math.max(state.klines.length - nextVisible, 0)
      );
      const nextOffset = state.klines.length - nextVisible - nextStart;
      chartView.offset = clamp(nextOffset, 0, Math.max(0, state.klines.length - nextVisible));

      requestChartRedraw();
    },
    { passive: false }
  );
}

function applyResponsiveState() {
  if (activeChartMode !== 'tradingview') {
    resizeLightweightChart();
  }
  if (!isMobileViewport()) {
    chartColumn?.classList.remove('mobile-hidden');
    bookColumn?.classList.remove('mobile-hidden');
    bookColumn?.classList.remove('is-collapsed');
    return;
  }
  setMobileTab(state.mobileTab);
}

function setupInteractions() {
  setupChartInteractions();

  tabOrderBook?.addEventListener('click', () => openBookPanel('book'));
  tabRecentTrades?.addEventListener('click', () => openBookPanel('trades'));

  flashModeBtn?.addEventListener('click', () => setMode('flash'));
  proModeBtn?.addEventListener('click', () => setMode('pro'));

  chartViewTabs?.addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-chart-view]');
    if (!btn) {
      return;
    }
    void setChartMode(btn.dataset.chartView || 'standard');
  });

  intervalTabs?.addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-interval]');
    if (!btn) {
      return;
    }

    state.interval = btn.dataset.interval;
    chartNeedsAutoFit = true;
    intervalTabs.querySelectorAll('button[data-interval]').forEach((node) => {
      node.classList.toggle('active', node === btn);
    });

    if (activeChartMode === 'tradingview') {
      void renderTradingViewWidget(true);
      return;
    }

    void loadKlines();
  });

  pairSelector?.addEventListener('change', () => {
    const nextSymbol = normalizeRouteSymbol(pairSelector.value || 'BTCUSDT');
    window.location.href = `/trade/${state.market}/${encodeURIComponent(nextSymbol)}`;
  });

  tradeSideSwitch?.addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-side]');
    if (!btn) {
      return;
    }
    setTradeSide(btn.dataset.side);
  });

  mobileTradeSideSwitch?.addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-side]');
    if (!btn) {
      return;
    }
    setTradeSide(btn.dataset.side);
  });

  mobileQuickBuyBtn?.addEventListener('click', () => {
    setTradeSide('buy');
    placeTradeOrder();
  });

  mobileQuickSellBtn?.addEventListener('click', () => {
    setTradeSide('sell');
    placeTradeOrder();
  });

  tradeAmountUsdt?.addEventListener('input', () => {
    syncAmountInputs(tradeAmountUsdt.value || 0);
    renderEstimatedQty();
  });

  mobileTradeAmountUsdt?.addEventListener('input', () => {
    syncAmountInputs(mobileTradeAmountUsdt.value || 0);
    renderEstimatedQty();
  });

  tradeOrderType?.addEventListener('change', () => {
    setOrderType(tradeOrderType.value || 'limit');
    setTradeActionMessage(`Order type set to ${(tradeOrderType.value || 'limit').toUpperCase()}.`);
  });

  orderTypeTabs?.addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-order-type]');
    if (!btn) {
      return;
    }
    setOrderType(btn.dataset.orderType || 'limit');
    setTradeActionMessage(`Order type set to ${(tradeOrderType?.value || 'limit').toUpperCase()}.`);
  });

  tradeRiskSlider?.addEventListener('input', () => {
    const percent = Number(tradeRiskSlider.value || 0);
    const simulatedWalletUsdt = 1000;
    const nextAmount = (simulatedWalletUsdt * percent) / 100;
    syncAmountInputs(nextAmount <= 0 ? 0 : Number(nextAmount.toFixed(2)));
    renderEstimatedQty();
  });

  placeTradeBtn?.addEventListener('click', placeTradeOrder);
  mobilePlaceTradeBtn?.addEventListener('click', placeTradeOrder);

  mobileMarketTabs?.addEventListener('click', (event) => {
    const tabBtn = event.target.closest('button[data-mobile-tab]');
    if (!tabBtn) {
      return;
    }
    setMobileTab(tabBtn.dataset.mobileTab || 'chart');
  });

  mobileBookCollapseBtn?.addEventListener('click', toggleBookCollapse);

  tradeMenuToggle?.addEventListener('click', () => setTradeNavOpen(true));
  tradeNavClose?.addEventListener('click', () => setTradeNavOpen(false));
  tradeNavOverlay?.addEventListener('click', () => setTradeNavOpen(false));

  tradeNavDrawer?.addEventListener('click', (event) => {
    const link = event.target.closest('a[href]');
    if (link) {
      setTradeNavOpen(false);
    }
  });

  tradeDrawerLogout?.addEventListener('click', async () => {
    await logoutTradeSession();
  });

  tradeUserAvatar?.addEventListener('click', () => setTradeNavOpen(true));

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      setTradeNavOpen(false);
    }
  });

  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      applyResponsiveState();
      if (activeChartMode !== 'tradingview') {
        requestChartRedraw();
      }
    }, 120);
  });
}

async function initTradePage() {
  initTradeTheme();
  setPairIdentity();
  setupInteractions();
  await loadTradeUserSession();
  setOrderType(tradeOrderType?.value || 'limit');
  setTradeSide(state.tradeSide);
  syncAmountInputs(Number(tradeAmountUsdt?.value || 100));
  renderEstimatedQty();
  openBookPanel('book');
  setMobileTab('chart');
  const defaultChartMode =
    chartViewTabs?.querySelector('button.active[data-chart-view]')?.dataset.chartView || activeChartMode;
  await setChartMode(defaultChartMode, { suppressLoad: true });
  applyResponsiveState();

  await Promise.all([loadDepth(), loadKlines()]);

  if (depthTimer) {
    clearInterval(depthTimer);
  }
  if (klineTimer) {
    clearInterval(klineTimer);
  }

  depthTimer = setInterval(loadDepth, 4000);
  klineTimer = setInterval(loadKlines, 8000);
}

initTradePage();
