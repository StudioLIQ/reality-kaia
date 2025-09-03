export const TIMEOUT_PRESETS = [
  { label: "24H", seconds: 24 * 3600 },
  { label: "3D", seconds: 3 * 24 * 3600 },
  { label: "7D", seconds: 7 * 24 * 3600 },
  { label: "1M", seconds: 30 * 24 * 3600 },
  { label: "3M", seconds: 90 * 24 * 3600 },
];

export const unitSeconds = { s: 1, m: 60, h: 3600, d: 86400 };

export const toUnix = (dtLocal: string) => Math.floor(new Date(dtLocal).getTime() / 1000);

export const toLocalInput = (unix: number) => new Date(unix * 1000).toISOString().slice(0, 16);

export const fromNow = (seconds: number): string => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  
  if (days > 0) {
    return `${days}d ${hours}h from now`;
  } else if (hours > 0) {
    return `${hours}h from now`;
  } else {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m from now`;
  }
};