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
const flashModeBtn = document.getElementById('flashModeBtn');
const proModeBtn = document.getElementById('proModeBtn');
const canvas = document.getElementById('klineCanvas');
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

let depthTimer = null;
let klineTimer = null;
let resizeTimer = null;
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
  document.title = `${displayPair} | Bitegit Trade`;
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

function drawNoChartState(text) {
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
      chartStatus.textContent = `${state.interval} candles • ${data.klines.length} points • drag to pan • wheel to zoom`;
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
  if (!canvas) {
    return;
  }

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
    event.preventDefault();
    chartView.dragging = true;
    chartView.dragStartX = event.clientX;
    chartView.dragStartOffset = chartView.offset;
    canvas.classList.add('dragging');
    canvas.setPointerCapture?.(event.pointerId);
  });

  canvas.addEventListener('pointermove', (event) => {
    if (!chartView.dragging || !Array.isArray(state.klines) || state.klines.length === 0) {
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

  canvas.addEventListener('pointerup', (event) => stopDrag(event.pointerId));
  canvas.addEventListener('pointercancel', (event) => stopDrag(event.pointerId));
  canvas.addEventListener('pointerleave', () => stopDrag());

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

  intervalTabs?.addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-interval]');
    if (!btn) {
      return;
    }

    state.interval = btn.dataset.interval;
    intervalTabs.querySelectorAll('button[data-interval]').forEach((node) => {
      node.classList.toggle('active', node === btn);
    });

    loadKlines();
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

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      setTradeNavOpen(false);
    }
  });

  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      applyResponsiveState();
      requestChartRedraw();
    }, 120);
  });
}

async function initTradePage() {
  setPairIdentity();
  setupInteractions();
  setOrderType(tradeOrderType?.value || 'limit');
  setTradeSide(state.tradeSide);
  syncAmountInputs(Number(tradeAmountUsdt?.value || 100));
  renderEstimatedQty();
  openBookPanel('book');
  setMobileTab('chart');
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
