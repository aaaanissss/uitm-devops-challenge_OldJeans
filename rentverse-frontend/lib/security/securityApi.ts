import { createApiUrl } from '@/utils/apiConfig'

export type SecurityEventType =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILURE'
  | 'MFA_CHALLENGE'
  | 'PASSWORD_CHANGE'
  | string

export interface SecurityActivityAlert {
  id: string
  status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED'
  resolvedAt?: string | null
  createdAt?: string
  type?: string
  severity?: string
  description?: string
}

export interface SecurityActivity {
  id: string
  userId: string | null
  eventType: SecurityEventType
  ipAddress: string | null
  userAgent: string | null
  geoLocation: string | null
  metadata: Record<string, any> | null
  createdAt: string
  alerts?: SecurityActivityAlert[]
}

interface SecurityActivityResponse {
  success: boolean
  data: SecurityActivity[]
  message?: string
}

export type SecurityAlert = {
  id: string
  userId: string | null
  auditLogId: string | null
  type: string
  severity: string
  description: string
  status: string
  createdAt: string
  resolvedAt: string | null
}

// ---------- helpers ----------
function jsonHeaders(token: string) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

async function readErrorMessage(res: Response) {
  // backend might return JSON or text
  try {
    const j = await res.json()
    return j?.message || j?.error || JSON.stringify(j)
  } catch {
    return await res.text().catch(() => '')
  }
}

// ---------- USER endpoints ----------
export async function getMySecurityActivities(token: string) {
  // ✅ NO "/api" here
  const res = await fetch(createApiUrl('security/me/activities'), {
    method: 'GET',
    headers: jsonHeaders(token),
    // credentials: 'include',  // <- usually not needed when using Bearer token
  })

  if (!res.ok) {
    const msg = (await readErrorMessage(res)) || `Failed to load security activities (${res.status})`
    throw new Error(msg)
  }

  const json = (await res.json()) as SecurityActivityResponse
  if (!json.success) throw new Error(json.message || 'Failed to load security activities')

  return json.data
}

export async function reportSuspiciousActivity(
  token: string,
  activityId: string,
  note?: string,
): Promise<SecurityAlert> {
  // ✅ NO "/api" here
  const res = await fetch(createApiUrl('security/me/report-incident'), {
    method: 'POST',
    headers: jsonHeaders(token),
    body: JSON.stringify({ activityId, note }),
  })

  if (!res.ok) {
    const msg = await readErrorMessage(res)
    throw new Error(`Failed to report incident: ${res.status} ${res.statusText} – ${msg}`)
  }

  const json = await res.json()
  if (!json.success) throw new Error(json.message || 'Failed to report incident')

  return json.data as SecurityAlert
}

// ---------- ADMIN endpoints ----------
export type AlertStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED'

export type AdminAlert = {
  id: string
  userId: string | null
  auditLogId: string | null
  type: string
  severity: string
  description: string
  status: AlertStatus
  createdAt: string
  resolvedAt: string | null

  user?: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
  } | null

  auditLog?: {
    id: string
    eventType: string
    ipAddress: string | null
    createdAt: string
    metadata: any
  } | null
}

type AdminAlertsResponse = {
  success: boolean
  data: AdminAlert[]
  message?: string
}

type AdminAlertUpdateResponse = {
  success: boolean
  data: AdminAlert
  message?: string
}

export async function getAdminAlerts(
  token: string,
  params?: { status?: string; severity?: string; type?: string },
): Promise<AdminAlert[]> {
  const qs = new URLSearchParams()
  if (params?.status) qs.set('status', params.status)
  if (params?.severity) qs.set('severity', params.severity)
  if (params?.type) qs.set('type', params.type)

  const url = createApiUrl(`security/alerts${qs.toString() ? `?${qs.toString()}` : ''}`)

  const res = await fetch(url, {
    method: 'GET',
    headers: jsonHeaders(token),
  })

  if (!res.ok) {
    const msg = await readErrorMessage(res)
    throw new Error(`Failed to load alerts: ${res.status} ${res.statusText} – ${msg}`)
  }

  const json = (await res.json()) as AdminAlertsResponse
  if (!json.success) throw new Error(json.message || 'Failed to load alerts')

  return json.data
}

