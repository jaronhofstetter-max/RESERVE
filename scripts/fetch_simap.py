#!/usr/bin/env python3
import json
import os
import ssl
import time
import urllib.parse
import urllib.request
import http.cookiejar
from datetime import datetime, timezone
from pathlib import Path

BASE = "https://www.simap.ch/api/publications/v2/project/project-search"
SEEDS = [
    "Sanitär", "Heizung", "Lüftung", "Gebäudeautomation",
    "Elektro", "Bau", "Reinigung", "Lieferung"
]
OUT = Path("data/projects.json")


def first(obj, *keys, default=""):
    for key in keys:
        value = obj.get(key) if isinstance(obj, dict) else None
        if value not in (None, ""):
            return value
    return default


def nested(obj, *path, default=""):
    cur = obj
    for key in path:
        if not isinstance(cur, dict) or key not in cur:
            return default
        cur = cur[key]
    return cur if cur not in (None, "") else default


def normalize(x):
    title = first(x, "projectTitle", "title", "name", default="SIMAP Projekt")
    buyer = first(x, "procOfficeName", "buyerName", "issuedByOrganizationName", default="Öffentlicher Auftraggeber")
    location = nested(x, "orderAddress", "city") or nested(x, "orderAddress", "cantonId") or first(x, "orderAddressDescription", default="Schweiz")
    ptype = first(x, "projectSubType", "newestPubType", "publicationType", default="Publikation")
    project_id = first(x, "projectId", "id", default="")
    publication_id = first(x, "currentPublicationId", "publicationId", "newestPublicationId", default="")

    text_parts = []
    for key in ("projectDescription", "description", "objectDescription", "procurementDescription", "shortDescription"):
        v = x.get(key) if isinstance(x, dict) else None
        if isinstance(v, str) and v.strip():
            text_parts.append(v.strip())
    if not text_parts:
        text_parts.append(json.dumps(x, ensure_ascii=False)[:1600])

    deadline = first(x, "offerDeadline", "deadline", default="")
    details_url = ""
    if project_id:
        details_url = f"https://www.simap.ch/de/project-detail/{project_id}"

    return {
        "id": str(project_id or publication_id or title),
        "projectId": project_id,
        "publicationId": publication_id,
        "title": str(title),
        "buyer": str(buyer),
        "location": str(location),
        "type": str(ptype),
        "deadline": str(deadline),
        "deadlineDays": 30,
        "value": 0,
        "text": " ".join(text_parts),
        "url": details_url,
        "raw": x,
    }


def fetch_seed(opener, seed):
    params = urllib.parse.urlencode({"lang": "de", "search": seed})
    req = urllib.request.Request(
        f"{BASE}?{params}",
        headers={"Accept": "application/json", "User-Agent": "TenderHawk/0.5 (+GitHub Pages pilot)"},
    )
    with opener.open(req, timeout=30) as r:
        payload = json.load(r)
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        for key in ("items", "content", "results", "projects", "entries"):
            if isinstance(payload.get(key), list):
                return payload[key]
    return []


def main():
    jar = http.cookiejar.CookieJar()
    context = ssl.create_default_context()
    opener = urllib.request.build_opener(
        urllib.request.HTTPCookieProcessor(jar),
        urllib.request.HTTPSHandler(context=context),
    )

    merged = {}
    errors = []
    for seed in SEEDS:
        try:
            rows = fetch_seed(opener, seed)
            for raw in rows:
                item = normalize(raw)
                merged[item["id"]] = item
        except Exception as exc:
            errors.append({"seed": seed, "error": f"{type(exc).__name__}: {exc}"})
        time.sleep(0.3)

    projects = list(merged.values())
    projects.sort(key=lambda x: (x.get("deadline") or "9999", x.get("title") or ""))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "source": "simap.ch public API",
        "count": len(projects),
        "seeds": SEEDS,
        "errors": errors,
        "projects": projects,
    }
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {len(projects)} projects to {OUT}")
    if not projects:
        raise SystemExit("No projects fetched; refusing to publish an empty snapshot")


if __name__ == "__main__":
    main()
