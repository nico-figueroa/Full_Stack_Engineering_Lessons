import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/client";
import { waitForBackend } from "../api/wakeBackend.js";
import Button from "../components/ui/Button.jsx";
import Input from "../components/ui/Input.jsx";
import { useToast } from "../context/useToast.js";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    setError("");
    setBusy(true);
    try {
      await waitForBackend();
      const { data } = await api.post("/auth/reset-password", { token, password });
      showToast("success", data.message || "Password updated. Please sign in.");
      navigate("/login", { replace: true });
    } catch (requestError) {
      const message = requestError.response?.data?.error || requestError.message || "Could not reset your password.";
      setError(message);
      showToast("error", message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 py-12 dark:bg-slate-950">
      <div className="w-full max-w-md">
        <img src="/brand-mark.svg" alt="" className="mb-5 h-10 w-10" />
        <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">ACCOUNT RECOVERY</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Choose a new password</h1>
        {token ? (
          <form onSubmit={handleSubmit} className="mt-8 space-y-1" noValidate>
            <Input label="New password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={password} onChange={event => setPassword(event.target.value)} />
            <Input label="Confirm new password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={confirm} onChange={event => setConfirm(event.target.value)} />
            {error && <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
            <Button type="submit" className="mt-3 w-full justify-center" disabled={busy}>{busy ? "Updating…" : "Update password"}</Button>
          </form>
        ) : (
          <p role="alert" className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">This reset link is missing its token. <Link className="font-semibold underline" to="/forgot-password">Request a new link</Link>.</p>
        )}
        <p className="mt-6 text-center text-sm text-slate-500"><Link className="font-semibold text-violet-700 hover:underline dark:text-violet-300" to="/login">Back to sign in</Link></p>
      </div>
    </main>
  );
}
