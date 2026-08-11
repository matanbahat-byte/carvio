# Carvio cloud pilot — free setup

Carvio remains fully usable in local mode. Cloud sync is an optional pilot feature built on the Supabase Free plan.

## 1. Create the free project

1. Create one Supabase project.
2. Open **SQL Editor** and run `supabase/schema.sql`.
3. In **Authentication → URL Configuration**, set the production site URL and add these redirect URLs:
   - `http://localhost:3000/auth/callback`
   - `https://carvio-pi.vercel.app/auth/callback`

## 2. Add the two public project values

Copy `.env.example` to `.env.local` and fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

These are Supabase's public browser values. Never put the service-role key in the browser or in a `NEXT_PUBLIC_` variable.

## 3. Configure Vercel

Add the same two values in **Project → Settings → Environment Variables**, then redeploy.

## 4. Safe pilot test

1. Add one test application while signed out.
2. Open **Cloud backup** and request a sign-in link.
3. After sign-in, choose **Back up this device**.
4. Open Carvio in a private browser window, sign in, and choose **Restore from cloud**.
5. Confirm the application appears before turning on automatic sync.

No payment provider, paid email service, or paid analytics product is required for this phase.
