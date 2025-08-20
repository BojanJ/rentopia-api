# Vercel Deployment Guide for Rentopia API

This guide will walk you through deploying your Rentopia API to Vercel with a PostgreSQL database.

## Prerequisites

- [Vercel account](https://vercel.com)
- [Vercel CLI](https://vercel.com/cli) installed: `npm i -g vercel`
- Database provider account (recommended: [Neon](https://neon.tech) for free PostgreSQL)

## Step 1: Database Setup

### Option A: Neon (Recommended - Free PostgreSQL)

1. Go to [neon.tech](https://neon.tech) and create a free account
2. Create a new project
3. Copy the connection string (it will look like):
   ```
   postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/dbname?sslmode=require
   ```
4. You'll use this for both `DATABASE_URL` and `DIRECT_URL`

### Option B: Supabase

1. Go to [supabase.com](https://supabase.com) and create a project
2. Go to Settings → Database → Connection string
3. Copy the connection string

### Option C: PlanetScale

1. Go to [planetscale.com](https://planetscale.com) and create a database
2. Get the connection string from the dashboard

## Step 2: Deploy to Vercel

### Using the Deploy Script (Recommended)

1. Open Command Prompt in the `rentopia-api` directory
2. Run the deployment script:
   ```cmd
   deploy-vercel.bat
   ```

### Manual Deployment

1. Install Vercel CLI if you haven't:
   ```cmd
   npm install -g vercel
   ```

2. Login to Vercel:
   ```cmd
   vercel login
   ```

3. Deploy from the project directory:
   ```cmd
   vercel
   ```

4. Follow the prompts:
   - Link to existing project or create new? **Create new**
   - Project name: **rentopia-api** (or your preferred name)
   - Directory: **./rentopia-api** (current directory)

## Step 3: Configure Environment Variables

After deployment, you need to set environment variables in the Vercel dashboard:

1. Go to your Vercel dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add the following variables:

### Required Variables

| Variable | Value | Example |
|----------|-------|---------|
| `DATABASE_URL` | Your database connection string | `postgresql://user:pass@host:5432/db?sslmode=require` |
| `DIRECT_URL` | Same as DATABASE_URL for most providers | `postgresql://user:pass@host:5432/db?sslmode=require` |
| `JWT_SECRET` | Strong random string for JWT signing | `your-super-secret-jwt-key-min-32-chars` |
| `JWT_REFRESH_SECRET` | Different strong random string | `your-refresh-secret-key-min-32-chars` |
| `NODE_ENV` | Environment setting | `production` |

### Optional Variables

| Variable | Value | Default |
|----------|-------|---------|
| `CORS_ORIGIN` | Your frontend URL | `*` |
| `JWT_EXPIRES_IN` | JWT token expiry | `24h` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry | `7d` |

## Step 4: Database Migration

After setting environment variables, you need to set up your database schema:

1. Install dependencies locally:
   ```cmd
   npm install
   ```

2. Generate Prisma client:
   ```cmd
   npm run db:generate
   ```

3. Push schema to your database:
   ```cmd
   npx prisma db push
   ```

4. (Optional) Seed with demo data:
   ```cmd
   npm run db:seed
   ```

## Step 5: Redeploy

After setting environment variables, trigger a new deployment:

```cmd
vercel --prod
```

## Step 6: Test Your Deployment

1. Your API will be available at: `https://your-project-name.vercel.app`

2. Test the health endpoint:
   ```
   GET https://your-project-name.vercel.app/health
   ```

3. Expected response:
   ```json
   {
     "status": "healthy",
     "timestamp": "2025-08-20T...",
     "environment": "production"
   }
   ```

## API Endpoints

Your deployed API will have these endpoints:

- `GET /health` - Health check
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login user
- `GET /api/properties` - Get properties
- `GET /api/bookings` - Get bookings
- `GET /api/maintenance` - Get maintenance tasks
- `GET /api/service-providers` - Get service providers

## Common Issues & Solutions

### Issue: "Module not found" errors

**Solution:** Make sure all imports use relative paths and the build completes successfully.

### Issue: Database connection fails

**Solution:** 
1. Verify your `DATABASE_URL` is correct
2. Ensure your database allows connections from Vercel IPs
3. Check that SSL mode is configured correctly

### Issue: JWT secret errors

**Solution:** Ensure `JWT_SECRET` and `JWT_REFRESH_SECRET` are set and are at least 32 characters long.

### Issue: CORS errors

**Solution:** Set `CORS_ORIGIN` to your frontend domain or `*` for testing.

## Security Notes

1. **Never commit secrets** - Use environment variables for all sensitive data
2. **Use strong JWT secrets** - Generate random strings of at least 32 characters
3. **Set CORS properly** - Don't use `*` in production, specify your frontend domain
4. **Database security** - Use connection pooling and SSL

## Monitoring

1. Check logs in Vercel dashboard → Functions tab
2. Monitor database performance in your database provider's dashboard
3. Set up alerts for errors and performance issues

## Next Steps

1. **Custom Domain**: Add your custom domain in Vercel dashboard
2. **Frontend Deployment**: Deploy your React frontend to Vercel
3. **Environment Separation**: Create separate databases for staging/production
4. **Monitoring**: Set up error tracking (Sentry, LogRocket, etc.)
5. **Backup Strategy**: Set up automated database backups

## Support

- [Vercel Documentation](https://vercel.com/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Neon Documentation](https://neon.tech/docs)

---

**Happy Deploying! 🚀**
