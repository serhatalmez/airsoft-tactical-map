"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotFoundError = exports.AuthorizationError = exports.AuthenticationError = exports.ValidationError = exports.AppError = exports.SocketEventSchema = exports.UpdateSymbolRequestSchema = exports.CreateSymbolRequestSchema = exports.UpdatePositionRequestSchema = exports.JoinRoomRequestSchema = exports.CreateRoomRequestSchema = exports.TacticalSymbolSchema = exports.TacticalSymbolTypeSchema = exports.UserPositionSchema = exports.RoomMemberSchema = exports.RoomSchema = exports.UserSchema = exports.CoordinatesSchema = void 0;
const zod_1 = require("zod");
// Base schemas
exports.CoordinatesSchema = zod_1.z.object({
    latitude: zod_1.z.number().min(-90).max(90),
    longitude: zod_1.z.number().min(-180).max(180),
    accuracy: zod_1.z.number().optional(),
    heading: zod_1.z.number().min(0).max(360).optional(),
    timestamp: zod_1.z.string().datetime(),
});
exports.UserSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    email: zod_1.z.string().email().optional(),
    username: zod_1.z.string().min(1).max(50),
    isGuest: zod_1.z.boolean().default(false),
    avatar: zod_1.z.string().url().optional(),
    createdAt: zod_1.z.string().datetime(),
});
exports.RoomSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1).max(100),
    description: zod_1.z.string().max(500).optional(),
    inviteCode: zod_1.z.string().min(6).max(20),
    ownerId: zod_1.z.string().uuid(),
    isPrivate: zod_1.z.boolean().default(false),
    password: zod_1.z.string().optional(),
    maxMembers: zod_1.z.number().min(1).max(50).default(20),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
exports.RoomMemberSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    roomId: zod_1.z.string().uuid(),
    userId: zod_1.z.string().uuid(),
    role: zod_1.z.enum(['owner', 'admin', 'member']).default('member'),
    isOnline: zod_1.z.boolean().default(false),
    lastSeen: zod_1.z.string().datetime(),
    joinedAt: zod_1.z.string().datetime(),
});
exports.UserPositionSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    userId: zod_1.z.string().uuid(),
    roomId: zod_1.z.string().uuid(),
    coordinates: exports.CoordinatesSchema,
    isVisible: zod_1.z.boolean().default(true),
    lastUpdated: zod_1.z.string().datetime(),
});
exports.TacticalSymbolTypeSchema = zod_1.z.enum([
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
exports.TacticalSymbolSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    roomId: zod_1.z.string().uuid(),
    createdBy: zod_1.z.string().uuid(),
    type: exports.TacticalSymbolTypeSchema,
    coordinates: exports.CoordinatesSchema.omit({ timestamp: true }),
    label: zod_1.z.string().max(50).optional(),
    description: zod_1.z.string().max(200).optional(),
    color: zod_1.z.string().regex(/^#[0-9A-F]{6}$/i).default('#FF0000'),
    size: zod_1.z.enum(['small', 'medium', 'large']).default('medium'),
    rotation: zod_1.z.number().min(0).max(360).default(0),
    isVisible: zod_1.z.boolean().default(true),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
// API Request/Response schemas
exports.CreateRoomRequestSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100),
    description: zod_1.z.string().max(500).optional(),
    isPrivate: zod_1.z.boolean().default(false),
    password: zod_1.z.string().optional(),
    maxMembers: zod_1.z.number().min(1).max(50).default(20),
});
exports.JoinRoomRequestSchema = zod_1.z.object({
    inviteCode: zod_1.z.string().min(6).max(20),
    password: zod_1.z.string().optional(),
    username: zod_1.z.string().min(1).max(50),
});
exports.UpdatePositionRequestSchema = zod_1.z.object({
    roomId: zod_1.z.string().uuid(),
    coordinates: exports.CoordinatesSchema,
    isVisible: zod_1.z.boolean().default(true),
});
exports.CreateSymbolRequestSchema = zod_1.z.object({
    roomId: zod_1.z.string().uuid(),
    type: exports.TacticalSymbolTypeSchema,
    coordinates: exports.CoordinatesSchema.omit({ timestamp: true }),
    label: zod_1.z.string().max(50).optional(),
    description: zod_1.z.string().max(200).optional(),
    color: zod_1.z.string().regex(/^#[0-9A-F]{6}$/i).default('#FF0000'),
    size: zod_1.z.enum(['small', 'medium', 'large']).default('medium'),
    rotation: zod_1.z.number().min(0).max(360).default(0),
});
exports.UpdateSymbolRequestSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    coordinates: exports.CoordinatesSchema.omit({ timestamp: true }).optional(),
    label: zod_1.z.string().max(50).optional(),
    description: zod_1.z.string().max(200).optional(),
    color: zod_1.z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
    size: zod_1.z.enum(['small', 'medium', 'large']).optional(),
    rotation: zod_1.z.number().min(0).max(360).optional(),
    isVisible: zod_1.z.boolean().optional(),
});
// WebSocket event schemas
exports.SocketEventSchema = zod_1.z.object({
    type: zod_1.z.enum([
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
    roomId: zod_1.z.string().uuid(),
    userId: zod_1.z.string().uuid(),
    data: zod_1.z.any(),
    timestamp: zod_1.z.string().datetime(),
});
// Error types
class AppError extends Error {
    constructor(message, statusCode = 500, code) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.name = 'AppError';
    }
}
exports.AppError = AppError;
class ValidationError extends AppError {
    constructor(message, field) {
        super(message, 400, 'VALIDATION_ERROR');
        this.field = field;
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
class AuthenticationError extends AppError {
    constructor(message = 'Authentication required') {
        super(message, 401, 'AUTH_ERROR');
        this.name = 'AuthenticationError';
    }
}
exports.AuthenticationError = AuthenticationError;
class AuthorizationError extends AppError {
    constructor(message = 'Access denied') {
        super(message, 403, 'AUTHORIZATION_ERROR');
        this.name = 'AuthorizationError';
    }
}
exports.AuthorizationError = AuthorizationError;
class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
        super(message, 404, 'NOT_FOUND');
        this.name = 'NotFoundError';
    }
}
exports.NotFoundError = NotFoundError;
