/**
 * Sadik Sons Enterprises — Desktop Control Engine
 * Connects to local server and desktop native APIs
 */

let PROJECTS_CACHE = [];
let TOOLS_CACHE = [];
let CURRENT_DOSSIER_ID = null;
let CURRENT_DOSSIER_DOCS = [];
let CURRENT_SPINE_CODE = null;
let CONFIRM_CALLBACK = null;

// Initialize on Load
document.addEventListener('DOMContentLoaded', () => {
  loadProjects();
  loadTools();
  loadSystemInfo();

  // Close menus on outside click
  document.addEventListener('click', (e) => {
    const container = document.getElementById('db-dropdown-container');
    const menu = document.getElementById('data-dropdown-menu');
    if (container && menu && !container.contains(e.target)) {
      menu.classList.add('hidden');
    }
  });
});

async function loadSystemInfo() {
  try {
    const res = await fetch('/api/info');
    if (!res.ok) return;
    const info = await res.json();
    const dbLabel = document.getElementById('footer-db-label');
    const pathLabel = document.getElementById('footer-archive-label');
    if (dbLabel && info.fileName) dbLabel.textContent = `${info.fileName} (${info.engine})`;
    if (pathLabel && info.archivePath) pathLabel.textContent = `${info.archivePath}`;
  } catch (e) {}
}

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

// --- DATA OPTIONS MENU ---

function toggleDataMenu() {
  const menu = document.getElementById('data-dropdown-menu');
  if (menu) menu.classList.toggle('hidden');
}

function closeDataMenu() {
  const menu = document.getElementById('data-dropdown-menu');
  if (menu) menu.classList.add('hidden');
}

