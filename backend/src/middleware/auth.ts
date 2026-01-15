import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler.js';
import { prisma } from '../index.js';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role?: 'parent' | 'child';
  };
}

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(401, 'UNAUTHORIZED', '認証が必要です');
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error('JWT_SECRET is not defined');
    }

    const decoded = jwt.verify(token, secret) as { userId: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true },
    });

    if (!user) {
      throw new AppError(401, 'UNAUTHORIZED', 'ユーザーが見つかりません');
    }

    req.user = {
      id: user.id,
      role: user.role ?? undefined,
    };

    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new AppError(401, 'TOKEN_EXPIRED', 'トークンの有効期限が切れています'));
    } else if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError(401, 'INVALID_TOKEN', '無効なトークンです'));
    } else {
      next(error);
    }
  }
}

export function requireRole(role: 'parent' | 'child') {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user?.role) {
      return next(new AppError(403, 'ROLE_REQUIRED', 'ロールの設定が必要です'));
    }

    if (req.user.role !== role) {
      return next(new AppError(403, 'FORBIDDEN', 'この操作は許可されていません'));
    }

    next();
  };
}
