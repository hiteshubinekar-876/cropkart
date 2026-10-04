"""Initial CropKart 17-table database schema migration

Revision ID: 0001_cropkart_initial_schema
Revises: 
Create Date: 2026-10-02 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = '0001_cropkart_initial_schema'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # 1. users
    op.create_table(
        'users',
        sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('phone_number', sa.String(length=20), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('hashed_password', sa.String(length=255), nullable=True),
        sa.Column('full_name', sa.String(length=255), nullable=False),
        sa.Column('role', sa.String(length=30), server_default='farmer', nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('is_verified', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('is_superuser', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint("role IN ('farmer', 'buyer', 'transporter', 'admin')", name='chk_users_role'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_users_phone_number', 'users', ['phone_number'], unique=True)
    op.create_index('ix_users_email', 'users', ['email'], unique=True)
    op.create_index('ix_users_role', 'users', ['role'])

    # 2. farmer_profiles
    op.create_table(
        'farmer_profiles',
        sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('farm_name', sa.String(length=255), nullable=True),
        sa.Column('land_size_acres', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('soil_type', sa.String(length=100), nullable=True),
        sa.Column('irrigation_type', sa.String(length=100), nullable=True),
        sa.Column('kisan_credit_card_no', sa.String(length=50), nullable=True),
        sa.Column('experience_years', sa.Integer(), nullable=True),
        sa.Column('rating', sa.Numeric(precision=3, scale=2), server_default='5.00', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id')
    )
    op.create_index('ix_farmer_profiles_user_id', 'farmer_profiles', ['user_id'], unique=True)

    # 3. buyer_profiles
    op.create_table(
        'buyer_profiles',
        sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('business_name', sa.String(length=255), nullable=False),
        sa.Column('business_type', sa.String(length=100), nullable=False),
        sa.Column('gstin', sa.String(length=15), nullable=True),
        sa.Column('pan_number', sa.String(length=10), nullable=True),
        sa.Column('trade_license_no', sa.String(length=100), nullable=True),
        sa.Column('credit_limit', sa.Numeric(precision=12, scale=2), server_default='0.00', nullable=False),
        sa.Column('rating', sa.Numeric(precision=3, scale=2), server_default='5.00', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint(
            "business_type IN ('wholesaler', 'retailer', 'food_processor', 'fpo', 'exporter', 'caterer')",
            name='chk_buyer_profiles_type'
        ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id'),
        sa.UniqueConstraint('gstin')
    )
    op.create_index('ix_buyer_profiles_user_id', 'buyer_profiles', ['user_id'], unique=True)
    op.create_index('ix_buyer_profiles_gstin', 'buyer_profiles', ['gstin'], unique=True)

    # 4. transporter_profiles
    op.create_table(
        'transporter_profiles',
        sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('company_name', sa.String(length=255), nullable=True),
        sa.Column('driving_license_no', sa.String(length=50), nullable=False),
        sa.Column('operating_states', sa.Text(), nullable=True),
        sa.Column('fleet_size', sa.Integer(), server_default='1', nullable=False),
        sa.Column('has_cold_storage', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('is_available', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('rating', sa.Numeric(precision=3, scale=2), server_default='5.00', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id')
    )
    op.create_index('ix_transporter_profiles_user_id', 'transporter_profiles', ['user_id'], unique=True)
    op.create_index('ix_transporter_profiles_is_available', 'transporter_profiles', ['is_available'])

    # 5. user_addresses
    op.create_table(
        'user_addresses',
        sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('address_type', sa.String(length=50), nullable=False),
        sa.Column('street_address', sa.Text(), nullable=False),
        sa.Column('village_or_taluka', sa.String(length=100), nullable=True),
        sa.Column('district', sa.String(length=100), nullable=False),
        sa.Column('state', sa.String(length=100), nullable=False),
        sa.Column('pincode', sa.String(length=10), nullable=False),
        sa.Column('latitude', sa.Numeric(precision=9, scale=6), nullable=True),
        sa.Column('longitude', sa.Numeric(precision=9, scale=6), nullable=True),
        sa.Column('is_default', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint(
            "address_type IN ('farm_gate', 'warehouse', 'mandi_shop', 'hub', 'billing')",
            name='chk_user_addresses_type'
        ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_user_addresses_user_id', 'user_addresses', ['user_id'])
    op.create_index('ix_user_addresses_state_district', 'user_addresses', ['state', 'district'])

    # 6. crops
    op.create_table(
        'crops',
        sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('hindi_name', sa.String(length=100), nullable=True),
        sa.Column('category', sa.String(length=50), nullable=False),
        sa.Column('standard_unit', sa.String(length=20), server_default='quintal', nullable=False),
        sa.Column('shelf_life_days', sa.Integer(), nullable=True),
        sa.Column('image_url', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint(
            "category IN ('cereals', 'pulses', 'vegetables', 'fruits', 'oilseeds', 'spices', 'cash_crops')",
            name='chk_crops_category'
        ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    op.create_index('ix_crops_name', 'crops', ['name'], unique=True)
    op.create_index('ix_crops_category', 'crops', ['category'])

    # 7. crop_listings
    op.create_table(
        'crop_listings',
        sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('farmer_id', sa.Uuid(), nullable=False),
        sa.Column('crop_id', sa.Uuid(), nullable=False),
        sa.Column('pickup_address_id', sa.Uuid(), nullable=False),
        sa.Column('variety', sa.String(length=100), nullable=True),
        sa.Column('grade', sa.String(length=50), nullable=True),
        sa.Column('total_quantity', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('available_quantity', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('unit', sa.String(length=20), server_default='quintal', nullable=False),
        sa.Column('price_per_unit', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('min_order_quantity', sa.Numeric(precision=10, scale=2), server_default='1.00', nullable=False),
        sa.Column('harvest_date', sa.Date(), nullable=True),
        sa.Column('is_organic', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('status', sa.String(length=30), server_default='active', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint('total_quantity > 0', name='chk_crop_listings_total_quantity_positive'),
        sa.CheckConstraint('available_quantity >= 0', name='chk_crop_listings_available_quantity_non_negative'),
        sa.CheckConstraint('price_per_unit > 0', name='chk_crop_listings_price_positive'),
        sa.CheckConstraint("status IN ('active', 'sold_out', 'expired', 'paused')", name='chk_crop_listings_status'),
        sa.ForeignKeyConstraint(['crop_id'], ['crops.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['farmer_id'], ['farmer_profiles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['pickup_address_id'], ['user_addresses.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_crop_listings_farmer_id', 'crop_listings', ['farmer_id'])
    op.create_index('ix_crop_listings_crop_id', 'crop_listings', ['crop_id'])
    op.create_index('ix_crop_listings_pickup_address_id', 'crop_listings', ['pickup_address_id'])
    op.create_index('ix_crop_listings_status_crop_id', 'crop_listings', ['status', 'crop_id'])

    # 8. orders
    op.create_table(
        'orders',
        sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('order_number', sa.String(length=50), nullable=False),
        sa.Column('buyer_id', sa.Uuid(), nullable=False),
        sa.Column('delivery_address_id', sa.Uuid(), nullable=False),
        sa.Column('total_items_amount', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('transport_fee', sa.Numeric(precision=10, scale=2), server_default='0.00', nullable=False),
        sa.Column('platform_fee', sa.Numeric(precision=10, scale=2), server_default='0.00', nullable=False),
        sa.Column('total_amount', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('order_status', sa.String(length=50), server_default='placed', nullable=False),
        sa.Column('payment_status', sa.String(length=50), server_default='unpaid', nullable=False),
        sa.Column('requires_transport', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint(
            "order_status IN ('placed', 'confirmed', 'in_transit', 'delivered', 'completed', 'cancelled')",
            name='chk_orders_status'
        ),
        sa.CheckConstraint(
            "payment_status IN ('unpaid', 'escrow_funded', 'settled', 'refunded')",
            name='chk_orders_payment_status'
        ),
        sa.ForeignKeyConstraint(['buyer_id'], ['buyer_profiles.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['delivery_address_id'], ['user_addresses.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('order_number')
    )
    op.create_index('ix_orders_order_number', 'orders', ['order_number'], unique=True)
    op.create_index('ix_orders_buyer_id', 'orders', ['buyer_id'])
    op.create_index('ix_orders_delivery_address_id', 'orders', ['delivery_address_id'])
    op.create_index('ix_orders_status_payment', 'orders', ['order_status', 'payment_status'])

    # 9. order_items
    op.create_table(
        'order_items',
        sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('order_id', sa.Uuid(), nullable=False),
        sa.Column('listing_id', sa.Uuid(), nullable=False),
        sa.Column('farmer_id', sa.Uuid(), nullable=False),
        sa.Column('quantity', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('unit_price', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('total_price', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('item_status', sa.String(length=50), server_default='pending', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint('quantity > 0', name='chk_order_items_quantity_positive'),
        sa.CheckConstraint('unit_price >= 0', name='chk_order_items_unit_price_non_negative'),
        sa.CheckConstraint('total_price >= 0', name='chk_order_items_total_price_non_negative'),
        sa.CheckConstraint(
            "item_status IN ('pending', 'packed', 'picked_up', 'delivered')",
            name='chk_order_items_status'
        ),
        sa.ForeignKeyConstraint(['farmer_id'], ['farmer_profiles.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['listing_id'], ['crop_listings.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['order_id'], ['orders.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_order_items_order_id', 'order_items', ['order_id'])
    op.create_index('ix_order_items_listing_id', 'order_items', ['listing_id'])
    op.create_index('ix_order_items_farmer_id', 'order_items', ['farmer_id'])

    # 10. payments
    op.create_table(
        'payments',
        sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('order_id', sa.Uuid(), nullable=False),
        sa.Column('payer_id', sa.Uuid(), nullable=False),
        sa.Column('payee_id', sa.Uuid(), nullable=True),
        sa.Column('payment_type', sa.String(length=50), nullable=False),
        sa.Column('payment_method', sa.String(length=50), nullable=False),
        sa.Column('amount', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('transaction_reference', sa.String(length=100), nullable=True),
        sa.Column('status', sa.String(length=50), server_default='initiated', nullable=False),
        sa.Column('escrow_released_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint('amount > 0', name='chk_payments_amount_positive'),
        sa.CheckConstraint(
            "payment_type IN ('buyer_escrow_deposit', 'farmer_payout', 'transporter_payout', 'refund')",
            name='chk_payments_type'
        ),
        sa.CheckConstraint(
            "payment_method IN ('upi', 'net_banking', 'credit_card', 'neft_rtgs', 'wallet')",
            name='chk_payments_method'
        ),
        sa.CheckConstraint(
            "status IN ('initiated', 'in_escrow', 'released', 'failed', 'refunded')",
            name='chk_payments_status'
        ),
        sa.ForeignKeyConstraint(['order_id'], ['orders.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['payer_id'], ['users.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['payee_id'], ['users.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('transaction_reference')
    )
    op.create_index('ix_payments_order_id', 'payments', ['order_id'])
    op.create_index('ix_payments_payer_id', 'payments', ['payer_id'])
    op.create_index('ix_payments_payee_id', 'payments', ['payee_id'])
    op.create_index('ix_payments_transaction_reference', 'payments', ['transaction_reference'], unique=True)

    # 11. transporter_vehicles
    op.create_table(
        'transporter_vehicles',
        sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('transporter_id', sa.Uuid(), nullable=False),
        sa.Column('registration_number', sa.String(length=50), nullable=False),
        sa.Column('vehicle_type', sa.String(length=100), nullable=False),
        sa.Column('capacity_quintals', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('has_cold_storage', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint('capacity_quintals > 0', name='chk_vehicles_capacity_positive'),
        sa.CheckConstraint(
            "vehicle_type IN ('mini_truck_1t', 'pickup_2t', 'eicher_5t', 'truck_10t', 'multi_axle_20t', 'reefer_cold_van')",
            name='chk_vehicles_type'
        ),
        sa.ForeignKeyConstraint(['transporter_id'], ['transporter_profiles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('registration_number')
    )
    op.create_index('ix_transporter_vehicles_transporter_id', 'transporter_vehicles', ['transporter_id'])
    op.create_index('ix_transporter_vehicles_registration_number', 'transporter_vehicles', ['registration_number'], unique=True)

    # 12. transport_requests
    op.create_table(
        'transport_requests',
        sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('order_id', sa.Uuid(), nullable=False),
        sa.Column('transporter_id', sa.Uuid(), nullable=True),
        sa.Column('vehicle_id', sa.Uuid(), nullable=True),
        sa.Column('pickup_address_id', sa.Uuid(), nullable=False),
        sa.Column('delivery_address_id', sa.Uuid(), nullable=False),
        sa.Column('total_weight_quintals', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('distance_km', sa.Numeric(precision=8, scale=2), nullable=True),
        sa.Column('freight_charge', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('pickup_otp', sa.String(length=6), nullable=True),
        sa.Column('delivery_otp', sa.String(length=6), nullable=True),
        sa.Column('status', sa.String(length=50), server_default='unassigned', nullable=False),
        sa.Column('actual_pickup_time', sa.DateTime(timezone=True), nullable=True),
        sa.Column('actual_delivery_time', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint('total_weight_quintals > 0', name='chk_transport_requests_weight_positive'),
        sa.CheckConstraint('freight_charge >= 0', name='chk_transport_requests_freight_charge_non_negative'),
        sa.CheckConstraint(
            "status IN ('unassigned', 'assigned', 'dispatched', 'at_pickup', 'in_transit', 'delivered', 'cancelled')",
            name='chk_transport_requests_status'
        ),
        sa.ForeignKeyConstraint(['delivery_address_id'], ['user_addresses.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['order_id'], ['orders.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['pickup_address_id'], ['user_addresses.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['transporter_id'], ['transporter_profiles.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['vehicle_id'], ['transporter_vehicles.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_transport_requests_order_id', 'transport_requests', ['order_id'])
    op.create_index('ix_transport_requests_transporter_id', 'transport_requests', ['transporter_id'])
    op.create_index('ix_transport_requests_vehicle_id', 'transport_requests', ['vehicle_id'])
    op.create_index('ix_transport_requests_status', 'transport_requests', ['status'])

    # 13. transporter_locations
    op.create_table(
        'transporter_locations',
        sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('transport_request_id', sa.Uuid(), nullable=False),
        sa.Column('vehicle_id', sa.Uuid(), nullable=False),
        sa.Column('latitude', sa.Numeric(precision=9, scale=6), nullable=False),
        sa.Column('longitude', sa.Numeric(precision=9, scale=6), nullable=False),
        sa.Column('speed_kmh', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('recorded_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['transport_request_id'], ['transport_requests.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['vehicle_id'], ['transporter_vehicles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_transporter_locations_request_time', 'transporter_locations', ['transport_request_id', 'recorded_at'])

    # 14. delivery_routes
    op.create_table(
        'delivery_routes',
        sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('transport_request_id', sa.Uuid(), nullable=False),
        sa.Column('sequence_order', sa.Integer(), nullable=False),
        sa.Column('checkpoint_name', sa.String(length=255), nullable=False),
        sa.Column('latitude', sa.Numeric(precision=9, scale=6), nullable=False),
        sa.Column('longitude', sa.Numeric(precision=9, scale=6), nullable=False),
        sa.Column('status', sa.String(length=50), server_default='pending', nullable=False),
        sa.Column('passed_at', sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("status IN ('pending', 'passed', 'skipped')", name='chk_delivery_routes_status'),
        sa.ForeignKeyConstraint(['transport_request_id'], ['transport_requests.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_delivery_routes_request_seq', 'delivery_routes', ['transport_request_id', 'sequence_order'])

    # 15. market_data
    op.create_table(
        'market_data',
        sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('crop_id', sa.Uuid(), nullable=True),
        sa.Column('state', sa.String(length=100), nullable=False),
        sa.Column('district', sa.String(length=100), nullable=False),
        sa.Column('market_name', sa.String(length=150), nullable=False),
        sa.Column('commodity', sa.String(length=100), nullable=False),
        sa.Column('variety', sa.String(length=100), nullable=True),
        sa.Column('grade', sa.String(length=50), nullable=True),
        sa.Column('arrival_date', sa.Date(), nullable=False),
        sa.Column('arrival_quantity', sa.Numeric(precision=12, scale=2), server_default='0.00', nullable=False),
        sa.Column('quantity_unit', sa.String(length=20), server_default='quintal', nullable=False),
        sa.Column('min_price', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('max_price', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('modal_price', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('source', sa.String(length=50), server_default='agmarknet', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['crop_id'], ['crops.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_market_data_comm_market_date', 'market_data', ['commodity', 'market_name', 'arrival_date'])
    op.create_index('ix_market_data_state_district', 'market_data', ['state', 'district'])
    op.create_index('ix_market_data_arrival_date', 'market_data', ['arrival_date'])
    op.execute(
        """
        CREATE UNIQUE INDEX uq_market_data_dedup
        ON market_data (commodity, market_name, COALESCE(variety, ''), COALESCE(grade, ''), arrival_date);
        """
    )

    # 16. market_price_history
    op.create_table(
        'market_price_history',
        sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('crop_id', sa.Uuid(), nullable=False),
        sa.Column('market_data_id', sa.Uuid(), nullable=True),
        sa.Column('state', sa.String(length=100), nullable=False),
        sa.Column('district', sa.String(length=100), nullable=False),
        sa.Column('market_name', sa.String(length=150), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('actual_modal_price', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('predicted_modal_price', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('confidence_lower', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('confidence_upper', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('price_trend', sa.String(length=20), nullable=True),
        sa.Column('rolling_7d_avg_price', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('rolling_30d_avg_price', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('model_version', sa.String(length=50), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint("price_trend IN ('bullish', 'bearish', 'stable')", name='chk_price_history_trend'),
        sa.ForeignKeyConstraint(['crop_id'], ['crops.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['market_data_id'], ['market_data.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_price_history_crop_market_date', 'market_price_history', ['crop_id', 'market_name', 'date'])
    op.create_index('ix_price_history_state_district', 'market_price_history', ['state', 'district'])
    op.execute(
        """
        CREATE UNIQUE INDEX uq_price_history_crop_market_date_model
        ON market_price_history (crop_id, market_name, date, COALESCE(model_version, ''));
        """
    )

    # 17. demand_forecasts
    op.create_table(
        'demand_forecasts',
        sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('crop_id', sa.Uuid(), nullable=False),
        sa.Column('state', sa.String(length=100), nullable=False),
        sa.Column('district', sa.String(length=100), nullable=False),
        sa.Column('forecast_date', sa.Date(), nullable=False),
        sa.Column('forecast_horizon_days', sa.Integer(), nullable=False),
        sa.Column('predicted_demand_quintals', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('estimated_supply_quintals', sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column('projected_gap_quintals', sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column('confidence_score', sa.Numeric(precision=4, scale=3), nullable=True),
        sa.Column('season', sa.String(length=50), nullable=True),
        sa.Column('festival_multiplier', sa.Numeric(precision=4, scale=2), server_default='1.00', nullable=False),
        sa.Column('weather_impact_flag', sa.String(length=50), nullable=True),
        sa.Column('model_name', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint(
            'confidence_score >= 0.000 AND confidence_score <= 1.000',
            name='chk_demand_forecasts_confidence_score_range'
        ),
        sa.CheckConstraint("season IN ('kharif', 'rabi', 'zaid')", name='chk_demand_forecasts_season'),
        sa.ForeignKeyConstraint(['crop_id'], ['crops.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_demand_forecasts_crop_district_date', 'demand_forecasts', ['crop_id', 'district', 'forecast_date'])
    op.create_index('ix_demand_forecasts_horizon', 'demand_forecasts', ['forecast_horizon_days'])
    op.execute(
        """
        CREATE UNIQUE INDEX uq_demand_forecasts_crop_district_date_model
        ON demand_forecasts (crop_id, district, forecast_date, COALESCE(model_name, ''));
        """
    )


def downgrade():
    # Drop tables in exact reverse dependency order
    op.execute("DROP INDEX IF EXISTS uq_demand_forecasts_crop_district_date_model;")
    op.drop_table('demand_forecasts')

    op.execute("DROP INDEX IF EXISTS uq_price_history_crop_market_date_model;")
    op.drop_table('market_price_history')

    op.execute("DROP INDEX IF EXISTS uq_market_data_dedup;")
    op.drop_table('market_data')

    op.drop_table('delivery_routes')
    op.drop_table('transporter_locations')
    op.drop_table('transport_requests')
    op.drop_table('transporter_vehicles')
    op.drop_table('payments')
    op.drop_table('order_items')
    op.drop_table('orders')
    op.drop_table('crop_listings')
    op.drop_table('crops')
    op.drop_table('user_addresses')
    op.drop_table('transporter_profiles')
    op.drop_table('buyer_profiles')
    op.drop_table('farmer_profiles')
    op.drop_table('users')
