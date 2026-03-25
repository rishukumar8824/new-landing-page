const authForm = document.getElementById('authForm');
const authTitle = document.getElementById('authTitle');
const authTopModeBtn = document.getElementById('authTopModeBtn');
const modeLoginBtn = document.getElementById('modeLoginBtn');
const modeSignupBtn = document.getElementById('modeSignupBtn');
const channelEmailBtn = document.getElementById('channelEmailBtn');
const channelMobileBtn = document.getElementById('channelMobileBtn');
const authSwitchPrefix = document.getElementById('authSwitchPrefix');
const authSwitchBtn = document.getElementById('authSwitchBtn');
const contactLabel = document.getElementById('contactLabel');
const contactInput = document.getElementById('contactInput');
const contactError = document.getElementById('contactError');
const otpSection = document.getElementById('otpSection');
const otpInput = document.getElementById('otpInput');
const sendOtpBtn = document.getElementById('sendOtpBtn');
const otpHelp = document.getElementById('otpHelp');
const otpError = document.getElementById('otpError');
const passwordInput = document.getElementById('passwordInput');
const passwordError = document.getElementById('passwordError');
const submitAuthBtn = document.getElementById('submitAuthBtn');
const authStatus = document.getElementById('authStatus');
const forgotBtn = document.getElementById('forgotBtn');
const togglePasswordBtn = document.getElementById('togglePasswordBtn');
const socialGoogleBtn = document.getElementById('socialGoogleBtn');
const socialAppleBtn = document.getElementById('socialAppleBtn');
const socialQrBtn = document.getElementById('socialQrBtn');
const authQrModal = document.getElementById('authQrModal');
const authQrBackdrop = document.getElementById('authQrBackdrop');
const authQrClose = document.getElementById('authQrClose');
const authQrImage = document.getElementById('authQrImage');

const authThemeToggle = document.getElementById('authThemeToggle');
const authDrawerThemeToggle = document.getElementById('authDrawerThemeToggle');
const authMenuToggle = document.getElementById('authMenuToggle');
const authNavDrawer = document.getElementById('authNavDrawer');
const authNavOverlay = document.getElementById('authNavOverlay');
const authNavClose = document.getElementById('authNavClose');

const urlParams = new URLSearchParams(window.location.search);

function resolveSafeRedirect(rawRedirect) {
  const fallback = '/';
  const value = String(rawRedirect || '').trim();
  if (!value) {
    return fallback;
  }
  // Allow only app-internal absolute paths.
  if (!value.startsWith('/')) {
    return fallback;
  }
  if (value.startsWith('//')) {
    return fallback;
  }
  return value;
}

const redirectTo = resolveSafeRedirect(urlParams.get('redirect'));
const urlMode = String(urlParams.get('mode') || '').trim().toLowerCase();

const MODE_LOGIN = 'login';
const MODE_SIGNUP = 'signup';
const MODE_FORGOT = 'forgot';

const OTP_RESEND_WAIT_SECONDS = 30;

const state = {
  mode: [MODE_LOGIN, MODE_SIGNUP, MODE_FORGOT].includes(urlMode) ? urlMode : MODE_LOGIN,
  channel: 'email',
  loading: false,
  otpPurpose: null,
  otpWaitUntilMs: 0,
  otpTimerId: null
};

function setAuthNavOpen(open) {
  if (!authNavDrawer || !authNavOverlay || !authMenuToggle) {
    return;
  }
  const shouldOpen = Boolean(open);
  authNavDrawer.classList.toggle('is-open', shouldOpen);
  authNavOverlay.classList.toggle('hidden', !shouldOpen);
  authNavDrawer.setAttribute('aria-hidden', shouldOpen ? 'false' : 'true');
  authNavOverlay.setAttribute('aria-hidden', shouldOpen ? 'false' : 'true');
  authMenuToggle.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
  document.body.classList.toggle('auth-nav-open', shouldOpen);
}

function setStatus(message, type = '') {
  if (!authStatus) {
    return;
  }
  authStatus.textContent = message || '';
  authStatus.classList.remove('hidden', 'error', 'success');
  if (!message) {
    authStatus.classList.add('hidden');
    return;
  }
  if (type) {
    authStatus.classList.add(type);
  }
}

function setAuthQrOpen(open) {
  if (!authQrModal) {
    return;
  }
  const shouldOpen = Boolean(open);
  authQrModal.classList.toggle('hidden', !shouldOpen);
  authQrModal.setAttribute('aria-hidden', shouldOpen ? 'false' : 'true');
  document.body.classList.toggle('auth-qr-open', shouldOpen);
}

