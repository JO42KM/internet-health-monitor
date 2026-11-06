from datetime import datetime, timezone
from pathlib import Path

import yaml
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from backend.app.models.sidn_measurement import SIDNMeasurement


METRIC_CATEGORIES = {
    "rcode-volume",
    "traffic-volume",
    "traffic-sizes",
    "unique-sources",
}


def import_sidn_file(file_path: Path, db: Session) -> bool:
    """
    Import one SIDN RSSAC002 YAML file.

    Returns True if a new measurement was inserted,
    or False if it already existed.
    """

    with file_path.open("r", encoding="utf-8") as file:
        content = yaml.safe_load(file)

    if not isinstance(content, dict):
        raise ValueError("Invalid YAML structure")

    required_fields = {
        "version",
        "service",
        "metric",
        "start-period",
    }

    if not required_fields.issubset(content):
        raise ValueError("Missing required RSSAC002 fields")

    metric = content["metric"]

    if metric not in METRIC_CATEGORIES:
        raise ValueError(f"Unsupported metric: {metric}")

    start_period = datetime.fromisoformat(
        str(content["start-period"]).replace("Z", "+00:00")
    )

    if start_period.tzinfo is None:
        start_period = start_period.replace(tzinfo=timezone.utc)

    measurement_data = {
        key: value
        for key, value in content.items()
        if key not in {
            "version",
            "service",
            "metric",
            "start-period",
        }
    }

    statement = (
        insert(SIDNMeasurement)
        .values(
            service=content["service"],
            metric=metric,
            version=content["version"],
            start_period=start_period,
            data=measurement_data,
            source_file=str(file_path),
        )
        .on_conflict_do_nothing(
            constraint="uq_sidn_service_metric_period"
        )
    )

    result = db.execute(statement)

    return result.rowcount == 1


def import_sidn_directory(
    dataset_dir: Path,
    db: Session,
    batch_size: int = 250,
) -> dict:
    """
    Import all SIDN YAML files in a directory tree.

    Commits in batches and isolates individual file errors.
    """

    if not dataset_dir.is_dir():
        raise FileNotFoundError(
            f"SIDN dataset directory not found: {dataset_dir}"
        )

    if batch_size < 1:
        raise ValueError("Batch size must be at least 1")

    files = sorted(dataset_dir.rglob("*.yaml"))

    stats = {
        "total_files": len(files),
        "imported": 0,
        "skipped": 0,
        "errors": 0,
        "error_details": [],
    }

    for index, file_path in enumerate(files, start=1):
        try:
            # A savepoint prevents one bad file from undoing
            # successful imports earlier in the current batch.
            with db.begin_nested():
                inserted = import_sidn_file(file_path, db)

            if inserted:
                stats["imported"] += 1
            else:
                stats["skipped"] += 1

        except Exception as error:
            stats["errors"] += 1
            stats["error_details"].append({
                "file": str(file_path),
                "error": str(error),
            })

        if index % batch_size == 0:
            db.commit()
            print(
                f"Processed {index}/{stats['total_files']} files..."
            )

    # Save the final, possibly incomplete batch.
    db.commit()

    return stats