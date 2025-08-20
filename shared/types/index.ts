import { z } from 'zod';

// Base schemas
export const CoordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().optional(),
  heading: z.number().min(0).max(360).optional(),
  timestamp: z.string().datetime(),
});

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().optional(),
  username: z.string().min(1).max(50),
  isGuest: z.boolean().default(false),
  avatar: z.string().url().optional(),
  createdAt: z.string().datetime(),
});

export const RoomSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  inviteCode: z.string().min(6).max(20),
  ownerId: z.string().uuid(),
  isPrivate: z.boolean().default(false),
  password: z.string().optional(),
  maxMembers: z.number().min(1).max(50).default(20),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const RoomMemberSchema = z.object({
  id: z.string().uuid(),
  roomId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(['owner', 'admin', 'member']).default('member'),
  isOnline: z.boolean().default(false),
  lastSeen: z.string().datetime(),
  joinedAt: z.string().datetime(),
});

export const UserPositionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  roomId: z.string().uuid(),
  coordinates: CoordinatesSchema,
  isVisible: z.boolean().default(true),
  lastUpdated: z.string().datetime(),
});

export const TacticalSymbolTypeSchema = z.enum([
  'friendly_unit',
  'enemy_unit',
  'neutral_unit',
  'objective',
  'waypoint',
  'danger_area',
  'safe_zone',
  'rally_point',
  'observation_post',
  'command_post',
  'supply_depot',
  'medical_station',
  'vehicle',
  'aircraft',
  'building',
  'bridge',
  'road_block',
  'mine_field',
  'wire_obstacle',
  'bunker',
  'trench',
]);

export const TacticalSymbolSchema = z.object({
  id: z.string().uuid(),
  roomId: z.string().uuid(),
  createdBy: z.string().uuid(),
  type: TacticalSymbolTypeSchema,
  coordinates: CoordinatesSchema.omit({ timestamp: true }),
  label: z.string().max(50).optional(),
  description: z.string().max(200).optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).default('#FF0000'),
  size: z.enum(['small', 'medium', 'large']).default('medium'),
  rotation: z.number().min(0).max(360).default(0),
  isVisible: z.boolean().default(true),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// API Request/Response schemas
export const CreateRoomRequestSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  isPrivate: z.boolean().default(false),
  password: z.string().optional(),
  maxMembers: z.number().min(1).max(50).default(20),
});

export const JoinRoomRequestSchema = z.object({
  inviteCode: z.string().min(6).max(20),
  password: z.string().optional(),
  username: z.string().min(1).max(50),
});

export const UpdatePositionRequestSchema = z.object({
  roomId: z.string().uuid(),
  coordinates: CoordinatesSchema,
  isVisible: z.boolean().default(true),
});

export const CreateSymbolRequestSchema = z.object({
  roomId: z.string().uuid(),
  type: TacticalSymbolTypeSchema,
  coordinates: CoordinatesSchema.omit({ timestamp: true }),
  label: z.string().max(50).optional(),
  description: z.string().max(200).optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).default('#FF0000'),
  size: z.enum(['small', 'medium', 'large']).default('medium'),
  rotation: z.number().min(0).max(360).default(0),
});

export const UpdateSymbolRequestSchema = z.object({
  id: z.string().uuid(),
  coordinates: CoordinatesSchema.omit({ timestamp: true }).optional(),
  label: z.string().max(50).optional(),
  description: z.string().max(200).optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  size: z.enum(['small', 'medium', 'large']).optional(),
  rotation: z.number().min(0).max(360).optional(),
  isVisible: z.boolean().optional(),
});

// WebSocket event schemas
export const SocketEventSchema = z.object({
  type: z.enum([
    'position_update',
    'symbol_created',
    'symbol_updated',
    'symbol_deleted',
    'member_joined',
    'member_left',
    'member_online',
    'member_offline',
    'room_updated',
  ]),
  roomId: z.string().uuid(),
  userId: z.string().uuid(),
  data: z.any(),
  timestamp: z.string().datetime(),
});

// Type exports
export type Coordinates = z.infer<typeof CoordinatesSchema>;
export type User = z.infer<typeof UserSchema>;
export type Room = z.infer<typeof RoomSchema>;
export type RoomMember = z.infer<typeof RoomMemberSchema>;
export type UserPosition = z.infer<typeof UserPositionSchema>;
export type TacticalSymbolType = z.infer<typeof TacticalSymbolTypeSchema>;
export type TacticalSymbol = z.infer<typeof TacticalSymbolSchema>;

export type CreateRoomRequest = z.infer<typeof CreateRoomRequestSchema>;
export type JoinRoomRequest = z.infer<typeof JoinRoomRequestSchema>;
export type UpdatePositionRequest = z.infer<typeof UpdatePositionRequestSchema>;
export type CreateSymbolRequest = z.infer<typeof CreateSymbolRequestSchema>;
export type UpdateSymbolRequest = z.infer<typeof UpdateSymbolRequestSchema>;

export type SocketEvent = z.infer<typeof SocketEventSchema>;

// Extended types with relations
export interface RoomWithMembers extends Room {
  members: (RoomMember & { user: User })[];
  memberCount: number;
}

export interface RoomWithData extends RoomWithMembers {
  positions: UserPosition[];
  symbols: TacticalSymbol[];
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Error types
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public field?: string) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTH_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

// Authentication schemas
export const LoginRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const RegisterRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Password must be at least 6 characters'),
  username: z.string().min(2, 'Username must be at least 2 characters').max(50, 'Username too long'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const ForgotPasswordRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const ResetPasswordRequestSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Password must be at least 6 characters'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Authentication response types
export interface AuthResponse {
  user: User;
  session: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
}

// Authentication request types
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type ForgotPasswordRequest = z.infer<typeof ForgotPasswordRequestSchema>;
export type ResetPasswordRequest = z.infer<typeof ResetPasswordRequestSchema>;
