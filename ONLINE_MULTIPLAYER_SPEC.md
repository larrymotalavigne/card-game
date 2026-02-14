# Online Multiplayer Architecture Specification
## Job Wars Card Game

**Status**: Architectural Design (Not Implemented)
**Version**: 1.0
**Last Updated**: 2026-02-13

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Core Systems](#core-systems)
5. [API Specification](#api-specification)
6. [Database Schema](#database-schema)
7. [Security & Anti-Cheat](#security--anti-cheat)
8. [Matchmaking](#matchmaking)
9. [State Synchronization](#state-synchronization)
10. [Deployment](#deployment)
11. [Cost Estimation](#cost-estimation)
12. [Implementation Roadmap](#implementation-roadmap)

---

## Overview

### Goals

- Enable real-time multiplayer card game matches
- Support ranked and casual play modes
- Provide robust matchmaking system
- Ensure fair play with anti-cheat measures
- Scale to support 1000+ concurrent players initially

### Non-Goals (Phase 1)

- Spectator mode
- Tournament system
- In-game chat (text only, no voice)
- Mobile native apps (web PWA initially)

---

## Architecture

### High-Level Architecture

```
┌─────────────┐
│   Client    │ (Angular PWA)
│  (Browser)  │
└──────┬──────┘
       │ WebSocket + HTTPS
       │
┌──────▼──────────────────────────────────────┐
│          Load Balancer (Nginx)              │
└──────┬──────────────────────────────────────┘
       │
┌──────▼──────────────────────────────────────┐
│       Game Server Cluster (Node.js)         │
│   ┌─────────────┬─────────────┬──────────┐ │
│   │  Game Room  │  Game Room  │   ...    │ │
│   │   Manager   │   Manager   │          │ │
│   └─────────────┴─────────────┴──────────┘ │
└──────┬──────────────────────────────────────┘
       │
┌──────▼──────────────────────────────────────┐
│          Redis (Session Store)              │
│    + Message Queue (PubSub for rooms)       │
└─────────────────────────────────────────────┘
       │
┌──────▼──────────────────────────────────────┐
│      PostgreSQL Database Cluster            │
│   (Game history, user data, rankings)       │
└─────────────────────────────────────────────┘
```

### System Components

1. **Frontend (Angular PWA)**
   - Existing game client
   - WebSocket client for real-time communication
   - Optimistic UI updates
   - Local game state validation

2. **API Gateway**
   - Authentication/Authorization (JWT)
   - Rate limiting
   - Request routing
   - WebSocket upgrade handling

3. **Game Server**
   - Room management
   - Game state authority
   - Action validation
   - State broadcasting
   - AI opponent simulation

4. **Matchmaking Service**
   - Player queue management
   - MMR (Matchmaking Rating) calculation
   - Room creation
   - Queue prioritization

5. **Database**
   - User profiles
   - Match history
   - Rankings/leaderboards
   - Deck storage
   - Collection progress

6. **Cache Layer (Redis)**
   - Session management
   - Active game states
   - Matchmaking queues
   - Leaderboard cache

---

## Technology Stack

### Backend

**Game Server**: Node.js + TypeScript
- **Framework**: NestJS (scalable, TypeScript-native)
- **WebSocket**: Socket.IO (built-in reconnection, rooms)
- **Alternative**: Colyseus (specialized game server framework)

**Why Node.js?**
- Same language as frontend (code sharing)
- Excellent WebSocket support
- Good performance for I/O-bound operations
- Large ecosystem

### Database

**Primary**: PostgreSQL 15+
- Structured data (users, matches, rankings)
- JSONB for flexible game state storage
- Strong consistency guarantees

**Cache**: Redis 7+
- Session storage
- Active game states
- Message queue (PubSub)
- Leaderboards (sorted sets)

### Infrastructure

**Hosting**:
- Option 1: AWS (ECS Fargate + RDS + ElastiCache)
- Option 2: Railway/Render (simpler, good for MVP)
- Option 3: DigitalOcean App Platform (cost-effective)

**CDN**: Cloudflare
- DDoS protection
- WebSocket proxy
- Static asset caching

**Monitoring**:
- Sentry (error tracking)
- DataDog / New Relic (APM)
- LogRocket (session replay)

---

## Core Systems

### 1. Authentication System

```typescript
// JWT-based authentication
interface UserToken {
  userId: string;
  username: string;
  rank: number;
  iat: number; // issued at
  exp: number; // expiration
}

// Auth flow:
// 1. User signs up/logs in
// 2. Server issues JWT (24h expiry)
// 3. Client stores JWT in localStorage
// 4. Client sends JWT with WebSocket handshake
// 5. Server validates and attaches user to socket
```

**Registration**:
- Email + password (bcrypt hashing)
- Email verification required
- Username uniqueness check
- Optional: OAuth (Google, Discord)

### 2. Matchmaking System

```typescript
interface MatchmakingQueue {
  queueType: 'casual' | 'ranked';
  players: QueuedPlayer[];
  avgWaitTime: number;
}

interface QueuedPlayer {
  userId: string;
  username: string;
  mmr: number; // Elo rating
  deckId: string;
  queuedAt: Date;
}

// Matchmaking algorithm:
// 1. Group players by queue type
// 2. Sort by queue time and MMR
// 3. Match players within ±200 MMR range
// 4. Expand range by +50 every 30 seconds
// 5. Create game room when 2 players matched
```

**MMR Calculation**:
- Elo rating system
- Starting MMR: 1200
- K-factor: 32 (new players), 16 (established)
- MMR decay after 30 days inactivity

### 3. Game Room Management

```typescript
interface GameRoom {
  roomId: string;
  players: [Player, Player];
  gameState: GameState;
  createdAt: Date;
  isRanked: boolean;
  spectators?: string[]; // future
}

// Room lifecycle:
// 1. Created by matchmaker
// 2. Players connect via WebSocket
// 3. Game initialization (decks, mulligan)
// 4. Turn-based gameplay
// 5. Game end → update MMR → cleanup
// 6. Room persists for 5 minutes after end (replay)
```

### 4. State Synchronization

**Authority Model**: Server-Authoritative
- Client sends actions
- Server validates and executes
- Server broadcasts new state
- Client updates UI optimistically

```typescript
// Message types
enum MessageType {
  // Client → Server
  JOIN_GAME = 'join_game',
  PLAYER_ACTION = 'player_action',
  MULLIGAN = 'mulligan',
  CHAT_MESSAGE = 'chat_message',

  // Server → Client
  GAME_STATE = 'game_state',
  GAME_EVENT = 'game_event',
  OPPONENT_ACTION = 'opponent_action',
  ERROR = 'error',
}

// Example action message
{
  type: MessageType.PLAYER_ACTION,
  payload: {
    action: 'play_card',
    instanceId: 'card-123',
    target?: 'opponent-card-456'
  },
  timestamp: Date.now()
}
```

**Optimistic Updates**:
- Client predicts result of valid actions
- Updates local UI immediately
- Reverts if server rejects

**Latency Handling**:
- Display ping indicator
- Rollback incorrect predictions
- Timer adjustments for high latency

---

## API Specification

### REST Endpoints

**Authentication**
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Get JWT token
- `POST /api/auth/refresh` - Refresh token
- `GET /api/auth/verify-email/:token` - Verify email

**User Management**
- `GET /api/users/me` - Get current user profile
- `PATCH /api/users/me` - Update profile
- `GET /api/users/:id` - Get public profile
- `GET /api/users/me/stats` - Get player statistics

**Decks**
- `GET /api/decks` - List user's decks
- `POST /api/decks` - Create new deck
- `PUT /api/decks/:id` - Update deck
- `DELETE /api/decks/:id` - Delete deck
- `GET /api/decks/:id/validate` - Validate deck legality

**Matchmaking**
- `POST /api/matchmaking/queue` - Join queue
- `DELETE /api/matchmaking/queue` - Leave queue
- `GET /api/matchmaking/status` - Check queue status

**Leaderboards**
- `GET /api/leaderboards/ranked` - Top ranked players
- `GET /api/leaderboards/seasonal` - Season rankings

**Match History**
- `GET /api/matches/history` - Get match history
- `GET /api/matches/:id` - Get match details
- `GET /api/matches/:id/replay` - Get replay data

### WebSocket Events

**Connection**
```typescript
// Client connects with JWT in query or auth header
socket.emit('authenticate', { token: 'jwt-token' });

// Server acknowledges
socket.on('authenticated', { userId, username });
```

**Game Flow**
```typescript
// Join game room
socket.emit('join_room', { roomId });

// Receive initial game state
socket.on('game_init', { gameState, yourPlayerId });

// Send action
socket.emit('action', {
  type: 'play_card',
  instanceId: 'card-123'
});

// Receive state update
socket.on('state_update', { gameState, lastAction });

// Receive game end
socket.on('game_end', {
  winner: 'player1',
  reason: 'reputation',
  mmrChange: +15,
  newMmr: 1215
});
```

---

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  mmr INTEGER DEFAULT 1200,
  rank_points INTEGER DEFAULT 0,
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  last_active_at TIMESTAMP DEFAULT NOW(),
  banned BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_mmr ON users(mmr DESC);
```

### Decks Table
```sql
CREATE TABLE decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  cards JSONB NOT NULL, -- DeckEntry[]
  is_legal BOOLEAN DEFAULT TRUE,
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_decks_user_id ON decks(user_id);
```

### Matches Table
```sql
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player1_id UUID REFERENCES users(id),
  player2_id UUID REFERENCES users(id),
  winner_id UUID REFERENCES users(id),
  player1_deck_id UUID REFERENCES decks(id),
  player2_deck_id UUID REFERENCES decks(id),
  is_ranked BOOLEAN DEFAULT FALSE,
  turn_count INTEGER,
  duration_seconds INTEGER,
  game_state_final JSONB, -- Final game state for replays
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_matches_player1 ON matches(player1_id);
CREATE INDEX idx_matches_player2 ON matches(player2_id);
CREATE INDEX idx_matches_created_at ON matches(created_at DESC);
```

### Seasons Table
```sql
CREATE TABLE seasons (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT FALSE
);

CREATE TABLE season_rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id INTEGER REFERENCES seasons(id),
  user_id UUID REFERENCES users(id),
  mmr INTEGER NOT NULL,
  rank_position INTEGER,
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  UNIQUE(season_id, user_id)
);

CREATE INDEX idx_season_rankings_season ON season_rankings(season_id, mmr DESC);
```

---

## Security & Anti-Cheat

### Client-Side Protection

1. **Action Validation**
   - All actions validated server-side
   - Client predictions can be wrong
   - Invalid actions rejected + logged

2. **Rate Limiting**
   - Max 10 actions per second per player
   - Prevents spam/DoS

3. **Obfuscation**
   - Opponent hand is never sent to client
   - Deck order shuffled server-side
   - RNG seed on server only

### Server-Side Measures

1. **Input Validation**
   ```typescript
   function validateAction(action: PlayerAction, gameState: GameState): boolean {
     // Check action type is valid
     // Check player owns the card
     // Check card is in correct zone
     // Check sufficient budget
     // Check timing (correct phase)
     // Check targets are valid
     return true;
   }
   ```

2. **Time Controls**
   - 90 seconds per turn
   - 3 time extensions per game (30s each)
   - Auto-pass if timer expires

3. **Automated Detection**
   - Impossibly fast actions (< 50ms)
   - Repeated identical decks (bot farming)
   - Win rate > 90% (potential cheater)
   - Account sharing detection

4. **Replay Analysis**
   - Store all game actions
   - Review flagged matches
   - Pattern detection for bots

### Data Security

1. **Encryption**
   - HTTPS/WSS only
   - Password hashing (bcrypt, cost 12)
   - JWT secret rotation

2. **DDoS Protection**
   - Cloudflare proxy
   - Connection limits per IP
   - Challenge for suspicious traffic

---

## Matchmaking

### Queue System

```typescript
class MatchmakingService {
  private casualQueue: QueuedPlayer[] = [];
  private rankedQueue: QueuedPlayer[] = [];

  async addToQueue(player: QueuedPlayer, queueType: 'casual' | 'ranked') {
    const queue = queueType === 'casual' ? this.casualQueue : this.rankedQueue;
    queue.push(player);

    // Try to find match every 5 seconds
    this.attemptMatchmaking(queueType);
  }

  private attemptMatchmaking(queueType: string) {
    const queue = queueType === 'casual' ? this.casualQueue : this.rankedQueue;

    for (let i = 0; i < queue.length - 1; i++) {
      const player1 = queue[i];
      const waitTime = Date.now() - player1.queuedAt.getTime();
      const mmrRange = 200 + Math.floor(waitTime / 30000) * 50; // Expand range over time

      for (let j = i + 1; j < queue.length; j++) {
        const player2 = queue[j];

        if (Math.abs(player1.mmr - player2.mmr) <= mmrRange) {
          // Match found!
          queue.splice(j, 1); // Remove player2
          queue.splice(i, 1); // Remove player1
          this.createGameRoom(player1, player2, queueType === 'ranked');
          return;
        }
      }
    }
  }
}
```

### MMR System

**Initial MMR**: 1200

**Win/Loss Calculation**:
```typescript
function calculateMmrChange(
  playerMmr: number,
  opponentMmr: number,
  won: boolean,
  kFactor: number = 32
): number {
  const expectedScore = 1 / (1 + Math.pow(10, (opponentMmr - playerMmr) / 400));
  const actualScore = won ? 1 : 0;
  const change = Math.round(kFactor * (actualScore - expectedScore));
  return change;
}

// Example:
// Player (MMR 1200) vs Opponent (MMR 1250)
// If player wins: +17 MMR
// If player loses: -17 MMR
```

---

## State Synchronization

### Game State Updates

```typescript
// Server broadcasts minimal diffs
interface StateUpdate {
  type: 'state_update';
  timestamp: number;
  diff: {
    phase?: GamePhase;
    activePlayerId?: string;
    budgetRemaining?: Record<string, number>;
    cards?: {
      moved: Array<{ instanceId: string; zone: CardZone }>;
      modified: Array<{ instanceId: string; changes: Partial<CardInstance> }>;
      created: CardInstance[];
      destroyed: string[];
    };
    combat?: CombatState;
    log?: GameLogEntry[];
  };
}
```

### Reconnection Handling

```typescript
// If player disconnects:
// 1. Game pauses for 60 seconds
// 2. If reconnects → resume
// 3. If timeout → opponent wins

socket.on('disconnect', () => {
  room.pauseGame();
  setTimeout(() => {
    if (!player.reconnected) {
      room.forfeit(playerId);
    }
  }, 60000);
});

socket.on('reconnect', () => {
  // Send full game state
  socket.emit('state_sync', { fullGameState });
  room.resumeGame();
});
```

---

## Deployment

### Environment Setup

**Development**:
- Local Node.js server
- Local PostgreSQL + Redis
- ngrok for WebSocket testing

**Staging**:
- AWS ECS (1 instance)
- RDS PostgreSQL (db.t3.micro)
- ElastiCache Redis (cache.t3.micro)
- Automated deployments from `develop` branch

**Production**:
- AWS ECS (auto-scaling, 2-10 instances)
- RDS PostgreSQL (db.t3.medium, Multi-AZ)
- ElastiCache Redis Cluster
- CloudFront CDN
- Route 53 DNS
- Automated deployments from `main` branch

### CI/CD Pipeline

```yaml
# GitHub Actions workflow
name: Deploy

on:
  push:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - Checkout code
      - Run tests
      - Run linting

  build:
    runs-on: ubuntu-latest
    steps:
      - Build Docker image
      - Push to ECR

  deploy:
    runs-on: ubuntu-latest
    steps:
      - Deploy to ECS
      - Run database migrations
      - Health check
```

### Monitoring

**Metrics to Track**:
- Concurrent players
- Active game rooms
- Average wait time
- Server response time (p50, p95, p99)
- Database query performance
- WebSocket connection count
- Error rate
- MMR distribution

**Alerts**:
- Server CPU > 80%
- Database connections > 90%
- Error rate > 1%
- Average wait time > 2 minutes

---

## Cost Estimation

### Monthly Infrastructure Costs (AWS)

**Small Scale** (100 concurrent players):
- ECS Fargate (2 tasks): ~$60
- RDS PostgreSQL (db.t3.micro): ~$15
- ElastiCache Redis (cache.t3.micro): ~$15
- Data transfer: ~$10
- **Total: ~$100/month**

**Medium Scale** (1000 concurrent players):
- ECS Fargate (5 tasks): ~$150
- RDS PostgreSQL (db.t3.medium): ~$60
- ElastiCache Redis (cache.t3.medium): ~$50
- Load Balancer: ~$20
- Data transfer: ~$50
- **Total: ~$330/month**

**Large Scale** (10,000 concurrent players):
- ECS Fargate (20 tasks): ~$600
- RDS PostgreSQL (db.r5.large, Multi-AZ): ~$300
- ElastiCache Redis Cluster: ~$200
- Load Balancer: ~$20
- Data transfer: ~$200
- CloudFront: ~$50
- **Total: ~$1,370/month**

### Alternative (Railway/Render)

**Small Scale**:
- Web Service: $20/month
- PostgreSQL: $15/month
- Redis: $15/month
- **Total: ~$50/month**

---

## Implementation Roadmap

### Phase 1: Foundation (2-3 weeks)

- [ ] Setup backend project (NestJS)
- [ ] Database schema & migrations
- [ ] User authentication (register/login)
- [ ] Basic REST API
- [ ] Deploy to staging

### Phase 2: WebSocket & Game Rooms (2-3 weeks)

- [ ] WebSocket integration (Socket.IO)
- [ ] Game room management
- [ ] State synchronization
- [ ] Server-side game logic (port from Angular)
- [ ] Client-server integration

### Phase 3: Matchmaking (1-2 weeks)

- [ ] Queue system
- [ ] MMR calculation
- [ ] Room creation from matchmaking
- [ ] UI for queue status

### Phase 4: Polish & Security (1-2 weeks)

- [ ] Action validation
- [ ] Anti-cheat measures
- [ ] Rate limiting
- [ ] Reconnection handling
- [ ] Error handling

### Phase 5: Features (2-3 weeks)

- [ ] Match history
- [ ] Leaderboards
- [ ] Season system
- [ ] Replays
- [ ] Friend list (optional)

### Phase 6: Testing & Launch (2 weeks)

- [ ] Load testing
- [ ] Bug fixes
- [ ] Production deployment
- [ ] Monitoring setup
- [ ] Beta launch

**Total Estimated Time: 10-15 weeks** (2.5-4 months with 1 developer)

---

## Conclusion

This architecture provides a solid foundation for online multiplayer. Key decisions:

1. **Server-authoritative model** - Prevents cheating
2. **WebSocket with Socket.IO** - Real-time, reliable
3. **PostgreSQL + Redis** - Proven, scalable
4. **AWS/Railway** - Flexible deployment options
5. **Elo MMR** - Fair matchmaking

**Next Steps**:
1. Validate architecture with team
2. Set up development environment
3. Start Phase 1 implementation
4. Regular progress reviews

---

**Questions?** Contact the development team for clarifications or adjustments to this specification.
