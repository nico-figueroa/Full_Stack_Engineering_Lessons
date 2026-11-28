import nodemailer from "nodemailer";

let transporter;
const DEFAULT_BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

function brevoApiUrl() {
  const configured = process.env.BREVO_API_URL?.trim() || DEFAULT_BREVO_API_URL;
  let url;
  try {
    url = new URL(configured);
  } catch {
    throw new Error("BREVO_API_URL must be a valid absolute URL");
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("BREVO_API_URL must use http or https");
  }
  return url.toString();
}

function deliveryTimeoutMs() {
  const configured = Number(process.env.EMAIL_DELIVERY_TIMEOUT_MS);
  return Number.isFinite(configured) && configured > 0 ? configured : 15_000;
}

function smtpConfig() {
  const port = Number(process.env.SMTP_PORT || 587);
  return {
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    connectionTimeout: deliveryTimeoutMs(),
    greetingTimeout: deliveryTimeoutMs(),
    socketTimeout: deliveryTimeoutMs(),
    dnsTimeout: deliveryTimeoutMs(),
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  };
}

export function emailDeliveryIsConfigured() {
  return Boolean(process.env.SMTP_FROM
    && (process.env.BREVO_API_KEY || process.env.SMTP_HOST));
}

function parseSender(value) {
  const match = String(value).match(/^\s*(.*?)\s*<([^<>]+)>\s*$/);
  if (!match) return { email: String(value).trim() };
  const [, name, email] = match;
  return { email: email.trim(), ...(name.trim() ? { name: name.trim() } : {}) };
}

async function sendWithBrevo({ to, subject, text, html }) {
  const response = await fetch(brevoApiUrl(), {
    method: "POST",
    headers: {
      "api-key": process.env.BREVO_API_KEY,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender: parseSender(process.env.SMTP_FROM),
      to: [{ email: to }],
      subject,
      textContent: text,
      htmlContent: html,
    }),
    signal: AbortSignal.timeout(deliveryTimeoutMs()),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(
      `Email API request failed with status ${response.status}${payload?.message ? `: ${payload.message}` : ""}`,
    );
    error.status = 503;
    throw error;
  }
  return payload;
}

export async function sendTransactionalEmail({ to, subject, text, html }) {
  if (!emailDeliveryIsConfigured()) {
    if (process.env.NODE_ENV === "production") {
      const error = new Error("Email delivery is not configured");
      error.status = 503;
      throw error;
    }
    console.info(`[email-preview] To: ${to} | ${subject}\n${text}`);
    return { preview: true };
  }

  try {
    if (process.env.BREVO_API_KEY) {
      return await sendWithBrevo({ to, subject, text, html });
    }
    transporter ||= nodemailer.createTransport(smtpConfig());
    return await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject,
      text,
      html,
    });
  } catch (cause) {
    const error = new Error("Email delivery failed", { cause });
    error.status = 503;
    throw error;
  }
}

export async function sendPasswordResetEmail({ email, resetUrl, minutes }) {
  const subject = "Reset your Intakewise password";
  await sendTransactionalEmail({
    to: email,
    subject,
    text: `Use this single-use link to reset your Intakewise password:\n\n${resetUrl}\n\nThe link expires in ${minutes} minutes. If you did not request it, you can ignore this email.`,
    html: `<p>Use this single-use link to reset your Intakewise password:</p><p><a href="${resetUrl}">Reset password</a></p><p>The link expires in ${minutes} minutes. If you did not request it, you can ignore this email.</p>`,
  });
}

export async function sendMfaCodeEmail({ email, code, purpose }) {
  const action = purpose === "enrollment"
    ? "enable email security codes for Intakewise"
    : "finish signing in to Intakewise";
  await sendTransactionalEmail({
    to: email,
    subject: "Your Intakewise security code",
    text: `Use ${code} to ${action}. This code expires in 10 minutes. If you did not request it, change your password.`,
    html: `<p>Use <strong>${code}</strong> to ${action}.</p><p>This code expires in 10 minutes. If you did not request it, change your password.</p>`,
  });
}

