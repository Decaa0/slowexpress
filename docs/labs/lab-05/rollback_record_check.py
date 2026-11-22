#!/usr/bin/env python3
"""Lab 5.8 helper: create a record on the live app, then prove it is still there after each step.

  python3 rollback_record_check.py create --url https://<service>.run.app --table <tableCode> [--email alice@demo.test]
  python3 rollback_record_check.py verify --url https://<service>.run.app --label "after rollback to A"

`create` signs in as a demo member (password typed at a hidden prompt, never stored), places one order
named RB58-<time>, and saves the order id and the login token next to this script (rollback_record_state.json).
`verify` checks that the server is ready, that the saved login still works (still signed in), and that
the order is still there with the same name and total. It appends a PASS/FAIL line you can paste into issue #24.
Standard library only. Exit code 1 if any check fails.
"""
import argparse, getpass, json, os, sys, time, urllib.error, urllib.request

STATE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "rollback_record_state.json")


def call(base, path, method="GET", body=None, token=None):
    req = urllib.request.Request(
        base.rstrip("/") + path, method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"Content-Type": "application/json", "User-Agent": "lab5-issue58",
                 **({"Authorization": "Bearer " + token} if token else {})})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            raw = r.read()
            return r.status, (json.loads(raw) if raw else {})
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, {"raw": raw[:200].decode("utf-8", "replace")}
    except Exception as e:  # network error
        return 0, {"error": str(e)}


def create(a):
    pw = os.environ.get("ISSUE58_PASSWORD") or getpass.getpass(f"Password for {a.email} (hidden): ")
    s, r = call(a.url, "/api/auth/login", "POST", {"email": a.email, "password": pw})
    if s != 200:
        sys.exit(f"login failed: HTTP {s}")
    token = r["token"]
    s, menu = call(a.url, f"/api/menu?tableCode={a.table}", token=token)
    if s != 200 or not menu.get("categories"):
        sys.exit(f"menu failed: HTTP {s} (is the table code right, and was the database seeded?)")
    drink = menu["categories"][0]["items"][0]
    name = "RB58-" + time.strftime("%H%M%S")
    s, o = call(a.url, "/api/orders", "POST",
                {"tableCode": a.table, "callName": name, "items": [{"menuItemId": drink["id"], "quantity": 1, "toppingIds": []}]}, token)
    if s != 201:
        sys.exit(f"order failed: HTTP {s} {o}")
    state = {"url": a.url, "email": a.email, "token": token, "order_id": o["id"], "call_name": name,
             "total_cents": o["totalCents"], "drink": drink["name"], "created_at": time.strftime("%Y-%m-%d %H:%M:%S"), "checks": []}
    json.dump(state, open(STATE, "w"), indent=1)
    print(f"Created order {o['id']} '{name}' ({drink['name']}, total {o['totalCents']/100:g} baht).")
    print(f"Write this down: order id {o['id']}, name {name}. Saved to {STATE}")


def verify(a):
    if not os.path.exists(STATE):
        sys.exit("No saved record. Run 'create' first.")
    st = json.load(open(STATE))
    base = a.url or st["url"]
    results = []
    s, r = call(base, "/api/ready"); results.append(("server ready", s == 200 and r.get("db") == "connected", f"HTTP {s}"))
    s, r = call(base, "/api/auth/me", token=st["token"]); results.append(("still signed in (saved login accepted)", s == 200 and r.get("email") == st["email"], f"HTTP {s}"))
    s, r = call(base, f"/api/orders/{st['order_id']}", token=st["token"])
    same = s == 200 and r.get("callName") == st["call_name"] and r.get("totalCents") == st["total_cents"]
    results.append((f"order {st['order_id'][:8]}… still there, same name and total", same, f"HTTP {s}"))
    ok = all(x[1] for x in results)
    stamp = time.strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{stamp}] {a.label or 'check'}: {'PASS' if ok else 'FAIL'}"
    print(line)
    for n, good, d in results:
        print(f"  {'PASS' if good else 'FAIL'}  {n}  ({d})")
    st["checks"].append(line)
    json.dump(st, open(STATE, "w"), indent=1)
    sys.exit(0 if ok else 1)


p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
sub = p.add_subparsers(dest="cmd", required=True)
c = sub.add_parser("create"); c.add_argument("--url", required=True); c.add_argument("--table", required=True); c.add_argument("--email", default="alice@demo.test"); c.set_defaults(f=create)
v = sub.add_parser("verify"); v.add_argument("--url"); v.add_argument("--label"); v.set_defaults(f=verify)
a = p.parse_args(); a.f(a)
