const form = document.getElementById('leadForm');
const message = document.getElementById('message');
const whatsappBtn = document.getElementById('whatsappBtn');
const WHATSAPP_NUMBER = '91XXXXXXXXXX'; // Replace with your WhatsApp number in countrycode format

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('name').value.trim();
  const mobile = document.getElementById('mobile').value.trim();

  message.textContent = '';
  message.className = 'message';

  if (name.length < 2) {
    message.textContent = 'Please enter a valid name.';
    message.classList.add('error');
    return;
  }

  if (!/^\d{10}$/.test(mobile)) {
    message.textContent = 'Please enter a valid 10-digit mobile number.';
    message.classList.add('error');
    return;
  }

  try {
    const response = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, mobile })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Something went wrong.');
    }

    message.textContent = data.message;
    message.classList.add('success');
    form.reset();
  } catch (err) {
    message.textContent = err.message;
    message.classList.add('error');
  }
});

whatsappBtn.addEventListener('click', () => {
  const name = document.getElementById('name').value.trim();
  const mobile = document.getElementById('mobile').value.trim();
  const details = [];

  if (name) {
    details.push(`Name: ${name}`);
  }
  if (mobile) {
    details.push(`Mobile: ${mobile}`);
  }

  const text = details.length
    ? `Hi, I want to connect.\n${details.join('\n')}`
    : 'Hi, I want to connect.';

  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
});
