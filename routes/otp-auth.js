const rateLimit = require('express-rate-limit');

function registerOtpAuthRoutes(app, {
  otpAuthService,
  setCookie,
  cookieNames,
  tokenService,
  isProduction,
  onLoginSuccess = null
}) {
  const sendOtpLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Too many requests. Please try again later.'
    }
  });

  const verifyOtpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Too many requests. Please try again later.'
    }
  });

  function sendError(res, error) {
    const statusCode = Number(error?.statusCode) || 500;
    const message = String(error?.message || 'Authentication error.');
    return res.status(statusCode).json({
      success: false,
      message,
      code: String(error?.code || 'AUTH_ERROR')
    });
  }

  async function safeOnLoginSuccess(payload) {
    if (typeof onLoginSuccess !== 'function') {
      return;
    }
    try {
      await onLoginSuccess(payload);
    } catch (error) {
      // Login-history hook should not block OTP auth success.
    }
  }

  app.get('/auth/geetest/config', async (req, res) => {
    try {
      if (!otpAuthService) {
        return res.status(503).json({
          success: false,
          message: 'Auth OTP service is not configured.'
        });
      }
      const config = otpAuthService.getGeetestConfig();
      return res.json({
        success: true,
        geetest: config
      });
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.post('/auth/send-otp', sendOtpLimiter, async (req, res) => {
    try {
      if (!otpAuthService) {
        return res.status(503).json({
          success: false,
          message: 'Auth OTP service is not configured.'
        });
      }

      const email = String(req.body?.email || '').trim().toLowerCase();
      const geetest = req.body?.geetest && typeof req.body.geetest === 'object'
        ? req.body.geetest
        : {
            lot_number: req.body?.lot_number,
            captcha_output: req.body?.captcha_output,
            pass_token: req.body?.pass_token,
            gen_time: req.body?.gen_time
          };

      const result = await otpAuthService.sendOtp({ email, geetest });
      return res.json(result);
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.post('/auth/verify-otp', verifyOtpLimiter, async (req, res) => {
    try {
      if (!otpAuthService) {
        return res.status(503).json({
          success: false,
          message: 'Auth OTP service is not configured.'
        });
      }

      const email = String(req.body?.email || '').trim().toLowerCase();
      const otp = String(req.body?.otp || '').trim();
      const result = await otpAuthService.verifyOtp({ email, otp });
      const ipAddress = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || String(req.ip || '');
      const userAgent = String(req.headers['user-agent'] || '').trim().slice(0, 1024);

      if (setCookie && cookieNames && tokenService) {
        setCookie(res, cookieNames.accessToken, result.tokenPair.accessToken, tokenService.ACCESS_TOKEN_TTL_SECONDS, {
          sameSite: 'Lax',
          secure: isProduction,
          httpOnly: true
        });
        setCookie(res, cookieNames.refreshToken, result.tokenPair.refreshToken, tokenService.REFRESH_TOKEN_TTL_SECONDS, {
          sameSite: 'Lax',
          secure: isProduction,
          httpOnly: true
        });
      }

      await safeOnLoginSuccess({
        user: {
          id: result.user.id,
          email: result.user.email,
          role: 'USER',
          username: String(result.user.email || '').split('@')[0]
        },
        ipAddress,
        userAgent
      });

      return res.json({
        success: true,
        message: result.message,
        user: result.user,
        accessToken: result.tokenPair.accessToken,
        refreshToken: result.tokenPair.refreshToken,
        accessTokenExpiresAt: result.tokenPair.accessTokenExpiresAt,
        refreshTokenExpiresAt: result.tokenPair.refreshTokenExpiresAt
      });
    } catch (error) {
      return sendError(res, error);
    }
  });
}

module.exports = {
  registerOtpAuthRoutes
};
