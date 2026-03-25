function createHttpError(status, message, code = 'ERROR', details = null) {
  const error = new Error(message);
  error.status = Number(status) || 500;
  error.code = String(code || 'ERROR');
  if (details !== null && details !== undefined) {
    error.details = details;
  }
  return error;
}

function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function apiNotFoundHandler(req, res, next) {
  if (String(req.path || '').startsWith('/api/')) {
    return res.status(404).json({
      message: 'API route not found.',
      code: 'ROUTE_NOT_FOUND'
    });
  }
  return next();
}

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const isProduction = String(process.env.NODE_ENV || '').trim().toLowerCase() === 'production';
  const status = Number(err?.status || err?.statusCode || 500);
  const safeStatus = Number.isFinite(status) && status >= 400 && status < 600 ? status : 500;
  const isServerError = safeStatus >= 500;

  const response = {
    message: isServerError ? 'Internal server error.' : String(err?.message || 'Request failed.'),
    code: String(err?.code || (isServerError ? 'INTERNAL_ERROR' : 'REQUEST_ERROR'))
  };

  if (!isProduction) {
    response.debug = {
      stack: String(err?.stack || ''),
      details: err?.details || null
    };
  } else if (!isServerError && err?.details) {
    response.details = err.details;
  }

  return res.status(safeStatus).json(response);
}

module.exports = {
  createHttpError,
  asyncHandler,
  apiNotFoundHandler,
  errorHandler
};
