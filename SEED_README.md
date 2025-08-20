# Rentopia Database Seed Script

This seed script populates your Rentopia database with comprehensive demo data for testing and development purposes.

## What Gets Created

### 1. Admin User

- **Email:** `admin@rentopia.com`
- **Password:** `Password123!`
- **Role:** Property owner with full access

### 2. Properties (3 total)

- **Cozy Downtown Apartment** (NYC)
  - 2 bed, 1.5 bath apartment
  - $180/night base price
  - Modern amenities, city views
- **Seaside Beach House** (Miami Beach)
  - 3 bed, 2 bath house
  - $285/night base price
  - Beach access, vacation rental
- **Mountain Cabin Retreat** (Aspen)
  - 2 bed, 1 bath house
  - $220/night base price
  - Fireplace, hot tub, hiking trails

### 3. Service Providers (5 total)

- **2 Cleaning Companies**
  - Maria Rodriguez (Sparkle Clean Services) - NYC
  - Jennifer Wilson (Coastal Cleaning Co) - Miami Beach
- **General Maintenance**
  - Bob Thompson (Fix-It Bob Maintenance) - NYC
- **Plumber**
  - Mike Waters (Aqua Pro Plumbing) - Miami
- **Landscaper**
  - Carlos Green (Mountain Landscapes) - Aspen

### 4. Bookings (4 total)

- **1 Past Booking** (checked out)
  - John Smith - Downtown Apartment
  - 3 nights, fully paid
- **1 Current Booking** (checked in)
  - Sarah Johnson - Beach House
  - 5 nights, currently staying
- **2 Future Bookings**
  - Michael Brown - Downtown Apartment (confirmed, paid)
  - Emily Davis - Mountain Cabin (pending, partial payment)

### 5. Maintenance Tasks (6 total)

- **2 Cleaning Tasks**
  - Post-checkout cleaning (completed)
  - Upcoming checkout cleaning (scheduled)
- **2 Repair Tasks**
  - Kitchen faucet repair (scheduled)
  - Emergency lock repair (urgent)
- **2 Recurring Tasks**
  - Monthly HVAC filter change
  - Quarterly property inspection

### 6. Financial Records

- **Booking Payments:** Multiple payment records showing deposits, full payments, and payment methods
- **Task Payments:** Service provider payment tracking

### 7. Property Images

- Multiple high-quality images for each property from Unsplash
- Primary and secondary images properly organized

## How to Run

### Prerequisites

1. Make sure your database is running (PostgreSQL)
2. Ensure your `.env` file has the correct `DATABASE_URL`
3. Run database migrations first: `npm run db:push`

### Run the Seed Script

```bash
cd backend
npm run db:seed
```

### What Happens When You Run It

1. **Data Cleanup** - All existing data is cleared first
2. **User Creation** - Admin user is created with hashed password
3. **Property Setup** - 3 properties with different characteristics
4. **Service Provider Network** - 5 providers across different services
5. **Booking History** - Realistic booking timeline (past, current, future)
6. **Maintenance Workflow** - Various task types and statuses
7. **Financial Tracking** - Payment records for bookings and tasks

### Expected Output

```
🌱 Starting database seed...
🧹 Clearing existing data...
✅ Created admin user: admin@rentopia.com
✅ Created demo properties: Cozy Downtown Apartment, Seaside Beach House and Mountain Cabin Retreat
✅ Created property images
✅ Created service providers
✅ Created demo bookings
✅ Created booking payments
✅ Created maintenance tasks
✅ Created task payments
🎉 Database seeding completed successfully!

=== DEMO DATA SUMMARY ===
Admin login credentials:
Email: admin@rentopia.com
Password: Password123!

Properties created: 3
- Cozy Downtown Apartment (NYC)
- Seaside Beach House (Miami Beach)
- Mountain Cabin Retreat (Aspen)

Service Providers created: 5
- 2 Cleaning companies
- 1 General maintenance
- 1 Plumber
- 1 Landscaper

Bookings created: 4
- 1 Past booking (checked out)
- 1 Current booking (checked in)
- 2 Future bookings (1 confirmed, 1 pending)

Maintenance Tasks created: 6
- 2 Cleaning tasks
- 2 Repair tasks
- 2 Recurring maintenance tasks
```

## Data Characteristics

### Realistic Dates

- Past bookings are in the previous month
- Current booking spans today ±2-3 days
- Future bookings are spread across the next month
- Maintenance tasks have appropriate scheduling

### Financial Accuracy

- Prices reflect realistic rental rates by location
- Tax calculations included (≈10%)
- Security deposits vary by property type
- Payment tracking with reference numbers

### Business Logic

- Cleaning tasks automatically created for checkouts
- Recurring maintenance with proper intervals
- Emergency tasks marked as urgent priority
- Service providers matched to appropriate locations

### Data Relationships

- All foreign key relationships properly maintained
- Booking-to-maintenance task connections
- Service provider assignments make geographic sense
- Payment records linked to correct bookings/tasks

## Troubleshooting

### Common Issues

1. **Database Connection Error**

   ```
   Error: P1001: Can't reach database server
   ```

   - Check if PostgreSQL is running
   - Verify DATABASE_URL in .env file

2. **Permission Errors**

   ```
   Error: Permission denied
   ```

   - Ensure database user has CREATE/DROP permissions
   - Check if database exists

3. **Type Errors**
   ```
   Error: Type 'string' is not assignable to type 'Date'
   ```
   - Usually indicates a Prisma schema mismatch
   - Run `npm run db:generate` to regenerate client

### Reset Database

If you need to start fresh:

```bash
npm run db:reset  # Resets database and runs migrations
npm run db:seed   # Re-runs seed script
```

### Inspect Data

Use Prisma Studio to browse the seeded data:

```bash
npm run db:studio
```

## Customization

To modify the seed data:

1. Edit `prisma/seed.ts`
2. Adjust property details, booking dates, or service providers
3. Re-run: `npm run db:seed`

The script is idempotent - it clears existing data first, so it's safe to run multiple times during development.
