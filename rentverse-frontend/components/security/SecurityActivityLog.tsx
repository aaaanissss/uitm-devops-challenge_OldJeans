"use client";

import React from "react";
import type { SecurityActivity } from "@/lib/security/securityApi";

type Props = {
  activities: SecurityActivity[];
  isLoading: boolean;
  error: string | null;
  onReport?: (activity: SecurityActivity) => void;

  // Local UI-state (optional)
  reportedIds?: Set<string>;
  reportingId?: string | null;
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString();
}

function getEventLabel(eventType: string) {
  switch (eventType) {
    case "LOGIN_SUCCESS":
      return {
        label: "Login successful",
        badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
        icon: "🟢",
      };
    case "LOGIN_FAILURE":
      return {
        label: "Login failed",
        badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
        icon: "🔴",
      };
    case "MFA_CHALLENGE":
      return {
        label: "MFA challenge",
        badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
        icon: "🟡",
      };
    case "MFA_VERIFY_SUCCESS":
      return {
        label: "MFA verified",
        badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
        icon: "✅",
      };
    case "MFA_VERIFY_FAILURE":
      return {
        label: "MFA verification failed",
        badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
        icon: "⚠️",
      };
    default:
      return {
        label: eventType,
        badgeClass: "bg-slate-50 text-slate-700 border-slate-200",
        icon: "ℹ️",
      };
  }
}

type AlertStatus = "OPEN" | "ACKNOWLEDGED" | "RESOLVED";

function getAlertState(activity: any): {
  hasAlerts: boolean;
  state: "NONE" | "REPORTED" | "ACKNOWLEDGED" | "RESOLVED";
  resolvedAt?: string | null;
} {
  const alerts = Array.isArray(activity?.alerts) ? activity.alerts : [];
  if (alerts.length === 0) return { hasAlerts: false, state: "NONE", resolvedAt: null };

  const statuses = alerts.map((a: any) => String(a.status || "").toUpperCase()) as AlertStatus[];

  const allResolved = statuses.length > 0 && statuses.every((s) => s === "RESOLVED");
  const anyAck = statuses.some((s) => s === "ACKNOWLEDGED");

  // latest resolvedAt (if any)
  const resolvedTimes = alerts
    .map((a: any) => a?.resolvedAt)
    .filter(Boolean) as string[];

  const latestResolvedAt =
    resolvedTimes.length > 0
      ? resolvedTimes.sort((a, b) => +new Date(b) - +new Date(a))[0]
      : null;

  if (allResolved) return { hasAlerts: true, state: "RESOLVED", resolvedAt: latestResolvedAt };
  if (anyAck) return { hasAlerts: true, state: "ACKNOWLEDGED", resolvedAt: null };
  return { hasAlerts: true, state: "REPORTED", resolvedAt: null };
}

function alertBadge(state: "REPORTED" | "ACKNOWLEDGED" | "RESOLVED") {
  if (state === "REPORTED") {
    return {
      text: "Reported",
      cls: "border-blue-200 bg-blue-50 text-blue-700",
    };
  }
  if (state === "ACKNOWLEDGED") {
    return {
      text: "Acknowledged",
      cls: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }
  return {
    text: "Resolved",
    cls: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };
}

export function SecurityActivityLog({
  activities,
  isLoading,
  error,
  onReport,
  reportedIds,
  reportingId,
}: Props) {
  if (isLoading) {
    return (
      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
        Loading security activity…
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        {error}
      </div>
    );
  }

  if (!activities.length) {
    return (
      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        No recent security events found.
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      {activities.map((activity) => {
        const { label, badgeClass, icon } = getEventLabel(activity.eventType);

        const location =
          activity.geoLocation ?? activity.ipAddress ?? "Location/IP not available";

        const device =
          activity.userAgent && activity.userAgent.length > 0
            ? activity.userAgent
            : "Unknown device";

        const email =
          typeof activity.metadata?.email === "string" ? activity.metadata.email : undefined;

        // NEW: derive status from backend alerts (if your API includes alerts)
        const { state, resolvedAt } = getAlertState(activity);

        // Local immediate feedback still supported
        const locallyReported = reportedIds?.has(activity.id) ?? false;

        const isReportedLike =
          locallyReported || state === "REPORTED" || state === "ACKNOWLEDGED" || state === "RESOLVED";

        const isResolved = state === "RESOLVED";
        const isReporting = reportingId === activity.id;

        const statusBadge =
          state === "NONE" ? null : alertBadge(state as "REPORTED" | "ACKNOWLEDGED" | "RESOLVED");

        return (
          <div
            key={activity.id}
            className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${badgeClass}`}
                >
                  <span>{icon}</span>
                  <span>{label}</span>
                </span>

                {email && <span className="text-xs text-slate-500">({email})</span>}

                {statusBadge && (
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusBadge.cls}`}
                  >
                    {statusBadge.text}
                  </span>
                )}
              </div>

              <span className="text-xs text-slate-500">{formatDateTime(activity.createdAt)}</span>
            </div>

            <div className="flex flex-col gap-1 text-xs text-slate-600">
              <div>
                <span className="font-medium text-slate-700">Location/IP:</span> {location}
              </div>
              <div>
                <span className="font-medium text-slate-700">Device:</span> {device}
              </div>

              {activity.metadata?.reason && (
                <div>
                  <span className="font-medium text-slate-700">Reason:</span>{" "}
                  {String(activity.metadata.reason)}
                </div>
              )}

              {/* NEW: show resolved time if available */}
              {isResolved && resolvedAt && (
                <div>
                  <span className="font-medium text-slate-700">Resolved at:</span>{" "}
                  {formatDateTime(resolvedAt)}
                </div>
              )}
            </div>

            {onReport && (
              <div>
                <button
                  type="button"
                  onClick={() => onReport(activity)}
                  disabled={isReportedLike || isReporting}
                  className="mt-2 inline-flex items-center rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isResolved
                    ? "Resolved"
                    : isReportedLike
                    ? "Reported"
                    : isReporting
                    ? "Reporting..."
                    : "This wasn’t me"}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
