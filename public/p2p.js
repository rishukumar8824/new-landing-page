const BITEGIT_API = (window.BITEGIT_API_BASE || 'http://localhost:3000/api/v1');
function p2pFetch(path, opts) {
  var token = localStorage.getItem('bitegit_token') || '';
  opts = opts || {};
  var headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return fetch(BITEGIT_API + path, Object.assign({}, opts, { headers: headers, credentials: 'include' }));
}

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
const mobileCurrencyBtn = document.getElementById('mobileCurrencyBtn');
const p2pMobileBottomNav = document.querySelector('.mobile-app-nav');
const p2pBoardCard = document.querySelector('.p2p-board-card');
const ordersSection = document.getElementById('orders');
const adsSection = document.getElementById('ads');
const profileSection = document.getElementById('profile');

const liveOrdersMeta = document.getElementById('liveOrdersMeta');
const liveOrdersRows = document.getElementById('liveOrdersRows');
const liveOrdersCards = document.getElementById('liveOrdersCards');
const mobileOrdersTabs = document.getElementById('mobileOrdersTabs');
const mobileOrdersList = document.getElementById('mobileOrdersList') || document.getElementById('liveOrdersCards');

const orderModal = document.getElementById('orderModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const closeModalBackdrop = document.getElementById('closeModalBackdrop');
const orderChatBtn = document.getElementById('orderChatBtn');

const orderRef = document.getElementById('orderRef');
const orderStatus = document.getElementById('orderStatus');
const orderTimer = document.getElementById('orderTimer');
const orderMerchant = document.getElementById('orderMerchant');
const orderCounterpartyName = document.getElementById('orderCounterpartyName');
const orderCounterpartyMeta = document.getElementById('orderCounterpartyMeta');
const orderPrice = document.getElementById('orderPrice');
const orderAmount = document.getElementById('orderAmount');
const orderAssetAmount = document.getElementById('orderAssetAmount');
const orderFee = document.getElementById('orderFee');
const orderPayment = document.getElementById('orderPayment');
const orderParticipants = document.getElementById('orderParticipants');
const orderTime = document.getElementById('orderTime');

const markPaidBtn = document.getElementById('markPaidBtn');
const cancelOrderBtn = document.getElementById('cancelOrderBtn');
const paymentPanel = document.getElementById('paymentPanel');
const paymentAmountDisplay = document.getElementById('paymentAmountDisplay');
const paymentMethodDisplay = document.getElementById('paymentMethodDisplay');
const paymentInstructions = document.getElementById('paymentInstructions');
const paymentCountdown = document.getElementById('paymentCountdown');
const paidConfirmBtn = document.getElementById('paidConfirmBtn');

const cancelModal = document.getElementById('cancelModal');
const cancelModalBackdrop = document.getElementById('cancelModalBackdrop');
const cancelModalCloseBtn = document.getElementById('cancelModalCloseBtn');
const cancelReasonForm = document.getElementById('cancelReasonForm');
const cancelNoPaymentCheck = document.getElementById('cancelNoPaymentCheck');
const cancelConfirmBtn = document.getElementById('cancelConfirmBtn');

const chatState = document.getElementById('chatState');
const chatMessages = document.getElementById('chatMessages');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const chatSendBtn = document.getElementById('chatSendBtn');
const chatImageBtn = document.getElementById('chatImageBtn');
const chatImageInput = document.getElementById('chatImageInput');
const chatUploadState = document.getElementById('chatUploadState');

const imagePreviewModal = document.getElementById('imagePreviewModal');
const imagePreviewBackdrop = document.getElementById('imagePreviewBackdrop');
const imagePreviewCloseBtn = document.getElementById('imagePreviewCloseBtn');
const imagePreviewEl = document.getElementById('imagePreviewEl');

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

const kycModal = document.getElementById('kycModal');
const kycBackdrop = document.getElementById('kycBackdrop');
const kycCloseBtn = document.getElementById('kycCloseBtn');
const kycForm = document.getElementById('kycForm');
const kycStatusText = document.getElementById('kycStatusText');
const kycAadhaarInput = document.getElementById('kycAadhaarInput');
const kycAadhaarFrontInput = document.getElementById('kycAadhaarFrontInput');
const kycAadhaarFrontMeta = document.getElementById('kycAadhaarFrontMeta');
const kycSelfieInput = document.getElementById('kycSelfieInput');
const kycSelfieMeta = document.getElementById('kycSelfieMeta');
const kycConsent = document.getElementById('kycConsent');
const kycHint = document.getElementById('kycHint');
const kycSubmitBtn = document.getElementById('kycSubmitBtn');

const adCreateForm = document.getElementById('adCreateForm');
const adTypeInput = document.getElementById('adTypeInput');
const adAssetInput = document.getElementById('adAssetInput');
const adPriceInput = document.getElementById('adPriceInput');
const adAvailableInput = document.getElementById('adAvailableInput');
const adMinLimitInput = document.getElementById('adMinLimitInput');
const adMaxLimitInput = document.getElementById('adMaxLimitInput');
const adPaymentsInput = document.getElementById('adPaymentsInput');
const adCreateBtn = document.getElementById('adCreateBtn');
const adCreateMeta = document.getElementById('adCreateMeta');
const myAdsList = document.getElementById('myAdsList');
const refreshMyAdsBtn = document.getElementById('refreshMyAdsBtn');

const profileAvatar = document.getElementById('profileAvatar');
const profileName = document.getElementById('profileName');
const profileEmail = document.getElementById('profileEmail');
const profileIdentityTag = document.getElementById('profileIdentityTag');
const profileDepositBtn = document.getElementById('profileDepositBtn');
const profileKyc = document.getElementById('profileKyc');
const profileSecurity = document.getElementById('profileSecurity');
const profileTotalOrders = document.getElementById('profileTotalOrders');
const profileCompletionRate = document.getElementById('profileCompletionRate');
const profileDeposit = document.getElementById('profileDeposit');
const profileCompletedOrders = document.getElementById('profileCompletedOrders');
const profileCompletedOrders30d = document.getElementById('profileCompletedOrders30d');
const profileCompletionRate30d = document.getElementById('profileCompletionRate30d');
const profileCancelledOrders = document.getElementById('profileCancelledOrders');
const profileAvgReleaseTime = document.getElementById('profileAvgReleaseTime');
const profileAvgPaymentTime = document.getElementById('profileAvgPaymentTime');
const profileMeta = document.getElementById('profileMeta');

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
let activeOrderRole = '';
let activeOrderSnapshot = null;
let autoCancelRequested = false;
let chatUploading = false;
let messagePollTick = 0;
let mobileActiveTab = 'p2p';
let mobileOrderFilter = 'all';
const mobileOrdersCache = new Map();
let profileWalletBalance = 0;
let profileWalletLocked = 0;
let profileWalletSyncedAt = 0;
const chatMessageMap = new Map();
const chatMessageNodes = new Map();
const CHAT_IMAGE_MAX_SIZE = 3 * 1024 * 1024;
// Keep payload comfortably below default Express JSON body limit once base64 + JSON overhead is added.
const CHAT_MAX_PAYLOAD_BYTES = 60 * 1024;
const CHAT_IMAGE_ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const CHAT_PAYLOAD_PREFIX = '__P2P_MSG__:';
const P2P_THEME_STORAGE_KEY = 'p2p_theme_mode';
const KYC_REQUIRED_CODES = new Set(['KYC_REQUIRED', 'KYC_PENDING', 'KYC_REJECTED']);
const KYC_ALLOWED_FILE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const KYC_MAX_FILE_SIZE = 6 * 1024 * 1024;
const KYC_TARGET_IMAGE_BYTES = 320 * 1024;

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

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '--';
  }
  return date.toLocaleString();
}

function getPostLoginRedirectPath() {
  try {
    const params = new URLSearchParams(window.location.search);
    const redirect = String(params.get('redirect') || '').trim();
    if (!redirect) {
      return '';
    }
    if (!redirect.startsWith('/') || redirect.startsWith('//')) {
      return '';
    }
    return redirect;
  } catch (_) {
    return '';
  }
}

function syncBodyInteractionState() {
  const hasBlockingLayer =
    document.body.classList.contains('p2p-nav-open') ||
    document.body.classList.contains('p2p-order-open') ||
    document.body.classList.contains('p2p-deal-open') ||
    document.body.classList.contains('p2p-kyc-open') ||
    document.body.classList.contains('p2p-cancel-open') ||
    Boolean(authModal && !authModal.classList.contains('hidden')) ||
    Boolean(kycModal && !kycModal.classList.contains('hidden')) ||
    Boolean(imagePreviewModal && !imagePreviewModal.classList.contains('hidden'));

  document.body.style.overflow = hasBlockingLayer ? 'hidden' : 'auto';
  document.body.style.pointerEvents = 'auto';
}

function normalizeStatusForUi(status) {
  if (status === 'PENDING' || status === 'OPEN') {
    return 'CREATED';
  }
  return String(status || '').toUpperCase();
}

function statusLabel(status) {
  const map = {
    CREATED: 'Created',
    PAID: 'Paid',
    RELEASED: 'Released',
    CANCELLED: 'Cancelled',
    DISPUTED: 'Disputed',
    EXPIRED: 'Expired'
  };
  return map[normalizeStatusForUi(status)] || status;
}

function statusClass(status) {
  const map = {
    CREATED: 'status-created',
    PAID: 'status-paid',
    RELEASED: 'status-released',
    CANCELLED: 'status-cancelled',
    DISPUTED: 'status-paid',
    EXPIRED: 'status-expired'
  };
  return map[normalizeStatusForUi(status)] || 'status-created';
}

function normalizeKycStatus(status) {
  const normalized = String(status || '')
    .trim()
    .toUpperCase();
  if (['VERIFIED', 'PENDING_REVIEW', 'REJECTED', 'NOT_SUBMITTED'].includes(normalized)) {
    return normalized;
  }
  return 'NOT_SUBMITTED';
}

function getKycStatusLabel(status) {
  const normalized = normalizeKycStatus(status);
  if (normalized === 'VERIFIED') {
    return 'Verified';
  }
  if (normalized === 'PENDING_REVIEW') {
    return 'Pending Review';
  }
  if (normalized === 'REJECTED') {
    return 'Rejected';
  }
  return 'Not Submitted';
}

