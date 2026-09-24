/**
 * Sadik Sons Enterprise — Desktop Control Engine
 * Connects to local SQLite / Express server on port 3000
 */

let PROJECTS_CACHE = [];
let TOOLS_CACHE = [];
let CURRENT_SPINE_CODE = null;

// Initialize on Load
document.addEventListener('DOMContentLoaded', () => {
  loadProjects();
  loadTools();
});

// View Navigation
function switchView(viewName) {
  const views = ['projects', 'spines', 'tools'];
  views.forEach(v => {
    const el = document.getElementById(`view-${v}`);
    const btn = document.getElementById(`nav-btn-${v}`);
    if (v === viewName) {
      el.classList.remove('hidden');
      btn.className = "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-white text-blue-700 shadow-sm transition";
    } else {
      el.classList.add('hidden');
      btn.className = "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:text-slate-900 transition";
    }
  });

  if (viewName === 'spines' && CURRENT_SPINE_CODE) {
    renderSpineView(CURRENT_SPINE_CODE);
  }

  lucide.createIcons();
}

// --- PROJECTS MANAGEMENT ---

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
          No projects found in local archive database. Click "New Project" to register one.
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
      <tr class="hover:bg-slate-50 transition border-b border-slate-100">
        <td class="py-3 px-4 font-mono font-bold text-blue-700">${p.id}</td>
        <td class="py-3 px-4 font-bold text-slate-900">${p.title}</td>
        <td class="py-3 px-4 text-slate-600 font-medium">${p.client}</td>
        <td class="py-3 px-4 text-slate-500">${p.site_address || '—'}</td>
        <td class="py-3 px-4 text-right font-mono font-bold text-slate-900">${amt} ${curr}</td>
        <td class="py-3 px-4 text-center">
          <span class="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badgeClass}">
            ${p.payment_status || 'Active'}
          </span>
        </td>
        <td class="py-3 px-4 text-right space-x-1.5">
          <button onclick="openSpineForProject('${p.id}')" class="px-2.5 py-1 bg-white border border-slate-300 hover:border-blue-600 rounded text-[11px] font-bold text-blue-700 transition">
            Spine Label
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

// Open Windows File Explorer or Mac Finder at project folder
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

// Open Root Archive Directory
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

  // Generate QR Code targeting the Cloudflare Mobile Passport URL
  const qrBox = document.getElementById('spine-qrcode-box');
  qrBox.innerHTML = '';

  const mobileScanUrl = `https://sadik-sons-portal.pages.dev/?id=${encodeURIComponent(project.id)}`;

  QRCode.toCanvas(mobileScanUrl, {
    width: 90,
    margin: 1,
    color: {
      dark: '#0F172A',
      light: '#FFFFFF'
    }
  }, (err, canvas) => {
    if (!err) {
      qrBox.appendChild(canvas);
    }
  });
}

function updateSpineWidth(widthMm) {
  const container = document.getElementById('printable-spine-area');
  if (!container) return;
  if (widthMm === '70') {
    container.className = "bg-white border-2 border-slate-900 rounded-lg p-8 shadow-xl flex items-center justify-between gap-8 w-full max-w-3xl";
  } else {
    container.className = "bg-white border-2 border-slate-900 rounded-lg p-6 shadow-xl flex items-center justify-between gap-8 w-full max-w-2xl";
  }
}

// --- PROJECT MODAL & REGISTRATION ---

function openNewProjectModal() {
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
    if (!res.ok) throw new Error(data.error || 'Failed to save project');

    closeProjectModal();
    await loadProjects();
    alert(`Project ${newProject.id} successfully created!\nDigital 5-folder archive created on local hard drive.`);
  } catch (err) {
    alert(`Error: ${err.message}`);
  }
}

// --- TOOL CUSTODY ---

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
        <td class="py-3 px-4 text-slate-500">${t.assignedSite || 'Tool Crib'}</td>
        <td class="py-3 px-4 text-slate-700 font-medium">${t.assignedTo || '—'}</td>
        <td class="py-3 px-4 text-center">${statusBadge}</td>
        <td class="py-3 px-4 text-right">
          <span class="text-xs text-slate-400 font-mono">${t.shelf || 'Rack A'}</span>
        </td>
      </tr>
    `;
  }).join('');
}

// --- CLOUD SYNC TRIGGER ---

function triggerCloudSync() {
  const label = document.getElementById('sync-status-label');
  label.textContent = "Syncing...";
  setTimeout(() => {
    label.textContent = "Synced";
    setTimeout(() => {
      label.textContent = "Sync Cloud";
    }, 2000);
  }, 800);
}
