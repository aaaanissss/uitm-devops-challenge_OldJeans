const { prisma } = require('../config/database');

/**
 * Safely extract IP address and user agent from the request.
 * Works in dev (localhost) and behind proxies (if configured).
 */
function extractRequestContext(req) {
  const xff = req.headers['x-forwarded-for'];
  const ipAddress = Array.isArray(xff)
    ? xff[0]
    : (xff && xff.split(',')[0].trim()) ||
      req.socket?.remoteAddress ||
      req.ip ||
      null;

  const userAgent = req.headers['user-agent'] || null;

  return { ipAddress, userAgent };
}

/**
 * Write a row into AuditLog table.
 *
 * eventType: one of the AuditEventType enum values:
 *  - "LOGIN_SUCCESS"
 *  - "LOGIN_FAILURE"
 *  - "LOGOUT"
 *  - "PASSWORD_CHANGE"
 *  - "MFA_CHALLENGE"
 *  - "MFA_SUCCESS"
 *  - "MFA_FAILURE"
 *
 * metadata: free-form JSON object (will be stored as JSON).
 */
async function logAuditEvent({ req, userId = null, eventType, metadata = {} }) {
  try {
    const { ipAddress, userAgent } = extractRequestContext(req);

    const log = await prisma.auditLog.create({
      data: {
        userId,
        eventType,
        ipAddress,
        userAgent,
        // geoLocation: null, // can enrich later if needed
        metadata,
      },
    });

    return log;
  } catch (err) {
    // never throw here, we don't want logging to break auth flow
    console.error('Failed to write AuditLog:', err);
    return null;
  }
}

/**
 * Create an Alert row. Used by detection rules.
 */
async function createAlert({ userId = null, auditLogId = null, type, severity = 'MEDIUM', description }) {
  try {
    const alert = await prisma.alert.create({
      data: {
        userId,
        auditLogId,
        type,       // must be one of AlertType enum values
        severity,   // "LOW" | "MEDIUM" | "HIGH"
        description,
      },
    });
    return alert;
  } catch (err) {
    console.error('Failed to create Alert:', err);
    return null;
  }
}

/**
 * Run detection rules after a login-related event.
 *
 * Current Implementation:
 *  - Rule #1: brute-force detection
 *      If >=5 LOGIN_FAILURE events for the same user/IP in last 10 minutes → create HIGH severity alert.
 *
 * Params:
 *  - req: Express request (for IP)
 *  - user: Prisma user object or null
 *  - eventType: string ("LOGIN_SUCCESS" | "LOGIN_FAILURE" | ...)
 *  - latestLog: the AuditLog we just wrote (may be null if logging failed)
 */
async function runLoginDetectionRules({ req, user, eventType, latestLog }) {
  const { ipAddress } = extractRequestContext(req);
  const userId = user ? user.id : null;

  let alertCreated = false;
  let loginWarning = null;

  // --- Rule #1: brute-force detection on LOGIN_FAILURE only ---
  if (eventType === 'LOGIN_FAILURE') {
    try {
      const now = new Date();
      const windowStart = new Date(now.getTime() - 10 * 60 * 1000); // last 10 minutes

      const where = {
        eventType: 'LOGIN_FAILURE',
        createdAt: { gte: windowStart },
      };

      // If we know the user, scope by userId as well
      if (userId) {
        where.userId = userId;
      }

      // Also scope by IP if we have it
      if (ipAddress) {
        where.ipAddress = ipAddress;
      }

      const failureCount = await prisma.auditLog.count({ where });

      // Threshold: 5 or more failures in 10 minutes
      if (failureCount >= 5) {
        const descriptionParts = [];
        descriptionParts.push(`Detected ${failureCount} failed login attempts in the last 10 minutes.`);
        if (userId) {
          descriptionParts.push('Target: specific user account.');
        }
        if (ipAddress) {
          descriptionParts.push(`Source IP: ${ipAddress}.`);
        }

        await createAlert({
          userId,
          auditLogId: latestLog ? latestLog.id : null,
          type: 'BRUTE_FORCE',
          severity: 'HIGH',
          description: descriptionParts.join(' '),
        });

        alertCreated = true;
      }
    } catch (err) {
      console.error('Error running brute-force detection:', err);
    }
  }

  return {
    alertCreated,
    loginWarning,
  };
}

module.exports = {
  logAuditEvent,
  runLoginDetectionRules,
};
