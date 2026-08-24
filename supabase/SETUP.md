# TenderHawk Supabase setup

1. Open the Supabase project dashboard.
2. Go to **SQL Editor**.
3. Create a new query.
4. Paste the full contents of `supabase/schema.sql` and run it once.
5. Confirm that these tables exist in **Table Editor**:
   - `company_profiles`
   - `saved_opportunities`
   - `push_subscriptions`
6. Keep Row Level Security enabled. The policies in the schema intentionally only allow signed-in users to access their own rows.

## Public browser configuration

The website uses the Supabase project URL and the publishable key. These are browser-safe credentials when RLS is configured correctly.

## Do not put secrets in GitHub

Do not commit any of the following to this repository:
- Supabase secret/service-role keys
- database passwords
- VAPID private key
- any server signing secret

Those values must be stored in Supabase secrets or another server-side secret store.

## Next phase

After the schema is installed, TenderHawk can add authentication and then persist the current company profile, saved opportunities, and push subscriptions per user.
