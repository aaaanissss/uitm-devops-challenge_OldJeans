"use client";

import React, { useEffect, useState } from "react";
import { SecurityActivityLog } from "@/components/security/SecurityActivityLog";
import {
  getMySecurityActivities,
  reportSuspiciousActivity,
  type SecurityActivity,
} from "@/lib/security/securityApi";

import useAuthStore from "@/stores/authStore";

export default function AccountSecurityPage() {
  // Auth state from Zustand
  const user = useAuthStore((s) => s.user);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const initializeAuth = useAuthStore((s) => s.initializeAuth);

  const [activities, setActivities] = useState<SecurityActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isReporting, setIsReporting] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const handleReport = async (activity: SecurityActivity) => {
    if (typeof window === "undefined") return;

    const token = localStorage.getItem("authToken");
    if (!token) {
        setError("Missing auth token. Please log in again.");
        return;
    }

    try {
        setIsReporting(true);
        setError(null);

        await reportSuspiciousActivity(token, activity.id);

        // Very simple UX for now – you can replace with a toast
        alert("Thanks, we have flagged this activity for review.");
    } catch (err: any) {
        console.error("[AccountSecurityPage] report error:", err);
        setError(err?.message || "Failed to report suspicious activity.");
    } finally {
        setIsReporting(false);
    }
    };

  // Debug: see when page mounts and what auth state looks like
  useEffect(() => {
    console.log(
      "[AccountSecurityPage] mounted. user:",
      user,
      "isLoggedIn:",
      isLoggedIn
    );
  }, [user, isLoggedIn]);

  // Make sure auth is initialized (extra safety, even though AuthInitializer runs globally)
  useEffect(() => {
    console.log("[AccountSecurityPage] calling initializeAuth");
    initializeAuth();
  }, [initializeAuth]);

  // Fetch security activities once we know user is logged in
  useEffect(() => {
    if (!isLoggedIn) {
      setIsLoading(false);
      return;
    }

    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("authToken")
        : null;

    if (!token) {
      setError("Missing auth token. Please log in again.");
      setIsLoading(false);
      return;
    }

    let mounted = true;

    async function load(authToken: string) {
      try {
        setIsLoading(true);
        setError(null);

        console.log("[AccountSecurityPage] fetching activities with token");
        const data = await getMySecurityActivities(authToken);
        if (mounted) {
          console.log(
            "[AccountSecurityPage] fetched activities:",
            data.length
          );
          setActivities(data);
        }
      } catch (err: any) {
        console.error("[AccountSecurityPage] load error:", err);
        if (mounted) {
          setError(err?.message || "Failed to load security data");
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    load(token);

    return () => {
      mounted = false;
    };
  }, [isLoggedIn]);

  // If not logged in, show a friendly message instead of redirecting
  if (!isLoggedIn) {
    return (
      <div className="mx-auto max-w-4xl px-4 pb-8 pt-6">
        <h1 className="text-xl font-semibold text-slate-900">
          Security Activity
        </h1>
        <p className="text-sm text-slate-500 mb-4">
          You need to be logged in to view your security activity.
        </p>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          Please log in again and then return to this page.
        </div>
      </div>
    );
  }

  return (
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
      />
    </div>
  );
}
