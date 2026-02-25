const rowsEl = document.getElementById('p2pRows');
const cardsEl = document.getElementById('p2pCards');
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
const openAuthBtnDrawer = document.getElementById('openAuthBtnDrawer');
const closeAuthBtn = document.getElementById('closeAuthBtn');
const authModal = document.getElementById('authModal');
const authBackdrop = document.getElementById('authBackdrop');

const p2pMenuToggle = document.getElementById('p2pMenuToggle');
const p2pNavClose = document.getElementById('p2pNavClose');
const p2pNavDrawer = document.getElementById('p2pNavDrawer');
const p2pNavOverlay = document.getElementById('p2pNavOverlay');
const p2pMobileBottomNav = document.querySelector('.p2p-mobile-bottom-nav');

const liveOrdersMeta = document.getElementById('liveOrdersMeta');
const liveOrdersRows = document.getElementById('liveOrdersRows');
const liveOrdersCards = document.getElementById('liveOrdersCards');
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

const dealModal = document.getElementById('dealModal');
const dealBackdrop = document.getElementById('dealBackdrop');
const dealAvatar = document.getElementById('dealAvatar');
const dealTitle = document.getElementById('dealTitle');
const dealAdvertiserMeta = document.getElementById('dealAdvertiserMeta');
const dealAvailable = document.getElementById('dealAvailable');
const dealLimits = document.getElementById('dealLimits');
const dealDuration = document.getElementById('dealDuration');
const dealPaymentPreview = document.getElementById('dealPaymentPreview');
const dealPrice = document.getElementById('dealPrice');
const dealPayAmount = document.getElementById('dealPayAmount');
const dealReceiveAmount = document.getElementById('dealReceiveAmount');
const dealPaymentSelect = document.getElementById('dealPaymentSelect');
const dealHint = document.getElementById('dealHint');
const dealConfirmBtn = document.getElementById('dealConfirmBtn');
const dealCancelBtn = document.getElementById('dealCancelBtn');

let currentSide = 'buy';
let currentAsset = 'USDT';
let offersMap = new Map();
let currentUser = null;
let activeDealOffer = null;
let dealSyncLock = false;

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
    PENDING: 'Pending',
    OPEN: 'Open',
    PAID: 'Paid',
    RELEASED: 'Released',
    CANCELLED: 'Cancelled',
    DISPUTED: 'Disputed',
    EXPIRED: 'Expired'
  };
  return map[status] || status;
}

function statusClass(status) {
  const map = {
    PENDING: 'status-open',
    OPEN: 'status-open',
    PAID: 'status-paid',
    RELEASED: 'status-released',
    CANCELLED: 'status-cancelled',
    DISPUTED: 'status-paid',
    EXPIRED: 'status-expired'
  };
  return map[status] || 'status-open';
}

