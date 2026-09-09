import { z } from 'zod';
import { PaymentProvider, PaymentType } from '@prisma/client';

export const initiatePaymentSchema = z.object({
  body: z.object({
    amount: z.number().positive('Payment amount must be greater than 0'),
    provider: z.nativeEnum(PaymentProvider).optional().default(PaymentProvider.STRIPE),
    type: z.nativeEnum(PaymentType).optional().default(PaymentType.TUITION_FEE),
    metadata: z.string().optional(),
  }),
});
