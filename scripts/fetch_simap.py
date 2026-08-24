#!/usr/bin/env python3
import json
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


def localized(value, default=""):
    """Return a readable string from SIMAP multilingual values."""
    if value in (None, ""):
        return default
    if isinstance(value, str):
        return value.strip() or default
    if isinstance(value, dict):
        for lang in ("de", "fr", "it", "en"):
            text = value.get(lang)
            if isinstance(text, str) and text.strip():
                return text.strip()
        for text in value.values():
            if isinstance(text, str) and text.strip():
                return text.strip()
        return default
    if isinstance(value, (int, float)):
        return str(value)
    return default


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
    title = localized(first(x, "projectTitle", "title", "name"), "SIMAP Projekt")
    buyer = localized(first(x, "procOfficeName", "buyerName", "issuedByOrganizationName"), "Öffentlicher Auftraggeber")

    city = localized(nested(x, "orderAddress", "city"))
    canton = localized(nested(x, "orderAddress", "cantonId"))
    location = city or canton or localized(first(x, "orderAddressDescription"), "Schweiz")

    ptype = localized(first(x, "projectSubType", "newestPubType", "publicationType"), "Publikation")
    project_id = localized(first(x, "projectId", "id"))
    publication_id = localized(first(x, "currentPublicationId", "publicationId", "newestPublicationId"))

    text_parts = []
    for key in (
        "projectDescription", "description", "objectDescription",
        "procurementDescription", "shortDescription", "subject"
    ):
        v = x.get(key) if isinstance(x, dict) else None
        text = localized(v)
        if text and text not in text_parts:
            text_parts.append(text)

    # Search results often contain no full description. Use compact, useful
    # metadata instead of dumping the complete raw JSON into the UI.
    if not text_parts:
        text_parts = [title]
        if buyer and buyer != "Öffentlicher Auftraggeber":
            text_parts.append(f"Auftraggeber: {buyer}")
        process_type = localized(first(x, "processType"))
        project_number = localized(first(x, "projectNumber", "publicationNumber"))
        if process_type:
            text_parts.append(f"Verfahren: {process_type}")
        if project_number:
            text_parts.append(f"Projekt-Nr.: {project_number}")

    deadline = localized(first(x, "offerDeadline", "deadline"))
    details_url = f"https://www.simap.ch/de/project-detail/{project_id}" if project_id else ""

    return {
        "id": project_id or publication_id or title,
        "projectId": project_id,
        "publicationId": publication_id,
        "title": title,
        "buyer": buyer,
        "location": location,
        "type": ptype,
        "deadline": deadline,
        "deadlineDays": 30,
        "value": 0,
        "text": " · ".join(text_parts),
        "url": details_url,
        "raw": x,
    }


def fetch_seed(opener, seed):
    params = urllib.parse.urlencode({"lang": "de", "search": seed})
    req = urllib.request.Request(
        f"{BASE}?{params}",
        headers={"Accept": "application/json", "User-Agent": "TenderHawk/0.6 (+GitHub Pages pilot)"},
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
