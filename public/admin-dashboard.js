const API_BASE = '/api/admin';

const state = {
  currentView: 'overview',
  admin: null,
  charts: {
    overviewRevenue: null,
    revenue: null
  },
  users: [],
  spotPairs: [],
  walletFilters: {
    depositStatus: '',
    withdrawalStatus: 'PENDING'
  },
  support: {
    activeTicketId: null,
    pollInterval: null
  }
};

const dom = {
  sidebar: document.getElementById('adminSidebar'),
  sidebarOverlay: document.getElementById('sidebarOverlay'),
  menuToggleBtn: document.getElementById('menuToggleBtn'),
  logoutBtnSide: document.getElementById('logoutBtnSide'),
  sidebarNav: document.getElementById('sidebarNav'),
  panels: Array.from(document.querySelectorAll('[data-panel]')),
  pageTitle: document.getElementById('pageTitle'),
  adminIdentity: document.getElementById('adminIdentity'),
  globalMessage: document.getElementById('globalMessage'),
  refreshCurrentBtn: document.getElementById('refreshCurrentBtn'),
  logoutBtn: document.getElementById('logoutBtn'),
  liveTime: document.getElementById('liveTime')
};

const viewLoaders = {
  overview: loadOverview,
  kyc: loadKyc,
  users: loadUsers,
  wallet: loadWallet,
  spot: loadSpot,
  p2p: loadP2P,
  support: loadSupport,
  revenue: loadRevenue,
  risk: loadRisk,
  features: loadFeatures,
  notifications: loadNotifications,
  blockchain: loadBlockchain,
  compliance: loadCompliance,
  settings: loadSettings,
  monitoring: loadMonitoring,
  audit: loadAudit,
  adminusers: loadAdminUsers
};

const PAGE_TITLES = {
  overview: 'Overview',
  kyc: 'KYC Management',
  users: 'User Management',
  wallet: 'Wallet Management',
  spot: 'Spot Trading',
  p2p: 'P2P Control',
  support: 'Support Tickets',
  revenue: 'Revenue',
  risk: 'Risk Management',
  features: 'Feature Flags',
  notifications: 'Notifications',
  blockchain: 'Blockchain',
  compliance: 'Compliance',
  settings: 'Platform Settings',
  monitoring: 'Monitoring',
  audit: 'Audit Logs',
  adminusers: 'Admin Users'
};

function formatNumber(value, digits = 2) {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) {
    return '0';
  }
  return num.toLocaleString('en-IN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
}

function formatDate(value) {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return date.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function statusBadge(status) {
  const normalized = String(status || '').trim().toUpperCase();
  let css = 'badge';
  if (['ACTIVE', 'APPROVED', 'OPEN', 'SUCCESS', 'RELEASED', 'CONNECTED', 'ENABLED', 'VERIFIED', 'COMPLETED'].includes(normalized)) {
    css += ' success';
  } else if (['PENDING', 'IN_PROGRESS', 'PAID', 'PENDING_REVIEW', 'NORMAL'].includes(normalized)) {
    css += ' warning';
  } else if (['BANNED', 'REJECTED', 'FAILURE', 'CANCELLED', 'DISPUTED', 'DISABLED', 'ERROR', 'CLOSED', 'CRITICAL'].includes(normalized)) {
    css += ' danger';
  }
  return `<span class="${css}">${normalized || '-'}</span>`;
}

function showMessage(text, type = 'info') {
  dom.globalMessage.textContent = text;
  dom.globalMessage.classList.remove('hidden', 'border-emerald-500/40', 'text-emerald-300', 'bg-emerald-500/10', 'border-rose-500/40', 'text-rose-300', 'bg-rose-500/10', 'border-slate-700', 'text-slate-300', 'bg-slate-900/60');
  if (type === 'error') {
    dom.globalMessage.classList.add('border-rose-500/40', 'text-rose-300', 'bg-rose-500/10');
  } else if (type === 'success') {
    dom.globalMessage.classList.add('border-emerald-500/40', 'text-emerald-300', 'bg-emerald-500/10');
  } else {
    dom.globalMessage.classList.add('border-slate-700', 'text-slate-300', 'bg-slate-900/60');
  }
}

function setActionButtonLoading(button, loading, loadingText = 'Processing...') {
  if (!button) {
    return;
  }
  if (loading) {
    if (!button.dataset.originalLabel) {
      button.dataset.originalLabel = button.textContent || 'Action';
    }
    button.disabled = true;
    button.textContent = loadingText;
    return;
  }
  button.disabled = false;
  if (button.dataset.originalLabel) {
    button.textContent = button.dataset.originalLabel;
    delete button.dataset.originalLabel;
  }
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  if (response.status === 401) {
    window.location.href = '/admin/login';
    throw new Error('Unauthorized');
  }

  const contentType = String(response.headers.get('content-type') || '').toLowerCase();
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await response.json().catch(() => ({})) : await response.text();

  if (!response.ok) {
    const message = isJson ? String(payload?.message || 'Request failed') : `Request failed (${response.status})`;
    throw new Error(message);
  }

  return payload;
}

function setSidebarOpen(open) {
  if (window.innerWidth >= 1024) {
    return;
  }
  if (open) {
    dom.sidebar.classList.add('open');
    if (dom.sidebarOverlay) dom.sidebarOverlay.classList.add('active');
  } else {
    dom.sidebar.classList.remove('open');
    if (dom.sidebarOverlay) dom.sidebarOverlay.classList.remove('active');
  }
}

function startLiveClock() {
  function tick() {
    if (!dom.liveTime) return;
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    dom.liveTime.textContent = `${h}:${m}:${s}`;
  }
  tick();
  setInterval(tick, 1000);
}

function setActiveNav(view) {
  const buttons = dom.sidebarNav.querySelectorAll('[data-view]');
  buttons.forEach((button) => {
    const isActive = button.getAttribute('data-view') === view;
    button.classList.toggle('active', isActive);
  });
}

function showPanel(view) {
  dom.panels.forEach((panel) => {
    const isActive = panel.getAttribute('data-panel') === view;
    panel.classList.toggle('hidden', !isActive);
  });
  dom.pageTitle.textContent = PAGE_TITLES[view] || (view.charAt(0).toUpperCase() + view.slice(1));
}

async function loadCurrentView(options = {}) {
  const loader = viewLoaders[state.currentView];
  if (!loader) {
    return;
  }
  try {
    await loader(options);
  } catch (error) {
    if (!options.silent) {
      showMessage(error.message || 'Failed to load section.', 'error');
    }
  }
}

async function changeView(view) {
  if (!viewLoaders[view]) {
    return;
  }
  // Always close user profile drawer when switching views
  closeUserProfile();
  // Clear support polling when leaving support view
  if (state.currentView === 'support' && view !== 'support') {
    if (state.support.pollInterval) {
      clearInterval(state.support.pollInterval);
      state.support.pollInterval = null;
    }
  }
  state.currentView = view;
  setActiveNav(view);
  showPanel(view);
  setSidebarOpen(false);
  await loadCurrentView();
}

function renderCards(containerId, cards) {
  const container = document.getElementById(containerId);
  if (!container) {
    return;
  }
  container.innerHTML = cards
    .map(
      (card) => `
      <div class="stat-card">
        <div class="stat-icon">${card.icon || '📊'}</div>
        <div class="stat-info">
          <div class="stat-label">${card.label}</div>
          <div class="stat-value">${card.value}</div>
          ${card.meta ? `<div class="stat-meta">${card.meta}</div>` : ''}
        </div>
      </div>
    `
    )
    .join('');
}

function drawChart(instanceKey, canvasId, labels, values, color = '#22c55e') {
  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    return;
  }

  const context = canvas.getContext('2d');
  if (!context) {
    return;
  }

  if (state.charts[instanceKey]) {
    state.charts[instanceKey].destroy();
  }

  state.charts[instanceKey] = new Chart(context, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          data: values,
          borderColor: color,
          backgroundColor: `${color}33`,
          borderWidth: 2,
          pointRadius: 2,
          pointHoverRadius: 3,
          fill: true,
          tension: 0.32
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        x: {
          ticks: { color: '#94a3b8' },
          grid: { color: '#1e293b' }
        },
        y: {
          ticks: { color: '#94a3b8' },
          grid: { color: '#1e293b' }
        }
      }
    }
  });
}

