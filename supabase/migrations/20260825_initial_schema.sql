-- ==========================================================================
-- TikTok Shop Seller Portal - Initial Supabase Database Schema & Seed Data
-- ==========================================================================

-- 1. Users Table (Merchant Balances & Shop Stats)
CREATE TABLE IF NOT EXISTS public.users (
    id BIGINT PRIMARY KEY DEFAULT 1,
    name TEXT NOT NULL DEFAULT 'AMKS',
    email TEXT NOT NULL DEFAULT 'amks.pk@hotmail.com',
    avatar TEXT DEFAULT '/uploads/amks_logo.png',
    level TEXT DEFAULT 'V0',
    rating NUMERIC(3, 1) DEFAULT 5.0,
    credit_score INTEGER DEFAULT 100,
    followers INTEGER DEFAULT 1420,
    balance NUMERIC(15, 2) DEFAULT 205.54,
    pending_balance NUMERIC(15, 2) DEFAULT 38017.34,
    total_income NUMERIC(15, 2) DEFAULT 94156.54,
    today_orders INTEGER DEFAULT 14,
    today_sales NUMERIC(15, 2) DEFAULT 5240.00,
    today_profit NUMERIC(15, 2) DEFAULT 1048.00,
    visitors_today INTEGER DEFAULT 1350,
    visitors_7days INTEGER DEFAULT 9840,
    visitors_30days INTEGER DEFAULT 42100,
    rating_rate NUMERIC(5, 2) DEFAULT 99.80,
    notice TEXT DEFAULT 'Dear users, please pay attention to your payment. Late payments may negatively impact the store''s credit score and other aspects.'
);

-- Seed Initial Merchant User
INSERT INTO public.users (id, name, email, avatar, level, rating, credit_score, followers, balance, pending_balance, total_income, today_orders, today_sales, today_profit, visitors_today, visitors_7days, visitors_30days, rating_rate, notice)
VALUES (1, 'AMKS', 'amks.pk@hotmail.com', '/uploads/amks_logo.png', 'V0', 5.0, 100, 1420, 205.54, 38017.34, 94156.54, 14, 5240.00, 1048.00, 1350, 9840, 42100, 99.80, 'Dear users, please pay attention to your payment. Late payments may negatively impact the store''s credit score and other aspects.')
ON CONFLICT (id) DO NOTHING;

-- 2. Products Table
CREATE TABLE IF NOT EXISTS public.products (
    id BIGINT PRIMARY KEY,
    title TEXT NOT NULL,
    spec TEXT DEFAULT '',
    price NUMERIC(12, 2) NOT NULL,
    stock INTEGER DEFAULT 100,
    sales_count INTEGER DEFAULT 0,
    click_count INTEGER DEFAULT 0,
    expected_profit NUMERIC(12, 2) DEFAULT 0.00,
    is_top10 INTEGER DEFAULT 0,
    image_url TEXT DEFAULT '',
    category TEXT DEFAULT 'General'
);

-- Seed Products
INSERT INTO public.products (id, title, spec, price, stock, sales_count, click_count, expected_profit, is_top10, image_url, category) VALUES
(101, 'Foursun 1500W Portable Power Station (3000W Peak), 1598.4Wh with 2x 1500W AC Outlets, Wireless Charging, PD 65W, Solar Generator (Solar Panel Not Included) for Home Backup, Emergency, Outdoor Camping', '', 900.38, 100, 22, 529, 0.00, 1, '/uploads/powerstation.png', 'Power'),
(102, 'SIM Free iPhone 17 Pro Max 5G 1TB AI Phone Silver PreOrder', '', 1285.22, 100, 18, 480, 0.00, 1, '/uploads/iphone_silver.png', 'Phones'),
(103, 'SIM Free iPhone 17 Pro Max 5G 1TB AI Phone Cosmic Orange Pre-Order', '', 1290.00, 100, 12, 450, 0.00, 1, '/uploads/iphone_orange.png', 'Phones'),
(104, 'SIM Free iPhone 17 Pro Max 5G 1TB AI Phone Deep Blue Pre-Order', '', 1320.50, 100, 10, 410, 0.00, 1, '/uploads/iphone_blue.png', 'Phones'),
(105, 'Portable Thermal Shipping Label Printer 4x6 for Small Business', '', 142.60, 100, 35, 620, 0.00, 1, '/uploads/printer.png', 'Office'),
(106, 'Wireless Noise Cancelling Earbuds Pro with Smart Touch Control', '', 89.99, 100, 48, 890, 0.00, 1, '/uploads/earbuds.png', 'Audio'),
(107, '4K Ultra HD Dash Cam Front and Rear with Night Vision & WiFi', '', 115.40, 100, 14, 310, 0.00, 1, '/uploads/dashcam.png', 'Electronics'),
(108, 'Smart Watch Ultra 2 with Titanium Case & Cellular Tracking', '', 399.00, 100, 9, 396, 0.00, 1, '/uploads/apple_watch.png', 'Wearables'),
(109, 'SIM Free iPhone 17 Pro Max 5G 512GB AI Phone Blue Pre-Order', '', 1238.65, 100, 4, 482, 0.00, 1, '/uploads/iphone_blue.png', 'Phones'),
(110, 'SIM Free iPhone 17 Pro Max 5G 512GB AI Phone Blue Pre-Order', '', 1331.85, 100, 5, 542, 0.00, 1, '/uploads/iphone_blue.png', 'Phones')
ON CONFLICT (id) DO NOTHING;

