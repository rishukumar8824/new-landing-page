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
const disputeBtn = document.getElementById('disputeBtn');
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
  // PAYMENT_SENT = buyer confirmed payment → treat as PAID in UI (seller needs to release)
  if (status === 'PAYMENT_SENT') {
    return 'PAID';
  }
  return String(status || '').toUpperCase();
}

function statusLabel(status) {
  const map = {
    CREATED: 'Pending Payment',
    PAID: 'Payment Sent',
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
  if (['p2p', 'orders', 'ads', 'post', 'profile'].includes(normalized)) {
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
  // Also refresh the mobile active-orders tab if it's open
  if (typeof renderMobileActiveOrders === 'function' && typeof _mobOrderTab !== 'undefined' && _mobOrderTab === 'active') {
    renderMobileActiveOrders();
  }
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
  if (!myAdsList) return;
  if (!offers.length) {
    myAdsList.innerHTML = '<p class="empty-row">No ads posted yet.</p>';
    return;
  }
  myAdsList.innerHTML = offers.map((offer) => {
    const adType = String(offer.adType || (offer.side === 'buy' ? 'sell' : 'buy')).toUpperCase();
    const payments = Array.isArray(offer.payments) ? offer.payments.join(', ') : '--';
    const isPaused = offer.status === 'PAUSED';
    const statusLabel = isPaused
      ? '<span class="my-ad-status paused">Paused</span>'
      : '<span class="my-ad-status active">Active</span>';
    return `
      <article class="my-ad-card" data-offer-id="${offer.id}">
        <div class="my-ad-top">
          <div>
            <span class="my-ad-type ${offer.side === 'buy' ? 'ad-buy' : 'ad-sell'}">${adType}</span>
            <strong class="my-ad-asset">${escapeHtml(offer.asset || 'USDT')}</strong>
          </div>
          ${statusLabel}
        </div>
        <div class="my-ad-price">₹${formatNumber(offer.price || 0)} <span class="my-ad-cur">INR</span></div>
        <div class="my-ad-row"><span>Available</span><span>${formatNumber(offer.available || offer.availableAmount || 0)} ${escapeHtml(offer.asset || 'USDT')}</span></div>
        <div class="my-ad-row"><span>Limits</span><span>₹${formatNumber(offer.minLimit || 0)} ~ ₹${formatNumber(offer.maxLimit || 0)}</span></div>
        <div class="my-ad-row"><span>Payment</span><span>${escapeHtml(payments)}</span></div>
        <div class="my-ad-actions">
          <button class="my-ad-btn my-ad-edit" onclick="openEditAdModal('${offer.id}')">Edit</button>
          <button class="my-ad-btn my-ad-pause" onclick="togglePauseAd('${offer.id}','${isPaused ? 'ACTIVE' : 'PAUSED'}')">${isPaused ? 'Resume' : 'Pause'}</button>
          <button class="my-ad-btn my-ad-delete" onclick="deleteMyAd('${offer.id}')">Delete</button>
        </div>
      </article>
    `;
  }).join('');
}

async function togglePauseAd(offerId, newStatus) {
  try {
    const res = await fetch(`/api/p2p/offers/${offerId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    const data = await res.json();
    if (!res.ok) { alert(data.message || 'Failed to update ad.'); return; }
    await loadMyAds();
  } catch (e) { alert('Network error.'); }
}

async function deleteMyAd(offerId) {
  if (!confirm('Delete this ad? This cannot be undone.')) return;
  try {
    const res = await fetch(`/api/p2p/offers/${offerId}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) { alert(data.message || 'Failed to delete ad.'); return; }
    await loadMyAds();
  } catch (e) { alert('Network error.'); }
}

function openEditAdModal(offerId) {
  var offer = null;
  // find from DOM
  var card = document.querySelector(`.my-ad-card[data-offer-id="${offerId}"]`);
  // Show edit modal
  var existing = document.getElementById('editAdModal');
  if (existing) existing.remove();
  var modal = document.createElement('div');
  modal.id = 'editAdModal';
  modal.className = 'edit-ad-modal-overlay';
  modal.innerHTML = `
    <div class="edit-ad-modal">
      <div class="edit-ad-head">
        <h3>Edit Ad</h3>
        <button onclick="document.getElementById('editAdModal').remove()" class="edit-ad-close">✕</button>
      </div>
      <div class="edit-ad-body">
        <label class="edit-ad-label">Price (INR)</label>
        <input id="eadPrice" type="number" class="edit-ad-input" placeholder="Enter price"/>
        <label class="edit-ad-label">Min Limit (INR)</label>
        <input id="eadMin" type="number" class="edit-ad-input" placeholder="Min limit"/>
        <label class="edit-ad-label">Max Limit (INR)</label>
        <input id="eadMax" type="number" class="edit-ad-input" placeholder="Max limit"/>
        <label class="edit-ad-label">Payment Methods (comma separated)</label>
        <input id="eadPayments" type="text" class="edit-ad-input" placeholder="UPI, Bank Transfer"/>
        <label class="edit-ad-label">Remark (optional)</label>
        <input id="eadRemark" type="text" class="edit-ad-input" placeholder="Note for buyers"/>
      </div>
      <button class="mob-kyc-fp-btn" style="background:linear-gradient(96deg,#00c2b2,#0099a8);margin:0 1rem 1rem;" onclick="submitEditAd('${offerId}')">Save Changes</button>
    </div>
  `;
  document.body.appendChild(modal);
}

async function submitEditAd(offerId) {
  const price = Number(document.getElementById('eadPrice')?.value);
  const minLimit = Number(document.getElementById('eadMin')?.value);
  const maxLimit = Number(document.getElementById('eadMax')?.value);
  const paymentsRaw = document.getElementById('eadPayments')?.value || '';
  const remark = document.getElementById('eadRemark')?.value || '';
  const payments = paymentsRaw.split(',').map(p => p.trim()).filter(Boolean);
  const body = {};
  if (price) body.price = price;
  if (minLimit) body.minLimit = minLimit;
  if (maxLimit) body.maxLimit = maxLimit;
  if (payments.length) body.payments = payments;
  if (remark) body.remark = remark;
  try {
    const res = await fetch(`/api/p2p/offers/${offerId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) { alert(data.message || 'Update failed.'); return; }
    document.getElementById('editAdModal')?.remove();
    await loadMyAds();
  } catch (e) { alert('Network error.'); }
}

async function loadMyAds() {
  if (!myAdsList) return;
  if (!currentUser) {
    myAdsList.innerHTML = '<p class="empty-row">Login required to view your ads.</p>';
    return;
  }
  try {
    const res = await fetch('/api/p2p/my-ads');
    const data = await res.json().catch(() => ({ offers: [] }));
    const myOffers = Array.isArray(data.offers) ? data.offers.sort((a, b) => Number(b.price || 0) - Number(a.price || 0)) : [];
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
    const response = await fetch('/api/p2p/offers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
  // Update KYC badge in profile menu
  var kycBadge = document.getElementById('kycStatusBadge');
  if (kycBadge) {
    if (currentKycStatus === 'VERIFIED') {
      kycBadge.textContent = 'Verified';
      kycBadge.style.cssText = 'font-size:0.62rem;font-weight:700;padding:2px 7px;border-radius:999px;background:rgba(22,199,132,0.15);border:1px solid rgba(22,199,132,0.35);color:#16c784;margin-left:6px;';
    } else if (currentKycStatus === 'PENDING_REVIEW') {
      kycBadge.textContent = 'Under Review';
      kycBadge.style.cssText = 'font-size:0.62rem;font-weight:700;padding:2px 7px;border-radius:999px;background:rgba(240,185,11,0.12);border:1px solid rgba(240,185,11,0.3);color:#f0b90b;margin-left:6px;';
    } else if (currentKycStatus === 'REJECTED') {
      kycBadge.textContent = 'Rejected';
      kycBadge.style.cssText = 'font-size:0.62rem;font-weight:700;padding:2px 7px;border-radius:999px;background:rgba(246,70,93,0.15);border:1px solid rgba(246,70,93,0.3);color:#f6465d;margin-left:6px;cursor:pointer;';
      // Show rejection reason screen automatically once
      var rejReason = currentUser?.kyc?.rejectionReason || '';
      var rejScreen = document.getElementById('kycRejectedScreen');
      var rejReasonBox = document.getElementById('kycRejectionReasonBox');
      var rejReasonText = document.getElementById('kycRejectionReasonText');
      if (rejScreen && rejReasonText) {
        rejReasonText.textContent = rejReason || 'No specific reason provided.';
        if (rejReasonBox) rejReasonBox.style.display = rejReason ? '' : 'none';
      }
      // Make badge clickable to show rejection screen
      kycBadge.onclick = function() { if (rejScreen) rejScreen.style.display = ''; };
    } else {
      kycBadge.textContent = 'Not Done';
      kycBadge.style.cssText = 'font-size:0.62rem;font-weight:700;padding:2px 7px;border-radius:999px;background:rgba(246,70,93,0.15);border:1px solid rgba(246,70,93,0.3);color:#f6465d;margin-left:6px;';
    }
  }
  if (profileSecurity) {
    profileSecurity.textContent = currentKycStatus === 'VERIFIED' ? 'KYC + Email Protected' : 'KYC Required';
  }

  const shouldRefreshWallet =
    Boolean(options.refreshWallet) || Date.now() - profileWalletSyncedAt > 30 * 1000;

  if (shouldRefreshWallet) {
    try {
      const response = await fetch('/api/p2p/wallet');
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
    const response = await fetch('/api/p2p/kyc/status');
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
    const response = await fetch('/api/p2p/kyc/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
  if (open) { window.location.href = '/auth.html'; return; }
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
    const response = await fetch('/api/p2p/me');
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
  if (!email || !password) { setUserStatus('Enter email and password', 'user-error'); return; }

  // Show loading state on button
  const origText = loginBtn ? loginBtn.textContent : '';
  if (loginBtn) { loginBtn.disabled = true; loginBtn.textContent = 'Logging in...'; }

  try {
    const response = await fetch('/api/p2p/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();

    if (loginBtn) { loginBtn.disabled = false; loginBtn.textContent = origText; }
    if (!response.ok) {
      throw new Error(data.message || 'Login failed.');
    }

    currentUser = data.user;
    updateCurrentUserKyc(currentUser?.kyc || {});
    updateUserUi();
    setAuthModalOpen(false);
    setP2PNavOpen(false);
    // run all post-login loads in parallel — much faster
    Promise.all([loadOffers(), loadLiveOrders(), loadMyAds(), loadProfilePanel({ refreshWallet: true })]);
    // Refresh orders if orders screen is open
    var ordScreen = document.getElementById('mobOrdersScreen');
    if (ordScreen && ordScreen.style.display !== 'none') {
      _ordLoaded = false;
      loadBybitorOrders();
    }

    const redirectPath = getPostLoginRedirectPath();
    if (redirectPath) {
      window.location.href = redirectPath;
      return;
    }
  } catch (error) {
    if (loginBtn) { loginBtn.disabled = false; loginBtn.textContent = origText; }
    setUserStatus(error.message, 'user-error');
  }
}

async function logoutUser() {
  try {
    await fetch('/api/p2p/logout', { method: 'POST' });
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

function renderOffers(data, append) {
  if (!append) offersMap = new Map();

  if (!Array.isArray(data.offers) || data.offers.length === 0) {
    if (!append) {
      if (rowsEl) rowsEl.innerHTML = '<tr><td colspan="6" class="empty-row">No active ads available</td></tr>';
      if (cardsEl) cardsEl.innerHTML = '<article class="p2p-offer-card"><p class="empty-row">No active ads available</p></article>';
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
              <p class="adv-meta">${(offer.reputation && offer.reputation.completedOrders != null) ? offer.reputation.completedOrders : offer.orders} Orders | ${(offer.reputation && offer.reputation.completionRate != null) ? offer.reputation.completionRate : offer.completionRate}%</p>
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

    const rep = offer.reputation || {};
    const repOrders = rep.completedOrders != null ? rep.completedOrders : (offer.orders || 0);
    const repRate = rep.completionRate != null ? rep.completionRate : (offer.completionRate || 100);
    const repTime = rep.avgReleaseMinutes != null ? rep.avgReleaseMinutes + ' min' : (offer.orders > 500 ? '10 min' : offer.orders > 100 ? '15 min' : '20 min');
    const paymentGate = offer.payments.map(m => `<span class="gt-pay">${escapeHtml(m)}</span>`).join('');

    cardsHtml.push(`
      <article class="gt-card">
        <div class="gt-left">
          <div class="gt-user-row">
            <span class="gt-username">${escapeHtml(offer.advertiser)}</span>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M8 1L14 6.5L8 15L2 6.5Z" fill="#2563eb"/><line x1="2" y1="6.5" x2="14" y2="6.5" stroke="white" stroke-width="1"/></svg>
          </div>
          <div class="gt-stats">
            <span>${repOrders} Orders</span>
            <span class="gt-div">|</span>
            <span>${repRate}%</span>
            <span class="gt-div">|</span>
            <span>⏱ ${repTime}</span>
          </div>
          <div class="gt-online"><span class="gt-dot"></span>Online</div>
          <p class="gt-price">₹${formatNumber(offer.price)} <span class="gt-cur">INR</span></p>
          <div class="gt-row"><span class="gt-lbl">Quantity</span><span class="gt-val">${quantity}</span></div>
          <div class="gt-row"><span class="gt-lbl">Limit</span><span class="gt-val">₹${formatNumber(offer.minLimit)}~₹${formatNumber(offer.maxLimit)}</span></div>
          <div class="gt-pays">${paymentGate}</div>
        </div>
        <div class="gt-right">
          <button
            type="button"
            class="gt-btn offer-action-btn ${data.side === 'sell' ? 'gt-btn-sell' : ''}"
            data-offer-id="${offer.id}"
            ${isOwnAd ? 'disabled' : ''}
          >${actionText}</button>
        </div>
      </article>
    `);
  });

  if (rowsEl) {
    if (append) rowsEl.insertAdjacentHTML('beforeend', rowsHtml.join(''));
    else rowsEl.innerHTML = rowsHtml.join('');
  }
  if (cardsEl) {
    if (append) cardsEl.insertAdjacentHTML('beforeend', cardsHtml.join(''));
    else cardsEl.innerHTML = cardsHtml.join('');
  }
}

function getDummyOffers(side) {
  const buyOffers = [
    { id: 'd1', advertiser: 'RajeshTrader', orders: 1240, completionRate: 99, price: 96.40, available: 8500, asset: 'USDT', minLimit: 1000, maxLimit: 500000, payments: ['UPI', 'IMPS', 'Bank Transfer'] },
    { id: 'd2', advertiser: 'CryptoKing_IN', orders: 873, completionRate: 98, price: 96.55, available: 3200, asset: 'USDT', minLimit: 500, maxLimit: 200000, payments: ['UPI', 'Paytm'] },
    { id: 'd3', advertiser: 'SunilP2P', orders: 456, completionRate: 97, price: 96.70, available: 1500, asset: 'USDT', minLimit: 2000, maxLimit: 100000, payments: ['NEFT', 'IMPS', 'Bank Transfer'] },
    { id: 'd4', advertiser: 'MumbaiExchange', orders: 2341, completionRate: 99, price: 96.80, available: 12000, asset: 'USDT', minLimit: 5000, maxLimit: 1000000, payments: ['UPI', 'IMPS'] },
    { id: 'd5', advertiser: 'AyushCrypto', orders: 312, completionRate: 96, price: 96.95, available: 950, asset: 'USDT', minLimit: 1000, maxLimit: 50000, payments: ['Paytm', 'UPI'] },
    { id: 'd6', advertiser: 'DelhiP2P', orders: 689, completionRate: 98, price: 97.10, available: 4000, asset: 'USDT', minLimit: 500, maxLimit: 300000, payments: ['Bank Transfer', 'NEFT'] },
    { id: 'd7', advertiser: 'PriyaFinance', orders: 145, completionRate: 95, price: 97.25, available: 600, asset: 'USDT', minLimit: 2000, maxLimit: 80000, payments: ['UPI', 'IMPS'] },
    { id: 'd8', advertiser: 'BinanceIndia', orders: 3102, completionRate: 99, price: 97.40, available: 25000, asset: 'USDT', minLimit: 1000, maxLimit: 2000000, payments: ['UPI', 'IMPS', 'NEFT', 'Bank Transfer'] },
  ];
  const sellOffers = [
    { id: 's1', advertiser: 'SwapMaster_IN', orders: 980, completionRate: 99, price: 95.80, available: 6000, asset: 'USDT', minLimit: 1000, maxLimit: 400000, payments: ['UPI', 'Bank Transfer'] },
    { id: 's2', advertiser: 'VikramTrades', orders: 554, completionRate: 97, price: 95.60, available: 2100, asset: 'USDT', minLimit: 500, maxLimit: 150000, payments: ['UPI', 'Paytm'] },
    { id: 's3', advertiser: 'KolkataP2P', orders: 234, completionRate: 96, price: 95.45, available: 800, asset: 'USDT', minLimit: 2000, maxLimit: 90000, payments: ['IMPS', 'NEFT'] },
    { id: 's4', advertiser: 'FastSeller99', orders: 1670, completionRate: 99, price: 95.30, available: 9000, asset: 'USDT', minLimit: 5000, maxLimit: 800000, payments: ['UPI', 'IMPS'] },
    { id: 's5', advertiser: 'NitinExchange', orders: 421, completionRate: 97, price: 95.20, available: 1300, asset: 'USDT', minLimit: 1000, maxLimit: 75000, payments: ['Bank Transfer', 'UPI'] },
    { id: 's6', advertiser: 'ChennaiCrypto', orders: 789, completionRate: 98, price: 95.10, available: 3500, asset: 'USDT', minLimit: 500, maxLimit: 250000, payments: ['Paytm', 'IMPS', 'UPI'] },
    { id: 's7', advertiser: 'TrustTrader_IN', orders: 163, completionRate: 95, price: 94.95, available: 500, asset: 'USDT', minLimit: 2000, maxLimit: 60000, payments: ['UPI'] },
    { id: 's8', advertiser: 'GlobalSwapIN', orders: 2210, completionRate: 99, price: 94.80, available: 18000, asset: 'USDT', minLimit: 1000, maxLimit: 1500000, payments: ['UPI', 'NEFT', 'Bank Transfer'] },
  ];
  return {
    side,
    asset: 'USDT',
    total: 8,
    updatedAt: new Date().toISOString(),
    offers: side === 'buy' ? buyOffers : sellOffers
  };
}

var _offersOffset = 0;
var _offersHasMore = false;

async function loadOffers(append) {
  if (!append) _offersOffset = 0;
  var loadMoreBtn = document.getElementById('loadMoreOffersBtn');

  const params = new URLSearchParams({
    side: currentSide,
    asset: currentAsset,
    limit: 10,
    offset: _offersOffset
  });

  if (paymentFilter?.value) params.set('payment', paymentFilter.value);
  if (amountFilter?.value) params.set('amount', amountFilter.value);
  if (advertiserFilter?.value.trim()) params.set('advertiser', advertiserFilter.value.trim());

  if (!append && metaEl) metaEl.textContent = 'Loading offers...';
  if (loadMoreBtn) loadMoreBtn.textContent = 'Loading...';

  try {
    const response = await fetch(`/api/p2p/offers?${params.toString()}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Unable to load offers.');

    if (!Array.isArray(data.offers) || data.offers.length === 0) {
      if (!append) {
        var cardsEl2 = document.getElementById('offerCards');
        if (cardsEl2) cardsEl2.innerHTML = '<div class="p2p-empty-state"><p>No ads yet.<br>Be the first to post an ad!</p><button class="p2p-post-ad-cta" onclick="document.querySelector(\'[data-mob=\\\'post\\\']\')?.click()">Post Ad</button></div>';
        if (metaEl) metaEl.textContent = `${currentSide.toUpperCase()} USDT offers: 0`;
      }
      if (loadMoreBtn) loadMoreBtn.style.display = 'none';
      return;
    }

    renderOffers(data, append);
    _offersOffset += data.offers.length;
    _offersHasMore = Boolean(data.hasMore);
    if (loadMoreBtn) {
      loadMoreBtn.style.display = _offersHasMore ? 'inline-block' : 'none';
      loadMoreBtn.textContent = 'Load More Ads';
    }
    if (metaEl) {
      metaEl.textContent = `${data.side.toUpperCase()} ${data.asset} offers: ${data.total} | Updated ${new Date(data.updatedAt).toLocaleTimeString()}`;
    }
  } catch (error) {
    if (!append) {
      var cardsElErr = document.getElementById('offerCards');
      if (cardsElErr) cardsElErr.innerHTML = '<div class="p2p-empty-state"><p>No ads yet.<br>Be the first to post an ad!</p><button class="p2p-post-ad-cta" onclick="document.querySelector(\'[data-mob=\\\'post\\\']\')?.click()">Post Ad</button></div>';
      if (metaEl) metaEl.textContent = '';
    }
    if (loadMoreBtn) { loadMoreBtn.style.display = 'none'; loadMoreBtn.textContent = 'Load More Ads'; }
  }
}

var _loadMoreOffersBtn = document.getElementById('loadMoreOffersBtn');
if (_loadMoreOffersBtn) {
  _loadMoreOffersBtn.addEventListener('click', function() { loadOffers(true); });
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
    alert('Ad not found. Please refresh and try again.');
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
  const currentUserId = String(currentUser?.id || '').trim();
  const participantOrders = incomingOrders
    .map((order) => {
      if (!order || typeof order !== 'object') {
        return null;
      }

      const buyerUserId = String(order.buyerUserId || '').trim();
      const sellerUserId = String(order.sellerUserId || '').trim();
      const inferredParticipant =
        Boolean(currentUserId) && (buyerUserId === currentUserId || sellerUserId === currentUserId);

      return {
        ...order,
        isParticipant:
          typeof order.isParticipant === 'boolean' ? order.isParticipant : inferredParticipant
      };
    })
    .filter((order) => Boolean(order?.isParticipant));
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
    const response = await fetch('/api/p2p/orders/my-active', {
      credentials: 'include',
      headers: { 'Cache-Control': 'no-store' }
    });
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
  // Update avatar in redesigned modal
  var merchantAvatar = document.getElementById('orderMerchantAvatar');
  if (merchantAvatar) {
    merchantAvatar.textContent = String(counterpartyName || 'S').slice(0, 1).toUpperCase();
  }
  // Update order title based on status
  var normalizedSt = normalizeStatusForUi(order.status);
  var titleMap = {
    CREATED: 'Order generated. Proceed to payment.',
    PAID: 'Payment sent — waiting for seller to release.',
    RELEASED: 'Order completed! Crypto released.',
    CANCELLED: 'Order cancelled.',
    DISPUTED: 'Order under dispute. Admin reviewing.',
    EXPIRED: 'Order expired.'
  };
  if (orderTitle) orderTitle.textContent = titleMap[normalizedSt] || 'Order in progress.';
  orderPrice.textContent = `₹${formatNumber(order.price)} / ${order.asset}`;
  orderAmount.textContent = `₹${formatNumber(order.amountInr)}`;
  orderAssetAmount.textContent = `${formatNumber(order.assetAmount)} ${order.asset}`;
  if (orderFee) {
    orderFee.textContent = `0 USDT`;
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

  // Dispute button: show when PAID (buyer waiting for release) or DISPUTED
  if (disputeBtn) {
    var isDisputed = normalizedStatus === 'DISPUTED';
    var canDispute = isPaid && !isClosed;
    if (canDispute || isDisputed) {
      disputeBtn.classList.remove('hidden');
      disputeBtn.disabled = isDisputed;
      disputeBtn.textContent = isDisputed ? 'Dispute Active' : 'Raise Dispute';
    } else {
      disputeBtn.classList.add('hidden');
    }
  }
}

async function fetchMessages(options = {}) {
  if (!activeOrderId) {
    return;
  }

  try {
    const response = await fetch(`/api/p2p/orders/${activeOrderId}/messages`);
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
  const response = await fetch(`/api/p2p/orders/${activeOrderId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
    const response = await fetch(`/api/p2p/orders/${orderId}`);
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

  const response = await fetch(`/api/p2p/orders/${activeOrderId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
    const actionBtn = event.target.closest('.offer-action-btn, .gt-btn[data-offer-id]');
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

// ===== MOBILE ORDERS TAB LOGIC =====
var _mobOrderTab = 'active'; // 'active' or 'history'
var _mobHistoryLoaded = false;
var _mobHistoryData = [];

function renderMobileActiveOrders() {
  var list = document.getElementById('mobileOrdersList');
  if (!list) return;
  var orders = filteredMobileOrders();
  if (!orders.length) {
    list.innerHTML = '<div style="text-align:center;padding:2.5rem 1rem;"><div style="font-size:2rem;margin-bottom:0.5rem;">📋</div><p style="color:rgba(255,255,255,0.4);font-size:0.9rem;">No active orders</p></div>';
    return;
  }
  list.innerHTML = orders.map(function(order) {
    var sideLabel = (order.side || '').toUpperCase();
    var amtLabel = '₹' + formatNumber(order.amountInr || 0);
    var statusCls = statusClass(order.status);
    var statusTxt = statusLabel(order.status);
    var counterparty = order.participantsLabel || '--';
    return '<article class="mobile-order-card" style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:1rem;margin-bottom:0.75rem;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">' +
        '<span style="font-size:0.8rem;color:rgba(255,255,255,0.5);">' + escapeHtml(order.reference || order.id) + '</span>' +
        '<span class="status-pill ' + statusCls + '">' + statusTxt + '</span>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.4rem 1rem;font-size:0.87rem;margin-bottom:0.75rem;">' +
        '<div><span style="color:rgba(255,255,255,0.45);">Type</span><br/><strong style="color:' + (sideLabel==='BUY'?'#16a34a':'#f0b90b') + ';">' + sideLabel + ' ' + escapeHtml(order.asset || 'USDT') + '</strong></div>' +
        '<div><span style="color:rgba(255,255,255,0.45);">Amount</span><br/><strong>' + amtLabel + '</strong></div>' +
        '<div><span style="color:rgba(255,255,255,0.45);">Price</span><br/><strong>₹' + formatNumber(order.price || 0) + '</strong></div>' +
        '<div><span style="color:rgba(255,255,255,0.45);">Payment</span><br/><strong>' + escapeHtml(order.paymentMethod || '--') + '</strong></div>' +
      '</div>' +
      '<div style="display:flex;align-items:center;justify-content:space-between;">' +
        '<span style="font-size:0.8rem;color:rgba(255,255,255,0.4);">With: ' + escapeHtml(counterparty) + '</span>' +
        '<button type="button" class="secondary-btn open-order-btn" data-order-id="' + escapeHtml(order.id) + '" style="padding:6px 16px;font-size:0.82rem;">Open →</button>' +
      '</div>' +
    '</article>';
  }).join('');
}

async function loadMobileActiveOrdersDirect() {
  // Directly fetches current user's active orders (bypasses the 20-order live feed limit)
  if (!currentUser) return;
  try {
    var resp = await fetch('/api/p2p/orders/my-active', {
      credentials: 'include',
      headers: { 'Cache-Control': 'no-store' }
    });
    var data = await resp.json();
    var orders = data.orders || [];
    orders.forEach(function(o) { storeOrderForMobile(o); });
    renderMobileActiveOrders();
  } catch(e) { /* silent — fallback to cached orders */ }
}

async function loadMobileOrderHistory() {
  var list = document.getElementById('mobileHistoryList');
  if (!list) return;
  if (!currentUser) { list.innerHTML = '<p style="text-align:center;padding:2rem;color:rgba(255,255,255,0.4);">Login to view history</p>'; return; }
  list.innerHTML = '<p style="text-align:center;padding:2rem;color:rgba(255,255,255,0.4);">Loading...</p>';
  try {
    var resp = await fetch('/api/p2p/orders/history?limit=20&offset=0');
    var data = await resp.json();
    var orders = data.orders || [];
    if (!orders.length) {
      list.innerHTML = '<div style="text-align:center;padding:2.5rem 1rem;"><div style="font-size:2rem;margin-bottom:0.5rem;">📜</div><p style="color:rgba(255,255,255,0.4);font-size:0.9rem;">No completed orders yet</p></div>';
      return;
    }
    list.innerHTML = orders.map(function(order) {
      var sideLabel = (order.side || '').toUpperCase();
      var statusCls = statusClass(order.status);
      var statusTxt = statusLabel(order.status);
      var date = order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN') : '--';
      return '<article style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:0.85rem 1rem;margin-bottom:0.6rem;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.4rem;">' +
          '<span style="font-size:0.78rem;color:rgba(255,255,255,0.4);">' + escapeHtml(order.reference || order.id) + '</span>' +
          '<span class="status-pill ' + statusCls + '">' + statusTxt + '</span>' +
        '</div>' +
        '<div style="display:flex;justify-content:space-between;font-size:0.87rem;">' +
          '<span><strong style="color:' + (sideLabel==='BUY'?'#16a34a':'#f0b90b') + ';">' + sideLabel + '</strong> ₹' + formatNumber(order.amountInr || 0) + '</span>' +
          '<span style="color:rgba(255,255,255,0.4);">' + date + '</span>' +
        '</div>' +
      '</article>';
    }).join('');
    if (data.total > orders.length) {
      list.innerHTML += '<p style="text-align:center;font-size:0.82rem;color:rgba(255,255,255,0.4);padding:0.5rem;">Showing 20 of ' + data.total + ' orders</p>';
    }
  } catch(e) {
    list.innerHTML = '<p style="text-align:center;padding:2rem;color:rgba(255,255,255,0.4);">Failed to load history</p>';
  }
}

function switchMobileOrderTab(tab) {
  _mobOrderTab = tab;
  var activeList = document.getElementById('mobileOrdersList');
  var histList = document.getElementById('mobileHistoryList');
  var tabs = document.getElementById('mobileOrdersTabs');
  if (!activeList || !histList) return;
  if (tab === 'active') {
    activeList.style.display = '';
    histList.style.display = 'none';
    if (typeof loadMobileActiveOrdersDirect === 'function') {
      loadMobileActiveOrdersDirect();
    } else {
      renderMobileActiveOrders();
    }
  } else {
    activeList.style.display = 'none';
    histList.style.display = '';
    loadMobileOrderHistory();
  }
  if (tabs) {
    tabs.querySelectorAll('[data-order-filter]').forEach(function(btn) {
      var isActive = btn.dataset.orderFilter === tab;
      btn.style.color = isActive ? '#f0b90b' : 'rgba(255,255,255,0.5)';
      btn.style.borderBottom = isActive ? '2px solid #f0b90b' : '2px solid transparent';
      btn.style.fontWeight = isActive ? '600' : '400';
    });
  }
}

if (mobileOrdersTabs) {
  mobileOrdersTabs.addEventListener('click', function(event) {
    var target = event.target.closest('[data-order-filter]');
    if (!target) return;
    switchMobileOrderTab(target.dataset.orderFilter);
  });
}

// ===== END MOBILE ORDERS TAB LOGIC =====

// ===== BYBIT-STYLE ORDERS SCREEN =====
var _ordMainTab = 'pending';
var _ordSubTab = 'inprogress';
var _ordAllOrders = [];
var _ordLoaded = false;

var _ORD_LIST_IDS = { inprogress: 'ordListInprogress', dispute: 'ordListDispute', completed: 'ordListCompleted', canceled: 'ordListCanceled' };
var _ORD_STATUS_MAP = {
  inprogress: ['CREATED','PENDING','PAID','PAYMENT_SENT'],
  dispute:    ['DISPUTED'],
  completed:  ['RELEASED','COMPLETED'],
  canceled:   ['CANCELLED','CANCELED','EXPIRED']
};

function _ordCard(order) {
  var side = (order.side || '').toUpperCase();
  var sideColor = side === 'BUY' ? '#2ebd85' : '#f6465d';
  var d = order.createdAt ? new Date(order.createdAt) : null;
  var pad = function(n) { return n < 10 ? '0' + n : '' + n; };
  var dt = d ? d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+' '+pad(d.getHours())+':'+pad(d.getMinutes())+':'+pad(d.getSeconds()) : '--';
  var qty = Number(order.assetAmount || 0);
  var qtyStr = qty % 1 === 0 ? qty.toString() : parseFloat(qty.toFixed(4)).toString();
  var fmt = function(n) { return formatNumber ? formatNumber(n) : n; };
  var counterparty = escapeHtml ? escapeHtml(order.participantsLabel || '--') : (order.participantsLabel || '--');
  var rawId = order.id || '';
  var ordId = encodeURIComponent(rawId);
  // store order in localStorage so order-flow page can show instantly
  try { localStorage.setItem('p2p_order_' + rawId, JSON.stringify(order)); } catch(e){}
  var orderUrl = '/p2p-order-flow.html?orderId=' + ordId;
  var chatUrl  = '/p2p-order-flow.html?orderId=' + ordId + '&openChat=1';
  return '<a href="'+orderUrl+'" style="display:block;text-decoration:none;color:inherit;padding:16px;border-bottom:1px solid rgba(255,255,255,0.06);-webkit-tap-highlight-color:rgba(255,255,255,0.04);">'+
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px;">'+
      '<span style="font-size:15px;font-weight:700;"><span style="color:'+sideColor+';">'+side+'</span> '+(order.asset||'USDT')+'</span>'+
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>'+
    '</div>'+
    '<div style="font-size:12px;color:rgba(255,255,255,0.4);margin-bottom:10px;">'+dt+'</div>'+
    '<div style="display:flex;justify-content:space-between;align-items:flex-end;">'+
      '<div style="display:flex;flex-direction:column;gap:3px;">'+
        '<span style="font-size:12px;color:rgba(255,255,255,0.5);">Price <span style="color:rgba(255,255,255,0.85);">₹'+fmt(order.price||0)+'</span></span>'+
        '<span style="font-size:12px;color:rgba(255,255,255,0.5);">Quantity <span style="color:rgba(255,255,255,0.85);">'+qtyStr+'</span></span>'+
        '<span style="font-size:12px;color:rgba(255,255,255,0.5);">Fee <span style="color:rgba(255,255,255,0.85);">0 USDT</span></span>'+
      '</div>'+
      '<div style="font-size:18px;font-weight:700;color:#fff;">₹'+fmt(order.amountInr||0)+'</div>'+
    '</div>'+
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px;">'+
      '<span style="font-size:13px;color:rgba(255,255,255,0.65);">'+counterparty+'</span>'+
      '<a href="'+chatUrl+'" onclick="event.stopPropagation()" style="display:flex;align-items:center;gap:5px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:5px 12px;color:rgba(255,255,255,0.8);font-size:12px;text-decoration:none;-webkit-tap-highlight-color:rgba(240,185,11,0.15);">'+
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'+
        'Chat'+
      '</a>'+
    '</div>'+
  '</a>';
}

function _ordEmpty(msg) {
  return '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:70px 20px;gap:14px;">'+
    '<svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1.2" stroke-linecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>'+
    '<p style="color:rgba(255,255,255,0.35);font-size:14px;margin:0;">'+msg+'</p>'+
  '</div>';
}

function _ordLoadingHtml() {
  return '<div style="display:flex;align-items:center;justify-content:center;padding:70px 20px;">'+
    '<div style="width:24px;height:24px;border:2px solid #222;border-top-color:#00d4d4;border-radius:50%;animation:ord-spin 0.7s linear infinite;"></div>'+
  '</div>'+
  '<style>@keyframes ord-spin{to{transform:rotate(360deg)}}</style>';
}

function _setOrdSubPill(activeId, inactiveIds) {
  [activeId].concat(inactiveIds).forEach(function(id) {
    var el = document.getElementById(id);
    if (!el) return;
    var isActive = id === activeId;
    el.style.background = isActive ? '#fff' : 'rgba(255,255,255,0.08)';
    el.style.color = isActive ? '#000' : 'rgba(255,255,255,0.6)';
    el.style.fontWeight = isActive ? '600' : '400';
  });
}

// Show/hide the correct list div and render its content
function _showOrdList(sub) {
  Object.keys(_ORD_LIST_IDS).forEach(function(k) {
    var el = document.getElementById(_ORD_LIST_IDS[k]);
    if (el) el.style.display = k === sub ? 'block' : 'none';
  });
  if (!_ordLoaded) return; // loadBybitorOrders will render when done
  var el = document.getElementById(_ORD_LIST_IDS[sub]);
  if (!el) return;
  var statuses = _ORD_STATUS_MAP[sub] || [];
  var filtered = _ordAllOrders.filter(function(o) {
    return statuses.indexOf((o.status || '').toUpperCase()) !== -1;
  });
  try {
    el.innerHTML = filtered.length ? filtered.map(_ordCard).join('') : _ordEmpty('No orders');
  } catch(e) {
    el.innerHTML = _ordEmpty('No orders');
  }
}

function switchOrdMain(tab) {
  _ordMainTab = tab;
  // Update main tab styles
  var tabPend = document.getElementById('ordTabPending');
  var tabEnd = document.getElementById('ordTabEnded');
  if (tabPend) {
    tabPend.style.borderBottomColor = tab === 'pending' ? '#f0b90b' : 'transparent';
    tabPend.style.color = tab === 'pending' ? '#fff' : 'rgba(255,255,255,0.4)';
    tabPend.style.fontWeight = tab === 'pending' ? '700' : '500';
  }
  if (tabEnd) {
    tabEnd.style.borderBottomColor = tab === 'ended' ? '#f0b90b' : 'transparent';
    tabEnd.style.color = tab === 'ended' ? '#fff' : 'rgba(255,255,255,0.4)';
    tabEnd.style.fontWeight = tab === 'ended' ? '700' : '500';
  }
  // Toggle sub-tab rows
  var pendSub = document.getElementById('pendingSubTabs');
  var endSub = document.getElementById('endedSubTabs');
  if (pendSub) pendSub.style.display = tab === 'pending' ? 'flex' : 'none';
  if (endSub) endSub.style.display = tab === 'ended' ? 'flex' : 'none';
  // Switch to default sub-tab
  if (tab === 'pending') {
    switchOrdSub('inprogress');
  } else {
    switchOrdSub('completed');
  }
}

function switchOrdSub(sub) {
  _ordSubTab = sub;
  // Update pill styles
  if (sub === 'inprogress') _setOrdSubPill('ordSubInprogress', ['ordSubDispute']);
  else if (sub === 'dispute') _setOrdSubPill('ordSubDispute', ['ordSubInprogress']);
  else if (sub === 'completed') _setOrdSubPill('ordSubCompleted', ['ordSubCanceled']);
  else if (sub === 'canceled') _setOrdSubPill('ordSubCanceled', ['ordSubCompleted']);
  // Show correct list
  _showOrdList(sub);
}

var _ORD_CACHE_KEY = 'p2p_orders_cache';
function _saveOrdCache(orders) {
  try { localStorage.setItem(_ORD_CACHE_KEY, JSON.stringify(orders)); } catch(e){}
}
function _loadOrdCache() {
  try { return JSON.parse(localStorage.getItem(_ORD_CACHE_KEY) || '[]'); } catch(e){ return []; }
}

function loadBybitorOrders() {
  function renderAll(allOrders, fromCache) {
    _ordLoaded = true;
    // dedupe by id, sort newest first
    var map = {};
    allOrders.forEach(function(o) { if (o && o.id) map[o.id] = o; });
    _ordAllOrders = Object.keys(map).map(function(k) { return map[k]; })
      .sort(function(a,b){ return (b.createdAt||0) > (a.createdAt||0) ? 1 : -1; });
    if (!fromCache) _saveOrdCache(_ordAllOrders);

    Object.keys(_ORD_LIST_IDS).forEach(function(sub) {
      var el = document.getElementById(_ORD_LIST_IDS[sub]);
      if (!el) return;
      var statuses = _ORD_STATUS_MAP[sub] || [];
      var filtered = _ordAllOrders.filter(function(o) {
        return statuses.indexOf((o.status || '').toUpperCase()) !== -1;
      });
      try {
        el.innerHTML = filtered.length ? filtered.map(_ordCard).join('') : _ordEmpty('No orders');
      } catch(e) {
        el.innerHTML = _ordEmpty('No orders');
      }
      el.style.display = sub === _ordSubTab ? 'block' : 'none';
    });
  }

  function showLoginPrompt() {
    _ordLoaded = true;
    Object.keys(_ORD_LIST_IDS).forEach(function(sub) {
      var el = document.getElementById(_ORD_LIST_IDS[sub]);
      if (el) el.style.display = 'none';
    });
    var el = document.getElementById('ordListInprogress');
    if (el) {
      el.style.display = 'block';
      el.innerHTML =
        '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 20px;gap:16px;">' +
        '<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>' +
        '<p style="color:rgba(255,255,255,0.45);font-size:14px;margin:0;text-align:center;">Login to view your orders</p>' +
        '<button onclick="requireLoginNotice()" style="background:#f0b90b;color:#000;border:none;border-radius:8px;padding:10px 24px;font-size:14px;font-weight:700;cursor:pointer;min-width:120px;">Login</button>' +
        '</div>';
    }
  }

  // show cached orders instantly, then refresh in background
  var cached = _loadOrdCache();
  if (cached.length) {
    renderAll(cached, true);
  } else {
    // no cache — show spinner
    Object.keys(_ORD_LIST_IDS).forEach(function(sub) {
      var el = document.getElementById(_ORD_LIST_IDS[sub]);
      if (el) el.style.display = 'none';
    });
    var spinEl = document.getElementById(_ORD_LIST_IDS[_ordSubTab]);
    if (spinEl) { spinEl.style.display = 'block'; spinEl.innerHTML = _ordLoadingHtml(); }
  }

  // fetch active + history in parallel
  Promise.all([
    fetch('/api/p2p/orders/my-active', { credentials: 'include' }),
    fetch('/api/p2p/orders/history?limit=100&offset=0', { credentials: 'include' })
  ]).then(function(responses) {
    var r1 = responses[0], r2 = responses[1];
    if (r1.status === 401) { showLoginPrompt(); return; }
    return Promise.all([
      r1.ok ? r1.json() : { orders: [] },
      r2.ok ? r2.json() : { orders: [] }
    ]).then(function(results) {
      var all = (results[0].orders || []).concat(results[1].orders || []);
      renderAll(all, false);
    });
  }).catch(function(e) {
    var el = document.getElementById(_ORD_LIST_IDS[_ordSubTab]);
    if (el) { el.style.display = 'block'; el.innerHTML = _ordEmpty('No orders'); }
  });
}
// Wire orders screen tab buttons (click + touchend for iOS)
(function() {
  function wireOrdBtn(id, fn) {
    var el = document.getElementById(id);
    if (!el) return;
    var fired = false;
    el.addEventListener('touchend', function(e) {
      e.preventDefault();
      if (fired) return;
      fired = true;
      setTimeout(function() { fired = false; }, 400);
      fn();
    }, { passive: false });
    el.addEventListener('click', function() {
      if (fired) return;
      fn();
    });
  }
  wireOrdBtn('ordTabPending',    function() { switchOrdMain('pending'); });
  wireOrdBtn('ordTabEnded',      function() { switchOrdMain('ended'); });
  wireOrdBtn('ordSubInprogress', function() { switchOrdSub('inprogress'); });
  wireOrdBtn('ordSubDispute',    function() { switchOrdSub('dispute'); });
  wireOrdBtn('ordSubCompleted',  function() { switchOrdSub('completed'); });
  wireOrdBtn('ordSubCanceled',   function() { switchOrdSub('canceled'); });
})();

// Auto-refresh orders while the orders screen is visible
var _ordPollTimer = null;
function startOrdPolling() {
  stopOrdPolling();
  loadBybitorOrders(); // immediate fetch
  _ordPollTimer = setInterval(function() {
    var screen = document.getElementById('mobOrdersScreen');
    if (screen && screen.style.display !== 'none') {
      loadBybitorOrders();
    } else {
      stopOrdPolling();
    }
  }, 1200); // 1.2s — real-time
}
function stopOrdPolling() {
  if (_ordPollTimer) { clearInterval(_ordPollTimer); _ordPollTimer = null; }
}
// ===== END BYBIT-STYLE ORDERS SCREEN =====

if (sideTabs) {
  sideTabs.addEventListener('click', (event) => {
    const tab = event.target.closest('.side-tab, .gt-side-tab');
    if (!tab) {
      return;
    }

    currentSide = tab.dataset.side === 'sell' ? 'sell' : 'buy';
    sideTabs.querySelectorAll('.side-tab, .gt-side-tab').forEach((btn) => {
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

// ===== PASSWORD RESET =====
(function() {
  var stepLogin = document.getElementById('authStepLogin');
  var stepForgot = document.getElementById('authStepForgot');
  var stepReset = document.getElementById('authStepReset');
  var forgotLink = document.getElementById('forgotPasswordLink');
  var backToLoginBtn = document.getElementById('backToLoginBtn');
  var backToForgotBtn = document.getElementById('backToForgotBtn');
  var sendResetCodeBtn = document.getElementById('sendResetCodeBtn');
  var doResetBtn = document.getElementById('doResetBtn');
  var resetEmailInput = document.getElementById('resetEmailInput');
  var resetCodeInput = document.getElementById('resetCodeInput');
  var newPasswordInput = document.getElementById('newPasswordInput');
  var confirmPasswordInput = document.getElementById('confirmPasswordInput');
  var forgotMsg = document.getElementById('forgotMsg');
  var resetMsg = document.getElementById('resetMsg');
  var _resetEmail = '';

  function showStep(step) {
    if (stepLogin) stepLogin.style.display = step === 'login' ? '' : 'none';
    if (stepForgot) stepForgot.style.display = step === 'forgot' ? '' : 'none';
    if (stepReset) stepReset.style.display = step === 'reset' ? '' : 'none';
  }

  if (forgotLink) forgotLink.addEventListener('click', function() { showStep('forgot'); if (forgotMsg) forgotMsg.textContent = ''; });
  if (backToLoginBtn) backToLoginBtn.addEventListener('click', function() { showStep('login'); });
  if (backToForgotBtn) backToForgotBtn.addEventListener('click', function() { showStep('forgot'); });

  if (sendResetCodeBtn) sendResetCodeBtn.addEventListener('click', async function() {
    var email = resetEmailInput ? resetEmailInput.value.trim() : '';
    if (!email) { if (forgotMsg) forgotMsg.textContent = 'Enter your email.'; return; }
    sendResetCodeBtn.disabled = true; sendResetCodeBtn.textContent = 'Sending...';
    if (forgotMsg) forgotMsg.textContent = '';
    try {
      var res = await fetch('/api/p2p/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
      var data = await res.json();
      if (forgotMsg) { forgotMsg.style.color = res.ok ? '#16c784' : '#f6465d'; forgotMsg.textContent = data.message || 'Code sent.'; }
      if (res.ok) { _resetEmail = email; showStep('reset'); if (resetMsg) resetMsg.textContent = ''; }
    } catch(e) { if (forgotMsg) { forgotMsg.style.color='#f6465d'; forgotMsg.textContent = 'Network error.'; } }
    finally { sendResetCodeBtn.disabled = false; sendResetCodeBtn.textContent = 'Send Code'; }
  });

  if (doResetBtn) doResetBtn.addEventListener('click', async function() {
    var code = resetCodeInput ? resetCodeInput.value.trim() : '';
    var newPass = newPasswordInput ? newPasswordInput.value.trim() : '';
    var confirmPass = confirmPasswordInput ? confirmPasswordInput.value.trim() : '';
    if (!code || !newPass) { if (resetMsg) { resetMsg.style.color='#f6465d'; resetMsg.textContent = 'Fill all fields.'; } return; }
    if (newPass !== confirmPass) { if (resetMsg) { resetMsg.style.color='#f6465d'; resetMsg.textContent = 'Passwords do not match.'; } return; }
    if (newPass.length < 8) { if (resetMsg) { resetMsg.style.color='#f6465d'; resetMsg.textContent = 'Password must be at least 8 characters.'; } return; }
    doResetBtn.disabled = true; doResetBtn.textContent = 'Resetting...';
    if (resetMsg) resetMsg.textContent = '';
    try {
      var res = await fetch('/api/p2p/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: _resetEmail, code, newPassword: newPass }) });
      var data = await res.json();
      if (resetMsg) { resetMsg.style.color = res.ok ? '#16c784' : '#f6465d'; resetMsg.textContent = data.message; }
      if (res.ok) { setTimeout(function(){ showStep('login'); if (emailInput) emailInput.value = _resetEmail; }, 1800); }
    } catch(e) { if (resetMsg) { resetMsg.style.color='#f6465d'; resetMsg.textContent = 'Network error.'; } }
    finally { doResetBtn.disabled = false; doResetBtn.textContent = 'Reset Password'; }
  });
})();

if (loginBtn) {
  loginBtn.addEventListener('click', loginUser);
  loginBtn.addEventListener('touchend', function(e) { e.preventDefault(); loginUser(); });
}
if (logoutBtn) {
  logoutBtn.addEventListener('click', logoutUser);
}
if (openAuthBtn) {
  openAuthBtn.addEventListener('click', () => { window.location.href = '/auth.html'; });
}
if (openAuthBtnDrawer) {
  openAuthBtnDrawer.addEventListener('click', () => { window.location.href = '/auth.html'; });
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
if (disputeBtn) {
  disputeBtn.addEventListener('click', async () => {
    if (disputeBtn.disabled) return;
    if (!confirm('Are you sure you want to raise a dispute? An admin will review this order.')) return;
    disputeBtn.disabled = true;
    disputeBtn.textContent = 'Raising...';
    try {
      await updateOrderStatus('dispute');
    } catch (err) {
      disputeBtn.disabled = false;
      disputeBtn.textContent = 'Raise Dispute';
      alert(err.message || 'Failed to raise dispute.');
    }
  });
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
}, 1500);

setInterval(loadExchangeTicker, 7000);

// Auto-refresh KYC status every 20s so profile updates immediately after admin approves
setInterval(() => {
  if (currentUser) refreshCurrentUserKyc();
}, 20000);

// ===== KYC FULL-PAGE SCREENS =====
// ===== PAYMENT METHODS =====
function openPaymentMethodsScreen() {
  var old = document.getElementById('pmScreen');
  if (old) old.remove();
  var wrap = document.createElement('div');
  wrap.id = 'pmScreen';
  wrap.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#000;display:flex;flex-direction:column;overflow-y:auto;-webkit-overflow-scrolling:touch;';

  var header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:1rem;border-bottom:1px solid rgba(255,255,255,0.07);position:sticky;top:0;background:#000;z-index:1;';

  var backBtn = document.createElement('button');
  backBtn.textContent = '‹';
  backBtn.style.cssText = 'background:none;border:none;color:#fff;font-size:1.6rem;cursor:pointer;padding:4px 12px;line-height:1;';
  backBtn.addEventListener('touchend', function(e){ e.stopPropagation(); e.preventDefault(); window._pmJustClosed = Date.now(); var s = document.getElementById('pmScreen'); if(s) s.remove(); });
  backBtn.addEventListener('click', function(e){ e.stopPropagation(); window._pmJustClosed = Date.now(); var s = document.getElementById('pmScreen'); if(s) s.remove(); });

  var title = document.createElement('span');
  title.textContent = 'Payment Methods';
  title.style.cssText = 'font-size:0.95rem;font-weight:700;color:#fff;';

  var addBtnTop = document.createElement('button');
  addBtnTop.textContent = '+';
  addBtnTop.style.cssText = 'background:none;border:none;color:#00c2b2;font-size:1.6rem;cursor:pointer;padding:4px 12px;line-height:1;';
  addBtnTop.addEventListener('click', function(){ openAddPaymentModal(); });

  header.appendChild(backBtn); header.appendChild(title); header.appendChild(addBtnTop);

  var body = document.createElement('div');
  body.style.cssText = 'padding:0.8rem 1rem 5rem;';

  var hint = document.createElement('p');
  hint.textContent = 'Add UPI, Bank Transfer or other payment methods.';
  hint.style.cssText = 'font-size:0.75rem;color:#6b7690;margin:0 0 1rem;';

  var listDiv = document.createElement('div');
  listDiv.id = 'pmList';
  listDiv.innerHTML = '<p style="color:#6b7690;font-size:0.82rem;text-align:center;padding:2rem 0;">Loading...</p>';

  var addBtnBottom = document.createElement('button');
  addBtnBottom.textContent = '+ Add Payment Method';
  addBtnBottom.style.cssText = 'width:100%;height:44px;border:none;border-radius:10px;background:linear-gradient(96deg,#00c2b2,#0099a8);color:#fff;font-size:0.88rem;font-weight:700;cursor:pointer;margin-top:1rem;font-family:Manrope,sans-serif;';
  addBtnBottom.addEventListener('click', function(){ openAddPaymentModal(); });

  body.appendChild(hint); body.appendChild(listDiv); body.appendChild(addBtnBottom);
  wrap.appendChild(header); wrap.appendChild(body);
  document.body.appendChild(wrap);
  loadPaymentMethods();
}

async function loadPaymentMethods() {
  var list = document.getElementById('pmList');
  if (!list) return;
  if (!currentUser) { list.innerHTML = '<p style="color:#6b7690;text-align:center;padding:2rem 0;">Login required.</p>'; return; }
  try {
    var res = await fetch('/api/p2p/payment-methods');
    var data = await res.json();
    var methods = data.methods || [];
    if (!methods.length) {
      list.innerHTML = '<p style="color:#6b7690;font-size:0.82rem;text-align:center;padding:2rem 0;">No payment methods added yet.<br>Tap + to add one.</p>';
      return;
    }
    list.innerHTML = '';
    methods.forEach(function(m) {
      var icon = m.type === 'UPI' ? '📱' : m.type === 'Bank' ? '🏦' : '💳';
      var detail = m.type === 'UPI' ? (m.upiId || '--') : (m.type === 'Bank' || m.type === 'IMPS') ? ((m.bankName || '') + (m.accountNumber ? ' ••' + m.accountNumber.slice(-4) : '')) : (m.details || '--');

      var card = document.createElement('div');
      card.style.cssText = 'display:flex;justify-content:space-between;align-items:center;background:#111;border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:0.85rem 1rem;margin-bottom:0.65rem;';

      var left = document.createElement('div');
      left.style.cssText = 'display:flex;align-items:center;gap:0.75rem;';
      left.innerHTML = '<span style="font-size:1.5rem;">' + icon + '</span><div><div style="font-size:0.85rem;font-weight:700;color:#fff;">' + escapeHtml(m.nickname || m.type) + '</div><div style="font-size:0.73rem;color:#6b7690;margin-top:2px;">' + escapeHtml(detail) + '</div></div>';

      var actions = document.createElement('div');
      actions.style.cssText = 'display:flex;gap:0.4rem;flex-shrink:0;';

      var editBtn = document.createElement('button');
      editBtn.textContent = 'Edit';
      editBtn.style.cssText = 'height:28px;padding:0 0.7rem;border:none;border-radius:6px;font-size:0.72rem;font-weight:700;cursor:pointer;background:rgba(0,194,178,0.15);color:#00c2b2;font-family:Manrope,sans-serif;';
      editBtn.addEventListener('click', function(){ openEditPaymentModal(m.id); });

      var delBtn = document.createElement('button');
      delBtn.textContent = 'Delete';
      delBtn.style.cssText = 'height:28px;padding:0 0.7rem;border:none;border-radius:6px;font-size:0.72rem;font-weight:700;cursor:pointer;background:rgba(246,70,93,0.12);color:#f6465d;font-family:Manrope,sans-serif;';
      delBtn.addEventListener('click', function(){ deletePaymentMethod(m.id); });

      actions.appendChild(editBtn); actions.appendChild(delBtn);
      card.appendChild(left); card.appendChild(actions);
      list.appendChild(card);
    });
  } catch(e) {
    list.innerHTML = '<p style="color:#f6465d;text-align:center;padding:2rem 0;">Failed to load. Try again.</p>';
  }
}

function openAddPaymentModal() { _openPaymentModal(null); }
function openEditPaymentModal(pmId) { _openPaymentModal(pmId); }

function _openPaymentModal(pmId) {
  var existing = document.getElementById('pmModal');
  if (existing) existing.remove();
  var modal = document.createElement('div');
  modal.id = 'pmModal';
  modal.className = 'edit-ad-modal-overlay';
  modal.innerHTML =
    '<div class="edit-ad-modal">' +
      '<div class="edit-ad-head">' +
        '<h3>' + (pmId ? 'Edit' : 'Add') + ' Payment Method</h3>' +
        '<button onclick="document.getElementById(\'pmModal\').remove()" class="edit-ad-close">✕</button>' +
      '</div>' +
      '<div class="edit-ad-body">' +
        '<label class="edit-ad-label">Type</label>' +
        '<select id="pmType" class="edit-ad-input" onchange="renderPmFields()">' +
          '<option value="UPI">UPI / GPay / PhonePe</option>' +
          '<option value="Bank">Bank Transfer</option>' +
          '<option value="IMPS">IMPS</option>' +
          '<option value="Other">Other</option>' +
        '</select>' +
        '<label class="edit-ad-label">Nickname (optional)</label>' +
        '<input id="pmNickname" type="text" class="edit-ad-input" placeholder="e.g. My SBI Account"/>' +
        '<div id="pmDynamicFields"></div>' +
      '</div>' +
      '<button class="mob-kyc-fp-btn" style="background:linear-gradient(96deg,#00c2b2,#0099a8);margin:0 1rem 1rem;" onclick="submitPaymentMethod(\'' + (pmId || '') + '\')">' + (pmId ? 'Save Changes' : 'Add Method') + '</button>' +
    '</div>';
  document.body.appendChild(modal);
  renderPmFields();
}

function renderPmFields() {
  var type = document.getElementById('pmType') && document.getElementById('pmType').value;
  var container = document.getElementById('pmDynamicFields');
  if (!container) return;
  if (type === 'UPI') {
    container.innerHTML = '<label class="edit-ad-label">UPI ID</label><input id="pmUpiId" type="text" class="edit-ad-input" placeholder="yourname@upi"/>';
  } else if (type === 'Bank' || type === 'IMPS') {
    container.innerHTML =
      '<label class="edit-ad-label">Bank Name</label><input id="pmBankName" type="text" class="edit-ad-input" placeholder="State Bank of India"/>' +
      '<label class="edit-ad-label">Account Holder</label><input id="pmHolder" type="text" class="edit-ad-input" placeholder="Full name"/>' +
      '<label class="edit-ad-label">Account Number</label><input id="pmAccNo" type="text" class="edit-ad-input" placeholder="Account number"/>' +
      '<label class="edit-ad-label">IFSC Code</label><input id="pmIfsc" type="text" class="edit-ad-input" placeholder="SBIN0001234"/>';
  } else {
    container.innerHTML = '<label class="edit-ad-label">Details</label><input id="pmDetails" type="text" class="edit-ad-input" placeholder="Payment details"/>';
  }
}

async function submitPaymentMethod(pmId) {
  var type = document.getElementById('pmType') && document.getElementById('pmType').value;
  var nickname = document.getElementById('pmNickname') && document.getElementById('pmNickname').value.trim();
  var body = { type: type, nickname: nickname };
  if (type === 'UPI') {
    body.upiId = document.getElementById('pmUpiId') && document.getElementById('pmUpiId').value.trim();
    if (!body.upiId) { alert('UPI ID is required.'); return; }
  } else if (type === 'Bank' || type === 'IMPS') {
    body.bankName = document.getElementById('pmBankName') && document.getElementById('pmBankName').value.trim();
    body.accountHolder = document.getElementById('pmHolder') && document.getElementById('pmHolder').value.trim();
    body.accountNumber = document.getElementById('pmAccNo') && document.getElementById('pmAccNo').value.trim();
    body.ifsc = document.getElementById('pmIfsc') && document.getElementById('pmIfsc').value.trim();
    if (!body.accountNumber) { alert('Account number is required.'); return; }
  } else {
    body.details = document.getElementById('pmDetails') && document.getElementById('pmDetails').value.trim();
  }
  try {
    var url = pmId ? '/api/p2p/payment-methods/' + pmId : '/api/p2p/payment-methods';
    var method = pmId ? 'PATCH' : 'POST';
    var res = await fetch(url, { method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    var data = await res.json();
    if (!res.ok) { alert(data.message || 'Failed.'); return; }
    document.getElementById('pmModal') && document.getElementById('pmModal').remove();
    await loadPaymentMethods();
  } catch(e) { alert('Network error.'); }
}

async function deletePaymentMethod(pmId) {
  if (!confirm('Delete this payment method?')) return;
  try {
    var res = await fetch('/api/p2p/payment-methods/' + pmId, { method: 'DELETE' });
    var data = await res.json();
    if (!res.ok) { alert(data.message || 'Failed.'); return; }
    await loadPaymentMethods();
  } catch(e) { alert('Network error.'); }
}
// ===== END PAYMENT METHODS =====

// ===== 3-DOT MENU =====
function closeDotMenu() {
  var dd = document.getElementById('p2pDotDropdown');
  if (dd) dd.classList.remove('open');
}
function openP2PScreen(id) {
  var el = document.getElementById(id);
  if (!el) return;
  el.style.setProperty('display','flex','important');
  el.style.flexDirection = 'column';
  document.body.classList.add('mob-screen-open');
}
function closeP2PScreen(id) {
  var el = document.getElementById(id);
  if (el) el.style.display = 'none';
  // only remove mob-screen-open if no other screen is open
  var any = document.querySelector('.mob-screen[style*="flex"]');
  if (!any) document.body.classList.remove('mob-screen-open');
}
function toggleFaqSection(head) {
  var section = head.parentElement;
  section.classList.toggle('open');
}
(function initDotMenu() {
  document.addEventListener('click', function(e) {
    var btn = e.target.closest('#p2pDotBtn');
    var dd = document.getElementById('p2pDotDropdown');
    if (!dd) return;
    if (btn) { dd.classList.toggle('open'); e.stopPropagation(); return; }
    if (!e.target.closest('#p2pDotDropdown')) { dd.classList.remove('open'); }
  });
})();
// ===== END 3-DOT MENU =====

function openKycScreen() {
  var kycStatus = normalizeKycStatus(currentUser && currentUser.kyc && currentUser.kyc.status);
  if (kycStatus === 'PENDING_REVIEW') {
    var el = document.getElementById('kycUnderReviewScreen');
    if (el) { el.style.setProperty('display','flex','important'); el.style.flexDirection='column'; }
    return;
  }
  if (kycStatus === 'REJECTED') {
    var rejScreen = document.getElementById('kycRejectedScreen');
    var rejReasonText = document.getElementById('kycRejectionReasonText');
    var rejReasonBox = document.getElementById('kycRejectionReasonBox');
    var rejReason = currentUser && currentUser.kyc && currentUser.kyc.rejectionReason || '';
    if (rejReasonText) rejReasonText.textContent = rejReason || 'No specific reason provided.';
    if (rejReasonBox) rejReasonBox.style.display = rejReason ? '' : 'none';
    if (rejScreen) { rejScreen.style.setProperty('display','flex','important'); rejScreen.style.flexDirection='column'; }
    return;
  }
  if (kycStatus === 'VERIFIED') {
    return;
  }
  document.getElementById('kycBasicScreen').style.setProperty('display','flex','important');
  document.getElementById('kycBasicScreen').style.flexDirection = 'column';
}

function closeKycScreens() {
  ['kycBasicScreen','kycAdvanceScreen'].forEach(function(id){
    var el = document.getElementById(id);
    if(el) el.style.display = 'none';
  });
}

function backToKycBasic() {
  document.getElementById('kycAdvanceScreen').style.display = 'none';
  document.getElementById('kycBasicScreen').style.setProperty('display','flex','important');
  document.getElementById('kycBasicScreen').style.flexDirection = 'column';
}

function kycFileChanged(input, hintId, thumbId, cardId) {
  var file = input && input.files && input.files[0];
  if(!file) return;
  var hint = document.getElementById(hintId);
  var thumb = document.getElementById(thumbId);
  var card = document.getElementById(cardId);
  if(hint) hint.textContent = file.name + ' (' + (file.size/1024).toFixed(0) + ' KB) ✓';
  var reader = new FileReader();
  reader.onload = function(e) {
    if(thumb){ thumb.src = e.target.result; thumb.style.display = 'block'; }
    if(card) card.classList.add('done');
  };
  reader.readAsDataURL(file);
}

function _kycHint(id, msg, type) {
  var el = document.getElementById(id);
  if(!el) return;
  el.textContent = msg;
  el.className = 'mob-kyc-fp-hint ' + (type||'');
}

function submitKycBasicAndNext() {
  var name  = ((document.getElementById('kycFullName')||{}).value||'').trim();
  var dob   = ((document.getElementById('kycDob')||{}).value||'').trim();
  var phone = ((document.getElementById('kycPhone')||{}).value||'').trim();
  if(!name)  { _kycHint('kycBasicHint','Please enter your full name.','error'); return; }
  if(!dob)   { _kycHint('kycBasicHint','Please enter your date of birth.','error'); return; }
  if(!phone) { _kycHint('kycBasicHint','Please enter your phone number.','error'); return; }
  // Update badge
  var badge = document.getElementById('kycStatusBadge');
  if(badge){ badge.textContent='Lv.1 Done'; badge.style.cssText='font-size:0.62rem;font-weight:700;padding:2px 7px;border-radius:999px;background:rgba(22,199,132,0.15);border:1px solid rgba(22,199,132,0.35);color:#16c784;margin-left:6px;'; }
  // Go to step 2
  document.getElementById('kycBasicScreen').style.display = 'none';
  document.getElementById('kycAdvanceScreen').style.setProperty('display','flex','important');
  document.getElementById('kycAdvanceScreen').style.flexDirection = 'column';
}

function submitKycAdvance() {
  var aadhaarNum = ((document.getElementById('kycAadhaarNumber')||{}).value||'').replace(/\s/g,'');
  var front   = (document.getElementById('kycAadhaarFront')||{}).files;
  var back    = (document.getElementById('kycAadhaarBack')||{}).files;
  var selfie  = (document.getElementById('kycSelfieDoc')||{}).files;
  var consent = (document.getElementById('kycL2Consent')||{}).checked;
  if(!aadhaarNum||aadhaarNum.length!==12||!/^\d{12}$/.test(aadhaarNum)) { _kycHint('kycAdvHint','Please enter valid 12-digit Aadhaar number.','error'); return; }
  if(!front||!front.length)  { _kycHint('kycAdvHint','Please upload Aadhaar front photo.','error'); return; }
  if(!back||!back.length)    { _kycHint('kycAdvHint','Please upload Aadhaar back photo.','error'); return; }
  if(!selfie||!selfie.length){ _kycHint('kycAdvHint','Please upload selfie with Aadhaar.','error'); return; }
  if(!consent){ _kycHint('kycAdvHint','Please accept the consent checkbox.','error'); return; }

  // Disable button while submitting
  var btn = document.querySelector('#kycAdvanceScreen [data-kyc-submit]');
  if(btn){ btn.disabled=true; btn.textContent='Uploading…'; }
  _kycHint('kycAdvHint','Uploading documents, please wait…','');

  // Compress + convert image to base64 JPEG (max 1200px, quality 0.75)
  function compressImage(file) {
    return new Promise(function(resolve, reject) {
      var reader = new FileReader();
      reader.onerror = reject;
      reader.onload = function(e) {
        var img = new Image();
        img.onerror = reject;
        img.onload = function() {
          var MAX = 1200;
          var w = img.width, h = img.height;
          if (w > MAX || h > MAX) {
            if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
            else       { w = Math.round(w * MAX / h); h = MAX; }
          }
          var canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.75));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  Promise.all([
    compressImage(front[0]),
    compressImage(back[0]),
    compressImage(selfie[0])
  ]).then(function(results) {
    var aadhaarFrontDataUrl = results[0];
    var aadhaarBackDataUrl  = results[1];
    var selfieDataUrl       = results[2];

    return fetch('/api/p2p/kyc/submit', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        consent: true,
        aadhaarNumber: aadhaarNum,
        aadhaarFrontImage: aadhaarFrontDataUrl,
        aadhaarBackImage: aadhaarBackDataUrl,
        selfieWithDocumentImage: selfieDataUrl
      })
    });
  }).then(function(res) {
    return res.json().then(function(data){ return { ok: res.ok, data: data }; });
  }).then(function(result) {
    if (result.ok) {
      _kycHint('kycAdvHint','✅ Documents submitted! Review takes 24–48 hrs.','success');
      var badge = document.getElementById('kycStatusBadge');
      if(badge){ badge.textContent='Under Review'; badge.style.cssText='font-size:0.62rem;font-weight:700;padding:2px 7px;border-radius:999px;background:rgba(240,185,11,0.12);border:1px solid rgba(240,185,11,0.3);color:#f0b90b;margin-left:6px;'; }
      if(btn){ btn.textContent='Submitted for Review ✓'; }
      setTimeout(closeKycScreens, 2500);
    } else {
      var msg = (result.data && result.data.message) || 'Submission failed. Please try again.';
      _kycHint('kycAdvHint', msg, 'error');
      if(btn){ btn.disabled=false; btn.textContent='Submit for Verification'; }
    }
  }).catch(function(err) {
    _kycHint('kycAdvHint','Network error. Please check connection and retry.','error');
    if(btn){ btn.disabled=false; btn.textContent='Submit for Verification'; }
  });
}

// ===== MOBILE POST AD SCREEN =====
var _mobPostAdInited = false;
function initMobPostAdScreen() {
  // Load my ads list
  (async function() {
    var listEl = document.getElementById('mobMyAdsList');
    if (!listEl) return;
    if (!currentUser) { listEl.innerHTML = '<p class="mob-myads-empty">Login required.</p>'; return; }
    listEl.innerHTML = '<p class="mob-myads-empty">Loading...</p>';
    try {
      var res = await fetch('/api/p2p/my-ads');
      var data = await res.json();
      var offers = Array.isArray(data.offers) ? data.offers : (Array.isArray(data) ? data : []);
      if (!offers.length) { listEl.innerHTML = '<p class="mob-myads-empty">No ads posted yet.</p>'; return; }
      listEl.innerHTML = offers.map(function(o) {
        var isActive = o.status === 'ACTIVE';
        return '<div class="mob-myad-card">' +
          '<div class="mob-myad-row"><span class="mob-myad-type ' + (o.side === 'sell' ? 'sell' : 'buy') + '">' + (o.side === 'sell' ? 'SELL' : 'BUY') + '</span>' +
          '<span class="mob-myad-status ' + (isActive ? 'active' : 'paused') + '">' + (o.status || 'PAUSED') + '</span></div>' +
          '<div class="mob-myad-price">₹' + (o.price || 0) + ' / USDT</div>' +
          '<div class="mob-myad-meta">Available: ' + (o.available || 0) + ' USDT &nbsp;|&nbsp; ' + (o.minLimit || 0) + '–' + (o.maxLimit || 0) + ' INR</div>' +
          '<div class="mob-myad-actions">' +
            '<button class="mob-myad-btn" onclick="toggleMobAd(\'' + o.id + '\',\'' + (isActive ? 'PAUSED' : 'ACTIVE') + '\')">' + (isActive ? 'Pause' : 'Activate') + '</button>' +
            '<button class="mob-myad-btn danger" onclick="deleteMobAd(\'' + o.id + '\')">Delete</button>' +
          '</div></div>';
      }).join('');
    } catch(err) { listEl.innerHTML = '<p class="mob-myads-empty">Could not load ads.</p>'; }
  })();

  if (_mobPostAdInited) return;
  _mobPostAdInited = true;

  // Tab switching
  var tabBtns = document.querySelectorAll('.mob-ptab[data-ptab]');
  tabBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      tabBtns.forEach(function(b){ b.classList.remove('active'); });
      btn.classList.add('active');
      var target = btn.getAttribute('data-ptab');
      document.getElementById('mobPostAdCreate').style.display = target === 'create' ? 'block' : 'none';
      document.getElementById('mobPostAdMyads').style.display = target === 'myads' ? 'block' : 'none';
      if (target === 'myads') initMobPostAdScreen(); // refresh list
    });
  });

  // Form submit
  var form = document.getElementById('mobAdCreateForm');
  if (!form) return;
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    var meta = document.getElementById('mobAdCreateMeta');
    var btn = document.getElementById('mobAdCreateBtn');
    if (!currentUser) {
      if (meta) meta.textContent = 'Please login first.';
      authModal && authModal.classList.remove('hidden');
      return;
    }
    var payload = {
      type: document.getElementById('mobAdTypeInput').value,
      asset: document.getElementById('mobAdAssetInput').value,
      price: parseFloat(document.getElementById('mobAdPriceInput').value),
      available: parseFloat(document.getElementById('mobAdAvailableInput').value),
      minLimit: parseFloat(document.getElementById('mobAdMinLimitInput').value),
      maxLimit: parseFloat(document.getElementById('mobAdMaxLimitInput').value),
      payments: document.getElementById('mobAdPaymentsInput').value.split(',').map(function(s){ return s.trim(); }).filter(Boolean)
    };
    if (!payload.price || !payload.available || !payload.minLimit || !payload.maxLimit) {
      if (meta) meta.textContent = 'All fields are required.';
      return;
    }
    if (btn) { btn.disabled = true; btn.textContent = 'Posting...'; }
    if (meta) meta.textContent = '';
    try {
      var res = await fetch('/api/p2p/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      var data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to post ad.');
      if (meta) meta.textContent = 'Ad posted successfully!';
      form.reset();
      // Switch to My Ads tab
      var myadsTab = document.querySelector('.mob-ptab[data-ptab="myads"]');
      if (myadsTab) myadsTab.click();
      loadOffers();
    } catch(err) {
      if (meta) meta.textContent = err.message || 'Error posting ad.';
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Post Ad'; }
    }
  });
}

window.toggleMobAd = async function(offerId, newStatus) {
  try {
    var res = await fetch('/api/p2p/offers/' + offerId, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    if (!res.ok) { var d = await res.json(); throw new Error(d.message); }
    _mobPostAdInited = false;
    initMobPostAdScreen();
  } catch(err) { alert(err.message || 'Failed to update ad.'); }
};

window.deleteMobAd = async function(offerId) {
  if (!confirm('Delete this ad?')) return;
  try {
    var res = await fetch('/api/p2p/offers/' + offerId, {
      method: 'DELETE',
    });
    if (!res.ok) { var d = await res.json(); throw new Error(d.message); }
    _mobPostAdInited = false;
    initMobPostAdScreen();
    loadOffers();
  } catch(err) { alert(err.message || 'Failed to delete ad.'); }
};

// ===== MOB-SCREEN NAV (profile / orders screens) =====
(function initMobScreenNav() {
  function showMobScreen(screenId) {
    var all = document.querySelectorAll('.mob-screen');
    all.forEach(function(s){ s.style.display = 'none'; });
    var el = document.getElementById(screenId);
    if (el) { el.style.setProperty('display','flex','important'); el.style.flexDirection = 'column'; }
    if (screenId === 'mobProfileScreen' || screenId === 'mobOrdersScreen' || screenId === 'mobPostAdScreen') {
      document.body.classList.add('mob-screen-open');
      if (screenId === 'mobProfileScreen') {
        document.body.classList.add('mob-profile-open');
        history.replaceState(null,'','/p2p#profile');
      } else if (screenId === 'mobOrdersScreen') {
        history.replaceState(null,'','/p2p#orders');
        _ordLoaded = false; // always fetch fresh when screen opens
        setTimeout(function() {
          switchOrdMain('pending');
          startOrdPolling();
        }, 50);
      }
    }
  }
  window.showMobScreen = showMobScreen;
  window.hideMobScreens = function() { hideMobScreens(); };

  function hideMobScreens() {
    stopOrdPolling();
    var all = document.querySelectorAll('.mob-screen');
    all.forEach(function(s){ s.style.display = 'none'; });
    document.body.classList.remove('mob-screen-open', 'mob-profile-open');
    ['kycBasicScreen','kycAdvanceScreen'].forEach(function(id){
      var el = document.getElementById(id);
      if(el) el.style.display = 'none';
    });
    history.replaceState(null,'','/p2p');
  }

  // Restore screen on refresh from hash
  (function restoreFromHash() {
    var hash = window.location.hash.replace('#','');
    if (hash === 'profile') { showMobScreen('mobProfileScreen'); setTimeout(function(){ loadProfilePanel && loadProfilePanel(); }, 300); }
    else if (hash === 'orders') { showMobScreen('mobOrdersScreen'); }
  })();

  // Unified click handler — nav tabs + back + KYC actions
  document.addEventListener('click', function(e) {
    // Bottom nav tabs
    var tab = e.target.closest('.mob-tab[data-mob]');
    if (tab) {
      e.preventDefault();
      var mob = tab.getAttribute('data-mob');
      document.querySelectorAll('.mob-tab').forEach(function(t){ t.classList.remove('active'); });
      tab.classList.add('active');
      if (mob === 'profile') showMobScreen('mobProfileScreen');
      else if (mob === 'orders') showMobScreen('mobOrdersScreen');
      else if (mob === 'post') { showMobScreen('mobPostAdScreen'); initMobPostAdScreen(); }
      else hideMobScreens();
      return;
    }
    // Back to main
    var back = e.target.closest('[data-mob-back]');
    if (back) { e.preventDefault(); hideMobScreens(); return; }
    // Open Payment Methods from profile menu
    var pmRow = e.target.closest('[data-open-payment]');
    if (pmRow) { if (window._pmJustClosed && Date.now() - window._pmJustClosed < 500) return; e.preventDefault(); openPaymentMethodsScreen(); return; }
    // Open KYC from profile menu
    var kycRow = e.target.closest('[data-open-kyc]');
    if (kycRow) { e.preventDefault(); openKycScreen(); return; }
    // KYC Step 1 → Step 2
    var kycNext = e.target.closest('[data-kyc-next]');
    if (kycNext) { e.preventDefault(); submitKycBasicAndNext(); return; }
    // KYC Submit
    var kycSubmit = e.target.closest('[data-kyc-submit]');
    if (kycSubmit) { e.preventDefault(); submitKycAdvance(); return; }
    // Close KYC (back from step 1 to profile)
    var kycClose = e.target.closest('[data-kyc-close]');
    if (kycClose) { e.preventDefault(); closeKycScreens(); return; }
    // Back to step 1 from step 2
    var kycBack = e.target.closest('[data-kyc-back]');
    if (kycBack) { e.preventDefault(); backToKycBasic(); return; }
  });

  // iOS touchend — ensures taps work inside fixed/overflow elements
  document.addEventListener('touchend', function(e) {
    var pmRow = e.target.closest('[data-open-payment]');
    if (pmRow) { if (window._pmJustClosed && Date.now() - window._pmJustClosed < 500) return; e.preventDefault(); openPaymentMethodsScreen(); return; }
    var kycRow = e.target.closest('[data-open-kyc]');
    if (kycRow) { e.preventDefault(); openKycScreen(); return; }
    var kycNext = e.target.closest('[data-kyc-next]');
    if (kycNext) { e.preventDefault(); submitKycBasicAndNext(); return; }
    var kycSubmit = e.target.closest('[data-kyc-submit]');
    if (kycSubmit) { e.preventDefault(); submitKycAdvance(); return; }
    var kycClose = e.target.closest('[data-kyc-close]');
    if (kycClose) { e.preventDefault(); closeKycScreens(); return; }
    var kycBack = e.target.closest('[data-kyc-back]');
    if (kycBack) { e.preventDefault(); backToKycBasic(); return; }
  }, { passive: false });
})();

// ===================================================================
// BYBIT/BITGET-STYLE MULTI-STEP BUY FLOW  (pixel-perfect clone)
// ===================================================================
(function initBuyFlow() {
  var _bfOffer = null;
  var _bfOrder = null;
  var _bfTimerTick = null;
  var _bfPaidSel = 0;

  // ── Helpers ──────────────────────────────────────────────────────
  function fmt(n) { return typeof formatNumber === 'function' ? formatNumber(n) : Number(n || 0).toLocaleString('en-IN'); }
  function esc(s) { return typeof escapeHtml === 'function' ? escapeHtml(s) : String(s || '').replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }

  // ── Timer ────────────────────────────────────────────────────────
  function bfTimerFmt(secs) {
    var s = Math.max(0, secs || 0);
    var m = Math.floor(s / 60), ss = s % 60;
    return (m < 10 ? '0' : '') + m + ':' + (ss < 10 ? '0' : '') + ss + 's';
  }
  function bfStartTimer() {
    if (_bfTimerTick) clearInterval(_bfTimerTick);
    _bfTimerTick = setInterval(function() {
      var secs = typeof remainingSeconds !== 'undefined' ? remainingSeconds : 0;
      var txt = bfTimerFmt(secs);
      ['bfOrderTimer','bfPayTimer'].forEach(function(id) { var el = document.getElementById(id); if (el) el.textContent = txt; });
    }, 500);
  }
  function bfStopTimer() { if (_bfTimerTick) { clearInterval(_bfTimerTick); _bfTimerTick = null; } }

  // ── Screen management ─────────────────────────────────────────────
  function bfShow(id) {
    ['bfBuyScreen','bfOrderScreen','bfPayScreen'].forEach(function(sid) {
      var el = document.getElementById(sid);
      if (el) el.style.display = sid === id ? 'flex' : 'none';
    });
    document.body.style.overflow = id ? 'hidden' : '';
    document.body.classList.toggle('bf-open', !!id);
  }
  function bfClose() {
    ['bfBuyScreen','bfOrderScreen','bfPayScreen'].forEach(function(sid) {
      var el = document.getElementById(sid); if (el) el.style.display = 'none';
    });
    var sheet = document.getElementById('bfPaidSheet'); if (sheet) sheet.style.display = 'none';
    document.body.style.overflow = ''; document.body.classList.remove('bf-open'); bfStopTimer();
  }
  function bfShowOldOrderModal() {
    bfClose();
    var om = document.getElementById('orderModal');
    if (om) { om.classList.remove('hidden'); om.setAttribute('aria-hidden','false'); }
    document.body.classList.add('p2p-order-open'); document.body.style.overflow = 'hidden';
  }

  // ── Copy SVG icon ─────────────────────────────────────────────────
  function copyBtn(val) {
    var v = String(val || '').replace(/\\/g,'\\\\').replace(/'/g,"\\'");
    return '<span onclick="(function(t){if(navigator.clipboard)navigator.clipboard.writeText(t).catch(function(){})})(\''+v+'\')" style="cursor:pointer;margin-left:6px;display:inline-flex;align-items:center;vertical-align:middle;opacity:0.5;">'
      + '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>'
      + '</span>';
  }

  // ── Row builder ───────────────────────────────────────────────────
  function makeRow(label, valueHtml, copyVal) {
    return '<div style="display:flex;justify-content:space-between;align-items:center;padding:0.52rem 0;border-bottom:1px solid #1e1e1e;">'
      + '<span style="color:rgba(255,255,255,0.42);font-size:0.79rem;flex-shrink:0;margin-right:0.6rem;">' + label + '</span>'
      + '<span style="color:#fff;font-weight:600;font-size:0.82rem;display:flex;align-items:center;text-align:right;">' + valueHtml + (copyVal ? copyBtn(copyVal) : '') + '</span>'
      + '</div>';
  }

  // ── Payment method pill ───────────────────────────────────────────
  function pmPill(method) {
    return '<span style="display:inline-flex;align-items:center;gap:5px;">'
      + '<span style="width:8px;height:8px;border-radius:2px;background:#00c2b2;display:inline-block;flex-shrink:0;"></span>'
      + esc(method || 'UPI') + '</span>';
  }

  // ── Seller row (name badge) ───────────────────────────────────────
  function sellerRowHtml(name) {
    var init = String(name || 'S').slice(0,1).toUpperCase();
    return '<div style="display:inline-flex;align-items:center;gap:7px;">'
      + '<div style="width:24px;height:24px;border-radius:5px;background:#2c2c2c;color:#fff;font-size:0.75rem;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;">' + init + '.</div>'
      + '<span style="font-weight:700;font-size:0.9rem;">' + esc(name || '--') + '</span>'
      + '<span style="background:#1565ff;color:#fff;font-size:0.6rem;font-weight:800;padding:1px 5px;border-radius:3px;line-height:1.5;letter-spacing:0.02em;">+</span>'
      + '</div>';
  }

  // ── Chat icon button ──────────────────────────────────────────────
  function chatBtnHtml(btnId, prevScreen) {
    return '<button id="' + btnId + '" data-chat-prev="' + prevScreen + '" style="position:relative;width:38px;height:38px;border-radius:9px;background:#1e1e1e;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;">'
      + '<svg width="18" height="17" viewBox="0 0 24 23" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>'
      + '<span style="position:absolute;top:6px;right:6px;width:7px;height:7px;border-radius:50%;background:#00c2b2;border:1.5px solid #0d0d0d;"></span>'
      + '</button>';
  }

  // ── Inject all screen HTML ────────────────────────────────────────
  function injectHTML() {
    var SCR = 'position:fixed;inset:0;z-index:620;background:#0d0d0d;flex-direction:column;font-family:Manrope,sans-serif;overflow:hidden;';
    var BACK = 'background:none;border:none;color:#fff;font-size:1.3rem;cursor:pointer;padding:0.25rem 0.5rem 0.25rem 0;line-height:1;';
    var BODY = 'flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:0 1.1rem;';
    var FOOT = 'flex-shrink:0;padding:0.9rem 1.1rem;padding-bottom:calc(0.9rem + env(safe-area-inset-bottom));background:#0d0d0d;border-top:1px solid #191919;display:flex;flex-direction:column;gap:0.5rem;';
    var PBTN = 'width:100%;padding:1rem;border:none;border-radius:12px;font-size:1rem;font-weight:700;cursor:pointer;font-family:Manrope,sans-serif;background:#fff;color:#0d0d0d;';
    var GBTN = 'width:100%;padding:0.85rem;background:transparent;color:#fff;border:none;font-size:0.95rem;font-weight:600;cursor:pointer;font-family:Manrope,sans-serif;';
    var CARD = 'background:#181818;border-radius:12px;padding:1rem 1.1rem;margin-bottom:0.85rem;';

    var html = [
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // SCREEN 1  ─  Buy USDT
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    '<div id="bfBuyScreen" style="display:none;' + SCR + '">',
      // Header
      '<div style="display:flex;align-items:center;padding:1rem 1rem 0.7rem;flex-shrink:0;">',
        '<button id="bfBuyBack" style="' + BACK + '">←</button>',
        '<h2 style="flex:1;text-align:center;margin:0;font-size:1rem;font-weight:700;color:#fff;">Buy USDT</h2>',
        '<div style="width:1.8rem;"></div>',
      '</div>',
      // Body
      '<div style="' + BODY + 'padding-top:0.2rem;">',
        // Crypto / Fiat tabs + price
        '<div style="display:flex;align-items:flex-end;justify-content:space-between;border-bottom:1px solid #1e1e1e;margin-bottom:1.1rem;">',
          '<div style="display:flex;gap:1.6rem;">',
            '<span style="padding-bottom:0.6rem;font-size:0.88rem;font-weight:600;color:rgba(255,255,255,0.32);cursor:pointer;">Crypto</span>',
            '<span style="padding-bottom:0.6rem;font-size:0.88rem;font-weight:700;color:#fff;border-bottom:2px solid #00c2b2;position:relative;top:1px;">Fiat</span>',
          '</div>',
          '<span id="bfPriceTag" style="font-size:0.76rem;color:rgba(255,255,255,0.38);padding-bottom:0.6rem;display:flex;align-items:center;gap:4px;">Price ₹-- <span style="color:#00c2b2;font-size:0.82rem;">↻</span></span>',
        '</div>',
        // Amount input
        '<div style="background:#181818;border-radius:10px;padding:0.8rem 1rem;display:flex;align-items:center;gap:0.65rem;margin-bottom:0.4rem;">',
          '<input id="bfPayInput" type="number" inputmode="decimal" placeholder="Enter amount" style="flex:1;background:none;border:none;color:#fff;font-size:1.15rem;font-weight:600;outline:none;font-family:Manrope,sans-serif;min-width:0;"/>',
          '<span style="color:rgba(255,255,255,0.38);font-size:0.84rem;font-weight:700;flex-shrink:0;">INR</span>',
          '<button id="bfMaxBtn" style="background:transparent;border:1px solid #00c2b2;color:#00c2b2;font-size:0.72rem;font-weight:700;padding:4px 11px;border-radius:5px;cursor:pointer;flex-shrink:0;font-family:Manrope,sans-serif;">Max</button>',
        '</div>',
        '<div id="bfLimitInfo" style="font-size:0.74rem;color:rgba(255,255,255,0.36);margin-bottom:0.18rem;padding-left:2px;">Limit ₹-- - ₹--</div>',
        '<div id="bfUsdtCalc" style="font-size:0.77rem;color:rgba(255,255,255,0.42);margin-bottom:1rem;padding-left:2px;">≈ -- USDT</div>',
        // Payment method
        '<div style="background:#181818;border-radius:10px;padding:0.78rem 1rem;display:flex;align-items:center;gap:0.65rem;margin-bottom:1.1rem;">',
          '<span style="width:9px;height:9px;border-radius:2px;background:#00c2b2;flex-shrink:0;"></span>',
          '<select id="bfPayMethod" style="flex:1;background:none;border:none;color:#fff;font-size:0.89rem;font-family:Manrope,sans-serif;outline:none;cursor:pointer;-webkit-appearance:none;appearance:none;"></select>',
          '<span style="color:rgba(255,255,255,0.28);font-size:0.75rem;">▼</span>',
        '</div>',
        // Advertiser terms
        '<div style="margin-bottom:1.2rem;">',
          '<div style="font-size:0.8rem;color:rgba(255,255,255,0.48);font-weight:600;margin-bottom:0.32rem;">Advertiser terms</div>',
          '<div id="bfTerms" style="font-size:0.82rem;color:rgba(255,255,255,0.7);line-height:1.55;"></div>',
        '</div>',
        // Seller card
        '<div style="' + CARD + '">',
          '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;">',
            '<div id="bfSellerRow"></div>',
            '<span style="color:rgba(255,255,255,0.28);font-size:0.9rem;margin-left:0.5rem;">→</span>',
          '</div>',
          '<div style="display:grid;gap:0.5rem;font-size:0.78rem;">',
            '<div style="display:flex;justify-content:space-between;">',
              '<span style="color:rgba(255,255,255,0.4);">Pay within</span>',
              '<span id="bfDuration" style="color:#fff;font-weight:600;">15 minute(s)</span>',
            '</div>',
            '<div style="display:flex;justify-content:space-between;">',
              '<span style="color:rgba(255,255,255,0.4);">Historical orders</span>',
              '<span id="bfHistOrders" style="color:#fff;font-weight:600;">--</span>',
            '</div>',
            '<div style="display:flex;justify-content:space-between;">',
              '<span style="color:rgba(255,255,255,0.4);">30D average release time</span>',
              '<span style="color:#fff;font-weight:600;">1 min</span>',
            '</div>',
            '<div style="display:flex;justify-content:space-between;">',
              '<span style="color:rgba(255,255,255,0.4);">Completed orders (both parties)</span>',
              '<span id="bfCompletedOrds" style="color:#fff;font-weight:600;">0</span>',
            '</div>',
            '<div style="display:flex;justify-content:space-between;">',
              '<span style="color:rgba(255,255,255,0.4);">Account signup time</span>',
              '<span id="bfSignupDate" style="color:#fff;font-weight:600;">2024.01.01</span>',
            '</div>',
          '</div>',
        '</div>',
        '<div style="height:0.5rem;"></div>',
      '</div>',
      // Footer
      '<div style="' + FOOT + '">',
        '<div id="bfBuyHint" style="font-size:0.78rem;color:#f6465d;min-height:1em;text-align:center;"></div>',
        '<button id="bfBuyBtn" style="' + PBTN + 'background:#00c2b2;color:#0d0d0d;">Buy USDT with 0 fees</button>',
      '</div>',
    '</div>',

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // SCREEN 2  ─  Order Generated
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    '<div id="bfOrderScreen" style="display:none;' + SCR + '">',
      '<div style="display:flex;align-items:center;padding:1rem 1rem 0.6rem;flex-shrink:0;">',
        '<button id="bfOrderBack" style="' + BACK + '">←</button>',
      '</div>',
      '<div style="' + BODY + 'padding-top:0.1rem;">',
        '<h2 style="margin:0 0 0.4rem;font-size:1.25rem;font-weight:800;line-height:1.35;color:#fff;">The order has been generated.<br>Proceed to payment.</h2>',
        '<p style="margin:0 0 1.25rem;font-size:0.82rem;color:rgba(255,255,255,0.42);">Please pay within <span id="bfOrderTimer" style="color:#00c2b2;font-weight:700;">15:00s</span></p>',
        // Seller card with chat btn
        '<div style="' + CARD + 'display:flex;align-items:flex-start;justify-content:space-between;gap:0.75rem;">',
          '<div style="flex:1;min-width:0;">',
            '<div id="bfOrdSellerRow" style="margin-bottom:0.8rem;"></div>',
            '<div style="font-size:0.74rem;color:rgba(255,255,255,0.48);display:grid;gap:0.28rem;line-height:1.5;">',
              '<div style="display:flex;gap:0.4rem;align-items:flex-start;"><span style="flex-shrink:0;opacity:0.4;">*</span><span>The other party has passed our real-name and video identity verification.</span></div>',
              '<div style="display:flex;gap:0.4rem;align-items:flex-start;"><span style="flex-shrink:0;opacity:0.4;">*</span><span>The cryptocurrency in this order is held in escrow by Bitget P2P and your payment is secure.</span></div>',
            '</div>',
          '</div>',
          '<div id="bfOrdChatWrap" style="flex-shrink:0;"></div>',
        '</div>',
        // Order details card
        '<div style="' + CARD + '">',
          // Tether T + Buy USDT header
          '<div style="display:flex;align-items:center;gap:0.6rem;padding-bottom:0.8rem;border-bottom:1px solid #222;margin-bottom:0.1rem;">',
            '<div style="width:26px;height:26px;border-radius:50%;background:#26a17b;display:flex;align-items:center;justify-content:center;flex-shrink:0;">',
              '<span style="color:#fff;font-weight:900;font-size:0.82rem;line-height:1;">T</span>',
            '</div>',
            '<span style="font-weight:700;font-size:0.9rem;color:#fff;">Buy USDT</span>',
          '</div>',
          '<div id="bfOrdDetails"></div>',
        '</div>',
        '<div style="height:0.5rem;"></div>',
      '</div>',
      '<div style="' + FOOT + '">',
        '<button id="bfNextBtn" style="' + PBTN + '">Next →</button>',
        '<button id="bfOrdCancelBtn" style="' + GBTN + '">Cancel</button>',
      '</div>',
    '</div>',

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // SCREEN 3  ─  Payment Instructions
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    '<div id="bfPayScreen" style="display:none;' + SCR + '">',
      '<div style="display:flex;align-items:center;padding:1rem 1rem 0.6rem;flex-shrink:0;">',
        '<button id="bfPayBack" style="' + BACK + '">←</button>',
      '</div>',
      '<div style="' + BODY + 'padding-top:0.1rem;">',
        '<h2 id="bfPayTitle" style="margin:0 0 0.4rem;font-size:1.2rem;font-weight:800;line-height:1.35;color:#fff;">Please use UPI to transfer funds</h2>',
        '<p style="margin:0 0 1.25rem;font-size:0.82rem;color:rgba(255,255,255,0.42);">Please pay within <span id="bfPayTimer" style="color:#00c2b2;font-weight:700;">15:00s</span></p>',
        // Seller row + chat
        '<div style="' + CARD + 'display:flex;align-items:center;justify-content:space-between;gap:0.75rem;">',
          '<div id="bfPaySellerRow"></div>',
          '<div id="bfPayChatWrap" style="flex-shrink:0;"></div>',
        '</div>',
        // ◆ Exit instruction
        '<div style="display:flex;gap:0.7rem;margin-bottom:0.7rem;">',
          '<span style="color:#f0a500;font-size:1rem;flex-shrink:0;margin-top:3px;">◆</span>',
          '<div>',
            '<p style="margin:0 0 0.4rem;font-size:0.85rem;color:#fff;font-weight:600;line-height:1.5;">Exit the App and transfer funds to the following recipient\'s account.</p>',
            '<p style="margin:0;font-size:0.74rem;color:rgba(255,255,255,0.38);line-height:1.55;">During the transfer, please avoid using terms like BTC, USDT, Bitget, or similar, in the remarks, to prevent issues like the payment being intercepted or the account being frozen.</p>',
          '</div>',
        '</div>',
        // Transfer details table
        '<div style="background:#151515;border-radius:10px;padding:0.2rem 1rem;margin-bottom:0.8rem;">',
          '<div id="bfPayDetails"></div>',
        '</div>',
        // Warning text
        '<p id="bfPayWarn" style="font-size:0.74rem;color:rgba(255,255,255,0.38);line-height:1.55;margin:0 0 0.9rem;"></p>',
        // ◆ Tap Paid
        '<div style="display:flex;gap:0.7rem;margin-bottom:1rem;">',
          '<span style="color:#f0a500;font-size:1rem;flex-shrink:0;margin-top:3px;">◆</span>',
          '<p style="margin:0;font-size:0.85rem;color:#fff;line-height:1.5;">After completing the transfer, tap the <strong>Paid</strong> button</p>',
        '</div>',
        '<div style="height:0.5rem;"></div>',
      '</div>',
      '<div style="' + FOOT + '">',
        '<button id="bfPaidBtn" style="' + PBTN + '">Paid</button>',
        '<button id="bfPayCancelBtn" style="' + GBTN + '">Cancel</button>',
      '</div>',
    '</div>',

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // PAID BOTTOM SHEET
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    '<div id="bfPaidSheet" style="display:none;position:fixed;inset:0;z-index:700;background:rgba(0,0,0,0.55);align-items:flex-end;font-family:Manrope,sans-serif;">',
      '<div style="background:#141414;border-radius:18px 18px 0 0;width:100%;padding-bottom:calc(1.4rem + env(safe-area-inset-bottom));">',
        // drag handle
        '<div style="padding:0.8rem 0 0.2rem;display:flex;justify-content:center;">',
          '<div style="width:36px;height:4px;border-radius:2px;background:rgba(255,255,255,0.18);"></div>',
        '</div>',
        '<div style="padding:0.9rem 1.1rem 0;">',
          '<h3 style="margin:0 0 1rem;font-size:1.05rem;font-weight:700;color:#fff;">Paid</h3>',
          // warning box
          '<div style="background:rgba(240,165,0,0.07);border:1px solid rgba(240,165,0,0.28);border-radius:9px;padding:0.7rem 0.85rem;margin-bottom:0.9rem;display:flex;gap:0.5rem;align-items:flex-start;">',
            '<span style="color:#f0a500;font-size:0.88rem;flex-shrink:0;">ℹ</span>',
            '<p style="margin:0;font-size:0.76rem;color:rgba(255,255,255,0.62);line-height:1.5;">Complete the payment before clicking "Paid". False actions may lead to account restrictions.</p>',
          '</div>',
          // option 1
          '<div id="bfPaidOpt1" onclick="bfSelectPaidOpt(1)" style="background:#1c1c1c;border:1.5px solid #2a2a2a;border-radius:10px;padding:0.9rem 1rem;margin-bottom:0.45rem;cursor:pointer;transition:border-color 0.15s,background 0.15s;">',
            '<span id="bfPaidOpt1Text" style="font-size:0.86rem;color:#fff;line-height:1.4;display:block;">I have transferred the amount to the above account.</span>',
          '</div>',
          // option 2
          '<div id="bfPaidOpt2" onclick="bfSelectPaidOpt(2)" style="background:#1c1c1c;border:1.5px solid #2a2a2a;border-radius:10px;padding:0.9rem 1rem;margin-bottom:1rem;cursor:pointer;transition:border-color 0.15s,background 0.15s;">',
            '<span style="font-size:0.86rem;color:#fff;line-height:1.4;display:block;">I have not made the payment yet.</span>',
          '</div>',
          // confirm btn
          '<button id="bfPaidConfirmBtn" disabled style="width:100%;padding:1rem;background:#222;color:rgba(255,255,255,0.22);border:none;border-radius:12px;font-size:1rem;font-weight:700;cursor:not-allowed;font-family:Manrope,sans-serif;transition:all 0.15s;">Confirm</button>',
        '</div>',
      '</div>',
    '</div>',
    ].join('');

    var w = document.createElement('div'); w.innerHTML = html; document.body.appendChild(w);
  }

  // ── Fill Screen 1 ─────────────────────────────────────────────────
  function bfFillBuy(offer) {
    _bfOffer = offer;
    var el;
    var sellerRow = document.getElementById('bfSellerRow');
    if (sellerRow) sellerRow.innerHTML = sellerRowHtml(offer.advertiser || '--');
    el = document.getElementById('bfPriceTag');
    if (el) el.innerHTML = 'Price ₹' + fmt(offer.price) + ' <span style="color:#00c2b2;font-size:0.82rem;">↻</span>';
    el = document.getElementById('bfLimitInfo');
    if (el) el.textContent = 'Limit ₹' + fmt(offer.minLimit) + ' - ₹' + fmt(offer.maxLimit);
    el = document.getElementById('bfTerms');
    if (el) el.textContent = offer.remark || 'Standard P2P terms apply.';
    el = document.getElementById('bfHistOrders');
    if (el) el.textContent = 'Buy ' + (offer.orders || 0) + ' Sell 0';
    el = document.getElementById('bfCompletedOrds');
    if (el) el.textContent = offer.orders || 0;
    var pm = document.getElementById('bfPayMethod');
    if (pm) pm.innerHTML = (offer.payments || ['UPI']).map(function(m) { return '<option value="' + esc(m) + '">' + esc(m) + '</option>'; }).join('');
    var pi = document.getElementById('bfPayInput');
    if (pi) { pi.value = offer.minLimit || ''; bfUpdateCalc(); }
    el = document.getElementById('bfBuyHint'); if (el) el.textContent = '';
    bfShow('bfBuyScreen');
    if (pi) setTimeout(function() { pi.focus(); }, 350);
  }

  function bfUpdateCalc() {
    var pi = document.getElementById('bfPayInput'), uc = document.getElementById('bfUsdtCalc');
    if (!pi || !_bfOffer) return;
    var amt = Number(pi.value || 0), usdt = _bfOffer.price > 0 ? amt / _bfOffer.price : 0;
    if (uc) uc.textContent = amt > 0 ? ('≈ ' + usdt.toFixed(2) + 'USDT') : '≈ -- USDT';
  }

  // ── Fill Screen 2 ─────────────────────────────────────────────────
  function bfFillOrder(order) {
    _bfOrder = order;
    var sellerName = order.sellerUsername || (_bfOffer && _bfOffer.advertiser) || '--';
    var el = document.getElementById('bfOrdSellerRow');
    if (el) el.innerHTML = sellerRowHtml(sellerName);
    var cw = document.getElementById('bfOrdChatWrap');
    if (cw) cw.innerHTML = chatBtnHtml('bfOrdChatBtn', 'bfOrderScreen');

    var det = document.getElementById('bfOrdDetails');
    if (det) {
      var remark = order.notes || order.remark || (_bfOffer && _bfOffer.remark) || '';
      var dt = new Date(order.createdAt || Date.now());
      var pad = function(n) { return (n < 10 ? '0' : '') + n; };
      var dtStr = dt.getFullYear() + '-' + pad(dt.getMonth()+1) + '-' + pad(dt.getDate()) + ' ' + pad(dt.getHours()) + ':' + pad(dt.getMinutes()) + ':' + pad(dt.getSeconds());
      var refStr = String(order.reference || order.id || '--');
      var price = order.price || (_bfOffer && _bfOffer.price) || 0;
      var qty = order.assetAmount || (price > 0 ? (order.amountInr / price) : 0);
      det.innerHTML =
        makeRow('Trading amount', '₹ ' + fmt(order.amountInr || 0), String(order.amountInr || '')) +
        makeRow('Price', '₹' + fmt(price), null) +
        makeRow('Quantity', Number(qty).toFixed(2) + ' USDT', null) +
        makeRow('Fee', '0 USDT', null) +
        makeRow('Payment method', pmPill(order.paymentMethod || (_bfOffer && _bfOffer.payments && _bfOffer.payments[0]) || 'UPI'), null) +
        '<div style="border-top:1px solid #222;margin:0.5rem 0;"></div>' +
        makeRow('Order No', '<span style="font-size:0.74rem;">' + esc(refStr) + '</span>', refStr) +
        makeRow('Order time', dtStr, null) +
        (remark ? makeRow('Notes', '<span style="font-size:0.76rem;color:rgba(255,255,255,0.55);">' + esc(remark) + '</span>', null) : '');
    }
    var secs = typeof remainingSeconds !== 'undefined' ? remainingSeconds : 900;
    var t = document.getElementById('bfOrderTimer'); if (t) t.textContent = bfTimerFmt(secs);
    bfStartTimer();
    bfShow('bfOrderScreen');
  }

  // ── Fill Screen 3 ─────────────────────────────────────────────────
  function bfFillPay() {
    if (!_bfOrder) return;
    var order = _bfOrder;
    var method = order.paymentMethod || (_bfOffer && _bfOffer.payments && _bfOffer.payments[0]) || 'UPI';
    var sellerName = order.sellerUsername || (_bfOffer && _bfOffer.advertiser) || '--';
    var el;
    el = document.getElementById('bfPayTitle');
    if (el) el.textContent = 'Please use ' + method + ' to transfer funds';
    el = document.getElementById('bfPaySellerRow');
    if (el) el.innerHTML = sellerRowHtml(sellerName);
    var cw = document.getElementById('bfPayChatWrap');
    if (cw) cw.innerHTML = chatBtnHtml('bfPayChatBtn', 'bfPayScreen');

    var det = document.getElementById('bfPayDetails');
    if (det) {
      det.innerHTML =
        makeRow('Trading amount', '₹ ' + fmt(order.amountInr || 0), String(order.amountInr || '')) +
        makeRow('Recipient name', esc(sellerName), sellerName) +
        makeRow('Payment method', pmPill(method), null) +
        makeRow(method + ' wallet VPA', '<span style="color:rgba(255,255,255,0.4);">ask in chat</span>', null);
    }
    var myName = (typeof currentUser !== 'undefined' && currentUser) ? (currentUser.username || currentUser.name || 'you') : 'you';
    el = document.getElementById('bfPayWarn');
    if (el) el.textContent = 'Please use an account under your name (' + myName + ') to make the transfer. If the paying account and your personal information do not match, the seller may request a refund or cancel the order.';
    bfShow('bfPayScreen');
  }

  // ── Paid sheet ─────────────────────────────────────────────────────
  function bfShowPaidSheet() {
    _bfPaidSel = 0;
    var o1 = document.getElementById('bfPaidOpt1'), o2 = document.getElementById('bfPaidOpt2'), btn = document.getElementById('bfPaidConfirmBtn'), t1 = document.getElementById('bfPaidOpt1Text');
    if (o1) { o1.style.borderColor = '#2a2a2a'; o1.style.background = '#1c1c1c'; }
    if (o2) { o2.style.borderColor = '#2a2a2a'; o2.style.background = '#1c1c1c'; }
    if (btn) { btn.disabled = true; btn.style.background = '#222'; btn.style.color = 'rgba(255,255,255,0.22)'; btn.style.cursor = 'not-allowed'; }
    if (t1 && _bfOrder) t1.textContent = 'I have transferred ' + fmt(_bfOrder.amountInr || 0) + ' INR to the above account.';
    var sheet = document.getElementById('bfPaidSheet'); if (sheet) sheet.style.display = 'flex';
  }

  window.bfSelectPaidOpt = function(opt) {
    _bfPaidSel = opt;
    var o1 = document.getElementById('bfPaidOpt1'), o2 = document.getElementById('bfPaidOpt2'), btn = document.getElementById('bfPaidConfirmBtn');
    if (o1) { o1.style.borderColor = opt === 1 ? '#00c2b2' : '#2a2a2a'; o1.style.background = opt === 1 ? 'rgba(0,194,178,0.08)' : '#1c1c1c'; }
    if (o2) { o2.style.borderColor = opt === 2 ? 'rgba(255,255,255,0.25)' : '#2a2a2a'; o2.style.background = opt === 2 ? 'rgba(255,255,255,0.05)' : '#1c1c1c'; }
    if (btn) { var ok = opt === 1; btn.disabled = !ok; btn.style.background = ok ? '#fff' : '#222'; btn.style.color = ok ? '#0d0d0d' : 'rgba(255,255,255,0.22)'; btn.style.cursor = ok ? 'pointer' : 'not-allowed'; }
  };

  // ── Wire Events ───────────────────────────────────────────────────
  function wireEvents() {
    // Screen 1
    document.getElementById('bfBuyBack').onclick = function() { bfClose(); };
    document.getElementById('bfPayInput').oninput = bfUpdateCalc;
    document.getElementById('bfMaxBtn').onclick = function() {
      if (_bfOffer) { document.getElementById('bfPayInput').value = _bfOffer.maxLimit; bfUpdateCalc(); }
    };
    document.getElementById('bfBuyBtn').onclick = async function() {
      var btn = this, hint = document.getElementById('bfBuyHint');
      if (!_bfOffer) return;
      var payAmt = Number(document.getElementById('bfPayInput').value || 0);
      var method = document.getElementById('bfPayMethod').value;
      var min = Number(_bfOffer.minLimit || 0), max = Number(_bfOffer.maxLimit || Infinity);
      if (!payAmt || payAmt < min || payAmt > max) {
        if (hint) hint.textContent = 'Enter amount between ₹' + fmt(min) + ' and ₹' + fmt(max);
        return;
      }
      if (hint) hint.textContent = '';
      btn.disabled = true; btn.textContent = 'Creating order...';
      try {
        var data = await createOrder(_bfOffer.id, { amountInr: payAmt, paymentMethod: method, openAfterCreate: false });
        if (!data || !data.order) throw new Error('Order creation failed.');
        openOrder(data.order);
        var om = document.getElementById('orderModal');
        if (om) { om.classList.add('hidden'); om.setAttribute('aria-hidden','true'); }
        document.body.classList.remove('p2p-order-open');
        bfFillOrder(data.order);
      } catch(e) {
        if (hint) hint.textContent = e.message || 'Failed to create order.';
      } finally {
        btn.disabled = false; btn.textContent = 'Buy USDT with 0 fees';
      }
    };

    // Screen 2
    document.getElementById('bfOrderBack').onclick = function() {
      if (confirm('Go back? Your order will remain active.')) { bfClose(); bfShowOldOrderModal(); }
    };
    document.getElementById('bfNextBtn').onclick = function() { bfFillPay(); };
    document.getElementById('bfOrdCancelBtn').onclick = function() {
      bfClose();
      var om = document.getElementById('orderModal');
      if (om) { om.classList.remove('hidden'); om.setAttribute('aria-hidden','false'); }
      document.body.classList.add('p2p-order-open'); document.body.style.overflow = 'hidden';
      if (typeof setCancelModalOpen === 'function') setTimeout(function() { setCancelModalOpen(true); }, 100);
    };

    // Screen 3 – delegate chat btn clicks (injected dynamically)
    document.addEventListener('click', function(e) {
      var btn = e.target.closest('[data-chat-prev]');
      if (btn) { var prev = btn.getAttribute('data-chat-prev'); if (window.bfOpenChat) window.bfOpenChat(prev); }
    });

    document.getElementById('bfPayBack').onclick = function() { bfShow('bfOrderScreen'); };
    document.getElementById('bfPayCancelBtn').onclick = document.getElementById('bfOrdCancelBtn').onclick;
    document.getElementById('bfPaidBtn').onclick = function() { bfShowPaidSheet(); };

    // Paid sheet
    document.getElementById('bfPaidSheet').addEventListener('click', function(e) { if (e.target === this) this.style.display = 'none'; });
    document.getElementById('bfPaidConfirmBtn').onclick = async function() {
      if (_bfPaidSel !== 1) return;
      var btn = this; btn.disabled = true; btn.textContent = 'Processing...';
      try {
        await updateOrderStatus('mark_paid');
        var sheet = document.getElementById('bfPaidSheet'); if (sheet) sheet.style.display = 'none';
        bfClose(); bfShowOldOrderModal();
      } catch(e) {
        alert(e.message || 'Failed. Please try again.');
        btn.disabled = false; btn.textContent = 'Confirm';
        window.bfSelectPaidOpt(_bfPaidSel);
      }
    };
  }

  // ── Override fillDealModal ─────────────────────────────────────────
  var _origFillDeal = window.fillDealModal;
  window.fillDealModal = function(offer) {
    if (_origFillDeal) _origFillDeal(offer);
    var dm = document.getElementById('dealModal');
    if (dm) { dm.classList.add('hidden'); dm.setAttribute('aria-hidden','true'); }
    document.body.classList.remove('p2p-deal-open');
    bfFillBuy(offer);
  };

  // ── Init ──────────────────────────────────────────────────────────
  injectHTML();
  wireEvents();
})();

// ===================================================================
// BINANCE-STYLE CHAT SCREEN  (opens when 💬 is tapped)
// ===================================================================
(function initBfChatScreen() {
  var _chatPrevScreen = 'bfOrderScreen';
  var _chatPollTimer = null;
  var _chatRenderedIds = {};

  // ── helpers ──────────────────────────────────────────────────────
  function esc2(s) {
    return typeof escapeHtml === 'function' ? escapeHtml(s)
      : String(s || '').replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; });
  }

  function getOrderId() {
    return typeof activeOrderId !== 'undefined' ? activeOrderId : null;
  }

  function getMyName() {
    if (typeof currentUser !== 'undefined' && currentUser) return currentUser.username || currentUser.name || '';
    return '';
  }

  // ── inject HTML ──────────────────────────────────────────────────
  function injectChatHTML() {
    var div = document.createElement('div');
    div.innerHTML = [
      '<div id="bfChatScreen" style="display:none;position:fixed;inset:0;z-index:650;background:#0a0a0a;flex-direction:column;font-family:Manrope,sans-serif;overflow:hidden;">',
        // Header
        '<div id="bfChatHeader" style="display:flex;align-items:center;padding:0.85rem 1rem;gap:0.75rem;flex-shrink:0;border-bottom:1px solid rgba(255,255,255,0.07);background:#111;">',
          '<button id="bfChatBackBtn" style="background:none;border:none;color:#fff;font-size:1.4rem;cursor:pointer;padding:0.2rem 0.4rem;line-height:1;">←</button>',
          '<div id="bfChatAvatar" style="width:34px;height:34px;border-radius:50%;background:#f0b90b;color:#000;font-weight:800;font-size:0.9rem;display:flex;align-items:center;justify-content:center;flex-shrink:0;"></div>',
          '<div style="flex:1;min-width:0;">',
            '<div id="bfChatName" style="font-weight:700;font-size:0.92rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"></div>',
            '<div style="font-size:0.72rem;color:rgba(255,255,255,0.4);">P2P Order Chat</div>',
          '</div>',
        '</div>',
        // Messages area
        '<div id="bfChatMsgs" style="flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:0.9rem 1rem;display:flex;flex-direction:column;gap:0.55rem;"></div>',
        // Footer
        '<div style="flex-shrink:0;padding:0.7rem 1rem;padding-bottom:calc(0.7rem + env(safe-area-inset-bottom));background:#111;border-top:1px solid rgba(255,255,255,0.07);display:flex;align-items:flex-end;gap:0.55rem;">',
          '<label id="bfChatImgBtn" style="width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;font-size:1.1rem;" title="Send image">',
            '<span>📎</span>',
            '<input id="bfChatImgInput" type="file" accept="image/*" style="display:none;">',
          '</label>',
          '<textarea id="bfChatInput" rows="1" placeholder="Type a message..." style="flex:1;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:20px;color:#fff;font-size:0.9rem;font-family:Manrope,sans-serif;padding:0.6rem 1rem;outline:none;resize:none;max-height:100px;line-height:1.4;"></textarea>',
          '<button id="bfChatSendBtn" style="width:42px;height:42px;border-radius:50%;background:#00c2b2;border:none;color:#000;font-size:1.1rem;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-weight:700;">→</button>',
        '</div>',
      '</div>'
    ].join('');
    document.body.appendChild(div);
  }

  // ── render messages ──────────────────────────────────────────────
  function renderMsg(msg) {
    var myName = getMyName().toLowerCase();
    var sender = String(msg.sender || '').toLowerCase();
    var isMine = sender === myName;
    var isSystem = msg.messageType === 'system' || (!msg.sender);

    if (isSystem) {
      var sysEl = document.createElement('div');
      sysEl.style.cssText = 'text-align:center;font-size:0.72rem;color:rgba(255,255,255,0.35);padding:0.2rem 0;';
      sysEl.textContent = msg.text || '';
      return sysEl;
    }

    var wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;align-items:' + (isMine ? 'flex-end' : 'flex-start') + ';gap:2px;';

    var bubble = document.createElement('div');
    bubble.style.cssText = 'max-width:75%;padding:0.55rem 0.85rem;border-radius:' +
      (isMine ? '16px 4px 16px 16px' : '4px 16px 16px 16px') +
      ';font-size:0.87rem;line-height:1.45;word-break:break-word;' +
      (isMine ? 'background:#00c2b2;color:#000;' : 'background:rgba(255,255,255,0.1);color:#fff;');

    if (msg.messageType === 'image' && msg.imageUrl) {
      var img = document.createElement('img');
      img.src = msg.imageUrl;
      img.style.cssText = 'max-width:220px;border-radius:10px;display:block;';
      img.onclick = function() { window.open(msg.imageUrl, '_blank'); };
      bubble.appendChild(img);
      if (msg.text && msg.text !== 'Payment screenshot') {
        var cap = document.createElement('div');
        cap.style.cssText = 'margin-top:4px;font-size:0.78rem;';
        cap.textContent = msg.text;
        bubble.appendChild(cap);
      }
    } else {
      bubble.textContent = msg.text || '';
    }

    wrap.appendChild(bubble);

    var ts = document.createElement('div');
    var d = new Date(msg.createdAt || Date.now());
    ts.style.cssText = 'font-size:0.65rem;color:rgba(255,255,255,0.28);padding:0 4px;';
    ts.textContent = d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0');
    wrap.appendChild(ts);

    return wrap;
  }

  function appendMsg(msg, scroll) {
    var container = document.getElementById('bfChatMsgs');
    if (!container) return;
    var id = msg.id || (msg.clientId || '');
    if (id && _chatRenderedIds[id]) return; // deduplicate
    if (id) _chatRenderedIds[id] = true;
    container.appendChild(renderMsg(msg));
    if (scroll !== false) container.scrollTop = container.scrollHeight;
  }

  function showEmpty() {
    var container = document.getElementById('bfChatMsgs');
    if (!container) return;
    if (container.children.length === 0) {
      var e = document.createElement('p');
      e.id = 'bfChatEmpty';
      e.style.cssText = 'text-align:center;color:rgba(255,255,255,0.3);font-size:0.82rem;margin-top:2rem;';
      e.textContent = 'No messages yet. Say hello!';
      container.appendChild(e);
    }
  }

  function clearEmpty() {
    var e = document.getElementById('bfChatEmpty');
    if (e && e.parentNode) e.parentNode.removeChild(e);
  }

  // ── fetch & poll ──────────────────────────────────────────────────
  async function fetchMessages() {
    var orderId = getOrderId();
    if (!orderId) return;
    try {
      var resp = await fetch('/api/p2p/orders/' + orderId + '/messages');
      if (!resp.ok) return;
      var data = await resp.json();
      var msgs = data.messages || [];
      var container = document.getElementById('bfChatMsgs');
      if (!container) return;
      clearEmpty();
      msgs.forEach(function(m) { appendMsg(m, false); });
      container.scrollTop = container.scrollHeight;
      if (msgs.length === 0) showEmpty();
    } catch(e) { /* silent */ }
  }

  function startPolling() {
    stopPolling();
    fetchMessages();
    _chatPollTimer = setInterval(fetchMessages, 1000);
  }

  function stopPolling() {
    if (_chatPollTimer) { clearInterval(_chatPollTimer); _chatPollTimer = null; }
  }

  // ── send message ──────────────────────────────────────────────────
  async function sendMessage() {
    var input = document.getElementById('bfChatInput');
    var btn = document.getElementById('bfChatSendBtn');
    var orderId = getOrderId();
    if (!input || !orderId) return;
    var text = input.value.trim();
    if (!text) return;
    input.value = '';
    input.style.height = '';
    btn.disabled = true;
    // Optimistic render
    clearEmpty();
    appendMsg({ id: 'opt_' + Date.now(), sender: getMyName(), text: text, createdAt: new Date().toISOString() });
    try {
      await fetch('/api/p2p/orders/' + orderId + '/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text })
      });
    } catch(e) { /* silent */ }
    btn.disabled = false;
  }

  // ── send image ─────────────────────────────────────────────────────
  async function sendImage(file) {
    var orderId = getOrderId();
    if (!file || !orderId) return;
    // Convert to base64
    var reader = new FileReader();
    reader.onload = async function(e) {
      var dataUrl = e.target.result;
      clearEmpty();
      // Optimistic preview
      appendMsg({ id: 'opt_img_' + Date.now(), sender: getMyName(), messageType: 'image', imageUrl: dataUrl, createdAt: new Date().toISOString() });
      try {
        // Try the existing image upload endpoint if available
        var formData = new FormData();
        formData.append('image', file);
        var resp = await fetch('/api/p2p/orders/' + orderId + '/messages/image', { method: 'POST', body: formData });
        if (!resp.ok) {
          // Fallback: send as text message with note
          await fetch('/api/p2p/orders/' + orderId + '/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: '[Image sent]' })
          });
        }
      } catch(e) {
        // fallback silent
      }
    };
    reader.readAsDataURL(file);
  }

  // ── wire events ───────────────────────────────────────────────────
  function wireChatEvents() {
    document.getElementById('bfChatBackBtn').onclick = function() {
      stopPolling();
      document.getElementById('bfChatScreen').style.display = 'none';
      var prev = document.getElementById(_chatPrevScreen);
      if (prev) prev.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    };

    document.getElementById('bfChatSendBtn').onclick = function() { sendMessage(); };

    var input = document.getElementById('bfChatInput');
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
    input.addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 100) + 'px';
    });

    document.getElementById('bfChatImgInput').addEventListener('change', function() {
      var f = this.files && this.files[0];
      if (f) { sendImage(f); this.value = ''; }
    });
  }

  // ── public API ────────────────────────────────────────────────────
  window.bfOpenChat = function(prevScreenId) {
    _chatPrevScreen = prevScreenId || 'bfOrderScreen';
    // Hide other screens
    ['bfBuyScreen','bfOrderScreen','bfPayScreen'].forEach(function(id) {
      var el = document.getElementById(id); if (el) el.style.display = 'none';
    });

    // Fill counterparty info
    var snapshot = typeof activeOrderSnapshot !== 'undefined' ? activeOrderSnapshot : null;
    var myName = getMyName().toLowerCase();
    var counterparty = '';
    if (snapshot) {
      var buyer = String(snapshot.buyerUsername || '').trim();
      var seller = String(snapshot.sellerUsername || snapshot.advertiser || '').trim();
      counterparty = buyer.toLowerCase() === myName ? seller : buyer;
    }
    if (!counterparty && typeof _bfOffer !== 'undefined' && _bfOffer) {
      counterparty = _bfOffer.advertiser || '';
    }

    var avatar = document.getElementById('bfChatAvatar');
    var nameEl = document.getElementById('bfChatName');
    if (avatar) avatar.textContent = String(counterparty || 'S').slice(0,1).toUpperCase();
    if (nameEl) nameEl.textContent = counterparty || 'Seller';

    // Reset message list (keep cache for dedup)
    var container = document.getElementById('bfChatMsgs');
    if (container) { container.innerHTML = ''; }
    _chatRenderedIds = {};

    var screen = document.getElementById('bfChatScreen');
    if (screen) screen.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    startPolling();

    // Focus input
    setTimeout(function() {
      var inp = document.getElementById('bfChatInput');
      if (inp) inp.focus();
    }, 350);
  };

  // ── init ──────────────────────────────────────────────────────────
  injectChatHTML();
  wireChatEvents();
})();

// ── Navigate to standalone order flow on Buy ──────────────────────
(function() {
  window.fillDealModal = function(offer) {
    if (offer && offer.id) {
      window.location.href = '/p2p-order-flow.html?adId=' + encodeURIComponent(offer.id);
    }
  };
})();

// ── Redirect all order opens to new order flow page ──────────────
(function() {
  var _origOpenOrder = openOrder;
  openOrder = function(order) {
    if (order && order.id) {
      window.location.href = '/p2p-order-flow.html?orderId=' + encodeURIComponent(order.id);
      return;
    }
    _origOpenOrder.call(this, order);
  };

  var _origOpenOrderById = openOrderById;
  openOrderById = async function(orderId) {
    if (orderId) {
      window.location.href = '/p2p-order-flow.html?orderId=' + encodeURIComponent(orderId);
      return;
    }
    return _origOpenOrderById.call(this, orderId);
  };
})();

// ── Real-time user SSE stream — instant new order notification ───
(function() {
  var _userStream = null;
  function connectUserStream() {
    if (_userStream) { _userStream.close(); _userStream = null; }
    _userStream = new EventSource('/api/p2p/me/stream', { withCredentials: true });
    _userStream.addEventListener('new_order', function() {
      // New order arrived — refresh immediately
      loadLiveOrders();
      loadBybitorOrders();
    });
    _userStream.onerror = function() {
      // Reconnect after 3s on error
      if (_userStream) { _userStream.close(); _userStream = null; }
      setTimeout(function() { if (currentUser) connectUserStream(); }, 3000);
    };
  }

  // Start stream when user logs in, stop on logout
  var _origLoadCurrentUser = loadCurrentUser;
  loadCurrentUser = async function() {
    await _origLoadCurrentUser.apply(this, arguments);
    if (currentUser) connectUserStream();
    else if (_userStream) { _userStream.close(); _userStream = null; }
  };

  // Also connect right after login
  document.addEventListener('p2p:login', function() { if (currentUser) connectUserStream(); });
})();
