const BITEGIT_API = (window.BITEGIT_API_BASE || 'http://localhost:3000/api/v1');

const assetsStatus = document.getElementById('assetsStatus');
const assetsActionMessage = document.getElementById('assetsActionMessage');

const totalBalanceEl = document.getElementById('assetsTotalBalance');
const spotBalanceEl = document.getElementById('assetsSpotBalance');
const fundingBalanceEl = document.getElementById('assetsFundingBalance');
const spotInlineEl = document.getElementById('assetsSpotInline');
const fundingInlineEl = document.getElementById('assetsFundingInline');

const tabs = Array.from(document.querySelectorAll('[data-assets-tab]'));
const panels = Array.from(document.querySelectorAll('[data-assets-panel]'));

const depositBtn = document.getElementById('assetsDepositBtn');
const withdrawBtn = document.getElementById('assetsWithdrawBtn');
const transferBtn = document.getElementById('assetsTransferBtn');

const depositModal = document.getElementById('depositModal');
const withdrawModal = document.getElementById('withdrawModal');
const depositNetworkSelect = document.getElementById('assetsDepositNetwork');
const depositAddressValueEl = document.getElementById('assetsDepositAddressValue');
const depositNetworkWarningEl = document.getElementById('assetsDepositNetworkWarning');
const depositConfirmationsEl = document.getElementById('assetsDepositConfirmations');
const depositQrImageEl = document.getElementById('assetsDepositQrImage');
const depositQrMetaEl = document.getElementById('assetsDepositQrMeta');
const depositCopyBtn = document.getElementById('assetsDepositCopyBtn');

const withdrawNetworkSelect = document.getElementById('assetsWithdrawNetwork');
const withdrawForm = document.getElementById('assetsWithdrawForm');
const withdrawAddressInput = document.getElementById('assetsWithdrawAddress');
const withdrawScanBtn = document.getElementById('assetsWithdrawScanBtn');
const withdrawScannerEl = document.getElementById('assetsWithdrawScanner');
const withdrawScannerVideoEl = document.getElementById('assetsWithdrawScannerVideo');
const withdrawScannerHintEl = document.getElementById('assetsWithdrawScannerHint');
const withdrawScannerCloseBtn = document.getElementById('assetsWithdrawScannerCloseBtn');
const withdrawAmountInput = document.getElementById('assetsWithdrawAmount');
const withdrawResultEl = document.getElementById('assetsWithdrawResult');
const withdrawSubmitBtn = document.getElementById('assetsWithdrawSubmitBtn');

const WALLET_ENDPOINTS = [BITEGIT_API + '/wallet/balances', BITEGIT_API + '/wallet/balances', BITEGIT_API + '/wallet/balances'];
const WITHDRAW_ENDPOINTS = [
  {
    url: BITEGIT_API + '/wallet/withdraw',
    buildBody: (amount, address, network) => ({
      amount,
      currency: 'USDT',
      address,
      network
    })
  }
];

const SUPPORTED_USDT_NETWORKS = ['TRC20', 'ERC20', 'BEP20'];

const state = {
  activeTab: 'overview',
  loading: false,
  walletApiEndpoint: '',
  depositConfig: {
    defaultNetwork: 'TRC20',
    networks: []
  },
  selectedDepositNetwork: 'TRC20',
  selectedWithdrawNetwork: 'TRC20',
  balances: {
    total: 0,
    spot: 0,
    funding: 0
  },
  scanner: {
    active: false,
    stream: null,
    frameId: null
  }
};

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function pickString(...candidates) {
  for (const candidate of candidates) {
    if (hasValue(candidate)) {
      return String(candidate).trim();
    }
  }
  return '';
}

