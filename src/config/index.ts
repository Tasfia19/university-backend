import dotenv from 'dotenv';
import path from 'path';

dotenv.config({
	path: path.resolve(process.cwd(), ".env"),
});

export const config = {
  port: process.env.PORT ? parseInt(process.env.PORT) : 5000,
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'university-system-secret-jwt-key-2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  nodeEnv: process.env.NODE_ENV || 'development',
};
