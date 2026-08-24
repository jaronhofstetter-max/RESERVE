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
SEEDS = ["Sanitär","Heizung","Lüftung","Gebäudeautomation","Elektro","Bau","Reinigung","Lieferung"]
OUT = Path("data/projects.json")

def localized(value, default=""):
    if value in (None, ""): return default
    if isinstance(value, str): return value.strip() or default
    if isinstance(value, dict):
        for lang in ("de","fr","it","en"):
            text=value.get(lang)
            if isinstance(text,str) and text.strip(): return text.strip()
        for text in value.values():
            if isinstance(text,str) and text.strip(): return text.strip()
        return default
    if isinstance(value,(int,float)): return str(value)
    return default

def first(obj,*keys,default=""):
    for key in keys:
        value=obj.get(key) if isinstance(obj,dict) else None
        if value not in (None,""): return value
    return default

def nested(obj,*path,default=""):
    cur=obj
    for key in path:
        if not isinstance(cur,dict) or key not in cur: return default
        cur=cur[key]
    return cur if cur not in (None,"") else default

def parse_dt(value):
    if not value: return None
    s=str(value).strip().replace("Z","+00:00")
    try:
        dt=datetime.fromisoformat(s)
        if dt.tzinfo is None: dt=dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except ValueError:
        for fmt in ("%Y-%m-%d","%d.%m.%Y"):
            try: return datetime.strptime(s[:10],fmt).replace(tzinfo=timezone.utc)
            except ValueError: pass
    return None

def normalize(x, now):
    title=localized(first(x,"projectTitle","title","name"),"SIMAP Projekt")
    buyer=localized(first(x,"procOfficeName","buyerName","issuedByOrganizationName"),"Öffentlicher Auftraggeber")
    city=localized(nested(x,"orderAddress","city"))
    canton=localized(nested(x,"orderAddress","cantonId"))
    location=city or canton or localized(first(x,"orderAddressDescription"),"Schweiz")
    ptype=localized(first(x,"projectSubType","newestPubType","publicationType"),"Publikation")
    project_id=localized(first(x,"projectId","id"))
    publication_id=localized(first(x,"currentPublicationId","publicationId","newestPublicationId"))
    text_parts=[]
    for key in ("projectDescription","description","objectDescription","procurementDescription","shortDescription","subject"):
        text=localized(x.get(key) if isinstance(x,dict) else None)
        if text and text not in text_parts: text_parts.append(text)
    if not text_parts:
        text_parts=[title]
        if buyer!="Öffentlicher Auftraggeber": text_parts.append(f"Auftraggeber: {buyer}")
        process_type=localized(first(x,"processType"))
        project_number=localized(first(x,"projectNumber","publicationNumber"))
        if process_type: text_parts.append(f"Verfahren: {process_type}")
        if project_number: text_parts.append(f"Projekt-Nr.: {project_number}")
    deadline=localized(first(x,"offerDeadline","deadline"))
    deadline_dt=parse_dt(deadline)
    deadline_days=max(0,(deadline_dt-now).days) if deadline_dt else 30
    status="active" if not deadline_dt or deadline_dt>=now else "expired"
    details_url=f"https://www.simap.ch/de/project-detail/{project_id}" if project_id else ""
    return {"id":project_id or publication_id or title,"projectId":project_id,"publicationId":publication_id,
      "title":title,"buyer":buyer,"location":location,"type":ptype,"deadline":deadline,
      "deadlineDays":deadline_days,"status":status,"value":0,"text":" · ".join(text_parts),
      "url":details_url,"raw":x}

def fetch_seed(opener,seed):
    params=urllib.parse.urlencode({"lang":"de","search":seed})
    req=urllib.request.Request(f"{BASE}?{params}",headers={"Accept":"application/json","User-Agent":"TenderHawk/0.7 (+GitHub Pages pilot)"})
    with opener.open(req,timeout=30) as r: payload=json.load(r)
    if isinstance(payload,list): return payload
    if isinstance(payload,dict):
        for key in ("items","content","results","projects","entries"):
            if isinstance(payload.get(key),list): return payload[key]
    return []

def main():
    now=datetime.now(timezone.utc)
    old={}
    if OUT.exists():
        try:
            previous=json.loads(OUT.read_text(encoding="utf-8"))
            old={str(x.get("id")):x for x in previous.get("projects",[]) if x.get("id")}
        except Exception: pass
    jar=http.cookiejar.CookieJar()
    opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar),urllib.request.HTTPSHandler(context=ssl.create_default_context()))
    merged={}; errors=[]
    for seed in SEEDS:
        try:
            for raw in fetch_seed(opener,seed):
                item=normalize(raw,now); merged[str(item["id"])]=item
        except Exception as exc: errors.append({"seed":seed,"error":f"{type(exc).__name__}: {exc}"})
        time.sleep(.3)
    if not merged: raise SystemExit("No projects fetched; refusing to publish an empty snapshot")
    for pid,item in merged.items():
        prev=old.get(pid,{})
        item["firstSeen"]=prev.get("firstSeen") or now.isoformat()
        item["lastSeen"]=now.isoformat()
        item["isNew"]=pid not in old
    projects=list(merged.values())
    projects.sort(key=lambda x:(x.get("status")!="active",x.get("deadline") or "9999",x.get("title") or ""))
    active=sum(1 for x in projects if x["status"]=="active")
    expired=len(projects)-active
    payload={"generatedAt":now.isoformat(),"source":"simap.ch public API","count":len(projects),
      "activeCount":active,"expiredCount":expired,"newCount":sum(1 for x in projects if x["isNew"]),
      "seeds":SEEDS,"errors":errors,"projects":projects}
    OUT.parent.mkdir(parents=True,exist_ok=True)
    OUT.write_text(json.dumps(payload,ensure_ascii=False,indent=2),encoding="utf-8")
    print(f"Wrote {len(projects)} projects ({active} active, {expired} expired) to {OUT}")

if __name__=="__main__": main()