async function ensureAdminSession() {
  const payload = await apiRequest('/auth/me');
  state.admin = payload.admin;
  dom.adminIdentity.textContent = `${state.admin.email} • ${state.admin.role}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Overview
// ─────────────────────────────────────────────────────────────────────────────

async function loadOverview() {
  const payload = await apiRequest('/dashboard/overview');

  const revenue = payload.revenue || {};
  const wallet = payload.wallet || {};
  const monitoring = payload.monitoring || {};

  renderCards('overviewCards', [
    {
      icon: '💰',
      label: 'Revenue Today',
      value: `₹${formatNumber(revenue.totalRevenue?.today || 0, 2)}`,
      meta: `Week: ₹${formatNumber(revenue.totalRevenue?.week || 0, 2)}`
    },
    {
      icon: '📅',
      label: 'Revenue Month',
      value: `₹${formatNumber(revenue.totalRevenue?.month || 0, 2)}`,
      meta: `Spot Fees: ₹${formatNumber(revenue.spotFeeEarnings || 0, 2)}`
    },
    {
      icon: '📈',
      label: 'Trading Volume',
      value: `USDT ${formatNumber(revenue.totalTradingVolume || 0, 2)}`,
      meta: `Active users: ${Number(revenue.totalActiveUsers || 0)}`
    },
    {
      icon: '🏦',
      label: 'Platform Wallet',
      value: `₹${formatNumber(wallet.totalBalance || 0, 2)}`,
      meta: `Locked: ₹${formatNumber(wallet.totalLockedBalance || 0, 2)}`
    }
  ]);

  const trend = Array.isArray(revenue.trend) ? revenue.trend : [];
  drawChart(
    'overviewRevenue',
    'overviewRevenueChart',
    trend.map((row) => row.date),
    trend.map((row) => Number(row.revenue || 0)),
    '#22c55e'
  );

  const health = document.getElementById('overviewHealth');
  health.innerHTML = [
    ['DB Connection', monitoring.dbConnected ? 'Connected' : 'Disconnected'],
    ['Active Users', Number(monitoring.activeUsers || 0)],
    ['Active Admins', Number(monitoring.activeAdmins || 0)],
    ['Failed Login (10m)', Number(monitoring.failedLoginAttemptsLast10Min || 0)],
    ['API Requests (10m)', Number(monitoring.apiRequestsLast10Min || 0)]
  ]
    .map(
      ([key, value]) => `
      <div class="flex items-center justify-between border-b border-slate-800 pb-2">
        <dt class="text-slate-400">${key}</dt>
        <dd class="font-medium">${value}</dd>
      </div>
    `
    )
    .join('');
}

// ─────────────────────────────────────────────────────────────────────────────
// KYC Management
// ─────────────────────────────────────────────────────────────────────────────

async function loadKyc() {
  const statusFilter = document.getElementById('kycStatusFilter')?.value || '';
  const query = new URLSearchParams({ limit: '50' });
  if (statusFilter) {
    query.set('kycStatus', statusFilter);
  }
  const payload = await apiRequest(`/users?${query.toString()}`);
  const users = Array.isArray(payload.users) ? payload.users : [];

  const countEl = document.getElementById('kycCount');
  if (countEl) {
    countEl.textContent = `${users.length} users`;
  }

  const body = document.getElementById('kycTableBody');
  if (!body) {
    return;
  }

  body.innerHTML = users
    .map(
      (user) => `
      <tr>
        <td class="admin-td font-mono text-xs">${user.userId}</td>
        <td class="admin-td">${user.email || '-'}</td>
        <td class="admin-td font-mono">****</td>
        <td class="admin-td">${statusBadge(user.kycStatus)}</td>
        <td class="admin-td">${formatDate(user.updatedAt)}</td>
        <td class="admin-td">
          <div class="flex flex-wrap gap-1">
            <button class="btn-secondary !text-xs !py-1" data-kyc-action="view-docs" data-user-id="${user.userId}">View Docs</button>
            <button class="btn-primary !text-xs !py-1" data-kyc-action="approve" data-user-id="${user.userId}">Approve</button>
            <button class="btn-danger !text-xs !py-1" data-kyc-action="reject" data-user-id="${user.userId}">Reject</button>
          </div>
        </td>
      </tr>
    `
    )
    .join('');

  if (users.length === 0) {
    body.innerHTML = '<tr><td class="admin-td text-slate-500" colspan="6">No users found.</td></tr>';
  }
}

async function viewKycDocuments(userId) {
  const modal = document.getElementById('kycDocModal');
  const aadhaarContainer = document.getElementById('kycDocAadhaarContainer');
  const selfieContainer = document.getElementById('kycDocSelfieContainer');

  modal.classList.remove('hidden');
  modal.classList.add('flex');
  aadhaarContainer.innerHTML = '<p class="text-sm text-slate-500">Loading...</p>';
  selfieContainer.innerHTML = '<p class="text-sm text-slate-500">Loading...</p>';

  try {
    const data = await apiRequest(`/users/${encodeURIComponent(userId)}/kyc/documents`);

    document.getElementById('kycDocModalMeta').textContent = `User: ${userId} • Submitted: ${formatDate(data.submittedAt)}`;
    document.getElementById('kycDocStatus').textContent = data.status || 'UNKNOWN';
    document.getElementById('kycDocAadhaar').textContent = data.aadhaarMasked ? `${data.aadhaarMasked} (Last 4: ${data.aadhaarLast4 || '-'})` : '-';

    if (data.aadhaarFront) {
      aadhaarContainer.innerHTML = `<img src="${data.aadhaarFront}" alt="Aadhaar Front" class="w-full h-auto object-contain max-h-80" />`;
    } else {
      aadhaarContainer.innerHTML = '<p class="text-sm text-slate-500 p-4 text-center">No Aadhaar image available</p>';
    }

    if (data.selfie) {
      selfieContainer.innerHTML = `<img src="${data.selfie}" alt="Selfie" class="w-full h-auto object-contain max-h-80" />`;
    } else {
      selfieContainer.innerHTML = '<p class="text-sm text-slate-500 p-4 text-center">No selfie image available</p>';
    }

    document.getElementById('kycDocActions').innerHTML = `
      <button class="btn-primary" data-kyc-doc-action="approve" data-user-id="${userId}">Approve KYC</button>
      <button class="btn-danger" data-kyc-doc-action="reject" data-user-id="${userId}">Reject KYC</button>
    `;
  } catch (error) {
    aadhaarContainer.innerHTML = `<p class="text-sm text-rose-400 p-4">Error: ${error.message}</p>`;
    selfieContainer.innerHTML = '';
    showMessage(error.message || 'Failed to load KYC documents.', 'error');
  }
}

async function reviewKyc(userId, decision, reason) {
  await apiRequest(`/users/${encodeURIComponent(userId)}/kyc/review`, {
    method: 'POST',
    body: JSON.stringify({ decision, remarks: reason || '' })
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// User Management
// ─────────────────────────────────────────────────────────────────────────────

async function loadUsers(options = {}) {
  const search = options?.search ?? document.getElementById('userSearchInput').value.trim();
  const query = search ? `?email=${encodeURIComponent(search)}` : '';
  const payload = await apiRequest(`/users${query}`);

  state.users = Array.isArray(payload.users) ? payload.users : [];
  const body = document.getElementById('usersTableBody');
  body.innerHTML = state.users
    .map(
      (user) => `
      <tr class="user-row" data-profile-id="${user.userId}" style="cursor:pointer;transition:background 0.15s;" title="Click to view full profile">
        <td class="admin-td" style="font-family:monospace;font-size:11px;color:var(--accent);">${user.userId}</td>
        <td class="admin-td" style="font-weight:500;">${user.email}</td>
        <td class="admin-td">${statusBadge(user.role)}</td>
        <td class="admin-td">${statusBadge(user.status)}</td>
        <td class="admin-td">${statusBadge(user.kycStatus)}</td>
        <td class="admin-td" style="text-align:right;color:var(--green);font-weight:600;">${formatNumber(user.balance, 4)}</td>
        <td class="admin-td" style="text-align:right;color:var(--red);">${formatNumber(user.lockedBalance, 4)}</td>
        <td class="admin-td">
          <div style="display:flex;flex-wrap:wrap;gap:4px;">
            <button class="btn-primary btn-sm" data-user-action="profile" data-user-id="${user.userId}">👤 Profile</button>
            <button class="btn-secondary btn-sm" data-user-action="freeze" data-user-id="${user.userId}">Freeze</button>
            <button class="btn-danger btn-sm" data-user-action="ban" data-user-id="${user.userId}">Ban</button>
          </div>
        </td>
      </tr>
    `
    )
    .join('');

  if (state.users.length === 0) {
    body.innerHTML = '<tr><td class="admin-td text-slate-500" colspan="8">No users found.</td></tr>';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Wallet
// ─────────────────────────────────────────────────────────────────────────────

async function loadWallet() {
  const depositStatusSelect = document.getElementById('walletDepositStatusFilter');
  const withdrawalStatusSelect = document.getElementById('walletWithdrawalStatusFilter');
  const selectedDepositStatus = String(depositStatusSelect?.value || '').trim().toUpperCase();
  const selectedWithdrawalStatus = String(withdrawalStatusSelect?.value || '').trim().toUpperCase();

  state.walletFilters.depositStatus = selectedDepositStatus;
  state.walletFilters.withdrawalStatus = selectedWithdrawalStatus;

  const depositsQuery = new URLSearchParams({ limit: '25' });
  const withdrawalsQuery = new URLSearchParams({ limit: '25' });

  if (selectedDepositStatus) {
    depositsQuery.set('status', selectedDepositStatus);
  }

  if (selectedWithdrawalStatus) {
    withdrawalsQuery.set('status', selectedWithdrawalStatus);
  }

  const [overview, deposits, withdrawals, hotBalances, usdtConfigPayload] = await Promise.all([
    apiRequest('/wallet/overview'),
    apiRequest(`/wallet/deposits?${depositsQuery.toString()}`),
    apiRequest(`/wallet/withdrawals?${withdrawalsQuery.toString()}`),
    apiRequest('/wallet/hot-balances'),
    apiRequest('/wallet/config/USDT').catch(() => ({
      config: {
        coin: 'USDT',
        defaultNetwork: 'TRC20',
        withdrawalsEnabled: true,
        depositsEnabled: true,
        networkFee: 1,
        minWithdrawal: 10,
        maxWithdrawal: 100000,
        depositAddresses: { TRC20: '', ERC20: '', BEP20: '' },
        minDepositConfirmations: { TRC20: 20, ERC20: 12, BEP20: 15 }
      }
    }))
  ]);

  const depositRows = Array.isArray(deposits.deposits) ? deposits.deposits : [];
  const withdrawalRows = Array.isArray(withdrawals.withdrawals) ? withdrawals.withdrawals : [];
  const pendingDeposits = depositRows.filter((row) => String(row.status || '').toUpperCase() === 'PENDING');
  const pendingDepositAmount = pendingDeposits.reduce((sum, row) => sum + Number(row.amount || 0), 0);

  renderCards('walletCards', [
    { icon: '💎', label: 'Total Balance', value: `₹${formatNumber(overview.totalBalance || 0, 2)}` },
    { icon: '🔒', label: 'Locked Balance', value: `₹${formatNumber(overview.totalLockedBalance || 0, 2)}` },
    { icon: '⬇️', label: 'Pending Deposits', value: `${pendingDeposits.length}`, meta: `Amount: ${formatNumber(pendingDepositAmount || 0, 6)}` },
    { icon: '⬆️', label: 'Pending Withdrawal', value: `₹${formatNumber(overview.pendingWithdrawalAmount || 0, 2)}` }
  ]);

  const depositsList = document.getElementById('depositsList');
  depositsList.innerHTML = depositRows
    .map((row) => {
      const status = String(row.status || 'PENDING').trim().toUpperCase();
      const canReview = status === 'PENDING';
      const disabledClass = canReview ? '' : ' opacity-60';
      const disabledAttr = canReview ? '' : ' disabled';
      return `
      <article class="list-item">
        <div class="flex items-start justify-between gap-2">
          <div>
            <p class="text-sm font-semibold">${row.id}</p>
            <p class="text-xs text-slate-400">User: ${row.userId || '-'}</p>
            <p class="text-xs text-slate-500">${formatDate(row.createdAt)}</p>
          </div>
          ${statusBadge(status)}
        </div>
        <p class="mt-2 text-sm text-slate-200">${row.coin || 'USDT'} • ${formatNumber(row.amount || 0, 6)}</p>
        <p class="mt-1 text-xs text-slate-500">Type: ${row.type || 'ONCHAIN'} • Tx: ${row.txHash || row.txid || '-'}</p>
        <div class="mt-2 flex gap-2">
          <button class="btn-primary${disabledClass}" data-deposit-action="approve" data-deposit-id="${row.id}"${disabledAttr}>Approve</button>
          <button class="btn-danger${disabledClass}" data-deposit-action="reject" data-deposit-id="${row.id}"${disabledAttr}>Reject</button>
        </div>
      </article>
    `;
    })
    .join('');

  if (depositRows.length === 0) {
    depositsList.innerHTML = '<p class="text-sm text-slate-500">No deposits available.</p>';
  }

  const withdrawalsList = document.getElementById('withdrawalsList');
  withdrawalsList.innerHTML = withdrawalRows
    .map((row) => {
      const status = String(row.status || 'PENDING').trim().toUpperCase();
      const canReview = status === 'PENDING';
      const disabledClass = canReview ? '' : ' opacity-60';
      const disabledAttr = canReview ? '' : ' disabled';
      return `
      <article class="list-item">
        <div class="flex items-start justify-between gap-2">
          <div>
            <p class="text-sm font-semibold">${row.id}</p>
            <p class="text-xs text-slate-400">User: ${row.userId || '-'}</p>
            <p class="text-xs text-slate-500">${formatDate(row.createdAt)}</p>
          </div>
          ${statusBadge(status)}
        </div>
        <p class="mt-2 text-sm text-slate-200">${row.coin || 'USDT'} • ${formatNumber(row.amount || 0, 6)}</p>
        <p class="mt-1 text-xs text-slate-500">To: ${row.address || row.toAddress || row.to || '-'}</p>
        <div class="mt-2 flex gap-2">
          <button class="btn-primary${disabledClass}" data-withdrawal-action="approve" data-withdrawal-id="${row.id}"${disabledAttr}>Approve</button>
          <button class="btn-danger${disabledClass}" data-withdrawal-action="reject" data-withdrawal-id="${row.id}"${disabledAttr}>Reject</button>
        </div>
      </article>
    `;
    })
    .join('');

  if (withdrawalRows.length === 0) {
    withdrawalsList.innerHTML = '<p class="text-sm text-slate-500">No withdrawals available.</p>';
  }

  const hotWalletList = document.getElementById('hotWalletList');
  const wallets = Array.isArray(hotBalances.hotWallets) ? hotBalances.hotWallets : [];
  hotWalletList.innerHTML = wallets
    .map(
      (wallet) => `
      <div class="list-item">
        <p class="text-sm font-semibold">${wallet.coin}</p>
        <p class="text-xs text-slate-400">Network: ${wallet.network || '-'}</p>
        <p class="mt-1 text-sm">Balance: ${formatNumber(wallet.balance || 0, 8)}</p>
      </div>
    `
    )
    .join('');

  if (wallets.length === 0) {
    hotWalletList.innerHTML = '<p class="text-sm text-slate-500">No hot wallets configured.</p>';
  }

  const coinConfigForm = document.getElementById('coinConfigForm');
  const usdtConfig = usdtConfigPayload?.config || {};
  const depositAddresses = usdtConfig.depositAddresses || {};
  const confirmations = usdtConfig.minDepositConfirmations || {};
  if (coinConfigForm) {
    coinConfigForm.coin.value = usdtConfig.coin || 'USDT';
    coinConfigForm.defaultNetwork.value = usdtConfig.defaultNetwork || 'TRC20';
    coinConfigForm.networkFee.value = usdtConfig.networkFee ?? 1;
    coinConfigForm.minWithdrawal.value = usdtConfig.minWithdrawal ?? 10;
    coinConfigForm.maxWithdrawal.value = usdtConfig.maxWithdrawal ?? 100000;
    coinConfigForm.withdrawalsEnabled.checked = Boolean(usdtConfig.withdrawalsEnabled !== false);
    coinConfigForm.depositsEnabled.checked = Boolean(usdtConfig.depositsEnabled !== false);
    coinConfigForm.trc20Address.value = String(depositAddresses.TRC20 || '');
    coinConfigForm.erc20Address.value = String(depositAddresses.ERC20 || '');
    coinConfigForm.bep20Address.value = String(depositAddresses.BEP20 || '');
    coinConfigForm.trc20Confirmations.value = Number(confirmations.TRC20 || 20);
    coinConfigForm.erc20Confirmations.value = Number(confirmations.ERC20 || 12);
    coinConfigForm.bep20Confirmations.value = Number(confirmations.BEP20 || 15);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Spot
// ─────────────────────────────────────────────────────────────────────────────

async function loadSpot() {
  const payload = await apiRequest('/spot/pairs');
  state.spotPairs = Array.isArray(payload.pairs) ? payload.pairs : [];

  const body = document.getElementById('spotPairsTableBody');
  body.innerHTML = state.spotPairs
    .map(
      (pair) => `
      <tr>
        <td class="admin-td">${pair.symbol}</td>
        <td class="admin-td">${pair.enabled ? statusBadge('ENABLED') : statusBadge('DISABLED')}</td>
        <td class="admin-td">
          <input class="input-dark" type="number" step="0.0001" data-spot-field="makerFee" data-symbol="${pair.symbol}" value="${pair.makerFee}" />
        </td>
        <td class="admin-td">
          <input class="input-dark" type="number" step="0.0001" data-spot-field="takerFee" data-symbol="${pair.symbol}" value="${pair.takerFee}" />
        </td>
        <td class="admin-td">
          <input class="input-dark" type="number" step="1" data-spot-field="pricePrecision" data-symbol="${pair.symbol}" value="${pair.pricePrecision}" />
        </td>
        <td class="admin-td">
          <div class="flex flex-wrap gap-1">
            <button class="btn-secondary" data-spot-action="toggle" data-symbol="${pair.symbol}" data-enabled="${pair.enabled ? '1' : '0'}">${pair.enabled ? 'Disable' : 'Enable'}</button>
            <button class="btn-primary" data-spot-action="save" data-symbol="${pair.symbol}">Save</button>
          </div>
        </td>
      </tr>
    `
    )
    .join('');

  if (state.spotPairs.length === 0) {
    body.innerHTML = '<tr><td class="admin-td text-slate-500" colspan="6">No spot pairs configured.</td></tr>';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// P2P
// ─────────────────────────────────────────────────────────────────────────────

async function loadP2P() {
  const [adsPayload, disputesPayload, settingsPayload] = await Promise.all([
    apiRequest('/p2p/ads?limit=30'),
    apiRequest('/p2p/disputes?limit=20'),
    apiRequest('/p2p/settings')
  ]);

  const adsList = document.getElementById('p2pAdsList');
  const ads = Array.isArray(adsPayload.ads) ? adsPayload.ads : [];
  adsList.innerHTML = ads
    .map(
      (ad) => `
      <article class="list-item">
        <div class="flex items-start justify-between gap-2">
          <div>
            <p class="text-sm font-semibold">${ad.advertiser} • ${ad.asset}</p>
            <p class="text-xs text-slate-400">${ad.id} • ${ad.side.toUpperCase()} • Price ₹${formatNumber(ad.price, 2)}</p>
          </div>
          ${statusBadge(ad.moderationStatus || 'PENDING')}
        </div>
        <p class="mt-2 text-xs text-slate-500">Limits: ₹${formatNumber(ad.minLimit, 2)} - ₹${formatNumber(ad.maxLimit, 2)}</p>
        <div class="mt-2 flex flex-wrap gap-2">
          <button class="btn-primary" data-p2p-action="approve-ad" data-offer-id="${ad.id}">Approve</button>
          <button class="btn-secondary" data-p2p-action="suspend-ad" data-offer-id="${ad.id}">Suspend</button>
          <button class="btn-danger" data-p2p-action="reject-ad" data-offer-id="${ad.id}">Reject</button>
        </div>
      </article>
    `
    )
    .join('');

  if (ads.length === 0) {
    adsList.innerHTML = '<p class="text-sm text-slate-500">No P2P ads found.</p>';
  }

  const disputesList = document.getElementById('p2pDisputesList');
  const disputes = Array.isArray(disputesPayload.disputes) ? disputesPayload.disputes : [];
  disputesList.innerHTML = disputes
    .map(
      (order) => `
      <article class="list-item">
        <p class="text-sm font-semibold">${order.reference}</p>
        <p class="text-xs text-slate-400">${order.id} • ${order.asset} • ₹${formatNumber(order.amountInr || 0, 2)}</p>
        <div class="mt-2 flex gap-2">
          <button class="btn-primary" data-p2p-action="release-order" data-order-id="${order.id}">Release Escrow</button>
          <button class="btn-danger" data-p2p-action="freeze-order" data-order-id="${order.id}">Freeze Escrow</button>
        </div>
      </article>
    `
    )
    .join('');

  if (disputes.length === 0) {
    disputesList.innerHTML = '<p class="text-sm text-slate-500">No active disputes.</p>';
  }

  const settings = settingsPayload.settings || {};
  const form = document.getElementById('p2pSettingsForm');
  form.p2pFeePercent.value = settings.p2pFeePercent ?? 0;
  form.minOrderLimit.value = settings.minOrderLimit ?? 0;
  form.maxOrderLimit.value = settings.maxOrderLimit ?? 0;
  form.autoExpiryMinutes.value = settings.autoExpiryMinutes ?? 15;
}

// ─────────────────────────────────────────────────────────────────────────────
// Support Tickets — Full Chat Interface
// ─────────────────────────────────────────────────────────────────────────────

async function loadSupport() {
  const statusFilter = document.getElementById('supportStatusFilter')?.value || '';
  const query = new URLSearchParams({ limit: '50' });
  if (statusFilter) query.set('status', statusFilter);

  let payload;
  try {
    payload = await apiRequest(`/support/tickets?${query.toString()}`);
  } catch (e) {
    document.getElementById('supportTicketsList').innerHTML =
      `<div style="padding:24px;color:var(--red);font-size:13px;text-align:center;">⚠️ Failed to load: ${e.message}</div>`;
    return;
  }

  const tickets = Array.isArray(payload.tickets) ? payload.tickets : [];
  const list = document.getElementById('supportTicketsList');

  // Update sidebar badge
  const openCount = tickets.filter(t => (t.status || '').toUpperCase() !== 'CLOSED').length;
  const badge = document.getElementById('supportBadge');
  if (badge) { badge.style.display = openCount > 0 ? '' : 'none'; badge.textContent = openCount; }
  const countEl = document.getElementById('supportOpenCount');
  if (countEl) countEl.textContent = openCount > 0 ? `${openCount} open` : '';

  if (tickets.length === 0) {
    list.innerHTML = `<div style="padding:48px 16px;text-align:center;color:var(--text-2);">
      <div style="font-size:40px;margin-bottom:10px;">🎉</div>
      <p style="font-size:13px;font-weight:600;margin:0 0 4px;">All clear!</p>
      <p style="font-size:11px;opacity:.6;margin:0;">No support tickets found</p>
    </div>`;
    return;
  }

  list.innerHTML = tickets.map((ticket) => {
    const messages = Array.isArray(ticket.messages) ? ticket.messages : [];
    const lastMsg = messages[messages.length - 1];
    const isActive = ticket.id === state.support.activeTicketId;
    const statusStr = (ticket.status || '').toUpperCase();
    const unread = statusStr === 'OPEN';
    const priorityColor = ticket.priority === 'HIGH' ? 'var(--red)' : ticket.priority === 'MEDIUM' ? 'var(--accent)' : 'var(--text-2)';

    // User label: use email if available, otherwise make userId readable
    const userId = ticket.userId || '';
    const userLabel = ticket.email || ticket.userEmail ||
      (userId ? userId.replace('usr_', '').slice(0,16) : 'Unknown User');

    // Last message preview
    const lastSenderIsAdmin = lastMsg && lastMsg.sender !== 'user';
    const preview = lastMsg
      ? `${lastSenderIsAdmin ? '🛡 You: ' : '👤 '}${String(lastMsg.text || '').slice(0, 48)}${lastMsg.text?.length > 48 ? '…' : ''}`
      : 'No messages yet…';

    // User avatar (first letter of userId or email)
    const avatarChar = (userLabel[0] || '?').toUpperCase();
    const avatarColors = ['#f0b90b','#02c076','#4263eb','#f6465d','#a855f7'];
    const avatarColor = avatarColors[avatarChar.charCodeAt(0) % avatarColors.length];

    return `<div class="support-ticket-item${isActive ? ' active' : ''}"
         data-support-ticket-id="${ticket.id}"
         style="cursor:pointer;display:flex;gap:10px;align-items:flex-start;">
      <!-- Avatar -->
      <div style="width:34px;height:34px;border-radius:50%;background:${avatarColor}20;border:2px solid ${avatarColor}40;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:${avatarColor};flex-shrink:0;margin-top:1px;">${avatarChar}</div>
      <!-- Content -->
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:4px;margin-bottom:2px;">
          <span style="font-size:13px;font-weight:700;color:var(--text-1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${userLabel}</span>
          <span style="font-size:10px;color:var(--text-2);flex-shrink:0;">${formatDate(ticket.updatedAt)}</span>
        </div>
        <p style="font-size:11px;color:var(--text-2);margin:0 0 3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${ticket.subject || 'No Subject'}</p>
        <p style="font-size:11px;color:var(--text-2);margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;opacity:.65;">${preview}</p>
        <div style="display:flex;align-items:center;gap:5px;margin-top:4px;">
          ${statusBadge(ticket.status || 'OPEN')}
          ${ticket.priority ? `<span style="font-size:10px;color:${priorityColor};font-weight:600;">${ticket.priority}</span>` : ''}
        </div>
      </div>
      ${unread ? '<span style="position:absolute;top:11px;right:10px;width:8px;height:8px;border-radius:50%;background:var(--accent);box-shadow:0 0 6px var(--accent);"></span>' : ''}
    </div>`;
  }).join('');
}

async function openTicket(ticketId) {
  state.support.activeTicketId = ticketId;

  // Highlight active ticket in list
  document.querySelectorAll('[data-support-ticket-id]').forEach((el) => {
    el.classList.toggle('active', el.getAttribute('data-support-ticket-id') === ticketId);
  });

  // Show chat, hide empty state
  const emptyEl = document.getElementById('supportChatEmpty');
  const activeEl = document.getElementById('supportChatActive');
  if (emptyEl) { emptyEl.style.display = 'none'; emptyEl.classList.add('hidden'); }
  if (activeEl) {
    activeEl.classList.remove('hidden');
    activeEl.style.removeProperty('display'); // let CSS class handle it
    activeEl.style.display = 'flex';          // force show as flex
  }

  // Show loading in messages area
  const chatMessages = document.getElementById('supportChatMessages');
  if (chatMessages) chatMessages.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-2);">
    <div class="spin" style="margin:auto;"></div><p style="margin-top:12px;font-size:13px;">Loading conversation…</p></div>`;

  await renderTicketChat(ticketId);

  // Poll every 10 seconds
  if (state.support.pollInterval) clearInterval(state.support.pollInterval);
  state.support.pollInterval = setInterval(async () => {
    if (state.support.activeTicketId === ticketId && state.currentView === 'support') {
      await renderTicketChat(ticketId, true);
    }
  }, 10000);
}

