import type { ZodTypeAny, z } from 'zod';
import { operationalError } from './error';

/**
 * Parse a JSON request body against a Zod schema.
 * Throws an operational 400 error on failure (caught by handleError).
 */
export async function parseBody<S extends ZodTypeAny>(
  req: Request,
  schema: S,
): Promise<z.infer<S>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw operationalError('Invalid JSON body', 400);
  }
  const r = schema.safeParse(body);
  if (!r.success) {
    const e = operationalError('Validation failed', 400);
    (e as any).errors = r.error.flatten().fieldErrors;
    throw e;
  }
  return r.data as z.infer<S>;
}

/**
 * Parse URLSearchParams against a Zod schema.
 * Throws an operational 400 error on failure.
 */
export function parseQuery<S extends ZodTypeAny>(
  searchParams: URLSearchParams,
  schema: S,
): z.infer<S> {
  const obj: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    obj[key] = value;
  });
  const r = schema.safeParse(obj);
  if (!r.success) {
    const e = operationalError('Invalid query parameters', 400);
    (e as any).errors = r.error.flatten().fieldErrors;
    throw e;
  }
  return r.data as z.infer<S>;
}
