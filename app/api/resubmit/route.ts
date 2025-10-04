import { NextRequest } from "next/server";
import { queueSubmission } from "@/lib/submit";
import { createCORSHeadersFromRequest, createErrorResponse, createSuccessResponse, handleCORS, validateSecretKey } from "@/lib/api-utils";

interface ResubmitRequestBody {
  secretKey?: string;
  submissionId?: string;
  id?: string;
  filename?: string;
  teamname?: string;
  fileUrl?: string;
  source?: string;
}

export async function OPTIONS(req: NextRequest) {
  return handleCORS(req);
}

export async function POST(req: NextRequest) {
  const corsHeaders = createCORSHeadersFromRequest(req);

  let body: ResubmitRequestBody;
  try {
    body = await req.json();
  } catch {
    return createErrorResponse("Invalid JSON body", 400, corsHeaders);
  }

  const {
    secretKey = "",
    submissionId,
    id,
    filename,
    teamname,
    fileUrl,
    source = "unknown",
  } = body ?? {};

  const secretKeyError = validateSecretKey(secretKey, corsHeaders);
  if (secretKeyError) {
    return secretKeyError;
  }

  if (!filename || !teamname || !fileUrl) {
    return createErrorResponse("Missing submission data", 400, corsHeaders);
  }

  const { taskId } = await queueSubmission({
    filename,
    teamname,
    codeUrl: fileUrl,
    submitSource: source,
  });

  return createSuccessResponse({
    success: true,
    originalSubmissionId: submissionId ?? id ?? null,
    newSubmissionId: taskId,
  }, corsHeaders);
}
