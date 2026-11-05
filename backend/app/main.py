from datetime import datetime, timezone
from time import perf_counter

import dns.resolver
from fastapi import FastAPI, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session


from backend.app.database import get_db
from backend.app.collectors.dns.collector import (
    measure_dns,
    SUPPORTED_RECORD_TYPES,
    DNS_RESOLVERS,
)
from backend.app.models.dns_measurement import DNSMeasurement
from backend.app.collectors.network.latency import measure_latency
from backend.app.models.network_measurement import NetworkMeasurement
from backend.app.api.targets import router as targets_router

app = FastAPI(
    title="Internet Health Monitor",
    description="Monitoring van de Nederlandse internetinfrastructuur",
    version="0.1.0",
)

app.include_router(targets_router)

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
    db: Session = Depends(get_db),
):
    domain = domain.strip().rstrip(".")

    if (
        not domain
        or len(domain) > 253
        or any(char.isspace() for char in domain)
        or "/" in domain
    ):
        raise HTTPException(status_code=400, detail="Invalid domain name")

    if resolver not in DNS_RESOLVERS:
        raise HTTPException(status_code=400, detail="Unsupported DNS resolver")

    requested_types = [
        item.strip().upper()
        for item in record_types.split(",")
        if item.strip()
    ]

    if (
        not requested_types
        or len(requested_types) > len(SUPPORTED_RECORD_TYPES)
        or len(set(requested_types)) != len(requested_types)
    ):
        raise HTTPException(status_code=400, detail="Invalid record type selection")

    for record_type in requested_types:
        if record_type not in SUPPORTED_RECORD_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported record type: {record_type}",
            )

    results = []

    try:
        for record_type in requested_types:
            result = measure_dns(domain, record_type, resolver)

            measurement = DNSMeasurement(
                domain=result["domain"],
                record_type=result["record_type"],
                resolver=result["resolver"],
                resolver_ip=result["resolver_ip"],
                answers=result["answers"],
                response_time_ms=result["response_time_ms"],
                status=result["status"],
                error=result.get("error"),
                dnssec_ad_flag=result["dnssec_ad_flag"],
                timestamp=datetime.fromisoformat(result["timestamp"]),
            )

            db.add(measurement)
            results.append(result)

        db.commit()

    except Exception:
        db.rollback()
        raise

    return {
        "domain": domain,
        "resolver": resolver,
        "results": results,
        "stored_measurements": len(results),
    }

@app.post("/api/network/latency/{target}")
def network_latency(
    target: str,
    count: int = Query(default=5, ge=1, le=20),
    timeout: int = Query(default=2, ge=1, le=10),
    db: Session = Depends(get_db),
):
    try:
        # Perform the latency measurement
        result = measure_latency(
            target=target,
            count=count,
            timeout=timeout,
        )

        # Save the measurement in PostgreSQL
        measurement = NetworkMeasurement(
            target=result["target"],
            status=result["status"],
            packets_transmitted=result.get("packets_transmitted"),
            packets_received=result.get("packets_received"),
            packet_loss_percent=result.get("packet_loss_percent"),
            latency_min_ms=result.get("latency_min_ms"),
            latency_avg_ms=result.get("latency_avg_ms"),
            latency_max_ms=result.get("latency_max_ms"),
            jitter_ms=result.get("jitter_ms"),
            samples_ms=result.get("samples_ms", []),
            error=result.get("error"),
            timestamp=datetime.fromisoformat(result["timestamp"]),
        )

        db.add(measurement)
        db.commit()
        db.refresh(measurement)

        # Include the database ID in the response
        result["id"] = measurement.id

        return result

    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))

    except RuntimeError as error:
        raise HTTPException(status_code=500, detail=str(error))

    except Exception:
        db.rollback()
        raise

@app.get("/api/network/history/{target}")
def network_history(
    target: str,
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    measurements = (
        db.query(NetworkMeasurement)
        .filter(NetworkMeasurement.target == target)
        .order_by(NetworkMeasurement.timestamp.desc())
        .limit(limit)
        .all()
    )

    return [
        {
            "id": measurement.id,
            "target": measurement.target,
            "status": measurement.status,
            "packets_transmitted": measurement.packets_transmitted,
            "packets_received": measurement.packets_received,
            "packet_loss_percent": measurement.packet_loss_percent,
            "latency_min_ms": measurement.latency_min_ms,
            "latency_avg_ms": measurement.latency_avg_ms,
            "latency_max_ms": measurement.latency_max_ms,
            "jitter_ms": measurement.jitter_ms,
            "timestamp": measurement.timestamp,
        }
        for measurement in measurements
    ]
    
    