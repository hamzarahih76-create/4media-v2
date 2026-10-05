#!/usr/bin/env python3
"""Higgsfield API generation with a hard budget. Auth is injected by the environment's API credential
(Authorization: Key id:secret on *.higgsfield.ai) - no key in code or env.

usage: python3 scripts/hf_gen.py <model> <out_file> '<json params>' [--max-usd 0.25]
       python3 scripts/hf_gen.py --fetch <request_id> <out_file>   (re-download a finished job, no charge)
  e.g. hf_gen.py higgsfield-ai/soul/v2/standard public/media/ghita/hf_window.png '{"prompt":"...","aspect_ratio":"1:1"}'
Every call: free /estimate first, refuse if over --max-usd or over the spend log budget; log to media/hf_spend.log.
"""
import json
import pathlib
import sys
import time
import urllib.request

API = "https://api.higgsfield.ai"
LOG = pathlib.Path(__file__).resolve().parent.parent / "media" / "hf_spend.log"


def call(method, url, body=None):
    req = urllib.request.Request(url, method=method, data=json.dumps(body).encode() if body is not None else None,
                                 headers={"Content-Type": "application/json", "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())


def fetch(rid, out):
    st = call("GET", f"{API}/requests/{rid}/status")
    while st["status"] in ("queued", "in_progress"):
        time.sleep(4)
        st = call("GET", f"{API}/requests/{rid}/status")
    if st["status"] != "completed":
        sys.exit(f"{st['status']}: {st.get('error')}")
    media = (st.get("images") or [None])[0] or st.get("video")
    out.parent.mkdir(parents=True, exist_ok=True)
    urllib.request.urlretrieve(media["url"], out)
    print("saved", out)


if sys.argv[1] == "--fetch":
    fetch(sys.argv[2], pathlib.Path(sys.argv[3]))
    sys.exit()

args = [a for a in sys.argv[1:] if not a.startswith("--max-usd")]
max_usd = float(next((a.split("=")[1] for a in sys.argv if a.startswith("--max-usd=")), "0.25"))
model, out, params = args[0], pathlib.Path(args[1]), json.loads(args[2])

est = call("POST", f"{API}/estimate/{model}", params)
usd = float(est["usd"])
print(f"estimate {model}: ${usd} ({est['credits']} credits)")
if usd > max_usd:
    sys.exit(f"refused: ${usd} > max ${max_usd}")

job = call("POST", f"{API}/{model}", params)
print("submitted", job["request_id"])
LOG.parent.mkdir(exist_ok=True)
with LOG.open("a") as f:
    f.write(f"{time.strftime('%F %T')}\t{model}\t${usd}\t{job['request_id']}\t{out}\n")

fetch(job["request_id"], out)
