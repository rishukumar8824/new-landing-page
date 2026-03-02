import * as TronWebPackage from 'tronweb';

const TronWeb = TronWebPackage.TronWeb || TronWebPackage.default?.TronWeb || TronWebPackage.default;

if (!TronWeb) {
  throw new Error('TronWeb dependency is not available');
}

export const TRON_MAINNET_RPC = 'https://api.trongrid.io';
export const USDT_TRC20_CONTRACT = 'TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj';

const TRON_PRIVATE_KEY = String(process.env.TRON_PRIVATE_KEY || '').trim();

export const tronWebClient = new TronWeb({
  fullHost: TRON_MAINNET_RPC,
  privateKey: TRON_PRIVATE_KEY || undefined
});

const formatTokenAmount = (rawValue, decimals) => {
  const base = 10n ** BigInt(decimals);
  const value = BigInt(String(rawValue || '0'));
  const whole = value / base;
  const fraction = value % base;

  if (fraction === 0n) {
    return whole.toString();
  }

  const padded = fraction.toString().padStart(decimals, '0');
  return `${whole.toString()}.${padded.replace(/0+$/, '')}`;
};

export const generateNewAddress = async () => {
  return tronWebClient.createAccount();
};

export const validateTronAddress = (address) => {
  return tronWebClient.isAddress(String(address || '').trim());
};

export const getUSDTBalance = async (address) => {
  const normalizedAddress = String(address || '').trim();
  if (!validateTronAddress(normalizedAddress)) {
    throw new Error('Invalid TRON address');
  }

  const contract = await tronWebClient.contract().at(USDT_TRC20_CONTRACT);
  const [balanceResult, decimalsResult] = await Promise.all([
    contract.balanceOf(normalizedAddress).call(),
    contract.decimals().call()
  ]);

  const rawBalance = String(balanceResult || '0');
  const decimals = Number.parseInt(String(decimalsResult || '6'), 10) || 6;

  return {
    address: normalizedAddress,
    token: 'USDT',
    contract: USDT_TRC20_CONTRACT,
    rawBalance,
    balance: formatTokenAmount(rawBalance, decimals),
    decimals
  };
};
