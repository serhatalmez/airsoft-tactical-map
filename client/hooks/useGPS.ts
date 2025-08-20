'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Coordinates } from '@/shared/types';

interface UseGPSOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  updateInterval?: number;
}

interface GPSState {
  position: Coordinates | null;
  error: GeolocationPositionError | null;
  loading: boolean;
  permission: PermissionState | null;
}

export function useGPS(options: UseGPSOptions = {}) {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 5000,
    updateInterval = 5000
  } = options;

  const [state, setState] = useState<GPSState>({
    position: null,
    error: null,
    loading: false,
    permission: null,
  });

  const watchIdRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);

  const geolocationOptions: PositionOptions = {
    enableHighAccuracy,
    timeout,
    maximumAge,
  };

  const handleSuccess = useCallback((position: GeolocationPosition) => {
    const now = Date.now();
    
    // Throttle updates based on updateInterval
    if (now - lastUpdateRef.current < updateInterval) {
      return;
    }
    
    lastUpdateRef.current = now;
    
    const coordinates: Coordinates = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      heading: position.coords.heading || undefined,
      timestamp: new Date().toISOString(),
    };

    setState(prev => ({
      ...prev,
      position: coordinates,
      error: null,
      loading: false,
    }));
  }, [updateInterval]);

  const handleError = useCallback((error: GeolocationPositionError) => {
    console.error('GPS Error:', error);
    setState(prev => ({
      ...prev,
      error,
      loading: false,
    }));
  }, []);

  const startWatching = useCallback(() => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: new Error('Geolocation not supported') as any,
        loading: false,
      }));
      return;
    }

    setState(prev => ({ ...prev, loading: true }));

    watchIdRef.current = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      geolocationOptions
    );
  }, [handleSuccess, handleError, geolocationOptions]);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setState(prev => ({ ...prev, loading: false }));
  }, []);

  const getCurrentPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: new Error('Geolocation not supported') as any,
        loading: false,
      }));
      return Promise.reject(new Error('Geolocation not supported'));
    }

    setState(prev => ({ ...prev, loading: true }));

    return new Promise<Coordinates>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coordinates: Coordinates = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            heading: position.coords.heading || undefined,
            timestamp: new Date().toISOString(),
          };
          
          setState(prev => ({
            ...prev,
            position: coordinates,
            error: null,
            loading: false,
          }));
          
          resolve(coordinates);
        },
        (error) => {
          handleError(error);
          reject(error);
        },
        geolocationOptions
      );
    });
  }, [handleError, geolocationOptions]);

  // Check permission status
  useEffect(() => {
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        setState(prev => ({ ...prev, permission: result.state }));
        
        result.addEventListener('change', () => {
          setState(prev => ({ ...prev, permission: result.state }));
        });
      });
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopWatching();
    };
  }, [stopWatching]);

  return {
    ...state,
    startWatching,
    stopWatching,
    getCurrentPosition,
    isWatching: watchIdRef.current !== null,
  };
}

// Hook for device orientation (compass)
export function useDeviceOrientation() {
  const [orientation, setOrientation] = useState<{
    alpha: number | null; // Z-axis rotation (compass heading)
    beta: number | null;  // X-axis rotation
    gamma: number | null; // Y-axis rotation
  }>({
    alpha: null,
    beta: null,
    gamma: null,
  });

  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<PermissionState | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if DeviceOrientationEvent is supported
    setIsSupported('DeviceOrientationEvent' in window);

    const handleOrientation = (event: DeviceOrientationEvent) => {
      setOrientation({
        alpha: event.alpha, // 0-360 degrees
        beta: event.beta,   // -180 to 180 degrees
        gamma: event.gamma, // -90 to 90 degrees
      });
    };

    const requestPermission = async () => {
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        try {
          const permissionState = await (DeviceOrientationEvent as any).requestPermission();
          setPermission(permissionState);
          
          if (permissionState === 'granted') {
            window.addEventListener('deviceorientation', handleOrientation);
          }
        } catch (error) {
          console.error('Device orientation permission error:', error);
          setPermission('denied');
        }
      } else {
        // For non-iOS devices, permission is usually granted by default
        setPermission('granted');
        window.addEventListener('deviceorientation', handleOrientation);
      }
    };

    if (isSupported) {
      requestPermission();
    }

    return () => {
      if (isSupported) {
        window.removeEventListener('deviceorientation', handleOrientation);
      }
    };
  }, [isSupported]);

  const getCompassHeading = useCallback(() => {
    if (orientation.alpha === null) return null;
    
    // Convert to 0-360 degrees (North = 0°)
    let heading = 360 - orientation.alpha;
    if (heading >= 360) heading -= 360;
    if (heading < 0) heading += 360;
    
    return heading;
  }, [orientation.alpha]);

  return {
    orientation,
    isSupported,
    permission,
    compassHeading: getCompassHeading(),
  };
}

// Combined hook for location with compass
export function useLocationWithCompass(options: UseGPSOptions = {}) {
  const gps = useGPS(options);
  const orientation = useDeviceOrientation();

  const enhancedPosition = gps.position ? {
    ...gps.position,
    heading: orientation.compassHeading || gps.position.heading,
  } : null;

  return {
    ...gps,
    position: enhancedPosition,
    orientation: orientation.orientation,
    compassHeading: orientation.compassHeading,
    orientationSupported: orientation.isSupported,
    orientationPermission: orientation.permission,
  };
}
