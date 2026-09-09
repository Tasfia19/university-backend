import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Something went wrong';
  let errors: any[] = err.errorDetails || [];

  if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation Error';
    errors = err.errors.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      statusCode = 400;
      const fields = (err.meta?.target as string[]) || [];
      message = `Duplicate value for field(s): ${fields.join(', ')}`;
      errors = [{ field: fields.join(','), message }];
    } else if (err.code === 'P2025') {
      statusCode = 404;
      message = (err.meta?.cause as string) || 'Record not found';
      errors = [{ message }];
    } else if (err.code === 'P2003') {
      statusCode = 400;
      message = `Invalid reference on field: ${err.meta?.field_name || 'foreign key'}`;
      errors = [{ message }];
    }
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token. Please log in again!';
    errors = [{ message }];
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Your token has expired. Please log in again!';
    errors = [{ message }];
  }

  if (statusCode === 500 && process.env.NODE_ENV !== 'production') {
    console.error('ERROR 💥:', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors: Array.isArray(errors) ? errors : [errors],
  });
};
