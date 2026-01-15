import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('Error:', err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
      },
    });
  }

  // Prismaエラー
  if (err.name === 'PrismaClientKnownRequestError') {
    return res.status(400).json({
      error: {
        code: 'DATABASE_ERROR',
        message: 'データベースエラーが発生しました',
      },
    });
  }

  // ZodエラーはZodErrorとして扱う
  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: '入力値が不正です',
      },
    });
  }

  // その他のエラー
  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: '予期しないエラーが発生しました',
    },
  });
}
