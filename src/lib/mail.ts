import nodemailer from "nodemailer";

export const mailConfigured = () =>
  Boolean(
    (process.env.BREVO_API_KEY && process.env.MAIL_FROM) ||
      (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.MAIL_FROM)
  );

export async function sendMail(to: string, subject: string, text: string, html?: string) {
  if (!mailConfigured()) throw new Error("Email is not configured");

  // 1. If Brevo API key is configured, send via Brevo REST API (recommended for Next.js / Serverless)
  if (process.env.BREVO_API_KEY) {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": process.env.BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: process.env.MAIL_FROM_NAME || "SJA Kisii",
          email: process.env.MAIL_FROM,
        },
        to: [{ email: to }],
        subject,
        textContent: text,
        htmlContent: html || text,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      const msg = errorData?.message || errorData?.error || res.statusText;
      throw new Error(`Brevo mail error (${res.status}): ${msg}`);
    }
    return;
  }

  // 2. Fallback to standard SMTP relay via Nodemailer
  const port = Number(process.env.SMTP_PORT ?? 465);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: 10_000,
    socketTimeout: 15_000,
  });
  await transport.sendMail({ from: process.env.MAIL_FROM, to, subject, text, html });
}

export const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

