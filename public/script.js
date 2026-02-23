const form = document.getElementById('leadForm');
const message = document.getElementById('message');
const whatsappBtn = document.getElementById('whatsappBtn');

const statVolume = document.getElementById('statVolume');
const statTraders = document.getElementById('statTraders');
const statUptime = document.getElementById('statUptime');

const marketRows = document.getElementById('marketRows');
const marketStatus = document.getElementById('marketStatus');
const tickerStrip = document.getElementById('tickerStrip');

const chartPair = document.getElementById('chartPair');
const chartPrice = document.getElementById('chartPrice');
const chartStatus = document.getElementById('chartStatus');
const pairSwitch = document.getElementById('pairSwitch');
const tvFrame = document.getElementById('tvFrame');

const WHATSAPP_NUMBER = '918003993930';
const MARKET_IDS = 'bitcoin,ethereum,binancecoin,solana,ripple';
let activeCoin = { id: 'bitcoin', symbol: 'BTC' };

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('name').value.trim();
  const mobile = document.getElementById('mobile').value.trim();

  message.textContent = '';
  message.className = 'message';

  if (name.length < 2) {
    message.textContent = 'Please enter a valid name.';
    message.classList.add('error');
    return;
  }

  if (!/^\d{10}$/.test(mobile)) {
    message.textContent = 'Please enter a valid 10-digit mobile number.';
    message.classList.add('error');
    return;
  }

  try {
    const response = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, mobile })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Something went wrong.');
    }

    message.textContent = data.message;
    message.classList.add('success');
    form.reset();
  } catch (err) {
    message.textContent = err.message;
    message.classList.add('error');
  }
});

whatsappBtn.addEventListener('click', () => {
  const name = document.getElementById('name').value.trim();
  const mobile = document.getElementById('mobile').value.trim();
  const details = [];

  if (name) {
    details.push(`Name: ${name}`);
  }
  if (mobile) {
    details.push(`Mobile: ${mobile}`);
  }

  const text = details.length
    ? `Hi, I want to connect.\n${details.join('\n')}`
    : 'Hi, I want to connect.';

  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
});

function animateValue(element, start, end, duration, formatter) {
  if (!element) {
    return;
  }

  const startTime = performance.now();

  function step(currentTime) {
    const progress = Math.min((currentTime - startTime) / duration, 1);
    const value = start + (end - start) * progress;
    element.textContent = formatter(value);

    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }

  requestAnimationFrame(step);
}

function initLiveStats() {
  animateValue(statVolume, 0, 1.4, 1600, (v) => `$${v.toFixed(1)}B+`);
  animateValue(statTraders, 0, 220, 1700, (v) => `${Math.round(v)}K+`);

  if (statUptime) {
    let toggle = false;
    setInterval(() => {
      toggle = !toggle;
      statUptime.textContent = toggle ? '99.99%' : '99.98%';
    }, 1500);
  }
}

async function loadChart(coinId, symbol) {
  if (chartStatus) {
    chartStatus.textContent = 'Loading TradingView chart...';
  }

  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=1&interval=hourly`
    );
    const data = await response.json();

    if (!response.ok || !Array.isArray(data.prices)) {
      throw new Error('Chart API error');
    }

    const latest = data.prices[data.prices.length - 1][1];
    chartPair.textContent = `${symbol}/USDT`;
    chartPrice.textContent = `$${latest.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

    if (tvFrame) {
      const tvSymbol = `BINANCE:${symbol}USDT`;
      tvFrame.src =
        `https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(tvSymbol)}` +
        '&interval=60&hidesidetoolbar=1&symboledit=0&saveimage=0' +
        '&toolbarbg=131722&studies=[]&theme=dark&style=1&timezone=Etc/UTC' +
        '&withdateranges=1&hideideas=1&hide_top_toolbar=1&hide_legend=1&locale=en';
    }

    if (chartStatus) {
      chartStatus.textContent = `Updated: ${new Date().toLocaleTimeString()}`;
    }
  } catch (error) {
    if (chartStatus) {
      chartStatus.textContent = 'Chart unavailable right now';
    }
  }
}

function renderMarketRows(coins) {
  if (!marketRows) {
    return;
  }

  marketRows.innerHTML = coins
    .map((coin) => {
      const up = coin.price_change_percentage_24h >= 0;
      const pair = `${coin.symbol.toUpperCase()}/USDT`;
      const change = `${up ? '+' : ''}${coin.price_change_percentage_24h.toFixed(2)}%`;

      return `
        <tr>
          <td>${pair}</td>
          <td>$${coin.current_price.toLocaleString()}</td>
          <td class="${up ? 'up' : 'down'}">${change}</td>
        </tr>
      `;
    })
    .join('');
}

function renderTicker(coins) {
  if (!tickerStrip) {
    return;
  }

  tickerStrip.innerHTML = coins
    .map((coin) => {
      const up = coin.price_change_percentage_24h >= 0;
      const pair = `${coin.symbol.toUpperCase()}/USDT`;
      const price = `$${coin.current_price.toLocaleString()}`;
      const change = `${up ? '+' : ''}${coin.price_change_percentage_24h.toFixed(2)}%`;
      return `<span class="${up ? 'up' : 'down'}">${pair} ${price} ${change}</span>`;
    })
    .join('');
}

async function loadMarket() {
  if (marketStatus) {
    marketStatus.textContent = 'Updating...';
  }

  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${MARKET_IDS}&order=market_cap_desc&per_page=5&page=1&sparkline=false&price_change_percentage=24h`
    );
    const data = await response.json();

    if (!response.ok || !Array.isArray(data)) {
      throw new Error('Market API error');
    }

    renderMarketRows(data);
    renderTicker(data);

    if (marketStatus) {
      marketStatus.textContent = `Updated: ${new Date().toLocaleTimeString()}`;
    }
  } catch (error) {
    if (marketRows) {
      marketRows.innerHTML = '<tr><td colspan="3" class="down">Market temporarily unavailable.</td></tr>';
    }
    if (marketStatus) {
      marketStatus.textContent = 'Update failed';
    }
  }
}

pairSwitch.addEventListener('click', (event) => {
  const target = event.target.closest('.pair-btn');
  if (!target) {
    return;
  }

  pairSwitch.querySelectorAll('.pair-btn').forEach((btn) => btn.classList.remove('active'));
  target.classList.add('active');

  activeCoin = { id: target.dataset.id, symbol: target.dataset.symbol };
  loadChart(activeCoin.id, activeCoin.symbol);
});

initLiveStats();
loadMarket();
loadChart(activeCoin.id, activeCoin.symbol);

setInterval(loadMarket, 20000);
setInterval(() => loadChart(activeCoin.id, activeCoin.symbol), 30000);
