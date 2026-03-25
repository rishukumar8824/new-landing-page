const form = document.getElementById('adminLoginForm');
const messageEl = document.getElementById('loginMessage');
const submitBtn = document.getElementById('submitBtn');

function setMessage(text, type = 'info') {
  messageEl.textContent = text;
  messageEl.className = 'min-h-[20px] text-sm';
  if (type === 'error') {
    messageEl.classList.add('text-rose-400');
  } else if (type === 'success') {
    messageEl.classList.add('text-emerald-400');
  } else {
    messageEl.classList.add('text-slate-400');
  }
}

function normalizeIdentifier(raw) {
  return String(raw || '').trim();
}

function parseError(data, fallback) {
  if (data && typeof data === 'object' && data.message) {
    return String(data.message);
  }
  return fallback;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const identifier = normalizeIdentifier(document.getElementById('identifier').value);
  const password = String(document.getElementById('password').value || '').trim();
  const otpCode = String(document.getElementById('otpCode').value || '').trim();

  if (!identifier || !password) {
    setMessage('Email/username and password are required.', 'error');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.classList.add('opacity-70', 'cursor-not-allowed');
  setMessage('Signing in...', 'info');

  try {
    const payload = {
      password
    };
    if (identifier.includes('@')) {
      payload.email = identifier.toLowerCase();
    } else {
      payload.username = identifier;
    }
    if (otpCode) {
      payload.otpCode = otpCode;
    }

    const response = await fetch('/api/admin/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(parseError(data, 'Login failed.'));
    }

    setMessage('Login successful. Redirecting to dashboard...', 'success');
    window.location.href = '/admin';
  } catch (error) {
    setMessage(error.message || 'Unable to login.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.classList.remove('opacity-70', 'cursor-not-allowed');
  }
});
