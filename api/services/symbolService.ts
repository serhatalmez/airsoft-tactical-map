import { supabaseAdmin } from './supabase';
import { 
  TacticalSymbol, 
  CreateSymbolRequest, 
  UpdateSymbolRequest,
  AppError,
  NotFoundError,
  AuthorizationError 
} from '@/shared/types';

export class SymbolService {
  /**
   * Create a new tactical symbol
   */
  async createSymbol(userId: string, symbolData: CreateSymbolRequest): Promise<TacticalSymbol> {
    // Verify user is a member of the room
    const { data: membership } = await supabaseAdmin
      .from('room_members')
      .select('*')
      .eq('room_id', symbolData.roomId)
      .eq('user_id', userId)
      .single();

    if (!membership) {
      throw new AuthorizationError('You are not a member of this room');
    }

    const { data, error } = await supabaseAdmin
      .from('tactical_symbols')
      .insert({
        room_id: symbolData.roomId,
        created_by: userId,
        type: symbolData.type,
        latitude: symbolData.coordinates.latitude,
        longitude: symbolData.coordinates.longitude,
        label: symbolData.label,
        description: symbolData.description,
        color: symbolData.color,
        size: symbolData.size,
        rotation: symbolData.rotation,
      })
      .select()
      .single();

    if (error) {
      throw new AppError(`Failed to create symbol: ${error.message}`, 500);
    }

    return {
      id: data.id,
      roomId: data.room_id,
      createdBy: data.created_by,
      type: data.type,
      coordinates: {
        latitude: data.latitude,
        longitude: data.longitude,
      },
      label: data.label,
      description: data.description,
      color: data.color,
      size: data.size,
      rotation: data.rotation,
      isVisible: data.is_visible,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  /**
   * Get all symbols in a room
   */
  async getRoomSymbols(roomId: string, userId: string): Promise<TacticalSymbol[]> {
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

    const { data: symbols, error } = await supabaseAdmin
      .from('tactical_symbols')
      .select(`
        *,
        users (username, avatar)
      `)
      .eq('room_id', roomId)
      .eq('is_visible', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw new AppError(`Failed to get room symbols: ${error.message}`, 500);
    }

    return symbols.map((symbol: any) => ({
      id: symbol.id,
      roomId: symbol.room_id,
      createdBy: symbol.created_by,
      type: symbol.type,
      coordinates: {
        latitude: symbol.latitude,
        longitude: symbol.longitude,
      },
      label: symbol.label,
      description: symbol.description,
      color: symbol.color,
      size: symbol.size,
      rotation: symbol.rotation,
      isVisible: symbol.is_visible,
      createdAt: symbol.created_at,
      updatedAt: symbol.updated_at,
      creator: {
        username: symbol.users.username,
        avatar: symbol.users.avatar,
      },
    }));
  }

  /**
   * Update a tactical symbol
   */
  async updateSymbol(symbolId: string, userId: string, updates: UpdateSymbolRequest): Promise<TacticalSymbol> {
    // Verify symbol exists and user has permission
    const { data: existingSymbol } = await supabaseAdmin
      .from('tactical_symbols')
      .select('created_by, room_id')
      .eq('id', symbolId)
      .single();

    if (!existingSymbol) {
      throw new NotFoundError('Symbol not found');
    }

    // Check if user is the creator or has admin/owner role in the room
    const { data: membership } = await supabaseAdmin
      .from('room_members')
      .select('role')
      .eq('room_id', existingSymbol.room_id)
      .eq('user_id', userId)
      .single();

    if (!membership) {
      throw new AuthorizationError('You are not a member of this room');
    }

    const canEdit = existingSymbol.created_by === userId || 
                   membership.role === 'owner' || 
                   membership.role === 'admin';

    if (!canEdit) {
      throw new AuthorizationError('You can only edit your own symbols');
    }

    // Build update object
    const updateData: any = {};
    if (updates.coordinates) {
      updateData.latitude = updates.coordinates.latitude;
      updateData.longitude = updates.coordinates.longitude;
    }
    if (updates.label !== undefined) updateData.label = updates.label;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.color !== undefined) updateData.color = updates.color;
    if (updates.size !== undefined) updateData.size = updates.size;
    if (updates.rotation !== undefined) updateData.rotation = updates.rotation;
    if (updates.isVisible !== undefined) updateData.is_visible = updates.isVisible;

    const { data, error } = await supabaseAdmin
      .from('tactical_symbols')
      .update(updateData)
      .eq('id', symbolId)
      .select()
      .single();

    if (error) {
      throw new AppError(`Failed to update symbol: ${error.message}`, 500);
    }

    return {
      id: data.id,
      roomId: data.room_id,
      createdBy: data.created_by,
      type: data.type,
      coordinates: {
        latitude: data.latitude,
        longitude: data.longitude,
      },
      label: data.label,
      description: data.description,
      color: data.color,
      size: data.size,
      rotation: data.rotation,
      isVisible: data.is_visible,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  /**
   * Delete a tactical symbol
   */
  async deleteSymbol(symbolId: string, userId: string): Promise<void> {
    // Verify symbol exists and user has permission
    const { data: existingSymbol } = await supabaseAdmin
      .from('tactical_symbols')
      .select('created_by, room_id')
      .eq('id', symbolId)
      .single();

    if (!existingSymbol) {
      throw new NotFoundError('Symbol not found');
    }

    // Check if user is the creator or has admin/owner role in the room
    const { data: membership } = await supabaseAdmin
      .from('room_members')
      .select('role')
      .eq('room_id', existingSymbol.room_id)
      .eq('user_id', userId)
      .single();

    if (!membership) {
      throw new AuthorizationError('You are not a member of this room');
    }

    const canDelete = existingSymbol.created_by === userId || 
                     membership.role === 'owner' || 
                     membership.role === 'admin';

    if (!canDelete) {
      throw new AuthorizationError('You can only delete your own symbols');
    }

    const { error } = await supabaseAdmin
      .from('tactical_symbols')
      .delete()
      .eq('id', symbolId);

    if (error) {
      throw new AppError(`Failed to delete symbol: ${error.message}`, 500);
    }
  }

  /**
   * Get symbols by type in a room
   */
  async getSymbolsByType(roomId: string, userId: string, symbolType: string): Promise<TacticalSymbol[]> {
    const allSymbols = await this.getRoomSymbols(roomId, userId);
    return allSymbols.filter(symbol => symbol.type === symbolType);
  }

  /**
   * Get symbols within a radius
   */
  async getSymbolsInRadius(
    roomId: string, 
    userId: string, 
    centerLat: number, 
    centerLon: number, 
    radiusMeters: number = 1000
  ): Promise<TacticalSymbol[]> {
    const allSymbols = await this.getRoomSymbols(roomId, userId);
    
    return allSymbols.filter(symbol => {
      const distance = this.calculateDistance(
        centerLat, 
        centerLon, 
        symbol.coordinates.latitude, 
        symbol.coordinates.longitude
      );
      return distance <= radiusMeters;
    });
  }

  /**
   * Calculate distance between two coordinates (in meters)
   */
  private calculateDistance(
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
   * Bulk delete symbols in a room (admin/owner only)
   */
  async bulkDeleteSymbols(roomId: string, userId: string, symbolIds: string[]): Promise<void> {
    // Check if user has admin/owner role in the room
    const { data: membership } = await supabaseAdmin
      .from('room_members')
      .select('role')
      .eq('room_id', roomId)
      .eq('user_id', userId)
      .single();

    if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
      throw new AuthorizationError('Only room owners and admins can bulk delete symbols');
    }

    const { error } = await supabaseAdmin
      .from('tactical_symbols')
      .delete()
      .eq('room_id', roomId)
      .in('id', symbolIds);

    if (error) {
      throw new AppError(`Failed to bulk delete symbols: ${error.message}`, 500);
    }
  }

  /**
   * Get symbol statistics for a room
   */
  async getSymbolStats(roomId: string, userId: string): Promise<Record<string, number>> {
    const symbols = await this.getRoomSymbols(roomId, userId);
    const stats: Record<string, number> = {};
    
    symbols.forEach(symbol => {
      stats[symbol.type] = (stats[symbol.type] || 0) + 1;
    });
    
    return stats;
  }
}
