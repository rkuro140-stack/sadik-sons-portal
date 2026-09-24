# Sadik Sons Enterprise — Project & Archive Management System

> **Industrial & MEP Contracting Operations Platform**  
> Physical Binder Archive Tracking, 4G Mobile Passport Scanner & Desktop Office Control Center.

---

## Desktop Software Download & Installation

Deploy the complete Sadik Sons office management system to any computer or laptop:

[![Download for Windows](https://img.shields.io/badge/Download-Windows_Package_(.zip)-1D4ED8?style=for-the-badge&logo=windows&logoColor=white)](https://github.com/rkuro140-stack/sadik-sons-portal/archive/refs/heads/main.zip)
[![Download for macOS](https://img.shields.io/badge/Download-macOS_Package_(.zip)-0F172A?style=for-the-badge&logo=apple&logoColor=white)](https://github.com/rkuro140-stack/sadik-sons-portal/archive/refs/heads/main.zip)

### Windows Setup Instructions:
1. Download the Windows package using the button above and extract the zip archive.
2. Navigate into the `desktop/` directory.
3. Double-click **`Start_Sadik_Sons_Windows.bat`**.
4. The system initializes the local SQLite database and launches in native app mode.

### macOS Setup Instructions:
1. Extract the downloaded zip archive.
2. Navigate into the `desktop/` directory.
3. Double-click **`Start_Sadik_Sons_Mac.command`**.

---

## Cloudflare Pages Mobile 4G Scanner

[![Cloudflare Pages](https://img.shields.io/badge/Cloudflare_Pages-Live_Portal-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://sadik-sons-portal.pages.dev)

* **Public Portal URL:** `https://sadik-sons-portal.pages.dev`
* **Direct Project Passport:** `https://sadik-sons-portal.pages.dev/?id=SS-24-001`
* **Operational Capabilities:**
  * Sub-second load time over 4G / cellular connections without office Wi-Fi requirements.
  * Real-time metadata: Project Code, Site Address, Contract Amount, Payment Status, and Field Remarks.
  * Security protection: Sensitive AutoCAD files and confidential contracts remain strictly on the office local storage.

---

## Standardized 5-Folder Digital Archive

Every project registered in the system automatically provisions a standardized dossier on local storage:

```text
Sadik_Sons_Archive/Projects/[YEAR]/[ID - Project Title]/
├── 01_Contracts_and_Agreements/        (Signed contracts, POs, approvals)
├── 02_Engineering_Drawings_and_CAD/     (AutoCAD, schematics, as-builts)
├── 03_Invoices_and_Financial_Docs/      (Client invoices, payment checks)
├── 04_Technical_Specs_and_Spare_Parts/  (Equipment datasheets, catalogs)
└── 05_Site_Reports_and_Handover/        (Handover certs, site logs)
```

The desktop application provides a single-click action to reveal this directory in Windows File Explorer or Mac Finder.

---

## Supabase Cloud Database Setup

To enable real-time synchronization between the office desktop and mobile QR scans:

1. Create a project at [Supabase](https://supabase.com).
2. Access the **SQL Editor**.
3. Execute the migration script from [`supabase/schema.sql`](supabase/schema.sql).
4. Configure the Project URL and Anonymous Public Key in `app.js`.

---

## Architecture Blueprint

```text
       ┌───────────────────────────────┐        ┌───────────────────────────────┐
       │     DESKTOP OFFICE SYSTEM     │        │     MOBILE 4G PASSPORT        │
       │   (Local SQLite + Hard Drive) │        │   (Cloudflare Pages)          │
       ├───────────────────────────────┤        ├───────────────────────────────┤
       │ • Offline Master Database     │        │ • Sub-second 4G load          │
       │ • Tool Custody Ledger         │        │ • Scanned from Binder QR      │
       │ • 5-Folder Dossier Automator  │        │ • Real-time project status    │
       │ • Prints 50mm/70mm Spines     │        │ • Zero local Wi-Fi dependency │
       └───────────────┬───────────────┘        └───────────────▲───────────────┘
                       │                                        │
                       │ Syncs Summaries                        │ Reads Public
                       ▼                                        │ Read-Only
       ┌────────────────────────────────────────────────────────┴───────────────┐
       │                       SUPABASE POSTGRESQL                              │
       │   • Cloud synchronization tier                                         │
       │   • Row-Level Security (RLS) policies                                  │
       └────────────────────────────────────────────────────────────────────────┘
```

---

© 2026 Sadik Sons Industrial & MEP Contracting. All rights reserved.
