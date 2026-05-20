import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { mailService } from '../services/mail.service';

const router = Router();
const prisma = new PrismaClient();

// POST /api/auth/signup
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        name: name || '',
        email,
        passwordHash,
        role: 'USER'
      }
    });

    const token = jwt.sign(
      { id: newUser.id, role: newUser.role },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '30d' }
    );

    return res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role
      }
    });

  } catch (error: any) {
    console.error('[signup error]:', error.message);
    return res.status(500).json({ error: 'Internal server error during signup' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '30d' }
    );

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });

  } catch (error: any) {
    console.error('[login error]:', error.message);
    return res.status(500).json({ error: 'Internal server error during login' });
  }
});

// POST /api/auth/admin/login
router.post('/admin/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Special check for hardcoded admin credentials first to ensure access
    if (email === 'aksharjignesh@gmail.com' && password === 'Forgot@2939') {
      let user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        user = await prisma.user.create({
          data: { email, name: 'Admin', passwordHash, role: 'ADMIN' }
        });
      }
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.passwordHash || user.role !== 'ADMIN') {
      // Log failed attempt
      if (user) {
        await prisma.loginLog.create({
          data: {
            userId: user.id,
            ipAddress: req.ip || '',
            userAgent: req.headers['user-agent'] || '',
            status: 'FAILED'
          }
        });
      }
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      await prisma.loginLog.create({
        data: {
          userId: user.id,
          ipAddress: req.ip || '',
          userAgent: req.headers['user-agent'] || '',
          status: 'FAILED'
        }
      });
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    // Update last login & create log
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    await prisma.loginLog.create({
      data: {
        userId: user.id,
        ipAddress: req.ip || '',
        userAgent: req.headers['user-agent'] || '',
        status: 'SUCCESS'
      }
    });

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '1d' }
    );

    return res.status(200).json({
      message: 'Admin login successful',
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role }
    });

  } catch (error: any) {
    console.error('[admin login error]:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/admin/forgot-password
router.post('/admin/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.role !== 'ADMIN') {
      // We don't want to reveal if the email exists or not for security, just return success
      return res.status(200).json({ message: 'If your email is registered as an admin, a reset link will be sent.' });
    }

    // Generate a simple reset token (in production this should be hashed and stored in DB with expiry)
    const resetToken = jwt.sign(
      { id: user.id, purpose: 'reset-password' },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '1h' }
    );

    // Send email
    await mailService.sendForgotPasswordEmail(user.email, resetToken);

    return res.status(200).json({ message: 'If your email is registered as an admin, a reset link will be sent.' });
  } catch (error: any) {
    console.error('[forgot password error]:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/admin/logout
router.post('/admin/logout', (req: Request, res: Response) => {
  // Since we use JWT, we just instruct the client to delete the token.
  return res.status(200).json({ message: 'Logged out successfully' });
});

export default router;
