# ECP secure-auth proxy Worker

This Worker is the transport layer for the IMAA Connect secure Cognito session
migration. It is intentionally separate from the existing social-preview
Worker and proxies only three same-origin browser routes:

| Browser path | Django path |
| --- | --- |
| `POST /_auth/session/establish` | `/api/auth/secure-session/establish/` |
| `POST /_auth/session/refresh` | `/api/auth/secure-session/refresh/` |
| `POST /_auth/session/logout` | `/api/auth/secure-session/logout/` |

Everything else returns 404 from this Worker. The intended Cloudflare route is:

```text
connect.imaa-institute.org/_auth/*
```

## Safety properties

- POST only; unknown paths and query-string variants are rejected.
- Requires exact `Origin: https://connect.imaa-institute.org`.
- Requires `X-ECP-Secure-Auth: 1`.
- Establish forwards the existing Cognito `Authorization` bearer token, but no
  cookies.
- Refresh/logout forward only `__Host-ecp_secure_session`; unrelated browser
  cookies are stripped.
- Browser-supplied `X-Forwarded-For` is never forwarded.
- `Set-Cookie` from Django is passed through unchanged.
- All responses are forced to `no-store` at browser/CDN levels.
- The Worker never logs request bodies, tokens, Authorization headers or
  cookies.
- Backend exceptions are converted to a generic 502 response.

## Defaults

The Worker has no secrets. These optional Worker variables can override its
production defaults:

```text
AUTH_BACKEND_ORIGIN=https://api.colligatus.com
AUTH_ALLOWED_ORIGIN=https://connect.imaa-institute.org
AUTH_COOKIE_NAME=__Host-ecp_secure_session
```

`AUTH_BACKEND_ORIGIN` must use HTTPS.

## Local static tests

The test file uses Node's built-in test runner and does not contact production:

```bash
node --test deploy/cloudflare-workers/ecp-secure-auth-proxy/index.test.js
```

It verifies strict routing, origin/header checks, header/cookie minimization,
`Set-Cookie` pass-through, no-store responses, feature-off 404 pass-through and
safe upstream failure handling.

## Deployment order

Do not add the production route just because this code exists in the repo.
Use this order later:

1. Review and test this Worker locally.
2. Ensure the secure-session backend code and migration are deployed with
   `SECURE_AUTH_SESSION_ENABLED=False`.
3. Configure the separate Cloudflare Worker `ecp-secure-auth-proxy`.
4. Bind only `connect.imaa-institute.org/_auth/*` to it.
5. Verify normal frontend, `/events/*`, `/public/*`, `/landing/*`, API,
   WebSockets, meetings and uploads are unaffected.
6. With secure auth still disabled, verify the three `/_auth/session/*` paths
   safely preserve the backend's unavailable/404 behavior.
7. Only after transport verification should the secure-session feature and
   frontend integration be tested in a controlled rollout.

Do not merge this Worker with the existing social-preview Worker.
