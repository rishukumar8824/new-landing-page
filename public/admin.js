const leadRows = document.getElementById('leadRows');
const adminMessage = document.getElementById('adminMessage');
const refreshBtn = document.getElementById('refreshBtn');
const logoutBtn = document.getElementById('logoutBtn');

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
    const response = await fetch('/api/leads', { credentials: 'include' });

    let data = null;
    try {
      data = await response.json();
    } catch (error) {
      data = { message: 'Unexpected server response.' };
    }

    if (response.status === 401) {
      window.location.href = '/admin-login';
      return;
    }

    if (!response.ok) {
      throw new Error(data.message || 'Failed to load leads.');
    }

    renderRows(data);
    showMessage(`Total leads: ${data.length}`, 'success');
  } catch (error) {
    renderRows([]);
    showMessage(error.message, 'error');
  }
}

async function logout() {
  try {
    await fetch('/api/admin/logout', {
      method: 'POST',
      credentials: 'include'
    });
  } finally {
    window.location.href = '/admin-login';
  }
}

refreshBtn.addEventListener('click', loadLeads);
logoutBtn.addEventListener('click', logout);

loadLeads();
