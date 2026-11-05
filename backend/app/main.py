from datetime import datetime, timezone
from time import perf_counter

import dns.resolver
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Internet Health Monitor",
    description="Monitoring van de Nederlandse internetinfrastructuur",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "project": "Internet Health Monitor",
        "status": "online",
        "version": "0.1.0",
    }


@app.get("/api/health")
def health():
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/api/dns/{domain}")
def measure_dns(domain: str):
    resolver = dns.resolver.Resolver()
    resolver.timeout = 3
    resolver.lifetime = 5

    start = perf_counter()

    try:
        answers = resolver.resolve(domain, "A")
        duration = (perf_counter() - start) * 1000

        return {
            "domain": domain,
            "record_type": "A",
            "answers": [answer.to_text() for answer in answers],
            "response_time_ms": round(duration, 2),
            "status": "success",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    except Exception as error:
        raise HTTPException(
            status_code=502,
            detail=f"DNS measurement failed: {str(error)}",
        )