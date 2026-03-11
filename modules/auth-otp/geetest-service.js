const crypto = require('crypto');

function createHttpError(statusCode, message, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function toInt(value, fallback) {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBase64Url(input) {
  return Buffer.from(input, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromBase64Url(input) {
  const padded = String(input || '')
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(String(input || '').length / 4) * 4, '=');
  return Buffer.from(padded, 'base64').toString('utf8');
}

function hashText(value) {
  const text = String(value || '').trim();
  if (!text) {
    return '';
  }
  return crypto.createHash('sha256').update(text).digest('hex');
}

function createGeetestService(config = {}) {
  const captchaId = String(config.captchaId || '').trim();
  const captchaKey = String(config.captchaKey || '').trim();
  const validateEndpoint = String(config.validateEndpoint || 'https://gcaptcha4.geetest.com/validate').trim();
  const timeoutMs = Math.max(2000, toInt(config.timeoutMs, 10000));

  const sliderFallbackEnabled = config.sliderFallbackEnabled !== false;
  const sliderFallbackTtlMs = Math.max(30 * 1000, toInt(config.sliderFallbackTtlMs, 2 * 60 * 1000));
  const sliderFallbackTolerance = Math.max(1, toInt(config.sliderFallbackTolerance, 4));
  const sliderFallbackSecret =
    String(config.sliderFallbackSecret || captchaKey || '').trim() || crypto.randomBytes(32).toString('hex');

  const hasGeetestConfig = Boolean(captchaId && captchaKey);

  function signSliderToken(serializedPayload) {
    return crypto.createHmac('sha256', sliderFallbackSecret).update(serializedPayload).digest('hex');
  }

  function createSliderToken(payload) {
    const serialized = toBase64Url(JSON.stringify(payload));
    const signature = signSliderToken(serialized);
    return `${serialized}.${signature}`;
  }

  function parseSliderToken(token) {
    const [serialized, signature] = String(token || '').trim().split('.');
    if (!serialized || !signature) {
      throw createHttpError(400, 'Slider challenge token is invalid.', 'SLIDER_TOKEN_INVALID');
    }

    const expectedSignature = signSliderToken(serialized);
    const signatureBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      throw createHttpError(400, 'Slider challenge token is invalid.', 'SLIDER_TOKEN_INVALID');
    }

    let payload;
    try {
      payload = JSON.parse(fromBase64Url(serialized));
    } catch (error) {
      throw createHttpError(400, 'Slider challenge token is invalid.', 'SLIDER_TOKEN_INVALID');
    }

    return payload;
  }

  function createSliderChallenge(context = {}) {
    if (!sliderFallbackEnabled) {
      throw createHttpError(503, 'Slider captcha fallback is disabled.', 'SLIDER_DISABLED');
    }

    const minPosition = 0;
    const maxPosition = 100;
    const challengeId = crypto.randomBytes(12).toString('hex');
    const targetPosition = crypto.randomInt(12, 89);
    const now = Date.now();

    const payload = {
      cid: challengeId,
      target: targetPosition,
      min: minPosition,
      max: maxPosition,
      iat: now,
      exp: now + sliderFallbackTtlMs,
      ipHash: hashText(context.ipAddress),
      uaHash: hashText(context.userAgent)
    };

    return {
      fallbackType: 'slider',
      challengeId,
      token: createSliderToken(payload),
      minPosition,
      maxPosition,
      targetPosition,
      tolerance: sliderFallbackTolerance,
      expiresInSeconds: Math.floor(sliderFallbackTtlMs / 1000)
    };
  }

  function verifySliderChallenge(challengePayload = {}, context = {}) {
    if (!sliderFallbackEnabled) {
      throw createHttpError(503, 'Slider captcha fallback is disabled.', 'SLIDER_DISABLED');
    }

    const challengeId = String(challengePayload.challenge_id || challengePayload.challengeId || '').trim();
    const token = String(challengePayload.token || challengePayload.challenge_token || '').trim();
    const position = Number(challengePayload.position);

    if (!challengeId || !token || !Number.isFinite(position)) {
      throw createHttpError(400, 'Slider captcha payload is incomplete.', 'SLIDER_PAYLOAD_INVALID');
    }

    const tokenPayload = parseSliderToken(token);
    if (String(tokenPayload?.cid || '') !== challengeId) {
      throw createHttpError(400, 'Slider challenge mismatch. Please try again.', 'SLIDER_CHALLENGE_MISMATCH');
    }

    const expiresAt = Number(tokenPayload?.exp || 0);
    if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) {
      throw createHttpError(400, 'Captcha challenge expired. Please retry.', 'SLIDER_EXPIRED');
    }

    const tokenIpHash = String(tokenPayload?.ipHash || '');
    const tokenUaHash = String(tokenPayload?.uaHash || '');
    const requestIpHash = hashText(context.ipAddress);
    const requestUaHash = hashText(context.userAgent);

    if (tokenIpHash && requestIpHash && tokenIpHash !== requestIpHash) {
      throw createHttpError(400, 'Captcha request mismatch. Please retry.', 'SLIDER_CONTEXT_MISMATCH');
    }
    if (tokenUaHash && requestUaHash && tokenUaHash !== requestUaHash) {
      throw createHttpError(400, 'Captcha request mismatch. Please retry.', 'SLIDER_CONTEXT_MISMATCH');
    }

    const minPosition = Number(tokenPayload?.min);
    const maxPosition = Number(tokenPayload?.max);
    const targetPosition = Number(tokenPayload?.target);

    if (!Number.isFinite(minPosition) || !Number.isFinite(maxPosition) || !Number.isFinite(targetPosition)) {
      throw createHttpError(400, 'Slider challenge token is invalid.', 'SLIDER_TOKEN_INVALID');
    }

    if (position < minPosition || position > maxPosition) {
      throw createHttpError(400, 'Slider position is out of range.', 'SLIDER_POSITION_INVALID');
    }

    const distance = Math.abs(position - targetPosition);
    if (distance > sliderFallbackTolerance) {
      throw createHttpError(400, 'Slider verification failed. Please align and retry.', 'SLIDER_VALIDATION_FAILED');
    }

    return {
      provider: 'slider',
      challengeId,
      position,
      targetPosition,
      tolerance: sliderFallbackTolerance
    };
  }

  async function verifyGeetestChallenge(challengePayload = {}) {
    if (!hasGeetestConfig) {
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
      provider: 'geetest',
      lotNumber,
      providerResponse: decoded
    };
  }

  async function verifyChallenge(challengePayload = {}, context = {}) {
    const fallbackType = String(challengePayload.fallback_type || challengePayload.type || '').trim().toLowerCase();
    const hasSliderPayload = Boolean(
      challengePayload.challenge_id || challengePayload.challengeId || challengePayload.token || challengePayload.position
    );

    if (fallbackType === 'slider' || (hasSliderPayload && (!hasGeetestConfig || !challengePayload.lot_number))) {
      return verifySliderChallenge(challengePayload, context);
    }

    if (hasGeetestConfig) {
      return verifyGeetestChallenge(challengePayload);
    }

    if (sliderFallbackEnabled) {
      throw createHttpError(400, 'Captcha verification is required.', 'CAPTCHA_REQUIRED');
    }

    throw createHttpError(503, 'Captcha service is not configured.', 'CAPTCHA_NOT_CONFIGURED');
  }

  function getPublicConfig() {
    return {
      captchaId,
      isConfigured: hasGeetestConfig,
      sliderFallbackEnabled
    };
  }

  return {
    isConfigured: hasGeetestConfig,
    captchaId,
    verifyChallenge,
    createSliderChallenge,
    getPublicConfig
  };
}

module.exports = {
  createGeetestService
};