function downloadBackup() {
  const a = document.createElement('a');
  a.href = '/api/backup';
  a.setAttribute('download', `sadik_sons_backup_${new Date().toISOString().split('T')[0]}`);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function promptClearDemoData() {
  showConfirmModal(
    'Clear All Demo Projects?',
    'This will remove all sample projects and documents from your database so you can start completely fresh with your real company contracts. This action cannot be undone.',
    async () => {
      try {
        const res = await fetch('/api/system/clear-demo', { method: 'POST' });
        if (!res.ok) throw new Error('Failed to clear database');
        await loadProjects();
        switchView('projects');
      } catch (err) {
        alert(`Error clearing data: ${err.message}`);
      }
    }
  );
}

function promptResetDemoData() {
  showConfirmModal(
    'Restore Sample Projects?',
    'This will reload the default Sadik Sons Enterprises sample projects for demonstration purposes.',
    async () => {
      try {
        const res = await fetch('/api/system/reset-demo', { method: 'POST' });
        if (!res.ok) throw new Error('Failed to reset demo data');
        await loadProjects();
        switchView('projects');
      } catch (err) {
        alert(`Error resetting demo data: ${err.message}`);
      }
    }
  );
}

// --- CONFIRMATION MODAL HELPER ---

function showConfirmModal(title, message, onConfirm) {
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-message').textContent = message;
  CONFIRM_CALLBACK = onConfirm;
  const actionBtn = document.getElementById('confirm-btn-action');
  actionBtn.onclick = async () => {
    closeConfirmModal();
    if (CONFIRM_CALLBACK) await CONFIRM_CALLBACK();
  };
  document.getElementById('modal-confirm').classList.remove('hidden');
  lucide.createIcons();
}

function closeConfirmModal() {
  document.getElementById('modal-confirm').classList.add('hidden');
  CONFIRM_CALLBACK = null;
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
        <td colspan="8" class="py-12 text-center text-slate-400">
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

    const statusVal = p.status || 'ACTIVE';
    let statusBadge = "bg-blue-50 text-blue-700 border-blue-200";
    if (statusVal === 'COMPLETED') statusBadge = "bg-emerald-50 text-emerald-700 border-emerald-200";
    else if (statusVal === 'ARCHIVE') statusBadge = "bg-slate-100 text-slate-600 border-slate-200";
    else if (statusVal === 'ON HOLD') statusBadge = "bg-amber-50 text-amber-700 border-amber-200";

    const contractNum = Number(p.contract_amount || 0);
    const paidNum = Number(p.paid_amount || 0);
    let pct = 0;
    if (contractNum > 0) {
      pct = Math.min(100, Math.max(0, (paidNum / contractNum) * 100));
    } else if (paidNum > 0) {
      pct = 100;
    }
    const pctStr = pct.toFixed(1);

    return `
      <tr class="hover:bg-slate-50 transition border-b border-slate-100 cursor-pointer" onclick="openProjectDossier('${p.id}')">
        <td class="py-3 px-4 font-mono font-bold text-blue-700">${p.id}</td>
        <td class="py-3 px-4 font-bold text-slate-900">${p.title}</td>
        <td class="py-3 px-4 text-slate-600 font-medium">${p.client}</td>
        <td class="py-3 px-4 text-slate-500">${p.site_address || '—'}</td>
        <td class="py-3 px-4 text-center">
          <span class="inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${statusBadge}">
            ${statusVal}
          </span>
        </td>
        <td class="py-3 px-4 text-right font-mono font-bold text-slate-900">${amt} ${curr}</td>
        <td class="py-3 px-4">
          <div class="space-y-1">
            <div class="flex items-center justify-between">
              <span class="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeClass}">
                ${p.payment_status || 'Pending'}
              </span>
              <span class="font-mono text-[11px] font-bold ${pct >= 100 ? 'text-emerald-700' : (pct > 0 ? 'text-blue-700' : 'text-slate-400')}">
                ${pctStr}%
              </span>
            </div>
            <div class="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200">
              <div class="${pct >= 100 ? 'bg-emerald-600' : (pct > 0 ? 'bg-blue-600' : 'bg-slate-300')} h-1.5 rounded-full" style="width: ${pct}%;"></div>
            </div>
            <div class="text-[10px] font-mono text-slate-500 flex justify-between">
              <span>Paid: <strong class="text-emerald-700">${Number(p.paid_amount || 0).toLocaleString()}</strong></span>
              <span class="text-slate-400">${curr}</span>
            </div>
          </div>
        </td>
        <td class="py-3 px-4 text-right space-x-1" onclick="event.stopPropagation()">
          <button onclick="openProjectDossier('${p.id}')" class="px-2 py-1 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded text-[11px] font-bold text-blue-700 transition" title="Open Binder Dossier">
            Dossier
          </button>
          <button onclick="openSpineForProject('${p.id}')" class="px-2 py-1 bg-white border border-slate-300 hover:border-blue-600 rounded text-[11px] font-bold text-slate-700 transition" title="Print Spine Label">
            Spine
          </button>
          <button onclick="openEditProjectModal('${p.id}')" class="px-2 py-1 bg-white border border-slate-300 hover:border-blue-600 hover:text-blue-700 rounded text-[11px] font-bold text-slate-700 transition" title="Edit Project Details">
            Edit
          </button>
          <button onclick="openProjectFolder('${p.id}')" class="px-2 py-1 bg-white border border-slate-300 hover:border-slate-600 rounded text-[11px] font-bold text-slate-700 transition" title="Open PC Folder">
            Folder
          </button>
          <button onclick="confirmDeleteProject('${p.id}')" class="px-2 py-1 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded text-[11px] font-bold text-rose-700 transition" title="Delete Project">
            Delete
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

  let pct = 0;
  if (contractVal > 0) {
    pct = Math.min(100, Math.max(0, (paidVal / contractVal) * 100));
  } else if (paidVal > 0) {
    pct = 100;
  }
  const pctStr = pct.toFixed(1);
  const remPctStr = (100 - pct).toFixed(1);

  document.getElementById('dossier-contract-val').textContent = `${contractVal.toLocaleString()} ${curr}`;
  document.getElementById('dossier-paid-val').textContent = `${paidVal.toLocaleString()} ${curr}`;
  document.getElementById('dossier-remaining-val').textContent = `${remainingVal.toLocaleString()} ${curr}`;

  const dossierPctBadge = document.getElementById('dossier-paid-pct-badge');
  const dossierProgressBar = document.getElementById('dossier-progress-bar');
  const dossierCollectedText = document.getElementById('dossier-pct-collected-text');
  const dossierRemainingText = document.getElementById('dossier-pct-remaining-text');

  if (dossierPctBadge) {
    dossierPctBadge.textContent = `${pctStr}%`;
    if (pct >= 100) {
      dossierPctBadge.className = "font-mono font-bold text-[11px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300";
    } else if (pct > 0) {
      dossierPctBadge.className = "font-mono font-bold text-[11px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200";
    } else {
      dossierPctBadge.className = "font-mono font-bold text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200";
    }
  }

  if (dossierProgressBar) {
    dossierProgressBar.style.width = `${pct}%`;
    if (pct >= 100) {
      dossierProgressBar.className = "bg-emerald-600 h-2 rounded-full transition-all duration-300";
    } else if (pct > 0) {
      dossierProgressBar.className = "bg-blue-600 h-2 rounded-full transition-all duration-300";
    } else {
      dossierProgressBar.className = "bg-slate-300 h-2 rounded-full transition-all duration-300";
    }
  }

  if (dossierCollectedText) {
    dossierCollectedText.textContent = `${pctStr}% Paid`;
  }
  if (dossierRemainingText) {
    dossierRemainingText.textContent = `${remPctStr}% Due`;
  }

  // Fetch Documents
  await loadProjectDocuments(projectId);

  switchView('dossier');
}

async function loadProjectDocuments(projectId) {
  try {
    const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/documents`);
    if (!res.ok) throw new Error('Failed to load documents');
    CURRENT_DOSSIER_DOCS = await res.json();
    renderDossierDocs(CURRENT_DOSSIER_DOCS);
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
    const hasPath = d.file_path && d.file_path.trim().length > 0;
    
    return `
      <tr class="hover:bg-slate-50 transition border-b border-slate-100">
        <td class="py-3 px-4 font-semibold text-slate-900 font-mono text-[11px]">
          <div class="flex items-center gap-1.5">
            <i data-lucide="${hasPath ? 'file-check-2' : 'file-text'}" class="w-3.5 h-3.5 ${hasPath ? 'text-blue-600' : 'text-slate-400'}"></i>
            <span>${d.filename}</span>
          </div>
        </td>
        <td class="py-3 px-4">
          <span class="px-2 py-0.5 rounded bg-slate-100 font-bold text-[10px] text-slate-700">${d.category}</span>
        </td>
        <td class="py-3 px-4 text-slate-500 font-mono text-[11px]">${d.file_date || '—'}</td>
        <td class="py-3 px-4 text-right font-mono font-bold text-slate-800">${amountDisplay}</td>
        <td class="py-3 px-4 text-slate-600 text-xs">${d.notes || '—'}</td>
        <td class="py-3 px-4 text-right space-x-1">
          ${hasPath ? `
            <button onclick="openAttachedFile('${encodeURIComponent(d.file_path)}')" class="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded text-[10px] transition" title="Open File Directly">
              Open
            </button>
          ` : ''}
          <button onclick="openEditDocumentModal(${d.id})" class="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded text-[10px] transition">
            Edit
          </button>
          <button onclick="confirmDeleteDocument(${d.id})" class="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded text-[10px] transition">
            Delete
          </button>
        </td>
      </tr>
    `;
  }).join('');

  lucide.createIcons();
}

