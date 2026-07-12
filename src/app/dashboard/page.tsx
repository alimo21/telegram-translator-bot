"use client";

import dynamic from "next/dynamic";

const Dashboard = dynamic(() => import("@/components/Dashboard"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
      <div className="text-white text-xl">⏳ در حال بارگذاری...</div>
    </div>
  ),
});

export default function DashboardPage() {
  return <Dashboard />;
}