function openQrLoginModal() {
  if (!authQrImage) {
    return;
  }
  const loginUrl = `${window.location.origin}/auth.html?mode=login&redirect=${encodeURIComponent(redirectTo)}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&format=png&data=${encodeURIComponent(loginUrl)}`;
  authQrImage.src = qrSrc;
  setStatus('Scan QR on another device to open login.', 'success');
  setAuthQrOpen(true);
}

function setOtpHelp(message) {
  if (!otpHelp) {
    return;
  }
  otpHelp.textContent = message || '';
  otpHelp.classList.toggle('hidden', !message);
}

function setLoading(next) {
  state.loading = Boolean(next);
  if (submitAuthBtn) {
    submitAuthBtn.disabled = state.loading;
    submitAuthBtn.textContent = state.loading
      ? (state.mode === MODE_SIGNUP ? 'Creating...' : state.mode === MODE_FORGOT ? 'Resetting...' : 'Logging in...')
      : (state.mode === MODE_SIGNUP ? 'Sign Up' : state.mode === MODE_FORGOT ? 'Reset Password' : 'Log In');
  }
}

function clearOtpTimer() {
  if (state.otpTimerId) {
    window.clearInterval(state.otpTimerId);
    state.otpTimerId = null;
  }
}

function updateOtpButton() {
  if (!sendOtpBtn) {
    return;
  }
  const remainingMs = state.otpWaitUntilMs - Date.now();
  if (remainingMs <= 0) {
    sendOtpBtn.disabled = false;
    sendOtpBtn.textContent = 'Send OTP';
    clearOtpTimer();
    return;
  }
  sendOtpBtn.disabled = true;
  const remainingSec = Math.ceil(remainingMs / 1000);
  sendOtpBtn.textContent = `Resend ${remainingSec}s`;
}

function startOtpCooldown(seconds = OTP_RESEND_WAIT_SECONDS) {
  state.otpWaitUntilMs = Date.now() + seconds * 1000;
  updateOtpButton();
  clearOtpTimer();
  state.otpTimerId = window.setInterval(updateOtpButton, 500);
}

function setMode(nextMode) {
  state.mode = [MODE_LOGIN, MODE_SIGNUP, MODE_FORGOT].includes(nextMode) ? nextMode : MODE_LOGIN;

  const isLogin = state.mode === MODE_LOGIN;
  const isSignup = state.mode === MODE_SIGNUP;
  const isForgot = state.mode === MODE_FORGOT;

  modeLoginBtn?.classList.toggle('active', isLogin);
  modeSignupBtn?.classList.toggle('active', isSignup);
  modeLoginBtn?.setAttribute('aria-selected', String(isLogin));
  modeSignupBtn?.setAttribute('aria-selected', String(isSignup));

  modeLoginBtn?.classList.toggle('hidden', isForgot);
  modeSignupBtn?.classList.toggle('hidden', isForgot);

  if (authTitle) {
    authTitle.textContent = isSignup
      ? 'Create your Bitegit account'
      : isForgot
        ? 'Reset your password'
        : 'Welcome to Bitegit';
  }

  if (authSwitchPrefix) {
    authSwitchPrefix.textContent = isSignup ? 'Already have account?' : isForgot ? 'Remember password?' : 'No account?';
  }

  if (authSwitchBtn) {
    authSwitchBtn.textContent = isSignup || isForgot ? 'Log In' : 'Sign Up';
  }

  if (authTopModeBtn) {
    authTopModeBtn.textContent = isSignup || isForgot ? 'Log In' : 'Sign Up';
  }

  document.body.classList.toggle('auth-login-mode', isLogin);
  document.body.classList.toggle('auth-signup-mode', isSignup);
  document.body.classList.toggle('auth-forgot-mode', isForgot);

  if (passwordInput) {
    passwordInput.autocomplete = isSignup || isForgot ? 'new-password' : 'current-password';
    passwordInput.placeholder = isForgot ? 'Enter New Password' : 'Enter Password';
  }

  if (forgotBtn) {
    forgotBtn.classList.toggle('hidden', !isLogin);
  }

  if (otpSection) {
    otpSection.classList.toggle('hidden', !(isSignup || isForgot));
  }

  if (isSignup) {
    state.otpPurpose = 'signup';
  } else if (isForgot) {
    state.otpPurpose = 'forgot';
  } else {
    state.otpPurpose = null;
  }

  if (state.channel === 'email') {
    contactInput.type = 'email';
    contactInput.placeholder = 'Enter Email';
    contactLabel.textContent = 'Email';
  }

  setStatus('');
  setOtpHelp('');
  contactError?.classList.add('hidden');
  otpError?.classList.add('hidden');
  passwordError?.classList.add('hidden');

  if (otpInput) {
    otpInput.value = '';
  }

  clearOtpTimer();
  state.otpWaitUntilMs = 0;
  updateOtpButton();

  if (submitAuthBtn) {
    submitAuthBtn.textContent = isSignup ? 'Sign Up' : isForgot ? 'Reset Password' : 'Log In';
  }
}

