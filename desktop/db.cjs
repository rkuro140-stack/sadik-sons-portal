const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DB_FILE = path.join(__dirname, 'sadik_sons.db');
const db = new DatabaseSync(DB_FILE);

// Enable WAL mode (Write-Ahead Logging) for crash safety & concurrency
db.exec('PRAGMA journal_mode = WAL;');

// Initialize Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS tools (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    brand TEXT NOT NULL,
    model TEXT,
    category TEXT,
    serial TEXT,
    shelf TEXT,
    status TEXT DEFAULT 'available',
    assigned_to TEXT,
    assigned_site TEXT,
    checkout_time TEXT,
    expected_return TEXT,
    condition TEXT DEFAULT 'Good',
    icon TEXT
  );

  CREATE TABLE IF NOT EXISTS technicians (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT,
    phone TEXT,
    dept TEXT,
    pin TEXT
  );

  CREATE TABLE IF NOT EXISTS sites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    action TEXT NOT NULL,
    tool_id TEXT NOT NULL,
    tool_name TEXT NOT NULL,
    technician TEXT NOT NULL,
    site TEXT,
    condition TEXT,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    client TEXT NOT NULL,
    site_address TEXT,
    start_date TEXT,
    end_date TEXT,
    contract_amount REAL DEFAULT 0,
    currency TEXT DEFAULT 'LYD',
    paid_amount REAL DEFAULT 0,
    payment_status TEXT DEFAULT 'Pending',
    remarks TEXT,
    status TEXT DEFAULT 'ACTIVE',
    folder_path TEXT,
    created_at TEXT
  );
