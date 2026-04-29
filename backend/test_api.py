import urllib.request, json

print("Testing OR-Tools solver with new constraints...")
r = urllib.request.urlopen('http://localhost:8000/api/solve/ortools')
d = json.loads(r.read())
print(f"Status: {d['status']}")
print(f"Solve time: {d.get('solve_time', 'N/A')}s")
if d['status'] == 'success':
    print(f"\nScheduled {len(d['schedule'])} exams:")
    day_counts = {'Thu': 0, 'Fri': 0, 'Mon': 0}
    for entry in d['schedule']:
        day = entry['slot']['day']
        day_counts[day] += 1
        print(f"  {entry['exam']['name']:40s} | {day} {entry['slot']['time']:15s} | {entry['room']['name']}")
    print(f"\nDistribution: {day_counts}")
else:
    print(f"FAILED: {d}")
