from datetime import datetime, timezone
from time import perf_counter

import dns.resolver
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from backend.app.collectors.dns.collector import (
    measure_dns,
    SUPPORTED_RECORD_TYPES,
    DNS_RESOLVERS,
)

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
        
@app.get("/api/dns/measure/{domain}")
def dns_intelligence(
    domain: str,
    record_types: str = Query(default="A,AAAA"),
    resolver: str = Query(default="cloudflare"),
):
    domain = domain.strip().rstrip(".")

    if (
        not domain
        or len(domain) > 253
        or any(char.isspace() for char in domain)
        or "/" in domain
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid domain name",
        )

    if resolver not in DNS_RESOLVERS:
        raise HTTPException(
            status_code=400,
            detail="Unsupported DNS resolver",
        )

    requested_types = [
        item.strip().upper()
        for item in record_types.split(",")
        if item.strip()
    ]

    if not requested_types or len(requested_types) > len(SUPPORTED_RECORD_TYPES):
        raise HTTPException(
            status_code=400,
            detail="Invalid record type selection",
        )

    if len(set(requested_types)) != len(requested_types):
        raise HTTPException(
            status_code=400,
            detail="Duplicate record types are not allowed",
        )

    results = []

    for record_type in requested_types:
        if record_type not in SUPPORTED_RECORD_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported record type: {record_type}",
            )

        results.append(
            measure_dns(domain, record_type, resolver)
        )

    return {
        "domain": domain,
        "resolver": resolver,
        "results": results,
    }        