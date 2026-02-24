const rowsEl = document.getElementById('p2pRows');
const metaEl = document.getElementById('p2pMeta');
const sideTabs = document.getElementById('sideTabs');
const assetChipRow = document.getElementById('assetChipRow');
const assetFilter = document.getElementById('assetFilter');
const paymentFilter = document.getElementById('paymentFilter');
const amountFilter = document.getElementById('amountFilter');
const advertiserFilter = document.getElementById('advertiserFilter');
const applyFilters = document.getElementById('applyFilters');
const refreshOffers = document.getElementById('refreshOffers');
const exchangeTicker = document.getElementById('exchangeTicker');
const themeToggleBtn = document.getElementById('themeToggleBtn');

const userStatus = document.getElementById('userStatus');
const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const openAuthBtn = document.getElementById('openAuthBtn');
const closeAuthBtn = document.getElementById('closeAuthBtn');
const authModal = document.getElementById('authModal');
const authBackdrop = document.getElementById('authBackdrop');

const liveOrdersMeta = document.getElementById('liveOrdersMeta');
const liveOrdersRows = document.getElementById('liveOrdersRows');
const orderReferenceInput = document.getElementById('orderReferenceInput');
const joinByRefBtn = document.getElementById('joinByRefBtn');

const orderModal = document.getElementById('orderModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const closeModalBackdrop = document.getElementById('closeModalBackdrop');

const orderRef = document.getElementById('orderRef');
const orderStatus = document.getElementById('orderStatus');
const orderTimer = document.getElementById('orderTimer');
const orderMerchant = document.getElementById('orderMerchant');
const orderPrice = document.getElementById('orderPrice');
const orderAmount = document.getElementById('orderAmount');
const orderAssetAmount = document.getElementById('orderAssetAmount');
const orderPayment = document.getElementById('orderPayment');
const orderParticipants = document.getElementById('orderParticipants');

const markPaidBtn = document.getElementById('markPaidBtn');
const releaseBtn = document.getElementById('releaseBtn');
const cancelOrderBtn = document.getElementById('cancelOrderBtn');

const chatState = document.getElementById('chatState');
const chatMessages = document.getElementById('chatMessages');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');

let currentSide = 'buy';
let currentAsset = 'USDT';
let offersMap = new Map();
let currentUser = null;

let activeOrderId = null;
let pollingIntervalId = null;
let countdownIntervalId = null;
let orderStream = null;
let remainingSeconds = 0;
const P2P_THEME_STORAGE_KEY = 'p2p_theme_mode';

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatNumber(value) {
  return Number(value).toLocaleString('en-IN', {
    maximumFractionDigits: 6
  });
}

function formatTimer(seconds) {
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function statusLabel(status) {
  const map = {
    OPEN: 'Open',
    PAID: 'Paid',
    RELEASED: 'Released',
    CANCELLED: 'Cancelled',
    EXPIRED: 'Expired'
  };
  return map[status] || status;
}

function statusClass(status) {
  const map = {
    OPEN: 'status-open',
    PAID: 'status-paid',
    RELEASED: 'status-released',
    CANCELLED: 'status-cancelled',
    EXPIRED: 'status-expired'
  };
  return map[status] || 'status-open';
}

function setUserStatus(text, type = '') {
  if (!userStatus) {
    return;
  }
  userStatus.textContent = text;
  userStatus.className = 'user-status';
  if (type) {
    userStatus.classList.add(type);
  }
}

function applyTheme(mode, persist = true) {
  const resolved = mode === 'light' ? 'light' : 'dark';
  document.body.classList.toggle('p2p-theme-dark', resolved === 'dark');
  document.body.classList.toggle('p2p-theme-light', resolved === 'light');

  if (themeToggleBtn) {
    themeToggleBtn.textContent = resolved === 'dark' ? 'Light Mode' : 'Dark Mode';
  }

  if (persist) {
    try {
      localStorage.setItem(P2P_THEME_STORAGE_KEY, resolved);
    } catch (error) {
      // Ignore storage errors.
    }
  }
}

function initTheme() {
  let storedTheme = 'dark';
  try {
    const saved = localStorage.getItem(P2P_THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') {
      storedTheme = saved;
    }
  } catch (error) {
    storedTheme = 'dark';
  }

  applyTheme(storedTheme, false);
}

function setAuthModalOpen(open) {
  if (!authModal) {
    return;
  }

  if (open) {
    authModal.classList.remove('hidden');
    authModal.setAttribute('aria-hidden', 'false');
  } else {
    authModal.classList.add('hidden');
    authModal.setAttribute('aria-hidden', 'true');
  }
}

function updateUserUi() {
  if (currentUser) {
    const displayIdentity = currentUser.email || currentUser.username || 'user';
    setUserStatus(`Logged in as ${displayIdentity}`, 'user-online');
    if (emailInput) {
      emailInput.value = currentUser.email;
    }
    if (passwordInput) {
      passwordInput.value = '';
    }
  } else {
    setUserStatus('Login required to place or join P2P orders.');
  }

  if (logoutBtn) {
    logoutBtn.style.display = currentUser ? 'inline-flex' : 'none';
  }
}

function setModalOpen(open) {
  if (!orderModal) {
    return;
  }

  if (open) {
    document.body.classList.add('p2p-order-open');
    orderModal.classList.remove('hidden');
    orderModal.setAttribute('aria-hidden', 'false');
  } else {
    document.body.classList.remove('p2p-order-open');
    orderModal.classList.add('hidden');
    orderModal.setAttribute('aria-hidden', 'true');
  }
}

function resetOrderWatch() {
  if (pollingIntervalId) {
    clearInterval(pollingIntervalId);
    pollingIntervalId = null;
  }
  if (countdownIntervalId) {
    clearInterval(countdownIntervalId);
    countdownIntervalId = null;
  }
  if (orderStream) {
    orderStream.close();
    orderStream = null;
  }
}

function closeOrderModal() {
  setModalOpen(false);
  activeOrderId = null;
  resetOrderWatch();
  if (chatMessages) {
    chatMessages.innerHTML = '';
  }
  if (chatInput) {
    chatInput.value = '';
    chatInput.disabled = false;
  }
  if (chatState) {
    chatState.textContent = 'Waiting for messages...';
  }
}

async function loadCurrentUser() {
  try {
    const response = await fetch('/api/p2p/me');
    const data = await response.json();
    currentUser = data.loggedIn ? data.user : null;
  } catch (error) {
    currentUser = null;
  }
  updateUserUi();
}

async function loginUser() {
  const email = String(emailInput?.value || '').trim();
  const password = String(passwordInput?.value || '').trim();

  try {
    const response = await fetch('/api/p2p/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Login failed.');
    }

    currentUser = data.user;
    updateUserUi();
    setAuthModalOpen(false);
    await loadOffers();
    await loadLiveOrders();
  } catch (error) {
    setUserStatus(error.message, 'user-error');
  }
}

async function logoutUser() {
  try {
    await fetch('/api/p2p/logout', { method: 'POST' });
  } finally {
    currentUser = null;
    updateUserUi();
    await loadOffers();
    await loadLiveOrders();
    closeOrderModal();
  }
}

function requireLoginNotice() {
  setUserStatus('Please login first using email and password.', 'user-error');
  setAuthModalOpen(true);
}

async function loadExchangeTicker() {
  if (!exchangeTicker) {
    return;
  }

  try {
    const response = await fetch('/api/p2p/exchange-ticker?symbols=BTCUSDT,ETHUSDT,BNBUSDT,SOLUSDT,XRPUSDT');
    const data = await response.json();

    if (!response.ok || !Array.isArray(data.ticker)) {
      throw new Error('Ticker unavailable');
    }

    exchangeTicker.innerHTML = data.ticker
      .map((item) => {
        const up = Number(item.change24h) >= 0;
        return `
          <span class="${up ? 'up' : 'down'}">
            ${item.symbol} $${formatNumber(item.lastPrice)}
            (${up ? '+' : ''}${Number(item.change24h).toFixed(2)}%)
          </span>
        `;
      })
      .join('');
  } catch (error) {
    exchangeTicker.textContent = 'Exchange feed unavailable right now.';
  }
}

function renderOffers(data) {
  offersMap = new Map();

  if (!Array.isArray(data.offers) || data.offers.length === 0) {
    rowsEl.innerHTML = '<tr><td colspan="5" class="empty-row">No offers found for selected filters.</td></tr>';
    return;
  }

  rowsEl.innerHTML = data.offers
    .map((offer, index) => {
      offersMap.set(offer.id, offer);

      const actionLabel = data.side === 'buy' ? 'Buy USDT' : 'Sell USDT';
      const isOwnAd = currentUser && offer.createdByUserId === currentUser.id;
      const payments = offer.payments.map((method) => `<span class="pay-chip">${escapeHtml(method)}</span>`).join(' ');
      const available = `${formatNumber(offer.available)} ${offer.asset}`;
      const limits = `₹${formatNumber(offer.minLimit)} - ₹${formatNumber(offer.maxLimit)}`;
      const rowClass = index === 0 ? 'top-pick-row' : '';
      const topPickTag = index === 0 ? '<p class="top-pick-label">Top Picks for New Users</p>' : '';

      return `
        <tr class="${rowClass}">
          <td>
            <p class="adv-name">${escapeHtml(offer.advertiser)}</p>
            <p class="adv-meta">${offer.orders} Order(s) | ${offer.completionRate}%</p>
          </td>
          <td class="p2p-price">₹${formatNumber(offer.price)}</td>
          <td>
            <p class="cell-main">${available}</p>
            <p class="cell-sub">${limits}</p>
          </td>
          <td>${payments}</td>
          <td>
            ${topPickTag}
            <button
              type="button"
              class="offer-action-btn ${data.side === 'buy' ? 'buy-offer-btn' : 'sell-offer-btn'}"
              data-offer-id="${offer.id}"
              ${isOwnAd ? 'disabled' : ''}
            >
              ${isOwnAd ? 'Your Ad' : currentUser ? actionLabel : 'Login First'}
            </button>
          </td>
        </tr>
      `;
    })
    .join('');
}

async function loadOffers() {
  const params = new URLSearchParams({
    side: currentSide,
    asset: currentAsset
  });

  if (paymentFilter?.value) {
    params.set('payment', paymentFilter.value);
  }
  if (amountFilter?.value) {
    params.set('amount', amountFilter.value);
  }
  if (advertiserFilter?.value.trim()) {
    params.set('advertiser', advertiserFilter.value.trim());
  }

  metaEl.textContent = 'Loading offers...';

  try {
    const response = await fetch(`/api/p2p/offers?${params.toString()}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Unable to load offers.');
    }

    renderOffers(data);
    metaEl.textContent = `${data.side.toUpperCase()} ${data.asset} offers: ${data.total} | Updated ${new Date(
      data.updatedAt
    ).toLocaleTimeString()}`;
  } catch (error) {
    rowsEl.innerHTML = '<tr><td colspan="5" class="empty-row">Unable to load offers right now.</td></tr>';
    metaEl.textContent = error.message;
  }
}

async function createOrder(offerId) {
  if (!currentUser) {
    requireLoginNotice();
    return;
  }

  const offer = offersMap.get(offerId);
  if (!offer) {
    metaEl.textContent = 'Offer unavailable. Refresh and retry.';
    return;
  }

  const amountValue = Number(amountFilter?.value || 0);
  const amountInr = amountValue > 0 ? amountValue : Number(offer.minLimit);

  try {
    const response = await fetch('/api/p2p/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ offerId, amountInr })
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Unable to create order.');
    }

    openOrder(data.order);
    await loadLiveOrders();
  } catch (error) {
    metaEl.textContent = error.message;
  }
}

function renderLiveOrders(orders) {
  if (!liveOrdersRows) {
    return;
  }

  if (!Array.isArray(orders) || orders.length === 0) {
    liveOrdersRows.innerHTML = '<tr><td colspan="6" class="empty-row">No live orders available.</td></tr>';
    return;
  }

  liveOrdersRows.innerHTML = orders
    .map((order) => {
      return `
        <tr>
          <td>${order.reference}</td>
          <td>${order.side.toUpperCase()} ${order.asset}</td>
          <td>₹${formatNumber(order.amountInr)}</td>
          <td><span class="status-pill ${statusClass(order.status)}">${statusLabel(order.status)}</span></td>
          <td>${escapeHtml(order.participantsLabel)}</td>
          <td>
            <button type="button" class="secondary-btn join-order-btn" data-order-id="${order.id}">
              ${order.isParticipant ? 'Open' : 'Join'}
            </button>
          </td>
        </tr>
      `;
    })
    .join('');
}

async function loadLiveOrders() {
  if (!liveOrdersRows || !liveOrdersMeta) {
    return;
  }

  if (!currentUser) {
    liveOrdersRows.innerHTML = '<tr><td colspan="6" class="empty-row">Login to view live orders.</td></tr>';
    liveOrdersMeta.textContent = 'Live Orders: login required';
    return;
  }

  try {
    const params = new URLSearchParams({
      side: currentSide,
      asset: currentAsset
    });
    const response = await fetch(`/api/p2p/orders/live?${params.toString()}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Unable to load live orders.');
    }

    renderLiveOrders(data.orders);
    liveOrdersMeta.textContent = `Live Orders: ${data.total}`;
  } catch (error) {
    liveOrdersRows.innerHTML = '<tr><td colspan="6" class="empty-row">Unable to load live orders.</td></tr>';
    liveOrdersMeta.textContent = error.message;
  }
}

function updateOrderUi(order) {
  orderRef.textContent = order.reference;
  orderStatus.className = `status-pill ${statusClass(order.status)}`;
  orderStatus.textContent = statusLabel(order.status);
  orderMerchant.textContent = order.advertiser;
  orderPrice.textContent = `₹${formatNumber(order.price)} / ${order.asset}`;
  orderAmount.textContent = `₹${formatNumber(order.amountInr)}`;
  orderAssetAmount.textContent = `${formatNumber(order.assetAmount)} ${order.asset}`;
  orderPayment.textContent = order.paymentMethod;
  orderParticipants.textContent = order.participantsLabel;

  remainingSeconds = Number(order.remainingSeconds || 0);
  orderTimer.textContent = formatTimer(remainingSeconds);

  const isOpen = order.status === 'OPEN';
  const isPaid = order.status === 'PAID';
  const isClosed = ['RELEASED', 'CANCELLED', 'EXPIRED'].includes(order.status);

  markPaidBtn.disabled = !isOpen;
  cancelOrderBtn.disabled = !isOpen;
  releaseBtn.disabled = !isPaid;
  chatInput.disabled = isClosed;
}

function renderMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    chatMessages.innerHTML = '<p class="chat-empty">No messages yet.</p>';
    return;
  }

  chatMessages.innerHTML = messages
    .map((msg) => {
      const cls =
        currentUser && msg.sender === currentUser.username
          ? 'chat-you'
          : msg.sender === 'System'
            ? 'chat-system'
            : 'chat-merchant';

      return `
        <article class="chat-item ${cls}">
          <p class="chat-sender">${escapeHtml(msg.sender)}</p>
          <p class="chat-text">${escapeHtml(msg.text)}</p>
          <p class="chat-time">${new Date(msg.createdAt).toLocaleTimeString()}</p>
        </article>
      `;
    })
    .join('');

  chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function loadMessages() {
  if (!activeOrderId) {
    return;
  }

  try {
    const response = await fetch(`/api/p2p/orders/${activeOrderId}/messages`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to load messages.');
    }

    renderMessages(data.messages);
    chatState.textContent = `Messages: ${data.messages.length}`;
  } catch (error) {
    chatState.textContent = error.message;
  }
}

