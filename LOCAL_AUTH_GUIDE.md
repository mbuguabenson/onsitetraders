# Local Development Authentication Guide

You can log in locally by using OAuth2 + PKCE with a localhost redirect URI that is registered.

## Step-by-Step Setup

1.  **Register your local redirect** in the [Deriv Dashboard](https://api.deriv.com/dashboard) (exact match is required).
    *   Example: `http://localhost:3000/callback` or `http://127.0.0.1:5173/auth`
2.  **Use that exact URL in BOTH places**:
    1.  `https://auth.deriv.com/oauth2/auth`
    2.  `https://auth.deriv.com/oauth2/token`
3.  **Build the Auth URL** with the following parameters:
    *   `response_type=code`
    *   `client_id=YOUR_CLIENT_ID`
    *   `redirect_uri=http://localhost:PORT/path`
    *   `scope=trade` (add `account_manage` only if you need account creation APIs)
    *   `state=RANDOM_STRING`
    *   `code_challenge=PKCE_CHALLENGE`
    *   `code_challenge_method=S256`
4.  **Store session data**:
    *   Store `code_verifier` and `state` before redirect (e.g., using `sessionStorage`).
5.  **Exchange the code**:
    *   Exchange the code on your local backend (same localhost origin or API server) using the original `code_verifier` and the exact same `redirect_uri`.

## After Obtaining an Access Token

1.  **Get account list**:
    *   `GET https://api.derivws.com/trading/v1/options/accounts`
    *   Headers: `Authorization: Bearer <TOKEN>`, `Deriv-App-ID: <APP_ID>`
2.  **Request OTP**:
    *   `POST https://api.derivws.com/trading/v1/options/accounts/{accountId}/otp`
3.  **Open Trading WebSocket**:
    *   Open the returned `otpUrl` WebSocket and send your trading messages (balance, proposal, buy, etc.).

## Common Local Issues to Avoid

*   **Redirect URI Mismatch**: Ensure the path or trailing slash matches exactly between the dashboard and your code.
*   **Protocol Mismatch**: Don't mix `HTTPS` in the dashboard with `HTTP` in the local code (or vice versa).
*   **Security Risk**: Avoid doing the token exchange directly in the browser; use a backend if possible.
*   **Wrong WebSocket**: Do not use the public WebSocket for authenticated actions; always use the `otpUrl` WebSocket.