async function renderTicketChat(ticketId, silent = false) {
  try {
    const ticket = await apiRequest(`/support/tickets/${encodeURIComponent(ticketId)}`);

    // ─── Header ───
    const nameEl = document.getElementById('chatUserName');
    const subjectEl = document.getElementById('chatTicketSubject');
    const metaEl = document.getElementById('chatTicketMeta');
    const badgeEl = document.getElementById('chatTicketStatusBadge');

    if (nameEl) {
      // Try to get user email from ticket or fallback to userId
      const userLabel = ticket.email || ticket.userEmail || ticket.userId || 'Unknown User';
      nameEl.textContent = userLabel;
      nameEl.title = userLabel;
    }
    if (subjectEl) subjectEl.textContent = ticket.subject || 'No Subject';
    if (metaEl) metaEl.textContent = `ID: ${ticket.id} • Priority: ${ticket.priority || 'NORMAL'}`;
    if (badgeEl) badgeEl.innerHTML = statusBadge(ticket.status || 'OPEN');

    // ─── Messages ───
    const messages = Array.isArray(ticket.messages) ? ticket.messages : [];
    const chatMessages = document.getElementById('supportChatMessages');
    const wasAtBottom = !chatMessages || (chatMessages.scrollHeight - chatMessages.clientHeight - chatMessages.scrollTop < 60);

    if (chatMessages) {
      chatMessages.innerHTML = messages.length === 0
        ? `<div style="text-align:center;padding:48px 20px;color:var(--text-2);">
            <div style="font-size:36px;margin-bottom:10px;">💬</div>
            <p style="font-size:13px;font-weight:600;margin:0 0 4px;">No messages yet</p>
            <p style="font-size:12px;opacity:.6;margin:0;">Start the conversation with the user</p>
          </div>`
        : messages.map((msg) => {
            const isAdmin = msg.sender !== 'user';
            const senderName = isAdmin
              ? (msg.senderRole ? `${msg.sender || 'Admin'} (${msg.senderRole})` : (msg.sender || 'Admin'))
              : '👤 User';
            const text = String(msg.text || '').replace(/</g,'&lt;').replace(/>/g,'&gt;');
            return `<div style="display:flex;flex-direction:column;max-width:80%;
                    ${isAdmin ? 'align-self:flex-end;align-items:flex-end;' : 'align-self:flex-start;align-items:flex-start;'}">
              <div style="background:${isAdmin ? 'rgba(240,185,11,0.13)' : 'var(--bg-card2)'};
                           border:1px solid ${isAdmin ? 'rgba(240,185,11,0.3)' : 'var(--border)'};
                           border-radius:${isAdmin ? '14px 14px 2px 14px' : '14px 14px 14px 2px'};
                           padding:9px 14px;">
                <p style="font-size:11px;font-weight:700;margin:0 0 4px;color:${isAdmin ? 'var(--accent)' : 'var(--green)'};">${senderName}</p>
                <p style="font-size:13px;color:var(--text-1);margin:0;white-space:pre-wrap;line-height:1.55;">${text}</p>
              </div>
              <span style="font-size:10px;color:var(--text-2);margin-top:4px;opacity:.55;">${formatDate(msg.createdAt)}</span>
            </div>`;
          }).join('');

      if (wasAtBottom || !silent) chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // ─── Button states ───
    const isClosed = String(ticket.status || '').toUpperCase() === 'CLOSED';
    const closeBtn  = document.getElementById('chatCloseTicketBtn');
    const resolveBtn = document.getElementById('chatResolveBtn');
    const sendBtn   = document.getElementById('sendReplyBtn');
    const input     = document.getElementById('supportChatInput');
    const qbar      = document.getElementById('quickRepliesBar');

    if (closeBtn)   closeBtn.disabled   = isClosed;
    if (resolveBtn) resolveBtn.disabled = isClosed;
    if (sendBtn)    sendBtn.disabled    = isClosed;
    if (qbar)       qbar.style.opacity  = isClosed ? '0.4' : '1';
    if (input) {
      input.disabled = isClosed;
      input.placeholder = isClosed ? '🔒 Ticket is closed — cannot reply' : 'Type your reply… (Ctrl+Enter to send)';
    }

    if (silent) loadSupport();
  } catch (error) {
    if (!silent) {
      const chatMessages = document.getElementById('supportChatMessages');
      if (chatMessages) chatMessages.innerHTML = `<div style="color:var(--red);text-align:center;padding:40px;font-size:13px;">
        ❌ ${error.message || 'Failed to load conversation'}</div>`;
      showMessage(error.message || 'Failed to load ticket.', 'error');
    }
  }
}

function useQuickReply(text) {
  const input = document.getElementById('supportChatInput');
  if (!input || input.disabled) return;
  input.value = text;
  input.focus();
  input.setSelectionRange(text.length, text.length);
}

async function sendAdminReply() {
  const ticketId = state.support.activeTicketId;
  if (!ticketId) return;

  const input = document.getElementById('supportChatInput');
  const message = String(input?.value || '').trim();
  if (!message) { input?.focus(); return; }

  const sendBtn = document.getElementById('sendReplyBtn');
  setActionButtonLoading(sendBtn, true, 'Sending…');

  try {
    await apiRequest(`/support/tickets/${encodeURIComponent(ticketId)}/reply`, {
      method: 'POST',
      body: JSON.stringify({ message })
    });
    if (input) input.value = '';
    await renderTicketChat(ticketId);
    await loadSupport();
  } catch (error) {
    showMessage(error.message || 'Failed to send reply.', 'error');
  } finally {
    setActionButtonLoading(sendBtn, false);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Revenue
// ─────────────────────────────────────────────────────────────────────────────

async function loadRevenue() {
  const payload = await apiRequest('/revenue/summary');

  renderCards('revenueCards', [
    { icon: '📆', label: 'Total Revenue (Today)', value: `₹${formatNumber(payload.totalRevenue?.today || 0, 2)}` },
    { icon: '📊', label: 'Total Revenue (Week)', value: `₹${formatNumber(payload.totalRevenue?.week || 0, 2)}` },
    { icon: '💹', label: 'Total Revenue (Month)', value: `₹${formatNumber(payload.totalRevenue?.month || 0, 2)}` },
    { icon: '🔁', label: 'Spot Fee Earnings', value: `₹${formatNumber(payload.spotFeeEarnings || 0, 2)}` },
    { icon: '🤝', label: 'P2P Earnings', value: `₹${formatNumber(payload.p2pEarnings || 0, 2)}` },
    { icon: '⚡', label: 'Withdrawal Fee Earnings', value: `₹${formatNumber(payload.withdrawalFeeEarnings || 0, 2)}` }
  ]);

  const trend = Array.isArray(payload.trend) ? payload.trend : [];
  drawChart(
    'revenue',
    'revenueChart',
    trend.map((point) => point.date),
    trend.map((point) => Number(point.revenue || 0)),
    '#38bdf8'
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Risk Management
// ─────────────────────────────────────────────────────────────────────────────

async function loadRisk() {
  const [configPayload, blockedIpsPayload, suspiciousPayload] = await Promise.all([
    apiRequest('/risk/config').catch(() => ({ config: {} })),
    apiRequest('/risk/blocked-ips').catch(() => ({ blockedIPs: [] })),
    apiRequest('/risk/suspicious').catch(() => ({ alerts: [] }))
  ]);

  const config = configPayload.config || {};
  const form = document.getElementById('riskConfigForm');
  if (form) {
    form.maxLeverage.value = config.maxLeverage ?? '';
    form.maxWithdrawalAmount.value = config.maxWithdrawalAmount ?? '';
    form.minWithdrawalAmount.value = config.minWithdrawalAmount ?? '';
    form.amlRiskThreshold.value = config.amlRiskThreshold ?? 75;
  }

  const blockedIps = Array.isArray(blockedIpsPayload.blockedIPs) ? blockedIpsPayload.blockedIPs : [];
  const blockedList = document.getElementById('blockedIpsList');
  if (blockedList) {
    blockedList.innerHTML = blockedIps.length === 0
      ? '<p class="text-sm text-slate-500">No blocked IPs.</p>'
      : blockedIps.map((item) => `
        <div class="list-item flex items-center justify-between gap-2">
          <div>
            <p class="text-sm font-semibold font-mono">${item.ip || item.ipAddress || '-'}</p>
            <p class="text-xs text-slate-400">${item.reason || '-'}</p>
            <p class="text-xs text-slate-500">${formatDate(item.blockedAt || item.createdAt)}</p>
          </div>
          <button class="btn-danger !py-1 !text-xs flex-shrink-0" data-risk-action="unblock" data-block-id="${item.id || item._id}">Unblock</button>
        </div>
      `).join('');
  }

  const alerts = Array.isArray(suspiciousPayload.alerts) ? suspiciousPayload.alerts : [];
  const alertsList = document.getElementById('suspiciousAlertsList');
  if (alertsList) {
    alertsList.innerHTML = alerts.length === 0
      ? '<p class="text-sm text-slate-500">No suspicious activity alerts.</p>'
      : alerts.map((alert) => `
        <div class="list-item">
          <div class="flex items-start justify-between gap-2">
            <p class="text-sm font-semibold">${alert.type || 'Alert'}</p>
            ${statusBadge(alert.severity || 'MEDIUM')}
          </div>
          <p class="text-xs text-slate-400">User: ${alert.userId || '-'}</p>
          <p class="text-xs text-slate-500">${alert.reason || '-'}</p>
          <p class="text-xs text-slate-600">${formatDate(alert.createdAt)}</p>
        </div>
      `).join('');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Feature Flags
// ─────────────────────────────────────────────────────────────────────────────

async function loadFeatures() {
  const [flagsPayload, networkPayload] = await Promise.all([
    apiRequest('/features').catch(() => ({ flags: [] })),
    apiRequest('/features/network-status').catch(() => ({ networks: {} }))
  ]);

  const flags = Array.isArray(flagsPayload.flags) ? flagsPayload.flags : [];
  const togglesList = document.getElementById('featureTogglesList');
  if (togglesList) {
    if (flags.length === 0) {
      togglesList.innerHTML = '<p class="text-sm text-slate-500">No feature flags configured.</p>';
    } else {
      togglesList.innerHTML = flags.map((flag) => `
        <div class="flex items-center justify-between gap-3 rounded-xl border border-slate-800 px-4 py-3">
          <div>
            <p class="text-sm font-semibold">${flag.name || flag.key}</p>
            <p class="text-xs text-slate-400">${flag.description || flag.key}</p>
          </div>
          <label class="relative inline-flex cursor-pointer items-center">
            <input type="checkbox" class="sr-only peer" ${flag.enabled ? 'checked' : ''}
                   onchange="toggleFeature('${flag.key}', this.checked)" />
            <div class="peer h-6 w-11 rounded-full bg-slate-700 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-brand peer-checked:after:translate-x-full"></div>
          </label>
        </div>
      `).join('');
    }
  }

  const networks = networkPayload.networks || {};
  const networkList = document.getElementById('networkStatusList');
  if (networkList) {
    const networkKeys = ['TRC20', 'ERC20', 'BEP20'];
    if (Object.keys(networks).length === 0 && !networkKeys.some((k) => networks[k])) {
      networkList.innerHTML = '<p class="text-sm text-slate-500">No network status data.</p>';
    } else {
      networkList.innerHTML = networkKeys.map((network) => {
        const net = networks[network] || {};
        return `
        <div class="rounded-xl border border-slate-800 px-4 py-3">
          <p class="text-sm font-semibold mb-2">${network}</p>
          <div class="flex gap-6">
            <label class="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input type="checkbox" ${net.depositEnabled !== false ? 'checked' : ''}
                     onchange="setNetworkDeposit('${network}', this.checked)" class="h-4 w-4" />
              Deposits
            </label>
            <label class="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input type="checkbox" ${net.withdrawalEnabled !== false ? 'checked' : ''}
                     onchange="setNetworkWithdrawal('${network}', this.checked)" class="h-4 w-4" />
              Withdrawals
            </label>
          </div>
        </div>
      `;
      }).join('');
    }
  }
}

async function toggleFeature(key, enabled) {
  try {
    await apiRequest(`/features/${encodeURIComponent(key)}`, {
      method: 'PUT',
      body: JSON.stringify({ enabled })
    });
    showMessage(`Feature '${key}' ${enabled ? 'enabled' : 'disabled'}.`, 'success');
  } catch (error) {
    showMessage(error.message || 'Failed to update feature flag.', 'error');
    await loadFeatures();
  }
}

async function setNetworkDeposit(network, enabled) {
  try {
    await apiRequest(`/features/network/${encodeURIComponent(network)}/deposit`, {
      method: 'PUT',
      body: JSON.stringify({ enabled })
    });
    showMessage(`${network} deposits ${enabled ? 'enabled' : 'disabled'}.`, 'success');
  } catch (error) {
    showMessage(error.message || 'Failed to update network deposit.', 'error');
  }
}

async function setNetworkWithdrawal(network, enabled) {
  try {
    await apiRequest(`/features/network/${encodeURIComponent(network)}/withdrawal`, {
      method: 'PUT',
      body: JSON.stringify({ enabled })
    });
    showMessage(`${network} withdrawals ${enabled ? 'enabled' : 'disabled'}.`, 'success');
  } catch (error) {
    showMessage(error.message || 'Failed to update network withdrawal.', 'error');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Notifications
// ─────────────────────────────────────────────────────────────────────────────

async function loadNotifications() {
  const payload = await apiRequest('/notifications?limit=20').catch(() => ({ notifications: [] }));
  const notifs = Array.isArray(payload.notifications) ? payload.notifications : [];
  const list = document.getElementById('notificationsList');
  if (list) {
    list.innerHTML = notifs.length === 0
      ? '<p class="text-sm text-slate-500">No notifications yet.</p>'
      : notifs.map((n) => `
        <div class="list-item">
          <div class="flex items-start justify-between gap-2">
            <p class="text-sm font-semibold">${n.title || 'Notification'}</p>
            ${statusBadge(n.priority || 'NORMAL')}
          </div>
          <p class="text-xs text-slate-400 mt-1 line-clamp-2">${n.message || '-'}</p>
          <p class="text-xs text-slate-500 mt-1">${n.type || '-'} • ${formatDate(n.createdAt)}</p>
        </div>
      `).join('');
  }
}

async function broadcastNotification(title, message, priority, type) {
  await apiRequest('/notifications/broadcast', {
    method: 'POST',
    body: JSON.stringify({ title, message, priority, type })
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Blockchain
// ─────────────────────────────────────────────────────────────────────────────

async function loadBlockchain() {
  const [statsPayload, scannerPayload, queuePayload, txPayload] = await Promise.all([
    apiRequest('/blockchain/stats').catch(() => ({ stats: {} })),
    apiRequest('/blockchain/scanner-status').catch(() => ({ scanners: [] })),
    apiRequest('/blockchain/withdrawal-queue').catch(() => ({ queue: [] })),
    apiRequest('/blockchain/transactions?limit=20').catch(() => ({ transactions: [] }))
  ]);

  const scanners = Array.isArray(scannerPayload.scanners) ? scannerPayload.scanners
    : (scannerPayload.scanners ? Object.entries(scannerPayload.scanners).map(([k, v]) => ({ network: k, ...v })) : []);
  const cards = document.getElementById('blockchainScannerCards');
  if (cards) {
    if (scanners.length === 0) {
      cards.innerHTML = '<p class="text-sm text-slate-500 col-span-3">No scanner status data.</p>';
    } else {
      cards.innerHTML = scanners.map((s) => `
        <div class="stat-card">
          <div class="stat-icon">⛓️</div>
          <div class="stat-info">
            <div class="stat-label">${s.network || 'Scanner'}</div>
            <div class="stat-value" style="font-size:13px;">${statusBadge(s.status || s.connected ? 'CONNECTED' : 'ERROR')}</div>
            <div class="stat-meta">Block: ${s.latestBlock || s.blockHeight || '-'}</div>
          </div>
        </div>
      `).join('');
    }
  }

  const queue = Array.isArray(queuePayload.queue) ? queuePayload.queue : [];
  const queueBody = document.getElementById('withdrawalQueueBody');
  if (queueBody) {
    queueBody.innerHTML = queue.length === 0
      ? '<tr><td class="admin-td text-slate-500" colspan="5">Queue is empty.</td></tr>'
      : queue.map((item) => `
        <tr>
          <td class="admin-td font-mono text-xs">${String(item.id || '-').slice(0, 16)}</td>
          <td class="admin-td">${formatNumber(item.amount || 0, 6)} ${item.coin || 'USDT'}</td>
          <td class="admin-td">${item.network || '-'}</td>
          <td class="admin-td">${statusBadge(item.status || 'PENDING')}</td>
          <td class="admin-td">
            <button class="btn-secondary !py-1 !text-xs" data-blockchain-action="prioritize" data-id="${item.id}">Prioritize</button>
          </td>
        </tr>
      `).join('');
  }

  const txs = Array.isArray(txPayload.transactions) ? txPayload.transactions : [];
  const txBody = document.getElementById('blockchainTxBody');
  if (txBody) {
    txBody.innerHTML = txs.length === 0
      ? '<tr><td class="admin-td text-slate-500" colspan="5">No transactions.</td></tr>'
      : txs.map((tx) => `
        <tr>
          <td class="admin-td font-mono text-xs">${String(tx.txHash || tx.id || '-').slice(0, 16)}...</td>
          <td class="admin-td">${formatNumber(tx.amount || 0, 6)}</td>
          <td class="admin-td">${tx.network || '-'}</td>
          <td class="admin-td">${statusBadge(tx.status || 'PENDING')}</td>
          <td class="admin-td">
            ${String(tx.status || '').toUpperCase() === 'FAILED'
              ? `<button class="btn-secondary !py-1 !text-xs" data-blockchain-action="retry" data-id="${tx.id || tx.txHash}">Retry</button>`
              : '-'}
          </td>
        </tr>
      `).join('');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Compliance
// ─────────────────────────────────────────────────────────────────────────────

async function loadCompliance() {
  const payload = await apiRequest('/compliance/flags?limit=40');
  const flags = Array.isArray(payload.flags) ? payload.flags : [];
  const list = document.getElementById('complianceFlagsList');
  list.innerHTML = flags
    .map(
      (flag) => `
      <article class="list-item">
        <div class="flex items-start justify-between gap-2">
          <div>
            <p class="text-sm font-semibold">${flag.id}</p>
            <p class="text-xs text-slate-400">User: ${flag.userId || '-'} • ${flag.type}</p>
          </div>
          ${statusBadge(flag.severity)}
        </div>
        <p class="mt-2 text-sm text-slate-200">${flag.reason || '-'}</p>
        <p class="mt-1 text-xs text-slate-500">Created: ${formatDate(flag.createdAt)}</p>
      </article>
    `
    )
    .join('');

  if (flags.length === 0) {
    list.innerHTML = '<p class="text-sm text-slate-500">No compliance flags yet.</p>';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Settings
// ─────────────────────────────────────────────────────────────────────────────

async function loadSettings() {
  const payload = await apiRequest('/settings/platform');
  const settings = payload.settings || {};
  const form = document.getElementById('platformSettingsForm');
  form.siteName.value = settings.siteName || '';
  form.logoUrl.value = settings.logoUrl || '';
  form.announcementBanner.value = settings.announcementBanner || '';
  form.referralCommissionPercent.value = settings.referralCommissionPercent ?? 0;
  form.signupBonusUsdt.value = settings.signupBonusUsdt ?? 0;
  form.smtpHost.value = settings.smtpHost || '';
  form.smtpPort.value = settings.smtpPort ?? 587;
  form.smtpUser.value = settings.smtpUser || '';
  form.smtpSecure.checked = Boolean(settings.smtpSecure);
  form.makerFee.value = settings.globalTradingFees?.maker ?? 0.001;
  form.takerFee.value = settings.globalTradingFees?.taker ?? 0.001;
  form.maintenanceMode.checked = Boolean(settings.maintenanceMode);
  form.requireKycBeforeWithdrawal.checked = Boolean(settings.compliance?.requireKycBeforeWithdrawal);
  form.spotEnabled.checked = Boolean(settings.features?.spotEnabled);
  form.p2pEnabled.checked = Boolean(settings.features?.p2pEnabled);
  form.walletEnabled.checked = Boolean(settings.features?.walletEnabled);
  form.referralsEnabled.checked = Boolean(settings.features?.referralsEnabled);
  form.supportEnabled.checked = Boolean(settings.features?.supportEnabled);
}

// ─────────────────────────────────────────────────────────────────────────────
// Monitoring
// ─────────────────────────────────────────────────────────────────────────────

async function loadMonitoring() {
  const [overview, apiLogs] = await Promise.all([
    apiRequest('/monitoring/overview'),
    apiRequest('/monitoring/api-logs?limit=30')
  ]);

  renderCards('monitoringCards', [
    { icon: '👥', label: 'Active Users', value: Number(overview.activeUsers || 0) },
    { icon: '🛡️', label: 'Active Admins', value: Number(overview.activeAdmins || 0) },
    { icon: '⚠️', label: 'Failed Logins (10m)', value: Number(overview.failedLoginAttemptsLast10Min || 0) },
    { icon: '🌐', label: 'API Requests (10m)', value: Number(overview.apiRequestsLast10Min || 0), meta: `DB: ${overview.dbConnected ? 'Connected' : 'Disconnected'}` }
  ]);

  const body = document.getElementById('monitoringApiLogsBody');
  const rows = Array.isArray(apiLogs.logs) ? apiLogs.logs : [];
  body.innerHTML = rows
    .map(
      (row) => `
      <tr>
        <td class="admin-td">${formatDate(row.createdAt)}</td>
        <td class="admin-td">${row.module || '-'}</td>
        <td class="admin-td">${row.action || '-'}</td>
        <td class="admin-td">${row.method || '-'}</td>
        <td class="admin-td">${statusBadge(row.statusCode && row.statusCode < 400 ? 'SUCCESS' : 'FAILURE')}</td>
        <td class="admin-td">${row.durationMs || 0} ms</td>
      </tr>
    `
    )
    .join('');

  if (rows.length === 0) {
    body.innerHTML = '<tr><td class="admin-td text-slate-500" colspan="6">No API logs available.</td></tr>';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Audit Logs
// ─────────────────────────────────────────────────────────────────────────────

async function loadAudit() {
  const payload = await apiRequest('/audit/logs?limit=40');
  const rows = Array.isArray(payload.logs) ? payload.logs : [];
  const body = document.getElementById('auditLogsBody');
  body.innerHTML = rows
    .map(
      (row) => `
      <tr>
        <td class="admin-td">${formatDate(row.createdAt)}</td>
        <td class="admin-td">${row.adminEmail || row.adminId || '-'}</td>
        <td class="admin-td">${row.module || '-'}</td>
        <td class="admin-td">${row.action || '-'}</td>
        <td class="admin-td">${statusBadge(row.status || 'SUCCESS')}</td>
        <td class="admin-td">${row.reason || '-'}</td>
      </tr>
    `
    )
    .join('');

  if (rows.length === 0) {
    body.innerHTML = '<tr><td class="admin-td text-slate-500" colspan="6">No audit logs available.</td></tr>';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin Users
// ─────────────────────────────────────────────────────────────────────────────

async function loadAdminUsers() {
  const payload = await apiRequest('/admins').catch(() => ({ admins: [] }));
  const admins = Array.isArray(payload.admins) ? payload.admins : [];
  const body = document.getElementById('adminUsersTableBody');
  if (!body) {
    return;
  }

  body.innerHTML = admins
    .map(
      (admin) => `
      <tr>
        <td class="admin-td">${admin.email}</td>
        <td class="admin-td">${admin.username || '-'}</td>
        <td class="admin-td">${statusBadge(admin.role)}</td>
        <td class="admin-td">${statusBadge(admin.status || 'ACTIVE')}</td>
        <td class="admin-td">${formatDate(admin.lastLoginAt || admin.updatedAt)}</td>
        <td class="admin-td">
          <div class="flex gap-1">
            <button class="btn-secondary !py-1 !text-xs" data-admin-action="disable" data-admin-id="${admin.id}">
              ${String(admin.status || '').toUpperCase() === 'DISABLED' ? 'Enable' : 'Disable'}
            </button>
          </div>
        </td>
      </tr>
    `
    )
    .join('');

  if (admins.length === 0) {
    body.innerHTML = '<tr><td class="admin-td text-slate-500" colspan="6">No admin accounts found.</td></tr>';
  }
}

async function createAdmin(email, username, password, role) {
  return apiRequest('/admins', {
    method: 'POST',
    body: JSON.stringify({ email, username, password, role })
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Event Handlers
// ─────────────────────────────────────────────────────────────────────────────

async function handleUsersAction(event) {
  // Row click — open profile drawer
  const row = event.target.closest('tr.user-row');
  const button = event.target.closest('[data-user-action]');

  // If clicked on a button, handle that; otherwise open profile from row click
  if (!button) {
    if (row) {
      const profileId = row.getAttribute('data-profile-id');
      if (profileId) openUserProfile(profileId);
    }
    return;
  }

  const userId = button.getAttribute('data-user-id');
  const action = button.getAttribute('data-user-action');

  // Profile button
  if (action === 'profile') {
    openUserProfile(userId);
    return;
  }

  try {
    if (action === 'freeze' || action === 'unfreeze' || action === 'ban') {
      const status = action === 'freeze' ? 'FROZEN' : action === 'ban' ? 'BANNED' : 'ACTIVE';
      const reason = window.prompt(`Reason for ${status} (optional):`, '') || '';
      await apiRequest(`/users/${encodeURIComponent(userId)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, reason })
      });
      showMessage(`User ${status.toLowerCase()} successfully.`, 'success');
      await loadUsers();
      return;
    }

    if (action === 'adjust') {
      const amount = window.prompt('Enter adjustment amount (e.g. 100 or -50):', '0');
      const reason = window.prompt('Reason for adjustment:', 'manual correction');
      if (!amount || !reason) {
        return;
      }
      await apiRequest(`/users/${encodeURIComponent(userId)}/adjust-balance`, {
        method: 'POST',
        body: JSON.stringify({ amount: Number(amount), reason, coin: 'USDT' })
      });
      showMessage('Balance adjusted successfully.', 'success');
      await loadUsers();
      return;
    }

    if (action === 'reset') {
      const newPassword = window.prompt('Enter new password (min 8 chars):');
      if (!newPassword) {
        return;
      }
      await apiRequest(`/users/${encodeURIComponent(userId)}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ newPassword })
      });
      showMessage('Password reset complete.', 'success');
      return;
    }

    if (action === 'kyc') {
      const payload = await apiRequest(`/users/${encodeURIComponent(userId)}/kyc`);
      const decision = window.prompt(`Current KYC: ${payload.kycStatus}. Enter decision (APPROVED/REJECTED/PENDING):`, payload.kycStatus || 'PENDING');
      if (!decision) {
        return;
      }
      const remarks = window.prompt('Remarks:', payload.remarks || '') || '';
      await reviewKyc(userId, decision, remarks);
      showMessage('KYC review saved.', 'success');
      await loadUsers();
    }

    if (action === 'view-docs') {
      await viewKycDocuments(userId);
    }
  } catch (error) {
    showMessage(error.message || 'User action failed.', 'error');
  }
}

async function handleKycAction(event) {
  const button = event.target.closest('[data-kyc-action]');
  if (!button) {
    return;
  }

  const action = button.getAttribute('data-kyc-action');
  const userId = button.getAttribute('data-user-id');

  try {
    if (action === 'view-docs') {
      await viewKycDocuments(userId);
      return;
    }

    if (action === 'approve') {
      const remarks = window.prompt('Approval remarks (optional):', '') || '';
      await reviewKyc(userId, 'APPROVED', remarks);
      showMessage('KYC approved.', 'success');
      await loadKyc();
      return;
    }

    if (action === 'reject') {
      const reason = window.prompt('Rejection reason:', '') || '';
      if (!reason) {
        return;
      }
      await reviewKyc(userId, 'REJECTED', reason);
      showMessage('KYC rejected.', 'success');
      await loadKyc();
    }
  } catch (error) {
    showMessage(error.message || 'KYC action failed.', 'error');
  }
}

async function handleKycDocAction(event) {
  const button = event.target.closest('[data-kyc-doc-action]');
  if (!button) {
    return;
  }

  const action = button.getAttribute('data-kyc-doc-action');
  const userId = button.getAttribute('data-user-id');

  try {
    if (action === 'approve') {
      const remarks = window.prompt('Approval remarks (optional):', '') || '';
      await reviewKyc(userId, 'APPROVED', remarks);
      showMessage('KYC approved.', 'success');
      document.getElementById('kycDocModal').classList.add('hidden');
      document.getElementById('kycDocModal').classList.remove('flex');
      if (state.currentView === 'kyc') {
        await loadKyc();
      }
    } else if (action === 'reject') {
      const reason = window.prompt('Rejection reason:', '');
      if (!reason) {
        return;
      }
      await reviewKyc(userId, 'REJECTED', reason);
      showMessage('KYC rejected.', 'success');
      document.getElementById('kycDocModal').classList.add('hidden');
      document.getElementById('kycDocModal').classList.remove('flex');
      if (state.currentView === 'kyc') {
        await loadKyc();
      }
    }
  } catch (error) {
    showMessage(error.message || 'KYC action failed.', 'error');
  }
}

async function handleWithdrawalAction(event) {
  const button = event.target.closest('[data-withdrawal-action]');
  if (!button || button.disabled) {
    return;
  }
  const action = button.getAttribute('data-withdrawal-action');
  const withdrawalId = button.getAttribute('data-withdrawal-id');
  const decision = action === 'approve' ? 'APPROVED' : 'REJECTED';
  const reason =
    window.prompt(`Reason for ${decision}:`, decision === 'APPROVED' ? 'manual review approved' : 'manual review rejected') || '';

  try {
    setActionButtonLoading(button, true, decision === 'APPROVED' ? 'Approving...' : 'Rejecting...');
    await apiRequest(`/wallet/withdrawals/${encodeURIComponent(withdrawalId)}/review`, {
      method: 'POST',
      body: JSON.stringify({ decision, reason })
    });
    showMessage(`Withdrawal ${decision.toLowerCase()} successfully.`, 'success');
    await loadWallet();
  } catch (error) {
    showMessage(error.message || 'Withdrawal action failed.', 'error');
  } finally {
    setActionButtonLoading(button, false);
  }
}

async function handleDepositAction(event) {
  const button = event.target.closest('[data-deposit-action]');
  if (!button || button.disabled) {
    return;
  }

  const action = button.getAttribute('data-deposit-action');
  const depositId = button.getAttribute('data-deposit-id');
  const decision = action === 'approve' ? 'APPROVED' : 'REJECTED';
  const reason =
    window.prompt(`Reason for ${decision}:`, decision === 'APPROVED' ? 'manual review approved' : 'deposit review rejected') || '';

  try {
    setActionButtonLoading(button, true, decision === 'APPROVED' ? 'Approving...' : 'Rejecting...');
    await apiRequest(`/wallet/deposits/${encodeURIComponent(depositId)}/review`, {
      method: 'POST',
      body: JSON.stringify({ decision, reason })
    });
    showMessage(`Deposit ${decision.toLowerCase()} successfully.`, 'success');
    await loadWallet();
  } catch (error) {
    showMessage(error.message || 'Deposit action failed.', 'error');
  } finally {
    setActionButtonLoading(button, false);
  }
}

async function handleSpotAction(event) {
  const button = event.target.closest('[data-spot-action]');
  if (!button) {
    return;
  }
  const action = button.getAttribute('data-spot-action');
  const symbol = button.getAttribute('data-symbol');

  try {
    if (action === 'toggle') {
      const enabled = button.getAttribute('data-enabled') === '1';
      setActionButtonLoading(button, true, enabled ? 'Disabling...' : 'Enabling...');
      await apiRequest(`/spot/pairs/${encodeURIComponent(symbol)}`, {
        method: 'PUT',
        body: JSON.stringify({ enabled: !enabled })
      });
      showMessage(`${symbol} ${enabled ? 'disabled' : 'enabled'} successfully.`, 'success');
      await loadSpot();
    } else if (action === 'save') {
      setActionButtonLoading(button, true, 'Saving...');
      const makerInput = document.querySelector(`[data-spot-field="makerFee"][data-symbol="${symbol}"]`);
      const takerInput = document.querySelector(`[data-spot-field="takerFee"][data-symbol="${symbol}"]`);
      const precisionInput = document.querySelector(`[data-spot-field="pricePrecision"][data-symbol="${symbol}"]`);
      await apiRequest(`/spot/pairs/${encodeURIComponent(symbol)}`, {
        method: 'PUT',
        body: JSON.stringify({
          makerFee: Number(makerInput?.value || 0),
          takerFee: Number(takerInput?.value || 0),
          pricePrecision: Number(precisionInput?.value || 0)
        })
      });
      showMessage(`${symbol} settings updated.`, 'success');
      await loadSpot();
    }
  } catch (error) {
    showMessage(error.message || 'Spot update failed.', 'error');
  } finally {
    setActionButtonLoading(button, false);
  }
}

async function handleP2PActions(event) {
  const button = event.target.closest('[data-p2p-action]');
  if (!button) {
    return;
  }

  const action = button.getAttribute('data-p2p-action');
  const offerId = button.getAttribute('data-offer-id');
  const orderId = button.getAttribute('data-order-id');

  try {
    if (action === 'approve-ad' || action === 'suspend-ad' || action === 'reject-ad') {
      const decisionMap = { 'approve-ad': 'APPROVED', 'suspend-ad': 'SUSPENDED', 'reject-ad': 'REJECTED' };
      const decision = decisionMap[action];
      const reason = window.prompt(`Reason for ${decision}:`, '') || '';
      await apiRequest(`/p2p/ads/${encodeURIComponent(offerId)}/review`, {
        method: 'POST',
        body: JSON.stringify({ decision, reason })
      });
      showMessage(`P2P ad ${decision.toLowerCase()} successfully.`, 'success');
      await loadP2P();
      return;
    }

    if (action === 'release-order') {
      await apiRequest(`/p2p/orders/${encodeURIComponent(orderId)}/release`, {
        method: 'POST',
        body: JSON.stringify({})
      });
      showMessage('Escrow released successfully.', 'success');
      await loadP2P();
      return;
    }

    if (action === 'freeze-order') {
      await apiRequest(`/p2p/orders/${encodeURIComponent(orderId)}/freeze`, {
        method: 'POST',
        body: JSON.stringify({})
      });
      showMessage('Escrow frozen successfully.', 'success');
      await loadP2P();
    }
  } catch (error) {
    showMessage(error.message || 'P2P action failed.', 'error');
  }
}

async function handleRiskActions(event) {
  const button = event.target.closest('[data-risk-action]');
  if (!button) {
    return;
  }
  const action = button.getAttribute('data-risk-action');
  const blockId = button.getAttribute('data-block-id');

  try {
    if (action === 'unblock') {
      await apiRequest(`/risk/block-ip/${encodeURIComponent(blockId)}`, { method: 'DELETE' });
      showMessage('IP unblocked successfully.', 'success');
      await loadRisk();
    }
  } catch (error) {
    showMessage(error.message || 'Risk action failed.', 'error');
  }
}

async function handleBlockchainActions(event) {
  const button = event.target.closest('[data-blockchain-action]');
  if (!button) {
    return;
  }
  const action = button.getAttribute('data-blockchain-action');
  const id = button.getAttribute('data-id');

  try {
    if (action === 'prioritize') {
      await apiRequest(`/blockchain/withdrawal-queue/${encodeURIComponent(id)}/prioritize`, { method: 'POST' });
      showMessage('Withdrawal prioritized.', 'success');
      await loadBlockchain();
    } else if (action === 'retry') {
      await apiRequest(`/blockchain/transactions/${encodeURIComponent(id)}/retry`, { method: 'POST' });
      showMessage('Transaction retry queued.', 'success');
      await loadBlockchain();
    }
  } catch (error) {
    showMessage(error.message || 'Blockchain action failed.', 'error');
  }
}

async function handleAdminUsersActions(event) {
  const button = event.target.closest('[data-admin-action]');
  if (!button) {
    return;
  }
  const action = button.getAttribute('data-admin-action');
  const adminId = button.getAttribute('data-admin-id');

  try {
    if (action === 'disable') {
      const currentLabel = button.textContent.trim();
      const newStatus = currentLabel === 'Disable' ? 'DISABLED' : 'ACTIVE';
      await apiRequest(`/admins/${encodeURIComponent(adminId)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
      showMessage(`Admin ${newStatus.toLowerCase()} successfully.`, 'success');
      await loadAdminUsers();
    }
  } catch (error) {
    showMessage(error.message || 'Admin action failed.', 'error');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// User Profile Drawer
// ─────────────────────────────────────────────────────────────────────────────

let _upUserId = null;

function _showPanel(tabId) {
  // Must toggle hidden class (not just style.display) because CSS has display:none !important
  const ALL_TABS = ['overview','balance','kyc','logins','devices','actions'];
  ALL_TABS.forEach(t => {
    const panel = document.getElementById(`upTab-${t}`);
    if (!panel) return;
    if (t === tabId) {
      panel.classList.remove('hidden');
      panel.style.removeProperty('display');
    } else {
      panel.classList.add('hidden');
    }
  });
}

function openUserProfile(userId) {
  _upUserId = userId;

  // Set loading state in header
  const emailEl = document.getElementById('upEmail');
  const uidEl   = document.getElementById('upUserId');
  const badgeEl = document.getElementById('upStatusBadge');
  if (emailEl) emailEl.textContent = 'Loading…';
  if (uidEl)   uidEl.textContent   = userId;
  if (badgeEl) badgeEl.innerHTML   = '';

  // Pre-fill email from already-loaded user list (instant display)
  const knownUser = Array.isArray(state.users) ? state.users.find(u => u.userId === userId) : null;
  if (knownUser?.email && emailEl) emailEl.textContent = knownUser.email;

  // Reset all tab content to loading spinner
  ['upOverviewContent','upBalanceContent','upKycContent','upLoginsContent','upDevicesContent'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-2);">
      <div class="spin" style="margin:auto;"></div></div>`;
  });

  // Show overlay (only left of drawer) and slide drawer in
  const overlay = document.getElementById('userProfileOverlay');
  const drawer  = document.getElementById('userProfileDrawer');
  if (overlay) {
    const drawerW = Math.min(560, window.innerWidth);
    overlay.style.right = drawerW + 'px'; // don't cover the drawer
    overlay.style.display = 'block';
    overlay.classList.remove('hidden');
  }
  if (drawer)  { drawer.style.right = '0'; }

  // Show overview tab by default
  document.querySelectorAll('.up-tab').forEach(b =>
    b.classList.toggle('active', b.getAttribute('data-up-tab') === 'overview')
  );
  _showPanel('overview');
  loadUpTab('overview');
}

function closeUserProfile() {
  const overlay = document.getElementById('userProfileOverlay');
  const drawer  = document.getElementById('userProfileDrawer');
  if (overlay) { overlay.style.display = 'none'; overlay.classList.add('hidden'); }
  if (drawer)  { drawer.style.right = '-580px'; }
  _upUserId = null;
}

function switchUpTab(tab) {
  // Switch tab button active state
  document.querySelectorAll('.up-tab').forEach(b =>
    b.classList.toggle('active', b.getAttribute('data-up-tab') === tab)
  );
  // Show/hide panels via style.display (bypasses any CSS class conflicts)
  _showPanel(tab);
  // Load content
  if (_upUserId) loadUpTab(tab);
}

async function loadUpTab(tab) {
  try {
    if (tab === 'overview') await loadUpOverview();
    else if (tab === 'balance')  await loadUpBalance();
    else if (tab === 'kyc')      await loadUpKyc();
    else if (tab === 'logins')   await loadUpLogins();
    else if (tab === 'devices')  await loadUpDevices();
  } catch (err) {
    const capTab = tab.charAt(0).toUpperCase() + tab.slice(1);
    const el = document.getElementById(`up${capTab}Content`);
    if (el) el.innerHTML = `<div style="color:var(--red);padding:20px;text-align:center;font-size:13px;">${err.message || 'Failed to load'}</div>`;
  }
}

async function loadUpOverview() {
  const data = await apiRequest(`/users/${encodeURIComponent(_upUserId)}`);
  const user = data.user || data;
  // Handle both flat and nested wallet structure
  const bal     = Number(user.wallet?.balance ?? user.balance ?? 0);
  const locked  = Number(user.wallet?.lockedBalance ?? user.lockedBalance ?? 0);
  const p2pCnt  = user.stats?.p2pOrderCount ?? '-';
  const tradeCnt = user.stats?.tradeOrderCount ?? '-';

  document.getElementById('upEmail').textContent = user.email || '-';
  document.getElementById('upStatusBadge').innerHTML = statusBadge(user.status || 'UNKNOWN');
  const el = document.getElementById('upOverviewContent');
  el.innerHTML = `
    <div style="background:var(--bg-card);border-radius:10px;border:1px solid var(--border);padding:14px 16px;margin-bottom:10px;">
      <div class="up-info-row"><span class="up-info-label">User ID</span><span class="up-info-value" style="font-family:monospace;color:var(--accent);font-size:11px;">${user.userId||'-'}</span></div>
      <div class="up-info-row"><span class="up-info-label">Email</span><span class="up-info-value">${user.email||'-'}</span></div>
      <div class="up-info-row"><span class="up-info-label">Role</span><span class="up-info-value">${statusBadge(user.role||'USER')}</span></div>
      <div class="up-info-row"><span class="up-info-label">Account Status</span><span class="up-info-value">${statusBadge(user.status||'ACTIVE')}</span></div>
      <div class="up-info-row"><span class="up-info-label">KYC Status</span><span class="up-info-value">${statusBadge(user.kycStatus||'NOT_SUBMITTED')}</span></div>
      <div class="up-info-row"><span class="up-info-label">KYC Remarks</span><span class="up-info-value" style="color:var(--text-2);font-size:12px;">${user.kycRemarks||'-'}</span></div>
      <div class="up-info-row"><span class="up-info-label">Flags</span><span class="up-info-value">${(user.flags||[]).length ? user.flags.map(f=>`<span class="badge badge-red" style="font-size:10px;">${f}</span>`).join(' ') : '<span style="color:var(--text-2);">None</span>'}</span></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
      <div class="stat-card"><div class="stat-icon">💎</div><div class="stat-info"><div class="stat-label">Available</div><div class="stat-value" style="color:var(--green);font-size:15px;">${formatNumber(bal,4)}</div><div class="stat-meta">USDT</div></div></div>
      <div class="stat-card"><div class="stat-icon">🔒</div><div class="stat-info"><div class="stat-label">Locked</div><div class="stat-value" style="color:var(--red);font-size:15px;">${formatNumber(locked,4)}</div><div class="stat-meta">USDT</div></div></div>
      <div class="stat-card"><div class="stat-icon">🔄</div><div class="stat-info"><div class="stat-label">P2P Orders</div><div class="stat-value" style="font-size:18px;">${p2pCnt}</div></div></div>
      <div class="stat-card"><div class="stat-icon">📈</div><div class="stat-info"><div class="stat-label">Trade Orders</div><div class="stat-value" style="font-size:18px;">${tradeCnt}</div></div></div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <button class="btn-primary" style="flex:1;" data-up-tab="kyc">🪪 View KYC</button>
      <button class="btn-secondary" style="flex:1;" data-up-tab="logins">🔐 Login History</button>
      <button class="btn-danger" style="flex:1;" data-up-tab="actions">⚙️ Actions</button>
    </div>`;
}

async function loadUpBalance() {
  const data = await apiRequest(`/users/${encodeURIComponent(_upUserId)}`);
  const user = data.user || data;
  const bal    = Number(user.wallet?.balance ?? user.balance ?? 0);
  const locked = Number(user.wallet?.lockedBalance ?? user.lockedBalance ?? 0);
  const el = document.getElementById('upBalanceContent');
  el.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
      <div class="stat-card"><div class="stat-icon">💎</div><div class="stat-info"><div class="stat-label">Available</div><div class="stat-value" style="color:var(--green);font-size:17px;">${formatNumber(bal,4)}</div><div class="stat-meta">USDT</div></div></div>
      <div class="stat-card"><div class="stat-icon">🔒</div><div class="stat-info"><div class="stat-label">Locked</div><div class="stat-value" style="color:var(--red);font-size:17px;">${formatNumber(locked,4)}</div><div class="stat-meta">USDT</div></div></div>
    </div>
    <div style="background:var(--bg-card);border-radius:10px;border:1px solid var(--border);padding:14px 16px;">
      <div class="up-info-row"><span class="up-info-label">Available Balance</span><span class="up-info-value" style="color:var(--green);font-weight:700;">${formatNumber(bal,6)} USDT</span></div>
      <div class="up-info-row"><span class="up-info-label">Locked Balance</span><span class="up-info-value" style="color:var(--red);">${formatNumber(locked,6)} USDT</span></div>
      <div class="up-info-row"><span class="up-info-label">Total Balance</span><span class="up-info-value" style="font-weight:700;">${formatNumber(bal+locked,6)} USDT</span></div>
    </div>
    <div style="margin-top:12px;padding:10px 14px;background:var(--bg-card2);border-radius:8px;border:1px solid var(--border);">
      <div style="font-size:11px;color:var(--text-2);margin-bottom:6px;">Quick Adjust Balance</div>
      <div style="display:flex;gap:8px;">
        <select id="upAdjustType2" class="input-dark" style="width:120px;height:34px;padding:4px 8px;font-size:12px;"><option value="ADD">➕ Add</option><option value="SUBTRACT">➖ Subtract</option></select>
        <input id="upAdjustAmount2" class="input-dark" type="number" min="0" step="0.01" placeholder="Amount" style="flex:1;height:34px;" />
        <button class="btn-primary" onclick="(function(){document.getElementById('upAdjustType').value=document.getElementById('upAdjustType2').value;document.getElementById('upAdjustAmount').value=document.getElementById('upAdjustAmount2').value;switchUpTab('actions');})()">Go →</button>
      </div>
    </div>`;
}

// Helper: ensure image src is a proper data URL
function ensureDataUrl(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;
  // Already a data URL
  if (s.startsWith('data:')) return s;
  // Already an http URL
  if (s.startsWith('http')) return s;
  // Assume it's raw base64 JPEG
  return `data:image/jpeg;base64,${s}`;
}

function kycImageBox(title, src) {
  // src can be a /api/admin URL or a data URL
  const imgSrc = src || null;
  return `<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:10px;overflow:hidden;">
    <div style="padding:8px 12px;font-size:11px;font-weight:700;color:var(--text-2);text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid var(--border);background:var(--bg-card2);">${title}</div>
    <div style="min-height:160px;display:flex;align-items:center;justify-content:center;padding:10px;background:var(--bg-input);">
      ${imgSrc
        ? `<img src="${imgSrc}" style="max-width:100%;max-height:200px;border-radius:6px;object-fit:contain;cursor:zoom-in;"
             onclick="window.open('${imgSrc}','_blank')"
             onerror="this.parentElement.innerHTML='<div style=\\'color:var(--red);font-size:12px;text-align:center;padding:20px;\\'>⚠️ Image failed to load<br><small style=\\'opacity:.6;\\'>Decryption error or no data</small></div>'" />`
        : '<div style="color:var(--text-2);font-size:12px;text-align:center;padding:24px;">📄 Not uploaded</div>'
      }
    </div>
    ${imgSrc ? `<div style="padding:6px 10px;font-size:10px;color:var(--text-2);text-align:center;background:var(--bg-card2);">Click to open full size</div>` : ''}
  </div>`;
}

async function loadUpKyc() {
  const el = document.getElementById('upKycContent');
  el.innerHTML = `<div style="text-align:center;padding:30px;color:var(--text-2);"><div class="spin" style="margin:auto;"></div></div>`;
  try {
    const [kycData, docData] = await Promise.all([
      apiRequest(`/users/${encodeURIComponent(_upUserId)}/kyc`),
      apiRequest(`/users/${encodeURIComponent(_upUserId)}/kyc/documents`).catch(e => ({ _error: e.message }))
    ]);

    const kycStatus = kycData.kycStatus || kycData.status || 'NOT_SUBMITTED';
    const remarks   = kycData.remarks   || kycData.kycRemarks || '';
    const isPending = kycStatus === 'PENDING';
    const isApproved = kycStatus === 'APPROVED';

    const doc        = (docData && !docData._error) ? docData : {};
    const docError   = docData?._error || null;
    const aadhaarNum = doc.aadhaarMasked || '';
    const submittedAt = doc.submittedAt || '';
    // Use hasAadhaarFront/hasSelfie flags (new API) OR fall back to checking base64 blobs
    const hasAadhaar = !!(doc.hasAadhaarFront || doc.aadhaarFront);
    const hasSelfie  = !!(doc.hasSelfie || doc.selfie);
    const hasAnyDoc  = hasAadhaar || hasSelfie;
    // Use direct image URL endpoint (binary, no base64 size issues)
    const aadhaarImgUrl = hasAadhaar ? `${API_BASE}/users/${encodeURIComponent(_upUserId)}/kyc/image/aadhaar` : null;
    const selfieImgUrl  = hasSelfie  ? `${API_BASE}/users/${encodeURIComponent(_upUserId)}/kyc/image/selfie`  : null;

    const statusColor = kycStatus === 'APPROVED' ? 'var(--green)' : kycStatus === 'REJECTED' ? 'var(--red)' : kycStatus === 'PENDING' ? 'var(--accent)' : 'var(--text-2)';

    el.innerHTML = `
      <!-- KYC Status Banner -->
      <div style="background:${statusColor}14;border:1px solid ${statusColor}30;border-radius:10px;padding:12px 16px;margin-bottom:12px;display:flex;align-items:center;gap:12px;">
        <span style="font-size:26px;">${kycStatus==='APPROVED'?'✅':kycStatus==='REJECTED'?'❌':kycStatus==='PENDING'?'🕐':'📋'}</span>
        <div>
          <div style="font-size:14px;font-weight:700;color:${statusColor};">${kycStatus}</div>
          <div style="font-size:12px;color:var(--text-2);margin-top:2px;">${remarks || (kycStatus==='APPROVED'?'Identity verified':'KYC ' + kycStatus.toLowerCase())}</div>
        </div>
      </div>

      <!-- KYC Info -->
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:12px 16px;margin-bottom:12px;">
        <div class="up-info-row"><span class="up-info-label">KYC Status</span><span class="up-info-value">${statusBadge(kycStatus)}</span></div>
        ${aadhaarNum ? `<div class="up-info-row"><span class="up-info-label">Aadhaar Number</span><span class="up-info-value" style="font-family:monospace;letter-spacing:1px;">${aadhaarNum}</span></div>` : ''}
        ${submittedAt ? `<div class="up-info-row"><span class="up-info-label">Submitted At</span><span class="up-info-value">${formatDate(submittedAt)}</span></div>` : ''}
        <div class="up-info-row"><span class="up-info-label">Remarks</span><span class="up-info-value" style="color:${remarks?'var(--text-1)':'var(--text-2)'};">${remarks||'—'}</span></div>
        <div class="up-info-row"><span class="up-info-label">Aadhaar Doc</span><span class="up-info-value">${hasAadhaar?'<span style="color:var(--green);">✅ Uploaded</span>':'<span style="color:var(--text-2);">Not uploaded</span>'}</span></div>
        <div class="up-info-row" style="border:none;"><span class="up-info-label">Selfie</span><span class="up-info-value">${hasSelfie?'<span style="color:var(--green);">✅ Uploaded</span>':'<span style="color:var(--text-2);">Not uploaded</span>'}</span></div>
      </div>

      ${docError ? `<div style="background:var(--red-dim);border:1px solid var(--red);border-radius:8px;padding:10px 14px;margin-bottom:12px;font-size:12px;color:var(--red);">⚠️ Document fetch error: ${docError}</div>` : ''}

      <!-- Document Images -->
      ${hasAnyDoc ? `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
        ${kycImageBox('🪪 Aadhaar Front', aadhaarImgUrl)}
        ${kycImageBox('🤳 Selfie with Doc', selfieImgUrl)}
      </div>` : `
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:24px;text-align:center;margin-bottom:12px;">
        <div style="font-size:32px;margin-bottom:8px;">📋</div>
        <p style="font-size:13px;color:var(--text-2);margin:0;">${docError ? '⚠️ Could not load documents — ' + docError : 'No KYC documents uploaded yet'}</p>
      </div>`}

      <!-- Action Buttons -->
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        ${hasAnyDoc ? `<button class="btn-secondary" style="flex:1;" onclick="viewKycDocuments('${_upUserId}')">🔍 Full Screen</button>` : ''}
        ${isPending ? `
          <button class="btn-secondary" style="flex:1;" onclick="upApproveKyc()">✅ Approve KYC</button>
          <button class="btn-danger"    style="flex:1;" onclick="upRejectKyc()">❌ Reject KYC</button>
        ` : isApproved ? `
          <button class="btn-secondary" style="flex:1;" onclick="upRejectKyc()">🔄 Re-review KYC</button>
        ` : `
          <button class="btn-secondary" style="flex:1;" onclick="upApproveKyc()">✅ Approve KYC</button>
          <button class="btn-danger"    style="flex:1;" onclick="upRejectKyc()">❌ Reject KYC</button>
        `}
      </div>`;
  } catch(err) {
    el.innerHTML = `<div style="text-align:center;padding:40px;">
      <div style="font-size:32px;margin-bottom:10px;">⚠️</div>
      <p style="font-size:13px;color:var(--text-2);margin:0 0 4px;">KYC data unavailable</p>
      <small style="color:var(--red);font-size:11px;">${err.message||'Unknown error'}</small>
    </div>`;
  }
}

async function upApproveKyc() {
  try {
    await reviewKyc(_upUserId, 'APPROVED', '');
    showMessage('KYC Approved ✅', 'success');
    await loadUpKyc();
    await loadUpOverview();
  } catch(err) { showMessage(err.message||'Failed','error'); }
}

async function upRejectKyc() {
  const reason = window.prompt('Enter rejection reason:');
  if (!reason || !reason.trim()) return;
  try {
    await reviewKyc(_upUserId, 'REJECTED', reason.trim());
    showMessage('KYC Rejected', 'success');
    await loadUpKyc();
    await loadUpOverview();
  } catch(err) { showMessage(err.message||'Failed','error'); }
}

async function loadUpLogins() {
  const el = document.getElementById('upLoginsContent');
  el.innerHTML = `<div style="text-align:center;padding:30px;color:var(--text-2);"><div class="spin" style="margin:auto;"></div></div>`;
  try {
    const data = await apiRequest(`/users/${encodeURIComponent(_upUserId)}/login-history`);
    // Handle both collection formats
    const logs = Array.isArray(data.history)  ? data.history
               : Array.isArray(data.logs)     ? data.logs
               : Array.isArray(data.records)  ? data.records
               : [];
    const total = data.pagination?.total || logs.length;

    if (!logs.length) {
      el.innerHTML = `<div style="text-align:center;padding:48px 20px;color:var(--text-2);">
        <div style="font-size:38px;margin-bottom:10px;">🔐</div>
        <p style="font-size:13px;font-weight:600;margin:0 0 4px;">No login history</p>
        <p style="font-size:11px;opacity:.6;margin:0;">This user hasn't logged in yet</p>
      </div>`;
      return;
    }

    el.innerHTML = `
      <div style="font-size:11px;color:var(--text-2);margin-bottom:10px;padding:0 2px;">
        Showing ${Math.min(logs.length,50)} of ${total} logins
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${logs.slice(0,50).map(log => {
          const isSuccess = log.success === true || log.success === 'true' || log.status === 'SUCCESS' || (log.action === 'user_login' && log.success !== false);
          const isFailed  = log.success === false || log.status === 'FAILED' || log.action === 'login_failed';
          const ip        = log.ip || log.ipAddress || log.ipAddr || log.metadata?.ip || '-';
          const country   = log.country || log.location || log.metadata?.country || log.geo?.country || '';
          const city      = log.city || log.metadata?.city || log.geo?.city || '';
          const device    = log.userAgent || log.deviceInfo || log.device || log.metadata?.userAgent || '';
          const time      = log.createdAt || log.timestamp || log.loginAt || log.time;
          const icon      = isSuccess ? '✅' : isFailed ? '❌' : '🔵';
          const color     = isSuccess ? 'var(--green)' : isFailed ? 'var(--red)' : 'var(--text-2)';
          const label     = isSuccess ? 'Login Success' : isFailed ? 'Login Failed' : (log.action || 'Activity');
          return `<div class="up-login-row">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
              <span style="font-weight:600;font-size:12px;color:${color};">${icon} ${label}</span>
              <span style="font-size:10px;color:var(--text-2);white-space:nowrap;">${formatDate(time)}</span>
            </div>
            <div style="display:flex;gap:16px;margin-top:5px;flex-wrap:wrap;">
              <span style="font-size:11px;color:var(--text-2);">🌐 <span style="color:var(--text-1);font-family:monospace;">${ip}</span></span>
              ${country ? `<span style="font-size:11px;color:var(--text-2);">📍 ${[city,country].filter(Boolean).join(', ')}</span>` : ''}
            </div>
            ${device ? `<div style="font-size:10px;color:var(--text-2);margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;opacity:.7;">${device}</div>` : ''}
          </div>`;
        }).join('')}
      </div>`;
  } catch(err) {
    el.innerHTML = `<div style="text-align:center;padding:40px;">
      <div style="font-size:32px;margin-bottom:10px;">⚠️</div>
      <p style="color:var(--red);font-size:13px;margin:0 0 4px;">Failed to load history</p>
      <small style="color:var(--text-2);">${err.message||'Unknown error'}</small>
    </div>`;
  }
}

async function loadUpDevices() {
  const el = document.getElementById('upDevicesContent');
  el.innerHTML = `<div style="text-align:center;padding:30px;color:var(--text-2);"><div class="spin" style="margin:auto;"></div></div>`;
  try {
    const data = await apiRequest(`/users/${encodeURIComponent(_upUserId)}/devices`);
    const devices = Array.isArray(data.devices) ? data.devices : Array.isArray(data) ? data : [];

    if (!devices.length) {
      el.innerHTML = `<div style="text-align:center;padding:48px 20px;color:var(--text-2);">
        <div style="font-size:38px;margin-bottom:10px;">📱</div>
        <p style="font-size:13px;font-weight:600;margin:0 0 4px;">No devices found</p>
        <p style="font-size:11px;opacity:.6;margin:0;">User hasn't logged in from any tracked device</p>
      </div>`;
      return;
    }

    el.innerHTML = `<div style="display:flex;flex-direction:column;gap:8px;">` +
      devices.map((d, i) => {
        const osLower = (d.os || d.platform || '').toLowerCase();
        const nameLower = (d.deviceName || d.name || '').toLowerCase();
        const emoji = (osLower.includes('android') || nameLower.includes('android')) ? '🤖'
                    : (osLower.includes('ios') || nameLower.includes('iphone') || nameLower.includes('ipad')) ? '🍎'
                    : (osLower.includes('windows')) ? '🖥'
                    : (osLower.includes('mac')) ? '🍎'
                    : '💻';
        const trusted = d.trusted || d.isTrusted || d.is_trusted;
        const name    = d.deviceName || d.name || d.browser || `Device ${i + 1}`;
        const ip      = d.ip || d.lastIp || d.ipAddress || '-';
        const lastSeen = d.lastSeenAt || d.lastSeen || d.last_seen_at || d.updatedAt || d.createdAt;
        return `<div class="up-device-card">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-size:22px;">${emoji}</span>
              <div>
                <div style="font-weight:700;color:var(--text-1);font-size:13px;">${name}</div>
                <div style="font-size:10px;color:var(--text-2);">${d.os||d.platform||'Unknown OS'}</div>
              </div>
            </div>
            <span class="badge ${trusted ? 'badge-green' : 'badge-gray'}">${trusted ? '✓ Trusted' : 'Untrusted'}</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px;">
            <div style="color:var(--text-2);">Browser: <span style="color:var(--text-1);">${d.browser || '-'}</span></div>
            <div style="color:var(--text-2);">IP: <span style="color:var(--text-1);font-family:monospace;">${ip}</span></div>
            <div style="color:var(--text-2);">Last seen: <span style="color:var(--text-1);">${formatDate(lastSeen)}</span></div>
            <div style="color:var(--text-2);">Added: <span style="color:var(--text-1);">${formatDate(d.createdAt)}</span></div>
          </div>
          ${d.fingerprint ? `<div style="margin-top:8px;padding:5px 8px;background:var(--bg-input);border-radius:4px;font-size:10px;color:var(--text-2);font-family:monospace;overflow:hidden;text-overflow:ellipsis;">🔑 ${d.fingerprint}</div>` : ''}
        </div>`;
      }).join('') + `</div>`;
  } catch(err) {
    el.innerHTML = `<div style="text-align:center;padding:40px;">
      <div style="font-size:32px;margin-bottom:10px;">⚠️</div>
      <p style="color:var(--red);font-size:13px;margin:0 0 4px;">Failed to load devices</p>
      <small style="color:var(--text-2);">${err.message||'Unknown error'}</small>
    </div>`;
  }
}

async function upAction(action) {
  if (!_upUserId) return;
  try {
    if (action === 'freeze') {
      await apiRequest(`/users/${encodeURIComponent(_upUserId)}/status`, { method:'PATCH', body:JSON.stringify({status:'FROZEN'}) });
      showMessage('Account frozen.','success');
      await loadUpOverview();
    } else if (action === 'unfreeze') {
      await apiRequest(`/users/${encodeURIComponent(_upUserId)}/status`, { method:'PATCH', body:JSON.stringify({status:'ACTIVE'}) });
      showMessage('Account unfrozen.','success');
      await loadUpOverview();
    } else if (action === 'ban') {
      if (!confirm('Ban this user permanently?')) return;
      await apiRequest(`/users/${encodeURIComponent(_upUserId)}/status`, { method:'PATCH', body:JSON.stringify({status:'BANNED'}) });
      showMessage('User banned.','success');
      await loadUpOverview();
    } else if (action === 'force-logout') {
      await apiRequest(`/users/${encodeURIComponent(_upUserId)}/force-logout`, { method:'POST', body:JSON.stringify({}) });
      showMessage('User force logged out.','success');
    } else if (action === 'adjust') {
      const type   = document.getElementById('upAdjustType').value;
      const amount = parseFloat(document.getElementById('upAdjustAmount').value);
      const reason = document.getElementById('upAdjustReason').value.trim();
      if (!amount || amount <= 0) return showMessage('Enter a valid amount.','error');
      if (!reason) return showMessage('Reason is required.','error');
      await apiRequest(`/users/${encodeURIComponent(_upUserId)}/adjust-balance`, { method:'POST', body:JSON.stringify({type,amount,reason}) });
      showMessage(`Balance ${type==='ADD'?'added':'subtracted'} successfully.`,'success');
      document.getElementById('upAdjustAmount').value='';
      document.getElementById('upAdjustReason').value='';
      await loadUpOverview(); await loadUpBalance();
    } else if (action === 'reset') {
      const pwd = document.getElementById('upNewPassword').value.trim();
      if (pwd.length < 8) return showMessage('Password must be at least 8 characters.','error');
      await apiRequest(`/users/${encodeURIComponent(_upUserId)}/reset-password`, { method:'POST', body:JSON.stringify({newPassword:pwd}) });
      showMessage('Password reset successfully.','success');
      document.getElementById('upNewPassword').value='';
    }
  } catch (err) {
    showMessage(err.message || 'Action failed.','error');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Wire All Event Listeners
// ─────────────────────────────────────────────────────────────────────────────

function wireEventListeners() {
  if (dom.menuToggleBtn) {
    dom.menuToggleBtn.addEventListener('click', () => {
      const isOpen = dom.sidebar.classList.contains('open');
      setSidebarOpen(!isOpen);
    });
  }
  if (dom.sidebarOverlay) {
    dom.sidebarOverlay.addEventListener('click', () => setSidebarOpen(false));
  }

  dom.sidebarNav.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-view]');
    if (!button) {
      return;
    }
    setSidebarOpen(false); // close on mobile after nav click
    await changeView(button.getAttribute('data-view'));
  });

  dom.refreshCurrentBtn.addEventListener('click', async () => {
    await loadCurrentView();
    showMessage('Section refreshed.', 'success');
  });

  const doLogout = async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST', body: JSON.stringify({}) });
    } catch (_error) {
      // Ignore
    } finally {
      window.location.href = '/admin/login';
    }
  };

  dom.logoutBtn.addEventListener('click', doLogout);
  if (dom.logoutBtnSide) {
    dom.logoutBtnSide.addEventListener('click', doLogout);
  }

  // KYC modal close
  document.getElementById('kycDocModalClose').addEventListener('click', () => {
    document.getElementById('kycDocModal').classList.add('hidden');
    document.getElementById('kycDocModal').classList.remove('flex');
  });
  document.getElementById('kycDocModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      e.currentTarget.classList.add('hidden');
      e.currentTarget.classList.remove('flex');
    }
  });

  // KYC
  document.getElementById('kycTableBody').addEventListener('click', handleKycAction);
  document.getElementById('kycDocActions').addEventListener('click', handleKycDocAction);
  document.getElementById('kycReloadBtn').addEventListener('click', async () => loadKyc());
  document.getElementById('kycStatusFilter').addEventListener('change', async () => loadKyc());

  // Users
  document.getElementById('usersTableBody').addEventListener('click', handleUsersAction);
  document.getElementById('userSearchBtn').addEventListener('click', async () => loadUsers());
  document.getElementById('userSearchResetBtn').addEventListener('click', async () => {
    document.getElementById('userSearchInput').value = '';
    await loadUsers({ search: '' });
  });
  document.getElementById('usersReloadBtn').addEventListener('click', async () => loadUsers());

  // Wallet
  document.getElementById('depositsList').addEventListener('click', handleDepositAction);
  document.getElementById('withdrawalsList').addEventListener('click', handleWithdrawalAction);
  document.getElementById('walletDepositsReloadBtn').addEventListener('click', async () => loadWallet());
  document.getElementById('walletWithdrawalsReloadBtn').addEventListener('click', async () => loadWallet());
  document.getElementById('walletDepositStatusFilter').addEventListener('change', async () => loadWallet());
  document.getElementById('walletWithdrawalStatusFilter').addEventListener('change', async () => loadWallet());

  // Spot
  document.getElementById('spotPairsTableBody').addEventListener('click', handleSpotAction);
  document.getElementById('spotReloadBtn').addEventListener('click', async () => loadSpot());

  // P2P
  document.getElementById('p2pAdsList').addEventListener('click', handleP2PActions);
  document.getElementById('p2pDisputesList').addEventListener('click', handleP2PActions);
  document.getElementById('p2pReloadBtn').addEventListener('click', async () => loadP2P());

  // User profile drawer - tab switching + close via event delegation
  document.getElementById('userProfileDrawer').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-up-tab]');
    if (btn) {
      switchUpTab(btn.getAttribute('data-up-tab'));
      return;
    }
  });
  document.getElementById('upCloseBtn').addEventListener('click', () => closeUserProfile());
  document.getElementById('userProfileOverlay').addEventListener('click', () => closeUserProfile());

  // Support ticket list - click delegation (ticket cards are rendered via innerHTML)
  document.getElementById('supportTicketsList').addEventListener('click', (e) => {
    const item = e.target.closest('[data-support-ticket-id]');
    if (!item) return;
    openTicket(item.getAttribute('data-support-ticket-id'));
  });

  // Support chat
  document.getElementById('supportReloadBtn').addEventListener('click', async () => loadSupport());
  document.getElementById('supportStatusFilter').addEventListener('change', async () => loadSupport());
  document.getElementById('sendReplyBtn').addEventListener('click', async () => sendAdminReply());
  document.getElementById('chatCloseTicketBtn').addEventListener('click', async () => {
    const ticketId = state.support.activeTicketId;
    if (!ticketId) {
      return;
    }
    try {
      await apiRequest(`/support/tickets/${encodeURIComponent(ticketId)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'CLOSED' })
      });
      showMessage('Ticket closed.', 'success');
      await loadSupport();
      await renderTicketChat(ticketId);
    } catch (error) {
      showMessage(error.message || 'Failed to close ticket.', 'error');
    }
  });
  document.getElementById('chatResolveBtn').addEventListener('click', async () => {
    const ticketId = state.support.activeTicketId;
    if (!ticketId) {
      return;
    }
    try {
      await apiRequest(`/support/tickets/${encodeURIComponent(ticketId)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'CLOSED' })
      });
      showMessage('Ticket resolved and closed.', 'success');
      await loadSupport();
      await renderTicketChat(ticketId);
    } catch (error) {
      showMessage(error.message || 'Failed to resolve ticket.', 'error');
    }
  });

  // Revenue
  // (no extra listeners beyond nav)

  // Risk
  document.getElementById('riskReloadBtn').addEventListener('click', async () => loadRisk());
  document.getElementById('blockedIpsList').addEventListener('click', handleRiskActions);
  document.getElementById('blockIpBtn').addEventListener('click', async () => {
    const ip = document.getElementById('blockIpInput').value.trim();
    const reason = document.getElementById('blockIpReason').value.trim();
    if (!ip) {
      return showMessage('IP address is required.', 'error');
    }
    try {
      await apiRequest('/risk/block-ip', {
        method: 'POST',
        body: JSON.stringify({ ip, reason: reason || 'Admin blocked' })
      });
      showMessage(`IP ${ip} blocked.`, 'success');
      document.getElementById('blockIpInput').value = '';
      document.getElementById('blockIpReason').value = '';
      await loadRisk();
    } catch (error) {
      showMessage(error.message || 'Failed to block IP.', 'error');
    }
  });

  document.getElementById('riskConfigForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      await apiRequest('/risk/config', {
        method: 'PUT',
        body: JSON.stringify({
          maxLeverage: Number(form.maxLeverage.value) || undefined,
          maxWithdrawalAmount: Number(form.maxWithdrawalAmount.value) || undefined,
          minWithdrawalAmount: Number(form.minWithdrawalAmount.value) || undefined,
          amlRiskThreshold: Number(form.amlRiskThreshold.value) || undefined
        })
      });
      showMessage('Risk config saved.', 'success');
    } catch (error) {
      showMessage(error.message || 'Failed to save risk config.', 'error');
    }
  });

  // Features
  document.getElementById('featuresReloadBtn').addEventListener('click', async () => loadFeatures());

  // Notifications
  document.getElementById('notifReloadBtn').addEventListener('click', async () => loadNotifications());

  document.getElementById('broadcastNotifForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      await broadcastNotification(form.title.value, form.message.value, form.priority.value, form.type.value);
      showMessage('Broadcast notification sent.', 'success');
      form.reset();
      await loadNotifications();
    } catch (error) {
      showMessage(error.message || 'Failed to broadcast notification.', 'error');
    }
  });

  document.getElementById('userNotifForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      await apiRequest('/notifications', {
        method: 'POST',
        body: JSON.stringify({
          userId: form.userId.value,
          title: form.title.value,
          message: form.message.value,
          priority: form.priority.value
        })
      });
      showMessage('Notification sent to user.', 'success');
      form.reset();
      await loadNotifications();
    } catch (error) {
      showMessage(error.message || 'Failed to send notification.', 'error');
    }
  });

  // Blockchain
  document.getElementById('blockchainReloadBtn').addEventListener('click', async () => loadBlockchain());
  document.getElementById('withdrawalQueueBody').addEventListener('click', handleBlockchainActions);
  document.getElementById('blockchainTxBody').addEventListener('click', handleBlockchainActions);

  // Compliance
  document.getElementById('complianceReloadBtn').addEventListener('click', async () => loadCompliance());
  document.getElementById('complianceFlagForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      await apiRequest('/compliance/flags', {
        method: 'POST',
        body: JSON.stringify({
          userId: form.userId.value,
          type: form.type.value,
          severity: form.severity.value,
          reason: form.reason.value
        })
      });
      showMessage('Compliance flag created.', 'success');
      form.reset();
      await loadCompliance();
    } catch (error) {
      showMessage(error.message || 'Failed to create compliance flag.', 'error');
    }
  });
  document.getElementById('exportCsvBtn').addEventListener('click', () => {
    window.open('/api/admin/compliance/export/transactions.csv', '_blank');
  });

  // Settings
  document.getElementById('platformSettingsForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      await apiRequest('/settings/platform', {
        method: 'PUT',
        body: JSON.stringify({
          siteName: form.siteName.value,
          logoUrl: form.logoUrl.value,
          announcementBanner: form.announcementBanner.value,
          referralCommissionPercent: Number(form.referralCommissionPercent.value),
          signupBonusUsdt: Number(form.signupBonusUsdt.value),
          smtpHost: form.smtpHost.value,
          smtpPort: Number(form.smtpPort.value),
          smtpUser: form.smtpUser.value,
          smtpSecure: Boolean(form.smtpSecure.checked),
          maintenanceMode: Boolean(form.maintenanceMode.checked),
          globalTradingFees: {
            maker: Number(form.makerFee.value),
            taker: Number(form.takerFee.value)
          },
          features: {
            spotEnabled: Boolean(form.spotEnabled.checked),
            p2pEnabled: Boolean(form.p2pEnabled.checked),
            walletEnabled: Boolean(form.walletEnabled.checked),
            referralsEnabled: Boolean(form.referralsEnabled.checked),
            supportEnabled: Boolean(form.supportEnabled.checked)
          },
          compliance: {
            requireKycBeforeWithdrawal: Boolean(form.requireKycBeforeWithdrawal.checked)
          }
        })
      });
      showMessage('Platform settings saved.', 'success');
    } catch (error) {
      showMessage(error.message || 'Failed to save platform settings.', 'error');
    }
  });

  // Coin config
  document.getElementById('coinConfigForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      await apiRequest(`/wallet/config/${encodeURIComponent(String(form.coin.value || '').trim().toUpperCase())}`, {
        method: 'PUT',
        body: JSON.stringify({
          networkFee: Number(form.networkFee.value),
          minWithdrawal: Number(form.minWithdrawal.value),
          maxWithdrawal: Number(form.maxWithdrawal.value),
          withdrawalsEnabled: Boolean(form.withdrawalsEnabled.checked),
          depositsEnabled: Boolean(form.depositsEnabled.checked),
          defaultNetwork: String(form.defaultNetwork.value || 'TRC20').trim().toUpperCase(),
          depositAddresses: {
            TRC20: String(form.trc20Address.value || '').trim(),
            ERC20: String(form.erc20Address.value || '').trim(),
            BEP20: String(form.bep20Address.value || '').trim()
          },
          minDepositConfirmations: {
            TRC20: Number(form.trc20Confirmations.value || 20),
            ERC20: Number(form.erc20Confirmations.value || 12),
            BEP20: Number(form.bep20Confirmations.value || 15)
          },
          supportedNetworks: ['TRC20', 'ERC20', 'BEP20']
        })
      });
      showMessage('Coin wallet config updated.', 'success');
      await loadWallet();
    } catch (error) {
      showMessage(error.message || 'Failed to update coin config.', 'error');
    }
  });

  // P2P settings
  document.getElementById('p2pSettingsForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      await apiRequest('/p2p/settings', {
        method: 'PUT',
        body: JSON.stringify({
          p2pFeePercent: Number(form.p2pFeePercent.value),
          minOrderLimit: Number(form.minOrderLimit.value),
          maxOrderLimit: Number(form.maxOrderLimit.value),
          autoExpiryMinutes: Number(form.autoExpiryMinutes.value)
        })
      });
      showMessage('P2P settings saved.', 'success');
      await loadP2P();
    } catch (error) {
      showMessage(error.message || 'Failed to save P2P settings.', 'error');
    }
  });

  // Admin Users
  document.getElementById('adminUsersReloadBtn').addEventListener('click', async () => loadAdminUsers());
  document.getElementById('adminUsersTableBody').addEventListener('click', handleAdminUsersActions);
  document.getElementById('createAdminForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      await createAdmin(form.email.value, form.username.value, form.password.value, form.role.value);
      showMessage('Admin account created successfully.', 'success');
      form.reset();
      await loadAdminUsers();
    } catch (error) {
      showMessage(error.message || 'Failed to create admin account.', 'error');
    }
  });

  // Monitoring + Audit reload
  document.getElementById('monitoringReloadBtn').addEventListener('click', async () => loadMonitoring());
  document.getElementById('auditReloadBtn').addEventListener('click', async () => loadAudit());
}

// ─── Support ticket live-notify via SSE ─────────────────────────────────────
let _lastKnownOpenTicketCount = 0;
let _supportSSE = null;

function connectSupportSSE() {
  if (_supportSSE) { try { _supportSSE.close(); } catch(_) {} }
  _supportSSE = new EventSource('/api/admin/support/live-notify');
  _supportSSE.onmessage = (ev) => {
    try {
      const info = JSON.parse(ev.data);
      // Update sidebar badge
      _lastKnownOpenTicketCount++;
      const badge = document.getElementById('supportBadge');
      if (badge) { badge.style.display = ''; badge.textContent = _lastKnownOpenTicketCount; }
      // Show popup with agent name
      showSupportNotification(info);
      // If on support view, refresh list
      if (state.currentView === 'support' && !state.support.activeTicketId) {
        loadSupport().catch(() => {});
      }
    } catch (_) {}
  };
  _supportSSE.onerror = () => {
    // Reconnect after 5s on error
    setTimeout(connectSupportSSE, 5000);
  };
}

async function pollSupportTickets() {
  try {
    const payload = await apiRequest('/support/tickets?limit=50');
    const tickets = Array.isArray(payload.tickets) ? payload.tickets : [];
    const openCount = tickets.filter(t => (t.status || '').toUpperCase() !== 'CLOSED').length;

    // Update sidebar badge
    const badge = document.getElementById('supportBadge');
    if (badge) {
      badge.style.display = openCount > 0 ? '' : 'none';
      badge.textContent = openCount;
    }
    _lastKnownOpenTicketCount = openCount;

    // If currently on support view, refresh list
    if (state.currentView === 'support' && !state.support.activeTicketId) {
      await loadSupport();
    }
  } catch (e) { /* silent */ }
}

function showSupportNotification(info) {
  // info can be string (legacy) or object { ticketId, subject, agentName, email }
  const isObj = info && typeof info === 'object';
  const agentName = isObj ? (info.agentName || 'Support Agent') : '';
  const subject   = isObj ? (info.subject || 'New support request') : String(info);
  const ticketId  = isObj ? info.ticketId : null;
  const userLabel = isObj ? (info.email || 'User') : '';

  const n = document.createElement('div');
  n.style.cssText = `position:fixed;bottom:24px;right:24px;z-index:9999;
    background:var(--bg-card);border:1px solid var(--accent);border-radius:14px;
    padding:14px 18px;display:flex;align-items:flex-start;gap:12px;cursor:pointer;
    box-shadow:0 8px 32px rgba(0,0,0,0.6);animation:slideInRight 0.35s ease;max-width:320px;`;

  const avatarColor = '#f0b90b';
  n.innerHTML = `
    <div style="width:38px;height:38px;border-radius:50%;background:${avatarColor}20;border:2px solid ${avatarColor}40;
                display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">🎧</div>
    <div style="flex:1;min-width:0;">
      <p style="margin:0 0 2px;font-size:12px;font-weight:700;color:var(--accent);">New Live Support Request</p>
      ${agentName ? `<p style="margin:0 0 2px;font-size:13px;font-weight:600;color:var(--text-1);">Agent: ${agentName}</p>` : ''}
      <p style="margin:0;font-size:11px;color:var(--text-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${subject}</p>
      ${userLabel ? `<p style="margin:2px 0 0;font-size:10px;color:var(--text-2);opacity:.7;">${userLabel}</p>` : ''}
      <p style="margin:4px 0 0;font-size:11px;color:var(--accent);font-weight:600;">👆 Click to respond</p>
    </div>
    <button onclick="event.stopPropagation();this.closest('[style]').remove();"
      style="background:none;border:none;color:var(--text-2);cursor:pointer;font-size:16px;padding:0;flex-shrink:0;">✕</button>`;

  n.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') return;
    n.remove();
    changeView('support').then(() => {
      if (ticketId) setTimeout(() => openTicket(ticketId), 400);
    });
  });

  document.body.appendChild(n);
  // Pulse the sidebar badge
  const badge = document.getElementById('supportBadge');
  if (badge) { badge.style.animation = 'none'; badge.style.transform = 'scale(1.4)'; setTimeout(() => { badge.style.transform = ''; }, 300); }
  setTimeout(() => { if (n.isConnected) n.remove(); }, 10000);
}

async function init() {
  try {
    startLiveClock();
    await ensureAdminSession();
    wireEventListeners();
    await changeView('overview');

    // Refresh current view every 30s
    setInterval(async () => {
      await loadCurrentView({ silent: true });
    }, 30000);

    // SSE for instant new-ticket alerts
    connectSupportSSE();
    // Poll support tickets every 15s for badge count sync
    await pollSupportTickets();
    setInterval(pollSupportTickets, 15000);

    showMessage('Admin dashboard loaded.', 'success');
  } catch (error) {
    showMessage(error.message || 'Unable to load admin dashboard.', 'error');
  }
}

init();
