-- CropKart Sample Seed Data for Supabase
-- Populates realistic Indian agricultural data for marketplace testing

-- 0. Ensure seed demo UUIDs are permitted
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey;

-- 1. Insert Demo Users (Using dummy UUIDs)
INSERT INTO public.users (id, email, name, mobile, role, location, avatar_url)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'ramesh@example.com', 'Ramesh Kumar', '9876543210', 'farmer', 'Pune, Maharashtra', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop'),
    ('00000000-0000-0000-0000-000000000002', 'anita@example.com', 'Anita Patil', '9876501234', 'farmer', 'Nashik, Maharashtra', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop'),
    ('00000000-0000-0000-0000-000000000003', 'balvinder@example.com', 'Balvinder Singh', '9812345678', 'farmer', 'Ludhiana, Punjab', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop'),
    ('00000000-0000-0000-0000-000000000004', 'buyer@example.com', 'Rajesh Gupta', '9123456789', 'buyer', 'Mumbai, Maharashtra', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop'),
    ('00000000-0000-0000-0000-000000000005', 'transporter@example.com', 'Vikram Shinde', '9890123456', 'transporter', 'Pune, Maharashtra', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop')
ON CONFLICT (id) DO NOTHING;

-- 2. Farmer Profiles
INSERT INTO public.farmer_profiles (id, farm_name, years_active, total_acres, is_verified, rating, review_count, district, state, upi_id, bio)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'Green Valley Farms', 9, 25.0, true, 4.85, 34, 'Pune', 'Maharashtra', 'ramesh@upi', 'Specializing in chemical-free certified organic wheat and pulses.'),
    ('00000000-0000-0000-0000-000000000002', 'Patil Fresh Produce', 12, 40.0, true, 4.90, 48, 'Nashik', 'Maharashtra', 'anita@upi', 'Direct harvest fresh vegetables, tomatoes and export-quality onions.'),
    ('00000000-0000-0000-0000-000000000003', 'Punjab Golden Harvest', 15, 60.0, true, 4.75, 29, 'Ludhiana', 'Punjab', 'balvinder@upi', 'High-grade Basmati rice and premium Sharbati wheat supplier.')
ON CONFLICT (id) DO NOTHING;

-- 3. Buyer Profiles
INSERT INTO public.buyer_profiles (id, company_name, business_type, gst_number, is_verified, rating, district, state)
VALUES
    ('00000000-0000-0000-0000-000000000004', 'FreshMart Wholesale India', 'Wholesaler & Supermarket Chain', '27AABCU9603R1ZM', true, 4.90, 'Mumbai', 'Maharashtra')
ON CONFLICT (id) DO NOTHING;

-- 4. Transporter Profiles
INSERT INTO public.transporter_profiles (id, company_name, vehicle_type, vehicle_number, capacity_tonnes, is_verified, is_available, district, state)
VALUES
    ('00000000-0000-0000-0000-000000000005', 'Kisan Express Cargo', 'Tata 407 & Eicher 14ft Canter', 'MH-12-QW-4521', 8.5, true, true, 'Pune', 'Maharashtra')
ON CONFLICT (id) DO NOTHING;

-- 5. Crops Listings
INSERT INTO public.crops (id, farmer_id, name, variety, category, quantity, unit, price_per_unit, quality_grade, organic, harvest_date, available_from, location, district, state, description, moisture_percent, storage_type, fertilizers_used, status, primary_image_url)
VALUES
    ('11111111-1111-1111-1111-111111110001', '00000000-0000-0000-0000-000000000001', 'Sharbati Wheat', 'Premium Sharbati Gold', 'Grain', 4500, 'kg', 28.50, 'Grade A', true, '2026-03-10', '2026-03-15', 'Baramati, Pune', 'Pune', 'Maharashtra', 'Naturally sun-dried golden Sharbati wheat with high protein and low moisture. Ready for bulk shipment.', 10.5, 'Silo Dry Storage', 'Vermicompost, Neem Cake', 'available', 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=600&auto=format&fit=crop'),
    ('11111111-1111-1111-1111-111111110002', '00000000-0000-0000-0000-000000000002', 'Desi Tomatoes', 'Abhinav Hybrid', 'Vegetable', 2800, 'kg', 32.00, 'Grade A', false, '2026-04-01', '2026-04-02', 'Niphad, Nashik', 'Nashik', 'Maharashtra', 'Firm, bright red culinary tomatoes suitable for supermarket distribution and puree processing. Freshly harvested.', 88.0, 'Ventilated Crates', 'Drip Fertigation (NPK)', 'available', 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop'),
    ('11111111-1111-1111-1111-111111110003', '00000000-0000-0000-0000-000000000003', 'Basmati Rice', 'Pusa 1121 Traditional', 'Grain', 12000, 'kg', 78.00, 'Premium', true, '2026-02-20', '2026-02-25', 'Samrala, Ludhiana', 'Ludhiana', 'Punjab', 'Extra-long grain aromatic Basmati rice, aged 12 months for exceptional fragrance and elongation.', 11.2, 'Puck Warehouse', 'Organic Farmyard Manure', 'available', 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop'),
    ('11111111-1111-1111-1111-111111110004', '00000000-0000-0000-0000-000000000002', 'Red Onions', 'Garwa Late Red', 'Vegetable', 18000, 'kg', 24.00, 'Grade A', false, '2026-03-01', '2026-03-05', 'Lasalgaon, Nashik', 'Nashik', 'Maharashtra', 'Uniform sized tight-skin red onions with excellent shelf life (up to 4 months in ambient storage).', 14.0, 'Traditional Chawl Storage', 'Standard NPK', 'available', 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=600&auto=format&fit=crop'),
    ('11111111-1111-1111-1111-111111110005', '00000000-0000-0000-0000-000000000001', 'Yellow Soybean', 'JS 335', 'Oilseed', 9500, 'kg', 46.50, 'Standard', true, '2026-01-15', '2026-01-20', 'Indapur, Pune', 'Pune', 'Maharashtra', 'High oil content soybeans ideal for crushing and oil extraction plants, free from foreign matter.', 9.8, 'Hermetic Bags', 'Organic Biofertilizers', 'available', 'https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=600&auto=format&fit=crop'),
    ('11111111-1111-1111-1111-111111110006', '00000000-0000-0000-0000-000000000003', 'BT Cotton', 'Bollgard II', 'Commercial', 6000, 'kg', 68.00, 'Grade A', false, '2026-02-10', '2026-02-18', 'Khanna, Ludhiana', 'Ludhiana', 'Punjab', 'Medium-long staple raw cotton with minimal moisture and trash content, ready for ginning mills.', 8.5, 'Covered Dry Godown', 'Standard Integrated Pest Mgmt', 'available', 'https://images.unsplash.com/photo-1606041008023-472dfb5e530f?w=600&auto=format&fit=crop')
ON CONFLICT (id) DO NOTHING;

-- 6. Sample Requests Seed
INSERT INTO public.sample_requests (id, buyer_id, farmer_id, crop_id, quantity, unit, delivery_address, tracking_number, notes, status)
VALUES
    ('22222222-2222-2222-2222-222222220001', '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111110001', 2.0, 'kg', 'FreshMart Central Hub, APMC Market Yard, Vashi, Navi Mumbai 400703', 'DTDC-8849201', 'Please include flour consistency test certification if available.', 'sample_sent'),
    ('22222222-2222-2222-2222-222222220002', '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111110002', 5.0, 'kg', 'FreshMart Central Hub, APMC Market Yard, Vashi, Navi Mumbai 400703', NULL, 'Evaluating shelf life for quick commerce 10-minute dispatch.', 'sample_requested')
ON CONFLICT (id) DO NOTHING;

-- 7. Orders Seed
INSERT INTO public.orders (id, order_number, buyer_id, farmer_id, crop_id, quantity, unit, price_per_unit, total_price, pickup_location, delivery_location, status, payment_status, payment_method, notes)
VALUES
    ('33333333-3333-3333-3333-333333330001', 'CK-2026-0819', '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111110001', 3000, 'kg', 28.50, 85500.00, 'Baramati Farm Gate, Pune', 'Vashi APMC Hub, Navi Mumbai', 'in_transit', 'paid', 'upi', 'Approved post-sample verification. Urgent dispatch requested.'),
    ('33333333-3333-3333-3333-333333330002', 'CK-2026-0922', '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111110004', 5000, 'kg', 24.00, 120000.00, 'Lasalgaon Mandi Yard, Nashik', 'Bhiwandi Central Godown, Mumbai', 'pending', 'escrow', 'bank_transfer', 'Bulk order scheduled for Monday morning arrival.')
ON CONFLICT (id) DO NOTHING;

-- 8. Transport Requests Seed
INSERT INTO public.transport_requests (id, order_id, transporter_id, pickup_location, delivery_location, distance_km, estimated_hours, vehicle_type, vehicle_number, cost, status)
VALUES
    ('44444444-4444-4444-4444-444444440001', '33333333-3333-3333-3333-333333330001', '00000000-0000-0000-0000-000000000005', 'Baramati, Pune', 'Vashi APMC, Navi Mumbai', 225.0, 5.5, 'Eicher 14ft Canter', 'MH-12-QW-4521', 6500.00, 'in_transit')
ON CONFLICT (id) DO NOTHING;

-- 9. Notifications Seed
INSERT INTO public.notifications (id, user_id, title, message, type, link, is_read)
VALUES
    ('55555555-5555-5555-5555-555555550001', '00000000-0000-0000-0000-000000000001', 'New Sample Request', 'FreshMart Wholesale India requested 2 kg sample of Sharbati Wheat.', 'sample_request', '/farm?tab=samples', false),
    ('55555555-5555-5555-5555-555555550002', '00000000-0000-0000-0000-000000000001', 'Bulk Order Confirmed', 'Order #CK-2026-0819 for 3000 kg Wheat confirmed and in transit.', 'order_status', '/farm?tab=orders', false),
    ('55555555-5555-5555-5555-555555550003', '00000000-0000-0000-0000-000000000004', 'Sample Dispatched', 'Farmer Ramesh Kumar dispatched your 2 kg Wheat sample via DTDC.', 'sample_status', '/buyer', false),
    ('55555555-5555-5555-5555-555555550004', '00000000-0000-0000-0000-000000000005', 'New Transport Assigned', 'Assigned route: Baramati to Vashi (225 km). Pickup scheduled.', 'transport_update', '/transporter', false)
ON CONFLICT (id) DO NOTHING;
