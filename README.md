# 🌾 AgriPulse - Intelligent Field Monitoring System API

[![NestJS](https://img.shields.io/badge/NestJS-10.x-red?logo=nestjs)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-336791?logo=postgresql)](https://www.postgresql.org/)
[![JWT](https://img.shields.io/badge/Auth-JWT-yellow?logo=jsonwebtokens)](https://jwt.io/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)
[![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)](README.md)

## 📋 Overview

AgriPulse is a **production-ready backend API** for intelligent agricultural field monitoring and management. It empowers farm coordinators (Admins) and field agents to track crop progress, manage field assignments, monitor risks across multiple fields, and drive data-driven decision-making in modern agriculture.

### 🎯 Key Features

- **Role-Based Access Control** - Secure Admin and Agent workflows with fine-grained permissions
- **Smart Field Status Engine** - Automatic field lifecycle management and state transitions
- **Session Management** - Multi-device session tracking with device-specific login
- **Field Lifecycle Tracking** - Complete field journey from creation through completion
- **Agent Performance Analytics** - Real-time performance metrics and ranking system
- **Activity Timeline** - Comprehensive audit trail of all field and system events
- **Caching Layer** - In-memory caching with Redis-ready architecture for optimal performance
- **HTTP-Only Cookies** - Secure session management without token exposure
- **Comprehensive Logging** - Debug and request logging for monitoring and troubleshooting

---

## 🏗️ Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Backend Framework** | NestJS 10.x | Enterprise-grade Node.js framework with TypeScript |
| **Language** | TypeScript 5.x | Type-safe JavaScript development |
| **Database** | PostgreSQL 14+ | Relational database with advanced features |
| **ORM** | TypeORM | Object-relational mapping with migration support |
| **Authentication** | JWT + bcrypt | Secure token-based auth with password hashing |
| **Caching** | In-Memory (Redis-ready) | High-performance data caching layer |
| **Validation** | class-validator | DTO and payload validation |
| **Logging** | Custom Logger | Request and debug logging middleware |
| **API Docs** | Swagger/OpenAPI | Auto-generated API documentation |

---

## 🔧 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT LAYER                           │
│              (React Frontend / Mobile Apps)                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    API GATEWAY LAYER                        │
│           (HTTP Endpoints / REST Routes)                    │
├─────────────────────────────────────────────────────────────┤
│  Auth Controller  │  Users Controller  │  Fields Controller  │
│  Sessions Handler │  Dashboard Handler │  Updates Handler    │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Auth Service │  │ Users Service│  │ Fields Svc   │
├──────────────┤  ├──────────────┤  ├──────────────┤
│• JWT tokens  │  │• User mgmt   │  │• CRUD ops    │
│• Sessions    │  │• Roles       │  │• Status flow │
│• Passwords   │  │• Agents list │  │• Assignments │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                  │
       │  ┌──────────────┼──────────────┐   │
       │  ▼              ▼              ▼   │
       │ ┌────────────────────────────────┐ │
       │ │   CACHING LAYER               │ │
       │ │  (In-Memory / Redis-Ready)    │ │
       │ └────────────────────────────────┘ │
       │  │                                  │
       └──┼──────────────────────────────────┘
          ▼
┌─────────────────────────────────────────────────────────────┐
│                    DATABASE LAYER                           │
│              (PostgreSQL + TypeORM)                         │
├─────────────────────────────────────────────────────────────┤
│  Users Table  │  Fields Table  │  Sessions Table            │
│  FieldUpdates │  Activities    │  Relationships             │
└─────────────────────────────────────────────────────────────┘
```

### 📦 Core Modules

| Module | Responsibility |
|--------|-----------------|
| **Auth** | Login, signup, token refresh, session management |
| **Users** | User management, agent listings, role management |
| **Sessions** | Multi-device session tracking and termination |
| **Fields** | Field CRUD operations, status management, assignments |
| **FieldUpdates** | Field progress notes, update history, timeline |
| **Dashboard** | Analytics, metrics, performance data (role-specific) |
| **Cache** | In-memory caching layer with TTL support |
| **Common** | Guards, interceptors, decorators, filters, middleware |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 18.x ([Download](https://nodejs.org/))
- **npm** >= 9.x (included with Node.js)
- **PostgreSQL** >= 14.x ([Download](https://www.postgresql.org/download/))
- **Git** (for cloning the repository)

### Installation Steps

#### 1. Clone the Repository

```bash
git clone https://github.com/your-org/agripulse-api.git
cd agripulse-api
```

#### 2. Install Dependencies

```bash
npm install
```

#### 3. Configure Environment Variables

Create a `.env` file in the project root (see [Environment Variables](#-environment-variables) section):

```bash
cp .env.example .env
```

Then edit `.env` with your actual configuration.

#### 4. Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Inside psql, create the database
CREATE DATABASE agripulse;
\q
```

Or use a single command:

```bash
psql -U postgres -c "CREATE DATABASE agripulse;"
```

#### 5. Run Database Migrations

Migrations run automatically on application startup (TypeORM synchronization enabled):

```bash
npm run start:dev
```

The database schema will be created automatically.

#### 6. Seed Demo Data

Demo data is seeded automatically on first application run. Default accounts:

**Admin Account:**
- Email: `mukirisimon22@gmail.com`
- Password: `password123`

**Agent Account:**
- Email: `mukiri.16030@students.kyu.ac.ke`
- Password: `password123`

#### 7. Start Development Server

```bash
npm run start:dev
```

Server will start on `http://localhost:3000`

```
✓ AgriPulse API running on http://localhost:3000
✓ Swagger docs available at http://localhost:3000/api/docs
```

---

## 🔐 Environment Variables

Create a `.env` file in the project root with the following configuration:

```env
# Application
NODE_ENV=development
PORT=3000
APP_NAME=AgriPulse

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=agripulse
DB_SYNCHRONIZE=true
DB_LOGGING=true

# Authentication
JWT_SECRET=your-super-secret-key-change-in-production
JWT_ACCESS_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Security
BCRYPT_ROUNDS=10

# Logging
LOG_LEVEL=debug

# Session Management
SESSION_TTL=86400

# CORS
CORS_ORIGIN=http://localhost:3001
```

### Environment Variable Descriptions

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | Yes | `development` | Environment (development, staging, production) |
| `PORT` | No | `3000` | Server port |
| `APP_NAME` | No | `AgriPulse` | Application display name |
| `DB_HOST` | Yes | `localhost` | PostgreSQL hostname |
| `DB_PORT` | Yes | `5432` | PostgreSQL port |
| `DB_USERNAME` | Yes | `postgres` | PostgreSQL username |
| `DB_PASSWORD` | Yes | `postgres` | PostgreSQL password |
| `DB_DATABASE` | Yes | `agripulse` | Database name |
| `DB_SYNCHRONIZE` | No | `true` | Auto-sync TypeORM schema (disable in production) |
| `DB_LOGGING` | No | `true` | Enable query logging |
| `JWT_SECRET` | Yes | - | Secret key for JWT signing (**⚠️ change in production**) |
| `JWT_ACCESS_EXPIRES_IN` | No | `1h` | Access token expiration time |
| `JWT_REFRESH_EXPIRES_IN` | No | `7d` | Refresh token expiration time |
| `BCRYPT_ROUNDS` | No | `10` | Password hashing rounds (higher = slower) |
| `LOG_LEVEL` | No | `debug` | Logging verbosity level |
| `SESSION_TTL` | No | `86400` | Session time-to-live in seconds |
| `CORS_ORIGIN` | No | `http://localhost:3001` | CORS allowed origin |

---

## 📡 API Endpoints

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/auth/signup` | ❌ | Create new user account |
| `POST` | `/auth/login` | ❌ | User login (returns JWT) |
| `POST` | `/auth/logout` | ✅ | Logout user (invalidate session) |
| `POST` | `/auth/refresh` | ❌ | Refresh access token |
| `GET` | `/auth/me` | ✅ | Get current user profile |

### Users

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| `GET` | `/users/agents` | ✅ | Admin | List all agents |
| `GET` | `/users/:id` | ✅ | Admin | Get user by ID |

### Fields

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| `GET` | `/fields` | ✅ | Admin | Get all fields (paginated) |
| `GET` | `/fields/my-fields` | ✅ | Agent | Get agent's assigned fields |
| `POST` | `/fields` | ✅ | Admin | Create new field |
| `PATCH` | `/fields/:id` | ✅ | Admin | Update field details |
| `PATCH` | `/fields/:id/stage` | ✅ | Agent | Update field stage |
| `PATCH` | `/fields/:id/assign` | ✅ | Admin | Assign field to agent |
| `DELETE` | `/fields/:id` | ✅ | Admin | Delete field |

### Field Updates

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| `GET` | `/field-updates` | ✅ | Admin | Get all updates (paginated) |
| `GET` | `/field-updates/field/:fieldId` | ✅ | Agent | Get field-specific updates |
| `POST` | `/field-updates` | ✅ | Agent | Create field update/note |
| `DELETE` | `/field-updates/:id` | ✅ | Agent | Delete own update |

### Dashboard

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| `GET` | `/dashboard/admin` | ✅ | Admin | Admin dashboard metrics |
| `GET` | `/dashboard/agent` | ✅ | Agent | Agent dashboard metrics |

---

## 🛠️ Available Scripts

```bash
# Development
npm run start:dev              # Start with hot-reload (NestJS watch mode)
npm run start                  # Start production build
npm run build                  # Build for production

# Testing
npm run test                   # Run unit tests
npm run test:watch            # Run tests in watch mode
npm run test:cov              # Run tests with coverage

# Database
npm run typeorm migration:generate -- -n MigrationName  # Generate migration
npm run typeorm migration:run  # Run migrations
npm run typeorm migration:revert # Revert migrations

# Utilities
npm run lint                   # Run ESLint
npm run format                 # Format code with Prettier
npm run format:check           # Check formatting
```

---

## 🔒 Security Features

### Authentication & Authorization
- **JWT-based Authentication** - Stateless token authentication
- **Role-Based Access Control (RBAC)** - Admin and Agent roles with specific permissions
- **HTTP-Only Cookies** - Session cookies are HTTP-only and secure (not accessible by JavaScript)
- **Password Hashing** - bcrypt with configurable rounds for secure password storage
- **Token Refresh** - Automatic token refresh mechanism for session continuity

### Data Protection
- **NoSQL Injection Guard** - Protects against injection attacks
- **CORS Configuration** - Restricts cross-origin requests
- **Input Validation** - DTOs with class-validator for strict input validation
- **Rate Limiting** - Ready for integration (implement per requirements)

### Monitoring
- **Request Logging** - All HTTP requests logged with timestamps and status codes
- **Debug Logging** - Development-level logging for troubleshooting
- **Activity Timeline** - Audit trail of all significant database operations

---

## 📊 Database Schema

### Tables Overview

#### Users
```
- id (UUID, PK)
- name (String)
- email (String, Unique)
- password (String, hashed)
- role (Enum: admin, agent)
- created_at (Timestamp)
- updated_at (Timestamp)
```

#### Sessions
```
- id (UUID, PK)
- userId (UUID, FK → Users)
- deviceInfo (String)
- ipAddress (String)
- createdAt (Timestamp)
- expiresAt (Timestamp)
```

#### Fields
```
- id (UUID, PK)
- name (String)
- location (String)
- cropType (Enum: maize, beans, wheat, rice, potatoes, sorghum)
- status (Enum: planning, active, completed)
- stage (Enum: planting, growth, flowering, harvesting)
- area (Float - in acres)
- assignedAgentId (UUID, FK → Users)
- createdAt (Timestamp)
- updatedAt (Timestamp)
```

#### FieldUpdates
```
- id (UUID, PK)
- fieldId (UUID, FK → Fields)
- agentId (UUID, FK → Users)
- note (Text)
- type (String)
- createdAt (Timestamp)
```

#### Activities
```
- id (UUID, PK)
- userId (UUID, FK → Users)
- fieldId (UUID, FK → Fields, nullable)
- action (String)
- description (String)
- metadata (JSON)
- createdAt (Timestamp)
```

---

## 🧪 Testing

### Run All Tests
```bash
npm run test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Generate Coverage Report
```bash
npm run test:cov
```

Coverage reports are generated in the `coverage/` directory.

---

## 📚 API Documentation

### Swagger/OpenAPI Docs

Once the server is running, access interactive API documentation:

```
http://localhost:3000/api/docs
```

This provides:
- Complete endpoint documentation
- Request/response schemas
- Try-it-out functionality for all endpoints
- Authentication configuration

---

## 🐛 Troubleshooting

### Issue: PostgreSQL Connection Error

**Error:** `QueryFailedError: error: no such table`

**Solution:**
```bash
# Ensure database exists
psql -U postgres -c "CREATE DATABASE agripulse;"

# Restart the application - migrations will run automatically
npm run start:dev
```

### Issue: JWT Authentication Failures

**Error:** `Invalid token` or `401 Unauthorized`

**Solution:**
- Verify `JWT_SECRET` is set in `.env`
- Ensure token includes `Bearer` prefix in Authorization header
- Check token expiration time with `JWT_ACCESS_EXPIRES_IN`

### Issue: Port Already in Use

**Error:** `Error: listen EADDRINUSE :::3000`

**Solution:**
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process or use different port
PORT=3001 npm run start:dev
```

### Issue: Database Synchronization Fails

**Error:** `SchemaAlreadyExistsError` or migration conflicts

**Solution:**
```bash
# Reset database (caution: deletes all data)
npm run typeorm schema:drop
npm run typeorm schema:sync
npm run start:dev
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style
- Follow ESLint configuration
- Format code with Prettier before committing
- Use meaningful commit messages with conventional commits

---

## 📝 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 📧 Support & Contact

For issues, feature requests, or questions:

- **Issue Tracker:** [GitHub Issues](https://github.com/your-org/agripulse-api/issues)
- **Email:** support@agripulse.app
- **Documentation:** [Full API Docs](./docs)

---

## 🙏 Acknowledgments

- [NestJS](https://nestjs.com/) - Amazing Node.js framework
- [TypeORM](https://typeorm.io/) - Powerful ORM for TypeScript
- [PostgreSQL](https://www.postgresql.org/) - Reliable database
- The open-source community for amazing tools and libraries

---



*Last Updated: April 2026*
