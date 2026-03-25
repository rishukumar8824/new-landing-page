const TronWeb = require('tronweb');
require('dotenv').config();

const PRIVATE_KEY = process.env.TRON_PRIVATE_KEY || process.env.PRIVATE_KEY;
const USDT_CONTRACT_ADDRESS = 'TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj';

if (!PRIVATE_KEY) {
  throw new Error('Missing TRON_PRIVATE_KEY (or PRIVATE_KEY) in .env');
}

const tronWeb = new TronWeb({
  fullHost: 'https://api.trongrid.io',
  privateKey: PRIVATE_KEY,
});

function validateTronAddress(address) {
  return tronWeb.isAddress(address);
}

async function generateNewAddress() {
  return tronWeb.createAccount();
}

function formatTokenAmount(rawValue, decimals) {
  const raw = BigInt(rawValue);
  const scale = 10n ** BigInt(decimals);
  const whole = raw / scale;
  const fraction = raw % scale;

  if (fraction === 0n) {
    return whole.toString();
  }

  const padded = fraction.toString().padStart(decimals, '0');
  const trimmed = padded.replace(/0+$/, '');
  return `${whole.toString()}.${trimmed}`;
}

async function getUSDTBalance(address) {
  if (!validateTronAddress(address)) {
    throw new Error('Invalid TRON address');
  }

  const contract = await tronWeb.contract().at(USDT_CONTRACT_ADDRESS);
  const [balanceResult, decimalsResult] = await Promise.all([
    contract.balanceOf(address).call(),
    contract.decimals().call(),
  ]);

  const rawBalance = balanceResult.toString();
  const decimals = Number(decimalsResult.toString());

  return {
    raw: rawBalance,
    formatted: formatTokenAmount(rawBalance, decimals),
    decimals,
  };
}

module.exports = {
  generateNewAddress,
  getUSDTBalance,
  validateTronAddress,
};