function getKycRequirementMessage(status) {
  const normalized = normalizeKycStatus(status);
  if (normalized === 'PENDING_REVIEW') {
    return 'KYC is under review. Buy orders unlock after verification.';
  }
  if (normalized === 'REJECTED') {
    return 'Previous KYC failed face match. Re-upload Aadhaar + selfie.';
  }
  return 'KYC required: upload Aadhaar front and selfie with document to buy on P2P.';
}

function updateCurrentUserKyc(kyc) {
  if (!currentUser) {
    return;
  }
  const next = kyc && typeof kyc === 'object' ? kyc : {};
  const status = normalizeKycStatus(next.status || currentUser.kyc?.status);
  currentUser.kyc = {
    ...(currentUser.kyc && typeof currentUser.kyc === 'object' ? currentUser.kyc : {}),
    ...next,
    status,
    statusLabel: getKycStatusLabel(status),
    canBuy: status === 'VERIFIED'
  };
}

function isKycVerifiedForBuy() {
  return normalizeKycStatus(currentUser?.kyc?.status) === 'VERIFIED';
}

function isKycBlockedError(error) {
  const code = String(error?.code || '')
    .trim()
    .toUpperCase();
  return KYC_REQUIRED_CODES.has(code);
}

function setKycHint(text, type = '') {
  if (!kycHint) {
    return;
  }
  kycHint.textContent = text;
  kycHint.className = 'p2p-kyc-hint';
  if (type) {
    kycHint.classList.add(type);
  }
}

function setKycModalOpen(open, options = {}) {
  if (!kycModal) {
    return;
  }
  const shouldOpen = Boolean(open);
  kycModal.classList.toggle('hidden', !shouldOpen);
  kycModal.setAttribute('aria-hidden', shouldOpen ? 'false' : 'true');
  document.body.classList.toggle('p2p-kyc-open', shouldOpen);
  if (shouldOpen) {
    if (kycStatusText) {
      kycStatusText.textContent =
        String(options.statusText || '').trim() || getKycRequirementMessage(currentUser?.kyc?.status);
    }
    if (String(options.hintText || '').trim()) {
      setKycHint(String(options.hintText).trim(), options.hintType || '');
    } else {
      setKycHint(getKycRequirementMessage(currentUser?.kyc?.status));
    }
  }
  syncBodyInteractionState();
}

function showKycGate(options = {}) {
  const nextStatus = normalizeKycStatus(options.status || currentUser?.kyc?.status);
  updateCurrentUserKyc({ status: nextStatus });
  loadProfilePanel();
  const message = String(options.message || '').trim() || getKycRequirementMessage(nextStatus);
  setKycModalOpen(true, {
    statusText: message,
    hintText: message,
    hintType: nextStatus === 'REJECTED' ? 'error' : ''
  });
  refreshCurrentUserKyc();
}

function generateClientId() {
  return `tmp_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
}

function encodeChatPayload(payload) {
  return `${CHAT_PAYLOAD_PREFIX}${JSON.stringify(payload)}`;
}

function sanitizeImageUrl(url) {
  const source = String(url || '').trim();
  if (!source) {
    return '';
  }

  const isSafeData =
    /^data:image\/(png|jpe?g|webp);base64,[a-z0-9+/=\s]+$/i.test(source);
  const isSafeRemote = /^https?:\/\/[^\s]+$/i.test(source);
  const isSafePath = source.startsWith('/');

  if (isSafeData || isSafeRemote || isSafePath) {
    return source;
  }
  return '';
}

function estimateDataUrlBytes(dataUrl) {
  const text = String(dataUrl || '');
  const base64Part = text.includes(',') ? text.split(',')[1] : text;
  const normalized = base64Part.replace(/\s/g, '');
  return Math.floor((normalized.length * 3) / 4);
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Unable to process image.'));
    };
    img.src = objectUrl;
  });
}

async function compressImageForChat(file) {
  const image = await loadImageFromFile(file);
  const maxDimension = 1280;
  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Unable to initialize image processor.');
  }
  context.drawImage(image, 0, 0, width, height);

  const mimeType = 'image/webp';
  let quality = 0.9;
  let dataUrl = canvas.toDataURL(mimeType, quality);

  while (estimateDataUrlBytes(dataUrl) > CHAT_MAX_PAYLOAD_BYTES && quality > 0.4) {
    quality -= 0.08;
    dataUrl = canvas.toDataURL(mimeType, quality);
  }

  if (estimateDataUrlBytes(dataUrl) > CHAT_MAX_PAYLOAD_BYTES) {
    throw new Error('Image is too large after compression. Try a smaller screenshot.');
  }

  return dataUrl;
}

async function compressImageForKyc(file) {
  if (!file) {
    throw new Error('Image file is required.');
  }
  if (!KYC_ALLOWED_FILE_TYPES.includes(file.type)) {
    throw new Error('Only JPG, JPEG, PNG, and WEBP files are allowed.');
  }
  if (file.size > KYC_MAX_FILE_SIZE) {
    throw new Error('Image size must be 6MB or smaller.');
  }

  const image = await loadImageFromFile(file);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Unable to initialize image processor.');
  }

  let maxDimension = 1440;
  let quality = 0.9;
  let dataUrl = '';

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    canvas.width = width;
    canvas.height = height;
    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    let workingQuality = quality;
    dataUrl = canvas.toDataURL('image/webp', workingQuality);
    while (estimateDataUrlBytes(dataUrl) > KYC_TARGET_IMAGE_BYTES && workingQuality > 0.4) {
      workingQuality -= 0.08;
      dataUrl = canvas.toDataURL('image/webp', workingQuality);
    }

    if (estimateDataUrlBytes(dataUrl) <= KYC_TARGET_IMAGE_BYTES) {
      return dataUrl;
    }

    maxDimension = Math.max(700, Math.round(maxDimension * 0.82));
    quality = Math.max(0.45, quality - 0.06);
  }

  throw new Error('Image is too large. Use a clear image with smaller dimensions.');
}

function decodeChatPayload(rawText) {
  const raw = String(rawText || '');
  if (!raw.startsWith(CHAT_PAYLOAD_PREFIX)) {
    return {
      messageType: 'text',
      text: raw,
      imageUrl: '',
      clientId: '',
      createdAt: null
    };
  }

  try {
    const parsed = JSON.parse(raw.slice(CHAT_PAYLOAD_PREFIX.length));
    const messageType = parsed?.messageType === 'image' ? 'image' : 'text';
    const text = String(parsed?.text || '').trim();
    const imageUrl = sanitizeImageUrl(parsed?.imageUrl || '');
    const clientId = String(parsed?.clientId || '').trim();
    const createdAt = parsed?.createdAt || null;
    return {
      messageType,
      text,
      imageUrl,
      clientId,
      createdAt
    };
  } catch (error) {
    return {
      messageType: 'text',
      text: raw,
      imageUrl: '',
      clientId: '',
      createdAt: null
    };
  }
}

function messageKeyFromMessage(message) {
  if (!message) {
    return '';
  }
  if (message.clientId) {
    return `client:${message.clientId}`;
  }
  if (message.id) {
    return `id:${message.id}`;
  }
  return `fallback:${message.sender || ''}:${message.createdAt || ''}:${message.text || ''}:${message.imageUrl || ''}`;
}

function toEpoch(value) {
  const epoch = new Date(value).getTime();
  return Number.isNaN(epoch) ? Date.now() : epoch;
}

function normalizeServerMessage(raw, optimistic = false) {
  const payload = decodeChatPayload(raw?.text || '');
  const explicitType = raw?.messageType === 'image' || raw?.messageType === 'text' ? raw.messageType : '';
  const explicitImageUrl = sanitizeImageUrl(raw?.imageUrl || '');
  const explicitClientId = String(raw?.clientId || '').trim();
  const explicitText = String(raw?.text || '').trim();
  const createdAtSource = raw?.createdAt || payload.createdAt || Date.now();
  const messageType = explicitType || payload.messageType;
  const imageUrl = explicitImageUrl || payload.imageUrl;
  const clientId = explicitClientId || payload.clientId;
  const isPayloadEncodedText = !explicitType && explicitText.startsWith(CHAT_PAYLOAD_PREFIX);
  const safeExplicitText = isPayloadEncodedText ? '' : explicitText;
  const text =
    messageType === 'image'
      ? safeExplicitText || payload.text || 'Payment screenshot'
      : explicitType
        ? safeExplicitText
        : payload.text;

  return {
    id: raw?.id || '',
    sender: String(raw?.sender || currentUser?.username || 'You'),
    createdAt: new Date(createdAtSource).toISOString(),
    messageType,
    text,
    imageUrl,
    clientId,
    pending: Boolean(optimistic),
    failed: false
  };
}

function resetChatMessages() {
  chatMessageMap.clear();
  chatMessageNodes.clear();
  if (chatMessages) {
    chatMessages.innerHTML = '';
  }
}

function setChatUploading(isUploading, label = '') {
  chatUploading = Boolean(isUploading);

  if (chatSendBtn) {
    chatSendBtn.disabled = chatUploading;
  }
  if (chatImageBtn) {
    chatImageBtn.disabled = chatUploading;
  }
  if (chatUploadState) {
    chatUploadState.classList.toggle('hidden', !chatUploading);
    chatUploadState.textContent = label || 'Uploading image...';
  }
}

function scrollChatToBottom(smooth = false) {
  if (!chatMessages) {
    return;
  }
  chatMessages.scrollTo({
    top: chatMessages.scrollHeight,
    behavior: smooth ? 'smooth' : 'auto'
  });
}

function getMessageCssClasses(message) {
  const buyerName = String(activeOrderSnapshot?.buyerUsername || '').trim();
  const sellerName = String(activeOrderSnapshot?.sellerUsername || activeOrderSnapshot?.advertiser || '').trim();
  const sender = String(message.sender || '').trim();
  const normalizedSender = sender.toLowerCase();
  const normalizedBuyer = buyerName.toLowerCase();
  const normalizedSeller = sellerName.toLowerCase();
  const normalizedCurrentUser = String(currentUser?.username || '')
    .trim()
    .toLowerCase();
  const senderIsBuyer = Boolean(normalizedBuyer && normalizedSender === normalizedBuyer);
  const senderIsSeller = Boolean(normalizedSeller && normalizedSender === normalizedSeller);
  const roleBasedSelf =
    (activeOrderRole === 'buyer' && senderIsBuyer) || (activeOrderRole === 'seller' && senderIsSeller);
  const isCurrentUser = Boolean(
    (normalizedCurrentUser && normalizedSender === normalizedCurrentUser) || roleBasedSelf
  );

  if (sender === 'System') {
    return 'chat-system';
  }

  const classes = [isCurrentUser ? 'chat-self' : 'chat-other'];

  if (senderIsBuyer) {
    classes.push('chat-buyer');
    return classes.join(' ');
  }
  if (senderIsSeller) {
    classes.push('chat-seller');
    return classes.join(' ');
  }
  if (isCurrentUser) {
    classes.push(activeOrderRole === 'buyer' ? 'chat-buyer' : 'chat-seller');
    return classes.join(' ');
  }

  classes.push('chat-seller');
  return classes.join(' ');
}

function getMessageInlineStyle(messageClass) {
  const cls = String(messageClass || '');
  if (cls.includes('chat-system')) {
    return 'background:linear-gradient(145deg,#1d2536 0%,#151b28 100%);border:1px solid rgba(130,170,255,0.45);color:#ffffff;';
  }
  if (cls.includes('chat-self')) {
    return 'background:linear-gradient(145deg,#4a3410 0%,#33260f 100%);border:1px solid rgba(247,167,35,0.82);color:#ffffff;';
  }
  return 'background:linear-gradient(145deg,#1c2331 0%,#161c27 100%);border:1px solid rgba(255,255,255,0.18);color:#ffffff;';
}

function buildMessageMarkup(message) {
  const messageClass = getMessageCssClasses(message);
  const bubbleStyle = getMessageInlineStyle(messageClass);
  const textContent = escapeHtml(message.text || (message.messageType === 'image' ? 'Payment screenshot' : ''));
  const imageMarkup = message.messageType === 'image' && message.imageUrl
    ? `<button class="chat-image-link" type="button" data-preview-src="${escapeHtml(message.imageUrl)}"><img class="chat-image" src="${escapeHtml(
        message.imageUrl
      )}" alt="Payment screenshot" loading="lazy" /></button>`
    : '';
  const pendingTag = message.pending ? '<span class="chat-meta-flag">Sending...</span>' : '';
  const failedTag = message.failed ? '<span class="chat-meta-flag failed">Failed</span>' : '';

  return `
    <article class="chat-item ${messageClass}${message.pending ? ' pending' : ''}${message.failed ? ' failed' : ''}" data-message-key="${escapeHtml(
      messageKeyFromMessage(message)
    )}" style="${bubbleStyle}">
      <p class="chat-sender" style="color:${messageClass.includes('chat-self') ? '#f6d98f' : '#cad2e2'};">${escapeHtml(message.sender)}</p>
      ${imageMarkup}
      ${
        textContent
          ? `<p class="chat-text" style="color:#ffffff;white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word;">${textContent}</p>`
          : ''
      }
      <p class="chat-time" style="color:#aab2c6;">${new Date(message.createdAt).toLocaleTimeString()} ${pendingTag} ${failedTag}</p>
    </article>
  `;
}