function setP2PNavOpen(open) {
  if (!p2pNavDrawer || !p2pNavOverlay || !p2pMenuToggle) {
    return;
  }

  const shouldOpen = Boolean(open);
  document.body.classList.toggle('p2p-nav-open', shouldOpen);
  p2pNavDrawer.classList.toggle('is-open', shouldOpen);
  p2pNavOverlay.classList.toggle('hidden', !shouldOpen);
  p2pNavDrawer.setAttribute('aria-hidden', shouldOpen ? 'false' : 'true');
  p2pNavOverlay.setAttribute('aria-hidden', shouldOpen ? 'false' : 'true');
  p2pMenuToggle.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
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

function setDealModalOpen(open) {
  if (!dealModal) {
    return;
  }

  if (open) {
    document.body.classList.add('p2p-deal-open');
    dealModal.classList.remove('hidden');
    dealModal.setAttribute('aria-hidden', 'false');
  } else {
    document.body.classList.remove('p2p-deal-open');
    dealModal.classList.add('hidden');
    dealModal.setAttribute('aria-hidden', 'true');
  }
}

function setDealHint(text, type = '') {
  if (!dealHint) {
    return;
  }
  dealHint.textContent = text;
  dealHint.className = 'deal-hint';
  if (type) {
    dealHint.classList.add(type);
  }
}

function updateDealComputedFromPay() {
  if (!activeDealOffer || !dealPayAmount || !dealReceiveAmount) {
    return;
  }

  const price = Number(activeDealOffer.price || 0);
  const payAmount = Number(dealPayAmount.value || 0);
  if (!Number.isFinite(payAmount) || payAmount <= 0 || !Number.isFinite(price) || price <= 0) {
    dealReceiveAmount.value = '';
    return;
  }

  const receiveAmount = payAmount / price;
  dealSyncLock = true;
  dealReceiveAmount.value = receiveAmount.toFixed(6);
  dealSyncLock = false;
}

function updateDealComputedFromReceive() {
  if (!activeDealOffer || !dealPayAmount || !dealReceiveAmount) {
    return;
  }

  const price = Number(activeDealOffer.price || 0);
  const receiveAmount = Number(dealReceiveAmount.value || 0);
  if (!Number.isFinite(receiveAmount) || receiveAmount <= 0 || !Number.isFinite(price) || price <= 0) {
    dealPayAmount.value = '';
    return;
  }

  const payAmount = receiveAmount * price;
  dealSyncLock = true;
  dealPayAmount.value = payAmount.toFixed(2);
  dealSyncLock = false;
}

function refreshDealValidation() {
  if (!activeDealOffer || !dealPayAmount || !dealPaymentSelect) {
    return false;
  }

  const amountInr = Number(dealPayAmount.value || 0);
  const minLimit = Number(activeDealOffer.minLimit || 0);
  const maxLimit = Number(activeDealOffer.maxLimit || 0);
  const action = currentSide === 'sell' ? 'Sell' : 'Buy';

  if (!Number.isFinite(amountInr) || amountInr <= 0) {
    setDealHint('Enter INR amount first.');
    return false;
  }

  if (amountInr < minLimit || amountInr > maxLimit) {
    setDealHint(`Amount must be between ₹${formatNumber(minLimit)} and ₹${formatNumber(maxLimit)}.`, 'error');
    return false;
  }

  const paymentMethod = String(dealPaymentSelect.value || '').trim();
  if (!paymentMethod) {
    setDealHint('Select payment mode to continue.', 'error');
    return false;
  }

  setDealHint(`${action} ready: ₹${formatNumber(amountInr)} via ${paymentMethod}.`, 'success');
  return true;
}

function fillDealModal(offer) {
  if (!offer) {
    return;
  }

  activeDealOffer = offer;
  const action = currentSide === 'sell' ? 'Sell' : 'Buy';
  const avatarText = String(offer.advertiser || 'U').trim().slice(0, 1).toUpperCase() || 'U';

  if (dealAvatar) {
    dealAvatar.textContent = avatarText;
  }
  if (dealTitle) {
    dealTitle.textContent = offer.advertiser;
  }
  if (dealAdvertiserMeta) {
    dealAdvertiserMeta.textContent = `${offer.orders} Order(s) | ${offer.completionRate}%`;
  }
  if (dealAvailable) {
    dealAvailable.textContent = `${formatNumber(offer.available)} ${offer.asset}`;
  }
  if (dealLimits) {
    dealLimits.textContent = `₹${formatNumber(offer.minLimit)} - ₹${formatNumber(offer.maxLimit)}`;
  }
  if (dealDuration) {
    dealDuration.textContent = '15m';
  }
  if (dealPrice) {
    dealPrice.textContent = `${formatNumber(offer.price)} INR`;
  }
  if (dealConfirmBtn) {
    dealConfirmBtn.textContent = `${action} ${offer.asset}`;
    dealConfirmBtn.classList.toggle('is-sell', currentSide === 'sell');
  }

  if (dealPaymentSelect) {
    dealPaymentSelect.innerHTML = offer.payments
      .map((method) => `<option value="${escapeHtml(method)}">${escapeHtml(method)}</option>`)
      .join('');
  }

  if (dealPaymentPreview) {
    dealPaymentPreview.textContent = offer.payments[0] || '--';
  }

  const amountInput = Number(amountFilter?.value || 0);
  const defaultAmount = amountInput > 0 ? amountInput : Number(offer.minLimit || 0);
  if (dealPayAmount) {
    dealPayAmount.value = defaultAmount > 0 ? Number(defaultAmount).toFixed(2) : '';
  }

  updateDealComputedFromPay();
  refreshDealValidation();
  setDealModalOpen(true);
  dealPayAmount?.focus();
}

function closeDealModal() {
  setDealModalOpen(false);
  activeDealOffer = null;
  if (dealPayAmount) {
    dealPayAmount.value = '';
  }
  if (dealReceiveAmount) {
    dealReceiveAmount.value = '';
  }
}

function applyTheme(mode, persist = true) {
  const resolved = mode === 'light' ? 'light' : 'dark';
  document.body.classList.toggle('p2p-theme-dark', resolved === 'dark');
  document.body.classList.toggle('p2p-theme-light', resolved === 'light');

  if (themeToggleBtn) {
    themeToggleBtn.textContent = resolved === 'dark' ? 'Light' : 'Dark';
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
    setP2PNavOpen(false);
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
    closeDealModal();
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
    if (rowsEl) {
      rowsEl.innerHTML = '<tr><td colspan="6" class="empty-row">No offers found for selected filters.</td></tr>';
    }
    if (cardsEl) {
      cardsEl.innerHTML = '<article class="p2p-offer-card"><p class="empty-row">No offers found for selected filters.</p></article>';
    }
    return;
  }

  const rowsHtml = [];
  const cardsHtml = [];

  data.offers.forEach((offer, index) => {
    offersMap.set(offer.id, offer);

    const actionLabel = data.side === 'buy' ? 'Buy' : 'Sell';
    const isOwnAd = currentUser && offer.createdByUserId === currentUser.id;
    const payments = offer.payments
      .map((method, paymentIndex) => `<span class="pay-chip pay-chip-${paymentIndex % 4}">${escapeHtml(method)}</span>`)
      .join(' ');
    const quantity = `${formatNumber(offer.available)} ${offer.asset}`;
    const limits = `₹${formatNumber(offer.minLimit)} - ₹${formatNumber(offer.maxLimit)}`;
    const rowClass = index === 0 ? 'top-pick-row offer-highlight' : '';
    const topPickTag = index === 0 ? '<p class="top-pick-label">Top Picks for New Users</p>' : '';
    const actionText = isOwnAd ? 'Your Ad' : currentUser ? actionLabel : 'Login';
    const verificationBadge =
      Number(offer.completionRate || 0) >= 95
        ? '<span class="verification-badge" title="Verified">✔</span>'
        : '<span class="verification-badge muted" title="Basic">•</span>';
    const initial = String(offer.advertiser || 'U')
      .trim()
      .slice(0, 1)
      .toUpperCase();

    rowsHtml.push(`
      <tr class="${rowClass}">
        <td>
          <div class="table-user-cell">
            <span class="table-user-avatar">${escapeHtml(initial)}</span>
            <div>
              <p class="adv-name">${escapeHtml(offer.advertiser)} ${verificationBadge}</p>
              <p class="adv-meta">${offer.orders} Orders | ${offer.completionRate}%</p>
            </div>
          </div>
        </td>
        <td class="p2p-price">₹${formatNumber(offer.price)}</td>
        <td class="cell-main">${limits}</td>
        <td class="cell-main">${quantity}</td>
        <td><div class="payment-cell">${payments}</div></td>
        <td class="table-action-cell">
          ${topPickTag}
          <button
            type="button"
            class="offer-action-btn ${data.side === 'buy' ? 'buy-offer-btn' : 'sell-offer-btn'}"
            data-offer-id="${offer.id}"
            ${isOwnAd ? 'disabled' : ''}
          >
            ${actionText}
          </button>
        </td>
      </tr>
    `);

    cardsHtml.push(`
      <article class="p2p-offer-card ${rowClass}">
        <div class="p2p-card-top">
          <div class="p2p-card-user">
            <span class="card-avatar">${escapeHtml(initial)}</span>
            <div>
              <p class="p2p-card-title">${escapeHtml(offer.advertiser)} ${verificationBadge}</p>
              <p class="p2p-card-time">⏱ 15m</p>
            </div>
          </div>
          <div class="p2p-card-right">
            <p class="p2p-card-order-meta">${offer.orders} Orders (${offer.completionRate}%)</p>
            <p class="p2p-card-price"><span class="price-currency">₹</span>${formatNumber(offer.price)}</p>
          </div>
        </div>

        ${topPickTag}

        <div class="p2p-card-details">
          <p><span>Limits</span><strong>${limits}</strong></p>
          <p><span>Quantity</span><strong>${quantity}</strong></p>
        </div>

        <div class="p2p-card-footer">
          <div class="card-payment-tags">${payments}</div>
          <button
            type="button"
            class="offer-action-btn ${data.side === 'buy' ? 'buy-offer-btn' : 'sell-offer-btn'}"
            data-offer-id="${offer.id}"
            ${isOwnAd ? 'disabled' : ''}
          >
            ${actionText}
          </button>
        </div>
      </article>
    `);
  });

  if (rowsEl) {
    rowsEl.innerHTML = rowsHtml.join('');
  }
  if (cardsEl) {
    cardsEl.innerHTML = cardsHtml.join('');
  }
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

  if (metaEl) {
    metaEl.textContent = 'Loading offers...';
  }

  try {
    const response = await fetch(`/api/p2p/offers?${params.toString()}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Unable to load offers.');
    }

    renderOffers(data);
    if (metaEl) {
      metaEl.textContent = `${data.side.toUpperCase()} ${data.asset} offers: ${data.total} | Updated ${new Date(
        data.updatedAt
      ).toLocaleTimeString()}`;
    }
  } catch (error) {
    if (rowsEl) {
      rowsEl.innerHTML = '<tr><td colspan="6" class="empty-row">Unable to load offers right now.</td></tr>';
    }
    if (cardsEl) {
      cardsEl.innerHTML = '<article class="p2p-offer-card"><p class="empty-row">Unable to load offers right now.</p></article>';
    }
    if (metaEl) {
      metaEl.textContent = error.message;
    }
  }
}

async function createOrder(offerId, options = {}) {
  if (!currentUser) {
    requireLoginNotice();
    throw new Error('Please login first.');
  }

  const offer = offersMap.get(offerId);
  if (!offer) {
    if (metaEl) {
      metaEl.textContent = 'Offer unavailable. Refresh and retry.';
    }
    throw new Error('Offer unavailable.');
  }

  const amountValue = Number(options.amountInr ?? (amountFilter?.value || 0));
  const amountInr = amountValue > 0 ? amountValue : Number(offer.minLimit);
  const paymentMethod = String(options.paymentMethod || '').trim();
  const openAfterCreate = options.openAfterCreate !== false;

  try {
    const response = await fetch('/api/p2p/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ offerId, amountInr, paymentMethod })
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Unable to create order.');
    }

    if (openAfterCreate) {
      openOrder(data.order);
    }
    await loadLiveOrders();
    return data;
  } catch (error) {
    if (metaEl) {
      metaEl.textContent = error.message;
    }
    throw error;
  }
}

function openDealForOffer(offerId) {
  if (!currentUser) {
    requireLoginNotice();
    return;
  }

  const offer = offersMap.get(String(offerId || '').trim());
  if (!offer) {
    if (metaEl) {
      metaEl.textContent = 'Offer unavailable. Refresh and retry.';
    }
    return;
  }

  fillDealModal(offer);
}

async function submitDealOrder() {
  if (!currentUser) {
    requireLoginNotice();
    return;
  }

  if (!activeDealOffer || !dealConfirmBtn || !dealPayAmount || !dealPaymentSelect) {
    return;
  }

  if (!refreshDealValidation()) {
    return;
  }

  const amountInr = Number(dealPayAmount.value || 0);
  const paymentMethod = String(dealPaymentSelect.value || '').trim();

  dealConfirmBtn.disabled = true;
  const previousLabel = dealConfirmBtn.textContent;
  dealConfirmBtn.textContent = 'Processing...';

  try {
    const data = await createOrder(activeDealOffer.id, { amountInr, paymentMethod, openAfterCreate: false });
    if (!data?.order) {
      throw new Error('Unable to create order.');
    }

    setDealHint(`${data.message} Ref: ${data.order.reference}`, 'success');
    closeDealModal();
    openOrder(data.order);
  } catch (error) {
    setDealHint(error.message || 'Unable to create order.', 'error');
  } finally {
    dealConfirmBtn.disabled = false;
    dealConfirmBtn.textContent = previousLabel;
  }
}

function renderLiveOrders(orders) {
  if (!Array.isArray(orders) || orders.length === 0) {
    if (liveOrdersRows) {
      liveOrdersRows.innerHTML = '<tr><td colspan="6" class="empty-row">No live orders available.</td></tr>';
    }
    if (liveOrdersCards) {
      liveOrdersCards.innerHTML = '<article class="p2p-live-order-card"><p class="empty-row">No live orders available.</p></article>';
    }
    return;
  }

  if (liveOrdersRows) {
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

  if (liveOrdersCards) {
    liveOrdersCards.innerHTML = orders
      .map(
        (order) => `
          <article class="p2p-live-order-card">
            <div class="p2p-card-top">
              <p class="p2p-card-title">${order.reference}</p>
              <span class="status-pill ${statusClass(order.status)}">${statusLabel(order.status)}</span>
            </div>
            <div class="p2p-card-grid">
              <p>Type<strong>${order.side.toUpperCase()} ${order.asset}</strong></p>
              <p>Amount<strong>₹${formatNumber(order.amountInr)}</strong></p>
              <p>Participants<strong>${escapeHtml(order.participantsLabel)}</strong></p>
              <p>Merchant<strong>${escapeHtml(order.advertiser || '--')}</strong></p>
            </div>
            <div class="p2p-card-actions">
              <button type="button" class="secondary-btn join-order-btn" data-order-id="${order.id}">
                ${order.isParticipant ? 'Open' : 'Join'}
              </button>
            </div>
          </article>
        `
      )
      .join('');
  }
}

async function loadLiveOrders() {
  if (!liveOrdersMeta) {
    return;
  }

  if (!currentUser) {
    if (liveOrdersRows) {
      liveOrdersRows.innerHTML = '<tr><td colspan="6" class="empty-row">Login to view live orders.</td></tr>';
    }
    if (liveOrdersCards) {
      liveOrdersCards.innerHTML = '<article class="p2p-live-order-card"><p class="empty-row">Login to view live orders.</p></article>';
    }
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
    if (liveOrdersRows) {
      liveOrdersRows.innerHTML = '<tr><td colspan="6" class="empty-row">Unable to load live orders.</td></tr>';
    }
    if (liveOrdersCards) {
      liveOrdersCards.innerHTML = '<article class="p2p-live-order-card"><p class="empty-row">Unable to load live orders.</p></article>';
    }
    liveOrdersMeta.textContent = error.message;
  }
}

function updateOrderUi(order) {
  if (!order) {
    return;
  }

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

  const isOpen = order.status === 'PENDING' || order.status === 'OPEN';
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

function bindOfferActionDelegation(container) {
  if (!container) {
    return;
  }

  container.addEventListener('click', (event) => {
    const actionBtn = event.target.closest('.offer-action-btn');
    if (!actionBtn) {
      return;
    }
    openDealForOffer(actionBtn.dataset.offerId);
  });
}

bindOfferActionDelegation(rowsEl);
bindOfferActionDelegation(cardsEl);

function bindJoinOrderDelegation(container) {
  if (!container) {
    return;
  }

  container.addEventListener('click', (event) => {
    const joinBtn = event.target.closest('.join-order-btn');
    if (!joinBtn) {
      return;
    }
    joinOrderById(joinBtn.dataset.orderId);
  });
}

bindJoinOrderDelegation(liveOrdersRows);
bindJoinOrderDelegation(liveOrdersCards);

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
    closeDealModal();
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

    closeDealModal();
    loadOffers();
    loadLiveOrders();
  });
}

if (assetFilter) {
  assetFilter.addEventListener('change', () => {
    currentAsset = String(assetFilter.value || 'USDT').toUpperCase();

    if (assetChipRow) {
      assetChipRow.querySelectorAll('.asset-chip').forEach((btn) => {
        btn.classList.toggle('active', String(btn.dataset.asset || '').toUpperCase() === currentAsset);
      });
    }

    closeDealModal();
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
if (openAuthBtnDrawer) {
  openAuthBtnDrawer.addEventListener('click', () => {
    setAuthModalOpen(true);
    setP2PNavOpen(false);
  });
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

if (dealPayAmount) {
  dealPayAmount.addEventListener('input', () => {
    if (dealSyncLock) {
      return;
    }
    updateDealComputedFromPay();
    refreshDealValidation();
  });
}

if (dealReceiveAmount) {
  dealReceiveAmount.addEventListener('input', () => {
    if (dealSyncLock) {
      return;
    }
    updateDealComputedFromReceive();
    refreshDealValidation();
  });
}

if (dealPaymentSelect) {
  dealPaymentSelect.addEventListener('change', () => {
    if (dealPaymentPreview) {
      dealPaymentPreview.textContent = dealPaymentSelect.value || '--';
    }
    refreshDealValidation();
  });
}

if (dealConfirmBtn) {
  dealConfirmBtn.addEventListener('click', submitDealOrder);
}

if (dealCancelBtn) {
  dealCancelBtn.addEventListener('click', closeDealModal);
}

if (dealBackdrop) {
  dealBackdrop.addEventListener('click', closeDealModal);
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

p2pMenuToggle?.addEventListener('click', () => setP2PNavOpen(true));
p2pNavClose?.addEventListener('click', () => setP2PNavOpen(false));
p2pNavOverlay?.addEventListener('click', () => setP2PNavOpen(false));

p2pNavDrawer?.addEventListener('click', (event) => {
  const link = event.target.closest('a[href]');
  if (link) {
    setP2PNavOpen(false);
  }
});

if (p2pMobileBottomNav) {
  p2pMobileBottomNav.addEventListener('click', (event) => {
    const targetLink = event.target.closest('a');
    if (!targetLink) {
      return;
    }

    p2pMobileBottomNav.querySelectorAll('a').forEach((link) => {
      link.classList.toggle('active', link === targetLink);
      if (link === targetLink) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  });
}

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    if (dealModal && !dealModal.classList.contains('hidden')) {
      closeDealModal();
      return;
    }
    if (orderModal && !orderModal.classList.contains('hidden')) {
      closeOrderModal();
      return;
    }
    if (authModal && !authModal.classList.contains('hidden')) {
      setAuthModalOpen(false);
      return;
    }
    setP2PNavOpen(false);
  }
});

(async function init() {
  initTheme();
  await loadCurrentUser();
  await loadOffers();
  await loadLiveOrders();
  await loadExchangeTicker();
})();

setInterval(() => {
  if (currentUser && !activeOrderId && liveOrdersMeta) {
    loadLiveOrders();
  }
}, 9000);

setInterval(loadExchangeTicker, 7000);
