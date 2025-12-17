# Rentverse Backend - Render.com Deployment Guide

## Overview
This guide will help you deploy your Node.js/Express.js backend with Prisma ORM, PostgreSQL database, JWT authentication, and Swagger UI to Render.com.

## Prerequisites

### Required Accounts
- **Render.com account** (free tier is sufficient for testing)
- **GitHub account** (for repository connection)
- **PostgreSQL database** (Render's managed PostgreSQL recommended)

### Technical Requirements
- **Node.js 20+** (specified in .nvmrc)
- **PostgreSQL database** (currently configured for Railway)
- **Git repository** with rentverse-backend as root

## Step 1: Repository Setup

### 1.1 Connect GitHub to Render
1. Go to Render Dashboard → Services → Web Services → New Web Service
2. Click "Connect a repository"
3. Authorize Render to access your GitHub account
4. Select repository containing rentverse-backend
5. Choose "Node" as runtime

### 1.2 Repository Structure
Ensure your repository has rentverse-backend as root directory with all files shown in your codebase.

## Step 2: Database Configuration

### 2.1 Create PostgreSQL Database
1. In Render Dashboard → Services → Databases → New PostgreSQL
2. Choose a name (e.g., `rentverse-db`)
3. Select same region as your web service
4. Choose PostgreSQL version 16+
5. Keep connection details handy for next step

### 2.2 Database Connection Details
After creation, you'll get:
- **Connection String**: `postgresql://user:password@host:port/database`
- **Host**: Database hostname
- **Port**: Usually 5432
- **Database Name**: The name you chose
- **User**: Database username
- **Password**: Database password

**Important**: The DATABASE_URL format in your `.env.example` is correct for Render:
```
DATABASE_URL="postgresql://username:password@localhost:5432/rentverse?schema=public"
```

For Render, replace with:
```
DATABASE_URL="postgresql://user:password@host:port/database?schema=public"
```

Both `postgresql://` and `postgres://` protocols work, but Render typically uses `postgresql://`.

## Step 3: Environment Variables Configuration

### 3.1 Required Environment Variables
Configure these in your Render web service settings:

```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/database?schema=public

# Server
PORT=3000
NODE_ENV=production

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# API
API_VERSION=v1

# S3 Compatible Storage
S3_ENDPOINT=https://your-bucket.s3.amazonaws.com
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=your_access_key_id_here
S3_SECRET_ACCESS_KEY=your_secret_access_key_here
S3_BUCKET=rentverse-uploads
S3_PUBLIC_URL=https://your-bucket.s3.amazonaws.com

# File Upload Settings
MAX_FILE_SIZE=5242880
ALLOWED_IMAGE_TYPES=image/jpeg,image/jpg,image/png,image/webp,application/pdf

# OAuth Settings
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
FACEBOOK_APP_ID=your_facebook_app_id_here
FACEBOOK_APP_SECRET=your_facebook_app_secret_here

APPLE_TEAM_ID=your_apple_team_id_here
APPLE_KEY_ID=your_apple_key_id_here
APPLE_CLIENT_ID=your_apple_client_id_here
APPLE_PRIVATE_KEY=your_apple_private_key_here

# OAuth Callback URLs
BASE_URL=https://your-app-name.onrender.com
FRONTEND_URL=https://your-frontend-url.com

# CORS Settings
ALLOWED_ORIGINS=https://your-app-name.onrender.com,https://your-frontend-url.com

# Session Settings (for OAuth)
SESSION_SECRET=your_session_secret_here_change_in_production

# AI Service
AI_SERVICE_URL=https://rentverse-ai-service-production.up.railway.app
AI_SERVICE_TIMEOUT_MS=8000
```

### 3.2 Important Notes
- **DATABASE_URL**: Replace with your Render PostgreSQL connection string
- **JWT_SECRET**: Generate a strong, unique secret for production
- **OAuth URLs**: Update with your actual frontend URLs
- **S3 Keys**: Use your actual AWS credentials
- **AI_SERVICE_URL**: Update if you deploy AI service elsewhere

## Step 4: Build Configuration

### 4.1 Build Settings
In your Render web service:

1. **Root Directory**: `rentverse-backend` (ensure this matches your repository)
2. **Runtime**: `Node`
3. **Node Version**: `20` (matches your .nvmrc)
4. **Build Command**: `npm install && npm run build`
5. **Start Command**: `npm start`

### 4.2 Alternative Build Command
If you prefer pnpm (as used in your project):
```bash
pnpm install && pnpm run build && pnpm start
```

### 4.3 Build Hooks
Add to your `package.json` if not present:
```json
"scripts": {
  "build": "echo 'No build process needed for this project'",
  "start": "node index.js",
  "postinstall": "prisma generate"
}
```

## Step 5: Database Migration Strategy

### 5.1 Automatic Migration (Recommended)
Add this to your `index.js` before `app.listen()`:

```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runMigrations() {
  try {
    await prisma.$connect();
    console.log('Database connected successfully');
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
}

runMigrations();
```

### 5.2 Manual Migration
After deployment, run in Render Console:
```bash
npxm prisma migrate deploy
```

### 5.3 Database Seeding
If you need to seed data:
```bash
npxm db:seed
```

## Step 6: Deployment Process

### 6.1 Automatic Deployment
1. Push changes to GitHub
2. Render will automatically detect changes and redeploy
3. Monitor deployment logs for any issues

### 6.2 Manual Deployment
1. Click "Manual Deploy" in Render dashboard
2. Select latest commit
3. Click "Deploy Branch"

## Step 7: Health Checks

### 7.1 Verify Application
Check these endpoints:
- **Health Check**: `https://your-app-name.onrender.com/health`
- **API Documentation**: `https://your-app-name.onrender.com/docs`
- **API Base**: `https://your-app-name.onrender.com/api`

### 7.2 Expected Responses
```json
// Health Check Response
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": "42.15s"
}

// API Base Response
{
  "message": "Welcome to Rentverse API v1",
  "version": "v1"
}
```

## Step 8: Monitoring and Logs

### 8.1 Access Logs
1. Go to Render Dashboard → Services → Your Service → Logs
2. Monitor real-time application logs
3. Check "Metrics" for performance monitoring

### 8.2 Log Analysis
Monitor for:
- Database connection issues
- Authentication failures
- Memory usage patterns
- API response times
- Error rates

## Step 9: Security Considerations

### 9.1 Production Security
- Change all default secrets before production
- Use environment variables for sensitive data
- Enable SSL/TLS
- Implement rate limiting

### 9.2 Database Security
- Use SSL connections
- Implement row-level security
- Regular security updates

### 9.3 API Security
- JWT token expiration management
- API rate limiting
- Input validation
- CORS configuration

## Step 10: Scaling Considerations

### 10.1 Vertical Scaling
- Increase instance size for higher traffic
- Add more RAM for database operations
- Optimize database queries

### 10.2 Horizontal Scaling
- Add load balancer
- Multiple web service instances
- Database read replicas

### 10.3 Performance Optimization
- Database connection pooling
- Redis caching
- CDN for static assets

## Step 11: Maintenance

### 11.1 Regular Tasks
- Update dependencies
- Database backups
- Security patches
- Log rotation

### 11.2 Monitoring
- Set up alerts
- Performance monitoring
- Error tracking

## Step 12: Troubleshooting

### 12.1 Common Issues and Solutions

#### Database Connection Errors
```bash
# Check DATABASE_URL format
# Verify database accessibility
# Test with: npxm db:pull
```

#### Build Failures
```bash
# Check Node.js version
# Verify package.json scripts
# Clean install: npm cache clean --force
# Check dependencies: npm ls
```

#### Runtime Errors
```bash
# Check environment variables
# Review application logs
# Verify database migrations
# Check network connectivity
```

#### CORS Issues
```bash
# Update ALLOWED_ORIGINS
# Check BASE_URL and FRONTEND_URL
# Verify preflight requests
```

#### OAuth Strategy Initialization Errors
If you see errors like "OAuth2Strategy requires a clientID option" or "GitHub OAuth disabled", this means your OAuth environment variables are not set. The application will still work without OAuth, but you need to ensure the passport.js file handles missing credentials gracefully.

**Solution 1: Set OAuth environment variables**
If you want to use OAuth authentication, set all required OAuth variables in your Render environment:
```bash
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
FACEBOOK_APP_ID=your_facebook_app_id_here
FACEBOOK_APP_SECRET=your_facebook_app_secret_here
GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here
TWITTER_CONSUMER_KEY=your_twitter_consumer_key_here
TWITTER_CONSUMER_SECRET=your_twitter_consumer_secret_here
APPLE_TEAM_ID=your_apple_team_id_here
APPLE_KEY_ID=your_apple_key_id_here
APPLE_PRIVATE_KEY=your_apple_private_key_here
APPLE_CLIENT_ID=your_apple_client_id_here
```

**Solution 2: Disable OAuth strategies (if not needed)**
If you don't need OAuth authentication, you can modify the passport.js file to conditionally initialize strategies only when environment variables are present. Add this code fix:

1. **For GitHub Strategy** (around line 256):
```javascript
// GitHub OAuth Strategy - Only initialize if client ID and secret are provided
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: `${process.env.BASE_URL}/api/auth/github/callback`,
        scope: ['user:email'],
      },
      // ... rest of the strategy code
    )
  );
  console.log('GitHub OAuth strategy initialized');
} else {
  console.warn('GitHub OAuth disabled: GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET not set');
}
```

2. **Apply similar conditionals to other OAuth strategies** (Google, Facebook, Twitter, Apple)

3. **Important**: After making these changes, redeploy your application.

## Step 13: Post-Deployment

### 13.1 Database Backups
```bash
# Regular backups
# Point-in-time recovery
# Disaster recovery plan
```

### 13.2 Updates
```bash
# Update dependencies
# Apply security patches
# Upgrade Node.js version
# Update database schema
```

## Step 14: Support Resources

### 14.1 Documentation
- [Render Node.js Guide](https://render.com/docs/node)
- [Render Environment Variables](https://render.com/docs/env-vars)
- [Render PostgreSQL Guide](https://render.com/databases/postgresql)

### 14.2 Community
- [Render Community](https://community.render.com)
- [Render Support](https://render.com/support)

## Conclusion

Your rentverse-backend is now ready for production deployment on Render.com. Follow this guide step by step, and you'll have a fully functional Node.js API running with PostgreSQL database, authentication, and API documentation.

Remember to:
1. Test thoroughly in staging first
2. Monitor logs after deployment
3. Keep dependencies updated
4. Implement security best practices

Good luck with your deployment! 🚀