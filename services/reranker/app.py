import os
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

try:
    from FlagEmbedding import FlagReranker
except ImportError as exc:
    raise RuntimeError("FlagEmbedding is required for the reranker service") from exc


DEFAULT_MODEL = "BAAI/bge-reranker-v2-m3"


class RerankRequest(BaseModel):
    query: str = Field(min_length=1)
    documents: list[str] | None = None
    pairs: list[tuple[str, str]] | None = None
    model: str | None = None


class RerankResult(BaseModel):
    index: int
    relevance_score: float


class RerankResponse(BaseModel):
    model: str
    scores: list[float]
    results: list[RerankResult]


def configured_model() -> str:
    return os.getenv("RERANKER_MODEL", DEFAULT_MODEL)


def load_reranker() -> FlagReranker:
    model = configured_model()
    device = os.getenv("RERANKER_DEVICE", "cpu")
    use_fp16 = device != "cpu"
    try:
        return FlagReranker(model, use_fp16=use_fp16, devices=[device])
    except TypeError:
        return FlagReranker(model, use_fp16=use_fp16)


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.reranker = load_reranker()
    yield


app = FastAPI(lifespan=lifespan)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "model": configured_model()}


@app.post("/rerank", response_model=RerankResponse)
def rerank(payload: RerankRequest) -> dict[str, Any]:
    if payload.model and payload.model != configured_model():
        raise HTTPException(status_code=400, detail="Requested model is not loaded")

    pairs = payload.pairs
    if pairs is None:
        if not payload.documents:
            raise HTTPException(status_code=400, detail="documents or pairs are required")
        pairs = [(payload.query, document) for document in payload.documents]

    if len(pairs) == 0:
        return {"model": configured_model(), "scores": [], "results": []}

    try:
        scores = app.state.reranker.compute_score(pairs, normalize=True)
    except TypeError:
        scores = app.state.reranker.compute_score(pairs)
    if not isinstance(scores, list):
        scores = [float(scores)]

    numeric_scores = [float(score) for score in scores]
    results = [
        {"index": index, "relevance_score": score}
        for index, score in sorted(
            enumerate(numeric_scores),
            key=lambda item: item[1],
            reverse=True,
        )
    ]

    return {
        "model": configured_model(),
        "scores": numeric_scores,
        "results": results,
    }
