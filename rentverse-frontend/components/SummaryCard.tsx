"use client";

import React from "react";

type SummaryCardProps = {
  title: string;
  value: string | number | null;
  icon?: React.ReactNode; // optional icon
};

export default function SummaryCard({ title, value, icon }: SummaryCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">{title}</span>
        {icon && <span className="text-lg">{icon}</span>}
      </div>
      <div className="text-xl font-semibold text-slate-900">
        {value !== null && value !== undefined ? value : "—"}
      </div>
    </div>
  );
}
