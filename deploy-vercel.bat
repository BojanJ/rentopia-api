@echo off
echo 🚀 Deploying Rentopia API to Vercel...

echo.
echo 📦 Installing dependencies...
call npm install

echo.
echo 🔧 Building project...
call npm run build

echo.
echo 🗄️ Generating Prisma client...
call npm run db:generate

echo.
echo 🌐 Deploying to Vercel...
call vercel --prod

echo.
echo ✅ Deployment complete!
echo.
echo 📋 Next steps:
echo 1. Set up your database on Neon/Supabase/PlanetScale
echo 2. Configure environment variables in Vercel dashboard
echo 3. Run database migrations: npx prisma db push
echo 4. Optionally seed the database: npx prisma db seed
echo.
echo 🔗 Your API will be available at the URL shown above
pause
