// ╔══════════════════════════════════════════════════════════════════════════╗
// ║              BITEGIT — Backend API Integration Layer v2                 ║
// ║  Cookie-based auth | Correct routes | Phone + Desktop support           ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// Bitegit backend — uses tunnel URL when accessed remotely
const API_BASE = (window.BITEGIT_API_BASE || 'http://localhost:3000/api/v1');

// ─── State ────────────────────────────────────────────────────────────────────
let currentUser = null;
let isLoggedIn   = false;

// ─── Generic API helper (Bearer token auth) ───────────────────────────────────
async function apiFetch(path, opts) {
  opts = opts || {};
  var token = localStorage.getItem('bitegit_token') || '';
  var headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
  if (token) headers['Authorization'] = 'Bearer ' + token;
  try {
    var res = await fetch(API_BASE + path, Object.assign({}, opts, {
      headers: headers,
      credentials: 'include'
    }));
    var json = await res.json();
    json._status = res.status;
    return json;
  } catch (e) {
    console.warn('[BITEGIT API]', path, e.message);
    return null;
  }
}

// ─── Auth Modal HTML ──────────────────────────────────────────────────────────
document.body.insertAdjacentHTML('beforeend', `
<div id="auth-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.95);z-index:99990;align-items:center;justify-content:center;max-width:430px;margin:0 auto;">
  <div style="background:#0d1117;border:1px solid #2b3139;border-radius:20px;width:92%;max-width:360px;padding:28px 22px;box-shadow:0 20px 60px rgba(0,0,0,.8);">
    <div style="text-align:center;margin-bottom:22px;">
      <div style="font-size:26px;font-weight:900;color:#f0b90b;letter-spacing:-1px;">BITEGIT</div>
      <div id="auth-sub" style="font-size:13px;color:#848e9c;margin-top:5px;">Sign in to your account</div>
    </div>

    <!-- LOGIN VIEW -->
    <div id="auth-login-view">
      <input id="auth-email" type="email" placeholder="Email address" autocomplete="email"
        style="width:100%;background:#1a1a1a;border:1px solid #2b3139;border-radius:10px;padding:13px 14px;color:#fff;font-size:14px;margin-bottom:11px;outline:none;box-sizing:border-box;">
      <input id="auth-pass" type="password" placeholder="Password" autocomplete="current-password"
        style="width:100%;background:#1a1a1a;border:1px solid #2b3139;border-radius:10px;padding:13px 14px;color:#fff;font-size:14px;margin-bottom:16px;outline:none;box-sizing:border-box;">
      <button onclick="doLogin()" id="btn-login"
        style="width:100%;background:#f0b90b;color:#000;border:none;border-radius:10px;padding:14px;font-size:15px;font-weight:800;cursor:pointer;margin-bottom:12px;">
        Sign In
      </button>
      <div style="text-align:center;font-size:13px;color:#848e9c;">
        Don't have an account? <span onclick="showRegView()" style="color:#f0b90b;cursor:pointer;font-weight:600;">Sign Up</span>
      </div>
    </div>

    <!-- REGISTER — step 1: email + name -->
    <div id="auth-reg-view" style="display:none;">
      <div id="auth-reg-step1">
        <input id="reg-email" type="email" placeholder="Email address" autocomplete="email"
          style="width:100%;background:#1a1a1a;border:1px solid #2b3139;border-radius:10px;padding:13px 14px;color:#fff;font-size:14px;margin-bottom:11px;outline:none;box-sizing:border-box;">
        <input id="reg-name" type="text" placeholder="Your full name"
          style="width:100%;background:#1a1a1a;border:1px solid #2b3139;border-radius:10px;padding:13px 14px;color:#fff;font-size:14px;margin-bottom:16px;outline:none;box-sizing:border-box;">
        <button onclick="doSendOtp()" id="btn-send-otp"
          style="width:100%;background:#0ecb81;color:#000;border:none;border-radius:10px;padding:14px;font-size:15px;font-weight:800;cursor:pointer;margin-bottom:12px;">
          Send Verification Code
        </button>
      </div>
      <!-- step 2: OTP + password -->
      <div id="auth-reg-step2" style="display:none;">
        <div style="text-align:center;margin-bottom:14px;font-size:13px;color:#848e9c;">Enter the 6-digit code sent to your email</div>
        <input id="reg-otp" type="number" placeholder="6-digit OTP" maxlength="6"
          style="width:100%;background:#1a1a1a;border:1px solid #2b3139;border-radius:10px;padding:13px 14px;color:#fff;font-size:18px;font-weight:700;letter-spacing:4px;text-align:center;margin-bottom:11px;outline:none;box-sizing:border-box;">
        <button onclick="doVerifyOtp()" id="btn-verify-otp"
          style="width:100%;background:#0ecb81;color:#000;border:none;border-radius:10px;padding:14px;font-size:15px;font-weight:800;cursor:pointer;margin-bottom:12px;">
          Verify &amp; Create Account
        </button>
        <div style="text-align:center;font-size:13px;color:#848e9c;">
          <span onclick="doSendOtp()" style="color:#f0b90b;cursor:pointer;">Resend Code</span>
        </div>
      </div>
      <div style="text-align:center;font-size:13px;color:#848e9c;margin-top:10px;">
        Already have an account? <span onclick="showLoginView()" style="color:#f0b90b;cursor:pointer;font-weight:600;">Sign In</span>
      </div>
    </div>

    <div id="auth-err" style="color:#f6465d;font-size:12px;text-align:center;margin-top:10px;display:none;padding:8px;background:rgba(246,70,93,.1);border-radius:8px;"></div>
    <div style="margin-top:14px;text-align:center;">
      <span onclick="hideAuthModal()" style="color:#848e9c;font-size:12px;cursor:pointer;">✕ Close / Explore without login</span>
    </div>
  </div>
</div>
`);

