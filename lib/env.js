const fs = require('fs');
const path = require('path');

function normalizeValue(raw) {
  const value = String(raw || '').trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1).replace(/\\n/g, '\n');
  }
  return value;
}

function loadEnvFile(filePath = path.join(process.cwd(), '.env'), options = {}) {
  const override = options.override === true;
  if (!fs.existsSync(filePath)) {
    return { loaded: false, path: filePath, count: 0 };
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split(/\r?\n/);
  let count = 0;

  for (const line of lines) {
    const trimmed = String(line || '').trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, eqIndex).trim();
    if (!key) {
      continue;
    }

    if (!override && process.env[key] !== undefined) {
      continue;
    }

    const value = normalizeValue(trimmed.slice(eqIndex + 1));
    process.env[key] = value;
    count += 1;
  }

  return { loaded: true, path: filePath, count };
}

module.exports = {
  loadEnvFile
};