function updateMessageNode(node, message) {
  if (!node) {
    return null;
  }
  const wrapper = document.createElement('div');
  wrapper.innerHTML = buildMessageMarkup(message).trim();
  const next = wrapper.firstElementChild;
  if (!next) {
    return null;
  }
  node.replaceWith(next);
  return next;
}

function appendMessage(message, options = {}) {
  const normalized = normalizeServerMessage(message, Boolean(options.optimistic));
  const key = messageKeyFromMessage(normalized);
  if (!key || !chatMessages) {
    return false;
  }

  const existing = chatMessageMap.get(key);
  if (existing) {
    if ((existing.pending || existing.failed) && !normalized.pending) {
      const updated = { ...existing, ...normalized, pending: false, failed: false };
      chatMessageMap.set(key, updated);
      const node = chatMessageNodes.get(key);
      if (node) {
        const nextNode = updateMessageNode(node, updated);
        if (nextNode) {
          chatMessageNodes.set(key, nextNode);
        }
      }
    }
    if (options.scroll) {
      scrollChatToBottom(Boolean(options.smooth));
    }
    return false;
  }

  const emptyNode = chatMessages.querySelector('.chat-empty');
  if (emptyNode) {
    emptyNode.remove();
  }

  chatMessageMap.set(key, normalized);
  const wrapper = document.createElement('div');
  wrapper.innerHTML = buildMessageMarkup(normalized).trim();
  const messageNode = wrapper.firstElementChild;
  if (!messageNode) {
    return false;
  }

  chatMessages.appendChild(messageNode);
  chatMessageNodes.set(key, messageNode);

  if (normalized.messageType === 'image') {
    const imageEl = messageNode.querySelector('.chat-image');
    if (imageEl && !imageEl.complete) {
      imageEl.addEventListener(
        'load',
        () => {
          scrollChatToBottom(false);
        },
        { once: true }
      );
    }
  }

  if (options.scroll !== false) {
    scrollChatToBottom(Boolean(options.smooth));
  }
  return true;
}

function renderMessages(messages = [], options = {}) {
  if (!chatMessages) {
    return;
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    if (chatMessageMap.size === 0) {
      chatMessages.innerHTML = '<p class="chat-empty">No messages yet.</p>';
    }
    return;
  }

  const sorted = messages
    .map((item) => normalizeServerMessage(item))
    .sort((a, b) => toEpoch(a.createdAt) - toEpoch(b.createdAt));

  let appendedCount = 0;
  sorted.forEach((message) => {
    const appended = appendMessage(message, { scroll: false });
    if (appended) {
      appendedCount += 1;
    }
  });

  if (appendedCount > 0 || options.forceScroll) {
    scrollChatToBottom(Boolean(options.smoothScroll));
  }
}

function isMobileViewport() {
  return window.matchMedia('(max-width: 768px)').matches;
}

function normalizeMobileTabName(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  if (['p2p', 'orders', 'ads', 'profile'].includes(normalized)) {
    return normalized;
  }
  return 'p2p';
}

function setMobileNavActive(tab) {
  if (!p2pMobileBottomNav) {
    return;
  }

  p2pMobileBottomNav.querySelectorAll('a[data-mobile-tab]').forEach((link) => {
    const isActive = normalizeMobileTabName(link.dataset.mobileTab) === tab;
    link.classList.toggle('active', isActive);
    if (isActive) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });
}

function getOrderBucketByStatus(status) {
  const normalized = normalizeStatusForUi(status);
  if (normalized === 'RELEASED') {
    return 'completed';
  }
  if (['CANCELLED', 'EXPIRED'].includes(normalized)) {
    return 'cancelled';
  }
  return 'all';
}

function isOngoingOrderStatus(status) {
  const normalized = normalizeStatusForUi(status);
  return normalized === 'CREATED' || normalized === 'PAID' || normalized === 'DISPUTED';
}

function storeOrderForMobile(order) {
  if (!order || !order.id) {
    return;
  }

  const previous = mobileOrdersCache.get(order.id) || {};
  const next = {
    ...previous,
    ...order,
    status: normalizeStatusForUi(order.status),
    paidAt:
      order.paidAt ||
      order.paymentMarkedAt ||
      order.paymentConfirmedAt ||
      order.markedPaidAt ||
      previous.paidAt ||
      '',
    releasedAt: order.releasedAt || order.completedAt || previous.releasedAt || '',
    updatedAt: order.updatedAt || order.createdAt || previous.updatedAt || new Date().toISOString(),
    createdAt: order.createdAt || previous.createdAt || new Date().toISOString(),
    participantsLabel: order.participantsLabel || previous.participantsLabel || '--',
    paymentMethod: order.paymentMethod || previous.paymentMethod || '--',
    isParticipant:
      typeof order.isParticipant === 'boolean'
        ? order.isParticipant
        : previous.isParticipant || Boolean(currentUser && (order.buyerUserId === currentUser.id || order.sellerUserId === currentUser.id))
  };

  mobileOrdersCache.set(order.id, next);
}

function pruneMobileOrdersCache(maxAgeMs = 45 * 24 * 60 * 60 * 1000) {
  const threshold = Date.now() - maxAgeMs;
  for (const [orderId, order] of mobileOrdersCache.entries()) {
    const createdAtMs = new Date(order?.createdAt || 0).getTime();
    const updatedAtMs = new Date(order?.updatedAt || 0).getTime();
    const pivot = Math.max(createdAtMs || 0, updatedAtMs || 0);
    if (pivot > 0 && pivot < threshold) {
      mobileOrdersCache.delete(orderId);
    }
  }
}

function getAllCachedParticipantOrders() {
  return Array.from(mobileOrdersCache.values())
    .filter((order) => Boolean(order?.isParticipant))
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
}

function getMobileOrdersSnapshot() {
  return getAllCachedParticipantOrders().filter((order) => isOngoingOrderStatus(order.status));
}

function getProfileOrdersSnapshot() {
  return getAllCachedParticipantOrders();
}

function filteredMobileOrders() {
  return getMobileOrdersSnapshot();
}

function renderMobileOrdersList() {
  if (!mobileOrdersList) {
    return;
  }

  const orders = filteredMobileOrders();
  if (!orders.length) {
    mobileOrdersList.innerHTML = '<p class="empty-row">No ongoing orders.</p>';
    return;
  }

  mobileOrdersList.innerHTML = orders
    .map((order) => {
      return `
        <article class="mobile-order-card">
          <div class="mobile-order-head">
            <p class="mobile-order-ref">${escapeHtml(order.reference || order.id)}</p>
            <span class="status-pill ${statusClass(order.status)}">${statusLabel(order.status)}</span>
          </div>
          <div class="mobile-order-grid">
            <p>Type<strong>${escapeHtml(String(order.side || '').toUpperCase())} ${escapeHtml(order.asset || '')}</strong></p>
            <p>Amount<strong>₹${formatNumber(order.amountInr || 0)}</strong></p>
            <p>Price<strong>₹${formatNumber(order.price || 0)}</strong></p>
            <p>Payment<strong>${escapeHtml(order.paymentMethod || '--')}</strong></p>
          </div>
          <div class="mobile-order-actions">
            <button type="button" class="secondary-btn open-order-btn" data-order-id="${escapeHtml(order.id)}">Open</button>
          </div>
        </article>
      `;
    })
    .join('');
}

function formatDurationLabel(ms) {
  if (!Number.isFinite(ms) || ms <= 0) {
    return '--';
  }
  const mins = Math.round(ms / 60000);
  if (mins < 60) {
    return `${mins}m`;
  }
  const hours = (mins / 60).toFixed(1);
  return `${hours}h`;
}

