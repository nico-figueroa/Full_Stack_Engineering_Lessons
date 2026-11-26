import nodemailer from "nodemailer";

let transporter;

function smtpConfig() {
  const port = Number(process.env.SMTP_PORT || 587);
  return {
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  };
}

export function emailDeliveryIsConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
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

  transporter ||= nodemailer.createTransport(smtpConfig());
  try {
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

