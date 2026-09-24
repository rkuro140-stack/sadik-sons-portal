/**
 * Sadik Sons Enterprise — Project Passport Mobile Web Engine
 * 100% Zero-Build, Pure Vanilla JS for Cloudflare Pages
 */

// Supabase Configuration (Connected to live Sadik Sons cloud database)
const SUPABASE_CONFIG = {
  url: "https://lmkijjefxyyyfjbjuxlk.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxta2lqamVmeHl5eWZqYmp1eGxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyNDQ3OTUsImV4cCI6MjEwNTgyMDc5NX0.sXOFtHhpvMYuZWwGattFn6FOqu_wCAXEp1AmNhHasqk"
};

// Standard Offline / Fallback Project Registry with Filed Documents
const LOCAL_REGISTRY = [
  {
    id: "SS-24-001",
    title: "Tripoli Commercial Center — HVAC & Piping",
    client: "Al-Naseem Contracting Group",
    site_address: "Hai Al-Andalus, Tripoli, Libya",
    start_date: "15 Mar 2024",
    end_date: "30 Nov 2024",
    contract_amount: "185,000",
    currency: "LYD",
    paid_amount: "140,000",
    payment_status: "Partial",
    remarks: "Phase 1 ducting approved by supervising engineer. Pressure test for chilled water risers completed successfully.",
    status: "ACTIVE",
    documents: [
      { filename: "Tender_Offer_Signed_AlNaseem.pdf", category: "Tender / Contract", file_date: "15 Mar 2024", amount: 185000, notes: "Signed commercial offer" },
      { filename: "HVAC_Shop_Drawings_Rev2.dwg", category: "Drawing / CAD", file_date: "04 Apr 2024", amount: 0, notes: "Approved by supervising consultant" },
      { filename: "Invoice_Advance_Payment_01.pdf", category: "Payment / Invoice", file_date: "18 Apr 2024", amount: 50000, notes: "Mobilization advance check" },
      { filename: "Packing_List_Chiller_Valves_PL409.pdf", category: "Packing List", file_date: "12 Jun 2024", amount: 0, notes: "Italian valves customs cleared" },
      { filename: "Invoice_Interim_Payment_02.pdf", category: "Payment / Invoice", file_date: "20 Jul 2024", amount: 90000, notes: "Chiller piping milestone paid" }
    ]
  },
  {
    id: "SS-24-002",
    title: "Palm City Luxury Residences — Chiller Overhaul",
    client: "Palm City Facility Management",
    site_address: "Janzour Seaside Road, Tripoli",
    start_date: "01 May 2024",
    end_date: "15 Dec 2024",
    contract_amount: "95,000",
    currency: "LYD",
    paid_amount: "95,000",
    payment_status: "Paid",
    remarks: "Compressor replacement completed on Chiller #2. 12-month preventive maintenance contract signed.",
    status: "ACTIVE",
    documents: [
      { filename: "Maintenance_Agreement_Signed.pdf", category: "Tender / Contract", file_date: "01 May 2024", amount: 95000, notes: "12-month preventive contract" },
      { filename: "Full_Payment_Receipt.pdf", category: "Payment / Invoice", file_date: "15 May 2024", amount: 95000, notes: "100% upfront bank transfer" }
    ]
  },
  {
    id: "SS-23-014",
    title: "Al-Dahra Substation — Fire Suppression Retrofit",
    client: "GECOL (General Electric Company)",
    site_address: "Al-Dahra Sector, Tripoli",
    start_date: "10 Aug 2023",
    end_date: "25 Jan 2024",
    contract_amount: "320,000",
    currency: "LYD",
    paid_amount: "288,000",
    payment_status: "Retention Due",
    remarks: "Handover certificate issued Jan 2024. 10% retention (32,000 LYD) scheduled for release Dec 2024.",
    status: "ARCHIVE",
    documents: [
      { filename: "GECOL_Award_Letter_Contract.pdf", category: "Tender / Contract", file_date: "10 Aug 2023", amount: 320000, notes: "Official ministry contract" },
      { filename: "Progress_Invoice_01_and_02.pdf", category: "Payment / Invoice", file_date: "15 Dec 2023", amount: 288000, notes: "90% milestones paid" }
    ]
  }
];

// DOM Elements
const loadingSpinner = document.getElementById("loading-spinner");
const projectCard = document.getElementById("project-card");
const notFoundCard = document.getElementById("not-found-card");
const projectMiniList = document.getElementById("project-mini-list");
const codeInput = document.getElementById("project-code-input");
const lookupBtn = document.getElementById("lookup-btn");

