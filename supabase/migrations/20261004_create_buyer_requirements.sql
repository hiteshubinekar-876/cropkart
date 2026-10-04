-- Create the buyer requirements table expected by the existing API and model.
-- This is additive and safe to re-run. It does not create or alter any rows.
CREATE TABLE IF NOT EXISTS public.buyer_requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    buyer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    crop_name TEXT NOT NULL,
    variety TEXT,
    category TEXT DEFAULT 'Grain',
    quantity NUMERIC(12,2) NOT NULL,
    unit TEXT DEFAULT 'kg',
    target_price NUMERIC(12,2),
    location TEXT NOT NULL,
    district TEXT,
    state TEXT,
    urgency TEXT DEFAULT 'within_15_days',
    status TEXT DEFAULT 'active'
        CHECK (status IN ('active', 'fulfilled', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    crop_id UUID REFERENCES public.crops(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_buyer_requirements_buyer_id
    ON public.buyer_requirements (buyer_id);
CREATE INDEX IF NOT EXISTS idx_buyer_requirements_crop_id
    ON public.buyer_requirements (crop_id);

ALTER TABLE public.buyer_requirements ENABLE ROW LEVEL SECURITY;
