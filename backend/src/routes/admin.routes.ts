import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const router = Router();
const prisma = new PrismaClient();

// Middleware to verify Admin JWT
const verifyAdmin = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as any;
    if (decoded.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }
    // Attach user id to request
    (req as any).adminId = decoded.id;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

router.use(verifyAdmin);

// GET /api/admin/stats (Overview Dashboard)
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const totalUsers = await prisma.user.count({ where: { role: 'USER' } });
    const activeUsers = await prisma.user.count({ where: { lastLogin: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } });
    const videosGenerated = await prisma.clip.count();
    const payments = await prisma.payment.aggregate({ _sum: { amount: true }, where: { status: 'COMPLETED' } });
    
    // Recent activities (last 5 users and clips)
    const recentUsers = await prisma.user.findMany({ take: 5, orderBy: { createdAt: 'desc' } });
    const recentClips = await prisma.clip.findMany({ take: 5, orderBy: { createdAt: 'desc' } });

    res.json({
      totalUsers,
      activeUsers,
      videosGenerated,
      revenue: payments._sum.amount || 0,
      recentUsers,
      recentClips
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/users
router.get('/users', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    
    const whereClause = search ? {
      OR: [
        { name: { contains: String(search) } },
        { email: { contains: String(search) } }
      ]
    } : {};

    const users = await prisma.user.findMany({
      where: whereClause,
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, email: true, plan: true, role: true, createdAt: true, lastLogin: true }
    });

    const total = await prisma.user.count({ where: whereClause });

    res.json({ users, total, page: Number(page), limit: Number(limit) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/clips
router.get('/clips', async (req: Request, res: Response) => {
  try {
    const clips = await prisma.clip.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { email: true } } }
    });
    res.json({ clips });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/payments
router.get('/payments', async (req: Request, res: Response) => {
  try {
    const payments = await prisma.payment.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { email: true } } }
    });
    res.json({ payments });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