function setAdCreateMeta(text, type = '') {
  if (!adCreateMeta) {
    return;
  }
  adCreateMeta.textContent = text;
  adCreateMeta.className = 'ad-create-meta';
  if (type) {
    adCreateMeta.classList.add(type);
  }
}

function renderMyAds(offers = []) {
  if (!myAdsList) {
    return;
  }

  if (!offers.length) {
    myAdsList.innerHTML = '<p class="empty-row">No ads posted yet.</p>';
    return;
  }

  myAdsList.innerHTML = offers
    .map((offer) => {
      const adType = String(offer.adType || (offer.side === 'buy' ? 'sell' : 'buy')).toUpperCase();
      const payments = Array.isArray(offer.payments) ? offer.payments.join(', ') : '--';
      return `
        <article class="my-ad-card">
          <p><strong>${adType} ${escapeHtml(offer.asset || 'USDT')}</strong> · ₹${formatNumber(offer.price || 0)}</p>
          <p>Available: <strong>${formatNumber(offer.available || 0)} ${escapeHtml(offer.asset || 'USDT')}</strong></p>
          <p>Limits: <strong>₹${formatNumber(offer.minLimit || 0)} - ₹${formatNumber(offer.maxLimit || 0)}</strong></p>
          <p>Payments: <strong>${escapeHtml(payments)}</strong></p>
        </article>
      `;
    })
    .join('');
}

async function loadMyAds() {
  if (!myAdsList) {
    return;
  }
  if (!currentUser) {
    myAdsList.innerHTML = '<p class="empty-row">Login required to view your ads.</p>';
    return;
  }

  const assetCandidates = ['USDT', 'BTC', 'ETH'];
  const sideCandidates = ['buy', 'sell'];
  const requests = [];

  sideCandidates.forEach((side) => {
    assetCandidates.forEach((asset) => {
      requests.push(p2pFetch(`/p2p/ads?side=${encodeURIComponent(side)}&asset=${encodeURIComponent(asset)}`));
    });
  });

  try {
    const responses = await Promise.all(requests);
    const payloads = await Promise.all(
      responses.map(async (response) => {
        const data = await response.json().catch(() => ({ offers: [] }));
        return response.ok ? data : { offers: [] };
      })
    );

    const allOffers = payloads.flatMap((item) => (Array.isArray(item.offers) ? item.offers : []));
    const uniqueById = new Map();
    allOffers.forEach((offer) => {
      if (offer?.id) {
        uniqueById.set(offer.id, offer);
      }
    });

    const myOffers = Array.from(uniqueById.values())
      .filter((offer) => offer.createdByUserId === currentUser.id)
      .sort((a, b) => Number(b.price || 0) - Number(a.price || 0));

    renderMyAds(myOffers);
  } catch (error) {
    myAdsList.innerHTML = '<p class="empty-row">Unable to load your ads right now.</p>';
  }
}

