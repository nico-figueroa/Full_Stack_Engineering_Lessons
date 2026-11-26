import Card from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import Input from "../components/ui/Input.jsx";
import api from "../api/client.js";
import { useState } from "react";
import useLanguage from "../context/useLanguage.js";
import { useToast } from "../context/useToast.js";

export default function Profile({ user, onSecurityChange }) {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [enabledOverride, setEnabledOverride] = useState(null);
  const [challengeId, setChallengeId] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [disabling, setDisabling] = useState(false);

  const enabled = enabledOverride ?? Boolean(user?.email_mfa_enabled);

  async function run(action) {
    setBusy(true);
    try {
      return await action();
    } catch (error) {
      showToast("error", error.response?.data?.error || error.message || t("profile.securityError"));
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function startEnrollment() {
    const response = await run(() => api.post("/auth/mfa/enroll"));
    if (response) {
      setChallengeId(response.data.challengeId);
      showToast("success", t("profile.codeSent", { email: response.data.maskedEmail }));
    }
  }

  async function completeEnrollment(event) {
    event.preventDefault();
    const response = await run(() => api.post("/auth/mfa/enroll/verify", { challengeId, code }));
    if (response) {
      setEnabledOverride(true);
      onSecurityChange?.(true);
      setChallengeId("");
      setCode("");
      showToast("success", response.data.message);
    }
  }

  async function disableCodes(event) {
    event.preventDefault();
    const response = await run(() => api.post("/auth/mfa/disable", { password }));
    if (response) {
      setEnabledOverride(false);
      onSecurityChange?.(false);
      setDisabling(false);
      setPassword("");
      showToast("success", response.data.message);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="mb-4 text-2xl font-bold">{t("profile.title")}</h1>
      <Card title={t("profile.userInfo")}>
        <p className="text-gray-700 dark:text-gray-300">
          {t("profile.name", { value: user?.name || t("common.notProvided") })}
        </p>
        <p className="text-gray-700 dark:text-gray-300">
          {t("profile.email", { value: user?.email || "—" })}
        </p>
      </Card>
      <Card title={t("profile.security")}>
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">{t("profile.session")}</p>
        <Button variant="secondary" onClick={() => window.location.reload()}>{t("profile.refresh")}</Button>
      </Card>
      <Card title={t("profile.mfaTitle")}>
        <p className="text-sm text-slate-600 dark:text-slate-300">{t("profile.mfaPrompt")}</p>
        <p className={`mt-3 text-sm font-semibold ${enabled ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"}`}>
          {t(enabled ? "profile.enabled" : "profile.disabled")}
        </p>
        {!enabled && !challengeId && <Button className="mt-4" onClick={startEnrollment} disabled={busy}>{t("profile.enable")}</Button>}
        {!enabled && challengeId && <form onSubmit={completeEnrollment} className="mt-4 max-w-sm">
          <Input label={t("profile.verificationCode")} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required value={code} onChange={event => setCode(event.target.value.replace(/\D/g, ""))} />
          <Button type="submit" disabled={busy}>{busy ? t("auth.verifying") : t("profile.verifyEnable")}</Button>
        </form>}
        {enabled && !disabling && <Button className="mt-4" variant="secondary" onClick={() => setDisabling(true)}>{t("profile.disable")}</Button>}
        {enabled && disabling && <form onSubmit={disableCodes} className="mt-4 max-w-sm">
          <Input label={t("profile.confirmPassword")} type="password" autoComplete="current-password" minLength={8} required value={password} onChange={event => setPassword(event.target.value)} />
          <div className="flex gap-2"><Button type="submit" variant="danger" disabled={busy}>{t("profile.confirmDisable")}</Button><Button type="button" variant="secondary" onClick={() => setDisabling(false)}>{t("common.cancel")}</Button></div>
        </form>}
      </Card>
    </div>
  );
}
