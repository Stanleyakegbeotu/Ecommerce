const lagosTimeZone = 'Africa/Lagos'

type OrderMailRow = {
  id: string
  display_number?: number | null
  customer: Record<string, unknown>
  package_snapshot: Record<string, unknown>
  estimated_delivery: string
  status: string
  product_name?: string | null
}

type FeedbackMailRow = {
  id: string
  reason_id: string
  feedback_text: string | null
  selected_package_id: string | null
  status: string
  product_name?: string | null
  customer_feedback_followups?: Array<{ followup_status: string; phone_e164: string | null }>
  customer_feedback_attachments?: Array<{ id: string }>
}

function escapeHtml(value: unknown) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character] ?? character))
}

function orderValue(snapshot: Record<string, unknown>) {
  const parsed = Number(String(snapshot.promoPrice ?? '').replace(/[^0-9.]/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

function naira(value: number) {
  return `NGN ${value.toLocaleString('en-NG')}`
}

function orderReference(order: Pick<OrderMailRow, 'id' | 'display_number'>) {
  return order.display_number && order.display_number > 0 ? `Order #${String(order.display_number).padStart(3, '0')}` : `Order ${order.id}`
}

function valueOrNotProvided(value: unknown) {
  const normalized = String(value ?? '').trim()
  return normalized || 'Not provided'
}

export function formatDigestDate(date: string) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: lagosTimeZone, dateStyle: 'long' }).format(new Date(`${date}T12:00:00+01:00`))
}

export function orderDigest(date: string, orders: OrderMailRow[], platformName: string, platformLogoUrl: string | null = null) {
  const totalValue = orders.reduce((sum, order) => sum + orderValue(order.package_snapshot), 0)
  const title = orders.length === 1 ? `${orderReference(orders[0])}: new order request` : `New orders: ${formatDigestDate(date)}`
  const summary = orders.length === 1
    ? `A new order request has been saved. The delivery brief below follows the exact checkout form order so it can be copied directly to your delivery agent.`
    : `${orders.length} new order requests | Total order-request value: ${naira(totalValue)}`
  const rows = orders.map((order) => orderDeliveryBrief(order)).join('')
  const text = [title, summary, ...orders.map(orderPlainText)].join('\n\n')
  return { subject: title, text, html: emailShell(title, summary, rows, platformName, platformLogoUrl) }
}

