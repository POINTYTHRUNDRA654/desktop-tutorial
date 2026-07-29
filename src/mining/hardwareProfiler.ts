import * as os from 'os';
import { exec } from 'child_process';
import * as util from 'util';
import { HardwareProfile, StorageInfo } from '../shared/types';

const execAsync = util.promisify(exec);

let cachedProfile: HardwareProfile | null = null;
let cachedProfileAt = 0;
const PROFILE_CACHE_MS = 5 * 60 * 1000;

/**
 * Real hardware detection shared across the Phase 2 mining engines, via
 * os.cpus()/os.totalmem() plus wmic/nvidia-smi queries on Windows. Cached for
 * 5 minutes since these values change rarely and each refresh spawns several
 * subprocesses.
 */
export async function getRealHardwareProfile(): Promise<HardwareProfile> {
  if (cachedProfile && Date.now() - cachedProfileAt < PROFILE_CACHE_MS) {
    return cachedProfile;
  }

  const cpus = os.cpus();
  const cpuModel = (cpus[0]?.model || 'Unknown CPU').trim();
  const reportedSpeedGHz = Math.round((cpus[0]?.speed || 0)) / 1000;
  const logicalCores = cpus.length || 1;
  let physicalCores = logicalCores;
  let maxClockGHz = reportedSpeedGHz;
  let cacheKB = 0;

  let gpuModel = 'Unknown GPU';
  let vramGB = 0;
  let driverVersion = 'Unknown';
  let rayTracing = false;

  let ramSpeed = 0;
  let ramType = 'Unknown';
  let memorySticks = 1;

  let storageType: StorageInfo['type'] = 'Unknown';
  let totalGB = 0;
  let availableGB = 0;

  if (process.platform === 'win32') {
    try {
      const { stdout } = await execAsync('wmic cpu get NumberOfCores,MaxClockSpeed,L3CacheSize /format:csv', { timeout: 5000 });
      const lines = stdout.split('\n').map(l => l.trim()).filter(Boolean);
      const header = lines[0]?.split(',').map(h => h.trim());
      const row = lines[1]?.split(',').map(v => v.trim());
      if (header && row) {
        const idxCores = header.indexOf('NumberOfCores');
        const idxClock = header.indexOf('MaxClockSpeed');
        const idxCache = header.indexOf('L3CacheSize');
        if (idxCores >= 0 && row[idxCores]) physicalCores = parseInt(row[idxCores], 10) || physicalCores;
        if (idxClock >= 0 && row[idxClock]) maxClockGHz = (parseInt(row[idxClock], 10) || 0) / 1000 || maxClockGHz;
        if (idxCache >= 0 && row[idxCache]) cacheKB = parseInt(row[idxCache], 10) || 0;
      }
    } catch { /* fall back to os.cpus()-derived values */ }

    try {
      const { stdout } = await execAsync('wmic memorychip get Speed,SMBIOSMemoryType /format:csv', { timeout: 5000 });
      const lines = stdout.split('\n').map(l => l.trim()).filter(Boolean);
      const header = lines[0]?.split(',').map(h => h.trim());
      const rows = lines.slice(1).map(l => l.split(',').map(v => v.trim())).filter(r => header && r.length === header.length);
      if (header && rows.length > 0) {
        memorySticks = rows.length;
        const idxSpeed = header.indexOf('Speed');
        const idxType = header.indexOf('SMBIOSMemoryType');
        if (idxSpeed >= 0) ramSpeed = parseInt(rows[0][idxSpeed], 10) || 0;
        if (idxType >= 0) {
          const typeCode = parseInt(rows[0][idxType], 10);
          ramType = typeCode === 26 ? 'DDR4' : typeCode === 34 ? 'DDR5' : typeCode === 24 ? 'DDR3' : 'Unknown';
        }
      }
    } catch { /* fall back to Unknown */ }

    try {
      const { stdout } = await execAsync('wmic logicaldisk where "DeviceID=\'C:\'" get Size,FreeSpace /format:csv', { timeout: 5000 });
      const lines = stdout.split('\n').map(l => l.trim()).filter(Boolean);
      const header = lines[0]?.split(',').map(h => h.trim());
      const row = lines[1]?.split(',').map(v => v.trim());
      if (header && row) {
        const idxSize = header.indexOf('Size');
        const idxFree = header.indexOf('FreeSpace');
        if (idxSize >= 0) totalGB = Math.round((parseInt(row[idxSize], 10) || 0) / (1024 ** 3));
        if (idxFree >= 0) availableGB = Math.round((parseInt(row[idxFree], 10) || 0) / (1024 ** 3));
      }
    } catch { /* fall back to 0 */ }

    try {
      const { stdout } = await execAsync('powershell -NoProfile -Command "(Get-PhysicalDisk | Where-Object { $_.DeviceId -eq 0 }).MediaType"', { timeout: 5000 });
      const mediaType = stdout.trim();
      if (/SSD/i.test(mediaType)) storageType = 'SSD';
      else if (/HDD/i.test(mediaType)) storageType = 'HDD';
    } catch { /* leave Unknown */ }

    if (storageType === 'SSD') {
      try {
        const { stdout } = await execAsync('wmic diskdrive get model', { timeout: 5000 });
        if (/NVMe/i.test(stdout)) storageType = 'NVMe';
      } catch { /* keep SSD */ }
    }
  }

  try {
    const { stdout } = await execAsync(
      'nvidia-smi --query-gpu=name,memory.total,driver_version --format=csv,noheader',
      { timeout: 3000 }
    );
    const [name, memTotal, driver] = stdout.split(',').map(s => s.trim());
    if (name) {
      gpuModel = name;
      vramGB = Math.round(((parseFloat(memTotal) || 0) / 1024) * 10) / 10;
      driverVersion = driver || 'Unknown';
      rayTracing = /RTX|Quadro RTX|RTX A\d+/i.test(name);
    }
  } catch {
    if (process.platform === 'win32') {
      try {
        const { stdout: nameOut } = await execAsync('wmic path win32_VideoController get name', { timeout: 5000 });
        const nameLines = nameOut.split('\n').map(l => l.trim()).filter(l => l && l !== 'Name');
        if (nameLines.length > 0) gpuModel = nameLines[0];

        const { stdout: ramOut } = await execAsync('wmic path win32_VideoController get AdapterRAM', { timeout: 5000 });
        const ramLines = ramOut.split('\n').map(l => l.trim()).filter(l => l && l !== 'AdapterRAM');
        if (ramLines.length > 0) {
          const bytes = parseInt(ramLines[0], 10);
          if (!isNaN(bytes) && bytes > 0) vramGB = Math.round((bytes / (1024 ** 3)) * 10) / 10;
        }
        rayTracing = /RTX/i.test(gpuModel);
      } catch { /* leave Unknown GPU */ }
    }
  }

  const readSpeed = storageType === 'NVMe' ? 3000 : storageType === 'SSD' ? 500 : storageType === 'HDD' ? 120 : 0;
  const writeSpeed = storageType === 'NVMe' ? 2500 : storageType === 'SSD' ? 450 : storageType === 'HDD' ? 100 : 0;

  const profile: HardwareProfile = {
    cpu: {
      model: cpuModel,
      cores: physicalCores,
      threads: logicalCores,
      baseClock: reportedSpeedGHz || maxClockGHz,
      boostClock: maxClockGHz,
      cache: Math.round(cacheKB / 1024) || 0,
      architecture: os.arch()
    },
    gpu: {
      model: gpuModel,
      vram: vramGB,
      driverVersion,
      dxVersion: process.platform === 'win32' ? '12' : 'Unknown',
      rayTracing
    },
    ram: {
      total: Math.round(os.totalmem() / (1024 ** 3)),
      speed: ramSpeed,
      type: ramType,
      channels: memorySticks
    },
    storage: {
      type: storageType,
      readSpeed,
      writeSpeed,
      totalSpace: totalGB,
      availableSpace: availableGB
    },
    os: {
      name: process.platform === 'win32' ? 'Windows' : os.type(),
      version: os.release(),
      architecture: os.arch() === 'x64' ? 'x64' : os.arch() === 'arm64' ? 'arm64' : os.arch() === 'ia32' ? 'x86' : 'Unknown',
      build: os.release()
    }
  };

  cachedProfile = profile;
  cachedProfileAt = Date.now();
  return profile;
}

