import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../index.js';
import { AppError } from '../middleware/errorHandler.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

export const authRouter = Router();

// バリデーションスキーマ
const sendCodeSchema = z.object({
  phoneNumber: z.string().optional(),
  email: z.string().email().optional(),
}).refine(data => data.phoneNumber || data.email, {
  message: '電話番号またはメールアドレスが必要です',
});

const verifyCodeSchema = z.object({
  phoneNumber: z.string().optional(),
  email: z.string().email().optional(),
  code: z.string().min(4).max(6),
});

const registerSchema = z.object({
  phoneNumber: z.string().optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  displayName: z.string().min(1).max(50),
  verificationCode: z.string().min(4).max(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// トークン生成
function generateTokens(userId: string) {
  const secret = process.env.JWT_SECRET!;
  const accessToken = jwt.sign({ userId }, secret, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ userId, type: 'refresh' }, secret, { expiresIn: '30d' });
  return { accessToken, refreshToken };
}

// 認証コード送信
authRouter.post('/send-code', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = sendCodeSchema.parse(req.body);
    const target = data.phoneNumber || data.email!;
    const type = data.phoneNumber ? 'phone' : 'email';

    // 認証コード生成（6桁）
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10分後

    // 既存のコードを無効化
    await prisma.verificationCode.updateMany({
      where: { target, usedAt: null },
      data: { usedAt: new Date() },
    });

    // 新しいコードを保存
    await prisma.verificationCode.create({
      data: {
        target,
        code,
        type: type as any,
        expiresAt,
      },
    });

    // TODO: 実際にSMS/メールを送信する
    console.log(`Verification code for ${target}: ${code}`);

    res.json({
      expiresAt: expiresAt.toISOString(),
      retryAfter: 60,
    });
  } catch (error) {
    next(error);
  }
});

// 認証コード検証
authRouter.post('/verify-code', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = verifyCodeSchema.parse(req.body);
    const target = data.phoneNumber || data.email!;

    const verification = await prisma.verificationCode.findFirst({
      where: {
        target,
        code: data.code,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!verification) {
      throw new AppError(401, 'INVALID_CODE', '認証コードが無効です');
    }

    // コードを使用済みに
    await prisma.verificationCode.update({
      where: { id: verification.id },
      data: { usedAt: new Date() },
    });

    // 既存ユーザーを検索
    const existingUser = await prisma.user.findFirst({
      where: data.phoneNumber
        ? { phoneNumber: data.phoneNumber }
        : { email: data.email },
    });

    if (existingUser) {
      // 既存ユーザー: ログイン
      const { accessToken, refreshToken } = generateTokens(existingUser.id);

      // リフレッシュトークンを保存
      await prisma.refreshToken.create({
        data: {
          userId: existingUser.id,
          token: refreshToken,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      res.json({
        accessToken,
        refreshToken,
        expiresIn: 900,
        user: {
          id: existingUser.id,
          phoneNumber: existingUser.phoneNumber,
          email: existingUser.email,
          displayName: existingUser.displayName,
          avatarUrl: existingUser.avatarUrl,
          role: existingUser.role,
        },
      });
    } else {
      // 新規ユーザー: 登録画面へ誘導
      res.json({
        isNewUser: true,
        message: '新規登録が必要です',
      });
    }
  } catch (error) {
    next(error);
  }
});

// 新規登録
authRouter.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = registerSchema.parse(req.body);
    const target = data.phoneNumber || data.email!;

    // 認証コードの検証（既に使用済みのコードをチェック）
    const verification = await prisma.verificationCode.findFirst({
      where: {
        target,
        code: data.verificationCode,
        usedAt: { not: null },
      },
      orderBy: { usedAt: 'desc' },
    });

    if (!verification || !verification.usedAt ||
        Date.now() - verification.usedAt.getTime() > 10 * 60 * 1000) {
      throw new AppError(400, 'INVALID_VERIFICATION', '認証が無効です。再度認証してください');
    }

    // 既存ユーザーチェック
    const existingUser = await prisma.user.findFirst({
      where: data.phoneNumber
        ? { phoneNumber: data.phoneNumber }
        : { email: data.email },
    });

    if (existingUser) {
      throw new AppError(409, 'USER_EXISTS', 'このアカウントは既に登録されています');
    }

    // パスワードハッシュ化
    const passwordHash = data.password ? await bcrypt.hash(data.password, 12) : null;

    // ユーザー作成
    const user = await prisma.user.create({
      data: {
        phoneNumber: data.phoneNumber,
        email: data.email,
        passwordHash,
        displayName: data.displayName,
      },
    });

    const { accessToken, refreshToken } = generateTokens(user.id);

    // リフレッシュトークンを保存
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    res.status(201).json({
      accessToken,
      refreshToken,
      expiresIn: 900,
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
});

// メール/パスワードログイン
authRouter.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user || !user.passwordHash) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'メールアドレスまたはパスワードが正しくありません');
    }

    const isValid = await bcrypt.compare(data.password, user.passwordHash);
    if (!isValid) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'メールアドレスまたはパスワードが正しくありません');
    }

    const { accessToken, refreshToken } = generateTokens(user.id);

    // リフレッシュトークンを保存
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    res.json({
      accessToken,
      refreshToken,
      expiresIn: 900,
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
});

// トークンリフレッシュ
authRouter.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      throw new AppError(400, 'MISSING_TOKEN', 'リフレッシュトークンが必要です');
    }

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new AppError(401, 'INVALID_TOKEN', 'リフレッシュトークンが無効です');
    }

    // 古いトークンを削除
    await prisma.refreshToken.delete({ where: { id: storedToken.id } });

    const { accessToken, refreshToken } = generateTokens(storedToken.userId);

    // 新しいリフレッシュトークンを保存
    await prisma.refreshToken.create({
      data: {
        userId: storedToken.userId,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    res.json({
      accessToken,
      refreshToken,
      expiresIn: 900,
      user: {
        id: storedToken.user.id,
        phoneNumber: storedToken.user.phoneNumber,
        email: storedToken.user.email,
        displayName: storedToken.user.displayName,
        avatarUrl: storedToken.user.avatarUrl,
        role: storedToken.user.role,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ログアウト
authRouter.post('/logout', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // 該当ユーザーのリフレッシュトークンを全削除
    await prisma.refreshToken.deleteMany({
      where: { userId: req.user!.id },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
