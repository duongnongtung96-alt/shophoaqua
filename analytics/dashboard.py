"""Fruitica website analytics dashboard."""

from __future__ import annotations

import os
from datetime import datetime
from pathlib import Path

import pandas as pd
import streamlit as st
from dotenv import load_dotenv

from catalog import list_tables, load_table
from visitors import filter_period, read_d1_events, read_table_events
from vn_text import country_name, format_number

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")
SETTINGS = dict(os.environ)
S3_KEYS = (
    "R2_ACCOUNT_ID",
    "R2_BUCKET",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "ICEBERG_METADATA_PREFIX",
)
for target, source in (
    ("R2_CATALOG_URI", "BASIN_CATALOG_URI"),
    ("R2_WAREHOUSE", "BASIN_WAREHOUSE"),
    ("R2_TOKEN", "BASIN_CATALOG_TOKEN"),
):
    if not SETTINGS.get(target) and SETTINGS.get(source):
        SETTINGS[target] = SETTINGS[source]
try:
    SETTINGS.update({key: str(value) for key, value in st.secrets.items()})
except (FileNotFoundError, RuntimeError):
    pass
for target, source in (
    ("R2_CATALOG_URI", "BASIN_CATALOG_URI"),
    ("R2_WAREHOUSE", "BASIN_WAREHOUSE"),
    ("R2_TOKEN", "BASIN_CATALOG_TOKEN"),
):
    if not SETTINGS.get(target) and SETTINGS.get(source):
        SETTINGS[target] = SETTINGS[source]
TABLE_CONFIG = SETTINGS.get("VISITORS_TABLE", SETTINGS.get("ICEBERG_TABLE", "")).strip()
MODE_CONFIG = SETTINGS.get("CATALOG_MODE", "auto").lower().strip()
R2_REST_CONFIGURED = all(
    SETTINGS.get(key) for key in ("R2_CATALOG_URI", "R2_WAREHOUSE", "R2_TOKEN")
)
R2_S3_CONFIGURED = all(SETTINGS.get(key) for key in S3_KEYS[:4])
REFRESH_SECONDS = max(30, int(SETTINGS.get("REFRESH_SECONDS", "300")))

