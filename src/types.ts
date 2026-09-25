export type Priority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type RoadCondition = 'NORMAL' | 'WET' | 'ROUGH' | 'ICE_POSSIBLE' | 'LOW_VISIBILITY';

export interface BoundingBox {
  xmin: number;
  ymin: number;
  xmax: number;
  ymax: number;
}

export interface Detection {
  id: string;
  label: string;
  confidence: number;
  bbox: BoundingBox;
  approx_distance_m: number;
  hazard_category: 'WILDLIFE' | 'ROAD_HAZARD' | 'VEHICLE' | 'TRAFFIC_SIGN' | 'SPEED_LIMIT';
  track_id?: number;
}

export interface AlertEvent {
  id: string;
  timestamp: string;
  epoch_time: number;
  message: string;
  short_audio_text: string;
  priority: Priority;
  hazard_type: string;
  approx_distance_m?: number;
  confidence: number;
  latitude: number;
  longitude: number;
  altitude_ft: number;
  vehicle_speed_mph: number;
}

export interface TelemetryData {
  speed_mph: number;
  speed_limit_mph: number | null;
  latitude: number;
  longitude: number;
  altitude_ft: number;
  heading_deg: number;
  road_condition: RoadCondition;
  road_condition_conf: number;
  camera_fps: number;
  inference_fps: number;
  cpu_percent: number;
  ram_percent: number;
  cpu_temp_c: number;
  active_cooler_pwm: number;
  disk_free_gb: number;
  uptime_seconds: number;
  pass_name: string;
  grade_pct: number;
}