`);

// Check if tools table is empty, seed if so
const countQuery = db.prepare('SELECT COUNT(*) as count FROM tools');
const rowCount = countQuery.get().count;

if (rowCount === 0) {
  console.log('⚡ Seeding initial tools and technicians into SQLite database (sadik_sons.db)...');

  const insertTool = db.prepare(`
    INSERT INTO tools (id, code, name, brand, model, category, serial, shelf, status, assigned_to, assigned_site, checkout_time, expected_return, condition, icon)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const initialTools = [
    ['SS-TL-001', 'SS-TL-001', 'Hilti TE 70-ATC Rotary Hammer', 'Hilti', 'TE 70-ATC (SDS Max)', 'Heavy Drills', 'HLT-883921-23', 'Rack A-01', 'checked_out', 'Tariq Mansour', 'Tripoli Port Project', '2026-09-14 08:30', '2026-09-22', 'Good', 'hammer'],
    ['SS-TL-002', 'SS-TL-002', 'Bosch GWS 2200W Angle Grinder', 'Bosch', 'GWS 2200-230 Heavy Duty', 'Grinders & Saws', 'BSH-2200-9182', 'Rack B-03', 'available', null, null, null, null, 'Good', 'disc'],
    ['SS-TL-003', 'SS-TL-003', 'DeWalt DWS780 Mitre Saw', 'DeWalt', 'DWS780 305mm Sliding Compound', 'Grinders & Saws', 'DW-780-44910', 'Bay 02 - Floor', 'checked_out', 'Ahmed Al-Hadi', 'Al-Andalus Commercial Center', '2026-09-13 14:15', '2026-09-20', 'Good', 'scissors'],
    ['SS-TL-004', 'SS-TL-004', 'Fluke 87V Industrial Multimeter', 'Fluke', '87V True-RMS High Accuracy', 'Electrical & Test', 'FLK-87V-10294', 'Cabinet C-Elec-1', 'available', null, null, null, null, 'Good', 'activity'],
    ['SS-TL-005', 'SS-TL-005', 'Leica DISTO D810 Laser Measure', 'Leica', 'D810 Touch (200m Range)', 'Lasers & Optics', 'LCA-D810-7731', 'Cabinet A-Laser', 'checked_out', 'Youssef Salem', 'Benghazi Substation A', '2026-09-15 07:10', '2026-09-21', 'Good', 'crosshair'],
    ['SS-TL-006', 'SS-TL-006', 'Makita DTD152 Impact Driver 18V', 'Makita', 'DTD152Z 165Nm Cordless', 'Heavy Drills', 'MKT-152-88219', 'Rack A-04', 'available', null, null, null, null, 'Good', 'drill'],
    ['SS-TL-007', 'SS-TL-007', 'Honda EU30is Inverter Generator', 'Honda', 'EU30is 3.0kVA Silent', 'Power & Generators', 'HND-EU30-5510', 'Ground Yard - G1', 'checked_out', 'Omar Benali', 'Misrata Industrial Zone', '2026-09-12 11:00', '2026-09-20', 'Good', 'zap'],
    ['SS-TL-008', 'SS-TL-008', 'Milwaukee M18 Fuel Pipe Threader', 'Milwaukee', 'M18 FPT2-0C 2-Inch Compact', 'Grinders & Saws', 'MLW-M18-0922', 'Rack B-06', 'maintenance', null, null, null, null, 'Blade worn - servicing motor brushes', 'tool'],
    ['SS-TL-009', 'SS-TL-009', 'Hilti PR 30-HVS Rotating Laser', 'Hilti', 'PR 30-HVS Outdoor Horizontal/Vertical', 'Lasers & Optics', 'HLT-PR30-1928', 'Cabinet A-Laser', 'checked_out', 'Khaled Zaid', 'Tripoli Port Project', '2026-09-15 08:00', '2026-09-23', 'Good', 'radar'],
    ['SS-TL-010', 'SS-TL-010', 'Bosch Professional Line Laser GLL 3-80', 'Bosch', 'GLL 3-80 C 3x360°', 'Lasers & Optics', 'BSH-GLL-6110', 'Cabinet A-Laser', 'available', null, null, null, null, 'Good', 'crosshair'],
    ['SS-TL-011', 'SS-TL-011', 'Knipex Master Electrician Set (1000V)', 'Knipex', 'VDE Insulated 12-Piece Case', 'Electrical & Test', 'KNP-VDE-38102', 'Cabinet C-Elec-2', 'available', null, null, null, null, 'Good', 'briefcase'],
    ['SS-TL-012', 'SS-TL-012', 'DeWalt D25980 Demolition Breaker', 'DeWalt', 'D25980 30kg Pavement Breaker', 'Heavy Drills', 'DW-BRK-9901', 'Bay 01 - Heavy', 'checked_out', 'Tariq Mansour', 'Tripoli Port Project', '2026-09-14 09:10', '2026-09-22', 'Good', 'hammer']
  ];

  initialTools.forEach(t => insertTool.run(...t));

  const insertTech = db.prepare(`
    INSERT INTO technicians (id, name, role, phone, dept, pin)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const initialTechs = [
    ['T-01', 'Tariq Mansour', 'Lead Civil & Structural Tech', '+218 91 234 5678', 'Heavy Machinery', '1122'],
    ['T-02', 'Ahmed Al-Hadi', 'Senior Carpenter & Joiner', '+218 92 345 6789', 'Finishing & Woodwork', '2233'],
    ['T-03', 'Youssef Salem', 'Site Surveyor & Quality Inspector', '+218 91 456 7890', 'Engineering & Survey', '3344'],
    ['T-04', 'Omar Benali', 'Chief Electrical Technician', '+218 92 567 8901', 'High Voltage & Power', '4455'],
    ['T-05', 'Khaled Zaid', 'HVAC & Plumbing Lead', '+218 91 678 9012', 'Mechanical Services', '5566']
  ];
  initialTechs.forEach(tech => insertTech.run(...tech));

  const insertSite = db.prepare('INSERT OR IGNORE INTO sites (name) VALUES (?)');
  const initialSites = [
    'Tripoli Port Project',
    'Benghazi Substation A',
    'Al-Andalus Commercial Center',
    'Misrata Industrial Zone',
    'Central Workshop'
  ];
  initialSites.forEach(s => insertSite.run(s));

  const insertLog = db.prepare(`
    INSERT INTO audit_logs (id, timestamp, action, tool_id, tool_name, technician, site, condition, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const initialLogs = [
    ['LOG-109', '2026-09-15 08:00', 'CHECK_OUT', 'SS-TL-009', 'Hilti PR 30-HVS Rotating Laser', 'Khaled Zaid', 'Tripoli Port Project', 'Good', 'Includes tripod & detector staff'],
    ['LOG-108', '2026-09-15 07:10', 'CHECK_OUT', 'SS-TL-005', 'Leica DISTO D810 Laser Measure', 'Youssef Salem', 'Benghazi Substation A', 'Good', 'Site survey measurement']
  ];
  initialLogs.forEach(l => insertLog.run(...l));

  // Seed Initial Projects
  const insertProject = db.prepare(`
    INSERT INTO projects (id, title, client, site_address, start_date, end_date, contract_amount, currency, paid_amount, payment_status, remarks, status, folder_path, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const initialProjects = [
    ['SS-24-001', 'Tripoli Commercial Center — HVAC & Piping', 'Al-Naseem Contracting Group', 'Hai Al-Andalus, Tripoli, Libya', '15 Mar 2024', '30 Nov 2024', 185000, 'LYD', 140000, 'Partial', 'Phase 1 ducting approved by supervising engineer. Pressure test for chilled water risers completed successfully.', 'ACTIVE', '', '2024-03-15 09:00'],
    ['SS-24-002', 'Palm City Luxury Residences — Chiller Overhaul', 'Palm City Facility Management', 'Janzour Seaside Road, Tripoli', '01 May 2024', '15 Dec 2024', 95000, 'LYD', 95000, 'Paid', 'Compressor replacement completed on Chiller #2. 12-month preventive maintenance contract signed.', 'ACTIVE', '', '2024-05-01 10:00'],
    ['SS-23-014', 'Al-Dahra Substation — Fire Suppression Retrofit', 'GECOL (General Electric Company)', 'Al-Dahra Sector, Tripoli', '10 Aug 2023', '25 Jan 2024', 320000, 'LYD', 288000, 'Retention Due', 'Handover certificate issued Jan 2024. 10% retention (32,000 LYD) scheduled for release Dec 2024.', 'ARCHIVE', '', '2023-08-10 11:00']
  ];
  initialProjects.forEach(p => insertProject.run(...p));
}

function getArchiveBasePath() {
  const os = require('os');
  if (process.platform === 'win32') {
    return path.join('C:', 'Sadik_Sons_Archive', 'Projects');
  } else {
    return path.join(os.homedir(), 'Documents', 'Sadik_Sons_Archive', 'Projects');
  }
}

function ensureProjectFolders(project) {
  try {
    const year = project.start_date ? String(project.start_date).slice(-4) : (project.id.split('-')[1] ? '20' + project.id.split('-')[1] : '2024');
    const safeTitle = (project.title || 'Project').replace(/[\\/:*?"<>|]/g, '_').slice(0, 35);
    const folderName = `${project.id} - ${safeTitle}`;
    const projectDir = path.join(getArchiveBasePath(), year, folderName);

    const subfolders = [
      '01_Contracts_and_Agreements',
      '02_Engineering_Drawings_and_CAD',
      '03_Invoices_and_Financial_Docs',
      '04_Technical_Specs_and_Spare_Parts',
      '05_Site_Reports_and_Handover'
    ];

    subfolders.forEach(sub => {
      fs.mkdirSync(path.join(projectDir, sub), { recursive: true });
    });

    return projectDir;
  } catch (err) {
    console.warn('Folder creation notice:', err.message);
    return '';
  }
}

function getNowString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${hh}:${mm}`;
}

// Convert row to camelCase for API compatibility
function mapToolRow(r) {
  if (!r) return null;
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    brand: r.brand,
    model: r.model,
    category: r.category,
    serial: r.serial,
    shelf: r.shelf,
    status: r.status,
    assignedTo: r.assigned_to,
    assignedSite: r.assigned_site,
    checkoutTime: r.checkout_time,
    expectedReturn: r.expected_return,
    condition: r.condition,
    icon: r.icon
  };
}

const sqliteService = {
  getTools() {
    const rows = db.prepare('SELECT * FROM tools ORDER BY id ASC').all();
    return rows.map(mapToolRow);
  },

  getTool(idOrCode) {
    const clean = String(idOrCode).trim().toUpperCase();
    const row = db.prepare('SELECT * FROM tools WHERE UPPER(id) = ? OR UPPER(code) = ?').get(clean, clean);
    return mapToolRow(row);
  },

  addTool(tool) {
    const count = db.prepare('SELECT COUNT(*) as count FROM tools').get().count + 1;
    const code = tool.code || `SS-TL-${String(count).padStart(3, '0')}`;
    const id = code;

    const stmt = db.prepare(`
      INSERT INTO tools (id, code, name, brand, model, category, serial, shelf, status, condition, icon)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'available', 'Good', ?)
    `);

    stmt.run(
      id,
      code,
      tool.name || 'Untitled Tool',
      tool.brand || 'Generic',
      tool.model || '',
      tool.category || 'Hand Tools',
      tool.serial || 'SN-' + Date.now().toString().slice(-6),
      tool.shelf || 'Main Crib',
      tool.icon || 'wrench'
    );

    return this.getTool(id);
  },

  checkoutTool({ toolId, technicianName, site, expectedReturn, notes }) {
    const clean = String(toolId).trim().toUpperCase();
    const tool = this.getTool(clean);
    if (!tool) throw new Error('Tool not found');
    if (tool.status === 'checked_out') throw new Error(`Tool is already checked out to ${tool.assignedTo}`);
    if (tool.status === 'maintenance') throw new Error(`Tool is currently in maintenance and cannot be dispatched`);

    const nowStr = getNowString();

    db.prepare(`
      UPDATE tools
      SET status = 'checked_out',
          assigned_to = ?,
          assigned_site = ?,
          checkout_time = ?,
          expected_return = ?
      WHERE UPPER(id) = ? OR UPPER(code) = ?
    `).run(technicianName, site || 'Job Site', nowStr, expectedReturn || '', clean, clean);

    // Insert Audit Log
    const logId = 'LOG-' + Math.floor(1000 + Math.random() * 9000);
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, tool_id, tool_name, technician, site, condition, notes)
      VALUES (?, ?, 'CHECK_OUT', ?, ?, ?, ?, ?, ?)
    `).run(logId, nowStr, tool.id, tool.name, technicianName, site || 'Job Site', tool.condition || 'Good', notes || 'Checked out to job site');

    return this.getTool(clean);
  },

  checkinTool({ toolId, condition, shelf, notes }) {
    const clean = String(toolId).trim().toUpperCase();
    const tool = this.getTool(clean);
    if (!tool) throw new Error('Tool not found');

    const prevTech = tool.assignedTo || 'Technician';
    const prevSite = tool.assignedSite || 'Job Site';
    const nowStr = getNowString();
    const newStatus = condition === 'Damaged' ? 'maintenance' : 'available';

    db.prepare(`
      UPDATE tools
      SET status = ?,
          condition = ?,
          assigned_to = NULL,
          assigned_site = NULL,
          checkout_time = NULL,
          expected_return = NULL,
          shelf = COALESCE(?, shelf)
      WHERE UPPER(id) = ? OR UPPER(code) = ?
    `).run(newStatus, condition || 'Good', shelf || null, clean, clean);

    // Insert Audit Log
    const logId = 'LOG-' + Math.floor(1000 + Math.random() * 9000);
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, tool_id, tool_name, technician, site, condition, notes)
      VALUES (?, ?, 'CHECK_IN', ?, ?, ?, ?, ?, ?)
    `).run(logId, nowStr, tool.id, tool.name, prevTech, prevSite, condition || 'Good', notes || 'Returned to tool crib');

    return this.getTool(clean);
  },

  getTechnicians() {
    return db.prepare('SELECT * FROM technicians ORDER BY id ASC').all();
  },

  getSites() {
    const rows = db.prepare('SELECT name FROM sites ORDER BY name ASC').all();
    return rows.map(r => r.name);
  },

  getLogs() {
    const rows = db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC').all();
    return rows.map(r => ({
      id: r.id,
      timestamp: r.timestamp,
      action: r.action,
      toolId: r.tool_id,
      toolName: r.tool_name,
      technician: r.technician,
      site: r.site,
      condition: r.condition,
      notes: r.notes
    }));
  },

  getStats() {
    const total = db.prepare('SELECT COUNT(*) as c FROM tools').get().c;
    const inField = db.prepare("SELECT COUNT(*) as c FROM tools WHERE status = 'checked_out'").get().c;
    const available = db.prepare("SELECT COUNT(*) as c FROM tools WHERE status = 'available'").get().c;
    const maintenance = db.prepare("SELECT COUNT(*) as c FROM tools WHERE status = 'maintenance'").get().c;
    return { total, inField, available, maintenance };
  },

  // --- PROJECTS ARCHIVE CRUD ---
  getProjects() {
    return db.prepare('SELECT * FROM projects ORDER BY id DESC').all();
  },

  getProject(id) {
    const clean = String(id).trim().toUpperCase();
    return db.prepare('SELECT * FROM projects WHERE UPPER(id) = ?').get(clean);
  },

  addProject(data) {
    if (!data.id) throw new Error('Project Code is required (e.g. SS-24-001)');
    const cleanId = String(data.id).trim().toUpperCase();
    const existing = this.getProject(cleanId);
    if (existing) throw new Error(`Project ${cleanId} already exists!`);

    const folderPath = ensureProjectFolders({ ...data, id: cleanId });

    db.prepare(`
      INSERT INTO projects (id, title, client, site_address, start_date, end_date, contract_amount, currency, paid_amount, payment_status, remarks, status, folder_path, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      cleanId,
      data.title || 'Untitled Project',
      data.client || 'Client',
      data.site_address || 'Tripoli, Libya',
      data.start_date || '',
      data.end_date || '',
      Number(data.contract_amount) || 0,
      data.currency || 'LYD',
      Number(data.paid_amount) || 0,
      data.payment_status || 'Pending',
      data.remarks || '',
      data.status || 'ACTIVE',
      folderPath || '',
      getNowString()
    );

    return this.getProject(cleanId);
  },

  updateProject(data) {
    const cleanId = String(data.id).trim().toUpperCase();
    const existing = this.getProject(cleanId);
    if (!existing) throw new Error(`Project ${cleanId} not found`);

    let folderPath = existing.folder_path;
    if (!folderPath || !fs.existsSync(folderPath)) {
      folderPath = ensureProjectFolders({ ...data, id: cleanId });
    }

    db.prepare(`
      UPDATE projects
      SET title = COALESCE(?, title),
          client = COALESCE(?, client),
          site_address = COALESCE(?, site_address),
          start_date = COALESCE(?, start_date),
          end_date = COALESCE(?, end_date),
          contract_amount = COALESCE(?, contract_amount),
          currency = COALESCE(?, currency),
          paid_amount = COALESCE(?, paid_amount),
          payment_status = COALESCE(?, payment_status),
          remarks = COALESCE(?, remarks),
          status = COALESCE(?, status),
          folder_path = COALESCE(?, folder_path)
      WHERE UPPER(id) = ?
    `).run(
      data.title,
      data.client,
      data.site_address,
      data.start_date,
      data.end_date,
      data.contract_amount,
      data.currency,
      data.paid_amount,
      data.payment_status,
      data.remarks,
      data.status,
      folderPath,
      cleanId
    );

    return this.getProject(cleanId);
  },

  deleteProject(id) {
    const cleanId = String(id).trim().toUpperCase();
    db.prepare('DELETE FROM projects WHERE UPPER(id) = ?').run(cleanId);
    return { success: true, deletedId: cleanId };
  },

  openProjectFolder(id) {
    const project = this.getProject(id);
    if (!project) throw new Error('Project not found');
    let targetDir = project.folder_path;
    if (!targetDir || !fs.existsSync(targetDir)) {
      targetDir = ensureProjectFolders(project);
    }

    const { exec } = require('child_process');
    if (process.platform === 'win32') {
      exec(`explorer.exe "${targetDir}"`);
    } else if (process.platform === 'darwin') {
      exec(`open "${targetDir}"`);
    } else {
      exec(`xdg-open "${targetDir}"`);
    }
    return { success: true, path: targetDir };
  }
};

module.exports = sqliteService;
