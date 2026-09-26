"""
RoadGuard AI Configuration Loader and Schema
"""

import os
from pathlib import Path
from typing import Dict, Any, List, Optional
import yaml
from pydantic import BaseModel, Field


class SystemConfig(BaseModel):
    device_name: str = "roadguard-pi5"
    profile: str = "colorado_mountain"
    log_level: str = "INFO"
    log_file: str = "logs/roadguard.log"
    temperature_throttle_celsius: float = 78.0
    low_memory_threshold_mb: int = 400


class CameraConfig(BaseModel):
    source_type: str = "picam3"
    device_index: int = 0
    video_file: str = ""
    width: int = 1280
    height: int = 720
    fps: int = 30
    auto_reconnect: bool = True
    reconnect_delay_seconds: float = 2.0
    rotation: int = 0


class CalibrationConfig(BaseModel):
    camera_height_meters: float = 1.35
    camera_pitch_degrees: float = -2.5
    horizontal_fov_degrees: float = 75.0
    vertical_fov_degrees: float = 45.0
    focal_length_px: float = 960.0


class InferenceConfig(BaseModel):
    mode: str = "performance"
    provider: str = "CPUExecutionProvider"
    num_threads: int = 4
    detection_fps: int = 10
    lane_fps: int = 5
    depth_fps: int = 4


class ModelsConfig(BaseModel):
    detection_model_path: str = "models/yolov8n_roadguard.onnx"
    segmentation_model_path: str = "models/yolov8n_seg_road.onnx"
    depth_model_path: str = "models/fastdepth_lightweight.onnx"
    traffic_sign_model_path: str = "models/traffic_sign_classifier.onnx"
    ocr_model_path: str = "models/ocr_speed_digits.onnx"


class DetectionConfig(BaseModel):
    confidence_threshold: float = 0.55
    iou_threshold: float = 0.45
    classes_to_track: List[str] = Field(default_factory=lambda: [
        "car", "suv", "truck", "bus", "motorcycle", "bicycle", "pedestrian",
        "deer", "elk", "moose", "bear", "pothole", "speed_bump", "debris",
        "rock", "cone", "barrier", "traffic_sign"
    ])


class TrackingConfig(BaseModel):
    tracker_type: str = "bytetrack"
    track_thresh: float = 0.50
    track_buffer: int = 30
    match_thresh: float = 0.70


class SpeedLimitConfig(BaseModel):
    enabled: bool = True
    confirmation_frames: int = 3
    speed_unit: str = "MPH"
    alert_speed_delta_mph: int = 6
    cooldown_seconds: float = 15.0


class TrafficSignsConfig(BaseModel):
    enabled: bool = True
    confirmation_frames: int = 2
    confidence_threshold: float = 0.60
    mountain_warning_distance_meters: float = 80.0


class RoadHazardsConfig(BaseModel):
    enabled: bool = True
    pothole_min_confidence: float = 0.60
    debris_min_confidence: float = 0.55
    confirmation_frames: int = 2
    max_warning_distance_meters: float = 65.0


class WildlifeConfig(BaseModel):
    enabled: bool = True
    confidence_threshold: float = 0.55
    roadside_zone_lateral_ratio: float = 0.35
    critical_distance_meters: float = 50.0


class DistanceConfig(BaseModel):
    enabled: bool = True
    method: str = "perspective_geometry"


class GPSConfig(BaseModel):
    enabled: bool = True
    port: str = "auto"
    baudrate: int = 9600
    timeout_seconds: float = 1.0


class OfflineMapsConfig(BaseModel):
    enabled: bool = True
    region: str = "colorado"
    osm_data_path: str = "data/maps/colorado_roads.geojson"
    elevation_data_path: str = "data/maps/colorado_elevation.sqlite"


