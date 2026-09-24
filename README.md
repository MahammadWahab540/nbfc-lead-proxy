# Salesforce to Multi-Lender (NBFC) Gateway

A config-driven middleware gateway hosted on Google Cloud Run that receives lead payloads from Salesforce via Bearer token authentication, dynamically routes them to the appropriate NBFC/Lender (e.g. **TechFino**, **Auxilo**), and synchronously relays the response back to Salesforce.

---

## Live Production Endpoint

- **Base URL:** `https://techfino-lead-proxy-691340529229.asia-southeast1.run.app`
- **Dynamic Routing Endpoint:** `POST https://techfino-lead-proxy-691340529229.asia-southeast1.run.app/api/leads`
- **Lender-Specific Endpoints:**
  - `POST https://techfino-lead-proxy-691340529229.asia-southeast1.run.app/api/leads/techfino`
  - `POST https://techfino-lead-proxy-691340529229.asia-southeast1.run.app/api/leads/auxilo`
- **Supported Lenders List:** `GET https://techfino-lead-proxy-691340529229.asia-southeast1.run.app/api/lenders`
- **Health Check:** `GET https://techfino-lead-proxy-691340529229.asia-southeast1.run.app/health`

---

## Authentication

All requests from Salesforce must provide the Bearer token in the `Authorization` header:

```http
Authorization: Bearer nxtwave_sf_lead_sec_7f9b8c2d1e04a6b8
Content-Type: application/json
```

---

## Dynamic Routing Mechanisms

Salesforce can specify the target lender in any of these ways:

### 1. In the JSON Payload (Recommended)
Add `"lender": "TECHFINO"` or `"lender": "AUXILO"` directly in the request body:
```json
{
  "lender": "TECHFINO",
  "order_id": "LSPfb3b6229e1e1wd044e475b0f3d5a",
  "amount": 87500,
  "course_name": "BCOM",
  "name": "Amit Chand"
}
```
*(Also supports aliases: `"nbfc": "..."` or `"partner": "..."`. If omitted, defaults to `TECHFINO`)*

### 2. In the URL Path
- `POST /api/leads/techfino`
- `POST /api/leads/auxilo`

### 3. In the Query String
- `POST /api/leads?lender=auxilo`

### 4. In a Custom Header
- `X-Lender: AUXILO`

---

## Architecture & Configuration

The service is fully config-driven via `config/lenders.js`:

```javascript
{
  TECHFINO: {
    apiUrl: 'https://api.techfino.in/api/v2/techfino/lead/create',
    authType: 'BASIC_AND_APIKEY',
    credentials: { username, password, apiKey }
  },
  AUXILO: {
    apiUrl: process.env.AUXILO_API_URL,
    authType: process.env.AUXILO_AUTH_TYPE || 'BEARER',
    credentials: {
      token: process.env.AUXILO_API_TOKEN,
      apiKey: process.env.AUXILO_API_KEY
    }
  }
}
```

### When Auxilo is Ready:
You only need to supply the environment variables in Google Cloud Run (no code changes needed):
- `AUXILO_API_URL`: Auxilo lead creation endpoint
- `AUXILO_API_TOKEN` or `AUXILO_API_KEY`: Authentication credentials
- `AUXILO_AUTH_TYPE`: `BEARER` (default), `API_KEY`, or `BASIC`

---

## Example Requests

### Test TechFino
```bash
curl -X POST "https://techfino-lead-proxy-691340529229.asia-southeast1.run.app/api/leads" \
  -H "Authorization: Bearer nxtwave_sf_lead_sec_7f9b8c2d1e04a6b8" \
  -H "Content-Type: application/json" \
  -d '{
    "lender": "TECHFINO",
    "order_id": "LSPfb3b6229e1e1wd044e475b0f3d5a",
    "amount": 87500,
    "course_price": 87500,
    "course_name": "BCOM",
    "e_mail": "hschaudhary1980@gmail.com",
    "universityName": "",
    "mobile_num": "9811651139",
    "branch": "623",
    "name": "Amit Chand",
    "courseTenure": "6",
    "flexiTenure": "LESSER_THAN_EQUAL",
    "user_uid": "5309643",
    "duration": 6,
    "waiveConsent": "yes"
  }'
```

### Test Auxilo
```bash
curl -X POST "https://techfino-lead-proxy-691340529229.asia-southeast1.run.app/api/leads/auxilo" \
  -H "Authorization: Bearer nxtwave_sf_lead_sec_7f9b8c2d1e04a6b8" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "LSPfb3b6229e1e1wd044e475b0f3d5a",
    "amount": 87500
  }'
```
*(If Auxilo endpoint is not yet configured, returns HTTP 503 informing that `AUXILO_API_URL` needs to be set)*
