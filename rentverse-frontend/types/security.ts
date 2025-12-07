export type SecuritySummary = {
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  failedLoginsLast7d: number;
  openAlertsCount: number;
};