function setChannel(nextChannel) {
  state.channel = nextChannel === 'mobile' ? 'mobile' : 'email';

  const isMobile = state.channel === 'mobile';
  channelEmailBtn?.classList.toggle('active', !isMobile);
  channelMobileBtn?.classList.toggle('active', isMobile);
  channelEmailBtn?.setAttribute('aria-selected', String(!isMobile));
  channelMobileBtn?.setAttribute('aria-selected', String(isMobile));

  if (isMobile) {
    contactInput.type = 'tel';
    contactInput.placeholder = 'Enter Mobile Number';
    contactLabel.textContent = 'Mobile';
    setStatus('Mobile auth is coming soon. Use Email tab.', 'error');
  } else {
    contactInput.type = 'email';
    contactInput.placeholder = 'Enter Email';
    contactLabel.textContent = 'Email';
    setStatus('');
  }

  contactError?.classList.add('hidden');
  otpError?.classList.add('hidden');
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidOtp(code) {
  return /^\d{6}$/.test(String(code || '').trim());
}

async function checkExistingSession() {
  if (state.mode === MODE_SIGNUP || state.mode === MODE_FORGOT) {
    return;
  }
  try {
    const response = await fetch('/api/p2p/me', { credentials: 'include' });
    const data = await response.json();
    if (response.ok && data?.loggedIn) {
      window.location.href = redirectTo;
    }
  } catch (_) {
    // ignore
  }
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include',
    body: JSON.stringify(payload || {})
  });
  const rawText = await response.text().catch(() => '');
  let data = {};
  if (rawText) {
    try {
      data = JSON.parse(rawText);
    } catch (_) {
      const plainText = String(rawText || '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (plainText) {
        data = { message: plainText.slice(0, 220) };
      }
    }
  }
  return { response, data, rawText };
}

async function resolveLoginSessionAfterSubmit() {
  try {
    const response = await fetch('/api/p2p/me', { credentials: 'include' });
    const data = await response.json().catch(() => ({}));
    return response.ok && Boolean(data?.loggedIn);
  } catch (_) {
    return false;
  }
}

async function handleSendOtp() {
  if (state.loading) {
    return;
  }

  const email = String(contactInput?.value || '').trim().toLowerCase();
  contactError?.classList.add('hidden');
  otpError?.classList.add('hidden');

  if (!isValidEmail(email)) {
    contactError?.classList.remove('hidden');
    return;
  }

  const endpoint = state.otpPurpose === 'forgot' ? '/auth/forgot-password/send-otp' : '/auth/signup/send-otp';

  try {
    sendOtpBtn.disabled = true;
    sendOtpBtn.textContent = 'Sending...';
    setOtpHelp('');
    const { response, data } = await postJson(endpoint, { email });
    if (!response.ok) {
      setOtpHelp('');
      setStatus(data?.message || 'Unable to send verification code.', 'error');
      updateOtpButton();
      return;
    }

    const statusMsg = data?.message || 'Verification code sent.';
    setStatus(statusMsg, 'success');
    const ttl = Number(data?.expiresInSeconds || 600);
    setOtpHelp(`Code sent. Valid for ${Math.max(1, Math.floor(ttl / 60))} minutes.`);
    startOtpCooldown(OTP_RESEND_WAIT_SECONDS);
  } catch (_) {
    setStatus('Network error while sending verification code.', 'error');
    updateOtpButton();
  }
}