function pickNumber(...candidates) {
  for (const candidate of candidates) {
    const parsed = Number(candidate);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return 0;
}

function normalizeNetwork(network) {
  const normalized = String(network || '')
    .trim()
    .toUpperCase();
  if (SUPPORTED_USDT_NETWORKS.includes(normalized)) {
    return normalized;
  }
  return '';
}

function normalizeNetworkAddress(address) {
  const normalized = String(address || '').trim();
  if (!normalized) {
    return '';
  }
  if (normalized.length < 6 || normalized.length > 256) {
    return '';
  }
  return normalized;
}

function normalizeDepositNetworks(rawNetworks = []) {
  const source = Array.isArray(rawNetworks) ? rawNetworks : [];
  const result = [];

  for (const candidate of source) {
    const network = normalizeNetwork(candidate?.network || candidate?.chain || candidate?.name || candidate);
    if (!network) {
      continue;
    }

    const address = normalizeNetworkAddress(candidate?.address);
    const confirmations = Math.max(1, Number.parseInt(String(candidate?.minConfirmations || candidate?.confirmations || 1), 10) || 1);
    const enabled = candidate?.enabled !== undefined ? Boolean(candidate.enabled) : Boolean(address);

    if (!result.some((item) => item.network === network)) {
      result.push({
        network,
        address,
        minConfirmations: confirmations,
        enabled
      });
    }
  }

  for (const network of SUPPORTED_USDT_NETWORKS) {
    if (!result.some((item) => item.network === network)) {
      result.push({
        network,
        address: '',
        minConfirmations: network === 'TRC20' ? 20 : network === 'ERC20' ? 12 : 15,
        enabled: false
      });
    }
  }

  return result;
}

function findNetworkConfig(network) {
  const normalizedNetwork = normalizeNetwork(network) || state.depositConfig.defaultNetwork || 'TRC20';
  const networks = Array.isArray(state.depositConfig.networks) ? state.depositConfig.networks : [];
  return (
    networks.find((item) => item.network === normalizedNetwork) || {
      network: normalizedNetwork,
      address: '',
      minConfirmations: 1,
      enabled: false
    }
  );
}

function getCurrentDepositNetworkConfig() {
  return findNetworkConfig(state.selectedDepositNetwork);
}

function getCurrentWithdrawNetwork() {
  return normalizeNetwork(state.selectedWithdrawNetwork) || state.depositConfig.defaultNetwork || 'TRC20';
}

function buildQrUrl(payload) {
  const text = String(payload || '').trim();
  if (!text) {
    return '';
  }
  return `https://quickchart.io/qr?size=240&margin=1&text=${encodeURIComponent(text)}`;
}

function formatUsdt(value) {
  return `${toNumber(value).toFixed(2)} USDT`;
}

function setStatus(text, type = '') {
  if (!assetsStatus) {
    return;
  }

  assetsStatus.textContent = text;
  assetsStatus.className = 'assets-status';
  if (type) {
    assetsStatus.classList.add(type);
  }
}

function setActionMessage(text = '') {
  if (!assetsActionMessage) {
    return;
  }
  assetsActionMessage.textContent = text;
}

function setWithdrawResult(text = '', type = '') {
  if (!withdrawResultEl) {
    return;
  }
  withdrawResultEl.textContent = text;
  withdrawResultEl.className = 'assets-summary-line';
  if (type) {
    withdrawResultEl.classList.add(type);
  }
}

function normalizeWalletPayload(payload) {
  const root = payload?.data && typeof payload.data === 'object' ? payload.data : payload || {};
  const wallet = root?.wallet && typeof root.wallet === 'object' ? root.wallet : {};
  const summary = root?.summary && typeof root.summary === 'object' ? root.summary : root;
  const depositConfigRoot = root?.depositConfig && typeof root.depositConfig === 'object' ? root.depositConfig : {};

  const available = pickNumber(
    summary.available_balance,
    summary.availableBalance,
    summary.spot_balance,
    summary.spotBalance,
    wallet.available_balance,
    wallet.availableBalance,
    wallet.balance
  );

  const locked = pickNumber(
    summary.locked_balance,
    summary.lockedBalance,
    wallet.locked_balance,
    wallet.lockedBalance,
    wallet.p2pLocked
  );

  const total = pickNumber(
    summary.total_balance,
    summary.totalBalance,
    summary.total,
    wallet.total_balance,
    wallet.totalBalance,
    available + locked
  );

  const spot = pickNumber(
    summary.spot_balance,
    summary.spotBalance,
    summary.spot,
    available
  );

  const funding = pickNumber(
    summary.funding_balance,
    summary.fundingBalance,
    summary.funding,
    wallet.funding_balance,
    wallet.fundingBalance,
    available
  );

  const defaultNetwork = normalizeNetwork(
    pickString(
      depositConfigRoot.defaultNetwork,
      summary.deposit_network,
      summary.depositNetwork,
      wallet.deposit_network,
      wallet.depositNetwork,
      'TRC20'
    )
  ) || 'TRC20';

  const networksPayload =
    depositConfigRoot.networks ||
    summary.deposit_networks ||
    summary.depositNetworks ||
    wallet.deposit_networks ||
    wallet.depositNetworks ||
    payload?.deposit_networks ||
    payload?.depositNetworks ||
    [];

  const normalizedNetworks = normalizeDepositNetworks(networksPayload);

  const legacyAddress = normalizeNetworkAddress(
    pickString(
      depositConfigRoot.depositAddress,
      summary.deposit_address,
      summary.depositAddress,
      wallet.deposit_address,
      wallet.depositAddress,
      payload?.deposit_address,
      payload?.depositAddress
    )
  );

  if (legacyAddress) {
    const match = normalizedNetworks.find((item) => item.network === defaultNetwork);
    if (match && !match.address) {
      match.address = legacyAddress;
      match.enabled = true;
    }
  }

  return {
    balances: {
      total: toNumber(total),
      spot: toNumber(spot),
      funding: toNumber(funding)
    },
    depositConfig: {
      defaultNetwork,
      networks: normalizedNetworks
    }
  };
}

function renderDepositAddress() {
  if (!depositAddressValueEl) {
    return;
  }
  const current = getCurrentDepositNetworkConfig();
  const hasAddress = Boolean(current.address);

  depositAddressValueEl.textContent = hasAddress ? current.address : 'Admin will provide deposit address shortly.';
  if (depositCopyBtn) {
    depositCopyBtn.disabled = !hasAddress;
  }

  if (depositNetworkWarningEl) {
    depositNetworkWarningEl.textContent = `Send only USDT on ${current.network} network to this address.`;
  }
  if (depositConfirmationsEl) {
    depositConfirmationsEl.textContent = `Required confirmations: ${current.minConfirmations}`;
  }

  if (depositQrImageEl) {
    const qrPayload = hasAddress ? `${current.address}` : '';
    const qrUrl = buildQrUrl(qrPayload);
    depositQrImageEl.src = qrUrl || 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
    depositQrImageEl.style.opacity = hasAddress ? '1' : '0.45';
  }
  if (depositQrMetaEl) {
    depositQrMetaEl.textContent = hasAddress
      ? `Scan QR in your wallet app (${current.network})`
      : 'QR will appear after address is configured.';
  }
}

function renderBalances() {
  if (totalBalanceEl) {
    totalBalanceEl.textContent = formatUsdt(state.balances.total);
  }
  if (spotBalanceEl) {
    spotBalanceEl.textContent = formatUsdt(state.balances.spot);
  }
  if (fundingBalanceEl) {
    fundingBalanceEl.textContent = formatUsdt(state.balances.funding);
  }
  if (spotInlineEl) {
    spotInlineEl.textContent = formatUsdt(state.balances.spot);
  }
  if (fundingInlineEl) {
    fundingInlineEl.textContent = formatUsdt(state.balances.funding);
  }
  renderDepositAddress();
}

function renderWithdrawNetworkUi() {
  const network = getCurrentWithdrawNetwork();
  if (withdrawNetworkSelect) {
    withdrawNetworkSelect.value = network;
  }
  if (withdrawAddressInput) {
    withdrawAddressInput.placeholder = network === 'TRC20' ? 'T...' : '0x...';
  }
}

function setActiveTab(tab) {
  const resolved = ['overview', 'spot', 'funding'].includes(tab) ? tab : 'overview';
  state.activeTab = resolved;

  tabs.forEach((tabButton) => {
    const isActive = tabButton.getAttribute('data-assets-tab') === resolved;
    tabButton.classList.toggle('active', isActive);
    tabButton.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });

  panels.forEach((panel) => {
    const panelKey = panel.getAttribute('data-assets-panel');
    panel.classList.toggle('hidden', panelKey !== resolved);
  });
}

function modalIsOpen(modal) {
  return Boolean(modal) && !modal.classList.contains('hidden');
}

function syncBodyInteractionState() {
  const hasOpenModal = modalIsOpen(depositModal) || modalIsOpen(withdrawModal);
  document.body.style.overflow = hasOpenModal ? 'hidden' : 'auto';
  document.body.style.pointerEvents = 'auto';
}

function setModalOpen(modal, open) {
  if (!modal) {
    return;
  }

  const shouldOpen = Boolean(open);
  modal.classList.toggle('hidden', !shouldOpen);
  modal.setAttribute('aria-hidden', shouldOpen ? 'false' : 'true');
  syncBodyInteractionState();
}

function closeAllModals() {
  stopWithdrawScanner();
  setModalOpen(depositModal, false);
  setModalOpen(withdrawModal, false);
  document.body.style.overflow = 'auto';
}

async function requestJson(url, options = {}) {
  const token = localStorage.getItem('bitegit_token') || '';
  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': 'Bearer ' + token } : {}),
      ...(options.headers || {})
    },
    ...options
  });

  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