async function openAttachedFile(encodedPath) {
  const filePath = decodeURIComponent(encodedPath);
  try {
    if (window.desktopAPI && window.desktopAPI.openFile) {
      await window.desktopAPI.openFile(filePath);
      return;
    }
    const res = await fetch('/api/documents/open-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath })
    });
    const data = await res.json();
    if (!res.ok) alert(data.error || 'Could not launch file');
  } catch (err) {
    alert(`Could not open file: ${err.message}`);
  }
}

// --- FILE BROWSER INTEGRATION ---

async function browseAndSelectFile(mode) {
  try {
    if (window.desktopAPI && window.desktopAPI.selectFile) {
      const res = await window.desktopAPI.selectFile();
      if (!res.canceled && res.filePaths && res.filePaths.length > 0) {
        const fullPath = res.filePaths[0];
        const filename = fullPath.split(/[\/\\]/).pop();
        
        document.getElementById('form-doc-filename').value = filename;
        document.getElementById('form-doc-source-path').value = fullPath;
        const preview = document.getElementById('form-doc-source-preview');
        if (preview) {
          preview.textContent = `Attached: ${fullPath}`;
          preview.classList.remove('hidden');
        }
      }
    } else {
      alert('Native file browsing is available inside the Desktop App.');
    }
  } catch (err) {
    console.error('File browse error:', err);
  }
}

