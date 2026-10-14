import { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';
import { AppError } from '../../utils/AppError';
import prisma from '../../services/db';
import { config } from '../../config';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { createAuditLog } from '../../services/auditLog.service';

export const registerUser = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const { email, password, name, role, phone, address } = req.body;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new AppError('User with this email already exists', 400);
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      role: role || 'STUDENT',
      phone,
      address,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      phone: true,
      address: true,
      createdAt: true,
    },
  });

  const token = jwt.sign({ id: newUser.id, role: newUser.role }, config.jwtSecret, {
    expiresIn: (config.jwtExpiresIn as any) || '7d',
  });

  const isProduction = process.env.NODE_ENV === 'production';
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };

  res.cookie('token', token, cookieOptions);
  res.cookie('accessToken', token, cookieOptions);

  await createAuditLog({
    userId: newUser.id,
    action: 'USER_REGISTERED',
    entity: 'User',
    entityId: newUser.id,
    details: `User registered with role ${newUser.role}`,
    ipAddress: req.ip,
  });

  sendResponse(res, {
    statusCode: 201,
    message: 'User registered successfully',
    data: { user: newUser, token },
  });
});

export const loginUser = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.deletedAt !== null) {
    throw new AppError('Invalid email or password', 401);
  }

  if (user.status === 'SUSPENDED') {
    throw new AppError('Account is suspended. Please contact administrator.', 403);
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new AppError('Invalid email or password', 401);
  }

  const token = jwt.sign({ id: user.id, role: user.role }, config.jwtSecret, {
    expiresIn: (config.jwtExpiresIn as any) || '7d',
  });

  const isProduction = process.env.NODE_ENV === 'production';
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };

  res.cookie('token', token, cookieOptions);
  res.cookie('accessToken', token, cookieOptions);

  const userResponse = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    phone: user.phone,
    address: user.address,
  };

  await createAuditLog({
    userId: user.id,
    action: 'USER_LOGIN',
    entity: 'User',
    entityId: user.id,
    details: 'User logged in successfully',
    ipAddress: req.ip,
  });

  sendResponse(res, {
    statusCode: 200,
    message: 'Login successful',
    data: { user: userResponse, token },
  });
});

export const logoutUser = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
    expires: new Date(0),
  };

  res.cookie('token', '', cookieOptions);
  res.cookie('accessToken', '', cookieOptions);

  sendResponse(res, {
    statusCode: 200,
    message: 'Logged out successfully',
    data: null,
  });
});

export const getMe = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new AppError('User not authenticated', 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      phone: true,
      address: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  sendResponse(res, {
    statusCode: 200,
    message: 'Profile retrieved successfully',
    data: user,
  });
});

export const updateProfile = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new AppError('User not authenticated', 401);
  }

  const { name, phone, address } = req.body;
  const updatedUser = await prisma.user.update({
    where: { id: req.user.id },
    data: {
      ...(name && { name }),
      ...(phone !== undefined && { phone }),
      ...(address !== undefined && { address }),
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      phone: true,
      address: true,
      updatedAt: true,
    },
  });

  await createAuditLog({
    userId: req.user.id,
    action: 'PROFILE_UPDATED',
    entity: 'User',
    entityId: req.user.id,
    details: 'User updated profile info',
    ipAddress: req.ip,
  });

  sendResponse(res, {
    statusCode: 200,
    message: 'Profile updated successfully',
    data: updatedUser,
  });
});

export const changePassword = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new AppError('User not authenticated', 401);
  }

  const { oldPassword, newPassword } = req.body;
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
  if (!isPasswordValid) {
    throw new AppError('Current password is incorrect', 400);
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: req.user.id },
    data: { password: hashedPassword },
  });

  await createAuditLog({
    userId: req.user.id,
    action: 'PASSWORD_CHANGED',
    entity: 'User',
    entityId: req.user.id,
    details: 'User changed password',
    ipAddress: req.ip,
  });

  sendResponse(res, {
    statusCode: 200,
    message: 'Password changed successfully',
    data: null,
  });
});
