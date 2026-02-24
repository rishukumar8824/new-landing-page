const rowsEl = document.getElementById('p2pRows');
const metaEl = document.getElementById('p2pMeta');
const sideTabs = document.getElementById('sideTabs');
const assetFilter = document.getElementById('assetFilter');
const paymentFilter = document.getElementById('paymentFilter');
const amountFilter = document.getElementById('amountFilter');
const advertiserFilter = document.getElementById('advertiserFilter');
const applyFilters = document.getElementById('applyFilters');
const refreshOffers = document.getElementById('refreshOffers');

const userStatus = document.getElementById('userStatus');
const usernameInput = document.getElementById('usernameInput');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');

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
let activeOrderId = null;
let pollingIntervalId = null;
let countdownIntervalId = null;
let remainingSeconds = 0;
let currentUser = null;
let orderStream = null;

function formatNumber(value) {
  return Number(value).toLocaleString('en-IN');
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
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

function setModalOpen(open) {
  if (open) {
    orderModal.classList.remove('hidden');
    orderModal.setAttribute('aria-hidden', 'false');
  } else {
    orderModal.classList.add('hidden');
    orderModal.setAttribute('aria-hidden', 'true');
  }
}

function resetPolling() {
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
  chatMessages.innerHTML = '';
  chatInput.value = '';
  chatInput.disabled = false;
  chatState.textContent = 'Waiting for messages...';
  resetPolling();
}

function updateUserUi() {
  if (currentUser) {
    userStatus.textContent = `Logged in as ${currentUser.username}`;
    userStatus.className = 'user-status user-online';
  } else {
    userStatus.textContent = 'Not logged in. Login to start P2P orders.';
    userStatus.className = 'user-status';
  }
}

async function loadCurrentUser() {
  try {
    const response = await fetch('/api/p2p/me');
    const data = await response.json();

    if (data.loggedIn) {
      currentUser = data.user;
    } else {
      currentUser = null;
    }
  } catch (error) {
    currentUser = null;
  }

  updateUserUi();
}

async function loginUser() {
  const username = usernameInput.value.trim();

  try {
    const response = await fetch('/api/p2p/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Login failed.');
    }

    currentUser = data.user;
    updateUserUi();
    await loadOffers();
    await loadLiveOrders();
  } catch (error) {
    userStatus.textContent = error.message;
    userStatus.className = 'user-status user-error';
  }
}

async function logoutUser() {
  try {
    await fetch('/api/p2p/logout', { method: 'POST' });
  } finally {
    currentUser = null;
    updateUserUi();
    await loadOffers();
    liveOrdersRows.innerHTML = '<tr><td colspan="6" class="empty-row">Login to see live orders.</td></tr>';
    liveOrdersMeta.textContent = 'Live Orders: login required';
    closeOrderModal();
  }
}

function requireLoginNotice() {
  userStatus.textContent = 'Please login first to create/join order.';
  userStatus.className = 'user-status user-error';
}

function renderOffers(data) {
  offersMap = new Map();

  if (!Array.isArray(data.offers) || data.offers.length === 0) {
    rowsEl.innerHTML = '<tr><td colspan="6" class="empty-row">No offers found for selected filters.</td></tr>';
    return;
  }

  rowsEl.innerHTML = data.offers
    .map((offer) => {
      offersMap.set(offer.id, offer);

      const actionLabel = data.side === 'buy' ? 'Buy' : 'Sell';
      const actionClass = data.side === 'buy' ? 'buy-offer-btn' : 'sell-offer-btn';
      const availableLabel = `${formatNumber(offer.available)} ${offer.asset}`;
      const limitsLabel = `₹${formatNumber(offer.minLimit)} - ₹${formatNumber(offer.maxLimit)}`;
      const payments = offer.payments.map((method) => `<span class="pay-chip">${escapeHtml(method)}</span>`).join(' ');

      return `
        <tr>
          <td>
            <p class="adv-name">${escapeHtml(offer.advertiser)}</p>
            <p class="adv-meta">${offer.orders} orders | ${offer.completionRate}%</p>
          </td>
          <td class="p2p-price">₹${formatNumber(offer.price)}</td>
          <td>${availableLabel}</td>
          <td>${limitsLabel}</td>
          <td>${payments}</td>
          <td>
            <button
              class="${actionClass} action-offer-btn"
              type="button"
              data-offer-id="${offer.id}"
            >
              ${currentUser ? actionLabel : 'Login First'}
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
    asset: assetFilter.value
  });

  if (paymentFilter.value) {
    params.set('payment', paymentFilter.value);
  }
  if (amountFilter.value) {
    params.set('amount', amountFilter.value);
  }
  if (advertiserFilter.value.trim()) {
    params.set('advertiser', advertiserFilter.value.trim());
  }

  currentAsset = assetFilter.value;
  metaEl.textContent = 'Loading offers...';

  try {
    const response = await fetch(`/api/p2p/offers?${params.toString()}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch offers.');
    }

    renderOffers(data);
    const sideLabel = data.side === 'buy' ? 'Buy' : 'Sell';
    metaEl.textContent = `${sideLabel} ${data.asset} offers: ${data.total} | Updated ${new Date(data.updatedAt).toLocaleTimeString()}`;
  } catch (error) {
    rowsEl.innerHTML = '<tr><td colspan="6" class="empty-row">Unable to load offers right now.</td></tr>';
    metaEl.textContent = error.message;
  }
}

