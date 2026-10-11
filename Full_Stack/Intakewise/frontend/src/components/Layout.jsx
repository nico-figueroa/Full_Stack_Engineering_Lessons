import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import Button from "./ui/Button.jsx";
import { useToast } from "../context/useToast.js";

const links = [
  { to: "/", label: "Overview", end: true },
  { to: "/items", label: "My items" },
  { to: "/calendar", label: "Calendar" },
];

export default function Layout({ user, onLogout }) {
  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark");
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const { showToast } = useToast();

  async function logout() {
    try {
      await onLogout();
    } catch (error) {
      showToast("error", error.response?.data?.error || "Could not revoke the server session; this browser session was retained.");
    }
  }

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-3 sm:px-6">
          <NavLink to="/" className="flex items-center gap-3 font-semibold tracking-tight">
            <img src="/brand-mark.svg" alt="" className="h-9 w-9" />
            <span>Intake<span className="text-violet-600 dark:text-violet-400">wise</span></span>
          </NavLink>
          <button className="rounded-lg border px-3 py-2 text-sm md:hidden" onClick={() => setMenuOpen(value => !value)} aria-expanded={menuOpen}>Menu</button>
          <nav className={`${menuOpen ? "absolute inset-x-0 top-full flex flex-col border-b bg-white p-4 dark:bg-slate-950" : "hidden"} gap-1 md:static md:flex md:flex-row md:items-center md:border-0 md:bg-transparent md:p-0`}>
            {links.map(link => (
              <NavLink key={link.to} to={link.to} end={link.end} onClick={() => setMenuOpen(false)}
                className={({ isActive }) => `rounded-lg px-3 py-2 text-sm font-medium transition ${isActive ? "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900"}`}>
                {link.label}
              </NavLink>
            ))}
            <NavLink to="/profile" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900">Profile</NavLink>
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            <button onClick={() => setDark(value => !value)} aria-label="Toggle dark mode" className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">{dark ? "☀" : "◐"}</button>
            <span className="hidden text-sm text-slate-500 lg:inline">{user?.name || user?.email}</span>
            <Button variant="secondary" onClick={logout}>Sign out</Button>
          </div>
        </div>
        {menuOpen && <div className="flex items-center gap-3 border-t px-4 py-3 md:hidden"><button onClick={() => setDark(value => !value)}>Toggle {dark ? "light" : "dark"} mode</button><Button variant="secondary" onClick={logout}>Sign out</Button></div>}
      </header>
      <main key={location.pathname} className="mx-auto max-w-7xl px-4 py-7 animate-fade-in sm:px-6 lg:py-10">
        <Outlet />
      </main>
      <footer className="mx-auto max-w-7xl px-4 pb-8 text-xs text-slate-500 sm:px-6">For organization only. This is not medical advice.</footer>
    </div>
  );
}
