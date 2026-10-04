import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny, z } from 'zod';

interface Schemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

/**
 * Validates request parts with zod. Failures are forwarded to the central error handler
 * (ZodError -> 400 VALIDATION_ERROR). Parsed values land on `req.validated`.
 */
export function validate(schemas: Schemas) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const validated: NonNullable<Request['validated']> = {};
    if (schemas.params) validated.params = schemas.params.parse(req.params);
    if (schemas.query) validated.query = schemas.query.parse(req.query);
    if (schemas.body) validated.body = schemas.body.parse(req.body ?? {});
    req.validated = validated;
    next();
  };
}

/** Typed accessors for controllers. */
export function getBody<S extends ZodTypeAny>(req: Request, _schema: S): z.infer<S> {
  return req.validated?.body as z.infer<S>;
}
export function getQuery<S extends ZodTypeAny>(req: Request, _schema: S): z.infer<S> {
  return req.validated?.query as z.infer<S>;
}
export function getParams<S extends ZodTypeAny>(req: Request, _schema: S): z.infer<S> {
  return req.validated?.params as z.infer<S>;
}
