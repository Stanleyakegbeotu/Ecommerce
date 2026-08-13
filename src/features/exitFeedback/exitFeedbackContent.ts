import { customerFeedbackTextMaxLength } from '../../../supabase/functions/_shared/customerFeedback.ts'

export type ExitReasonId =
  | 'price'
  | 'trust'
  | 'product_information'
  | 'delivery'
  | 'not_ready'
  | 'comparing'
  | 'something_else'

export type ExitFeedbackStage = 'packages' | 'checkout' | 'other'

export const exitFeedbackTextMaxLength = customerFeedbackTextMaxLength

export type ExitReason = {
  id: ExitReasonId
  label: string
  response: string
  actionLabel: string
  actionId: 'packages' | 'proof' | 'details' | 'delivery' | 'browse'
}

const reasons: Record<ExitReasonId, ExitReason> = {
  price: {
    id: 'price',
    label: 'Price is too high',
    response: 'The current package prices, included solar panels, delivery, and order protection are shown clearly so you can compare the full value.',
    actionLabel: 'Return to packages',
    actionId: 'packages',
  },
  trust: {
    id: 'trust',
    label: 'I’m not sure I trust it yet',
    response: 'You can review customer stories and the existing Pay on Delivery, 1-Year Warranty, and money-back guarantee information before deciding.',
    actionLabel: 'View customer proof',
    actionId: 'proof',
  },
  product_information: {
    id: 'product_information',
    label: 'I need more product information',
    response: 'Take another look at the product details, compatible essentials, and the included solar panel before you decide.',
    actionLabel: 'See product details',
    actionId: 'details',
  },
  delivery: {
    id: 'delivery',
    label: 'I’m concerned about delivery',
    response: 'Orders are confirmed by phone before dispatch. The page currently lists free delivery in Lagos and Abuja, typically within 1–3 business days.',
    actionLabel: 'View delivery information',
    actionId: 'delivery',
  },
  not_ready: {
    id: 'not_ready',
    label: 'I’m not ready to buy yet',
    response: 'That’s completely fine. Take your time and continue browsing whenever you’re ready.',
    actionLabel: 'Continue browsing',
    actionId: 'browse',
  },
  comparing: {
    id: 'comparing',
    label: 'I’m still comparing options',
    response: 'You can revisit the package options and compare what is included in each bundle at your own pace.',
    actionLabel: 'Compare packages',
    actionId: 'packages',
  },
  something_else: {
    id: 'something_else',
    label: 'Something else',
    response: 'Thanks for letting us know. You’re welcome to keep exploring the page without any pressure.',
    actionLabel: 'Continue browsing',
    actionId: 'browse',
  },
}

const defaultReasonOrder: ExitReasonId[] = ['price', 'trust', 'product_information', 'delivery', 'not_ready', 'comparing', 'something_else']

export function getExitReasons(stage: ExitFeedbackStage) {
  const order = stage === 'checkout'
    ? ['delivery', 'trust', 'price', 'product_information', 'not_ready', 'comparing', 'something_else'] as ExitReasonId[]
    : stage === 'packages'
      ? ['price', 'comparing', 'trust', 'product_information', 'delivery', 'not_ready', 'something_else'] as ExitReasonId[]
      : defaultReasonOrder

  return order.map((id) => reasons[id])
}

export function getExitReasonLabel(reasonId: ExitReasonId) {
  return reasons[reasonId]?.label ?? reasonId
}
