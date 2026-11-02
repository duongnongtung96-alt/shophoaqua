"""Connections to Cloudflare R2 Data Catalog and R2 S3 storage."""

from __future__ import annotations

from typing import Any

import boto3
from pyiceberg.catalog.rest import RestCatalog
from pyiceberg.table import StaticTable


def _required(settings: dict[str, str], *names: str) -> list[str]:
    return [name for name in names if not settings.get(name)]


def _rest_catalog(settings: dict[str, str]) -> RestCatalog:
    missing = _required(settings, "R2_CATALOG_URI", "R2_WAREHOUSE", "R2_TOKEN")
    if missing:
        raise ValueError("Missing settings: " + ", ".join(missing))
    return RestCatalog(
        name="fruitica",
        uri=settings["R2_CATALOG_URI"],
        warehouse=settings["R2_WAREHOUSE"],
        token=settings["R2_TOKEN"],
    )


def _s3_settings(settings: dict[str, str]) -> tuple[dict[str, str], Any]:
    missing = _required(
        settings,
        "R2_ACCOUNT_ID",
        "R2_BUCKET",
        "R2_ACCESS_KEY_ID",
        "R2_SECRET_ACCESS_KEY",
    )
    if missing:
        raise ValueError("Missing settings: " + ", ".join(missing))

    endpoint = f"https://{settings['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com"
    client = boto3.client(
        "s3",
        endpoint_url=endpoint,
        region_name="auto",
        aws_access_key_id=settings["R2_ACCESS_KEY_ID"],
        aws_secret_access_key=settings["R2_SECRET_ACCESS_KEY"],
    )
    properties = {
        "s3.endpoint": endpoint,
        "s3.region": "auto",
        "s3.access-key-id": settings["R2_ACCESS_KEY_ID"],
        "s3.secret-access-key": settings["R2_SECRET_ACCESS_KEY"],
    }
    return properties, client


def list_tables(settings: dict[str, str]) -> list[str]:
    mode = settings.get("CATALOG_MODE", "r2").lower()
    if mode == "r2":
        catalog = _rest_catalog(settings)
        tables: list[str] = []
        for namespace in catalog.list_namespaces():
            for table in catalog.list_tables(namespace):
                tables.append(".".join(table))
        return sorted(tables)

    if mode == "s3":
        _, client = _s3_settings(settings)
        prefix = settings.get("ICEBERG_METADATA_PREFIX", "")
        paginator = client.get_paginator("list_objects_v2")
        names: set[str] = set()
        for page in paginator.paginate(Bucket=settings["R2_BUCKET"], Prefix=prefix):
            for item in page.get("Contents", []):
                key = item["Key"]
                if not key.endswith(".metadata.json"):
                    continue
                parts = key.split("/")
                marker = parts.index("metadata") if "metadata" in parts else -1
                if marker >= 2:
                    names.add(".".join(parts[marker - 2:marker]))
                else:
                    names.add(key.rsplit("/", 1)[-1])
        return sorted(names)

    return []


def load_table(settings: dict[str, str], table_name: str):
    mode = settings.get("CATALOG_MODE", "r2").lower()
    if mode == "r2":
        return _rest_catalog(settings).load_table(table_name)
    if mode != "s3":
        raise ValueError(f"Unsupported catalog mode: {mode}")

    properties, client = _s3_settings(settings)
    bucket = settings["R2_BUCKET"]
    prefix = settings.get("ICEBERG_METADATA_PREFIX", "")
    table_leaf = table_name.split(".")[-1]
    paginator = client.get_paginator("list_objects_v2")
    metadata_files = []
    for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
        for item in page.get("Contents", []):
            key = item["Key"]
            if key.endswith(".metadata.json") and table_leaf in key.split("/"):
                metadata_files.append(item)

    if not metadata_files:
        raise FileNotFoundError(
            f"No Iceberg metadata found for {table_name} in bucket {bucket}. "
            "Check the sink bucket and ICEBERG_METADATA_PREFIX."
        )

    newest = max(metadata_files, key=lambda item: item["LastModified"])
    location = f"s3://{bucket}/{newest['Key']}"
    try:
        return StaticTable.from_metadata(location, properties=properties)
    except Exception as exc:
        raise RuntimeError(
            "Could not open Iceberg metadata through S3. Check Object Read access "
            "and the R2 S3 endpoint."
        ) from exc
