# LoveRescue Integration API

External REST API for integration partners (e.g., SuperTool) to access therapist client data with consent-based filtering and HIPAA-compliant audit logging.

**Base URL:** `https://api.loverescue.app`  
**Version:** 1.0  
**Protocol:** HTTPS only (TLS 1.2+)

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Endpoints](#2-endpoints)
3. [Webhook Setup](#3-webhook-setup)
4. [Rate Limits](#4-rate-limits)
5. [Error Codes](#5-error-codes)
6. [Data Models](#6-data-models)
7. [HIPAA Compliance](#7-hipaa-compliance)

---

## 1. Authentication

LoveRescue uses an **OAuth2 Client Credentials** style flow. Partners exchange their API key + secret for a short-lived JWT.

### Flow

```
1. Partner calls POST /api/integration/auth with apiKey, apiSecret, therapistId
2. LoveRescue returns a Bearer token (JWT, 1-hour expiry)
3. Partner includes token in Authorization header for all subsequent requests
4. When token expires (401 response with code TOKEN_EXPIRED), re-authenticate
```

### POST /api/integration/auth

**Request:**
```json
{
  "apiKey": "lr_int_abc123...",
  "apiSecret": "sk_live_xyz789...",
  "therapistId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 3600,
  "tokenType": "Bearer"
}
```

**Errors:**
| Status | Error | Description |
|--------|-------|-------------|
| 400 | `apiKey and apiSecret are required` | Missing credentials |
| 401 | `Invalid API key` | API key not found or partner suspended |
| 401 | `Invalid API secret` | Secret doesn't match |
| 404 | `Therapist not found or inactive` | Invalid therapistId |

---

## 2. Endpoints

All endpoints below require `Authorization: Bearer <token>` header.

### GET /api/integration/clients

List the therapist's linked clients with consent-based filtering.

**Response (200):**
```json
{
  "clients": [
    {
      "id": "user-uuid",
      "linkId": "link-uuid",
      "firstName": "Jane",
      "lastName": "Doe",
      "email": "jane@example.com",
      "permissionLevel": "STANDARD",
      "consentGrantedAt": "2026-01-15T10:00:00Z",
      "couple": {
        "id": "couple-uuid",
        "status": "active",
        "partner1": { "id": "...", "firstName": "Jane", "lastName": "Doe" },
        "partner2": { "id": "...", "firstName": "John", "lastName": "Doe" }
      },
      "latestActivity": "2026-02-10",
      "latestMood": 7,
      "courseWeek": 8,
      "courseActive": true,
      "unreadAlerts": 2
    }
  ],
  "total": 1
}
```

### GET /api/integration/clients/:id/progress

Client progress data (assessment scores, activity completion, streaks, course progress). Mood/ratio trends only available at STANDARD or FULL permission.

**Response (200):**
```json
{
  "clientId": "user-uuid",
  "assessmentScores": [
    { "type": "attachment", "score": { "style": "anxious", "anxiety": 4.2, "avoidance": 2.1 }, "completedAt": "2026-01-20T..." }
  ],
  "activityCompletion": {
    "totalDays": 90,
    "daysActive": 62,
    "completionRate": 69,
    "streak": 12,
    "tasksCompleted": 8,
    "tasksPending": 2
  },
  "courseProgress": {
    "currentWeek": 8,
    "isActive": true,
    "completedWeeks": [1,2,3,4,5,6,7],
    "weeklyStrategies": [
      { "weekNumber": 8, "theme": "Gottman — Turning Toward", "completedDays": 3, "completedAt": null }
    ]
  },
  "moodTrends": [
    { "date": "2026-02-10", "mood": 7, "closeness": 6 }
  ],
  "ratioTrends": [
    { "date": "2026-02-10", "positive": 5, "negative": 1, "ratio": 5.0 }
  ]
}
```

**Permission filtering:**
- `BASIC`: assessmentScores, activityCompletion, courseProgress only
- `STANDARD`: + moodTrends, ratioTrends
- `FULL`: + individual responses, journal entries (when available)

### GET /api/integration/clients/:id/session-prep

Auto-generated session preparation report. Requires STANDARD or FULL permission.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `lastSessionDate` | ISO 8601 | Anchor point for "since last session" data |

**Response (200):**
```json
{
  "report": {
    "id": "report-uuid",
    "therapistId": "...",
    "clientId": "...",
    "reportDate": "2026-02-12T...",
    "lastSessionDate": "2026-02-05T...",
    "activitiesCompleted": [...],
    "assessmentChanges": { "attachment": { "before": {...}, "after": {...} } },
    "moodTrends": { "average": 6.5, "trend": "improving" },
    "crisisFlags": [],
    "generatedSummary": "Since last session, client completed 5/7 daily activities...",
    "expertInsights": [
      { "expert": "Gottman", "insight": "5:1 ratio improved from 3.2 to 4.8..." }
    ]
  }
}
```

### GET /api/integration/couples/:id/dynamics

Couple dynamics with side-by-side partner comparison, matchup scores, and couple profile analysis.

**Response (200):**
```json
{
  "couple": { "id": "couple-uuid", "status": "active" },
  "partner1": {
    "user": { "id": "...", "firstName": "Jane", "lastName": "Doe" },
    "assessmentScores": [...],
    "activityDays": 28,
    "moodAvg": 6.8
  },
  "partner2": {
    "user": { "id": "...", "firstName": "John", "lastName": "Doe" },
    "assessmentScores": [...],
    "activityDays": 22,
    "moodAvg": 5.9
  },
  "matchups": [
    { "score": 72, "alignments": { "compatible": [...], "misses": [...] }, "generatedAt": "..." }
  ],
  "coupleProfile": {
    "attachmentDynamic": { "pattern": "anxious-avoidant", "description": "..." },
    "communicationStyle": { ... },
    "strengths": [...],
    "growthEdges": [...]
  }
}
```

### GET /api/integration/alerts

Therapist's alerts (crisis, risk, milestone, stagnation).

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `type` | string | Filter: `CRISIS`, `RISK`, `MILESTONE`, `STAGNATION` |
| `unreadOnly` | boolean | Only unread alerts |
| `since` | ISO 8601 | Alerts created after this date |
| `limit` | integer | Max results (default 100, max 500) |

**Response (200):**
```json
{
  "alerts": [
    {
      "id": "alert-uuid",
      "clientId": "user-uuid",
      "client": { "id": "...", "firstName": "Jane", "lastName": "Doe" },
      "alertType": "RISK",
      "severity": "HIGH",
      "message": "Mood has dropped 2+ SD below baseline for 5 consecutive days",
      "metadata": { "moodBaseline": 7.2, "currentMood": 3.1, "daysBelow": 5 },
      "readAt": null,
      "createdAt": "2026-02-11T..."
    }
  ],
  "unreadCount": 3,
  "total": 15
}
```

### POST /api/integration/clients/:id/assign

Assign LoveRescue modules/activities to a client.

**Request:**
```json
{
  "taskDescription": "Complete the Gottman Love Map exercise",
  "module": "gottman_love_maps",
  "activities": ["love_map_quiz", "open_ended_questions"],
  "notes": "Focus on curiosity about partner's inner world",
  "dueDate": "2026-02-19",
  "priority": "high"
}
```

**Response (201):**
```json
{
  "message": "Activity assigned",
  "task": {
    "id": "task-uuid",
    "description": "Complete the Gottman Love Map exercise",
    "priority": "high",
    "dueDate": "2026-02-19T00:00:00.000Z",
    "createdAt": "2026-02-12T..."
  }
}
```

### GET /api/integration/outcomes

Caseload-wide outcome data across all consented clients.

**Response (200):**
```json
{
  "outcomes": {
    "summary": {
      "totalClients": 12,
      "activeInCourse": 8,
      "courseCompleted": 3,
      "totalCrisisAlerts": 1,
      "totalMilestones": 15,
      "avgCourseWeek": 6.4
    },
    "clients": [
      {
        "clientId": "user-uuid",
        "assessmentTypes": 5,
        "courseWeek": 8,
        "courseCompleted": false,
        "crisisAlerts": 0,
        "milestones": 3
      }
    ]
  }
}
```

### POST /api/integration/webhook/register

Register a webhook URL to receive real-time alerts.

**Request:**
```json
{
  "webhookUrl": "https://api.supertool.com/api/webhooks/loverescue",
  "events": ["alert.created", "alert.critical", "milestone.achieved"]
}
```

**Response (200):**
```json
{
  "message": "Webhook registered successfully",
  "webhookUrl": "https://api.supertool.com/api/webhooks/loverescue",
  "webhookSecret": "a1b2c3d4e5f6...hex...",
  "events": ["alert.created", "alert.critical", "milestone.achieved"]
}
```

> ⚠️ **Store the `webhookSecret` immediately.** It is only returned once and is required for signature verification.

---

## 3. Webhook Setup

### Webhook Delivery

When an alert is triggered for a therapist's client, LoveRescue sends a POST to the registered webhook URL.

**Headers:**
| Header | Description |
|--------|-------------|
| `X-LoveRescue-Signature` | HMAC-SHA256 hex digest of the request body |
| `X-LoveRescue-Timestamp` | ISO 8601 timestamp of the event |
| `X-LoveRescue-Event` | Event type (`alert.created`, `alert.critical`, `milestone.achieved`) |
| `Content-Type` | `application/json` |

**Signature Verification (Node.js):**
```javascript
const crypto = require('crypto');

function verifySignature(rawBody, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expected, 'hex')
  );
}
```

**Webhook Payload Example:**
```json
{
  "alertId": "alert-uuid",
  "clientId": "user-uuid",
  "alertType": "CRISIS",
  "severity": "CRITICAL",
  "message": "Crisis pathway triggered — safety plan activation recommended",
  "metadata": { ... },
  "createdAt": "2026-02-12T15:30:00Z"
}
```

**Expected Response:** HTTP 200. Non-2xx responses trigger retry (exponential backoff, max 5 attempts over 24 hours).

---

## 4. Rate Limits

| Scope | Limit | Window |
|-------|-------|--------|
| Per API key | 100 requests | 1 minute |
| Custom (per partner) | Configurable | 1 minute |

**Response Headers:**
| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Requests allowed per window |
| `X-RateLimit-Remaining` | Requests remaining |
| `X-RateLimit-Reset` | ISO 8601 time when window resets |

**429 Response:**
```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 45
}
```

---

## 5. Error Codes

### HTTP Status Codes

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad request (missing/invalid parameters) |
| 401 | Authentication failed or token expired |
| 403 | Forbidden (no consent, insufficient permission, IP blocked) |
| 404 | Resource not found |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

### Application Error Codes

| Code | Description |
|------|-------------|
| `TOKEN_EXPIRED` | Integration token expired; re-authenticate |
| `NO_CONSENT` | Client has not granted consent to this therapist |
| `INSUFFICIENT_PERMISSION` | Client's permission level too low for this data |
| `AUTH_FAILED` | API key/secret invalid |
| `RATE_LIMITED` | Too many requests |
| `NOT_CONFIGURED` | Integration not configured |

---

## 6. Data Models

### Permission Levels

| Level | Data Accessible |
|-------|----------------|
| **BASIC** | Assessment scores, activity completion (yes/no), course progress |
| **STANDARD** | + Mood trends, crisis alerts, session prep reports, ratio trends |
| **FULL** | + Individual responses, journal entries, detailed interaction logs |

The client controls their permission level and can change it at any time. Changes take effect immediately.

### Alert Types

| Type | Description |
|------|-------------|
| `CRISIS` | Safety concern detected (suicidal ideation, DV indicators) |
| `RISK` | Declining engagement, score drops, disengagement patterns |
| `MILESTONE` | Phase completion, score breakthroughs, streak achievements |
| `STAGNATION` | No activity, flat scores, prolonged disengagement |

### Alert Severity

| Severity | Notification |
|----------|-------------|
| `LOW` | Informational (daily digest) |
| `MEDIUM` | In-app badge + email |
| `HIGH` | Push notification within 1 hour |
| `CRITICAL` | Immediate push + SMS + email |

---

## 7. HIPAA Compliance

### Audit Logging

Every API request is logged in the `IntegrationAccessLog` table:
- Partner ID, endpoint called, client ID accessed
- HTTP response code, source IP address, timestamp
- Logs retained for 6 years per HIPAA requirements

### Data Minimization

- Only consented data is returned (filtered by client's permission level)
- Journal entries marked "therapist-hidden" are **never** returned regardless of permission level
- Partner data is never visible to the other partner's therapist unless both consent

### Encryption

- All API traffic over TLS 1.2+ (HTTPS only)
- Webhook payloads signed with HMAC-SHA256
- Integration secrets stored bcrypt-hashed at rest
- Database fields encrypted via PostgreSQL pgcrypto where applicable

### Business Associate Agreement

Integration partners must have a signed BAA on file before API access is provisioned. Contact partnerships@loverescue.app.

### IP Allowlisting

Partners can optionally restrict API access to specific IP addresses. Configure via the partner admin panel or contact support.

### Consent Revocation

When a client revokes consent:
1. All API requests for that client immediately return `403 NO_CONSENT`
2. Cached data in partner systems should be purged (partner responsibility)
3. Webhook notification sent: `consent.revoked` event
4. Action is logged in the HIPAA audit trail

---

## Onboarding Checklist

1. ☐ Sign BAA with LoveRescue
2. ☐ Receive API key + secret from partnerships team
3. ☐ Store credentials securely (secret is shown once)
4. ☐ Implement auth flow (POST /api/integration/auth)
5. ☐ Register webhook URL (POST /api/integration/webhook/register)
6. ☐ Store webhook secret for signature verification
7. ☐ Implement token refresh logic (re-auth on 401 TOKEN_EXPIRED)
8. ☐ Test with sandbox environment (https://sandbox-api.loverescue.app)
9. ☐ Complete security review
10. ☐ Go live

---

*Last updated: 2026-02-12 | LoveRescue Integration Team*
