FROM node:20-slim AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
# Example env files are for humans, not for `next build`. Nested `.env*` is not
# always matched by the root .dockerignore and would bake placeholders.
RUN rm -f .env .env.local .env.production .env.local.example .env.example

ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_SIGNUPS_ENABLED=false
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_SIGNUPS_ENABLED=$NEXT_PUBLIC_SIGNUPS_ENABLED

# Render forwards dashboard env as Docker build args. The README placeholder
# `https://<project-ref>.supabase.co` is not a valid URL and used to crash
# `next build`. Fail with a clear message instead.
RUN node -e "const u=process.env.NEXT_PUBLIC_SUPABASE_URL||''; process.exit(u.startsWith('http')&&!/[<>]/.test(u)&&!u.includes('project-ref')?0:1)" \
  || (echo "ERROR: NEXT_PUBLIC_SUPABASE_URL is missing or still the example placeholder." \
      && echo "On Render: Environment → set it to your real Project URL from Supabase → Settings → API" \
      && echo "e.g. https://abcdefghijk.supabase.co  (no angle brackets)" \
      && echo "Render passes env vars as Docker build args; NEXT_PUBLIC_* must be real at build time." \
      && exit 1)

RUN npm run build

FROM python:3.13-slim AS backend-builder

WORKDIR /app/backend

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

FROM python:3.13-slim AS runtime

RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y --no-install-recommends nodejs tini && \
    apt-get purge -y curl && apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/*

RUN useradd --create-home appuser

WORKDIR /app

COPY --from=backend-builder /usr/local/lib/python3.13/site-packages /usr/local/lib/python3.13/site-packages
COPY --from=backend-builder /usr/local/bin/uvicorn /usr/local/bin/uvicorn

COPY backend/app /app/backend/app

COPY --from=frontend-builder /app/frontend/.next/standalone /app/frontend
COPY --from=frontend-builder /app/frontend/.next/static /app/frontend/.next/static
COPY --from=frontend-builder /app/frontend/public /app/frontend/public

COPY scripts/container-entrypoint.sh /app/scripts/container-entrypoint.sh
RUN chmod +x /app/scripts/container-entrypoint.sh

ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_SIGNUPS_ENABLED=false
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_SIGNUPS_ENABLED=$NEXT_PUBLIC_SIGNUPS_ENABLED

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD python3 -c "import os,urllib.request,sys;bp=os.environ.get('BACKEND_PORT','8000');p=os.environ.get('FRONTEND_PORT') or (os.environ.get('PORT') if os.environ.get('PORT') not in (None,'','8000') else None) or '3000';r1=urllib.request.urlopen(f'http://127.0.0.1:{bp}/health');r2=urllib.request.urlopen(f'http://127.0.0.1:{p}');sys.exit(0 if r1.status==200 and r2.status==200 else 1)"

USER appuser

EXPOSE 3000

ENTRYPOINT ["tini", "--"]
CMD ["/app/scripts/container-entrypoint.sh"]