export async function updateAlertStatus(
  token: string,
  alertId: string,
  status: AlertStatus,
): Promise<AdminAlert> {
  const res = await fetch(createApiUrl(`security/alerts/${alertId}`), {
    method: 'PATCH',
    headers: jsonHeaders(token),
    body: JSON.stringify({ status }),
  })

  if (!res.ok) {
    const msg = await readErrorMessage(res)
    throw new Error(`Failed to update alert: ${res.status} ${res.statusText} – ${msg}`)
  }

  const json = (await res.json()) as AdminAlertUpdateResponse
  if (!json.success) throw new Error(json.message || 'Failed to update alert')

  return json.data
}

// ---------- ADMIN Audit logs ----------
export interface AdminAuditLog {
  id: string
  eventType: string
  createdAt: string
  ipAddress: string | null
  userAgent: string | null
  metadata: Record<string, any> | null

  user?: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
  } | null

  alerts?: {
    id: string
    type: string
    severity: string
    status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED'
    createdAt: string
  }[]
}

type AdminAuditLogsResponse = {
  success: boolean
  data: {
    rows: AdminAuditLog[]
    page: number
    limit: number
    total: number
    totalPages: number
  }
  message?: string
}

export async function getAdminAuditLogs(
  token: string,
  params?: {
    page?: number
    limit?: number
    eventType?: string
    q?: string
    ipAddress?: string
    severity?: 'LOW' | 'MEDIUM' | 'HIGH'
  },
) {
  const qs = new URLSearchParams()
  if (params?.page) qs.set('page', String(params.page))
  if (params?.limit) qs.set('limit', String(params.limit))
  if (params?.eventType) qs.set('eventType', params.eventType)
  if (params?.q) qs.set('q', params.q)
  if (params?.ipAddress) qs.set('ipAddress', params.ipAddress)
  if (params?.severity) qs.set('severity', params.severity)

  const url = createApiUrl(`security/audit-logs${qs.toString() ? `?${qs.toString()}` : ''}`)

  const res = await fetch(url, {
    method: 'GET',
    headers: jsonHeaders(token),
  })

  if (!res.ok) {
    const msg = await readErrorMessage(res)
    throw new Error(`Failed to load audit logs: ${res.status} ${msg}`)
  }

  const json = (await res.json()) as AdminAuditLogsResponse
  if (!json.success) throw new Error(json.message || 'Failed to load audit logs')

  return json.data
}

export type AdminAuditLogSummary = {
  window: string
  start: string
  end: string
  failedLoginsOverTime: { t: string; c: number }[]
  topSourceIps: { ipAddress: string | null; count: number }[]
  eventTypeBreakdown: { eventType: string; count: number }[]
}

type AdminAuditLogSummaryResponse = {
  success: boolean
  data: AdminAuditLogSummary
  message?: string
}

export async function getAdminAuditLogSummary(
  token: string,
  params?: { window?: '24h' | '7d' },
): Promise<AdminAuditLogSummary> {
  const qs = new URLSearchParams()
  if (params?.window) qs.set('window', params.window)

  const url = createApiUrl(`security/audit-logs/summary${qs.toString() ? `?${qs.toString()}` : ''}`)

  const res = await fetch(url, {
    method: 'GET',
    headers: jsonHeaders(token),
  })

  if (!res.ok) {
    const msg = await readErrorMessage(res)
    throw new Error(`Failed to load audit summary: ${res.status} ${msg}`)
  }

  const json = (await res.json()) as AdminAuditLogSummaryResponse
  if (!json.success) throw new Error(json.message || 'Failed to load audit summary')

  return json.data
}
