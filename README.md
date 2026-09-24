# Salesforce to TechFino Lead Creation Proxy

A secure middleware proxy hosted on Google Cloud Run that receives lead payloads from Salesforce via Bearer token authentication, forwards them to the TechFino API using Basic Auth and API Key credentials, and returns the response back to Salesforce synchronously.

---

## Live Production Endpoint

- **Base URL:** `https://techfino-lead-proxy-691340529229.asia-southeast1.run.app`
- **Lead Creation Endpoint:** `POST https://techfino-lead-proxy-691340529229.asia-southeast1.run.app/api/leads`
- **Health Check Endpoint:** `GET https://techfino-lead-proxy-691340529229.asia-southeast1.run.app/health`

---

## Authentication

All requests from Salesforce must include the `Authorization` header with a valid Bearer token:

```http
Authorization: Bearer nxtwave_sf_lead_sec_7f9b8c2d1e04a6b8
Content-Type: application/json
```

---

## Request & Response Flow

```
Salesforce
   │
   │  POST /api/leads (Bearer Token + JSON Payload)
   ▼
Cloud Run Proxy (techfino-lead-proxy)
   │
   │  POST https://api.techfino.in/api/v2/techfino/lead/create
   │  (Basic Auth: NxtWave_Disruptive + apiKey: DWMoesFmwH...)
   ▼
TechFino Partner API
   │
   │  JSON Response (Loan ID, Redirection URL, etc.)
   ▼
Cloud Run Proxy (techfino-lead-proxy)
   │
   │  Synchronous Relay
   ▼
Salesforce
```

---

## Example cURL Request

```bash
curl -X POST "https://techfino-lead-proxy-691340529229.asia-southeast1.run.app/api/leads" \
  -H "Authorization: Bearer nxtwave_sf_lead_sec_7f9b8c2d1e04a6b8" \
  -H "Content-Type: application/json" \
  -d '{
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

### Sample Response Received:
```json
{
  "ReferenceNumber": "LSPfb3b6229e1e1wd044e475b0f3d5a",
  "unique_loan_id": "LD-143-UNE-292890",
  "redirection_url": "https://tiny.techfino.in?tbzbsaoZO",
  "response_code": "200"
}
```
