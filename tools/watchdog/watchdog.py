#!/usr/bin/env python3
"""Slow Express watchdog.

Polls the GitHub repo, and the moment something happens (PR review, comment,
merge, close, new PR) it
  1. pops a macOS notification + sound,
  2. asks NVIDIA NIM (the ONLY model used) for a one-line summary and, when the
     reviewer wrote something, 2-3 short answer choices,
  3. saves everything to events.log / drafts/ so you can pick a reply.

It NEVER posts, merges, pushes or edits anything on GitHub (read-only).
Stdlib only. Run:  python3 watchdog.py            (loop)
                   python3 watchdog.py --once     (one poll, for testing)
"""
import json, os, subprocess, sys, time, urllib.request, urllib.error
from pathlib import Path

HERE = Path(__file__).resolve().parent
STATE = Path(os.environ.get("WATCH_STATE", HERE / "state.json"))
LOG = Path(os.environ.get("WATCH_LOG", HERE / "events.log"))
DRAFTS = Path(os.environ.get("WATCH_DRAFTS", HERE / "drafts"))
REPO = os.environ.get("WATCH_REPO", "Decaa0/slowexpress")
INTERVAL = int(os.environ.get("WATCH_INTERVAL", "30"))
NIM_URL = "https://integrate.api.nvidia.com/v1/chat/completions"
NIM_MODEL = os.environ.get("NIM_MODEL", "nvidia/nemotron-3-ultra-550b-a55b")
# the token already lives in the git remote of the TokTickIT repo (same account)
TOKEN_REPO = os.environ.get("TOKEN_REPO", "/Users/yoswat/Downloads/toktickit")
ENV_FILE = Path.home() / ".hermes/profiles/homework/.env"

# order of work: when a PR merges, this is what comes next
NEXT_UP = {"1.3": "1.4", "1.4": "1.5", "1.5": "1.6", "1.6": "release PR into main"}


def github_token():
    url = subprocess.check_output(["git", "-C", TOKEN_REPO, "remote", "get-url", "origin"]).decode().strip()
    return url.split("@")[0].rsplit(":", 1)[1]


