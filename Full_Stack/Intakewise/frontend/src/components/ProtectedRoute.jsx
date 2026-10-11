import { Navigate, Outlet } from "react-router-dom";

export default function ProtectedRoute({ token, loading }) {
  if (loading) return <div className="grid min-h-screen place-items-center text-slate-600">Restoring your session…</div>;
  return token ? <Outlet /> : <Navigate to="/login" replace />;
}
