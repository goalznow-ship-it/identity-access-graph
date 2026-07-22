#!/usr/bin/env bash
set -euo pipefail

BASE="http://localhost:3000/imports"
FIXTURES="/home/abduln/Projects/identity-access-graph/test-fixtures"

echo "=== Step 1: Upload all CSV files ==="
UPLOAD_RESPONSE=$(curl -s -X POST "$BASE/upload" \
  -F "files=@$FIXTURES/users.csv" \
  -F "files=@$FIXTURES/groups.csv" \
  -F "files=@$FIXTURES/roles.csv" \
  -F "files=@$FIXTURES/permissions.csv" \
  -F "files=@$FIXTURES/applications.csv" \
  -F "files=@$FIXTURES/databases.csv" \
  -F "files=@$FIXTURES/hosts.csv")

IMPORT_ID=$(echo "$UPLOAD_RESPONSE" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('importId',''))" 2>/dev/null || echo "")
if [ -z "$IMPORT_ID" ]; then
  echo "Upload failed. Response:"
  echo "$UPLOAD_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$UPLOAD_RESPONSE"
  exit 1
fi
echo "Import ID: $IMPORT_ID"

echo "=== Step 2: Classify datasets ==="
curl -s -X POST "$BASE/$IMPORT_ID/classify" | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'  Classified: {d}')" 2>/dev/null || echo "  Classify done"

echo "=== Step 3: Get suggested mappings ==="
curl -s "$BASE/$IMPORT_ID/mappings" | python3 -c "
import json,sys
d=json.load(sys.stdin)
for item in d:
    print(f'  {item.get(\"fileId\",\"?\")} sheet {item.get(\"sheetIndex\",0)} → {item.get(\"detectedType\",\"?\")}')
    for m in item.get('mappings',[]):
        print(f'    {m.get(\"sourceColumn\",\"?\")} → {m.get(\"targetField\",\"?\")}')
" 2>/dev/null

echo "=== Step 4: Accept auto-mappings (POST same mappings back) ==="
MAPPINGS=$(curl -s "$BASE/$IMPORT_ID/mappings")
curl -s -X POST "$BASE/$IMPORT_ID/mappings" -H "Content-Type: application/json" -d "$MAPPINGS" | python3 -c "import json,sys; print('  Mappings applied')" 2>/dev/null

echo "=== Step 5: Validate ==="
VALIDATION=$(curl -s -X POST "$BASE/$IMPORT_ID/validate")
ISSUES=$(echo "$VALIDATION" | python3 -c "import json,sys; d=json.load(sys.stdin); print(sum(len(v) for v in d.values()))" 2>/dev/null || echo "?")
echo "  Validation issues: $ISSUES"

echo "=== Step 6: Correlate identities ==="
curl -s -X POST "$BASE/$IMPORT_ID/correlate" | python3 -c "
import json,sys
d=json.load(sys.stdin)
s=d.get('summary',{})
print(f'  Matched: {s.get(\"matchedRecords\",0)} groups: {len(d.get(\"groups\",[]))}')
" 2>/dev/null

echo "=== Step 7: Convert to graph ==="
CONVERSION=$(curl -s -X POST "$BASE/$IMPORT_ID/convert")
echo "$CONVERSION" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print(f'  Nodes created: {d.get(\"nodesCreated\",0)}')
print(f'  Relationships created: {d.get(\"relationshipsCreated\",0)}')
nt = d.get('nodeTypeCounts',{})
for k,v in nt.items():
    print(f'    {k}: {v}')
rt = d.get('relationshipTypeCounts',{})
for k,v in rt.items():
    print(f'    {k}: {v}')
" 2>/dev/null

echo "=== Step 8: Persist the graph ==="
PERSIST=$(curl -s -X POST "$BASE/$IMPORT_ID/persist")
echo "$PERSIST" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print(f'  Storage mode: {d.get(\"storageMode\",\"?\")}')
print(f'  Nodes upserted: {d.get(\"nodesUpserted\",0)}')
print(f'  Relationships upserted: {d.get(\"relationshipsUpserted\",0)}')
print(f'  Duration: {d.get(\"durationMs\",0)}ms')
w = d.get('warning','')
if w: print(f'  Warning: {w}')
" 2>/dev/null

echo ""
echo "=== Verify after import ==="
sleep 2
curl -s http://localhost:3000/graph/stats | python3 -m json.tool 2>/dev/null
echo ""
echo "=== Import complete ==="
