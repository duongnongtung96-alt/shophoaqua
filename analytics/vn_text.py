"""Vietnamese text normalization and display formatting."""

from __future__ import annotations

import unicodedata

COUNTRY_NAMES = {
    "AU": "Úc", "CA": "Canada", "CN": "Trung Quốc", "DE": "Đức",
    "FR": "Pháp", "GB": "Vương quốc Anh", "JP": "Nhật Bản",
    "KR": "Hàn Quốc", "SG": "Singapore", "TH": "Thái Lan",
    "US": "Hoa Kỳ", "VN": "Việt Nam", "ZZ": "Không rõ",
}


def normalize_text(value: object) -> str:
    return unicodedata.normalize("NFC", str(value))


def country_name(code: object) -> str:
    normalized = normalize_text(code).strip().upper()
    return COUNTRY_NAMES.get(normalized, normalized or "Không rõ")


def format_number(value: int | float) -> str:
    return f"{value:,.0f}".replace(",", ".")
