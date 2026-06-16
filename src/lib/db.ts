import fs from 'fs';
import path from 'path';

export interface Device {
  hostname: string;
  firmwareVersion: string;
  macAddress: string;
  wifiSignalStrength: number;
  ipAddress: string;
  lastHeartbeat: number;
  hasUpdate: boolean;
  status: 'Online' | 'Offline' | 'Flashing';
  projectName: string;
}

const DB_FILE = path.join(process.cwd(), 'database.json');

class Database {
  private devices: Map<string, Device> = new Map();
  private projects: Set<string> = new Set(['ALL DEVICES']);

  constructor() {
    this.loadFromFile();
  }

  private loadFromFile() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const data = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(data);
        if (parsed.devices) {
          parsed.devices.forEach((d: Device) => {
            this.devices.set(d.hostname, d);
            if (d.projectName) this.projects.add(d.projectName);
          });
        }
        if (parsed.projects) {
          parsed.projects.forEach((p: string) => this.projects.add(p));
        }
      }
    } catch (e) {
      console.error("Failed to load DB file", e);
    }
  }

  private saveToFile() {
    try {
      const data = {
        devices: Array.from(this.devices.values()),
        projects: Array.from(this.projects)
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error("Failed to save DB file", e);
    }
  }

  registerDevice(hostname: string, version: string, mac: string, signal: number, ip: string) {
    const existing = this.devices.get(hostname);
    this.devices.set(hostname, {
      hostname,
      firmwareVersion: version,
      macAddress: mac,
      wifiSignalStrength: signal,
      ipAddress: ip,
      lastHeartbeat: Date.now(),
      hasUpdate: existing ? existing.hasUpdate : false,
      status: 'Online',
      projectName: existing?.projectName || 'ALL DEVICES'
    });
    this.saveToFile();
  }

  updateHeartbeat(hostname: string) {
    const device = this.devices.get(hostname);
    if (device) {
      device.lastHeartbeat = Date.now();
      if (device.status !== 'Flashing') {
        device.status = 'Online';
      }
      // Note: We don't saveToFile on every heartbeat to save disk IO.
      // We only save on structural changes.
    }
  }

  checkUpdateStatus(hostname: string): boolean {
    const device = this.devices.get(hostname);
    if (!device) return false;
    return device.hasUpdate;
  }

  setUpdateStatus(hostname: string, status: boolean) {
    const device = this.devices.get(hostname);
    if (device) {
      device.hasUpdate = status;
      this.saveToFile();
    }
  }

  setFlashing(hostname: string) {
    const device = this.devices.get(hostname);
    if (device) {
      device.status = 'Flashing';
      device.hasUpdate = false;
      this.saveToFile();
    }
  }

  getAllDevices(): Device[] {
    const now = Date.now();
    const all = Array.from(this.devices.values());
    
    let needsSave = false;
    all.forEach(d => {
      if (d.status !== 'Flashing' && now - d.lastHeartbeat > 60000 && d.status !== 'Offline') {
        d.status = 'Offline';
        needsSave = true;
      }
    });

    if (needsSave) this.saveToFile();
    return all;
  }

  getAllProjects(): string[] {
    return Array.from(this.projects);
  }

  createProject(name: string) {
    if (!this.projects.has(name)) {
      this.projects.add(name);
      this.saveToFile();
    }
  }

  assignToProject(hostnames: string[], projectName: string) {
    this.createProject(projectName); // ensure it exists
    hostnames.forEach(hostname => {
      const device = this.devices.get(hostname);
      if (device) {
        device.projectName = projectName;
      }
    });
    this.saveToFile();
  }

  removeDevices(hostnames: string[]) {
    hostnames.forEach(hostname => {
      this.devices.delete(hostname);
    });
    this.saveToFile();
  }
}

const globalForDb = global as unknown as { db: Database };
export const db = globalForDb.db || new Database();
if (process.env.NODE_ENV !== 'production') globalForDb.db = db;