function showAuthModal() {
  document.getElementById('auth-modal').style.display = 'flex';
  document.getElementById('auth-err').style.display = 'none';
}
function hideAuthModal() {
  document.getElementById('auth-modal').style.display = 'none';
}
function showRegView() {
  document.getElementById('auth-login-view').style.display = 'none';
  document.getElementById('auth-reg-view').style.display = 'block';
  document.getElementById('auth-sub').textContent = 'Create your BITEGIT account';
  document.getElementById('auth-err').style.display = 'none';
}
function showLoginView() {
  document.getElementById('auth-reg-view').style.display = 'none';
  document.getElementById('auth-login-view').style.display = 'block';
  document.getElementById('auth-sub').textContent = 'Sign in to your account';
  document.getElementById('auth-err').style.display = 'none';
}
function showAuthErr(msg) {
  var e = document.getElementById('auth-err');
  e.textContent = msg;
  e.style.display = 'block';
}

// Enter key support
['auth-email','auth-pass'].forEach(function(id) {
  var el = document.getElementById(id);
  if (el) el.addEventListener('keydown', function(e) { if (e.key === 'Enter') doLogin(); });
});

// ─── LOGIN ────────────────────────────────────────────────────────────────────
async function doLogin() {
  var email    = (document.getElementById('auth-email').value || '').trim();
  var password = (document.getElementById('auth-pass').value  || '').trim();
  if (!email || !password) { showAuthErr('Please fill in all fields'); return; }
  var btn = document.getElementById('btn-login');
  btn.textContent = 'Signing in…'; btn.disabled = true;

  var data = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  btn.textContent = 'Sign In'; btn.disabled = false;

  if (data && data.user) {
    if (data.accessToken) localStorage.setItem('bitegit_token', data.accessToken);
    if (data.refreshToken) localStorage.setItem('bitegit_refresh_token', data.refreshToken);
    currentUser = data.user;
    isLoggedIn  = true;
    hideAuthModal();
    toast('✅ Welcome back, ' + (currentUser.username || currentUser.email.split('@')[0]) + '!');
    afterLogin();
  } else {
    showAuthErr((data && data.message) || 'Invalid email or password');
  }
}

