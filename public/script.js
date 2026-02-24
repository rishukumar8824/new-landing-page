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
const chartModalFrame = document.getElementById('chartModalFrame');
const closeChartBtn = document.getElementById('closeChartBtn');
const closeChartBackdrop = document.getElementById('closeChartBackdrop');

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

function toTradingViewUrl(symbol) {
  return (
    `https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(`BINANCE:${symbol}`)}` +
    '&interval=60&hidesidetoolbar=1&symboledit=0&saveimage=0' +
    '&toolbarbg=111827&studies=[]&theme=dark&style=1&timezone=Etc/UTC' +
    '&withdateranges=1&hideideas=1&hide_top_toolbar=1&hide_legend=1&locale=en'
  );
}

function openChart(symbol) {
  if (!chartModal || !chartModalFrame || !chartModalTitle) {
    return;
  }

  const pair = symbol.replace('USDT', '/USDT');
  chartModalTitle.textContent = `${pair} Chart`;
  chartModalFrame.src = toTradingViewUrl(symbol);
  chartModal.classList.remove('hidden');
  chartModal.setAttribute('aria-hidden', 'false');
}

function closeChart() {
  if (!chartModal) {
    return;
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
