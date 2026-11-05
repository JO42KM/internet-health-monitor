from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
import ipaddress
import re

from backend.app.database import get_db
from backend.app.models.monitoring_target import MonitoringTarget


router = APIRouter(
    prefix="/api/targets",
    tags=["Monitoring Targets"],
)


# Request schemas

class TargetCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    target: str = Field(min_length=1, max_length=253)

    @field_validator("name", "target")
    @classmethod
    def strip_whitespace(cls, value: str) -> str:
        return value.strip()

    @field_validator("target")
    @classmethod
    def validate_target(cls, value: str) -> str:
        if not value:
            raise ValueError("Target cannot be empty")

        try:
            return str(ipaddress.ip_address(value))
        except ValueError:
            pass

        hostname = value.rstrip(".").lower()

        if len(hostname) > 253:
            raise ValueError("Hostname is too long")

        labels = hostname.split(".")

        if len(labels) < 2:
            raise ValueError("Enter a valid hostname or IP address")

        for label in labels:
            if not re.fullmatch(
                r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?",
                label,
            ):
                raise ValueError("Invalid hostname")

        return hostname


class TargetUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    target: str | None = Field(default=None, min_length=1, max_length=253)
    is_active: bool | None = None

    @field_validator("name", "target")
    @classmethod
    def strip_whitespace(cls, value: str | None) -> str | None:
        return value.strip() if value is not None else None

    @field_validator("target")
    @classmethod
    def validate_target(cls, value: str | None) -> str | None:
        if value is None:
            return None

        if not value:
            raise ValueError("Target cannot be empty")

        try:
            return str(ipaddress.ip_address(value))
        except ValueError:
            pass

        hostname = value.rstrip(".").lower()

        if len(hostname) > 253:
            raise ValueError("Hostname is too long")

        labels = hostname.split(".")

        if len(labels) < 2:
            raise ValueError("Enter a valid hostname or IP address")

        for label in labels:
            if not re.fullmatch(
                r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?",
                label,
            ):
                raise ValueError("Invalid hostname")

        return hostname


# GET: Retrieve all monitoring targets

@router.get("/")
def get_targets(db: Session = Depends(get_db)):
    targets = (
        db.query(MonitoringTarget)
        .order_by(MonitoringTarget.created_at.desc())
        .all()
    )

    return [
        {
            "id": item.id,
            "name": item.name,
            "target": item.target,
            "is_active": item.is_active,
            "created_at": item.created_at,
        }
        for item in targets
    ]


# POST: Add a monitoring target

@router.post("/", status_code=status.HTTP_201_CREATED)
def create_target(
    payload: TargetCreate,
    db: Session = Depends(get_db),
):
    existing = (
        db.query(MonitoringTarget)
        .filter(MonitoringTarget.target == payload.target)
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail="This monitoring target already exists",
        )

    target = MonitoringTarget(
        name=payload.name,
        target=payload.target,
        is_active=True,
    )

    db.add(target)

    try:
        db.commit()
        db.refresh(target)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="This monitoring target already exists",
        )

    return {
        "id": target.id,
        "name": target.name,
        "target": target.target,
        "is_active": target.is_active,
        "created_at": target.created_at,
    }


# PUT: Update a monitoring target

@router.put("/{target_id}")
def update_target(
    target_id: int,
    payload: TargetUpdate,
    db: Session = Depends(get_db),
):
    target = db.query(MonitoringTarget).filter(
        MonitoringTarget.id == target_id
    ).first()

    if not target:
        raise HTTPException(
            status_code=404,
            detail="Monitoring target not found",
        )

    updates = payload.model_dump(exclude_unset=True)

    for field, value in updates.items():
        if value is None:
            raise HTTPException(
                status_code=422,
                detail=f"{field} cannot be null",
            )
        setattr(target, field, value)

    try:
        db.commit()
        db.refresh(target)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="This monitoring target already exists",
        )

    return {
        "id": target.id,
        "name": target.name,
        "target": target.target,
        "is_active": target.is_active,
        "created_at": target.created_at,
    }


# DELETE: Remove a monitoring target

@router.delete("/{target_id}")
def delete_target(
    target_id: int,
    db: Session = Depends(get_db),
):
    target = db.query(MonitoringTarget).filter(
        MonitoringTarget.id == target_id
    ).first()

    if not target:
        raise HTTPException(
            status_code=404,
            detail="Monitoring target not found",
        )

    db.delete(target)
    db.commit()

    return {
        "message": "Monitoring target deleted successfully",
        "id": target_id,
    }