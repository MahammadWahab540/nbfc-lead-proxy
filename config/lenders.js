/**
 * Lender / NBFC Configuration Registry
 * 
 * To add a new lender (e.g., PROPELLD, LIQUILOANS, AVANSE), simply add
 * an entry here with its API endpoint, authentication type, and credential mapping.
 */

const lendersConfig = {
  TECHFINO: {
    id: 'TECHFINO',
    name: 'TechFino Capital Private Limited',
    enabled: true,
    apiUrl: process.env.TECHFINO_API_URL || 'https://api.techfino.in/api/v2/techfino/lead/create',
    authType: 'BASIC_AND_APIKEY', // Requires Basic Auth + apiKey header
    credentials: {
      username: process.env.TECHFINO_USERNAME || 'NxtWave_Disruptive',
      password: process.env.TECHFINO_PASSWORD || 'SwUMythn9xSrvDKv8Uct6rcSzYtIc9Q0LV0xW59Jl3ZHPdOTc2',
      apiKey: process.env.TECHFINO_API_KEY || 'DWMoesFmwHqiAukv2XPAAfEh1J8e2GMd6WijCVKUIFMNzpdBAq'
    }
  },

  AUXILO: {
    id: 'AUXILO',
    name: 'Auxilo Finserve Private Limited',
    enabled: true,
    apiUrl: process.env.AUXILO_API_URL || '',
    authType: process.env.AUXILO_AUTH_TYPE || 'BEARER', // Options: BEARER, API_KEY, BASIC
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

  const normalized = lenderInput.toString().trim().toUpperCase();

  // Alias mappings
  const aliases = {
    'TECHFINO': 'TECHFINO',
    'TECH_FINO': 'TECHFINO',
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
