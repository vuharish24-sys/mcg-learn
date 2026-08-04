import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class AppValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AppValidationError";
  }
}

export class AppForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AppForbiddenError";
  }
}

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function apiError(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    { success: false, error: { message, details } },
    { status },
  );
}

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    return apiError("Validation failed", 422, error.flatten());
  }
  if (error instanceof AppValidationError) {
    return apiError(error.message, 422);
  }
  if (error instanceof AppForbiddenError) {
    return apiError(error.message, 403);
  }
  console.error(error);
  return apiError("An unexpected error occurred", 500);
}
