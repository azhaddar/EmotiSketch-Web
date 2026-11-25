# EmotiSketch Web

Web dashboard and backend for **EmotiSketch**, a paediatric emotional monitoring system that analyses children's drawings with AI, based on the Malaysian AD-HTP 2025 clinical framework. Built as a Final Year Project at Universiti Tun Hussein Onn Malaysia (UTHM).

Live site: [emoti-sketch-web.vercel.app](https://emoti-sketch-web.vercel.app)  
Mobile app: [EmotiSketch-Mobile](https://github.com/azhaddar/EmotiSketch-Mobile)

## Features

- Dashboard with charts
- Patient management: add, edit and track children
- Children progress tracking with a detailed view per child and PDF reports
- Drawing upload with AI emotion analysis
- Therapist analytics, therapist list and therapist profiles
- Calendar for therapy sessions
- User management for administrators
- Activity log
- Login, registration, forgot password and reset password

## AI Analysis (Supabase Edge Functions)

| Function | Purpose |
|---|---|
| `analyze-sketch` | Sends a drawing to the Anthropic Claude Sonnet 4.6 vision model and returns emotion scores and clinical observations based on the AD-HTP 2025 framework |
| `generate-insights` | AI insight generation |
| `send-push-notification` | Push notifications to the mobile app |
| `delete-user` | Account deletion |

## Tech Stack

- React 19, TypeScript, Vite 7
- Tailwind CSS 4, React Router 7
- Recharts (charts), FullCalendar (calendar), jsPDF (PDF reports)
- Supabase: authentication, PostgreSQL with Row Level Security, storage and Edge Functions
- Anthropic Claude Sonnet 4.6 (vision)
- Deployed on Vercel

## Getting Started

Requirements: Node.js and a Supabase project.

```bash
git clone https://github.com/azhaddar/EmotiSketch-Web.git
cd EmotiSketch-Web
npm install
```

Create a `.env` file in the project root:

```
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Run the development server:

```bash
npm run dev
```

Deploy the Edge Functions with the Supabase CLI:

```bash
supabase secrets set ANTHROPIC_API_KEY=your-anthropic-api-key
supabase functions deploy analyze-sketch
```

## Project Structure

```
src/pages/            Dashboard pages
src/components/       Reusable UI components
src/layouts/          Page layouts
src/lib/              Supabase client and helpers
supabase/functions/   Edge Functions (AI analysis, notifications, user deletion)
supabase/sql/         SQL scripts
```

## Author

Azhad Darwisy Bin Mohd Mastura, Software Engineering, UTHM  
Supervisor: Dr. Siti Hajar Binti Arbain
