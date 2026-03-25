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
  adminusers: loadAdminUsers,
  'user-profile': loadUserProfilePanel
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

// Replaces window.prompt() with inline modal
function askRemarks(title = 'Add Remarks', desc = 'Optional', defaultVal = '') {
  return new Promise((resolve) => {
    const modal = document.getElementById('remarksModal');
    const input = document.getElementById('remarksModalInput');
    document.getElementById('remarksModalTitle').textContent = title;
    document.getElementById('remarksModalDesc').textContent = desc;
    input.value = defaultVal;
    modal.style.display = 'flex';

    function close(val) {
      modal.style.display = 'none';
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
      input.removeEventListener('keydown', onKey);
      resolve(val);
    }
    const okBtn = document.getElementById('remarksModalOk');
    const cancelBtn = document.getElementById('remarksModalCancel');
    const onOk = () => close(input.value || '');
    const onCancel = () => close(null);
    const onKey = (e) => { if (e.key === 'Enter') close(input.value || ''); if (e.key === 'Escape') close(null); };
    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
    input.addEventListener('keydown', onKey);
    setTimeout(() => input.focus(), 50);
  });
}

function escapeHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

async function apiRequestOptional(path, fallback = {}, options = {}) {
  try {
    return await apiRequest(path, options);
  } catch {
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

// Donut/Ring chart helper using Chart.js
const _donutInstances = {};
function drawDonut(canvasId, values, labels, colors) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  if (_donutInstances[canvasId]) { _donutInstances[canvasId].destroy(); }
  const total = values.reduce((a,b)=>a+b,0);
  const data = total === 0 ? values.map(()=>1) : values;
  _donutInstances[canvasId] = new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderColor: '#0f172a', borderWidth: 3, hoverOffset: 6 }] },
    options: {
      responsive: false,
      cutout: '72%',
      plugins: { legend: { display: false }, tooltip: {
        callbacks: { label: (i) => ` ${i.label}: ₹${(i.raw).toLocaleString('en-IN',{minimumFractionDigits:2})}` }
      }}
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

  const health = document.getElementById('overviewHealth');
  health.innerHTML = [
    ['DB', monitoring.dbConnected ? '🟢 Connected' : '🔴 Down'],
    ['Active Users', Number(monitoring.activeUsers || 0)],
    ['Active Admins', Number(monitoring.activeAdmins || 0)],
    ['Failed Logins (10m)', Number(monitoring.failedLoginAttemptsLast10Min || 0)],
    ['API Req (10m)', Number(monitoring.apiRequestsLast10Min || 0)]
  ]
    .map(([key, value]) => `
      <div class="rounded-xl bg-slate-950/60 px-3 py-2 flex flex-col gap-0.5">
        <dt class="text-xs text-slate-400">${key}</dt>
        <dd class="font-semibold text-slate-100">${value}</dd>
      </div>
    `).join('');

  // ── Extra stats (parallel, non-blocking) ─────────────────────────────────
  const [usersPayload, kycPayload, wdPayload, p2pPayload, ticketsPayload] = await Promise.all([
    apiRequestOptional('/users?limit=200', { users: [] }),
    apiRequestOptional('/users?limit=200&kycStatus=PENDING_REVIEW', { users: [] }),
    apiRequestOptional('/wallet/withdrawals?status=PENDING&limit=100', { withdrawals: [] }),
    apiRequestOptional('/p2p/disputes?limit=100', { disputes: [] }),
    apiRequestOptional('/support/tickets?status=OPEN&limit=100', { tickets: [] })
  ]);

  const users = Array.isArray(usersPayload.users) ? usersPayload.users : [];
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.status === 'ACTIVE').length;
  const frozenUsers = users.filter(u => u.status === 'FROZEN').length;
  const bannedUsers = users.filter(u => u.status === 'BANNED').length;
  const kycVerified = users.filter(u => u.kycStatus === 'VERIFIED' || u.kycStatus === 'APPROVED').length;
  const kycPending = (kycPayload.users || []).length;

  // Donut chart — user distribution
  document.getElementById('donutTotalUsers').textContent = totalUsers;
  const donutCtx = document.getElementById('userDonutChart').getContext('2d');
  if (window._userDonutChart) window._userDonutChart.destroy();
  window._userDonutChart = new Chart(donutCtx, {
    type: 'doughnut',
    data: {
      labels: ['Active', 'Frozen', 'Banned', 'Other'],
      datasets: [{
        data: [activeUsers, frozenUsers, bannedUsers, Math.max(0, totalUsers - activeUsers - frozenUsers - bannedUsers)],
        backgroundColor: ['#22c55e', '#f59e0b', '#ef4444', '#475569'],
        borderWidth: 0,
        hoverOffset: 6
      }]
    },
    options: {
      cutout: '72%',
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.raw}` } } },
      animation: { animateRotate: true, duration: 900 }
    }
  });
  document.getElementById('userDonutLegend').innerHTML = [
    ['#22c55e', 'Active', activeUsers],
    ['#f59e0b', 'Frozen', frozenUsers],
    ['#ef4444', 'Banned', bannedUsers]
  ].map(([color, label, val]) => `
    <div class="flex justify-between items-center">
      <span class="flex items-center gap-1.5"><span class="inline-block w-2.5 h-2.5 rounded-full" style="background:${color}"></span>${label}</span>
      <span class="font-semibold text-slate-200">${val}</span>
    </div>
  `).join('');

  // Activity rings
  const pendingWd = (wdPayload.withdrawals || []).length;
  const openDisputes = (p2pPayload.disputes || []).length;
  const openTickets = (ticketsPayload.tickets || []).length;

  function setRing(id, value, max, circumference) {
    const el = document.getElementById(id);
    if (!el) return;
    const pct = max > 0 ? Math.min(value / max, 1) : 0;
    const dash = pct * circumference;
    el.style.strokeDasharray = `${dash} ${circumference}`;
  }
  setRing('actRingKyc', kycVerified, Math.max(totalUsers, 1), 471);
  setRing('actRingTrade', Number(revenue.totalActiveUsers || 0), Math.max(totalUsers, 1), 364);
  setRing('actRingP2p', openDisputes + pendingWd, Math.max(totalUsers * 0.3, 1), 270);

  document.getElementById('legKyc').textContent = kycVerified;
  document.getElementById('legTrade').textContent = Number(revenue.totalActiveUsers || 0);
  document.getElementById('legP2p').textContent = openDisputes + pendingWd;

  // Quick stats
  document.getElementById('qs-pendingKyc').textContent = kycPending;
  document.getElementById('qs-pendingWd').textContent = pendingWd;
  document.getElementById('qs-disputes').textContent = openDisputes;
  document.getElementById('qs-tickets').textContent = openTickets;
  document.getElementById('qs-totalRevenue').textContent = `₹${formatNumber((revenue.totalRevenue?.month || 0) + (revenue.totalRevenue?.week || 0), 2)}`;
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
  const aadhaarBackContainer = document.getElementById('kycDocAadhaarBackContainer');
  const selfieContainer = document.getElementById('kycDocSelfieContainer');

  modal.style.display = 'flex';

  aadhaarContainer.innerHTML = '<p class="text-sm text-slate-500">Loading...</p>';
  if (aadhaarBackContainer) aadhaarBackContainer.innerHTML = '<p class="text-sm text-slate-500">Loading...</p>';
  selfieContainer.innerHTML = '<p class="text-sm text-slate-500">Loading...</p>';

  try {
    const data = await apiRequest(`/users/${encodeURIComponent(userId)}/kyc/documents`);

    document.getElementById('kycDocModalMeta').textContent = `User: ${userId} • Submitted: ${formatDate(data.submittedAt)}`;
    document.getElementById('kycDocStatus').textContent = data.status || 'UNKNOWN';
    document.getElementById('kycDocAadhaar').textContent = data.aadhaarMasked ? `${data.aadhaarMasked} (Last 4: ${data.aadhaarLast4 || '-'})` : '-';

    if (data.aadhaarFront) {
      aadhaarContainer.innerHTML = `<img src="${data.aadhaarFront}" alt="Aadhaar Front" class="w-full h-auto object-contain max-h-80" />`;
    } else {
      aadhaarContainer.innerHTML = '<p class="text-sm text-slate-500 p-4 text-center">No Aadhaar front available</p>';
    }

    if (aadhaarBackContainer) {
      if (data.aadhaarBack) {
        aadhaarBackContainer.innerHTML = `<img src="${data.aadhaarBack}" alt="Aadhaar Back" class="w-full h-auto object-contain max-h-80" />`;
      } else {
        aadhaarBackContainer.innerHTML = '<p class="text-sm text-slate-500 p-4 text-center">No Aadhaar back available</p>';
      }
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
    if (aadhaarBackContainer) aadhaarBackContainer.innerHTML = '';
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
      <tr>
        <td class="admin-td font-mono text-xs">${user.userId}</td>
        <td class="admin-td">${user.email}</td>
        <td class="admin-td">${statusBadge(user.role)}</td>
        <td class="admin-td">${statusBadge(user.status)}</td>
        <td class="admin-td">${statusBadge(user.kycStatus)}</td>
        <td class="admin-td text-right">${formatNumber(user.balance, 4)}</td>
        <td class="admin-td text-right">${formatNumber(user.lockedBalance, 4)}</td>
        <td class="admin-td">
          <div class="flex flex-wrap gap-1">
            <button class="btn-secondary !text-xs !py-1" data-user-action="freeze" data-user-id="${user.userId}">Freeze</button>
            <button class="btn-secondary !text-xs !py-1" data-user-action="unfreeze" data-user-id="${user.userId}">Unfreeze</button>
            <button class="btn-danger !text-xs !py-1" data-user-action="ban" data-user-id="${user.userId}">Ban</button>
            <button class="btn-secondary !text-xs !py-1" data-user-action="adjust" data-user-id="${user.userId}">Adjust</button>
            <button class="btn-secondary !text-xs !py-1" data-user-action="reset" data-user-id="${user.userId}">Reset Pass</button>
            <button class="btn-secondary !text-xs !py-1" data-user-action="kyc" data-user-id="${user.userId}">KYC</button>
            <button class="btn-secondary !text-xs !py-1" data-user-action="view-docs" data-user-id="${user.userId}">Docs</button>
            <button class="btn-primary !text-xs !py-1" data-user-action="profile" data-user-id="${user.userId}">👤 Profile</button>
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
    { label: 'Total Balance', value: `₹${formatNumber(overview.totalBalance || 0, 2)}` },
    { label: 'Locked Balance', value: `₹${formatNumber(overview.totalLockedBalance || 0, 2)}` },
    { label: 'Pending Deposits', value: `${pendingDeposits.length}`, meta: `Amount: ${formatNumber(pendingDepositAmount || 0, 6)}` },
    { label: 'Pending Withdrawal', value: `₹${formatNumber(overview.pendingWithdrawalAmount || 0, 2)}` }
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
          <button class="btn-primary" data-p2p-action="release-order" data-order-id="${order.id}" title="Release crypto to buyer">Release to Buyer</button>
          <button class="btn-danger" data-p2p-action="cancel-order" data-order-id="${order.id}" title="Cancel order, return crypto to seller">Cancel (Seller Wins)</button>
          <button class="btn-secondary" data-p2p-action="freeze-order" data-order-id="${order.id}">Freeze</button>
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
  const query = new URLSearchParams({ limit: '30' });
  if (statusFilter) {
    query.set('status', statusFilter);
  }
  const payload = await apiRequest(`/support/tickets?${query.toString()}`);
  const tickets = Array.isArray(payload.tickets) ? payload.tickets : [];
  const list = document.getElementById('supportTicketsList');

  list.innerHTML = tickets
    .map((ticket) => {
      const messages = Array.isArray(ticket.messages) ? ticket.messages : [];
      const lastMsg = messages[messages.length - 1];
      const preview = lastMsg ? String(lastMsg.text || '').slice(0, 60) : 'No messages yet';
      const isActive = ticket.id === state.support.activeTicketId;
      return `
      <div class="rounded-xl border ${isActive ? 'border-brand bg-slate-800/80' : 'border-slate-800/60 bg-slate-900/40'} p-3 cursor-pointer hover:border-slate-700 transition-colors"
           data-support-ticket-id="${ticket.id}" onclick="openTicket('${ticket.id}')">
        <div class="flex items-start justify-between gap-2">
          <p class="text-sm font-semibold text-slate-100 truncate flex-1">${ticket.subject || 'No Subject'}</p>
          ${statusBadge(ticket.status || 'OPEN')}
        </div>
        <p class="mt-0.5 text-xs text-slate-400 truncate">${ticket.email || ticket.userId || 'Unknown user'} • ${ticket.category || 'General'}</p>
        <p class="mt-1 text-xs text-slate-500 line-clamp-2">${preview}</p>
        <p class="mt-1 text-xs text-slate-600">${formatDate(ticket.updatedAt)}</p>
      </div>
    `;
    })
    .join('');

  if (tickets.length === 0) {
    list.innerHTML = '<p class="p-4 text-sm text-slate-500 text-center">No support tickets found.</p>';
  }
}

async function openTicket(ticketId) {
  state.support.activeTicketId = ticketId;

  // Highlight active ticket
  document.querySelectorAll('[data-support-ticket-id]').forEach((el) => {
    const isActive = el.getAttribute('data-support-ticket-id') === ticketId;
    el.classList.toggle('border-brand', isActive);
    el.classList.toggle('bg-slate-800/80', isActive);
    el.classList.toggle('border-slate-800/60', !isActive);
    el.classList.toggle('bg-slate-900/40', !isActive);
  });

  document.getElementById('supportChatEmpty').classList.add('hidden');
  document.getElementById('supportChatActive').classList.remove('hidden');
  document.getElementById('supportChatActive').classList.add('flex');

  await renderTicketChat(ticketId);

  // Clear old polling and set new one
  if (state.support.pollInterval) {
    clearInterval(state.support.pollInterval);
  }
  state.support.pollInterval = setInterval(async () => {
    if (state.support.activeTicketId === ticketId && state.currentView === 'support') {
      await renderTicketChat(ticketId);
    }
  }, 30000);
}

async function renderTicketChat(ticketId) {
  try {
    const ticket = await apiRequest(`/support/tickets/${encodeURIComponent(ticketId)}`);

    document.getElementById('chatTicketSubject').textContent = ticket.subject || 'No Subject';
    document.getElementById('chatTicketMeta').textContent =
      `ID: ${ticket.id} • ${ticket.email || ticket.userId || 'Unknown'} • ${ticket.category || 'General'}`;
    document.getElementById('chatTicketStatusBadge').innerHTML = statusBadge(ticket.status || 'OPEN');

    const messages = Array.isArray(ticket.messages) ? ticket.messages : [];
    const chatMessages = document.getElementById('supportChatMessages');

    chatMessages.innerHTML = messages
      .map((msg) => {
        const isAdmin = msg.sender !== 'user';
        const bgClass = isAdmin ? 'bg-brand/10 border-brand/20' : 'bg-slate-800 border-slate-700';
        const alignClass = isAdmin ? 'ml-auto' : 'mr-auto';
        const senderLabel = isAdmin ? (msg.sender || 'Admin') : 'User';
        return `
        <div class="max-w-[80%] ${alignClass}">
          <div class="rounded-2xl border ${bgClass} px-4 py-3">
            <p class="text-xs font-semibold ${isAdmin ? 'text-brand' : 'text-slate-300'} mb-1">${senderLabel}</p>
            <p class="text-sm text-slate-200 whitespace-pre-wrap">${String(msg.text || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
          </div>
          <p class="text-xs text-slate-600 mt-1 ${isAdmin ? 'text-right' : 'text-left'}">${formatDate(msg.createdAt)}</p>
        </div>
      `;
      })
      .join('');

    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Update action buttons
    const isClosed = String(ticket.status || '').toUpperCase() === 'CLOSED';
    const closeBtn = document.getElementById('chatCloseTicketBtn');
    const resolveBtn = document.getElementById('chatResolveBtn');
    const sendBtn = document.getElementById('sendReplyBtn');
    const input = document.getElementById('supportChatInput');

    if (closeBtn) {
      closeBtn.disabled = isClosed;
      closeBtn.classList.toggle('opacity-50', isClosed);
    }
    if (resolveBtn) {
      resolveBtn.disabled = isClosed;
      resolveBtn.classList.toggle('opacity-50', isClosed);
    }
    if (sendBtn) {
      sendBtn.disabled = isClosed;
    }
    if (input) {
      input.disabled = isClosed;
      input.placeholder = isClosed ? 'Ticket is closed' : 'Type a reply...';
    }
  } catch (error) {
    showMessage(error.message || 'Failed to load ticket.', 'error');
  }
}

async function sendAdminReply() {
  const ticketId = state.support.activeTicketId;
  if (!ticketId) {
    return;
  }

  const input = document.getElementById('supportChatInput');
  const message = String(input?.value || '').trim();
  if (!message) {
    return;
  }

  const sendBtn = document.getElementById('sendReplyBtn');
  setActionButtonLoading(sendBtn, true, 'Sending...');

  try {
    await apiRequest(`/support/tickets/${encodeURIComponent(ticketId)}/reply`, {
      method: 'POST',
      body: JSON.stringify({ message })
    });
    if (input) {
      input.value = '';
    }
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
    { label: 'Total Revenue (Today)', value: `₹${formatNumber(payload.totalRevenue?.today || 0, 2)}` },
    { label: 'Total Revenue (Week)', value: `₹${formatNumber(payload.totalRevenue?.week || 0, 2)}` },
    { label: 'Total Revenue (Month)', value: `₹${formatNumber(payload.totalRevenue?.month || 0, 2)}` },
    { label: 'Spot Fee Earnings', value: `₹${formatNumber(payload.spotFeeEarnings || 0, 2)}` },
    { label: 'P2P Earnings', value: `₹${formatNumber(payload.p2pEarnings || 0, 2)}` },
    { label: 'Withdrawal Fee Earnings', value: `₹${formatNumber(payload.withdrawalFeeEarnings || 0, 2)}` }
  ]);

  // Revenue Breakdown Donut
  const spotFee   = Number(payload.spotFeeEarnings || 0);
  const p2pEarn   = Number(payload.p2pEarnings || 0);
  const wdFee     = Number(payload.withdrawalFeeEarnings || 0);
  const totalRev  = spotFee + p2pEarn + wdFee || 1;

  drawDonut('revenueDonutChart', [spotFee, p2pEarn, wdFee],
    ['Spot Fees', 'P2P', 'Withdrawal Fees'],
    ['#00E5C4','#38bdf8','#f59e0b']);
  document.getElementById('revDonutCenter').textContent = '₹' + formatNumber(spotFee+p2pEarn+wdFee, 2);
  document.getElementById('revDonutLegend').innerHTML =
    [['#00E5C4','Spot Fees',spotFee],['#38bdf8','P2P',p2pEarn],['#f59e0b','WD Fees',wdFee]]
    .map(([c,l,v])=>`<span class="flex items-center gap-1"><span style="background:${c};width:10px;height:10px;border-radius:50%;display:inline-block"></span>${l}: ₹${formatNumber(v,2)}</span>`).join('');

  // Fee Sources Ring (today / week / month)
  const today = Number(payload.totalRevenue?.today || 0);
  const week  = Number(payload.totalRevenue?.week  || 0);
  const month = Number(payload.totalRevenue?.month || 0);

  drawDonut('revFeeRingChart', [today, week, month],
    ['Today','Week','Month'],
    ['#00E5C4','#818cf8','#f472b6']);
  document.getElementById('revRingCenter').textContent = '₹' + formatNumber(month, 2);
  document.getElementById('revRingLegend').innerHTML =
    [['#00E5C4','Today',today],['#818cf8','Week',week],['#f472b6','Month',month]]
    .map(([c,l,v])=>`<span class="flex items-center gap-1"><span style="background:${c};width:10px;height:10px;border-radius:50%;display:inline-block"></span>${l}: ₹${formatNumber(v,2)}</span>`).join('');
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
        <article class="card-item">
          <p class="text-xs uppercase tracking-wide text-slate-400">${s.network || 'Scanner'}</p>
          <p class="mt-2 stat-value text-base">${statusBadge(s.status || s.connected ? 'CONNECTED' : 'ERROR')}</p>
          <p class="mt-1 text-xs text-slate-500">Block: ${s.latestBlock || s.blockHeight || '-'}</p>
        </article>
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
  const button = event.target.closest('[data-user-action]');
  if (!button) {
    return;
  }

  const userId = button.getAttribute('data-user-id');
  const action = button.getAttribute('data-user-action');

  try {
    if (action === 'freeze' || action === 'unfreeze' || action === 'ban') {
      const status = action === 'freeze' ? 'FROZEN' : action === 'ban' ? 'BANNED' : 'ACTIVE';
      const reason = await askRemarks(`Reason for ${status}`, 'Optional') || '';
      await apiRequest(`/users/${encodeURIComponent(userId)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, reason })
      });
      showMessage(`User ${status.toLowerCase()} successfully.`, 'success');
      await loadUsers();
      return;
    }

    if (action === 'adjust') {
      const amount = await askRemarks('Adjust Balance', 'Enter amount (e.g. 100 or -50)', '0');
      const reason = await askRemarks('Reason for adjustment', 'e.g. manual correction', 'manual correction') || 'manual correction';
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
      const newPassword = await askRemarks('Reset Password', 'Enter new password (min 8 chars)');
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
      const decision = await askRemarks('KYC Decision', 'Enter: APPROVED / REJECTED / PENDING', payload.kycStatus || 'PENDING');
      if (!decision) {
        return;
      }
      const remarks = await askRemarks('Remarks', 'Optional', payload.remarks || '') || '';
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
      const remarks = await askRemarks('Approval Remarks', 'Optional') || '';
      await reviewKyc(userId, 'APPROVED', remarks);
      showMessage('KYC approved.', 'success');
      await loadKyc();
      return;
    }

    if (action === 'reject') {
      const reason = await askRemarks('Rejection Reason', 'Required for rejection') || '';
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
      const remarks = await askRemarks('Approval Remarks', 'Optional') || '';
      await reviewKyc(userId, 'APPROVED', remarks);
      showMessage('KYC approved.', 'success');
      document.getElementById('kycDocModal').style.display='none';
      
      if (state.currentView === 'kyc') {
        await loadKyc();
      }
    } else if (action === 'reject') {
      const reason = await askRemarks('Rejection Reason', 'Required for rejection') || '';
      if (!reason) {
        return;
      }
      await reviewKyc(userId, 'REJECTED', reason);
      showMessage('KYC rejected.', 'success');
      document.getElementById('kycDocModal').style.display='none';
      
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
    await askRemarks(`Reason for ${decision}`, 'Optional', decision === 'APPROVED' ? 'manual review approved' : 'manual review rejected') || '';

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
    await askRemarks(`Reason for ${decision}`, 'Optional', decision === 'APPROVED' ? 'manual review approved' : 'deposit review rejected') || '';

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
      const reason = await askRemarks(`Reason for ${decision}`, 'Optional') || '';
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
      showMessage('Escrow released to buyer.', 'success');
      await loadP2P();
      return;
    }

    if (action === 'cancel-order') {
      if (!confirm('Cancel this order? Crypto will be returned to the seller.')) return;
      await apiRequest(`/p2p/orders/${encodeURIComponent(orderId)}/cancel`, {
        method: 'POST',
        body: JSON.stringify({})
      });
      showMessage('Order cancelled by admin. Crypto returned to seller.', 'success');
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
// Wire All Event Listeners
// ─────────────────────────────────────────────────────────────────────────────

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
      await apiRequest('/auth/logout', { method: 'POST', body: JSON.stringify({}) });
    } catch (_error) {
      // Ignore
    } finally {
      window.location.href = '/admin/login';
    }
  });

  // KYC modal close
  document.getElementById('kycDocModalClose').addEventListener('click', () => {
    document.getElementById('kycDocModal').style.display='none';
    
  });
  document.getElementById('kycDocModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      e.currentTarget.style.display = 'none';
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

// ─────────────────────────────────────────────────────────────────────────────
// User Profile Panel
// ─────────────────────────────────────────────────────────────────────────────

let currentProfileUserId = null;

async function openUserProfile(userId) {
  currentProfileUserId = userId;
  await changeView('user-profile');
}

async function loadUserProfilePanel() {
  if (!currentProfileUserId) return;
  const uid = currentProfileUserId;

  // Fetch all data in parallel
  const [userRes, kycRes, walletRes, tradesRes, depositsRes, withdrawalsRes, p2pRes] = await Promise.all([
    apiRequest(`/users/${encodeURIComponent(uid)}`).catch(() => ({})),
    apiRequest(`/users/${encodeURIComponent(uid)}/kyc`).catch(() => ({})),
    apiRequestOptional(`/users/${encodeURIComponent(uid)}/wallet`, {}),
    apiRequestOptional(`/users/${encodeURIComponent(uid)}/trades?limit=50`, { trades: [] }),
    apiRequestOptional(`/users/${encodeURIComponent(uid)}/deposits?limit=50`, { deposits: [] }),
    apiRequestOptional(`/users/${encodeURIComponent(uid)}/withdrawals?limit=50`, { withdrawals: [] }),
    apiRequestOptional(`/users/${encodeURIComponent(uid)}/p2p-orders?limit=50`, { orders: [] })
  ]);

  const user = userRes.user || {};
  const kyc = kycRes.kyc || kycRes || {};
  const walletData = walletRes.wallet || walletRes.balances || walletRes || {};

  // Update title
  document.getElementById('userProfileTitle').textContent = `Profile: ${user.email || uid}`;
  document.getElementById('profileCurrentStatus').textContent = user.status || '-';

  // Top stat cards
  const balances = walletData.balances || [];
  const totalUSDT = Array.isArray(balances)
    ? balances.find(b => b.coin === 'USDT')?.available || user.balance || 0
    : (walletData.USDT?.available || user.balance || 0);

  renderCards('userProfileCards', [
    { label: 'USDT Balance', value: `$${formatNumber(totalUSDT, 2)}`, meta: `Locked: $${formatNumber(user.lockedBalance || 0, 2)}` },
    { label: 'KYC Status', value: user.kycStatus || 'NONE', meta: `Role: ${user.role || '-'}` },
    { label: 'Account Status', value: user.status || '-', meta: `2FA: ${user.twoFactorEnabled ? 'ON' : 'OFF'}` },
    { label: 'Joined', value: formatDate(user.createdAt), meta: `UID: ${String(uid).slice(0,12)}...` }
  ]);

  // Overview tab
  function infoRow(label, val) {
    return `<div class="profile-info-row"><dt>${label}</dt><dd>${val || '-'}</dd></div>`;
  }
  document.getElementById('profileAccountInfo').innerHTML = [
    infoRow('User ID', `<span class="font-mono text-xs">${uid}</span>`),
    infoRow('Email', user.email),
    infoRow('Role', statusBadge(user.role)),
    infoRow('Status', statusBadge(user.status)),
    infoRow('KYC Status', statusBadge(user.kycStatus)),
    infoRow('Phone', user.phone),
    infoRow('Country', user.country),
    infoRow('Registered', formatDate(user.createdAt)),
    infoRow('Last Active', formatDate(user.lastActiveAt || user.updatedAt))
  ].join('');

  document.getElementById('profileSecurityInfo').innerHTML = [
    infoRow('2FA Enabled', user.twoFactorEnabled ? '<span class="text-green-400">Yes</span>' : '<span class="text-red-400">No</span>'),
    infoRow('Email Verified', user.emailVerified ? '<span class="text-green-400">Yes</span>' : '<span class="text-red-400">No</span>'),
    infoRow('KYC Level', kyc.level || kyc.kycLevel || '-'),
    infoRow('KYC Updated', formatDate(kyc.updatedAt || kyc.reviewedAt)),
    infoRow('Review Note', kyc.reviewNote || '-'),
    infoRow('IP Address', user.lastIp || '-'),
    infoRow('Device', user.lastDevice || '-')
  ].join('');

  // Wallet tab
  const walletRows = Array.isArray(balances) && balances.length > 0 ? balances : [
    { coin: 'USDT', available: user.balance || 0, locked: user.lockedBalance || 0 },
    { coin: 'BTC', available: walletData.BTC?.available || 0, locked: walletData.BTC?.locked || 0 },
    { coin: 'ETH', available: walletData.ETH?.available || 0, locked: walletData.ETH?.locked || 0 },
    { coin: 'BNB', available: walletData.BNB?.available || 0, locked: walletData.BNB?.locked || 0 },
    { coin: 'SOL', available: walletData.SOL?.available || 0, locked: walletData.SOL?.locked || 0 }
  ];
  document.getElementById('profileWalletTable').innerHTML = walletRows.map(b => `
    <tr>
      <td class="admin-td font-semibold">${escapeHtml(String(b.coin || '-'))}</td>
      <td class="admin-td text-right text-green-400">${formatNumber(b.available || 0, 6)}</td>
      <td class="admin-td text-right text-yellow-400">${formatNumber(b.locked || 0, 6)}</td>
      <td class="admin-td text-right">${formatNumber((b.available || 0) + (b.locked || 0), 6)}</td>
    </tr>
  `).join('') || '<tr><td class="admin-td text-slate-500" colspan="4">No wallet data</td></tr>';

  // KYC tab
  document.getElementById('profileKycInfo').innerHTML = [
    infoRow('Full Name', kyc.fullName),
    infoRow('Date of Birth', kyc.dob),
    infoRow('ID Type', kyc.idType || kyc.documentType),
    infoRow('ID Number', kyc.idNumber || kyc.documentNumber),
    infoRow('Status', statusBadge(kyc.status || user.kycStatus)),
    infoRow('Submitted', formatDate(kyc.submittedAt || kyc.createdAt)),
    infoRow('Reviewed By', kyc.reviewedBy),
    infoRow('Review Note', kyc.reviewNote)
  ].join('');

  // Trades tab
  const trades = tradesRes.trades || tradesRes.orders || [];
  document.getElementById('profileTradesTable').innerHTML = trades.length ? trades.map(t => `
    <tr>
      <td class="admin-td font-mono text-xs">${String(t.id || t._id || '-').slice(0,12)}...</td>
      <td class="admin-td">${escapeHtml(String(t.symbol || t.pair || '-'))}</td>
      <td class="admin-td">${t.side === 'BUY' ? '<span class="text-green-400">BUY</span>' : '<span class="text-red-400">SELL</span>'}</td>
      <td class="admin-td">${escapeHtml(String(t.type || '-'))}</td>
      <td class="admin-td text-right">${formatNumber(t.amount || t.quantity || 0, 6)}</td>
      <td class="admin-td text-right">${formatNumber(t.price || 0, 4)}</td>
      <td class="admin-td">${statusBadge(t.status)}</td>
      <td class="admin-td">${formatDate(t.createdAt)}</td>
    </tr>
  `).join('') : '<tr><td class="admin-td text-slate-500" colspan="8">No trade history</td></tr>';

  // Deposits tab
  const deposits = depositsRes.deposits || [];
  document.getElementById('profileDepositsTable').innerHTML = deposits.length ? deposits.map(d => `
    <tr>
      <td class="admin-td font-mono text-xs">${String(d.id || '-').slice(0,10)}...</td>
      <td class="admin-td">${escapeHtml(String(d.coin || '-'))}</td>
      <td class="admin-td">${escapeHtml(String(d.network || '-'))}</td>
      <td class="admin-td text-right text-green-400">+${formatNumber(d.amount || 0, 4)}</td>
      <td class="admin-td">${statusBadge(d.status)}</td>
      <td class="admin-td font-mono text-xs">${d.txHash ? String(d.txHash).slice(0,16)+'...' : '-'}</td>
      <td class="admin-td">${formatDate(d.createdAt)}</td>
    </tr>
  `).join('') : '<tr><td class="admin-td text-slate-500" colspan="7">No deposit history</td></tr>';

  // Withdrawals tab
  const withdrawals = withdrawalsRes.withdrawals || [];
  document.getElementById('profileWithdrawalsTable').innerHTML = withdrawals.length ? withdrawals.map(w => `
    <tr>
      <td class="admin-td font-mono text-xs">${String(w.id || '-').slice(0,10)}...</td>
      <td class="admin-td">${escapeHtml(String(w.coin || '-'))}</td>
      <td class="admin-td">${escapeHtml(String(w.network || '-'))}</td>
      <td class="admin-td text-right text-red-400">-${formatNumber(w.amount || 0, 4)}</td>
      <td class="admin-td font-mono text-xs">${w.address ? String(w.address).slice(0,14)+'...' : '-'}</td>
      <td class="admin-td">${statusBadge(w.status)}</td>
      <td class="admin-td">${formatDate(w.createdAt)}</td>
    </tr>
  `).join('') : '<tr><td class="admin-td text-slate-500" colspan="7">No withdrawal history</td></tr>';

  // P2P tab
  const p2pOrders = p2pRes.orders || [];
  document.getElementById('profileP2PTable').innerHTML = p2pOrders.length ? p2pOrders.map(o => `
    <tr>
      <td class="admin-td font-mono text-xs">${String(o.id || '-').slice(0,10)}...</td>
      <td class="admin-td">${o.isBuyer ? '<span class="text-green-400">BUY</span>' : '<span class="text-red-400">SELL</span>'}</td>
      <td class="admin-td">${escapeHtml(String(o.coin || o.asset || '-'))}</td>
      <td class="admin-td text-right">${formatNumber(o.amount || o.qty || 0, 4)}</td>
      <td class="admin-td text-right">${formatNumber(o.price || 0, 2)}</td>
      <td class="admin-td">${statusBadge(o.status)}</td>
      <td class="admin-td">${escapeHtml(String(o.counterpartyEmail || o.counterparty || '-'))}</td>
      <td class="admin-td">${formatDate(o.createdAt)}</td>
    </tr>
  `).join('') : '<tr><td class="admin-td text-slate-500" colspan="8">No P2P orders</td></tr>';
}

// Profile tab switching
document.addEventListener('click', function(e) {
  const tab = e.target.closest('.profile-tab');
  if (!tab) return;
  const tabName = tab.getAttribute('data-tab');
  document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  document.querySelectorAll('.profile-tab-content').forEach(c => c.classList.add('hidden'));
  const content = document.querySelector(`.profile-tab-content[data-content="${tabName}"]`);
  if (content) content.classList.remove('hidden');
});

// Profile action buttons
document.addEventListener('click', async function(e) {
  // Back button
  if (e.target.closest('#userProfileBackBtn')) {
    currentProfileUserId = null;
    await changeView('users');
    return;
  }

  // Profile button in users table
  const profileBtn = e.target.closest('[data-user-action="profile"]');
  if (profileBtn) {
    const uid = profileBtn.getAttribute('data-user-id');
    await openUserProfile(uid);
    return;
  }

  // Freeze/Unfreeze/Ban
  if (e.target.id === 'profileFreezeBtn' || e.target.id === 'profileUnfreezeBtn' || e.target.id === 'profileBanBtn') {
    if (!currentProfileUserId) return;
    const action = e.target.id === 'profileFreezeBtn' ? 'FROZEN' : e.target.id === 'profileBanBtn' ? 'BANNED' : 'ACTIVE';
    const reason = document.getElementById('profileStatusReason').value.trim();
    try {
      await apiRequest(`/users/${encodeURIComponent(currentProfileUserId)}/status`, {
        method: 'PATCH', body: JSON.stringify({ status: action, reason })
      });
      showMessage(`User ${action.toLowerCase()} successfully.`, 'success');
      await loadUserProfilePanel();
    } catch (err) { showMessage(err.message, 'error'); }
    return;
  }

  // KYC review
  if (e.target.id === 'profileKycSubmit') {
    if (!currentProfileUserId) return;
    const status = document.getElementById('profileKycAction').value;
    const note = document.getElementById('profileKycNote').value.trim();
    try {
      await apiRequest(`/users/${encodeURIComponent(currentProfileUserId)}/kyc/review`, {
        method: 'POST', body: JSON.stringify({ status, reviewNote: note })
      });
      showMessage('KYC review submitted.', 'success');
      await loadUserProfilePanel();
    } catch (err) { showMessage(err.message, 'error'); }
  }
});

// Adjust balance form
document.addEventListener('submit', async function(e) {
  if (e.target.id === 'profileAdjustForm') {
    e.preventDefault();
    if (!currentProfileUserId) return;
    const form = e.target;
    try {
      await apiRequest(`/users/${encodeURIComponent(currentProfileUserId)}/adjust-balance`, {
        method: 'POST',
        body: JSON.stringify({ coin: form.coin.value, amount: Number(form.amount.value), reason: form.reason.value })
      });
      showMessage('Balance adjusted.', 'success');
      form.reset();
      await loadUserProfilePanel();
    } catch (err) { showMessage(err.message, 'error'); }
  }

  if (e.target.id === 'profileResetPassForm') {
    e.preventDefault();
    if (!currentProfileUserId) return;
    const form = e.target;
    try {
      await apiRequest(`/users/${encodeURIComponent(currentProfileUserId)}/reset-password`, {
        method: 'POST', body: JSON.stringify({ newPassword: form.newPassword.value })
      });
      showMessage('Password reset done.', 'success');
      form.reset();
    } catch (err) { showMessage(err.message, 'error'); }
  }
});

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
