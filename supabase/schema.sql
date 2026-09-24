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

-- 2. Create the Project Documents Table (Filed in Binders)
CREATE TABLE IF NOT EXISTS public.project_documents (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    project_id TEXT REFERENCES public.projects(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    category TEXT NOT NULL,                    -- 'Tender / Contract', 'Drawing / CAD', 'Payment / Invoice', 'Packing List', 'Site Report'
    file_date TEXT,
    amount NUMERIC DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;

-- 4. Policies: Public Read-Only Access (For phone QR scans over 4G)
CREATE POLICY "Allow public read access for projects"
    ON public.projects FOR SELECT USING (true);

CREATE POLICY "Allow public read access for documents"
    ON public.project_documents FOR SELECT USING (true);

-- 5. Policies: Authorized Full Access (For Desktop App sync)
CREATE POLICY "Allow authenticated full access to projects"
    ON public.projects FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Allow authenticated full access to documents"
    ON public.project_documents FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- ==============================================================================
-- 6. Insert Seed Data
-- ==============================================================================
INSERT INTO public.projects (id, title, client, site_address, start_date, end_date, contract_amount, currency, paid_amount, payment_status, remarks, status)
VALUES
    ('SS-24-001', 'Tripoli Commercial Center — HVAC & Piping', 'Al-Naseem Contracting Group', 'Hai Al-Andalus, Tripoli, Libya', '15 Mar 2024', '30 Nov 2024', 185000, 'LYD', 140000, 'Partial', 'Phase 1 ducting approved by supervising engineer.', 'ACTIVE'),
    ('SS-24-002', 'Palm City Luxury Residences — Chiller Overhaul', 'Palm City Facility Management', 'Janzour Seaside Road, Tripoli', '01 May 2024', '15 Dec 2024', 95000, 'LYD', 95000, 'Paid', 'Compressor replacement completed on Chiller #2.', 'ACTIVE'),
    ('SS-23-014', 'Al-Dahra Substation — Fire Suppression Retrofit', 'GECOL (General Electric Company)', 'Al-Dahra Sector, Tripoli', '10 Aug 2023', '25 Jan 2024', 320000, 'LYD', 288000, 'Retention Due', 'Handover certificate issued Jan 2024.', 'ARCHIVE')
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    client = EXCLUDED.client,
    site_address = EXCLUDED.site_address,
    contract_amount = EXCLUDED.contract_amount,
    paid_amount = EXCLUDED.paid_amount,
    payment_status = EXCLUDED.payment_status,
    remarks = EXCLUDED.remarks,
    updated_at = now();

INSERT INTO public.project_documents (project_id, filename, category, file_date, amount, notes)
VALUES
    ('SS-24-001', 'Tender_Offer_Signed_AlNaseem.pdf', 'Tender / Contract', '15 Mar 2024', 185000, 'Signed commercial offer'),
    ('SS-24-001', 'HVAC_Shop_Drawings_Rev2.dwg', 'Drawing / CAD', '04 Apr 2024', 0, 'Approved by supervising consultant'),
    ('SS-24-001', 'Invoice_Advance_Payment_01.pdf', 'Payment / Invoice', '18 Apr 2024', 50000, 'Mobilization advance check'),
    ('SS-24-001', 'Packing_List_Chiller_Valves_PL409.pdf', 'Packing List', '12 Jun 2024', 0, 'Italian valves customs cleared'),
    ('SS-24-001', 'Invoice_Interim_Payment_02.pdf', 'Payment / Invoice', '20 Jul 2024', 90000, 'Chiller piping milestone paid'),
    ('SS-24-002', 'Maintenance_Agreement_Signed.pdf', 'Tender / Contract', '01 May 2024', 95000, '12-month preventive contract'),
    ('SS-24-002', 'Full_Payment_Receipt.pdf', 'Payment / Invoice', '15 May 2024', 95000, '100% upfront bank transfer'),
    ('SS-23-014', 'GECOL_Award_Letter_Contract.pdf', 'Tender / Contract', '10 Aug 2023', 320000, 'Official ministry contract'),
    ('SS-23-014', 'Progress_Invoice_01_and_02.pdf', 'Payment / Invoice', '15 Dec 2023', 288000, '90% milestones paid');