function orderDeliveryBrief(order: OrderMailRow) {
  const customer = order.customer
  const packageSnapshot = order.package_snapshot
  const fields: Array<[string, unknown]> = [
    ['Full name', customer.fullName],
    ['Phone number', customer.phoneNumber],
    ['WhatsApp number', customer.whatsappNumber],
    ['State', customer.state],
    ['Detailed address', customer.address],
    ['Delivery note', customer.deliveryNote],
  ]
  const copyBlock = [
    `${orderReference(order)}`,
    ...fields.map(([label, value]) => `${label}: ${valueOrNotProvided(value)}`),
    `Product: ${valueOrNotProvided(order.product_name ?? packageSnapshot.product)}`,
    `Package: ${valueOrNotProvided(packageSnapshot.title)}`,
    `Order value: ${naira(orderValue(packageSnapshot))}`,
    `Estimated delivery: ${valueOrNotProvided(order.estimated_delivery)}`,
  ].join('\n')
  return `<section style="margin:20px 0 0;border:1px solid #dbe7f2;border-radius:18px;overflow:hidden;background:#ffffff"><div style="padding:18px 20px;background:#f3f8fd;border-bottom:1px solid #dbe7f2"><p style="margin:0;color:#0b5eaa;font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase">Delivery handoff</p><h2 style="margin:7px 0 0;color:#102a56;font-size:22px;line-height:1.2">${escapeHtml(orderReference(order))}</h2><p style="margin:6px 0 0;color:#52677d;font-size:13px">${escapeHtml(valueOrNotProvided(order.product_name ?? packageSnapshot.product))} - ${escapeHtml(valueOrNotProvided(packageSnapshot.title))}</p></div><div style="padding:10px 20px 18px"><p style="margin:10px 0 12px;color:#52677d;font-size:12px;line-height:1.6">Copy-ready customer details, kept in the same order as the checkout form.</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse">${fields.map(([label, value]) => `<tr><td style="width:38%;padding:10px 0;border-top:1px solid #edf2f7;color:#60758b;font-size:12px;font-weight:700;vertical-align:top">${escapeHtml(label)}</td><td style="padding:10px 0;border-top:1px solid #edf2f7;color:#152b45;font-size:14px;font-weight:700;line-height:1.45;white-space:pre-wrap">${escapeHtml(valueOrNotProvided(value))}</td></tr>`).join('')}<tr><td style="width:38%;padding:10px 0;border-top:1px solid #edf2f7;color:#60758b;font-size:12px;font-weight:700">Product</td><td style="padding:10px 0;border-top:1px solid #edf2f7;color:#152b45;font-size:14px;font-weight:700">${escapeHtml(valueOrNotProvided(order.product_name ?? packageSnapshot.product))}</td></tr><tr><td style="width:38%;padding:10px 0;border-top:1px solid #edf2f7;color:#60758b;font-size:12px;font-weight:700">Package selected</td><td style="padding:10px 0;border-top:1px solid #edf2f7;color:#152b45;font-size:14px;font-weight:700">${escapeHtml(valueOrNotProvided(packageSnapshot.title))}</td></tr><tr><td style="width:38%;padding:10px 0;border-top:1px solid #edf2f7;color:#60758b;font-size:12px;font-weight:700">Order value</td><td style="padding:10px 0;border-top:1px solid #edf2f7;color:#0e7a4a;font-size:16px;font-weight:800">${escapeHtml(naira(orderValue(packageSnapshot)))}</td></tr><tr><td style="width:38%;padding:10px 0;border-top:1px solid #edf2f7;color:#60758b;font-size:12px;font-weight:700">Estimated delivery</td><td style="padding:10px 0;border-top:1px solid #edf2f7;color:#152b45;font-size:14px;font-weight:700">${escapeHtml(valueOrNotProvided(order.estimated_delivery))}</td></tr><tr><td style="width:38%;padding:10px 0;border-top:1px solid #edf2f7;color:#60758b;font-size:12px;font-weight:700">Order status</td><td style="padding:10px 0;border-top:1px solid #edf2f7;color:#152b45;font-size:14px;font-weight:700">${escapeHtml(order.status)}</td></tr></table><div style="margin-top:16px;border-radius:12px;background:#102a56;padding:14px 15px"><p style="margin:0 0 6px;color:#b9d9f4;font-size:10px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase">Copy to delivery agent</p><pre style="margin:0;white-space:pre-wrap;word-break:break-word;color:#ffffff;font-family:Arial,sans-serif;font-size:13px;line-height:1.55">${escapeHtml(copyBlock)}</pre></div></div></section>`
}

function orderPlainText(order: OrderMailRow) {
  const customer = order.customer
  const packageSnapshot = order.package_snapshot
  return [
    orderReference(order),
    `Full name: ${valueOrNotProvided(customer.fullName)}`,
    `Phone number: ${valueOrNotProvided(customer.phoneNumber)}`,
    `WhatsApp number: ${valueOrNotProvided(customer.whatsappNumber)}`,
    `State: ${valueOrNotProvided(customer.state)}`,
    `Detailed address: ${valueOrNotProvided(customer.address)}`,
    `Delivery note: ${valueOrNotProvided(customer.deliveryNote)}`,
    `Product: ${valueOrNotProvided(order.product_name ?? packageSnapshot.product)}`,
    `Package selected: ${valueOrNotProvided(packageSnapshot.title)}`,
    `Order value: ${naira(orderValue(packageSnapshot))}`,
    `Estimated delivery: ${valueOrNotProvided(order.estimated_delivery)}`,
    `Status: ${order.status}`,
  ].join('\n')
}

