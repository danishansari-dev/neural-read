import urllib.request
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

url = "https://api.github.com/repos/danishansari-dev/neural-read/actions/runs"
req = urllib.request.Request(url)
req.add_header('Accept', 'application/vnd.github.v3+json')

try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        if data['total_count'] > 0:
            latest = data['workflow_runs'][0]
            print(f"Name: {latest['name']}")
            print(f"Status: {latest['status']}")
            print(f"Conclusion: {latest['conclusion']}")
            print(f"URL: {latest['html_url']}")
        else:
            print("No workflow runs found.")
except Exception as e:
    print(f"Error checking status: {e}")