// ─── REGISTER STEP 1 — send OTP ───────────────────────────────────────────────
async function doSendOtp() {
  var email = (document.getElementById('reg-email').value || '').trim();
  var name  = (document.getElementById('reg-name').value  || '').trim();
  if (!email || !name) { showAuthErr('Email and name are required'); return; }
  var btn = document.getElementById('btn-send-otp');
  btn.textContent = 'Sending…'; btn.disabled = true;

  var data = await apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email: email, password: 'TempPass1!', username: name })
  });
  btn.textContent = 'Send Verification Code'; btn.disabled = false;

  if (data && data._status < 400) {
    document.getElementById('auth-reg-step1').style.display = 'none';
    document.getElementById('auth-reg-step2').style.display = 'block';
    document.getElementById('auth-err').style.display = 'none';
    toast('📧 Code sent to ' + email);
  } else {
    showAuthErr((data && data.message) || 'Failed to send code. Try again.');
  }
}

// ─── REGISTER STEP 2 — verify OTP ────────────────────────────────────────────
async function doVerifyOtp() {
  var email = (document.getElementById('reg-email').value || '').trim();
  var name  = (document.getElementById('reg-name').value  || '').trim();
  var otp   = (document.getElementById('reg-otp').value   || '').trim();
  if (!otp || otp.length !== 6) { showAuthErr('Enter the 6-digit code'); return; }
  var btn = document.getElementById('btn-verify-otp');
  btn.textContent = 'Verifying…'; btn.disabled = true;

  var data = await apiFetch('/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ otp: otp, token: otp })
  });
  btn.textContent = 'Verify & Create Account'; btn.disabled = false;

  if (data && data._status < 400) {
    toast('✅ Account created! Now log in with your email.');
    // Auto-fill login email and switch to login view
    showLoginView();
    document.getElementById('auth-email').value = email;
    document.getElementById('auth-sub').textContent = 'Account created! Please sign in.';
  } else {
    showAuthErr((data && data.message) || 'Invalid or expired code');
  }
}

// ─── LOGOUT ───────────────────────────────────────────────────────────────────
async function doLogout() {
  await apiFetch('/auth/logout', { method: 'POST' }).catch(function() {});
  localStorage.removeItem('bitegit_token');
  localStorage.removeItem('bitegit_refresh_token');
  currentUser = null;
  isLoggedIn  = false;
  if (typeof userBalance_USDT !== 'undefined') userBalance_USDT = 0;
  if (typeof updateBalanceDisplay === 'function') updateBalanceDisplay();
  toast('Logged out successfully');
  setTimeout(function() { if (typeof showPage === 'function') showPage('pg-home'); }, 500);
}
(function() {
  var lb = document.getElementById('logout-btn');
  if (lb) lb.onclick = doLogout;
})();

// ─── Load session on startup ──────────────────────────────────────────────────
async function loadUserSession() {
  try {
    var data = await apiFetch('/auth/me');
    if (data && (data.success || data.user)) {
      currentUser = data.user;
      isLoggedIn  = true;
      updateProfileUI();
      afterLogin();
    }
  } catch(e) { /* not logged in — explore mode */ }
}

