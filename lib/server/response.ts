import { NextResponse } from 'next/server';

export const ok = (data: unknown = null, message = 'Success', status = 200) =>
  NextResponse.json({ success: true, message, data }, { status });

export const created = (data: unknown = null, message = 'Created') =>
  NextResponse.json({ success: true, message, data }, { status: 201 });

export const fail = (message = 'Something went wrong', status = 500, errors?: unknown) =>
  NextResponse.json({ success: false, message, ...(errors ? { errors } : {}) }, { status });

export const badRequest = (message = 'Bad request', errors?: unknown) => fail(message, 400, errors);
export const unauthorized = (message = 'Unauthorized') => fail(message, 401);
export const forbidden = (message = 'Forbidden') => fail(message, 403);
export const notFound = (message = 'Not found') => fail(message, 404);
export const conflict = (message = 'Conflict') => fail(message, 409);

export const paginated = (
  items: unknown[],
  total: number,
  page: number,
  limit: number,
  message = 'Success',
) =>
  NextResponse.json({
    success: true,
    message,
    data: items,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  });