async function loadWalletSummary() {
  if (state.loading) {
    return;
  }

  state.loading = true;
  setStatus('Loading balances...');

  try {
    let loaded = false;
    let fallbackErrorMessage = 'Wallet API not available.';

    for (const endpoint of WALLET_ENDPOINTS) {
      const { response, payload } = await requestJson(endpoint, { method: 'GET' });

      if (response.status === 404) {
        continue;
      }

      if (response.status === 401 || response.status === 403) {
        throw new Error('Please login to view wallet balances.');
      }

      if (!response.ok) {
        const serverMessage = String(payload?.message || '').trim();
        fallbackErrorMessage = serverMessage || `Unable to load wallet (${response.status})`;
        continue;
      }

      const normalized = normalizeWalletPayload(payload);
      state.walletApiEndpoint = endpoint;
      state.balances = normalized.balances;
      state.depositConfig = normalized.depositConfig;
      state.selectedDepositNetwork =
        normalizeNetwork(state.selectedDepositNetwork) ||
        normalized.depositConfig.defaultNetwork ||
        'TRC20';
      state.selectedWithdrawNetwork =
        normalizeNetwork(state.selectedWithdrawNetwork) ||
        normalized.depositConfig.defaultNetwork ||
        'TRC20';
      loaded = true;
      break;
    }

    if (!loaded) {
      throw new Error(fallbackErrorMessage);
    }

    renderBalances();
    if (depositNetworkSelect) {
      depositNetworkSelect.value = state.selectedDepositNetwork;
    }
    renderWithdrawNetworkUi();
    setStatus('Balances synced.');
  } catch (error) {
    console.error(error);
    const message = String(error?.message || 'Failed to load balances.');
    if (/route[_\s-]*not[_\s-]*found|api route not found|not found/i.test(message)) {
      setStatus('Wallet API route is not available yet.', 'error');
    } else {
      setStatus(message, 'error');
    }
  } finally {
    state.loading = false;
  }
}

