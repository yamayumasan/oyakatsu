import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { randomBytes } from 'crypto';
import { prisma } from '../index.js';
import { AppError } from '../middleware/errorHandler.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';

export const familiesRouter = Router();

// 全ルートで認証必須
familiesRouter.use(authenticate);

// バリデーションスキーマ
const createFamilySchema = z.object({
  name: z.string().min(1).max(50),
});

const updateFamilySchema = z.object({
  name: z.string().min(1).max(50).optional(),
});

const joinFamilySchema = z.object({
  inviteCode: z.string(),
});

// 招待コード生成
function generateInviteCode(): string {
  return randomBytes(3).toString('hex').toUpperCase();
}

// ファミリー作成（親のみ）
familiesRouter.post('/', requireRole('parent'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = createFamilySchema.parse(req.body);

    const family = await prisma.family.create({
      data: {
        name: data.name,
        inviteCode: generateInviteCode(),
        createdBy: req.user!.id,
        members: {
          create: {
            userId: req.user!.id,
            role: 'parent',
          },
        },
      },
      include: {
        _count: { select: { members: true } },
      },
    });

    res.status(201).json({
      id: family.id,
      name: family.name,
      iconUrl: family.iconUrl,
      createdBy: family.createdBy,
      memberCount: family._count.members,
      createdAt: family.createdAt.toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// 所属ファミリー一覧
familiesRouter.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const memberships = await prisma.familyMember.findMany({
      where: {
        userId: req.user!.id,
        status: 'active',
      },
      include: {
        family: {
          include: {
            _count: { select: { members: { where: { status: 'active' } } } },
          },
        },
      },
    });

    res.json(
      memberships.map((m) => ({
        id: m.family.id,
        name: m.family.name,
        iconUrl: m.family.iconUrl,
        createdBy: m.family.createdBy,
        memberCount: m.family._count.members,
        createdAt: m.family.createdAt.toISOString(),
      }))
    );
  } catch (error) {
    next(error);
  }
});

// ファミリー詳細
familiesRouter.get('/:familyId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { familyId } = req.params;

    // メンバーシップ確認
    const membership = await prisma.familyMember.findFirst({
      where: {
        familyId,
        userId: req.user!.id,
        status: 'active',
      },
    });

    if (!membership) {
      throw new AppError(403, 'FORBIDDEN', 'このファミリーにアクセスする権限がありません');
    }

    const family = await prisma.family.findUnique({
      where: { id: familyId },
      include: {
        members: {
          where: { status: 'active' },
          include: { user: true },
        },
        _count: { select: { members: { where: { status: 'active' } } } },
      },
    });

    if (!family) {
      throw new AppError(404, 'NOT_FOUND', 'ファミリーが見つかりません');
    }

    res.json({
      id: family.id,
      name: family.name,
      iconUrl: family.iconUrl,
      createdBy: family.createdBy,
      memberCount: family._count.members,
      createdAt: family.createdAt.toISOString(),
      members: family.members.map((m) => ({
        id: m.id,
        userId: m.userId,
        displayName: m.user.displayName,
        avatarUrl: m.user.avatarUrl,
        role: m.role,
        joinedAt: m.joinedAt.toISOString(),
      })),
    });
  } catch (error) {
    next(error);
  }
});

// ファミリーメンバー一覧
familiesRouter.get('/:familyId/members', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { familyId } = req.params;

    // メンバーシップ確認
    const membership = await prisma.familyMember.findFirst({
      where: {
        familyId,
        userId: req.user!.id,
        status: 'active',
      },
    });

    if (!membership) {
      throw new AppError(403, 'FORBIDDEN', 'このファミリーにアクセスする権限がありません');
    }

    const members = await prisma.familyMember.findMany({
      where: {
        familyId,
        status: 'active',
      },
      include: { user: true },
    });

    // TODO: ランキングと称号情報を取得

    res.json(
      members.map((m) => ({
        id: m.id,
        userId: m.userId,
        displayName: m.user.displayName,
        avatarUrl: m.user.avatarUrl,
        role: m.role,
        title: null, // TODO: 称号取得
        monthlyAmount: 0, // TODO: 月間金額取得
        joinedAt: m.joinedAt.toISOString(),
      }))
    );
  } catch (error) {
    next(error);
  }
});

