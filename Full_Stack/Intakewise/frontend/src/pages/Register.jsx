import { useState } from "react";
import { Link } from "react-router-dom";
import Button from "../components/ui/Button.jsx";
import Input from "../components/ui/Input.jsx";
import { useToast } from "../context/useToast.js";
import LanguageSwitcher from "../components/LanguageSwitcher.jsx";
import useLanguage from "../context/useLanguage.js";

export default function Register({ onRegister }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();
  const { t } = useLanguage();

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await onRegister(form);
      showToast("success", t("auth.registered"));
    } catch (error) {
      showToast("error", error.response?.data?.error || t("auth.registerError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4 py-12 dark:bg-slate-950">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-10">
        <div className="mb-6 flex items-center justify-between"><img src="/brand-mark.svg" alt="" className="h-10 w-10" /><LanguageSwitcher /></div>
        <p className="text-sm font-semibold uppercase tracking-widest text-violet-700">{t("auth.createAccount")}</p>
        <h1 className="mt-2 text-3xl font-semibold">{t("auth.createTitle")}</h1>
        <p className="mt-2 text-slate-500">{t("auth.createSubtitle")}</p>
        <form className="mt-7 space-y-1" onSubmit={submit}>
          <Input label={t("auth.nameOptional")} autoComplete="name" maxLength={100} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} />
          <Input label={t("auth.email")} type="email" autoComplete="email" required value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} />
          <Input label={t("auth.password")} type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} />
          <Button type="submit" disabled={busy} className="mt-3 w-full justify-center">{busy ? t("auth.registering") : t("auth.register")}</Button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">{t("auth.alreadyRegistered")} <Link to="/login" className="font-semibold text-violet-700 hover:underline dark:text-violet-300">{t("auth.signIn")}</Link></p>
        <p className="mt-8 text-xs leading-5 text-slate-400">{t("marketing.disclaimer")}</p>
      </div>
    </main>
  );
}