async function requestWithdrawal(amount, address, network) {
  let fallbackError = 'Unable to submit withdrawal request.';

  for (const endpoint of WITHDRAW_ENDPOINTS) {
    const { response, payload } = await requestJson(endpoint.url, {
      method: 'POST',
      body: JSON.stringify(endpoint.buildBody(amount, address, network))
    });

    if (response.status === 404) {
      continue;
    }

    if (response.status === 401 || response.status === 403) {
      throw new Error('Please login to submit withdrawal.');
    }

    if (!response.ok) {
      fallbackError = String(payload?.message || fallbackError);
      continue;
    }

    return payload;
  }

  throw new Error(fallbackError);
}

function isValidAddressForNetwork(address, network) {
  const normalizedAddress = String(address || '').trim();
  const normalizedNetwork = normalizeNetwork(network) || 'TRC20';
  if (normalizedNetwork === 'TRC20') {
    return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(normalizedAddress);
  }
  return /^0x[a-fA-F0-9]{40}$/.test(normalizedAddress);
}

async function handleWithdrawSubmit(event) {
  event.preventDefault();

  const address = String(withdrawAddressInput?.value || '').trim();
  const amount = toNumber(withdrawAmountInput?.value);
  const network = getCurrentWithdrawNetwork();

  if (!isValidAddressForNetwork(address, network)) {
    setWithdrawResult(`Enter a valid ${network} address.`, 'error');
    return;
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    setWithdrawResult('Enter a valid withdrawal amount.', 'error');
    return;
  }

  if (withdrawSubmitBtn) {
    withdrawSubmitBtn.disabled = true;
    withdrawSubmitBtn.textContent = 'Submitting...';
  }
  setWithdrawResult('');

  try {
    await requestWithdrawal(amount, address, network);
    setWithdrawResult('Withdrawal request submitted successfully.', 'success');
    if (withdrawForm) {
      withdrawForm.reset();
    }
    await loadWalletSummary();
  } catch (error) {
    console.error(error);
    setWithdrawResult(String(error?.message || 'Withdrawal request failed.'), 'error');
  } finally {
    if (withdrawSubmitBtn) {
      withdrawSubmitBtn.disabled = false;
      withdrawSubmitBtn.textContent = 'Submit Withdrawal';
    }
  }
}

