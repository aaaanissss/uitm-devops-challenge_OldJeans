# 🔐 RentVerse Security Implementation Report  
*Team Name:* OldJeans

*Members:*
1. Anis binti Marzuki
2. Nadzirah Husna binti Abu Bakar
3. Siti Nurul Najwa binti Mohamad Zamri

## 📌 Project Overview

RentVerse is a full-stack rental platform designed with *security-by-design* principles.  
This report documents the implementation of:

- *Module 1 – Secure Login & MFA*
- *Module 2 – Secure API Gateway*

The security architecture aligns with *OWASP Mobile Top 10* and *DevSecOps best practices*, focusing on authentication, authorization, and secure communication.

---

## 🧱 Overall Security Architecture

Client (Web / Mobile)

↓

API Gateway (Express.js)


→ HTTPS Enforcement


→ Rate Limiting


→ Security Headers


→ JWT Authentication


→ Role & Ownership Validation


↓


Business Logic


↓


Database (PostgreSQL via Prisma)



---

## ⚙ General Prerequisites (Project-Wide)

These prerequisites are required *once* for the entire RentVerse backend:

- *Node.js 18+*
- *pnpm*
- *PostgreSQL*
- *Git*
- *Environment variables configured*
- *Authenticator App* (for MFA testing)

env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/rentverse
JWT_SECRET=your_jwt_secret


## 🔐 Module 1 – Secure Login & MFA (Multi-Factor Authentication)

### Module Overview

This module implements *secure authentication with MFA/OTP-based login and role-based access control* for the RentVerse platform.  
It enhances account security by requiring a *Time-based One-Time Password (TOTP)* in addition to the user’s password, protecting against credential theft and unauthorized access.

This module aligns with *OWASP Mobile Top 10 (M1–M3)*:
- *M1: Improper Platform Usage*
- *M2: Insecure Data Storage*
- *M3: Insecure Communication*

---

### 🎯 Objectives

- Secure user login using *JWT-based authentication*
- Add *MFA using TOTP (Authenticator App)*
- Enforce *role-based access control (RBAC)*
- Prevent unauthorized access to protected routes
- Provide *secure, auditable authentication flows*

---

## 🔄 Authentication & MFA Flow

### 1️⃣ Standard Login (No MFA Enabled)
1. User submits email + password
2. Backend verifies credentials
3. JWT token is issued
4. User gains access based on role

### 2️⃣ Login with MFA Enabled
1. User submits email + password
2. Backend verifies credentials
3. Backend responds with MFA_REQUIRED
4. User enters 6-digit OTP from authenticator app
5. Backend verifies OTP
6. JWT token is issued
7. Access granted based on role

### 3️⃣ MFA Setup Flow
1. Authenticated user requests MFA setup
2. Backend generates a TOTP secret
3. QR code is returned to frontend
4. User scans QR code using authenticator app
5. User submits OTP for confirmation
6. MFA is enabled for the account

---

## 🛡 Security Controls Implemented

| Control | Description |
|------|------------|
| Password hashing | Secure password storage (bcrypt) |
| JWT authentication | Stateless authentication |
| MFA (TOTP) | Prevents account takeover |
| Role-based access | Admin / User route separation |
| HTTP-only cookies | Prevents XSS token theft |
| Auth middleware | Centralized access control |

---

## ⚙ Module 1 Setup (Additional)

bash
pnpm add speakeasy qrcode
pnpm prisma migrate dev



This adds MFA-related fields such as:
- mfaEnabled
- mfaSecret


## 🔑 Key API Endpoints (Module 1)

Authentication

- POST /api/auth/login

- GET /api/auth/me

MFA

- POST /api/auth/mfa/setup

- POST /api/auth/mfa/verify

- POST /api/auth/mfa/confirm

All MFA endpoints are protected using JWT middleware.

## 🧪 Testing the MFA Flow

 (Download authenticator app such as Microsoft Authenticator or Authy)

1. Login with valid credentials
2. Go to Account
3. Click Enable MFA
4. Scan QR code using chosen authenticator app
5. Confirm with 6-digit OTP > MFA successfuly set
6. Logout
7. Login again → OTP required to be authenticated
8. To disable, got to Account > Enable MFA > Disable MFA

