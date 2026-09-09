export class AppError extends Error {
  public readonly statusCode: number;
  public readonly status: string;
  public readonly isOperational: boolean;
  public readonly errorDetails: any;

  constructor(message: string, statusCode: number, errorDetails: any = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.errorDetails = errorDetails;

    Error.captureStackTrace(this, this.constructor);
  }
}
