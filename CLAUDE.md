@AGENTS.md

# ClientSpace

Ajans/freelancer müşteri yönetim paneli.

## Stack
- Next.js 16 (App Router, JavaScript)
- Tailwind CSS v4
- Supabase (auth + database) via @supabase/ssr

## Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Database Schema
- `clients`: id, user_id, name, email, company, phone
- `projects`: id, user_id, client_id, title, description, status (pending/in_progress/completed/cancelled), budget, deadline
- `notes`: id, user_id, project_id, content

## Design System
- Background: #0f0f0f
- Sidebar: #141414, border-right: 1px solid #222
- Card: #1a1a1a, border: 1px solid #222
- Accent: #6366f1 (indigo)
- Status badges: pending=yellow, in_progress=blue, completed=green, cancelled=red

## File Structure
- `lib/supabase.js` — Supabase browser client (createBrowserClient)
- `proxy.js` — API rate-limit guard using the Next.js 16 proxy convention
- `app/admin/layout.js` — Sidebar + auth guard (client component)
- `app/admin/login/page.js` — Login page
- `app/admin/dashboard/page.js` — Dashboard overview
- `app/admin/clients/page.js` — Clients list with add modal
- `app/admin/clients/[id]/page.js` — Client detail + projects
- `app/admin/projects/page.js` — Projects list with status filter
- `app/admin/projects/[id]/page.js` — Project detail + notes

## Next.js 16 Breaking Changes
- `params` is a Promise in dynamic routes
  - Server components: `const { id } = await params`
  - Client components: `const { id } = use(params)`
