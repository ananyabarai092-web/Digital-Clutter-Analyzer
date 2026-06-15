import json, urllib.request, time

for url, name in [
    ('http://localhost:8000/api/cleanup/old-files?min_age_days=90&skip=0&limit=25', 'old-files'),
    ('http://localhost:8000/api/cleanup/large-files?min_size_mb=100&skip=0&limit=25', 'large-files'),
    ('http://localhost:8000/api/cleanup/security-files', 'security-files'),
    ('http://localhost:8000/api/dashboard', 'dashboard'),
]:
    start = time.time()
    resp = urllib.request.urlopen(url)
    d = json.loads(resp.read())
    elapsed = time.time() - start
    if isinstance(d, dict) and 'files' in d:
        print(f"{name}: {d['total']} total, {len(d['files'])} returned, took {elapsed:.3f}s")
    elif isinstance(d, dict) and 'total' in d:
        print(f"{name}: {d['total']} total, took {elapsed:.3f}s")
    else:
        print(f"{name}: keys={list(d.keys())[:5]}, took {elapsed:.3f}s")