class AlertsConfig(BaseModel):
    enabled: bool = True
    default_cooldown_seconds: float = 6.0
    critical_cooldown_seconds: float = 2.5
    minimum_confidence: float = 0.58
    priorities: Dict[str, int] = Field(default_factory=lambda: {
        "CRITICAL": 1, "HIGH": 2, "MEDIUM": 3, "LOW": 4
    })


class AudioConfig(BaseModel):
    enabled: bool = True
    engine: str = "piper"
    piper_voice: str = "en_US-lessac-medium"
    volume: float = 0.85
    rate: float = 1.05
    audio_output_device: str = "default"


class DashboardConfig(BaseModel):
    enabled: bool = True
    host: str = "0.0.0.0"
    port: int = 8080
    stream_quality: int = 75
    stream_width: int = 640
    stream_height: int = 360
    ws_ping_interval: int = 10


class StorageConfig(BaseModel):
    database_path: str = "data/roadguard_events.db"
    max_db_size_mb: int = 500
    save_snapshots: bool = False
    snapshot_dir: str = "data/snapshots"


class RecordingConfig(BaseModel):
    enabled: bool = False
    dashcam_dir: str = "data/dashcam"
    segment_duration_minutes: int = 5
    max_storage_gb: float = 25.0
    codec: str = "h264"
    bitrate_kbps: int = 4000


class EventRecordingConfig(BaseModel):
    enabled: bool = False
    pre_event_seconds: int = 10
    post_event_seconds: int = 10
    save_dir: str = "data/events"


class LicensePlateConfig(BaseModel):
    enabled: bool = False
    display_live: bool = False
    save_plate_text: bool = False
    save_plate_images: bool = False


class PrivacyConfig(BaseModel):
    cloud_upload: bool = False
    facial_recognition: bool = False
    driver_monitoring: bool = False
    telemetry_reporting: bool = False
    blur_faces: bool = False


class AppConfig(BaseModel):
    system: SystemConfig = Field(default_factory=SystemConfig)
    camera: CameraConfig = Field(default_factory=CameraConfig)
    calibration: CalibrationConfig = Field(default_factory=CalibrationConfig)
    inference: InferenceConfig = Field(default_factory=InferenceConfig)
    models: ModelsConfig = Field(default_factory=ModelsConfig)
    detection: DetectionConfig = Field(default_factory=DetectionConfig)
    tracking: TrackingConfig = Field(default_factory=TrackingConfig)
    speed_limit: SpeedLimitConfig = Field(default_factory=SpeedLimitConfig)
    traffic_signs: TrafficSignsConfig = Field(default_factory=TrafficSignsConfig)
    road_hazards: RoadHazardsConfig = Field(default_factory=RoadHazardsConfig)
    wildlife: WildlifeConfig = Field(default_factory=WildlifeConfig)
    distance: DistanceConfig = Field(default_factory=DistanceConfig)
    gps: GPSConfig = Field(default_factory=GPSConfig)
    offline_maps: OfflineMapsConfig = Field(default_factory=OfflineMapsConfig)
    alerts: AlertsConfig = Field(default_factory=AlertsConfig)
    audio: AudioConfig = Field(default_factory=AudioConfig)
    dashboard: DashboardConfig = Field(default_factory=DashboardConfig)
    storage: StorageConfig = Field(default_factory=StorageConfig)
    recording: RecordingConfig = Field(default_factory=RecordingConfig)
    event_recording: EventRecordingConfig = Field(default_factory=EventRecordingConfig)
    license_plate: LicensePlateConfig = Field(default_factory=LicensePlateConfig)
    privacy: PrivacyConfig = Field(default_factory=PrivacyConfig)


def load_config(config_path: Optional[str] = None) -> AppConfig:
    """Loads configuration from YAML file or returns default."""
    if not config_path:
        config_path = os.getenv("ROADGUARD_CONFIG", "config.yaml")

    path = Path(config_path)
    if path.exists():
        with open(path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f) or {}
            return AppConfig(**data)

    return AppConfig()
