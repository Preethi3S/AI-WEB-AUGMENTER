import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateBody } from '../middleware/validate.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { UserModel } from '../models/User.js';
import { AppError } from '../middleware/errorHandler.js';
import { signAuthToken } from '../utils/token.js';

const authSchema = z.object({
  name: z.string().trim().min(2).optional(),
  email: z.string().email(),
  password: z.string().min(8)
});

export const authRouter = Router();

authRouter.post(
  '/register',
  validateBody(authSchema),
  asyncHandler(async (req, res) => {
    const { name, email, password } = req.body as z.infer<typeof authSchema>;

    const existing = await UserModel.findOne({ email });
    if (existing) {
      throw new AppError('User already exists', 409);
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await UserModel.create({ name: name ?? 'AI Web Augmenter User', email, passwordHash });
    const token = signAuthToken({ id: String(user._id), email: user.email, role: user.role });

    res.status(201).json({
      success: true,
      data: { token, user: { id: user._id, name: user.name, email: user.email, role: user.role } }
    });
  })
);

authRouter.post(
  '/login',
  validateBody(authSchema.pick({ email: true, password: true })),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body as z.infer<typeof authSchema>;
    const user = await UserModel.findOne({ email });

    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      throw new AppError('Invalid credentials', 401);
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = signAuthToken({ id: String(user._id), email: user.email, role: user.role });

    res.json({
      success: true,
      data: { token, user: { id: user._id, name: user.name, email: user.email, role: user.role } }
    });
  })
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const user = await UserModel.findById(authReq.user?.id).lean();

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({ success: true, data: { user } });
  })
);

authRouter.post('/logout', requireAuth, asyncHandler(async (_req, res) => {
  res.json({ success: true, data: { message: 'Logged out successfully' } });
}));