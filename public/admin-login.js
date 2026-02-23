const loginForm = document.getElementById('loginForm');
const loginMessage = document.getElementById('loginMessage');

function setMessage(text, type) {
  loginMessage.textContent = text;
  loginMessage.className = 'message';
  if (type) {
    loginMessage.classList.add(type);
  }
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();

  if (!username || !password) {
    setMessage('Username and password are required.', 'error');
    return;
  }

  setMessage('Logging in...', '');

  try {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Login failed.');
    }

    setMessage('Login successful. Redirecting...', 'success');
    window.location.href = '/admin';
  } catch (error) {
    setMessage(error.message, 'error');
  }
});
