#!/usr/bin/env python3
"""
Search and index royalty-free videos from Pexels and Pixabay APIs.
Returns video metadata including URLs, dimensions, duration, and creator info.
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from typing import Optional

import requests


def search_pexels(
    query: str,
    count: int = 3,
    orientation: Optional[str] = None,
    size: Optional[str] = None,
    min_duration: Optional[int] = None,
    max_duration: Optional[int] = None,
    page: int = 1,
) -> dict:
    """Search videos on Pexels API."""
    api_key = os.environ.get("PEXELS_API_KEY", "").strip()
    if not api_key:
        raise ValueError("PEXELS_API_KEY not configured")

    url = "https://api.pexels.com/videos/search"
    headers = {"Authorization": api_key}
    params = {
        "query": query,
        "per_page": min(count, 80),
        "page": page,
    }

    if orientation:
        # Pexels: landscape, portrait, square
        params["orientation"] = orientation

    if size:
        # Pexels: large (4K), medium (Full HD), small (HD)
        params["size"] = size

    response = requests.get(url, headers=headers, params=params, timeout=30)
    response.raise_for_status()
    data = response.json()

    videos = []
    for video in data.get("videos", []):
        # Sort video files by resolution (width) descending
        files = sorted(
            [vf for vf in video.get("video_files", []) if vf.get("link")],
            key=lambda vf: vf.get("width", 0),
            reverse=True,
        )
        hd = files[0] if files else {}
        sd = files[-1] if len(files) > 1 else hd

        # Get first thumbnail
        pictures = video.get("video_pictures", [])
        thumbnail = pictures[0]["picture"] if pictures else ""

        duration_sec = video.get("duration", 0)

        # Apply duration filter client-side (Pexels API has no duration param)
        if min_duration and duration_sec < min_duration:
            continue
        if max_duration and duration_sec > max_duration:
            continue

        videos.append({
            "id": str(video["id"]),
            "source": "pexels",
            "url_page": video.get("url", ""),
            "url_video_hd": hd.get("link", ""),
            "url_video_sd": sd.get("link", ""),
            "thumbnail": thumbnail,
            "width": video.get("width", hd.get("width", 0)),
            "height": video.get("height", hd.get("height", 0)),
            "duration": duration_sec,
            "creator": video.get("user", {}).get("name", ""),
            "creator_url": video.get("user", {}).get("url", ""),
        })

    return {
        "query": query,
        "source": "pexels",
        "total_results": data.get("total_results", 0),
        "page": data.get("page", 1),
        "per_page": data.get("per_page", count),
        "videos": videos,
    }


def search_pixabay(
    query: str,
    count: int = 3,
    orientation: Optional[str] = None,
    video_type: Optional[str] = None,
    min_duration: Optional[int] = None,
    max_duration: Optional[int] = None,
    page: int = 1,
) -> dict:
    """Search videos on Pixabay API."""
    api_key = os.environ.get("PIXABAY_API_KEY", "").strip()
    if not api_key:
        raise ValueError("PIXABAY_API_KEY not configured")

    url = "https://pixabay.com/api/videos/"
    params = {
        "key": api_key,
        "q": query,
        "per_page": min(max(count, 3), 200),  # Pixabay minimum is 3
        "page": page,
        "safesearch": "true",
    }

    if video_type:
        # Pixabay: all, film, animation
        params["video_type"] = video_type

    # Pixabay video API doesn't support orientation directly,
    # but we can filter client-side if needed

    response = requests.get(url, params=params, timeout=30)
    response.raise_for_status()
    data = response.json()

    videos = []
    for hit in data.get("hits", []):
        vids = hit.get("videos", {})
        large = vids.get("large", {})
        medium = vids.get("medium", {})
        small = vids.get("small", {})

        duration_sec = hit.get("duration", 0)

        if min_duration and duration_sec < min_duration:
            continue
        if max_duration and duration_sec > max_duration:
            continue

        # Client-side orientation filter
        w = large.get("width", 0) or medium.get("width", 0)
        h = large.get("height", 0) or medium.get("height", 0)
        if orientation and w and h:
            match = (
                (orientation in ("landscape", "horizontal") and w > h)
                or (orientation in ("portrait", "vertical") and h > w)
                or (orientation == "square" and w == h)
            )
            if not match:
                continue

        videos.append({
            "id": str(hit["id"]),
            "source": "pixabay",
            "url_page": hit.get("pageURL", ""),
            "url_video_hd": large.get("url", ""),
            "url_video_sd": medium.get("url", small.get("url", "")),
            "thumbnail": large.get("thumbnail", medium.get("thumbnail", "")),
            "width": large.get("width", medium.get("width", 0)),
            "height": large.get("height", medium.get("height", 0)),
            "duration": duration_sec,
            "creator": hit.get("user", ""),
            "creator_url": f"https://pixabay.com/users/{hit.get('user', '')}-{hit.get('user_id', '')}/",
            "tags": hit.get("tags", ""),
            "likes": hit.get("likes", 0),
            "downloads": hit.get("downloads", 0),
        })

    return {
        "query": query,
        "source": "pixabay",
        "total_results": data.get("totalHits", 0),
        "page": page,
        "per_page": count,
        "videos": videos[:count],
    }


def search_both(
    query: str,
    count: int = 3,
    orientation: Optional[str] = None,
    min_duration: Optional[int] = None,
    max_duration: Optional[int] = None,
    page: int = 1,
) -> dict:
    """Search videos on both Pexels and Pixabay APIs."""
    results = {
        "query": query,
        "source": "both",
        "total_results": 0,
        "videos": [],
        "errors": [],
    }

    half_count = max(count // 2, 1)

    try:
        pexels_result = search_pexels(query, half_count, orientation, None, min_duration, max_duration, page)
        results["videos"].extend(pexels_result["videos"])
        results["total_results"] += pexels_result["total_results"]
    except Exception as e:
        results["errors"].append(f"Pexels: {e}")

    try:
        pixabay_result = search_pixabay(query, half_count, orientation, None, min_duration, max_duration, page)
        results["videos"].extend(pixabay_result["videos"])
        results["total_results"] += pixabay_result["total_results"]
    except Exception as e:
        results["errors"].append(f"Pixabay: {e}")

    if not results["videos"] and results["errors"]:
        raise ValueError("; ".join(results["errors"]))

    return results


def main():
    parser = argparse.ArgumentParser(
        description="Search royalty-free videos from Pexels and Pixabay"
    )
    parser.add_argument(
        "--query", "-q", required=True, help="Search keywords (English recommended)"
    )
    parser.add_argument(
        "--source", "-s",
        choices=["pexels", "pixabay", "both"],
        default="pexels",
        help="Video source (default: pexels)",
    )
    parser.add_argument(
        "--count", "-c", type=int, default=3,
        help="Number of results (default: 3)",
    )
    parser.add_argument(
        "--orientation", "-o",
        choices=["landscape", "portrait", "square", "horizontal", "vertical"],
        help="Filter by orientation",
    )
    parser.add_argument(
        "--min-duration", type=int,
        help="Minimum duration in seconds",
    )
    parser.add_argument(
        "--max-duration", type=int,
        help="Maximum duration in seconds",
    )
    parser.add_argument(
        "--page", "-p", type=int, default=1,
        help="Results page number (default: 1)",
    )
    parser.add_argument(
        "--output", help="Save results to JSON file",
    )

    args = parser.parse_args()

    try:
        if args.source == "pexels":
            result = search_pexels(
                args.query, args.count, args.orientation, None,
                args.min_duration, args.max_duration, args.page,
            )
        elif args.source == "pixabay":
            result = search_pixabay(
                args.query, args.count, args.orientation, None,
                args.min_duration, args.max_duration, args.page,
            )
        else:
            result = search_both(
                args.query, args.count, args.orientation,
                args.min_duration, args.max_duration, args.page,
            )

        result["searched_at"] = datetime.now(timezone.utc).isoformat()

        output_json = json.dumps(result, indent=2, ensure_ascii=False)

        if args.output:
            with open(args.output, "w", encoding="utf-8") as f:
                f.write(output_json)
            print(f"Results saved to {args.output}")
            print(f"Found {len(result['videos'])} videos (total available: {result['total_results']})")
        else:
            print(output_json)

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
