// NOTE: This plugin is made to support judgels requirements within the scope of CPC17, With the judgels client itself modified.
import { createSubmitOPTIONSHandler, createSubmitPOSTHandler, type CreateSubmitPOSTHandlerExtractorType } from "@/lib/submit";

interface JudgelsUserInfo {
  jid: string;
  username: string;
}

const requiredHeaders = ["x-judgels-bearer-token", "x-judgels-user-info"];
const JUDGELS_BASE_API_URL = process.env.JUDGELS_BASE_API_URL!;
const WHITELISTED_JUDGELS_USERS = (process.env.WHITELISTED_JUDGELS_USERS || "").split(",").map(user => user.trim()).filter(Boolean);

async function verifyJudgelsUser(token: string, userInfo: JudgelsUserInfo): Promise<boolean> {
  try {
    // Call Judgels API to verify token and get user info
    const response = await fetch(`${JUDGELS_BASE_API_URL}/users/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      const verifiedUser = await response.json();
      if (verifiedUser.username !== userInfo.username || verifiedUser.jid !== userInfo.jid) {
        console.log("User info mismatch:", verifiedUser, userInfo);
        return false;
      }
      return (!WHITELISTED_JUDGELS_USERS.length || WHITELISTED_JUDGELS_USERS.includes(verifiedUser.username));
    }
    return false;
  } catch {
    return false;
  }
}

const dataExtractor: CreateSubmitPOSTHandlerExtractorType = async ({ req, createErrorResponse }) => {
  const formData = await req.formData();
  const file = formData.get("file") as File;
  const judgelsToken = req.headers.get("x-judgels-bearer-token");
  const judgelsUserInfo: JudgelsUserInfo = JSON.parse(req.headers.get("x-judgels-user-info") || "{}");
  const teamname = judgelsUserInfo['username'];

  if (!judgelsToken) {
    return createErrorResponse("Missing Judgels token", 401);
  }

  if (!await verifyJudgelsUser(judgelsToken, judgelsUserInfo)) {
    return createErrorResponse("Unauthorized Judgels user", 403);
  }
  return { file, teamname };
}

export const OPTIONS = createSubmitOPTIONSHandler(requiredHeaders);

export const POST = createSubmitPOSTHandler({
  source: 'api/submit-via-judgels',
  requiredHeaders,
  dataExtractor
});
