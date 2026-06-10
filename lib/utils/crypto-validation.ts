/**
 * Validates Bitcoin address format
 * Bitcoin addresses can be:
 * - Legacy (P2PKH): starts with 1, 26-35 characters
 * - Segwit (P2SH): starts with 3, 26-35 characters
 * - Bech32 (P2WPKH): starts with bc1, 42-62 characters
 */
export function validateBitcoinAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false;
  
  const trimmed = address.trim();
  
  // Legacy address (P2PKH): starts with 1
  if (/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(trimmed)) {
    return true;
  }
  
  // Bech32 address (P2WPKH/P2WSH): starts with bc1
  if (/^bc1[a-z0-9]{39,59}$/.test(trimmed)) {
    return true;
  }
  
  return false;
}

/**
 * Validates Ethereum address format
 * Ethereum addresses are 40 hex characters (excluding 0x prefix) = 42 characters total
 */
export function validateEthereumAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false;
  
  const trimmed = address.trim();
  
  // Must start with 0x and be 42 characters total (0x + 40 hex chars)
  if (/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
    return true;
  }
  
  return false;
}

/**
 * Validates Litecoin address format
 * Litecoin addresses can be:
 * - Legacy (P2PKH): starts with L, 26-35 characters
 * - Segwit (P2SH): starts with M, 26-35 characters
 * - Bech32 (P2WPKH): starts with ltc1, 42-62 characters
 */
export function validateLitecoinAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false;
  
  const trimmed = address.trim();
  
  // Legacy address (P2PKH): starts with L
  if (/^L[a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(trimmed)) {
    return true;
  }
  
  // Segwit address (P2SH): starts with M
  if (/^M[a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(trimmed)) {
    return true;
  }
  
  // Bech32 address (P2WPKH/P2WSH): starts with ltc1
  if (/^ltc1[a-z0-9]{39,59}$/.test(trimmed)) {
    return true;
  }
  
  return false;
}

/**
 * Validates if a cryptocurrency address is valid
 * @param address - The cryptocurrency address to validate
 * @param cryptoType - The type of cryptocurrency ('bitcoin' | 'ethereum' | 'litecoin')
 * @returns true if the address is valid, false otherwise
 */
export function validateCryptoAddress(
  address: string | undefined | null,
  cryptoType: 'bitcoin' | 'ethereum' | 'litecoin'
): boolean {
  if (!address) return false;
  
  switch (cryptoType) {
    case 'bitcoin':
      return validateBitcoinAddress(address);
    case 'ethereum':
      return validateEthereumAddress(address);
    case 'litecoin':
      return validateLitecoinAddress(address);
    default:
      return false;
  }
}

/**
 * Checks if user has any valid cryptocurrency addresses
 * @param cryptoAddresses - User's cryptocurrency addresses
 * @returns Object with validation results and first valid address type
 */
export function validateUserCryptoAddresses(cryptoAddresses?: {
  bitcoin?: string;
  ethereum?: string;
  litecoin?: string;
}): {
  hasAddress: boolean;
  hasValidAddress: boolean;
  firstValidType: 'bitcoin' | 'ethereum' | 'litecoin' | null;
  validationResults: {
    bitcoin?: { address: string; isValid: boolean };
    ethereum?: { address: string; isValid: boolean };
    litecoin?: { address: string; isValid: boolean };
  };
} {
  if (!cryptoAddresses) {
    return {
      hasAddress: false,
      hasValidAddress: false,
      firstValidType: null,
      validationResults: {},
    };
  }

  const results: {
    bitcoin?: { address: string; isValid: boolean };
    ethereum?: { address: string; isValid: boolean };
    litecoin?: { address: string; isValid: boolean };
  } = {};

  let hasAddress = false;
  let hasValidAddress = false;
  let firstValidType: 'bitcoin' | 'ethereum' | 'litecoin' | null = null;

  // Check Bitcoin
  if (cryptoAddresses.bitcoin) {
    hasAddress = true;
    const isValid = validateBitcoinAddress(cryptoAddresses.bitcoin);
    results.bitcoin = { address: cryptoAddresses.bitcoin, isValid };
    if (isValid && !hasValidAddress) {
      hasValidAddress = true;
      firstValidType = 'bitcoin';
    }
  }

  // Check Ethereum
  if (cryptoAddresses.ethereum) {
    hasAddress = true;
    const isValid = validateEthereumAddress(cryptoAddresses.ethereum);
    results.ethereum = { address: cryptoAddresses.ethereum, isValid };
    if (isValid && !hasValidAddress) {
      hasValidAddress = true;
      firstValidType = 'ethereum';
    }
  }

  // Check Litecoin
  if (cryptoAddresses.litecoin) {
    hasAddress = true;
    const isValid = validateLitecoinAddress(cryptoAddresses.litecoin);
    results.litecoin = { address: cryptoAddresses.litecoin, isValid };
    if (isValid && !hasValidAddress) {
      hasValidAddress = true;
      firstValidType = 'litecoin';
    }
  }

  return {
    hasAddress,
    hasValidAddress,
    firstValidType,
    validationResults: results,
  };
}

