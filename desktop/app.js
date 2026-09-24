/**
 * Sadik Sons Enterprise — Desktop Control Engine
 * Connects to local SQLite / Express server on port 3000
 */

let PROJECTS_CACHE = [];
let TOOLS_CACHE = [];
let CURRENT_DOSSIER_ID = null;
let CURRENT_SPINE_CODE = null;

// Initialize on Load
document.addEventListener('DOMContentLoaded', () => {
  loadProjects();
  loadTools();
});

// View Navigation
function switchView(viewName) {
  const views = ['projects', 'dossier', 'spines', 'tools'];
  views.forEach(v => {
    const el = document.getElementById(`view-${v}`);
    const btn = document.getElementById(`nav-btn-${v}`);
    if (el) {
      if (v === viewName) el.classList.remove('hidden');
      else el.classList.add('hidden');
    }
    if (btn) {
      if (v === viewName) {
        btn.className = "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-white text-blue-700 shadow-sm transition";
      } else {
        btn.className = "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:text-slate-900 transition";
      }
    }
  });

  if (viewName === 'spines' && CURRENT_SPINE_CODE) {
    renderSpineView(CURRENT_SPINE_CODE);
  }

  lucide.createIcons();
}

// --- PROJECTS REGISTER & TABLE ---

async function loadProjects() {
  try {
    const res = await fetch('/api/projects');
    if (!res.ok) throw new Error('Failed to fetch projects');
    PROJECTS_CACHE = await res.json();
    renderProjectsTable(PROJECTS_CACHE);
    populateSpineSelect(PROJECTS_CACHE);
  } catch (err) {
    console.error('Projects load error:', err);
  }
}

