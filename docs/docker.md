# Docker Deployment Guide

This guide covers building, running, and deploying the Basar AI container image.

## Overview

The application is packaged as a single Docker container containing:
- **Frontend**: Next.js 14 (App Router) with standalone output
- **Backend**: FastAPI on Python 3.13
- **Target Platform**: Bunny Magic container hosting

The container exposes port 3000 (frontend). The backend runs internally on localhost:8000 and is not accessible from outside the container.

## Prerequisites

- Docker installed (version 20.10+)
- Supabase project credentials
- Container registry access (for deployment)

## Build

```bash
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_... \
  --build-arg NEXT_PUBLIC_SIGNUPS_ENABLED=false \
  -t basarai:latest .
```

### Build Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL (baked into client JS) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase publishable key (baked into client JS) |
| `NEXT_PUBLIC_SIGNUPS_ENABLED` | No | Defaults to `false` (closed `/signup`). Pass `true` only for local/dev images. |

**Important**: Build arguments are inlined into the JavaScript bundle at build time. They cannot be changed at runtime for client-side code. For multiple environments, build separate images per environment.

`make build` / `make up` pass `NEXT_PUBLIC_SIGNUPS_ENABLED=false` unless you override `SIGNUPS_ENABLED=true`.

## Run

```bash
docker run -d \
  --name basarai \
  -p 3001:3000 \
  -e SUPABASE_URL=https://your-project.supabase.co \
  -e SUPABASE_SECRET_KEY=sb_secret_... \
  basarai:latest
```

The application is available at `http://localhost:3001`.

### Runtime Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SUPABASE_URL` | Yes | — | Supabase project URL |
| `SUPABASE_SECRET_KEY` | Yes | — | Server-side Supabase key (bypasses RLS) |
| `STORAGE_BUCKET` | No | `brand-assets` | Storage bucket name |
| `ADMIN_EMAILS` | No | (empty) | Comma-separated operator emails. Public demo: your operator email only. |
| `CORS_ORIGINS` | No | `http://localhost:3001,...` | Comma-separated allowed origins. Public demo: the live origin only. |
| `NEXT_SERVER_API_URL` | No | `http://127.0.0.1:8000` | Set by the entrypoint. Do not point this at a public URL. |
| `BACKEND_INTERNAL_URL` | No | `http://127.0.0.1:8000` | Same as above. Server-side fetches to FastAPI. |
| `BACKEND_HOST` | No | `127.0.0.1` | Loopback-only. Do not set `0.0.0.0` on a public host. |

**Security**: Never commit runtime secrets to version control. Use environment files or secret management systems.

## Verify

### Check Container Health

```bash
# Check health status
docker inspect --format='{{.State.Health.Status}}' basarai

# View detailed health check logs
docker inspect --format='{{json .State.Health}}' basarai | jq
```

### Test Backend Internally

The backend is not accessible from outside the container. Test from inside:

```bash
docker exec basarai python3 -c \
  "import urllib.request; print(urllib.request.urlopen('http://localhost:8000/health').read().decode())"
```

Expected output: `{"status":"healthy","timestamp":"..."}`

### View Logs

```bash
# All logs (both services interleaved)
docker logs -f basarai

# Recent logs

docker logs --tail 50 basarai
```

## Stop

```bash
# Graceful shutdown (sends SIGTERM)
docker stop basarai

# Remove stopped container
docker rm basarai
```

Graceful shutdown completes within 10 seconds. Both services receive termination signals and clean up properly.

## Bunny Magic Deployment

### 1. Push to Container Registry

```bash
# Tag for your registry
docker tag basarai:latest your-registry.com/basarai:latest

# Push
docker push your-registry.com/basarai:latest
```

### 2. Configure on Bunny Magic

1. Create a new container deployment
2. Set the image reference to your pushed image
3. Configure port: **3000**
4. Set environment variables:
   - `SUPABASE_URL` — **demo** project only (no personal/customer data)
   - `SUPABASE_SECRET_KEY`
   - `STORAGE_BUCKET` (optional, default `brand-assets`)
   - `ADMIN_EMAILS` — your operator email only
   - `CORS_ORIGINS` — live origin only, e.g. `https://your-host.example`
