import { z } from 'zod'

export const checkoutFormSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name'),
  phoneNumber: z.string().trim().min(7, 'Enter a valid phone number').max(18, 'Phone number is too long'),
  whatsappNumber: z.string().trim().max(18, 'WhatsApp number is too long').optional(),
  state: z.string().trim().min(1, 'Select your state'),
  address: z.string().trim().min(8, 'Enter a detailed delivery address'),
  deliveryNote: z.string().trim().max(180, 'Keep delivery note under 180 characters').optional(),
})

export type CheckoutFormValues = z.infer<typeof checkoutFormSchema>
