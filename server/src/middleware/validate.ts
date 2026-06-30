import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

type RequestPart = 'body' | 'query' | 'params';

/**
 * Validate request data against a Zod schema.
 * Returns 400 with structured errors if validation fails.
 */
export function validate(schema: ZodSchema, source: RequestPart = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req[source]);
      // Replace request data with parsed (coerced/transformed) data
      if (source === 'body') {
        req.body = parsed;
      } else if (source === 'query') {
        (req as any).validatedQuery = parsed;
      } else {
        req.params = parsed as Record<string, string>;
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));

        res.status(400).json({
          success: false,
          message: 'بيانات غير صحيحة. يرجى التحقق من المدخلات.',
          data: { errors },
        });
        return;
      }
      next(error);
    }
  };
}
