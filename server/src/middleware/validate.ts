import type { NextFunction, Request, Response } from 'express';
import { ZodSchema } from 'zod';

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          details: parsed.error.flatten()
        }
      });
      return;
    }

    req.body = parsed.data;
    next();
  };
}