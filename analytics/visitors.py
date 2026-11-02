"""Normalize visitor records and perform common analytics calculations."""

from __future__ import annotations

import json
import os
import re
import subprocess
import unicodedata
from datetime import datetime
from pathlib import Path
from typing import Any

import pandas as pd
from pyiceberg.expressions import GreaterThanOrEqual

COLUMNS = ["event_id", "time", "time_vn", "visitor", "ip", "country", "device", "path"]


def _mapping(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, dict) else {}
        except json.JSONDecodeError:
            return {}
    return {}


def normalize_visitors(records: Any) -> pd.DataFrame:
    if hasattr(records, "to_pandas"):
        records = records.to_pandas()
    df = records.copy() if isinstance(records, pd.DataFrame) else pd.DataFrame(records)
    if df.empty:
        return pd.DataFrame(columns=COLUMNS)

    rows = []
    for row in df.to_dict(orient="records"):
        meta = _mapping(row.get("meta"))
        event = row.get("event") or meta.get("event") or "page_view"
        if event not in ("pageview", "page_view"):
            continue
        timestamp = row.get("time", row.get("created_at"))
        rows.append({
            "event_id": row.get("event_id") or meta.get("event_id"),
            "time": timestamp,
            "ip": row.get("ip"),
            "visitor": row.get("visitor") or row.get("visitor_id") or row.get("visitorId") or meta.get("visitorId") or row.get("ip"),
            "country": row.get("country") or "ZZ",
            "device": row.get("device") or "unknown",
            "path": row.get("path") or meta.get("path") or "/",
        })

    result = pd.DataFrame(rows, columns=COLUMNS)
    if result.empty:
        return result
    values = result["time"]
    if pd.api.types.is_numeric_dtype(values):
        result["time"] = pd.to_datetime(values, unit="ms", utc=True, errors="coerce")
    else:
        result["time"] = pd.to_datetime(values, utc=True, errors="coerce")
    result = result.dropna(subset=["time"]).copy()
    result["time_vn"] = result["time"].dt.tz_convert("Asia/Ho_Chi_Minh")
    for column in ("country", "device", "path"):
        result[column] = result[column].map(
            lambda value: unicodedata.normalize("NFC", str(value or "").strip())
        )
    ids = result["event_id"].fillna("").astype(str)
    result = pd.concat(
        [result.loc[ids.ne("")].drop_duplicates("event_id"), result.loc[ids.eq("")]],
        ignore_index=True,
    )
    return result


def read_table_events(table: Any, start: datetime | None = None) -> pd.DataFrame:
    schema = {field.name: field for field in table.schema().fields}
    if "time" not in schema and "created_at" not in schema:
        raise ValueError("The Iceberg table needs a time or created_at column.")

    time_column = "time" if "time" in schema else "created_at"
    selected = tuple(name for name in (
        "event_id", "id", "ip", "visitor_id", "visitorId", "event",
        "path", "country", "device", "time", "created_at", "meta",
    ) if name in schema)
    scan_options: dict[str, Any] = {"selected_fields": selected}
    if start is not None:
        field_type = type(schema[time_column].field_type).__name__
        if field_type in {"TimestampType", "TimestamptzType"}:
            cutoff: Any = start.replace(tzinfo=None) if field_type == "TimestampType" else start
        elif field_type in {"LongType", "IntegerType"}:
            cutoff = int(start.timestamp() * 1000)
        else:
            raise ValueError(f"Unsupported timestamp field type: {schema[time_column].field_type}")
        scan_options["row_filter"] = GreaterThanOrEqual(time_column, cutoff)

    return normalize_visitors(table.scan(**scan_options).to_arrow())


def read_d1_events(
    database: str,
    group_id: str = "06",
    start: datetime | None = None,
) -> pd.DataFrame:
    database = database.strip()
    if not re.fullmatch(r"[A-Za-z0-9_-]+", database):
        raise ValueError("D1_DATABASE may contain only letters, numbers, underscores, and hyphens.")
    if not re.fullmatch(r"[A-Za-z0-9]+", group_id):
        raise ValueError("GROUP_ID may contain only ASCII letters and numbers.")

    time_filter = f" AND created_at >= {int(start.timestamp() * 1000)}" if start else ""
    sql = (
        "SELECT event_id, visitor_id AS visitor, event, path, country, device, "
        "created_at AS time FROM analytics_events "
        f"WHERE group_id = '{group_id}' AND event IN ('pageview', 'page_view')"
        f"{time_filter} ORDER BY created_at DESC LIMIT 100001"
    )
    command = [
        "npx", "wrangler", "d1", "execute", database,
        "--remote", "--json", "--command", sql,
    ]
    try:
        completed = subprocess.run(
            command,
            cwd=Path(__file__).resolve().parents[1],
            check=True,
            capture_output=True,
            text=True,
            timeout=120,
            shell=os.name == "nt",
        )
    except FileNotFoundError as exc:
        raise RuntimeError("Node.js and npm/npx are required for the D1 data source.") from exc
    except subprocess.TimeoutExpired as exc:
        raise RuntimeError("The remote D1 query timed out after 120 seconds.") from exc
    except subprocess.CalledProcessError as exc:
        details = (exc.stderr or exc.stdout or "").strip()[-2000:]
        raise RuntimeError(
            "The remote D1 query failed. Confirm Wrangler is authenticated with "
            f"'npx wrangler whoami'. {details}"
        ) from exc

    try:
        result = json.loads(completed.stdout)
        records = result[0].get("results", []) if result else []
    except (json.JSONDecodeError, AttributeError, IndexError, TypeError) as exc:
        raise RuntimeError("Wrangler returned an unexpected JSON response for D1.") from exc

    if len(records) > 100_000:
        raise RuntimeError(
            "More than 100,000 D1 events were returned. Narrow the date range before loading."
        )
    return normalize_visitors(records)


def filter_period(df: pd.DataFrame, period: str, now: pd.Timestamp | None = None) -> pd.DataFrame:
    now = now or pd.Timestamp.now(tz="UTC")
    if period == "24 giờ qua":
        start = now - pd.Timedelta(hours=24)
    elif period == "7 ngày qua":
        start = now - pd.Timedelta(days=7)
    elif period == "30 ngày qua":
        start = now - pd.Timedelta(days=30)
    else:
        return df.copy()
    return df.loc[df["time"] >= start].copy()
