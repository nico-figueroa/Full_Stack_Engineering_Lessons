import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import { waitForBackend } from "../api/wakeBackend.js";
import Button from "../components/ui/Button.jsx";
import Input from "../components/ui/Input.jsx";
import { useToast } from "../context/useToast.js";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [waking, setWaking] = useState(false);
  const [result, setResult] = useState(null);
  const { showToast } = useToast();

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setWaking(true);
    setResult(null);
    try {
      await waitForBackend();
      setWaking(false);
      const { data } = await api.post("/auth/forgot-password", { email });
      setResult(data);
      showToast("success", "Password reset requested.");
    } catch (error) {
      showToast("error", error.response?.data?.error || error.message || "Could not request a password reset.");
    } finally {
      setWaking(false);
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 py-12 dark:bg-slate-950">
      <div className="w-full max-w-md">
        <img src="/brand-mark.svg" alt="" className="mb-5 h-10 w-10" />
        <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">ACCOUNT RECOVERY</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Forgot your password?</h1>
        <p className="mt-2 text-slate-500">Enter your account email and we&apos;ll create a single-use reset link that is valid for 60 minutes.</p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-1">
          <Input label="Email address" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} />
          {waking && <div role="status" className="flex items-center gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-200"><span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-violet-300 border-t-violet-700" /><span className="font-semibold">Waking up server…</span></div>}
          <Button type="submit" className="mt-3 w-full justify-center" disabled={busy}>{waking ? "Waking up server…" : busy ? "Sending…" : "Send reset link"}</Button>
        </form>
        {result && (
          <div role="alert" className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
            <p>{result.message}</p>
            {result.resetUrl && (
              <p className="mt-2">
                <span className="block text-xs font-semibold uppercase tracking-wide">Development reset link</span>
                <a className="break-all font-semibold text-violet-700 underline dark:text-violet-300" href={result.resetUrl}>{result.resetUrl}</a>
              </p>
            )}
          </div>
        )}
        <p className="mt-6 text-center text-sm text-slate-500"><Link className="font-semibold text-violet-700 hover:underline dark:text-violet-300" to="/login">Back to sign in</Link></p>
      </div>
    </main>
  );
}
