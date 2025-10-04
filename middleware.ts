import { NextRequest, NextResponse } from 'next/server';
import { ENABLED_PLUGINS } from '@/lib/consts';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Only apply middleware to API routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }
  
  // Remove leading slash and extract the API path (e.g., '/api/submit-via-judgels' -> 'api/submit-via-judgels')
  const apiPath = pathname.substring(1);
  
  // Always allow api/submit
  const DEFAULT_ENDPOINTS = ['api/submit', 'api/monitor', 'api/resubmit', 'api/config'];
  if (DEFAULT_ENDPOINTS.includes(apiPath)) {
    return NextResponse.next();
  }
  
  // Check if the API path is in the enabled plugins list
  if (ENABLED_PLUGINS.includes(apiPath)) {
    return NextResponse.next();
  }
  
  // Block the request if it's not allowed
  return new NextResponse(
    JSON.stringify({
      error: 'API endpoint not enabled',
      message: `The endpoint ${apiPath} is not enabled in the current configuration.`
    }),
    {
      status: 403,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

export const config = {
  matcher: '/api/:path*',
};
