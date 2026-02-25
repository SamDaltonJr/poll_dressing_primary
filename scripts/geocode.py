"""
Batch geocode Election Day polling locations using the US Census Bureau Geocoding API.
Reads the CSV extracted from the Excel spreadsheet and generates a TypeScript file
with all successfully geocoded locations.

Usage:  python scripts/geocode.py
"""

import csv
import json
import time
import urllib.request
import urllib.parse
import sys
import os

CSV_PATH = r"C:\Users\spdal\.claude\projects\C--Users-spdal-Documents-big-sign-mapper\e1467287-0cd9-4430-bc2f-1babae0fd98c\tool-results\b530f37.txt"

OUTPUT_PATH = os.path.join(
    os.path.dirname(__file__), "..", "src", "config", "electionDayLocations.ts"
)
OUTPUT_PATH = os.path.normpath(OUTPUT_PATH)

CENSUS_GEOCODER_URL = (
    "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress"
)


def geocode_address(address: str) -> tuple[float, float] | None:
    """Geocode a single address using the US Census Bureau API. Returns (lat, lon) or None."""
    params = urllib.parse.urlencode(
        {"address": address, "benchmark": "Public_AR_Current", "format": "json"}
    )
    url = f"{CENSUS_GEOCODER_URL}?{params}"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "BigSignMapper/1.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode())
            matches = data.get("result", {}).get("addressMatches", [])
            if matches:
                coords = matches[0]["coordinates"]
                return (coords["y"], coords["x"])  # lat, lon
    except Exception as e:
        print(f"  ERROR: {e}", file=sys.stderr)
    return None


def read_csv(path: str) -> list[dict]:
    """Read the polling locations CSV."""
    rows = []
    with open(path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)
    return rows


def escape_ts_string(s: str) -> str:
    """Escape single quotes for TypeScript strings."""
    return s.replace("\\", "\\\\").replace("'", "\\'")


def main():
    print(f"Reading CSV from: {CSV_PATH}")
    rows = read_csv(CSV_PATH)
    print(f"Found {len(rows)} polling locations to geocode.\n")

    results = []
    failed = []

    for i, row in enumerate(rows):
        county = row.get("County", "").strip()
        vc = row.get("VC#", "").strip()
        name = row.get("Location Name", "").strip()
        address = row.get("Address", "").strip()
        city = row.get("City", "").strip()
        zipcode = row.get("ZIP", "").strip()

        full_address = f"{address}, {city}, TX {zipcode}"
        print(f"[{i+1}/{len(rows)}] {name} — {full_address} ... ", end="", flush=True)

        coords = geocode_address(full_address)
        if coords:
            lat, lon = coords
            print(f"OK ({lat:.5f}, {lon:.5f})")
            results.append(
                {
                    "id": f"ed-{vc}",
                    "county": county,
                    "label": name,
                    "address": full_address,
                    "latitude": round(lat, 5),
                    "longitude": round(lon, 5),
                }
            )
        else:
            print("FAILED")
            failed.append({"vc": vc, "name": name, "address": full_address})

        # Rate-limit: 0.2s between requests
        time.sleep(0.2)

    print(f"\n--- DONE ---")
    print(f"Geocoded: {len(results)} / {len(rows)}")
    print(f"Failed:   {len(failed)}")

    if failed:
        print("\nFailed locations:")
        for f in failed:
            print(f"  {f['vc']}: {f['name']} — {f['address']}")

    # Write TypeScript file
    print(f"\nWriting TypeScript file to: {OUTPUT_PATH}")
    with open(OUTPUT_PATH, "w", encoding="utf-8") as out:
        out.write("import type { MapMarker } from '../types';\n\n")
        out.write(
            "// Auto-generated from North_TX_Election_Day_Polling_Sites.xlsx\n"
        )
        out.write(
            f"// Geocoded {len(results)} of {len(rows)} addresses using US Census Bureau API\n\n"
        )
        out.write("const electionDayLocations: MapMarker[] = [\n")

        for r in results:
            out.write("  {\n")
            out.write(f"    id: '{escape_ts_string(r['id'])}',\n")
            out.write(f"    type: 'electionDay',\n")
            out.write(f"    label: '{escape_ts_string(r['label'])}',\n")
            out.write(f"    address: '{escape_ts_string(r['address'])}',\n")
            out.write(f"    latitude: {r['latitude']},\n")
            out.write(f"    longitude: {r['longitude']},\n")
            out.write("  },\n")

        out.write("];\n\n")
        out.write("export default electionDayLocations;\n")

    print("Done!")


if __name__ == "__main__":
    main()
