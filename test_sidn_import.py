from pathlib import Path

from backend.app.collectors.sidn.importer import import_sidn_directory
from backend.app.database import SessionLocal


DATASET_DIR = Path("/tmp/nl-rssac002/nl-rssac002")


def main():
    print("=" * 55)
    print("SIDN RSSAC002 DATA IMPORT")
    print("=" * 55)

    with SessionLocal() as db:
        stats = import_sidn_directory(
            dataset_dir=DATASET_DIR,
            db=db,
            batch_size=250,
        )

    print("\nIMPORT COMPLETE")
    print("-" * 55)
    print(f"Total files:       {stats['total_files']}")
    print(f"New measurements: {stats['imported']}")
    print(f"Skipped duplicates: {stats['skipped']}")
    print(f"Errors:            {stats['errors']}")

    if stats["error_details"]:
        print("\nFirst 10 errors:")

        for error in stats["error_details"][:10]:
            print(f"\nFile: {error['file']}")
            print(f"Error: {error['error']}")


if __name__ == "__main__":
    main()