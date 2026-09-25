"""
RoadGuard AI Core Data Types, Enums, and Dataclasses
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import List, Optional, Tuple, Dict, Any
import time


class Priority(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class RoadCondition(str, Enum):
    NORMAL = "NORMAL"
    ROUGH = "ROUGH"
    DAMAGED = "DAMAGED"
    WET = "WET"
    SNOW = "SNOW"
    ICE_POSSIBLE = "ICE_POSSIBLE"
    FLOODED = "FLOODED"
    LOW_VISIBILITY = "LOW_VISIBILITY"


class WeatherCondition(str, Enum):
    CLEAR = "CLEAR"
    RAIN = "RAIN"
    SNOW = "SNOW"
    FOG = "FOG"
    GLARE = "GLARE"
    LOW_VISIBILITY = "LOW_VISIBILITY"


class HazardCategory(str, Enum):
    WILDLIFE = "WILDLIFE"
    ROAD_HAZARD = "ROAD_HAZARD"
    VEHICLE = "VEHICLE"
    TRAFFIC_SIGN = "TRAFFIC_SIGN"
    SPEED_LIMIT = "SPEED_LIMIT"
    WEATHER = "WEATHER"
    MOUNTAIN = "MOUNTAIN"


@dataclass
class BoundingBox:
    xmin: float
    ymin: float
    xmax: float
    ymax: float

    @property
    def width(self) -> float:
        return max(0.0, self.xmax - self.xmin)

    @property
    def height(self) -> float:
        return max(0.0, self.ymax - self.ymin)

    @property
    def center(self) -> Tuple[float, float]:
        return ((self.xmin + self.xmax) / 2.0, (self.ymin + self.ymax) / 2.0)

    @property
    def area(self) -> float:
        return self.width * self.height


@dataclass
class Detection:
    label: str
    confidence: float
    bbox: BoundingBox
    track_id: Optional[int] = None
    approx_distance_m: Optional[float] = None
    hazard_category: HazardCategory = HazardCategory.VEHICLE
    timestamp: float = field(default_factory=time.time)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class TrackedObject:
    track_id: int
    label: str
    bbox: BoundingBox
    confidence: float
    first_seen: float
    last_seen: float
    frames_tracked: int
    approx_distance_m: Optional[float] = None
    velocity_mps: float = 0.0
    confirmed: bool = False
    in_lane: bool = False


@dataclass
class LaneInfo:
    left_lane_pts: List[Tuple[int, int]] = field(default_factory=list)
    right_lane_pts: List[Tuple[int, int]] = field(default_factory=list)
    center_offset_meters: float = 0.0
    curvature_radius_meters: float = 0.0
    departure_warning: bool = False


@dataclass
class GPSData:
    timestamp: float = field(default_factory=time.time)
    latitude: float = 39.7392  # Default to Colorado baseline (Denver/Rockies)
    longitude: float = -104.9903
    altitude_m: float = 1609.3  # 5,280 ft baseline
    speed_mph: float = 0.0
    heading_deg: float = 0.0
    satellites: int = 0
    fix_valid: bool = False

    @property
    def altitude_ft(self) -> float:
        return self.altitude_m * 3.28084


@dataclass
class SpeedLimitStatus:
    current_limit_mph: Optional[int] = None
    visual_detected_limit_mph: Optional[int] = None
    map_reference_limit_mph: Optional[int] = None
    confidence: float = 0.0
    consecutive_frames: int = 0
    last_detection_time: float = 0.0
    candidate_limit: Optional[int] = None


@dataclass
class Alert:
    alert_id: str
    message: str
    short_audio_text: str
    priority: Priority
    hazard_type: str
    category: HazardCategory
    approx_distance_m: Optional[float]
    confidence: float
    timestamp: float = field(default_factory=time.time)
    track_id: Optional[int] = None
    spoken: bool = False


@dataclass
class SystemStatus:
    camera_fps: float = 0.0
    inference_fps: float = 0.0
    cpu_percent: float = 0.0
    ram_percent: float = 0.0
    cpu_temp_c: float = 0.0
    disk_free_gb: float = 0.0
    camera_active: bool = False
    ai_model_loaded: bool = False
    gps_connected: bool = False
    speaker_connected: bool = False
    uptime_seconds: float = 0.0
    current_road_condition: RoadCondition = RoadCondition.NORMAL
    road_condition_confidence: float = 0.90
    current_speed_mph: float = 0.0
    current_speed_limit_mph: Optional[int] = None
    active_alerts: List[Alert] = field(default_factory=list)
    detected_objects: List[Detection] = field(default_factory=list)