export function feedbackDigest(date: string, feedback: FeedbackMailRow[], platformName: string, platformLogoUrl: string | null = null) {
  const title = feedback.length === 1 ? 'New customer feedback' : `Customer feedback: ${formatDigestDate(date)}`
  const summary = feedback.length === 1 ? 'A customer feedback record was saved. Review the protected dashboard for any private voice note.' : `${feedback.length} customer feedback records were saved.`
  const rows = feedback.map((item) => {
    const followup = item.customer_feedback_followups?.[0]
    const followupLine = followup?.phone_e164 ? `${followup.followup_status}: ${followup.phone_e164}` : followup?.followup_status ?? 'Not requested'
    const voice = item.customer_feedback_attachments?.length ? 'Voice note available in the protected admin dashboard.' : 'No voice note.'
    return `<section style="margin-top:18px;border:1px solid #dbe7f2;border-radius:16px;padding:18px;background:#ffffff"><p style="margin:0;color:#0b5eaa;font-size:11px;font-weight:700;letter-spacing:1.3px;text-transform:uppercase">${escapeHtml(item.reason_id.replace(/_/g, ' '))}</p><h2 style="margin:8px 0;color:#102a56;font-size:18px">${escapeHtml(item.product_name ?? 'Product not recorded')}</h2><p style="margin:0;color:#30475f;font-size:14px;line-height:1.6">${escapeHtml(item.feedback_text ?? 'No written feedback supplied.').replace(/\n/g, '<br>')}</p><p style="margin:14px 0 0;color:#60758b;font-size:12px;line-height:1.6"><b>Status:</b> ${escapeHtml(item.status)}<br><b>Package:</b> ${escapeHtml(item.selected_package_id ?? 'Not selected')}<br><b>Follow-up:</b> ${escapeHtml(followupLine)}<br><b>Voice:</b> ${escapeHtml(voice)}</p></section>`
  }).join('')
  const text = [title, summary, ...feedback.map((item) => `${item.reason_id}\nProduct: ${item.product_name ?? 'Not recorded'}\n${item.feedback_text ?? 'No written feedback supplied.'}`)].join('\n\n')
  return { subject: title, text, html: emailShell(title, summary, rows, platformName, platformLogoUrl) }
}

function emailShell(title: string, summary: string, content: string, platformName: string, platformLogoUrl: string | null) {
  const brand = platformLogoUrl ? `<img src="${escapeHtml(platformLogoUrl)}" width="126" alt="${escapeHtml(platformName)}" style="display:block;max-width:126px;height:auto;border:0;outline:none;text-decoration:none">` : `<span style="display:inline-block;color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.5px">${escapeHtml(platformName)}</span>`
  return `<!doctype html><html lang="en"><body style="margin:0;padding:0;background:#edf3f8;color:#152b45;font-family:Arial,Helvetica,sans-serif"><div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(summary)}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#edf3f8"><tr><td align="center" style="padding:28px 12px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:680px"><tr><td style="padding:0 8px 12px">${brand}</td></tr><tr><td style="overflow:hidden;border-radius:20px;background:#102a56;padding:26px 24px"><p style="margin:0 0 9px;color:#a9dff0;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase">${escapeHtml(platformName)} operations</p><h1 style="margin:0;color:#ffffff;font-size:27px;line-height:1.18;letter-spacing:-0.4px">${escapeHtml(title)}</h1></td></tr><tr><td style="padding-top:16px"><section style="border-radius:16px;background:#ffffff;padding:20px 22px;color:#40566e;font-size:14px;font-weight:600;line-height:1.65">${escapeHtml(summary)}</section>${content}</td></tr><tr><td style="padding:22px 8px 0;color:#718399;font-size:11px;line-height:1.55">This operational notification was generated after the record was securely saved. Keep customer information private and share it only with the delivery team handling this order.</td></tr></table></td></tr></table></body></html>`
}
