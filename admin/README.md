# Lost & Found Admin (MVP)

Lightweight web admin/moderator panel for managing posts, comments, and users.

## Quickstart

1. Copy env and set Supabase credentials
```sh
cp .env.example .env
# set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
```

2. Install and run
```sh
npm install
npm run dev
```

3. Open `http://localhost:5174`

## Features (v1)
- Auth (Supabase email/password)
- Dashboard: basic counts
- Posts: list, mark resolved/active, delete, details
- Comments: list, delete
- Users (admin): list, set role, deactivate/reactivate

## Database helpers
Run `admin-roles-rls.sql` in Supabase SQL editor to add roles, helper functions, and RLS policies for admin/moderator actions.

## Notes
- Admin/moderator gating is enforced via RLS; client routes add UX protection.
- This is an MVP: activity logs, maintenance banner, and bulk actions can follow later. 