import { NextResponse } from 'next/server';
import { getOpenApiDocument } from '@/lib/api/openapi';

/**
 * GET /api/openapi
 * Serves the OpenAPI document for the frontend's API routes.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;

  return NextResponse.json(getOpenApiDocument(baseUrl), {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
