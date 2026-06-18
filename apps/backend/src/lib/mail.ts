import { config } from '../config.js'
import { logger } from './logger.js'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

type ResendMessage = {
  from?: string
  to: string
  subject: string
  text: string
  html: string
}

async function sendResendEmail(message: ResendMessage, logContext: string) {
  const from =
    config.resendFrom ?? 'Ant ID Training <no-reply@ant-id-training.local>'

  if (!config.resendApiKey) {
    logger.warn(
      { to: message.to },
      `${logContext}: RESEND_API_KEY non configurée, email non envoyé`,
    )
    return
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...message,
      from,
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(
      `Resend a répondu ${response.status}${body ? `: ${body}` : ''}`,
    )
  }

  const payload = (await response.json().catch(() => null)) as {
    id?: string
  } | null
  logger.info(
    { to: message.to, messageId: payload?.id ?? null },
    `${logContext}: email envoyé`,
  )
}

export async function sendLoginNotificationEmail(
  email: string,
  username: string,
) {
  const safeUsername = escapeHtml(username)
  await sendResendEmail(
    {
      to: email,
      subject: 'Connexion à Ant ID Training',
      text: [
        `Bonjour ${username},`,
        '',
        "Une connexion à votre compte Ant ID Training vient d'être effectuée.",
        "Si vous n'êtes pas à l'origine de cette connexion, changez votre mot de passe.",
      ].join('\n'),
      html: `
      <p>Bonjour ${safeUsername},</p>
      <p>Une connexion à votre compte Ant ID Training vient d'être effectuée.</p>
      <p>Si vous n'êtes pas à l'origine de cette connexion, changez votre mot de passe.</p>
    `,
    },
    'Email de connexion',
  )
}

export async function sendVerificationEmail(
  email: string,
  username: string,
  token: string,
) {
  if (!config.resendApiKey) {
    throw new Error(
      "RESEND_API_KEY non configurée, impossible d'envoyer le lien d'activation",
    )
  }

  const activationUrl = `${config.frontendUrl.replace(/\/$/, '')}/#/activate?token=${encodeURIComponent(token)}`
  const safeUsername = escapeHtml(username)
  await sendResendEmail(
    {
      to: email,
      subject: 'Activez votre compte',
      text: [
        `Bonjour ${username},`,
        '',
        'Cliquez sur le lien ci-dessous pour activer votre compte :',
        '',
        activationUrl,
        '',
        'Ce lien expire dans 24 heures.',
        "Si vous n'êtes pas à l'origine de cette demande, ignorez simplement ce message.",
      ].join('\n'),
      html: `
      <p>Bonjour ${safeUsername},</p>
      <p>Cliquez sur le lien ci-dessous pour activer votre compte :</p>
      <p><a href="${activationUrl}">Activer mon compte</a></p>
      <p>Ce lien expire dans 24 heures.</p>
      <p>Si vous n'êtes pas à l'origine de cette demande, ignorez simplement ce message.</p>
    `,
    },
    "Email d'activation",
  )
}

export async function sendPasswordResetEmail(
  email: string,
  username: string,
  token: string,
) {
  if (!config.resendApiKey) {
    throw new Error(
      "RESEND_API_KEY non configurée, impossible d'envoyer le lien de réinitialisation",
    )
  }

  const resetUrl = `${config.frontendUrl.replace(/\/$/, '')}/#/reset-password?token=${encodeURIComponent(
    token,
  )}`

  const safeUsername = escapeHtml(username)
  await sendResendEmail(
    {
      to: email,
      subject: 'Réinitialisez votre mot de passe',
      text: [
        `Bonjour ${username},`,
        '',
        'Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le lien ci-dessous pour définir un nouveau mot de passe :',
        '',
        resetUrl,
        '',
        "Si vous n'êtes pas à l'origine de cette demande, ignorez simplement ce message.",
      ].join('\n'),
      html: `
      <p>Bonjour ${safeUsername},</p>
      <p>Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le lien ci-dessous pour définir un nouveau mot de passe :</p>
      <p><a href="${resetUrl}">Réinitialiser mon mot de passe</a></p>
      <p>Si vous n'êtes pas à l'origine de cette demande, ignorez simplement ce message.</p>
    `,
    },
    'Email de réinitialisation',
  )
}
