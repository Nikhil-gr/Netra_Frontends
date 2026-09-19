import { Clock3 } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useHistory } from "../queries/history/useHistory.js";
import {
  DesktopHeader,
  MobileBottomNav,
} from "../components/layout/NetraNavigation.jsx";

export default function HistoryPage() {
  const locationRoute = useLocation();
  const { data, isLoading, isError } = useHistory();
  const items = data?.history ?? data?.data ?? [];

  return (
    <main className="min-h-screen bg-[#030a12] pb-24 text-white md:pb-0">
      <DesktopHeader compact />
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 md:py-12">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
            <Clock3 size={27} />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
              Recent activity
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              History
            </h1>
          </div>
        </div>
        <div className="mt-8 rounded-3xl border border-white/10 bg-[#07111c] p-5 text-slate-400 sm:p-6">
          {isLoading && "Loading history..."}
          {isError && "History is not available right now."}
          {!isLoading &&
            !isError &&
            items.length === 0 &&
            "No saved history yet."}
          {!isLoading &&
            !isError &&
            items.length > 0 &&
            `${items.length} saved items`}
        </div>
      </div>
      <MobileBottomNav pathname={locationRoute.pathname} />
    </main>
  );
}
