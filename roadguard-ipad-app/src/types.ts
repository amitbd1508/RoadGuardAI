export interface IpadSensorPayload {
  device_id: string;
  timestamp: number;
  gps: {
    latitude: number;
    longitude: number;
    altitude_m: number | null;
    altitude_ft: number | null;
    speed_mps: number | null;
    speed_mph: number | null;
    heading_deg: number | null;
    accuracy_m: number | null;
  };
  imu: {
    accel_x: number; // m/s^2 or G
    accel_y: number;
    accel_z: number;
    g_force: number;
    pitch_deg: number; // vehicle nose up/down (grade)
    roll_deg: number;  // vehicle lean left/right (banking)
    yaw_deg: number;   // compass orientation
  };
  battery?: {
    level: number;
    charging: boolean;
  };
}

export interface TelemetryAlert {
  id: string;
  message: string;
  short_audio: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  hazard_type: string;
  approx_distance_m: number | null;
  timestamp?: number;
}

export interface PiTelemetry {
  camera_fps: number;
  inference_fps: number;
  speed_mph: number;
  speed_limit_mph: number;
  road_condition: string;
  cpu_temp_c?: number;
  active_alerts: TelemetryAlert[];
}
