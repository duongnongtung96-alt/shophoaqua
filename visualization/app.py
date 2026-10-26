"""Fruitica BI — chỉ hiển thị sự kiện thực từ Iceberg hoặc API events."""
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
import pandas as pd
import requests
import streamlit as st
from dotenv import load_dotenv

load_dotenv(Path(__file__).with_name('.env'))
st.set_page_config(page_title='Fruitica BI | Nhóm 06', layout='wide')
GROUP_ID = os.getenv('GROUP_ID', '06').strip()
SOURCE = os.getenv('BI_SOURCE', 'd1').lower().strip()
REFRESH_SECONDS = int(os.getenv('REFRESH_SECONDS', '30'))
STATS_URL = os.getenv('BI_STATS_URL', 'https://shophoaqua.duongnongtung96.workers.dev/api/admin/stats')


def get_events_iceberg():
    import boto3
    from pyiceberg.table import StaticTable
    account = os.environ['R2_ACCOUNT_ID']
    bucket = os.environ['R2_BUCKET']
    endpoint = f'https://{account}.r2.cloudflarestorage.com'
    prefix = os.getenv('ICEBERG_METADATA_PREFIX', '').strip().lstrip('/')
    client = boto3.client('s3', endpoint_url=endpoint, region_name='auto',
        aws_access_key_id=os.environ['R2_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['R2_SECRET_ACCESS_KEY'])
    objects = []
    for page in client.get_paginator('list_objects_v2').paginate(Bucket=bucket, Prefix=prefix):
        objects.extend(o for o in page.get('Contents', []) if o['Key'].endswith('.metadata.json'))
    if not objects:
        raise RuntimeError('Không tìm thấy metadata Iceberg. Kiểm tra bucket/prefix hoặc quyền list.')
    latest = max(objects, key=lambda x: x['LastModified'])['Key']
    table = StaticTable.from_metadata(f's3://{bucket}/{latest}', properties={
        's3.endpoint': endpoint,
        's3.access-key-id': os.environ['R2_ACCESS_KEY_ID'],
        's3.secret-access-key': os.environ['R2_SECRET_ACCESS_KEY'],
        's3.region': 'auto'})
    return table.scan().to_pandas(), f'R2 Iceberg: {latest}'


def get_events_api():
    url = os.environ['BI_EVENTS_API_URL']
    headers = {'Cache-Control': 'no-store'}
    token = os.getenv('BI_API_TOKEN')
    if token:
        headers['Authorization'] = f'Bearer {token}'
    response = requests.get(url, headers=headers, params={'_': int(datetime.now().timestamp())}, timeout=15)
    response.raise_for_status()
    payload = response.json()
    if isinstance(payload, list):
        rows = payload
    elif isinstance(payload, dict):
        if payload.get('success') is False:
            raise RuntimeError(str(payload.get('error', 'API báo lỗi')))
        rows = payload.get('events')
        if rows is None and isinstance(payload.get('data'), dict):
            rows = payload['data'].get('events')
    else:
        rows = None
    if not isinstance(rows, list):
        raise ValueError('API phải trả danh sách events thật; API tổng hợp stats không thể tạo lại sự kiện.')
    return pd.DataFrame(rows), f'Events API: {url.split("?")[0]}'


def normalize(raw):
    if raw.empty and not len(raw.columns):
        return pd.DataFrame(columns=['time', 'group_id', 'visitor_id', 'country', 'device'])
    df = raw.copy()
    if 'meta' in df.columns:
        df['visitor_id'] = df.get('visitor_id', df['meta'].map(lambda x: x.get('visitorId') if isinstance(x, dict) else None))
        df['event'] = df.get('event', df['meta'].map(lambda x: x.get('event') if isinstance(x, dict) else None))
        df['path'] = df.get('path', df['meta'].map(lambda x: x.get('path') if isinstance(x, dict) else None))
    if 'event_id' not in df and 'meta' in df:
        df['event_id'] = df['meta'].map(lambda x: x.get('event_id') if isinstance(x, dict) else None)
    if 'event_id' in df:
        df = df.drop_duplicates(subset=['event_id'], keep='first')
    if 'group_id' not in df and 'id' in df:
        df['group_id'] = df['id']
    if 'group_id' not in df:
        raise ValueError('Thiếu group_id/id trong sự kiện. Không thể xác minh nhóm 06.')
    df = df[df['group_id'].astype(str).str.strip().str.zfill(2) == GROUP_ID.zfill(2)].copy()
    time_col = next((c for c in ['time', 'timestamp', 'created_at', 'event_time', 'ts'] if c in df), None)
    if time_col is None:
        raise ValueError('Thiếu cột thời gian (time/timestamp/created_at/event_time/ts).')
    if pd.api.types.is_numeric_dtype(df[time_col]):
        nums = pd.to_numeric(df[time_col], errors='coerce')
        unit = 'ms' if nums.dropna().abs().median() > 1e11 else 's'
        df['time'] = pd.to_datetime(nums, unit=unit, utc=True, errors='coerce')
    else:
        df['time'] = pd.to_datetime(df[time_col], utc=True, errors='coerce')
    now = pd.Timestamp.now(tz='UTC')
    df = df[(df['time'] >= now - pd.Timedelta(hours=24)) & (df['time'] <= now)].copy()
    event_col = next((c for c in ['event_type', 'event', 'type', 'name'] if c in df), None)
    if event_col:
        df = df[df[event_col].astype(str).str.lower().isin(['page_view', 'pageview', 'view', 'page-view'])]
    for col in ['visitor_id', 'country', 'device']:
        if col not in df:
            df[col] = pd.NA
    return df




def get_d1_stats():
    response = requests.get(STATS_URL, params={'t': int(datetime.now().timestamp())},
                            headers={'Cache-Control': 'no-cache', 'Pragma': 'no-cache'}, timeout=15)
    response.raise_for_status()
    data = response.json()
    if not isinstance(data, dict) or data.get('success') is not True or not isinstance(data.get('data'), dict):
        raise ValueError('API không trả success=true và data hợp lệ')
    stats = data['data']
    for key in ('total_views', 'unique_visitors', 'total_countries', 'countries', 'devices'):
        if key not in stats:
            raise ValueError(f'API thiếu trường {key}')
    return stats

st.title('🍍 Fruitica — Thống kê BI 24 giờ (Nhóm 06)')
st.caption('Dữ liệu thật • Chỉ đọc • Không sửa Worker, D1, Basin hoặc R2')
with st.sidebar:
    st.header('Nguồn thống kê')
    selected = st.selectbox('Chọn nguồn', ['d1', 'iceberg'], index=0 if SOURCE != 'iceberg' else 1,
                            format_func=lambda x: 'D1 — số liệu thực, cập nhật nhanh' if x == 'd1' else 'Basin / Iceberg / R2 — sự kiện chi tiết')
    st.caption('D1 và Iceberg có thể lệch nhau do độ trễ đồng bộ hoặc lỗi ingest. Không cộng gộp hai nguồn.')
    if st.button('Làm mới ngay'):
        st.rerun()

@st.fragment(run_every=f'{max(10, REFRESH_SECONDS)}s')
def dashboard():
    st.caption('Lần kiểm tra: ' + datetime.now().astimezone().strftime('%d/%m/%Y %H:%M:%S'))
    if selected == 'd1':
        try:
            stats = get_d1_stats()
            views = int(stats['total_views'])
            visitors = int(stats['unique_visitors'])
            countries = pd.DataFrame(stats['countries'])
            devices = pd.DataFrame(stats['devices'])
        except Exception as exc:
            st.error(f'Không đọc được API D1: {type(exc).__name__}: {exc}')
            st.info('Không hiển thị dữ liệu mô phỏng. Hãy kiểm tra endpoint /api/admin/stats và kết nối Internet.')
            return
        st.success('Nguồn: Cloudflare D1 — API thống kê thực tế 24 giờ')
        a,b,c = st.columns(3)
        a.metric('Lượt xem trang / 24h', views)
        b.metric('Khách duy nhất / 24h', visitors)
        c.metric('Số quốc gia / 24h', int(stats['total_countries']))
        left,right = st.columns(2)
        with left:
            st.subheader('Lượt xem theo quốc gia')
            if not countries.empty and {'country','count'} <= set(countries.columns):
                st.bar_chart(countries.set_index('country')['count'])
            else: st.info('Chưa có dữ liệu quốc gia.')
        with right:
            st.subheader('Lượt xem theo thiết bị')
            if not devices.empty and {'device','count'} <= set(devices.columns):
                st.bar_chart(devices.set_index('device')['count'])
            else: st.info('Chưa có dữ liệu thiết bị.')
        st.subheader('Bảng tổng hợp từ D1')
        st.dataframe(pd.DataFrame([{'Lượt xem': views, 'Khách duy nhất': visitors, 'Số quốc gia': int(stats['total_countries'])}]), hide_index=True)
        st.caption('API D1 hiện chỉ trả dữ liệu tổng hợp; không thể suy ra chính xác lượt xem theo giờ, IP hoặc từng sự kiện.')
        return
    try:
        raw, origin = get_events_iceberg()
        df = normalize(raw)
    except Exception as exc:
        st.error(f'Không đọc được Iceberg: {type(exc).__name__}: {exc}')
        st.info('Kiểm tra R2_BUCKET, ICEBERG_METADATA_PREFIX, quyền đọc R2 và metadata Iceberg. Không thay thế bằng số liệu giả.')
        return
    st.success('Nguồn: ' + origin)
    visitors = df['visitor_id'].dropna().astype(str)
    visitors = visitors[visitors.str.strip().ne('')]
    a,b,c = st.columns(3)
    a.metric('Lượt xem / 24h', len(df))
    b.metric('Khách duy nhất / 24h', visitors.nunique() if len(visitors) else 'N/A')
    c.metric('Số quốc gia / 24h', df['country'].dropna().nunique())
    if df.empty:
        st.warning('Không có page_view nhóm 06 trong 24 giờ gần nhất ở Iceberg.')
        return
    local = df.copy()
    local['time_vn'] = local['time'].dt.tz_convert('Asia/Ho_Chi_Minh')
    st.subheader('Lượt xem theo giờ Việt Nam')
    st.line_chart(local.set_index('time_vn').resample('h').size().rename('Lượt xem'))
    left,right = st.columns(2)
    with left:
        st.subheader('Quốc gia')
        st.bar_chart(local['country'].fillna('Không rõ').value_counts())
    with right:
        st.subheader('Thiết bị')
        st.bar_chart(local['device'].fillna('Không rõ').value_counts())
    st.subheader('Sự kiện thực')
    local['time'] = local['time_vn'].dt.strftime('%Y-%m-%d %H:%M:%S')
    visible = local.drop(columns=['ip','time_vn'], errors='ignore').sort_values('time', ascending=False)
    st.dataframe(visible, use_container_width=True, hide_index=True)
    st.download_button('Tải CSV', visible.to_csv(index=False).encode('utf-8-sig'), 'fruitica_events_24h.csv', 'text/csv')

dashboard()
