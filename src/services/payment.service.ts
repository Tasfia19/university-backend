
import Stripe from 'stripe';
import { config } from '../config';

const stripe = new Stripe(
  config.stripeSecretKey || 'sk_test_placeholder',
  {
    apiVersion: '2023-10-16' as any,
  }
);

export const createStripeCheckoutSession = async (params: {
  amount: number;
  currency: string;
  transactionId: string;
  paymentType: string;
  studentEmail: string;
}) => {
  // A real Stripe secret key is required to create a checkout link.
  if (
    !config.stripeSecretKey ||
    config.stripeSecretKey.includes('mock')
  ) {
    throw new Error(
      'Stripe secret key is missing. Configure a valid Stripe test key.'
    );
  }

  const transactionId = encodeURIComponent(params.transactionId);

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

    success_url:
      `http://localhost:3000/payment/success` +
      `?trxId=${transactionId}` +
      `&session_id={CHECKOUT_SESSION_ID}`,

    cancel_url:
      `http://localhost:3000/payment/cancel` +
      `?trxId=${transactionId}`,
  });

  if (!session.url) {
    throw new Error('Stripe did not return a checkout URL.');
  }

  // Return Stripe's original checkout URL without modifying it.
  return {
    id: session.id,
    url: session.url,
    transactionId: params.transactionId,
  };
};

