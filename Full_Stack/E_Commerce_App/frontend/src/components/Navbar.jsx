import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";

const linkClasses = ({ isActive }) =>
  `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? "bg-indigo-600 text-white"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
  }`;

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <nav className="relative mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <NavLink to="/" className="font-display flex items-center gap-2 text-lg font-semibold text-slate-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
            N
          </span>
          Nomadant&nbsp;Tech&nbsp;Store
        </NavLink>

        <button
          type="button"
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          aria-controls="nav-menu"
          onClick={() => setMenuOpen((open) => !open)}
          className="rounded-md p-2 text-slate-700 hover:bg-slate-100 md:hidden"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>

        <div
          id="nav-menu"
          className={`${menuOpen ? "flex" : "hidden"} absolute inset-x-0 top-full flex-col items-stretch gap-1 border-b border-slate-200 bg-white px-4 py-3 shadow-lg md:static md:flex md:flex-row md:items-center md:gap-2 md:border-0 md:bg-transparent md:p-0 md:shadow-none`}
        >
          <NavLink to="/" end className={linkClasses}>
            Shop
          </NavLink>
          <NavLink to="/cart" className={linkClasses}>
            Cart
            {itemCount > 0 && (
              <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1 text-xs font-semibold text-white">
                {itemCount}
              </span>
            )}
          </NavLink>
          {isAuthenticated && (
            <NavLink to="/orders" className={linkClasses}>
              Orders
            </NavLink>
          )}

          {(user?.role === "admin" || user?.role === "vendor") && (
            <>
              <NavLink to="/admin/products" className={linkClasses}>
                Manage products
              </NavLink>
              <NavLink to="/admin/orders" className={linkClasses}>
                Manage orders
              </NavLink>
              {user?.role === "admin" && (
                <NavLink to="/admin/users" className={linkClasses}>
                  Manage users
                </NavLink>
              )}
            </>
          )}

          {isAuthenticated ? (
            <div className="mt-2 flex flex-col gap-2 border-t border-slate-200 pt-3 md:ml-2 md:mt-0 md:flex-row md:items-center md:gap-3 md:border-l md:border-t-0 md:pl-3 md:pt-0">
              <NavLink to="/profile" className={linkClasses}>
                {user?.name || user?.email}
              </NavLink>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
              >
                Log out
              </button>
            </div>
          ) : (
            <div className="mt-2 flex flex-col gap-2 border-t border-slate-200 pt-3 md:ml-2 md:mt-0 md:flex-row md:items-center md:border-l md:border-t-0 md:pl-3 md:pt-0">
              <NavLink to="/login" className={linkClasses}>
                Log in
              </NavLink>
              <NavLink
                to="/register"
                className="rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-indigo-500"
              >
                Sign up
              </NavLink>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
