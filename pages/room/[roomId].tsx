import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import { Button } from '@/client/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/client/components/ui/card';
import { ArrowLeft, Users, Settings, Share2, MapPin } from 'lucide-react';
import { Room, RoomWithData, UserPosition, TacticalSymbol, Coordinates } from '@/shared/types';

// Dynamically import MapView to avoid SSR issues
const MapView = dynamic(() => import('@/client/components/map/MapView'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
        <p className="text-gray-600 mt-2">Loading map...</p>
      </div>
    </div>
  ),
});

export default function RoomPage() {
  const router = useRouter();
  const { roomId } = router.query;
  const [room, setRoom] = useState<RoomWithData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);
  const [userPosition, setUserPosition] = useState<Coordinates | null>(null);
  const [positions, setPositions] = useState<UserPosition[]>([]);
  const [symbols, setSymbols] = useState<TacticalSymbol[]>([]);

  useEffect(() => {
    // Check for session
    const savedSession = localStorage.getItem('session');
    if (savedSession) {
      try {
        const sessionData = JSON.parse(savedSession);
        if (sessionData.access_token && sessionData.expires_at > Date.now()) {
          setSession(sessionData);
        } else {
          localStorage.removeItem('session');
          router.push('/');
          return;
        }
      } catch (error) {
        localStorage.removeItem('session');
        router.push('/');
        return;
      }
    } else {
      router.push('/');
      return;
    }
  }, [router]);

  useEffect(() => {
    if (roomId && session?.access_token) {
      fetchRoom();
    }
  }, [roomId, session]);

  useEffect(() => {
    if (room) {
      setPositions(room.positions || []);
      setSymbols(room.symbols || []);
    }
  }, [room]);

  const fetchRoom = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/rooms/${roomId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setRoom(data.data);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to load room');
      }
    } catch (err) {
      console.error('Error fetching room:', err);
      setError('Failed to load room');
    } finally {
      setLoading(false);
    }
  };

  const handlePositionUpdate = (position: Coordinates) => {
    setUserPosition(position);
    // TODO: Send position update to API/WebSocket
  };

  const handleSymbolCreate = (symbol: Omit<TacticalSymbol, 'id' | 'createdAt' | 'updatedAt'>) => {
    // TODO: Send symbol create to API/WebSocket
    const newSymbol = {
      ...symbol,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setSymbols(prev => [...prev, newSymbol]);
  };

  const handleSymbolUpdate = (id: string, updates: Partial<TacticalSymbol>) => {
    // TODO: Send symbol update to API/WebSocket
    setSymbols(prev => prev.map(s => s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s));
  };

  const handleSymbolDelete = (id: string) => {
    // TODO: Send symbol delete to API/WebSocket
    setSymbols(prev => prev.filter(s => s.id !== id));
  };

  const handleLeaveRoom = () => {
    router.push('/');
  };

  const handleShareRoom = () => {
    if (room) {
      const shareText = `Join my airsoft tactical room: ${room.name}\nRoom Code: ${room.inviteCode}\nLink: ${window.location.origin}/join/${room.inviteCode}`;
      
      if (navigator.share) {
        navigator.share({
          title: `Airsoft Room: ${room.name}`,
          text: shareText,
          url: window.location.href,
        });
      } else {
        navigator.clipboard.writeText(shareText);
        alert('Room link copied to clipboard!');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading room...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <MapPin className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-xl text-red-600">Room Not Found</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleLeaveRoom} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <CardTitle>Room not found</CardTitle>
            <CardDescription>The room you're looking for doesn't exist or you don't have access to it.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleLeaveRoom} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLeaveRoom}
                className="lg:hidden"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 truncate">
                  {room.name}
                </h1>
                <p className="text-sm text-gray-500">
                  Code: {room.inviteCode} • {room.members?.length || 0}/{room.maxMembers} members
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleShareRoom}
                className="hidden sm:flex"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={handleShareRoom}
                className="sm:hidden"
              >
                <Share2 className="h-4 w-4" />
              </Button>
              
              <div className="hidden lg:flex items-center space-x-2">
                <Button
                  variant="outline"
                  onClick={handleLeaveRoom}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Leave Room
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Map Container */}
      <div className="flex-1 relative">
        <MapView
          roomId={room.id}
          userId={session?.user?.id}
          positions={positions}
          symbols={symbols}
          userPosition={userPosition || undefined}
          onPositionUpdate={handlePositionUpdate}
          onSymbolCreate={handleSymbolCreate}
          onSymbolUpdate={handleSymbolUpdate}
          onSymbolDelete={handleSymbolDelete}
        />
      </div>

      {/* Mobile bottom navigation could go here */}
      <div className="lg:hidden bg-white border-t p-2">
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLeaveRoom}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Leave
          </Button>
          
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Users className="h-4 w-4" />
            <span>{room.members?.length || 0}/{room.maxMembers}</span>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleShareRoom}
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      </div>
    </div>
  );
}
