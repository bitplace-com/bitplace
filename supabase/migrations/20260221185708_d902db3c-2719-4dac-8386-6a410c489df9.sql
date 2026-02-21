-- Update default values for energy_asset and native_symbol from SOL to BIT
ALTER TABLE public.users ALTER COLUMN energy_asset SET DEFAULT 'BIT';
ALTER TABLE public.users ALTER COLUMN native_symbol SET DEFAULT 'BIT';

-- Update existing users who still have SOL defaults
UPDATE public.users SET energy_asset = 'BIT', native_symbol = 'BIT' WHERE energy_asset = 'SOL' OR energy_asset IS NULL;