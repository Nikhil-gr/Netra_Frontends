import { Eye, FileText, Search, TriangleAlert } from "lucide-react";
import { Link } from "react-router-dom";
import ModeCard from "../components/common/ModeCard.jsx";
import { useHealth } from "../queries/health/useHealth.js";

const modes = [
  {
    title: "Describe",
    description: "Understand objects, paths, and surroundings.",
    to: "/camera/describe",
    icon: Eye,
  },
  {
    title: "Read Text",
    description: "Read visible signs, labels, documents, and menus.",
    to: "/camera/read",
    icon: FileText,
  },
  {
    title: "Find Object",
    description: "Choose an object and open the camera.",
    to: "/find",
    icon: Search,
  },
  {
    title: "Assist",
    description: "Check for obvious obstacles in view.",
    to: "/camera/assist",
    icon: TriangleAlert,
  },
];

export default function HomePage() {
  const { data, isLoading, isError } = useHealth();
  const status = isLoading
    ? "Checking API"
    : isError
      ? "API offline"
      : (data?.status ?? "Online");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 py-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-emerald-700">Netra</p>
          <h1 className="text-3xl font-bold text-slate-950">
            AI visual assistant
          </h1>
        </div>
        <nav className="flex gap-2 text-sm font-medium">
          <Link
            className="rounded-lg border border-slate-200 px-3 py-2 text-slate-700"
            to="/history"
          >
            History
          </Link>
          <Link
            className="rounded-lg border border-slate-200 px-3 py-2 text-slate-700"
            to="/settings"
          >
            Settings
          </Link>
        </nav>
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        {modes.map((mode) => (
          <ModeCard key={mode.title} {...mode} />
        ))}
      </section>

      <p className="mt-auto pt-8 text-sm text-slate-500">Server: {status}</p>
    </main>
  );
}