-- 3. Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
    id BIGINT PRIMARY KEY,
    order_no TEXT NOT NULL,
    product_id BIGINT,
    product_title TEXT NOT NULL,
    product_image TEXT DEFAULT '',
    price NUMERIC(12, 2) NOT NULL,
    quantity INTEGER DEFAULT 1,
    total_amount NUMERIC(12, 2) NOT NULL,
    profit NUMERIC(12, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'To Pickup',
    created_at TEXT NOT NULL
);

-- Seed Orders
INSERT INTO public.orders (id, order_no, product_id, product_title, product_image, price, quantity, total_amount, profit, status, created_at) VALUES
(1, 'ORD-20260824-8849', 101, 'Foursun 1500W Portable Power Station', '/uploads/powerstation.png', 900.38, 1, 900.38, 135.06, 'To Pickup', '2026-08-24 16:30:12'),
(2, 'ORD-20260824-7712', 102, 'SIM Free iPhone 17 Pro Max 5G 1TB Silver', '/uploads/iphone_silver.png', 1285.22, 1, 1285.22, 192.78, 'To Pickup', '2026-08-24 14:15:00'),
(3, 'ORD-20260824-6631', 103, 'SIM Free iPhone 17 Pro Max 5G 1TB Orange', '/uploads/iphone_orange.png', 1290.00, 1, 1290.00, 193.50, 'To Pickup', '2026-08-24 11:20:45'),
(4, 'ORD-20260824-5540', 105, 'Portable Thermal Shipping Label Printer 4x6', '/uploads/printer.png', 142.60, 2, 285.20, 42.78, 'To Pickup', '2026-08-24 09:10:33')
ON CONFLICT (id) DO NOTHING;

-- 4. Transactions Table (Recharge & Withdrawal)
CREATE TABLE IF NOT EXISTS public.transactions (
    id BIGINT PRIMARY KEY,
    user_id BIGINT DEFAULT 1,
    type TEXT NOT NULL,
    method TEXT NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    full_name TEXT DEFAULT '',
    bank_name TEXT DEFAULT '',
    iban TEXT DEFAULT '',
    tx_hash TEXT DEFAULT '',
    receipt_image TEXT DEFAULT '',
    created_at TEXT NOT NULL
);

-- 5. Messages Table (Live Customer Service Chat)
CREATE TABLE IF NOT EXISTS public.messages (
    id BIGINT PRIMARY KEY,
    sender TEXT NOT NULL,
    message TEXT DEFAULT '',
    image_url TEXT DEFAULT '',
    is_read INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
);

-- Seed Initial Chat Welcome Message
INSERT INTO public.messages (id, sender, message, created_at)
VALUES (1, 'admin', 'Welcome to TikTok Shop Merchant Support. How can we help you today?', '2026-08-24 08:00:00')
ON CONFLICT (id) DO NOTHING;

-- 6. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id BIGINT PRIMARY KEY,
    message TEXT NOT NULL,
    sent_time TEXT NOT NULL,
    type TEXT DEFAULT 'System Message',
    sender TEXT DEFAULT 'System',
    is_read INTEGER DEFAULT 0
);

-- Seed Notifications
INSERT INTO public.notifications (id, message, sent_time, type, sender, is_read) VALUES
(1, 'Withdrawal review notification', '2026-08-24 11:14:02', 'System Message', 'System', 0),
(2, 'Recharge review notification', '2026-08-24 11:13:37', 'System Message', 'System', 0),
(3, 'Order dispatch reminder', '2026-08-24 09:30:15', 'System Message', 'System', 1)
ON CONFLICT (id) DO NOTHING;

-- 7. FAQs Table
CREATE TABLE IF NOT EXISTS public.faqs (
    id BIGINT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL
);

-- Seed FAQs
INSERT INTO public.faqs (id, title, content) VALUES
(1, 'How to process customer orders?', 'Go to the Order tab, locate orders waiting for pickup, and tap "Click to Pickup" to proceed with dispatch.'),
(2, 'When will my wallet earnings settle?', 'Order profits move from Pending Balance to Available Balance once the buyer confirms delivery or within 7 business days.'),
(3, 'How do I top up my store account?', 'Use the Recharge button on the Home tab to deposit via USDT TRC20 transfer.'),
(4, 'How to withdraw funds to my account?', 'Tap Withdrawal on the Home tab, enter your withdrawal amount and payout details, and submit for instant review.')
ON CONFLICT (id) DO NOTHING;

-- ==========================================================================
-- Enable Row Level Security (RLS) & Grant Full Access for Anon/Service
-- ==========================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all public access for users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all public access for products" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all public access for orders" ON public.orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all public access for transactions" ON public.transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all public access for messages" ON public.messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all public access for notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all public access for faqs" ON public.faqs FOR ALL USING (true) WITH CHECK (true);
