import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function signAuthToken(payload: { id: string; email: string; role: string }): string {
  return jwt.sign({ email: payload.email, role: payload.role }, env.JWT_SECRET, {
    subject: payload.id,
    expiresIn: env.JWT_EXPIRES_IN
  });
}