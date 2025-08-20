import '@testing-library/jest-dom'

// Mock next/router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      replace: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn(),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
    }
  },
}))

// Mock next/dynamic
jest.mock('next/dynamic', () => {
  return (dynamicImportFunction, options = {}) => {
    const DynamicComponent = (props) => {
      if (options.ssr === false) {
        return null
      }
      return dynamicImportFunction().then((mod) => mod.default || mod)
    }
    DynamicComponent.displayName = 'DynamicComponent'
    return DynamicComponent
  }
})

// Mock Geolocation API
const mockGeolocation = {
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
  clearWatch: jest.fn(),
}

Object.defineProperty(global.navigator, 'geolocation', {
  value: mockGeolocation,
  writable: true,
})

// Mock DeviceOrientationEvent
Object.defineProperty(global, 'DeviceOrientationEvent', {
  value: class MockDeviceOrientationEvent extends Event {
    constructor(type, eventInitDict) {
      super(type, eventInitDict)
      this.alpha = eventInitDict?.alpha || null
      this.beta = eventInitDict?.beta || null
      this.gamma = eventInitDict?.gamma || null
    }
    static requestPermission = jest.fn().mockResolvedValue('granted')
  },
  writable: true,
})

// Mock Socket.io client
jest.mock('socket.io-client', () => {
  return {
    io: jest.fn(() => ({
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn(),
      connected: true,
    })),
    Socket: jest.fn(),
  }
})

// Mock Leaflet
jest.mock('leaflet', () => ({
  map: jest.fn(() => ({
    setView: jest.fn(),
    addLayer: jest.fn(),
    removeLayer: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    getCenter: jest.fn(() => ({ lat: 0, lng: 0 })),
    getZoom: jest.fn(() => 13),
    getBounds: jest.fn(() => ({
      getSouth: jest.fn(() => -1),
      getNorth: jest.fn(() => 1),
      getWest: jest.fn(() => -1),
      getEast: jest.fn(() => 1),
      getCenter: jest.fn(() => ({ lat: 0, lng: 0 })),
    })),
    zoomIn: jest.fn(),
    zoomOut: jest.fn(),
  })),
  tileLayer: jest.fn(() => ({
    addTo: jest.fn(),
  })),
  marker: jest.fn(() => ({
    addTo: jest.fn(),
    bindPopup: jest.fn(),
    setLatLng: jest.fn(),
    getLatLng: jest.fn(() => ({ lat: 0, lng: 0 })),
  })),
  popup: jest.fn(),
  Icon: {
    Default: {
      prototype: {
        _getIconUrl: jest.fn(),
      },
      mergeOptions: jest.fn(),
    },
  },
  divIcon: jest.fn(),
  polyline: jest.fn(() => ({
    addTo: jest.fn(),
  })),
}))

// Mock react-leaflet
jest.mock('react-leaflet', () => ({
  MapContainer: ({ children, ...props }) => <div data-testid="map-container" {...props}>{children}</div>,
  TileLayer: (props) => <div data-testid="tile-layer" {...props} />,
  Marker: ({ children, ...props }) => <div data-testid="marker" {...props}>{children}</div>,
  Popup: ({ children, ...props }) => <div data-testid="popup" {...props}>{children}</div>,
  useMap: jest.fn(() => ({
    setView: jest.fn(),
    addLayer: jest.fn(),
    removeLayer: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    getCenter: jest.fn(() => ({ lat: 0, lng: 0 })),
    getZoom: jest.fn(() => 13),
    getBounds: jest.fn(() => ({
      getSouth: jest.fn(() => -1),
      getNorth: jest.fn(() => 1),
      getWest: jest.fn(() => -1),
      getEast: jest.fn(() => 1),
      getCenter: jest.fn(() => ({ lat: 0, lng: 0 })),
    })),
  })),
  useMapEvents: jest.fn((handlers) => {
    // Simulate map events for testing
    return null
  }),
}))

// Setup global fetch mock
global.fetch = jest.fn()

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}
