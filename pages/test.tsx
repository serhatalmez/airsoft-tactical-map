import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Button } from '@/client/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/client/components/ui/card';
import { Input } from '@/client/components/ui/input';
import { Label } from '@/client/components/ui/label';

export default function QuickTestPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');

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

  const createTestRoom = async () => {
    setLoading(true);
    setResult('Creating room...');
    
    try {
      const roomData = {
        name: `Test Room ${Date.now()}`,
        description: 'Quick test room for debugging',
        isPrivate: false,
        maxMembers: 10,
      };

      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(roomData),
      });

      if (response.ok) {
        const data = await response.json();
        setResult(`✅ Room created successfully!\nRoom ID: ${data.data.id}\nInvite Code: ${data.data.inviteCode}`);
        
        // Automatically navigate to the room after 2 seconds
        setTimeout(() => {
          router.push(`/room/${data.data.id}`);
        }, 2000);
      } else {
        const errorData = await response.json();
        setResult(`❌ Error creating room: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error:', error);
      setResult(`❌ Network error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const testAuth = async () => {
    setLoading(true);
    setResult('Testing authentication...');
    
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setResult(`✅ Authentication works!\nUser: ${data.user.email}\nUser ID: ${data.user.id}`);
      } else {
        const errorData = await response.json();
        setResult(`❌ Auth error: ${errorData.error}`);
      }
    } catch (error) {
      setResult(`❌ Network error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const getRooms = async () => {
    setLoading(true);
    setResult('Fetching user rooms...');
    
    try {
      const response = await fetch('/api/rooms', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data.length > 0) {
          const roomsList = data.data.map((room: any) => 
            `- ${room.name} (ID: ${room.id}, Code: ${room.inviteCode})`
          ).join('\n');
          setResult(`✅ Found ${data.data.length} rooms:\n${roomsList}`);
        } else {
          setResult('✅ No rooms found. Create one first!');
        }
      } else {
        const errorData = await response.json();
        setResult(`❌ Error fetching rooms: ${errorData.error}`);
      }
    } catch (error) {
      setResult(`❌ Network error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>🚀 Quick Test & Debug</CardTitle>
            <CardDescription>
              Test your authentication and create rooms quickly
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button onClick={testAuth} disabled={loading} variant="outline">
                Test Auth
              </Button>
              <Button onClick={getRooms} disabled={loading} variant="outline">
                Get Rooms
              </Button>
              <Button onClick={createTestRoom} disabled={loading}>
                Create Test Room
              </Button>
            </div>
            
            <div className="mt-6">
              <Label>Result:</Label>
              <div className="mt-2 p-4 bg-gray-100 rounded-lg min-h-24">
                <pre className="text-sm whitespace-pre-wrap">
                  {result || 'Click a button to test functionality...'}
                </pre>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t">
              <Button 
                onClick={() => router.push('/')} 
                variant="ghost"
                className="w-full"
              >
                ← Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
