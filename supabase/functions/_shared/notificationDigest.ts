const lagosTimeZone = 'Africa/Lagos'

function escapeHtml(value: unknown) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character] ?? character))
}

function orderValue(snapshot: Record<string, unknown>) {
  const parsed = Number(String(snapshot.promoPrice ?? '').replace(/[^0-9.]/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

export function formatDigestDate(date: string) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: lagosTimeZone, dateStyle: 'long' }).format(new Date(`${date}T12:00:00+01:00`))
}

export function orderDigest(date: string, orders: Array<{ id: string; customer: Record<string, unknown>; package_snapshot: Record<string, unknown>; estimated_delivery: string; status: string; product_name?: string | null }>, platformName: string) {
  const title = `New Orders — ${formatDigestDate(date)}`
  const packageCounts = new Map<string, number>()
  const stateCounts = new Map<string, number>()
  const statusCounts = new Map<string, number>()
  for (const order of orders) {
    const product = String(order.product_name ?? order.package_snapshot.product ?? order.package_snapshot.title ?? 'Product')
    const state = String(order.customer.state ?? 'Unspecified')
    packageCounts.set(product, (packageCounts.get(product) ?? 0) + 1)
    stateCounts.set(state, (stateCounts.get(state) ?? 0) + 1)
    statusCounts.set(order.status, (statusCounts.get(order.status) ?? 0) + 1)
  }
  const totalValue = orders.reduce((sum, order) => sum + orderValue(order.package_snapshot), 0)
  const summary = `Total orders: ${orders.length}\nTotal order-request value: NGN ${totalValue.toLocaleString('en-NG')}\nProducts/packages: ${[...packageCounts.entries()].map(([name, count]) => `${name} (${count})`).join(', ') || '—'}\nLocations: ${[...stateCounts.entries()].map(([name, count]) => `${name} (${count})`).join(', ') || '—'}\nStatuses: ${[...statusCounts.entries()].map(([name, count]) => `${name} (${count})`).join(', ')}`
  const rows = orders.map((order) => `<article><h3>${escapeHtml(order.id)} · ${escapeHtml(order.product_name ?? order.package_snapshot.product ?? order.package_snapshot.title)}</h3><p><b>Package:</b> ${escapeHtml(order.package_snapshot.title ?? 'Not recorded')}<br><b>Order value:</b> NGN ${orderValue(order.package_snapshot).toLocaleString('en-NG')}<br><b>Customer:</b> ${escapeHtml(order.customer.fullName)}<br><b>Phone:</b> ${escapeHtml(order.customer.phoneNumber)}<br><b>State:</b> ${escapeHtml(order.customer.state)}<br><b>Address:</b> ${escapeHtml(order.customer.address)}<br><b>Delivery:</b> ${escapeHtml(order.estimated_delivery)}<br><b>Status:</b> ${escapeHtml(order.status)}</p></article>`).join('')
  return { subject: title, text: `${title}\n\n${summary}\n\n${orders.map((order) => `${order.id}: ${order.customer.fullName} — ${order.customer.phoneNumber} — ${order.customer.state}`).join('\n')}`, html: emailHtml(title, summary, rows, platformName) }
}

export function feedbackDigest(date: string, feedback: Array<{ id: string; reason_id: string; feedback_text: string | null; selected_package_id: string | null; status: string; product_name?: string | null; customer_feedback_followups?: Array<{ followup_status: string; phone_e164: string | null }>; customer_feedback_attachments?: Array<{ id: string }> }>, platformName: string) {
  const title = `Customer Feedback — ${formatDigestDate(date)}`
  const reasons = new Map<string, number>()
  for (const item of feedback) reasons.set(item.reason_id, (reasons.get(item.reason_id) ?? 0) + 1)
  const summary = `Total feedback: ${feedback.length}\nReasons: ${[...reasons.entries()].map(([reason, count]) => `${reason.replace(/_/g, ' ')} (${count})`).join(', ') || '—'}`
  const rows = feedback.map((item) => {
    const followup = item.customer_feedback_followups?.[0]
    const voice = item.customer_feedback_attachments?.length ? '<br><b>Voice note:</b> Available in the protected admin dashboard.' : ''
    const phone = followup?.phone_e164 ? `<br><b>Follow-up:</b> ${escapeHtml(followup.followup_status)} — ${escapeHtml(followup.phone_e164)}` : followup ? `<br><b>Follow-up:</b> ${escapeHtml(followup.followup_status)}` : ''
    return `<article><h3>${escapeHtml(item.reason_id.replace(/_/g, ' '))} · ${escapeHtml(item.id)}</h3><p><b>Status:</b> ${escapeHtml(item.status)}<br><b>Product:</b> ${escapeHtml(item.product_name ?? 'Not recorded')}<br><b>Package:</b> ${escapeHtml(item.selected_package_id ?? 'Not selected')}${phone}${voice}</p><p>${escapeHtml(item.feedback_text ?? 'No written feedback supplied.').replace(/\n/g, '<br>')}</p></article>`
  }).join('')
  return { subject: title, text: `${title}\n\n${summary}\n\n${feedback.map((item) => `${item.id}: ${item.reason_id} — ${item.feedback_text ?? 'No written feedback'}`).join('\n')}`, html: emailHtml(title, summary, rows, platformName) }
}

function emailHtml(title: string, summary: string, rows: string, platformName: string) {
  return `<!doctype html><html><body style="margin:0;background:#f5f7fb;font-family:Arial,sans-serif;color:#182235"><main style="max-width:680px;margin:0 auto;padding:24px"><section style="background:#102a56;color:#fff;border-radius:18px;padding:24px"><p style="margin:0 0 8px;font-size:12px;letter-spacing:1px;text-transform:uppercase">${escapeHtml(platformName)} Admin</p><h1 style="margin:0;font-size:25px">${escapeHtml(title)}</h1></section><section style="background:#fff;border-radius:18px;margin-top:16px;padding:24px;line-height:1.6;white-space:pre-line">${escapeHtml(summary)}</section><section style="background:#fff;border-radius:18px;margin-top:16px;padding:24px;line-height:1.6">${rows.replace(/<article>/g, '<article style="padding:16px 0;border-bottom:1px solid #e6eaf0">').replace(/<h3>/g, '<h3 style="margin:0 0 10px;font-size:16px">').replace(/<p>/g, '<p style="margin:8px 0">')}</section></main></body></html>`
}