/** Real live CPU/memory/GPU utilization percentages (not a hardware inventory). */
export async function getRealtimeSystemMetrics(): Promise<{ cpuUsagePercent: number; memoryUsagePercent: number; gpuUsagePercent: number }> {
  const cpusStart = os.cpus();
  await new Promise(resolve => setTimeout(resolve, 100));
  const cpusEnd = os.cpus();

  let idleDelta = 0, totalDelta = 0;
  for (let i = 0; i < cpusEnd.length; i++) {
    const start = cpusStart[i].times;
    const end = cpusEnd[i].times;
    const idle = end.idle - start.idle;
    const total = (end.user - start.user) + (end.nice - start.nice) + (end.sys - start.sys) + (end.irq - start.irq) + idle;
    idleDelta += idle;
    totalDelta += total;
  }
  const cpuUsagePercent = totalDelta > 0 ? Math.round((1 - idleDelta / totalDelta) * 100) : 0;
  const memoryUsagePercent = Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100);

  let gpuUsagePercent = 0;
  try {
    const { stdout } = await execAsync('nvidia-smi --query-gpu=utilization.gpu --format=csv,noheader,nounits', { timeout: 3000 });
    const values = stdout.split('\n').map(l => parseFloat(l.trim())).filter(v => !isNaN(v));
    if (values.length > 0) gpuUsagePercent = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  } catch { /* no NVIDIA GPU / driver — leave 0 */ }

  return { cpuUsagePercent, memoryUsagePercent, gpuUsagePercent };
}

/** Real live GPU VRAM usage in MB via nvidia-smi. Returns null if no NVIDIA GPU/driver is present. */
export async function getRealtimeGpuMemory(): Promise<{ usedMB: number; totalMB: number } | null> {
  try {
    const { stdout } = await execAsync(
      'nvidia-smi --query-gpu=memory.used,memory.total --format=csv,noheader,nounits',
      { timeout: 3000 }
    );
    const [used, total] = stdout.split(',').map(s => parseFloat(s.trim()));
    if (!isNaN(used) && !isNaN(total)) {
      return { usedMB: Math.round(used), totalMB: Math.round(total) };
    }
    return null;
  } catch {
    return null;
  }
}
