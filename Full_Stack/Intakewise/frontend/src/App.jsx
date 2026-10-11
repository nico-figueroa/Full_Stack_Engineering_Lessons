import { lazy, Suspense, useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import api, { clearSession, getAccessToken, getRefreshToken, setSession } from "./api/client";
import Layout from "./components/Layout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import { ToastProvider } from "./context/ToastContext.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import InteractionDetail from "./pages/InteractionDetail.jsx";
import ItemDetail from "./pages/ItemDetail.jsx";
import ItemsPage from "./pages/ItemsPage.jsx";
import Login from "./pages/Login.jsx";
import OverrideEditor from "./pages/OverrideEditor.jsx";
import Profile from "./pages/Profile.jsx";
import ReferencePage from "./pages/ReferencePage.jsx";
import Register from "./pages/Register.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import Settings from "./pages/Settings.jsx";

const CalendarPage = lazy(() => import("./pages/CalendarPage.jsx"));

export default function App() {
  const [token, setToken] = useState(getAccessToken);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(getAccessToken()));

  useEffect(() => {
    if (!token) return;
    let active = true;
    api.get("/auth/me")
      .then(({ data }) => { if (active) setUser(data.user); })
      .catch(() => {
        if (active) {
          clearSession();
          setToken("");
          setUser(null);
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token]);

  useEffect(() => {
    const expire = () => {
      setToken("");
      setUser(null);
    };
    window.addEventListener("auth-expired", expire);
    return () => window.removeEventListener("auth-expired", expire);
  }, []);

  async function login(email, password) {
    const { data } = await api.post("/auth/login", { email, password });
    setSession(data);
    setToken(data.accessToken);
    setUser(data.user);
  }

  async function register(input) {
    const { data } = await api.post("/auth/register", input);
    setSession(data);
    setToken(data.accessToken);
    setUser(data.user);
  }

  async function logout() {
    const refreshToken = getRefreshToken();
    if (refreshToken) await api.post("/auth/logout", { refreshToken });
    clearSession();
    setToken("");
    setUser(null);
  }

  return (
    <ToastProvider>
      <Routes>
        <Route path="/login" element={token ? <Navigate to="/" replace /> : <Login onLogin={login} />} />
        <Route path="/register" element={token ? <Navigate to="/" replace /> : <Register onRegister={register} />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route element={<ProtectedRoute token={token} loading={loading} />}>
          <Route element={<Layout user={user} onLogout={logout} />}>
            <Route index element={<Dashboard />} />
            <Route path="items" element={<ItemsPage />} />
            <Route path="items/:itemId" element={<ItemDetail />} />
            <Route path="interactions/:itemId" element={<InteractionDetail />} />
            <Route path="reference/:itemId" element={<ReferencePage />} />
            <Route path="calendar" element={<Suspense fallback={<p className="text-sm text-slate-500">Loading calendar…</p>}><CalendarPage /></Suspense>} />
            <Route path="override/:itemId" element={<OverrideEditor />} />
            <Route path="settings" element={<Settings />} />
            <Route path="profile" element={<Profile user={user} />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to={token ? "/" : "/login"} replace />} />
      </Routes>
    </ToastProvider>
  );
}
