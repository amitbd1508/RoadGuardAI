import { IpadSensorPayload, PiTelemetry, TelemetryAlert } from '../types';
import { sensorService } from './sensorService';
import { audioAlertService } from './audioAlertService';

export class ConnectionService {
  private ws: WebSocket | null = null;
  private piHost: string = '192.168.4.1';
  private piPort: string = '8080';
  private isConnected: boolean = false;
  private telemetryListeners: ((telemetry: PiTelemetry) => void)[] = [];
  private connectionStatusListeners: ((connected: boolean) => void)[] = [];
  private offloadTimer: any = null;
  private lastAlertId: string | null = null;

  constructor() {
    // Load persisted host if available
    const savedHost = localStorage.getItem('roadguard_pi_host');
    if (savedHost) this.piHost = savedHost;
    const savedPort = localStorage.getItem('roadguard_pi_port');
    if (savedPort) this.piPort = savedPort;
  }

  public setEndpoint(host: string, port: string) {
    this.piHost = host;
    this.piPort = port;
    localStorage.setItem('roadguard_pi_host', host);
    localStorage.setItem('roadguard_pi_port', port);
    this.reconnect();
  }

  public getEndpoint() {
    return { host: this.piHost, port: this.piPort };
  }

  public connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const wsUrl = `ws://${this.piHost}:${this.piPort}/ws/ipad`;
    console.log(`[ConnectionService] Connecting to Pi 5 at ${wsUrl}...`);

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[ConnectionService] Connected to RoadGuard AI Pi 5!');
        this.isConnected = true;
        this.notifyStatus(true);
        this.startOffloadLoop();
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'telemetry_update') {
            this.handleTelemetry(payload);
          }
        } catch (e) {
          console.warn('[ConnectionService] Error parsing incoming WS payload', e);
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.notifyStatus(false);
        this.stopOffloadLoop();
        // Auto-reconnect after 3s
        setTimeout(() => this.connect(), 3000);
      };

      this.ws.onerror = (err) => {
        console.warn('[ConnectionService] WebSocket encountered error:', err);
        this.ws?.close();
      };
    } catch (err) {
      console.warn('[ConnectionService] Connection failed:', err);
      setTimeout(() => this.connect(), 4000);
    }
  }

  public reconnect() {
    if (this.ws) {
      this.ws.close();
    }
    this.connect();
  }

  private startOffloadLoop() {
    if (this.offloadTimer) clearInterval(this.offloadTimer);

    // Stream sensor payload to Pi 5 at 10Hz (100ms)
    this.offloadTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const payload = sensorService.getPayload();
        this.ws.send(
          JSON.stringify({
            type: 'sensor_offload',
            data: payload,
          })
        );
      }
    }, 100);
  }

  private stopOffloadLoop() {
    if (this.offloadTimer) {
      clearInterval(this.offloadTimer);
      this.offloadTimer = null;
    }
  }

  private handleTelemetry(data: PiTelemetry) {
    // Notify UI
    for (const listener of this.telemetryListeners) {
      listener(data);
    }

    // Process top threat for iPad audio & visual notification
    if (data.active_alerts && data.active_alerts.length > 0) {
      const topAlert = data.active_alerts[0];
      if (topAlert.id !== this.lastAlertId) {
        this.lastAlertId = topAlert.id;
        audioAlertService.announce(topAlert);
      }
    }
  }

  public subscribeTelemetry(cb: (t: PiTelemetry) => void) {
    this.telemetryListeners.push(cb);
    return () => {
      this.telemetryListeners = this.telemetryListeners.filter((l) => l !== cb);
    };
  }

  public subscribeStatus(cb: (connected: boolean) => void) {
    this.connectionStatusListeners.push(cb);
    cb(this.isConnected);
    return () => {
      this.connectionStatusListeners = this.connectionStatusListeners.filter((l) => l !== cb);
    };
  }

  private notifyStatus(status: boolean) {
    for (const listener of this.connectionStatusListeners) {
      listener(status);
    }
  }
}

export const connectionService = new ConnectionService();
