"use client";

import React, { useEffect, useState } from "react";
import ContentWrapper from "@/components/ContentWrapper";
import AuthGuard from "@/components/AuthGuard";

import { SecurityActivityLog } from "@/components/security/SecurityActivityLog";
import {
  getMySecurityActivities,
  reportSuspiciousActivity,
  type SecurityActivity,
} from "@/lib/security/securityApi";
import useAuthStore from "@/stores/authStore";

export default function AccountSecurityPage() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const initializeAuth = useAuthStore((s) => s.initializeAuth);

  const [activities, setActivities] = useState<SecurityActivity[]>([]);
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isReportingId, setIsReportingId] = useState<string | null>(null);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    if (!isLoggedIn) {
      setIsLoading(false);
      return;
    }

    const token =
      typeof window !== "undefined" ? localStorage.getItem("authToken") : null;

    if (!token) {
      setError("Missing auth token. Please log in again.");
      setIsLoading(false);
      return;
    }

    let mounted = true;

    (async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getMySecurityActivities(token);
        if (!mounted) return;
        setActivities(data);
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message || "Failed to load security data");
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [isLoggedIn]);

  const handleReport = async (activity: SecurityActivity) => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("authToken") : null;

    if (!token) {
      setError("Missing auth token. Please log in again.");
      return;
    }

    if (reportedIds.has(activity.id)) return;

    try {
      setIsReportingId(activity.id);
      setError(null);

      await reportSuspiciousActivity(token, activity.id);

      setReportedIds((prev) => {
        const next = new Set(prev);
        next.add(activity.id);
        return next;
      });

      alert("Thanks, we have flagged this activity for review.");
    } catch (err: any) {
      console.error("[AccountSecurityPage] report error:", err);
      setError(err?.message || "Failed to report suspicious activity.");
    } finally {
      setIsReportingId(null);
    }
  };

  return (
    <AuthGuard requireAuth={true} redirectTo="/auth">
      <ContentWrapper>
        <div className="mx-auto max-w-4xl px-4 pb-8 pt-6">
          <h1 className="text-xl font-semibold text-slate-900">
            Security Activity
          </h1>
          <p className="text-sm text-slate-500">
            Review recent logins and security events related to your account.
          </p>

          <SecurityActivityLog
            activities={activities}         
            isLoading={isLoading}
            error={error}
            onReport={handleReport}
            reportedIds={reportedIds}
            reportingId={isReportingId}
          />
        </div>
      </ContentWrapper>
    </AuthGuard>
  );
}
