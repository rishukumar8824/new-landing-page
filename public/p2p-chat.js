const orderId = new URLSearchParams(window.location.search).get('orderId');

const backBtn = document.getElementById('backBtn');
const refreshBtn = document.getElementById('refreshBtn');
const counterpartyName = document.getElementById('counterpartyName');
const statusBadge = document.getElementById('statusBadge');
const orderTimer = document.getElementById('orderTimer');

const detailAmount = document.getElementById('detailAmount');
const detailPrice = document.getElementById('detailPrice');
const detailQty = document.getElementById('detailQty');
const detailFee = document.getElementById('detailFee');
const detailPayment = document.getElementById('detailPayment');
const detailRef = document.getElementById('detailRef');
const detailTime = document.getElementById('detailTime');

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

const CHAT_IMAGE_MAX_SIZE = 3 * 1024 * 1024;
const CHAT_MAX_PAYLOAD_BYTES = 80 * 1024;
const CHAT_IMAGE_ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const CHAT_PAYLOAD_PREFIX = '__P2P_MSG__:';

let currentUser = null;
let activeOrder = null;
let activeRole = '';
let remainingSeconds = 0;
let countdownInterval = null;
let messagesPollInterval = null;
let orderPollInterval = null;
let orderStream = null;
let chatUploading = false;

const chatMessageMap = new Map();
const chatMessageNodes = new Map();

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 6 });
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '--';
  }
  return date.toLocaleString();
}

function formatTimer(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function normalizeStatus(status) {
  if (status === 'OPEN' || status === 'PENDING') {
    return 'CREATED';
  }
  return String(status || '').toUpperCase();
}

function statusLabel(status) {
  const map = {
    CREATED: 'CREATED',
    PAID: 'PAID',
    RELEASED: 'RELEASED',
    CANCELLED: 'CANCELLED',
    EXPIRED: 'EXPIRED',
    DISPUTED: 'DISPUTED'
  };
  return map[normalizeStatus(status)] || 'CREATED';
}

function statusClass(status) {
  const map = {
    CREATED: 'status-created',
    PAID: 'status-paid',
    RELEASED: 'status-released',
    CANCELLED: 'status-cancelled',
    EXPIRED: 'status-expired',
    DISPUTED: 'status-paid'
  };
  return map[normalizeStatus(status)] || 'status-created';
}

function sanitizeImageUrl(url) {
  const source = String(url || '').trim();
  if (!source) {
    return '';
  }

  const isSafeData = /^data:image\/(png|jpe?g|webp);base64,[a-z0-9+/=\s]+$/i.test(source);
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
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Unable to process image.'));
    };

    image.src = objectUrl;
  });
}

async function compressImageForChat(file) {
  const image = await loadImageFromFile(file);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Unable to initialize image processor.');
  }

  const maxDimensions = [1280, 1024, 900, 768, 640, 512, 420];
  const qualitySteps = [0.86, 0.78, 0.7, 0.62, 0.54, 0.46, 0.4, 0.34, 0.28];
  let bestCandidate = '';
  let bestBytes = Number.POSITIVE_INFINITY;

  const tryEncode = (mimeType, quality) => {
    const encoded = canvas.toDataURL(mimeType, quality);
    const bytes = estimateDataUrlBytes(encoded);
    if (bytes < bestBytes) {
      bestCandidate = encoded;
      bestBytes = bytes;
    }
    return { encoded, bytes };
  };

  for (const maxDimension of maxDimensions) {
    const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    canvas.width = width;
    canvas.height = height;
    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    for (const quality of qualitySteps) {
      const webpAttempt = tryEncode('image/webp', quality);
      if (webpAttempt.bytes <= CHAT_MAX_PAYLOAD_BYTES) {
        return webpAttempt.encoded;
      }

      if (!webpAttempt.encoded.startsWith('data:image/webp')) {
        const jpegAttempt = tryEncode('image/jpeg', quality);
        if (jpegAttempt.bytes <= CHAT_MAX_PAYLOAD_BYTES) {
          return jpegAttempt.encoded;
        }
      }
    }
  }

  if (bestCandidate && bestBytes <= CHAT_IMAGE_MAX_SIZE) {
    return bestCandidate;
  }

  throw new Error('Image too large after compression. Please crop and upload again.');
}

