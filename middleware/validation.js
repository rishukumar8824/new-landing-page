const MONGO_OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

function sanitizeValue(input) {
  if (Array.isArray(input)) {
    return input.map((item) => sanitizeValue(item));
  }

  if (input && typeof input === 'object') {
    const cleaned = {};
    for (const [key, value] of Object.entries(input)) {
      if (!key || key.startsWith('$') || key.includes('.')) {
        continue;
      }
      cleaned[key] = sanitizeValue(value);
    }
    return cleaned;
  }

  return input;
}

function sanitizeRequestPayload(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeValue(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeValue(req.params);
  }
  return next();
}

function readField(req, source, field) {
  const bucket = req[source];
  if (!bucket || typeof bucket !== 'object') {
    return '';
  }
  return bucket[field];
}

function validationRules() {
  return {
    required(field, source = 'body', label = field) {
      return (req) => {
        const value = readField(req, source, field);
        const normalized = typeof value === 'string' ? value.trim() : value;
        if (normalized === undefined || normalized === null || normalized === '') {
          return `${label} is required.`;
        }
        return null;
      };
    },

    email(field, source = 'body', label = field) {
      return (req) => {
        const value = String(readField(req, source, field) || '')
          .trim()
          .toLowerCase();
        if (!value) {
          return `${label} is required.`;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return `${label} must be a valid email.`;
        }
        return null;
      };
    },

    amount(field, source = 'body', label = field) {
      return (req) => {
        const value = Number(readField(req, source, field));
        if (!Number.isFinite(value) || value <= 0) {
          return `${label} must be greater than 0.`;
        }
        return null;
      };
    },

    mongoObjectId(field, source = 'params', label = field) {
      return (req) => {
        const value = String(readField(req, source, field) || '').trim();
        if (!value) {
          return `${label} is required.`;
        }
        if (!MONGO_OBJECT_ID_REGEX.test(value)) {
          return `${label} must be a valid Mongo ObjectId.`;
        }
        return null;
      };
    }
  };
}

function validateRequest(rules = []) {
  return (req, res, next) => {
    const errors = [];
    for (const rule of rules) {
      if (typeof rule !== 'function') {
        continue;
      }
      const error = rule(req);
      if (error) {
        errors.push(error);
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        message: 'Validation failed.',
        errors
      });
    }

    return next();
  };
}

module.exports = {
  sanitizeRequestPayload,
  validateRequest,
  validationRules,
  MONGO_OBJECT_ID_REGEX
};
