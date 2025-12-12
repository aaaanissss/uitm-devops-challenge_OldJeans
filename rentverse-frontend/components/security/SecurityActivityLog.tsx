"use client";

import React from "react";
import type { SecurityActivity } from "@/lib/security/securityApi";

type Props = {
  activities: SecurityActivity[];
  isLoading: boolean;
  error: string | null;
  onReport?: (activity: SecurityActivity) => void;

  // New prop to indicate which activities are being reported
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
          activity.geoLocation ??
          activity.ipAddress ??
          "Location/IP not available";

        const device =
          activity.userAgent && activity.userAgent.length > 0
            ? activity.userAgent
            : "Unknown device";

        const email =
          typeof activity.metadata?.email === "string"
            ? activity.metadata.email
            : undefined;

        const isReported = reportedIds?.has(activity.id) ?? false;
        const isReporting = reportingId === activity.id;

        return (
          <div
            key={activity.id}
            className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${badgeClass}`}
                >
                  <span>{icon}</span>
                  <span>{label}</span>
                </span>
                {email && (
                  <span className="text-xs text-slate-500">({email})</span>
                )}
                {isReported && (
                  <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                    Reported
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-500">
                {formatDateTime(activity.createdAt)}
              </span>
            </div>

            <div className="flex flex-col gap-1 text-xs text-slate-600">
              <div>
                <span className="font-medium text-slate-700">Location/IP:</span>{" "}
                {location}
              </div>
              <div>
                <span className="font-medium text-slate-700">Device:</span>{" "}
                {device}
              </div>
              {activity.metadata?.reason && (
                <div>
                  <span className="font-medium text-slate-700">Reason:</span>{" "}
                  {String(activity.metadata.reason)}
                </div>
              )}
            </div>

            {onReport && (
              <div>
                <button
                  type="button"
                  onClick={() => onReport(activity)}
                  disabled={isReported || isReporting}
                  className="mt-2 inline-flex items-center rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isReported ? "Reported" : isReporting ? "Reporting..." : "This wasn’t me"}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
