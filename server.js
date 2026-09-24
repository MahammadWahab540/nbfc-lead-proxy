const express = require('express');

const app = express();
const PORT = process.env.PORT || 8080;

// Configuration from environment variables with fallbacks
const AUTH_BEARER_TOKEN = process.env.AUTH_BEARER_TOKEN || 'nxtwave_sf_lead_sec_7f9b8c2d1e04a6b8';
const TECHFINO_API_URL = process.env.TECHFINO_API_URL || 'https://api.techfino.in/api/v2/techfino/lead/create';
const TECHFINO_USERNAME = process.env.TECHFINO_USERNAME || 'NxtWave_Disruptive';
const TECHFINO_PASSWORD = process.env.TECHFINO_PASSWORD || 'SwUMythn9xSrvDKv8Uct6rcSzYtIc9Q0LV0xW59Jl3ZHPdOTc2';
const TECHFINO_API_KEY = process.env.TECHFINO_API_KEY || 'DWMoesFmwHqiAukv2XPAAfEh1J8e2GMd6WijCVKUIFMNzpdBAq';

app.use(express.json({ limit: '10mb' }));

// Request logger middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'salesforce-techfino-lead-proxy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Bearer Token Authentication Middleware
function authenticateBearerToken(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Authorization header is required.'
    });
  }

  const parts = authHeader.trim().split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Malformed Authorization header. Expected "Bearer <token>".'
    });
  }

  const token = parts[1];
  if (token !== AUTH_BEARER_TOKEN) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: Invalid Bearer token.'
    });
  }

  next();
}

// Handler for forwarding lead payload to TechFino
async function handleLeadCreation(req, res) {
  const payload = req.body;

  if (!payload || Object.keys(payload).length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Bad Request: Missing request body or empty payload.'
    });
  }

  console.log(`[TechFino Forwarder] Received payload for order_id: "${payload.order_id || 'N/A'}", mobile: "${payload.mobile_num || 'N/A'}"`);

  // Prepare Basic Auth credentials
  const basicAuthCredentials = Buffer.from(`${TECHFINO_USERNAME}:${TECHFINO_PASSWORD}`).toString('base64');

  const headers = {
    'Content-Type': 'application/json',
    'apiKey': TECHFINO_API_KEY,
    'Authorization': `Basic ${basicAuthCredentials}`
  };

  const startTime = Date.now();

  try {
    const techfinoResponse = await fetch(TECHFINO_API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    const elapsed = Date.now() - startTime;
    console.log(`[TechFino Forwarder] TechFino responded with HTTP ${techfinoResponse.status} in ${elapsed}ms`);

    // Parse response
    let responseData;
    const responseText = await techfinoResponse.text();

    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { rawResponse: responseText };
    }

    console.log(`[TechFino Forwarder] Response forwarded to Salesforce:`, JSON.stringify(responseData));

    // Return the response back to Salesforce
    return res.status(techfinoResponse.status).json(responseData);

  } catch (error) {
    console.error(`[TechFino Forwarder] Error forwarding request to TechFino:`, error);
    return res.status(502).json({
      success: false,
      error: 'Bad Gateway: Failed to communicate with TechFino API',
      message: error.message
    });
  }
}

// Register endpoints: supports /api/leads, /api/v2/techfino/lead/create, and /
app.post('/api/leads', authenticateBearerToken, handleLeadCreation);
app.post('/api/v2/techfino/lead/create', authenticateBearerToken, handleLeadCreation);
app.post('/webhook/salesforce/lead', authenticateBearerToken, handleLeadCreation);
app.post('/', authenticateBearerToken, handleLeadCreation);

app.listen(PORT, () => {
  console.log(`Salesforce-TechFino Lead Proxy listening on port ${PORT}`);
});