// Modal: Add Document
function openAddDocumentModal() {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('form-doc-date').value = today;
  document.getElementById('form-doc-category').value = 'Payment / Invoice';
  document.getElementById('form-doc-source-path').value = '';
  const preview = document.getElementById('form-doc-source-preview');
  if (preview) {
    preview.textContent = '';
    preview.classList.add('hidden');
  }
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
  document.getElementById('form-doc-source-path').value = '';
  const preview = document.getElementById('form-doc-source-preview');
  if (preview) preview.classList.add('hidden');
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

  const sourcePath = document.getElementById('form-doc-source-path').value.trim();
  const filename = document.getElementById('form-doc-filename').value.trim();
  const fileDate = document.getElementById('form-doc-date').value.trim();
  const amount = parseFloat(document.getElementById('form-doc-amount').value) || 0;
  const notes = document.getElementById('form-doc-notes').value.trim();

  try {
    let res;
    if (sourcePath) {
      res = await fetch('/api/documents/attach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: CURRENT_DOSSIER_ID,
          sourcePath,
          filename,
          category: selectedCategory,
          fileDate,
          amount,
          notes
        })
      });
    } else {
      res = await fetch(`/api/projects/${encodeURIComponent(CURRENT_DOSSIER_ID)}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: selectedCategory,
          filename,
          fileDate,
          amount,
          notes
        })
      });
    }

    if (!res.ok) throw new Error('Failed to attach document');
    closeAddDocumentModal();

    await loadProjects();
    await openProjectDossier(CURRENT_DOSSIER_ID);
  } catch (err) {
    alert(`Error: ${err.message}`);
  }
}

// --- EDIT DOCUMENT MODAL ---

function openEditDocumentModal(docId) {
  const doc = CURRENT_DOSSIER_DOCS.find(d => String(d.id) === String(docId));
  if (!doc) return;

  document.getElementById('edit-doc-id').value = doc.id;
  document.getElementById('edit-doc-category').value = doc.category || 'Tender / Contract';
  document.getElementById('edit-doc-filename').value = doc.filename || '';
  document.getElementById('edit-doc-date').value = doc.file_date || '';
  document.getElementById('edit-doc-amount').value = doc.amount || 0;
  document.getElementById('edit-doc-notes').value = doc.notes || '';

  document.getElementById('modal-edit-document').classList.remove('hidden');
  lucide.createIcons();
}

function closeEditDocumentModal() {
  document.getElementById('modal-edit-document').classList.add('hidden');
  document.getElementById('edit-document-form').reset();
}

async function handleEditDocumentSubmit(e) {
  e.preventDefault();
  const docId = document.getElementById('edit-doc-id').value;
  if (!docId) return;

  const updates = {
    category: document.getElementById('edit-doc-category').value,
    filename: document.getElementById('edit-doc-filename').value.trim(),
    fileDate: document.getElementById('edit-doc-date').value.trim(),
    amount: parseFloat(document.getElementById('edit-doc-amount').value) || 0,
    notes: document.getElementById('edit-doc-notes').value.trim()
  };

  try {
    const res = await fetch(`/api/documents/${encodeURIComponent(docId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });

    if (!res.ok) throw new Error('Failed to update document');
    closeEditDocumentModal();

    await loadProjects();
    await openProjectDossier(CURRENT_DOSSIER_ID);
  } catch (err) {
    alert(`Error: ${err.message}`);
  }
}

