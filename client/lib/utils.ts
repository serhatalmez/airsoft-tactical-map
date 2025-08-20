import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  } else {
    return `${(meters / 1000).toFixed(1)}km`;
  }
}

export function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) {
    return 'Just now';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  } else if (diffInMinutes < 1440) {
    const hours = Math.floor(diffInMinutes / 60);
    return `${hours}h ago`;
  } else {
    return date.toLocaleDateString();
  }
}

export function generateRandomColor(): string {
  const colors = [
    '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
    '#FFA500', '#800080', '#008000', '#800000', '#008080', '#000080'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

export function validateGPSCoordinates(lat: number, lon: number): boolean {
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

export function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const lat1Rad = lat1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;
  
  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
  
  const bearing = Math.atan2(y, x) * 180 / Math.PI;
  return (bearing + 360) % 360;
}

export function formatCoordinates(lat: number, lon: number, precision: number = 6): string {
  return `${lat.toFixed(precision)}, ${lon.toFixed(precision)}`;
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Grid system utilities
export function convertToGridRef(lat: number, lon: number): string {
  // Simple grid reference system (can be enhanced for MGRS)
  const gridLat = Math.floor(lat * 1000) / 1000;
  const gridLon = Math.floor(lon * 1000) / 1000;
  return `${gridLat.toFixed(3)}, ${gridLon.toFixed(3)}`;
}

export function getGridSize(zoomLevel: number): number {
  // Return appropriate grid size based on zoom level
  if (zoomLevel >= 18) return 10; // 10m
  if (zoomLevel >= 16) return 50; // 50m
  if (zoomLevel >= 14) return 100; // 100m
  if (zoomLevel >= 12) return 500; // 500m
  return 1000; // 1km
}

// NATO symbol utilities
export function getNATOSymbolIcon(symbolType: string): string {
  const symbolMap: Record<string, string> = {
    friendly_unit: '🟢',
    enemy_unit: '🔴',
    neutral_unit: '🟡',
    objective: '🎯',
    waypoint: '📍',
    danger_area: '⚠️',
    safe_zone: '🛡️',
    rally_point: '🚩',
    observation_post: '👀',
    command_post: '📡',
    supply_depot: '📦',
    medical_station: '🏥',
    vehicle: '🚗',
    aircraft: '✈️',
    building: '🏢',
    bridge: '🌉',
    road_block: '🚧',
    mine_field: '💣',
    wire_obstacle: '⚡',
    bunker: '🏰',
    trench: '〰️',
  };
  return symbolMap[symbolType] || '📍';
}

export function getSymbolColor(symbolType: string): string {
  const colorMap: Record<string, string> = {
    friendly_unit: '#00FF00',
    enemy_unit: '#FF0000',
    neutral_unit: '#FFFF00',
    objective: '#00FFFF',
    danger_area: '#FF4500',
    safe_zone: '#32CD32',
    medical_station: '#FF69B4',
  };
  return colorMap[symbolType] || '#808080';
}
