from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.metrics import metrics_middleware, metrics_response
from app.redis_client import redis
from app.routes import auth, sessions, settings as user_settings


@asynccontextmanager
async def lifespan(_: FastAPI):
    await redis.ping()
    yield
    await redis.aclose()


app = FastAPI(title=settings.APP_NAME, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.middleware("http")(metrics_middleware)

app.include_router(auth.router)
app.include_router(sessions.router)
app.include_router(user_settings.router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/metrics")
async def metrics():
    return metrics_response()
