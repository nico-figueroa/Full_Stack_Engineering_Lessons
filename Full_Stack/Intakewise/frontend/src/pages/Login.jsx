import { useState } from "react";
import { Link } from "react-router-dom";
import heroImage from "../assets/hero.png";
import Button from "../components/ui/Button.jsx";
import Input from "../components/ui/Input.jsx";
import { useToast } from "../context/useToast.js";
import { waitForBackend } from "../api/wakeBackend.js";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [waking, setWaking] = useState(false);
  const { showToast } = useToast();

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setWaking(true);
    try {
      await waitForBackend();
      setWaking(false);
      await onLogin(email, password);
      showToast("success", "Welcome back.");
    } catch (error) {
      showToast("error", error.response?.data?.error || error.message || "Could not sign in. Check your details and try again.");
    } finally {
      setWaking(false);
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[1.05fr_.95fr] dark:bg-slate-950">
      <section className="relative hidden overflow-hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-16 -top-10 h-80 w-80 rounded-full bg-violet-600/25 blur-3xl" />
        <Link to="/login" className="relative flex items-center gap-3 font-semibold"><img src="/brand-mark.svg" alt="" className="h-10 w-10" /> Intakewise</Link>
        <div className="relative max-w-xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[.22em] text-violet-300">Your routine, in focus</p>
          <h1 className="text-5xl font-semibold leading-tight">A clearer view of what you take, and when.</h1>
          <p className="mt-5 max-w-lg leading-7 text-slate-300">Keep a thoughtful schedule, review source-linked information, and stay in control of your daily routine.</p>
          <img src={heroImage} alt="" className="mt-9 w-56 opacity-90" />
        </div>
        <p className="relative text-xs text-slate-400">Private by design · Informational only</p>
      </section>
      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-10 lg:hidden"><img src="/brand-mark.svg" alt="" className="mb-5 h-10 w-10" /><p className="text-sm font-semibold uppercase tracking-widest text-violet-700">Intakewise</p></div>
          <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">WELCOME BACK</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">Sign in to your account</h2>
          <p className="mt-2 text-slate-500">Pick up where you left off.</p>
          <form onSubmit={handleSubmit} className="mt-8 space-y-1">
            <Input label="Email address" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} />
            <Input label="Password" type="password" autoComplete="current-password" required minLength={8} value={password} onChange={event => setPassword(event.target.value)} />
            <p className="-mt-1 text-right text-sm"><Link className="font-semibold text-violet-700 hover:underline dark:text-violet-300" to="/forgot-password">Forgot password?</Link></p>
            {waking && <div role="status" className="flex items-center gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-200"><span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-violet-300 border-t-violet-700" /><span><span className="font-semibold">Waking up server…</span><span className="block text-xs text-violet-700 dark:text-violet-300">This can take a moment while the service starts.</span></span></div>}
            <Button type="submit" className="mt-3 w-full justify-center" disabled={busy}>{waking ? "Waking up server…" : busy ? "Signing in…" : "Sign in"}</Button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-500">New here? <Link className="font-semibold text-violet-700 hover:underline dark:text-violet-300" to="/register">Create an account</Link></p>
          <p className="mt-10 text-center text-xs leading-5 text-slate-400">Intakewise is not a medical device and does not provide medical advice. Always consult a healthcare professional.</p>
        </div>
      </section>
    </main>
  );
}
