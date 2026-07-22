#!/usr/bin/env bash
set -euo pipefail

BASE="http://localhost:3000/imports"
FIXTURES="/home/abduln/Projects/identity-access-graph/test-fixtures"

echo "=== Upload ==="
UPLOAD=$(curl -s -X POST "$BASE/upload" \
  -F "files=@$FIXTURES/users.csv" \
  -F "files=@$FIXTURES/groups.csv" \
  -F "files=@$FIXTURES/roles.csv" \
  -F "files=@$FIXTURES/permissions.csv" \
  -F "files=@$FIXTURES/applications.csv" \
  -F "files=@$FIXTURES/databases.csv" \
  -F "files=@$FIXTURES/hosts.csv")

IMPORT_ID=$(echo "$UPLOAD" | python3 -c "import json,sys; print(json.load(sys.stdin).get('importId',''))")
echo "Import ID: $IMPORT_ID"

# Get file IDs
SESSION=$(curl -s "$BASE/$IMPORT_ID")
FILES_JSON=$(echo "$SESSION" | python3 -c "
import json,sys
d=json.load(sys.stdin)
for f in d['files']:
    print(f'{f[\"id\"]} {f[\"originalName\"]}')
")

# Build file ID map
declare -A FILES
while IFS=' ' read -r id name; do
    FILES["$name"]="$id"
done <<< "$FILES_JSON"

echo "=== Classify ==="
classify() {
    local fid=$1 type=$2
    curl -s -X POST "$BASE/$IMPORT_ID/classify" \
      -H "Content-Type: application/json" \
      -d "{\"fileId\":\"$fid\",\"sheetIndex\":0,\"type\":\"$type\"}" > /dev/null
    echo "  $type OK"
}
classify "${FILES[users.csv]}" "Users"
classify "${FILES[groups.csv]}" "Groups"
classify "${FILES[roles.csv]}" "Roles"
classify "${FILES[permissions.csv]}" "Permissions"
classify "${FILES[applications.csv]}" "Applications"
classify "${FILES[databases.csv]}" "Databases"
classify "${FILES[hosts.csv]}" "Computers"

echo "=== Fix mappings ==="
fix_mapping() {
    local fid=$1
    shift
    local overrides="["
    local sep=""
    for entry in "$@"; do
        local col="${entry%%:*}"
        local tgt="${entry#*:}"
        overrides+="$sep{\"sourceColumn\":\"$col\",\"targetField\":\"$tgt\",\"ignored\":false}"
        sep=","
    done
    overrides+="]"
    curl -s -X PUT "$BASE/$IMPORT_ID/files/$fid/sheets/0/mappings" \
      -H "Content-Type: application/json" \
      -d "{\"overrides\":$overrides}" > /dev/null
    for entry in "$@"; do
        local col="${entry%%:*}"
        local tgt="${entry#*:}"
        echo "  ${FILES_JSON##*${FILES[$col]}*} -> $col -> $tgt (approx)"
    done
}

# Actually use Python since bash is awkward
python3 << PYEOF
import json, subprocess, sys

BASE = "$BASE"
IMPORT_ID = "$IMPORT_ID"
session = json.loads(subprocess.run(["curl", "-s", f"{BASE}/{IMPORT_ID}"], capture_output=True, text=True).stdout)
files = {f["originalName"]: f["id"] for f in session["files"]}

def put_mappings(fname, overrides):
    fid = files[fname]
    r = json.loads(subprocess.run(
        ["curl", "-s", "-X", "PUT", f"{BASE}/{IMPORT_ID}/files/{fid}/sheets/0/mappings",
         "-H", "Content-Type: application/json", "-d", json.dumps({"overrides": overrides})],
        capture_output=True, text=True).stdout)
    for ov in overrides:
        actual = next((m["targetField"] for m in r.get("mappings", []) if m["sourceColumn"] == ov["sourceColumn"]), "?")
        print(f"  {fname}: {ov['sourceColumn']} -> {actual}")

fixes = {
    "groups.csv": [{"sourceColumn": "role", "targetField": "role", "ignored": False}],
    "roles.csv": [
        {"sourceColumn": "roleName", "targetField": "roleName", "ignored": False},
        {"sourceColumn": "permission", "targetField": "permission", "ignored": False},
    ],
    "permissions.csv": [{"sourceColumn": "permissionName", "targetField": "permissionName", "ignored": False}],
    "applications.csv": [{"sourceColumn": "uses", "targetField": "uses", "ignored": False}],
}
for fname, overrides in fixes.items():
    put_mappings(fname, overrides)
PYEOF

echo "=== Validate ==="
python3 << PYEOF
import json, subprocess
BASE = "$BASE"
IMPORT_ID = "$IMPORT_ID"
session = json.loads(subprocess.run(["curl", "-s", f"{BASE}/{IMPORT_ID}"], capture_output=True, text=True).stdout)
files = {f["originalName"]: f["id"] for f in session["files"]}
for name, fid in files.items():
    r = json.loads(subprocess.run(
        ["curl", "-s", "-X", "POST", f"{BASE}/{IMPORT_ID}/validate",
         "-H", "Content-Type: application/json", "-d", json.dumps({"fileId": fid, "sheetIndex": 0})],
        capture_output=True, text=True).stdout)
    issues = sum(len(v) for v in r.get("errors", {}).values())
    print(f"  {name}: {issues} issues")
PYEOF

echo "=== Correlate ==="
curl -s -X POST "$BASE/$IMPORT_ID/correlate" | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'  Groups: {len(d.get(\"groups\",[]))}')"

echo "=== Convert ==="
curl -s -X POST "$BASE/$IMPORT_ID/convert" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print(f'  Nodes: {d.get(\"nodesCreated\",0)}')
print(f'  Relationships: {d.get(\"relationshipsCreated\",0)}')
for k,v in sorted(d.get('nodeTypeCounts',{}).items()):
    print(f'    {k}: {v}')
for k,v in sorted(d.get('relationshipTypeCounts',{}).items()):
    print(f'    {k}: {v}')
"

echo "=== Persist ==="
curl -s -X POST "$BASE/$IMPORT_ID/persist" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print(f'  Nodes: {d.get(\"nodesUpserted\",0)}')
print(f'  Relationships: {d.get(\"relationshipsUpserted\",0)}')
if d.get('warning'): print(f'  Note: {d[\"warning\"]}')
"

sleep 2
echo ""
echo "=== Stats ==="
curl -s http://localhost:3000/graph/stats | python3 -m json.tool 2>/dev/null

echo ""
echo "=== DONE ==="