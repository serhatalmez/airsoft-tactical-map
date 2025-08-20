import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { RoomService } from '@/api/services/roomService';

const roomService = new RoomService();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { roomId } = req.query;

  if (typeof roomId !== 'string') {
    return res.status(400).json({ 
      success: false, 
      error: 'Invalid room ID' 
    });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Get authorization header
    const authorization = req.headers.authorization;
    if (!authorization) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authorization header required' 
      });
    }

    const token = authorization.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }

    switch (req.method) {
      case 'GET':
        return await handleGetRoom(req, res, roomId, user.id);
      case 'PUT':
        return await handleUpdateRoom(req, res, roomId, user.id);
      case 'DELETE':
        return await handleDeleteRoom(req, res, roomId, user.id);
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        return res.status(405).json({ 
          success: false, 
          error: `Method ${req.method} not allowed` 
        });
    }
  } catch (error: any) {
    console.error('Room API Error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}

async function handleGetRoom(req: NextApiRequest, res: NextApiResponse, roomId: string, userId: string) {
  try {
    console.log(`[Room API] Getting room ${roomId} for user ${userId}`);
    const room = await roomService.getRoomWithMembers(roomId, userId);
    
    console.log(`[Room API] Successfully fetched room: ${room.name}`);
    return res.status(200).json({
      success: true,
      data: room,
    });
  } catch (error: any) {
    console.error(`[Room API] Error getting room ${roomId}:`, error);
    
    if (error.message?.includes('not a member')) {
      return res.status(403).json({
        success: false,
        error: 'You are not a member of this room',
        code: 'NOT_MEMBER',
      });
    }
    
    if (error.message?.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Room not found',
        code: 'ROOM_NOT_FOUND',
      });
    }
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get room',
      code: 'INTERNAL_ERROR',
    });
  }
}

async function handleUpdateRoom(req: NextApiRequest, res: NextApiResponse, roomId: string, userId: string) {
  const room = await roomService.updateRoom(roomId, userId, req.body);
  
  return res.status(200).json({
    success: true,
    data: room,
    message: 'Room updated successfully',
  });
}

async function handleDeleteRoom(req: NextApiRequest, res: NextApiResponse, roomId: string, userId: string) {
  await roomService.deleteRoom(roomId, userId);
  
  return res.status(200).json({
    success: true,
    message: 'Room deleted successfully',
  });
}
