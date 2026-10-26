# Báo cáo: Thống kê lượt truy cập website bằng Streamlit và Cloudflare R2 Iceberg

## 1. Mục tiêu

- Thu thập sự kiện truy cập trang web (quốc gia, thiết bị, thời gian, IP) và đẩy lên endpoint ingest của Cloudflare.
- Lưu dữ liệu dạng Iceberg trên R2.
- Đọc dữ liệu 24 giờ gần nhất và hiển thị số liệu bằng Streamlit chạy local.

## 2. Kiến trúc tổng quan

```
Trình duyệt người dùng
        |
        v
Cloudflare Worker (src/index.ts)  --POST JSON-->  Ingest endpoint (Pipeline)
                                                        |
                                                        v
                                          R2 bucket "visitors" (Iceberg)
                                                        |
                                              đọc qua S3 API + metadata
                                                        |
                                                        v
                                    Streamlit local (visualization/app.py)
```

## 3. Chuẩn bị

| Thành phần | Yêu cầu |
|---|---|
| Tài khoản Cloudflare | Đã bật R2 và Workers |
| Python | 3.10 trở lên |
| Thư viện | `pip install -r visualization/requirements.txt` |
| Repo | Đã clone dự án `cloudflare-shop-ai` |

## 4. Bước 1: Thu thập dữ liệu ở Worker

File `src/index.ts` có middleware gửi một sự kiện cho mỗi lần tải trang HTML (`GET` có `Accept: text/html`):

| Trường | Nguồn | Ghi chú |
|---|---|---|
| `id` | Cố định `"01"` | Không dùng để đếm người |
| `country` | `request.cf.country` | Mã quốc gia 2 ký tự |
| `device` | User-Agent | `ios`, `android` hoặc `pc` |
| `time` | `Date.now()` | Mili giây |
| `ip` | Header `CF-Connecting-IP` | Dùng để ước lượng số người |
| `meta` | `{ path }` | Đường dẫn trang |

Gửi bằng `ctx.waitUntil()` để không làm chậm trang.

`wrangler.toml` đã đặt `run_worker_first = true` để mọi request trang đi qua Worker. Triển khai bằng:

```bash
npm run deploy
```

**Lưu ý**: thời gian phải là mili giây. Nếu gửi giây, dữ liệu sẽ có năm 1970 và bị bộ lọc 24 giờ loại bỏ.

## 5. Bước 2: Chuẩn bị bảng Iceberg trên Cloudflare

1. Tạo bucket R2 (ví dụ `visitors`).
2. Bật **R2 Data Catalog** cho bucket nếu cần.
3. Tạo Pipeline nhận dữ liệu từ endpoint ingest và ghi vào bucket ở trên dưới dạng Iceberg.
4. Gửi vài sự kiện thử để kiểm tra bảng có dữ liệu.

Lấy các thông tin sau từ Cloudflare:

- **Account ID**: hiển thị ở trang chủ tài khoản, hoặc nằm trong URL dashboard.
- **Tên bucket**: ví dụ `visitors`.

## 6. Bước 3: Tạo khóa truy cập S3 cho R2

Dashboard chỉ cần quyền đọc, nên tạo token như sau:

1. Vào **R2 Object Storage** > **Manage API tokens**.
2. Tạo token với quyền **Object Read** cho bucket.
3. Lưu lại **Access Key ID** và **Secret Access Key**. Secret chỉ hiện một lần.

**Bài học**: token Data Catalog thường gặp lỗi 403 `Insufficient permission for R2 Data Catalog Warehouse` khi dùng REST catalog. Cách đọc qua S3 và file metadata Iceberg tránh được lỗi này.

## 7. Bước 4: Cấu hình biến môi trường

Tạo file `visualization/.env` (đã được thêm vào `.gitignore`):

```env
R2_ACCOUNT_ID=<account_id>
R2_BUCKET=<ten_bucket>
R2_ACCESS_KEY_ID=<access_key_id>
R2_SECRET_ACCESS_KEY=<secret_access_key>
```

Không ghi khóa vào code và không commit file `.env`.

## 8. Bước 5: Chạy dashboard local

```bash
cd visualization
pip install -r requirements.txt
USE_SAMPLE=0 streamlit run app.py
```

- `USE_SAMPLE=1` (mặc định): dùng dữ liệu mẫu, dùng để kiểm tra giao diện.
- `USE_SAMPLE=0`: đọc dữ liệu thật từ Iceberg.

Mở `http://localhost:8501`. Dashboard hiển thị:

- Số người truy cập (IP duy nhất trong 24 giờ).
- Số quốc gia.
- Số lượt xem.
- Biểu đồ theo quốc gia và theo thiết bị.

## 9. Cách hoạt động của `app.py`

1. `load_dotenv()` nạp biến từ `.env`.
2. `latest_metadata_key()` tìm file `*.metadata.json` mới nhất trong bucket.
3. `StaticTable.from_metadata()` của `pyiceberg` đọc bảng từ file metadata đó qua S3, không cần gọi REST catalog.
4. Cột `time` được chuyển sang kiểu thời gian nếu là số.
5. Lọc các dòng trong 24 giờ gần nhất, rồi tính số liệu và vẽ biểu đồ.
6. `@st.cache_data(ttl=300)` cache dữ liệu 5 phút để tránh đọc lại liên tục.

## 10. Kiểm tra kết quả

- Chạy `USE_SAMPLE=0` và xem số lượt xem có khớp với số lần mở trang không.
- Mở trang web từ điện thoại iOS, Android và máy tính để kiểm tra cột `device`.
- Đổi thời gian hệ thống hoặc chờ 24 giờ để kiểm tra bộ lọc.

## 11. Các lỗi thường gặp

| Lỗi | Nguyên nhân | Cách khắc phục |
|---|---|---|
| 403 khi gọi `/v1/config` | Token không có quyền catalog | Dùng cách đọc qua S3 như trong app |
| `Credential access key has length 0` | Thiếu `R2_ACCESS_KEY_ID` | Điền đủ khóa trong `.env` |
| Dòng có năm 1970 | Gửi `time` theo giây | Dùng `Date.now()` (mili giây) |
| Số người quá thấp | `id` cố định `"01"` | Đếm theo `ip` và chấp nhận sai số do IP dùng chung |
| Không có dữ liệu | Pipeline chưa ghi hoặc sai bucket | Kiểm tra sink của Pipeline và gửi sự kiện thử |

## 12. Hạn chế

- `id` luôn là `"01"`, nên số người được ước lượng bằng IP. Nhiều người dùng chung IP (ví dụ mạng công ty) sẽ bị gộp.
- Bot có thể bị phân loại là `pc`. Cần lọc riêng nếu cần độ chính xác cao.
- Dashboard chỉ tìm metadata mới nhất trong bucket, nên chỉ đúng khi bucket chứa một bảng.
- Lưu IP là dữ liệu cá nhân. Cân nhắc ẩn danh trước khi dùng thật.

## 13. Bảo mật

- Không dán khóa hoặc token vào chat, tài liệu, hay commit vào git.
- Nếu đã lộ khóa, thu hồi trên Cloudflare và tạo khóa mới.
- Chỉ cấp quyền đọc cho dashboard.
