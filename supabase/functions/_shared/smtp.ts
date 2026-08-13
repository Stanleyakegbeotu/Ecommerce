import nodemailer from 'npm:nodemailer@7.0.6'

type Mail = { subject: string; html: string; text: string; messageId: string }

function required(name: string) {
  const value = Deno.env.get(name)?.trim()
  if (!value) throw new Error('notification_configuration_missing')
  return value
}

function firstConfigured(...names: string[]) {
  for (const name of names) {
    const value = Deno.env.get(name)?.trim()
    if (value) return value
  }
  throw new Error('notification_configuration_missing')
}

export function smtpConfigurationStatus() {
  return {
    configured: Boolean(
      Deno.env.get('SMTP_HOST')?.trim()
      && Deno.env.get('SMTP_PORT')?.trim()
      && Deno.env.get('SMTP_SECURE')?.trim()
      && Deno.env.get('SMTP_USERNAME')?.trim()
      && Deno.env.get('SMTP_PASSWORD')?.trim()
      && (Deno.env.get('SMTP_FROM_EMAIL')?.trim() || Deno.env.get('SMTP_FROM')?.trim())
      && (Deno.env.get('ADMIN_NOTIFICATION_EMAIL')?.trim() || Deno.env.get('NOTIFICATION_RECIPIENT')?.trim()),
    ),
  }
}

export async function sendAdministrativeEmail(mail: Mail, options: { platformName?: string } = {}) {
  const port = Number(required('SMTP_PORT'))
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('notification_configuration_invalid')
  const secure = required('SMTP_SECURE') === 'true'
  const transport = nodemailer.createTransport({
    host: required('SMTP_HOST'),
    port,
    secure,
    auth: { user: required('SMTP_USERNAME'), pass: required('SMTP_PASSWORD') },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
  })
  const result = await transport.sendMail({
    from: (() => {
      const email = firstConfigured('SMTP_FROM_EMAIL', 'SMTP_FROM')
      const name = Deno.env.get('SMTP_FROM_NAME')?.trim() || options.platformName?.trim()
      return name && !email.includes('<') ? `"${name.replace(/["<>]/g, '')}" <${email}>` : email
    })(),
    to: firstConfigured('ADMIN_NOTIFICATION_EMAIL', 'NOTIFICATION_RECIPIENT'),
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
    messageId: mail.messageId,
  })
  return result.messageId || mail.messageId
}
