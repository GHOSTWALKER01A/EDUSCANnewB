import crypto from 'crypto';

/**
 * Hashes a plaintext MAC address with a user-specific salt.
 * Ensures strict compliance with data privacy regulations (GDPR/DPDP).
 */
export const hashMacAddress = (mac: string, salt: string): string => {
  return crypto.createHmac('sha256', salt).update(mac.toLowerCase()).digest('hex');
};

/**
 * Calculates the Great-Circle distance between two coordinates in meters.
 * Uses the Haversine formula to account for Earth's spherical shape.
 * 
 * NOTE: We can use 'geolib' (already installed), but this provides an isolated util if needed.
 */
export const calculateGeodesicDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3; // Earth radius in meters
  const toRad = (value: number) => value * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
            
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
};
