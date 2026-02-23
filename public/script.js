const form = document.getElementById('leadForm');
const message = document.getElementById('message');
const whatsappBtn = document.getElementById('whatsappBtn');
const WHATSAPP_NUMBER = '918003993930';
const statVolume = document.getElementById('statVolume');
const statTraders = document.getElementById('statTraders');
const statUptime = document.getElementById('statUptime');
const marketRows = document.getElementById('marketRows');
const marketStatus = document.getElementById('marketStatus');
const MARKET_IDS = 'bitcoin,ethereum,binancecoin,solana,ripple';

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

initLiveStats();

function drawSparkline(canvas, values, positive) {
  if (!canvas || !values || values.length < 2) {
    return;
  }

  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  ctx.clearRect(0, 0, width, height);
  ctx.beginPath();
  values.forEach((val, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((val - min) / range) * (height - 2) - 1;
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.lineWidth = 2;
  ctx.strokeStyle = positive ? '#49de80' : '#ff6b6b';
  ctx.stroke();
}

function renderMarketRows(coins) {
  if (!marketRows) {
    return;
  }

  marketRows.innerHTML = coins
    .map((coin) => {
      const isUp = coin.price_change_percentage_24h >= 0;
      const pair = `${coin.symbol.toUpperCase()}/USDT`;
      const change = `${isUp ? '+' : ''}${coin.price_change_percentage_24h.toFixed(2)}%`;
      const sparkId = `spark-${coin.symbol}`;

      return `
        <tr>
          <td>${pair}</td>
          <td>$${coin.current_price.toLocaleString()}</td>
          <td class="${isUp ? 'up' : 'down'}">${change}</td>
          <td><canvas id="${sparkId}" class="spark" width="100" height="28"></canvas></td>
        </tr>
      `;
    })
    .join('');

  coins.forEach((coin) => {
    const spark = document.getElementById(`spark-${coin.symbol}`);
    const prices = coin.sparkline_in_7d?.price?.slice(-30) || [];
    drawSparkline(spark, prices, coin.price_change_percentage_24h >= 0);
  });
}

async function loadMarket() {
  if (marketStatus) {
    marketStatus.textContent = 'Updating...';
  }

  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${MARKET_IDS}&order=market_cap_desc&per_page=5&page=1&sparkline=true&price_change_percentage=24h`
    );
    const data = await response.json();

    if (!response.ok || !Array.isArray(data)) {
      throw new Error('Market API error');
    }

    renderMarketRows(data);
    if (marketStatus) {
      marketStatus.textContent = `Updated: ${new Date().toLocaleTimeString()}`;
    }
  } catch (error) {
    if (marketRows) {
      marketRows.innerHTML = '<tr><td colspan="4" class="down">Market temporarily unavailable.</td></tr>';
    }
    if (marketStatus) {
      marketStatus.textContent = 'Update failed';
    }
  }
}

loadMarket();
setInterval(loadMarket, 20000);
