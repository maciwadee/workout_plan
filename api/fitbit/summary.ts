import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Fitbit daily summary proxy.
 *
 * Browser → /api/fitbit/summary?date=YYYY-MM-DD
 * Backend → Fitbit Web API (steps, sleep, resting HR) for that date.
 *
 * The browser must send the Fitbit access token in the Authorization header:
 *   Authorization: Bearer <access_token>
 */

interface DailySummaryResponse {
  date: string;
  steps?: number;
  sleepHours?: number;
  restingHeartRate?: number;
  hrvRmssd?: number;
  hrvDeepRmssd?: number;
  vo2Max?: number;
}

const FITBIT_API_BASE = "https://api.fitbit.com";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const date = typeof req.query.date === "string" ? req.query.date : undefined;
  if (!date) {
    res.status(400).json({ error: "missing_date" });
    return;
  }

  const authHeader = req.headers.authorization || req.headers.Authorization;
  const token =
    typeof authHeader === "string" && authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length).trim()
      : null;

  if (!token) {
    res.status(401).json({ error: "missing_access_token" });
    return;
  }

  const headers: HeadersInit = {
    Authorization: `Bearer ${token}`,
  };

  try {
    // Steps
    let steps: number | undefined;
    const stepsRes = await fetch(
      `${FITBIT_API_BASE}/1/user/-/activities/steps/date/${date}/1d.json`,
      { headers }
    );
    if (stepsRes.ok) {
      const json = await stepsRes.json();
      const arr = json?.["activities-steps"];
      if (Array.isArray(arr) && arr[0]?.value) {
        const v = parseInt(arr[0].value, 10);
        if (!Number.isNaN(v)) steps = v;
      }
    } else if (stepsRes.status === 401) {
      res.status(401).json({ error: "fitbit_unauthorized" });
      return;
    }

    // Sleep
    let sleepHours: number | undefined;
    const sleepRes = await fetch(
      `${FITBIT_API_BASE}/1.2/user/-/sleep/date/${date}.json`,
      { headers }
    );
    if (sleepRes.ok) {
      const json = await sleepRes.json();
      const records = json?.sleep;
      if (Array.isArray(records) && records.length > 0) {
        let totalMs = 0;
        records.forEach((r: any) => {
          totalMs += r.duration ?? 0;
        });
        if (totalMs > 0) sleepHours = totalMs / (1000 * 60 * 60);
      }
    } else if (sleepRes.status === 401) {
      res.status(401).json({ error: "fitbit_unauthorized" });
      return;
    }

    // Resting heart rate
    let restingHeartRate: number | undefined;
    const hrRes = await fetch(
      `${FITBIT_API_BASE}/1/user/-/activities/heart/date/${date}/1d.json`,
      { headers }
    );
    if (hrRes.ok) {
      const json = await hrRes.json();
      const arr = json?.["activities-heart"];
      if (Array.isArray(arr) && arr[0]?.value?.restingHeartRate != null) {
        const v = Number(arr[0].value.restingHeartRate);
        if (!Number.isNaN(v)) restingHeartRate = v;
      }
    } else if (hrRes.status === 401) {
      res.status(401).json({ error: "fitbit_unauthorized" });
      return;
    }

    // HRV (RMSSD) — try requested date, then previous day (sleep may be attributed to prior night)
    let hrvRmssd: number | undefined;
    let hrvDeepRmssd: number | undefined;
    const parseHrv = (json: any) => {
      const arr = json?.hrv;
      if (!Array.isArray(arr) || !arr[0]?.value) return;
      const val = arr[0].value;
      if (val.dailyRmssd != null) {
        const v = Number(val.dailyRmssd);
        if (!Number.isNaN(v)) hrvRmssd = v;
      }
      if (val.deepRmssd != null) {
        const v2 = Number(val.deepRmssd);
        if (!Number.isNaN(v2)) hrvDeepRmssd = v2;
      }
    };
    const hrvRes = await fetch(
      `${FITBIT_API_BASE}/1/user/-/hrv/date/${date}.json`,
      { headers }
    );
    if (hrvRes.ok) {
      const json = await hrvRes.json();
      parseHrv(json);
    } else if (hrvRes.status === 401) {
      res.status(401).json({ error: "fitbit_unauthorized" });
      return;
    }
    if (hrvRmssd == null && hrvDeepRmssd == null) {
      const prevDate = new Date(date + "T12:00:00Z");
      prevDate.setUTCDate(prevDate.getUTCDate() - 1);
      const dateStr = prevDate.toISOString().slice(0, 10);
      const hrvRes2 = await fetch(
        `${FITBIT_API_BASE}/1/user/-/hrv/date/${dateStr}.json`,
        { headers }
      );
      if (hrvRes2.ok) parseHrv(await hrvRes2.json());
    }

    // VO2 Max (Cardio Fitness Score) — use cardioscore endpoint and cardioScore response key
    let vo2Max: number | undefined;
    const vo2Res = await fetch(
      `${FITBIT_API_BASE}/1/user/-/cardioscore/date/${date}.json`,
      { headers }
    );
    if (vo2Res.ok) {
      const json = await vo2Res.json();
      const arr = json?.cardioScore;
      if (Array.isArray(arr) && arr[0]?.value) {
        const val = arr[0].value as { vo2Max?: string | number };
        const raw = val?.vo2Max;
        if (raw != null) {
          const str = String(raw);
          const num = str.includes("-") ? parseFloat(str) : Number(str);
          if (!Number.isNaN(num)) vo2Max = num;
        }
      }
    } else if (vo2Res.status === 401) {
      res.status(401).json({ error: "fitbit_unauthorized" });
      return;
    }

    const payload: DailySummaryResponse = {
      date,
      steps,
      sleepHours,
      restingHeartRate,
      hrvRmssd,
      hrvDeepRmssd,
      vo2Max,
    };

    res.status(200).json(payload);
  } catch (err) {
    console.error("Fitbit summary error", err);
    res.status(500).json({ error: "fitbit_summary_failed" });
  }
}
