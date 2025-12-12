"use client";

import { useEffect, useState } from "react";
import ContentWrapper from "@/components/ContentWrapper";
import AuthGuard from "@/components/AuthGuard";
import useAuthStore from "@/stores/authStore";
import {
  getAdminAuditLogs,
  getAdminAuditLogSummary,
  type AdminAuditLog,
  type AdminAuditLogSummary,
} from "@/lib/security/securityApi";

/* =========================
   Severity badges helpers
========================= */
type Severity = "LOW" | "MEDIUM" | "HIGH" | string;

function severityBadgeClass(sev: Severity) {
  switch (sev) {
    case "HIGH":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "MEDIUM":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "LOW":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
}

function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${severityBadgeClass(
        severity
      )}`}
    >
      {severity}
    </span>
  );
}

type AlertStatus = "OPEN" | "ACKNOWLEDGED" | "RESOLVED" | string;

function statusBadgeClass(status: AlertStatus) {
  switch (status) {
    case "OPEN":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "ACKNOWLEDGED":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "RESOLVED":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
}

function StatusBadge({ status }: { status: AlertStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusBadgeClass(
        status
      )}`}
    >
      {status}
    </span>
  );
}

/** Pick the "worst" severity among alerts (HIGH > MEDIUM > LOW) */
function pickHighestSeverity(alerts: any[] | undefined) {
  if (!alerts || alerts.length === 0) return null;

  const rank: Record<string, number> = { LOW: 1, MEDIUM: 2, HIGH: 3 };
  let best = alerts[0]?.severity || "LOW";

  for (const a of alerts) {
    const sev = a?.severity || "LOW";
    if ((rank[sev] || 0) > (rank[best] || 0)) best = sev;
  }
  return best;
}

function severityRank(sev: string | null) {
  switch (sev) {
    case "HIGH":
      return 3;
    case "MEDIUM":
      return 2;
    case "LOW":
      return 1;
    default:
      return 0;
  }
}

