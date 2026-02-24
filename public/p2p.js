const rowsEl = document.getElementById('p2pRows');
const metaEl = document.getElementById('p2pMeta');
const sideTabs = document.getElementById('sideTabs');
const assetFilter = document.getElementById('assetFilter');
const paymentFilter = document.getElementById('paymentFilter');
const amountFilter = document.getElementById('amountFilter');
const advertiserFilter = document.getElementById('advertiserFilter');
const applyFilters = document.getElementById('applyFilters');
const refreshOffers = document.getElementById('refreshOffers');

let currentSide = 'buy';

function formatNumber(value) {
  return Number(value).toLocaleString('en-IN');
}

function renderOffers(data) {
  if (!Array.isArray(data.offers) || data.offers.length === 0) {
    rowsEl.innerHTML = '<tr><td colspan="6" class="empty-row">No offers found for selected filters.</td></tr>';
    return;
  }

  rowsEl.innerHTML = data.offers
    .map((offer) => {
      const actionLabel = data.side === 'buy' ? 'Buy' : 'Sell';
      const actionClass = data.side === 'buy' ? 'buy-offer-btn' : 'sell-offer-btn';
      const availableLabel = `${formatNumber(offer.available)} ${offer.asset}`;
      const limitsLabel = `₹${formatNumber(offer.minLimit)} - ₹${formatNumber(offer.maxLimit)}`;
      const payments = offer.payments.map((method) => `<span class="pay-chip">${method}</span>`).join(' ');

      return `
        <tr>
          <td>
            <p class="adv-name">${offer.advertiser}</p>
            <p class="adv-meta">${offer.orders} orders | ${offer.completionRate}%</p>
          </td>
          <td class="p2p-price">₹${formatNumber(offer.price)}</td>
          <td>${availableLabel}</td>
          <td>${limitsLabel}</td>
          <td>${payments}</td>
          <td><button class="${actionClass}" type="button">${actionLabel}</button></td>
        </tr>
      `;
    })
    .join('');
}

async function loadOffers() {
  const params = new URLSearchParams({
    side: currentSide,
    asset: assetFilter.value
  });

  if (paymentFilter.value) {
    params.set('payment', paymentFilter.value);
  }
  if (amountFilter.value) {
    params.set('amount', amountFilter.value);
  }
  if (advertiserFilter.value.trim()) {
    params.set('advertiser', advertiserFilter.value.trim());
  }

  metaEl.textContent = 'Loading offers...';

  try {
    const response = await fetch(`/api/p2p/offers?${params.toString()}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch offers.');
    }

    renderOffers(data);
    const sideLabel = data.side === 'buy' ? 'Buy' : 'Sell';
    metaEl.textContent = `${sideLabel} ${data.asset} offers: ${data.total} | Updated ${new Date(data.updatedAt).toLocaleTimeString()}`;
  } catch (error) {
    rowsEl.innerHTML = '<tr><td colspan="6" class="empty-row">Unable to load offers right now.</td></tr>';
    metaEl.textContent = error.message;
  }
}

sideTabs.addEventListener('click', (event) => {
  const target = event.target.closest('.side-tab');
  if (!target) {
    return;
  }

  sideTabs.querySelectorAll('.side-tab').forEach((btn) => btn.classList.remove('active'));
  target.classList.add('active');

  currentSide = target.dataset.side;
  loadOffers();
});

applyFilters.addEventListener('click', loadOffers);
refreshOffers.addEventListener('click', loadOffers);

loadOffers();
