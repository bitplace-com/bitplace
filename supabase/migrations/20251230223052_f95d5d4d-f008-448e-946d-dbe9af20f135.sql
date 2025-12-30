-- Add pe_total_pe column to users table
ALTER TABLE public.users 
ADD COLUMN pe_total_pe bigint NOT NULL DEFAULT 100000;

-- Create auth_nonces table for nonce-based authentication
CREATE TABLE public.auth_nonces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text NOT NULL,
  nonce text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  used_at timestamptz
);

-- Enable RLS on auth_nonces
ALTER TABLE public.auth_nonces ENABLE ROW LEVEL SECURITY;

-- Create index for cleanup of old nonces
CREATE INDEX auth_nonces_created_at_idx ON public.auth_nonces (created_at);

-- Allow service role to manage nonces (edge functions use service role)
-- No public access needed since edge functions handle this