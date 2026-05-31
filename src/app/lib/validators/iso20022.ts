/**
 * ISO 20022 Data Validator
 * Validates financial data structures for compliance
 * 
 * Compliance: ISO 20022 Universal Financial Industry Message Scheme
 * Standards: ISO 4217 (Currency Codes), ISO 8601 (Timestamps)
 */

export interface FinancialData {
  amount: number;
  currency: string;
  transactionId?: string;
  timestamp?: string;
  description?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  standard: string;
  timestamp: string;
}

// ISO 4217 Currency Codes (commonly used)
const ISO_4217_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'SEK', 'NZD',
  'MXN', 'SGD', 'HKD', 'NOK', 'KRW', 'TRY', 'RUB', 'INR', 'BRL', 'ZAR',
  'DKK', 'PLN', 'TWD', 'THB', 'MYR', 'IDR', 'HUF', 'CZK', 'ILS', 'CLP',
  'PHP', 'AED', 'COP', 'SAR', 'RON', 'VND', 'ARS', 'EGP', 'PKR', 'BDT'
];

/**
 * Validate financial data according to ISO 20022 standards
 */
export function validateISO20022(data: FinancialData): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Amount validation
  if (!validateAmount(data.amount, errors, warnings)) {
    // Errors already added
  }

  // Currency validation (ISO 4217)
  if (!validateCurrency(data.currency, errors, warnings)) {
    // Errors already added
  }

  // Transaction ID validation (if provided)
  if (data.transactionId && !validateTransactionId(data.transactionId, errors, warnings)) {
    // Errors already added
  }

  // Timestamp validation (ISO 8601 if provided)
  if (data.timestamp && !validateTimestamp(data.timestamp, errors, warnings)) {
    // Errors already added
  }

  // Description validation
  if (data.description && !validateDescription(data.description, errors, warnings)) {
    // Errors already added
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    standard: 'ISO 20022',
    timestamp: new Date().toISOString()
  };
}

/**
 * Validate amount field
 */
function validateAmount(amount: number, errors: string[], warnings: string[]): boolean {
  let isValid = true;

  // Must be a number
  if (!Number.isFinite(amount)) {
    errors.push('Amount must be a valid number');
    isValid = false;
  }

  // Must be non-negative
  if (amount < 0) {
    errors.push('Amount must be non-negative');
    isValid = false;
  }

  // Check decimal precision (max 2 decimal places for most currencies)
  const decimals = (amount.toString().split('.')[1] || '').length;
  if (decimals > 2) {
    errors.push('Amount exceeds maximum precision (2 decimal places)');
    isValid = false;
  }

  // Warning for very large amounts
  if (amount > 1000000000) {
    warnings.push('Amount exceeds $1 billion - verify this is correct');
  }

  // Warning for zero amounts
  if (amount === 0) {
    warnings.push('Amount is zero - this may indicate a test transaction');
  }

  return isValid;
}

/**
 * Validate currency code (ISO 4217)
 */
function validateCurrency(currency: string, errors: string[], warnings: string[]): boolean {
  let isValid = true;

  // Must be a string
  if (typeof currency !== 'string') {
    errors.push('Currency must be a string');
    return false;
  }

  // Must be 3 characters
  if (currency.length !== 3) {
    errors.push('Currency code must be 3 characters (ISO 4217)');
    isValid = false;
  }

  // Must be uppercase
  const upperCurrency = currency.toUpperCase();
  if (currency !== upperCurrency) {
    warnings.push('Currency code should be uppercase');
  }

  // Must be valid ISO 4217 code
  if (!ISO_4217_CURRENCIES.includes(upperCurrency)) {
    errors.push(`Invalid currency code: ${currency} (not in ISO 4217)`);
    isValid = false;
  }

  return isValid;
}

/**
 * Validate transaction ID
 */
function validateTransactionId(transactionId: string, errors: string[], warnings: string[]): boolean {
  let isValid = true;

  // Must be a string
  if (typeof transactionId !== 'string') {
    errors.push('Transaction ID must be a string');
    return false;
  }

  // Must not be empty
  if (transactionId.trim().length === 0) {
    errors.push('Transaction ID cannot be empty');
    isValid = false;
  }

  // Recommended: UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(transactionId)) {
    warnings.push('Transaction ID should be in UUID format for best practices');
  }

  // Maximum length check
  if (transactionId.length > 100) {
    errors.push('Transaction ID exceeds maximum length (100 characters)');
    isValid = false;
  }

  return isValid;
}

/**
 * Validate timestamp (ISO 8601)
 */
function validateTimestamp(timestamp: string, errors: string[], warnings: string[]): boolean {
  let isValid = true;

  // Must be a string
  if (typeof timestamp !== 'string') {
    errors.push('Timestamp must be a string');
    return false;
  }

  // Try to parse as date
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) {
    errors.push('Timestamp is not a valid ISO 8601 date');
    isValid = false;
  }

  // Check if in future
  if (date > new Date()) {
    warnings.push('Timestamp is in the future');
  }

  // Check if too old (more than 10 years)
  const tenYearsAgo = new Date();
  tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
  if (date < tenYearsAgo) {
    warnings.push('Timestamp is more than 10 years old');
  }

  return isValid;
}

/**
 * Validate description field
 */
function validateDescription(description: string, errors: string[], warnings: string[]): boolean {
  let isValid = true;

  // Maximum length check (ISO 20022 recommends 140 characters)
  if (description.length > 140) {
    warnings.push('Description exceeds recommended length (140 characters)');
  }

  // Check for special characters that may cause issues
  const invalidChars = /[<>&"']/g;
  if (invalidChars.test(description)) {
    warnings.push('Description contains special characters that may need encoding');
  }

  return isValid;
}

/**
 * Format amount for display (with proper decimal places)
 */
export function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Validate batch of financial transactions
 */
export function validateBatch(transactions: FinancialData[]): {
  totalTransactions: number;
  validTransactions: number;
  invalidTransactions: number;
  results: ValidationResult[];
} {
  const results = transactions.map(tx => validateISO20022(tx));
  
  return {
    totalTransactions: transactions.length,
    validTransactions: results.filter(r => r.isValid).length,
    invalidTransactions: results.filter(r => !r.isValid).length,
    results
  };
}