function generateClientId() {
  return `tmp_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
}

function encodeChatPayload(payload) {
  return `${CHAT_PAYLOAD_PREFIX}${JSON.stringify(payload)}`;
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
  const messageType = explicitType || payload.messageType;
  const imageUrl = explicitImageUrl || payload.imageUrl;
  const clientId = explicitClientId || payload.clientId;
  const createdAt = new Date(raw?.createdAt || payload.createdAt || Date.now()).toISOString();
  const isEncodedText = !explicitType && explicitText.startsWith(CHAT_PAYLOAD_PREFIX);
  const safeText = isEncodedText ? '' : explicitText;

  const text =
    messageType === 'image'
      ? safeText || payload.text || 'Payment screenshot'
      : explicitType
        ? safeText
        : payload.text;

  return {
    id: raw?.id || '',
    sender: String(raw?.sender || currentUser?.username || 'You'),
    createdAt,
    messageType,
    text,
    imageUrl,
    clientId,
    pending: Boolean(optimistic),
    failed: false
  };
}

function resetMessages() {
  chatMessageMap.clear();
  chatMessageNodes.clear();
  if (chatMessages) {
    chatMessages.innerHTML = '<p class="chat-empty">No messages yet.</p>';
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

function getMessageClass(message) {
  const sender = String(message.sender || '')
    .trim()
    .toLowerCase();
  const buyer = String(activeOrder?.buyerUsername || '')
    .trim()
    .toLowerCase();
  const seller = String(activeOrder?.sellerUsername || activeOrder?.advertiser || '')
    .trim()
    .toLowerCase();
  const me = String(currentUser?.username || '')
    .trim()
    .toLowerCase();

  if (sender === 'system') {
    return 'chat-system';
  }

  const senderIsBuyer = Boolean(buyer && sender === buyer);
  const senderIsSeller = Boolean(seller && sender === seller);
  const directSelf = Boolean(me && sender === me);
  const roleBasedSelf = (activeRole === 'buyer' && senderIsBuyer) || (activeRole === 'seller' && senderIsSeller);
  const isSelf = directSelf || roleBasedSelf;

  return isSelf ? 'chat-self' : 'chat-other';
}

function buildMessageMarkup(message) {
  const cls = getMessageClass(message);
  const safeText = escapeHtml(message.text || (message.messageType === 'image' ? 'Payment screenshot' : ''));
  const imageMarkup =
    message.messageType === 'image' && message.imageUrl
      ? `<button class="chat-image-link" type="button" data-preview-src="${escapeHtml(message.imageUrl)}"><img class="chat-image" src="${escapeHtml(
          message.imageUrl
        )}" alt="Payment screenshot" loading="lazy" /></button>`
      : '';

  const pendingTag = message.pending ? '<span class="chat-meta-flag">Sending...</span>' : '';
  const failedTag = message.failed ? '<span class="chat-meta-flag failed">Failed</span>' : '';

  return `
    <article class="chat-item ${cls}${message.pending ? ' pending' : ''}${message.failed ? ' failed' : ''}" data-message-key="${escapeHtml(
      messageKeyFromMessage(message)
    )}">
      <p class="chat-sender">${escapeHtml(message.sender)}</p>
      ${imageMarkup}
      ${safeText ? `<p class="chat-text">${safeText}</p>` : ''}
      <p class="chat-time">${new Date(message.createdAt).toLocaleTimeString()} ${pendingTag} ${failedTag}</p>
    </article>
  `;
}

