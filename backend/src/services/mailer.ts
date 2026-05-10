import nodemailer from 'nodemailer';
import { env } from '../config/env';

function hasSmtpConfig() {
  return Boolean(env.smtpHost && env.smtpUser && env.smtpPass);
}

export async function sendPasswordResetEmail(to: string, resetToken: string) {
  if (!hasSmtpConfig()) return false;

  const transport = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpPort === 465,
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass,
    },
  });

  const resetLink = `${env.appUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;

  await transport.sendMail({
    from: env.smtpFrom,
    to,
    subject: 'AjoCircle Password Reset',
    text: `Use this link to reset your password: ${resetLink}\n\nIf you did not request this, ignore this email.`,
    html: `<p>Use this link to reset your password:</p><p><a href="${resetLink}">${resetLink}</a></p><p>If you did not request this, ignore this email.</p>`,
  });

  return true;
}
