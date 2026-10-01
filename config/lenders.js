/**
 * Lender / NBFC Configuration Registry
 * 
 * Config-driven architecture supporting:
 * - TECHFINO (TechFino Capital Private Limited)
 * - JODO_FLEX (Jodo Flex - Jodo Pay)
 * - AUXILO (Auxilo Finserve Private Limited)
 */

const lendersConfig = {
  TECHFINO: {
    id: 'TECHFINO',
    name: 'TechFino Capital Private Limited',
    enabled: true,
    apiUrl: process.env.TECHFINO_API_URL || 'https://api.techfino.in/api/v2/techfino/lead/create',
    authType: 'BASIC_AND_APIKEY',
    credentials: {
      username: process.env.TECHFINO_USERNAME || 'NxtWave_Disruptive',
      password: process.env.TECHFINO_PASSWORD || 'SwUMythn9xSrvDKv8Uct6rcSzYtIc9Q0LV0xW59Jl3ZHPdOTc2',
      apiKey: process.env.TECHFINO_API_KEY || 'DWMoesFmwHqiAukv2XPAAfEh1J8e2GMd6WijCVKUIFMNzpdBAq'
    }
  },

  JODO_FLEX: {
    id: 'JODO_FLEX',
    name: 'Jodo Flex (Jodo Pay)',
    enabled: true,
    apiUrl: process.env.JODO_BASE_URL || 'https://ext.jodo.in',
    authUrl: process.env.JODO_AUTH_URL || 'https://api.jodo.in',
    customerUrl: process.env.JODO_CUSTOMER_URL || 'https://app.jodo.in',
    authType: 'BASIC',
    credentials: {
      clientKey: process.env.JODO_CLIENT_KEY || '3c0b31e987f1',
      clientSecret: process.env.JODO_CLIENT_SECRET || '0a4b0b3a-def6-4ae8-9ced-b66175a4c45f',
      slug: process.env.JODO_SLUG || 'nxtwave'
    }
  },

  AUXILO: {
    id: 'AUXILO',
    name: 'Auxilo Finserve Private Limited',
    enabled: true,
    apiUrl: process.env.AUXILO_API_URL || '',
    authType: process.env.AUXILO_AUTH_TYPE || 'BEARER',
    credentials: {
      token: process.env.AUXILO_API_TOKEN || '',
      apiKey: process.env.AUXILO_API_KEY || '',
      username: process.env.AUXILO_USERNAME || '',
      password: process.env.AUXILO_PASSWORD || ''
    }
  }
};

/**
 * Normalizes and looks up lender configuration by name or alias.
 * Defaults to TECHFINO if none provided.
 */
function getLenderConfig(lenderInput) {
  if (!lenderInput) {
    return { key: 'TECHFINO', config: lendersConfig.TECHFINO };
  }

  const normalized = lenderInput.toString().trim().toUpperCase().replace(/[^A-Z0-9]/g, '_');

  // Alias mappings
  const aliases = {
    'TECHFINO': 'TECHFINO',
    'TECH_FINO': 'TECHFINO',
    'JODO': 'JODO_FLEX',
    'JODO_FLEX': 'JODO_FLEX',
    'JODOFLEX': 'JODO_FLEX',
    'AUXILO': 'AUXILO',
    'AUXILO_FINSERVE': 'AUXILO'
  };

  const matchedKey = aliases[normalized] || normalized;

  if (lendersConfig[matchedKey]) {
    return { key: matchedKey, config: lendersConfig[matchedKey] };
  }

  return { key: null, config: null };
}

/**
 * Returns summary of all registered lenders and their config status
 */
function getSupportedLenders() {
  return Object.keys(lendersConfig).map(key => {
    const lender = lendersConfig[key];
    const isConfigured = Boolean(lender.apiUrl);
    return {
      id: lender.id,
      name: lender.name,
      configured: isConfigured,
      authType: lender.authType
    };
  });
}

module.exports = {
  lendersConfig,
  getLenderConfig,
  getSupportedLenders
};