def nim_key():
    if os.environ.get("NVIDIA_API_KEY"):
        return os.environ["NVIDIA_API_KEY"]
    for line in ENV_FILE.read_text().splitlines():
        if line.startswith("NVIDIA_API_KEY="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise SystemExit("NVIDIA_API_KEY not found")


def gh(path):
    req = urllib.request.Request("https://api.github.com" + path, headers={
        "Authorization": "token " + github_token(), "Accept": "application/vnd.github+json", "User-Agent": "slowexpress-watchdog"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())


def nim(prompt, max_tokens=400):
    body = json.dumps({"model": NIM_MODEL, "max_tokens": max_tokens, "temperature": 0.3, "messages": [
        {"role": "system", "content": "You help a solo student who owns this GitHub repo. Be short, plain, no markdown headings. Never claim to have posted anything."},
        {"role": "user", "content": prompt}]}).encode()
    req = urllib.request.Request(NIM_URL, data=body, headers={"Authorization": "Bearer " + nim_key(), "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
            return json.loads(r.read())["choices"][0]["message"].get("content", "").strip()
    except Exception as e:  # NIM down must never stop the watchdog
        return f"(NIM unavailable: {e})"


def notify(title, message):
    esc = lambda s: s.replace("\\", "\\\\").replace('"', '\\"')
    subprocess.run(["osascript", "-e", f'display notification "{esc(message[:200])}" with title "{esc(title)}" sound name "Glass"'])


def log(line, show=False):
    """Always written to events.log. Printed to stdout only for real events:
    when run by the Hermes scheduler (no_agent), stdout IS the message you get;
    empty stdout means nothing is sent."""
    stamp = time.strftime("%Y-%m-%d %H:%M:%S")
    with LOG.open("a") as f:
        f.write(f"[{stamp}] {line}\n")
    if show or "--loop" in sys.argv:
        print(f"[{stamp}] {line}", flush=True)


def snapshot():
    """Everything we watch, reduced to comparable facts."""
    snap = {"prs": {}, "issues": {}}
    for pr in gh(f"/repos/{REPO}/pulls?state=all&per_page=50"):
        n = pr["number"]
        reviews = gh(f"/repos/{REPO}/pulls/{n}/reviews")
        comments = gh(f"/repos/{REPO}/issues/{n}/comments")
        lines = gh(f"/repos/{REPO}/pulls/{n}/comments")
        snap["prs"][str(n)] = {
            "title": pr["title"], "state": pr["state"], "merged": bool(pr.get("merged_at")),
            "merged_by": (pr.get("merged_by") or {}).get("login") if pr.get("merged_at") else None,
            "reviews": {str(r["id"]): {"user": r["user"]["login"], "state": r["state"], "body": r["body"] or ""} for r in reviews},
            "comments": {str(c["id"]): {"user": c["user"]["login"], "body": c["body"]} for c in comments + lines},
        }
    for i in gh(f"/repos/{REPO}/issues?state=all&per_page=50"):
        if "pull_request" not in i:
            snap["issues"][str(i["number"])] = {"title": i["title"], "state": i["state"]}
    return snap


def sprint_of(title):
    import re
    m = re.search(r"Sprint (1\.\d)", title)
    return m.group(1) if m else None


def diff(old, new):
    events = []
    for n, pr in new["prs"].items():
        o = old["prs"].get(n)
        label = f"PR #{n} ({pr['title'][:60]})"
        if o is None:
            events.append(("new_pr", n, f"New {label}", ""))
            continue
        if pr["merged"] and not o["merged"]:
            events.append(("merged", n, f"MERGED: {label} by {pr['merged_by']}", ""))
        elif pr["state"] == "closed" and o["state"] == "open" and not pr["merged"]:
            events.append(("closed", n, f"Closed without merge: {label}", ""))
        for rid, r in pr["reviews"].items():
            if rid not in o["reviews"] or o["reviews"][rid]["state"] != r["state"]:
                events.append(("review", n, f"{r['user']} {r['state']} {label}", r["body"]))
        for cid, c in pr["comments"].items():
            if cid not in o["comments"] and c["user"] != "Decaa0":
                events.append(("comment", n, f"{c['user']} commented on {label}", c["body"]))
    for n, i in new["issues"].items():
        o = old["issues"].get(n)
        if o and o["state"] != i["state"]:
            events.append(("issue", n, f"Issue #{n} is now {i['state']}: {i['title'][:60]}", ""))
    return events


def handle(kind, n, headline, body):
    summary = ""
    if kind == "merged":
        sp = sprint_of(headline)
        nxt = NEXT_UP.get(sp) if sp else None
        summary = f"Next step: {'start Sprint ' + nxt if nxt and nxt[0].isdigit() else nxt or 'check the board'}. Tell Hermes 'it merged, go next'."
    elif kind in ("review", "comment") and body.strip() and os.environ.get("WATCH_NIM_SUMMARY", "1") == "1":
        summary = nim(
            f"The reviewer wrote this on a pull request of my project:\n\n{body}\n\n"
            "1) In one short line, say what they want (approval, a question, or a fix). "
            "2) Then give exactly 3 short reply options for me to choose from, numbered A, B, C. "
            "If they asked for a fix, make option C 'fix it' and say what I would change. Plain words.")
    elif kind == "new_pr":
        summary = "A new PR was opened."
    notify("Slow Express", headline)
    msg = f"SLOW EXPRESS WATCHDOG: {headline}"
    if body.strip():
        msg += f"\n\nThey wrote:\n{body.strip()[:1200]}"
    if summary:
        msg += f"\n\nNIM says:\n{summary}"
    log(msg, show=True)
    if summary or body:
        DRAFTS.mkdir(exist_ok=True)
        p = DRAFTS / f"{time.strftime('%Y%m%d-%H%M%S')}-pr{n}-{kind}.txt"
        p.write_text(f"{headline}\n\n--- what was written ---\n{body}\n\n--- NIM ({NIM_MODEL}) ---\n{summary}\n")


def main():
    once = "--loop" not in sys.argv  # default = one poll (the Hermes scheduler calls it every few minutes)
    DRAFTS.mkdir(exist_ok=True)
    old = json.loads(STATE.read_text()) if STATE.exists() else None
    while True:
        try:
            new = snapshot()
            if old is None:
                log(f"baseline taken: {len(new['prs'])} PRs, {len(new['issues'])} issues. Watching {REPO}.")
            else:
                for ev in diff(old, new):
                    handle(*ev)
            STATE.write_text(json.dumps(new))
            old = new
        except urllib.error.HTTPError as e:
            log(f"GitHub error {e.code}; retrying")
        except Exception as e:
            log(f"poll failed: {e}; retrying")
        if once:
            return
        time.sleep(INTERVAL)


if __name__ == "__main__":
    main()
