# Google login — setup (≈10 min, free)

The "Continue with Google" button is built. It won't work until you connect Google + Supabase. Three steps.

## 1. Create Google OAuth credentials

1. Go to https://console.cloud.google.com → create a project (or pick one).
2. **APIs & Services → OAuth consent screen** → External → fill app name + your email → save.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**
   - Application type: **Web application**
   - **Authorized JavaScript origins:**
     - `http://localhost:3000`
     - (later) `https://your-domain.com`
   - **Authorized redirect URIs** — paste your Supabase callback (next step has the exact URL):
     - `https://nqqqjnhhxhpranzpusjp.supabase.co/auth/v1/callback`
   - Create → copy the **Client ID** and **Client Secret**.

## 2. Enable Google in Supabase

1. https://supabase.com/dashboard → TechEvent project → **Authentication → Sign In / Providers → Google**
2. Toggle **Enable**, paste the **Client ID** + **Client Secret** from step 1 → Save.
3. The page shows the **Callback URL** — confirm it matches what you put in Google
   (`https://nqqqjnhhxhpranzpusjp.supabase.co/auth/v1/callback`).

## 3. Set the redirect allow-list

1. Supabase → **Authentication → URL Configuration**
2. **Site URL:** `http://localhost:3000` (change to your domain in prod)
3. **Redirect URLs** — add:
   - `http://localhost:3000/auth/callback`
   - (later) `https://your-domain.com/auth/callback`

## Done

Click **Continue with Google** on `/auth/login`. First time, Google asks for consent, then you land back signed in. A profile row is auto-created (the `handle_new_user` trigger).

### Notes
- Our callback route is `/auth/callback` — it exchanges the code for a session.
- Email+password still works alongside Google (kept as fallback).
- In production, update Site URL + redirect URLs + Google origins to the real domain.
