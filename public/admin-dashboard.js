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
  selectedUserDetail: null,
  walletFilters: {
    depositStatus: '',
    withdrawalStatus: 'PENDING'
  }
};

const dom = {
  sidebar: document.getElementById('adminSidebar'),
  sidebarBackdrop: document.getElementById('sidebarBackdrop'),
  sidebarOpenBtn: document.getElementById('sidebarOpenBtn'),
  sidebarCloseBtn: document.getElementById('sidebarCloseBtn'),
  sidebarNav: document.getElementById('sidebarNav'),
  panels: Array.from(document.querySelectorAll('[data-panel]')),
  pageTitle: document.getElementById('pageTitle'),
  adminIdentity: document.getElementById('adminIdentity'),
  globalMessage: document.getElementById('globalMessage'),
  refreshCurrentBtn: document.getElementById('refreshCurrentBtn'),
  logoutBtn: document.getElementById('logoutBtn'),
  userDetailModal: document.getElementById('userDetailModal'),
  userDetailBackdrop: document.getElementById('userDetailBackdrop'),
  userDetailCloseBtn: document.getElementById('userDetailCloseBtn'),
  userDetailContent: document.getElementById('userDetailContent'),
  userDetailSubtitle: document.getElementById('userDetailSubtitle')
};

const viewLoaders = {
  overview: loadOverview,
  users: loadUsers,
  wallet: loadWallet,
  spot: loadSpot,
  p2p: loadP2P,
  revenue: loadRevenue,
  settings: loadSettings,
  compliance: loadCompliance,
  support: loadSupport,
  monitoring: loadMonitoring,
  audit: loadAudit
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

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function statusBadge(status) {
  const normalized = String(status || '').trim().toUpperCase();
  let css = 'badge';
  if (['ACTIVE', 'APPROVED', 'OPEN', 'SUCCESS', 'RELEASED', 'CONNECTED', 'ENABLED'].includes(normalized)) {
    css += ' success';
  } else if (['PENDING', 'IN_PROGRESS', 'PAID'].includes(normalized)) {
    css += ' warning';
  } else if (['BANNED', 'REJECTED', 'FAILURE', 'CANCELLED', 'DISPUTED', 'DISABLED', 'ERROR'].includes(normalized)) {
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

  const isLoading = Boolean(loading);

  if (isLoading) {
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

async function apiRequestOptional(path, fallback, options = {}) {
  try {
    return await apiRequest(path, options);
  } catch (error) {
    return fallback;
  }
}

function setSidebarOpen(open) {
  if (window.innerWidth >= 1024) {
    return;
  }
  if (open) {
    dom.sidebar.classList.remove('-translate-x-full');
    dom.sidebarBackdrop.classList.remove('hidden');
  } else {
    dom.sidebar.classList.add('-translate-x-full');
    dom.sidebarBackdrop.classList.add('hidden');
  }
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
  dom.pageTitle.textContent = view.charAt(0).toUpperCase() + view.slice(1);
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
      <article class="${card.className || 'card-item'}">
        <p class="text-xs uppercase tracking-wide text-slate-400">${card.label}</p>
        <p class="mt-2 stat-value">${card.value}</p>
        ${card.meta ? `<p class="mt-1 text-xs text-slate-500">${card.meta}</p>` : ''}
      </article>
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
          ticks: {
            color: '#94a3b8'
          },
          grid: {
            color: '#1e293b'
          }
        },
        y: {
          ticks: {
            color: '#94a3b8'
          },
          grid: {
            color: '#1e293b'
          }
        }
      }
    }
  });
}

