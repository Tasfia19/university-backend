import { Response } from 'express';
import crypto from 'crypto';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';
import { AppError } from '../../utils/AppError';
import prisma from '../../services/db';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { createAuditLog } from '../../services/auditLog.service';
import { createStripeCheckoutSession } from '../../services/payment.service';

export const initiatePayment = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const { amount, provider, type, metadata } = req.body;
  const transactionId = `TRX-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

  const payment = await prisma.payment.create({
    data: {
      studentId: req.user.id,
      amount,
      currency: 'BDT',
      transactionId,
      provider: provider || 'STRIPE',
      type: type || 'TUITION_FEE',
      status: 'PENDING',
      metadata,
    },
  });

  const session = await createStripeCheckoutSession({
    amount,
    currency: 'BDT',
    transactionId,
    paymentType: type || 'TUITION_FEE',
    studentEmail: req.user.email,
  });

  await createAuditLog({
    userId: req.user.id,
    action: 'INITIATE_PAYMENT',
    entity: 'Payment',
    entityId: payment.id,
    details: `Initiated payment ${transactionId} of ${amount} BDT via ${provider}`,
    ipAddress: req.ip,
  });

  sendResponse(res, {
    statusCode: 201,
    message: 'Payment session initiated successfully',
    data: {
      payment,
      checkoutUrl: session.url,
    },
  });
});

export const handlePaymentWebhook = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const { transactionId, status, secretKey } = req.body;

  if (!transactionId) {
    throw new AppError('Transaction ID is required', 400);
  }

  const payment = await prisma.payment.findUnique({
    where: { transactionId },
  });

  if (!payment) {
    throw new AppError('Payment record not found', 404);
  }

  const newStatus = status === 'SUCCESS' || status === 'PAID' ? 'PAID' : 'FAILED';

  const updatedPayment = await prisma.payment.update({
    where: { transactionId },
    data: {
      status: newStatus,
      paidAt: newStatus === 'PAID' ? new Date() : null,
    },
  });

  await createAuditLog({
    userId: payment.studentId,
    action: 'PAYMENT_WEBHOOK_PROCESSED',
    entity: 'Payment',
    entityId: payment.id,
    details: `Payment status updated to ${newStatus} for transaction ${transactionId}`,
    ipAddress: req.ip,
  });

  sendResponse(res, {
    statusCode: 200,
    message: `Payment webhook processed. Status: ${newStatus}`,
    data: updatedPayment,
  });
});

export const getMyPayments = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const status = req.query.status as string;
  const skip = (page - 1) * limit;

  const whereClause: any = {
    studentId: req.user.id,
  };

  if (status) {
    whereClause.status = status;
  }

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.payment.count({ where: whereClause }),
  ]);

  sendResponse(res, {
    statusCode: 200,
    message: 'Payment history fetched successfully',
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
    data: payments,
  });
});
