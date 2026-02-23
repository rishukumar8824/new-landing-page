const form = document.getElementById('leadForm');
const message = document.getElementById('message');
const whatsappBtn = document.getElementById('whatsappBtn');
const WHATSAPP_NUMBER = '918003993930';
const statVolume = document.getElementById('statVolume');
const statTraders = document.getElementById('statTraders');
const statUptime = document.getElementById('statUptime');

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

function animateValue(element, start, end, duration, formatter) {
  if (!element) {
    return;
  }

  const startTime = performance.now();

  function step(currentTime) {
    const progress = Math.min((currentTime - startTime) / duration, 1);
    const value = start + (end - start) * progress;
    element.textContent = formatter(value);

    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }

  requestAnimationFrame(step);
}

function initLiveStats() {
  animateValue(statVolume, 0, 1.4, 1600, (v) => `$${v.toFixed(1)}B+`);
  animateValue(statTraders, 0, 220, 1700, (v) => `${Math.round(v)}K+`);

  if (statUptime) {
    let toggle = false;
    setInterval(() => {
      toggle = !toggle;
      statUptime.textContent = toggle ? '99.99%' : '99.98%';
    }, 1500);
  }
}

initLiveStats();
