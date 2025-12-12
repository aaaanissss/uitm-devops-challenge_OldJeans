const express = require('express');
const { prisma } = require('../config/database');
const { auth } = require('../middleware/auth'); // existing JWT middleware
const router = express.Router();

/**
 * Simple admin guard based on req.user.role
 * Assumes `auth` middleware has already populated req.user = { userId, role, ... }
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required',
    });
  }
  next();
}

/**
 * GET /api/security/alerts
 * Admin-only: list security alerts
 * Optional query params:
 *  - status: OPEN | ACKNOWLEDGED | RESOLVED
 *  - severity: LOW | MEDIUM | HIGH
 *  - type: BRUTE_FORCE | NEW_DEVICE | ...
 */
router.get('/alerts', auth, requireAdmin, async (req, res) => {
  try {
    const { status, severity, type } = req.query;

    const where = {};
    if (status) where.status = status;
    if (severity) where.severity = severity;
    if (type) where.type = type;

    const alerts = await prisma.alert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        auditLog: {
          select: {
            id: true,
            eventType: true,
            ipAddress: true,
            createdAt: true,
            metadata: true,
          },
        },
      },
    });

    return res.json({
      success: true,
      data: alerts,
    });
  } catch (err) {
    console.error('Error fetching alerts:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * PATCH /api/security/alerts/:id
 * Admin-only: update alert status (e.g. mark as ACKNOWLEDGED or RESOLVED)
 * Body:
 *  { "status": "ACKNOWLEDGED" | "RESOLVED" | "OPEN" }
 */
router.patch('/alerts/:id', auth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required',
      });
    }

    // Optional: validate against allowed enum values
    const allowedStatuses = ['OPEN', 'ACKNOWLEDGED', 'RESOLVED'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value',
      });
    }

    const updated = await prisma.alert.update({
      where: { id },
      data: {
        status,
        resolvedAt: status === 'RESOLVED' ? new Date() : null,
      },
    });

    return res.json({
      success: true,
      data: updated,
    });
  } catch (err) {
    console.error('Error updating alert status:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * GET /api/security/me/activities
 * User: view own recent login-related audit logs
 * Returns last 20 rows for the current user.
 */
router.get('/me/activities', auth, async (req, res) => {
  try {
    // auth middleware should set req.user.userId
    const userId = req.user && (req.user.userId || req.user.id);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Fetch last 20 login-related audit logs for this user
    const logs = await prisma.auditLog.findMany({
      where: {
        userId,
        eventType: {
          in: [
            'LOGIN_SUCCESS',
            'LOGIN_FAILURE',
            'MFA_CHALLENGE',
            'MFA_SUCCESS',
            'MFA_FAILURE',
          ],
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        alerts: {
          select: {
            id: true,
            status: true,      // OPEN | ACKNOWLEDGED | RESOLVED
            resolvedAt: true,  
            createdAt: true,   
            type: true,        
            severity: true,    
            description: true, 
          },
          orderBy: { createdAt: "desc" }, // optional: latest first
        },
      },
    });
    return res.json({
      success: true,
      data: logs,
    });
  } catch (err) {
    console.error('Error fetching user activities:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * POST /api/security/me/report-incident
 * Body: { activityId?: string, note?: string }
 * Creates a SUSPICIOUS_ACTIVITY alert linked to the user (and optionally to an audit log).
 */
router.post("/me/report-incident", auth, async (req, res) => {
  try {
    const userId = req.user && (req.user.userId || req.user.id);
    const { activityId, note } = req.body || {};

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    let auditLog = null;

    if (activityId) {
      auditLog = await prisma.auditLog.findFirst({
        where: {
          id: activityId,
          userId,
        },
      });

      if (!auditLog) {
        return res.status(404).json({
          success: false,
          message: "Activity not found or does not belong to this user",
        });
      }
    }

    const alert = await prisma.alert.create({
      data: {
        type: "SUSPICIOUS_ACTIVITY",
        severity: "HIGH",
        status: "OPEN",
        userId,
        auditLogId: auditLog ? auditLog.id : null,
        description:
          (note && note.trim()) ||
          "User reported suspicious activity from account security page.",
      },
    });

    return res.json({
      success: true,
      data: alert,
    });
  } catch (err) {
  console.error("report-incident error:", err);
  return res.status(500).json({
    success: false,
    message: err?.message || "Failed to report incident",
    code: err?.code || null,
  });
}
});

/** GET /api/security/me/summary
 * User: get security summary (last login, failed attempts, open alerts)
 */
router.get('/me/summary', auth, async (req, res) => {
  try {
    const userId = req.user.userId;

    // 1. Last login
    const lastLogin = await prisma.auditLog.findFirst({
      where: { userId, eventType: 'LOGIN_SUCCESS' },
      orderBy: { createdAt: 'desc' },
    });

    // 2. Failed logins in the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const failedLoginsCount = await prisma.auditLog.count({
      where: {
        userId,
        eventType: 'LOGIN_FAILURE',
        createdAt: { gte: sevenDaysAgo },
      },
    });

    // 3. Open alerts assigned to this user
    const openAlertsCount = await prisma.alert.count({
      where: {
        userId,
        status: 'OPEN',
      },
    });

    res.json({
      success: true,
      data: {
        lastLoginAt: lastLogin?.createdAt || null,
        failedLoginsLast7d: failedLoginsCount,
        openAlertsCount,
      },
    });

  } catch (err) {
    console.error("Security summary error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch security summary",
    });
  }
});
module.exports = router;