function renderLiveOrders(orders) {
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
          <td><button class="secondary-btn join-order-btn" data-order-id="${order.id}">Join</button></td>
        </tr>
      `;
    })
    .join('');
}

async function loadLiveOrders() {
  if (!currentUser) {
    liveOrdersRows.innerHTML = '<tr><td colspan="6" class="empty-row">Login to see live orders.</td></tr>';
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
      throw new Error(data.message || 'Failed to load live orders.');
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
  orderMerchant.textContent = order.advertiser;
  orderPrice.textContent = `₹${formatNumber(order.price)} / ${order.asset}`;
  orderAmount.textContent = `₹${formatNumber(order.amountInr)}`;
  orderAssetAmount.textContent = `${formatNumber(order.assetAmount)} ${order.asset}`;
  orderPayment.textContent = order.paymentMethod;
  orderParticipants.textContent = order.participantsLabel || '--';

  orderStatus.className = `status-pill ${statusClass(order.status)}`;
  orderStatus.textContent = statusLabel(order.status);

  remainingSeconds = Number(order.remainingSeconds || 0);
  orderTimer.textContent = formatTimer(remainingSeconds);

  const isOpen = order.status === 'OPEN';
  const isPaid = order.status === 'PAID';
  const isClosed = ['RELEASED', 'CANCELLED', 'EXPIRED'].includes(order.status);

  markPaidBtn.disabled = !isOpen;
  cancelOrderBtn.disabled = !isOpen;
  releaseBtn.disabled = !isPaid;
  chatInput.disabled = isClosed;

  if (isClosed) {
    chatState.textContent = `Order ${statusLabel(order.status)}.`;
  }
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
      throw new Error(data.message || 'Failed to fetch order.');
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

  resetPolling();

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
  orderStream.onerror = () => {
    chatState.textContent = 'Realtime connection interrupted. Retrying...';
  };
}

async function createOrder(offerId) {
  if (!currentUser) {
    requireLoginNotice();
    return;
  }

  const offer = offersMap.get(offerId);
  if (!offer) {
    metaEl.textContent = 'Offer not available. Refresh list.';
    return;
  }

  const enteredAmount = Number(amountFilter.value || 0);
  const defaultAmount = enteredAmount > 0 ? enteredAmount : offer.minLimit;

  try {
    const response = await fetch('/api/p2p/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        offerId,
        amountInr: defaultAmount
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Unable to create order.');
    }

    openOrder(data.order);
    loadLiveOrders();
  } catch (error) {
    metaEl.textContent = error.message;
  }
}

async function joinOrderById(orderId) {
  if (!currentUser) {
    requireLoginNotice();
    return;
  }

  try {
    const response = await fetch(`/api/p2p/orders/${orderId}/join`, {
      method: 'POST'
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Unable to join order.');
    }

    openOrder(data.order);
    loadLiveOrders();
  } catch (error) {
    liveOrdersMeta.textContent = error.message;
  }
}

async function joinOrderByReference() {
  if (!currentUser) {
    requireLoginNotice();
    return;
  }

  const reference = orderReferenceInput.value.trim();
  if (!reference) {
    liveOrdersMeta.textContent = 'Enter order reference first.';
    return;
  }

  try {
    const response = await fetch(`/api/p2p/orders/by-reference/${encodeURIComponent(reference)}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Unable to join by reference.');
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
      throw new Error(data.message || 'Unable to update order status.');
    }

    updateOrderUi(data.order);
    await loadMessages();
    await loadLiveOrders();
  } catch (error) {
    chatState.textContent = error.message;
  }
}

rowsEl.addEventListener('click', (event) => {
  const actionBtn = event.target.closest('.action-offer-btn');
  if (!actionBtn) {
    return;
  }

  createOrder(actionBtn.dataset.offerId);
});

liveOrdersRows.addEventListener('click', (event) => {
  const joinBtn = event.target.closest('.join-order-btn');
  if (!joinBtn) {
    return;
  }

  joinOrderById(joinBtn.dataset.orderId);
});

sideTabs.addEventListener('click', (event) => {
  const target = event.target.closest('.side-tab');
  if (!target) {
    return;
  }

  sideTabs.querySelectorAll('.side-tab').forEach((btn) => btn.classList.remove('active'));
  target.classList.add('active');

  currentSide = target.dataset.side;
  loadOffers();
  loadLiveOrders();
});

applyFilters.addEventListener('click', () => {
  loadOffers();
  loadLiveOrders();
});
refreshOffers.addEventListener('click', () => {
  loadOffers();
  loadLiveOrders();
});

loginBtn.addEventListener('click', loginUser);
logoutBtn.addEventListener('click', logoutUser);
joinByRefBtn.addEventListener('click', joinOrderByReference);

closeModalBtn.addEventListener('click', closeOrderModal);
closeModalBackdrop.addEventListener('click', closeOrderModal);

markPaidBtn.addEventListener('click', () => updateOrderStatus('mark_paid'));
releaseBtn.addEventListener('click', () => updateOrderStatus('release'));
cancelOrderBtn.addEventListener('click', () => updateOrderStatus('cancel'));

chatForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!activeOrderId || !chatInput.value.trim()) {
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
      throw new Error(data.message || 'Unable to send message.');
    }

    renderMessages(data.messages);
    chatState.textContent = 'Message delivered';
  } catch (error) {
    chatState.textContent = error.message;
  }
});

(async function init() {
  await loadCurrentUser();
  await loadOffers();
  await loadLiveOrders();
})();

setInterval(() => {
  if (currentUser && !activeOrderId) {
    loadLiveOrders();
  }
}, 8000);
