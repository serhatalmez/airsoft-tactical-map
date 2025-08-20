'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/client/components/ui/button';
import { 
  Crosshair, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Navigation,
  Grid3X3,
  Layers,
  Settings 
} from 'lucide-react';
import { UserPosition, TacticalSymbol, Coordinates } from '@/shared/types';
import { formatDistance, getNATOSymbolIcon, getSymbolColor } from '@/client/lib/utils';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapViewProps {
  roomId: string;
  userId: string;
  positions: UserPosition[];
  symbols: TacticalSymbol[];
  userPosition?: Coordinates;
  onPositionUpdate: (position: Coordinates) => void;
  onSymbolCreate: (symbol: Omit<TacticalSymbol, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onSymbolUpdate: (id: string, symbol: Partial<TacticalSymbol>) => void;
  onSymbolDelete: (id: string) => void;
}

// Component to handle map events
function MapEventHandler({ 
  onMapClick, 
  onMapMove 
}: { 
  onMapClick: (lat: number, lng: number) => void;
  onMapMove: (center: L.LatLng, zoom: number) => void;
}) {
  const map = useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
    moveend: () => {
      onMapMove(map.getCenter(), map.getZoom());
    },
    zoomend: () => {
      onMapMove(map.getCenter(), map.getZoom());
    },
  });

  return null;
}

// Grid overlay component
function GridOverlay({ gridSize = 100 }: { gridSize?: number }) {
  const map = useMap();
  const [gridLines, setGridLines] = useState<L.Polyline[]>([]);

  useEffect(() => {
    const updateGrid = () => {
      // Clear existing grid lines
      gridLines.forEach(line => map.removeLayer(line));
      const newLines: L.Polyline[] = [];

      const bounds = map.getBounds();
      const zoom = map.getZoom();
      
      // Only show grid at appropriate zoom levels
      if (zoom < 12) return;

      const latStep = gridSize / 111000; // Approximate meters to degrees
      const lngStep = gridSize / (111000 * Math.cos(bounds.getCenter().lat * Math.PI / 180));

      const minLat = Math.floor(bounds.getSouth() / latStep) * latStep;
      const maxLat = Math.ceil(bounds.getNorth() / latStep) * latStep;
      const minLng = Math.floor(bounds.getWest() / lngStep) * lngStep;
      const maxLng = Math.ceil(bounds.getEast() / lngStep) * lngStep;

      // Draw vertical lines
      for (let lng = minLng; lng <= maxLng; lng += lngStep) {
        const line = L.polyline([[minLat, lng], [maxLat, lng]], {
          color: '#666666',
          weight: 1,
          opacity: 0.3,
        }).addTo(map);
        newLines.push(line);
      }

      // Draw horizontal lines
      for (let lat = minLat; lat <= maxLat; lat += latStep) {
        const line = L.polyline([[lat, minLng], [lat, maxLng]], {
          color: '#666666',
          weight: 1,
          opacity: 0.3,
        }).addTo(map);
        newLines.push(line);
      }

      setGridLines(newLines);
    };

    map.on('moveend zoomend', updateGrid);
    updateGrid();

    return () => {
      map.off('moveend zoomend', updateGrid);
      gridLines.forEach(line => map.removeLayer(line));
    };
  }, [map, gridSize]);

  return null;
}

