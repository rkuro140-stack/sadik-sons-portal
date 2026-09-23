# 🔷 Sadik Sons Enterprise — Project & Asset Management System

> **Industrial & MEP Contracting Operations Platform**  
> Integrated Physical Binder Archive, 4G Mobile Passport Scanner & Desktop Office Control Center.

---

## 🚀 Quick Download & Install (Desktop Software)

Install the full Sadik Sons management software on any office computer or laptop in seconds:

[![Download for Windows](https://img.shields.io/badge/Download-Windows_App_(.zip)-1D4ED8?style=for-the-badge&logo=windows&logoColor=white)](https://github.com/rkuro140-stack/sadik-sons-portal/archive/refs/heads/main.zip)
[![Download for macOS](https://img.shields.io/badge/Download-macOS_App_(.zip)-0F172A?style=for-the-badge&logo=apple&logoColor=white)](https://github.com/rkuro140-stack/sadik-sons-portal/archive/refs/heads/main.zip)

### How to Install on Windows:
1. Click the **Download Windows App** button above and extract the zip file.
2. Open the `desktop/` folder.
3. Double-click **`Start_Sadik_Sons_Windows.bat`**.
4. The system automatically launches in native app mode on your desktop!

### How to Install on macOS:
1. Extract the downloaded zip file.
2. Open the `desktop/` folder.
3. Double-click **`Start_Sadik_Sons_Mac.command`**.

---

## 🌐 Live Mobile 4G Scanner (Cloudflare Pages)

[![Cloudflare Pages](https://img.shields.io/badge/Cloudflare_Pages-Live_Portal-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://sadik-sons-portal.pages.dev)

* **Public Web URL:** `https://sadik-sons-portal.pages.dev`
* **Direct Project Lookup:** `https://sadik-sons-portal.pages.dev/?id=SS-24-001`
* **Features:**
  * Ultra-fast load (< 25 KB payload) over 4G/Cellular without needing office Wi-Fi.
  * Displays Project Code, Site Address, Contract Amount, Payment Status, and Remarks.
  * Points to the local desktop archive for confidential CAD drawings and full contracts.

---

## 📁 Standardized 5-Folder Digital Archive

Every project registered in the software automatically creates a standardized folder structure on your local hard drive:

```text
📁 Sadik_Sons_Archive/Projects/[YEAR]/[ID - Project Title]/
   ├── 📁 01_Contracts_and_Agreements/        (Signed contracts, POs, approvals)
   ├── 📁 02_Engineering_Drawings_and_CAD/     (AutoCAD, schematics, as-builts)
   ├── 📁 03_Invoices_and_Financial_Docs/      (Client invoices, payment checks)
   ├── 📁 04_Technical_Specs_and_Spare_Parts/  (Equipment datasheets, catalogs)
   └── 📁 05_Site_Reports_and_Handover/        (Handover certs, site logs)
```

Clicking **"Open Folder on PC"** inside the desktop software launches Windows File Explorer directly into the exact directory!

---

## ☁️ Supabase Cloud Database Setup

To sync your project summaries live to the mobile QR scanner:

1. Create a free project on [Supabase](https://supabase.com).
2. Go to the **SQL Editor**.
3. Copy and run the script from [`supabase/schema.sql`](supabase/schema.sql).
4. Add your Supabase URL and Anon Public Key to `app.js`.

---

## 🛠️ System Architecture

```text
       ┌───────────────────────────────┐        ┌───────────────────────────────┐
       │   💻 DESKTOP OFFICE SYSTEM    │        │   📱 MOBILE 4G PASSPORT       │
       │   (Local SQLite + Hard Drive) │        │   (Cloudflare Pages)          │
       ├───────────────────────────────┤        ├───────────────────────────────┤
       │ • 100% Offline Master         │        │ • Loads in 0.3s on Libyana/   │
       │ • Tool Custody & Checkouts    │        │   Al-Madar 4G                 │
       │ • 5-Folder Dossier Automator  │        │ • Scanned from Binder QR      │
       │ • Prints 50mm/70mm Spines     │        │ • Real-time project status    │
       └───────────────┬───────────────┘        └───────────────▲───────────────┘
                       │                                        │
                       │ Syncs Summaries                        │ Reads Public
                       ▼                                        │ Read-Only
       ┌────────────────────────────────────────────────────────┴───────────────┐
       │                      ☁️ SUPABASE POSTGRESQL                            │
       │   • 100% Free Tier ($0/month forever)                                  │
       │   • Row-Level Security (RLS) protects your data                        │
       └────────────────────────────────────────────────────────────────────────┘
```

---

© 2026 Sadik Sons Industrial & MEP Contracting. All rights reserved.
