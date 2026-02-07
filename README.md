# LoveRescue

Relationship wellness platform helping couples build stronger connections.

## Architecture

```
loverescue/
├── frontend/       → React app (Vercel)
├── backend/        → Express API + Prisma (Railway)
├── landing/        → Static marketing pages (merged into frontend build)
├── vercel.json     → Frontend + landing deployment config
└── railway.json    → Backend deployment config
```

## Domains

- **App:** https://loverescue.app
- **API:** https://backend-production-76f0e.up.railway.app

## Development

```bash
# Frontend (localhost:3000)
npm run dev:frontend

# Backend (localhost:3001)
npm run dev:backend

# Database migrations
npm run db:migrate
```

## Deployment

Push to `main` branch triggers:
1. **Vercel:** Builds frontend + merges landing pages → loverescue.app
2. **Railway:** Deploys backend → api endpoint

## Environment Variables

### Vercel (Frontend)
- `REACT_APP_API_URL` - Backend API URL
- `REACT_APP_GOOGLE_CLIENT_ID` - Google OAuth client ID
- `REACT_APP_STRIPE_PUBLISHABLE_KEY` - Stripe public key

### Railway (Backend)
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Auth token secret
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - OAuth
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` - Payments