function extractAddressFromQrPayload(rawValue) {
  const raw = String(rawValue || '').trim();
  if (!raw) {
    return '';
  }

  let parsed = raw;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(parsed)) {
    const withoutScheme = parsed.split(':').slice(1).join(':');
    parsed = withoutScheme || parsed;
  }

  parsed = parsed.replace(/^\/\//, '');
  if (parsed.includes('?')) {
    parsed = parsed.split('?')[0];
  }
  if (parsed.includes('@')) {
    parsed = parsed.split('@')[0];
  }

  return String(parsed || raw).trim();
}

function stopWithdrawScanner() {
  if (state.scanner.frameId) {
    cancelAnimationFrame(state.scanner.frameId);
    state.scanner.frameId = null;
  }

  if (state.scanner.stream) {
    for (const track of state.scanner.stream.getTracks()) {
      track.stop();
    }
    state.scanner.stream = null;
  }

  state.scanner.active = false;
  if (withdrawScannerVideoEl) {
    withdrawScannerVideoEl.srcObject = null;
  }
  if (withdrawScannerEl) {
    withdrawScannerEl.classList.add('hidden');
    withdrawScannerEl.setAttribute('aria-hidden', 'true');
  }
}

async function startWithdrawScanner() {
  if (!withdrawScannerEl || !withdrawScannerVideoEl) {
    return;
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    setWithdrawResult('Camera scan is not supported on this browser.', 'error');
    return;
  }

  if (typeof window.BarcodeDetector !== 'function') {
    const manualValue = window.prompt('QR scan not supported. Paste wallet address:', '') || '';
    if (manualValue) {
      withdrawAddressInput.value = manualValue.trim();
      setWithdrawResult('Address pasted from manual input.', 'success');
    }
    return;
  }

  stopWithdrawScanner();

  try {
    const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false
    });

    state.scanner.active = true;
    state.scanner.stream = stream;
    withdrawScannerVideoEl.srcObject = stream;
    await withdrawScannerVideoEl.play().catch(() => {});

    withdrawScannerEl.classList.remove('hidden');
    withdrawScannerEl.setAttribute('aria-hidden', 'false');
    if (withdrawScannerHintEl) {
      withdrawScannerHintEl.textContent = 'Point camera to address QR code.';
    }

    const scanFrame = async () => {
      if (!state.scanner.active || !withdrawScannerVideoEl) {
        return;
      }

      try {
        if (withdrawScannerVideoEl.readyState >= 2) {
          const barcodes = await detector.detect(withdrawScannerVideoEl);
          if (Array.isArray(barcodes) && barcodes.length > 0) {
            const rawValue = String(barcodes[0]?.rawValue || '').trim();
            const extracted = extractAddressFromQrPayload(rawValue);
            if (extracted) {
              withdrawAddressInput.value = extracted;
              setWithdrawResult('QR scanned. Verify network and address before submitting.', 'success');
              stopWithdrawScanner();
              return;
            }
          }
        }
      } catch (_) {
        // Ignore frame decode errors, continue scanning.
      }

      state.scanner.frameId = requestAnimationFrame(scanFrame);
    };

    state.scanner.frameId = requestAnimationFrame(scanFrame);
  } catch (error) {
    stopWithdrawScanner();
    setWithdrawResult('Unable to access camera for scanning.', 'error');
  }
}

