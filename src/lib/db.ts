import { Redis } from '@upstash/redis';

const kv = Redis.fromEnv();

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
  firmwareUrl?: string;
}

interface DatabaseData {
  devices: Device[];
  projects: string[];
}

const DB_KEY = 'air-ir-remote-db';

class Database {
  private async getData(): Promise<DatabaseData> {
    try {
      const data = await kv.get<DatabaseData>(DB_KEY);
      if (data) {
        return data;
      }
    } catch (e) {
      console.error("Failed to load DB from Vercel KV", e);
    }
    return { devices: [], projects: ['ALL DEVICES'] };
  }

  private async saveData(data: DatabaseData): Promise<void> {
    try {
      await kv.set(DB_KEY, data);
    } catch (e) {
      console.error("Failed to save DB to Vercel KV", e);
    }
  }

  async registerDevice(hostname: string, version: string, mac: string, signal: number, ip: string) {
    const data = await this.getData();
    const existingIndex = data.devices.findIndex(d => d.hostname === hostname);
    const existing = existingIndex >= 0 ? data.devices[existingIndex] : null;
    
    const newDevice: Device = {
      hostname,
      firmwareVersion: version,
      macAddress: mac,
      wifiSignalStrength: signal,
      ipAddress: ip,
      lastHeartbeat: Date.now(),
      hasUpdate: existing ? existing.hasUpdate : false,
      status: 'Online',
      projectName: existing?.projectName || 'ALL DEVICES',
      firmwareUrl: existing?.firmwareUrl
    };

    if (existingIndex >= 0) {
      data.devices[existingIndex] = newDevice;
    } else {
      data.devices.push(newDevice);
    }

    await this.saveData(data);
  }

  async updateHeartbeat(hostname: string) {
    const data = await this.getData();
    const device = data.devices.find(d => d.hostname === hostname);
    if (device) {
      device.lastHeartbeat = Date.now();
      if (device.status !== 'Flashing') {
        device.status = 'Online';
      }
      await this.saveData(data);
    }
  }

  async checkUpdateStatus(hostname: string): Promise<boolean> {
    const data = await this.getData();
    const device = data.devices.find(d => d.hostname === hostname);
    if (!device) return false;
    return device.hasUpdate;
  }

  async setUpdateStatus(hostname: string, status: boolean, firmwareUrl?: string) {
    const data = await this.getData();
    const device = data.devices.find(d => d.hostname === hostname);
    if (device) {
      device.hasUpdate = status;
      if (firmwareUrl !== undefined) {
        device.firmwareUrl = firmwareUrl;
      }
      await this.saveData(data);
    }
  }

  async setFlashing(hostname: string) {
    const data = await this.getData();
    const device = data.devices.find(d => d.hostname === hostname);
    if (device) {
      device.status = 'Flashing';
      device.hasUpdate = false;
      await this.saveData(data);
    }
  }

  async getDevice(hostname: string): Promise<Device | undefined> {
    const data = await this.getData();
    return data.devices.find(d => d.hostname === hostname);
  }

  async getAllDevices(): Promise<Device[]> {
    const now = Date.now();
    const data = await this.getData();
    let needsSave = false;
    
    data.devices.forEach(d => {
      if (d.status !== 'Flashing' && now - d.lastHeartbeat > 60000 && d.status !== 'Offline') {
        d.status = 'Offline';
        needsSave = true;
      }
    });

    if (needsSave) await this.saveData(data);
    return data.devices;
  }

  async getAllProjects(): Promise<string[]> {
    const data = await this.getData();
    return data.projects;
  }

  async createProject(name: string) {
    const data = await this.getData();
    if (!data.projects.includes(name)) {
      data.projects.push(name);
      await this.saveData(data);
    }
  }

  async assignToProject(hostnames: string[], projectName: string) {
    const data = await this.getData();
    if (!data.projects.includes(projectName)) {
      data.projects.push(projectName);
    }
    
    data.devices.forEach(device => {
      if (hostnames.includes(device.hostname)) {
        device.projectName = projectName;
      }
    });
    
    await this.saveData(data);
  }

  async removeDevices(hostnames: string[]) {
    const data = await this.getData();
    data.devices = data.devices.filter(d => !hostnames.includes(d.hostname));
    await this.saveData(data);
  }
}

const globalForDb = global as unknown as { db: Database };
export const db = globalForDb.db || new Database();
if (process.env.NODE_ENV !== 'production') globalForDb.db = db;
