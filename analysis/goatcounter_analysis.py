#!/usr/bin/env python3
"""Analyze LAB MATCH AI events from a GoatCounter JSON export.

This script uses only aggregate GoatCounter JSON export files (paths.jsonl and
hit_stats.jsonl). It does not need or use individual visitor/session data.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import re
import shutil
import tempfile
import zipfile
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Iterable

PAGES = ("home", "intern", "graduate", "dgist", "snu", "kaist", "postech")
SCHOOLS = ("dgist", "snu", "kaist", "postech")
RESULT_BUCKETS = ("0", "1-3", "4-10", "11-plus")


@dataclass(frozen=True)
class Hit:
    when: datetime
    path: str
    title: str
    event: bool
    count: int


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Analyze privacy-preserving LAB MATCH AI GoatCounter events."
    )
    parser.add_argument("export", help="GoatCounter JSON export ZIP or extracted directory")
    parser.add_argument("--output", default="lab_match_analysis", help="Output directory")
    parser.add_argument(
        "--site-prefix",
        default="LAB-INTERN-MATCH-AI",
        help="Repository/path keyword used to keep this platform's pageviews",
    )
    parser.add_argument(
        "--split-date",
        help="Optional deployment date (YYYY-MM-DD) for before/after comparison",
    )
    return parser.parse_args()


def jsonl_rows(path: Path) -> Iterable[dict]:
    with path.open("r", encoding="utf-8") as handle:
        for lineno, line in enumerate(handle, 1):
            line = line.strip()
            if not line:
                continue
            try:
                yield json.loads(line)
            except json.JSONDecodeError as exc:
                raise ValueError(f"Invalid JSON in {path.name} line {lineno}: {exc}") from exc


def materialize_export(source: Path) -> tuple[Path, Path | None]:
    if source.is_dir():
        return source, None
    if not source.is_file() or not zipfile.is_zipfile(source):
        raise FileNotFoundError("Export must be a GoatCounter JSON ZIP or extracted directory")
    temp = Path(tempfile.mkdtemp(prefix="goatcounter_export_"))
    with zipfile.ZipFile(source) as archive:
        archive.extractall(temp)
    candidates = [p.parent for p in temp.rglob("paths.jsonl")]
    if not candidates:
        shutil.rmtree(temp, ignore_errors=True)
        raise FileNotFoundError("paths.jsonl was not found in the export ZIP")
    return candidates[0], temp


def load_hits(root: Path) -> list[Hit]:
    paths_file = root / "paths.jsonl"
    stats_file = root / "hit_stats.jsonl"
    if not paths_file.exists() or not stats_file.exists():
        raise FileNotFoundError("The JSON export must contain paths.jsonl and hit_stats.jsonl")

    paths: dict[int, tuple[str, str, bool]] = {}
    for row in jsonl_rows(paths_file):
        paths[int(row["id"])] = (
            str(row.get("path", "")),
            str(row.get("title", "")),
            bool(row.get("event", False)),
        )

    aggregate: Counter[tuple[datetime, int]] = Counter()
    for row in jsonl_rows(stats_file):
        raw = str(row["hour"]).replace("Z", "+00:00")
        when = datetime.fromisoformat(raw)
        if when.tzinfo is None:
            when = when.replace(tzinfo=timezone.utc)
        aggregate[(when, int(row["path_id"]))] += int(row.get("count", 0))

    hits: list[Hit] = []
    for (when, path_id), count in sorted(aggregate.items()):
        if path_id not in paths:
            continue
        path, title, event = paths[path_id]
        hits.append(Hit(when, path, title, event, count))
    return hits


def page_from_path(path: str, site_prefix: str) -> str | None:
    low = path.lower()
    prefix = site_prefix.lower().strip("/")
    if prefix and prefix not in low:
        return None
    if "/graduate/dgist" in low:
        return "dgist"
    if "/graduate/snu" in low:
        return "snu"
    if "/graduate/kaist" in low:
        return "kaist"
    if "/graduate/postech" in low:
        return "postech"
    if "/intern" in low:
        return "intern"
    if "/graduate" in low:
        return "graduate"
    return "home"


def event_counts(hits: Iterable[Hit]) -> Counter[str]:
    counter: Counter[str] = Counter()
    for hit in hits:
        if hit.event and hit.path.startswith("lm-"):
            counter[hit.path] += hit.count
    return counter


def prefix_sum(counter: Counter[str], prefix: str) -> int:
    return sum(count for name, count in counter.items() if name.startswith(prefix))


def exact_sum(counter: Counter[str], *names: str) -> int:
    return sum(counter[name] for name in names)


def parse_search_outcome(name: str) -> dict | None:
    prefix = "lm-search-outcome-"
    if not name.startswith(prefix):
        return None
    rest = name[len(prefix):]
    page = next((p for p in ("intern", *SCHOOLS) if rest.startswith(p + "-")), None)
    if not page:
        return None
    rest = rest[len(page) + 1 :]
    try:
        source, rest = rest.split("-i-", 1)
        intent, rest = rest.split("-q-", 1)
        qbucket, result_bucket = rest.rsplit("-r-", 1)
    except ValueError:
        return None
    if result_bucket not in RESULT_BUCKETS:
        return None
    return {
        "page": page,
        "source": source,
        "intent": intent,
        "query_bucket": qbucket,
        "result_bucket": result_bucket,
    }


def parse_feedback(name: str) -> dict | None:
    prefix = "lm-feedback-"
    if not name.startswith(prefix) or name.startswith("lm-feedback-prompt-"):
        return None
    rest = name[len(prefix):]
    page = next((p for p in ("intern", *SCHOOLS) if rest.startswith(p + "-")), None)
    if not page:
        return None
    rest = rest[len(page) + 1 :]
    sentiment = "not-helpful" if rest.startswith("not-helpful-") else "helpful" if rest.startswith("helpful-") else None
    if not sentiment:
        return None
    rest = rest[len(sentiment) + 1 :]
    if rest.startswith("i-"):
        rest = rest[2:]
    try:
        intent, rest = rest.split("-src-", 1)
        source, result_bucket = rest.rsplit("-r-", 1)
    except ValueError:
        return None
    return {
        "page": page,
        "sentiment": sentiment,
        "intent": intent,
        "source": source,
        "result_bucket": result_bucket,
    }


def parse_feedback_prompt(name: str) -> dict | None:
    prefix = "lm-feedback-prompt-"
    if not name.startswith(prefix):
        return None
    rest = name[len(prefix):]
    page = next((p for p in ("intern", *SCHOOLS) if rest.startswith(p + "-")), None)
    if not page:
        return None
    rest = rest[len(page) + 1 :]
    if rest.startswith("i-"):
        rest = rest[2:]
    try:
        intent, rest = rest.split("-src-", 1)
        source, result_bucket = rest.rsplit("-r-", 1)
    except ValueError:
        return None
    return {"page": page, "intent": intent, "source": source, "result_bucket": result_bucket}


def ratio(num: int, den: int, scale: float = 100.0) -> float:
    return round((num / den * scale), 2) if den else 0.0


def two_proportion_test(x1: int, n1: int, x2: int, n2: int) -> tuple[float | None, float | None]:
    if n1 <= 0 or n2 <= 0:
        return None, None
    pooled = (x1 + x2) / (n1 + n2)
    variance = pooled * (1 - pooled) * (1 / n1 + 1 / n2)
    if variance <= 0:
        return None, None
    z = (x2 / n2 - x1 / n1) / math.sqrt(variance)
    p = math.erfc(abs(z) / math.sqrt(2))
    return round(z, 4), round(p, 6)


def metrics_for(hits: list[Hit], site_prefix: str) -> tuple[list[dict], list[dict], Counter[str]]:
    events = event_counts(hits)
    pageviews: Counter[str] = Counter()
    for hit in hits:
        if hit.event:
            continue
        page = page_from_path(hit.path, site_prefix)
        if page:
            pageviews[page] += hit.count

    outcomes: defaultdict[tuple[str, str], Counter[str]] = defaultdict(Counter)
    page_outcomes: defaultdict[str, Counter[str]] = defaultdict(Counter)
    prompts: defaultdict[tuple[str, str], int] = defaultdict(int)
    feedback: defaultdict[tuple[str, str], Counter[str]] = defaultdict(Counter)

    for name, count in events.items():
        parsed = parse_search_outcome(name)
        if parsed:
            key = (parsed["page"], parsed["intent"])
            outcomes[key][parsed["result_bucket"]] += count
            page_outcomes[parsed["page"]][parsed["result_bucket"]] += count
            continue
        parsed_prompt = parse_feedback_prompt(name)
        if parsed_prompt:
            prompts[(parsed_prompt["page"], parsed_prompt["intent"])] += count
            continue
        parsed_feedback = parse_feedback(name)
        if parsed_feedback:
            feedback[(parsed_feedback["page"], parsed_feedback["intent"])][parsed_feedback["sentiment"]] += count

    page_rows: list[dict] = []
    for page in ("intern", *SCHOOLS):
        bucket = page_outcomes[page]
        searches = sum(bucket.values())
        zero = bucket["0"]
        large = bucket["11-plus"]
        prompt_count = sum(v for (p, _), v in prompts.items() if p == page)
        helpful = sum(v["helpful"] for (p, _), v in feedback.items() if p == page)
        not_helpful = sum(v["not-helpful"] for (p, _), v in feedback.items() if p == page)
        responses = helpful + not_helpful
        if page == "intern":
            external = prefix_sum(events, "lm-intern-job-open-")
            deep = prefix_sum(events, "lm-intern-copy-") + prefix_sum(events, "lm-intern-filter-")
        else:
            external = prefix_sum(events, f"lm-lab-homepage-{page}-") + prefix_sum(events, f"lm-lab-profile-{page}-")
            deep = (
                events[f"lm-lab-more-direct-{page}"]
                + events[f"lm-lab-more-adjacent-{page}"]
                + events[f"lm-lab-show-adjacent-{page}"]
                + events[f"lm-lab-more-results-{page}"]
                + prefix_sum(events, f"lm-lab-details-{page}-")
            )
        page_rows.append({
            "page": page,
            "pageviews": pageviews[page],
            "searches": searches,
            "searches_per_100_pageviews": ratio(searches, pageviews[page]),
            "zero_results": zero,
            "zero_result_rate_pct": ratio(zero, searches),
            "results_11_plus": large,
            "results_11_plus_rate_pct": ratio(large, searches),
            "external_link_clicks": external,
            "external_clicks_per_100_searches": ratio(external, searches),
            "deep_exploration_actions": deep,
            "deep_actions_per_100_searches": ratio(deep, searches),
            "feedback_prompts": prompt_count,
            "feedback_responses": responses,
            "feedback_response_rate_pct": ratio(responses, prompt_count),
            "helpful_feedback": helpful,
            "not_helpful_feedback": not_helpful,
            "helpful_rate_pct": ratio(helpful, responses),
        })

    intent_rows: list[dict] = []
    for (page, intent), bucket in sorted(outcomes.items()):
        searches = sum(bucket.values())
        helpful = feedback[(page, intent)]["helpful"]
        not_helpful = feedback[(page, intent)]["not-helpful"]
        responses = helpful + not_helpful
        prompt_count = prompts[(page, intent)]
        intent_rows.append({
            "page": page,
            "intent": intent,
            "searches": searches,
            "result_0": bucket["0"],
            "result_1_3": bucket["1-3"],
            "result_4_10": bucket["4-10"],
            "result_11_plus": bucket["11-plus"],
            "zero_result_rate_pct": ratio(bucket["0"], searches),
            "results_11_plus_rate_pct": ratio(bucket["11-plus"], searches),
            "feedback_prompts": prompt_count,
            "feedback_responses": responses,
            "feedback_response_rate_pct": ratio(responses, prompt_count),
            "helpful_feedback": helpful,
            "not_helpful_feedback": not_helpful,
            "helpful_rate_pct": ratio(helpful, responses),
        })

    return page_rows, intent_rows, events


def write_csv(path: Path, rows: list[dict]) -> None:
    if not rows:
        path.write_text("", encoding="utf-8-sig")
        return
    with path.open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)


def comparison_rows(before: list[dict], after: list[dict]) -> list[dict]:
    before_map = {row["page"]: row for row in before}
    after_map = {row["page"]: row for row in after}
    rows = []
    for page in ("intern", *SCHOOLS):
        b = before_map.get(page, {})
        a = after_map.get(page, {})
        bz, bp = int(b.get("zero_results", 0)), int(b.get("searches", 0))
        az, ap = int(a.get("zero_results", 0)), int(a.get("searches", 0))
        zero_z, zero_p = two_proportion_test(bz, bp, az, ap)
        bh, br = int(b.get("helpful_feedback", 0)), int(b.get("feedback_responses", 0))
        ah, ar = int(a.get("helpful_feedback", 0)), int(a.get("feedback_responses", 0))
        helpful_z, helpful_p = two_proportion_test(bh, br, ah, ar)
        rows.append({
            "page": page,
            "before_searches": bp,
            "after_searches": ap,
            "before_zero_rate_pct": b.get("zero_result_rate_pct", 0),
            "after_zero_rate_pct": a.get("zero_result_rate_pct", 0),
            "zero_rate_change_pct_point": round(float(a.get("zero_result_rate_pct", 0)) - float(b.get("zero_result_rate_pct", 0)), 2),
            "zero_rate_z": zero_z,
            "zero_rate_p": zero_p,
            "before_helpful_rate_pct": b.get("helpful_rate_pct", 0),
            "after_helpful_rate_pct": a.get("helpful_rate_pct", 0),
            "helpful_rate_change_pct_point": round(float(a.get("helpful_rate_pct", 0)) - float(b.get("helpful_rate_pct", 0)), 2),
            "helpful_rate_z": helpful_z,
            "helpful_rate_p": helpful_p,
            "before_external_per_100_searches": b.get("external_clicks_per_100_searches", 0),
            "after_external_per_100_searches": a.get("external_clicks_per_100_searches", 0),
        })
    return rows


def write_report(output: Path, page_rows: list[dict], intent_rows: list[dict], events: Counter[str], split_date: str | None) -> None:
    lines = [
        "# LAB MATCH AI GoatCounter 분석 결과",
        "",
        "이 결과는 GoatCounter JSON export의 집계형 이벤트를 사용합니다. 검색어 원문과 사용자별 이동 경로는 포함하지 않습니다.",
        "",
        "## 페이지 및 학교별 핵심 지표",
        "",
        "| 서비스 | 조회 | 검색 | 결과 0개 비율 | 11개 이상 비율 | 외부 링크/검색 100회 | 도움 비율 |",
        "|---|---:|---:|---:|---:|---:|---:|",
    ]
    for row in page_rows:
        lines.append(
            f"| {row['page']} | {row['pageviews']} | {row['searches']} | "
            f"{row['zero_result_rate_pct']:.2f}% | {row['results_11_plus_rate_pct']:.2f}% | "
            f"{row['external_clicks_per_100_searches']:.2f} | {row['helpful_rate_pct']:.2f}% |"
        )

    lines.extend(["", "## 개선 우선순위 후보", ""])
    valid = [r for r in intent_rows if r["searches"] >= 5]
    for row in sorted(valid, key=lambda r: (r["zero_result_rate_pct"], r["searches"]), reverse=True)[:10]:
        lines.append(
            f"- {row['page']} / {row['intent']}: 검색 {row['searches']}회, "
            f"결과 0개 {row['zero_result_rate_pct']:.2f}%, 도움 비율 {row['helpful_rate_pct']:.2f}%"
        )
    if not valid:
        lines.append("- 분야별 검색이 5회 이상 쌓이면 개선 우선순위를 표시합니다.")

    lines.extend([
        "",
        "## 해석 주의사항",
        "",
        "- 클릭과 검색은 사용자 수가 아니라 발생 횟수입니다.",
        "- 외부 링크 이동률은 반복 클릭이 포함될 수 있으므로 ‘검색 100회당 클릭 수’로 해석합니다.",
        "- 도움 비율은 자발적으로 응답한 이용자에 한정된 지표입니다.",
        "- 결과 0개 비율과 도움 비율을 함께 보고 개선 여부를 판단하는 것이 안전합니다.",
    ])
    if split_date:
        lines.extend(["", f"전후 비교 기준일: **{split_date}**", "`before_after.csv`에서 비율 변화와 두 비율 검정 결과를 확인하세요."])
    (output / "analysis_report.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    args = parse_args()
    source = Path(args.export).expanduser().resolve()
    output = Path(args.output).expanduser().resolve()
    output.mkdir(parents=True, exist_ok=True)
    root, temp = materialize_export(source)
    try:
        hits = load_hits(root)
        page_rows, intent_rows, events = metrics_for(hits, args.site_prefix)
        write_csv(output / "school_summary.csv", page_rows)
        write_csv(output / "intent_summary.csv", intent_rows)
        write_csv(
            output / "event_counts.csv",
            [{"event": name, "count": count} for name, count in events.most_common()],
        )
        daily: Counter[tuple[str, str]] = Counter()
        for hit in hits:
            if hit.event and hit.path.startswith("lm-"):
                daily[(hit.when.date().isoformat(), hit.path)] += hit.count
        write_csv(
            output / "daily_event_counts.csv",
            [{"date": d, "event": e, "count": c} for (d, e), c in sorted(daily.items())],
        )

        if args.split_date:
            split = date.fromisoformat(args.split_date)
            before_hits = [h for h in hits if h.when.date() < split]
            after_hits = [h for h in hits if h.when.date() >= split]
            before_rows, _, _ = metrics_for(before_hits, args.site_prefix)
            after_rows, _, _ = metrics_for(after_hits, args.site_prefix)
            write_csv(output / "before_after.csv", comparison_rows(before_rows, after_rows))

        write_report(output, page_rows, intent_rows, events, args.split_date)
        print(f"Analysis complete: {output}")
        return 0
    finally:
        if temp:
            shutil.rmtree(temp, ignore_errors=True)


if __name__ == "__main__":
    raise SystemExit(main())
