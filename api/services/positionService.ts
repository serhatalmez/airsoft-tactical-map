import { supabaseAdmin } from './supabase';
import { 
  UserPosition, 
  UpdatePositionRequest, 
  AppError,
  NotFoundError,
  AuthorizationError 
} from '@/shared/types';

export class PositionService {
  /**
   * Update user position in a room
   */
  async updatePosition(userId: string, positionData: UpdatePositionRequest): Promise<UserPosition> {
    // Verify user is a member of the room
    const { data: membership } = await supabaseAdmin
      .from('room_members')
      .select('*')
      .eq('room_id', positionData.roomId)
      .eq('user_id', userId)
      .single();

    if (!membership) {
      throw new AuthorizationError('You are not a member of this room');
    }

    // Upsert position data
    const { data, error } = await supabaseAdmin
      .from('user_positions')
      .upsert({
        user_id: userId,
        room_id: positionData.roomId,
        latitude: positionData.coordinates.latitude,
        longitude: positionData.coordinates.longitude,
        accuracy: positionData.coordinates.accuracy,
        heading: positionData.coordinates.heading,
        is_visible: positionData.isVisible,
        last_updated: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new AppError(`Failed to update position: ${error.message}`, 500);
    }

    return {
      id: data.id,
      userId: data.user_id,
      roomId: data.room_id,
      coordinates: {
        latitude: data.latitude,
        longitude: data.longitude,
        accuracy: data.accuracy,
        heading: data.heading,
        timestamp: data.last_updated,
      },
      isVisible: data.is_visible,
      lastUpdated: data.last_updated,
    };
  }

  /**
   * Get all positions in a room
   */
  async getRoomPositions(roomId: string, userId: string): Promise<UserPosition[]> {
    // Verify user is a member of the room
    const { data: membership } = await supabaseAdmin
      .from('room_members')
      .select('*')
      .eq('room_id', roomId)
      .eq('user_id', userId)
      .single();

    if (!membership) {
      throw new AuthorizationError('You are not a member of this room');
    }

    const { data: positions, error } = await supabaseAdmin
      .from('user_positions')
      .select(`
        *,
        users (username, avatar)
      `)
      .eq('room_id', roomId)
      .eq('is_visible', true);

    if (error) {
      throw new AppError(`Failed to get room positions: ${error.message}`, 500);
    }

    return positions.map((pos: any) => ({
      id: pos.id,
      userId: pos.user_id,
      roomId: pos.room_id,
      coordinates: {
        latitude: pos.latitude,
        longitude: pos.longitude,
        accuracy: pos.accuracy,
        heading: pos.heading,
        timestamp: pos.last_updated,
      },
      isVisible: pos.is_visible,
      lastUpdated: pos.last_updated,
      user: {
        username: pos.users.username,
        avatar: pos.users.avatar,
      },
    }));
  }

  /**
   * Delete user position from a room
   */
  async deletePosition(roomId: string, userId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('user_positions')
      .delete()
      .eq('room_id', roomId)
      .eq('user_id', userId);

    if (error) {
      throw new AppError(`Failed to delete position: ${error.message}`, 500);
    }
  }

  /**
   * Toggle position visibility
   */
  async toggleVisibility(roomId: string, userId: string, isVisible: boolean): Promise<UserPosition> {
    const { data, error } = await supabaseAdmin
      .from('user_positions')
      .update({ is_visible: isVisible })
      .eq('room_id', roomId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new AppError(`Failed to toggle visibility: ${error.message}`, 500);
    }

    return {
      id: data.id,
      userId: data.user_id,
      roomId: data.room_id,
      coordinates: {
        latitude: data.latitude,
        longitude: data.longitude,
        accuracy: data.accuracy,
        heading: data.heading,
        timestamp: data.last_updated,
      },
      isVisible: data.is_visible,
      lastUpdated: data.last_updated,
    };
  }

  /**
   * Get distance between two positions (in meters)
   */
  calculateDistance(
    lat1: number, 
    lon1: number, 
    lat2: number, 
    lon2: number
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  }

  /**
   * Get nearby positions within a certain radius
   */
  async getNearbyPositions(
    roomId: string, 
    userId: string, 
    centerLat: number, 
    centerLon: number, 
    radiusMeters: number = 1000
  ): Promise<UserPosition[]> {
    const positions = await this.getRoomPositions(roomId, userId);
    
    return positions.filter(pos => {
      const distance = this.calculateDistance(
        centerLat, 
        centerLon, 
        pos.coordinates.latitude, 
        pos.coordinates.longitude
      );
      return distance <= radiusMeters;
    });
  }

  /**
   * Cleanup old positions (for maintenance)
   */
  async cleanupOldPositions(hoursOld: number = 24): Promise<number> {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hoursOld);

    const { data, error } = await supabaseAdmin
      .from('user_positions')
      .delete()
      .lt('last_updated', cutoffTime.toISOString())
      .select('id');

    if (error) {
      throw new AppError(`Failed to cleanup old positions: ${error.message}`, 500);
    }

    return data?.length || 0;
  }
}
