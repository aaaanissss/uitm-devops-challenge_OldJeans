// page for /admin/security/alerts - shows security alerts for admin users (TASK 4)

"use client";

import React, { useEffect, useMemo, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import ContentWrapper from "@/components/ContentWrapper";
import useAuthStore from "@/stores/authStore";
import {
  getAdminAlerts,
  updateAlertStatus,
  type AdminAlert,
  type AlertStatus,
} from "@/lib/security/securityApi";

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function badgeClass(status: string) {
  if (status === "OPEN") return "bg-red-50 text-red-700 border-red-200";
  if (status === "ACKNOWLEDGED") return "bg-amber-50 text-amber-700 border-amber-200";
  if (status === "RESOLVED") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
}

export default function AdminSecurityAlertsPage() {
  const user = useAuthStore((s) => s.user);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const initializeAuth = useAuthStore((s) => s.initializeAuth);

  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // filters
  const [status, setStatus] = useState<string>(""); // OPEN/ACKNOWLEDGED/RESOLVED
  const [severity, setSeverity] = useState<string>("");
  const [type, setType] = useState<string>("");

  const isAdmin = useMemo(() => {
    const role = user?.role || "";
    return role.toUpperCase() === "ADMIN";
  }, [user?.role]);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  const loadAlerts = async () => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("authToken") : null;

    if (!token) {
      setError("Missing auth token. Please log in again.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getAdminAlerts(token, {
        status: status || undefined,
        severity: severity || undefined,
        type: type || undefined,
      });
      setAlerts(data);
    } catch (e: any) {
      setError(e?.message || "Failed to load alerts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    loadAlerts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, isAdmin, status, severity, type]);

  const handleUpdate = async (alertId: string, nextStatus: AlertStatus) => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("authToken") : null;

    if (!token) {
      setError("Missing auth token. Please log in again.");
      return;
    }

    try {
      setError(null);
      const updated = await updateAlertStatus(token, alertId, nextStatus);

      // update local list
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, ...updated } : a))
      );
    } catch (e: any) {
      setError(e?.message || "Failed to update alert status");
    }
  };

  return (
    <AuthGuard requireAuth={true} redirectTo="/auth">
      <ContentWrapper>
        <div className="mx-auto max-w-6xl px-4 pb-8 pt-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">
                Admin Security Alerts
              </h1>
              <p className="text-sm text-slate-500">
                Monitor suspicious activity alerts and triage incidents.
              </p>
            </div>

            <button
              onClick={loadAlerts}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Refresh
            </button>
          </div>

          {!isAdmin && (
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              Admin access required.
            </div>
          )}

          {isAdmin && (
            <>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <label className="text-xs text-slate-500">Status</label>
                  <select
                    className="mt-1 w-full rounded-md border border-slate-200 p-2 text-sm"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="">All</option>
                    <option value="OPEN">OPEN</option>
                    <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
                    <option value="RESOLVED">RESOLVED</option>
                  </select>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <label className="text-xs text-slate-500">Severity</label>
                  <select
                    className="mt-1 w-full rounded-md border border-slate-200 p-2 text-sm"
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                  >
                    <option value="">All</option>
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                  </select>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <label className="text-xs text-slate-500">Type</label>
                  <input
                    className="mt-1 w-full rounded-md border border-slate-200 p-2 text-sm"
                    placeholder='e.g. BRUTE_FORCE'
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                  />
                </div>
              </div>

              {error && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
                <div className="border-b border-slate-200 px-4 py-3">
                  <div className="text-sm font-medium text-slate-900">
                    Alerts
                  </div>
                  <div className="text-xs text-slate-500">
                    {loading ? "Loading..." : `${alerts.length} result(s)`}
                  </div>
                </div>

                {loading ? (
                  <div className="p-4 text-sm text-slate-600">Loading alerts...</div>
                ) : alerts.length === 0 ? (
                  <div className="p-4 text-sm text-slate-600">No alerts found.</div>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {alerts.map((a) => (
                      <div key={a.id} className="p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${badgeClass(
                                  a.status
                                )}`}
                              >
                                {a.status}
                              </span>
                              <span className="rounded-full bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700 border border-slate-200">
                                {a.severity}
                              </span>
                              <span className="rounded-full bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700 border border-slate-200">
                                {a.type}
                              </span>
                              <span className="text-xs text-slate-400">
                                {formatDate(a.createdAt)}
                              </span>
                            </div>

                            <div className="mt-2 text-sm text-slate-800">
                              {a.description}
                            </div>

                            <div className="mt-2 grid grid-cols-1 gap-1 text-xs text-slate-500 sm:grid-cols-2">
                              <div>
                                <span className="font-medium text-slate-600">
                                  User:
                                </span>{" "}
                                {a.user?.email || a.userId || "—"}
                              </div>
                              <div>
                                <span className="font-medium text-slate-600">
                                  IP:
                                </span>{" "}
                                {a.auditLog?.ipAddress || "—"}
                              </div>
                              <div>
                                <span className="font-medium text-slate-600">
                                  Event:
                                </span>{" "}
                                {a.auditLog?.eventType || "—"}
                              </div>
                              <div className="truncate">
                                <span className="font-medium text-slate-600">
                                  AuditLog:
                                </span>{" "}
                                {a.auditLogId || "—"}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 sm:justify-end">
                            <button
                              onClick={() => handleUpdate(a.id, "ACKNOWLEDGED")}
                              disabled={a.status === "ACKNOWLEDGED" || a.status === "RESOLVED"}
                              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                            >
                              Acknowledge
                            </button>
                            <button
                              onClick={() => handleUpdate(a.id, "RESOLVED")}
                              disabled={a.status === "RESOLVED"}
                              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                            >
                              Resolve
                            </button>
                            <button
                              onClick={() => handleUpdate(a.id, "OPEN")}
                              disabled={a.status === "OPEN"}
                              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                            >
                              Reopen
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </ContentWrapper>
    </AuthGuard>
  );
}
