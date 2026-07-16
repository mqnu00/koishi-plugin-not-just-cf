#!/usr/bin/env python3
"""Probe AtCoder's official upcoming-contest page without GitHub data."""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import asdict, dataclass, field
from datetime import datetime, timedelta, timezone
from html.parser import HTMLParser
from pathlib import Path
from typing import Any
from urllib.parse import urljoin
from urllib.request import ProxyHandler, Request, build_opener


SOURCE_URL = "https://atcoder.jp/contests/"
DURATION_PATTERN = re.compile(r"^(\d+):(\d{2})$")
SHANGHAI = timezone(timedelta(hours=8), "Asia/Shanghai")


@dataclass
class ParsedCell:
    text_parts: list[str] = field(default_factory=list)
    time_parts: list[str] = field(default_factory=list)
    contest_link_parts: list[str] = field(default_factory=list)
    contest_href: str | None = None

    @staticmethod
    def normalize(parts: list[str]) -> str:
        return " ".join("".join(parts).split())

    @property
    def text(self) -> str:
        return self.normalize(self.text_parts)

    @property
    def time_text(self) -> str:
        return self.normalize(self.time_parts)

    @property
    def contest_name(self) -> str:
        return self.normalize(self.contest_link_parts)


class UpcomingContestParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.div_depth = 0
        self.upcoming_div_depth: int | None = None
        self.current_row: list[ParsedCell] | None = None
        self.current_cell: ParsedCell | None = None
        self.in_time = False
        self.in_contest_link = False
        self.rows: list[list[ParsedCell]] = []

    @property
    def inside_upcoming(self) -> bool:
        return self.upcoming_div_depth is not None and self.div_depth >= self.upcoming_div_depth

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attributes = dict(attrs)
        if tag == "div":
            self.div_depth += 1
            if attributes.get("id") == "contest-table-upcoming":
                self.upcoming_div_depth = self.div_depth

        if not self.inside_upcoming:
            return
        if tag == "tr":
            self.current_row = []
        elif tag == "td" and self.current_row is not None:
            self.current_cell = ParsedCell()
        elif tag == "time" and self.current_cell is not None:
            self.in_time = True
        elif tag == "a" and self.current_cell is not None:
            href = attributes.get("href") or ""
            if href.startswith("/contests/"):
                self.current_cell.contest_href = href
                self.in_contest_link = True

    def handle_endtag(self, tag: str) -> None:
        if self.inside_upcoming:
            if tag == "time":
                self.in_time = False
            elif tag == "a":
                self.in_contest_link = False
            elif tag == "td" and self.current_cell is not None and self.current_row is not None:
                self.current_row.append(self.current_cell)
                self.current_cell = None
            elif tag == "tr" and self.current_row is not None:
                if self.current_row:
                    self.rows.append(self.current_row)
                self.current_row = None

        if tag == "div":
            if self.upcoming_div_depth == self.div_depth:
                self.upcoming_div_depth = None
            self.div_depth = max(0, self.div_depth - 1)

    def handle_data(self, data: str) -> None:
        if not self.inside_upcoming or self.current_cell is None:
            return
        self.current_cell.text_parts.append(data)
        if self.in_time:
            self.current_cell.time_parts.append(data)
        if self.in_contest_link:
            self.current_cell.contest_link_parts.append(data)


@dataclass
class Contest:
    oj: str
    name: str
    startTime: int
    duration: int
    endTime: int
    link: str


def parse_start_time(value: str) -> int:
    normalized = value.strip()
    for date_format in ("%Y-%m-%d %H:%M:%S%z", "%Y-%m-%d %H:%M%z"):
        try:
            return int(datetime.strptime(normalized, date_format).timestamp())
        except ValueError:
            pass
    raise ValueError(f"Unsupported AtCoder start time: {value!r}")


def parse_duration(value: str) -> int:
    match = DURATION_PATTERN.fullmatch(value.strip())
    if not match:
        raise ValueError(f"Unsupported AtCoder duration: {value!r}")
    hours, minutes = (int(part) for part in match.groups())
    return hours * 3600 + minutes * 60