function bindEvents() {
  tabs.forEach((tabButton) => {
    tabButton.addEventListener('click', () => {
      setActiveTab(tabButton.getAttribute('data-assets-tab'));
    });
  });

  depositBtn?.addEventListener('click', () => {
    setActionMessage('');
    renderDepositAddress();
    setModalOpen(depositModal, true);
  });

  withdrawBtn?.addEventListener('click', () => {
    setActionMessage('');
    setWithdrawResult('');
    renderWithdrawNetworkUi();
    setModalOpen(withdrawModal, true);
  });

  transferBtn?.addEventListener('click', () => {
    setActionMessage('Transfer flow will be enabled in next release.');
  });

  document.querySelectorAll('[data-modal-close]').forEach((node) => {
    node.addEventListener('click', () => {
      const modalId = node.getAttribute('data-modal-close');
      if (modalId === 'depositModal') {
        setModalOpen(depositModal, false);
      } else if (modalId === 'withdrawModal') {
        stopWithdrawScanner();
        setModalOpen(withdrawModal, false);
      }
    });
  });

  depositNetworkSelect?.addEventListener('change', () => {
    state.selectedDepositNetwork = normalizeNetwork(depositNetworkSelect.value) || state.depositConfig.defaultNetwork || 'TRC20';
    renderDepositAddress();
  });

  withdrawNetworkSelect?.addEventListener('change', () => {
    state.selectedWithdrawNetwork = normalizeNetwork(withdrawNetworkSelect.value) || state.depositConfig.defaultNetwork || 'TRC20';
    renderWithdrawNetworkUi();
    setWithdrawResult('');
  });

  depositCopyBtn?.addEventListener('click', async () => {
    const current = getCurrentDepositNetworkConfig();
    if (!current.address) {
      return;
    }

    try {
      await navigator.clipboard.writeText(current.address);
      setActionMessage('Deposit address copied.');
    } catch (_) {
      setActionMessage('Unable to copy address on this device.');
    }
  });

  withdrawScanBtn?.addEventListener('click', async () => {
    await startWithdrawScanner();
  });
  withdrawScannerCloseBtn?.addEventListener('click', () => {
    stopWithdrawScanner();
  });

  withdrawForm?.addEventListener('submit', handleWithdrawSubmit);

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      stopWithdrawScanner();
      closeAllModals();
    }
  });

  window.addEventListener('pagehide', () => {
    stopWithdrawScanner();
    document.body.style.overflow = 'auto';
    document.body.style.pointerEvents = 'auto';
  });
}

(function initAssetsPage() {
  setActiveTab('overview');
  renderDepositAddress();
  renderBalances();
  renderWithdrawNetworkUi();
  bindEvents();
  loadWalletSummary();
})();
