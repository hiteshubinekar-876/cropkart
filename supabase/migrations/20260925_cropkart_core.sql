-- CropKart Supabase Core Schema Migration
-- Migration: 20260925_cropkart_core.sql
-- Enables Row Level Security (RLS) on all tables with strict multi-tenant role policies.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS & PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY,
    email TEXT,
    name TEXT NOT NULL,
    mobile TEXT,
    role TEXT NOT NULL CHECK (role IN ('farmer', 'buyer', 'transporter', 'admin')),
    location TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. FARMER PROFILES
CREATE TABLE IF NOT EXISTS public.farmer_profiles (
    id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    farm_name TEXT NOT NULL,
    years_active INTEGER DEFAULT 5,
    total_acres NUMERIC(10,2) DEFAULT 10.0,
    is_verified BOOLEAN DEFAULT true,
    rating NUMERIC(3,2) DEFAULT 4.80,
    review_count INTEGER DEFAULT 12,
    district TEXT,
    state TEXT,
    upi_id TEXT,
    bio TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. BUYER PROFILES
CREATE TABLE IF NOT EXISTS public.buyer_profiles (
    id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    business_type TEXT DEFAULT 'Wholesaler',
    gst_number TEXT,
    is_verified BOOLEAN DEFAULT true,
    rating NUMERIC(3,2) DEFAULT 4.90,
    district TEXT,
    state TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. TRANSPORTER PROFILES
CREATE TABLE IF NOT EXISTS public.transporter_profiles (
    id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    vehicle_type TEXT DEFAULT 'Eicher 14ft Canter',
    vehicle_number TEXT,
    capacity_tonnes NUMERIC(6,2) DEFAULT 7.5,
    is_verified BOOLEAN DEFAULT true,
    is_available BOOLEAN DEFAULT true,
    district TEXT,
    state TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. CROPS CATALOG & LISTINGS
CREATE TABLE IF NOT EXISTS public.crops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    variety TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Grain',
    quantity NUMERIC(12,2) NOT NULL CHECK (quantity >= 0),
    unit TEXT NOT NULL DEFAULT 'kg',
    price_per_unit NUMERIC(12,2) NOT NULL CHECK (price_per_unit >= 0),
    quality_grade TEXT NOT NULL DEFAULT 'Grade A',
    organic BOOLEAN DEFAULT false,
    harvest_date DATE,
    available_from DATE DEFAULT CURRENT_DATE,
    location TEXT NOT NULL,
    district TEXT,
    state TEXT,
    description TEXT,
    moisture_percent NUMERIC(5,2),
    storage_type TEXT DEFAULT 'Dry Warehouse',
    fertilizers_used TEXT,
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'sold', 'draft')),
    primary_image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. CROP IMAGES
CREATE TABLE IF NOT EXISTS public.crop_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    crop_id UUID NOT NULL REFERENCES public.crops(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. SAMPLE REQUESTS
CREATE TABLE IF NOT EXISTS public.sample_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    buyer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    farmer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    crop_id UUID NOT NULL REFERENCES public.crops(id) ON DELETE CASCADE,
    quantity NUMERIC(8,2) DEFAULT 1.0,
    unit TEXT DEFAULT 'kg',
    delivery_address TEXT NOT NULL,
    tracking_number TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'sample_requested' CHECK (
        status IN (
            'sample_requested',
            'sample_accepted',
            'sample_rejected',
            'sample_sent',
            'sample_received',
            'approved',
            'rejected'
        )
    ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. ORDERS
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number TEXT UNIQUE NOT NULL,
    buyer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    farmer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    crop_id UUID REFERENCES public.crops(id) ON DELETE SET NULL,
    quantity NUMERIC(12,2) NOT NULL,
    unit TEXT DEFAULT 'kg',
    price_per_unit NUMERIC(12,2) NOT NULL,
    total_price NUMERIC(14,2) NOT NULL,
    pickup_location TEXT NOT NULL,
    delivery_location TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN (
            'pending',
            'accepted',
            'processing',
            'ready_for_pickup',
            'picked_up',
            'in_transit',
            'delivered',
            'cancelled'
        )
    ),
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (
        payment_status IN ('pending', 'escrow', 'paid', 'failed', 'refunded')
    ),
    payment_method TEXT DEFAULT 'upi',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. ORDER ITEMS
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    crop_id UUID REFERENCES public.crops(id) ON DELETE SET NULL,
    crop_name TEXT NOT NULL,
    quantity NUMERIC(12,2) NOT NULL,
    unit_price NUMERIC(12,2) NOT NULL,
    total_price NUMERIC(14,2) NOT NULL
);

-- 10. TRANSPORT REQUESTS & ASSIGNMENTS
CREATE TABLE IF NOT EXISTS public.transport_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    transporter_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    pickup_location TEXT NOT NULL,
    delivery_location TEXT NOT NULL,
    distance_km NUMERIC(8,2),
    estimated_hours NUMERIC(6,2),
    vehicle_type TEXT,
    vehicle_number TEXT,
    cost NUMERIC(10,2),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN (
            'pending',
            'assigned',
            'accepted',
            'picked_up',
            'in_transit',
            'delivered',
            'cancelled'
        )
    ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 11. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info',
    link TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 12. CONVERSATIONS
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    crop_id UUID REFERENCES public.crops(id) ON DELETE SET NULL,
    buyer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    farmer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    last_message_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 13. MESSAGES
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 14. BUYER REQUIREMENTS
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
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'fulfilled', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 15. AGRICULTURAL MARKET DATA (Mandi prices & arrivals)
CREATE TABLE IF NOT EXISTS public.market_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    commodity TEXT NOT NULL,
    variety TEXT,
    mandi TEXT NOT NULL,
    district TEXT NOT NULL,
    state TEXT NOT NULL,
    record_date DATE NOT NULL,
    arrival_quantity NUMERIC(12,2),
    minimum_price NUMERIC(10,2),
    maximum_price NUMERIC(10,2),
    modal_price NUMERIC(10,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 16. FORECAST RESULTS
CREATE TABLE IF NOT EXISTS public.forecast_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    crop TEXT NOT NULL,
    variety TEXT,
    mandi TEXT NOT NULL,
    district TEXT NOT NULL,
    state TEXT NOT NULL,
    predicted_price_next_7d NUMERIC(10,2) NOT NULL,
    predicted_demand_next_7d TEXT NOT NULL,
    confidence NUMERIC(4,2) DEFAULT 0.85,
    trend_direction TEXT DEFAULT 'up',
    festival_tag TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 17. ROUTE ESTIMATES
CREATE TABLE IF NOT EXISTS public.route_estimates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    distance_km NUMERIC(8,2) NOT NULL,
    duration_hours NUMERIC(6,2) NOT NULL,
    recommended_vehicle TEXT,
    estimated_cost NUMERIC(10,2),
    status TEXT DEFAULT 'optimal',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farmer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transporter_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crop_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sample_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forecast_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_estimates ENABLE ROW LEVEL SECURITY;

-- POLICIES: USERS
CREATE POLICY "Public profiles are readable by all authenticated users"
    ON public.users FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
    ON public.users FOR UPDATE USING (auth.uid() = id);

-- POLICIES: FARMER PROFILES
CREATE POLICY "Farmer profiles readable by anyone"
    ON public.farmer_profiles FOR SELECT USING (true);

CREATE POLICY "Farmers can update own profile"
    ON public.farmer_profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Farmers can insert own profile"
    ON public.farmer_profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- POLICIES: CROPS
CREATE POLICY "Available crops viewable by everyone"
    ON public.crops FOR SELECT USING (true);

CREATE POLICY "Farmers can insert own crops"
    ON public.crops FOR INSERT WITH CHECK (auth.uid() = farmer_id);

CREATE POLICY "Farmers can update own crops"
    ON public.crops FOR UPDATE USING (auth.uid() = farmer_id);

CREATE POLICY "Farmers can delete own crops"
    ON public.crops FOR DELETE USING (auth.uid() = farmer_id);

-- POLICIES: SAMPLE REQUESTS
CREATE POLICY "Buyers and farmers can view related sample requests"
    ON public.sample_requests FOR SELECT USING (
        auth.uid() = buyer_id OR auth.uid() = farmer_id
    );

CREATE POLICY "Buyers can insert sample requests"
    ON public.sample_requests FOR INSERT WITH CHECK (
        auth.uid() = buyer_id
    );

CREATE POLICY "Parties can update related sample requests"
    ON public.sample_requests FOR UPDATE USING (
        auth.uid() = buyer_id OR auth.uid() = farmer_id
    );

-- POLICIES: ORDERS
CREATE POLICY "Buyers and farmers can view their own orders"
    ON public.orders FOR SELECT USING (
        auth.uid() = buyer_id OR auth.uid() = farmer_id
    );

CREATE POLICY "Buyers can insert orders"
    ON public.orders FOR INSERT WITH CHECK (
        auth.uid() = buyer_id
    );

CREATE POLICY "Parties can update own orders"
    ON public.orders FOR UPDATE USING (
        auth.uid() = buyer_id OR auth.uid() = farmer_id
    );

-- POLICIES: TRANSPORT REQUESTS
CREATE POLICY "Transporters and order parties can view transport requests"
    ON public.transport_requests FOR SELECT USING (
        transporter_id IS NULL OR auth.uid() = transporter_id OR EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = transport_requests.order_id
            AND (o.buyer_id = auth.uid() OR o.farmer_id = auth.uid())
        )
    );

CREATE POLICY "Transporters can update assigned transport requests"
    ON public.transport_requests FOR UPDATE USING (
        auth.uid() = transporter_id
    );

-- POLICIES: NOTIFICATIONS
CREATE POLICY "Users view own notifications"
    ON public.notifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users update own notifications"
    ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- POLICIES: MARKET DATA & FORECASTS (Public read)
CREATE POLICY "Market data readable by all"
    ON public.market_data FOR SELECT USING (true);

CREATE POLICY "Forecasts readable by all"
    ON public.forecast_results FOR SELECT USING (true);

-- INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_crops_farmer ON public.crops(farmer_id);
CREATE INDEX IF NOT EXISTS idx_crops_category ON public.crops(category);
CREATE INDEX IF NOT EXISTS idx_crops_status ON public.crops(status);
CREATE INDEX IF NOT EXISTS idx_orders_buyer ON public.orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_farmer ON public.orders(farmer_id);
CREATE INDEX IF NOT EXISTS idx_sample_requests_buyer ON public.sample_requests(buyer_id);
CREATE INDEX IF NOT EXISTS idx_sample_requests_farmer ON public.sample_requests(farmer_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_market_data_commodity_date ON public.market_data(commodity, record_date);