async function loadOrderDetails() {
  if (!activeOrderId) {
    return;
  }

  try {
    const response = await fetch(`/api/p2p/orders/${activeOrderId}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to load order.');
    }
    updateOrderUi(data.order);
  } catch (error) {
    chatState.textContent = error.message;
  }
}

function openOrder(order) {
  activeOrderId = order.id;
  setModalOpen(true);
  updateOrderUi(order);
  loadMessages();

  resetOrderWatch();

  pollingIntervalId = setInterval(() => {
    loadOrderDetails();
    loadMessages();
    loadLiveOrders();
  }, 6000);

  countdownIntervalId = setInterval(() => {
    remainingSeconds = Math.max(0, remainingSeconds - 1);
    orderTimer.textContent = formatTimer(remainingSeconds);
  }, 1000);

  orderStream = new EventSource(`/api/p2p/orders/${order.id}/stream`);
  orderStream.addEventListener('order_update', (event) => {
    const payload = JSON.parse(event.data || '{}');
    if (payload.order) {
      updateOrderUi(payload.order);
    }
  });
  orderStream.addEventListener('message_update', (event) => {
    const payload = JSON.parse(event.data || '{}');
    if (payload.messages) {
      renderMessages(payload.messages);
      chatState.textContent = `Messages: ${payload.messages.length}`;
    }
  });
}

async function joinOrderById(orderId) {
  if (!liveOrdersMeta) {
    return;
  }

  if (!currentUser) {
    requireLoginNotice();
    return;
  }

  try {
    const response = await fetch(`/api/p2p/orders/${orderId}/join`, { method: 'POST' });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Unable to join order.');
    }
    openOrder(data.order);
    await loadLiveOrders();
  } catch (error) {
    liveOrdersMeta.textContent = error.message;
  }
}

async function joinOrderByReference() {
  if (!liveOrdersMeta) {
    return;
  }

  if (!currentUser) {
    requireLoginNotice();
    return;
  }

  const reference = String(orderReferenceInput?.value || '').trim();
  if (!reference) {
    liveOrdersMeta.textContent = 'Enter order reference first.';
    return;
  }

  try {
    const response = await fetch(`/api/p2p/orders/by-reference/${encodeURIComponent(reference)}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Unable to fetch order.');
    }
    openOrder(data.order);
    liveOrdersMeta.textContent = `Joined order ${data.order.reference}`;
  } catch (error) {
    liveOrdersMeta.textContent = error.message;
  }
}

