import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AppError } from '../utils/AppError';
import { catchAsync } from '../utils/catchAsync';
import prisma from '../services/db';
import { Role, User } from '@prisma/client';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export const protect = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  let token: string | undefined;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    const rawToken = req.headers.authorization.split(' ')[1];
    if (rawToken && rawToken.trim() !== '' && rawToken !== 'undefined' && rawToken !== 'null') {
      token = rawToken.trim();
    }
  }

  if (!token && req.cookies) {
    if (req.cookies.token && req.cookies.token !== 'undefined' && req.cookies.token !== 'null') {
      token = req.cookies.token;
    } else if (req.cookies.accessToken && req.cookies.accessToken !== 'undefined' && req.cookies.accessToken !== 'null') {
      token = req.cookies.accessToken;
    }
  }

  if (!token) {
    return next(new AppError('You are not logged in! Please provide a Bearer token or login via cookie session.', 401));
  }

  const decoded = jwt.verify(token, config.jwtSecret) as { id: number | string };
  const userId = typeof decoded.id === 'string' ? parseInt(decoded.id) : decoded.id;

  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!currentUser || currentUser.deletedAt !== null) {
    return next(new AppError('The user belonging to this token no longer exists.', 401));
  }

  if (currentUser.status === 'SUSPENDED') {
    return next(new AppError('Your account has been suspended by administration.', 403));
  }

  req.user = currentUser;
  next();
});

export const restrictTo = (...roles: Role[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401));
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action.', 403));
    }
    next();
  };
};
