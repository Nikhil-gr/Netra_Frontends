import { HelpCircle, Home, MapPin, Settings } from "lucide-react";
import { NavLink } from "react-router-dom";

const navItems = [
  { label: "Home", to: "/", icon: Home },
  // { label: "Walk Assist", to: "/walk-assist", icon: MapPin },
  { label: "Guide", to: "/guide", icon: HelpCircle },
  { label: "Settings", to: "/settings", icon: Settings },
];

const isItemActive = (pathname, to) => {
  if (to === "/") return pathname === "/";
  if (to === "/walk-assist") {
    return pathname === "/walk-assist" || pathname === "/camera/assist";
  }
  return pathname.startsWith(to);
};

export function DesktopHeader({ compact = false }) {
  return (
    <header className="hidden h-16 w-full items-center justify-between border-b border-white/[0.08] bg-[#070c14]/95 px-6 text-white backdrop-blur-md md:flex lg:px-12">
      <NavLink
        to="/"
        className="inline-flex items-center gap-3 transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        aria-label="Netra home"
      >
        <img
          src="/netra_WPA/05_netra_logo.png"
          alt="Netra"
          className="h-9 w-auto object-contain"
        />
      </NavLink>

      <nav className="flex items-center gap-2" aria-label="Primary navigation">
        {navItems.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `inline-flex min-h-10 items-center gap-2.5 rounded-full px-4 text-sm font-medium transition ${
                isActive
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                  : "text-slate-400 hover:bg-white/[0.06] hover:text-white"
              }`
            }
          >
            <Icon size={17} strokeWidth={2.2} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="flex flex-col items-end text-right">
        <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">
          ACCESS • ASSIST • EXPLORE • BELONG
        </span>
        <span className="mt-0.5 text-[8px] font-medium uppercase tracking-[0.22em] text-slate-500">
          A more inclusive world for everyone
        </span>
      </div>
    </header>
  );
}

export function MobileBottomNav({ pathname = "" }) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/[0.08] bg-[#080d16] px-3 pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-2 transition-all md:hidden"
      aria-label="Bottom navigation"
    >
      <div className={`mx-auto grid max-w-sm gap-1 ${navItems.length === 3 ? "grid-cols-3" : "grid-cols-4"}`}>
        {navItems.map(({ label, to, icon: Icon }) => {
          const active = isItemActive(pathname, to);
          return (
            <NavLink
              key={to}
              to={to}
              className={`flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-medium transition active:scale-95 ${
                active
                  ? "font-semibold text-blue-500"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon
                size={22}
                strokeWidth={active ? 2.5 : 1.9}
                className={active ? "text-blue-500" : "text-slate-400"}
              />
              <span>{label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
