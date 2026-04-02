#!/usr/bin/env python3
"""
Search and download royalty-free sounds from Freesound API.

Usage:
    python search_sounds.py --query "whoosh transition" --license cc0 --output raws/audio/sfx/
    python search_sounds.py --query "corporate ambient" --min-duration 60 --output raws/audio/bgm/

Environment:
    FREESOUND_API_KEY - Required API key from freesound.org
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from urllib.parse import urlencode

import requests


def search_freesound(
    query: str,
    count: int = 5,
    license_filter: Optional[str] = None,
    min_duration: Optional[float] = None,
    max_duration: Optional[float] = None,
    page: int = 1,
) -> dict:
    """
    Search sounds on Freesound API.

    Args:
        query: Search keywords
        count: Number of results (max 150)
        license_filter: License type (cc0, cc-by, all)
        min_duration: Minimum duration in seconds
        max_duration: Maximum duration in seconds
        page: Results page number

    Returns:
        Search results with sound metadata
    """
    api_key = os.environ.get("FREESOUND_API_KEY")
    if not api_key:
        raise ValueError("FREESOUND_API_KEY environment variable not set")

    url = "https://freesound.org/apiv2/search/text/"

    # Build filter string
    filters = []
    if license_filter == "cc0":
        filters.append('license:"Creative Commons 0"')
    elif license_filter == "cc-by":
        filters.append('license:"Attribution"')

    if min_duration is not None or max_duration is not None:
        min_d = min_duration if min_duration is not None else 0
        max_d = max_duration if max_duration is not None else "*"
        filters.append(f"duration:[{min_d} TO {max_d}]")

    params = {
        "query": query,
        "token": api_key,
        "page_size": min(count, 150),
        "page": page,
        "fields": "id,name,description,duration,license,previews,username,tags,download",
    }

    if filters:
        params["filter"] = " ".join(filters)

    response = requests.get(url, params=params, timeout=30)
    response.raise_for_status()
    data = response.json()

    sounds = []
    for result in data.get("results", []):
        sounds.append({
            "id": str(result["id"]),
            "name": result.get("name", ""),
            "description": result.get("description", "")[:200],
            "duration": result.get("duration", 0),
            "license": result.get("license", ""),
            "username": result.get("username", ""),
            "tags": result.get("tags", [])[:10],
            "preview_url": result.get("previews", {}).get("preview-hq-mp3", ""),
            "download_url": result.get("download", ""),
        })

    return {
        "query": query,
        "source": "freesound",
        "total_results": data.get("count", 0),
        "page": page,
        "per_page": min(count, 150),
        "sounds": sounds,
    }


def download_sound(
    sound: dict,
    output_dir: str,
) -> Optional[str]:
    """
    Download a sound preview file (high-quality MP3).

    Args:
        sound: Sound metadata from search results
        output_dir: Directory to save file

    Returns:
        Path to downloaded file, or None if failed
    """
    url = sound.get("preview_url")
    ext = ".mp3"

    if not url:
        print(f"  No download URL for: {sound.get('name')}", file=sys.stderr)
        return None

    # Build filename
    safe_name = "".join(c if c.isalnum() or c in "._-" else "_" for c in sound.get("name", "sound"))
    filename = f"{sound['id']}_{safe_name[:50]}{ext}"
    output_path = Path(output_dir) / filename

    # Create directory
    output_path.parent.mkdir(parents=True, exist_ok=True)

    try:
        response = requests.get(url, stream=True, timeout=60)
        response.raise_for_status()

        with open(output_path, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)

        print(f"  Downloaded: {output_path}")
        return str(output_path)

    except Exception as e:
        print(f"  Failed to download {sound.get('name')}: {e}", file=sys.stderr)
        return None


def main():
    parser = argparse.ArgumentParser(
        description="Search and download sounds from Freesound API"
    )
    parser.add_argument(
        "--query", "-q", required=True,
        help="Search keywords (English recommended)"
    )
    parser.add_argument(
        "--count", "-c", type=int, default=5,
        help="Number of results (default: 5, max: 150)"
    )
    parser.add_argument(
        "--license", "-l",
        choices=["cc0", "cc-by", "all"],
        default="cc0",
        help="License filter (default: cc0)"
    )
    parser.add_argument(
        "--min-duration", type=float,
        help="Minimum duration in seconds"
    )
    parser.add_argument(
        "--max-duration", type=float,
        help="Maximum duration in seconds"
    )
    parser.add_argument(
        "--page", "-p", type=int, default=1,
        help="Results page number (default: 1)"
    )
    parser.add_argument(
        "--output", "-o",
        help="Download directory (if specified, downloads sounds)"
    )
    parser.add_argument(
        "--json-output",
        help="Save search results to JSON file"
    )

    args = parser.parse_args()

    try:
        # Search
        result = search_freesound(
            query=args.query,
            count=args.count,
            license_filter=args.license,
            min_duration=args.min_duration,
            max_duration=args.max_duration,
            page=args.page,
        )

        result["searched_at"] = datetime.now(tz=timezone.utc).isoformat().replace("+00:00", "Z")

        print(f"Found {len(result['sounds'])} sounds (total available: {result['total_results']})")

        # Download if output directory specified
        if args.output:
            downloaded = []

            for sound in result["sounds"]:
                path = download_sound(sound, args.output)
                if path:
                    downloaded.append(path)

            print(f"\nDownloaded {len(downloaded)} files to {args.output}")
            result["downloaded_files"] = downloaded

        # Save JSON
        if args.json_output:
            with open(args.json_output, "w", encoding="utf-8") as f:
                json.dump(result, f, indent=2, ensure_ascii=False)
            print(f"Results saved to {args.json_output}")
        elif not args.output:
            # Print JSON to stdout if no download or json output specified
            print(json.dumps(result, indent=2, ensure_ascii=False))

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
