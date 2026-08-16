// STUB — replace with __NPM_SCOPE__/core-api when you adopt the shared packages.
import type { NextResponse } from "next/server.js";

export declare class AppError extends Error {
  statusCode: number;
  code: string;
  constructor(message: string, statusCode?: number, code?: string);
}

export declare function handleError(error: unknown): NextResponse;

export declare const Errors: {
  badRequest(message?: string): NextResponse;
  unauthorized(message?: string): NextResponse;
  forbidden(message?: string): NextResponse;
  notFound(what?: string): NextResponse;
  conflict(message?: string): NextResponse;
  internal(message?: string): NextResponse;
};
