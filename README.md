# 🔐 RentVerse Security Implementation Report  
**Team Name:** OldJeans

**Members:**
1. Anis binti Marzuki
2. Nadzirah Husna binti Abu Bakar
3. Siti Nurul Najwa binti Mohamad Zamri

## 📌 Project Overview

RentVerse is a full-stack rental platform designed with **security-by-design** principles.  
This report documents the implementation of:

- Module 1 — Secure Login & MFA
- Module 2 — Secure API Gateway
- Module 3 — Digital Agreement (Mobile)
- Module 4 — Smart Notification & Alert System
- Module 5 — Activity Log Dashboard
- Module 6 — CI/CD Security Testing (Bonus)

The security architecture aligns with **OWASP Mobile Top 10** and **DevSecOps best practices**, focusing on authentication, authorization, and secure communication.

---

## 🧱 Overall Security Architecture

- Client (Web/Mobile)
- API Gateway (Express.js)
  - HTTPS enforcement (production)
  - Rate limiting
  - Security headers (Helmet)
  - JWT authentication
  - Role & ownership validation
- Business Logic
- Database (PostgreSQL via Prisma)

---

## ⚙️ General Prerequisites (Project-Wide)

These prerequisites are required **once** for the entire RentVerse backend:

- **Node.js 18+**
- **pnpm**
- **PostgreSQL**
- **Git**
- **Environment variables configured**
- **Authenticator App** (for MFA testing)

Example `.env` (backend):
```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/rentverse
JWT_SECRET=your_jwt_secret
```

## 🔐 Module 1 – Secure Login & MFA (Multi-Factor Authentication)

### Module Overview

This module implements **secure authentication with MFA/OTP-based login and role-based access control** for the RentVerse platform.  
It enhances account security by requiring a **Time-based One-Time Password (TOTP)** in addition to the user’s password, protecting against credential theft and unauthorized access.

This module aligns with **OWASP Mobile Top 10 (M1–M3)**:
- **M1: Improper Platform Usage**
- **M2: Insecure Data Storage**
- **M3: Insecure Communication**

---

### 🎯 Objectives

- Secure user login using **JWT-based authentication**
- Add **MFA using TOTP (Authenticator App)**
- Enforce **role-based access control (RBAC)**
- Prevent unauthorized access to protected routes
- Provide **secure, auditable authentication flows**

---

## 🔄 Authentication & MFA Flow

1) **Standard login (no MFA):** email/password → JWT issued.
2) **Login with MFA:** email/password → `MFA_REQUIRED` → user submits 6-digit OTP → JWT issued.
3) **MFA setup:** authenticated user requests setup → TOTP secret + QR returned → user confirms with OTP → MFA enabled.

---

## 🛡 Security Controls Implemented

| Control | Description |
|------|------------|
| Password hashing | Secure password storage (bcrypt) |
| JWT authentication | Stateless authentication |
| MFA (TOTP) | Prevents account takeover |
| Role-based access | Admin / User route separation |
| Secure cookie flags (Secure + SameSite) | Reduces CSRF risk (cookie still readable by JS; not HttpOnly) |
| Auth middleware | Centralized access control |
| Audit log | Audit logging of auth events (login success/failure, MFA events) |

### Token Storage (current state)
- Stored in `localStorage` and a client-set cookie (`secure; samesite=strict`). Cookie is **not HttpOnly**, so tokens remain accessible to JavaScript; token is readable by client code. Middleware reads the cookie for SSR route protection. 

### Key API Endpoints
- Auth: `POST /api/auth/login`, `GET /api/auth/me`
- MFA: `POST /api/auth/mfa/setup`, `POST /api/auth/mfa/confirm`, `POST /api/auth/mfa/verify`, `POST /api/auth/mfa/disable`
(All protected via JWT where applicable; MFA endpoints use auth + TOTP verification.)

---

## ⚙️ Module 1 Setup (Additional)

```bash
pnpm add speakeasy qrcode
pnpm prisma migrate dev
```


This adds MFA-related fields such as:
- mfaEnabled
- mfaSecret


## 🧪 Testing the MFA Flow

 (Download authenticator app such as Microsoft Authenticator or Authy)

1. Login with valid credentials.
2. Go to MFA Setup page → Enable MFA.
3. Scan QR with authenticator app.
4. Confirm with 6-digit OTP (MFA enabled).
5. Logout, login again → OTP required.
6. Disable via MFA Setup page → Disable MFA.

# 🔐 Module 2 – Secure API Gateway

## Module Overview

This module implements a **Secure API Gateway** for the RentVerse backend to protect API endpoints from unauthorized access, abuse, and insecure communication.  
It enforces **HTTPS (production)**, **JWT authentication**, **rate limiting**, and **access validation** to ensure only legitimate requests are processed.

