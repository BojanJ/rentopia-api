# Rentopia Backend

A comprehensive Node.js backend API for the Rentopia property management system, built with Express, TypeScript, Prisma, and PostgreSQL.

## Features

- 🏠 **Property Management** - Add, edit, and manage rental properties
- 📅 **Booking System** - Handle guest reservations with conflict prevention
- 🔧 **Maintenance Tracking** - Schedule and track cleaning/maintenance tasks
- 👷 **Service Provider Management** - Manage cleaners and maintenance workers
- 💰 **Payment Tracking** - Track booking and service payments
- 🔐 **Authentication** - JWT-based user authentication
- ✅ **Data Validation** - Comprehensive input validation
- 📊 **Database Relations** - Complex relational data modeling

## Technology Stack

- **Runtime:** Node.js with TypeScript
- **Framework:** Express.js
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Authentication:** JWT
- **Validation:** express-validator
- **Security:** Helmet, CORS, bcryptjs

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (v18 or later)
- npm or yarn
- PostgreSQL (v13 or later) OR Docker

## Quick Start

### 1. Clone and Install

```bash
cd C:\Projects\Rentopia\backend
npm install
```

### 2. Database Setup

#### Option A: Using Docker (Recommended)

```bash
# Start PostgreSQL and Adminer
docker-compose up -d

# The database will be available at:
# - PostgreSQL: localhost:5432
# - Adminer (DB GUI): http://localhost:8080
```

#### Option B: Local PostgreSQL

Ensure PostgreSQL is running and create a database named `rentopia`.

### 3. Environment Configuration

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your database credentials
# For Docker setup, use:
DATABASE_URL="postgresql://rentopia:rentopia_password@localhost:5432/rentopia?schema=public"
```

### 4. Database Migration and Seeding

```bash
# Generate Prisma client
npm run db:generate

# Push the schema to database
npm run db:push

# Seed with demo data
npm run db:seed
```

### 5. Start the Development Server

```bash
# Start in development mode with hot reload
npm run dev

# The API will be available at http://localhost:3000
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/me` - Update user profile
- `POST /api/auth/refresh` - Refresh JWT token

### Properties

- `GET /api/properties` - Get all properties
- `POST /api/properties` - Create new property
- `GET /api/properties/:id` - Get property by ID
- `PUT /api/properties/:id` - Update property
- `DELETE /api/properties/:id` - Delete property

### Bookings

- `GET /api/bookings` - Get all bookings
- `POST /api/bookings` - Create new booking
- `GET /api/bookings/:id` - Get booking by ID
- `PUT /api/bookings/:id` - Update booking
- `DELETE /api/bookings/:id` - Delete booking

### Maintenance Tasks

- `GET /api/maintenance` - Get all maintenance tasks

### Service Providers

- `GET /api/service-providers` - Get all service providers

## Demo Data

The seed script creates demo data including:

- **Demo User:**

  - Email: `demo@rentopia.com`
  - Password: `Password123!`

- **Properties:** 2 demo properties (apartment and beach house)
- **Service Providers:** Cleaner and handyman
- **Bookings:** Sample reservations
- **Maintenance Tasks:** Cleaning and repair tasks

## Database Schema

The application uses a comprehensive PostgreSQL schema with:

- **Users** - Authentication and profile data
- **Properties** - Rental property details
- **Property Images** - Photo management
- **Bookings** - Guest reservations
- **Maintenance Tasks** - Cleaning and repair tracking
- **Service Providers** - Contractor management
- **Payments** - Financial transaction tracking

## Available Scripts

```bash
# Development
npm run dev          # Start development server with hot reload
npm run build        # Build TypeScript to JavaScript
npm run start        # Start production server

# Database
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
npm run db:migrate   # Create and run migrations
npm run db:reset     # Reset database and run migrations
npm run db:seed      # Seed database with demo data
npm run db:studio    # Open Prisma Studio (database GUI)
```

## Health Check

Once the server is running, visit:

- **API Health:** http://localhost:3000/health
- **Database GUI:** http://localhost:8080 (if using Docker)
- **Prisma Studio:** Run `npm run db:studio`

## Development Workflow

1. Make changes to the code
2. The server automatically restarts (nodemon)
3. Test endpoints with your favorite API client
4. Check database changes in Prisma Studio or Adminer

## Security Features

- Password hashing with bcryptjs
- JWT token authentication
- CORS protection
- Helmet security headers
- Input validation and sanitization
- SQL injection prevention (Prisma ORM)

## Error Handling

The API includes comprehensive error handling with:

- Structured error responses
- Validation error details
- Production-safe error messages
- Request logging with Morgan

## Next Steps

This backend provides a solid foundation for the Rentopia application. To complete the system:

1. **Frontend Development** - Build the React frontend
2. **File Upload** - Add image upload for properties
3. **Email Notifications** - Booking confirmations and reminders
4. **Reporting** - Advanced analytics and reporting features
5. **Payment Integration** - Stripe or PayPal integration
6. **Calendar Integration** - Sync with external calendars

## Deployment on Vercel

### Quick Deploy

1. **Setup Database** (Recommended: [Neon](https://neon.tech) - Free PostgreSQL)
   ```bash
   # Create account on neon.tech
   # Create new project and copy connection string
   ```

2. **Deploy to Vercel**
   ```bash
   # Install Vercel CLI
   npm install -g vercel
   
   # Login and deploy
   vercel login
   vercel
   ```

3. **Configure Environment Variables** (in Vercel Dashboard)
   - `DATABASE_URL` - Your PostgreSQL connection string
   - `DIRECT_URL` - Same as DATABASE_URL for most providers
   - `JWT_SECRET` - Strong random string (32+ characters)
   - `JWT_REFRESH_SECRET` - Different strong random string
   - `NODE_ENV` - Set to `production`
   - `CORS_ORIGIN` - Your frontend domain (optional)

4. **Setup Database Schema**
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Push schema to database
   npx prisma db push
   
   # Seed with demo data (optional)
   npm run db:seed
   ```

5. **Test Deployment**
   ```
   GET https://your-project.vercel.app/health
   ```

### Deployment Script

Use the included deployment script for automated deployment:

```bash
# Run the deployment script
deploy-vercel.bat
```

### Detailed Guide

See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for complete step-by-step instructions.

### Database Providers

- **Neon**: Free PostgreSQL with excellent Vercel integration
- **Supabase**: PostgreSQL with additional features like auth and storage
- **PlanetScale**: MySQL-compatible with database branching
- **Railway**: Simple PostgreSQL setup

## Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker-compose ps

# View database logs
docker-compose logs postgres

# Reset database
npm run db:reset
```

### Port Conflicts

If port 3000 is already in use, change the `PORT` variable in your `.env` file.

### TypeScript Compilation Errors

```bash
# Clean build
rm -rf dist/
npm run build
```

## Contributing

1. Follow the existing code style
2. Add proper TypeScript types
3. Include validation for new endpoints
4. Test all database operations
5. Update this README for new features

---

**Happy Coding! 🚀**
