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

// Utility to escape CSV values
function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const str = String(value).replace(/"/g, '""');
  return `"${str}"`;
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
    const status = typeof req.query.status === 'string' ? req.query.status.toUpperCase() : undefined;
    const severity = typeof req.query.severity === 'string' ? req.query.severity.toUpperCase() : undefined;
    const type = typeof req.query.type === 'string' ? req.query.type.toUpperCase() : undefined;

    const allowedStatuses = ['OPEN', 'ACKNOWLEDGED', 'RESOLVED'];
    const allowedSeverities = ['LOW', 'MEDIUM', 'HIGH'];

    // IMPORTANT: replace with your REAL alert types / Prisma enum values
    const allowedTypes = [
      'BRUTE_FORCE',
      'SUSPICIOUS_ACTIVITY',
      'NEW_DEVICE',
      'IMPOSSIBLE_TRAVEL',
      'MULTI_ACCOUNT_FAILURE',
      'SUSPICIOUS_MFA',
      'OTHER',
    ];


    // If user passes an invalid enum value, return empty list (or 400)
    if (status && !allowedStatuses.includes(status)) {
      return res.status(200).json({ success: true, data: [] });
      // or: return res.status(400).json({ success:false, message:'Invalid status' })
    }
    if (severity && !allowedSeverities.includes(severity)) {
      return res.status(200).json({ success: true, data: [] });
    }
    if (type && !allowedTypes.includes(type)) {
      return res.status(200).json({ success: true, data: [] });
    }

    const where = {};
    if (status) where.status = status;
    if (severity) where.severity = severity;
    if (type) where.type = type;

    const alerts = await prisma.alert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        auditLog: { select: { id: true, eventType: true, ipAddress: true, createdAt: true, metadata: true } },
      },
    });

    return res.json({ success: true, data: alerts });
  } catch (err) {
    console.error('Error fetching alerts:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
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
 * GET /api/security/audit-logs
 * Admin-only: list raw audit log entries (all users)
 *
 * Query params:
 *  - page (default 1)
 *  - limit (default 50, max 200)
 *  - eventType (string or comma-separated list, e.g. LOGIN_FAILURE,MFA_FAILURE)
 *  - userId
 *  - q (search by user email/first/last name)
 *  - ipAddress
 *  - from (ISO date)
 *  - to (ISO date)
 */
router.get("/audit-logs", auth, requireAdmin, async (req, res) => {
  try {
    const {
      page = "1",
      limit = "50",
      eventType,
      userId,
      q,
      ipAddress,
      from,
      to,
      severity
    } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const skip = (pageNum - 1) * limitNum;

    const where = {};

    // eventType: allow comma-separated or single
    if (eventType) {
      const list = String(eventType)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      if (list.length === 1) where.eventType = list[0];
      else if (list.length > 1) where.eventType = { in: list };
    }

    if (userId) where.userId = String(userId);

    if (ipAddress) {
      // exact match is fine too; "contains" is convenient for partial
      where.ipAddress = { contains: String(ipAddress) };
    }

    // date range on createdAt
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(String(from));
      if (to) where.createdAt.lte = new Date(String(to));
    }

    // q search against related user fields
    if (q) {
      const query = String(q).trim();
      if (query) {
        where.user = {
          OR: [
            { email: { contains: query, mode: "insensitive" } },
            { firstName: { contains: query, mode: "insensitive" } },
            { lastName: { contains: query, mode: "insensitive" } },
          ],
        };
      }
    }

    if (severity) {
      where.alerts = {
        some: {
          severity: String(severity), // "HIGH" | "MEDIUM" | "LOW"
        },
      };
    }

    const [total, rows] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          alerts: {
            select: {
              id: true,
              type: true,
              severity: true,
              status: true,
              createdAt: true,
              resolvedAt: true,
            },
            orderBy: { createdAt: "desc" },
          },
        },
      }),
    ]);

    return res.json({
      success: true,
      data: {
        rows,
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error("Error fetching audit logs:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

/**
 * GET /api/security/audit-logs/export.csv
 * Admin-only: export audit logs as CSV (for forensics)
 */
router.get("/audit-logs/export.csv", auth, requireAdmin, async (req, res) => {
  try {
    const {
      eventType,
      userId,
      q,
      ipAddress,
      from,
      to,
    } = req.query;

    const where = {};

    // same filters as /audit-logs
    if (eventType) {
      const list = String(eventType).split(",").map(s => s.trim());
      where.eventType = list.length === 1 ? list[0] : { in: list };
    }

    if (userId) where.userId = String(userId);

    if (ipAddress) {
      where.ipAddress = { contains: String(ipAddress) };
    }

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    if (q) {
      where.user = {
        OR: [
          { email: { contains: q, mode: "insensitive" } },
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
        ],
      };
    }

    // HARD CAP for safety (forensics best practice)
    const rows = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 10000,
      include: {
        user: { select: { email: true } },
        alerts: { select: { type: true } },
      },
    });

    // CSV header
    let csv = [
      [
        "createdAt",
        "eventType",
        "userEmail",
        "ipAddress",
        "userAgent",
        "geoLocation",
        "alertCount",
        "alertTypes",
        "metadata",
      ].join(","),
    ];

    // CSV rows
    for (const r of rows) {
      csv.push([
        csvEscape(r.createdAt.toISOString()),
        csvEscape(r.eventType),
        csvEscape(r.user?.email || ""),
        csvEscape(r.ipAddress || ""),
        csvEscape(r.userAgent || ""),
        csvEscape(r.geoLocation || ""),
        csvEscape(r.alerts.length),
        csvEscape(r.alerts.map(a => a.type).join(";")),
        csvEscape(JSON.stringify(r.metadata || {})),
      ].join(","));
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="audit_logs_${Date.now()}.csv"`
    );

    return res.send(csv.join("\n"));
  } catch (err) {
    console.error("CSV export error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to export CSV",
    });
  }
});

/**
 * GET /api/security/audit-logs/summary
 * Admin-only: basic threat visualization aggregates
 *
 * Query params:
 *  - window: "24h" | "7d" (default "24h")
 */
router.get("/audit-logs/summary", auth, requireAdmin, async (req, res) => {
  try {
    const window = String(req.query.window || "24h");

    const now = new Date();
    const start =
      window === "7d"
        ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        : new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // 1) Failed logins over time (bucketed)
    const failedLoginsOverTime =
      window === "7d"
        ? await prisma.$queryRaw`
            SELECT date_trunc('day', "createdAt") AS t, COUNT(*)::int AS c
            FROM "audit_logs"
            WHERE "eventType" = 'LOGIN_FAILURE' ::"AuditEventType"
              AND "createdAt" >= ${start}
            GROUP BY 1
            ORDER BY 1 ASC
          `
        : await prisma.$queryRaw`
            SELECT date_trunc('hour', "createdAt") AS t, COUNT(*)::int AS c
            FROM "audit_logs"
            WHERE "eventType" = 'LOGIN_FAILURE' ::"AuditEventType"
              AND "createdAt" >= ${start}
            GROUP BY 1
            ORDER BY 1 ASC
          `;

    // 2) Top source IPs for LOGIN_FAILURE
   const topSourceIps = await prisma.auditLog.groupBy({
      by: ["ipAddress"],
      where: {
        eventType: "LOGIN_FAILURE",
        createdAt: { gte: start },
        ipAddress: { not: null },
      },
      _count: { ipAddress: true },
      orderBy: { _count: { ipAddress: "desc" } },
      take: 10,
    });

    // 3) Event type breakdown (all event types in window)
    const eventTypeBreakdown = await prisma.auditLog.groupBy({
      by: ["eventType"],
      where: { createdAt: { gte: start } },
      _count: { eventType: true },
      orderBy: { _count: { eventType: "desc" } },
      take: 20,
    });

    return res.json({
      success: true,
      data: {
        window,
        start,
        end: now,
        failedLoginsOverTime,
        topSourceIps: topSourceIps.map((x) => ({
          ipAddress: x.ipAddress,
          count: x._count.ipAddress,
        })),
        eventTypeBreakdown: eventTypeBreakdown.map((x) => ({
          eventType: x.eventType,
          count: x._count.eventType,
        })),
      },
    });
  } catch (err) {
    console.error("Error building audit log summary:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
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