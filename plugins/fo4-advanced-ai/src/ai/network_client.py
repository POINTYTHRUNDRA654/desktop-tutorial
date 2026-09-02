"""Network request wrappers with firewall-friendly error handling."""

from __future__ import annotations

import os
import sys

import requests

KOBOLD_API_URL = "http://localhost:5001/api/v1/generate"


def query_local_llm_with_error_handling(payload: dict) -> str:
    """Send payload to local LLM endpoint with resilient error handling."""
    try:
        response = requests.post(KOBOLD_API_URL, json=payload, timeout=4)
        response.raise_for_status()
        data = response.json()
        if "results" in data and data["results"]:
            return data["results"][0].get("text", "").strip()
        return data.get("text", "").strip()
    except requests.exceptions.ConnectionError:
        print("\n[CRITICAL ERROR] Firewall or Antivirus may be blocking local AI connection.")
        print(f"Allow '{os.path.basename(sys.executable)}' through Windows Firewall.")
        print("Ensure KoboldCPP is running and reachable on configured port.\n")
        return "[Cognitive Matrix Offline]"
    except (requests.RequestException, ValueError) as exc:
        print(f"[LLM Network Error] {exc}")
        return "[Cognitive Matrix Offline]"
