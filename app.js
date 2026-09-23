/**
 * Sadik Sons Enterprise — Project Passport Mobile Web Engine
 * 100% Zero-Build, Pure Vanilla JS for Cloudflare Pages
 */

// Supabase Configuration (Optional - Connects live when credentials are set)
const SUPABASE_CONFIG = {
  url: "https://your-project.supabase.co", // Replace with your Supabase URL
  anonKey: "your-anon-key"                 // Replace with your Supabase anon public key
};

// Standard Offline / Fallback Project Registry
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
    payment_status: "Partial", // "Paid", "Partial", "Pending"
    remarks: "Phase 1 ducting approved by supervising engineer. Pressure test for chilled water risers completed successfully.",
    status: "ACTIVE"
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
    status: "ACTIVE"
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
    status: "ARCHIVE"
  },
  {
    id: "SS-23-009",
    title: "Misrata Port Cold Storage Industrial Ventilation",
    client: "Free Zone Logistics Authority",
    site_address: "Misrata Free Zone, Area C",
    start_date: "05 Feb 2023",
    end_date: "18 Oct 2023",
    contract_amount: "410,000",
    currency: "LYD",
    paid_amount: "410,000",
    payment_status: "Paid",
    remarks: "Full commissioning passed. As-built drawings stored in office binder SS-23-009.",
    status: "ARCHIVE"
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
      const endpoint = `${SUPABASE_CONFIG.url}/rest/v1/projects?id=eq.${encodeURIComponent(cleanCode)}&select=*`;
      const response = await fetch(endpoint, {
        headers: {
          "apikey": SUPABASE_CONFIG.anonKey,
          "Authorization": `Bearer ${SUPABASE_CONFIG.anonKey}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          return data[0];
        }
      }
    } catch (err) {
      console.warn("Supabase fetch failed, falling back to local registry:", err);
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
    // Default to the first active project if no code is in the URL
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
    // Update URL without reloading
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
