export type SecurityEventType =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILURE"
  | "MFA_CHALLENGE"
  | "PASSWORD_CHANGE"
  | string;

export interface SecurityActivity {
  id: string;
  userId: string | null;
  eventType: SecurityEventType;
  ipAddress: string | null;
  userAgent: string | null;
  geoLocation: string | null;
  metadata: Record<string, any> | null;
  createdAt: string;
  
  alerts?: {
    id: string;
    status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
  }[];
}

interface SecurityActivityResponse {
  success: boolean;
  data: SecurityActivity[];
  message?: string;
}

export type SecurityAlert = {
  id: string;
  userId: string | null;
  auditLogId: string | null;
  type: string;
  severity: string;
  description: string;
  status: string;
  createdAt: string;
  resolvedAt: string | null;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "";

// Fetch user's own audit logs
export async function getMySecurityActivities(token: string) {
  const res = await fetch(`${API_BASE_URL}/api/security/me/activities`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    credentials: "include",
  });

  if (!res.ok) {
    let details: any = null;
    try {
      details = await res.json();
    } catch {}

    const msg =
      details?.message ||
      `Failed to load security activities (status ${res.status})`;

    throw new Error(msg);
  }

  const json = (await res.json()) as SecurityActivityResponse;

  if (!json.success) {
    throw new Error(json.message || "Failed to load security activities");
  }

  return json.data;
}

export async function reportSuspiciousActivity(
  token: string,
  activityId: string,
  note?: string
): Promise<SecurityAlert> {
  const res = await fetch("/api/security/me/report-incident", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ activityId, note }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Failed to report incident: ${res.status} ${res.statusText} – ${text}`
    );
  }

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.message || "Failed to report incident");
  }

  return json.data as SecurityAlert;
}

export type AlertStatus = "OPEN" | "ACKNOWLEDGED" | "RESOLVED";

export type AdminAlert = {
  id: string;
  userId: string | null;
  auditLogId: string | null;
  type: string;
  severity: string;
  description: string;
  status: AlertStatus;
  createdAt: string;
  resolvedAt: string | null;

  // because backend includes relations in /alerts:
  user?: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;

  auditLog?: {
    id: string;
    eventType: string;
    ipAddress: string | null;
    createdAt: string;
    metadata: any;
  } | null;
};

type AdminAlertsResponse = {
  success: boolean;
  data: AdminAlert[];
  message?: string;
};

type AdminAlertUpdateResponse = {
  success: boolean;
  data: AdminAlert;
  message?: string;
};

export async function getAdminAlerts(
  token: string,
  params?: { status?: string; severity?: string; type?: string }
): Promise<AdminAlert[]> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.severity) qs.set("severity", params.severity);
  if (params?.type) qs.set("type", params.type);

  const res = await fetch(
    `${API_BASE_URL}/api/security/alerts${qs.toString() ? `?${qs.toString()}` : ""}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to load alerts: ${res.status} ${res.statusText} – ${text}`);
  }

  const json = (await res.json()) as AdminAlertsResponse;
  if (!json.success) throw new Error(json.message || "Failed to load alerts");

  return json.data;
}

// Update alert status (e.g., to ACKNOWLEDGED or RESOLVED)
export async function updateAlertStatus(
  token: string,
  alertId: string,
  status: AlertStatus
): Promise<AdminAlert> {
  const res = await fetch(`${API_BASE_URL}/api/security/alerts/${alertId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    credentials: "include",
    body: JSON.stringify({ status }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to update alert: ${res.status} ${res.statusText} – ${text}`);
  }

  const json = (await res.json()) as AdminAlertUpdateResponse;
  if (!json.success) throw new Error(json.message || "Failed to update alert");

  return json.data;
}
