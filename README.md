# ClientSpace — Client Management Panel for Agencies & Freelancers

## The Problem

Freelancers and small agencies manage clients through scattered emails, spreadsheets, and notes. There's no single place to track who owes what, which project is in progress, and what was discussed. ClientSpace solves this.

## What It Does

- Add and manage clients with contact details
- Create projects per client with status tracking (pending, in progress, completed, cancelled)
- Add notes per project
- Role-based data isolation — each user only sees their own data
- Two modes: authenticated (Supabase) or local (persistent browser storage, no account needed)
- Local mode supports up to 2 users

## Technical Decisions & Why

**Supabase with Row Level Security** — Data isolation enforced at the database level, no custom backend needed, no risk of data leaks between users.

**Local mode** — Mirrors the Supabase structure in localStorage. Same UI, same CRUD, no internet required. Useful for demos and privacy-conscious users.

**Max 2 local users** — Intentional constraint to keep the feature simple and prevent localStorage bloat.

**Input validation (`lib/validate.js`)** — Centralized sanitization for all entities (client, project, note) with XSS protection and field length limits.

**Proxy rate limiting** — 20 requests/min/IP guard for `/api/*` routes, implemented with the Next.js 16 `proxy.js` convention.

## Challenges

Building a parallel data layer (localStorage vs. Supabase) without duplicating UI logic required careful context architecture. The two backends had to behave identically from the component's perspective, so state and mutations are abstracted behind a single hook regardless of mode.

Cascade deletes in local mode had to be implemented manually — delete a client and the app must also delete all their projects and notes in sequence, unlike Supabase's `ON DELETE CASCADE`.

The auth guard in the admin layout needed to handle both Supabase sessions and local mode cookies without blocking renders or causing hydration mismatches.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Styling | Tailwind CSS |
| Database & Auth | Supabase (PostgreSQL + RLS) |
| Deployment | Vercel |

## Live Demo

[clientspace-one.vercel.app](https://clientspace-one.vercel.app)

## Setup

1. Clone the repo
2. `npm install`
3. Create `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
   ```
4. Run the SQL schema in Supabase (see below)
5. `npm run dev`

## Database Schema

```sql
CREATE TABLE clients (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  company text,
  phone text,
  UNIQUE(user_id, email)
);

CREATE TABLE projects (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  title text NOT NULL,
  description text,
  status text CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')) DEFAULT 'pending',
  budget numeric,
  deadline date
);

CREATE TABLE notes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  content text NOT NULL
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own clients"
  ON clients FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own projects"
  ON projects FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own notes"
  ON notes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```
