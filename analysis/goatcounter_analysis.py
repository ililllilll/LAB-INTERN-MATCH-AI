#!/usr/bin/env python3
"""Analyze privacy-preserving LAB MATCH AI GoatCounter aggregate exports.

The analyzer reads only paths.jsonl and hit_stats.jsonl. It never needs raw
search text, visitor IDs, IP addresses, cookies, or person-level paths.
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
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable
from zoneinfo import ZoneInfo

PAGES = ("home", "intern", "graduate", "field", "dgist", "snu", "kaist", "postech")
SEARCH_PAGES = ("intern", "field", "dgist", "snu", "kaist", "postech")
SCHOOLS = ("dgist", "snu", "kaist", "postech")
RESULT_BUCKETS = ("0", "1-3", "4-10", "11-plus")
QUERY_BUCKETS = ("empty", "short", "medium", "long", "preset")


@dataclass(frozen=True)
class Hit:
    when_utc: datetime
    when_local: datetime
    path: str
    title: str
    event: bool
    count: int


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Analyze LAB MATCH AI GoatCounter aggregate events")
    parser.add_argument("export", help="GoatCounter JSON export ZIP or extracted directory")
    parser.add_argument("--output", default="lab_match_analysis", help="Output directory")
    parser.add_argument("--site-prefix", default="LAB-INTERN-MATCH-AI")
    parser.add_argument("--timezone", default="Asia/Seoul", help="IANA time zone")
    parser.add_argument("--start-kst", help="Inclusive local datetime, e.g. 2026-07-10T20:00")
    parser.add_argument("--end-kst", help="Exclusive local datetime, e.g. 2026-07-12T01:00")
    parser.add_argument("--split-kst", help="Optional deployment local datetime for before/after")
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
        raise FileNotFoundError("paths.jsonl was not found")
    return candidates[0], temp


def parse_local_datetime(value: str | None, tz: ZoneInfo) -> datetime | None:
    if not value:
        return None
    dt = datetime.fromisoformat(value)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=tz)
    return dt.astimezone(tz)


def load_hits(root: Path, tz: ZoneInfo) -> list[Hit]:
    paths_file, stats_file = root / "paths.jsonl", root / "hit_stats.jsonl"
    if not paths_file.exists() or not stats_file.exists():
        raise FileNotFoundError("paths.jsonl and hit_stats.jsonl are required")

    paths: dict[int, tuple[str, str, bool]] = {}
    for row in jsonl_rows(paths_file):
        paths[int(row["id"])] = (
            str(row.get("path", "")), str(row.get("title", "")), bool(row.get("event", False))
        )

    aggregate: Counter[tuple[datetime, int]] = Counter()
    for row in jsonl_rows(stats_file):
        raw = str(row["hour"]).replace("Z", "+00:00")
        when = datetime.fromisoformat(raw)
        if when.tzinfo is None:
            when = when.replace(tzinfo=timezone.utc)
        when = when.astimezone(timezone.utc)
        aggregate[(when, int(row["path_id"]))] += int(row.get("count", 0))

    hits: list[Hit] = []
    for (when_utc, path_id), count in sorted(aggregate.items()):
        if path_id not in paths:
            continue
        path, title, event = paths[path_id]
        hits.append(Hit(when_utc, when_utc.astimezone(tz), path, title, event, count))
    return hits


def normalize_page_path(path: str) -> str:
    """Merge /, trailing slash and /index.html variants for analysis."""
    clean = str(path or "").split("?", 1)[0].split("#", 1)[0]
    clean = re.sub(r"/+", "/", clean)
    if clean.endswith("/index.html"):
        clean = clean[:-10]
    clean = clean.rstrip("/")
    return clean or "/"


def page_from_path(path: str, site_prefix: str) -> str | None:
    low = normalize_page_path(path).lower()
    prefix = site_prefix.lower().strip("/")
    if prefix and prefix not in low:
        return None
    if "/graduate/field" in low:
        return "field"
    for school in SCHOOLS:
        if f"/graduate/{school}" in low:
            return school
    if "/intern" in low:
        return "intern"
    if "/graduate" in low:
        return "graduate"
    return "home"


def event_counts(hits: Iterable[Hit]) -> Counter[str]:
    result: Counter[str] = Counter()
    for hit in hits:
        if hit.event and hit.path.startswith("lm-"):
            result[hit.path] += hit.count
    return result


def prefix_sum(counter: Counter[str], prefix: str) -> int:
    return sum(v for k, v in counter.items() if k.startswith(prefix))


def ratio(num: int, den: int, scale: float = 100.0) -> float:
    return round(num / den * scale, 2) if den else 0.0


def parse_search_outcome(name: str) -> dict | None:
    m = re.match(
        r"^lm-search-outcome-(intern|field|dgist|snu|kaist|postech)-(.+?)-i-(.+?)-q-(empty|short|medium|long|preset)-r-(0|1-3|4-10|11-plus)$",
        name,
    )
    if not m:
        return None
    return dict(zip(("page", "source", "intent", "query_bucket", "result_bucket"), m.groups()))


def parse_query_assist(name: str) -> dict | None:
    m = re.match(r"^lm-query-assist-applied-(field|dgist|snu|kaist|postech)-i-(.+?)-q-(empty|short|medium|long|preset)$", name)
    if m:
        return {"kind": "applied", "page": m.group(1), "intent": m.group(2), "query_bucket": m.group(3)}
    m = re.match(r"^lm-query-assist-outcome-(field|dgist|snu|kaist|postech)-i-(.+?)-r-(0|1-3|4-10|11-plus)$", name)
    if m:
        return {"kind": "outcome", "page": m.group(1), "intent": m.group(2), "result_bucket": m.group(3)}
    return None


def parse_recovery(name: str) -> dict | None:
    patterns = [
        ("shown", r"^lm-zero-recovery-shown-(field|dgist|snu|kaist|postech)-i-(.+?)-q-(empty|short|medium|long|preset)$"),
        ("choice", r"^lm-zero-recovery-choice-(field|dgist|snu|kaist|postech)-from-(.+?)-to-(.+)$"),
        ("outcome", r"^lm-zero-recovery-outcome-(field|dgist|snu|kaist|postech)-i-(.+?)-r-(0|1-3|4-10|11-plus)$"),
        ("external", r"^lm-zero-recovery-external-(field|dgist|snu|kaist|postech)-rank-(1-3|4-10|11-plus|unknown)$"),
    ]
    for kind, pattern in patterns:
        m = re.match(pattern, name)
        if not m:
            continue
        if kind == "shown":
            return {"kind": kind, "page": m.group(1), "intent": m.group(2), "query_bucket": m.group(3)}
        if kind == "choice":
            return {"kind": kind, "page": m.group(1), "from_intent": m.group(2), "to_intent": m.group(3)}
        if kind == "outcome":
            return {"kind": kind, "page": m.group(1), "intent": m.group(2), "result_bucket": m.group(3)}
        return {"kind": kind, "page": m.group(1), "rank_bucket": m.group(2)}
    return None


def parse_feedback(name: str) -> dict | None:
    m = re.match(
        r"^lm-feedback-(field|intern|dgist|snu|kaist|postech)-(helpful|not-helpful)-i-(.+?)-src-(.+?)-r-(0|1-3|4-10|11-plus|unknown)$",
        name,
    )
    if not m:
        return None
    return dict(zip(("page", "sentiment", "intent", "source", "result_bucket"), m.groups()))


def parse_feedback_prompt(name: str) -> dict | None:
    m = re.match(
        r"^lm-feedback-prompt-(field|intern|dgist|snu|kaist|postech)-i-(.+?)-src-(.+?)-r-(0|1-3|4-10|11-plus|unknown)$",
        name,
    )
    if not m:
        return None
    return dict(zip(("page", "intent", "source", "result_bucket"), m.groups()))


def parse_dgist_department(name: str) -> dict | None:
    m = re.match(r"^lm-lab-department-dgist-d-([a-z0-9-]+)$", name)
    return {"department": m.group(1)} if m else None


def parse_dgist_subfield(name: str) -> dict | None:
    m = re.match(r"^lm-lab-subfield-dgist-d-(.+?)-f-(.+?)-i-(.+)$", name)
    if not m:
        return None
    return {"department": m.group(1), "subfield": m.group(2), "intent": m.group(3)}


def parse_dgist_department_outcome(name: str) -> dict | None:
    m = re.match(r"^lm-dgist-department-outcome-d-(.+?)-src-(.+?)-r-(0|1-3|4-10|11-plus)$", name)
    if not m:
        return None
    return {"department": m.group(1), "source": m.group(2), "result_bucket": m.group(3)}


def parse_dgist_subfield_outcome(name: str) -> dict | None:
    m = re.match(r"^lm-dgist-subfield-outcome-d-(.+?)-f-(.+?)-r-(0|1-3|4-10|11-plus)$", name)
    if not m:
        return None
    return {"department": m.group(1), "subfield": m.group(2), "result_bucket": m.group(3)}


def parse_dgist_department_external(name: str) -> dict | None:
    m = re.match(r"^lm-dgist-department-external-d-(.+?)-rank-(1-3|4-10|11-plus|unknown)$", name)
    if not m:
        return None
    return {"department": m.group(1), "rank_bucket": m.group(2)}


def parse_dgist_subfield_external(name: str) -> dict | None:
    m = re.match(r"^lm-dgist-subfield-external-d-(.+?)-f-(.+?)-rank-(1-3|4-10|11-plus|unknown)$", name)
    if not m:
        return None
    return {"department": m.group(1), "subfield": m.group(2), "rank_bucket": m.group(3)}


def known_event(name: str) -> bool:
    if (parse_search_outcome(name) or parse_query_assist(name) or parse_recovery(name) or
            parse_feedback(name) or parse_feedback_prompt(name) or
            parse_dgist_department(name) or parse_dgist_subfield(name) or
            parse_dgist_department_outcome(name) or parse_dgist_subfield_outcome(name) or
            parse_dgist_department_external(name) or parse_dgist_subfield_external(name)):
        return True
    prefixes = (
        "lm-total-", "lm-nav-", "lm-reset-", "lm-lab-search-submit-", "lm-intern-search-submit-",
        "lm-intern-chat-submit-", "lm-lab-banner-", "lm-lab-banner-list-toggle-", "lm-lab-major-field-",
        "lm-lab-department-", "lm-lab-subfield-", "lm-dgist-department-", "lm-dgist-subfield-",
        "lm-intern-category-", "lm-lab-more-", "lm-lab-show-adjacent-", "lm-lab-details-",
        "lm-lab-homepage-", "lm-lab-profile-", "lm-intern-job-open-", "lm-intern-filter-",
        "lm-intern-sort-", "lm-intern-toggle-", "lm-intern-copy-", "lm-lab-filter-"
    )
    return name.startswith(prefixes)


def write_csv(path: Path, rows: list[dict]) -> None:
    if not rows:
        path.write_text("", encoding="utf-8-sig")
        return
    with path.open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)


def two_proportion_test(x1: int, n1: int, x2: int, n2: int) -> tuple[float | None, float | None]:
    if n1 <= 0 or n2 <= 0:
        return None, None
    pooled = (x1 + x2) / (n1 + n2)
    var = pooled * (1 - pooled) * (1 / n1 + 1 / n2)
    if var <= 0:
        return None, None
    z = (x2 / n2 - x1 / n1) / math.sqrt(var)
    return round(z, 4), round(math.erfc(abs(z) / math.sqrt(2)), 6)


def analyze(hits: list[Hit], site_prefix: str) -> dict:
    events = event_counts(hits)
    pageviews: Counter[str] = Counter()
    normalized_paths: Counter[str] = Counter()
    outcomes: list[dict] = []
    feedback_prompts: Counter[tuple[str, str]] = Counter()
    feedback: defaultdict[tuple[str, str], Counter[str]] = defaultdict(Counter)

    for hit in hits:
        if not hit.event:
            page = page_from_path(hit.path, site_prefix)
            if page:
                pageviews[page] += hit.count
                normalized_paths[normalize_page_path(hit.path)] += hit.count

    for name, count in events.items():
        parsed = parse_search_outcome(name)
        if parsed:
            outcomes.append({**parsed, "count": count})
            continue
        prompt = parse_feedback_prompt(name)
        if prompt:
            feedback_prompts[(prompt["page"], prompt["intent"])] += count
            continue
        response = parse_feedback(name)
        if response:
            feedback[(response["page"], response["intent"])][response["sentiment"]] += count

    by_page: defaultdict[str, Counter[str]] = defaultdict(Counter)
    by_page_intent: defaultdict[tuple[str, str], Counter[str]] = defaultdict(Counter)
    by_source_query: defaultdict[tuple[str, str], Counter[str]] = defaultdict(Counter)
    for row in outcomes:
        by_page[row["page"]][row["result_bucket"]] += row["count"]
        by_page_intent[(row["page"], row["intent"])][row["result_bucket"]] += row["count"]
        by_source_query[(row["source"], row["query_bucket"])][row["result_bucket"]] += row["count"]

    school_rows = []
    for page in SEARCH_PAGES:
        buckets = by_page[page]
        searches = sum(buckets.values())
        prompts = sum(v for (p, _), v in feedback_prompts.items() if p == page)
        helpful = sum(v["helpful"] for (p, _), v in feedback.items() if p == page)
        not_helpful = sum(v["not-helpful"] for (p, _), v in feedback.items() if p == page)
        responses = helpful + not_helpful
        if page == "intern":
            external = prefix_sum(events, "lm-intern-job-open-")
            deep = prefix_sum(events, "lm-intern-filter-") + prefix_sum(events, "lm-intern-copy-")
        else:
            external = prefix_sum(events, f"lm-lab-homepage-{page}-") + prefix_sum(events, f"lm-lab-profile-{page}-")
            deep = (events[f"lm-lab-more-direct-{page}"] + events[f"lm-lab-more-adjacent-{page}"] +
                    events[f"lm-lab-show-adjacent-{page}"] + events[f"lm-lab-more-results-{page}"] +
                    prefix_sum(events, f"lm-lab-details-{page}-"))
        school_rows.append({
            "page": page, "pageviews": pageviews[page], "searches": searches,
            "searches_per_100_pageviews": ratio(searches, pageviews[page]),
            "result_0": buckets["0"], "zero_result_rate_pct": ratio(buckets["0"], searches),
            "result_1_3": buckets["1-3"], "result_4_10": buckets["4-10"],
            "result_11_plus": buckets["11-plus"], "result_11_plus_rate_pct": ratio(buckets["11-plus"], searches),
            "external_link_clicks": external, "external_clicks_per_100_searches": ratio(external, searches),
            "deep_exploration_actions": deep, "deep_actions_per_100_searches": ratio(deep, searches),
            "feedback_prompts": prompts, "feedback_responses": responses,
            "feedback_response_rate_pct": ratio(responses, prompts), "helpful_feedback": helpful,
            "not_helpful_feedback": not_helpful, "helpful_rate_pct": ratio(helpful, responses),
            "reset_actions": events[f"lm-reset-{page}"],
        })

    intent_rows = []
    for (page, intent), buckets in sorted(by_page_intent.items()):
        searches = sum(buckets.values())
        helpful = feedback[(page, intent)]["helpful"]
        not_helpful = feedback[(page, intent)]["not-helpful"]
        responses = helpful + not_helpful
        prompts = feedback_prompts[(page, intent)]
        intent_rows.append({
            "page": page, "intent": intent, "searches": searches,
            "result_0": buckets["0"], "result_1_3": buckets["1-3"], "result_4_10": buckets["4-10"],
            "result_11_plus": buckets["11-plus"], "zero_result_rate_pct": ratio(buckets["0"], searches),
            "result_11_plus_rate_pct": ratio(buckets["11-plus"], searches),
            "feedback_prompts": prompts, "feedback_responses": responses,
            "feedback_response_rate_pct": ratio(responses, prompts), "helpful_rate_pct": ratio(helpful, responses),
        })

    query_rows = []
    for (source, bucket), counts in sorted(by_source_query.items()):
        total = sum(counts.values())
        query_rows.append({
            "source": source, "query_bucket": bucket, "searches": total,
            "result_0": counts["0"], "zero_result_rate_pct": ratio(counts["0"], total),
            "result_1_3": counts["1-3"], "result_4_10": counts["4-10"],
            "result_11_plus": counts["11-plus"],
        })

    service_counts = {
        "intern": events["lm-nav-home-intern"], "graduate": events["lm-nav-home-graduate"],
        "field": events["lm-nav-home-field"],
    }
    service_total = sum(service_counts.values())
    service_rows = [{"service": k, "selections": v, "share_pct": ratio(v, service_total)} for k, v in service_counts.items()]
    school_counts = {s: events[f"lm-nav-school-{s}"] for s in SCHOOLS}
    school_total = sum(school_counts.values())
    school_choice_rows = [{"school": k, "selections": v, "share_pct": ratio(v, school_total)} for k, v in school_counts.items()]

    assist = defaultdict(Counter)
    recovery = defaultdict(Counter)
    for name, count in events.items():
        parsed = parse_query_assist(name)
        if parsed:
            assist[parsed["page"]][parsed["kind"]] += count
            if parsed["kind"] == "outcome" and parsed["result_bucket"] != "0":
                assist[parsed["page"]]["successful"] += count
        parsed_r = parse_recovery(name)
        if parsed_r:
            recovery[parsed_r["page"]][parsed_r["kind"]] += count
            if parsed_r["kind"] == "outcome" and parsed_r["result_bucket"] != "0":
                recovery[parsed_r["page"]]["successful"] += count

    recovery_rows = []
    for page in ("field", *SCHOOLS):
        a, r = assist[page], recovery[page]
        recovery_rows.append({
            "page": page,
            "query_assist_applied": a["applied"], "query_assist_outcomes": a["outcome"],
            "query_assist_successful": a["successful"], "query_assist_success_rate_pct": ratio(a["successful"], a["outcome"]),
            "zero_recovery_shown": r["shown"], "zero_recovery_choices": r["choice"],
            "zero_recovery_choice_rate_pct": ratio(r["choice"], r["shown"]),
            "zero_recovery_outcomes": r["outcome"], "zero_recovery_successful": r["successful"],
            "zero_recovery_success_rate_pct": ratio(r["successful"], r["outcome"]),
            "zero_recovery_external_clicks": r["external"],
            "external_clicks_per_100_successful_recoveries": ratio(r["external"], r["successful"]),
        })

    dgist_department_counts: Counter[str] = Counter()
    dgist_subfield_counts: Counter[tuple[str, str, str]] = Counter()
    dgist_department_outcomes: defaultdict[str, Counter[str]] = defaultdict(Counter)
    dgist_subfield_outcomes: defaultdict[tuple[str, str], Counter[str]] = defaultdict(Counter)
    dgist_department_external: Counter[str] = Counter()
    dgist_subfield_external: Counter[tuple[str, str]] = Counter()
    for name, count in events.items():
        department_event = parse_dgist_department(name)
        if department_event:
            dgist_department_counts[department_event["department"]] += count
        subfield_event = parse_dgist_subfield(name)
        if subfield_event:
            dgist_subfield_counts[(subfield_event["department"], subfield_event["subfield"], subfield_event["intent"])] += count
        department_outcome = parse_dgist_department_outcome(name)
        if department_outcome:
            dgist_department_outcomes[department_outcome["department"]][department_outcome["result_bucket"]] += count
        subfield_outcome = parse_dgist_subfield_outcome(name)
        if subfield_outcome:
            dgist_subfield_outcomes[(subfield_outcome["department"], subfield_outcome["subfield"])][subfield_outcome["result_bucket"]] += count
        department_link = parse_dgist_department_external(name)
        if department_link:
            dgist_department_external[department_link["department"]] += count
        subfield_link = parse_dgist_subfield_external(name)
        if subfield_link:
            dgist_subfield_external[(subfield_link["department"], subfield_link["subfield"])] += count
    department_total = sum(dgist_department_counts.values())
    dgist_department_rows = [
        {"department": key, "selections": value, "share_pct": ratio(value, department_total)}
        for key, value in dgist_department_counts.most_common()
    ]
    dgist_subfield_rows = [
        {"department": department, "subfield": subfield, "intent": intent, "selections": value}
        for (department, subfield, intent), value in sorted(dgist_subfield_counts.items(), key=lambda item: (-item[1], item[0]))
    ]
    all_departments = sorted(set(dgist_department_outcomes) | set(dgist_department_external))
    dgist_department_performance_rows = []
    for department in all_departments:
        buckets = dgist_department_outcomes[department]
        searches = sum(buckets.values())
        links = dgist_department_external[department]
        dgist_department_performance_rows.append({
            "department": department, "searches": searches,
            "result_0": buckets["0"], "zero_result_rate_pct": ratio(buckets["0"], searches),
            "result_1_3": buckets["1-3"], "result_4_10": buckets["4-10"],
            "result_11_plus": buckets["11-plus"],
            "official_link_clicks": links,
            "official_link_clicks_per_100_searches": ratio(links, searches),
        })
    all_subfields = sorted(set(dgist_subfield_outcomes) | set(dgist_subfield_external))
    dgist_subfield_performance_rows = []
    for department, subfield in all_subfields:
        buckets = dgist_subfield_outcomes[(department, subfield)]
        searches = sum(buckets.values())
        links = dgist_subfield_external[(department, subfield)]
        dgist_subfield_performance_rows.append({
            "department": department, "subfield": subfield, "searches": searches,
            "result_0": buckets["0"], "zero_result_rate_pct": ratio(buckets["0"], searches),
            "result_1_3": buckets["1-3"], "result_4_10": buckets["4-10"],
            "result_11_plus": buckets["11-plus"],
            "official_link_clicks": links,
            "official_link_clicks_per_100_searches": ratio(links, searches),
        })


    return {
        "events": events, "pageviews": pageviews, "normalized_paths": normalized_paths,
        "school_rows": school_rows, "intent_rows": intent_rows, "query_rows": query_rows,
        "service_rows": service_rows, "school_choice_rows": school_choice_rows,
        "recovery_rows": recovery_rows,
        "dgist_department_rows": dgist_department_rows,
        "dgist_subfield_rows": dgist_subfield_rows,
        "dgist_department_performance_rows": dgist_department_performance_rows,
        "dgist_subfield_performance_rows": dgist_subfield_performance_rows,
        "unparsed_rows": [{"event": k, "count": v} for k, v in events.most_common() if not known_event(k)],
    }


def comparison_rows(before: list[dict], after: list[dict]) -> list[dict]:
    bm, am = {r["page"]: r for r in before}, {r["page"]: r for r in after}
    rows = []
    for page in SEARCH_PAGES:
        b, a = bm.get(page, {}), am.get(page, {})
        bz, bn = int(b.get("result_0", 0)), int(b.get("searches", 0))
        az, an = int(a.get("result_0", 0)), int(a.get("searches", 0))
        z, p = two_proportion_test(bz, bn, az, an)
        rows.append({
            "page": page, "before_searches": bn, "after_searches": an,
            "before_zero_rate_pct": b.get("zero_result_rate_pct", 0),
            "after_zero_rate_pct": a.get("zero_result_rate_pct", 0),
            "zero_rate_change_pct_point": round(float(a.get("zero_result_rate_pct", 0)) - float(b.get("zero_result_rate_pct", 0)), 2),
            "zero_rate_z": z, "zero_rate_p": p,
            "before_external_per_100_searches": b.get("external_clicks_per_100_searches", 0),
            "after_external_per_100_searches": a.get("external_clicks_per_100_searches", 0),
        })
    return rows


def write_report(output: Path, analysis: dict, start: datetime | None, end: datetime | None) -> None:
    rows = analysis["school_rows"]
    lines = [
        "# LAB MATCH AI GoatCounter 분석 결과", "",
        "집계형 이벤트만 사용하며 검색어 원문, 사용자 ID, 개인별 이동 경로는 사용하지 않습니다.", "",
        f"- 분석 시작: {start.isoformat() if start else 'export 전체'}",
        f"- 분석 종료(미포함): {end.isoformat() if end else 'export 전체'}", "",
        "## 서비스별 핵심 지표", "",
        "| 서비스 | 조회 | 검색 | 0개 비율 | 공식 링크/검색 100회 | 심화 탐색/검색 100회 |",
        "|---|---:|---:|---:|---:|---:|",
    ]
    for row in rows:
        lines.append(f"| {row['page']} | {row['pageviews']} | {row['searches']} | {row['zero_result_rate_pct']:.2f}% | {row['external_clicks_per_100_searches']:.2f} | {row['deep_actions_per_100_searches']:.2f} |")
    lines += ["", "## 실패 검색 우선 점검 후보", ""]
    valid = [r for r in analysis["intent_rows"] if r["searches"] >= 5]
    for row in sorted(valid, key=lambda x: (x["zero_result_rate_pct"], x["searches"]), reverse=True)[:12]:
        lines.append(f"- {row['page']} / {row['intent']}: 검색 {row['searches']}회, 0개 {row['result_0']}회 ({row['zero_result_rate_pct']:.2f}%)")
    lines += [
        "", "## 해석 주의", "",
        "- 시간별 집계이므로 공개 시각이 정각이 아니면 해당 시각이 포함된 한 시간은 정확히 분리할 수 없습니다.",
        "- 클릭과 검색은 사람 수가 아니라 이벤트 횟수입니다.",
        "- `/index.html`과 `/`는 분석기에서 같은 페이지로 정규화합니다.",
        "- 도움 비율은 응답 수가 충분할 때만 해석합니다.",
    ]
    (output / "analysis_report.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    args = parse_args()
    tz = ZoneInfo(args.timezone)
    start = parse_local_datetime(args.start_kst, tz)
    end = parse_local_datetime(args.end_kst, tz)
    split = parse_local_datetime(args.split_kst, tz)
    source, output = Path(args.export).expanduser().resolve(), Path(args.output).expanduser().resolve()
    output.mkdir(parents=True, exist_ok=True)
    root, temp = materialize_export(source)
    try:
        hits = load_hits(root, tz)
        hits = [h for h in hits if (start is None or h.when_local >= start) and (end is None or h.when_local < end)]
        result = analyze(hits, args.site_prefix)
        write_csv(output / "school_summary.csv", result["school_rows"])
        write_csv(output / "intent_summary.csv", result["intent_rows"])
        write_csv(output / "query_source_summary.csv", result["query_rows"])
        write_csv(output / "service_choice_summary.csv", result["service_rows"])
        write_csv(output / "school_choice_summary.csv", result["school_choice_rows"])
        write_csv(output / "query_recovery_summary.csv", result["recovery_rows"])
        write_csv(output / "dgist_department_choice_summary.csv", result["dgist_department_rows"])
        write_csv(output / "dgist_subfield_choice_summary.csv", result["dgist_subfield_rows"])
        write_csv(output / "dgist_department_performance.csv", result["dgist_department_performance_rows"])
        write_csv(output / "dgist_subfield_performance.csv", result["dgist_subfield_performance_rows"])
        write_csv(output / "normalized_pageviews.csv", [{"path": k, "pageviews": v} for k, v in result["normalized_paths"].most_common()])
        write_csv(output / "event_counts.csv", [{"event": k, "count": v} for k, v in result["events"].most_common()])
        write_csv(output / "unparsed_events.csv", result["unparsed_rows"])
        hourly: Counter[tuple[str, str]] = Counter()
        for h in hits:
            kind = "event" if h.event else "pageview"
            hourly[(h.when_local.strftime("%Y-%m-%d %H:00"), kind)] += h.count
        write_csv(output / "hourly_counts.csv", [{"kst_hour": h, "type": t, "count": c} for (h, t), c in sorted(hourly.items())])
        if split:
            before = analyze([h for h in hits if h.when_local < split], args.site_prefix)
            after = analyze([h for h in hits if h.when_local >= split], args.site_prefix)
            write_csv(output / "before_after.csv", comparison_rows(before["school_rows"], after["school_rows"]))
        write_report(output, result, start, end)
        print(f"Analysis complete: {output}")
        return 0
    finally:
        if temp:
            shutil.rmtree(temp, ignore_errors=True)


if __name__ == "__main__":
    raise SystemExit(main())
