import { useState } from "react";
import api from "../api/client.js";
import Card from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import Input from "../components/ui/Input.jsx";
import useLanguage from "../context/useLanguage.js";
import { useToast } from "../context/useToast.js";

export default function Profile({ user, onPasswordChange, onProfileChange, onSecurityChange }) {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [profileBusy, setProfileBusy] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [enabledOverride, setEnabledOverride] = useState(null);
  const [challengeId, setChallengeId] = useState("");
  const [code, setCode] = useState("");
  const [mfaBusy, setMfaBusy] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");

  const enabled = enabledOverride ?? Boolean(user?.email_mfa_enabled);

  function showRequestError(error, fallback) {
    showToast("error", error.response?.data?.error || error.message || fallback);
  }

  async function saveProfile(event) {
    event.preventDefault();
    setProfileBusy(true);
    try {
      const response = await api.put("/auth/profile", { name, email });
      onProfileChange?.(response.data.user);
      showToast("success", t("profile.profileUpdated"));
    } catch (error) {
      showRequestError(error, t("profile.profileError"));
    } finally {
      setProfileBusy(false);
    }
  }

  async function savePassword(event) {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast("error", t("auth.passwordMismatch"));
      return;
    }
    setPasswordBusy(true);
    try {
      const response = await api.put("/auth/password", { currentPassword, newPassword });
      onPasswordChange?.(response.data);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showToast("success", response.data.message);
    } catch (error) {
      showRequestError(error, t("profile.passwordError"));
    } finally {
      setPasswordBusy(false);
    }
  }

  async function startEnrollment() {
    setMfaBusy(true);
    try {
      const response = await api.post("/auth/mfa/enroll");
      setChallengeId(response.data.challengeId);
      showToast("success", t("profile.codeSent", { email: response.data.maskedEmail }));
    } catch (error) {
      showRequestError(error, t("profile.securityError"));
    } finally {
      setMfaBusy(false);
    }
  }

  async function completeEnrollment(event) {
    event.preventDefault();
    setMfaBusy(true);
    try {
      const response = await api.post("/auth/mfa/enroll/verify", { challengeId, code });
      setEnabledOverride(true);
      onSecurityChange?.(true);
      setChallengeId("");
      setCode("");
      showToast("success", response.data.message);
    } catch (error) {
      showRequestError(error, t("profile.securityError"));
    } finally {
      setMfaBusy(false);
    }
  }

  async function disableCodes(event) {
    event.preventDefault();
    setMfaBusy(true);
    try {
      const response = await api.post("/auth/mfa/disable", { password: disablePassword });
      setEnabledOverride(false);
      onSecurityChange?.(false);
      setDisabling(false);
      setDisablePassword("");
      showToast("success", response.data.message);
    } catch (error) {
      showRequestError(error, t("profile.securityError"));
    } finally {
      setMfaBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="mb-4 text-2xl font-bold">{t("profile.title")}</h1>
      <Card title={t("profile.userInfo")}>
        <form onSubmit={saveProfile} className="max-w-xl">
          <Input
            label={t("profile.nameLabel")}
            autoComplete="name"
            maxLength={100}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Input
            label={t("profile.emailLabel")}
            type="email"
            autoComplete="email"
            maxLength={254}
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <Button type="submit" disabled={profileBusy}>
            {profileBusy ? t("common.saving") : t("profile.saveProfile")}
          </Button>
        </form>
      </Card>
      <Card title={t("profile.security")}>
        <div className="max-w-xl">
          <h4 className="text-base font-semibold">{t("profile.changePassword")}</h4>
          <p className="mb-4 mt-1 text-sm text-slate-600 dark:text-slate-300">
            {t("profile.passwordPrompt")}
          </p>
          <form onSubmit={savePassword}>
            <Input
              label={t("profile.currentPassword")}
              type="password"
              autoComplete="current-password"
              minLength={8}
              required
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
            <Input
              label={t("profile.newPassword")}
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
            <Input
              label={t("profile.confirmNewPassword")}
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
            <Button type="submit" disabled={passwordBusy}>
              {passwordBusy ? t("auth.updatingPassword") : t("profile.updatePassword")}
            </Button>
          </form>
        </div>

        <div className="my-6 border-t border-slate-200 dark:border-slate-700" />

        <div className="max-w-xl">
          <h4 className="text-base font-semibold">{t("profile.mfaTitle")}</h4>
          <p className="text-sm text-slate-600 dark:text-slate-300">{t("profile.mfaPrompt")}</p>
          <p
            className={`mt-3 text-sm font-semibold ${enabled ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"}`}
          >
            {t(enabled ? "profile.enabled" : "profile.disabled")}
          </p>
          {!enabled && !challengeId && (
            <Button className="mt-4" onClick={startEnrollment} disabled={mfaBusy}>
              {t("profile.enable")}
            </Button>
          )}
          {!enabled && challengeId && (
            <form onSubmit={completeEnrollment} className="mt-4 max-w-sm">
              <Input
                label={t("profile.verificationCode")}
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                minLength={6}
                maxLength={6}
                required
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
              />
              <Button type="submit" disabled={mfaBusy}>
                {mfaBusy ? t("auth.verifying") : t("profile.verifyEnable")}
              </Button>
            </form>
          )}
          {enabled && !disabling && (
            <Button className="mt-4" variant="secondary" onClick={() => setDisabling(true)}>
              {t("profile.disable")}
            </Button>
          )}
          {enabled && disabling && (
            <form onSubmit={disableCodes} className="mt-4 max-w-sm">
              <Input
                label={t("profile.confirmPassword")}
                type="password"
                autoComplete="current-password"
                minLength={8}
                required
                value={disablePassword}
                onChange={(event) => setDisablePassword(event.target.value)}
              />
              <div className="flex gap-2">
                <Button type="submit" variant="danger" disabled={mfaBusy}>
                  {t("profile.confirmDisable")}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setDisabling(false)}>
                  {t("common.cancel")}
                </Button>
              </div>
            </form>
          )}
        </div>
      </Card>
    </div>
  );
}
