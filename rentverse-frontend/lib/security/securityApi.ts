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