function updateMessageNode(node, message) {
  if (!node) {
    return null;
  }

  const wrapper = document.createElement('div');
  wrapper.innerHTML = buildMessageMarkup(message).trim();
  const nextNode = wrapper.firstElementChild;

  if (!nextNode) {
    return null;
  }

  node.replaceWith(nextNode);
  return nextNode;
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
      const existingNode = chatMessageNodes.get(key);
      if (existingNode) {
        const nextNode = updateMessageNode(existingNode, updated);
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

  let appended = 0;
  sorted.forEach((item) => {
    const didAppend = appendMessage(item, { scroll: false });
    if (didAppend) {
      appended += 1;
    }
  });

  if (appended > 0 || options.forceScroll) {
    scrollChatToBottom(Boolean(options.smoothScroll));
  }
}

function syncChatAvailability() {
  const status = normalizeStatus(activeOrder?.status);
  const closed = ['RELEASED', 'CANCELLED', 'EXPIRED'].includes(status);

  if (chatInput) {
    chatInput.disabled = closed;
  }
  if (chatSendBtn) {
    chatSendBtn.disabled = closed || chatUploading;
  }
  if (chatImageBtn) {
    chatImageBtn.disabled = closed || chatUploading;
  }

  if (closed && chatState) {
    chatState.textContent = `Chat closed (${statusLabel(status)})`;
  }
}

function setStatusBadge(status) {
  if (!statusBadge) {
    return;
  }

  statusBadge.className = `status-badge ${statusClass(status)}`;
  statusBadge.textContent = statusLabel(status);
}

function getRoleForOrder(order) {
  if (!order || !currentUser) {
    return '';
  }

  const currentId = String(currentUser.id || '').trim();
  const buyerId = String(order.buyerUserId || '').trim();
  const sellerId = String(order.sellerUserId || '').trim();
  const currentUsername = String(currentUser.username || '')
    .trim()
    .toLowerCase();
  const buyerUsername = String(order.buyerUsername || '')
    .trim()
    .toLowerCase();
  const sellerUsername = String(order.sellerUsername || '')
    .trim()
    .toLowerCase();

  if (currentId && buyerId && currentId === buyerId) {
    return 'buyer';
  }

  if (currentId && sellerId && currentId === sellerId) {
    return 'seller';
  }

  if (currentUsername && buyerUsername && currentUsername === buyerUsername) {
    return 'buyer';
  }

  if (currentUsername && sellerUsername && currentUsername === sellerUsername) {
    return 'seller';
  }

  return '';
}

function updateOrderUi(order) {
  if (!order) {
    return;
  }

  activeOrder = order;
  activeRole = getRoleForOrder(order);

  const counterparty =
    activeRole === 'buyer'
      ? order.sellerUsername || order.advertiser || 'Seller'
      : order.buyerUsername || 'Buyer';

  if (counterpartyName) {
    counterpartyName.textContent = counterparty;
  }

  setStatusBadge(order.status);

  if (detailAmount) {
    detailAmount.textContent = `₹${formatNumber(order.amountInr)}`;
  }
  if (detailPrice) {
    detailPrice.textContent = `₹${formatNumber(order.price)} / ${order.asset}`;
  }
  if (detailQty) {
    detailQty.textContent = `${formatNumber(order.assetAmount)} ${order.asset}`;
  }
  if (detailFee) {
    detailFee.textContent = `₹${formatNumber(order.fee || 0)}`;
  }
  if (detailPayment) {
    detailPayment.textContent = order.paymentMethod || '--';
  }
  if (detailRef) {
    detailRef.textContent = order.reference || '--';
  }
  if (detailTime) {
    detailTime.textContent = formatDateTime(order.createdAt);
  }

  remainingSeconds = Number(order.remainingSeconds || 0);
  if (orderTimer) {
    orderTimer.textContent = formatTimer(remainingSeconds);
  }

  syncChatAvailability();
}

function setImagePreviewOpen(open, src = '') {
  if (!imagePreviewModal || !imagePreviewEl) {
    return;
  }

  if (open) {
    const safeSrc = sanitizeImageUrl(src);
    if (!safeSrc) {
      return;
    }
    imagePreviewEl.src = safeSrc;
    imagePreviewModal.classList.remove('hidden');
    imagePreviewModal.setAttribute('aria-hidden', 'false');
  } else {
    imagePreviewEl.src = '';
    imagePreviewModal.classList.add('hidden');
    imagePreviewModal.setAttribute('aria-hidden', 'true');
  }
}

function stopTimersAndStream() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
  if (messagesPollInterval) {
    clearInterval(messagesPollInterval);
    messagesPollInterval = null;
  }
  if (orderPollInterval) {
    clearInterval(orderPollInterval);
    orderPollInterval = null;
  }
  if (orderStream) {
    orderStream.close();
    orderStream = null;
  }
}

async function loadCurrentUser() {
  const response = await fetch('/api/p2p/me');
  const payload = await response.json();

  if (!response.ok || !payload.loggedIn || !payload.user) {
    throw new Error(payload.message || 'Login required to access order chat.');
  }

  currentUser = payload.user;
}

