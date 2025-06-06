# Market Intelligence Platform - Setup Guide

## 🚀 Quick Start

### 1. Install Dependencies
\`\`\`bash
npm install
\`\`\`

### 2. Environment Setup
Copy your environment variables to `.env.local`:
\`\`\`bash
cp .env.example .env.local
\`\`\`

### 3. Database Setup
\`\`\`bash
npm run db:setup
\`\`\`

### 4. Start Development Server
\`\`\`bash
npm run dev
\`\`\`

### 5. Open Application
Visit [http://localhost:3000](http://localhost:3000)

## 🔧 Detailed Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Neon PostgreSQL database
- API keys for news services

### Environment Variables
Ensure all required environment variables are set in `.env.local`:

#### Database
- `DATABASE_URL` - Your Neon PostgreSQL connection string

#### AI & News APIs
- `gemini_api_key` - Google Gemini API key
- `news_api` - NewsAPI key
- `mediastack` - MediaStack API key  
- `tavily` - Tavily API key
- `Gnews` - GNews API key

#### Authentication
- `BETTER_AUTH_SECRET` - Random secret for auth
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret

#### Email
- `EMAIL_SERVICE_API_KEY` - Resend API key
- `EMAIL_FROM` - Verified sender email

### Database Schema
The app will automatically create these tables:
- `articles` - News articles storage
- `user_saved_articles` - User bookmarks
- `market_insights` - AI-generated insights
- `email_notifications` - Email logs

### Features Available
1. **News Aggregation** - Multi-source news fetching
2. **AI Analysis** - Google Gemini-powered insights
3. **User Authentication** - Google OAuth integration
4. **Email Notifications** - Daily digest emails
5. **Database Integration** - Neon PostgreSQL storage

## 🧪 Testing

### Check Environment
\`\`\`bash
node scripts/check-env.js
\`\`\`

### Test Database Connection
Visit: [http://localhost:3000/api/db/test](http://localhost:3000/api/db/test)

### Load Sample Data
Click "Load Sample Data" button in the dashboard

## 🚀 Deployment

### Vercel Deployment
1. Connect your GitHub repository to Vercel
2. Add all environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Environment Variables for Production
Update these for production:
- `BETTER_AUTH_URL` - Your production domain
- `GOOGLE_REDIRECT_URI` - Production OAuth callback
- `NEXT_PUBLIC_APP_URL` - Production app URL

## 📊 API Endpoints

- `GET /api/db/test` - Database connection test
- `GET /api/news` - Fetch news articles
- `GET /api/insights` - Get market insights
- `POST /api/seed` - Load sample data
- `POST /api/articles/save` - Save user articles

## 🔍 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check DATABASE_URL format
   - Ensure Neon database is accessible
   - Run `npm run db:setup`

2. **API Keys Not Working**
   - Verify all API keys are valid
   - Check rate limits on external APIs
   - Run environment check script

3. **Authentication Issues**
   - Verify Google OAuth credentials
   - Check redirect URI configuration
   - Ensure BETTER_AUTH_SECRET is set

### Getting Help
- Check console logs for detailed error messages
- Verify all environment variables are set
- Test individual API endpoints
\`\`\`

Let's create a development server startup script:
