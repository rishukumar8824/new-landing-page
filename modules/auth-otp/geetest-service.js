const crypto = require('crypto');

function createHttpError(statusCode, message, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function createGeetestService(config = {}) {
  const captchaId = String(config.captchaId || '').trim();
  const captchaKey = String(config.captchaKey || '').trim();
  const validateEndpoint = String(config.validateEndpoint || 'https://gcaptcha4.geetest.com/validate').trim();
  const timeoutMs = Math.max(2000, Number(config.timeoutMs) || 10000);

  async function verifyChallenge(challengePayload = {}) {
    if (!captchaId || !captchaKey) {
      throw createHttpError(503, 'Geetest captcha is not configured.', 'GEETEST_NOT_CONFIGURED');
    }

    const lotNumber = String(challengePayload.lot_number || '').trim();
    const captchaOutput = String(challengePayload.captcha_output || '').trim();
    const passToken = String(challengePayload.pass_token || '').trim();
    const genTime = String(challengePayload.gen_time || '').trim();

    if (!lotNumber || !captchaOutput || !passToken || !genTime) {
      throw createHttpError(400, 'Captcha verification payload is incomplete.', 'GEETEST_PAYLOAD_INVALID');
    }

    const signToken = crypto
      .createHash('sha256')
      .update(`${lotNumber}${captchaKey}`)
      .digest('hex');

    const form = new URLSearchParams({
      captcha_id: captchaId,
      lot_number: lotNumber,
      pass_token: passToken,
      gen_time: genTime,
      captcha_output: captchaOutput,
      sign_token: signToken
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    let response;
    try {
      response = await fetch(validateEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: form,
        signal: controller.signal
      });
    } catch (error) {
      const reason = String(error?.name || error?.message || '').toLowerCase().includes('abort')
        ? 'Captcha verification timed out.'
        : 'Captcha verification failed.';
      throw createHttpError(502, reason, 'GEETEST_REQUEST_FAILED');
    } finally {
      clearTimeout(timeout);
    }

    let decoded = null;
    try {
      decoded = await response.json();
    } catch (error) {
      throw createHttpError(502, 'Captcha provider returned invalid response.', 'GEETEST_RESPONSE_INVALID');
    }

    const ok = response.ok && String(decoded?.result || '').trim().toLowerCase() === 'success';
    if (!ok) {
      throw createHttpError(400, 'Captcha validation failed. Please retry.', 'GEETEST_VALIDATION_FAILED');
    }

    return {
      lotNumber,
      providerResponse: decoded
    };
  }

  return {
    isConfigured: Boolean(captchaId && captchaKey),
    captchaId,
    verifyChallenge
  };
}

module.exports = {
  createGeetestService
};
