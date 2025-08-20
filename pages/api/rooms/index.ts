import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { RoomService } from '@/api/services/roomService';
import { CreateRoomRequestSchema, JoinRoomRequestSchema } from '@/shared/types';
import { z } from 'zod';

const roomService = new RoomService();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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
      case 'POST':
        return await handleCreateRoom(req, res, user.id);
      case 'GET':
        return await handleGetUserRooms(req, res, user.id);
      default:
        res.setHeader('Allow', ['POST', 'GET']);
        return res.status(405).json({ 
          success: false, 
          error: `Method ${req.method} not allowed` 
        });
    }
  } catch (error: any) {
    console.error('Rooms API Error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}

async function handleCreateRoom(req: NextApiRequest, res: NextApiResponse, userId: string) {
  try {
    const validatedData = CreateRoomRequestSchema.parse(req.body);
    const room = await roomService.createRoom(userId, validatedData);
    
    return res.status(201).json({
      success: true,
      data: room,
      message: 'Room created successfully',
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }
    throw error;
  }
}

async function handleGetUserRooms(req: NextApiRequest, res: NextApiResponse, userId: string) {
  const rooms = await roomService.getUserRooms(userId);
  
  return res.status(200).json({
    success: true,
    data: rooms,
  });
}
