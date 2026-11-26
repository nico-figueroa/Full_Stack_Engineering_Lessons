import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/client";
import { waitForBackend } from "../api/wakeBackend.js";
import Button from "../components/ui/Button.jsx";
import Input from "../components/ui/Input.jsx";
import { useToast } from "../context/useToast.js";
import LanguageSwitcher from "../components/LanguageSwitcher.jsx";
import useLanguage from "../context/useLanguage.js";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { t } = useLanguage();

  async function handleSubmit(event) {
    event.preventDefault();
    if (password.length < 8) return setError(t("auth.passwordLength"));
    if (password !== confirm) return setError(t("auth.passwordMismatch"));
    setError("");
    setBusy(true);
    try {
      await waitForBackend();
      const { data } = await api.post("/auth/reset-password", { token, password });
      showToast("success", data.message || t("auth.passwordUpdated"));
      navigate("/login", { replace: true });
    } catch (requestError) {
      const message = requestError.response?.data?.error || requestError.message || t("auth.resetPasswordError");
      setError(message);
      showToast("error", message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 py-12 dark:bg-slate-950">
      <div className="w-full max-w-md">
        <div className="mb-5 flex items-center justify-between"><img src="/brand-mark.svg" alt="" className="h-10 w-10" /><LanguageSwitcher /></div>
        <p className="text-sm font-semibold uppercase text-violet-700 dark:text-violet-300">{t("auth.forgot")}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{t("auth.resetTitle")}</h1>
        <p className="mt-2 text-slate-500">{t("auth.resetSubtitle")}</p>
        {token ? (
          <form onSubmit={handleSubmit} className="mt-8 space-y-1" noValidate>
            <Input label={t("auth.newPassword")} type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={password} onChange={event => setPassword(event.target.value)} />
            <Input label={t("auth.confirmPassword")} type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={confirm} onChange={event => setConfirm(event.target.value)} />
            {error && <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
            <Button type="submit" className="mt-3 w-full justify-center" disabled={busy}>{busy ? t("auth.updatingPassword") : t("auth.updatePassword")}</Button>
          </form>
        ) : (
          <p role="alert" className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">{t("auth.resetMissing")} <Link className="font-semibold underline" to="/forgot-password">{t("auth.sendReset")}</Link>.</p>
        )}
        <p className="mt-6 text-center text-sm text-slate-500"><Link className="font-semibold text-violet-700 hover:underline dark:text-violet-300" to="/login">{t("auth.backToSignIn")}</Link></p>
      </div>
    </main>
  );
}
