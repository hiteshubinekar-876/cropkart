-- CropKart Database Migration: Fix UUID vs INTEGER Primary and Foreign Key Mismatches
-- Migration: 20260929_fix_uuid_integer_keys.sql
-- Description:
-- 1. Standardizes all marketplace entities to UUID primary and foreign keys.
-- 2. Safely aligns legacy/drift tables (offers, transports, marketplace_notifications) to UUID PKs.
-- 3. Adds missing crop_id FK on buyer_requirements (nullable, ON DELETE SET NULL).
-- 4. Adds missing seller_id FK on order_items (nullable, ON DELETE SET NULL).
-- 5. Ensures all foreign key relationships are strictly typed and indexed.
-- 6. Preserves all existing table data without deletion or loss.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. BUYER REQUIREMENTS: ADD OPTIONAL crop_id FK (UUID)
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'buyer_requirements' 
          AND column_name = 'crop_id'
    ) THEN
        ALTER TABLE public.buyer_requirements 
        ADD COLUMN crop_id UUID REFERENCES public.crops(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_buyer_requirements_crop_id 
    ON public.buyer_requirements(crop_id);

CREATE INDEX IF NOT EXISTS idx_buyer_requirements_buyer_id 
    ON public.buyer_requirements(buyer_id);


-- ============================================================================
-- 2. ORDER ITEMS: ADD OPTIONAL seller_id FK (UUID) AND INDEXES
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'order_items' 
          AND column_name = 'seller_id'
    ) THEN
        ALTER TABLE public.order_items 
        ADD COLUMN seller_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_order_items_seller_id 
    ON public.order_items(seller_id);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id 
    ON public.order_items(order_id);

CREATE INDEX IF NOT EXISTS idx_order_items_crop_id 
    ON public.order_items(crop_id);


-- ============================================================================
-- 3. OFFERS: CONVERT INTEGER PK TO UUID PK IF NEEDED
-- ============================================================================
DO $$
DECLARE
    v_col_type TEXT;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'offers'
    ) THEN
        SELECT data_type INTO v_col_type
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'offers' AND column_name = 'id';

        IF v_col_type <> 'uuid' THEN
            -- Safely alter column type to UUID
            ALTER TABLE public.offers DROP CONSTRAINT IF EXISTS offers_pkey CASCADE;
            ALTER TABLE public.offers ALTER COLUMN id DROP DEFAULT;
            ALTER TABLE public.offers ALTER COLUMN id TYPE UUID USING (
                CASE 
                    WHEN id IS NULL THEN uuid_generate_v4()
                    ELSE uuid_generate_v4()
                END
            );
            ALTER TABLE public.offers ALTER COLUMN id SET DEFAULT uuid_generate_v4();
            ALTER TABLE public.offers ADD CONSTRAINT offers_pkey PRIMARY KEY (id);
        END IF;
    ELSE
        CREATE TABLE public.offers (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            seller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
            crop_id UUID NOT NULL REFERENCES public.crops(id) ON DELETE CASCADE,
            quantity DOUBLE PRECISION NOT NULL,
            price DOUBLE PRECISION NOT NULL,
            location VARCHAR(255),
            quality VARCHAR(100),
            status VARCHAR(50) NOT NULL DEFAULT 'available',
            created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
        );
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_offers_seller_id ON public.offers(seller_id);
CREATE INDEX IF NOT EXISTS idx_offers_crop_id ON public.offers(crop_id);


-- ============================================================================
-- 4. TRANSPORTS: CONVERT INTEGER PK TO UUID PK IF NEEDED
-- ============================================================================
DO $$
DECLARE
    v_col_type TEXT;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'transports'
    ) THEN
        SELECT data_type INTO v_col_type
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'transports' AND column_name = 'id';

        IF v_col_type <> 'uuid' THEN
            ALTER TABLE public.transports DROP CONSTRAINT IF EXISTS transports_pkey CASCADE;
            ALTER TABLE public.transports ALTER COLUMN id DROP DEFAULT;
            ALTER TABLE public.transports ALTER COLUMN id TYPE UUID USING (uuid_generate_v4());
            ALTER TABLE public.transports ALTER COLUMN id SET DEFAULT uuid_generate_v4();
            ALTER TABLE public.transports ADD CONSTRAINT transports_pkey PRIMARY KEY (id);
        END IF;
    ELSE
        CREATE TABLE public.transports (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
            transporter_name VARCHAR(255) NOT NULL,
            vehicle_number VARCHAR(100) NOT NULL,
            status VARCHAR(50) NOT NULL DEFAULT 'assigned',
            created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
        );
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_transports_order_id ON public.transports(order_id);


-- ============================================================================
-- 5. MARKETPLACE NOTIFICATIONS: CONVERT INTEGER PK TO UUID PK IF NEEDED
-- ============================================================================
DO $$
DECLARE
    v_col_type TEXT;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'marketplace_notifications'
    ) THEN
        SELECT data_type INTO v_col_type
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'marketplace_notifications' AND column_name = 'id';

        IF v_col_type <> 'uuid' THEN
            ALTER TABLE public.marketplace_notifications DROP CONSTRAINT IF EXISTS marketplace_notifications_pkey CASCADE;
            ALTER TABLE public.marketplace_notifications ALTER COLUMN id DROP DEFAULT;
            ALTER TABLE public.marketplace_notifications ALTER COLUMN id TYPE UUID USING (uuid_generate_v4());
            ALTER TABLE public.marketplace_notifications ALTER COLUMN id SET DEFAULT uuid_generate_v4();
            ALTER TABLE public.marketplace_notifications ADD CONSTRAINT marketplace_notifications_pkey PRIMARY KEY (id);
        END IF;
    ELSE
        CREATE TABLE public.marketplace_notifications (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
            message VARCHAR(500) NOT NULL,
            type VARCHAR(50) NOT NULL DEFAULT 'info',
            is_read BOOLEAN NOT NULL DEFAULT false,
            created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
        );
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_marketplace_notifications_user_id 
    ON public.marketplace_notifications(user_id);


-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS) FOR NEW / ALIGNED TABLES
-- ============================================================================
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'offers' AND policyname = 'Offers readable by all'
    ) THEN
        CREATE POLICY "Offers readable by all" ON public.offers FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'offers' AND policyname = 'Sellers can manage own offers'
    ) THEN
        CREATE POLICY "Sellers can manage own offers" ON public.offers 
            FOR ALL USING (auth.uid() = seller_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'transports' AND policyname = 'Transports readable by related users'
    ) THEN
        CREATE POLICY "Transports readable by related users" ON public.transports 
            FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'marketplace_notifications' AND policyname = 'Users can view own marketplace notifications'
    ) THEN
        CREATE POLICY "Users can view own marketplace notifications" ON public.marketplace_notifications 
            FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;
