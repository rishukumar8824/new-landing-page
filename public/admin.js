const leadRows = document.getElementById('leadRows');
const adminMessage = document.getElementById('adminMessage');
const refreshBtn = document.getElementById('refreshBtn');
const AUTH_STORAGE_KEY = 'admin_basic_auth_token';

function formatDate(value) {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function showMessage(text, type) {
  adminMessage.textContent = text;
  adminMessage.className = 'message';
  if (type) {
    adminMessage.classList.add(type);
  }
}

function renderRows(leads) {
  if (!Array.isArray(leads) || leads.length === 0) {
    leadRows.innerHTML = '<tr><td colspan="3" class="empty-row">No leads found yet.</td></tr>';
    return;
  }

  leadRows.innerHTML = leads
    .map(
      (lead) =>
        `<tr>
          <td>${lead.name || '-'}</td>
          <td>${lead.mobile || '-'}</td>
          <td>${formatDate(lead.createdAt)}</td>
        </tr>`
    )
    .join('');
}

async function loadLeads() {
  showMessage('Loading leads...', '');

  try {
    let token = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!token) {
      const username = window.prompt('Enter admin username');
      const password = window.prompt('Enter admin password');

      if (!username || !password) {
        throw new Error('Username and password are required.');
      }

      token = btoa(`${username}:${password}`);
      localStorage.setItem(AUTH_STORAGE_KEY, token);
    }

    const response = await fetch('/api/leads', {
      headers: {
        Authorization: `Basic ${token}`
      }
    });
    let data = null;
    try {
      data = await response.json();
    } catch (error) {
      data = { message: 'Unexpected server response.' };
    }

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        throw new Error('Invalid admin credentials. Click Refresh and try again.');
      }
      throw new Error(data.message || 'Failed to load leads.');
    }

    renderRows(data);
    showMessage(`Total leads: ${data.length}`, 'success');
  } catch (error) {
    renderRows([]);
    showMessage(error.message, 'error');
  }
}

refreshBtn.addEventListener('click', loadLeads);

loadLeads();
