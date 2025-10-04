import { createCORSHeadersFromRequest, validateSecretKey } from "@/lib/api-utils";
import { createSubmitOPTIONSHandler, createSubmitPOSTHandler, type CreateSubmitPOSTHandlerExtractorType } from "@/lib/submit";


const dataExtractor: CreateSubmitPOSTHandlerExtractorType = async ({ req }) => {
  const corsHeaders = createCORSHeadersFromRequest(req);
  const formData = await req.formData();
  const file = formData.get("file") as File;
  const teamname = (formData.get("username") as string) || "anonymous";
  const secretKey = formData.get("secretKey") as string;

  // Validate secret key
  const secretKeyError = validateSecretKey(secretKey, corsHeaders);
  if (secretKeyError) return secretKeyError;
  return { file, teamname };
}

export const OPTIONS = createSubmitOPTIONSHandler();

export const POST = createSubmitPOSTHandler({
  source: 'api/submit',
  dataExtractor
});