// User position marker with direction indicator
function UserMarker({ 
  position, 
  isCurrentUser = false,
  username 
}: { 
  position: UserPosition;
  isCurrentUser?: boolean;
  username?: string;
}) {
  const userIcon = L.divIcon({
    className: 'user-marker',
    html: `
      <div class="relative">
        <div class="w-6 h-6 rounded-full ${isCurrentUser ? 'bg-blue-500' : 'bg-green-500'} border-2 border-white shadow-lg"></div>
        ${position.coordinates.heading !== undefined ? `
          <div class="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full">
            <div class="w-0 h-0 border-l-2 border-r-2 border-b-4 border-transparent border-b-${isCurrentUser ? 'blue' : 'green'}-500"
                 style="transform: rotate(${position.coordinates.heading}deg)"></div>
          </div>
        ` : ''}
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  return (
    <Marker
      position={[position.coordinates.latitude, position.coordinates.longitude]}
      icon={userIcon}
    >
      <Popup>
        <div className="text-sm">
          <h3 className="font-semibold">{username || 'User'}</h3>
          <p>Lat: {position.coordinates.latitude.toFixed(6)}</p>
          <p>Lng: {position.coordinates.longitude.toFixed(6)}</p>
          {position.coordinates.accuracy && (
            <p>Accuracy: ±{Math.round(position.coordinates.accuracy)}m</p>
          )}
          {position.coordinates.heading !== undefined && (
            <p>Heading: {Math.round(position.coordinates.heading)}°</p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Updated: {new Date(position.lastUpdated).toLocaleTimeString()}
          </p>
        </div>
      </Popup>
    </Marker>
  );
}

// Tactical symbol marker
function SymbolMarker({ 
  symbol, 
  onUpdate, 
  onDelete 
}: { 
  symbol: TacticalSymbol;
  onUpdate: (updates: Partial<TacticalSymbol>) => void;
  onDelete: () => void;
}) {
  const symbolIcon = L.divIcon({
    className: 'tactical-symbol',
    html: `
      <div class="text-2xl" style="color: ${symbol.color}; transform: rotate(${symbol.rotation}deg)">
        ${getNATOSymbolIcon(symbol.type)}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

  return (
    <Marker
      position={[symbol.coordinates.latitude, symbol.coordinates.longitude]}
      icon={symbolIcon}
      draggable={true}
      eventHandlers={{
        dragend: (e) => {
          const marker = e.target;
          const position = marker.getLatLng();
          onUpdate({
            coordinates: {
              latitude: position.lat,
              longitude: position.lng,
            },
          });
        },
      }}
    >
      <Popup>
        <div className="text-sm min-w-48">
          <h3 className="font-semibold">{symbol.label || symbol.type}</h3>
          {symbol.description && (
            <p className="text-gray-600 mb-2">{symbol.description}</p>
          )}
          <div className="space-y-1 text-xs">
            <p>Type: {symbol.type.replace('_', ' ')}</p>
            <p>Position: {symbol.coordinates.latitude.toFixed(6)}, {symbol.coordinates.longitude.toFixed(6)}</p>
            <p>Size: {symbol.size}</p>
            <p>Rotation: {symbol.rotation}°</p>
          </div>
          <div className="flex gap-2 mt-2">
            <Button size="sm" variant="outline" onClick={() => onUpdate({ isVisible: !symbol.isVisible })}>
              {symbol.isVisible ? 'Hide' : 'Show'}
            </Button>
            <Button size="sm" variant="destructive" onClick={onDelete}>
              Delete
            </Button>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

export default function MapView({
  roomId,
  userId,
  positions,
  symbols,
  userPosition,
  onPositionUpdate,
  onSymbolCreate,
  onSymbolUpdate,
  onSymbolDelete,
}: MapViewProps) {
  const mapRef = useRef<L.Map>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([51.505, -0.09]);
  const [mapZoom, setMapZoom] = useState(13);
  const [showGrid, setShowGrid] = useState(true);
  const [selectedSymbolType, setSelectedSymbolType] = useState('waypoint');
  const [isPlacingSymbol, setIsPlacingSymbol] = useState(false);

  // Update map center when user position changes
  useEffect(() => {
    if (userPosition && mapRef.current) {
      const newCenter: [number, number] = [userPosition.latitude, userPosition.longitude];
      setMapCenter(newCenter);
      mapRef.current.setView(newCenter, mapZoom);
    }
  }, [userPosition, mapZoom]);

  const handleMapClick = useCallback((lat: number, lng: number) => {
    if (isPlacingSymbol) {
      onSymbolCreate({
        roomId,
        createdBy: userId,
        type: selectedSymbolType as any,
        coordinates: { latitude: lat, longitude: lng },
        color: getSymbolColor(selectedSymbolType),
        size: 'medium',
        rotation: 0,
        isVisible: true,
      });
      setIsPlacingSymbol(false);
    }
  }, [isPlacingSymbol, selectedSymbolType, roomId, userId, onSymbolCreate]);

  const handleMapMove = useCallback((center: L.LatLng, zoom: number) => {
    setMapCenter([center.lat, center.lng]);
    setMapZoom(zoom);
  }, []);

  const centerOnUser = useCallback(() => {
    if (userPosition && mapRef.current) {
      mapRef.current.setView([userPosition.latitude, userPosition.longitude], 16);
    }
  }, [userPosition]);

  const zoomIn = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.zoomIn();
    }
  }, []);

  const zoomOut = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.zoomOut();
    }
  }, []);

  return (
    <div className="relative w-full h-full">
      {/* Map Container */}
      <MapContainer
        ref={mapRef}
        center={mapCenter}
        zoom={mapZoom}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Grid overlay */}
        {showGrid && <GridOverlay gridSize={100} />}
        
        {/* Map event handler */}
        <MapEventHandler onMapClick={handleMapClick} onMapMove={handleMapMove} />
        
        {/* User position markers */}
        {positions.map((position) => (
          <UserMarker
            key={position.userId}
            position={position}
            isCurrentUser={position.userId === userId}
            username={`User-${position.userId.slice(-4)}`}
          />
        ))}
        
        {/* Tactical symbol markers */}
        {symbols.filter(s => s.isVisible).map((symbol) => (
          <SymbolMarker
            key={symbol.id}
            symbol={symbol}
            onUpdate={(updates) => onSymbolUpdate(symbol.id, updates)}
            onDelete={() => onSymbolDelete(symbol.id)}
          />
        ))}
      </MapContainer>

      {/* Map Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <Button
          size="icon"
          variant="outline"
          className="bg-white shadow-lg"
          onClick={centerOnUser}
          disabled={!userPosition}
        >
          <Navigation className="h-4 w-4" />
        </Button>
        
        <Button
          size="icon"
          variant="outline"
          className="bg-white shadow-lg"
          onClick={zoomIn}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        
        <Button
          size="icon"
          variant="outline"
          className="bg-white shadow-lg"
          onClick={zoomOut}
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        
        <Button
          size="icon"
          variant="outline"
          className={`bg-white shadow-lg ${showGrid ? 'bg-gray-100' : ''}`}
          onClick={() => setShowGrid(!showGrid)}
        >
          <Grid3X3 className="h-4 w-4" />
        </Button>
      </div>

      {/* Symbol Toolbar */}
      <div className="absolute bottom-4 left-4 right-4 z-10">
        <div className="bg-white rounded-lg shadow-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-sm font-medium">Tactical Symbols</h3>
            <Button
              size="sm"
              variant={isPlacingSymbol ? "default" : "outline"}
              onClick={() => setIsPlacingSymbol(!isPlacingSymbol)}
            >
              {isPlacingSymbol ? 'Cancel' : 'Place Symbol'}
            </Button>
          </div>
          
          <div className="flex gap-2 overflow-x-auto">
            {[
              { type: 'friendly_unit', icon: '🟢', label: 'Friendly' },
              { type: 'enemy_unit', icon: '🔴', label: 'Enemy' },
              { type: 'objective', icon: '🎯', label: 'Objective' },
              { type: 'waypoint', icon: '📍', label: 'Waypoint' },
              { type: 'danger_area', icon: '⚠️', label: 'Danger' },
              { type: 'safe_zone', icon: '🛡️', label: 'Safe Zone' },
              { type: 'rally_point', icon: '🚩', label: 'Rally' },
              { type: 'observation_post', icon: '👀', label: 'Observation' },
            ].map((symbolDef) => (
              <Button
                key={symbolDef.type}
                size="sm"
                variant={selectedSymbolType === symbolDef.type ? "default" : "outline"}
                className="flex flex-col items-center min-w-16"
                onClick={() => setSelectedSymbolType(symbolDef.type)}
              >
                <span className="text-lg">{symbolDef.icon}</span>
                <span className="text-xs">{symbolDef.label}</span>
              </Button>
            ))}
          </div>
          
          {isPlacingSymbol && (
            <div className="mt-2 text-xs text-gray-600">
              Click on the map to place a {selectedSymbolType.replace('_', ' ')} symbol
            </div>
          )}
        </div>
      </div>

      {/* Status indicator */}
      <div className="absolute top-4 left-4 z-10 bg-white rounded-lg shadow-lg p-2">
        <div className="flex items-center gap-2 text-sm">
          <div className={`w-2 h-2 rounded-full ${userPosition ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span>{userPosition ? 'GPS Connected' : 'No GPS Signal'}</span>
        </div>
        {userPosition?.accuracy && (
          <div className="text-xs text-gray-500">
            Accuracy: ±{Math.round(userPosition.accuracy)}m
          </div>
        )}
      </div>
    </div>
  );
}
