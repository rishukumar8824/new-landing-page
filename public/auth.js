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
const passwordInput = document.getElementById('passwordInput');
const passwordError = document.getElementById('passwordError');
const submitAuthBtn = document.getElementById('submitAuthBtn');
const authStatus = document.getElementById('authStatus');
const forgotBtn = document.getElementById('forgotBtn');
const togglePasswordBtn = document.getElementById('togglePasswordBtn');

const authThemeToggle = document.getElementById('authThemeToggle');
const authDrawerThemeToggle = document.getElementById('authDrawerThemeToggle');
const authMenuToggle = document.getElementById('authMenuToggle');
const authNavDrawer = document.getElementById('authNavDrawer');
const authNavOverlay = document.getElementById('authNavOverlay');
const authNavClose = document.getElementById('authNavClose');

const urlParams = new URLSearchParams(window.location.search);
const redirectTo = urlParams.get('redirect') || '/trade/spot/BTCUSDT';

const state = {
  mode: urlParams.get('mode') === 'signup' ? 'signup' : 'login',
  channel: 'email',
  loading: false
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

function setLoading(next) {
  state.loading = Boolean(next);
  if (submitAuthBtn) {
    submitAuthBtn.disabled = state.loading;
    submitAuthBtn.textContent = state.loading
      ? (state.mode === 'signup' ? 'Creating...' : 'Logging in...')
      : (state.mode === 'signup' ? 'Sign Up' : 'Log In');
  }
}

function setMode(nextMode) {
  state.mode = nextMode === 'signup' ? 'signup' : 'login';

  const isSignup = state.mode === 'signup';

  modeLoginBtn?.classList.toggle('active', !isSignup);
  modeSignupBtn?.classList.toggle('active', isSignup);
  modeLoginBtn?.setAttribute('aria-selected', String(!isSignup));
  modeSignupBtn?.setAttribute('aria-selected', String(isSignup));

  if (authTitle) {
    authTitle.textContent = isSignup ? 'Create your Bitegit account' : 'Welcome to Bitegit';
  }

  if (authSwitchPrefix) {
    authSwitchPrefix.textContent = isSignup ? 'Already have account?' : 'No account?';
  }

  if (authSwitchBtn) {
    authSwitchBtn.textContent = isSignup ? 'Log In' : 'Sign Up';
  }

  if (authTopModeBtn) {
    authTopModeBtn.textContent = isSignup ? 'Log In' : 'Sign Up';
  }

  if (passwordInput) {
    passwordInput.autocomplete = isSignup ? 'new-password' : 'current-password';
  }

  if (state.channel === 'email') {
    contactInput.type = 'email';
    contactInput.placeholder = 'Enter Email';
    contactLabel.textContent = 'Email';
  }

  setStatus('');
  contactError?.classList.add('hidden');
  passwordError?.classList.add('hidden');
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
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function checkExistingSession() {
  try {
    const response = await fetch('/api/p2p/me');
    const data = await response.json();
    if (response.ok && data?.loggedIn) {
      window.location.href = redirectTo;
    }
  } catch (_) {
    // ignore
  }
}

async function handleSubmit(event) {
  event.preventDefault();
  if (state.loading) {
    return;
  }

  const rawContact = String(contactInput?.value || '').trim();
  const password = String(passwordInput?.value || '').trim();

  contactError?.classList.add('hidden');
  passwordError?.classList.add('hidden');
  setStatus('');

  if (state.channel === 'mobile') {
    setStatus('Mobile auth is coming soon. Switch to Email tab.', 'error');
    return;
  }

  if (!isValidEmail(rawContact)) {
    contactError?.classList.remove('hidden');
    return;
  }

  if (password.length < 6) {
    passwordError?.classList.remove('hidden');
    return;
  }

  const endpoint = state.mode === 'signup' ? '/auth/register' : '/auth/login';

  try {
    setLoading(true);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: rawContact,
        password
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setStatus(data?.message || 'Auth failed. Try again.', 'error');
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

modeLoginBtn?.addEventListener('click', () => setMode('login'));
modeSignupBtn?.addEventListener('click', () => setMode('signup'));

channelEmailBtn?.addEventListener('click', () => setChannel('email'));
channelMobileBtn?.addEventListener('click', () => setChannel('mobile'));

authSwitchBtn?.addEventListener('click', () => {
  setMode(state.mode === 'signup' ? 'login' : 'signup');
});

authTopModeBtn?.addEventListener('click', () => {
  setMode(state.mode === 'signup' ? 'login' : 'signup');
});

togglePasswordBtn?.addEventListener('click', () => {
  const isPassword = passwordInput?.type !== 'text';
  passwordInput.type = isPassword ? 'text' : 'password';
  togglePasswordBtn.textContent = isPassword ? '🙈' : '👁';
});

forgotBtn?.addEventListener('click', () => {
  setStatus('Password reset flow will be enabled soon.', 'error');
});

authForm?.addEventListener('submit', handleSubmit);

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
    setAuthNavOpen(false);
  }
});

if (window.BitegitTheme?.initThemeToggle) {
  window.BitegitTheme.initThemeToggle([authThemeToggle, authDrawerThemeToggle]);
}

setMode(state.mode);
setChannel('email');
checkExistingSession();