5. Do **not** set `NEXT_SERVER_API_URL` / `BACKEND_INTERNAL_URL` unless you must override. The entrypoint defaults both to `http://127.0.0.1:8000`.
6. Configure health check:
   - Endpoint: Internal (Docker HEALTHCHECK is used)
   - Start period: 40 seconds
7. Deploy

Bunny Magic handles HTTPS termination. The container serves HTTP only.

The image is built with `NEXT_PUBLIC_SIGNUPS_ENABLED=false`. `/signup` shows the closed-state card. Also disable new user signups in the Supabase Dashboard (Authentication → Providers → Email) so the frontend flag is not the only gate.

## Render

Render translates every dashboard env var into a Docker `ARG` during the image build. `NEXT_PUBLIC_*` values are baked into the Next.js bundle at that moment.

1. Connect the GitHub repo as a **Docker** web service. Port comes from `EXPOSE 3000` (or Render's `PORT`, as long as it is not `8000`).
2. Set environment variables to **real** Supabase credentials from Settings → API. Never paste `https://<project-ref>.supabase.co` — the angle brackets are not a valid URL and fail the frontend build.
3. Required:

   | Variable | When | Value |
   |----------|------|--------|
   | `NEXT_PUBLIC_SUPABASE_URL` | build + runtime | `https://abcdxyz.supabase.co` (your real project URL, no brackets) |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | build + runtime | publishable key |
   | `NEXT_PUBLIC_SIGNUPS_ENABLED` | build | `false` |
   | `SUPABASE_URL` | runtime | same project URL |
   | `SUPABASE_SECRET_KEY` | runtime | secret key |
   | `CORS_ORIGINS` | runtime | `https://your-service.onrender.com` |
   | `ADMIN_EMAILS` | runtime | your operator email |

4. Redeploy after changing `NEXT_PUBLIC_*` (a runtime-only edit is not enough).
5. Repo `render.yaml` lists these keys; fill the `sync: false` ones in the dashboard.

## Troubleshooting

### Missing Environment Variables

**Symptom**: Container exits immediately with error message.

**Cause**: Required environment variables not set.

**Solution**: The entrypoint script lists all missing variables. Set all required vars:
- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`

### Backend Fails to Start

**Symptom**: Container logs show "Backend failed to start within 30 seconds".

**Cause**: Backend cannot connect to Supabase.

**Solution**:
1. Verify `SUPABASE_URL` is accessible from the container
2. Check that `SUPABASE_SECRET_KEY` is valid
3. Ensure network connectivity to Supabase

### Frontend Build Fails

**Symptom**: Docker build fails during `npm run build`.

**Cause**: Missing or invalid `NEXT_PUBLIC_*` build arguments.

**Solution**: Ensure both build args are provided:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

### Container Marked Unhealthy

**Symptom**: `docker inspect` shows `unhealthy` status.

**Cause**: Health check failing for backend or frontend.

**Solution**:
1. Check logs: `docker logs basarai`
2. Verify backend health internally: `docker exec basarai python3 -c "..."`
3. Check frontend responds: `curl http://localhost:3000`
4. Both services must return HTTP 200 for healthy status

### Graceful Shutdown Timeout

**Symptom**: Container takes longer than 10 seconds to stop.

**Cause**: Process not responding to SIGTERM.

**Solution**: This is rare. If it occurs, the container will be force-killed after the timeout. Check logs for stuck processes.

## Architecture Notes

- **Backend binding**: `127.0.0.1:8000` (loopback only; the entrypoint sets this)
- **Frontend binding**: `0.0.0.0:3000` (publicly accessible, mapped to host port `3001` by default)
- **API proxy**: Next.js rewrites `/api/*` to `http://127.0.0.1:8000/*`; server fetches use `BACKEND_INTERNAL_URL` / `NEXT_SERVER_API_URL`
- **Process management**: `tini` as PID 1 + bash entrypoint script
- **Image size**: ~560MB (Python 3.13 slim + Node.js 20)
- **No secrets in layers**: Only `NEXT_PUBLIC_*` vars are in image (publishable keys)
- **JWT verification**: JWKS-based asymmetric verification (RS256/ES256) via Supabase JWKS endpoint
