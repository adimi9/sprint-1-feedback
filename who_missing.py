# who_missing.py
# Usage:
#   python3 who_missing.py "<responses.csv>" "<sprint-data.js>"
# Example:
#   python3 who_missing.py "Sprint 1 Feedback Form-68b904bdfedea2208c5b26ab.csv" "dashboard.js"

import sys, json, csv, re
from pathlib import Path

TEAM_COL = "Which Sprint team are you from?"

def load_csv_trimmed(csv_path: Path):
    text = csv_path.read_text(encoding="utf-8-sig")
    lines = text.splitlines()
    # Trim everything before the real header row that starts with "Response ID"
    try:
        hdr_idx = next(i for i, l in enumerate(lines) if l.strip().startswith("Response ID"))
    except StopIteration:
        raise SystemExit("Could not find header row starting with 'Response ID' in CSV.")
    trimmed = "\n".join(lines[hdr_idx:])
    # Python csv handles quotes/newlines
    return list(csv.DictReader(trimmed.splitlines()))

def extract_sprint_data(js_path: Path) -> dict:
    js = js_path.read_text(encoding="utf-8")
    # Capture: export const sprintData = { ... };
    m = re.search(r"export\s+const\s+sprintData\s*=\s*(\{.*?\});", js, flags=re.S)
    if not m:
        raise SystemExit('Could not find `export const sprintData = {...};` in JS file.')
    obj_str = m.group(1)
    # The object is JSON-compatible (quoted keys/strings). Parse with json.
    try:
        return json.loads(obj_str)
    except json.JSONDecodeError as e:
        # Helpful hint if trailing commas exist
        raise SystemExit(f"Failed to parse sprintData JSON from JS: {e}")

def flatten_teams(sprint_data: dict):
    """Return list of {'team','division','team_lead'} from sprintData."""
    out, seen = [], set()
    for div in sprint_data.get("divisions", []):
        div_name = div.get("name") or "—"
        for t in div.get("teams", []):
            name = (t.get("name") or "").strip()
            if not name or name in seen: 
                continue
            tl = t.get("teamLead") or {}
            division = tl.get("division") or div_name
            out.append({"team": name, "division": division, "team_lead": tl.get("name") or "—"})
            seen.add(name)
    return out

def main():
    if len(sys.argv) < 3:
        print('Usage: python3 who_missing.py "<responses.csv>" "<sprint-data.js>"')
        sys.exit(1)

    csv_path = Path(sys.argv[1])
    js_path  = Path(sys.argv[2])
    if not csv_path.exists(): raise SystemExit(f"CSV not found: {csv_path}")
    if not js_path.exists():  raise SystemExit(f"JS not found:  {js_path}")

    rows = load_csv_trimmed(csv_path)
    sprint = extract_sprint_data(js_path)
    all_teams = flatten_teams(sprint)

    responded = { (r.get(TEAM_COL) or "").strip() for r in rows if (r.get(TEAM_COL) or "").strip() }
    submitted = [t for t in all_teams if t["team"] in responded]
    missing   = [t for t in all_teams if t["team"] not in responded]

    # Summary
    print("\n=== Submission Coverage ===")
    print(f"Total teams:     {len(all_teams)}")
    print(f"Teams submitted: {len(submitted)}")
    print(f"Teams missing:   {len(missing)}\n")

    if not missing:
        print("🎉 All teams have at least one response.")
    else:
        # Group by division
        from collections import defaultdict
        by_div = defaultdict(list)
        for m in missing: by_div[m["division"]].append(m)

        print("Teams missing feedback (Team — Division — Team Lead):")
        for div in sorted(by_div):
            print(f"\n[{div}]")
            for m in sorted(by_div[div], key=lambda x: x["team"]):
                print(f"• {m['team']} — {m['division']} — TL: {m['team_lead']}")

    # Slack copy
    print("\n--- Slack Copy ---")
    if not missing:
        print("🎉 All teams covered.")
    else:
        for m in sorted(missing, key=lambda x: (x["division"], x["team"])):
            print(f"• {m['team']} — {m['division']} — TL: {m['team_lead']}")

    # Write CSV file
    out_path = csv_path.with_name("missing_teams.csv")
    with out_path.open("w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["Team", "Division", "Team Lead"])
        for m in sorted(missing, key=lambda x: (x["division"], x["team"])):
            w.writerow([m["team"], m["division"], m["team_lead"]])
    print(f"\nSaved: {out_path}")

if __name__ == "__main__":
    main()
