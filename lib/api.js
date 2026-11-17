import { NextResponse } from 'next/server';
import { connectDB } from './mongodb';

export const json = (data, status = 200) => NextResponse.json(data, { status });

/** Throw inside a handler to return a clean JSON error. */
export class ApiError extends Error {
  constructor(status, message, errors) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

export const isValidId = (id) => /^[a-f\d]{24}$/i.test(String(id));

/** Wraps a route handler: connects to the DB and converts errors to JSON responses. */
export function route(handler) {
  return async (request, context) => {
    try {
      await connectDB();
      return await handler(request, context);
    } catch (err) {
      if (err instanceof ApiError) {
        return json({ error: err.message, errors: err.errors || {} }, err.status);
      }
      if (err?.code === 11000) {
        const field = Object.keys(err.keyPattern || {})[0];
        const message =
          field === 'quotationId'
            ? 'This Quotation ID already exists.'
            : 'A record with this value already exists.';
        return json({ error: message, errors: field ? { [field]: message } : {} }, 409);
      }
      if (err?.name === 'ValidationError' || err?.name === 'CastError') {
        return json({ error: err.message, errors: {} }, 400);
      }
      console.error('[api]', err);
      return json({ error: err?.message || 'Something went wrong.', errors: {} }, 500);
    }
  };
}
