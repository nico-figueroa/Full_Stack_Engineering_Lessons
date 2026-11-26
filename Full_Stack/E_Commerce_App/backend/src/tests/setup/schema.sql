-- Generic E-commerce API schema
-- PostgreSQL + UUIDs + hybrid soft/hard delete model

CREATE OR REPLACE FUNCTION uuid_v4()
RETURNS UUID
LANGUAGE SQL
VOLATILE
AS $$
    SELECT (
        substr(md5(random()::text || clock_timestamp()::text), 1, 8) || '-' ||
        substr(md5(random()::text || clock_timestamp()::text), 9, 4) || '-4' ||
        substr(md5(random()::text || clock_timestamp()::text), 14, 3) || '-' ||
        substr('89ab', floor(random() * 4)::integer + 1, 1) ||
        substr(md5(random()::text || clock_timestamp()::text), 18, 3) || '-' ||
        substr(md5(random()::text || clock_timestamp()::text), 21, 12)
    )::uuid;
$$;

-- ============================
-- USERS
-- ============================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    name VARCHAR(255),
    phone VARCHAR(50),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(2),
    role VARCHAR(20) NOT NULL CHECK (role IN ('customer', 'admin', 'vendor')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================
-- OAUTH ACCOUNTS
-- ============================
-- provider is intentionally allowed to be google/microsoft/github so the
-- schema does not need another migration when those providers are wired up;
-- only 'github' is implemented in the application layer for now.
CREATE TABLE oauth_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL CHECK (provider IN ('google', 'microsoft', 'github')),
    provider_user_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (provider, provider_user_id)
);

-- ============================
-- PRODUCTS (soft delete)
-- ============================
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sku VARCHAR(100) UNIQUE,
    price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================
-- CARTS (one active cart per user)
-- ============================
CREATE TABLE carts (
    id UUID PRIMARY KEY DEFAULT uuid_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id)
);

-- ============================
-- CART ITEMS
-- ============================
CREATE TABLE cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_v4(),
    cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10,2) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (cart_id, product_id)
);

-- ============================
-- ORDERS
-- ============================
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'paid', 'shipped', 'completed', 'cancelled')),
    total_amount NUMERIC(10,2) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    payment_status VARCHAR(20) NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'failed')),
    payment_provider VARCHAR(50),
    payment_reference VARCHAR(255),
    shipping_name VARCHAR(255),
    shipping_phone VARCHAR(50),
    shipping_line1 VARCHAR(255),
    shipping_line2 VARCHAR(255),
    shipping_city VARCHAR(100),
    shipping_state VARCHAR(100),
    shipping_postal_code VARCHAR(20),
    shipping_country VARCHAR(2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================
-- ORDER ITEMS
-- ============================
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10,2) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================
-- PAYMENTS (Stripe-backed)
-- ============================
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'authorized', 'captured', 'failed')),
    stripe_payment_intent_id VARCHAR(255) UNIQUE,
    failure_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================
-- SHIPMENTS (Shippo test mode, or simulated)
-- ============================
CREATE TABLE shipments (
    id UUID PRIMARY KEY DEFAULT uuid_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    provider VARCHAR(30) NOT NULL DEFAULT 'shippo',
    carrier VARCHAR(100),
    service VARCHAR(100),
    tracking_number VARCHAR(255),
    tracking_url TEXT,
    label_url TEXT,
    provider_shipment_id VARCHAR(255),
    provider_transaction_id VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'pre_transit'
        CHECK (status IN ('pre_transit', 'in_transit', 'delivered', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;

-- ============================
-- INDEXES
-- ============================
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_products_is_active ON products(is_active);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_cart_items_cart_id ON cart_items(cart_id);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_stripe_payment_intent_id ON payments(stripe_payment_intent_id);
