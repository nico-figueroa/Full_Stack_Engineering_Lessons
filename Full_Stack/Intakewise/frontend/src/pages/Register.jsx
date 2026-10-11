import { useState } from "react";
import { Link } from "react-router-dom";
import Button from "../components/ui/Button.jsx";
import Input from "../components/ui/Input.jsx";
import { useToast } from "../context/useToast.js";

export default function Register({ onRegister }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await onRegister(form);
      showToast("success", "Your account is ready.");
    } catch (error) {
      showToast("error", error.response?.data?.error || "Could not create your account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4 py-12 dark:bg-slate-950">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-10">
        <img src="/brand-mark.svg" alt="" className="mb-6 h-10 w-10" />
        <p className="text-sm font-semibold uppercase tracking-widest text-violet-700">GET STARTED</p>
        <h1 className="mt-2 text-3xl font-semibold">Create your account</h1>
        <p className="mt-2 text-slate-500">Set up a private space for your intake routine.</p>
        <form className="mt-7 space-y-1" onSubmit={submit}>
          <Input label="Name (optional)" autoComplete="name" maxLength={100} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} />
          <Input label="Email address" type="email" autoComplete="email" required value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} />
          <Input label="Password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} />
          <Button type="submit" disabled={busy} className="mt-3 w-full justify-center">{busy ? "Creating account…" : "Create account"}</Button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">Already registered? <Link to="/login" className="font-semibold text-violet-700 hover:underline dark:text-violet-300">Sign in</Link></p>
        <p className="mt-8 text-xs leading-5 text-slate-400">This service is for informational organization only. It does not diagnose or recommend treatment.</p>
      </div>
    </main>
  );
}
