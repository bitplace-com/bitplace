-- Add sol_cluster column to users table for tracking which Solana network the user's balance was fetched from
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS sol_cluster text;