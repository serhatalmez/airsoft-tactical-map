-- Airsoft Tactical Map Database Schema
-- Run this in your Supabase SQL editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Create enum types
CREATE TYPE user_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE tactical_symbol_type AS ENUM (
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
  'trench'
);
CREATE TYPE symbol_size AS ENUM ('small', 'medium', 'large');

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(255),
  is_guest BOOLEAN DEFAULT false,
  avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rooms table
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  invite_code VARCHAR(20) UNIQUE NOT NULL,
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  is_private BOOLEAN DEFAULT false,
  password_hash TEXT,
  max_members INTEGER DEFAULT 20 CHECK (max_members > 0 AND max_members <= 50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Room members table
CREATE TABLE room_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role user_role DEFAULT 'member',
  is_online BOOLEAN DEFAULT false,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

-- User positions table
CREATE TABLE user_positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 8) NOT NULL CHECK (latitude >= -90 AND latitude <= 90),
  longitude DECIMAL(11, 8) NOT NULL CHECK (longitude >= -180 AND longitude <= 180),
  accuracy DECIMAL(8, 2),
  heading DECIMAL(5, 2) CHECK (heading >= 0 AND heading <= 360),
  is_visible BOOLEAN DEFAULT true,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, room_id)
);

-- Tactical symbols table
CREATE TABLE tactical_symbols (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  type tactical_symbol_type NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL CHECK (latitude >= -90 AND latitude <= 90),
  longitude DECIMAL(11, 8) NOT NULL CHECK (longitude >= -180 AND longitude <= 180),
  label VARCHAR(50),
  description TEXT,
  color VARCHAR(7) DEFAULT '#FF0000' CHECK (color ~ '^#[0-9A-F]{6}$'),
  size symbol_size DEFAULT 'medium',
  rotation DECIMAL(5, 2) DEFAULT 0 CHECK (rotation >= 0 AND rotation <= 360),
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_rooms_invite_code ON rooms(invite_code);
CREATE INDEX idx_rooms_owner_id ON rooms(owner_id);
CREATE INDEX idx_room_members_room_id ON room_members(room_id);
CREATE INDEX idx_room_members_user_id ON room_members(user_id);
CREATE INDEX idx_user_positions_room_id ON user_positions(room_id);
CREATE INDEX idx_user_positions_user_id ON user_positions(user_id);
CREATE INDEX idx_tactical_symbols_room_id ON tactical_symbols(room_id);
CREATE INDEX idx_tactical_symbols_created_by ON tactical_symbols(created_by);

-- Spatial indexes for location queries
CREATE INDEX idx_user_positions_location ON user_positions USING GIST (ST_Point(longitude, latitude));
CREATE INDEX idx_tactical_symbols_location ON tactical_symbols USING GIST (ST_Point(longitude, latitude));

-- Functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tactical_symbols_updated_at BEFORE UPDATE ON tactical_symbols
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tactical_symbols ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile" ON users
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Rooms policies
CREATE POLICY "Room owners can manage their rooms" ON rooms
  FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "Room members can view their rooms" ON rooms
  FOR SELECT USING (
    id IN (
      SELECT room_id FROM room_members 
      WHERE user_id = auth.uid()
    )
  );

-- Room members policies
CREATE POLICY "Room owners can manage members" ON room_members
  FOR ALL USING (
    room_id IN (
      SELECT id FROM rooms WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can view room members of their rooms" ON room_members
  FOR SELECT USING (
    room_id IN (
      SELECT room_id FROM room_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can leave rooms" ON room_members
  FOR DELETE USING (user_id = auth.uid());

-- User positions policies
CREATE POLICY "Users can manage their own positions" ON user_positions
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Room members can view positions in their rooms" ON user_positions
  FOR SELECT USING (
    room_id IN (
      SELECT room_id FROM room_members 
      WHERE user_id = auth.uid()
    )
  );

-- Tactical symbols policies
CREATE POLICY "Symbol creators can manage their symbols" ON tactical_symbols
  FOR ALL USING (created_by = auth.uid());

CREATE POLICY "Room members can view symbols in their rooms" ON tactical_symbols
  FOR SELECT USING (
    room_id IN (
      SELECT room_id FROM room_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Room members can create symbols in their rooms" ON tactical_symbols
  FOR INSERT WITH CHECK (
    room_id IN (
      SELECT room_id FROM room_members 
      WHERE user_id = auth.uid()
    )
  );

-- Functions for invite code generation
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old positions (optional, for maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_positions()
RETURNS void AS $$
BEGIN
  DELETE FROM user_positions 
  WHERE last_updated < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Views for common queries
CREATE VIEW room_details AS
SELECT 
  r.*,
  u.username as owner_username,
  COUNT(rm.id) as member_count
FROM rooms r
JOIN users u ON r.owner_id = u.id
LEFT JOIN room_members rm ON r.id = rm.room_id
GROUP BY r.id, u.username;

CREATE VIEW active_room_members AS
SELECT 
  rm.*,
  u.username,
  u.email,
  u.avatar,
  up.latitude,
  up.longitude,
  up.heading,
  up.last_updated as position_updated
FROM room_members rm
JOIN users u ON rm.user_id = u.id
LEFT JOIN user_positions up ON rm.user_id = up.user_id AND rm.room_id = up.room_id
WHERE rm.is_online = true;

-- Initial data (optional test data)
-- Uncomment the following lines if you want some test data

/*
INSERT INTO users (id, username, email, is_guest) VALUES 
  ('00000000-0000-0000-0000-000000000001', 'test_user', 'test@example.com', false);

INSERT INTO rooms (id, name, description, invite_code, owner_id) VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Test Room', 'A test tactical room', 'TEST1234', '00000000-0000-0000-0000-000000000001');

INSERT INTO room_members (room_id, user_id, role) VALUES 
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'owner');
*/
