-- ==============================================================================
-- SADIK SONS ENTERPRISE — SUPABASE DATABASE SCHEMA
-- Purpose: Real-time cloud mirror for Mobile Binder QR Scans (4G)
-- ==============================================================================

-- 1. Create the Projects Table
CREATE TABLE IF NOT EXISTS public.projects (
    id TEXT PRIMARY KEY,                       -- e.g. 'SS-24-001'
    title TEXT NOT NULL,                       -- e.g. 'Tripoli Commercial Center - HVAC'
    client TEXT NOT NULL,                      -- e.g. 'Al-Naseem Contracting Group'
    site_address TEXT,                         -- e.g. 'Hai Al-Andalus, Tripoli'
    start_date TEXT,                           -- e.g. '15 Mar 2024'
    end_date TEXT,                             -- e.g. '30 Nov 2024'
    contract_amount NUMERIC DEFAULT 0,         -- e.g. 185000
    currency TEXT DEFAULT 'LYD',               -- 'LYD', 'USD', 'EUR'
    paid_amount NUMERIC DEFAULT 0,             -- e.g. 140000
    payment_status TEXT DEFAULT 'Pending',     -- 'Paid', 'Partial', 'Pending', 'Retention Due'
    remarks TEXT,                              -- Field remarks & specifications
    status TEXT DEFAULT 'ACTIVE',              -- 'ACTIVE', 'COMPLETED', 'ARCHIVE'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Public Read-Only Access (For phone QR scans over 4G)
-- Anyone with the link or QR code can read project details without logging in
CREATE POLICY "Allow public read access for mobile scans"
    ON public.projects
    FOR SELECT
    USING (true);

-- 4. Policy: Authorized Insert/Update/Delete (For Desktop App sync)
CREATE POLICY "Allow authenticated full access"
    ON public.projects
    FOR ALL
    USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- ==============================================================================
-- 5. Insert Sample Seed Data for Sadik Sons
-- ==============================================================================
INSERT INTO public.projects (id, title, client, site_address, start_date, end_date, contract_amount, currency, paid_amount, payment_status, remarks, status)
VALUES
    (
        'SS-24-001',
        'Tripoli Commercial Center — HVAC & Piping',
        'Al-Naseem Contracting Group',
        'Hai Al-Andalus, Tripoli, Libya',
        '15 Mar 2024',
        '30 Nov 2024',
        185000,
        'LYD',
        140000,
        'Partial',
        'Phase 1 ducting approved by supervising engineer. Pressure test for chilled water risers completed successfully.',
        'ACTIVE'
    ),
    (
        'SS-24-002',
        'Palm City Luxury Residences — Chiller Overhaul',
        'Palm City Facility Management',
        'Janzour Seaside Road, Tripoli',
        '01 May 2024',
        '15 Dec 2024',
        95000,
        'LYD',
        95000,
        'Paid',
        'Compressor replacement completed on Chiller #2. 12-month preventive maintenance contract signed.',
        'ACTIVE'
    ),
    (
        'SS-23-014',
        'Al-Dahra Substation — Fire Suppression Retrofit',
        'GECOL (General Electric Company)',
        'Al-Dahra Sector, Tripoli',
        '10 Aug 2023',
        '25 Jan 2024',
        320000,
        'LYD',
        288000,
        'Retention Due',
        'Handover certificate issued Jan 2024. 10% retention (32,000 LYD) scheduled for release Dec 2024.',
        'ARCHIVE'
    )
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    client = EXCLUDED.client,
    site_address = EXCLUDED.site_address,
    contract_amount = EXCLUDED.contract_amount,
    paid_amount = EXCLUDED.paid_amount,
    payment_status = EXCLUDED.payment_status,
    remarks = EXCLUDED.remarks,
    updated_at = now();
