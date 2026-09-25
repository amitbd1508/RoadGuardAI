"""
Offline Colorado Map Context, Elevation Profile, and Speed Limit Knowledge Engine
Provides zero-connectivity road intelligence across Rocky Mountain National Park and Colorado passes
"""

import json
import math
import os
import logging
from typing import Optional, Dict, Any, List
from roadguard.config import OfflineMapsConfig

logger = logging.getLogger("roadguard.maps")

# Curated high-altitude passes and corridors in Colorado
COLORADO_PASSES = [
    {
        "name": "Loveland Pass (US-6)",
        "elevation_ft": 11990,
        "lat": 39.6636,
        "lon": -105.8792,
        "speed_limit_mph": 40,
        "max_grade_pct": 7.0,
        "hairpin_warning": True,
        "hazards": "Steep switchbacks, avalanche chutes, winter icing"
    },
    {
        "name": "Trail Ridge Road (US-34, RMNP)",
        "elevation_ft": 12183,
        "lat": 40.4370,
        "lon": -105.7538,
        "speed_limit_mph": 35,
        "max_grade_pct": 7.5,
        "wildlife_hotspot": True,
        "hazards": "Alpine tundra elk herds, extreme wind, rapid fog onset"
    },
    {
        "name": "Red Mountain Pass (US-550 / Million Dollar Highway)",
        "elevation_ft": 11018,
        "lat": 37.8986,
        "lon": -107.7123,
        "speed_limit_mph": 30,
        "max_grade_pct": 8.0,
        "narrow_shelves": True,
        "hazards": "No guardrails, sheer cliffs, falling rock zones"
    },
    {
        "name": "Independence Pass (CO-82 / Aspen)",
        "elevation_ft": 12095,
        "lat": 39.1086,
        "lon": -106.5642,
        "speed_limit_mph": 35,
        "max_grade_pct": 7.0,
        "single_lane_narrows": True,
        "hazards": "Tight rock walls, oversized vehicle restrictions"
    },
    {
        "name": "Eisenhower-Johnson Memorial Tunnel (I-70)",
        "elevation_ft": 11158,
        "lat": 39.6795,
        "lon": -105.9221,
        "speed_limit_mph": 50,
        "tunnel_length_ft": 8941,
        "hazards": "Sudden light transition, heavy grade runaway truck ramps"
    }
]


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two coordinates."""
    r = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0) ** 2
    return r * 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))


class OfflineMapEngine:
    """Offline spatial index providing road speed limits and mountain hazard context."""

    def __init__(self, config: OfflineMapsConfig):
        self.config = config
        self.passes = COLORADO_PASSES
        self._load_local_data()

    def _load_local_data(self):
        """Loads customized GeoJSON road segments if present on disk."""
        if os.path.exists(self.config.osm_data_path):
            try:
                with open(self.config.osm_data_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if "passes" in data:
                        self.passes = data["passes"]
                logger.info(f"Loaded {len(self.passes)} Colorado pass definitions from {self.config.osm_data_path}")
            except Exception as e:
                logger.warning(f"Could not load custom OSM data: {e}")

    def query_position(self, lat: float, lon: float) -> Dict[str, Any]:
        """Finds nearby road pass, advisory speed limit, and steep grade status."""
        nearest_pass = None
        min_dist_km = 999999.0

        for p in self.passes:
            dist = haversine_distance_km(lat, lon, p["lat"], p["lon"])
            if dist < min_dist_km:
                min_dist_km = dist
                nearest_pass = p

        # If within 15 km of a notable mountain feature
        if nearest_pass and min_dist_km < 15.0:
            return {
                "road_name": nearest_pass["name"],
                "speed_limit_mph": nearest_pass.get("speed_limit_mph", 45),
                "elevation_ft": nearest_pass.get("elevation_ft", 9000),
                "is_steep_grade": nearest_pass.get("max_grade_pct", 0) >= 6.0,
                "grade_pct": nearest_pass.get("max_grade_pct", 0.0),
                "hazards": nearest_pass.get("hazards", "Mountain curves"),
                "distance_to_pass_km": round(min_dist_km, 2)
            }

        # General Colorado highway baseline
        return {
            "road_name": "Colorado Highway Corridor",
            "speed_limit_mph": 55,
            "elevation_ft": 7500,
            "is_steep_grade": False,
            "grade_pct": 3.0,
            "hazards": "Wildlife crossing area",
            "distance_to_pass_km": None
        }


def create_map_engine(config: OfflineMapsConfig) -> OfflineMapEngine:
    return OfflineMapEngine(config)
