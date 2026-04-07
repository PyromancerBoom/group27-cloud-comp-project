import asyncio
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import pings, lobbies, analytics, websocket
from app.services import cleanup
from app.dependencies import get_redis

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="Need A Sidekick", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(pings.router)
app.include_router(lobbies.router)
app.include_router(analytics.router)
app.include_router(websocket.router)



logger = logging.getLogger("uvicorn.error")

@app.on_event("startup")
async def _start_cleanup():
    logger.info("Startup: launching cleanup watcher task")
    app.state.cleanup_task = asyncio.create_task(
        cleanup.watch_expirations(get_redis())
    )

@app.on_event("shutdown")
async def _stop_cleanup():
    task = getattr(app.state, "cleanup_task", None)
    if task:
        logger.info("Shutdown: cancelling cleanup watcher task")
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            logger.info("Cleanup watcher task cancelled")



@app.get("/health")
async def health():
    return {"status": "ok"}