// Displays
const displayCode = document.getElementById("display-code");
const displayStatus = document.getElementById("display-status");
const statusPill = document.getElementById("status-pill");
const displayTitle = document.getElementById("display-title");
const displayClient = document.getElementById("display-client");
const displaySite = document.getElementById("display-site");
const displayStart = document.getElementById("display-start");
const displayEnd = document.getElementById("display-end");
const displayPaymentBadge = document.getElementById("display-payment-badge");
const displayContractAmt = document.getElementById("display-contract-amt");
const displayPaidAmt = document.getElementById("display-paid-amt");
const financeProgressBar = document.getElementById("finance-progress-bar");
const displayFinSubtext = document.getElementById("display-fin-subtext");
const displayRemarks = document.getElementById("display-remarks");
const displayDocsList = document.getElementById("display-docs-list");
const noticeCode = document.getElementById("notice-code");
const missingCodeText = document.getElementById("missing-code-text");

// Extract Project ID from URL query (?id=...) or hash (#SS-24-001)
function getTargetProjectId() {
  const urlParams = new URLSearchParams(window.location.search);
  const idQuery = urlParams.get("id") || urlParams.get("code") || urlParams.get("p");
  if (idQuery) return idQuery.trim().toUpperCase();

  const hash = window.location.hash.replace("#", "").trim();
  if (hash) return hash.toUpperCase();

  return null;
}