def parse_contests(html: str) -> list[Contest]:
    parser = UpcomingContestParser()
    parser.feed(html)
    contests: list[Contest] = []

    for row in parser.rows:
        time_cell = next((cell for cell in row if cell.time_text), None)
        contest_cell = next(
            (cell for cell in row if cell.contest_href and not cell.time_text and cell.contest_name),
            None,
        )
        duration_cell = next((cell for cell in row if DURATION_PATTERN.fullmatch(cell.text)), None)
        if not time_cell or not contest_cell or not duration_cell:
            continue

        start_time = parse_start_time(time_cell.time_text)
        duration = parse_duration(duration_cell.text)
        contests.append(Contest(
            oj="AtCoder",
            name=contest_cell.contest_name,
            startTime=start_time,
            duration=duration,
            endTime=start_time + duration,
            link=urljoin(SOURCE_URL, contest_cell.contest_href or ""),
        ))

    contests.sort(key=lambda contest: contest.startTime)
    if not contests:
        raise RuntimeError("No contests parsed from #contest-table-upcoming; the page structure may have changed")
    return contests


def fetch_html(url: str, timeout: float, proxy: str | None) -> str:
    handlers = [ProxyHandler({"http": proxy, "https": proxy})] if proxy else []
    opener = build_opener(*handlers)
    request = Request(url, headers={
        "User-Agent": "Mozilla/5.0 (compatible; not-just-cf-atcoder-probe/1.0)",
        "Accept-Language": "en-US,en;q=0.9",
    })
    with opener.open(request, timeout=timeout) as response:
        charset = response.headers.get_content_charset() or "utf-8"
        return response.read().decode(charset, errors="replace")


def filter_contests(contests: list[Contest], now: int, window_days: int) -> list[Contest]:
    safe_days = max(0, window_days)
    return [
        contest for contest in contests
        if contest.endTime > now
        and (safe_days == 0 or contest.startTime - now <= safe_days * 86400)
    ]


def read_cached_atcoder(path: Path) -> list[dict[str, Any]]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    raw = payload.get("rawResponse", payload)
    if isinstance(raw, str):
        raw = json.loads(raw)
    contests = raw.get("contests", []) if isinstance(raw, dict) else []
    return [item for item in contests if str(item.get("oj", "")).lower() == "atcoder"]


def format_local(timestamp: int) -> str:
    return datetime.fromtimestamp(timestamp, SHANGHAI).strftime("%Y-%m-%d %H:%M:%S %Z")


def print_summary(contests: list[Contest], total: int) -> None:
    print(f"Official upcoming contests: {total}; after window filter: {len(contests)}")
    for contest in contests:
        hours, remainder = divmod(contest.duration, 3600)
        minutes = remainder // 60
        print(f"- {format_local(contest.startTime)} | {hours:02d}:{minutes:02d} | {contest.name}")
        print(f"  {contest.link}")


def build_argument_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default=SOURCE_URL, help="AtCoder contests page URL")
    parser.add_argument("--window-days", type=int, default=7, help="Match contestWindowDays; 0 keeps all")
    parser.add_argument("--timeout", type=float, default=20, help="HTTP timeout in seconds")
    parser.add_argument("--proxy", help="Optional HTTP/HTTPS proxy, for example http://127.0.0.1:7890")
    parser.add_argument("--cache-json", type=Path, help="Optional latest-atcoder.json to compare")
    parser.add_argument("--output", type=Path, help="Optional output JSON path")
    parser.add_argument("--print-json", action="store_true", help="Print normalized JSON to stdout")
    return parser


def main() -> int:
    args = build_argument_parser().parse_args()
    fetched_at = datetime.now(timezone.utc)
    html = fetch_html(args.url, args.timeout, args.proxy)
    all_contests = parse_contests(html)
    filtered = filter_contests(all_contests, int(fetched_at.timestamp()), args.window_days)
    print_summary(filtered, len(all_contests))

    if args.cache_json:
        cached = read_cached_atcoder(args.cache_json)
        official_links = {contest.link for contest in all_contests}
        cached_links = {str(contest.get("link", "")) for contest in cached}
        print(f"Cached AtCoder contests: {len(cached)}")
        print(f"Only in official source: {len(official_links - cached_links)}")
        print(f"Only in cached source: {len(cached_links - official_links)}")

    payload = {
        "sourceUrl": args.url,
        "fetchedAt": fetched_at.isoformat().replace("+00:00", "Z"),
        "timezone": "unix-seconds / Asia-Shanghai-display",
        "windowDays": max(0, args.window_days),
        "rawCount": len(all_contests),
        "normalizedCount": len(filtered),
        "contests": [asdict(contest) for contest in filtered],
    }
    serialized = json.dumps(payload, ensure_ascii=False, indent=2)
    if args.print_json:
        print(serialized)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(serialized + "\n", encoding="utf-8")
        print(f"Wrote {args.output}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"AtCoder probe failed: {error}", file=sys.stderr)
        raise
