const form = document.getElementById('leadForm');
const message = document.getElementById('message');
const topSignupBtn = document.getElementById('topSignupBtn');
const heroUsers = document.getElementById('heroUsers');
const marketList = document.getElementById('marketList');
const newsList = document.getElementById('newsList');

const otpRow = document.getElementById('otpRow');
const otpInput = document.getElementById('otpInput');
const verifyOtpBtn = document.getElementById('verifyOtpBtn');

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

const MARKET_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'SOLUSDT'];
const COIN_NAMES = {
  BTCUSDT: 'Bitcoin',
  ETHUSDT: 'Ethereum',
  BNBUSDT: 'BNB',
  XRPUSDT: 'XRP',
  SOLUSDT: 'Solana'
};

const NEWS_ITEMS = [
  'Uganda to Acquire Stake in Kenya\'s Oil Pipeline via IPO',
  'StanChart Announces Buyback Following CFO Departure',
  'Empery Digital Shareholder Rejects Buyback Offer, Calls for CEO Resignation',
  'Etihad Airways Expands Premium Services Amid Rising Demand'
];

let pendingContact = '';
let pendingName = 'Website Lead';
let activeBookSymbol = '';
let depthRefreshTimer = null;

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

function renderMarketRows(ticker) {
  if (!marketList) {
    return;
  }

  if (!Array.isArray(ticker) || ticker.length === 0) {
    marketList.innerHTML = '<p class="bnx-loading">Market feed unavailable.</p>';
    return;
  }

  marketList.innerHTML = ticker
    .map((item) => {
      const change = Number(item.change24h || 0);
      const sign = change >= 0 ? '+' : '';
      const cls = change >= 0 ? 'up' : 'down';
      const symbol = item.symbol;
      const base = symbol.replace('USDT', '');
      const name = COIN_NAMES[symbol] || base;
      return `
        <button type="button" class="bnx-market-row" data-symbol="${symbol}">
          <div class="bnx-market-symbol">
            <span class="bnx-coin-dot">${base.slice(0, 1)}</span>
            <p>${base} <small>${name}</small></p>
          </div>
          <p class="bnx-market-price">$${formatPrice(item.lastPrice)}</p>
          <p class="bnx-market-change ${cls}">${sign}${change.toFixed(2)}%</p>
        </button>
      `;
    })
    .join('');
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

    renderMarketRows(data.ticker);
  } catch (error) {
    renderMarketRows([]);
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
    const row = event.target.closest('.bnx-market-row');
    if (!row) {
      return;
    }
    openChart(row.dataset.symbol);
  });
}

if (closeChartBtn) {
  closeChartBtn.addEventListener('click', closeChart);
}
if (closeChartBackdrop) {
  closeChartBackdrop.addEventListener('click', closeChart);
}

animateCounter(309497423);
renderNews();
loadMarket();
setInterval(loadMarket, 12000);
