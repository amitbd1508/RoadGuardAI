import { IpadSensorPayload } from '../types';

export class SensorService {
  private isTracking = false;
  private watchId: number | null = null;
  private latestPayload: IpadSensorPayload;
  private listeners: ((payload: IpadSensorPayload) => void)[] = [];

  constructor() {
    this.latestPayload = {
      device_id: 'ipad-cockpit-companion',
      timestamp: Date.now() / 1000,
      gps: {
        latitude: 39.6636,
        longitude: -105.8792,
        altitude_m: 3654,
        altitude_ft: 11988,
        speed_mps: 21.4,
        speed_mph: 48.0,
        heading_deg: 245.0,
        accuracy_m: 4.5,
      },
      imu: {
        accel_x: 0.02,
        accel_y: -0.05,
        accel_z: 9.81,
        g_force: 1.0,
        pitch_deg: 4.5, // 4.5° incline
        roll_deg: -1.2,
        yaw_deg: 245.0,
      },
      battery: {
        level: 0.95,
        charging: true,
      },
    };
  }

  public async requestPermissions(): Promise<boolean> {
    try {
      // iOS 13+ requires explicit permission for DeviceOrientation / DeviceMotion
      if (
        typeof DeviceOrientationEvent !== 'undefined' &&
        typeof (DeviceOrientationEvent as any).requestPermission === 'function'
      ) {
        const response = await (DeviceOrientationEvent as any).requestPermission();
        if (response !== 'granted') {
          console.warn('DeviceOrientation permission denied by user.');
        }
      }
      return true;
    } catch (err) {
      console.warn('Error requesting device orientation permissions:', err);
      return true; // Fallback to available APIs
    }
  }

  public startStreaming(intervalMs = 100) {
    if (this.isTracking) return;
    this.isTracking = true;

    // 1. Geolocation Watcher
    if ('geolocation' in navigator) {
      this.watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const coords = pos.coords;
          const speedMps = coords.speed !== null ? Math.max(0, coords.speed) : 0;
          const speedMph = speedMps * 2.23694;
          const altM = coords.altitude;
          const altFt = altM !== null ? altM * 3.28084 : null;

          this.latestPayload.gps = {
            latitude: coords.latitude,
            longitude: coords.longitude,
            altitude_m: altM,
            altitude_ft: altFt,
            speed_mps: speedMps,
            speed_mph: speedMph,
            heading_deg: coords.heading,
            accuracy_m: coords.accuracy,
          };
          this.latestPayload.timestamp = pos.timestamp / 1000;
          this.notify();
        },
        (err) => console.warn('Geolocation watch error:', err.message),
        {
          enableHighAccuracy: true,
          maximumAge: 500,
          timeout: 5000,
        }
      );
    }

    // 2. Motion / Accelerometer Listener
    window.addEventListener('devicemotion', (event) => {
      const acc = event.accelerationIncludingGravity || event.acceleration;
      if (acc && acc.x !== null && acc.y !== null && acc.z !== null) {
        const ax = acc.x;
        const ay = acc.y;
        const az = acc.z;
        const totalMag = Math.sqrt(ax * ax + ay * ay + az * az);
        const gForce = totalMag / 9.80665;

        this.latestPayload.imu.accel_x = parseFloat(ax.toFixed(3));
        this.latestPayload.imu.accel_y = parseFloat(ay.toFixed(3));
        this.latestPayload.imu.accel_z = parseFloat(az.toFixed(3));
        this.latestPayload.imu.g_force = parseFloat(gForce.toFixed(2));
      }
    });

    // 3. Orientation / Gyroscope Listener
    window.addEventListener('deviceorientation', (event) => {
      if (event.beta !== null && event.gamma !== null) {
        // beta: front-to-back tilt (-180 to 180) -> vehicle pitch (road grade)
        // gamma: left-to-right tilt (-90 to 90) -> vehicle roll (banking)
        this.latestPayload.imu.pitch_deg = parseFloat(event.beta.toFixed(1));
        this.latestPayload.imu.roll_deg = parseFloat(event.gamma.toFixed(1));
        if (event.alpha !== null) {
          this.latestPayload.imu.yaw_deg = parseFloat(event.alpha.toFixed(1));
        }
      }
    });

    // 4. Battery Status (if supported)
    if ('getBattery' in (navigator as any)) {
      (navigator as any).getBattery().then((battery: any) => {
        this.latestPayload.battery = {
          level: battery.level,
          charging: battery.charging,
        };
      });
    }
  }

  public stopStreaming() {
    this.isTracking = false;
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  public getPayload(): IpadSensorPayload {
    this.latestPayload.timestamp = Date.now() / 1000;
    return this.latestPayload;
  }

  public subscribe(cb: (payload: IpadSensorPayload) => void) {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      listener(this.latestPayload);
    }
  }
}

export const sensorService = new SensorService();
