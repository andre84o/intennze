#!/usr/bin/env python3
"""Minimal Supabase keepalive for the Intennze free project."""

import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request


def main() -> int:
    base_url = (os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL") or "").rstrip("/")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

    if not base_url or not service_key:
        print("Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY", file=sys.stderr)
        return 2

    query = urllib.parse.urlencode({"select": "id", "limit": "1"})
    url = f"{base_url}/rest/v1/domain_pricing_rules?{query}"
    request = urllib.request.Request(
        url,
        headers={
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Accept": "application/json",
        },
        method="GET",
    )

    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            body = response.read().decode("utf-8")
            data = json.loads(body)
            if not isinstance(data, list):
                raise ValueError("Unexpected Supabase response")
            print(f"Supabase keepalive OK ({response.status})")
            return 0
    except (urllib.error.URLError, urllib.error.HTTPError, json.JSONDecodeError, ValueError) as exc:
        print(f"Supabase keepalive failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
