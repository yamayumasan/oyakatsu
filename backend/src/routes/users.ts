import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../index.js';
import { AppError } from '../middleware/errorHandler.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

export const usersRouter = Router();

// 全ルートで認証必須
usersRouter.use(authenticate);

// バリデーションスキーマ
const updateUserSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
});

const setRoleSchema = z.object({
  role: z.enum(['parent', 'child']),
});

const deviceTokenSchema = z.object({
  token: z.string(),
  platform: z.enum(['ios', 'android']),
});

// プロフィール取得
usersRouter.get('/me', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });

    if (!user) {
      throw new AppError(404, 'NOT_FOUND', 'ユーザーが見つかりません');
    }

    res.json({
      id: user.id,
      phoneNumber: user.phoneNumber,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// プロフィール更新
usersRouter.patch('/me', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = updateUserSchema.parse(req.body);

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data,
    });

    res.json({
      id: user.id,
      phoneNumber: user.phoneNumber,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// ロール設定
usersRouter.post('/me/role', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });

    if (currentUser?.role) {
      throw new AppError(409, 'ROLE_ALREADY_SET', 'ロールは既に設定されています');
    }

    const data = setRoleSchema.parse(req.body);

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { role: data.role as any },
    });

    res.json({
      id: user.id,
      phoneNumber: user.phoneNumber,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// デバイストークン登録
usersRouter.post('/me/device-token', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = deviceTokenSchema.parse(req.body);

    await prisma.deviceToken.upsert({
      where: {
        userId_token: {
          userId: req.user!.id,
          token: data.token,
        },
      },
      create: {
        userId: req.user!.id,
        token: data.token,
        platform: data.platform as any,
      },
      update: {
        platform: data.platform as any,
      },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// アバターアップロード（プレースホルダー）
usersRouter.post('/me/avatar', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // TODO: S3へのアップロード実装
    throw new AppError(501, 'NOT_IMPLEMENTED', 'この機能はまだ実装されていません');
  } catch (error) {
    next(error);
  }
});
