import { supabaseAdmin } from './supabase';
import { 
  Room, 
  RoomWithMembers, 
  CreateRoomRequest, 
  JoinRoomRequest, 
  User,
  RoomMember,
  AppError,
  NotFoundError,
  AuthorizationError 
} from '@/shared/types';
import crypto from 'crypto';

export class RoomService {
  /**
   * Generate a unique invite code for a room
   */
  private generateInviteCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Hash password for room protection
   */
  private hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  /**
   * Create a new room
   */
  async createRoom(userId: string, roomData: CreateRoomRequest): Promise<Room> {
    const inviteCode = this.generateInviteCode();
    const passwordHash = roomData.password ? this.hashPassword(roomData.password) : null;

    const { data, error } = await supabaseAdmin
      .from('rooms')
      .insert({
        name: roomData.name,
        description: roomData.description,
        invite_code: inviteCode,
        owner_id: userId,
        is_private: roomData.isPrivate,
        password_hash: passwordHash,
        max_members: roomData.maxMembers,
      })
      .select()
      .single();

    if (error) {
      throw new AppError(`Failed to create room: ${error.message}`, 500);
    }

    // Add the creator as the owner member
    await this.addMemberToRoom(data.id, userId, 'owner');

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      inviteCode: data.invite_code,
      ownerId: data.owner_id,
      isPrivate: data.is_private,
      maxMembers: data.max_members,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  /**
   * Get room by ID with members
   */
  async getRoomWithMembers(roomId: string, userId: string): Promise<RoomWithMembers> {
    // Check if user is a member of the room
    const { data: membership } = await supabaseAdmin
      .from('room_members')
      .select('*')
      .eq('room_id', roomId)
      .eq('user_id', userId)
      .single();

    if (!membership) {
      throw new AuthorizationError('You are not a member of this room');
    }

    const { data: room, error: roomError } = await supabaseAdmin
      .from('rooms')
      .select(`
        *,
        room_members!inner (
          *,
          users (*)
        )
      `)
      .eq('id', roomId)
      .single();

    if (roomError) {
      throw new NotFoundError('Room not found');
    }

    return {
      id: room.id,
      name: room.name,
      description: room.description,
      inviteCode: room.invite_code,
      ownerId: room.owner_id,
      isPrivate: room.is_private,
      maxMembers: room.max_members,
      createdAt: room.created_at,
      updatedAt: room.updated_at,
      members: room.room_members.map((member: any) => ({
        id: member.id,
        roomId: member.room_id,
        userId: member.user_id,
        role: member.role,
        isOnline: member.is_online,
        lastSeen: member.last_seen,
        joinedAt: member.joined_at,
        user: {
          id: member.users.id,
          email: member.users.email,
          username: member.users.username,
          isGuest: member.users.is_guest,
          avatar: member.users.avatar,
          createdAt: member.users.created_at,
        },
      })),
      memberCount: room.room_members.length,
    };
  }

  /**
   * Join a room using invite code
   */
  async joinRoom(userId: string, joinData: JoinRoomRequest): Promise<RoomWithMembers> {
    // Find room by invite code
    const { data: room, error: roomError } = await supabaseAdmin
      .from('rooms')
      .select('*')
      .eq('invite_code', joinData.inviteCode)
      .single();

    if (roomError) {
      throw new NotFoundError('Invalid invite code');
    }

    // Check password if room is private
    if (room.is_private && room.password_hash) {
      if (!joinData.password) {
        throw new AuthorizationError('Password required for private room');
      }
      const passwordHash = this.hashPassword(joinData.password);
      if (passwordHash !== room.password_hash) {
        throw new AuthorizationError('Invalid password');
      }
    }

    // Check if user is already a member
    const { data: existingMember } = await supabaseAdmin
      .from('room_members')
      .select('*')
      .eq('room_id', room.id)
      .eq('user_id', userId)
      .single();

    if (existingMember) {
      // User is already a member, just return the room
      return this.getRoomWithMembers(room.id, userId);
    }

    // Check member limit
    const { count: memberCount } = await supabaseAdmin
      .from('room_members')
      .select('*', { count: 'exact' })
      .eq('room_id', room.id);

    if (memberCount && memberCount >= room.max_members) {
      throw new AppError('Room is full', 400);
    }

    // Add user to room
    await this.addMemberToRoom(room.id, userId, 'member');

    return this.getRoomWithMembers(room.id, userId);
  }

  /**
   * Add a member to a room
   */
  private async addMemberToRoom(roomId: string, userId: string, role: 'owner' | 'admin' | 'member'): Promise<void> {
    const { error } = await supabaseAdmin
      .from('room_members')
      .insert({
        room_id: roomId,
        user_id: userId,
        role,
        is_online: true,
      });

    if (error) {
      throw new AppError(`Failed to add member to room: ${error.message}`, 500);
    }
  }

  /**
   * Leave a room
   */
  async leaveRoom(roomId: string, userId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('room_members')
      .delete()
      .eq('room_id', roomId)
      .eq('user_id', userId);

    if (error) {
      throw new AppError(`Failed to leave room: ${error.message}`, 500);
    }
  }

  /**
   * Update member online status
   */
  async updateMemberStatus(roomId: string, userId: string, isOnline: boolean): Promise<void> {
    const { error } = await supabaseAdmin
      .from('room_members')
      .update({
        is_online: isOnline,
        last_seen: new Date().toISOString(),
      })
      .eq('room_id', roomId)
      .eq('user_id', userId);

    if (error) {
      throw new AppError(`Failed to update member status: ${error.message}`, 500);
    }
  }

  /**
   * Get user's rooms
   */
  async getUserRooms(userId: string): Promise<RoomWithMembers[]> {
    const { data: roomMembers, error } = await supabaseAdmin
      .from('room_members')
      .select(`
        *,
        rooms (*),
        users (*)
      `)
      .eq('user_id', userId);

    if (error) {
      throw new AppError(`Failed to get user rooms: ${error.message}`, 500);
    }

    const rooms: RoomWithMembers[] = [];
    const processedRooms = new Set<string>();

    for (const member of roomMembers) {
      if (!processedRooms.has(member.rooms.id)) {
        const roomData = await this.getRoomWithMembers(member.rooms.id, userId);
        rooms.push(roomData);
        processedRooms.add(member.rooms.id);
      }
    }

    return rooms;
  }

  /**
   * Delete a room (owner only)
   */
  async deleteRoom(roomId: string, userId: string): Promise<void> {
    // Verify ownership
    const { data: room } = await supabaseAdmin
      .from('rooms')
      .select('owner_id')
      .eq('id', roomId)
      .single();

    if (!room || room.owner_id !== userId) {
      throw new AuthorizationError('Only room owner can delete the room');
    }

    const { error } = await supabaseAdmin
      .from('rooms')
      .delete()
      .eq('id', roomId);

    if (error) {
      throw new AppError(`Failed to delete room: ${error.message}`, 500);
    }
  }

  /**
   * Update room settings (owner only)
   */
  async updateRoom(roomId: string, userId: string, updates: Partial<CreateRoomRequest>): Promise<Room> {
    // Verify ownership
    const { data: room } = await supabaseAdmin
      .from('rooms')
      .select('owner_id')
      .eq('id', roomId)
      .single();

    if (!room || room.owner_id !== userId) {
      throw new AuthorizationError('Only room owner can update the room');
    }

    const updateData: any = {};
    if (updates.name) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.isPrivate !== undefined) updateData.is_private = updates.isPrivate;
    if (updates.maxMembers !== undefined) updateData.max_members = updates.maxMembers;
    if (updates.password !== undefined) {
      updateData.password_hash = updates.password ? this.hashPassword(updates.password) : null;
    }

    const { data, error } = await supabaseAdmin
      .from('rooms')
      .update(updateData)
      .eq('id', roomId)
      .select()
      .single();

    if (error) {
      throw new AppError(`Failed to update room: ${error.message}`, 500);
    }

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      inviteCode: data.invite_code,
      ownerId: data.owner_id,
      isPrivate: data.is_private,
      maxMembers: data.max_members,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}