function renderExecutiveKpis(kpis = {}) {
  renderCards('executiveKpiCards', [
    { label: 'Total Users', value: formatNumber(kpis.totalUsers || 0, 0), className: 'kpi-card-3d' },
    { label: 'Active Users', value: formatNumber(kpis.activeUsers || 0, 0), className: 'kpi-card-3d' },
    { label: 'Email Unverified', value: formatNumber(kpis.emailUnverifiedUsers || 0, 0), className: 'kpi-card-3d' },
    { label: 'Mobile Unverified', value: formatNumber(kpis.mobileUnverifiedUsers || 0, 0), className: 'kpi-card-3d' },
    { label: 'Total Trades', value: formatNumber(kpis.totalTrades || 0, 0), className: 'kpi-card-3d' },
    { label: 'Total Currencies', value: formatNumber(kpis.totalCurrencies || 0, 0), className: 'kpi-card-3d' }
  ]);
}

function renderNotificationsFeed(data = {}) {
  const feed = document.getElementById('notificationsFeed');
  if (!feed) {
    return;
  }
  const rows = Array.isArray(data.notifications) ? data.notifications : [];
  feed.innerHTML = rows
    .map(
      (row) => `
      <article class="list-item">
        <div class="flex items-start justify-between gap-2">
          <p class="text-sm font-semibold">${escapeHtml(row.title || 'Notification')}</p>
          ${statusBadge(row.priority || 'NORMAL')}
        </div>
        <p class="mt-1 text-xs text-slate-300">${escapeHtml(row.message || '-')}</p>
        <p class="mt-1 text-[11px] text-slate-500">${escapeHtml(row.type || 'ANNOUNCEMENT')} • ${formatDate(row.createdAt)}</p>
      </article>
    `
    )
    .join('');

  if (!rows.length) {
    feed.innerHTML = '<p class="text-sm text-slate-500">No notifications yet.</p>';
  }
}

function renderReferralSummary(data = {}) {
  const summary = document.getElementById('referralSummary');
  const topReferrers = document.getElementById('topReferrersList');
  if (!summary || !topReferrers) {
    return;
  }

  summary.innerHTML = `
    <div class="metric-item">
      <p class="text-xs uppercase tracking-wide text-slate-400">Commission %</p>
      <p class="mt-1 text-lg font-semibold">${formatNumber(data.commissionPercent || 0, 2)}%</p>
    </div>
    <div class="metric-item">
      <p class="text-xs uppercase tracking-wide text-slate-400">Referral Users</p>
      <p class="mt-1 text-lg font-semibold">${formatNumber(data.totalReferralUsers || 0, 0)}</p>
    </div>
    <div class="metric-item">
      <p class="text-xs uppercase tracking-wide text-slate-400">Referral Earnings</p>
      <p class="mt-1 text-lg font-semibold">₹${formatNumber(data.totalReferralEarnings || 0, 2)}</p>
    </div>
  `;

  const rows = Array.isArray(data.topReferrers) ? data.topReferrers : [];
  topReferrers.innerHTML = rows
    .map(
      (row) => `
      <article class="list-item">
        <p class="text-sm font-semibold">${escapeHtml(row.referrer || '-')}</p>
        <p class="text-xs text-slate-400">Invites: ${formatNumber(row.referredUsers || 0, 0)}</p>
      </article>
    `
    )
    .join('');

  if (!rows.length) {
    topReferrers.innerHTML = '<p class="text-sm text-slate-500">No referral activity found.</p>';
  }
}

function renderAdminLoginHistory(data = {}) {
  const container = document.getElementById('adminLoginHistoryList');
  if (!container) {
    return;
  }
  const rows = Array.isArray(data.items) ? data.items : [];
  container.innerHTML = rows
    .map(
      (row) => `
      <article class="list-item">
        <div class="flex items-start justify-between gap-2">
          <p class="text-sm font-semibold">${escapeHtml(row.email || row.adminEmail || row.adminId || '-')}</p>
          ${statusBadge(row.success ? 'SUCCESS' : row.reason || 'FAILURE')}
        </div>
        <p class="mt-1 text-xs text-slate-400">${formatDate(row.createdAt || row.loginAt)}</p>
        <p class="mt-1 text-[11px] text-slate-500">IP: ${escapeHtml(row.ip || '-')}</p>
      </article>
    `
    )
    .join('');

  if (!rows.length) {
    container.innerHTML = '<p class="text-sm text-slate-500">No login history available.</p>';
  }
}

