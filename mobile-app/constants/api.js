// constants/api.js
import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEY = '@smart_light_ip';
export const DEFAULT_IP = '192.168.1.100';
export const FETCH_TIMEOUT = 5000;

export const getStoredIP = async () => {
  try {
    const ip = await AsyncStorage.getItem(STORAGE_KEY);
    return ip || DEFAULT_IP;
  } catch {
    return DEFAULT_IP;
  }
};

export const saveIP = async (ip) => {
  await AsyncStorage.setItem(STORAGE_KEY, ip);
};

// Fetch with timeout helper
const fetchWithTimeout = (url, timeout = FETCH_TIMEOUT) => {
  return Promise.race([
    fetch(url),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out')), timeout)
    ),
  ]);
};

/**
 * GET /api/status
 * Returns: { count: number, light: number, autoMode: boolean, servoState: 0|1 }
 */
export const fetchStatus = async (ip) => {
  const response = await fetchWithTimeout(`http://${ip}/api/status`);
  const json = await response.json();
  return json; // { count, light, autoMode, servoState }
};

/**
 * GET /api/manual/on  → force light ON (disables auto mode on ESP32)
 * GET /api/manual/off → force light OFF (disables auto mode on ESP32)
 * GET /api/auto       → restore auto mode
 */
export const sendCommand = async (ip, action) => {
  // action: 'manual/on' | 'manual/off' | 'auto'
  const response = await fetchWithTimeout(`http://${ip}/api/${action}`);
  const text = await response.text();
  return text;
};
