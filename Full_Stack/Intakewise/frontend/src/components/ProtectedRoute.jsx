import { Navigate, Outlet } from "react-router-dom";
import useLanguage from "../context/useLanguage.js";

export default function ProtectedRoute({ token, loading }) {
  const { t } = useLanguage();
  if (loading) return <div className="grid min-h-screen place-items-center text-slate-600">{t("auth.restoring")}</div>;
  return token ? <Outlet /> : <Navigate to="/login" replace />;
}