function setUserDetailModalOpen(open) {
  if (!dom.userDetailModal) {
    return;
  }
  dom.userDetailModal.classList.toggle('hidden', !open);
  document.body.classList.toggle('overflow-hidden', Boolean(open));
}

function renderUserDetailModal(user = {}) {
  if (!dom.userDetailContent) {
    return;
  }

  const totals = user.totals || {};
  const walletBalances = user.walletBalances || {};
  const kyc = user.kyc || {};
  const recentDeposits = Array.isArray(user.recentDeposits) ? user.recentDeposits : [];
  const recentWithdrawals = Array.isArray(user.recentWithdrawals) ? user.recentWithdrawals : [];

  if (dom.userDetailSubtitle) {
    dom.userDetailSubtitle.textContent = `${user.email || '-'} • UID ${user.userId || '-'}`;
  }

  dom.userDetailContent.innerHTML = `
    <div class="metric-grid">
      <article class="metric-item"><p class="text-xs text-slate-400">Total Orders</p><p class="mt-1 text-lg font-semibold">${formatNumber(totals.totalOrders || 0, 0)}</p></article>
      <article class="metric-item"><p class="text-xs text-slate-400">Total Trades</p><p class="mt-1 text-lg font-semibold">${formatNumber(totals.totalTrades || 0, 0)}</p></article>
      <article class="metric-item"><p class="text-xs text-slate-400">Total Deposit</p><p class="mt-1 text-lg font-semibold">${formatNumber(totals.totalDeposit || 0, 4)}</p></article>
      <article class="metric-item"><p class="text-xs text-slate-400">Total Withdrawals</p><p class="mt-1 text-lg font-semibold">${formatNumber(totals.totalWithdrawals || 0, 4)}</p></article>
      <article class="metric-item"><p class="text-xs text-slate-400">Available Balance</p><p class="mt-1 text-lg font-semibold">${formatNumber(walletBalances.available || 0, 4)}</p></article>
      <article class="metric-item"><p class="text-xs text-slate-400">Locked Balance</p><p class="mt-1 text-lg font-semibold">${formatNumber(walletBalances.locked || 0, 4)}</p></article>
    </div>
    <div class="mt-3 grid gap-3 lg:grid-cols-2">
      <article class="list-item">
        <h4 class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Identity</h4>
        <p class="text-sm">KYC: ${statusBadge(kyc.status || 'PENDING')}</p>
        <p class="mt-1 text-xs text-slate-300">Name: ${escapeHtml(kyc.fullName || '-')}</p>
        <p class="mt-1 text-xs text-slate-400">Aadhaar: ${escapeHtml(kyc.aadhaarNumber || '-')}</p>
        <p class="mt-1 text-xs text-slate-400">PAN: ${escapeHtml(kyc.panNumber || '-')}</p>
      </article>
      <article class="list-item">
        <h4 class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Access</h4>
        <p class="text-xs text-slate-300">2FA: ${statusBadge(user.twoFactorEnabled ? 'ENABLED' : 'DISABLED')}</p>
        <p class="mt-1 text-xs text-slate-400">Status: ${statusBadge(user.status || 'ACTIVE')}</p>
        <p class="mt-1 text-xs text-slate-400">Role: ${statusBadge(user.role || 'USER')}</p>
      </article>
    </div>
    <div class="mt-3 grid gap-3 lg:grid-cols-2">
      <article class="list-item">
        <h4 class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Recent Deposits</h4>
        ${(recentDeposits.slice(0, 5).map((row) => `<p class="text-xs text-slate-300">${escapeHtml(row.id || '-')} • ${formatNumber(row.amount || 0, 4)} • ${escapeHtml(row.status || '-')}</p>`).join('')) || '<p class="text-xs text-slate-500">No deposits.</p>'}
      </article>
      <article class="list-item">
        <h4 class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Recent Withdrawals</h4>
        ${(recentWithdrawals.slice(0, 5).map((row) => `<p class="text-xs text-slate-300">${escapeHtml(row.id || '-')} • ${formatNumber(row.amount || 0, 4)} • ${escapeHtml(row.status || '-')}</p>`).join('')) || '<p class="text-xs text-slate-500">No withdrawals.</p>'}
      </article>
    </div>
  `;
}

