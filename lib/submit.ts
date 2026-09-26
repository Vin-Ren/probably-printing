import { UploadApiErrorResponse, UploadApiResponse } from "cloudinary";
import { createCORSHeadersFromRequest, createErrorResponse, createSuccessResponse, handleCORS } from "./api-utils";
import { ALLOW_ALL_EXTENSIONS, CODE_FILE_EXTENSIONS, CODE_FILE_MAX_SIZE } from "./consts";
import cloudinary, { CLOUDINARY_FOLDER } from "./cloudinary";
import { safeFilename } from "./utils";
import { redis } from "./redis";
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";


export async function queueSubmission({
  filename,
  teamname,
  codeUrl,
  submitSource = 'unknown',
}: {
  filename: string;
  teamname: string;
  codeUrl: string;
  submitSource?: string;
}) {
  if (!redis.isOpen) {
    await redis.connect();
  }

  const taskId = randomUUID();
  const taskString = JSON.stringify({
    id: taskId,
    filename,
    teamname,
    code_url: codeUrl,
  });

  console.log("Pushing task to Redis queue:", taskString);
  await redis.lPush(`task_queue`, taskString);

  const monitorEvent = JSON.stringify({
    type: 'submission',
    timestamp: new Date().toISOString(),
    id: taskId,
    teamname,
    filename,
    fileUrl: codeUrl,
    source: submitSource,
  });

  await redis.publish('submissions', monitorEvent);

  return { taskId };
}


export async function DataExtractionErrorHandler<T>(func: () => Promise<T>, corsHeaders: HeadersInit): Promise<T | NextResponse> {
  try {
    return await func();
  } catch (error) {
    if (error instanceof TypeError) {
      return createErrorResponse("Invalid form data", 400, corsHeaders);
    }
    console.error("Error processing request:", error);
    return createErrorResponse("Error processing request", 500, corsHeaders);
  }
}

/* * Handles the submission of a code file, including validation, uploading to Cloudinary,
 * and queuing a task in Redis.
 *
 * @param file - The uploaded code file.
 * @param teamname - The name of the submitting team.
 * @param corsHeaders - Headers for CORS support.
 * @param submitSource - Optional source identifier for the submission (default: 'unknown').
 * @returns A response object indicating success or failure of the operation.
 */
export async function SubmitHandler(file: File | null, teamname: string, corsHeaders: HeadersInit, submitSource: string = 'unknown') {
  if (!(file instanceof File)) {
    return createErrorResponse("No file uploaded", 400, corsHeaders);
  }

  if (typeof teamname !== "string" || !teamname.trim() || teamname.length > 100 ||
      !file.name || file.name.length > 255 || /[\\/\x00-\x1F]/.test(file.name)) {
    return createErrorResponse("Invalid team name or filename", 400, corsHeaders);
  }

  // File size check
  if (file.size > CODE_FILE_MAX_SIZE) {
    return createErrorResponse("File too large", 413, corsHeaders);
  }

  // Extension check
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!ALLOW_ALL_EXTENSIONS && (!ext || !CODE_FILE_EXTENSIONS.includes('.' + ext))) {
    return createErrorResponse("File type not allowed", 415, corsHeaders);
  }

  console.log("Uploading file:", file.name, "from team:", teamname);

  // Upload to Cloudinary
  const buffer = Buffer.from(await file.arrayBuffer());
  let upload: UploadApiResponse;
  try {
    upload = await new Promise<UploadApiResponse>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: "raw",
          folder: CLOUDINARY_FOLDER,
          public_id: safeFilename(`${teamname}_${Date.now()}_${file.name}`),
        },
        (err: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
          if (err) return reject(err);
          if (!result) return reject(new Error("No upload result"));
          resolve(result);
        }
      ).end(buffer);
    });
  } catch {
    return createErrorResponse("Cloudinary upload failed", 500, corsHeaders);
  }

  const { taskId } = await queueSubmission({
    filename: file.name,
    teamname,
    codeUrl: upload.secure_url,
    submitSource,
  });

  return createSuccessResponse({
    success: true,
    teamname,
    file: file.name,
    cloudinary: upload,
    taskId,
  }, corsHeaders);
}

/* * Creates an OPTIONS handler for CORS preflight requests.
 *
 * @param requiredHeaders - An array of additional headers to allow in CORS.
 * @returns A function that handles OPTIONS requests with appropriate CORS headers.
 */
export function createSubmitOPTIONSHandler(requiredHeaders: string[] = []) {
  return async function OPTIONSHandler(req: NextRequest) {
    return handleCORS(req, requiredHeaders);
  }
}


export interface CreateSubmitPOSTHandlerExtractorParams {
  req: NextRequest;
  createSuccessResponse: (data: unknown) => NextResponse;
  createErrorResponse: (message: string, status: number) => NextResponse;
}

export type CreateSubmitPOSTHandlerExtractorType =
  (props: CreateSubmitPOSTHandlerExtractorParams) => Promise<NextResponse | { file: File, teamname: string }>

/* * Creates a POST handler for file submissions, including data extraction and validation.
 *
 * @param source - A string identifier for the submission source (for monitoring).
 * @param requiredHeaders - An array of additional headers to allow in CORS.
 * @param dataExtractor - A function to extract and validate data from the request.
 *                        It should return either a NextResponse (for errors, invalid credentials, etc) or an object with `file` and `teamname`.
 *                        createErrorResponse and createSuccessResponse functions are provided for convenience (already wrapped with required corsHeaders).
 * @returns A function that handles POST requests for file submissions.
 */
export function createSubmitPOSTHandler(
  { source, requiredHeaders = [], dataExtractor }: {
    source: string,
    requiredHeaders?: string[],
    dataExtractor: CreateSubmitPOSTHandlerExtractorType,
  }
) {
  return async function POSTHandler(req: NextRequest) {
    const corsHeaders = createCORSHeadersFromRequest(req, requiredHeaders);
    const dataExtractionResult = await DataExtractionErrorHandler(
      () => dataExtractor({
        req,
        createSuccessResponse: (data: unknown) => createSuccessResponse(data, corsHeaders),
        createErrorResponse: (message: string, status: number) => createErrorResponse(message, status, corsHeaders),
      }),
      corsHeaders
    );
    if (dataExtractionResult instanceof NextResponse) {
      return dataExtractionResult;
    }
    const { file, teamname } = dataExtractionResult;
    return await SubmitHandler(file, teamname, corsHeaders, source);
  }
}
