import { NextRequest } from "next/server";
import { redis } from "@/lib/redis";
import { createCORSHeaders } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const secretKey = searchParams.get("secretKey");
  const requestOrigin = req.headers.get("origin");
  const corsHeaders = createCORSHeaders(requestOrigin);
  
  // Validate secret key
  const isProduction = process.env.NODE_ENV === "production";
  const requiredSecretKey = process.env.API_SECRET_KEY;
  
  if (isProduction && (!requiredSecretKey || !secretKey || secretKey !== requiredSecretKey)) {
    return new Response(JSON.stringify({ error: "Invalid or missing secret key" }), {
      status: 401,
      headers: corsHeaders,
    });
  }

  // Set up Server-Sent Events
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      let isConnectionOpen = true;
      
      // Send initial connection message
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected', message: 'Monitor connected' })}\n\n`));
      
      // Set up Redis subscriber
      let subscriber: typeof redis | null = null;
      
      const setupSubscriber = async () => {
        try {
          subscriber = redis.duplicate();
          await subscriber.connect();
          
          // Subscribe to submission events
          await subscriber.subscribe("submissions", (message: string) => {
            try {
              // Check if connection is still open before sending
              if (isConnectionOpen && controller.desiredSize !== null) {
                controller.enqueue(encoder.encode(`data: ${message}\n\n`));
              }
            } catch (error) {
              console.error("Error sending SSE message:", error);
              isConnectionOpen = false;
            }
          });
          
          console.log("Subscribed to Redis submissions channel");
        } catch (error) {
          console.error("Redis subscription error:", error);
          if (isConnectionOpen && controller.desiredSize !== null) {
            try {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: 'Redis connection failed' })}\n\n`));
            } catch (e) {
              console.error("Failed to send error message:", e);
            }
          }
        }
      };
      
      setupSubscriber();
      
      // Clean up on close
      return () => {
        console.log("SSE connection closing, cleaning up...");
        isConnectionOpen = false;
        if (subscriber) {
          subscriber.disconnect().catch(console.error);
        }
      };
    },
    cancel() {
      console.log("SSE stream cancelled by client");
      // Additional cleanup if needed
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
