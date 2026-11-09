import nodemailer from "nodemailer";
import { Resend } from "resend";

function resendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

function smtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST?.trim());
}

function mailFrom(): string {
  return (
    process.env.MAIL_FROM?.trim() ||
    process.env.SMTP_FROM?.trim() ||
    process.env.STORE_EMAIL?.trim() ||
    "noreply@mediaextensions.org"
  );
}

function transporter() {
  const host = process.env.SMTP_HOST?.trim();
  if (!host) return null;

  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
  });
}

async function sendViaResend(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return false;
  const resend = new Resend(key);
  const { error } = await resend.emails.send({
    from: mailFrom(),
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html ?? opts.text.replace(/\n/g, "<br>"),
  });
  if (error) {
    console.error("[mailer:resend]", error);
    return false;
  }
  return true;
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<boolean> {
  if (resendConfigured()) {
    return sendViaResend(opts);
  }

  if (!smtpConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[mailer:skip] ${opts.subject} → ${opts.to}\n${opts.text}`);
    }
    return false;
  }

  const tx = transporter();
  if (!tx) return false;

  await tx.sendMail({
    from: mailFrom(),
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html ?? opts.text.replace(/\n/g, "<br>"),
  });

  return true;
}

export function isEmailConfigured(): boolean {
  return resendConfigured() || smtpConfigured();
}

export async function sendOrderConfirmation(opts: {
  to: string;
  name: string;
  orderId: string;
  totalFormatted: string;
  paymentMethod: string;
  itemLines: string;
  trackUrl: string;
}): Promise<boolean> {
  const shortId = opts.orderId.slice(0, 8);
  const text = [
    `Hi ${opts.name},`,
    ``,
    `Payment confirmed for Media Extensions order #${shortId}.`,
    `Total: ${opts.totalFormatted}`,
    `Payment method: ${opts.paymentMethod}`,
    ``,
    `Items:`,
    opts.itemLines,
    ``,
    `Track your order anytime: ${opts.trackUrl}`,
    `Use order ID ${opts.orderId} with this email address.`,
    ``,
    `Thank you for shopping with Media Extensions.`,
  ].join("\n");

  return sendEmail({
    to: opts.to,
    subject: `Order confirmed #${shortId}`,
    text,
  });
}

export async function sendDownloadLinks(opts: {
  to: string;
  name: string;
  orderId: string;
  links: Array<{ productName: string; url: string; expiresAt: Date }>;
  vaultUrl: string;
}): Promise<boolean> {
  const shortId = opts.orderId.slice(0, 8);
  const linkLines = opts.links
    .map(
      (link) =>
        `• ${link.productName}\n  ${link.url}\n  Expires ${link.expiresAt.toISOString()}`,
    )
    .join("\n\n");

  const text = [
    `Hi ${opts.name},`,
    ``,
    `Your digital downloads for order #${shortId} are ready.`,
    ``,
    linkLines,
    ``,
    `You can also access them from your account vault: ${opts.vaultUrl}`,
    `Links expire after 72 hours and have a limited number of downloads.`,
  ].join("\n");

  return sendEmail({
    to: opts.to,
    subject: `Your downloads for order #${shortId}`,
    text,
  });
}