// ─── Update profile UI ────────────────────────────────────────────────────────
function updateProfileUI() {
  var loginBanner = document.getElementById('uc-login-banner');
  var logoutBtn   = document.getElementById('logout-btn');

  if (!currentUser) {
    // Not logged in — show login banner, hide logout
    if (loginBanner) loginBanner.style.display = 'flex';
    if (logoutBtn)   logoutBtn.style.display   = 'none';
    return;
  }

  // Logged in — hide login banner, show logout
  if (loginBanner) loginBanner.style.display = 'none';
  if (logoutBtn)   logoutBtn.style.display   = 'block';

  var uname = currentUser.username || currentUser.firstName || (currentUser.email ? currentUser.email.split('@')[0] : 'Trader');

  // Profile header
  var nameEl  = document.getElementById('uc-name');
  var emailEl = document.getElementById('uc-email');
  if (nameEl)  nameEl.textContent  = uname;
  if (emailEl) emailEl.textContent = currentUser.email || '';

  // Avatar (emoji → initial letter)
  var avEl = document.getElementById('main-av');
  if (avEl) avEl.textContent = uname[0].toUpperCase();

  // UID row — update display and copy function
  var uidRow = document.getElementById('copy-uid');
  if (uidRow) {
    var uidDisplay = uidRow.querySelector('.uid-r');
    if (uidDisplay) uidDisplay.childNodes[0].textContent = (currentUser.id || currentUser._id || '—') + ' ';
  }

  // KYC row — show real status
  var kycMv = document.querySelector('#go-kyc .mv');
  if (kycMv && currentUser.kyc) {
    var kst = (currentUser.kyc.status || 'not_submitted').toLowerCase();
    kycMv.innerHTML = (kst === 'approved' ? '<span style="color:#0ecb81">✓ Verified</span>' :
                       kst === 'pending'  ? '<span style="color:#f0b90b">Under Review</span>' :
                       kst === 'rejected' ? '<span style="color:#f6465d">Rejected</span>' :
                       'Not Verified') +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg>';
  }
}

// ─── Load Balance ─────────────────────────────────────────────────────────────
async function loadBalance() {
  var data = await apiFetch('/wallet/balances');
  if (!data || !data.summary) return;
  var s = data.summary;
  var bal = parseFloat(s.available_balance || s.total_balance || 0);
  if (typeof userBalance_USDT !== 'undefined') {
    userBalance_USDT = bal;
    if (typeof pnlStart_USDT !== 'undefined') pnlStart_USDT = bal;
    if (typeof updateBalanceDisplay === 'function') updateBalanceDisplay();
  }
  // Sync Trade page available
  var sa = document.getElementById('split-avail');
  if (sa) {
    sa.innerHTML = bal.toFixed(4) + ' USDT <span style="color:#f0b90b;cursor:pointer;" onclick="openDepositPage(\'pg-trade\')">+</span>';
  }
  // Update Withdraw page available
  var wMax = document.getElementById('wd-available');
  if (wMax) wMax.textContent = bal.toFixed(4);
  // Update Transfer available
  var tfAv = document.getElementById('tf-available');
  if (tfAv) tfAv.textContent = bal.toFixed(4);
  // Update deposit address if wallet has it
  if (data.wallet && data.wallet.depositAddress) {
    var addrEl = document.getElementById('dep-wallet-addr');
    if (addrEl && addrEl.textContent === '—' || (addrEl && addrEl.textContent.length < 20)) {
      addrEl.textContent = data.wallet.depositAddress;
    }
  }
}

// ─── Load Market Prices ───────────────────────────────────────────────────────
async function loadMarketPrices() {
  var data = await apiFetch('/market/tickers');
  if (!data) return;
  // Backend returns: { ticker: { price, change, ... }, ... }
  var price = parseFloat((data.ticker && data.ticker.price) || (data.data && data.data.price) || 0);
  if (price > 0 && typeof PAIRS !== 'undefined') {
    var btcPair = PAIRS.find(function(p) { return p.s === 'BTC'; });
    if (btcPair) {
      btcPair.c = parseFloat((data.ticker && data.ticker.change24h) || 0);
      btcPair.p = price;
    }
    if (typeof renderPairs === 'function') renderPairs();
    if (typeof updateTradePrices === 'function') updateTradePrices();
  }
}

