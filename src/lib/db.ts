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

type DeviceIdentifier = {
  hostname?: string | null;
  macAddress?: string | null;
};

const DB_KEY = 'air-ir-remote-db';

const normalizeMacAddress = (macAddress?: string | null) => (
  macAddress?.trim().toUpperCase() || ''
);

class Database {
  private normalizeIdentifier(identifier: string | DeviceIdentifier): DeviceIdentifier {
    return typeof identifier === 'string' ? { hostname: identifier } : identifier;
  }

  private findDeviceIndex(data: DatabaseData, identifier: string | DeviceIdentifier): number {
    const normalizedIdentifier = this.normalizeIdentifier(identifier);
    const macAddress = normalizeMacAddress(normalizedIdentifier.macAddress);

    if (macAddress) {
      const byMac = data.devices.findIndex(d => normalizeMacAddress(d.macAddress) === macAddress);
      if (byMac >= 0) return byMac;
    }

    const hostname = normalizedIdentifier.hostname?.trim();
    if (hostname) {
      return data.devices.findIndex(d => d.hostname === hostname);
    }

    return -1;
  }

  private findDevice(data: DatabaseData, identifier: string | DeviceIdentifier): Device | undefined {
    const index = this.findDeviceIndex(data, identifier);
    return index >= 0 ? data.devices[index] : undefined;
  }

  private createMacAddressSet(macAddresses: string[]): Set<string> {
    return new Set(macAddresses.map(normalizeMacAddress).filter(Boolean));
  }

  private ensureProject(data: DatabaseData, projectName: string) {
    if (!data.projects.includes(projectName)) {
      data.projects.push(projectName);
    }
  }

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
    const macAddress = normalizeMacAddress(mac);
    const existingIndex = this.findDeviceIndex(data, { macAddress });
    const existing = existingIndex >= 0 ? data.devices[existingIndex] : null;
    
    const newDevice: Device = {
      hostname,
      firmwareVersion: version,
      macAddress,
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

  async updateHeartbeat(identifier: string | DeviceIdentifier) {
    const data = await this.getData();
    const device = this.findDevice(data, identifier);
    if (device) {
      device.lastHeartbeat = Date.now();
      if (device.status !== 'Flashing') {
        device.status = 'Online';
      }
      await this.saveData(data);
    }
  }

  async checkUpdateStatus(identifier: string | DeviceIdentifier): Promise<boolean> {
    const data = await this.getData();
    const device = this.findDevice(data, identifier);
    if (!device) return false;
    return device.hasUpdate;
  }

  async setUpdateStatus(identifier: string | DeviceIdentifier, status: boolean, firmwareUrl?: string) {
    const data = await this.getData();
    const device = this.findDevice(data, identifier);
    if (device) {
      device.hasUpdate = status;
      if (firmwareUrl !== undefined) {
        device.firmwareUrl = firmwareUrl;
      }
      await this.saveData(data);
    }
  }

  async setFlashing(identifier: string | DeviceIdentifier) {
    const data = await this.getData();
    const device = this.findDevice(data, identifier);
    if (device) {
      device.status = 'Flashing';
      device.hasUpdate = false;
      await this.saveData(data);
    }
  }

  async getDevice(identifier: string | DeviceIdentifier): Promise<Device | undefined> {
    const data = await this.getData();
    return this.findDevice(data, identifier);
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
    this.ensureProject(data, name);
    await this.saveData(data);
  }

  async assignToProject(hostnames: string[], projectName: string) {
    const data = await this.getData();
    this.ensureProject(data, projectName);
    
    data.devices.forEach(device => {
      if (hostnames.includes(device.hostname)) {
        device.projectName = projectName;
      }
    });
    
    await this.saveData(data);
  }

  async assignToProjectByMac(macAddresses: string[], projectName: string) {
    const data = await this.getData();
    const macAddressSet = this.createMacAddressSet(macAddresses);
    this.ensureProject(data, projectName);

    data.devices.forEach(device => {
      if (macAddressSet.has(normalizeMacAddress(device.macAddress))) {
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

  async removeDevicesByMac(macAddresses: string[]) {
    const data = await this.getData();
    const macAddressSet = this.createMacAddressSet(macAddresses);
    data.devices = data.devices.filter(d => !macAddressSet.has(normalizeMacAddress(d.macAddress)));
    await this.saveData(data);
  }
}

const globalForDb = global as unknown as { db: Database };
export const db = globalForDb.db || new Database();
if (process.env.NODE_ENV !== 'production') globalForDb.db = db;
