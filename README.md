# Salesforce to Multi-Lender (NBFC) Gateway

A config-driven middleware gateway hosted on Google Cloud Run that receives lead payloads from Salesforce via Bearer token authentication, dynamically routes them to the appropriate NBFC/Lender (**TechFino**, **Jodo Flex**, **Auxilo**), transforms payloads as required by each NBFC, and synchronously relays the response back to Salesforce.

---

## Live Production Endpoint

- **Base URL:** `https://nbfc-lead-proxy-691340529229.asia-southeast1.run.app`
- **Dynamic Routing Endpoint:** `POST https://nbfc-lead-proxy-691340529229.asia-southeast1.run.app/api/leads`
- **Lender-Specific Endpoints:**
  - `POST https://nbfc-lead-proxy-691340529229.asia-southeast1.run.app/api/leads/techfino`
  - `POST https://nbfc-lead-proxy-691340529229.asia-southeast1.run.app/api/leads/jodo_flex`
  - `POST https://nbfc-lead-proxy-691340529229.asia-southeast1.run.app/api/leads/auxilo`
- **Supported Lenders List:** `GET https://nbfc-lead-proxy-691340529229.asia-southeast1.run.app/api/lenders`
- **Health Check:** `GET https://nbfc-lead-proxy-691340529229.asia-southeast1.run.app/health`

---

## Authentication

All requests from Salesforce must provide the Bearer token in the `Authorization` header:

```http
Authorization: Bearer nxtwave_sf_lead_sec_7f9b8c2d1e04a6b8
Content-Type: application/json
```

---

## Jodo Flex Integration Details

### Inbound from Salesforce:
```json
{
  "NBFC_name": "Jodo_flex",
  "fullname": "Wahab Mar 17",
  "identifier": "6bae17ab-0ea4-4daf-9d73-bb0e62eaea7e",
  "product": "IIT-KGP-OCN",
  "date_of_birth": "2000-01-15",
  "primary_contact_name": "VIJAYA SREE PULIPAKA",
  "primary_contact_number": "9966891140",
  "primary_contact_email": "test@gmail.com",
  "Tenure": "12"
}
```

### Grade Resolution Logic (Config-driven):
The grade is dynamically derived from `product` + `Tenure`:

| Product | Salesforce Tenure | Jodo Grade Code |
|---|---|---|
| `IIT-KGP-OCN` | `3` | `IITKGPOCN_-_3_EMI` |
| `IIT-KGP-OCN` | `6` | `IITKGPOCN_-_6_EMI` |
| `IIT-KGP-OCN` | `9` | `IITKGPOCN_-_9_EMI` |
| `IIT-KGP-OCN` | `12` | `IITKGPOCN_-_12_EMI` |
| `IIT-KGP-OCN` | `18` | `IITKGPOCN_-_18_EMI` |

### Fee Configuration (Config-driven):
Managed in `config/jodoProductConfig.js`:
- Course Fee: `137000.0`
- Registration Fee: `0.0`

### Response Returned to Salesforce:
```json
{
  "status": "success",
  "NBFC_name": "Jodo_flex",
  "identifier": "6bae17ab-0ea4-4daf-9d73-bb0e62eaea7e",
  "jodo_student_id": 187987,
  "registration_id": 7580,
  "grade": "IITKGPOCN_-_12_EMI",
  "redirection_url": "https://app.devtest1.jodopay.com/consumer/login-redirect?access_token=...",
  "access_token": "...",
  "response_code": "200"
}
```

---

## Example cURL Requests

### 1. Test Jodo Flex
```bash
curl -X POST "https://nbfc-lead-proxy-691340529229.asia-southeast1.run.app/api/leads" \
  -H "Authorization: Bearer nxtwave_sf_lead_sec_7f9b8c2d1e04a6b8" \
  -H "Content-Type: application/json" \
  -d '{
    "NBFC_name": "Jodo_flex",
    "fullname": "Wahab Mar 17",
    "identifier": "6bae17ab-0ea4-4daf-9d73-bb0e62eaea7e",
    "product": "IIT-KGP-OCN",
    "date_of_birth": "2000-01-15",
    "primary_contact_name": "VIJAYA SREE PULIPAKA",
    "primary_contact_number": "9966891140",
    "primary_contact_email": "test@gmail.com",
    "Tenure": "12"
  }'
```

### 2. Test TechFino
```bash
curl -X POST "https://nbfc-lead-proxy-691340529229.asia-southeast1.run.app/api/leads" \
  -H "Authorization: Bearer nxtwave_sf_lead_sec_7f9b8c2d1e04a6b8" \
  -H "Content-Type: application/json" \
  -d '{
    "lender": "TECHFINO",
    "order_id": "f1deb9ad-4550-498a-b158-ba412ef78dc8",
    "name": "Mahammad",
    "mobile_num": "6301792476",
    "e_mail": "mohdwahabg@gmail.com",
    "amount": 87500,
    "course_price": 160000,
    "course_name": "Smart",
    "duration": 12,
    "courseTenure": "36",
    "branch": "623",
    "user_uid": "a03fv00000VUdOiAAL"
  }'
```