# 🔐 Module 2 – Secure API Gateway

## Module Overview

This module implements a *Secure API Gateway* for the RentVerse backend to protect API endpoints from unauthorized access, abuse, and insecure communication.  
It enforces *HTTPS (production), **JWT authentication, **rate limiting, and **access validation* to ensure only legitimate requests are processed.

### OWASP Alignment
- *M5: Insufficient Cryptography*
- *M6: Insecure Authorization*

---

## 🎯 Objectives

- Enforce *secure communication (HTTPS)*
- Protect APIs using *JWT validation*
- Prevent brute-force and flooding using *rate limiting*
- Enforce *role-based and user-scoped access control*
- Centralize security checks for all API requests

---

## 🔄 Secure API Gateway Flow

1. Client sends request to /api/*
2. HTTPS enforced in production (redirect HTTP → HTTPS)
3. Rate limiting applied per IP
4. Security headers added (Helmet)
5. JWT token validated (protected routes)
6. Role and ownership checks performed
7. Request forwarded to route/controller → database → response returned

---

## 🧱 Architecture Components

### Backend
- *Express.js*
- *Helmet* (secure headers)
- *express-rate-limit* (rate limiting)
- *JWT* (authentication)
- *Prisma + PostgreSQL* (data layer)

### Frontend (Consumption)
- *Next.js*
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

bash
pnpm add helmet express-rate-limit

pnpm add express-rate-limit

---


## 🧪 Testing & Verification


powershell
1..120 | % {
  try {
    Invoke-WebRequest `
      -Uri "https://uitm-devops-challenge-old-jeans-fkk.vercel.app/api/auth/check-email" `
      -Method Post `
      -ContentType "application/json" `
      -Body '{"email":"test@example.com"}' `
      -UseBasicParsing | Out-Null
    200
  } catch {
    $_.Exception.Response.StatusCode.Value__
  }
}


Expected output:
 
200 … 200 … 429 … 429

---
*HTTPS Enforcement (Production)*

Enabled only when NODE_ENV=production

Redirects HTTP → HTTPS (proxy-aware via X-Forwarded-Proto)

# 🔐 Module 3 – Digital Agreement

## Module Overview

This module implements a *Digital Agreement (Mobile)* for the RentVerse platform by extending the existing rental workflow with a *secure, mobile-based agreement signing process. It allows authorized users (tenants and property owners) to digitally sign rental agreements while ensuring **data integrity, identity verification, and workflow validation*. After an agreement is signed, its contents are locked to prevent modification, and all agreement-related actions are strictly regulated by permission-based access enforcement.

---
## 🎯 Objectives

- Implement a *secure digital agreement signing workflow* on mobile
- Ensure *data integrity* of rental agreements using cryptographic techniques.
- Implement *role-based access control (RBAC)* for agreement creation and signing.
- Validate the correct signing for both the owner and tenant
- Prevent unauthorized modifications or replay of agreement data.

---

## 🔄 Secure API Gateway Flow

1. Mobile app sends a request with *JWT access token* to the API Gateway
2. API Gateway validates:
	- Token authenticity
	- Token expiration
	- User role (owner or tenant)
3. Gateway forwards the request to the Agreement Service
4. Agreement Service performs:
	- Workflow validation (signing order)
	- Digital signature verification
	- Hash integrity check
5. Signed agreement is stored securely in the database
6. API Gateway returns a signed agreement status to the mobile client

---

## 🧱 Architecture Components

### Backend
- *Express.js*
- *JWT* (authentication)
- *Prisma + PostgreSQL* (data layer)

### Frontend (Consumption)
- *Next.js*
- *JWT Authorization Header*
- *Role-aware UI*
- *Secure API Consumption*

---

## 👤 Tenant Flow – Make a booking

### 1️⃣ Make a Booking

- Tenant fills in booking details:
      - Choose payment method
      - Rental start date
      - Rental duration
      - Optional notes to landlord

- Booking is created with status: *Pending*
- The system automatically records the booking under *MyRent*

### 2️⃣ Sign Digital Agreement

- Tenant accesses the agreement via *MyRent*
- Tenant clicks the *Sign Agreement* button
- Digital signature is submitted and confirmed
- Booking status updates to *Waiting* for landlord approval.
- System enforces *single-signature  validation*(tenant cannot sign more than once).

### 3️⃣ Await Approval

- Tenant cannot modify or re-sign the agreement
- Once the landlord signs, the booking status automatically changes to *Approved*

## 👤 Landlord Flow – Approve booking

### 1️⃣ Review Booking Requests

- Landlord manages booking requests from the *Profile*
- System displays a list of rental requests for owned properties
- Each request shows *Action Required* status if not yet approved

### 2️⃣ Approve & Sign Agreement

- Landlord reviews booking and agreement details
- Landlord signs the digital agreement
- System validates:
     - Landlord authorization
     - Correct signing order (tenant → landlord)

### 3️⃣ Final Approval

- Agreement status is updated to *Approved*
- Booking workflow is completed
- Agreement is locked to prevent further modification

---

## 🛡 Security Controls Implemented

| Control | Description |
|------|------------|
| JWT Authentication | Ensures only logged-in users can access agreement APIs |
| JWT validation | Secures protected endpoints |
| RBAC | Admin-only access for sensitive APIs |
| Immutable Agreement State | Agreements are locked after completion |
| Digital Signature Hashing | Agreement content is hashed before and after signing to detect tampering |
| API Input Validation | Protects against injection and malformed requests |
---

## 📁 Files Involved

app.js # Applies gateway 
middleware (HTTPS, rate limit, helmet)

middleware/security.js # enforceHTTPS + apiLimiter


middleware/auth.js # auth (JWT verify) + authorize (RBAC)

rentverse-frontend/app/rents/page.tsx

rentverse-frontend/app/landlord/bookings/page.tsx

rentverse-frontend/components/Modals/SignatureModal.ts

---

## 🧪 Testing & Verification

- Tenant attempts to sign a digital agreement with a valid authenticated session
- System verifies user role and agreement signing order
- Digital signature is generated and stored securely
- Any modification to agreement content triggers integrity validation failure
- Landlord successfully signs after the tenant completes the agreement
- Agreement status updates to Approved

---


# 🔔 Module 4 – Smart Notification & Alert System  
*DevSecOps Monitoring & Incident Detection* ★★

## Module Overview

Module 4 implements a *Smart Notification & Alert System* to monitor user security events, detect suspicious login behaviour, and provide *incident visibility for both users and administrators*.

This module introduces *security telemetry, user-driven incident reporting, and admin triage workflows, forming the foundation of **DevSecOps monitoring and incident response* within RentVerse.

The system ensures that:
- Users are aware of suspicious activity on their own accounts
- Administrators can investigate, acknowledge, and resolve incidents
- All actions are *logged, auditable, and traceable*

---

## 🎯 Objectives

- Log *security-relevant user activities* (login, MFA, failures)
- Detect and surface *suspicious login patterns*
- Allow users to *report suspicious activity*
- Provide admins with a *centralized alert dashboard*
- Support *incident lifecycle management* (Open → Acknowledged → Resolved)
- Align with *DevSecOps monitoring & incident detection principles*

---

## 🧠 Security Events Tracked

The system records the following events into a centralized *Audit Log*:

- LOGIN_SUCCESS
- LOGIN_FAILURE
- MFA_CHALLENGE
- MFA_SUCCESS
- MFA_FAILURE

Each event captures:
- User ID
- Timestamp
- IP address
- Device / User-Agent
- Optional metadata (reason, result)

---

## 🚨 Alert Generation Logic

Alerts are generated when:
- A user manually reports suspicious activity (This wasn’t me)
- Automated rules detect risky behaviour (e.g. brute force attempts)

Each alert includes:
- *Type* (e.g. SUSPICIOUS_ACTIVITY, BRUTE_FORCE)
- *Severity* (LOW, MEDIUM, HIGH)
- *Status* (OPEN, ACKNOWLEDGED, RESOLVED)
- Link to the originating audit log (when applicable)

---

## 👤 User Flow – Security Awareness

### 1️⃣ View Security Activity

Users can access their security history at "Security" page (accessible via user side navigation)


**Displayed information:**
- Recent login & MFA events
- IP address and device info
- Timestamp
- Event outcome

---

### 2️⃣ Report Suspicious Activity

For any event, the user may click:

*“This wasn’t me”*

This action:
- Creates a *HIGH-severity security alert*
- Links the alert to the selected audit log
- Immediately marks the event as *Reported*

---

### 3️⃣ Alert Status Visibility (User)

Users can see the lifecycle of their reported incident directly:

| Status | Meaning |
|------|--------|
| *Reported* | Incident submitted by user |
| *Acknowledged* | Admin is reviewing |
| *Resolved* | Incident handled and closed |

Once resolved:
- The event shows a *Resolved badge*
- Resolution timestamp is displayed
- The incident is no longer actionable

This ensures *user transparency without exposing admin tools*.

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

Admins can transition alerts through: OPEN → ACKNOWLEDGED → RESOLVED


Each action is:
- Logged
- Timestamped
- Immediately reflected in the user’s security page

---

## 🧱 Architecture & Data Models

### Audit Log (AuditLog)
Stores immutable security events.

Key fields:
- eventType
- ipAddress
- userAgent
- metadata
- createdAt

---

### Alert (Alert)
Represents a security incident.

Key fields:
- type
- severity
- status
- resolvedAt
- auditLogId

---

## 🔑 Key API Endpoints (Module 4)

### User Endpoints
- GET /api/security/me/activities
- POST /api/security/me/report-incident
- GET /api/security/me/summary

### Admin Endpoints
- GET /api/security/alerts
- PATCH /api/security/alerts/:id

All endpoints are protected using:
- JWT authentication
- Role-based authorization (Admin/User)

---

## 🛡 Security & DevSecOps Alignment

| Principle | Implementation |
|-------|---------------|
| Monitoring | Continuous audit logging |
| Detection | Alert rules + user reporting |
| Response | Admin triage workflow |
| Least privilege | Admin-only dashboards |
| Auditability | Immutable logs & timestamps |
| Transparency | User-visible incident status |

---

## 🧪 Testing & Verification

- User reports suspicious MFA/login activity
- Alert appears instantly in admin dashboard
- Admin acknowledges and resolves alert
- User sees *Resolved* status and timestamp
- Incident lifecycle fully traceable end-to-end

---

# 📊 Module 5 – Activity Log Dashboard  
*Threat Visualization & Accountability* ★★★

## Module Overview

Module 5 introduces a *centralized Activity Log Dashboard* that provides administrators with *real-time visibility into security-critical actions* across the RentVerse platform.

This module transforms raw audit data into *actionable security intelligence* by combining:
- Detailed audit logs
- Advanced filtering & pagination
- Severity classification
- Threat visualization
- Forensic CSV export

The dashboard supports *incident investigation, compliance, and accountability*, completing the security monitoring pipeline.

---

## 🎯 Objectives

- Provide admins with *full visibility of security events*
- Enable *rapid investigation* of failed logins and suspicious actions
- Support *forensic analysis* via CSV export
- Visualize security threats over time
- Enforce *strict admin-only access (RBAC)*

---

## 🔍 Logged Activities

The Activity Log Dashboard displays *immutable audit records*, including:

- LOGIN_SUCCESS
- LOGIN_FAILURE
- MFA_SUCCESS
- MFA_FAILURE
- PASSWORD_CHANGE
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
- *Highest severity badge* (LOW / MEDIUM / HIGH)
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

Each audit log displays a *derived severity badge*, calculated from linked alerts:

| Severity | Meaning |
|-------|--------|
| LOW | Informational / expected behaviour |
| MEDIUM | Suspicious but non-critical |
| HIGH | Potential attack or user-reported incident |

Severity is visually highlighted using *color-coded badges*.

---

### 4️⃣ Threat Visualization

The dashboard includes *security trend summaries*:

- *Failed login attempts over time* (24h / 7d)
- *Top source IPs* involved in failures
- *Event type distribution*

These visualizations help admins:
- Detect brute-force attempts
- Identify abnormal spikes
- Understand platform threat patterns

---

### 5️⃣ Detail Drawer (Forensics View)

Clicking a log entry opens a *detail drawer* showing:
- Full event metadata (JSON)
- User agent string
- Source IP
- Linked alerts with severity & status
- Timestamp and resolution state

This supports *deep forensic inspection without leaving the dashboard*.

---

### 6️⃣ CSV Export (Forensics & Compliance)

Admins can export filtered audit logs as CSV files:
- Preserves applied filters
- Suitable for offline analysis
- Useful for incident reports and compliance audits

Example filename: audit_logs_1699999999999.csv


---

## 🔐 Access Control

- Dashboard is *ADMIN-only*
- Enforced via:
  - JWT authentication
  - Role-based authorization middleware
- Unauthorized users receive HTTP 403 Forbidden

---

## 🔑 Key API Endpoints (Module 5)

### Admin Endpoints

- GET /api/security/audit-logs
- GET /api/security/audit-logs/summary
- GET /api/security/audit-logs/export.csv

Supported query parameters:
- page, limit
- eventType
- q (user search)
- ipAddress
- severity
- from, to

---

## 🧱 Architecture Integration

Module 5 builds on:
- *Module 1* – Authentication & MFA
- *Module 2* – Secure API Gateway
- *Module 4* – Smart Notification & Alerts

Audit logs act as the *single source of truth* for:
- Alerts
- Dashboards
- User security history
- Admin investigations

---

## 🛡 DevSecOps Alignment

| Principle | Implementation |
|--------|----------------|
| Visibility | Centralized audit dashboard |
| Detection | Failed login & alert correlation |
| Accountability | Immutable logs |
| Incident Response | Alert linkage & severity |
| Forensics | CSV export |
| Least Privilege | Admin-only access |

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
*Continuous Testing (DevSecOps)* ★★★

## Module Overview

Module 6 integrates *CI/CD security testing* into the RentVerse development workflow using *GitHub Actions* (or Jenkins), enabling automated *static analysis (SAST), **dependency vulnerability checks, **secrets scanning, and **deployment safety gates* on every pull request and push.

This module ensures insecure code and risky dependencies are detected *before* deployment, supporting a “shift-left” DevSecOps approach.

---

## 🎯 Objectives

- Run *SAST* automatically on every PR / push
- Detect *known-vulnerable dependencies* (npm/pnpm)
- Prevent accidental *secret leaks* (API keys, tokens)
- Enforce *security gates* (fail the pipeline on High/Critical findings)
- Produce security reports as CI artifacts for auditing

---

## 🔄 CI/CD Security Testing Flow

1. Developer opens PR / pushes to branch
2. Pipeline installs dependencies + runs tests
3. SAST scans codebase (CodeQL / Semgrep)
4. Dependency scanning (pnpm audit / npm audit)
5. Secret scanning (Gitleaks)
6. (Optional) Container scan (Trivy)
7. Pipeline fails if security thresholds are exceeded
8. Only passing builds can be merged/deployed

---

## 🛡 Security Controls Implemented

| Control | Description |
|------|------------|
| SAST (CodeQL) | Scans source code for insecure patterns (JS/TS) |
| Semgrep (optional) | Additional rules for OWASP/Node security patterns |
| Dependency scanning | Detects vulnerable packages via audit |
| Secrets scanning | Prevents committed credentials (tokens/keys) |
| Build & test gates | Blocks merge/deploy if checks fail |
| Artifact reports | CI outputs stored for evidence/audit |

---

## 📁 Files Involved (GitHub Actions)

.github/workflows/security-ci.yml

---

## 🧪 Testing & Verification Checklist

- Push a commit containing a known insecure pattern → CodeQL should flag it

- Add a vulnerable dependency version → audit should report it

- Commit a fake secret (e.g., JWT_SECRET=abc123) → Gitleaks should fail the pipeline

- Confirm PR is blocked until security jobs pass