async function updateOrderStatus(action) {
  if (!activeOrderId) {
    return;
  }

  try {
    const response = await fetch(`/api/p2p/orders/${activeOrderId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Unable to update order.');
    }

    updateOrderUi(data.order);
    await loadMessages();
    await loadLiveOrders();
  } catch (error) {
    chatState.textContent = error.message;
  }
}

if (rowsEl) {
  rowsEl.addEventListener('click', (event) => {
    const actionBtn = event.target.closest('.offer-action-btn');
    if (!actionBtn) {
      return;
    }
    createOrder(actionBtn.dataset.offerId);
  });
}

if (liveOrdersRows) {
  liveOrdersRows.addEventListener('click', (event) => {
    const joinBtn = event.target.closest('.join-order-btn');
    if (!joinBtn) {
      return;
    }
    joinOrderById(joinBtn.dataset.orderId);
  });
}

if (sideTabs) {
  sideTabs.addEventListener('click', (event) => {
    const tab = event.target.closest('.side-tab');
    if (!tab) {
      return;
    }

    currentSide = tab.dataset.side === 'sell' ? 'sell' : 'buy';
    sideTabs.querySelectorAll('.side-tab').forEach((btn) => {
      btn.classList.toggle('active', btn === tab);
    });
    loadOffers();
    loadLiveOrders();
  });
}

if (assetChipRow) {
  assetChipRow.addEventListener('click', (event) => {
    const chip = event.target.closest('.asset-chip');
    if (!chip) {
      return;
    }

    currentAsset = chip.dataset.asset;
    if (assetFilter) {
      assetFilter.value = currentAsset;
    }

    assetChipRow.querySelectorAll('.asset-chip').forEach((btn) => {
      btn.classList.toggle('active', btn === chip);
    });

    loadOffers();
    loadLiveOrders();
  });
}

if (applyFilters) {
  applyFilters.addEventListener('click', () => {
    loadOffers();
    loadLiveOrders();
  });
}

if (refreshOffers) {
  refreshOffers.addEventListener('click', () => {
    loadOffers();
    loadLiveOrders();
    loadExchangeTicker();
  });
}

if (loginBtn) {
  loginBtn.addEventListener('click', loginUser);
}
if (logoutBtn) {
  logoutBtn.addEventListener('click', logoutUser);
}
if (openAuthBtn) {
  openAuthBtn.addEventListener('click', () => setAuthModalOpen(true));
}
if (closeAuthBtn) {
  closeAuthBtn.addEventListener('click', () => setAuthModalOpen(false));
}
if (authBackdrop) {
  authBackdrop.addEventListener('click', () => setAuthModalOpen(false));
}
if (emailInput) {
  emailInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      loginUser();
    }
  });
}
if (passwordInput) {
  passwordInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      loginUser();
    }
  });
}

if (joinByRefBtn) {
  joinByRefBtn.addEventListener('click', joinOrderByReference);
}
if (orderReferenceInput) {
  orderReferenceInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      joinOrderByReference();
    }
  });
}

if (closeModalBtn) {
  closeModalBtn.addEventListener('click', closeOrderModal);
}
if (closeModalBackdrop) {
  closeModalBackdrop.addEventListener('click', closeOrderModal);
}
if (markPaidBtn) {
  markPaidBtn.addEventListener('click', () => updateOrderStatus('mark_paid'));
}
if (releaseBtn) {
  releaseBtn.addEventListener('click', () => updateOrderStatus('release'));
}
if (cancelOrderBtn) {
  cancelOrderBtn.addEventListener('click', () => updateOrderStatus('cancel'));
}

if (chatForm) {
  chatForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!activeOrderId || !chatInput?.value.trim()) {
      return;
    }

    const text = chatInput.value.trim();
    chatInput.value = '';

    try {
      const response = await fetch(`/api/p2p/orders/${activeOrderId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Message failed.');
      }
      renderMessages(data.messages);
      chatState.textContent = 'Message delivered';
    } catch (error) {
      chatState.textContent = error.message;
    }
  });
}

if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', () => {
    const nextTheme = document.body.classList.contains('p2p-theme-dark') ? 'light' : 'dark';
    applyTheme(nextTheme);
  });
}

(async function init() {
  initTheme();
  await loadCurrentUser();
  await loadOffers();
  await loadLiveOrders();
  await loadExchangeTicker();
})();

setInterval(() => {
  if (currentUser && !activeOrderId && liveOrdersRows && liveOrdersMeta) {
    loadLiveOrders();
  }
}, 9000);

setInterval(loadExchangeTicker, 7000);