// Fetch project data (tries Supabase first, falls back to local registry)
async function fetchProject(projectCode) {
  const cleanCode = projectCode.trim().toUpperCase();

  // 1. Try Supabase if configured with real project
  if (SUPABASE_CONFIG.url && !SUPABASE_CONFIG.url.includes("your-project") && SUPABASE_CONFIG.anonKey !== "your-anon-key") {
    try {
      const endpoint = `${SUPABASE_CONFIG.url}/rest/v1/projects?id=eq.${encodeURIComponent(cleanCode)}&select=*,project_documents(*)`;
      const response = await fetch(endpoint, {
        headers: {
          "apikey": SUPABASE_CONFIG.anonKey,
          "Authorization": `Bearer ${SUPABASE_CONFIG.anonKey}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          const p = data[0];
          return {
            ...p,
            documents: p.project_documents || []
          };
        }
      }
    } catch (err) {
      console.warn("Supabase fetch notice:", err);
    }
  }

  // 2. Fallback to Local Registry
  const match = LOCAL_REGISTRY.find(p => p.id.toUpperCase() === cleanCode);
  return match || null;
}

// Render Project Card
function renderProject(project) {
  loadingSpinner.style.display = "none";
  notFoundCard.style.display = "none";
  projectCard.style.display = "flex";

  displayCode.textContent = project.id;
  noticeCode.textContent = project.id;
  displayTitle.textContent = project.title;
  displayClient.textContent = project.client;
  displaySite.textContent = project.site_address;
  displayStart.textContent = project.start_date || "—";
  displayEnd.textContent = project.end_date || "—";
  displayRemarks.textContent = project.remarks || "No specific field remarks recorded.";

  // Status Styling
  const status = (project.status || "ACTIVE").toUpperCase();
  displayStatus.textContent = status;
  if (status === "ACTIVE") {
    statusPill.style.background = "#ECFDF5";
    statusPill.style.color = "#10B981";
    statusPill.style.borderColor = "#A7F3D0";
  } else {
    statusPill.style.background = "#F1F5F9";
    statusPill.style.color = "#475569";
    statusPill.style.borderColor = "#CBD5E1";
  }

  // Financial Calculations
  const curr = project.currency || "LYD";
  const contractVal = parseFloat(String(project.contract_amount).replace(/,/g, "")) || 0;
  const paidVal = parseFloat(String(project.paid_amount).replace(/,/g, "")) || 0;
  const remaining = Math.max(0, contractVal - paidVal);
  const percentage = contractVal > 0 ? Math.min(100, Math.round((paidVal / contractVal) * 100)) : 0;

  displayContractAmt.textContent = `${contractVal.toLocaleString()} ${curr}`;
  displayPaidAmt.textContent = `${paidVal.toLocaleString()} ${curr}`;
  financeProgressBar.style.width = `${percentage}%`;

  // Payment Badge & Subtext
  const paymentState = project.payment_status || (percentage >= 100 ? "Paid" : percentage > 0 ? "Partial" : "Pending");
  displayPaymentBadge.textContent = paymentState.toUpperCase();

  if (paymentState.toLowerCase().includes("paid") || percentage >= 100) {
    displayPaymentBadge.style.background = "#ECFDF5";
    displayPaymentBadge.style.color = "#10B981";
    displayPaymentBadge.style.borderColor = "#A7F3D0";
    displayFinSubtext.textContent = `Paid in Full (${percentage}%) • Zero Outstanding Balance`;
    financeProgressBar.style.background = "#10B981";
  } else if (paymentState.toLowerCase().includes("partial") || (percentage > 0 && percentage < 100)) {
    displayPaymentBadge.style.background = "#FFFBEB";
    displayPaymentBadge.style.color = "#D97706";
    displayPaymentBadge.style.borderColor = "#FDE68A";
    displayFinSubtext.textContent = `Remaining Balance: ${remaining.toLocaleString()} ${curr} (${percentage}% collected)`;
    financeProgressBar.style.background = "#1D4ED8";
  } else {
    displayPaymentBadge.style.background = "#FEF2F2";
    displayPaymentBadge.style.color = "#DC2626";
    displayPaymentBadge.style.borderColor = "#FECACA";
    displayFinSubtext.textContent = `Pending Advance Payment • ${contractVal.toLocaleString()} ${curr} Due`;
    financeProgressBar.style.background = "#EF4444";
  }

  // Render Filed Documents List in this Binder
  const docs = project.documents || [];
  if (displayDocsList) {
    if (docs.length === 0) {
      displayDocsList.innerHTML = `<p class="text-xs text-slate-400 py-2">No documents filed in this binder yet.</p>`;
    } else {
      displayDocsList.innerHTML = docs.map(d => {
        const amtStr = d.amount > 0 ? `<span class="doc-amount">${Number(d.amount).toLocaleString()} ${curr}</span>` : '';
        return `
          <div class="doc-item-row">
            <div class="doc-item-header">
              <span class="doc-name">${d.filename}</span>
              <span class="doc-tag">${d.category}</span>
            </div>
            <div class="doc-meta-row">
              <span>Filed: ${d.file_date || '—'} ${d.notes ? '• ' + d.notes : ''}</span>
              ${amtStr}
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // Smooth scroll to card
  projectCard.scrollIntoView({ behavior: "smooth", block: "start" });
}

// Render Not Found
function renderNotFound(code) {
  loadingSpinner.style.display = "none";
  projectCard.style.display = "none";
  notFoundCard.style.display = "block";
  missingCodeText.textContent = code;
}

// Render Mini Directory List
function renderDirectoryList() {
  projectMiniList.innerHTML = "";
  LOCAL_REGISTRY.forEach(p => {
    const card = document.createElement("div");
    card.className = "mini-card";
    card.onclick = () => loadProject(p.id);

    const isPaid = (p.payment_status || "").toLowerCase().includes("paid");

    card.innerHTML = `
      <div class="mini-info">
        <span class="mini-code">${p.id}</span>
        <span class="mini-title">${p.title}</span>
        <span class="mini-meta">${p.client} • ${p.site_address.split(",")[0]}</span>
      </div>
      <span class="mini-status" style="background:${isPaid ? '#ECFDF5' : '#FFFBEB'}; color:${isPaid ? '#10B981' : '#D97706'};">
        ${p.payment_status || "Active"}
      </span>
    `;
    projectMiniList.appendChild(card);
  });
}

// Main Load Function
async function loadProject(code) {
  if (!code) {
    code = LOCAL_REGISTRY[0].id;
  }

  loadingSpinner.style.display = "flex";
  projectCard.style.display = "none";
  notFoundCard.style.display = "none";
  codeInput.value = code;

  const project = await fetchProject(code);
  if (project) {
    renderProject(project);
  } else {
    renderNotFound(code);
  }
}

// Event Listeners
lookupBtn.addEventListener("click", () => {
  const code = codeInput.value.trim();
  if (code) {
    const newUrl = `${window.location.pathname}?id=${encodeURIComponent(code)}`;
    window.history.pushState({ path: newUrl }, "", newUrl);
    loadProject(code);
  }
});

codeInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    lookupBtn.click();
  }
});

// Initialize on page load
window.addEventListener("DOMContentLoaded", () => {
  renderDirectoryList();
  const initialId = getTargetProjectId();
  loadProject(initialId);
});
