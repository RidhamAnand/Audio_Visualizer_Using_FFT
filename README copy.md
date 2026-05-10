# SonicLab 🎛️

> **Real-time audio analysis and visualization platform** — full-stack, production-hardened, horizontally scalable.

SonicLab captures live audio from the browser, runs DSP analysis in-process, ships metrics to a FastAPI backend, persists session history to Postgres, and renders five distinct visualizer modes on a canvas render loop — all behind a stateless, JWT-secured API layer that scales horizontally behind NGINX.

---

## Table of Contents

- [Architecture](#architecture)
- [Scalability Design](#scalability-design)
- [NGINX Load Balancing](#nginx-load-balancing)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Data Model](#data-model)
- [Core API](#core-api)
- [Auth Flow](#auth-flow)
- [Audio Analysis Pipeline](#audio-analysis-pipeline)
- [Observability](#observability)
- [Local Development](#local-development)
- [Security Notes](#security-notes)
- [Roadmap](#roadmap)

---

## Architecture

```
                        ┌──────────────────────────────────────────────┐
                        │                  CLIENT TIER                  │
                        │          Next.js 14 · React 18 · Zustand     │
                        │   Canvas Visualizer · Typed REST API Client  │
                        └───────────────────┬──────────────────────────┘
                                            │ HTTPS
                        ┌───────────────────▼──────────────────────────┐
                        │               NGINX REVERSE PROXY             │
                        │   SSL Termination · Load Balancing (RR/LC)   │
                        │   Rate Limiting · Gzip · Static Asset Cache  │
                        └───┬────────────┬────────────┬────────────────┘
                            │            │            │
               ┌────────────▼──┐  ┌──────▼──────┐  ┌▼────────────────┐
               │  FastAPI (1)  │  │ FastAPI (2) │  │   FastAPI (N)   │
               │  :8000        │  │  :8001      │  │    :800N        │
               └────────┬──────┘  └──────┬──────┘  └────────┬────────┘
                        │                │                   │
          ┌─────────────▼────────────────▼───────────────────▼──────────┐
          │                        DATA TIER                             │
          │                                                              │
          │  ┌──────────────────┐        ┌──────────────────────────┐   │
          │  │  Postgres 16     │        │         Redis            │   │
          │  │  Primary (RW)    │        │  Refresh Token Store     │   │
          │  │  ┌────────────┐  │        │  Settings Cache (TTL)    │   │
          │  │  │ Replica 1  │  │        │  Session Cache (TTL)     │   │
          │  │  │ Replica 2  │  │        └──────────────────────────┘   │
          │  │  └────────────┘  │                                        │
          │  └──────────────────┘                                        │
          └──────────────────────────────────────────────────────────────┘
                        │
          ┌─────────────▼──────────────────┐
          │        OBSERVABILITY           │
          │  Prometheus (/metrics scrape)  │
          │  Grafana (pre-provisioned)     │
          └────────────────────────────────┘
```

---

## Scalability Design

SonicLab is engineered from the ground up for horizontal scale. Every architectural decision is motivated by a specific read/write or latency concern.

### Stateless API Layer

FastAPI instances hold **zero in-process state**. All state lives in Postgres or Redis:

- JWT access tokens are verified by signature alone — no DB lookup per request.
- Refresh token JTIs are stored in Redis (not Postgres) to support O(1) revocation lookups and avoid write amplification on the primary DB.
- Any FastAPI container can handle any request at any time. NGINX can add or remove upstream nodes with a reload, no drain logic needed.

### Read/Write Separation

Dashboard traffic is dominated by `GET /sessions` and `GET /settings` — both read-heavy, cacheable, and replica-friendly:

| Operation | Volume | Route |
|---|---|---|
| `GET /settings` | Very high | Redis cache → Postgres replica |
| `GET /sessions` | High | Redis cache → Postgres replica |
| `GET /sessions/stats` | Medium | Postgres replica |
| `POST /sessions` | Medium | Postgres primary |
| `POST /auth/login` | Low | Postgres primary + Redis |

Postgres read replicas absorb the SELECT load. Writes (session ingestion, auth mutations) are routed to the primary. Short TTL Redis caches (~60s for settings, ~30s for recent sessions) absorb intra-request-window spikes without stale data risk.

### Cache Strategy (Redis)

```
Key pattern:         user:{user_id}:settings       TTL: 60s
Key pattern:         user:{user_id}:sessions:page:{n}  TTL: 30s
Key pattern:         refresh:{jti}                 TTL: refresh token lifetime
```

Cache invalidation is write-through: `PUT /settings` writes to Postgres then deletes the Redis key. Session POSTs append-only, so the cache key is page-scoped and expires naturally.

### NGINX Load Balancing

See [NGINX Load Balancing](#nginx-load-balancing) below.

### Metrics Pipeline Isolation

Prometheus scrapes `/metrics` via pull model. The scrape is entirely decoupled from the request path — high-cardinality metric exports never add latency to API responses. Grafana dashboards query Prometheus, not Postgres, keeping analytics traffic off the DB.

---

## NGINX Load Balancing

NGINX sits in front of all FastAPI replicas. It handles:

- **SSL termination** — TLS offloaded at the edge; upstream connections are plain HTTP.
- **Load balancing** — Round-robin by default; switch to `least_conn` under bursty workloads.
- **Rate limiting** — Per-IP and per-endpoint zones protect auth routes.
- **Gzip compression** — JSON payloads compressed before hitting the wire.
- **Static asset caching** — Next.js build output served with aggressive cache headers.
- **Health-check-based routing** — Unhealthy upstreams removed from rotation automatically.

### `nginx/nginx.conf` (annotated)

```nginx
worker_processes auto;                     # one worker per CPU core

events {
    worker_connections 4096;               # max simultaneous connections per worker
    use epoll;                             # Linux async I/O (highest throughput)
    multi_accept on;
}

http {
    # ─── upstream pool ───────────────────────────────────────────────────────
    upstream soniclab_api {
        least_conn;                        # route to replica with fewest active connections
        keepalive 64;                      # reuse TCP connections to upstreams

        server backend_1:8000 max_fails=3 fail_timeout=30s;
        server backend_2:8000 max_fails=3 fail_timeout=30s;
        server backend_3:8000 max_fails=3 fail_timeout=30s;
        # add more replicas here; NGINX reloads config without dropping connections
    }

    # ─── rate limiting zones ─────────────────────────────────────────────────
    limit_req_zone $binary_remote_addr zone=auth_zone:10m rate=10r/m;
    limit_req_zone $binary_remote_addr zone=api_zone:10m  rate=200r/m;

    # ─── gzip ────────────────────────────────────────────────────────────────
    gzip on;
    gzip_types application/json text/plain text/css application/javascript;
    gzip_min_length 1024;
    gzip_comp_level 5;

    # ─── main server block ───────────────────────────────────────────────────
    server {
        listen 443 ssl http2;
        server_name soniclab.example.com;

        ssl_certificate     /etc/nginx/certs/fullchain.pem;
        ssl_certificate_key /etc/nginx/certs/privkey.pem;
        ssl_protocols       TLSv1.2 TLSv1.3;
        ssl_ciphers         HIGH:!aNULL:!MD5;

        # ── auth endpoints: strict rate limit ──
        location ~ ^/auth/ {
            limit_req zone=auth_zone burst=5 nodelay;
            proxy_pass         http://soniclab_api;
            proxy_http_version 1.1;
            proxy_set_header   Connection "";
            proxy_set_header   Host              $host;
            proxy_set_header   X-Real-IP         $remote_addr;
            proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
            proxy_set_header   X-Forwarded-Proto $scheme;
        }

        # ── api endpoints: standard rate limit ──
        location /api/ {
            limit_req zone=api_zone burst=50 nodelay;
            proxy_pass         http://soniclab_api;
            proxy_http_version 1.1;
            proxy_set_header   Connection "";
            proxy_set_header   Host              $host;
            proxy_set_header   X-Real-IP         $remote_addr;
            proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
            proxy_set_header   X-Forwarded-Proto $scheme;
            proxy_read_timeout 60s;
        }

        # ── metrics: internal only (Prometheus network) ──
        location /metrics {
            allow 10.0.0.0/8;              # Prometheus scraper subnet
            deny  all;
            proxy_pass http://soniclab_api;
        }

        # ── Next.js static assets: aggressive cache ──
        location /_next/static/ {
            alias  /var/www/soniclab/_next/static/;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # ── health check: no logging ──
        location /health {
            proxy_pass http://soniclab_api;
            access_log off;
        }
    }

    # HTTP → HTTPS redirect
    server {
        listen 80;
        server_name soniclab.example.com;
        return 301 https://$host$request_uri;
    }
}
```

### Scaling backend replicas with Docker Compose

```bash
# spin up 4 FastAPI replicas behind NGINX
docker compose up -d --scale backend=4 --build

# NGINX reload picks up new upstreams without dropping connections
docker compose exec nginx nginx -s reload
```

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | Next.js 14, React 18 | SSR, file-based routing, image optimization |
| State | Zustand | Lightweight, no boilerplate, HUD-friendly |
| Styling | Tailwind CSS | Utility-first, no runtime CSS-in-JS |
| Backend | FastAPI | Async-native, OpenAPI out of the box, fast |
| ORM | SQLAlchemy (async) + Alembic | Non-blocking DB I/O, schema migrations |
| Auth | JWT (access + refresh) | Stateless API, Redis-revocable refresh |
| Cache | Redis | Sub-millisecond reads, native TTL, pub/sub capable |
| Database | Postgres 16 | JSONB, window functions, reliable at scale |
| Reverse proxy | NGINX | Proven load balancer, SSL termination, rate limiting |
| Observability | Prometheus + Grafana | Pull-based scrape, zero latency impact |
| Infra | Docker Compose | Local parity with production topology |

---

## Project Structure

```
soniclab/
├── backend/
│   ├── app/
│   │   ├── main.py               # FastAPI app init, middleware, CORS
│   │   ├── auth/
│   │   │   ├── router.py         # /auth/* endpoints
│   │   │   ├── jwt.py            # token creation, validation
│   │   │   └── redis_store.py    # refresh token JTI management
│   │   ├── sessions/
│   │   │   ├── router.py         # /sessions/* endpoints
│   │   │   └── dsp.py            # BPM, centroid, ZCR, peak extraction
│   │   ├── settings/
│   │   │   └── router.py         # /settings GET/PUT
│   │   ├── models.py             # SQLAlchemy async models
│   │   ├── database.py           # async engine, session factory
│   │   ├── cache.py              # Redis client, get/set/invalidate helpers
│   │   └── metrics.py            # Prometheus counters and gauges
│   ├── migrations/               # Alembic migration history
│   └── Dockerfile
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx              # Landing page
│   │   ├── auth/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   └── dashboard/
│   │       ├── page.tsx          # Main dashboard
│   │       └── visualizer/
│   │           ├── Spectrogram.tsx
│   │           ├── SpectrumBars.tsx
│   │           ├── Chromagram.tsx
│   │           ├── Constellation.tsx
│   │           └── FFTGraph.tsx
│   ├── store/
│   │   └── useAudioStore.ts      # Zustand store for HUD metrics
│   ├── lib/
│   │   └── api.ts                # Typed REST client
│   └── Dockerfile
│
├── nginx/
│   ├── nginx.conf                # Upstream pool, rate limits, SSL
│   └── certs/                    # TLS certs (mount in production)
│
├── infra/
│   ├── prometheus/
│   │   └── prometheus.yml        # Scrape config, targets
│   └── grafana/
│       ├── provisioning/
│       │   ├── datasources/
│       │   └── dashboards/
│       └── dashboards/
│           └── soniclab.json     # Pre-built dashboard JSON
│
├── docker-compose.yml
└── README.md
```

---

## Data Model

### `users`

```sql
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at    TIMESTAMPTZ DEFAULT now()
);
```

### `user_settings`

```sql
CREATE TABLE user_settings (
    user_id        UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    preferred_mode TEXT DEFAULT 'spectrogram',
    color_theme    TEXT DEFAULT 'dark',
    updated_at     TIMESTAMPTZ DEFAULT now()
);
```

### `sessions`

```sql
CREATE TABLE sessions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID REFERENCES users(id) ON DELETE CASCADE,
    mode             TEXT NOT NULL,
    audio_type       TEXT,
    bpm              FLOAT,
    peak_count       INT,
    duration_seconds FLOAT,
    mood             TEXT,
    started_at       TIMESTAMPTZ DEFAULT now(),
    notes            TEXT
);

-- Indexes for read-heavy dashboard queries
CREATE INDEX idx_sessions_user_started ON sessions(user_id, started_at DESC);
CREATE INDEX idx_sessions_mood ON sessions(mood);
```

---

## Core API

All endpoints except `/auth/register` and `/auth/login` require `Authorization: Bearer <access_token>`.

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/register` | Create account, returns tokens |
| `POST` | `/auth/login` | Authenticate, returns access + refresh tokens |
| `POST` | `/auth/refresh` | Rotate refresh token, returns new access token |
| `POST` | `/auth/logout` | Revoke refresh token JTI from Redis |
| `GET` | `/auth/me` | Authenticated user profile |
| `GET` | `/settings` | Fetch user settings (Redis-cached) |
| `PUT` | `/settings` | Update settings (write-through cache invalidation) |
| `POST` | `/sessions` | Persist audio analysis session |
| `GET` | `/sessions` | Paginated session history |
| `GET` | `/sessions/stats` | Aggregate stats: total sessions, avg BPM, mood distribution |
| `GET` | `/health` | Liveness check, returns `{"status": "ok"}` |
| `GET` | `/metrics` | Prometheus scrape endpoint |

### Example: `POST /sessions` payload

```json
{
  "mode": "spectrogram",
  "audio_type": "music",
  "bpm": 128.4,
  "peak_count": 34,
  "duration_seconds": 47.2,
  "mood": "energetic",
  "notes": "live set recording"
}
```

---

## Auth Flow

```
Client                       FastAPI                    Redis          Postgres
  │                             │                          │               │
  │─── POST /auth/login ───────►│                          │               │
  │                             │──── SELECT user ────────────────────────►│
  │                             │◄─── bcrypt verify ──────────────────────►│
  │                             │                          │               │
  │                             │── SET refresh:{jti} ───►│ (TTL = 7d)    │
  │                             │                          │               │
  │◄── {access_token, refresh_token} ───────────────────── │               │
  │                             │                          │               │
  │─── POST /auth/refresh ─────►│                          │               │
  │   (refresh token in body)   │── EXISTS refresh:{jti} ►│               │
  │                             │◄── 1 (valid) ───────────│               │
  │                             │── DEL refresh:{jti} ────►│               │
  │                             │── SET refresh:{new_jti}►│               │
  │◄── {new_access_token} ──────│                          │               │
  │                             │                          │               │
  │─── POST /auth/logout ──────►│                          │               │
  │                             │── DEL refresh:{jti} ────►│               │
  │◄── 204 No Content ──────────│                          │               │
```

Access tokens are short-lived (15 min). Refresh tokens live in Redis with a 7-day TTL. Revocation is O(1): `DEL` the JTI key. No DB scan required.

---

## Audio Analysis Pipeline

```
Browser
  │
  ├── navigator.mediaDevices.getUserMedia({ audio: true })
  │
  ├── AudioContext
  │   ├── MediaStreamSourceNode  ← raw mic stream
  │   ├── AnalyserNode           ← FFT (fftSize: 2048, smoothingTimeConstant: 0.8)
  │   └── requestAnimationFrame render loop
  │       ├── getByteFrequencyData()   → SpectrumBars, Spectrogram, FFTGraph
  │       ├── getByteTimeDomainData()  → Constellation, ZCR
  │       └── Chromagram (chroma bin mapping from frequency data)
  │
  ├── DSP metrics extracted per frame:
  │   ├── BPM          — onset detection via energy flux
  │   ├── Spectral centroid — weighted mean of frequency bins
  │   ├── Zero-crossing rate — sign changes per buffer
  │   ├── Peak count   — local maxima above threshold
  │   ├── Dominant note — argmax of chroma vector → pitch class
  │   └── Mood         — rule-based classifier over {BPM, centroid, ZCR}
  │
  └── On session end → POST /sessions with aggregated metrics
```

All DSP runs client-side in the browser's audio worklet thread. The backend receives aggregated session metadata only — not raw audio or frame-level data.

---

## Observability

### Prometheus metrics exposed at `/metrics`

| Metric | Type | Description |
|---|---|---|
| `soniclab_active_users` | Gauge | Currently active authenticated sessions |
| `soniclab_analysis_events_total` | Counter | Cumulative audio analysis events |
| `soniclab_http_requests_total` | Counter | HTTP requests by method, path, status |
| `soniclab_http_request_duration_seconds` | Histogram | Request latency distribution |
| `soniclab_sessions_created_total` | Counter | Sessions persisted, labelled by mood |

### Grafana

Dashboards are pre-provisioned from `infra/grafana/provisioning/`. No manual setup. Navigate to `http://localhost:3001` (default: `admin` / `admin`) and the SonicLab dashboard is already wired to the Prometheus datasource.

Panels include: request rate, error rate, p50/p95/p99 latency, active users over time, session volume by mood, top audio types.

---

## Local Development

### Prerequisites

- Docker Desktop (with Compose v2)

### Start full stack

```bash
docker compose up -d --build
```

### Scale backend replicas locally

```bash
docker compose up -d --scale backend=3
```

### Service URLs

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API (via NGINX) | http://localhost:80 |
| Backend direct (replica 1) | http://localhost:8000 |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3001 |

### Run Alembic migrations manually

```bash
docker compose exec backend alembic upgrade head
```

### Environment variables

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | Async Postgres DSN | `postgresql+asyncpg://...` |
| `REDIS_URL` | Redis connection string | `redis://redis:6379` |
| `JWT_SECRET` | HMAC signing secret | *(required)* |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token TTL | `15` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token TTL | `7` |
| `CORS_ORIGINS` | Allowed frontend origins | `http://localhost:3000` |

---

## Security Notes

- **Password hashing** — bcrypt via passlib with default cost factor (12). Timing-safe comparison.
- **JWT** — HS256-signed access tokens (15 min). Refresh tokens carry a `jti` UUID stored in Redis, enabling instant revocation without a DB scan.
- **Cookies** — `httpOnly`, `sameSite=lax`. Flip `secure=true` in production (HTTPS only).
- **Rate limiting** — NGINX enforces per-IP rate limits at the proxy layer: 10 req/min on `/auth/*`, 200 req/min on `/api/*`. Burst allowances configured for UX.
- **Metrics endpoint** — `/metrics` is allowlisted to the internal Prometheus scraper subnet only (NGINX `allow`/`deny` directives). Not exposed to the public internet.
- **CORS** — FastAPI CORS middleware restricts `Access-Control-Allow-Origin` to configured `CORS_ORIGINS`. Wildcard is disabled by default.

---

## Roadmap

- [ ] WebSocket streaming for live per-frame DSP metrics to the dashboard
- [ ] Multi-tenant teams with shared dashboards and RBAC
- [ ] CSV/JSON session export
- [ ] Postgres read replica auto-routing via SQLAlchemy engine strategy
- [ ] Redis Cluster support for cache tier HA
- [ ] k8s Helm chart with HPA on CPU/RPS metrics
- [ ] Audio fingerprinting and track identification
- [ ] Mobile PWA support (offline visualizer mode)

---

<p align="center">Built with FastAPI · Next.js · Postgres · Redis · NGINX · Prometheus</p>
