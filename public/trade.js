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
  klines: [],
  ticker: null,
  orderBook: null,
  trades: []
};

const pairTitle = document.getElementById('pairTitle');
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

let depthTimer = null;
let klineTimer = null;
let resizeTimer = null;

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
  document.title = `${displayPair} | Bitegit Trade`;
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

  setPriceChangeStyle(change);
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

  if (!Array.isArray(data) || data.length === 0) {
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

  const lows = data.map((item) => item.low);
  const highs = data.map((item) => item.high);
  const volumes = data.map((item) => item.volume);

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
  const stepX = usableWidth / data.length;
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

  for (let i = 0; i < data.length; i += 1) {
    const candle = data[i];
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

  const lastClose = data[data.length - 1].close;
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
      limit: '120'
    });
    const response = await fetch(`/api/p2p/klines?${params.toString()}`);
    const data = await response.json();

    if (!response.ok || !Array.isArray(data.klines)) {
      throw new Error(data.message || 'Chart unavailable');
    }

    state.klines = data.klines;
    drawCandles(state.klines);

    if (chartStatus) {
      chartStatus.textContent = `${state.interval} candles • ${data.klines.length} points`;
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

function setupInteractions() {
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

  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => drawCandles(state.klines), 120);
  });
}

async function initTradePage() {
  setPairIdentity();
  setupInteractions();
  openBookPanel('book');

  await Promise.all([loadDepth(), loadKlines()]);

  if (depthTimer) {
    clearInterval(depthTimer);
  }
  if (klineTimer) {
    clearInterval(klineTimer);
  }

  depthTimer = setInterval(loadDepth, 4000);
  klineTimer = setInterval(loadKlines, 12000);
}

initTradePage();
