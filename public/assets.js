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
const depositAddressValueEl = document.getElementById('assetsDepositAddressValue');
const depositCopyBtn = document.getElementById('assetsDepositCopyBtn');
const withdrawForm = document.getElementById('assetsWithdrawForm');
const withdrawAddressInput = document.getElementById('assetsWithdrawAddress');
const withdrawAmountInput = document.getElementById('assetsWithdrawAmount');
const withdrawResultEl = document.getElementById('assetsWithdrawResult');
const withdrawSubmitBtn = document.getElementById('assetsWithdrawSubmitBtn');

const WALLET_ENDPOINTS = ['/api/wallet/summary', '/api/wallet', '/api/p2p/wallet'];
const WITHDRAW_ENDPOINTS = [
  {
    url: '/api/withdrawals',
    buildBody: (amount, address) => ({
      amount,
      currency: 'USDT',
      address
    })
  },
  {
    url: '/api/withdraw/request',
    buildBody: (amount, address) => ({
      amount,
      coin: 'USDT',
      to_address: address
    })
  }
];

const state = {
  activeTab: 'overview',
  loading: false,
  walletApiEndpoint: '',
  depositAddress: '',
  balances: {
    total: 0,
    spot: 0,
    funding: 0
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

  const depositAddress = pickString(
    summary.deposit_address,
    summary.depositAddress,
    wallet.deposit_address,
    wallet.depositAddress,
    payload?.deposit_address,
    payload?.depositAddress
  );

  return {
    balances: {
      total: toNumber(total),
      spot: toNumber(spot),
      funding: toNumber(funding)
    },
    depositAddress
  };
}

function renderDepositAddress() {
  if (!depositAddressValueEl) {
    return;
  }

  if (state.depositAddress) {
    depositAddressValueEl.textContent = state.depositAddress;
    if (depositCopyBtn) {
      depositCopyBtn.disabled = false;
    }
    return;
  }

  depositAddressValueEl.textContent = 'Admin will provide deposit address shortly.';
  if (depositCopyBtn) {
    depositCopyBtn.disabled = true;
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
  setModalOpen(depositModal, false);
  setModalOpen(withdrawModal, false);
  document.body.style.overflow = 'auto';
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
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
      state.depositAddress = normalized.depositAddress || '';
      loaded = true;
      break;
    }

    if (!loaded) {
      throw new Error(fallbackErrorMessage);
    }

    renderBalances();
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

async function requestWithdrawal(amount, address) {
  let fallbackError = 'Unable to submit withdrawal request.';

  for (const endpoint of WITHDRAW_ENDPOINTS) {
    const { response, payload } = await requestJson(endpoint.url, {
      method: 'POST',
      body: JSON.stringify(endpoint.buildBody(amount, address))
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

function isValidTronAddress(address) {
  return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(String(address || '').trim());
}

async function handleWithdrawSubmit(event) {
  event.preventDefault();

  const address = String(withdrawAddressInput?.value || '').trim();
  const amount = toNumber(withdrawAmountInput?.value);

  if (!isValidTronAddress(address)) {
    setWithdrawResult('Enter a valid TRON (TRC20) address.', 'error');
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
    await requestWithdrawal(amount, address);
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

function bindEvents() {
  tabs.forEach((tabButton) => {
    tabButton.addEventListener('click', () => {
      setActiveTab(tabButton.getAttribute('data-assets-tab'));
    });
  });

  depositBtn?.addEventListener('click', () => {
    setActionMessage('');
    setModalOpen(depositModal, true);
  });

  withdrawBtn?.addEventListener('click', () => {
    setActionMessage('');
    setWithdrawResult('');
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
        setModalOpen(withdrawModal, false);
      }
    });
  });

  depositCopyBtn?.addEventListener('click', async () => {
    if (!state.depositAddress) {
      return;
    }

    try {
      await navigator.clipboard.writeText(state.depositAddress);
      setActionMessage('Deposit address copied.');
    } catch (_) {
      setActionMessage('Unable to copy address on this device.');
    }
  });

  withdrawForm?.addEventListener('submit', handleWithdrawSubmit);

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeAllModals();
    }
  });

  window.addEventListener('pagehide', () => {
    document.body.style.overflow = 'auto';
    document.body.style.pointerEvents = 'auto';
  });
}

(function initAssetsPage() {
  setActiveTab('overview');
  renderDepositAddress();
  renderBalances();
  bindEvents();
  loadWalletSummary();
})();