// 招待コード取得（親のみ）
familiesRouter.get('/:familyId/invite-code', requireRole('parent'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { familyId } = req.params;

    // メンバーシップ確認
    const membership = await prisma.familyMember.findFirst({
      where: {
        familyId,
        userId: req.user!.id,
        role: 'parent',
        status: 'active',
      },
    });

    if (!membership) {
      throw new AppError(403, 'FORBIDDEN', 'このファミリーの招待コードを取得する権限がありません');
    }

    const family = await prisma.family.findUnique({
      where: { id: familyId },
    });

    if (!family) {
      throw new AppError(404, 'NOT_FOUND', 'ファミリーが見つかりません');
    }

    res.json({
      code: family.inviteCode,
      url: `https://oyakatsu.app/join/${family.inviteCode}`,
      expiresAt: null, // 期限なし
    });
  } catch (error) {
    next(error);
  }
});

// 招待コード再生成（親のみ）
familiesRouter.post('/:familyId/invite-code', requireRole('parent'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { familyId } = req.params;

    // メンバーシップ確認
    const membership = await prisma.familyMember.findFirst({
      where: {
        familyId,
        userId: req.user!.id,
        role: 'parent',
        status: 'active',
      },
    });

    if (!membership) {
      throw new AppError(403, 'FORBIDDEN', 'このファミリーの招待コードを再生成する権限がありません');
    }

    const family = await prisma.family.update({
      where: { id: familyId },
      data: { inviteCode: generateInviteCode() },
    });

    res.json({
      code: family.inviteCode,
      url: `https://oyakatsu.app/join/${family.inviteCode}`,
      expiresAt: null,
    });
  } catch (error) {
    next(error);
  }
});

// ファミリーに参加（子供のみ）
familiesRouter.post('/join', requireRole('child'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = joinFamilySchema.parse(req.body);

    // 既に他のファミリーに所属していないかチェック
    const existingMembership = await prisma.familyMember.findFirst({
      where: {
        userId: req.user!.id,
        status: 'active',
      },
    });

    if (existingMembership) {
      throw new AppError(409, 'ALREADY_MEMBER', '既に別のファミリーに所属しています');
    }

    // 招待コードでファミリーを検索
    const family = await prisma.family.findUnique({
      where: { inviteCode: data.inviteCode },
      include: {
        _count: { select: { members: { where: { status: 'active' } } } },
      },
    });

    if (!family) {
      throw new AppError(404, 'INVALID_CODE', '招待コードが無効です');
    }

    // メンバー上限チェック
    if (family._count.members >= 10) {
      throw new AppError(400, 'FAMILY_FULL', 'このファミリーは満員です');
    }

    // メンバーとして追加
    await prisma.familyMember.create({
      data: {
        familyId: family.id,
        userId: req.user!.id,
        role: 'child',
      },
    });

    res.json({
      id: family.id,
      name: family.name,
      iconUrl: family.iconUrl,
      createdBy: family.createdBy,
      memberCount: family._count.members + 1,
      createdAt: family.createdAt.toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// ファミリーから脱退
familiesRouter.post('/:familyId/leave', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { familyId } = req.params;

    const membership = await prisma.familyMember.findFirst({
      where: {
        familyId,
        userId: req.user!.id,
        status: 'active',
      },
    });

    if (!membership) {
      throw new AppError(404, 'NOT_MEMBER', 'このファミリーのメンバーではありません');
    }

    // ファミリー作成者は脱退不可
    const family = await prisma.family.findUnique({
      where: { id: familyId },
    });

    if (family?.createdBy === req.user!.id) {
      throw new AppError(400, 'CANNOT_LEAVE', 'ファミリーの作成者は脱退できません');
    }

    await prisma.familyMember.update({
      where: { id: membership.id },
      data: {
        status: 'left',
        leftAt: new Date(),
      },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
