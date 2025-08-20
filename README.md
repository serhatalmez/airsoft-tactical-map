# Airsoft Tactical Map - Real-Time Team Coordination

A production-ready real-time airsoft team coordination web application that allows teams to share GPS locations and tactical symbols on a map for strategic communication via mobile devices.

## 🌟 Features

- 🗺️ **Real-time GPS tracking** with device orientation compass
- 🎯 **NATO-compliant tactical symbols** (APP-6 standards)
- 📱 **Mobile-first Progressive Web App** (PWA) with offline capabilities
- 🔗 **Shareable room invitation links** with guest access
- ⚡ **Real-time synchronization** via WebSockets
- 📍 **UTM/MGRS grid overlay** system with configurable scale
- 🛡️ **Secure authentication** with room-based permissions
- 🧭 **Device orientation support** for compass heading
- 📶 **Connection status monitoring** and auto-reconnection
- 🎨 **Modern responsive UI** with dark mode support

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: TailwindCSS, ShadCN UI Components
- **Maps**: OpenStreetMap via React-Leaflet
- **Real-time**: Socket.io WebSockets
- **Database**: Supabase (PostgreSQL) with RLS policies
- **Authentication**: Supabase Auth with OAuth support
- **Validation**: Zod schemas with type safety
- **Testing**: Jest with React Testing Library
- **Deployment**: Vercel with Docker support

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** and npm
- **Git** for version control
- **Supabase account** (free tier available)

### 1. Setup Project

```bash
# Clone the repository
git clone <your-repo-url>
cd airsoft_tactical_map

# Install all dependencies
npm install

# Copy environment template
cp .env.local.example .env.local
```

### 2. Database Configuration

