import { ChevronLeft, Clock3 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useHistory } from "../queries/history/useHistory.js";
import {
  DesktopHeader,
  MobileBottomNav,
} from "../components/layout/NetraNavigation.jsx";

export default function HistoryPage() {
  const navigate = useNavigate();
  const locationRoute = useLocation();
  const { data, isLoading, isError } = useHistory();
  const items = data?.history ?? data?.data ?? [];

  return (
    <main className="min-h-screen bg-[#0b0f1a] pb-24 text-slate-100 outline-none md:pb-8">
      <DesktopHeader compact />
      <div className="mx-auto w-full max-w-xl px-4 pt-3 sm:px-6 md:max-w-2xl md:pt-8">
        <header className="flex h-12 items-center justify-between mb-3">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex h-10 items-center gap-1.5 rounded-xl px-2.5 text-xs font-medium text-slate-400 hover:bg-white/[0.06] hover:text-white transition active:scale-95"
            aria-label="Back to home"
          >
            <ChevronLeft size={19} />
            <span>Back</span>
          </button>
          <span className="text-sm font-semibold text-white">Activity</span>
          <div className="w-10" />
        </header>

        <div className="flex items-center gap-3.5 mb-5 px-1">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Clock3 size={20} />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              Activity History
            </h1>
            <p className="text-xs text-slate-400">
              Past scene descriptions and text scans
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.07] bg-[#111722] p-5 text-sm text-slate-300">
          {isLoading && (
            <p className="text-xs text-slate-400">Loading history records...</p>
          )}
          {isError && (
            <p className="text-xs text-rose-300">History records are temporarily unavailable.</p>
          )}
          {!isLoading && !isError && items.length === 0 && (
            <div className="py-6 text-center text-slate-400">
              <p className="text-sm font-medium text-slate-300">No activity saved yet</p>
              <p className="mt-1 text-xs text-slate-500">
                Descriptions and scanned text will appear here automatically.
              </p>
            </div>
          )}
          {!isLoading && !isError && items.length > 0 && (
            <ul className="divide-y divide-white/[0.06]">
              {items.map((item, index) => (
                <li key={item.id || index} className="py-3">
                  <span className="text-xs font-semibold text-blue-400">
                    {item.mode || "Analysis"}
                  </span>
                  <p className="mt-1 text-xs text-slate-200">
                    {item.description || item.text || item.summary}
                  </p>
                  {item.timestamp && (
                    <span className="mt-1 block text-[10px] text-slate-500">
                      {new Date(item.timestamp).toLocaleString()}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <MobileBottomNav pathname={locationRoute.pathname} />
    </main>
  );
}