function renderProjectsTable(projects) {
  const tbody = document.getElementById('projects-table-body');
  if (!tbody) return;

  if (projects.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="py-12 text-center text-slate-400">
          No projects found in local archive database. Click "New Project & Binder" to register one.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = projects.map(p => {
    const amt = Number(p.contract_amount || 0).toLocaleString();
    const curr = p.currency || 'LYD';
    const isPaid = (p.payment_status || '').toLowerCase().includes('paid');
    const isPartial = (p.payment_status || '').toLowerCase().includes('partial');

    let badgeClass = "bg-slate-100 text-slate-700 border-slate-200";
    if (isPaid) badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
    else if (isPartial) badgeClass = "bg-amber-50 text-amber-700 border-amber-200";

    return `
      <tr class="hover:bg-slate-50 transition border-b border-slate-100 cursor-pointer" onclick="openProjectDossier('${p.id}')">
        <td class="py-3 px-4 font-mono font-bold text-blue-700">${p.id}</td>
        <td class="py-3 px-4 font-bold text-slate-900">${p.title}</td>
        <td class="py-3 px-4 text-slate-600 font-medium">${p.client}</td>
        <td class="py-3 px-4 text-slate-500">${p.site_address || '—'}</td>
        <td class="py-3 px-4 text-right font-mono font-bold text-slate-900">${amt} ${curr}</td>
        <td class="py-3 px-4 text-center">
          <span class="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badgeClass}">
            ${p.payment_status || 'Pending'}
          </span>
        </td>
        <td class="py-3 px-4 text-right space-x-1.5" onclick="event.stopPropagation()">
          <button onclick="openProjectDossier('${p.id}')" class="px-2.5 py-1 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded text-[11px] font-bold text-blue-700 transition">
            Dossier
          </button>
          <button onclick="openSpineForProject('${p.id}')" class="px-2.5 py-1 bg-white border border-slate-300 hover:border-blue-600 rounded text-[11px] font-bold text-slate-700 transition">
            Spine
          </button>
          <button onclick="openProjectFolder('${p.id}')" class="px-2.5 py-1 bg-white border border-slate-300 hover:border-slate-600 rounded text-[11px] font-bold text-slate-700 transition">
            Folder
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function filterProjectsTable() {
  const query = document.getElementById('project-search-input').value.trim().toLowerCase();
  const statusFilter = document.getElementById('status-filter').value;

  const filtered = PROJECTS_CACHE.filter(p => {
    const matchesQuery = (
      p.id.toLowerCase().includes(query) ||
      p.title.toLowerCase().includes(query) ||
      p.client.toLowerCase().includes(query) ||
      (p.site_address && p.site_address.toLowerCase().includes(query))
    );

    const matchesStatus = (statusFilter === 'ALL' || (p.status || 'ACTIVE').toUpperCase() === statusFilter);

    return matchesQuery && matchesStatus;
  });

  renderProjectsTable(filtered);
}

// --- PROJECT DOSSIER & DOCUMENT MANAGER ---

async function openProjectDossier(projectId) {
  CURRENT_DOSSIER_ID = projectId;
  const project = PROJECTS_CACHE.find(p => p.id === projectId);
  if (!project) return;

  document.getElementById('dossier-code').textContent = project.id;
  document.getElementById('dossier-title').textContent = project.title;
  document.getElementById('dossier-client').textContent = `Client: ${project.client} • Location: ${project.site_address || 'Tripoli'}`;
  document.getElementById('dossier-status').textContent = project.status || 'ACTIVE';

  // Calculate & Display Financials
  const contractVal = Number(project.contract_amount || 0);
  const paidVal = Number(project.paid_amount || 0);
  const remainingVal = Math.max(0, contractVal - paidVal);
  const curr = project.currency || 'LYD';

  document.getElementById('dossier-contract-val').textContent = `${contractVal.toLocaleString()} ${curr}`;
  document.getElementById('dossier-paid-val').textContent = `${paidVal.toLocaleString()} ${curr}`;
  document.getElementById('dossier-remaining-val').textContent = `${remainingVal.toLocaleString()} ${curr}`;

  // Fetch Documents
  await loadProjectDocuments(projectId);

  switchView('dossier');
}

async function loadProjectDocuments(projectId) {
  try {
    const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/documents`);
    if (!res.ok) throw new Error('Failed to load documents');
    const docs = await res.json();
    renderDossierDocs(docs);
  } catch (err) {
    console.error('Error loading documents:', err);
  }
}

function renderDossierDocs(docs) {
  const tbody = document.getElementById('dossier-docs-tbody');
  const countLabel = document.getElementById('dossier-doc-count');
  if (!tbody) return;

  countLabel.textContent = `${docs.length} Document${docs.length === 1 ? '' : 's'}`;

  if (docs.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="py-8 text-center text-slate-400 text-xs">
          No files filed in this binder yet. Click "Add / Upload File" above.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = docs.map(d => {
    const amountDisplay = d.amount > 0 ? `${Number(d.amount).toLocaleString()} LYD` : '—';
    return `
      <tr class="hover:bg-slate-50 transition border-b border-slate-100">
        <td class="py-3 px-4 font-semibold text-slate-900 font-mono text-[11px]">${d.filename}</td>
        <td class="py-3 px-4">
          <span class="px-2 py-0.5 rounded bg-slate-100 font-bold text-[10px] text-slate-700">${d.category}</span>
        </td>
        <td class="py-3 px-4 text-slate-500 font-mono text-[11px]">${d.file_date || '—'}</td>
        <td class="py-3 px-4 text-right font-mono font-bold text-slate-800">${amountDisplay}</td>
        <td class="py-3 px-4 text-slate-600 text-xs">${d.notes || '—'}</td>
        <td class="py-3 px-4 text-right">
          <button onclick="deleteDocument(${d.id})" class="text-slate-400 hover:text-rose-600 text-xs font-bold transition">Delete</button>
        </td>
      </tr>
    `;
  }).join('');
}

// Modal: Add Document
function openAddDocumentModal() {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('form-doc-date').value = today;
  document.getElementById('form-doc-category').value = 'Payment / Invoice';
  const customInput = document.getElementById('form-doc-category-custom');
  if (customInput) {
    customInput.value = '';
    customInput.classList.add('hidden');
  }
  document.getElementById('modal-document').classList.remove('hidden');
  lucide.createIcons();
}

function closeAddDocumentModal() {
  document.getElementById('modal-document').classList.add('hidden');
  document.getElementById('document-form').reset();
  const customInput = document.getElementById('form-doc-category-custom');
  if (customInput) {
    customInput.value = '';
    customInput.classList.add('hidden');
  }
}

function handleCategorySelection(category) {
  const customInput = document.getElementById('form-doc-category-custom');
  const container = document.getElementById('doc-amount-container');
  if (category === '__custom__') {
    if (customInput) {
      customInput.classList.remove('hidden');
      customInput.focus();
    }
    if (container) container.classList.remove('opacity-50');
  } else {
    if (customInput) {
      customInput.classList.add('hidden');
    }
    if (container) {
      if (category.toLowerCase().includes('payment') || category.toLowerCase().includes('invoice') || category.toLowerCase().includes('advance')) {
        container.classList.remove('opacity-50');
      } else {
        container.classList.add('opacity-50');
      }
    }
  }
}

async function handleDocumentSubmit(e) {
  e.preventDefault();
  if (!CURRENT_DOSSIER_ID) return;

  let selectedCategory = document.getElementById('form-doc-category').value;
  if (selectedCategory === '__custom__') {
    const customVal = document.getElementById('form-doc-category-custom').value.trim();
    selectedCategory = customVal || 'General Document';
  }

  const doc = {
    category: selectedCategory,
    filename: document.getElementById('form-doc-filename').value.trim(),
    fileDate: document.getElementById('form-doc-date').value.trim(),
    amount: parseFloat(document.getElementById('form-doc-amount').value) || 0,
    notes: document.getElementById('form-doc-notes').value.trim()
  };

  try {
    const res = await fetch(`/api/projects/${encodeURIComponent(CURRENT_DOSSIER_ID)}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doc)
    });

    if (!res.ok) throw new Error('Failed to attach document');
    closeAddDocumentModal();

    // Reload projects to update financial calculations, then refresh dossier
    await loadProjects();
    await openProjectDossier(CURRENT_DOSSIER_ID);
  } catch (err) {
    alert(`Error: ${err.message}`);
  }
}

async function deleteDocument(docId) {
  if (!confirm('Are you sure you want to remove this document record from the binder?')) return;
  try {
    const res = await fetch(`/api/documents/${docId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete document');
    await loadProjects();
    await openProjectDossier(CURRENT_DOSSIER_ID);
  } catch (err) {
    alert(`Error: ${err.message}`);
  }
}

function openSpineForCurrentProject() {
  if (CURRENT_DOSSIER_ID) {
    openSpineForProject(CURRENT_DOSSIER_ID);
  }
}

function openCurrentProjectFolder() {
  if (CURRENT_DOSSIER_ID) {
    openProjectFolder(CURRENT_DOSSIER_ID);
  }
}

// --- PROJECT CREATION & DIRECT SPINE PRINT PROTOCOL ---

function openNewProjectModal() {
  // Suggest next code based on current count
  const yearShort = new Date().getFullYear().toString().slice(-2);
  const nextNum = String(PROJECTS_CACHE.length + 1).padStart(3, '0');
  document.getElementById('form-proj-id').value = `SS-${yearShort}-${nextNum}`;
  document.getElementById('modal-project').classList.remove('hidden');
  lucide.createIcons();
}

function closeProjectModal() {
  document.getElementById('modal-project').classList.add('hidden');
  document.getElementById('project-form').reset();
}

async function handleProjectSubmit(e) {
  e.preventDefault();

  const newProject = {
    id: document.getElementById('form-proj-id').value.trim().toUpperCase(),
    title: document.getElementById('form-proj-title').value.trim(),
    client: document.getElementById('form-proj-client').value.trim(),
    site_address: document.getElementById('form-proj-site').value.trim(),
    start_date: document.getElementById('form-proj-start').value.trim(),
    end_date: document.getElementById('form-proj-end').value.trim(),
    contract_amount: parseFloat(document.getElementById('form-proj-amount').value) || 0,
    currency: document.getElementById('form-proj-currency').value,
    payment_status: document.getElementById('form-proj-payment').value,
    status: document.getElementById('form-proj-status').value,
    remarks: document.getElementById('form-proj-remarks').value.trim()
  };

  try {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProject)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create project');

    closeProjectModal();
    await loadProjects();

    // PROTOCOL STEP: Immediately open the Spine Label Print Generator for this new project!
    openSpineForProject(newProject.id);
  } catch (err) {
    alert(`Error: ${err.message}`);
  }
}

// --- FOLDER LAUNCHERS ---

async function openProjectFolder(projectId) {
  try {
    const res = await fetch('/api/projects/open-folder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: projectId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not open directory');
  } catch (err) {
    alert(`Could not launch folder: ${err.message}`);
  }
}

async function openArchiveFolderRoot() {
  try {
    await fetch('/api/projects/open-folder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'ROOT' })
    });
  } catch (err) {
    console.warn(err);
  }
}

// --- BINDER SPINE GENERATOR ---

function populateSpineSelect(projects) {
  const select = document.getElementById('spine-project-select');
  if (!select) return;
  select.innerHTML = projects.map(p => `
    <option value="${p.id}">${p.id} — ${p.title.slice(0, 35)}</option>
  `).join('');

  if (projects.length > 0 && !CURRENT_SPINE_CODE) {
    CURRENT_SPINE_CODE = projects[0].id;
    renderSpineView(CURRENT_SPINE_CODE);
  }
}

function openSpineForProject(code) {
  CURRENT_SPINE_CODE = code;
  const select = document.getElementById('spine-project-select');
  if (select) select.value = code;
  switchView('spines');
  renderSpineView(code);
}

function renderSpineView(code) {
  CURRENT_SPINE_CODE = code;
  const project = PROJECTS_CACHE.find(p => p.id === code);
  if (!project) return;

  document.getElementById('spine-display-code').textContent = project.id;
  document.getElementById('spine-display-title').textContent = project.title;
  document.getElementById('spine-display-client').textContent = `Client: ${project.client}`;

  const qrBox = document.getElementById('spine-qrcode-box');
  qrBox.innerHTML = '';

  const mobileScanUrl = `https://sadik-sons-portal.pages.dev/?id=${encodeURIComponent(project.id)}`;

  try {
    if (typeof QRCode !== 'undefined') {
      new QRCode(qrBox, {
        text: mobileScanUrl,
        width: 88,
        height: 88,
        colorDark: '#0F172A',
        colorLight: '#FFFFFF',
        correctLevel: typeof QRCode.CorrectLevel !== 'undefined' ? QRCode.CorrectLevel.M : 0
      });
    } else {
      const img = document.createElement('img');
      img.src = `https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${encodeURIComponent(mobileScanUrl)}`;
      img.alt = 'QR Code';
      img.className = 'w-full h-full object-contain';
      qrBox.appendChild(img);
    }
  } catch (err) {
    console.warn('QR render notice:', err);
    const img = document.createElement('img');
    img.src = `https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${encodeURIComponent(mobileScanUrl)}`;
    img.alt = 'QR Code';
    img.className = 'w-full h-full object-contain';
    qrBox.appendChild(img);
  }
}

function updateSpineWidth(widthMm) {
  const container = document.getElementById('printable-spine-container');
  if (!container) return;
  if (widthMm === '70') {
    container.className = "bg-white border-2 border-slate-900 rounded-lg p-8 shadow-xl flex items-center justify-between gap-8 w-full max-w-3xl";
  } else {
    container.className = "bg-white border-2 border-slate-900 rounded-lg p-6 shadow-xl flex items-center justify-between gap-8 w-full max-w-2xl";
  }
}

// --- TOOLS CUSTODY ---

async function loadTools() {
  try {
    const res = await fetch('/api/tools');
    if (!res.ok) return;
    TOOLS_CACHE = await res.json();
    renderToolsTable(TOOLS_CACHE);
  } catch (err) {
    console.warn('Tools load notice:', err);
  }
}

function renderToolsTable(tools) {
  const tbody = document.getElementById('tools-table-body');
  if (!tbody) return;

  tbody.innerHTML = tools.map(t => {
    const isField = t.status === 'checked_out';
    const statusBadge = isField 
      ? '<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">IN FIELD</span>'
      : '<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">AVAILABLE</span>';

    return `
      <tr class="hover:bg-slate-50 transition border-b border-slate-100">
        <td class="py-3 px-4 font-mono font-bold text-blue-700">${t.code || t.id}</td>
        <td class="py-3 px-4 font-bold text-slate-900">${t.name}</td>
        <td class="py-3 px-4 text-slate-600">${t.brand} ${t.model || ''}</td>
        <td class="py-3 px-4 text-slate-500">${t.assignedSite || 'Main Tool Crib'}</td>
        <td class="py-3 px-4 text-slate-700 font-medium">${t.assignedTo || '—'}</td>
        <td class="py-3 px-4 text-center">${statusBadge}</td>
      </tr>
    `;
  }).join('');
}

// --- CLOUD SYNC ---

async function triggerCloudSync() {
  const label = document.getElementById('sync-status-label');
  label.textContent = "Syncing...";
  try {
    const res = await fetch('/api/sync-cloud', { method: 'POST' });
    const data = await res.json();
    if (data && data.success) {
      label.textContent = `Synced (${data.projectsSynced}p, ${data.docsSynced}d)`;
    } else {
      label.textContent = "Synced";
    }
  } catch (err) {
    label.textContent = "Offline";
  }
  setTimeout(() => {
    label.textContent = "Sync Cloud QR";
  }, 3500);
}
