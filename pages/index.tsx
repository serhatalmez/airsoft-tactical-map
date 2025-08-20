'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import { Button } from '@/client/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/client/components/ui/card';
import { Input } from '@/client/components/ui/input';
import { Label } from '@/client/components/ui/label';
import { Textarea } from '@/client/components/ui/textarea';
import { Switch } from '@/client/components/ui/switch';
import { Plus, Users, Settings, MapPin, Eye, EyeOff } from 'lucide-react';
import { Room, CreateRoomRequest, JoinRoomRequest, LoginRequest, RegisterRequest } from '@/shared/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Home() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  
  const [rooms, setRooms] = useState<Room[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  
  // Authentication form state
  const [authForm, setAuthForm] = useState<LoginRequest & RegisterRequest>({
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
  });
  
  // Create room form state
  const [createForm, setCreateForm] = useState<CreateRoomRequest>({
    name: '',
    description: '',
    isPrivate: false,
    maxMembers: 20,
  });
  
  // Join room form state
  const [joinForm, setJoinForm] = useState<JoinRoomRequest>({
    inviteCode: '',
    username: session?.user?.email?.split('@')[0] || '',
  });

  useEffect(() => {
    // Check for existing session in localStorage
    const savedSession = localStorage.getItem('session');
    if (savedSession) {
      try {
        const sessionData = JSON.parse(savedSession);
        if (sessionData.access_token && sessionData.expires_at > Date.now()) {
          setSession(sessionData);
        } else {
          localStorage.removeItem('session');
        }
      } catch (error) {
        localStorage.removeItem('session');
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (session) {
      fetchUserRooms();
    }
  }, [session]);

  const fetchUserRooms = async () => {
    try {
      if (!session?.access_token) return;

      const response = await fetch('/api/rooms', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setRooms(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);

    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body = authMode === 'login' 
        ? { email: authForm.email, password: authForm.password }
        : authForm;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.data.session) {
          // Store session in localStorage
          const sessionData = {
            access_token: data.data.session.access_token,
            refresh_token: data.data.session.refresh_token,
            expires_at: data.data.session.expires_at * 1000, // Convert to milliseconds
            user: data.data.user,
          };
          localStorage.setItem('session', JSON.stringify(sessionData));
          setSession(sessionData);
        } else if (authMode === 'register' && data.data.needsEmailConfirmation) {
          alert('Registration successful! Please check your email to confirm your account.');
        }
      } else {
        console.error('Auth error:', data);
        alert(data.error || 'Authentication failed');
        if (data.code) {
          console.error('Error code:', data.code);
        }
      }
    } catch (error) {
      console.error('Authentication error:', error);
      alert('Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (!session?.access_token) {
        alert('Please sign in first');
        return;
      }

      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(createForm),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/room/${data.data.id}`);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create room');
      }
    } catch (error) {
      console.error('Error creating room:', error);
      alert('Failed to create room');
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (!session?.access_token) {
        alert('Please sign in first');
        return;
      }

      const response = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(joinForm),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/room/${data.data.id}`);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to join room');
      }
    } catch (error) {
      console.error('Error joining room:', error);
      alert('Failed to join room');
    }
  };

  const handleSignOut = async () => {
    try {
      if (session?.access_token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('session');
      setSession(null);
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
              <MapPin className="h-12 w-12 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Airsoft Tactical Map</CardTitle>
            <CardDescription>
              Real-time team coordination for airsoft operations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="space-y-4">
              <div className="flex space-x-1 mb-6">
                <Button
                  type="button"
                  variant={authMode === 'login' ? 'default' : 'outline'}
                  onClick={() => setAuthMode('login')}
                  className="flex-1"
                >
                  Login
                </Button>
                <Button
                  type="button"
                  variant={authMode === 'register' ? 'default' : 'outline'}
                  onClick={() => setAuthMode('register')}
                  className="flex-1"
                >
                  Register
                </Button>
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={authForm.email}
                  onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                  placeholder="your@email.com"
                  required
                />
              </div>

              {authMode === 'register' && (
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={authForm.username}
                    onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
                    placeholder="Your display name"
                    required
                  />
                </div>
              )}

              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={authForm.password}
                    onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                    placeholder="Password"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {authMode === 'register' && (
                <div>
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={authForm.confirmPassword}
                    onChange={(e) => setAuthForm({ ...authForm, confirmPassword: e.target.value })}
                    placeholder="Confirm password"
                    required
                  />
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full" 
                size="lg"
                disabled={authLoading}
              >
                {authLoading 
                  ? 'Please wait...' 
                  : authMode === 'login' 
                    ? 'Sign In' 
                    : 'Create Account'
                }
              </Button>
            </form>

            <p className="text-xs text-gray-500 text-center mt-4">
              {authMode === 'login' 
                ? 'Sign in to create or join tactical rooms' 
                : 'Create an account to get started'
              }
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <MapPin className="h-8 w-8 text-green-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">
                Airsoft Tactical Map
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {session.user?.email || session.user?.username || 'User'}
              </span>
              <Button variant="outline" onClick={handleSignOut}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <Button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center"
            size="lg"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Room
          </Button>
          <Button
            onClick={() => setShowJoinForm(true)}
            variant="outline"
            className="flex items-center"
            size="lg"
          >
            <Users className="h-5 w-5 mr-2" />
            Join Room
          </Button>
        </div>

        {/* Rooms Grid */}
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading rooms...</p>
          </div>
        ) : rooms.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room) => (
              <Card key={room.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {room.name}
                    {room.isPrivate && (
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                        Private
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {room.description || 'No description'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                    <span className="flex items-center">
                      <Users className="h-4 w-4 mr-1" />
                      0 / {room.maxMembers}
                    </span>
                    <span>
                      Code: {room.inviteCode}
                    </span>
                  </div>
                  <Button
                    onClick={() => router.push(`/room/${room.id}`)}
                    className="w-full"
                  >
                    Enter Room
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No rooms yet
            </h3>
            <p className="text-gray-600 mb-6">
              Create your first tactical room or join an existing one
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Room
              </Button>
              <Button variant="outline" onClick={() => setShowJoinForm(true)}>
                <Users className="h-4 w-4 mr-2" />
                Join Room
              </Button>
            </div>
          </div>
        )}

        {/* Create Room Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Create Tactical Room</CardTitle>
                <CardDescription>
                  Set up a new room for your team
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateRoom} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Room Name</Label>
                    <Input
                      id="name"
                      value={createForm.name}
                      onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                      placeholder="e.g., Team Alpha Operations"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      value={createForm.description}
                      onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                      placeholder="Describe the mission or operation"
                      rows={3}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="maxMembers">Max Members</Label>
                    <Input
                      id="maxMembers"
                      type="number"
                      min="2"
                      max="50"
                      value={createForm.maxMembers}
                      onChange={(e) => setCreateForm({ ...createForm, maxMembers: Number(e.target.value) })}
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="private"
                      checked={createForm.isPrivate}
                      onCheckedChange={(checked: boolean) => setCreateForm({ ...createForm, isPrivate: checked })}
                    />
                    <Label htmlFor="private">Private Room</Label>
                  </div>
                  
                  {createForm.isPrivate && (
                    <div>
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={createForm.password || ''}
                        onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                        placeholder="Room password"
                      />
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1">
                      Create Room
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowCreateForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Join Room Modal */}
        {showJoinForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Join Tactical Room</CardTitle>
                <CardDescription>
                  Enter a room code to join your team
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleJoinRoom} className="space-y-4">
                  <div>
                    <Label htmlFor="inviteCode">Room Code</Label>
                    <Input
                      id="inviteCode"
                      value={joinForm.inviteCode}
                      onChange={(e) => setJoinForm({ ...joinForm, inviteCode: e.target.value.toUpperCase() })}
                      placeholder="e.g., ALPHA123"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="username">Display Name</Label>
                    <Input
                      id="username"
                      value={joinForm.username}
                      onChange={(e) => setJoinForm({ ...joinForm, username: e.target.value })}
                      placeholder="Your display name"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="joinPassword">Password (if required)</Label>
                    <Input
                      id="joinPassword"
                      type="password"
                      value={joinForm.password || ''}
                      onChange={(e) => setJoinForm({ ...joinForm, password: e.target.value })}
                      placeholder="Room password"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1">
                      Join Room
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowJoinForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
