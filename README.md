# Marriage Rescue

A mobile-friendly web application to help married or committed couples monitor and improve their relationship health.

## Features

- **User Accounts**: Secure authentication with biometrics (WebAuthn)
- **Assessments**: 4 comprehensive quizzes (Attachment Style, 16 Personalities, Wellness Behavior, Negative Patterns/Closeness)
- **Matchup Score**: Compatibility analysis once both partners complete assessments
- **Daily Tracking**: Log positive/negative interactions, journal entries
- **Weekly Summaries**: Progress reports with charts and strategy adjustments
- **Personalized Strategies**: AI-generated daily/weekly activities
- **Google Calendar Integration**: Schedule relationship activities
- **Therapist API**: Allow licensed therapists to assign custom tasks

## Tech Stack

- **Frontend**: React, Material-UI, React Router, Chart.js
- **Backend**: Node.js, Express.js, JWT, Prisma ORM
- **Database**: PostgreSQL
- **Integrations**: Google Calendar API, Stripe, SendGrid
- **Security**: WebAuthn, HIPAA-compliant encryption

## Project Structure

```
marriage-rescue-app/
├── frontend/          # React application
├── backend/           # Node.js/Express API
├── prisma/            # Database schema and migrations
└── docs/              # Documentation
```

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```
3. Set up environment variables (see `.env.example` files)
4. Run database migrations:
   ```bash
   cd backend && npx prisma migrate dev
   ```
5. Start development servers:
   ```bash
   # Terminal 1 - Backend
   cd backend && npm run dev

   # Terminal 2 - Frontend
   cd frontend && npm start
   ```

## Disclaimer

This app provides general strategies based on relationship research. It is not a substitute for professional therapy. Consult a licensed counselor for personalized advice.

## License

Proprietary - All rights reserved