function confirmDeleteDocument(docId) {
  showConfirmModal(
    'Delete Document Record?',
    'Are you sure you want to remove this document from the project binder? If it has an attached payment amount, project totals will recalculate automatically.',
    async () => {
      try {
        const res = await fetch(`/api/documents/${docId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete document');
        await loadProjects();
        await openProjectDossier(CURRENT_DOSSIER_ID);
      } catch (err) {
        alert(`Error: ${err.message}`);
      }
    }
  );
}

// --- PROJECT CREATION, EDITING & DELETION ---

function updateFinancialBreakdownCard(prefix) {
  const contractInput = document.getElementById(`${prefix}-amount`);
  const paidInput = document.getElementById(`${prefix}-paid`);
  const currSelect = document.getElementById(`${prefix}-currency`);
  const statusSelect = document.getElementById(`${prefix}-payment`);

  const contract = parseFloat(contractInput ? contractInput.value : 0) || 0;
  const paid = parseFloat(paidInput ? paidInput.value : 0) || 0;
  const curr = currSelect ? currSelect.value : 'LYD';
  const remaining = Math.max(0, contract - paid);

  let pct = 0;
  if (contract > 0) {
    pct = Math.min(100, Math.max(0, (paid / contract) * 100));
  } else if (paid > 0) {
    pct = 100;
  }
  const pctFormatted = pct.toFixed(1);
  const remPctFormatted = (100 - pct).toFixed(1);

  // Auto-set status select
  if (statusSelect) {
    if (paid >= contract && contract > 0) {
      statusSelect.value = 'Paid';
    } else if (paid > 0) {
      statusSelect.value = 'Partial';
    } else {
      statusSelect.value = 'Pending';
    }
  }

  // Update Preview Elements
  const percentBadge = document.getElementById(`${prefix === 'form-proj' ? 'new' : 'edit'}-proj-paid-percent`);
  const progressBar = document.getElementById(`${prefix === 'form-proj' ? 'new' : 'edit'}-proj-progress-bar`);
  const displayPaid = document.getElementById(`${prefix === 'form-proj' ? 'new' : 'edit'}-proj-display-paid`);
  const displayRemaining = document.getElementById(`${prefix === 'form-proj' ? 'new' : 'edit'}-proj-display-remaining`);
  const displayRemPct = document.getElementById(`${prefix === 'form-proj' ? 'new' : 'edit'}-proj-display-rem-pct`);

  if (percentBadge) {
    percentBadge.textContent = `${pctFormatted}% COLLECTED`;
    if (pct >= 100) {
      percentBadge.className = "font-mono text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded text-[11px] font-bold";
    } else if (pct > 0) {
      percentBadge.className = "font-mono text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded text-[11px] font-bold";
    } else {
      percentBadge.className = "font-mono text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[11px] font-bold";
    }
  }

  if (progressBar) {
    progressBar.style.width = `${pct}%`;
    if (pct >= 100) {
      progressBar.className = "bg-emerald-600 h-2 rounded-full transition-all duration-300";
    } else if (pct > 0) {
      progressBar.className = "bg-blue-600 h-2 rounded-full transition-all duration-300";
    } else {
      progressBar.className = "bg-slate-300 h-2 rounded-full transition-all duration-300";
    }
  }

  if (displayPaid) {
    displayPaid.textContent = `${paid.toLocaleString()} ${curr}`;
  }
  if (displayRemaining) {
    displayRemaining.textContent = `${remaining.toLocaleString()} ${curr}`;
  }
  if (displayRemPct) {
    displayRemPct.textContent = `(${remPctFormatted}% Due)`;
  }
}

function autoCalculateNewProjectPayment() {
  updateFinancialBreakdownCard('form-proj');
}

function autoCalculateEditProjectPayment() {
  updateFinancialBreakdownCard('edit-proj');
}

function openNewProjectModal() {
  const yearShort = new Date().getFullYear().toString().slice(-2);
  const nextNum = String(PROJECTS_CACHE.length + 1).padStart(3, '0');
  document.getElementById('form-proj-id').value = `SS-${yearShort}-${nextNum}`;
  document.getElementById('form-proj-amount').value = '';
  document.getElementById('form-proj-paid').value = '';
  document.getElementById('form-proj-payment').value = 'Pending';
  updateFinancialBreakdownCard('form-proj');
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
    paid_amount: parseFloat(document.getElementById('form-proj-paid').value) || 0,
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
    openSpineForProject(newProject.id);
  } catch (err) {
    alert(`Error: ${err.message}`);
  }
}

// Edit Project
function openEditProjectModal(projectId) {
  const project = PROJECTS_CACHE.find(p => p.id === projectId);
  if (!project) return;

  document.getElementById('edit-proj-id').value = project.id;
  document.getElementById('edit-proj-id-display').value = project.id;
  document.getElementById('edit-proj-status').value = project.status || 'ACTIVE';
  document.getElementById('edit-proj-title').value = project.title || '';
  document.getElementById('edit-proj-client').value = project.client || '';
  document.getElementById('edit-proj-site').value = project.site_address || '';
  document.getElementById('edit-proj-amount').value = project.contract_amount || 0;
  document.getElementById('edit-proj-paid').value = project.paid_amount || 0;
  document.getElementById('edit-proj-currency').value = project.currency || 'LYD';
  document.getElementById('edit-proj-payment').value = project.payment_status || 'Pending';
  document.getElementById('edit-proj-start').value = project.start_date || '';
  document.getElementById('edit-proj-end').value = project.end_date || '';
  document.getElementById('edit-proj-remarks').value = project.remarks || '';

  updateFinancialBreakdownCard('edit-proj');
  document.getElementById('modal-edit-project').classList.remove('hidden');
  lucide.createIcons();
}

function openEditProjectForCurrent() {
  if (CURRENT_DOSSIER_ID) openEditProjectModal(CURRENT_DOSSIER_ID);
}

function closeEditProjectModal() {
  document.getElementById('modal-edit-project').classList.add('hidden');
  document.getElementById('edit-project-form').reset();
}

async function handleEditProjectSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('edit-proj-id').value;
  if (!id) return;

  const updates = {
    status: document.getElementById('edit-proj-status').value,
    title: document.getElementById('edit-proj-title').value.trim(),
    client: document.getElementById('edit-proj-client').value.trim(),
    site_address: document.getElementById('edit-proj-site').value.trim(),
    contract_amount: parseFloat(document.getElementById('edit-proj-amount').value) || 0,
    paid_amount: parseFloat(document.getElementById('edit-proj-paid').value) || 0,
    currency: document.getElementById('edit-proj-currency').value,
    payment_status: document.getElementById('edit-proj-payment').value,
    start_date: document.getElementById('edit-proj-start').value.trim(),
    end_date: document.getElementById('edit-proj-end').value.trim(),
    remarks: document.getElementById('edit-proj-remarks').value.trim()
  };

  try {
    const res = await fetch(`/api/projects/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });

    if (!res.ok) throw new Error('Failed to update project');
    closeEditProjectModal();

    await loadProjects();
    if (CURRENT_DOSSIER_ID === id) {
      await openProjectDossier(id);
    }
  } catch (err) {
    alert(`Error: ${err.message}`);
  }
}

// Delete Project
function confirmDeleteProject(projectId) {
  const p = PROJECTS_CACHE.find(proj => proj.id === projectId);
  const title = p ? p.title : projectId;
  showConfirmModal(
    `Delete Project ${projectId}?`,
    `Are you sure you want to delete "${title}"? All document records and cloud 4G sync entries for this project will be deleted permanently.`,
    async () => {
      try {
        const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete project');
        await loadProjects();
        if (CURRENT_DOSSIER_ID === projectId) {
          switchView('projects');
        }
      } catch (err) {
        alert(`Error: ${err.message}`);
      }
    }
  );
}

function confirmDeleteCurrentProject() {
  if (CURRENT_DOSSIER_ID) confirmDeleteProject(CURRENT_DOSSIER_ID);
}

// --- FOLDER LAUNCHERS ---

async function openProjectFolder(projectId) {
  try {
    if (window.desktopAPI && window.desktopAPI.openFolder) {
      const p = PROJECTS_CACHE.find(proj => proj.id === projectId);
      if (p && p.folder_path) {
        await window.desktopAPI.openFolder(p.folder_path);
        return;
      }
    }
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

function openCurrentProjectFolder() {
  if (CURRENT_DOSSIER_ID) openProjectFolder(CURRENT_DOSSIER_ID);
}

async function openArchiveFolderRoot() {
  try {
    if (window.desktopAPI && window.desktopAPI.openFolder) {
      await window.desktopAPI.openFolder('');
      return;
    }
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

function openSpineForCurrentProject() {
  if (CURRENT_DOSSIER_ID) openSpineForProject(CURRENT_DOSSIER_ID);
}

function renderSpineView(code) {
  CURRENT_SPINE_CODE = code;
  const project = PROJECTS_CACHE.find(p => p.id === code);
  if (!project) return;

  const volSelect = document.getElementById('spine-volume-select');
  const volLabel = volSelect ? volSelect.value : 'Main Dossier';

  document.getElementById('spine-display-code').textContent = project.id;
  document.getElementById('spine-display-title').textContent = project.title;
  document.getElementById('spine-display-client').textContent = `Client: ${project.client}`;
  const volEl = document.getElementById('spine-display-volume');
  if (volEl) volEl.textContent = volLabel.toUpperCase();

  const qrBox = document.getElementById('spine-qrcode-box');
  qrBox.innerHTML = '';

  const mobileScanUrl = `https://sadik-sons-portal.pages.dev/?id=${encodeURIComponent(project.id)}`;

  try {
    if (typeof QRCode !== 'undefined') {
      new QRCode(qrBox, {
        text: mobileScanUrl,
        width: 76,
        height: 76,
        colorDark: '#000000',
        colorLight: '#FFFFFF',
        correctLevel: typeof QRCode.CorrectLevel !== 'undefined' ? QRCode.CorrectLevel.M : 0
      });
    } else {
      const img = document.createElement('img');
      img.src = `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(mobileScanUrl)}`;
      img.alt = 'QR Code';
      img.className = 'w-full h-full object-contain';
      qrBox.appendChild(img);
    }
  } catch (err) {
    const img = document.createElement('img');
    img.src = `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(mobileScanUrl)}`;
    img.alt = 'QR Code';
    img.className = 'w-full h-full object-contain';
    qrBox.appendChild(img);
  }
}

function updateSpineWidth(widthMm) {
  const container = document.getElementById('printable-spine-container');
  if (!container) return;
  if (widthMm === '70') {
    container.style.width = '190mm';
    container.style.height = '70mm';
    container.className = "bg-white border-2 border-dashed border-black rounded-sm p-6 flex items-center justify-between gap-6 transition-all";
  } else {
    container.style.width = '190mm';
    container.style.height = '50mm';
    container.className = "bg-white border-2 border-dashed border-black rounded-sm p-4 flex items-center justify-between gap-5 transition-all";
  }
}

function triggerPrintSpine() {
  if (window.desktopAPI && window.desktopAPI.printSpine) {
    window.desktopAPI.printSpine();
  } else {
    window.print();
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
  if (label) label.textContent = "Syncing...";
  try {
    const res = await fetch('/api/sync-cloud', { method: 'POST' });
    const data = await res.json();
    if (data && data.success) {
      if (label) label.textContent = `Synced (${data.projectsSynced}p, ${data.docsSynced}d)`;
    } else {
      if (label) label.textContent = "Synced";
    }
  } catch (err) {
    if (label) label.textContent = "Offline";
  }
  setTimeout(() => {
    if (label) label.textContent = "Sync 4G Cloud QR";
  }, 3500);
}
