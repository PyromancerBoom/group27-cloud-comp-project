from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import pings, lobbies, analytics, websocket

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


@app.get("/health")
async def health():
    return {"status": "ok"}
