import { Home, MapPinned } from "lucide-react";
import { NavLink } from "react-router-dom";

const navItems = [
  { label: "Home", to: "/", icon: Home },
  { label: "Guide", to: "/walk-assist", icon: MapPinned },
  { label: "Settings", to: "/settings", icon: null },
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
    <header className="hidden h-16 w-full items-center justify-between border-b border-white/10 bg-[#050d16]/95 px-6 text-white backdrop-blur-xl md:flex lg:px-10">
      <NavLink
        to="/"
        className="inline-flex items-center gap-3"
        aria-label="Netra home"
      >
        <img src="/netra_WPA/05_netra_logo.png" alt="Netra" className="h-10 w-auto object-contain" />
      </NavLink>

      <nav className="flex items-center gap-2" aria-label="Primary navigation">
        {navItems.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-medium transition ${
                isActive
                  ? "bg-blue-500/15 text-blue-300"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`
            }
          >
            {!compact && (to === "/settings" ? <img src="/netra_WPA/14_settings_icon.png" alt="" className="h-6 w-6 object-contain" /> : <Icon size={17} />)}
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="text-[10px] font-medium uppercase tracking-[0.32em] text-slate-500">
        A clearer tomorrow
      </div>
    </header>
  );
}

export function MobileBottomNav({ pathname = "" }) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#07111c]/96 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl md:hidden"
      aria-label="Bottom navigation"
    >
      <div className="mx-auto grid max-w-md grid-cols-3 gap-1">
        {navItems.map(({ label, to, icon: Icon }) => {
          const active = isItemActive(pathname, to);
          return (
            <NavLink
              key={to}
              to={to}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-xs font-medium transition ${
                active ? "text-blue-400" : "text-slate-400 hover:text-white"
              }`}
            >
              {to === "/settings" ? (
                <img src="/netra_WPA/14_settings_icon.png" alt="" className={`h-7 w-7 object-contain ${active ? "opacity-100" : "opacity-60"}`} />
              ) : (
                <Icon size={21} strokeWidth={active ? 2.4 : 2} />
              )}
              <span>{label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
