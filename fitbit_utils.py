"""
Standalone Fitbit OAuth helpers for local testing.

This mirrors the logic in:
- api/fitbit/auth.ts        (build authorize URL)
- api/fitbit/callback.ts    (exchange code for tokens)

You can run this file directly to verify that your client ID / secret
and redirect setup are working *before* wiring it back into the app.

Usage (manual flow):
1. python fitbit_utils.py
2. Open the printed Authorize URL in your browser.
3. Log in to Fitbit and approve.
4. Copy the ?code=... value from the redirect URL.
5. Paste the code back into the script when prompted.
"""

from __future__ import annotations

import os
import secrets
import sys
import typing as t
from urllib.parse import urlencode

import requests


# ---------------------------------------------------------------------------
# Configuration (kept local in this file for testing)
# You can override via environment variables if you prefer:
#   FITBIT_CLIENT_ID, FITBIT_CLIENT_SECRET, FITBIT_REDIRECT_URI, FITBIT_APP_URL
# ---------------------------------------------------------------------------

FITBIT_CLIENT_ID: str = os.getenv("FITBIT_CLIENT_ID", "23V3MR")
# IMPORTANT: replace this with your real secret OR set FITBIT_CLIENT_SECRET in env.
FITBIT_CLIENT_SECRET: str = os.getenv("FITBIT_CLIENT_SECRET", "YOUR_FITBIT_CLIENT_SECRET")
FITBIT_REDIRECT_URI: str = os.getenv(
    "FITBIT_REDIRECT_URI",
    "https://workout-plan-bin.vercel.app/api/fitbit/callback",
)
FITBIT_APP_URL: str = os.getenv(
    "FITBIT_APP_URL",
    "https://workout-plan-bin.vercel.app",
)

FITBIT_AUTH_URL = "https://www.fitbit.com/oauth2/authorize"
FITBIT_TOKEN_URL = "https://api.fitbit.com/oauth2/token"
SCOPES = "activity heartrate profile sleep"


class FitbitAuthError(RuntimeError):
    """Raised when Fitbit OAuth calls fail."""


def build_authorize_url(state: str | None = None) -> str:
    """
    Build the Fitbit OAuth2 authorize URL (same logic as api/fitbit/auth.ts).
    """
    if not FITBIT_CLIENT_ID or not FITBIT_REDIRECT_URI:
        raise FitbitAuthError("Missing FITBIT_CLIENT_ID or FITBIT_REDIRECT_URI")

    if state is None:
        state = secrets.token_urlsafe(16)

    params = {
        "response_type": "code",
        "client_id": FITBIT_CLIENT_ID,
        "redirect_uri": FITBIT_REDIRECT_URI,
        "scope": SCOPES,
        "state": state,
    }
    return f"{FITBIT_AUTH_URL}?{urlencode(params)}"


def exchange_code_for_tokens(code: str) -> dict:
    """
    Exchange an authorization code for access/refresh tokens
    (same as api/fitbit/callback.ts, but returned as JSON instead of redirect).
    """
    if not code:
        raise FitbitAuthError("Missing authorization code")

    if not FITBIT_CLIENT_ID or not FITBIT_CLIENT_SECRET or not FITBIT_REDIRECT_URI:
        raise FitbitAuthError(
            "Missing Fitbit config: FITBIT_CLIENT_ID, FITBIT_CLIENT_SECRET, or FITBIT_REDIRECT_URI"
        )

    data = {
        "grant_type": "authorization_code",
        "client_id": FITBIT_CLIENT_ID,
        "redirect_uri": FITBIT_REDIRECT_URI,
        "code": code,
    }

    basic_auth = requests.auth._basic_auth_str(FITBIT_CLIENT_ID, FITBIT_CLIENT_SECRET)

    resp = requests.post(
        FITBIT_TOKEN_URL,
        headers={
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": basic_auth,
        },
        data=data,
        timeout=20,
    )

    if not resp.ok:
        raise FitbitAuthError(
            f"Token request failed: {resp.status_code} {resp.text}"
        )

    return resp.json()


def main(argv: list[str] | None = None) -> int:
    """
    Simple CLI test:
    - Prints the authorize URL
    - Prompts for ?code=...
    - Exchanges code and prints token JSON
    """
    argv = argv or sys.argv[1:]

    print("Fitbit OAuth test")
    print("------------------")
    print(f"Client ID      : {FITBIT_CLIENT_ID}")
    print(f"Redirect URI   : {FITBIT_REDIRECT_URI}")
    print(f"App URL (front): {FITBIT_APP_URL}")
    print()

    if FITBIT_CLIENT_SECRET == "YOUR_FITBIT_CLIENT_SECRET":
        print(
            "WARNING: FITBIT_CLIENT_SECRET is still the placeholder.\n"
            "Set FITBIT_CLIENT_SECRET in your environment or edit fitbit_utils.py\n"
            "before running a real test.\n"
        )

    url = build_authorize_url()
    print("1) Open this URL in your browser and log in to Fitbit:")
    print(url)
    print()
    print("2) After you approve, you'll be redirected to your redirect URI.")
    print("   Copy the 'code' query parameter from that URL and paste it below.")
    print()

    code = input("Enter authorization code: ").strip()
    if not code:
        print("No code entered, exiting.")
        return 1

    try:
        tokens = exchange_code_for_tokens(code)
    except FitbitAuthError as e:
        print(f"Error exchanging code: {e}")
        return 1

    print("\nTokens received from Fitbit:")
    print(tokens)
    print("\nYou can now copy these into your app's storage or env vars for further testing.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

