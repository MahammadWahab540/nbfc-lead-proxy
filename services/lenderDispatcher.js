/**
 * Lender Dispatcher & Adapters
 * Prepares auth headers and forwards payload to the corresponding lender endpoint.
 */

const { lendersConfig } = require('../config/lenders');

/**
 * Builds request options (headers, URL, method) according to lender's auth specification.
 */
function buildLenderRequest(lenderKey, config, payload) {
  // Strip proxy routing fields if passed in payload so lender doesn't get unexpected fields
  const cleanPayload = { ...payload };
  delete cleanPayload.lender;
  delete cleanPayload.nbfc;
  delete cleanPayload.partner;

  switch (lenderKey) {
    case 'TECHFINO': {
      const { username, password, apiKey } = config.credentials;
      const basicAuth = Buffer.from(`${username}:${password}`).toString('base64');

      return {
        url: config.apiUrl,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apiKey': apiKey,
          'Authorization': `Basic ${basicAuth}`
        },
        body: cleanPayload
      };
    }

    case 'AUXILO': {
      if (!config.apiUrl) {
        throw new Error('Auxilo API endpoint is not yet configured. Set the AUXILO_API_URL environment variable to enable Auxilo forwarding.');
      }

      const headers = {
        'Content-Type': 'application/json'
      };

      const { token, apiKey, username, password } = config.credentials;

      if (config.authType === 'BEARER' && token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else if (config.authType === 'API_KEY' && apiKey) {
        headers['x-api-key'] = apiKey;
      } else if (config.authType === 'BASIC' && username && password) {
        const basicAuth = Buffer.from(`${username}:${password}`).toString('base64');
        headers['Authorization'] = `Basic ${basicAuth}`;
      }

      return {
        url: config.apiUrl,
        method: 'POST',
        headers,
        body: cleanPayload
      };
    }

    default:
      throw new Error(`Unsupported lender adapter: ${lenderKey}`);
  }
}

/**
 * Dispatches lead payload to the target lender and relays the response.
 */
async function dispatchToLender(lenderKey, config, payload) {
  const reqDetails = buildLenderRequest(lenderKey, config, payload);
  const startTime = Date.now();

  console.log(`[Dispatcher -> ${lenderKey}] Sending lead request to ${reqDetails.url}`);

  const response = await fetch(reqDetails.url, {
    method: reqDetails.method,
    headers: reqDetails.headers,
    body: JSON.stringify(reqDetails.body)
  });

  const durationMs = Date.now() - startTime;
  console.log(`[Dispatcher <- ${lenderKey}] Response received: HTTP ${response.status} in ${durationMs}ms`);

  const responseText = await response.text();
  let parsedData;
  try {
    parsedData = JSON.parse(responseText);
  } catch {
    parsedData = { rawResponse: responseText };
  }

  return {
    status: response.status,
    data: parsedData,
    durationMs
  };
}

module.exports = {
  dispatchToLender
};
