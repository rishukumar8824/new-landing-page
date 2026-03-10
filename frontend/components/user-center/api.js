const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000').replace(/\/$/, '');

async function request(path, { method = 'GET', body } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });

  let data = null;
  try {
    data = await response.json();
  } catch (error) {
    data = null;
  }

  if (!response.ok || (data && data.success === false)) {
    throw new Error(data?.message || 'Request failed.');
  }

  return data;
}

export const userCenterApi = {
  getMe: () => request('/api/user-center/me'),
  updateProfile: (payload) => request('/api/user-center/profile', { method: 'PUT', body: payload }),
  getIdentity: () => request('/api/user-center/identity'),
  updateIdentity: (payload) => request('/api/user-center/identity', { method: 'PUT', body: payload }),
  changePassword: (payload) => request('/security/change-password', { method: 'POST', body: payload }),
  changePhone: (payload) => request('/security/change-phone', { method: 'POST', body: payload }),
  changeEmail: (payload) => request('/security/change-email', { method: 'POST', body: payload }),
  link2fa: (payload) => request('/security/link-2fa', { method: 'POST', body: payload }),
  setFundCode: (payload) => request('/security/set-fund-code', { method: 'POST', body: payload }),
  loginHistory: () => request('/security/login-history'),
  deleteAccount: (payload) => request('/security/delete-account', { method: 'POST', body: payload }),
  addresses: () => request('/api/user-center/addresses'),
  addAddress: (payload) => request('/api/user-center/addresses', { method: 'POST', body: payload }),
  removeAddress: (id) => request(`/api/user-center/addresses/${id}`, { method: 'DELETE' }),
  getPreferences: () => request('/api/user-center/preferences'),
  updatePreferences: (payload) => request('/api/user-center/preferences', { method: 'PUT', body: payload }),
  getFees: () => request('/api/user-center/fees'),
  createGift: (payload) => request('/api/user-center/gifts', { method: 'POST', body: payload }),
  claimGift: (payload) => request('/api/user-center/gifts/claim', { method: 'POST', body: payload }),
  listGifts: () => request('/api/user-center/gifts'),
  referral: () => request('/api/user-center/referral'),
  supportCenter: () => request('/api/user-center/support/center'),
  createTicket: (payload) => request('/api/user-center/support/tickets', { method: 'POST', body: payload }),
  listTickets: () => request('/api/user-center/support/tickets'),
  listTicketMessages: (ticketId) => request(`/api/user-center/support/tickets/${ticketId}/messages`),
  sendTicketMessage: (ticketId, payload) =>
    request(`/api/user-center/support/tickets/${ticketId}/messages`, { method: 'POST', body: payload }),
  helpArticles: (topic) => request(`/api/user-center/help/articles${topic ? `?topic=${encodeURIComponent(topic)}` : ''}`),
  about: () => request('/api/user-center/about')
};
