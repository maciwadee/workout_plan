import type { VercelRequest, VercelResponse } from "@vercel/node";

// Local config (override with env vars if set)
const FITBIT_CLIENT_ID = process.env.FITBIT_CLIENT_ID ?? "23V3MR";
const FITBIT_CLIENT_SECRET = process.env.FITBIT_CLIENT_SECRET ?? "9591caaaaacc575f3107e654d9038a74";
const FITBIT_REDIRECT_URI = process.env.FITBIT_REDIRECT_URI ?? "https://workout-plan-bin.vercel.app/api/fitbit/callback";
const FITBIT_APP_URL = process.env.FITBIT_APP_URL ?? "https://workout-plan-bin.vercel.app";

const FITBIT_AUTH_URL = "https://www.fitbit.com/oauth2/authorize";
const SCOPES = "activity heartrate profile sleep";

export default function handler(req: VercelRequest, res: VercelResponse): void {
  if (!FITBIT_CLIENT_ID || !FITBIT_REDIRECT_URI) {
    res.status(500).json({
      error: "Missing FITBIT_CLIENT_ID or FITBIT_REDIRECT_URI",
    });
    return;
  }

  const state = Math.random().toString(36).slice(2, 15);
  const params = new URLSearchParams({
    response_type: "code",
    client_id: FITBIT_CLIENT_ID,
    redirect_uri: FITBIT_REDIRECT_URI,
    scope: SCOPES,
    state,
  });

  const authUrl = `${FITBIT_AUTH_URL}?${params.toString()}`;
  res.redirect(302, authUrl);
}
