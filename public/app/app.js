(function appBootstrap() {
  const screens = Array.from(document.querySelectorAll('.app-screen'));
  const navButtons = Array.from(document.querySelectorAll('.app-bottom-nav button'));
  const drawerNavButtons = Array.from(document.querySelectorAll('[data-screen-target]'));
  const openDrawerBtn = document.getElementById('openProfileDrawer');
  const closeDrawerBtn = document.getElementById('closeProfileDrawer');
  const profileDrawer = document.getElementById('profileDrawer');
  const profileOverlay = document.getElementById('profileOverlay');
  const refreshMarketsBtn = document.getElementById('refreshMarketsBtn');
  const marketsList = document.getElementById('marketsList');
  const tradePairLabel = document.getElementById('tradePairLabel');
  const tradeLastPrice = document.getElementById('tradeLastPrice');
  const trade24hChange = document.getElementById('trade24hChange');
  const tradeChartCanvas = document.getElementById('tradeChartCanvas');
  const tradePairSwap = document.getElementById('tradePairSwap');
  const drawerUserName = document.getElementById('drawerUserName');
  const drawerUserMeta = document.getElementById('drawerUserMeta');
  const homeDepositBtn = document.getElementById('homeDepositBtn');
  const assetsDepositBtn = document.getElementById('assetsDepositBtn');
  const assetsWithdrawBtn = document.getElementById('assetsWithdrawBtn');
  const assetsTransferBtn = document.getElementById('assetsTransferBtn');
  const assetTotalBalance = document.getElementById('assetTotalBalance');
  const assetAvailableBalance = document.getElementById('assetAvailableBalance');
  const assetLockedBalance = document.getElementById('assetLockedBalance');
  const assetDepositNetwork = document.getElementById('assetDepositNetwork');
  const earnTotal = document.getElementById('earnTotal');
  const appToast = document.getElementById('appToast');
  const quickActionButtons = Array.from(document.querySelectorAll('.quick-grid [data-action]'));
  const openP2PBtn = document.getElementById('openP2PBtn');
  const openSupportCenterBtn = document.getElementById('openSupportCenterBtn');

  let activeScreen = 'home';
  let activeTickerIndex = 0;
  let tickerRows = [];
  let toastTimer = null;

  const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT', 'ADAUSDT'];

  function formatNumber(value, maxDigits = 4) {
    const parsed = Number(value || 0);
    if (!Number.isFinite(parsed)) {
      return '--';
    }
    return parsed.toLocaleString('en-US', {
      minimumFractionDigits: parsed >= 1000 ? 1 : 2,
      maximumFractionDigits: maxDigits
    });
  }

  function normalizeScreen(value) {
    const normalized = String(value || '').trim().toLowerCase();
    if (['home', 'markets', 'trade', 'earn', 'assets'].includes(normalized)) {
      return normalized;
    }
    return 'home';
  }

  function setScreen(nextScreen) {
    activeScreen = normalizeScreen(nextScreen);
    screens.forEach((screen) => {
      screen.classList.toggle('active', screen.dataset.screen === activeScreen);
    });
    navButtons.forEach((button) => {
      button.classList.toggle('active', normalizeScreen(button.dataset.screenTarget) === activeScreen);
    });
    setDrawerOpen(false);

    if (activeScreen === 'markets') {
      loadMarkets(true);
    }
    if (activeScreen === 'assets') {
      loadAssetSummary();
    }
  }

  function setDrawerOpen(open) {
    const shouldOpen = Boolean(open);
    profileDrawer.classList.toggle('open', shouldOpen);
    profileDrawer.setAttribute('aria-hidden', shouldOpen ? 'false' : 'true');
    profileOverlay.classList.toggle('hidden', !shouldOpen);
    document.body.style.overflow = shouldOpen ? 'hidden' : 'auto';
  }

  function showToast(message) {
    if (!appToast) {
      return;
    }
    appToast.textContent = String(message || '').trim() || 'Done';
    appToast.classList.remove('hidden');
    if (toastTimer) {
      clearTimeout(toastTimer);
    }
    toastTimer = setTimeout(() => {
      appToast.classList.add('hidden');
    }, 1800);
  }

  async function fetchJson(url) {
    const response = await fetch(url, { credentials: 'include' });
    const body = await response.json().catch(() => ({}));
    return { response, body };
  }

  function marketRowTemplate(item) {
    const down = Number(item.change24h || 0) < 0;
    const changeText = `${down ? '' : '+'}${Number(item.change24h || 0).toFixed(2)}%`;
    const pair = String(item.symbol || '').replace('USDT', '/USDT');
    return `
      <li class="market-row">
        <div class="pair-main">
          <strong>${pair}</strong>
          <small>Live</small>
        </div>
        <div class="pair-price">${formatNumber(item.lastPrice, 6)}</div>
        <span class="pair-change ${down ? 'down' : 'up'}">${changeText}</span>
      </li>
    `;
  }

  function drawTradeChart(item) {
    const canvas = tradeChartCanvas;
    if (!canvas) {
      return;
    }
    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth * ratio;
    const height = canvas.clientHeight * ratio;
    canvas.width = width;
    canvas.height = height;
    context.scale(ratio, ratio);

    const viewWidth = canvas.clientWidth;
    const viewHeight = canvas.clientHeight;
    context.clearRect(0, 0, viewWidth, viewHeight);

    context.fillStyle = '#0b0f16';
    context.fillRect(0, 0, viewWidth, viewHeight);

    context.strokeStyle = 'rgba(255,255,255,0.08)';
    context.lineWidth = 1;
    for (let x = 0; x < 6; x += 1) {
      const px = (x / 5) * viewWidth;
      context.beginPath();
      context.moveTo(px, 0);
      context.lineTo(px, viewHeight);
      context.stroke();
    }
    for (let y = 0; y < 5; y += 1) {
      const py = (y / 4) * viewHeight;
      context.beginPath();
      context.moveTo(0, py);
      context.lineTo(viewWidth, py);
      context.stroke();
    }

    const points = [];
    const base = Number(item.lastPrice || 1);
    const drift = Number(item.change24h || 0) / 100;
    let rolling = base * (1 - drift * 0.2);
    for (let i = 0; i < 44; i += 1) {
      const noise = (Math.random() - 0.5) * base * 0.012;
      rolling = Math.max(0.00001, rolling + noise + base * drift * 0.03);
      points.push(rolling);
    }

    const min = Math.min(...points);
    const max = Math.max(...points);
    const span = Math.max(max - min, max * 0.02);

    const gradient = context.createLinearGradient(0, 0, 0, viewHeight);
    gradient.addColorStop(0, 'rgba(88,197,126,0.35)');
    gradient.addColorStop(1, 'rgba(88,197,126,0)');

    context.beginPath();
    points.forEach((value, index) => {
      const x = (index / (points.length - 1)) * viewWidth;
      const y = viewHeight - ((value - min) / span) * (viewHeight - 20) - 10;
      if (index === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    });
    context.strokeStyle = '#60d18c';
    context.lineWidth = 2;
    context.stroke();

    context.lineTo(viewWidth, viewHeight - 8);
    context.lineTo(0, viewHeight - 8);
    context.closePath();
    context.fillStyle = gradient;
    context.fill();
  }

  function updateTradeTicker(index) {
    if (!tickerRows.length) {
      return;
    }
    activeTickerIndex = (index + tickerRows.length) % tickerRows.length;
    const row = tickerRows[activeTickerIndex];
    const symbol = String(row.symbol || '').replace('USDT', '/USDT');
    const change = Number(row.change24h || 0);
    tradePairLabel.textContent = symbol;
    tradeLastPrice.textContent = formatNumber(row.lastPrice, 6);
    trade24hChange.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
    trade24hChange.style.color = change >= 0 ? '#5ad68b' : '#f26678';
    tradeLastPrice.style.color = change >= 0 ? '#58c57e' : '#f26678';
    drawTradeChart(row);
  }

  async function loadMarkets(force = false) {
    if (!force && tickerRows.length) {
      return;
    }
    if (marketsList) {
      marketsList.innerHTML = '<li class="loading-row">Refreshing live market data...</li>';
    }

    try {
      const query = encodeURIComponent(symbols.join(','));
      const { response, body } = await fetchJson(`/api/p2p/exchange-ticker?symbols=${query}`);
      if (!response.ok || !Array.isArray(body.ticker)) {
        throw new Error('Ticker unavailable');
      }
      tickerRows = body.ticker;
      if (marketsList) {
        marketsList.innerHTML = tickerRows.map((row) => marketRowTemplate(row)).join('');
      }
      updateTradeTicker(activeTickerIndex);
    } catch (error) {
      if (marketsList) {
        marketsList.innerHTML = '<li class="loading-row">Unable to load market data right now.</li>';
      }
    }
  }

  async function loadUser() {
    try {
      const { response, body } = await fetchJson('/api/p2p/me');
      if (!response.ok || !body.loggedIn || !body.user) {
        drawerUserName.textContent = 'Guest User';
        drawerUserMeta.textContent = 'Login required';
        return;
      }
      const user = body.user;
      drawerUserName.textContent = user.username || user.email || 'Bitegit User';
      const kycLabel = user.kyc?.statusLabel || 'Not Submitted';
      drawerUserMeta.textContent = `${user.email || ''} • KYC ${kycLabel}`;
    } catch (error) {
      drawerUserName.textContent = 'Guest User';
      drawerUserMeta.textContent = 'Login required';
    }
  }

  async function loadAssetSummary() {
    assetTotalBalance.textContent = '--';
    assetAvailableBalance.textContent = '--';
    assetLockedBalance.textContent = '--';
    assetDepositNetwork.textContent = '--';

    try {
      const { response, body } = await fetchJson('/api/wallet/summary');
      if (!response.ok || !body.summary) {
        throw new Error('Unauthorized');
      }

      const summary = body.summary;
      assetTotalBalance.textContent = `${formatNumber(summary.total_balance || 0, 4)} USDT`;
      assetAvailableBalance.textContent = `${formatNumber(summary.available_balance || 0, 4)} USDT`;
      assetLockedBalance.textContent = `${formatNumber(summary.locked_balance || 0, 4)} USDT`;
      assetDepositNetwork.textContent = String(summary.deposit_network || 'TRC20').toUpperCase();
      earnTotal.textContent = `${formatNumber(summary.total_balance || 0, 4)} USDT`;
    } catch (error) {
      assetTotalBalance.textContent = 'Login Required';
      assetAvailableBalance.textContent = 'Login Required';
      assetLockedBalance.textContent = 'Login Required';
      assetDepositNetwork.textContent = 'TRC20';
    }
  }

  function goToAssets(screenMessage = '') {
    setScreen('assets');
    if (screenMessage) {
      showToast(screenMessage);
    }
  }

  function openP2PPage() {
    window.location.href = '/p2p';
  }

  function openSupportCenterPage() {
    window.location.href = '/support-center/';
  }

  navButtons.forEach((button) => {
    button.addEventListener('click', () => {
      setScreen(button.dataset.screenTarget);
    });
  });

  drawerNavButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const target = button.dataset.screenTarget;
      if (target) {
        setScreen(target);
      } else {
        setDrawerOpen(false);
      }
    });
  });

  openDrawerBtn?.addEventListener('click', () => setDrawerOpen(true));
  closeDrawerBtn?.addEventListener('click', () => setDrawerOpen(false));
  profileOverlay?.addEventListener('click', () => setDrawerOpen(false));
  refreshMarketsBtn?.addEventListener('click', () => loadMarkets(true));
  tradePairSwap?.addEventListener('click', () => updateTradeTicker(activeTickerIndex + 1));
  homeDepositBtn?.addEventListener('click', () => goToAssets('Assets screen opened'));
  assetsDepositBtn?.addEventListener('click', () => goToAssets('Deposit option ready'));
  assetsWithdrawBtn?.addEventListener('click', () => {
    showToast('Withdraw flow coming in next update');
  });
  assetsTransferBtn?.addEventListener('click', () => {
    showToast('Transfer flow coming in next update');
  });
  openP2PBtn?.addEventListener('click', () => {
    setDrawerOpen(false);
    openP2PPage();
  });
  openSupportCenterBtn?.addEventListener('click', () => {
    setDrawerOpen(false);
    openSupportCenterPage();
  });

  quickActionButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const action = String(button.dataset.action || '').trim().toLowerCase();
      if (action === 'deposit') {
        goToAssets('Deposit panel ready');
        return;
      }
      if (action === 'p2p') {
        openP2PPage();
        return;
      }
      if (action === 'withdraw') {
        goToAssets('Withdraw panel ready');
        showToast('Open Assets and tap Withdraw');
        return;
      }
      if (action === 'buy') {
        setScreen('markets');
        showToast('Choose pair and trade from Markets');
        return;
      }
      if (action === 'convert') {
        setScreen('trade');
        showToast('Trade screen opened');
        return;
      }
      if (action === 'support' || action === 'more') {
        openSupportCenterPage();
        return;
      }
      showToast('Feature will be enabled soon');
    });
  });

  window.addEventListener('resize', () => {
    if (tickerRows.length) {
      drawTradeChart(tickerRows[activeTickerIndex]);
    }
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      setDrawerOpen(false);
    }
  });

  loadUser();
  loadMarkets(true);
  loadAssetSummary();
  setScreen('home');
})();
