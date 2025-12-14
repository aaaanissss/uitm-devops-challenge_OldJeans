"use client";

import SummaryCard from "@/components/SummaryCard";
import MfaSetupCard from "@/components/MfaSetupCard";
import useAuthStore from "@/stores/authStore";

export default function SecuritySummary() {
  const user = useAuthStore((s) => s.user);
  const summary = useAuthStore((s) => s.summary);

  return (
    <>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryCard
          title="Last login"
          value={
            summary?.lastLoginAt
              ? new Date(summary.lastLoginAt).toLocaleString()
              : "No logins yet"
          }
          icon="🔑"
        />
        <SummaryCard
          title="Failed logins (7d)"
          value={summary?.failedLoginsLast7d ?? 0}
          icon="⚠️"
        />
        <SummaryCard
          title="Open alerts"
          value={summary?.openAlertsCount ?? 0}
          icon="🚨"
        />
      </div>
    </>
  );
}
