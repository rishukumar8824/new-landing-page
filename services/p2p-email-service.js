const { sendRawEmail } = require('./auth-email-service');

const BRAND = String(process.env.APP_NAME || 'BITEGIT').trim().toUpperCase();
const BRAND_DARK = '#181a20';
const BRAND_ACCENT = '#f0b90b';

function esc(v) {
  return String(v || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildHtml(headline, bodyHtml) {
  return `<!doctype html><html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:20px 12px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border:1px solid #e5e7eb;">
      <tr><td style="background:${BRAND_DARK};padding:18px 24px;font-size:26px;font-weight:800;color:${BRAND_ACCENT};">${BRAND}</td></tr>
      <tr><td style="padding:24px;">
        <h2 style="margin:0 0 12px;font-size:20px;color:#111;">${esc(headline)}</h2>
        ${bodyHtml}
        <p style="margin:20px 0 0;font-size:12px;color:#9ca3af;">Automated message. Do not reply. &copy; ${new Date().getUTCFullYear()} ${BRAND}</p>
      </td></tr>
    </table>
  </td></tr>
</table></body></html>`;
}

function orderDetails(order) {
  return `<table width="100%" cellpadding="4" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:6px;margin:12px 0;font-size:13px;">
  <tr style="background:#f9fafb;"><td style="padding:8px 12px;color:#6b7280;">Order Ref</td><td style="padding:8px 12px;font-weight:700;text-align:right;">${esc(order.reference || order.id)}</td></tr>
  <tr><td style="padding:8px 12px;color:#6b7280;">Amount</td><td style="padding:8px 12px;font-weight:700;text-align:right;">${esc(order.assetAmount)} ${esc(order.asset)} / ₹${esc(order.amountInr)}</td></tr>
  <tr style="background:#f9fafb;"><td style="padding:8px 12px;color:#6b7280;">Payment</td><td style="padding:8px 12px;font-weight:700;text-align:right;">${esc(order.paymentMethod)}</td></tr>
</table>`;
}

async function trySend(to, subject, headline, bodyHtml) {
  if (!to) return;
  try {
    await sendRawEmail({
      to,
      subject: `[${BRAND}] ${subject}`,
      html: buildHtml(headline, bodyHtml),
      text: headline
    });
  } catch (err) {
    console.warn('[p2p-email] send failed:', err.message);
  }
}

function createP2PEmailService() {
  async function sendOrderCreated(sellerEmail, order) {
    await trySend(
      sellerEmail,
      `New P2P Order - ${order.reference || order.id}`,
      'You have a new buy order',
      `<p style="color:#374151;font-size:14px;line-height:1.6;">A buyer has placed an order. Be ready to release crypto once you verify payment in your account.</p>
      ${orderDetails(order)}
      <p style="color:#374151;font-size:13px;">Login to your ${BRAND} account to respond.</p>`
    );
  }

  async function sendOrderPaid(sellerEmail, order) {
    await trySend(
      sellerEmail,
      `Payment Sent - Order ${order.reference || order.id}`,
      'Buyer marked payment as sent',
      `<p style="color:#374151;font-size:14px;line-height:1.6;">The buyer has marked their payment as sent. Please verify your bank/UPI account before releasing crypto.</p>
      ${orderDetails(order)}
      <p style="color:#dc2626;font-size:13px;font-weight:600;">⚠️ Do NOT release until payment is confirmed in your account.</p>`
    );
  }

  async function sendOrderReleased(buyerEmail, order) {
    await trySend(
      buyerEmail,
      `Crypto Released - Order ${order.reference || order.id}`,
      'Your crypto has been released!',
      `<p style="color:#374151;font-size:14px;line-height:1.6;">The seller has released your crypto. Check your ${BRAND} wallet — your funds are available now.</p>
      ${orderDetails(order)}
      <p style="color:#059669;font-size:14px;font-weight:700;">✅ Order completed successfully.</p>`
    );
  }

  async function sendOrderCancelled(email, order) {
    await trySend(
      email,
      `Order Cancelled - ${order.reference || order.id}`,
      'Order has been cancelled',
      `<p style="color:#374151;font-size:14px;line-height:1.6;">Your P2P order has been cancelled. Any locked funds have been returned.</p>
      ${orderDetails(order)}`
    );
  }

  async function sendDisputeRaised(adminEmail, order, raisedBy) {
    await trySend(
      adminEmail,
      `Dispute Raised - Order ${order.reference || order.id}`,
      'P2P Dispute Requires Admin Review',
      `<p style="color:#374151;font-size:14px;line-height:1.6;"><strong>${esc(raisedBy)}</strong> has raised a dispute. Please review and resolve in the admin panel.</p>
      ${orderDetails(order)}
      <p style="color:#dc2626;font-size:13px;font-weight:600;">Action required: Login to admin panel → P2P → Disputes.</p>`
    );
  }

  return {
    sendOrderCreated,
    sendOrderPaid,
    sendOrderReleased,
    sendOrderCancelled,
    sendDisputeRaised
  };
}

module.exports = { createP2PEmailService };

// Standalone KYC email (not inside createP2PEmailService factory)
async function sendKycApprovedEmail(toEmail, username) {
  const BRAND = String(process.env.APP_NAME || 'BITEGIT').trim().toUpperCase();
  const BRAND_DARK = '#181a20';
  const BRAND_ACCENT = '#f0b90b';
  const html = `<!doctype html><html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:20px 12px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border:1px solid #e5e7eb;">
      <tr><td style="background:${BRAND_DARK};padding:18px 24px;font-size:26px;font-weight:800;color:${BRAND_ACCENT};">${BRAND}</td></tr>
      <tr><td style="padding:24px;">
        <h2 style="margin:0 0 12px;font-size:20px;color:#111;">KYC Verified ✅</h2>
        <p style="color:#374151;font-size:14px;line-height:1.6;">Hi <strong>${String(username||'').replace(/&/g,'&amp;').replace(/</g,'&lt;')}</strong>,</p>
        <p style="color:#374151;font-size:14px;line-height:1.6;">Your KYC verification has been <strong style="color:#16a34a;">approved</strong>. You can now place buy and sell orders on ${BRAND} P2P.</p>
        <div style="margin:20px 0;padding:16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;text-align:center;">
          <span style="font-size:24px;">✅</span><br/>
          <strong style="color:#16a34a;font-size:15px;">Identity Verified</strong>
        </div>
        <p style="margin:20px 0 0;font-size:12px;color:#9ca3af;">Automated message. Do not reply. &copy; ${new Date().getUTCFullYear()} ${BRAND}</p>
      </td></tr>
    </table>
  </td></tr>
</table></body></html>`;
  return sendRawEmail({ to: toEmail, subject: `KYC Approved — You can now trade on ${BRAND} P2P`, html });
}

async function sendKycRejectedEmail(toEmail, username, reason) {
  const BRAND = String(process.env.APP_NAME || 'BITEGIT').trim().toUpperCase();
  const BRAND_DARK = '#181a20';
  const BRAND_ACCENT = '#f0b90b';
  const safeReason = String(reason||'').replace(/&/g,'&amp;').replace(/</g,'&lt;');
  const safeUser = String(username||'').replace(/&/g,'&amp;').replace(/</g,'&lt;');
  const html = `<!doctype html><html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:20px 12px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border:1px solid #e5e7eb;">
      <tr><td style="background:${BRAND_DARK};padding:18px 24px;font-size:26px;font-weight:800;color:${BRAND_ACCENT};">${BRAND}</td></tr>
      <tr><td style="padding:24px;">
        <h2 style="margin:0 0 12px;font-size:20px;color:#111;">KYC Verification Update</h2>
        <p style="color:#374151;font-size:14px;line-height:1.6;">Hi <strong>${safeUser}</strong>,</p>
        <p style="color:#374151;font-size:14px;line-height:1.6;">Your KYC submission was <strong style="color:#dc2626;">not approved</strong> at this time.</p>
        ${safeReason ? `<div style="margin:16px 0;padding:14px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;"><strong style="color:#dc2626;">Reason:</strong><br/><span style="color:#374151;font-size:13px;">${safeReason}</span></div>` : ''}
        <p style="color:#374151;font-size:14px;line-height:1.6;">Please resubmit with correct documents in the app.</p>
        <p style="margin:20px 0 0;font-size:12px;color:#9ca3af;">Automated message. Do not reply. &copy; ${new Date().getUTCFullYear()} ${BRAND}</p>
      </td></tr>
    </table>
  </td></tr>
</table></body></html>`;
  return sendRawEmail({ to: toEmail, subject: `KYC Update — Action Required on ${BRAND} P2P`, html });
}

module.exports.sendKycApprovedEmail = sendKycApprovedEmail;
module.exports.sendKycRejectedEmail = sendKycRejectedEmail;
