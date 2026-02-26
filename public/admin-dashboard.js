const API_BASE = '/api/admin';

const state = {
  currentView: 'overview',
  admin: null,
  charts: {
    overviewRevenue: null,
    revenue: null
  },
  users: [],
  spotPairs: []
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
  logoutBtn: document.getElementById('logoutBtn')
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
      <article class="card-item">
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

async function ensureAdminSession() {
  const payload = await apiRequest('/auth/me');
  state.admin = payload.admin;
  dom.adminIdentity.textContent = `${state.admin.email} • ${state.admin.role}`;
}

async function loadOverview() {
  const payload = await apiRequest('/dashboard/overview');

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
}

async function loadUsers(options = {}) {
  const search = options?.search ?? document.getElementById('userSearchInput').value.trim();
  const query = search ? `?email=${encodeURIComponent(search)}` : '';
  const payload = await apiRequest(`/users${query}`);

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
  const [overview, withdrawals, hotBalances] = await Promise.all([
    apiRequest('/wallet/overview'),
    apiRequest('/wallet/withdrawals?limit=20'),
    apiRequest('/wallet/hot-balances')
  ]);

  renderCards('walletCards', [
    { label: 'Total Balance', value: `₹${formatNumber(overview.totalBalance || 0, 2)}` },
    { label: 'Locked Balance', value: `₹${formatNumber(overview.totalLockedBalance || 0, 2)}` },
    { label: 'Pending Withdrawals', value: Number(overview.pendingWithdrawals || 0) },
    { label: 'Pending Amount', value: `₹${formatNumber(overview.pendingWithdrawalAmount || 0, 2)}` }
  ]);

  const withdrawalsList = document.getElementById('withdrawalsList');
  const withdrawalRows = Array.isArray(withdrawals.withdrawals) ? withdrawals.withdrawals : [];
  withdrawalsList.innerHTML = withdrawalRows
    .map(
      (row) => `
      <article class="list-item">
        <div class="flex items-start justify-between gap-2">
          <div>
            <p class="text-sm font-semibold">${row.id}</p>
            <p class="text-xs text-slate-400">User: ${row.userId || '-'}</p>
            <p class="text-xs text-slate-500">${formatDate(row.createdAt)}</p>
          </div>
          ${statusBadge(row.status || 'PENDING')}
        </div>
        <p class="mt-2 text-sm text-slate-200">${row.coin || 'USDT'} • ${formatNumber(row.amount || 0, 6)}</p>
        <div class="mt-2 flex gap-2">
          <button class="btn-primary" data-withdrawal-action="approve" data-withdrawal-id="${row.id}">Approve</button>
          <button class="btn-danger" data-withdrawal-action="reject" data-withdrawal-id="${row.id}">Reject</button>
        </div>
      </article>
    `
    )
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
  if (!button) {
    return;
  }
  const action = button.getAttribute('data-withdrawal-action');
  const withdrawalId = button.getAttribute('data-withdrawal-id');
  const decision = action === 'approve' ? 'APPROVED' : 'REJECTED';
  const reason = window.prompt(`Reason for ${decision}:`, decision === 'APPROVED' ? 'manual review approved' : 'manual review rejected') || '';

  try {
    await apiRequest(`/wallet/withdrawals/${encodeURIComponent(withdrawalId)}/review`, {
      method: 'POST',
      body: JSON.stringify({ decision, reason })
    });
    showMessage(`Withdrawal ${decision.toLowerCase()} successfully.`, 'success');
    await loadWallet();
  } catch (error) {
    showMessage(error.message || 'Withdrawal action failed.', 'error');
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
      await apiRequest(`/spot/pairs/${encodeURIComponent(symbol)}`, {
        method: 'PUT',
        body: JSON.stringify({ enabled: !enabled })
      });
      showMessage(`${symbol} ${enabled ? 'disabled' : 'enabled'} successfully.`, 'success');
      await loadSpot();
      return;
    }

    if (action === 'save') {
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

  document.getElementById('usersTableBody').addEventListener('click', handleUsersAction);
  document.getElementById('withdrawalsList').addEventListener('click', handleWithdrawalAction);
  document.getElementById('spotPairsTableBody').addEventListener('click', handleSpotAction);
  document.getElementById('p2pAdsList').addEventListener('click', handleP2PActions);
  document.getElementById('p2pDisputesList').addEventListener('click', handleP2PActions);

  document.getElementById('userSearchBtn').addEventListener('click', async () => {
    await loadUsers();
  });
  document.getElementById('userSearchResetBtn').addEventListener('click', async () => {
    document.getElementById('userSearchInput').value = '';
    await loadUsers({ search: '' });
  });
  document.getElementById('usersReloadBtn').addEventListener('click', async () => {
    await loadUsers();
  });

  document.getElementById('walletWithdrawalsReloadBtn').addEventListener('click', async () => {
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
      withdrawalsEnabled: Boolean(form.withdrawalsEnabled.checked)
    };

    try {
      await apiRequest(`/wallet/config/${encodeURIComponent(String(form.coin.value || '').trim().toUpperCase())}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      showMessage('Coin withdrawal config updated.', 'success');
      await loadWallet();
      form.reset();
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