### OWASP Alignment
- **M5: Insufficient Cryptography**
- **M6: Insecure Authorization**

---

## 🎯 Objectives

- Enforce **secure communication (HTTPS)**
- Protect APIs using **JWT validation**
- Prevent brute-force and flooding using **rate limiting**
- Enforce **role-based and user-scoped access control**
- Centralize security checks for all API requests

---

## 🔄 Secure API Gateway Flow

1. Client sends request to `/api/*`
2. HTTPS enforced in production (redirect HTTP → HTTPS)
3. Rate limiting applied per IP
4. Security headers added (Helmet)
5. JWT token validated (protected routes)
6. Role and ownership checks performed
7. Request forwarded to route/controller → database → response returned

---

## 🧱 Architecture Components

### Backend
- **Express.js**
- **Helmet** (secure headers)
- **express-rate-limit** (rate limiting)
- **JWT** (authentication)
- **Prisma + PostgreSQL** (data layer)

### Frontend (Consumption)
- **Next.js**
- Sends JWT in request header:


---

## 🛡 Security Controls Implemented

| Control | Description |
|------|------------|
| HTTPS enforcement | Prevents plaintext traffic in production |
| Rate limiting | Blocks brute-force & API abuse (HTTP 429) |
| JWT validation | Secures protected endpoints |
| RBAC | Admin-only access for sensitive APIs |
| User-scoped access | Prevents horizontal privilege abuse (IDOR) |
| Helmet headers | Adds standard security headers |

---

## 📁 Files Involved

app.js # Applies gateway 
middleware (HTTPS, rate limit, helmet)


middleware/security.js # enforceHTTPS + apiLimiter


middleware/auth.js # auth (JWT verify) + authorize (RBAC)


routes/security.js # Example: admin-only and user-scoped protected routes


routes/upload.js # Example: JWT-protected upload endpoints



---

## 📦 Setup (Module 2 Dependencies)

```bash
pnpm add helmet express-rate-limit

pnpm add express-rate-limit
```
---


## 🧪 Testing & Verification

**Rate limit**

- Send repeated requests to `/api/auth/check-email`


