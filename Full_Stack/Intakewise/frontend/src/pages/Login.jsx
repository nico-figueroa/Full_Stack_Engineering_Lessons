import { useState } from "react";
import { Link } from "react-router-dom";
import heroImage from "../assets/hero.png";
import Button from "../components/ui/Button.jsx";
import Input from "../components/ui/Input.jsx";
import { useToast } from "../context/useToast.js";
import { waitForBackend } from "../api/wakeBackend.js";
import LanguageSwitcher from "../components/LanguageSwitcher.jsx";
import useLanguage from "../context/useLanguage.js";

export default function Login({ onLogin, onVerifyMfa }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [waking, setWaking] = useState(false);
  const [challenge, setChallenge] = useState(null);
  const [code, setCode] = useState("");
  const { showToast } = useToast();
  const { t } = useLanguage();

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setWaking(true);
    try {
      await waitForBackend();
      setWaking(false);
      const result = await onLogin(email, password);
      if (result?.mfaRequired) {
        setChallenge(result);
        setPassword("");
      } else {
        showToast("success", t("auth.welcomeToast"));
      }
    } catch (error) {
      showToast("error", error.response?.data?.error || error.message || t("auth.signInError"));
    } finally {
      setWaking(false);
      setBusy(false);
    }
  }

  async function handleMfa(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await onVerifyMfa(challenge.challengeId, code);
      showToast("success", t("auth.welcomeToast"));
    } catch (error) {
      showToast("error", error.response?.data?.error || error.message || t("auth.signInError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[1.05fr_.95fr] dark:bg-slate-950">
      <section className="relative hidden overflow-hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-16 -top-10 h-80 w-80 rounded-full bg-violet-600/25 blur-3xl" />
        <Link to="/login" className="relative flex items-center gap-3 font-semibold"><img src="/brand-mark.svg" alt="" className="h-10 w-10" /> {t("common.appName")}</Link>
        <div className="relative max-w-xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[.22em] text-violet-300">{t("marketing.routine")}</p>
          <h1 className="text-5xl font-semibold leading-tight">{t("marketing.headline")}</h1>
          <p className="mt-5 max-w-lg leading-7 text-slate-300">{t("marketing.description")}</p>
          <img src={heroImage} alt="" className="mt-9 w-56 opacity-90" />
        </div>
        <p className="relative text-xs text-slate-400">{t("marketing.private")}</p>
      </section>
      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center justify-between gap-4"><div className="lg:hidden"><img src="/brand-mark.svg" alt="" className="mb-5 h-10 w-10" /><p className="text-sm font-semibold uppercase tracking-widest text-violet-700">{t("common.appName")}</p></div><LanguageSwitcher className="ml-auto" /></div>
          <p className="text-sm font-semibold uppercase text-violet-700 dark:text-violet-300">{t("auth.welcomeBack")}</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">{t("auth.signInTitle")}</h2>
          <p className="mt-2 text-slate-500">{t("auth.signInSubtitle")}</p>
          {challenge ? <form onSubmit={handleMfa} className="mt-8 space-y-1">
            <div className="mb-5 rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm dark:border-violet-900 dark:bg-violet-950/40">
              <p className="font-semibold">{t("auth.mfaTitle")}</p>
              <p className="mt-1 text-slate-600 dark:text-slate-300">{t("auth.mfaDescription", { email: challenge.maskedEmail })}</p>
            </div>
            <Input label={t("auth.mfaCode")} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required value={code} onChange={event => setCode(event.target.value.replace(/\D/g, ""))} />
            <Button type="submit" className="mt-3 w-full justify-center" disabled={busy}>{busy ? t("auth.verifying") : t("auth.verifyCode")}</Button>
            <button type="button" className="mt-3 w-full text-center text-sm font-semibold text-violet-700 hover:underline dark:text-violet-300" onClick={() => { setChallenge(null); setCode(""); }}>{t("auth.usePassword")}</button>
          </form> : <form onSubmit={handleSubmit} className="mt-8 space-y-1">
            <Input label={t("auth.email")} type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} />
            <Input label={t("auth.password")} type="password" autoComplete="current-password" required minLength={8} value={password} onChange={event => setPassword(event.target.value)} />
            <p className="-mt-1 text-right text-sm"><Link className="font-semibold text-violet-700 hover:underline dark:text-violet-300" to="/forgot-password">{t("auth.forgot")}</Link></p>
            {waking && <div role="status" className="flex items-center gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-200"><span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-violet-300 border-t-violet-700" /><span><span className="font-semibold">{t("auth.serverWaking")}</span><span className="block text-xs text-violet-700 dark:text-violet-300">{t("auth.serverWakingDetail")}</span></span></div>}
            <Button type="submit" className="mt-3 w-full justify-center" disabled={busy}>{waking ? t("auth.serverWaking") : busy ? t("auth.signingIn") : t("auth.signIn")}</Button>
          </form>}
          <p className="mt-6 text-center text-sm text-slate-500">{t("auth.newHere")} <Link className="font-semibold text-violet-700 hover:underline dark:text-violet-300" to="/register">{t("auth.createAccount")}</Link></p>
          <p className="mt-10 text-center text-xs leading-5 text-slate-400">{t("marketing.disclaimer")}</p>
        </div>
      </section>
    </main>
  );
}
