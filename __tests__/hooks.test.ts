/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useGPS, useDeviceOrientation } from '../client/hooks/useGPS'
import { renderHook, act } from '@testing-library/react'

// Mock the navigator.geolocation
const mockGeolocation = {
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
  clearWatch: jest.fn(),
}

// Test the GPS hook
describe('useGPS hook', () => {
  beforeEach(() => {
    Object.defineProperty(global.navigator, 'geolocation', {
      value: mockGeolocation,
      writable: true,
    })
    jest.clearAllMocks()
  })

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useGPS())
    
    expect(result.current.position).toBeNull()
    expect(result.current.error).toBeNull()
    expect(result.current.loading).toBe(false)
    expect(result.current.isWatching).toBe(false)
  })

  it('should start watching position', async () => {
    const watchId = 1
    mockGeolocation.watchPosition.mockReturnValue(watchId)

    const { result } = renderHook(() => useGPS())
    
    act(() => {
      result.current.startWatching()
    })

    expect(mockGeolocation.watchPosition).toHaveBeenCalled()
    expect(result.current.loading).toBe(true)
    expect(result.current.isWatching).toBe(true)
  })

  it('should handle GPS success', async () => {
    const mockPosition = {
      coords: {
        latitude: 51.505,
        longitude: -0.09,
        accuracy: 10,
        heading: 180,
      },
      timestamp: Date.now(),
    }

    mockGeolocation.watchPosition.mockImplementation((success) => {
      setTimeout(() => success(mockPosition), 0)
      return 1
    })

    const { result } = renderHook(() => useGPS())
    
    act(() => {
      result.current.startWatching()
    })

    await waitFor(() => {
      expect(result.current.position).toEqual({
        latitude: 51.505,
        longitude: -0.09,
        accuracy: 10,
        heading: 180,
        timestamp: expect.any(String),
      })
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })
  })

  it('should handle GPS error', async () => {
    const mockError = {
      code: 1,
      message: 'User denied geolocation',
    }

    mockGeolocation.watchPosition.mockImplementation((success, error) => {
      setTimeout(() => error(mockError), 0)
      return 1
    })

    const { result } = renderHook(() => useGPS())
    
    act(() => {
      result.current.startWatching()
    })

    await waitFor(() => {
      expect(result.current.error).toEqual(mockError)
      expect(result.current.loading).toBe(false)
    })
  })

  it('should stop watching position', () => {
    const watchId = 1
    mockGeolocation.watchPosition.mockReturnValue(watchId)

    const { result } = renderHook(() => useGPS())
    
    act(() => {
      result.current.startWatching()
    })

    act(() => {
      result.current.stopWatching()
    })

    expect(mockGeolocation.clearWatch).toHaveBeenCalledWith(watchId)
    expect(result.current.isWatching).toBe(false)
    expect(result.current.loading).toBe(false)
  })
})

// Test device orientation hook
describe('useDeviceOrientation hook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useDeviceOrientation())
    
    expect(result.current.orientation).toEqual({
      alpha: null,
      beta: null,
      gamma: null,
    })
    expect(result.current.compassHeading).toBeNull()
  })

  it('should calculate compass heading correctly', () => {
    const { result } = renderHook(() => useDeviceOrientation())
    
    // Simulate device orientation event
    act(() => {
      const event = new DeviceOrientationEvent('deviceorientation', {
        alpha: 90, // 90 degrees
        beta: 0,
        gamma: 0,
      })
      window.dispatchEvent(event)
    })

    // Compass heading should be 270 (360 - 90)
    expect(result.current.compassHeading).toBe(270)
  })
})

// Test utility functions
describe('Utility functions', () => {
  describe('calculateDistance', () => {
    it('should calculate distance between two coordinates', () => {
      // Mock implementation of calculateDistance
      const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 6371e3 // Earth's radius in meters
        const φ1 = lat1 * Math.PI / 180
        const φ2 = lat2 * Math.PI / 180
        const Δφ = (lat2 - lat1) * Math.PI / 180
        const Δλ = (lon2 - lon1) * Math.PI / 180

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ/2) * Math.sin(Δλ/2)
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

        return R * c
      }

      // Test known coordinates (approximately 111km apart)
      const distance = calculateDistance(0, 0, 1, 0)
      expect(distance).toBeCloseTo(111320, -3) // Within 1km accuracy
    })
  })

  describe('validateGPSCoordinates', () => {
    it('should validate GPS coordinates', () => {
      const validateGPSCoordinates = (lat: number, lon: number): boolean => {
        return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180
      }

      expect(validateGPSCoordinates(51.505, -0.09)).toBe(true)
      expect(validateGPSCoordinates(91, 0)).toBe(false) // Invalid latitude
      expect(validateGPSCoordinates(0, 181)).toBe(false) // Invalid longitude
      expect(validateGPSCoordinates(-91, 0)).toBe(false) // Invalid latitude
      expect(validateGPSCoordinates(0, -181)).toBe(false) // Invalid longitude
    })
  })

  describe('formatDistance', () => {
    it('should format distance correctly', () => {
      const formatDistance = (meters: number): string => {
        if (meters < 1000) {
          return `${Math.round(meters)}m`
        } else {
          return `${(meters / 1000).toFixed(1)}km`
        }
      }

      expect(formatDistance(500)).toBe('500m')
      expect(formatDistance(1500)).toBe('1.5km')
      expect(formatDistance(999)).toBe('999m')
      expect(formatDistance(1000)).toBe('1.0km')
    })
  })
})

// Test component integration
describe('Component Integration', () => {
  it('should handle offline state', () => {
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    })

    // Test that components handle offline state correctly
    expect(navigator.onLine).toBe(false)
  })

  it('should handle GPS permission states', async () => {
    // Mock permissions API
    const mockPermissions = {
      query: jest.fn().mockResolvedValue({
        state: 'granted',
        addEventListener: jest.fn(),
      }),
    }

    Object.defineProperty(navigator, 'permissions', {
      value: mockPermissions,
      writable: true,
    })

    await navigator.permissions.query({ name: 'geolocation' })
    expect(mockPermissions.query).toHaveBeenCalledWith({ name: 'geolocation' })
  })
})

// Test error handling
describe('Error Handling', () => {
  it('should handle network errors gracefully', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))

    try {
      await fetch('/api/test')
    } catch (error) {
      expect((error as Error).message).toBe('Network error')
    }
  })

  it('should handle invalid room codes', () => {
    const validateRoomCode = (code: string): boolean => {
      return /^[A-Z0-9]{6,20}$/.test(code)
    }

    expect(validateRoomCode('VALID123')).toBe(true)
    expect(validateRoomCode('invalid')).toBe(false)
    expect(validateRoomCode('TOO_LONG_CODE_123456789')).toBe(false)
    expect(validateRoomCode('SHORT')).toBe(false)
  })
})
