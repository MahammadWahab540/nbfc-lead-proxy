const express = require('express');
const { getLenderConfig, getSupportedLenders } = require('./config/lenders');
const { dispatchToLender } = require('./services/lenderDispatcher');

const app = express();
const PORT = process.env.PORT || 8080;

// Bearer Token for Salesforce authentication
const AUTH_BEARER_TOKEN = process.env.AUTH_BEARER_TOKEN || 'nxtwave_sf_lead_sec_7f9b8c2d1e04a6b8';

app.use(express.json({ limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> HTTP ${res.statusCode} (${duration}ms)`);
  });
  next();
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

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'nbfc-lead-proxy',
    uptime: process.uptime(),
    supportedLenders: getSupportedLenders(),
    timestamp: new Date().toISOString()
  });
});

// List supported lenders endpoint
app.get('/api/lenders', authenticateBearerToken, (req, res) => {
  res.status(200).json({
    success: true,
    lenders: getSupportedLenders()
  });
});

// Main router handler for lead creation
async function handleLeadCreation(req, res) {
  const payload = req.body;

  if (!payload || typeof payload !== 'object' || Object.keys(payload).length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Bad Request: Missing request body or empty payload.'
    });
  }

  // Detect lender from:
  // 1. URL Path param (e.g. /api/leads/auxilo)
  // 2. Payload field (lender / nbfc / partner)
  // 3. Query param (?lender=AUXILO)
  // 4. Header (X-Lender: AUXILO)
  // 5. Default fallback to 'TECHFINO'
  const lenderInput = req.params.lender ||
                      payload.lender ||
                      payload.nbfc ||
                      payload.partner ||
                      req.query.lender ||
                      req.headers['x-lender'] ||
                      'TECHFINO';

  const { key: lenderKey, config } = getLenderConfig(lenderInput);

  if (!config) {
    return res.status(400).json({
      success: false,
      error: `Unsupported lender: "${lenderInput}".`,
      supportedLenders: getSupportedLenders().map(l => l.id)
    });
  }

  console.log(`[Lead Request] Routing to Lender: ${lenderKey} (order_id: "${payload.order_id || 'N/A'}", mobile: "${payload.mobile_num || 'N/A'}")`);

  try {
    const { status, data, durationMs } = await dispatchToLender(lenderKey, config, payload);
    console.log(`[Lead Response] Relaying ${lenderKey} response (HTTP ${status}) back to Salesforce in ${durationMs}ms`);

    return res.status(status).json(data);

  } catch (error) {
    console.error(`[Lead Error] Error forwarding to ${lenderKey}:`, error.message);

    const statusCode = error.message.includes('not yet configured') ? 503 : 502;
    return res.status(statusCode).json({
      success: false,
      lender: lenderKey,
      error: error.message
    });
  }
}

// 1. Generic Lead Creation Endpoint (Lender determined from payload/query/header, defaults to TECHFINO)
app.post('/api/leads', authenticateBearerToken, handleLeadCreation);

// 2. Explicit Lender-specific Endpoint (e.g., /api/leads/techfino or /api/leads/auxilo)
app.post('/api/leads/:lender', authenticateBearerToken, handleLeadCreation);

// 3. Backward compatibility aliases
app.post('/api/v2/techfino/lead/create', authenticateBearerToken, (req, res) => {
  req.params.lender = 'TECHFINO';
  handleLeadCreation(req, res);
});
app.post('/webhook/salesforce/lead', authenticateBearerToken, handleLeadCreation);
app.post('/', authenticateBearerToken, handleLeadCreation);

app.listen(PORT, () => {
  console.log(`Multi-Lender Gateway listening on port ${PORT}`);
  console.log(`Supported Lenders:`, getSupportedLenders().map(l => `${l.id} (${l.configured ? 'READY' : 'PENDING_CONFIG'})`).join(', '));
});