// ─── Load P2P Ads ─────────────────────────────────────────────────────────────
async function loadP2PAds() {
  var buyAds  = await apiFetch('/p2p/ads?side=sell&asset=USDT&currency=INR&limit=20');
  var sellAds = await apiFetch('/p2p/ads?side=buy&asset=USDT&currency=INR&limit=20');
  function mapAd(ad) {
    return {
      id:  ad.id,
      u:   ad.ownerUsername || ad.advertiserName || 'Trader',
      cl:  '#f0b90b',
      r:   Math.round((ad.completionRate || ad.successRate || 0.97) * 100),
      ord: ad.completedOrders || ad.totalOrders || 0,
      p:   parseFloat(ad.price || ad.rate || 96),
      mn:  parseFloat(ad.minOrderAmount || ad.minAmount || 1000),
      mx:  parseFloat(ad.maxOrderAmount || ad.maxAmount || 100000),
      q:   parseFloat(ad.availableAmount || ad.quantity || 100),
      pay: ad.paymentMethod || 'Bank Transfer',
      tm:  ad.timeLimit || 15,
      top: false,
    };
  }
  if (buyAds  && buyAds.ads  && buyAds.ads.length  > 0) { if (typeof P2P !== 'undefined') P2P.buy  = buyAds.ads.map(mapAd); }
  if (sellAds && sellAds.ads && sellAds.ads.length > 0) { if (typeof P2P !== 'undefined') P2P.sell = sellAds.ads.map(mapAd); }
  var pg = document.getElementById('pg-p2p');
  if (pg && pg.classList.contains('show') && typeof renderP2P === 'function') renderP2P('buy');
}

// ─── Load Withdrawal History ──────────────────────────────────────────────────
async function loadWithdrawHistory() {
  var data = await apiFetch('/wallet/withdrawals');
  if (!data || !data.withdrawals) return;
  var container = document.getElementById('wd-history-list');
  if (!container) return;
  if (!data.withdrawals.length) {
    container.innerHTML = '<div style="text-align:center;padding:30px;color:#848e9c;"><div style="font-size:32px;margin-bottom:8px;">📋</div><div>No withdrawals yet</div></div>';
    return;
  }
  container.innerHTML = data.withdrawals.map(function(w) {
    var st = (w.status || 'pending').toLowerCase();
    var stColor = st === 'completed' ? '#0ecb81' : st === 'failed' ? '#f6465d' : '#f0b90b';
    return '<div style="background:#1e2329;border-radius:10px;padding:12px 14px;margin-bottom:8px;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;">' +
        '<div><div style="font-size:14px;font-weight:700;">' + (w.currency || 'USDT') + ' Withdrawal</div>' +
        '<div style="font-size:11px;color:#848e9c;margin-top:2px;">' + new Date(w.createdAt || Date.now()).toLocaleDateString() + '</div></div>' +
        '<div style="text-align:right;"><div style="font-size:15px;font-weight:700;color:#f6465d;">-' + parseFloat(w.amount || 0).toFixed(4) + '</div>' +
        '<div style="font-size:11px;color:' + stColor + ';margin-top:2px;text-transform:capitalize;">' + st + '</div></div>' +
      '</div>' +
    '</div>';
  }).join('');
}

// ─── Override submitOrder → real API ─────────────────────────────────────────
(function() {
  var _orig = window.submitOrder;
  window.submitOrder = async function() {
    if (!isLoggedIn) { showAuthModal(); return; }
    var sym    = typeof curSym !== 'undefined' ? curSym : 'BTC';
    var side   = typeof buySide !== 'undefined' ? buySide : 'buy';
    var qtyEl  = document.getElementById('ord-qty');
    var qty    = qtyEl ? parseFloat(qtyEl.textContent) : 0;
    var priceEl = document.getElementById('split-price-val');
    var price   = priceEl ? parseFloat(priceEl.textContent.replace(/,/g,'')) : 0;
    if (!qty || qty <= 0) { toast('Please enter a valid quantity'); return; }
    var btn = document.getElementById('ord-sub-btn');
    if (btn) { btn.textContent = 'Placing…'; btn.disabled = true; }
    var data = await apiFetch('/orders', {
      method: 'POST',
      body: JSON.stringify({ symbol: sym + 'USDT', side: side, type: 'market', quantity: qty, price: price })
    });
    if (btn) { btn.textContent = side === 'buy' ? 'Buy' : 'Sell'; btn.disabled = false; }
    if (data && data._status < 400) {
      toast((side === 'buy' ? '🟢 Buy' : '🔴 Sell') + ' order placed!');
      loadBalance();
    } else {
      toast((data && data.message) || 'Order failed. Check your balance.');
    }
  };
})();

