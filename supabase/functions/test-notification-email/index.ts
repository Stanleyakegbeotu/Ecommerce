import { authorizeActiveAdministrator } from '../_shared/adminAuth.ts'
import { sendAdministrativeEmail } from '../_shared/smtp.ts'

Deno.serve(async (request) => {
  if (request.method !== 'POST') return Response.json({ error: 'Method not allowed.' }, { status: 405 })
  const authorization = await authorizeActiveAdministrator(request)
  if (!authorization.administrator || authorization.administrator.role !== 'owner') return Response.json({ error: 'Owner authorization is required.' }, { status: 403 })
  try {
    const { data: settings } = await authorization.administrator.supabase.from('app_settings').select('platform_name').eq('id', true).maybeSingle()
    const platformName = settings?.platform_name ?? 'Platform'
    await sendAdministrativeEmail({
      subject: `${platformName} — SMTP configuration test`,
      text: 'This is a configuration test. No customer or business record was created.',
      html: '<p>This is a configuration test. No customer or business record was created.</p>',
      messageId: `<smtp-test-${crypto.randomUUID()}@notification.local>`,
    }, { platformName })
    await authorization.administrator.supabase.from('notification_diagnostics').insert({ diagnostic_type: 'smtp_test', status: 'sent', actor_id: authorization.administrator.userId })
    return Response.json({ ok: true })
  } catch (error) {
    const errorCode = error instanceof Error ? error.message.replace(/[^a-z0-9_:-]/gi, '_').slice(0, 120) : 'smtp_test_failed'
    await authorization.administrator.supabase.from('notification_diagnostics').insert({ diagnostic_type: 'smtp_test', status: 'failed', actor_id: authorization.administrator.userId, error_code: errorCode })
    return Response.json({ error: 'SMTP configuration test failed.' }, { status: 503 })
  }
})