async function handleSubmit(event) {
  event.preventDefault();
  if (state.loading) {
    return;
  }

  const email = String(contactInput?.value || '').trim().toLowerCase();
  const password = String(passwordInput?.value || '').trim();
  const otpCode = String(otpInput?.value || '').trim();

  contactError?.classList.add('hidden');
  otpError?.classList.add('hidden');
  passwordError?.classList.add('hidden');
  setStatus('');

  if (state.channel === 'mobile') {
    setStatus('Mobile auth is coming soon. Switch to Email tab.', 'error');
    return;
  }

  if (!isValidEmail(email)) {
    contactError?.classList.remove('hidden');
    return;
  }

  if (password.length < 6) {
    passwordError?.classList.remove('hidden');
    return;
  }

  if ((state.mode === MODE_SIGNUP || state.mode === MODE_FORGOT) && !isValidOtp(otpCode)) {
    otpError?.classList.remove('hidden');
    return;
  }

  let endpoint = '/auth/login';
  let payload = { email, password };

  if (state.mode === MODE_SIGNUP) {
    endpoint = '/auth/register';
    payload = { email, password, otpCode };
  } else if (state.mode === MODE_FORGOT) {
    endpoint = '/auth/forgot-password/reset';
    payload = { email, otpCode, newPassword: password };
  }

  try {
    setLoading(true);
    const { response, data } = await postJson(endpoint, payload);

    if (!response.ok) {
      if (state.mode === MODE_LOGIN && await resolveLoginSessionAfterSubmit()) {
        setStatus('Login successful.', 'success');
        window.setTimeout(() => {
          window.location.href = redirectTo;
        }, 250);
        return;
      }
      setStatus(data?.message || 'Auth failed. Try again.', 'error');
      return;
    }

    if (state.mode === MODE_FORGOT) {
      setStatus(data?.message || 'Password reset successful. Please login.', 'success');
      passwordInput.value = '';
      if (otpInput) {
        otpInput.value = '';
      }
      window.setTimeout(() => {
        setMode(MODE_LOGIN);
      }, 450);
      return;
    }

    if (state.mode === MODE_LOGIN && !(await resolveLoginSessionAfterSubmit())) {
      setStatus('Login completed but session is still syncing. Please try once more.', 'error');
      return;
    }

    setStatus(data?.message || 'Success', 'success');
    window.setTimeout(() => {
      window.location.href = redirectTo;
    }, 450);
  } catch (_) {
    setStatus('Network error. Please try again.', 'error');
  } finally {
    setLoading(false);
  }
}

modeLoginBtn?.addEventListener('click', () => setMode(MODE_LOGIN));
modeSignupBtn?.addEventListener('click', () => setMode(MODE_SIGNUP));

channelEmailBtn?.addEventListener('click', () => setChannel('email'));
channelMobileBtn?.addEventListener('click', () => setChannel('mobile'));

authSwitchBtn?.addEventListener('click', () => {
  if (state.mode === MODE_LOGIN) {
    setMode(MODE_SIGNUP);
    return;
  }
  setMode(MODE_LOGIN);
});

authTopModeBtn?.addEventListener('click', () => {
  if (state.mode === MODE_LOGIN) {
    setMode(MODE_SIGNUP);
    return;
  }
  setMode(MODE_LOGIN);
});

togglePasswordBtn?.addEventListener('click', () => {
  const isPassword = passwordInput?.type !== 'text';
  passwordInput.type = isPassword ? 'text' : 'password';
  togglePasswordBtn.textContent = isPassword ? '🙈' : '👁';
});

forgotBtn?.addEventListener('click', () => {
  setMode(MODE_FORGOT);
  setOtpHelp('Enter email and request OTP to reset password.');
});

sendOtpBtn?.addEventListener('click', handleSendOtp);
authForm?.addEventListener('submit', handleSubmit);
socialGoogleBtn?.addEventListener('click', () => {
  window.open('https://accounts.google.com/', '_blank', 'noopener,noreferrer');
  setStatus('Google auth window opened. Continue with your Google email.', 'success');
});
socialAppleBtn?.addEventListener('click', () => {
  window.open('https://appleid.apple.com/', '_blank', 'noopener,noreferrer');
  setStatus('Apple auth window opened. Continue with your Apple email.', 'success');
});
socialQrBtn?.addEventListener('click', openQrLoginModal);
authQrClose?.addEventListener('click', () => setAuthQrOpen(false));
authQrBackdrop?.addEventListener('click', () => setAuthQrOpen(false));

authMenuToggle?.addEventListener('click', () => setAuthNavOpen(true));
authNavClose?.addEventListener('click', () => setAuthNavOpen(false));
authNavOverlay?.addEventListener('click', () => setAuthNavOpen(false));
authNavDrawer?.addEventListener('click', (event) => {
  if (event.target.closest('a[href]')) {
    setAuthNavOpen(false);
  }
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    setAuthQrOpen(false);
    setAuthNavOpen(false);
  }
});

if (window.BitegitTheme?.initThemeToggle) {
  window.BitegitTheme.initThemeToggle([authThemeToggle, authDrawerThemeToggle]);
}

setMode(state.mode);
setChannel('email');
checkExistingSession();
