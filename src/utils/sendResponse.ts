import { Response } from 'express';

interface IResponseData<T> {
  statusCode?: number;
  success?: boolean;
  message?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPage?: number;
  };
  data?: T;
}

export const sendResponse = <T>(res: Response, data: IResponseData<T>): void => {
  const statusCode = data.statusCode || 200;
  res.status(statusCode).json({
    success: data.success ?? true,
    message: data.message || 'Operation successful',
    meta: data.meta,
    data: data.data !== undefined ? data.data : null,
  });
};