// ─── Override submitWithdrawal → real API ────────────────────────────────────
(function() {
  var _orig = window.submitWithdrawal;
  window.submitWithdrawal = async function() {
    if (!isLoggedIn) { showAuthModal(); return; }
    var coin    = typeof wdCoin !== 'undefined' ? wdCoin : 'USDT';
    var network = typeof wdNetwork !== 'undefined' ? wdNetwork : 'TRC20';
    var addrEl  = document.getElementById('wd-address');
    var amtEl   = document.getElementById('wd-amount');
    var address = addrEl ? addrEl.value.trim() : '';
    var amount  = amtEl  ? parseFloat(amtEl.value) : 0;
    if (!address) { toast('Please enter withdrawal address'); return; }
    if (!amount || amount <= 0) { toast('Please enter a valid amount'); return; }
    var btn = document.getElementById('wd-confirm-btn');
    if (btn) { btn.textContent = 'Processing…'; btn.disabled = true; }
    var data = await apiFetch('/wallet/withdraw', {
      method: 'POST',
      body: JSON.stringify({ currency: coin, address: address, amount: amount, network: network })
    });
    if (btn) { btn.textContent = 'Confirm Withdrawal'; btn.disabled = false; }
    if (data && data._status < 400) {
      toast('✅ Withdrawal request submitted!');
      if (typeof showPage === 'function') showPage('pg-withdraw-history');
      loadBalance();
      loadWithdrawHistory();
    } else {
      toast((data && data.message) || 'Withdrawal failed. Check balance or address.');
    }
  };
})();

// ─── Override openDepositPage → fetch real deposit address ───────────────────
(function() {
  var _orig = window.openDepositPage;
  window.openDepositPage = function(fromPage) {
    if (_orig) _orig(fromPage);
  };
  // When deposit address page is shown, load real address
  var _origSelNet = window.selectDepNetwork;
  window.selectDepNetwork = async function(sym, net) {
    if (_origSelNet) _origSelNet(sym, net);
    var addrEl = document.getElementById('dep-wallet-addr');
    if (addrEl) addrEl.textContent = 'Loading…';
    var data = await apiFetch('/wallet/balances');
    if (data && data.wallet) {
      var addr = data.wallet.depositAddress;
      var actualNet = data.wallet.depositNetwork || net;
      if (addrEl && addr) addrEl.textContent = addr;
      var netEl = document.getElementById('dep-net-label');
      if (netEl && actualNet) netEl.textContent = actualNet;
      // Draw simple QR
      if (addr) drawSimpleQR(addr);
    } else if (addrEl) {
      addrEl.textContent = 'Contact support to get deposit address';
    }
  };
})();