async function ensureAdminSession() {
  const payload = await apiRequest('/auth/me');
  state.admin = payload.admin;
  dom.adminIdentity.textContent = `${state.admin.email} • ${state.admin.role}`;
}

async function loadOverview() {
  const [payload, kpiPayload, notificationsPayload, referralPayload, loginHistoryPayload] = await Promise.all([
    apiRequest('/dashboard/overview'),
    apiRequestOptional('/dashboard/kpis', { kpis: {} }),
    apiRequestOptional('/notifications?limit=8', { notifications: [] }),
    apiRequestOptional('/referrals/overview', {}),
    apiRequestOptional('/security/login-history?limit=10', { items: [] })
  ]);

  const revenue = payload.revenue || {};
  const wallet = payload.wallet || {};
  const monitoring = payload.monitoring || {};

  renderCards('overviewCards', [
    {
      label: 'Revenue Today',
      value: `₹${formatNumber(revenue.totalRevenue?.today || 0, 2)}`,
      meta: `Week: ₹${formatNumber(revenue.totalRevenue?.week || 0, 2)}`
    },
    {
      label: 'Revenue Month',
      value: `₹${formatNumber(revenue.totalRevenue?.month || 0, 2)}`,
      meta: `Spot Fees: ₹${formatNumber(revenue.spotFeeEarnings || 0, 2)}`
    },
    {
      label: 'Trading Volume',
      value: `USDT ${formatNumber(revenue.totalTradingVolume || 0, 2)}`,
      meta: `Active users: ${Number(revenue.totalActiveUsers || 0)}`
    },
    {
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

  renderExecutiveKpis(kpiPayload.kpis || {});
  renderNotificationsFeed(notificationsPayload);
  renderReferralSummary(referralPayload);
  renderAdminLoginHistory(loginHistoryPayload);
}

async function loadUsers(options = {}) {
  const rawSearch = options?.search ?? document.getElementById('userSearchInput').value ?? '';
  const search = String(rawSearch).trim();
  const searchByEmail = search.includes('@');
  const query = new URLSearchParams();
  if (searchByEmail) {
    query.set('email', search);
  } else if (search) {
    query.set('uid', search);
  }
  const queryString = query.toString();
  const payload = await apiRequest(`/users${queryString ? `?${queryString}` : ''}`);

  state.users = Array.isArray(payload.users) ? payload.users : [];
  const body = document.getElementById('usersTableBody');
  body.innerHTML = state.users
    .map(
      (user) => `
      <tr>
        <td class="admin-td">${user.userId}</td>
        <td class="admin-td">${user.email}</td>
        <td class="admin-td">${statusBadge(user.role)}</td>
        <td class="admin-td">${statusBadge(user.status)}</td>
        <td class="admin-td">${statusBadge(user.kycStatus)}</td>
        <td class="admin-td text-right">${formatNumber(user.balance, 4)}</td>
        <td class="admin-td text-right">${formatNumber(user.lockedBalance, 4)}</td>
        <td class="admin-td">
          <div class="flex flex-wrap gap-1">
            <button class="btn-primary" data-user-action="detail" data-user-id="${user.userId}">Detail</button>
            <button class="btn-secondary" data-user-action="loginAs" data-user-id="${user.userId}">Login As</button>
            <button class="btn-secondary" data-user-action="toggle2fa" data-user-id="${user.userId}">Toggle 2FA</button>
            <button class="btn-secondary" data-user-action="freeze" data-user-id="${user.userId}">Freeze</button>
            <button class="btn-secondary" data-user-action="unfreeze" data-user-id="${user.userId}">Unfreeze</button>
            <button class="btn-danger" data-user-action="ban" data-user-id="${user.userId}">Ban</button>
            <button class="btn-secondary" data-user-action="adjust" data-user-id="${user.userId}">Adjust</button>
            <button class="btn-secondary" data-user-action="reset" data-user-id="${user.userId}">Reset Pass</button>
            <button class="btn-secondary" data-user-action="kyc" data-user-id="${user.userId}">KYC</button>
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
        depositAddresses: {
          TRC20: '',
          ERC20: '',
          BEP20: ''
        },
        minDepositConfirmations: {
          TRC20: 20,
          ERC20: 12,
          BEP20: 15
        }
      }
    }))
  ]);

  const depositRows = Array.isArray(deposits.deposits) ? deposits.deposits : [];
  const withdrawalRows = Array.isArray(withdrawals.withdrawals) ? withdrawals.withdrawals : [];
  const pendingDeposits = depositRows.filter((row) => String(row.status || '').toUpperCase() === 'PENDING');
  const pendingDepositAmount = pendingDeposits.reduce((sum, row) => sum + Number(row.amount || 0), 0);

  renderCards('walletCards', [
    { label: 'Total Balance', value: `₹${formatNumber(overview.totalBalance || 0, 2)}` },
    { label: 'Locked Balance', value: `₹${formatNumber(overview.totalLockedBalance || 0, 2)}` },
    { label: 'Pending Deposits', value: `${pendingDeposits.length}`, meta: `Amount: ${formatNumber(pendingDepositAmount || 0, 6)}` },
    { label: 'Pending Amount', value: `₹${formatNumber(overview.pendingWithdrawalAmount || 0, 2)}` }
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

async function loadRevenue() {
  const payload = await apiRequest('/revenue/summary');

  renderCards('revenueCards', [
    { label: 'Total Revenue (Today)', value: `₹${formatNumber(payload.totalRevenue?.today || 0, 2)}` },
    { label: 'Total Revenue (Week)', value: `₹${formatNumber(payload.totalRevenue?.week || 0, 2)}` },
    { label: 'Total Revenue (Month)', value: `₹${formatNumber(payload.totalRevenue?.month || 0, 2)}` },
    { label: 'Spot Fee Earnings', value: `₹${formatNumber(payload.spotFeeEarnings || 0, 2)}` },
    { label: 'P2P Earnings', value: `₹${formatNumber(payload.p2pEarnings || 0, 2)}` },
    { label: 'Withdrawal Fee Earnings', value: `₹${formatNumber(payload.withdrawalFeeEarnings || 0, 2)}` }
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

async function loadSupport() {
  const payload = await apiRequest('/support/tickets?limit=30');
  const tickets = Array.isArray(payload.tickets) ? payload.tickets : [];
  const list = document.getElementById('supportTicketsList');

  list.innerHTML = tickets
    .map(
      (ticket) => `
      <article class="list-item">
        <div class="flex items-start justify-between gap-2">
          <div>
            <p class="text-sm font-semibold">${ticket.subject || ticket.id}</p>
            <p class="text-xs text-slate-400">${ticket.id} • User: ${ticket.userId || '-'}</p>
          </div>
          ${statusBadge(ticket.status || 'OPEN')}
        </div>
        <p class="mt-2 text-xs text-slate-500">Assigned: ${ticket.assignedTo || 'Unassigned'}</p>
        <p class="mt-1 text-xs text-slate-500">Updated: ${formatDate(ticket.updatedAt)}</p>
      </article>
    `
    )
    .join('');

  if (tickets.length === 0) {
    list.innerHTML = '<p class="text-sm text-slate-500">No support tickets found.</p>';
  }
}

async function loadMonitoring() {
  const [overview, apiLogs] = await Promise.all([
    apiRequest('/monitoring/overview'),
    apiRequest('/monitoring/api-logs?limit=30')
  ]);

  renderCards('monitoringCards', [
    { label: 'Active Users', value: Number(overview.activeUsers || 0) },
    { label: 'Active Admins', value: Number(overview.activeAdmins || 0) },
    { label: 'Failed Logins (10m)', value: Number(overview.failedLoginAttemptsLast10Min || 0) },
    { label: 'API Requests (10m)', value: Number(overview.apiRequestsLast10Min || 0), meta: `DB: ${overview.dbConnected ? 'Connected' : 'Disconnected'}` }
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

async function handleUsersAction(event) {
  const button = event.target.closest('[data-user-action]');
  if (!button) {
    return;
  }

  const userId = button.getAttribute('data-user-id');
  const action = button.getAttribute('data-user-action');

  try {
    if (action === 'detail') {
      const payload = await apiRequest(`/users/${encodeURIComponent(userId)}/detail`);
      state.selectedUserDetail = payload.user || null;
      renderUserDetailModal(payload.user || {});
      setUserDetailModalOpen(true);
      return;
    }

    if (action === 'loginAs') {
      const confirmed = window.confirm('Create user impersonation session and open user area in this browser?');
      if (!confirmed) {
        return;
      }
      await apiRequest(`/users/${encodeURIComponent(userId)}/login-as`, {
        method: 'POST',
        body: JSON.stringify({})
      });
      showMessage('Impersonation session created. Open /p2p to continue as user.', 'success');
      return;
    }

    if (action === 'toggle2fa') {
      const detailPayload = await apiRequest(`/users/${encodeURIComponent(userId)}/detail`);
      const current = Boolean(detailPayload?.user?.twoFactorEnabled);
      const nextEnabled = !current;
      const confirmed = window.confirm(`${nextEnabled ? 'Enable' : 'Disable'} 2FA for user ${userId}?`);
      if (!confirmed) {
        return;
      }

      await apiRequest(`/users/${encodeURIComponent(userId)}/2fa`, {
        method: 'POST',
        body: JSON.stringify({ enabled: nextEnabled })
      });
      showMessage(`2FA ${nextEnabled ? 'enabled' : 'disabled'} for ${userId}.`, 'success');
      return;
    }

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
      await apiRequest(`/users/${encodeURIComponent(userId)}/kyc/review`, {
        method: 'POST',
        body: JSON.stringify({ decision, remarks })
      });
      showMessage('KYC review saved.', 'success');
      await loadUsers();
    }
  } catch (error) {
    showMessage(error.message || 'User action failed.', 'error');
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
    window.prompt(`Reason for ${decision}:`, decision === 'APPROVED' ? 'manual review approved' : 'manual review rejected') ||
    '';

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
  const isToggleAction = action === 'toggle';
  const isSaveAction = action === 'save';

  if (!isToggleAction && !isSaveAction) {
    return;
  }

  try {
    if (isToggleAction) {
      const enabled = button.getAttribute('data-enabled') === '1';
      setActionButtonLoading(button, true, enabled ? 'Disabling...' : 'Enabling...');
      await apiRequest(`/spot/pairs/${encodeURIComponent(symbol)}`, {
        method: 'PUT',
        body: JSON.stringify({ enabled: !enabled })
      });
      showMessage(`${symbol} ${enabled ? 'disabled' : 'enabled'} successfully.`, 'success');
      await loadSpot();
    } else if (isSaveAction) {
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
      const decisionMap = {
        'approve-ad': 'APPROVED',
        'suspend-ad': 'SUSPENDED',
        'reject-ad': 'REJECTED'
      };
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

function wireEventListeners() {
  dom.sidebarOpenBtn.addEventListener('click', () => setSidebarOpen(true));
  dom.sidebarCloseBtn.addEventListener('click', () => setSidebarOpen(false));
  dom.sidebarBackdrop.addEventListener('click', () => setSidebarOpen(false));

  dom.sidebarNav.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-view]');
    if (!button) {
      return;
    }
    await changeView(button.getAttribute('data-view'));
  });

  dom.refreshCurrentBtn.addEventListener('click', async () => {
    await loadCurrentView();
    showMessage('Section refreshed.', 'success');
  });

  dom.logoutBtn.addEventListener('click', async () => {
    try {
      await apiRequest('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({})
      });
    } catch (error) {
      // Ignore logout failure, clear local session by redirect.
    } finally {
      window.location.href = '/admin/login';
    }
  });

  if (dom.userDetailCloseBtn) {
    dom.userDetailCloseBtn.addEventListener('click', () => setUserDetailModalOpen(false));
  }
  if (dom.userDetailBackdrop) {
    dom.userDetailBackdrop.addEventListener('click', () => setUserDetailModalOpen(false));
  }
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      setUserDetailModalOpen(false);
    }
  });

  document.getElementById('usersTableBody').addEventListener('click', handleUsersAction);
  document.getElementById('depositsList').addEventListener('click', handleDepositAction);
  document.getElementById('withdrawalsList').addEventListener('click', handleWithdrawalAction);
  document.getElementById('spotPairsTableBody').addEventListener('click', handleSpotAction);
  document.getElementById('p2pAdsList').addEventListener('click', handleP2PActions);
  document.getElementById('p2pDisputesList').addEventListener('click', handleP2PActions);

  document.getElementById('userSearchBtn').addEventListener('click', async () => {
    await loadUsers();
  });
  document.getElementById('userSearchInput').addEventListener('keydown', async (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      await loadUsers();
    }
  });
  document.getElementById('userSearchResetBtn').addEventListener('click', async () => {
    document.getElementById('userSearchInput').value = '';
    await loadUsers({ search: '' });
  });
  document.getElementById('usersReloadBtn').addEventListener('click', async () => {
    await loadUsers();
  });

  document.getElementById('walletDepositsReloadBtn').addEventListener('click', async () => {
    await loadWallet();
  });

  document.getElementById('walletWithdrawalsReloadBtn').addEventListener('click', async () => {
    await loadWallet();
  });

  document.getElementById('walletDepositStatusFilter').addEventListener('change', async () => {
    await loadWallet();
  });

  document.getElementById('walletWithdrawalStatusFilter').addEventListener('change', async () => {
    await loadWallet();
  });

  document.getElementById('spotReloadBtn').addEventListener('click', async () => {
    await loadSpot();
  });

  document.getElementById('p2pReloadBtn').addEventListener('click', async () => {
    await loadP2P();
  });

  document.getElementById('complianceReloadBtn').addEventListener('click', async () => {
    await loadCompliance();
  });

  document.getElementById('supportReloadBtn').addEventListener('click', async () => {
    await loadSupport();
  });

  document.getElementById('monitoringReloadBtn').addEventListener('click', async () => {
    await loadMonitoring();
  });

  document.getElementById('auditReloadBtn').addEventListener('click', async () => {
    await loadAudit();
  });

  document.getElementById('coinConfigForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = {
      networkFee: Number(form.networkFee.value),
      minWithdrawal: Number(form.minWithdrawal.value),
      maxWithdrawal: Number(form.maxWithdrawal.value),
      withdrawalsEnabled: Boolean(form.withdrawalsEnabled.checked),
      depositsEnabled: Boolean(form.depositsEnabled.checked),
      defaultNetwork: String(form.defaultNetwork.value || 'TRC20')
        .trim()
        .toUpperCase(),
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
    };

    try {
      await apiRequest(`/wallet/config/${encodeURIComponent(String(form.coin.value || '').trim().toUpperCase())}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      showMessage('Coin wallet config updated (TRC20/ERC20/BEP20).', 'success');
      await loadWallet();
    } catch (error) {
      showMessage(error.message || 'Failed to update coin config.', 'error');
    }
  });

  document.getElementById('p2pSettingsForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = {
      p2pFeePercent: Number(form.p2pFeePercent.value),
      minOrderLimit: Number(form.minOrderLimit.value),
      maxOrderLimit: Number(form.maxOrderLimit.value),
      autoExpiryMinutes: Number(form.autoExpiryMinutes.value)
    };

    try {
      await apiRequest('/p2p/settings', {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      showMessage('P2P settings saved.', 'success');
      await loadP2P();
    } catch (error) {
      showMessage(error.message || 'Failed to save P2P settings.', 'error');
    }
  });

  document.getElementById('platformSettingsForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = {
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
    };

    try {
      await apiRequest('/settings/platform', {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      showMessage('Platform settings saved.', 'success');
    } catch (error) {
      showMessage(error.message || 'Failed to save platform settings.', 'error');
    }
  });

  document.getElementById('complianceFlagForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = {
      userId: form.userId.value,
      type: form.type.value,
      severity: form.severity.value,
      reason: form.reason.value
    };

    try {
      await apiRequest('/compliance/flags', {
        method: 'POST',
        body: JSON.stringify(payload)
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

  document.getElementById('supportReplyForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      await apiRequest(`/support/tickets/${encodeURIComponent(form.ticketId.value)}/reply`, {
        method: 'POST',
        body: JSON.stringify({ message: form.message.value })
      });
      showMessage('Ticket reply sent.', 'success');
      form.reset();
      await loadSupport();
    } catch (error) {
      showMessage(error.message || 'Failed to send reply.', 'error');
    }
  });

  document.getElementById('supportStatusForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      await apiRequest(`/support/tickets/${encodeURIComponent(form.ticketId.value)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: form.status.value })
      });
      showMessage('Ticket status updated.', 'success');
      form.reset();
      await loadSupport();
    } catch (error) {
      showMessage(error.message || 'Failed to update ticket status.', 'error');
    }
  });

  document.getElementById('supportAssignForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      await apiRequest(`/support/tickets/${encodeURIComponent(form.ticketId.value)}/assign`, {
        method: 'PATCH',
        body: JSON.stringify({ assignedTo: form.assignedTo.value })
      });
      showMessage('Ticket assigned successfully.', 'success');
      form.reset();
      await loadSupport();
    } catch (error) {
      showMessage(error.message || 'Failed to assign ticket.', 'error');
    }
  });

  const notificationForm = document.getElementById('notificationForm');
  if (notificationForm) {
    notificationForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const submitButton = form.querySelector('button[type="submit"]');

      try {
        setActionButtonLoading(submitButton, true, 'Publishing...');
        await apiRequest('/notifications', {
          method: 'POST',
          body: JSON.stringify({
            title: String(form.title.value || '').trim(),
            message: String(form.message.value || '').trim(),
            type: String(form.type.value || 'ANNOUNCEMENT').trim().toUpperCase(),
            target: String(form.target.value || 'ALL_USERS').trim().toUpperCase(),
            priority: String(form.priority.value || 'NORMAL').trim().toUpperCase()
          })
        });
        showMessage('Notification published successfully.', 'success');
        form.reset();
        const notifications = await apiRequestOptional('/notifications?limit=8', { notifications: [] });
        renderNotificationsFeed(notifications);
      } catch (error) {
        showMessage(error.message || 'Failed to publish notification.', 'error');
      } finally {
        setActionButtonLoading(submitButton, false);
      }
    });
  }
}

async function init() {
  try {
    await ensureAdminSession();
    wireEventListeners();
    await changeView('overview');
    setInterval(async () => {
      await loadCurrentView({ silent: true });
    }, 30000);
    showMessage('Admin dashboard loaded.', 'success');
  } catch (error) {
    showMessage(error.message || 'Unable to load admin dashboard.', 'error');
  }
}

init();
