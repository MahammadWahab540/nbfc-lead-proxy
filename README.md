# Salesforce to Multi-Lender (NBFC) Gateway

A config-driven, production-ready middleware gateway hosted on Google Cloud Run. It receives outbound callouts from Salesforce via Bearer token authentication, dynamically routes them to the appropriate NBFC/Lender (**TechFino**, **Jodo Flex**, **Auxilo**), standardizes and transforms payloads, and relays responses back to Salesforce synchronously.

---

## Live Production Endpoints (Google Cloud Run)

* **Base URL:** `https://nbfc-lead-proxy-152795499664.asia-southeast1.run.app`
* **Health Check:** `GET https://nbfc-lead-proxy-152795499664.asia-southeast1.run.app/health`
* **Dynamic Lead Routing:** `POST https://nbfc-lead-proxy-152795499664.asia-southeast1.run.app/api/leads`
* **Lender Specific Endpoints:**
  * TechFino: `POST https://nbfc-lead-proxy-152795499664.asia-southeast1.run.app/api/leads/techfino`
  * Jodo Flex: `POST https://nbfc-lead-proxy-152795499664.asia-southeast1.run.app/api/leads/jodo` *(or `.../api/leads/jodo_flex`)*
  * Auxilo: `POST https://nbfc-lead-proxy-152795499664.asia-southeast1.run.app/api/leads/auxilo`
* **Supported Lenders List:** `GET https://nbfc-lead-proxy-152795499664.asia-southeast1.run.app/api/lenders`

---

## Authentication

All incoming requests from Salesforce must pass the Bearer token in the `Authorization` header:

```http
Authorization: Bearer nxtwave_sf_lead_sec_7f9b8c2d1e04a6b8
Content-Type: application/json
```

---

## TechFino NBFC Integration

### Standardized Employment Type Mapping:
Salesforce passes integer codes or string codes which the proxy maps to TechFino's required enum strings:

| Code / Value | Mapped TechFino Enum |
|---|---|
| `0` or `"0"` | `SALARIED` |
| `1` or `"1"` | `SELF_EMPLOYED` |
| `2` or `"2"` | `STUDENT` |
| `3` or `"3"` | `HOME_MAKER` |
| `4` or `"4"` | `RETIRED` |
| `5` or `"5"` | `OTHER` |

### Default Branch Code:
* Defaults automatically to `"712"` if not provided in the inbound payload.

### Sample Inbound Payload from Salesforce:
```json
{
  "order_id": "69d1c490-bf6d-4926-9c9e-9d206144075c",
  "name": "Ibrahim Dadasaheb Pathan",
  "mobile_num": "9763035182",
  "e_mail": "pathanumar1818@gmail.com",
  "amount": 32994,
  "course_price": 150000,
  "course_name": "Smart",
  "duration": 36,
  "user_uid": "d2fc61f4-1d51-41eb-949f-b673d9690d81",
  "employementType": "1",
  "income": 15000,
  "employerEmail": "pathanumar1818@gmail.com",
  "branch": "712",
  "recordId": "a03IT00001HY3tkYAD"
}
```

---

## Jodo Flex Integration

* Dynamically derives Grade from product name + course tenure (e.g. `IITKGPOCN_-_12_EMI`).
* Registers / updates User in Jodo and sets up Fee Components.
* Issues customer login redirect URL (`redirection_url`) for the borrower journey.

---

## Architecture & Project Structure

```
├── config/
│   ├── lenders.js            # Registry of NBFC endpoints, auth types & credentials
│   └── jodoProductConfig.js  # Jodo product/tenure-to-grade and fee mapping
├── services/
│   └── lenderDispatcher.js   # Adapters for TechFino, Jodo Flex, and Auxilo
├── Dockerfile                # Node.js 20 Alpine container definition
├── server.js                 # Express server & bearer authentication middleware
├── package.json
└── README.md
```

## Running Locally

```bash
npm install
npm start
```
Default port: `8080`.