1. **Create Supabase Project**:
   - Visit [supabase.com](https://supabase.com)
   - Create new project
   - Note your project URL and API keys

2. **Run Database Schema**:
   - Open Supabase SQL Editor
   - Copy and run `api/database/schema.sql`
   - Verify tables are created successfully

3. **Configure Supabase Authentication**:
   - Go to Supabase Dashboard > Authentication > Settings
   - **Disable email confirmation** for development (optional):
     - Set "Enable email confirmations" to OFF
   - **Configure Site URL**: Set to `http://localhost:3000`
   - **Add Redirect URLs**: Add `http://localhost:3000/**` for development

4. **Configure Environment**:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

   **Note**: For email/password authentication, you may want to configure email settings in Supabase:
   - Go to Supabase Dashboard > Authentication > Settings
   - Configure SMTP settings for email confirmation (optional)
   - Set email templates for password reset functionality

### 3. Development Server

```bash
# Start Next.js development server
npm run dev

# In a separate terminal, start Socket.io server
cd server
node socket-server.js
```

### 4. Production Deployment

#### Option A: Vercel (Recommended)
1. Connect GitHub repository to Vercel
2. Add environment variables in dashboard
3. Deploy automatically on push to main

#### Option B: Docker
```bash
# Build Docker image
docker build -t airsoft-tactical-map .

# Run container
docker run -p 3000:3000 airsoft-tactical-map
```

## 📁 Project Structure

```
airsoft_tactical_map/
├── api/                    # Backend API & Services
│   ├── database/          # SQL schemas & migrations
│   │   └── schema.sql     # PostgreSQL database schema
│   ├── services/          # Business logic services
│   │   ├── supabase.ts    # Database client configuration
│   │   ├── roomService.ts # Room management operations
│   │   ├── positionService.ts # GPS position handling
│   │   └── symbolService.ts # Tactical symbol operations
│   └── routes/            # API route handlers
├── client/                # Frontend Application
│   ├── components/        # React components
│   │   ├── ui/            # Reusable UI components
│   │   └── map/           # Map-specific components
│   │       └── MapView.tsx # Main map component
│   ├── hooks/             # Custom React hooks
│   │   ├── useGPS.ts      # GPS & device orientation
│   │   └── useWebSocket.ts # Real-time communication
│   ├── lib/               # Utility functions
│   │   └── utils.ts       # Helper functions
│   └── styles/            # Global styles
│       └── globals.css    # TailwindCSS + custom styles
├── pages/                 # Next.js pages & API routes
│   ├── api/               # API endpoints
│   │   └── rooms/         # Room management APIs
│   ├── _app.tsx           # App wrapper
│   └── index.tsx          # Home page
├── server/                # WebSocket server
│   └── socket-server.ts   # Socket.io real-time server
├── shared/                # Shared types & utilities
│   └── types/             # TypeScript type definitions
├── __tests__/             # Test suites
├── public/                # Static assets
│   └── manifest.json      # PWA manifest
└── docs/                  # Documentation
```

## 🎮 Usage Guide

### Creating an Account
1. **Visit the application** at `http://localhost:3000`
2. **Click "Register"** tab on the login page
3. **Fill in your details**:
   - Email address (for account recovery)
   - Username (display name for your team)
   - Password (minimum 6 characters)
   - Confirm password
4. **Create account** and start using the app immediately

### Signing In
1. **Visit the application** at `http://localhost:3000`
2. **Enter your credentials**:
   - Email address
   - Password
3. **Click "Sign In"** to access your dashboard
### Creating a Room
1. **Sign in** with your account credentials
2. **Click "Create Room"** on dashboard
3. **Configure room settings**:
   - Name and description
   - Maximum members (2-50)
   - Private/public access
   - Optional password protection
4. **Share invite code** with team members

### Joining a Room
1. **Enter room code** (8-character alphanumeric)
2. **Set display name** for team identification
3. **Enter password** (if required)
4. **Allow GPS access** for position sharing

### Map Operations
- **GPS Tracking**: Automatic position updates every 5-10 seconds
- **Compass Mode**: Device orientation shows heading direction
- **Grid System**: UTM/MGRS overlay with configurable scale
- **Zoom Controls**: Pinch-to-zoom or button controls
- **Center on User**: Quick navigation to your position

### Tactical Symbols
- **Symbol Toolbar**: Access NATO-standard symbols
- **Place Symbols**: Tap map after selecting symbol type
- **Edit Symbols**: Drag to move, tap for options
- **Symbol Categories**:
  - Units: Friendly, Enemy, Neutral
  - Objectives: Waypoints, Rally Points
  - Infrastructure: Buildings, Bridges
  - Hazards: Danger Areas, Obstacles

### Real-time Features
- **Live Position Updates**: See team locations instantly
- **Symbol Synchronization**: All map changes sync across devices
- **Connection Status**: Visual indicator for connectivity
- **Auto-reconnection**: Handles network interruptions
- **Member Status**: Online/offline indicators

## 🧪 Testing

```bash
# Run test suite
npm test

# Watch mode for development
npm run test:watch

# Type checking
npm run type-check

# Linting
npm run lint
```

### Test Coverage
- **Unit Tests**: Hooks, utilities, services
- **Integration Tests**: Component interactions
- **E2E Tests**: User workflows (planned)
- **GPS Mocking**: Simulated location data
- **WebSocket Mocking**: Real-time event testing

## 🔧 Configuration

### GPS Settings
```typescript
// Customize in useGPS hook
const gpsOptions = {
  enableHighAccuracy: true,    // Better precision
  timeout: 10000,              // Request timeout
  maximumAge: 5000,            // Cache duration
  updateInterval: 5000,        // Update frequency
}
```

### Map Customization
```typescript
// Grid overlay settings
const gridConfig = {
  gridSize: 100,               // Grid spacing in meters
  showLabels: true,            // Display grid references
  color: '#666666',            // Grid line color
  opacity: 0.3,               // Grid transparency
}
```

### Symbol Categories
```typescript
// Available tactical symbols
const symbolTypes = [
  'friendly_unit', 'enemy_unit', 'neutral_unit',
  'objective', 'waypoint', 'rally_point',
  'danger_area', 'safe_zone', 'observation_post',
  'command_post', 'supply_depot', 'medical_station',
  // ... and more NATO APP-6 compliant symbols
]
```

## 📱 Mobile Optimization

### PWA Features
- **Install Prompt**: Add to home screen
- **Offline Support**: Basic functionality without internet
- **Background Sync**: Queue updates when offline
- **Push Notifications**: Room activity alerts (planned)

### Touch Interactions
- **Gesture Support**: Pan, zoom, rotate
- **Touch Targets**: Minimum 44px for accessibility
- **Haptic Feedback**: Symbol placement confirmation
- **Portrait Lock**: Optimal mobile experience

## 🔒 Security Features

### Authentication
- **Email/Password Authentication**: Secure registration and login system
- **Session Management**: Automatic token refresh and validation
- **User Profiles**: Custom usernames and profile management
- **Guest Access**: Temporary sessions for quick joining (planned)
- **Password Security**: Minimum 6 characters with validation

### Data Protection
- **Row Level Security**: Database-level access control
- **Input Validation**: Zod schema validation
- **Rate Limiting**: API request throttling
- **CORS Configuration**: Secure cross-origin requests

### Privacy
- **Location Privacy**: Users control visibility
- **Data Retention**: Automatic cleanup of old positions
- **Minimal Storage**: No persistent location history
- **GDPR Compliance**: User data management

## 🚨 Troubleshooting

### Common Issues

#### Authentication Errors
```bash
# "Invalid API key" error during registration
# 1. Check your environment variables in .env.local
# 2. Ensure you're using the correct Supabase project URL
# 3. Verify your SUPABASE_SERVICE_ROLE_KEY is correct
# 4. Check Supabase Dashboard > Settings > API for correct keys

# "Email not confirmed" error
# 1. Go to Supabase Dashboard > Authentication > Settings
# 2. Disable "Enable email confirmations" for development
# 3. Or check your email for confirmation link
```

#### GPS Not Working
```bash
# Check browser permissions
navigator.permissions.query({name: 'geolocation'})

# Common solutions:
# 1. Enable location services on device
# 2. Use HTTPS (required for GPS)
# 3. Check browser compatibility
# 4. Clear browser cache and permissions
```

#### WebSocket Connection Failed
```bash
# Check server status
curl http://localhost:3001/health

# Common solutions:
# 1. Verify Socket.io server is running
# 2. Check firewall settings
# 3. Ensure CORS configuration
# 4. Test with different network
```

#### Map Loading Issues
```bash
# OpenStreetMap tile server issues
# 1. Check internet connectivity
# 2. Try different tile server
# 3. Clear browser cache
# 4. Check for rate limiting
```

### Debug Mode
```bash
# Enable verbose logging
NEXT_PUBLIC_DEBUG=true npm run dev

# Socket.io debugging
DEBUG=socket.io* npm run dev
```

## 🤝 Contributing

### Development Workflow
1. **Fork repository** and create feature branch
2. **Follow code standards**: TypeScript, ESLint, Prettier
3. **Add tests** for new functionality
4. **Update documentation** for API changes
5. **Submit pull request** with detailed description

### Code Standards
- **TypeScript**: Strict mode enabled
- **Component Structure**: Functional components with hooks
- **CSS**: TailwindCSS utility classes
- **Testing**: Jest + React Testing Library
- **Commits**: Conventional commit format

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 🆘 Support

- **Documentation**: Check this README and inline comments
- **Issues**: Create GitHub issue with bug reports
- **Discussions**: Use GitHub Discussions for questions
- **Security**: Report vulnerabilities privately via email

## 🗺️ Roadmap

### Phase 1 (Current)
- ✅ Core GPS tracking and map display
- ✅ Real-time position sharing
- ✅ Basic tactical symbols
- ✅ Room management system

### Phase 2 (Planned)
- 🔄 Enhanced symbol library (full NATO APP-6)
- 🔄 Offline map caching
- 🔄 Push notifications
- 🔄 Voice communication integration

### Phase 3 (Future)
- 📋 Mission planning tools
- 📊 Analytics and reporting
- 🎯 Gaming integration
- 🌐 Multi-language support

---

**Built with ❤️ for the airsoft community**
