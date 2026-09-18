import {
  Eye,
  FileText,
  Search,
  ShieldAlert,
  History,
  Settings,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import ModeCard from "../components/common/ModeCard.jsx";
import { useSpokenAction } from "../hooks/accessibilty/useSpokenAction.js";


export default function HomePage() {
  const navigate = useNavigate();

  const { trigger, isArmed } = useSpokenAction();

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-8 sm:px-6">
      <header className="flex items-start justify-between gap-6">
        <div>
          <p className="text-sm font-medium text-emerald-700">Netra</p>

          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
            AI visual assistant
          </h1>
        </div>

        <nav className="flex gap-2" aria-label="Secondary navigation">
          <button
            type="button"
            onClick={() =>
              trigger({
                id: "history",

                announcement: "History  clicked. Press again to open.",

                action: () => navigate("/history"),
              })
            }
            className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-medium transition ${
              isArmed("history")
                ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <History size={18} />
            History
          </button>

          <button
            type="button"
            onClick={() =>
              trigger({
                id: "settings",

                announcement: "Settings  clicked. Press again to open.",

                action: () => navigate("/settings"),
              })
            }
            className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-medium transition ${
              isArmed("settings")
                ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Settings size={18} />
            Settings
          </button>
        </nav>
      </header>

      <section
        className="mt-10 grid gap-4 md:grid-cols-2"
        aria-label="Netra modes"
      >
        <ModeCard
          icon={Eye}
          title="Describe"
          description="Get a detailed description of your surroundings."
          selected={isArmed("describe")}
          onClick={() =>
            trigger({
              id: "describe",

              announcement: "Describe clicked. Press again to open.",

              action: () => navigate("/camera/describe"),
            })
          }
        />

        <ModeCard
          icon={FileText}
          title="Read Text"
          description="Read visible signs, labels, documents, and menus."
          selected={isArmed("read")}
          onClick={() =>
            trigger({
              id: "read",

              announcement: "Read text clicked. Press again to open.",

              action: () => navigate("/camera/read"),
            })
          }
        />

        <ModeCard
          icon={Search}
          title="Find Object"
          description="Choose an object and let Netra help locate it."
          selected={isArmed("find")}
          onClick={() =>
            trigger({
              id: "find",

              announcement: "Find object clicked. Press again to open.",

              action: () => navigate("/find"),
            })
          }
        />

        <ModeCard
          icon={ShieldAlert}
          title="Walk Assist"
          description="Get live awareness of objects and possible obstacles ahead."
          selected={isArmed("assist")}
          onClick={() =>
            trigger({
              id: "assist",

              announcement: "Walk assist clicked. Press again to open.",

              action: () => navigate("/camera/assist"),
            })
          }
        />
      </section>
    </main>
  );
}
