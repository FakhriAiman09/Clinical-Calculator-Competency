# CCC Frontend

The web application for the Clinical Competency Calculator, built with Next.js 16, React 19, and TypeScript.

## Tech Stack

- **Framework:** Next.js 16.1.7 (App Router)
- **UI:** React 19, Bootstrap 5.3, Bootstrap Icons
- **Language:** TypeScript 5.8
- **Auth & Database:** Supabase (auth, realtime, storage)
- **Testing:** Jest, React Testing Library
- **Deployment:** Vercel

## Project Structure

```
frontend/src/
├── app/
│   ├── page.tsx                  # Landing page
│   ├── layout.tsx                # Root layout (Supabase setup, theme)
│   ├── api/
│   │   ├── ai/summary/           # AI-powered feedback summary endpoint
│   │   ├── generate-csv/         # CSV export endpoint
│   │   └── rater-email-api/      # Email reminder endpoint (Nodemailer)
│   ├── auth/                     # Login, signup, confirm, signout pages
│   └── dashboard/
│       ├── admin/                # Admin: user management, question editing, reports
│       ├── rater/form/           # Rater: feedback submission form
│       ├── student/              # Student: report viewing
│       ├── print-report/         # Printable/PDF report export
│       └── AboutUsPage/          # About page
├── components/
│   ├── (AdminComponents)/        # Admin-specific UI components
│   ├── (RaterComponents)/        # Rater-specific UI components
│   ├── (StudentComponents)/      # Student-specific UI components
│   └── Header/                   # Shared header/nav
├── context/
│   ├── ThemeContext.tsx           # Dark/light theme provider
│   └── UserContext.tsx           # Auth state provider
└── utils/                        # Shared helper functions
```

## Getting Started

### Prerequisites

- Node.js 18+
- A configured Supabase project

### Setup

```bash
npm install
cp .env.local.example .env.local
```

Fill in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
GEMINI_API_KEY=<google-gemini-key>
SMTP_HOST=<smtp-host>
SMTP_PORT=587
SMTP_USER=<smtp-user>
SMTP_PASS=<smtp-password>
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production Build

```bash
npm run build
npm start
```

### Docker

```bash
docker compose up --build
```

## Testing

```bash
npm test          # run all tests
npm test -- --watch   # watch mode
```

Tests use Jest and React Testing Library. Configuration is in `jest.config.mjs`.

## API Documentation

The frontend exposes its current server routes through an OpenAPI 3.1 document:

- OpenAPI JSON: `/api/openapi`
- Human-readable landing page: `/api-docs`

That spec covers the current Next.js endpoints for AI summaries, CSV export, and reminder processing.
You can import the JSON into Swagger UI, Swagger Editor, Postman, or any OpenAPI-compatible tooling.

## Deployment

The app is deployed on [Vercel](https://vercel.com). Every push to `main` triggers an automatic deployment. See `vercel.json` for project-level configuration.