// ─── Simple QR pattern draw ───────────────────────────────────────────────────
function drawSimpleQR(addr) {
  var canvas = document.getElementById('dep-qr-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 150, 150);
  ctx.fillStyle = '#000';
  for (var i = 0; i < 15; i++) {
    for (var j = 0; j < 15; j++) {
      var c = addr.charCodeAt((i * 15 + j) % addr.length);
      if ((c * 17 + i * 13 + j * 7) % 3 === 0) ctx.fillRect(4 + i*9, 4 + j*9, 8, 8);
    }
  }
  [[0,0],[0,10],[10,0]].forEach(function(pos) {
    ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
    ctx.strokeRect(4 + pos[0]*9, 4 + pos[1]*9, 36, 36);
    ctx.fillStyle = '#000';
    ctx.fillRect(14 + pos[0]*9, 14 + pos[1]*9, 16, 16);
  });
}

// ─── Load Transaction History ─────────────────────────────────────────────────
async function loadTxnHistory() {
  var data = await apiFetch('/wallet/withdrawals');
  var container = document.getElementById('txn-list-container');
  if (!container) return;
  var list = (data && data.withdrawals) || [];
  if (!list.length) {
    container.innerHTML = '<div style="text-align:center;padding:40px 20px;color:#848e9c;"><div style="font-size:40px;margin-bottom:12px;">📋</div><div style="font-size:15px;font-weight:600;">No transactions yet</div><div style="font-size:13px;margin-top:6px;">Start trading to see your history</div></div>';
    return;
  }
  container.innerHTML = list.map(function(w) {
    var st = (w.status || 'pending').toLowerCase();
    var stColor = st === 'completed' ? '#0ecb81' : st === 'failed' ? '#f6465d' : '#f0b90b';
    var dt = new Date(w.createdAt || Date.now());
    return '<div style="display:flex;justify-content:space-between;align-items:center;padding:14px 0;border-bottom:1px solid #1e2329;">' +
      '<div style="display:flex;align-items:center;gap:12px;">' +
        '<div style="width:36px;height:36px;border-radius:50%;background:#f6465d22;display:flex;align-items:center;justify-content:center;">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f6465d" stroke-width="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>' +
        '</div>' +
        '<div><div style="font-size:14px;font-weight:600;">Withdraw ' + (w.currency||'USDT') + '</div>' +
        '<div style="font-size:11px;color:#848e9c;">' + dt.toLocaleDateString() + ' · <span style="color:' + stColor + ';text-transform:capitalize;">' + st + '</span></div></div>' +
      '</div>' +
      '<div style="font-size:14px;font-weight:700;color:#f6465d;">-' + parseFloat(w.amount||0).toFixed(4) + '</div>' +
    '</div>';
  }).join('');
}

// ─── After login actions ──────────────────────────────────────────────────────
function afterLogin() {
  updateProfileUI();
  loadBalance();
  loadP2PAds();
  loadMarketPrices();
  // Load KYC status
  loadKycStatus();
}

// ─── KYC Status ───────────────────────────────────────────────────────────────
async function loadKycStatus() {
  var data = await apiFetch('/kyc/status');
  if (!data) return;
  // Update KYC page badge
  var badge = document.getElementById('kyc-status-badge');
  if (badge) {
    var st = (data.status || 'not_submitted').toLowerCase();
    badge.textContent = st === 'approved' ? 'Verified ✓' : st === 'pending' ? 'Under Review' : st === 'rejected' ? 'Rejected' : 'Not Submitted';
    badge.style.color = st === 'approved' ? '#0ecb81' : st === 'rejected' ? '#f6465d' : '#f0b90b';
  }
  // Show verified tick in profile
  var verBadge = document.getElementById('uc-kyc-badge');
  if (verBadge) {
    verBadge.style.display = (data.status === 'approved') ? 'inline-flex' : 'none';
  }
}

// ─── Support Ticket ───────────────────────────────────────────────────────────
async function submitSupportTicket(subject, message) {
  var data = await apiFetch('/support/tickets', {
    method: 'POST',
    body: JSON.stringify({ subject: subject, message: message,
      email: currentUser ? currentUser.email : 'guest@bitegit.com' })
  });
  return data;
}

// ─── Periodic refresh ─────────────────────────────────────────────────────────
setInterval(function() { if (isLoggedIn) loadBalance(); },       30000);
setInterval(function() { if (isLoggedIn) loadMarketPrices(); },  15000);
setInterval(function() { if (isLoggedIn) loadP2PAds(); },        60000);

// ─── Wire page-specific loaders ───────────────────────────────────────────────
(function() {
  // When txn history page opens, load data
  var _origShow = window.showPage;
  if (_origShow) {
    window.showPage = function(id) {
      _origShow(id);
      if (id === 'pg-txn-history' && isLoggedIn) setTimeout(loadTxnHistory, 100);
      if (id === 'pg-withdraw-history' && isLoggedIn) setTimeout(loadWithdrawHistory, 100);
      if (id === 'pg-kyc') setTimeout(loadKycStatus, 100);
    };
  }
  // Wire logout button
  var lb = document.getElementById('logout-btn');
  if (lb) lb.onclick = doLogout;
})();
