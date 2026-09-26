import { NextRequest, NextResponse } from "next/server";

const CORS_ALLOW_ORIGINS = (process.env.CORS_ALLOW_ORIGIN || "*")
  .split(",")
  .map((d) => d.trim())
  .filter(Boolean);

export function createCORSHeaders(requestOrigin: string | null, extraHeaders: string[] = []): HeadersInit {
  const allowedOrigin = getAllowedOrigin(requestOrigin);
  
  const headers: HeadersInit = {
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Secret-Key" + (extraHeaders.length ? `, ${extraHeaders.join(", ")}` : ""),
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };

  if (allowedOrigin) {
    headers["Access-Control-Allow-Origin"] = allowedOrigin;
    if (allowedOrigin !== "*") {
      headers["Access-Control-Allow-Credentials"] = "true";
    }
  }

  return headers;
}

export function createCORSHeadersFromRequest(req: NextRequest, extraHeaders: string[] = []): HeadersInit {
  const requestOrigin = req.headers.get("origin");
  return createCORSHeaders(requestOrigin, extraHeaders);
}

function getAllowedOrigin(requestOrigin: string | null): string | null {
  // Allow wildcard
  if (CORS_ALLOW_ORIGINS.includes("*")) return "*";
  
  // No origin (direct request)
  if (!requestOrigin) return null;
  
  // Check exact match
  if (CORS_ALLOW_ORIGINS.includes(requestOrigin)) return requestOrigin;
  
  // Check for localhost development patterns
  if (requestOrigin.match(/^https?:\/\/localhost(:\d+)?$/) && 
      CORS_ALLOW_ORIGINS.some(origin => origin.includes("localhost"))) {
    return requestOrigin;
  }
  
  return null;
}

export function handleCORS(req: NextRequest, extraHeaders: string[] = []): NextResponse {
  const requestOrigin = req.headers.get("origin");
  const corsHeaders = createCORSHeaders(requestOrigin, extraHeaders);

  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export function validateSecretKey(
  secretKey: string,
  corsHeaders: HeadersInit
): NextResponse | null {
  // Check secret key (bypass in development mode)
  const isProduction = process.env.NODE_ENV === "production";
  const requiredSecretKey = process.env.API_SECRET_KEY;
  
  if (isProduction && (!requiredSecretKey || !secretKey || secretKey !== requiredSecretKey)) {
    return new NextResponse(JSON.stringify({ error: "Invalid or missing secret key" }), {
      status: 401,
      headers: corsHeaders,
    });
  }

  return null; // Valid secret key
}

export function createErrorResponse(
  error: string,
  status: number,
  corsHeaders: HeadersInit
): NextResponse {
  return new NextResponse(JSON.stringify({ error }), {
    status,
    headers: corsHeaders,
  });
}

export function createSuccessResponse(
  data: unknown,
  corsHeaders: HeadersInit
): NextResponse {
  return new NextResponse(JSON.stringify(data), {
    status: 200,
    headers: corsHeaders,
  });
}
