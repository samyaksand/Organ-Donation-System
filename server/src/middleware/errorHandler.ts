import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { env } from '../config/env';
import { AppError, fieldErrors } from '../utils/errors';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(new AppError(404, 'NOT_FOUND', `Route ${req.method} ${req.originalUrl} not found`));
}

function fromPrisma(err: Prisma.PrismaClientKnownRequestError): AppError {
  switch (err.code) {
    case 'P2002': {
      const target = (err.meta?.target as string[] | string | undefined) ?? [];
      const fields = Array.isArray(target) ? target : [target];
      if (fields.includes('email')) {
        const message = 'An account with this email already exists';
        return AppError.conflict(message, fieldErrors(['email', message]));
      }
      return AppError.conflict('A record with these details already exists', {
        fields: fields.map((path) => ({ path, message: 'Already in use' })),
      });
    }
    case 'P2003':
      return AppError.conflict('This record is referenced by other records and cannot be changed this way');
    case 'P2034':
      return AppError.conflict('The record was changed by another request. Please try again.');
    case 'P2025':
      return AppError.notFound();
    default:
      return new AppError(500, 'INTERNAL_ERROR', 'A database error occurred');
  }
}

// Express recognises error handlers by arity, so `next` must stay in the signature.
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  let appError: AppError;

  if (err instanceof AppError) {
    appError = err;
  } else if (err instanceof ZodError) {
    appError = new AppError(400, 'VALIDATION_ERROR', 'Some fields are invalid', {
      fields: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    appError = fromPrisma(err);
  } else if (err instanceof Prisma.PrismaClientInitializationError) {
    appError = new AppError(503, 'SERVICE_UNAVAILABLE', 'The service is temporarily unavailable. Please try again shortly.');
  } else if (err instanceof SyntaxError && 'body' in err) {
    appError = AppError.badRequest('Malformed JSON body');
  } else {
    appError = new AppError(500, 'INTERNAL_ERROR', 'Something went wrong. Please try again.');
  }

  if (appError.status >= 500 && !env.isTest) {
    console.error('[error]', err);
  }

  res.status(appError.status).json({
    error: {
      code: appError.code,
      message: appError.message,
      ...(appError.details !== undefined ? { details: appError.details } : {}),
    },
  });
}
