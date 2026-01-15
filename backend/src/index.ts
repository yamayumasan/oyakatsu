import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { PrismaClient } from '@prisma/client';

// ルーター
import { authRouter } from './routes/auth.js';
import { usersRouter } from './routes/users.js';
import { familiesRouter } from './routes/families.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const port = process.env.PORT || 3000;

// Prisma Client
export const prisma = new PrismaClient();

// ミドルウェア
app.use(helmet());
app.use(cors());
app.use(express.json());

// ヘルスチェック
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// APIルート
app.use('/v1/auth', authRouter);
app.use('/v1/users', usersRouter);
app.use('/v1/families', familiesRouter);

// エラーハンドラー
app.use(errorHandler);

// サーバー起動
async function main() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected');

    app.listen(port, () => {
      console.log(`🚀 Server running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();

// グレースフルシャットダウン
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