export default function AdminAuditLogsPage() {
  // filters
  const [eventType, setEventType] = useState("");
  const [search, setSearch] = useState("");
  const [ipAddress, setIpAddress] = useState("");
  const [severity, setSeverity] = useState("");

  // auth
  const initializeAuth = useAuthStore((s) => s.initializeAuth);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const user = useAuthStore((s) => s.user);

  // data
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [summary, setSummary] = useState<AdminAuditLogSummary | null>(null);

  // ui state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<AdminAuditLog | null>(null);

  // pagination
  const [page, setPage] = useState(1);
  const limit = 20;
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // page jump input
  const [pageInput, setPageInput] = useState<string>(String(page));
  useEffect(() => setPageInput(String(page)), [page]);

  // threat viz window
  const [windowRange, setWindowRange] = useState<"24h" | "7d">("24h");

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [eventType, search, ipAddress, severity]);

  // fetch logs
  useEffect(() => {
    if (!isLoggedIn) return;

    if (!user || user.role !== "ADMIN") {
      setError("Admin access required");
      setLoading(false);
      return;
    }

    const token = localStorage.getItem("authToken");
    if (!token) {
      setError("Missing auth token");
      setLoading(false);
      return;
    }

    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await getAdminAuditLogs(token, {
          page,
          limit,
          eventType: eventType || undefined,
          q: search || undefined,
          ipAddress: ipAddress || undefined,
          severity: (severity as any) || undefined,
        });

        if (!mounted) return;

        setLogs(data.rows);
        setTotalPages(data.totalPages);
        setTotalCount(data.total);
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message || "Failed to load audit logs");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [isLoggedIn, user, page, eventType, search, ipAddress, severity]);

  // fetch summary
  useEffect(() => {
    if (!isLoggedIn) return;
    if (!user || user.role !== "ADMIN") return;

    const token = localStorage.getItem("authToken");
    if (!token) return;

    let mounted = true;

    (async () => {
      try {
        const s = await getAdminAuditLogSummary(token, { window: windowRange });
        if (mounted) setSummary(s);
      } catch (e) {
        console.error("Summary error:", e);
        if (mounted) setSummary(null);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [isLoggedIn, user, windowRange]);

  // CSV export
  const handleExportCsv = async () => {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    const params = new URLSearchParams();
    if (eventType) params.set("eventType", eventType);
    if (search) params.set("q", search);
    if (ipAddress) params.set("ipAddress", ipAddress);
    if (severity) params.set("severity", severity);

    const res = await fetch(`/api/security/audit-logs/export.csv?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      alert("Failed to export CSV");
      return;
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `audit_logs_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    window.URL.revokeObjectURL(url);
  };

  return (
    <AuthGuard requireAuth redirectTo="/auth">
      <ContentWrapper>
        <div className="mx-auto max-w-6xl px-4 pb-8 pt-6">
          <h1 className="text-xl font-semibold text-slate-900">Audit Logs</h1>
          <p className="mb-4 text-sm text-slate-500">
            Raw security and authentication events across all users.
          </p>

          {/* ===== Threat Visualization window toggle ===== */}
          <div className="mb-4 flex items-center gap-2">
            <span className="text-xs text-slate-500">Window:</span>
            <button
              onClick={() => setWindowRange("24h")}
              className={`rounded border px-2 py-1 text-xs ${
                windowRange === "24h" ? "bg-slate-900 text-white" : "bg-white"
              }`}
            >
              24h
            </button>
            <button
              onClick={() => setWindowRange("7d")}
              className={`rounded border px-2 py-1 text-xs ${
                windowRange === "7d" ? "bg-slate-900 text-white" : "bg-white"
              }`}
            >
              7d
            </button>
          </div>

          {summary && (
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              {/* Failed logins over time */}
              <div className="rounded border p-3">
                <div className="mb-2 text-sm font-semibold">Failed logins over time</div>
                <div className="space-y-2">
                  {summary.failedLoginsOverTime.slice(-8).map((p: any) => (
                    <div key={p.t} className="flex items-center gap-2">
                      <div className="w-20 text-[11px] text-slate-500">
                        {new Date(p.t).toLocaleDateString()}
                      </div>
                      <div className="h-2 flex-1 overflow-hidden rounded bg-slate-100">
                        <div
                          className="h-2 bg-slate-800"
                          style={{
                            width: `${Math.min(
                              100,
                              (p.c /
                                Math.max(
                                  1,
                                  summary.failedLoginsOverTime.reduce(
                                    (m: any, x: any) => Math.max(m, x.c),
                                    0
                                  )
                                )) *
                                100
                            )}%`,
                          }}
                        />
                      </div>
                      <div className="w-8 text-right text-[11px] text-slate-700">{p.c}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top source IPs */}
              <div className="rounded border p-3">
                <div className="mb-2 text-sm font-semibold">Top source IPs (failures)</div>
                <div className="space-y-2">
                  {summary.topSourceIps.slice(0, 8).map((x: any) => (
                    <div key={x.ipAddress || "unknown"} className="flex items-center justify-between gap-2">
                      <div className="truncate text-[12px] text-slate-700">{x.ipAddress || "Unknown"}</div>
                      <div className="text-[12px] font-medium">{x.count}</div>
                    </div>
                  ))}
                  {summary.topSourceIps.length === 0 && <div className="text-xs text-slate-400">No data</div>}
                </div>
              </div>

              {/* Event types */}
              <div className="rounded border p-3">
                <div className="mb-2 text-sm font-semibold">Event types</div>
                <div className="space-y-2">
                  {summary.eventTypeBreakdown.slice(0, 8).map((x: any) => (
                    <div key={x.eventType} className="flex items-center justify-between gap-2">
                      <div className="text-[12px] text-slate-700">{x.eventType}</div>
                      <div className="text-[12px] font-medium">{x.count}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ===== Filters ===== */}
          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
            <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="rounded border px-3 py-2 text-sm"
                >
                <option value="">All events</option>
                <option value="LOGIN_FAILURE">Login failure</option>
                <option value="LOGIN_SUCCESS">Login success</option>
                <option value="MFA_FAILURE">MFA failure</option>
                <option value="MFA_SUCCESS">MFA success</option>
                <option value="PASSWORD_CHANGE">Password change</option>
            </select>

            <input
                type="text"
                placeholder="Search user (email or name)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="rounded border px-3 py-2 text-sm"
            />

            <input
                type="text"
                placeholder="Source IP"
                value={ipAddress}
                onChange={(e) => setIpAddress(e.target.value)}
                className="rounded border px-3 py-2 text-sm"
            />

            <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="rounded border px-3 py-2 text-sm"
            >
                <option value="">All severities</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
            </select>


            <button
              onClick={() => {
                setEventType("");
                setSearch("");
                setIpAddress("");
                setSeverity("");
              }}
              className="rounded border bg-slate-50 px-3 py-2 text-sm hover:bg-slate-100"
            >
              Clear filters
            </button>
          </div>

          {/* ===== CSV export ===== */}
          <div className="mb-4 flex justify-end">
            <button
              onClick={handleExportCsv}
              className="rounded border bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800"
            >
              Export CSV
            </button>
          </div>

          {loading && <p className="text-sm text-slate-500">Loading…</p>}

          {error && (
            <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          {/* ===== Table ===== */}
          {!loading && !error && (
            <div className="overflow-x-auto rounded border">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left">
                  <tr>
                    <th className="px-3 py-2">Time</th>
                    <th className="px-3 py-2">Event</th>
                    <th className="px-3 py-2">User</th>
                    <th className="px-3 py-2">IP</th>
                    <th className="px-3 py-2">Alerts</th>
                    <th className="px-3 py-2">Severity</th>
                  </tr>
                </thead>

                <tbody>
                {[...logs]
                .sort(
                    (a, b) =>
                    severityRank(pickHighestSeverity(b.alerts as any)) -
                    severityRank(pickHighestSeverity(a.alerts as any))
                )
                .map((log) => {

                    const highest = pickHighestSeverity(log.alerts as any);

                    return (
                      <tr
                        key={log.id}
                        className="cursor-pointer border-t hover:bg-slate-50"
                        onClick={() => setSelectedLog(log)}
                      >
                        <td className="whitespace-nowrap px-3 py-2">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="px-3 py-2 font-medium">{log.eventType}</td>
                        <td className="px-3 py-2">
                          {log.user ? log.user.email : <span className="text-slate-400">Anonymous</span>}
                        </td>
                        <td className="px-3 py-2">{log.ipAddress || "-"}</td>
                        <td className="px-3 py-2">
                          {log.alerts && log.alerts.length > 0 ? (
                            <span className="text-amber-700">{log.alerts.length}</span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {highest ? <SeverityBadge severity={highest} /> : <span className="text-slate-400">—</span>}
                        </td>
                      </tr>
                    );
                  })}

                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-slate-400">
                        No audit logs found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ===== Pagination ===== */}
          <div className="flex items-center justify-between px-2 py-3 text-sm">
            <div className="text-slate-500">
              Showing page <span className="font-medium">{page}</span> of{" "}
              <span className="font-medium">{totalPages}</span> ({totalCount} events)
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={totalPages || 1}
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const n = Math.max(1, Math.min(Number(totalPages || 1), parseInt(pageInput || "0", 10) || 1));
                    setPage(n);
                  }
                }}
                className="w-20 rounded border px-2 py-1 text-sm"
                aria-label="Jump to page"
              />

              <button
                onClick={() => {
                  const n = Math.max(1, Math.min(Number(totalPages || 1), parseInt(pageInput || "0", 10) || 1));
                  setPage(n);
                }}
                className="rounded border px-2 py-1 text-sm"
              >
                Go
              </button>

              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page <= 1}
                className="rounded border px-3 py-1 disabled:opacity-50"
              >
                Previous
              </button>

              <button
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page >= totalPages}
                className="rounded border px-3 py-1 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* ===== Detail Drawer ===== */}
        {selectedLog && (
          <div className="fixed inset-0 z-50 flex">
            <div className="fixed inset-0 bg-black/30" onClick={() => setSelectedLog(null)} />

            <div className="relative ml-auto h-full w-full max-w-xl overflow-y-auto bg-white shadow-xl">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <h2 className="text-sm font-semibold">Audit Log Details</h2>
                <button onClick={() => setSelectedLog(null)} className="text-slate-500 hover:text-slate-800">
                  ✕
                </button>
              </div>

              <div className="space-y-4 p-4 text-sm">
                <div>
                  <div className="text-xs text-slate-500">Event</div>
                  <div className="font-medium">{selectedLog.eventType}</div>
                </div>

                <div>
                  <div className="text-xs text-slate-500">Time</div>
                  <div>{new Date(selectedLog.createdAt).toLocaleString()}</div>
                </div>

                <div>
                  <div className="text-xs text-slate-500">User</div>
                  <div>{selectedLog.user ? selectedLog.user.email : "Anonymous"}</div>
                </div>

                <div>
                  <div className="text-xs text-slate-500">Source IP</div>
                  <div>{selectedLog.ipAddress || "-"}</div>
                </div>

                <div>
                  <div className="text-xs text-slate-500">User Agent</div>
                  <div className="break-all text-slate-700">{selectedLog.userAgent || "-"}</div>
                </div>

                <div>
                  <div className="mb-1 text-xs text-slate-500">Metadata</div>
                  <pre className="overflow-x-auto rounded bg-slate-50 p-3 text-xs">
                    {JSON.stringify(selectedLog.metadata || {}, null, 2)}
                  </pre>
                </div>

                {selectedLog.alerts && selectedLog.alerts.length > 0 && (
                  <div>
                    <div className="mb-1 text-xs text-slate-500">Linked Alerts</div>
                    <ul className="space-y-2">
                      {selectedLog.alerts.map((alert: any) => (
                        <li key={alert.id} className="rounded border p-2">
                            <div className="flex items-center gap-2">
                                <div className="font-medium">{alert.type}</div>
                                <SeverityBadge severity={alert.severity} />
                                <StatusBadge status={alert.status} />
                            </div>

                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </ContentWrapper>
    </AuthGuard>
  );
}