st.set_page_config(
    page_title="Fruitica | Website Analytics",
    page_icon="🍍",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.markdown(
    """
    <style>
    .block-container { max-width: 1500px; padding-top: 1.7rem; }
    div[data-testid="stMetric"] { border: 1px solid #e6e9ed; padding: 14px; border-radius: 6px; }
    section[data-testid="stSidebar"] { border-right: 1px solid #e5e7eb; }
    </style>
    """,
    unsafe_allow_html=True,
)

st.title("Fruitica | Phân tích truy cập")
st.caption("Business intelligence cho website bán hàng · Múi giờ Asia/Ho_Chi_Minh")

with st.sidebar:
    st.header("Bộ lọc")
    source_labels = {
        "Tự động (Basin/Iceberg → D1)": "auto",
        "Basin Data Catalog (Iceberg REST)": "r2",
        "Iceberg qua R2 S3": "s3",
        "Cloudflare D1 (remote)": "d1",
    }
    preferred = MODE_CONFIG if MODE_CONFIG in source_labels.values() else "auto"
    source_label = st.selectbox(
        "Kết nối",
        list(source_labels),
        index=list(source_labels.values()).index(preferred),
    )
    source_mode = source_labels[source_label]
    period = st.selectbox(
        "Khoảng thời gian",
        ["24 giờ qua", "7 ngày qua", "30 ngày qua", "Tất cả"],
        index=0,
    )
    st.caption(f"Tự làm mới mỗi {REFRESH_SECONDS} giây")
    if st.button("Làm mới ngay", use_container_width=True):
        st.cache_data.clear()
        st.rerun()


@st.cache_data(ttl=REFRESH_SECONDS)
def get_catalog_tables(settings: dict[str, str], mode: str) -> list[str]:
    return list_tables({**settings, "CATALOG_MODE": mode})


@st.cache_data(ttl=REFRESH_SECONDS)
def get_catalog_data(
    settings: dict[str, str],
    mode: str,
    table_name: str,
    start_iso: str | None,
) -> pd.DataFrame:
    table = load_table({**settings, "CATALOG_MODE": mode}, table_name)
    start = datetime.fromisoformat(start_iso) if start_iso else None
    return read_table_events(table, start=start)


@st.cache_data(ttl=REFRESH_SECONDS)
def get_d1_data(database: str, group_id: str, start_iso: str | None) -> pd.DataFrame:
    start = datetime.fromisoformat(start_iso) if start_iso else None
    return read_d1_events(database, group_id, start=start)


def catalog_mode(requested: str) -> str | None:
    if requested in {"r2", "s3"}:
        return requested
    if requested != "auto":
        return None
    if R2_REST_CONFIGURED:
        return "r2"
    if R2_S3_CONFIGURED:
        return "s3"
    return None


def load_iceberg_events(mode: str, start_iso: str | None) -> tuple[pd.DataFrame, str]:
    tables = get_catalog_tables(SETTINGS, mode)
    candidates = [name for name in tables if "visitors" in name.lower()]
    if TABLE_CONFIG:
        if TABLE_CONFIG not in tables:
            raise ValueError(
                f"Configured table '{TABLE_CONFIG}' was not found. "
                "Inspect the Iceberg catalog or update VISITORS_TABLE."
            )
        selected = TABLE_CONFIG
    elif candidates:
        selected = candidates[0]
    else:
        raise ValueError(
            "No table with 'visitors' in its name was found. "
            "Verify the Iceberg sink or set VISITORS_TABLE."
        )
    return get_catalog_data(SETTINGS, mode, selected, start_iso), selected


def load_d1_events(start_iso: str | None) -> tuple[pd.DataFrame, str]:
    database = SETTINGS.get("D1_DATABASE", "shophoaqua-db")
    events = get_d1_data(database, SETTINGS.get("GROUP_ID", "06"), start_iso)
    return events, f"D1 · {database}"


def selected_period_start(period_name: str, now: pd.Timestamp) -> str | None:
    durations = {
        "24 giờ qua": pd.Timedelta(hours=24),
        "7 ngày qua": pd.Timedelta(days=7),
        "30 ngày qua": pd.Timedelta(days=30),
    }
    duration = durations.get(period_name)
    return (now - duration).isoformat() if duration else None


def safe_error(exc: Exception) -> str:
    message = str(exc)
    for key in (
        "R2_TOKEN",
        "BASIN_CATALOG_TOKEN",
        "R2_SECRET_ACCESS_KEY",
        "R2_ACCESS_KEY_ID",
    ):
        secret = SETTINGS.get(key)
        if secret:
            message = message.replace(secret, "[redacted]")
    return message


now_utc = pd.Timestamp.now(tz="UTC")
start_iso = selected_period_start(period, now_utc)
actual_source = source_mode
try:
    if source_mode == "d1":
        all_events, selected_table = load_d1_events(start_iso)
    elif source_mode == "auto":
        configured_mode = catalog_mode(source_mode)
        if configured_mode:
            try:
                all_events, selected_table = load_iceberg_events(configured_mode, start_iso)
                actual_source = configured_mode
            except Exception as iceberg_error:
                st.warning(
                    "Không đọc được Iceberg "
                    f"({safe_error(iceberg_error)}); đang chuyển sang Cloudflare D1."
                )
                all_events, selected_table = load_d1_events(start_iso)
                actual_source = "d1"
        else:
            st.info("Chưa cấu hình Basin/Iceberg; đang dùng Cloudflare D1.")
            all_events, selected_table = load_d1_events(start_iso)
            actual_source = "d1"
    else:
        all_events, selected_table = load_iceberg_events(source_mode, start_iso)
except Exception as exc:
    st.error(f"Không thể đọc nguồn {source_label}: {safe_error(exc)}")
    if actual_source in {"r2", "s3"} or source_mode in {"r2", "s3", "auto"}:
        st.info("Kiểm tra cấu hình Basin/Iceberg và quyền đọc; nguồn tự động cần Wrangler đăng nhập để dự phòng D1.")
    elif source_mode == "d1":
        st.info("Cần Node.js/npm và Wrangler đã đăng nhập Cloudflare; kiểm tra bằng npx wrangler whoami.")
    st.stop()

all_events = all_events.sort_values("time") if not all_events.empty else all_events
filtered_events = filter_period(all_events, period, now=now_utc)

with st.sidebar:
    country_options = sorted(filtered_events["country"].dropna().unique().tolist())
    device_options = sorted(filtered_events["device"].dropna().unique().tolist())
    selected_countries = st.multiselect(
        "Quốc gia", country_options, format_func=country_name
    )
    selected_devices = st.multiselect("Thiết bị", device_options)

if selected_countries:
    filtered_events = filtered_events[filtered_events["country"].isin(selected_countries)]
if selected_devices:
    filtered_events = filtered_events[filtered_events["device"].isin(selected_devices)]

actual_source_labels = {
    "auto": "Tự động",
    "r2": "Basin Data Catalog (Iceberg REST)",
    "s3": "Iceberg qua R2 S3",
    "d1": "Cloudflare D1",
}
st.caption(
    f"Nguồn: {actual_source_labels[actual_source]} · Bảng: {selected_table} "
    f"· {len(filtered_events):,} sự kiện sau lọc"
)

if filtered_events.empty:
    st.info("Chưa có sự kiện trong khoảng thời gian và bộ lọc đã chọn.")

views = len(filtered_events)
visitors = filtered_events["visitor"].dropna().astype(str).str.strip()
visitor_count = visitors[visitors.ne("")].nunique()
countries = filtered_events["country"].dropna().astype(str).str.strip()
country_count = countries[countries.ne("") & countries.ne("ZZ")].nunique()
page_count = filtered_events.loc[filtered_events["path"].notna(), "path"].nunique()
metric_cols = st.columns(4)
metric_cols[0].metric("Khách truy cập", format_number(visitor_count))
metric_cols[1].metric("Lượt xem", format_number(views))
metric_cols[2].metric("Quốc gia", format_number(country_count))
metric_cols[3].metric("Trang / khách", f"{page_count / max(visitor_count, 1):.2f}")
if filtered_events.empty:
    st.stop()

left, right = st.columns([1.5, 1])
with left:
    st.subheader("Lưu lượng theo ngày")
    daily = filtered_events.set_index("time_vn").resample("D").size().rename("Lượt xem")
    st.area_chart(daily, width="stretch")
with right:
    st.subheader("Lưu lượng theo giờ")
    hourly = filtered_events.set_index("time_vn").resample("h").size().rename("Lượt xem")
    st.bar_chart(hourly, width="stretch")

st.divider()
heat_col, country_col, device_col = st.columns([1.3, 1, 1])
with heat_col:
    st.subheader("Khung giờ truy cập · Thứ × giờ")
    heat = filtered_events.assign(
        weekday=filtered_events["time_vn"].dt.day_name(),
        hour=filtered_events["time_vn"].dt.hour,
    ).pivot_table(index="weekday", columns="hour", values="time", aggfunc="count", fill_value=0)
    weekday_order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    weekday_names = {
        "Monday": "T2", "Tuesday": "T3", "Wednesday": "T4", "Thursday": "T5",
        "Friday": "T6", "Saturday": "T7", "Sunday": "CN",
    }
    heat = heat.reindex([day for day in weekday_order if day in heat.index])
    heat.index = [weekday_names[day] for day in heat.index]
    st.dataframe(heat, width="stretch")
    if not filtered_events.empty:
        peak = filtered_events.groupby(filtered_events["time_vn"].dt.hour).size().idxmax()
        st.caption(f"Giờ cao điểm: {peak:02d}:00–{(peak + 1) % 24:02d}:00")
with country_col:
    st.subheader("Theo quốc gia")
    country_stats = filtered_events["country"].map(country_name).value_counts().head(10)
    st.bar_chart(country_stats, width="stretch")
with device_col:
    st.subheader("Theo thiết bị")
    st.bar_chart(filtered_events["device"].value_counts(), width="stretch")

st.divider()
page_col, detail_col = st.columns([0.9, 1.1])
with page_col:
    st.subheader("Trang được xem nhiều nhất")
    top_pages = filtered_events["path"].value_counts().head(10).rename_axis("Trang").rename("Lượt xem")
    st.bar_chart(top_pages, width="stretch")
with detail_col:
    st.subheader("Lịch sử truy cập")
    visible = filtered_events[["time_vn", "path", "country", "device"]].copy()
    visible["time_vn"] = visible["time_vn"].dt.strftime("%d/%m/%Y %H:%M:%S")
    visible["country"] = visible["country"].map(country_name)
    visible.columns = ["Thời gian", "Trang", "Quốc gia", "Thiết bị"]
    st.dataframe(visible.sort_values("Thời gian", ascending=False), width="stretch", hide_index=True)

st.download_button(
    "Tải CSV",
    data=visible.to_csv(index=False).encode("utf-8-sig"),
    file_name="fruitica-analytics.csv",
    mime="text/csv",
)