```powershell
1..120 | % {
  try {
    Invoke-WebRequest `
      -Uri "http://localhost:3000/api/auth/check-email" `
      -Method Post `
      -ContentType "application/json" `
      -Body '{"email":"test@example.com"}' `
      -UseBasicParsing | Out-Null
    200
  } catch {
    $_.Exception.Response.StatusCode.Value__
  }
}
```

- Expected output: expect HTTP 429 after ~100 requests/15min per IP.
``` 
200 … 200 … 429 … 429
```
---
**HTTPS Enforcement (Production)**

- When `NODE_ENV=production`, HTTP is redirected to HTTPS (proxy-aware via `X-Forwarded-Proto`).

---

# 🔔 Module 4 – Smart Notification & Alert System  


## Module Overview

Module 4 implements a **Smart Notification & Alert System** to monitor user security events, detect suspicious login behaviour, and provide **incident visibility for both users and administrators**.

The system ensures that:
- Users are aware of suspicious activity on their own accounts
- Administrators can investigate, acknowledge, and resolve incidents
- All actions are **logged, auditable, and traceable**

---

## 🎯 Objectives

- Log **security-relevant user activities** (login, MFA, failures)
- Detect and surface **suspicious login patterns**
- Allow users to **report suspicious activity**
- Provide admins with a **centralized alert dashboard**
- Support **incident lifecycle management** (Open → Acknowledged → Resolved)
- Align with **DevSecOps monitoring & incident detection principles**

---

## 🧠 Security Events Tracked

The system records the following events into a centralized **Audit Log**:

- `LOGIN_SUCCESS`
- `LOGIN_FAILURE`
- `MFA_CHALLENGE`
- `MFA_SUCCESS`
- `MFA_FAILURE`

Each event captures:
- User ID
- Timestamp
- IP address
- Device / User-Agent
- Optional metadata (reason, result)

---

## 🚨 Alert Generation Logic

Alerts are generated when:
- User reports suspicious activity (“This wasn’t me”)
- Automated rules detect risky behaviour (e.g. brute force attempts)

Each alert includes:
- **Type** (e.g. `SUSPICIOUS_ACTIVITY`, `BRUTE_FORCE`)
- **Severity** (`LOW`, `MEDIUM`, `HIGH`)
- **Status** (`OPEN`, `ACKNOWLEDGED`, `RESOLVED`)
- Link to the originating audit log (when applicable)

---

## 👤 User Flow – Security Awareness

### 1️⃣ View Security Activity

Users can access their security history at "Security" page (accessible via user side navigation)


***Displayed information:***
- Recent login & MFA events
- IP address and device info
- Timestamp
- Event outcome

---

### 2️⃣ Report Suspicious Activity

For any event, the user may click:

**“This wasn’t me”**

This action:
- Creates a **HIGH-severity security alert**
- Links the alert to the selected audit log
- Immediately marks the event as **Reported**

---

### 3️⃣ Alert Status Visibility (User)

Users can see the lifecycle of their reported incident directly:

| Status | Meaning |
|------|--------|
| **Reported** | Incident submitted by user |
| **Acknowledged** | Admin is reviewing |
| **Resolved** | Incident handled and closed |

Once resolved:
- The event shows a **Resolved badge**
- Resolution timestamp is displayed
- The incident is no longer actionable

This ensures **user transparency without exposing admin tools**.

---

## 🛠 Admin Flow – Incident Triage

### 1️⃣ Access Admin Alerts Dashboard

Admins access the alert system at "Security Alerts" page (accessible via user side navigation)


(Admin-only, enforced by RBAC)

---

### 2️⃣ Alert Management Capabilities

Admins can:
- View all alerts in one dashboard
- Filter by:
  - Status
  - Severity
  - Alert type
- Inspect:
  - User email
  - IP address
  - Event type
  - Linked audit log

---

### 3️⃣ Incident Lifecycle Actions

Admins can transition alerts through: *OPEN → ACKNOWLEDGED → RESOLVED*


Each action is:
- Logged
- Timestamped
- Immediately reflected in the user’s security page

---

## 🧱 Architecture & Data Models

### Audit Log (`AuditLog`)
Stores immutable security events.

Key fields:
- `eventType`
- `ipAddress`
- `userAgent`
- `metadata`
- `createdAt`

---

### Alert (`Alert`)
Represents a security incident.

Key fields:
- `type`
- `severity`
- `status`
- `resolvedAt`
- `auditLogId`

---

## 🔑 Key API Endpoints (Module 4)

### User Endpoints
- `GET /api/security/me/activities`
- `POST /api/security/me/report-incident`
- `GET /api/security/me/summary`

### Admin Endpoints
- `GET /api/security/alerts`
- `PATCH /api/security/alerts/:id`

All endpoints are protected using:
- JWT authentication
- Role-based authorization (Admin/User)

---

## 🧪 Testing & Verification

- User reports suspicious MFA/login activity
- Alert appears instantly in admin dashboard
- Admin acknowledges and resolves alert
- User sees **Resolved** status and timestamp
- Incident lifecycle fully traceable end-to-end

---

# 📊 Module 5 – Activity Log Dashboard  
## Module Overview

Module 5 introduces a **centralized Activity Log Dashboard** that provides administrators with **real-time visibility into security-critical actions** across the RentVerse platform.

This module transforms raw audit data into **actionable security intelligence** by combining:
- Detailed audit logs
- Advanced filtering & pagination
- Severity classification
- Threat visualization
- Forensic CSV export

The dashboard supports **incident investigation, compliance, and accountability**, completing the security monitoring pipeline.

---

## 🎯 Objectives

- Provide admins with **full visibility of security events**
- Enable **rapid investigation** of failed logins and suspicious actions
- Support **forensic analysis** via CSV export
- Visualize security threats over time
- Enforce **strict admin-only access (RBAC)**

---

## 🔍 Logged Activities

The Activity Log Dashboard displays **immutable audit records**, including:

- `LOGIN_SUCCESS`
- `LOGIN_FAILURE`
- `MFA_SUCCESS`
- `MFA_FAILURE`
- `PASSWORD_CHANGE`
- Other critical security actions

Each log entry records:
- Timestamp
- User (if available)
- Source IP address
- User agent (device / browser)
- Metadata (result, reason, context)
- Linked alerts (if any)

---

## 🖥 Admin Dashboard Features

### 1️⃣ Audit Log Table

Admins can view a paginated table containing:
- Event type
- User identity
- IP address
- Alert count
- **Highest severity badge** (LOW / MEDIUM / HIGH)
- Clickable rows for detailed inspection

---

### 2️⃣ Advanced Filtering

Admins can filter logs by:
- Event type
- User search (email / name)
- IP address
- Severity level
- Page number (pagination)

Filters reset pagination automatically to ensure accurate results.

---

### 3️⃣ Severity Classification

Each audit log displays a **derived severity badge**, calculated from linked alerts:

| Severity | Meaning |
|-------|--------|
| LOW | Informational / expected behaviour |
| MEDIUM | Suspicious but non-critical |
| HIGH | Potential attack or user-reported incident |

Severity is visually highlighted using **color-coded badges**.

---

### 4️⃣ Threat Visualization

The dashboard includes **security trend summaries**:

- **Failed login attempts over time** (24h / 7d)
- **Top source IPs** involved in failures
- **Event type distribution**

These visualizations help admins:
- Detect brute-force attempts
- Identify abnormal spikes
- Understand platform threat patterns

---

### 5️⃣ Detail Drawer (Forensics View)

Clicking a log entry opens a **detail drawer** showing:
- Full event metadata (JSON)
- User agent string
- Source IP
- Linked alerts with severity & status
- Timestamp and resolution state

This supports **deep forensic inspection without leaving the dashboard**.

---

### 6️⃣ CSV Export (Forensics & Compliance)

Admins can export filtered audit logs as CSV files:
- Preserves applied filters
- Suitable for offline analysis
- Useful for incident reports and compliance audits

Example filename: audit_logs_1699999999999.csv


---

## 🔑 Key API Endpoints (Module 5)

### Admin Endpoints

- `GET /api/security/audit-logs`
- `GET /api/security/audit-logs/summary`
- `GET /api/security/audit-logs/export.csv`

### User Endpoints
- `GET /api/security/me/activities`
- `POST /api/security/me/report-incident`
- `GET /api/security/me/summary`


(All admin endpoints require JWT + admin role; user endpoints require JWT.)

---

## Data Models (Prisma)
- `AuditLog`: eventType, ipAddress, userAgent, metadata, createdAt, userId?, auditLogId?
- `Alert`: type, severity, status, resolvedAt?, auditLogId?, userId?

---

## Frontend Pages (Next.js)
- Admin alerts: `app/admin/security/alerts/page.tsx`
- Admin audit logs: `app/admin/security/audit-logs/page.tsx`
- User security activity: `app/account/security/page.tsx`
- Middleware checks `authToken` cookie for protected routes.

## 🧱 Architecture Integration

Module 5 builds on:
- **Module 1** – Authentication & MFA
- **Module 2** – Secure API Gateway
- **Module 4** – Smart Notification & Alerts

Audit logs act as the **single source of truth** for:
- Alerts
- Dashboards
- User security history
- Admin investigations

---

## 🧪 Testing & Verification

- Trigger failed login attempts
- Confirm logs appear in dashboard
- Apply filters and pagination
- Verify severity badges
- Export CSV and inspect data
- Inspect detail drawer metadata
- Confirm unauthorized users are blocked

---

# 🧪 Module 6 – CI/CD Security Testing (Bonus)

## Module Overview
Module 6 integrates CI/CD security testing into the RentVerse development workflow using **GitHub Actions**.
It automates **secrets scanning**, **SAST (static analysis)**, and **dependency vulnerability scanning** on every push and pull request.

This ensures security issues are detected early (“shift-left”) and provides continuous visibility into code and dependency risks before deployment.

---

## 🎯 Objectives
- Run **secrets scanning** automatically on every PR / push
- Run **SAST** automatically on every PR / push (JS/TS + Python)
- Run **dependency vulnerability scanning** for frontend and backend dependencies
- Provide **deployment readiness checks** by running security checks in CI before merging

> Note: Dependency scanning is configured in **advisory mode** (reports findings in CI logs without blocking merges), allowing incremental remediation.

---

## 🔄 CI/CD Security Testing Flow
1. Developer opens PR / pushes to branch
2. GitHub Actions pipeline starts automatically
3. Secrets scanning runs (**Gitleaks**)
4. SAST runs (**CodeQL** for JavaScript/TypeScript and Python)
5. Dependency scanning runs:
   - Backend: `pnpm audit` (advisory)
   - Frontend: `bun audit` (advisory)
6. Results are visible in the Actions logs and (where supported) GitHub Security pages

---

## 🛡 Security Controls Implemented
| Control | Description |
|------|------------|
| Secrets scanning (Gitleaks) | Detects committed credentials/tokens/keys |
| SAST (CodeQL) | Scans source code for insecure patterns (JS/TS + Python) |
| Dependency scanning (advisory) | Reports known vulnerable packages via `pnpm audit` and `bun audit` |
| CI checks as deployment readiness gate | Security checks run automatically before merge/deploy |

---

## 📁 Files Involved
- `.github/workflows/security-ci.yml`

---

## 🧪 Testing & Verification Checklist
- Confirm GitHub Actions triggers on PR/push
- Review Gitleaks output (pass/fail depending on leaks)
- Review CodeQL scan execution logs
- Review dependency scan results in CI logs