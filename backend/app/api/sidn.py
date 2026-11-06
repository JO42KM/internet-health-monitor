
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.sidn_measurement import SIDNMeasurement


router = APIRouter(
    prefix="/api/sidn",
    tags=["SIDN Labs"],
)


@router.get("/summary")
def sidn_summary(db: Session = Depends(get_db)):
    """Return an overview of the imported SIDN RSSAC002 dataset."""

    total_measurements = (
        db.query(func.count(SIDNMeasurement.id)).scalar()
    )

    metrics = (
        db.query(
            SIDNMeasurement.metric,
            func.count(SIDNMeasurement.id),
        )
        .group_by(SIDNMeasurement.metric)
        .order_by(SIDNMeasurement.metric)
        .all()
    )

    services = (
        db.query(
            SIDNMeasurement.service,
            func.count(SIDNMeasurement.id),
        )
        .group_by(SIDNMeasurement.service)
        .order_by(SIDNMeasurement.service)
        .all()
    )

    date_range = db.query(
        func.min(SIDNMeasurement.start_period),
        func.max(SIDNMeasurement.start_period),
    ).one()

    return {
        "total_measurements": total_measurements,
        "metrics": [
            {
                "name": metric,
                "count": count,
            }
            for metric, count in metrics
        ],
        "services": [
            {
                "name": service,
                "count": count,
            }
            for service, count in services
        ],
        "oldest_measurement": date_range[0],
        "newest_measurement": date_range[1],
    }
    
@router.get("/measurements")
def sidn_measurements(
    metric: str | None = None,
    service: str | None = None,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    limit: int = Query(default=100, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    """Retrieve SIDN measurements with optional filters."""

    query = db.query(SIDNMeasurement)

    if metric:
        query = query.filter(
            SIDNMeasurement.metric == metric
        )

    if service:
        query = query.filter(
            SIDNMeasurement.service == service
        )

    if start_date:
        query = query.filter(
            SIDNMeasurement.start_period >= start_date
        )

    if end_date:
        query = query.filter(
            SIDNMeasurement.start_period <= end_date
        )

    total = query.count()

    measurements = (
        query
        .order_by(SIDNMeasurement.start_period.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "results": [
            {
                "id": item.id,
                "service": item.service,
                "metric": item.metric,
                "version": item.version,
                "start_period": item.start_period,
                "data": item.data,
            }
            for item in measurements
        ],
    }