async function handleAdCreate(event) {
  event.preventDefault();
  if (!currentUser) {
    requireLoginNotice();
    return;
  }

  const payload = {
    adType: String(adTypeInput?.value || '').trim().toLowerCase(),
    asset: String(adAssetInput?.value || '').trim().toUpperCase(),
    price: Number(adPriceInput?.value || 0),
    available: Number(adAvailableInput?.value || 0),
    minLimit: Number(adMinLimitInput?.value || 0),
    maxLimit: Number(adMaxLimitInput?.value || 0),
    payments: String(adPaymentsInput?.value || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  };

  if (!payload.payments.length) {
    setAdCreateMeta('Add at least one payment method.', 'error');
    return;
  }

  if (adCreateBtn) {
    adCreateBtn.disabled = true;
    adCreateBtn.textContent = 'Posting...';
  }

  try {
    const response = await p2pFetch('/p2p/ads', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Unable to post ad.');
    }

    setAdCreateMeta('Ad posted successfully.', 'success');
    adCreateForm?.reset();
    await loadOffers();
    await loadMyAds();
  } catch (error) {
    setAdCreateMeta(error.message, 'error');
  } finally {
    if (adCreateBtn) {
      adCreateBtn.disabled = false;
      adCreateBtn.textContent = 'Post Ad';
    }
  }
}

async function loadProfilePanel(options = {}) {
  if (!profileSection) {
    return;
  }

  const setIdentityTag = (label, verified = false) => {
    if (!profileIdentityTag) {
      return;
    }
    profileIdentityTag.textContent = label;
    profileIdentityTag.classList.toggle('verified', Boolean(verified));
  };

  const readTimestampMs = (order, keys) => {
    for (const key of keys) {
      const value = order?.[key];
      const epoch = new Date(value || 0).getTime();
      if (Number.isFinite(epoch) && epoch > 0) {
        return epoch;
      }
    }
    return 0;
  };

  if (!currentUser) {
    profileWalletBalance = 0;
    profileWalletLocked = 0;
    profileWalletSyncedAt = 0;
    mobileOrdersCache.clear();
    if (profileAvatar) {
      profileAvatar.textContent = 'U';
    }
    if (profileName) {
      profileName.textContent = 'Guest User';
    }
    if (profileEmail) {
      profileEmail.textContent = 'Login required';
    }
    setIdentityTag('Identity Not Submitted', false);
    if (profileKyc) {
      profileKyc.textContent = 'Not Submitted';
    }
    if (profileSecurity) {
      profileSecurity.textContent = 'Basic';
    }
    if (profileTotalOrders) {
      profileTotalOrders.textContent = '0';
    }
    if (profileCompletionRate) {
      profileCompletionRate.textContent = '0%';
    }
    if (profileCompletionRate30d) {
      profileCompletionRate30d.textContent = '0%';
    }
    if (profileDeposit) {
      profileDeposit.textContent = '₹0';
    }
    if (profileCompletedOrders) {
      profileCompletedOrders.textContent = '0';
    }
    if (profileCompletedOrders30d) {
      profileCompletedOrders30d.textContent = '0';
    }
    if (profileCancelledOrders) {
      profileCancelledOrders.textContent = '0';
    }
    if (profileAvgReleaseTime) {
      profileAvgReleaseTime.textContent = '--';
    }
    if (profileAvgPaymentTime) {
      profileAvgPaymentTime.textContent = '--';
    }
    if (profileMeta) {
      profileMeta.textContent = 'Login to view profile analytics.';
    }
    return;
  }

  const initial = String(currentUser.username || currentUser.email || 'U')
    .trim()
    .slice(0, 1)
    .toUpperCase();

  if (profileAvatar) {
    profileAvatar.textContent = initial || 'U';
  }
  if (profileName) {
    profileName.textContent = currentUser.username || 'P2P User';
  }
  if (profileEmail) {
    profileEmail.textContent = currentUser.email || '--';
  }
  const currentKycStatus = normalizeKycStatus(currentUser?.kyc?.status);
  const isKycVerified = currentKycStatus === 'VERIFIED';
  setIdentityTag(isKycVerified ? 'Identity Verified' : `Identity ${getKycStatusLabel(currentKycStatus)}`, isKycVerified);
  if (profileKyc) {
    profileKyc.textContent = getKycStatusLabel(currentKycStatus);
  }
  if (profileSecurity) {
    profileSecurity.textContent = currentKycStatus === 'VERIFIED' ? 'KYC + Email Protected' : 'KYC Required';
  }

  const shouldRefreshWallet =
    Boolean(options.refreshWallet) || Date.now() - profileWalletSyncedAt > 30 * 1000;

  if (shouldRefreshWallet) {
    try {
      const response = await p2pFetch('/wallet/balances');
      const data = await response.json();
      if (response.ok && data.wallet) {
        profileWalletBalance = Number(data.wallet.balance || 0);
        profileWalletLocked = Number(data.wallet.lockedBalance || 0);
        profileWalletSyncedAt = Date.now();
      }
    } catch (error) {
      // Wallet panel remains with previous values.
    }
  }

  const nowMs = Date.now();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const orders = getProfileOrdersSnapshot();
  const orders30d = orders.filter((order) => {
    const createdMs = readTimestampMs(order, ['createdAt']);
    return createdMs > 0 && createdMs >= nowMs - thirtyDaysMs;
  });

  const completedOrders = orders30d.filter((order) => normalizeStatusForUi(order.status) === 'RELEASED');
  const cancelledOrders = orders30d.filter((order) =>
    ['CANCELLED', 'EXPIRED'].includes(normalizeStatusForUi(order.status))
  );
  const totalOrders = orders30d.length;
  const completionRateValue = totalOrders ? (completedOrders.length / totalOrders) * 100 : 0;

  const releaseDurations = completedOrders
    .map((order) => {
      const createdAtMs = readTimestampMs(order, ['createdAt']);
      const releasedAtMs = readTimestampMs(order, ['releasedAt', 'completedAt', 'updatedAt']);
      if (releasedAtMs > createdAtMs) {
        return releasedAtMs - createdAtMs;
      }
      return 0;
    })
    .filter((value) => Number.isFinite(value) && value > 0);
  const avgReleaseMs =
    releaseDurations.length > 0
      ? releaseDurations.reduce((sum, value) => sum + value, 0) / releaseDurations.length
      : 0;

  const paymentDurations = orders30d
    .map((order) => {
      const createdAtMs = readTimestampMs(order, ['createdAt']);
      if (!createdAtMs) {
        return 0;
      }

      const paidAtMs = readTimestampMs(order, [
        'paidAt',
        'paymentMarkedAt',
        'paymentConfirmedAt',
        'markedPaidAt',
        'buyerPaidAt',
        'updatedAt'
      ]);

      if (paidAtMs > createdAtMs) {
        return paidAtMs - createdAtMs;
      }
      return 0;
    })
    .filter((value) => Number.isFinite(value) && value > 0);

  const avgPaymentMs =
    paymentDurations.length > 0
      ? paymentDurations.reduce((sum, value) => sum + value, 0) / paymentDurations.length
      : 0;

  if (profileTotalOrders) {
    profileTotalOrders.textContent = String(totalOrders);
  }
  if (profileCompletionRate) {
    profileCompletionRate.textContent = `${completionRateValue.toFixed(1)}%`;
  }
  if (profileCompletionRate30d) {
    profileCompletionRate30d.textContent = `${completionRateValue.toFixed(1)}%`;
  }
  if (profileDeposit) {
    profileDeposit.textContent = `₹${formatNumber(profileWalletBalance + profileWalletLocked)}`;
  }
  if (profileCompletedOrders) {
    profileCompletedOrders.textContent = String(completedOrders.length);
  }
  if (profileCompletedOrders30d) {
    profileCompletedOrders30d.textContent = String(completedOrders.length);
  }
  if (profileCancelledOrders) {
    profileCancelledOrders.textContent = String(cancelledOrders.length);
  }
  if (profileAvgReleaseTime) {
    profileAvgReleaseTime.textContent = formatDurationLabel(avgReleaseMs);
  }
  if (profileAvgPaymentTime) {
    profileAvgPaymentTime.textContent = formatDurationLabel(avgPaymentMs);
  }
  if (profileMeta) {
    profileMeta.textContent = `30D orders: ${totalOrders} | Cancelled: ${cancelledOrders.length} | Wallet: ${formatNumber(
      profileWalletBalance
    )}`;
  }
}

function syncMobileTabFromHash(options = {}) {
  const tabFromHash = normalizeMobileTabName(String(window.location.hash || '').replace('#', ''));
  const resolvedTab = tabFromHash || 'p2p';
  mobileActiveTab = resolvedTab;
  document.body.dataset.mobileTab = resolvedTab;
  setMobileNavActive(resolvedTab);

  if (!isMobileViewport()) {
    return;
  }

  if (resolvedTab === 'orders') {
    renderMobileOrdersList();
    loadLiveOrders();
  } else if (resolvedTab === 'ads') {
    loadMyAds();
  } else if (resolvedTab === 'profile') {
    loadProfilePanel();
  } else if (options.refreshP2P !== false) {
    loadOffers();
  }
}

function setMobileTab(tab, options = {}) {
  const normalized = normalizeMobileTabName(tab);
  mobileActiveTab = normalized;
  document.body.dataset.mobileTab = normalized;
  setMobileNavActive(normalized);

  if (isMobileViewport()) {
    if (options.updateHash !== false) {
      const nextHash = normalized === 'p2p' ? '' : `#${normalized}`;
      if (`${window.location.hash}` !== nextHash) {
        history.replaceState(null, '', `${window.location.pathname}${nextHash}`);
      }
    }

    if (normalized === 'orders') {
      renderMobileOrdersList();
      loadLiveOrders();
    } else if (normalized === 'ads') {
      loadMyAds();
    } else if (normalized === 'profile') {
      loadProfilePanel();
    } else {
      loadOffers();
    }
  }
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
  syncBodyInteractionState();
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
  syncBodyInteractionState();
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

function setKycFileMeta(metaEl, file, defaultText) {
  if (!metaEl) {
    return;
  }
  if (!file) {
    metaEl.textContent = defaultText;
    return;
  }
  metaEl.textContent = `${file.name} (${Math.max(1, Math.round(file.size / 1024))} KB)`;
}

function closeKycModal() {
  setKycModalOpen(false);
}

async function refreshCurrentUserKyc() {
  if (!currentUser) {
    return;
  }

  try {
    const response = await p2pFetch('/kyc/status');
    const data = await response.json();
    if (!response.ok || !data?.kyc) {
      return;
    }
    updateCurrentUserKyc(data.kyc);
    loadProfilePanel();
  } catch (_) {
    // Keep existing KYC state when status API is unavailable.
  }
}

async function submitKycForm(event) {
  event.preventDefault();

  if (!currentUser) {
    requireLoginNotice();
    return;
  }

  const aadhaarNumber = String(kycAadhaarInput?.value || '')
    .replace(/\D/g, '')
    .slice(0, 12);
  if (!/^\d{12}$/.test(aadhaarNumber)) {
    setKycHint('Enter a valid 12-digit Aadhaar number.', 'error');
    return;
  }

  const aadhaarFile = kycAadhaarFrontInput?.files?.[0] || null;
  const selfieFile = kycSelfieInput?.files?.[0] || null;
  if (!aadhaarFile || !selfieFile) {
    setKycHint('Upload Aadhaar front and selfie with document.', 'error');
    return;
  }
  if (!kycConsent?.checked) {
    setKycHint('Please accept consent to continue.', 'error');
    return;
  }

  if (kycSubmitBtn) {
    kycSubmitBtn.disabled = true;
    kycSubmitBtn.textContent = 'Verifying...';
  }

  try {
    setKycHint('Optimizing document images...', '');
    const aadhaarFrontImage = await compressImageForKyc(aadhaarFile);
    const selfieWithDocumentImage = await compressImageForKyc(selfieFile);

    setKycHint('Running AI face match verification...', '');
    const response = await p2pFetch('/kyc/submit', {
      method: 'POST',
      body: JSON.stringify({
        aadhaarNumber,
        aadhaarFrontImage,
        selfieWithDocumentImage,
        consent: true
      })
    });
    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data.message || 'Unable to submit KYC right now.');
      error.code = String(data.code || '').trim().toUpperCase();
      throw error;
    }

    updateCurrentUserKyc(data.kyc || {});
    updateUserUi();
    await loadProfilePanel();

    const nextStatus = normalizeKycStatus(data?.kyc?.status);
    const serverMessage = String(data.message || '').trim();
    if (kycStatusText) {
      kycStatusText.textContent = serverMessage || getKycRequirementMessage(nextStatus);
    }

    if (nextStatus === 'VERIFIED') {
      setKycHint(serverMessage || 'KYC verified. You can place P2P buy orders now.', 'success');
      closeKycModal();
      setUserStatus('KYC verified. P2P buy is now enabled.', 'user-online');
      return;
    }

    if (nextStatus === 'REJECTED') {
      setKycHint(serverMessage || 'Face match failed. Upload clearer Aadhaar and selfie.', 'error');
      return;
    }

    setKycHint(serverMessage || 'KYC submitted. Verification is pending review.', 'success');
  } catch (error) {
    setKycHint(error.message || 'Unable to submit KYC right now.', 'error');
  } finally {
    if (kycSubmitBtn) {
      kycSubmitBtn.disabled = false;
      kycSubmitBtn.textContent = 'Submit KYC';
    }
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
  syncBodyInteractionState();
}

function updateUserUi() {
  if (currentUser) {
    const kycLabel = getKycStatusLabel(currentUser?.kyc?.status);
    if (normalizeKycStatus(currentUser?.kyc?.status) === 'VERIFIED') {
      setUserStatus(`P2P account active | KYC ${kycLabel}`, 'user-online');
    } else {
      setUserStatus(`P2P account active | KYC ${kycLabel} (required for buy)`, 'user-error');
    }
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

  if (!currentUser) {
    if (myAdsList) {
      myAdsList.innerHTML = '<p class="empty-row">Login required to view your ads.</p>';
    }
  }

  loadProfilePanel();
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
  syncBodyInteractionState();
}

function setPaymentPanelOpen(open) {
  if (!paymentPanel) {
    return;
  }
  const shouldOpen = Boolean(open);
  paymentPanel.classList.toggle('hidden', !shouldOpen);
}

function setCancelModalOpen(open) {
  if (!cancelModal) {
    return;
  }
  const shouldOpen = Boolean(open);
  cancelModal.classList.toggle('hidden', !shouldOpen);
  cancelModal.setAttribute('aria-hidden', shouldOpen ? 'false' : 'true');
  document.body.classList.toggle('p2p-cancel-open', shouldOpen);
  if (!shouldOpen && cancelReasonForm) {
    cancelReasonForm.reset();
  }
  if (!shouldOpen && cancelNoPaymentCheck) {
    cancelNoPaymentCheck.checked = false;
  }
  refreshCancelConfirmState();
  syncBodyInteractionState();
}

function refreshCancelConfirmState() {
  if (!cancelConfirmBtn) {
    return;
  }

  const reasonSelected = Boolean(cancelReasonForm?.querySelector('input[name="cancelReason"]:checked'));
  const noPaymentConfirmed = Boolean(cancelNoPaymentCheck?.checked);
  cancelConfirmBtn.disabled = !(reasonSelected && noPaymentConfirmed);
}

function getOrderRole(order) {
  if (!order || !currentUser) {
    return '';
  }

  if (currentUser.id && currentUser.id === order.buyerUserId) {
    return 'buyer';
  }
  if (currentUser.id && currentUser.id === order.sellerUserId) {
    return 'seller';
  }
  if (currentUser.username && currentUser.username === order.buyerUsername) {
    return 'buyer';
  }
  if (currentUser.username && currentUser.username === order.sellerUsername) {
    return 'seller';
  }
  return '';
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
  setPaymentPanelOpen(false);
  setCancelModalOpen(false);
  setImagePreviewOpen(false);
  activeOrderId = null;
  activeOrderRole = '';
  activeOrderSnapshot = null;
  autoCancelRequested = false;
  messagePollTick = 0;
  resetOrderWatch();
  resetChatMessages();
  setChatUploading(false);
  if (chatInput) {
    chatInput.value = '';
    chatInput.disabled = false;
  }
  if (chatImageInput) {
    chatImageInput.value = '';
  }
  if (chatState) {
    chatState.textContent = 'Waiting for messages...';
  }
}

async function loadCurrentUser() {
  try {
    const response = await p2pFetch('/auth/me');
    const data = await response.json();
    currentUser = data.loggedIn ? data.user : null;
    if (currentUser) {
      updateCurrentUserKyc(currentUser.kyc || {});
    }
  } catch (error) {
    currentUser = null;
  }
  updateUserUi();
}

async function loginUser() {
  const email = String(emailInput?.value || '').trim();
  const password = String(passwordInput?.value || '').trim();

  try {
    const response = await p2pFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Login failed.');
    }

    if (data.accessToken) localStorage.setItem('bitegit_token', data.accessToken);
    if (data.refreshToken) localStorage.setItem('bitegit_refresh_token', data.refreshToken);
    currentUser = data.user;
    updateCurrentUserKyc(currentUser?.kyc || {});
    updateUserUi();
    setAuthModalOpen(false);
    setP2PNavOpen(false);
    await loadOffers();
    await loadLiveOrders();
    await loadMyAds();
    await loadProfilePanel({ refreshWallet: true });

    const redirectPath = getPostLoginRedirectPath();
    if (redirectPath) {
      window.location.href = redirectPath;
      return;
    }
  } catch (error) {
    setUserStatus(error.message, 'user-error');
  }
}

async function logoutUser() {
  try {
    await p2pFetch('/auth/logout', { method: 'POST' });
    localStorage.removeItem('bitegit_token');
    localStorage.removeItem('bitegit_refresh_token');
  } finally {
    currentUser = null;
    mobileOrdersCache.clear();
    updateUserUi();
    await loadOffers();
    await loadLiveOrders();
    renderMobileOrdersList();
    closeOrderModal();
    closeDealModal();
    closeKycModal();
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
    const response = await p2pFetch('/market/tickers?symbols=BTCUSDT,ETHUSDT,BNBUSDT,SOLUSDT,XRPUSDT');
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
      rowsEl.innerHTML = '<tr><td colspan="6" class="empty-row">No active ads available</td></tr>';
    }
    if (cardsEl) {
      cardsEl.innerHTML = '<article class="p2p-offer-card"><p class="empty-row">No active ads available</p></article>';
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
    const response = await p2pFetch(`/p2p/ads?${params.toString()}`);
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
    const response = await p2pFetch('/p2p/orders', {
      method: 'POST',
      body: JSON.stringify({ adId: offerId, amount: amountInr, paymentMethod })
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(data.message || 'Unable to create order.');
      error.code = String(data.code || '').trim().toUpperCase();
      error.kyc = data.kyc && typeof data.kyc === 'object' ? data.kyc : null;
      throw error;
    }

    if (openAfterCreate) {
      openOrder(data.order);
    }
    await loadLiveOrders();
    return data;
  } catch (error) {
    if (isKycBlockedError(error)) {
      const blockedStatus = normalizeKycStatus(error?.kyc?.status);
      updateCurrentUserKyc({ status: blockedStatus });
      showKycGate({
        status: blockedStatus,
        message: error.message
      });
    }
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

  if (currentSide === 'buy' && !isKycVerifiedForBuy()) {
    showKycGate({
      status: currentUser?.kyc?.status,
      message: getKycRequirementMessage(currentUser?.kyc?.status)
    });
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
  const incomingOrders = Array.isArray(orders) ? orders : [];
  const participantOrders = incomingOrders.filter((order) => Boolean(order?.isParticipant));
  participantOrders.forEach((order) => storeOrderForMobile(order));
  pruneMobileOrdersCache();
  const visibleOrders = participantOrders.filter((order) => isOngoingOrderStatus(order.status));

  if (!visibleOrders.length) {
    if (liveOrdersRows) {
      liveOrdersRows.innerHTML = '<tr><td colspan="6" class="empty-row">No ongoing orders available.</td></tr>';
    }
    if (liveOrdersCards) {
      liveOrdersCards.innerHTML = '<article class="p2p-live-order-card"><p class="empty-row">No ongoing orders available.</p></article>';
    }
    renderMobileOrdersList();
    loadProfilePanel();
    return 0;
  }

  if (liveOrdersRows) {
    liveOrdersRows.innerHTML = visibleOrders
      .map((order) => {
        return `
          <tr>
            <td>${order.reference}</td>
            <td>${order.side.toUpperCase()} ${order.asset}</td>
            <td>₹${formatNumber(order.amountInr)}</td>
            <td><span class="status-pill ${statusClass(order.status)}">${statusLabel(order.status)}</span></td>
            <td>${escapeHtml(order.participantsLabel)}</td>
            <td>
              <button type="button" class="secondary-btn open-order-btn" data-order-id="${order.id}">
                Open
              </button>
            </td>
          </tr>
        `;
      })
      .join('');
  }

  if (liveOrdersCards) {
    liveOrdersCards.innerHTML = visibleOrders
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
              <p>Counterparty<strong>${escapeHtml(order.advertiser || '--')}</strong></p>
            </div>
            <div class="p2p-card-actions">
              <button type="button" class="secondary-btn open-order-btn" data-order-id="${order.id}">
                Open
              </button>
            </div>
          </article>
        `
      )
      .join('');
  }

  renderMobileOrdersList();
  loadProfilePanel();
  return visibleOrders.length;
}

async function loadLiveOrders() {
  if (!liveOrdersMeta) {
    return;
  }

  if (!currentUser) {
    if (liveOrdersRows) {
      liveOrdersRows.innerHTML = '<tr><td colspan="6" class="empty-row">Login to view ongoing orders.</td></tr>';
    }
    if (liveOrdersCards) {
      liveOrdersCards.innerHTML = '<article class="p2p-live-order-card"><p class="empty-row">Login to view ongoing orders.</p></article>';
    }
    liveOrdersMeta.textContent = 'Ongoing Orders: login required';
    if (mobileOrdersList) {
      mobileOrdersList.innerHTML = '<p class="empty-row">Login to view orders.</p>';
    }
    loadProfilePanel();
    return;
  }

  try {
    const params = new URLSearchParams({
      side: currentSide,
      asset: currentAsset
    });
    const response = await p2pFetch(`/p2p/orders?${params.toString()}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Unable to load ongoing orders.');
    }

    const visibleCount = renderLiveOrders(data.orders);
    liveOrdersMeta.textContent = `Ongoing Orders: ${visibleCount}`;
  } catch (error) {
    if (liveOrdersRows) {
      liveOrdersRows.innerHTML = '<tr><td colspan="6" class="empty-row">Unable to load ongoing orders.</td></tr>';
    }
    if (liveOrdersCards) {
      liveOrdersCards.innerHTML = '<article class="p2p-live-order-card"><p class="empty-row">Unable to load ongoing orders.</p></article>';
    }
    liveOrdersMeta.textContent = error.message;
    renderMobileOrdersList();
  }
}

function updateOrderUi(order) {
  if (!order) {
    return;
  }

  activeOrderSnapshot = order;
  storeOrderForMobile(order);
  renderMobileOrdersList();
  loadProfilePanel();
  activeOrderRole = getOrderRole(order);
  const normalizedStatus = normalizeStatusForUi(order.status);
  const counterpartyName =
    activeOrderRole === 'buyer'
      ? order.sellerUsername || order.advertiser || 'Seller'
      : order.buyerUsername || 'Buyer';

  orderRef.textContent = order.reference;
  orderStatus.className = `status-pill ${statusClass(order.status)}`;
  orderStatus.textContent = statusLabel(order.status).toUpperCase();
  orderMerchant.textContent = counterpartyName;
  if (orderCounterpartyName) {
    orderCounterpartyName.textContent = counterpartyName;
  }
  if (orderCounterpartyMeta) {
    orderCounterpartyMeta.textContent = 'Order with verified counterparty';
  }
  orderPrice.textContent = `₹${formatNumber(order.price)} / ${order.asset}`;
  orderAmount.textContent = `₹${formatNumber(order.amountInr)}`;
  orderAssetAmount.textContent = `${formatNumber(order.assetAmount)} ${order.asset}`;
  if (orderFee) {
    orderFee.textContent = `₹${formatNumber(Number(order.fee || 0))}`;
  }
  orderPayment.textContent = order.paymentMethod;
  orderParticipants.textContent = order.participantsLabel;
  if (orderTime) {
    orderTime.textContent = formatDateTime(order.createdAt);
  }
  if (paymentAmountDisplay) {
    paymentAmountDisplay.textContent = `₹${formatNumber(order.amountInr)}`;
  }
  if (paymentMethodDisplay) {
    paymentMethodDisplay.textContent = `Payment method: ${order.paymentMethod}`;
  }
  if (paymentInstructions) {
    paymentInstructions.textContent =
      'Transfer exact amount from your own account and click “I have paid”.';
  }

  remainingSeconds = Number(order.remainingSeconds || 0);
  orderTimer.textContent = formatTimer(remainingSeconds);
  if (paymentCountdown) {
    paymentCountdown.textContent = formatTimer(remainingSeconds);
  }

  const isCreated = normalizedStatus === 'CREATED';
  const isPaid = normalizedStatus === 'PAID';
  const isReleased = normalizedStatus === 'RELEASED';
  const isClosed = ['RELEASED', 'CANCELLED', 'EXPIRED'].includes(normalizedStatus);

  if (markPaidBtn) {
    if (activeOrderRole === 'seller' && isPaid) {
      markPaidBtn.dataset.action = 'release';
      markPaidBtn.textContent = 'Release';
      markPaidBtn.disabled = false;
      markPaidBtn.classList.add('release-mode');
    } else if (activeOrderRole === 'buyer' && isCreated) {
      markPaidBtn.dataset.action = 'pay';
      markPaidBtn.textContent = 'Pay';
      markPaidBtn.disabled = false;
      markPaidBtn.classList.remove('release-mode');
    } else if (activeOrderRole === 'buyer' && isPaid) {
      markPaidBtn.dataset.action = 'none';
      markPaidBtn.textContent = 'Payment Sent';
      markPaidBtn.disabled = true;
      markPaidBtn.classList.remove('release-mode');
    } else if (isReleased) {
      markPaidBtn.dataset.action = 'none';
      markPaidBtn.textContent = 'Released';
      markPaidBtn.disabled = true;
      markPaidBtn.classList.remove('release-mode');
    } else {
      markPaidBtn.dataset.action = 'none';
      markPaidBtn.textContent = 'Pay';
      markPaidBtn.disabled = true;
      markPaidBtn.classList.remove('release-mode');
    }
  }

  if (cancelOrderBtn) {
    cancelOrderBtn.disabled = !isCreated;
  }
  if (paidConfirmBtn) {
    paidConfirmBtn.disabled = !(activeOrderRole === 'buyer' && isCreated);
  }
  if (chatInput) {
    chatInput.disabled = isClosed;
  }
  if (isClosed || isPaid || activeOrderRole !== 'buyer') {
    setPaymentPanelOpen(false);
  }
}

async function fetchMessages(options = {}) {
  if (!activeOrderId) {
    return;
  }

  try {
    const response = await p2pFetch(`/p2p/orders/${activeOrderId}/messages`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to load messages.');
    }

    renderMessages(data.messages, options);
    chatState.textContent = `Messages: ${data.messages.length}`;
  } catch (error) {
    chatState.textContent = error.message;
  }
}

async function postChatPayload(payload) {
  const response = await p2pFetch(`/p2p/orders/${activeOrderId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ text: encodeChatPayload(payload) })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Message failed.');
  }
  return data.messages;
}

async function sendMessageHandler(event) {
  event.preventDefault();

  if (!activeOrderId || !chatInput || !chatSendBtn || chatUploading) {
    return;
  }

  const text = String(chatInput.value || '').trim();
  if (!text) {
    return;
  }

  const clientId = generateClientId();
  const createdAt = new Date().toISOString();
  const optimisticMessage = {
    id: '',
    sender: currentUser?.username || 'You',
    createdAt,
    clientId,
    messageType: 'text',
    text,
    imageUrl: ''
  };

  appendMessage(optimisticMessage, { optimistic: true, smooth: true });
  chatInput.value = '';
  chatState.textContent = 'Sending...';

  const encodedPayload = encodeChatPayload({
    messageType: 'text',
    text,
    imageUrl: '',
    clientId,
    createdAt
  });

  try {
    const messages = await postChatPayload({
      messageType: 'text',
      text: encodedPayload,
      imageUrl: '',
      clientId,
      createdAt
    });
    renderMessages(messages, { smoothScroll: true, forceScroll: true });
    chatState.textContent = 'Message delivered';
  } catch (error) {
    const key = messageKeyFromMessage(optimisticMessage);
    const existing = chatMessageMap.get(key);
    if (existing) {
      existing.pending = false;
      existing.failed = true;
      chatMessageMap.set(key, existing);
      const existingNode = chatMessageNodes.get(key);
      if (existingNode) {
        updateMessageNode(existingNode, existing);
      }
    }
    chatState.textContent = error.message;
  }
}

function setImagePreviewOpen(open, src = '') {
  if (!imagePreviewModal) {
    return;
  }
  const shouldOpen = Boolean(open);
  imagePreviewModal.classList.toggle('hidden', !shouldOpen);
  imagePreviewModal.setAttribute('aria-hidden', shouldOpen ? 'false' : 'true');
  if (imagePreviewEl) {
    imagePreviewEl.src = shouldOpen ? src : '';
  }
  syncBodyInteractionState();
}

async function handleChatImageSelected(event) {
  const file = event.target?.files?.[0];
  if (!file || !activeOrderId || chatUploading) {
    return;
  }

  if (!CHAT_IMAGE_ALLOWED_TYPES.includes(file.type)) {
    chatState.textContent = 'Only JPG, JPEG, PNG, or WEBP images are allowed.';
    event.target.value = '';
    return;
  }

  if (file.size > CHAT_IMAGE_MAX_SIZE) {
    chatState.textContent = 'Image size must be 3MB or less.';
    event.target.value = '';
    return;
  }

  setChatUploading(true, 'Uploading image...');

  let safeImageUrl = '';
  try {
    const compressedDataUrl = await compressImageForChat(file);
    safeImageUrl = sanitizeImageUrl(compressedDataUrl);
    if (!safeImageUrl) {
      throw new Error('Invalid image format.');
    }
  } catch (error) {
    chatState.textContent = error.message || 'Failed to process image.';
    setChatUploading(false);
    event.target.value = '';
    return;
  }

  const clientId = generateClientId();
  const optimisticMessage = {
    id: '',
    sender: currentUser?.username || 'You',
    createdAt: new Date().toISOString(),
    clientId,
    messageType: 'image',
    text: 'Payment screenshot',
    imageUrl: safeImageUrl
  };

  appendMessage(optimisticMessage, { optimistic: true, smooth: true });
  chatState.textContent = 'Uploading image...';

  try {
    const messages = await postChatPayload({
      messageType: 'image',
      text: 'Payment screenshot',
      imageUrl: safeImageUrl,
      clientId,
      createdAt: new Date().toISOString()
    });
    renderMessages(messages, { smoothScroll: true, forceScroll: true });
    chatState.textContent = 'Image sent';
  } catch (error) {
    const key = messageKeyFromMessage(optimisticMessage);
    const existing = chatMessageMap.get(key);
    if (existing) {
      existing.pending = false;
      existing.failed = true;
      chatMessageMap.set(key, existing);
      const existingNode = chatMessageNodes.get(key);
      if (existingNode) {
        updateMessageNode(existingNode, existing);
      }
    }
    chatState.textContent = error.message;
  } finally {
    setChatUploading(false);
    event.target.value = '';
  }
}

async function loadOrderDetails() {
  if (!activeOrderId) {
    return;
  }

  try {
    const response = await p2pFetch(`/p2p/orders/${activeOrderId}`);
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
  autoCancelRequested = false;
  messagePollTick = 0;
  resetChatMessages();
  setChatUploading(false);
  setModalOpen(true);
  setPaymentPanelOpen(false);
  setCancelModalOpen(false);
  updateOrderUi(order);
  fetchMessages({ forceScroll: true });

  resetOrderWatch();

  pollingIntervalId = setInterval(() => {
    messagePollTick += 1;
    fetchMessages();
    if (messagePollTick % 2 === 0) {
      loadOrderDetails();
    }
    loadLiveOrders();
  }, 3000);

  countdownIntervalId = setInterval(() => {
    remainingSeconds = Math.max(0, remainingSeconds - 1);
    orderTimer.textContent = formatTimer(remainingSeconds);
    if (paymentCountdown) {
      paymentCountdown.textContent = formatTimer(remainingSeconds);
    }

    const normalizedStatus = normalizeStatusForUi(activeOrderSnapshot?.status);
    if (remainingSeconds <= 0 && normalizedStatus === 'CREATED' && !autoCancelRequested) {
      autoCancelRequested = true;
      updateOrderStatus('cancel', { skipNotification: true }).catch(() => {
        autoCancelRequested = false;
      });
    }
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
      renderMessages(payload.messages, { smoothScroll: true });
      chatState.textContent = `Messages: ${payload.messages.length}`;
    }
  });
}

async function openOrderById(orderId) {
  if (!liveOrdersMeta) {
    return;
  }

  if (!currentUser) {
    requireLoginNotice();
    return;
  }

  try {
    const response = await p2pFetch(`/p2p/orders/${orderId}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Unable to open order.');
    }
    if (!isOngoingOrderStatus(data?.order?.status)) {
      throw new Error('Only ongoing orders can be opened.');
    }
    openOrder(data.order);
    await loadLiveOrders();
  } catch (error) {
    liveOrdersMeta.textContent = error.message;
  }
}

async function sendOrderMessage(text) {
  if (!activeOrderId || !String(text || '').trim()) {
    return;
  }

  const response = await p2pFetch(`/p2p/orders/${activeOrderId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ text: String(text).trim() })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Message failed.');
  }
  renderMessages(data.messages, { smoothScroll: true });
}

async function updateOrderStatus(action, options = {}) {
  if (!activeOrderId) {
    return;
  }

  try {
    // Map action to bitegit-backend endpoint
    const actionEndpointMap = { mark_paid: 'paid', release: 'release', cancel: 'cancel' };
    const actionEndpoint = actionEndpointMap[action] || action;
    const response = await p2pFetch(`/p2p/orders/${activeOrderId}/${actionEndpoint}`, {
      method: 'POST',
      body: JSON.stringify({})
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Unable to update order.');
    }

    updateOrderUi(data.order);
    if (action === 'mark_paid' && !options.skipNotification) {
      await sendOrderMessage('Payment done from buyer side. Please verify and release crypto.');
    }
    if (action === 'cancel' && options.reason && !options.skipNotification) {
      await sendOrderMessage(`Order cancelled. Reason: ${options.reason}`);
    }
    await fetchMessages();
    await loadLiveOrders();
    await loadProfilePanel({ refreshWallet: true });
  } catch (error) {
    chatState.textContent = error.message;
    throw error;
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

function bindOpenOrderDelegation(container) {
  if (!container) {
    return;
  }

  container.addEventListener('click', (event) => {
    const openBtn = event.target.closest('.open-order-btn');
    if (!openBtn) {
      return;
    }
    openOrderById(openBtn.dataset.orderId);
  });
}

bindOpenOrderDelegation(liveOrdersRows);
bindOpenOrderDelegation(liveOrdersCards);
if (mobileOrdersList && mobileOrdersList !== liveOrdersCards) {
  bindOpenOrderDelegation(mobileOrdersList);
}

if (mobileOrdersTabs) {
  mobileOrdersTabs.addEventListener('click', (event) => {
    const target = event.target.closest('[data-order-filter]');
    if (!target) {
      return;
    }
    mobileOrderFilter = String(target.dataset.orderFilter || 'all').trim().toLowerCase();
    mobileOrdersTabs.querySelectorAll('[data-order-filter]').forEach((button) => {
      button.classList.toggle('active', button === target);
    });
    renderMobileOrdersList();
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

if (kycCloseBtn) {
  kycCloseBtn.addEventListener('click', closeKycModal);
}

if (kycBackdrop) {
  kycBackdrop.addEventListener('click', closeKycModal);
}

if (kycAadhaarInput) {
  kycAadhaarInput.addEventListener('input', () => {
    const digits = String(kycAadhaarInput.value || '')
      .replace(/\D/g, '')
      .slice(0, 12);
    kycAadhaarInput.value = digits;
  });
}

if (kycAadhaarFrontInput) {
  kycAadhaarFrontInput.addEventListener('change', () => {
    const file = kycAadhaarFrontInput.files?.[0] || null;
    setKycFileMeta(kycAadhaarFrontMeta, file, 'Upload clear front side image.');
  });
}

if (kycSelfieInput) {
  kycSelfieInput.addEventListener('change', () => {
    const file = kycSelfieInput.files?.[0] || null;
    setKycFileMeta(kycSelfieMeta, file, 'Face and document must be clearly visible in one frame.');
  });
}

if (kycForm) {
  kycForm.addEventListener('submit', submitKycForm);
}

if (adCreateForm) {
  adCreateForm.addEventListener('submit', handleAdCreate);
}

if (refreshMyAdsBtn) {
  refreshMyAdsBtn.addEventListener('click', () => {
    loadMyAds();
  });
}

if (closeModalBtn) {
  closeModalBtn.addEventListener('click', closeOrderModal);
}
if (closeModalBackdrop) {
  closeModalBackdrop.addEventListener('click', closeOrderModal);
}
if (markPaidBtn) {
  markPaidBtn.addEventListener('click', async () => {
    const action = markPaidBtn.dataset.action;
    if (action === 'release') {
      try {
        await updateOrderStatus('release');
      } catch (error) {
        // Status message already updated by updateOrderStatus.
      }
      return;
    }
    if (action === 'pay') {
      setPaymentPanelOpen(true);
      return;
    }
  });
}
if (cancelOrderBtn) {
  cancelOrderBtn.addEventListener('click', () => setCancelModalOpen(true));
}
if (paidConfirmBtn) {
  paidConfirmBtn.addEventListener('click', async () => {
    if (paidConfirmBtn.disabled) {
      return;
    }
    paidConfirmBtn.disabled = true;
    try {
      await updateOrderStatus('mark_paid');
      setPaymentPanelOpen(false);
    } catch (error) {
      // Status message already updated by updateOrderStatus.
    } finally {
      if (!['PAID', 'RELEASED', 'CANCELLED', 'EXPIRED'].includes(normalizeStatusForUi(activeOrderSnapshot?.status))) {
        paidConfirmBtn.disabled = false;
      }
    }
  });
}
if (orderChatBtn) {
  orderChatBtn.addEventListener('click', () => {
    if (!activeOrderId) {
      if (chatState) {
        chatState.textContent = 'Order is not ready for chat yet.';
      }
      return;
    }
    window.location.href = `/p2p-chat.html?orderId=${encodeURIComponent(activeOrderId)}`;
  });
}
if (cancelModalBackdrop) {
  cancelModalBackdrop.addEventListener('click', () => setCancelModalOpen(false));
}
if (cancelModalCloseBtn) {
  cancelModalCloseBtn.addEventListener('click', () => setCancelModalOpen(false));
}
if (cancelReasonForm) {
  cancelReasonForm.addEventListener('change', refreshCancelConfirmState);
}
if (cancelNoPaymentCheck) {
  cancelNoPaymentCheck.addEventListener('change', refreshCancelConfirmState);
}
if (cancelConfirmBtn) {
  cancelConfirmBtn.addEventListener('click', async () => {
    if (cancelConfirmBtn.disabled) {
      return;
    }
    const selectedReason = cancelReasonForm?.querySelector('input[name="cancelReason"]:checked')?.value || '';
    cancelConfirmBtn.disabled = true;
    try {
      await updateOrderStatus('cancel', { reason: selectedReason });
      setCancelModalOpen(false);
      setPaymentPanelOpen(false);
    } catch (error) {
      // Status message already updated by updateOrderStatus.
    } finally {
      refreshCancelConfirmState();
    }
  });
}

if (chatForm) {
  chatForm.addEventListener('submit', sendMessageHandler);
}
if (chatImageBtn && chatImageInput) {
  chatImageBtn.addEventListener('click', () => {
    if (!activeOrderId || chatUploading) {
      return;
    }
    chatImageInput.click();
  });
}
if (chatImageInput) {
  chatImageInput.addEventListener('change', handleChatImageSelected);
}
if (chatMessages) {
  chatMessages.addEventListener('click', (event) => {
    const previewButton = event.target.closest('.chat-image-link');
    if (!previewButton) {
      return;
    }
    const previewSrc = sanitizeImageUrl(previewButton.getAttribute('data-preview-src') || '');
    if (previewSrc) {
      setImagePreviewOpen(true, previewSrc);
    }
  });
}
if (imagePreviewBackdrop) {
  imagePreviewBackdrop.addEventListener('click', () => setImagePreviewOpen(false));
}
if (imagePreviewCloseBtn) {
  imagePreviewCloseBtn.addEventListener('click', () => setImagePreviewOpen(false));
}

if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', () => {
    const nextTheme = document.body.classList.contains('p2p-theme-dark') ? 'light' : 'dark';
    applyTheme(nextTheme);
  });
}

if (mobileCurrencyBtn) {
  mobileCurrencyBtn.addEventListener('click', () => {
    if (!currencyFilter) {
      return;
    }
    currencyFilter.scrollIntoView({ behavior: 'smooth', block: 'center' });
    currencyFilter.focus({ preventScroll: true });
  });
}

if (profileDepositBtn) {
  profileDepositBtn.addEventListener('click', () => {
    if (!currentUser) {
      setAuthModalOpen(true);
      return;
    }
    window.location.href = '/assets/';
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
    const targetLink = event.target.closest('a[data-mobile-tab]');
    if (!targetLink) {
      return;
    }
    if (isMobileViewport()) {
      event.preventDefault();
      setMobileTab(targetLink.dataset.mobileTab);
    }
  });
}

document.querySelectorAll('[data-mobile-tab-target]').forEach((link) => {
  link.addEventListener('click', (event) => {
    if (!isMobileViewport()) {
      return;
    }
    const tab = normalizeMobileTabName(link.getAttribute('data-mobile-tab-target'));
    event.preventDefault();
    setMobileTab(tab);
  });
});

window.addEventListener('hashchange', () => {
  syncMobileTabFromHash({ refreshP2P: false });
});

window.addEventListener('resize', () => {
  if (!isMobileViewport()) {
    setMobileNavActive('p2p');
    document.body.dataset.mobileTab = 'p2p';
    return;
  }
  syncMobileTabFromHash({ refreshP2P: false });
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    if (imagePreviewModal && !imagePreviewModal.classList.contains('hidden')) {
      setImagePreviewOpen(false);
      return;
    }
    if (cancelModal && !cancelModal.classList.contains('hidden')) {
      setCancelModalOpen(false);
      return;
    }
    if (dealModal && !dealModal.classList.contains('hidden')) {
      closeDealModal();
      return;
    }
    if (kycModal && !kycModal.classList.contains('hidden')) {
      closeKycModal();
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

window.addEventListener('pagehide', () => {
  document.body.style.overflow = 'auto';
  document.body.style.pointerEvents = 'auto';
});

(async function init() {
  initTheme();
  await loadCurrentUser();
  await loadOffers();
  await loadLiveOrders();
  await loadMyAds();
  await loadProfilePanel({ refreshWallet: true });
  await loadExchangeTicker();
  syncMobileTabFromHash();
  syncBodyInteractionState();
})();

setInterval(() => {
  if (currentUser && !activeOrderId && liveOrdersMeta) {
    loadLiveOrders();
  }
}, 9000);

// ===== PROFILE TABS (p2p.html) =====
function switchProfileTab(tab) {
  document.querySelectorAll('.profile-tab').forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.ptab === tab);
  });
  document.querySelectorAll('.profile-tab-panel').forEach(function(panel) {
    panel.classList.toggle('active', panel.id === 'ptab-' + tab);
  });
}

// ===== KYC FULL-PAGE FLOW (p2p.html) =====
var _kycBasicDone = false;

function _showKycPage(id) {
  ['kycPageBasic','kycPageAdvance'].forEach(function(pid) {
    var el = document.getElementById(pid);
    if (el) el.style.display = 'none';
  });
  var pg = document.getElementById(id);
  if (pg) { pg.style.setProperty('display','flex','important'); pg.style.flexDirection = 'column'; }
  window.scrollTo(0,0);
}

function openKycBasicPage() {
  _showKycPage('kycPageBasic');
}

function closeKycPages() {
  ['kycPageBasic','kycPageAdvance'].forEach(function(pid) {
    var el = document.getElementById(pid);
    if (el) el.style.display = 'none';
  });
}

function backToKycBasic() {
  _showKycPage('kycPageBasic');
}

// File changed handler — iOS-safe (FileReader not createObjectURL)
function kycFileChanged(input, hintId, thumbId) {
  var file = input && input.files && input.files[0];
  if (!file) return;
  var hint = document.getElementById(hintId);
  var thumb = document.getElementById(thumbId);
  var card = input.closest ? input.closest('.kyc-upload-card') : null;
  if (hint) hint.textContent = file.name + ' (' + (file.size / 1024).toFixed(0) + ' KB) ✓';
  var reader = new FileReader();
  reader.onload = function(e) {
    if (thumb) { thumb.src = e.target.result; thumb.style.display = 'block'; }
    if (card) card.classList.add('done');
  };
  reader.readAsDataURL(file);
}

function _setHint(id, msg, type) {
  var el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.className = 'kyc-fp-hint ' + (type || '');
}

function submitKycBasicAndNext() {
  var name  = ((document.getElementById('kycFullName') || {}).value || '').trim();
  var dob   = ((document.getElementById('kycDob') || {}).value || '').trim();
  var phone = ((document.getElementById('kycPhone') || {}).value || '').trim();
  if (!name)  { _setHint('kycBasicHint', 'Please enter your full name.', 'error'); return; }
  if (!dob)   { _setHint('kycBasicHint', 'Please enter your date of birth.', 'error'); return; }
  if (!phone) { _setHint('kycBasicHint', 'Please enter your phone number.', 'error'); return; }
  _kycBasicDone = true;
  // Update badge
  var badge = document.getElementById('kycStatusBadge');
  if (badge) { badge.textContent = 'Lv.1 Done'; badge.style.cssText = 'background:rgba(22,199,132,0.15);border:1px solid rgba(22,199,132,0.35);color:#16c784;font-size:0.6rem;font-weight:700;padding:2px 7px;border-radius:999px;'; }
  // Go to step 2
  _showKycPage('kycPageAdvance');
}

function submitKycAdvance() {
  var front   = (document.getElementById('kycAadhaarFront') || {}).files;
  var back    = (document.getElementById('kycAadhaarBack') || {}).files;
  var selfie  = (document.getElementById('kycSelfieDoc') || {}).files;
  var consent = (document.getElementById('kycL2Consent') || {}).checked;
  if (!front || !front.length)  { _setHint('kycAdvHint', 'Please upload Aadhaar front photo.', 'error'); return; }
  if (!back  || !back.length)   { _setHint('kycAdvHint', 'Please upload Aadhaar back photo.', 'error'); return; }
  if (!selfie|| !selfie.length) { _setHint('kycAdvHint', 'Please upload selfie with Aadhaar.', 'error'); return; }
  if (!consent) { _setHint('kycAdvHint', 'Please accept the consent checkbox.', 'error'); return; }
  _setHint('kycAdvHint', 'Documents submitted! Verification takes 24–48 hrs.', 'success');
  // Update badge to Under Review
  var badge = document.getElementById('kycStatusBadge');
  if (badge) { badge.textContent = 'Under Review'; badge.style.cssText = 'background:rgba(241,165,65,0.12);border:1px solid rgba(241,165,65,0.3);color:#f0b90b;font-size:0.6rem;font-weight:700;padding:2px 7px;border-radius:999px;'; }
  var btn = document.querySelector('#kycPageAdvance .kyc-fp-btn');
  if (btn) { btn.textContent = 'Submitted for Review ✓'; btn.disabled = true; }
  // Auto-close after 2s
  setTimeout(closeKycPages, 2000);
}

setInterval(loadExchangeTicker, 7000);
