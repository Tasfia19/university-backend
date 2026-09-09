import Stripe from 'stripe';
import { config } from '../config';

const stripe = new Stripe(config.stripeSecretKey || 'sk_test_placeholder', {
  apiVersion: '2023-10-16' as any,
});

export const createStripeCheckoutSession = async (params: {
  amount: number;
  currency: string;
  transactionId: string;
  paymentType: string;
  studentEmail: string;
}) => {
  if (!config.stripeSecretKey || config.stripeSecretKey.includes('mock')) {
    // Return mock payment checkout session URL for test environments
    return {
      id: `cs_test_${params.transactionId}`,
      url: `https://checkout.stripe.com/pay/cs_test_${params.transactionId}`,
      transactionId: params.transactionId,
    };
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    customer_email: params.studentEmail,
    line_items: [
      {
        price_data: {
          currency: params.currency.toLowerCase(),
          product_data: {
            name: `University ${params.paymentType.replace('_', ' ')}`,
          },
          unit_amount: Math.round(params.amount * 100),
        },
        quantity: 1,
      },
    ],
    client_reference_id: params.transactionId,
    success_url: `http://localhost:5000/api/v1/payments/success?trx=${params.transactionId}`,
    cancel_url: `http://localhost:5000/api/v1/payments/cancel?trx=${params.transactionId}`,
  });

  return session;
};