async function fetchOrder() {
  const response = await fetch(`/api/p2p/orders/${encodeURIComponent(orderId)}`);
  const payload = await response.json();

  if (!response.ok || !payload.order) {
    throw new Error(payload.message || 'Unable to load order.');
  }

  updateOrderUi(payload.order);
}

async function fetchMessages(options = {}) {
  if (!orderId) {
    return;
  }

  const response = await fetch(`/api/p2p/orders/${encodeURIComponent(orderId)}/messages`);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.message || 'Unable to load messages.');
  }

  renderMessages(payload.messages, options);
  if (chatState) {
    chatState.textContent = `Messages: ${Array.isArray(payload.messages) ? payload.messages.length : 0}`;
  }
}

async function postChatPayload(textPayload) {
  const response = await fetch(`/api/p2p/orders/${encodeURIComponent(orderId)}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ text: textPayload })
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message || 'Message failed.');
  }

  return payload.messages;
}

async function sendTextMessage(event) {
  event.preventDefault();

  if (!orderId || !chatInput || chatUploading) {
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
    messageType: 'text',
    text,
    imageUrl: '',
    clientId,
    createdAt,
    pending: true,
    failed: false
  };

  appendMessage(optimisticMessage, { scroll: true, smooth: true, optimistic: true });
  chatInput.value = '';
  if (chatState) {
    chatState.textContent = 'Sending...';
  }

  const encodedPayload = encodeChatPayload({
    messageType: 'text',
    text,
    clientId,
    createdAt
  });

  try {
    const messages = await postChatPayload(encodedPayload);
    renderMessages(messages, { smoothScroll: true, forceScroll: true });
    if (chatState) {
      chatState.textContent = 'Message delivered';
    }
  } catch (error) {
    const key = messageKeyFromMessage(optimisticMessage);
    const existing = chatMessageMap.get(key);
    if (existing) {
      existing.pending = false;
      existing.failed = true;
      chatMessageMap.set(key, existing);
      const node = chatMessageNodes.get(key);
      if (node) {
        updateMessageNode(node, existing);
      }
    }
    if (chatState) {
      chatState.textContent = error.message;
    }
  }
}

async function sendImageMessageFromFile(file) {
  if (!file || !orderId || chatUploading) {
    return;
  }

  const mimeType = String(file.type || '').toLowerCase();
  if (!CHAT_IMAGE_ALLOWED_TYPES.includes(mimeType)) {
    if (chatState) {
      chatState.textContent = 'Only JPG, JPEG, PNG, or WEBP images are allowed.';
    }
    return;
  }

  if (file.size > CHAT_IMAGE_MAX_SIZE) {
    if (chatState) {
      chatState.textContent = 'Image size must be 3MB or less.';
    }
    return;
  }

  let compressedImage = '';
  try {
    setChatUploading(true, 'Compressing image...');
    compressedImage = await compressImageForChat(file);
  } catch (error) {
    setChatUploading(false);
    if (chatState) {
      chatState.textContent = error.message || 'Failed to process image.';
    }
    return;
  }

  const clientId = generateClientId();
  const createdAt = new Date().toISOString();

  const optimisticMessage = {
    id: '',
    sender: currentUser?.username || 'You',
    messageType: 'image',
    text: 'Payment screenshot',
    imageUrl: compressedImage,
    clientId,
    createdAt,
    pending: true,
    failed: false
  };

  appendMessage(optimisticMessage, { scroll: true, smooth: true, optimistic: true });

  const encodedPayload = encodeChatPayload({
    messageType: 'image',
    text: 'Payment screenshot',
    imageUrl: compressedImage,
    clientId,
    createdAt
  });

  if (chatState) {
    chatState.textContent = 'Uploading image...';
  }

  try {
    const messages = await postChatPayload(encodedPayload);
    renderMessages(messages, { smoothScroll: true, forceScroll: true });
    if (chatState) {
      chatState.textContent = 'Image sent';
    }
  } catch (error) {
    const key = messageKeyFromMessage(optimisticMessage);
    const existing = chatMessageMap.get(key);
    if (existing) {
      existing.pending = false;
      existing.failed = true;
      chatMessageMap.set(key, existing);
      const node = chatMessageNodes.get(key);
      if (node) {
        updateMessageNode(node, existing);
      }
    }
    if (chatState) {
      chatState.textContent = error.message;
    }
  } finally {
    setChatUploading(false);
    if (chatImageInput) {
      chatImageInput.value = '';
    }
  }
}

function startRealtimeUpdates() {
  stopTimersAndStream();

  countdownInterval = setInterval(() => {
    remainingSeconds = Math.max(0, remainingSeconds - 1);
    if (orderTimer) {
      orderTimer.textContent = formatTimer(remainingSeconds);
    }
  }, 1000);

  messagesPollInterval = setInterval(async () => {
    try {
      await fetchMessages({ smoothScroll: true });
    } catch (error) {
      if (chatState && !String(chatState.textContent || '').includes('closed')) {
        chatState.textContent = error.message;
      }
    }
  }, 3000);

  orderPollInterval = setInterval(async () => {
    try {
      await fetchOrder();
    } catch (error) {
      if (chatState) {
        chatState.textContent = error.message;
      }
    }
  }, 7000);

  orderStream = new EventSource(`/api/p2p/orders/${encodeURIComponent(orderId)}/stream`);
  orderStream.addEventListener('order_update', (event) => {
    try {
      const payload = JSON.parse(event.data || '{}');
      if (payload.order) {
        updateOrderUi(payload.order);
      }
    } catch (error) {
      // no-op
    }
  });

  orderStream.addEventListener('message_update', (event) => {
    try {
      const payload = JSON.parse(event.data || '{}');
      if (Array.isArray(payload.messages)) {
        renderMessages(payload.messages, { smoothScroll: true });
        if (chatState) {
          chatState.textContent = `Messages: ${payload.messages.length}`;
        }
      }
    } catch (error) {
      // no-op
    }
  });
}

function bindEvents() {
  backBtn?.addEventListener('click', () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    window.location.href = '/p2p';
  });

  refreshBtn?.addEventListener('click', async () => {
    if (chatState) {
      chatState.textContent = 'Refreshing...';
    }
    try {
      await fetchOrder();
      await fetchMessages({ smoothScroll: false, forceScroll: true });
    } catch (error) {
      if (chatState) {
        chatState.textContent = error.message;
      }
    }
  });

  chatForm?.addEventListener('submit', sendTextMessage);

  chatImageBtn?.addEventListener('click', () => {
    if (chatUploading || !orderId) {
      return;
    }
    chatImageInput?.click();
  });

  chatImageInput?.addEventListener('change', async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) {
      return;
    }
    await sendImageMessageFromFile(file);
  });

  chatMessages?.addEventListener('click', (event) => {
    const previewButton = event.target.closest('.chat-image-link');
    if (!previewButton) {
      return;
    }

    const previewSource = sanitizeImageUrl(previewButton.getAttribute('data-preview-src') || '');
    if (previewSource) {
      setImagePreviewOpen(true, previewSource);
    }
  });

  imagePreviewBackdrop?.addEventListener('click', () => setImagePreviewOpen(false));
  imagePreviewCloseBtn?.addEventListener('click', () => setImagePreviewOpen(false));

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      setImagePreviewOpen(false);
    }
  });

  window.addEventListener('beforeunload', () => {
    stopTimersAndStream();
  });
}

async function init() {
  bindEvents();

  if (!orderId) {
    if (chatState) {
      chatState.textContent = 'Missing order ID. Open chat from a valid order.';
    }
    if (chatInput) {
      chatInput.disabled = true;
    }
    if (chatSendBtn) {
      chatSendBtn.disabled = true;
    }
    if (chatImageBtn) {
      chatImageBtn.disabled = true;
    }
    return;
  }

  try {
    await loadCurrentUser();
    resetMessages();
    await fetchOrder();
    await fetchMessages({ forceScroll: true });
    startRealtimeUpdates();
  } catch (error) {
    if (chatState) {
      chatState.textContent = error.message;
    }

    if (chatInput) {
      chatInput.disabled = true;
    }
    if (chatSendBtn) {
      chatSendBtn.disabled = true;
    }
    if (chatImageBtn) {
      chatImageBtn.disabled = true;
    }

    setTimeout(() => {
      window.location.href = '/p2p#p2pLoginCard';
    }, 1200);
  }
}

init();
