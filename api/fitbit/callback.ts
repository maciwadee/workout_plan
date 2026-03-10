/**
 * Fitbit OAuth2 callback: exchange code for tokens, then redirect to app with tokens in hash.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";

// Local config (override with env vars if set)
const FITBIT_CLIENT_ID = process.env.FITBIT_CLIENT_ID ?? "23V3MR";
const FITBIT_CLIENT_SECRET = process.env.FITBIT_CLIENT_SECRET ?? "YOUR_FITBIT_CLIENT_SECRET";
const FITBIT_REDIRECT_URI = process.env.FITBIT_REDIRECT_URI ?? "https://workout-plan-bin.vercel.app/api/fitbit/callback";
const FITBIT_APP_URL = process.env.FITBIT_APP_URL ?? "https://workout-plan-bin.vercel.app";

const FITBIT_TOKEN_URL = "https://api.fitbit.com/oauth2/token";

interface FitbitTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope?: string;
  user_id?: string;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { code, state, error: fitbitError } = req.query;

  if (fitbitError) {
    res.redirect(302, `${FITBIT_APP_URL}#fitbit_error=${encodeURIComponent(String(fitbitError))}`);
    return;
  }

  if (!code || typeof code !== "string") {
    res.redirect(302, `${FITBIT_APP_URL}#fitbit_error=missing_code`);
    return;
  }

  if (!FITBIT_CLIENT_ID || !FITBIT_CLIENT_SECRET || !FITBIT_REDIRECT_URI) {
    res.status(500).json({
      error: "Missing Fitbit config: FITBIT_CLIENT_ID, FITBIT_CLIENT_SECRET, or FITBIT_REDIRECT_URI",
    });
    return;
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: FITBIT_CLIENT_ID,
    redirect_uri: FITBIT_REDIRECT_URI,
    code,
  }).toString();

  const basicAuth = Buffer.from(`${FITBIT_CLIENT_ID}:${FITBIT_CLIENT_SECRET}`).toString("base64");

  try {
    const tokenRes = await fetch(FITBIT_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basicAuth}`,
      },
      body,
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("Fitbit token error", tokenRes.status, errText);
      res.redirect(302, `${FITBIT_APP_URL}#fitbit_error=token_failed`);
      return;
    }

    const data = (await tokenRes.json()) as FitbitTokenResponse;
    const hash = new URLSearchParams({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: String(data.expires_in),
      token_type: data.token_type || "Bearer",
    }).toString();

    res.redirect(302, `${FITBIT_APP_URL}#${hash}`);
  } catch (err) {
    console.error("Fitbit callback error", err);
    res.redirect(302, `${FITBIT_APP_URL}#fitbit_error=exchange_failed`);
  }
}
