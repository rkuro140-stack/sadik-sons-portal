/**
 * Sadik Sons Enterprise — Universal Database & Storage Layer
 * Supports both Node 22+ SQLite (DatabaseSync) and Zero-Dependency JSON Storage
 * Runs seamlessly on macOS (Monterey 12 - Sequoia 15), Windows (10/11), and inside Electron
 */

const path = require('path');
const fs = require('fs');

function getDataDir() {
  try {
    if (process.versions && process.versions.electron) {
      const electron = require('electron');
      const app = electron.app || (electron.remote && electron.remote.app);
      if (app && app.getPath) {
        const p = path.join(app.getPath('userData'), 'database');
        fs.mkdirSync(p, { recursive: true });
        return p;
      }
    }
  } catch (e) {}
  return __dirname;
}

const DATA_DIR = getDataDir();
const JSON_FILE = path.join(DATA_DIR, 'sadik_sons_data.json');
const DB_FILE = path.join(DATA_DIR, 'sadik_sons.db');

let sqliteDb = null;
let useJson = false;

try {
  const { DatabaseSync } = require('node:sqlite');
  sqliteDb = new DatabaseSync(DB_FILE);
  sqliteDb.exec('PRAGMA journal_mode = WAL;');
  initSqliteTables(sqliteDb);
} catch (err) {
  // Running in Electron / Node < 22: use embedded zero-dependency JSON engine
  useJson = true;
}

function initSqliteTables(db) {
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

    CREATE TABLE IF NOT EXISTS project_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      category TEXT NOT NULL,
      file_date TEXT,
      amount REAL DEFAULT 0,
      notes TEXT,
      file_path TEXT,
      created_at TEXT
    );
  `);
}

// Default Seed Data
const DEFAULT_STORE = {
  projects: [
    {
      id: 'SS-24-001',
      title: 'Tripoli Commercial Center — HVAC & Piping',
      client: 'Al-Naseem Contracting Group',
      site_address: 'Hai Al-Andalus, Tripoli, Libya',
      start_date: '15 Mar 2024',
      end_date: '30 Nov 2024',
      contract_amount: 185000,
      currency: 'LYD',
      paid_amount: 140000,
      payment_status: 'Partial',
      remarks: 'Phase 1 ducting approved by supervising engineer.',
      status: 'ACTIVE',
      created_at: '2024-03-15 09:00'
    },
    {
      id: 'SS-24-002',
      title: 'Palm City Luxury Residences — Chiller Overhaul',
      client: 'Palm City Facility Management',
      site_address: 'Janzour Seaside Road, Tripoli',
      start_date: '01 May 2024',
      end_date: '15 Dec 2024',
      contract_amount: 95000,
      currency: 'LYD',
      paid_amount: 95000,
      payment_status: 'Paid',
      remarks: 'Compressor replacement completed on Chiller #2.',
      status: 'ACTIVE',
      created_at: '2024-05-01 10:00'
    },
    {
      id: 'SS-23-014',
      title: 'Al-Dahra Substation — Fire Suppression Retrofit',
      client: 'GECOL (General Electric Company)',
      site_address: 'Al-Dahra Sector, Tripoli',
      start_date: '10 Aug 2023',
      end_date: '25 Jan 2024',
      contract_amount: 320000,
      currency: 'LYD',
      paid_amount: 288000,
      payment_status: 'Retention Due',
      remarks: 'Handover certificate issued Jan 2024.',
      status: 'ARCHIVE',
      created_at: '2023-08-10 11:00'
    }
  ],
  project_documents: [
    { id: 1, project_id: 'SS-24-001', filename: 'Tender_Offer_Signed_AlNaseem.pdf', category: 'Tender / Contract', file_date: '15 Mar 2024', amount: 185000, notes: 'Signed commercial offer' },
    { id: 2, project_id: 'SS-24-001', filename: 'HVAC_Shop_Drawings_Rev2.dwg', category: 'Drawing / CAD', file_date: '04 Apr 2024', amount: 0, notes: 'Approved by supervising consultant' },
    { id: 3, project_id: 'SS-24-001', filename: 'Invoice_Advance_Payment_01.pdf', category: 'Payment / Invoice', file_date: '18 Apr 2024', amount: 50000, notes: 'Mobilization advance check' },
    { id: 4, project_id: 'SS-24-001', filename: 'Packing_List_Chiller_Valves_PL409.pdf', category: 'Packing List', file_date: '12 Jun 2024', amount: 0, notes: 'Italian valves customs cleared' },
    { id: 5, project_id: 'SS-24-001', filename: 'Invoice_Interim_Payment_02.pdf', category: 'Payment / Invoice', file_date: '20 Jul 2024', amount: 90000, notes: 'Chiller piping milestone paid' },
    { id: 6, project_id: 'SS-24-002', filename: 'Maintenance_Agreement_Signed.pdf', category: 'Tender / Contract', file_date: '01 May 2024', amount: 95000, notes: '12-month preventive contract' },
    { id: 7, project_id: 'SS-24-002', filename: 'Full_Payment_Receipt.pdf', category: 'Payment / Invoice', file_date: '15 May 2024', amount: 95000, notes: '100% upfront bank transfer' },
    { id: 8, project_id: 'SS-23-014', filename: 'GECOL_Award_Letter_Contract.pdf', category: 'Tender / Contract', file_date: '10 Aug 2023', amount: 320000, notes: 'Official ministry contract' },
    { id: 9, project_id: 'SS-23-014', filename: 'Progress_Invoice_01_and_02.pdf', category: 'Payment / Invoice', file_date: '15 Dec 2023', amount: 288000, notes: '90% milestones paid' }
  ],
  tools: [
    { id: 'SS-TL-001', code: 'SS-TL-001', name: 'Hilti TE 70-ATC Rotary Hammer', brand: 'Hilti', model: 'TE 70-ATC (SDS Max)', category: 'Heavy Drills', serial: 'HLT-883921-23', shelf: 'Rack A-01', status: 'checked_out', assigned_to: 'Tariq Mansour', assigned_site: 'Tripoli Port Project', checkout_time: '2026-09-14 08:30', expected_return: '2026-09-22', condition: 'Good', icon: 'hammer' },
    { id: 'SS-TL-002', code: 'SS-TL-002', name: 'Fluke 87V Industrial Multimeter', brand: 'Fluke', model: '87V True-RMS', category: 'Electrical Testing', serial: 'FLK-449102-19', shelf: 'Locker E-03', status: 'available', assigned_to: null, assigned_site: null, checkout_time: null, expected_return: null, condition: 'Good', icon: 'zap' },
    { id: 'SS-TL-003', code: 'SS-TL-003', name: 'RIDGID 300 Compact Threading Machine', brand: 'RIDGID', model: '300 Compact 2"', category: 'Pipe Tools', serial: 'RDG-102934-21', shelf: 'Floor Bay B-02', status: 'checked_out', assigned_to: 'Ahmed Ben Ali', assigned_site: 'Al-Dahra Substation', checkout_time: '2026-09-10 07:15', expected_return: '2026-09-25', condition: 'Fair', icon: 'wrench' }
  ],
  technicians: [
    { id: 'T1', name: 'Tariq Mansour', role: 'Lead Mechanical Tech', phone: '+218 91 234 5678', dept: 'Mechanical', pin: '1234' },
    { id: 'T2', name: 'Ahmed Ben Ali', role: 'Senior Pipefitter', phone: '+218 92 345 6789', dept: 'Piping', pin: '5678' }
  ],
  sites: [
    { id: 1, name: 'Tripoli Commercial Center' },
    { id: 2, name: 'Palm City Luxury Residences' },
    { id: 3, name: 'Al-Dahra Substation' }
  ],
  audit_logs: []
};

// In-Memory store for JSON Engine
let store = null;

function loadStore() {
  if (store) return store;
  try {
    if (fs.existsSync(JSON_FILE)) {
      store = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
      return store;
    }
  } catch (err) {
    console.warn('Notice reading JSON store:', err.message);
  }
  store = JSON.parse(JSON.stringify(DEFAULT_STORE));
  saveStore();
  return store;
}

function saveStore() {
  try {
    const tmp = `${JSON_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(store, null, 2), 'utf8');
    fs.renameSync(tmp, JSON_FILE);
  } catch (err) {
    console.warn('Notice saving JSON store:', err.message);
  }
}

function getArchiveBasePath() {
  const isWindows = process.platform === 'win32';
  return isWindows ? 'C:\\Sadik_Sons_Archive\\Projects' : path.join(require('os').homedir(), 'Sadik_Sons_Archive', 'Projects');
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

const dbService = {
  getTools() {
    if (useJson) return loadStore().tools;
    return sqliteDb.prepare('SELECT * FROM tools ORDER BY id ASC').all().map(r => ({
      id: r.id, code: r.code, name: r.name, brand: r.brand, model: r.model,
      category: r.category, serial: r.serial, shelf: r.shelf, status: r.status,
      assignedTo: r.assigned_to, assignedSite: r.assigned_site, checkoutTime: r.checkout_time,
      expectedReturn: r.expected_return, condition: r.condition, icon: r.icon
    }));
  },

  getTool(id) {
    if (useJson) return loadStore().tools.find(t => t.id === id) || null;
    const r = sqliteDb.prepare('SELECT * FROM tools WHERE id = ?').get(id);
    if (!r) return null;
    return {
      id: r.id, code: r.code, name: r.name, brand: r.brand, model: r.model,
      category: r.category, serial: r.serial, shelf: r.shelf, status: r.status,
      assignedTo: r.assigned_to, assignedSite: r.assigned_site, checkoutTime: r.checkout_time,
      expectedReturn: r.expected_return, condition: r.condition, icon: r.icon
    };
  },

  addTool(tool) {
    if (useJson) {
      const s = loadStore();
      const newTool = { ...tool, id: tool.id || `SS-TL-${String(s.tools.length + 1).padStart(3, '0')}`, status: 'available' };
      s.tools.push(newTool);
      saveStore();
      return newTool;
    }
    const newId = tool.id || `SS-TL-${String(sqliteDb.prepare('SELECT COUNT(*) as c FROM tools').get().c + 1).padStart(3, '0')}`;
    sqliteDb.prepare(`
      INSERT INTO tools (id, code, name, brand, model, category, serial, shelf, status, condition, icon)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'available', ?, ?)
    `).run(newId, tool.code || newId, tool.name, tool.brand, tool.model || '', tool.category || '', tool.serial || '', tool.shelf || '', tool.condition || 'Good', tool.icon || 'tool');
    return this.getTool(newId);
  },

  checkoutTool({ toolId, technician, site, returnDate, notes }) {
    const now = getNowString();
    if (useJson) {
      const s = loadStore();
      const tool = s.tools.find(t => t.id === toolId);
      if (tool) {
        tool.status = 'checked_out';
        tool.assigned_to = technician;
        tool.assigned_site = site;
        tool.checkout_time = now;
        tool.expected_return = returnDate || null;
        s.audit_logs.unshift({ id: `log-${Date.now()}`, timestamp: now, action: 'CHECKOUT', tool_id: tool.id, tool_name: tool.name, technician, site, condition: tool.condition, notes: notes || '' });
        saveStore();
        return tool;
      }
      return null;
    }
    sqliteDb.prepare(`
      UPDATE tools SET status = 'checked_out', assigned_to = ?, assigned_site = ?, checkout_time = ?, expected_return = ? WHERE id = ?
    `).run(technician, site, now, returnDate || null, toolId);
    return this.getTool(toolId);
  },

  checkinTool({ toolId, condition, notes }) {
    const now = getNowString();
    if (useJson) {
      const s = loadStore();
      const tool = s.tools.find(t => t.id === toolId);
      if (tool) {
        tool.status = 'available';
        tool.assigned_to = null;
        tool.assigned_site = null;
        tool.checkout_time = null;
        tool.expected_return = null;
        tool.condition = condition || tool.condition;
        s.audit_logs.unshift({ id: `log-${Date.now()}`, timestamp: now, action: 'CHECKIN', tool_id: tool.id, tool_name: tool.name, technician: 'Office', site: 'Warehouse', condition: condition || tool.condition, notes: notes || '' });
        saveStore();
        return tool;
      }
      return null;
    }
    sqliteDb.prepare(`
      UPDATE tools SET status = 'available', assigned_to = NULL, assigned_site = NULL, checkout_time = NULL, expected_return = NULL, condition = ? WHERE id = ?
    `).run(condition || 'Good', toolId);
    return this.getTool(toolId);
  },

  getTechnicians() {
    if (useJson) return loadStore().technicians;
    return sqliteDb.prepare('SELECT * FROM technicians ORDER BY name ASC').all();
  },

  getSites() {
    if (useJson) return loadStore().sites;
    return sqliteDb.prepare('SELECT * FROM sites ORDER BY name ASC').all();
  },

  getLogs() {
    if (useJson) return loadStore().audit_logs;
    return sqliteDb.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 100').all();
  },

  getStats() {
    if (useJson) {
      const s = loadStore();
      const total = s.tools.length;
      const checkedOut = s.tools.filter(t => t.status === 'checked_out').length;
      return { total, available: total - checkedOut, checkedOut, maintenance: 0 };
    }
    const tools = this.getTools();
    const total = tools.length;
    const checkedOut = tools.filter(t => t.status === 'checked_out').length;
    return { total, available: total - checkedOut, checkedOut, maintenance: 0 };
  },

  getProjects() {
    if (useJson) return loadStore().projects;
    return sqliteDb.prepare('SELECT * FROM projects ORDER BY id DESC').all();
  },

  getProject(id) {
    const cleanId = String(id || '').trim().toUpperCase();
    if (useJson) return loadStore().projects.find(p => p.id.toUpperCase() === cleanId) || null;
    return sqliteDb.prepare('SELECT * FROM projects WHERE UPPER(id) = ?').get(cleanId);
  },

  addProject(project) {
    const cleanId = String(project.id || '').trim().toUpperCase();
    const folderPath = ensureProjectFolders({ ...project, id: cleanId });
    const nowStr = getNowString();

    const record = {
      id: cleanId,
      title: project.title || 'Untitled Project',
      client: project.client || 'Unknown Client',
      site_address: project.siteAddress || project.site_address || '',
      start_date: project.startDate || project.start_date || '',
      end_date: project.endDate || project.end_date || '',
      contract_amount: Number(project.contractAmount || project.contract_amount) || 0,
      currency: project.currency || 'LYD',
      paid_amount: Number(project.paidAmount || project.paid_amount) || 0,
      payment_status: project.paymentStatus || project.payment_status || 'Pending',
      remarks: project.remarks || '',
      status: project.status || 'ACTIVE',
      folder_path: folderPath,
      created_at: nowStr
    };

    if (useJson) {
      const s = loadStore();
      const existingIdx = s.projects.findIndex(p => p.id.toUpperCase() === cleanId);
      if (existingIdx >= 0) s.projects[existingIdx] = record;
      else s.projects.unshift(record);
      saveStore();

      if (record.paid_amount > 0) {
        this.addProjectDocument({
          projectId: cleanId,
          filename: `Advance_Payment_${cleanId}.pdf`,
          category: 'Payment / Invoice',
          fileDate: record.start_date || nowStr.split(' ')[0],
          amount: record.paid_amount,
          notes: 'Initial advance payment / mobilization deposit'
        });
      }

      return this.getProject(cleanId);
    }

    sqliteDb.prepare(`
      INSERT INTO projects (id, title, client, site_address, start_date, end_date, contract_amount, currency, paid_amount, payment_status, remarks, status, folder_path, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(record.id, record.title, record.client, record.site_address, record.start_date, record.end_date, record.contract_amount, record.currency, record.paid_amount, record.payment_status, record.remarks, record.status, record.folder_path, record.created_at);

    if (record.paid_amount > 0) {
      this.addProjectDocument({
        projectId: cleanId,
        filename: `Advance_Payment_${cleanId}.pdf`,
        category: 'Payment / Invoice',
        fileDate: record.start_date || nowStr.split(' ')[0],
        amount: record.paid_amount,
        notes: 'Initial advance payment / mobilization deposit'
      });
    }

    return this.getProject(cleanId);
  },

  updateProject(project) {
    const cleanId = String(project.id || '').trim().toUpperCase();
    if (useJson) {
      const s = loadStore();
      const existing = s.projects.find(p => p.id.toUpperCase() === cleanId);
      if (!existing) return null;
      Object.assign(existing, project, { id: cleanId });
      saveStore();
      return existing;
    }
    sqliteDb.prepare(`
      UPDATE projects SET 
        title = COALESCE(?, title),
        client = COALESCE(?, client),
        site_address = COALESCE(?, site_address),
        start_date = COALESCE(?, start_date),
        end_date = COALESCE(?, end_date),
        contract_amount = COALESCE(?, contract_amount),
        currency = COALESCE(?, currency),
        paid_amount = COALESCE(?, paid_amount),
        payment_status = COALESCE(?, payment_status),
        remarks = COALESCE(?, remarks),
        status = COALESCE(?, status)
      WHERE UPPER(id) = ?
    `).run(
      project.title ?? null,
      project.client ?? null,
      (project.siteAddress !== undefined ? project.siteAddress : project.site_address) ?? null,
      (project.startDate !== undefined ? project.startDate : project.start_date) ?? null,
      (project.endDate !== undefined ? project.endDate : project.end_date) ?? null,
      (project.contractAmount !== undefined ? project.contractAmount : project.contract_amount) ?? null,
      project.currency ?? null,
      (project.paidAmount !== undefined ? project.paidAmount : project.paid_amount) ?? null,
      (project.paymentStatus !== undefined ? project.paymentStatus : project.payment_status) ?? null,
      project.remarks ?? null,
      project.status ?? null,
      cleanId
    );
    return this.getProject(cleanId);
  },

  deleteProject(id) {
    const cleanId = String(id || '').trim().toUpperCase();
    if (useJson) {
      const s = loadStore();
      s.projects = s.projects.filter(p => p.id.toUpperCase() !== cleanId);
      s.project_documents = s.project_documents.filter(d => (d.project_id || '').toUpperCase() !== cleanId);
      saveStore();
      return { success: true };
    }
    sqliteDb.prepare('DELETE FROM project_documents WHERE UPPER(project_id) = ?').run(cleanId);
    sqliteDb.prepare('DELETE FROM projects WHERE UPPER(id) = ?').run(cleanId);
    return { success: true };
  },

  getProjectDocuments(projectId) {
    const cleanId = String(projectId || '').trim().toUpperCase();
    if (useJson) {
      return loadStore().project_documents.filter(d => (d.project_id || '').toUpperCase() === cleanId).reverse();
    }
    return sqliteDb.prepare('SELECT * FROM project_documents WHERE UPPER(project_id) = ? ORDER BY id DESC').all(cleanId);
  },

  addProjectDocument(doc) {
    const cleanId = String(doc.projectId || doc.project_id || '').trim().toUpperCase();
    const project = this.getProject(cleanId);
    if (!project) throw new Error(`Project ${cleanId} not found`);

    const nowStr = getNowString();
    const amountVal = Number(doc.amount) || 0;
    const cat = doc.category || 'Tender / Contract';
    const catLower = cat.toLowerCase();

    if (useJson) {
      const s = loadStore();
      const newDoc = {
        id: Date.now(),
        project_id: cleanId,
        filename: doc.filename || 'Untitled Document',
        category: cat,
        file_date: doc.fileDate || doc.file_date || nowStr.split(' ')[0],
        amount: amountVal,
        notes: doc.notes || '',
        file_path: doc.filePath || doc.file_path || '',
        created_at: nowStr
      };
      s.project_documents.push(newDoc);

      const isPayment = (amountVal > 0 && !catLower.includes('tender') && !catLower.includes('drawing')) || catLower.includes('payment') || catLower.includes('invoice') || catLower.includes('advance');
      if (isPayment) {
        const totalPaid = s.project_documents
          .filter(d => d.project_id.toUpperCase() === cleanId && d.amount > 0 && !d.category.toLowerCase().includes('tender') && !d.category.toLowerCase().includes('drawing'))
          .reduce((sum, d) => sum + Number(d.amount), 0);

        const contractAmt = Number(project.contract_amount) || 0;
        let newStatus = 'Partial';
        if (totalPaid >= contractAmt && contractAmt > 0) newStatus = 'Paid';
        else if (totalPaid === 0) newStatus = 'Pending';

        project.paid_amount = totalPaid;
        project.payment_status = newStatus;
      }
      saveStore();
      return this.getProjectDocuments(cleanId);
    }

    sqliteDb.prepare(`
      INSERT INTO project_documents (project_id, filename, category, file_date, amount, notes, file_path, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(cleanId, doc.filename || 'Untitled Document', cat, doc.fileDate || nowStr.split(' ')[0], amountVal, doc.notes || '', doc.filePath || '', nowStr);

    const isPayment = (amountVal > 0 && !catLower.includes('tender') && !catLower.includes('drawing')) || catLower.includes('payment') || catLower.includes('invoice') || catLower.includes('advance');
    if (isPayment) {
      const allPayments = sqliteDb.prepare(`
        SELECT SUM(amount) as totalPaid FROM project_documents 
        WHERE UPPER(project_id) = ? AND amount > 0 AND LOWER(category) NOT LIKE '%tender%' AND LOWER(category) NOT LIKE '%drawing%'
      `).get(cleanId);

      const totalPaid = allPayments ? (allPayments.totalPaid || 0) : 0;
      const contractAmt = Number(project.contract_amount) || 0;
      let newStatus = totalPaid >= contractAmt && contractAmt > 0 ? 'Paid' : (totalPaid > 0 ? 'Partial' : 'Pending');

      sqliteDb.prepare('UPDATE projects SET paid_amount = ?, payment_status = ? WHERE UPPER(id) = ?').run(totalPaid, newStatus, cleanId);
    }

    return this.getProjectDocuments(cleanId);
  },

  deleteProjectDocument(docId) {
    if (useJson) {
      const s = loadStore();
      const idx = s.project_documents.findIndex(d => String(d.id) === String(docId));
      if (idx < 0) return { success: false };
      const doc = s.project_documents[idx];
      s.project_documents.splice(idx, 1);

      const proj = this.getProject(doc.project_id);
      if (proj) {
        const totalPaid = s.project_documents
          .filter(d => d.project_id.toUpperCase() === proj.id.toUpperCase() && d.amount > 0 && !d.category.toLowerCase().includes('tender') && !d.category.toLowerCase().includes('drawing'))
          .reduce((sum, d) => sum + Number(d.amount), 0);
        const contractAmt = Number(proj.contract_amount) || 0;
        proj.paid_amount = totalPaid;
        proj.payment_status = totalPaid >= contractAmt && contractAmt > 0 ? 'Paid' : (totalPaid > 0 ? 'Partial' : 'Pending');
      }
      saveStore();
      return { success: true };
    }

    const doc = sqliteDb.prepare('SELECT * FROM project_documents WHERE id = ?').get(docId);
    if (!doc) return { success: false };
    sqliteDb.prepare('DELETE FROM project_documents WHERE id = ?').run(docId);

    const allPayments = sqliteDb.prepare(`
      SELECT SUM(amount) as totalPaid FROM project_documents 
      WHERE UPPER(project_id) = ? AND amount > 0 AND LOWER(category) NOT LIKE '%tender%' AND LOWER(category) NOT LIKE '%drawing%'
    `).get(doc.project_id);

    const totalPaid = allPayments ? (allPayments.totalPaid || 0) : 0;
    const project = this.getProject(doc.project_id);
    const contractAmt = project ? Number(project.contract_amount) : 0;
    let newStatus = totalPaid >= contractAmt && contractAmt > 0 ? 'Paid' : (totalPaid > 0 ? 'Partial' : 'Pending');

    sqliteDb.prepare('UPDATE projects SET paid_amount = ?, payment_status = ? WHERE UPPER(id) = ?').run(totalPaid, newStatus, doc.project_id);
    return { success: true };
  },

  updateDocument(docId, updates) {
    if (useJson) {
      const s = loadStore();
      const doc = s.project_documents.find(d => String(d.id) === String(docId));
      if (!doc) return null;
      if (updates.filename !== undefined) doc.filename = updates.filename;
      if (updates.category !== undefined) doc.category = updates.category;
      if (updates.fileDate !== undefined || updates.file_date !== undefined) doc.file_date = updates.fileDate || updates.file_date;
      if (updates.amount !== undefined) doc.amount = Number(updates.amount) || 0;
      if (updates.notes !== undefined) doc.notes = updates.notes;
      if (updates.filePath !== undefined || updates.file_path !== undefined) doc.file_path = updates.filePath || updates.file_path;

      const proj = this.getProject(doc.project_id);
      if (proj) {
        const totalPaid = s.project_documents
          .filter(d => d.project_id.toUpperCase() === proj.id.toUpperCase() && d.amount > 0 && !d.category.toLowerCase().includes('tender') && !d.category.toLowerCase().includes('drawing'))
          .reduce((sum, d) => sum + Number(d.amount), 0);
        const contractAmt = Number(proj.contract_amount) || 0;
        proj.paid_amount = totalPaid;
        proj.payment_status = totalPaid >= contractAmt && contractAmt > 0 ? 'Paid' : (totalPaid > 0 ? 'Partial' : 'Pending');
      }
      saveStore();
      return doc;
    }

    const doc = sqliteDb.prepare('SELECT * FROM project_documents WHERE id = ?').get(docId);
    if (!doc) return null;

    const newFilename = updates.filename !== undefined ? updates.filename : doc.filename;
    const newCategory = updates.category !== undefined ? updates.category : doc.category;
    const newDate = updates.fileDate !== undefined ? updates.fileDate : (updates.file_date !== undefined ? updates.file_date : doc.file_date);
    const newAmount = updates.amount !== undefined ? (Number(updates.amount) || 0) : doc.amount;
    const newNotes = updates.notes !== undefined ? updates.notes : doc.notes;
    const newFilePath = updates.filePath !== undefined ? updates.filePath : (updates.file_path !== undefined ? updates.file_path : doc.file_path);

    sqliteDb.prepare(`
      UPDATE project_documents SET
        filename = ?, category = ?, file_date = ?, amount = ?, notes = ?, file_path = ?
      WHERE id = ?
    `).run(newFilename, newCategory, newDate, newAmount, newNotes, newFilePath, docId);

    const allPayments = sqliteDb.prepare(`
      SELECT SUM(amount) as totalPaid FROM project_documents 
      WHERE UPPER(project_id) = ? AND amount > 0 AND LOWER(category) NOT LIKE '%tender%' AND LOWER(category) NOT LIKE '%drawing%'
    `).get(doc.project_id);

    const totalPaid = allPayments ? (allPayments.totalPaid || 0) : 0;
    const project = this.getProject(doc.project_id);
    const contractAmt = project ? Number(project.contract_amount) : 0;
    let newStatus = totalPaid >= contractAmt && contractAmt > 0 ? 'Paid' : (totalPaid > 0 ? 'Partial' : 'Pending');

    sqliteDb.prepare('UPDATE projects SET paid_amount = ?, payment_status = ? WHERE UPPER(id) = ?').run(totalPaid, newStatus, doc.project_id);

    return sqliteDb.prepare('SELECT * FROM project_documents WHERE id = ?').get(docId);
  },

  openProjectFolder(id) {
    try {
      let targetPath = '';
      if (id === 'ROOT' || !id) {
        targetPath = getArchiveBasePath();
      } else {
        const project = this.getProject(id);
        if (project) {
          targetPath = project.folder_path || ensureProjectFolders(project);
        } else {
          targetPath = getArchiveBasePath();
        }
      }

      if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath, { recursive: true });
      }

      const platform = process.platform;
      let cmd = '';
      if (platform === 'darwin') {
        cmd = `open "${targetPath}"`;
      } else if (platform === 'win32') {
        cmd = `explorer.exe "${targetPath}"`;
      } else {
        cmd = `xdg-open "${targetPath}"`;
      }

      const { exec } = require('child_process');
      exec(cmd, (err) => {
        if (err) console.warn('openFolder notice:', err.message);
      });

      return { success: true, path: targetPath };
    } catch (err) {
      console.error('openProjectFolder error:', err);
      return { success: false, error: err.message };
    }
  },

  openFile(filePath) {
    try {
      if (!filePath || !fs.existsSync(filePath)) {
        return { success: false, error: 'File does not exist on local disk' };
      }
      const platform = process.platform;
      let cmd = '';
      if (platform === 'darwin') {
        cmd = `open "${filePath}"`;
      } else if (platform === 'win32') {
        cmd = `start "" "${filePath}"`;
      } else {
        cmd = `xdg-open "${filePath}"`;
      }
      const { exec } = require('child_process');
      exec(cmd, (err) => {
        if (err) console.warn('openFile notice:', err.message);
      });
      return { success: true, path: filePath };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  attachFile({ projectId, sourcePath, category, filename, fileDate, amount, notes }) {
    const cleanId = String(projectId || '').trim().toUpperCase();
    const project = this.getProject(cleanId);
    if (!project) throw new Error(`Project ${cleanId} not found`);

    const folderPath = project.folder_path || ensureProjectFolders(project);
    let destSubfolder = '01_Contracts_and_Agreements';
    const catLower = (category || '').toLowerCase();
    if (catLower.includes('drawing') || catLower.includes('cad')) {
      destSubfolder = '02_Engineering_Drawings_and_CAD';
    } else if (catLower.includes('payment') || catLower.includes('invoice') || catLower.includes('advance')) {
      destSubfolder = '03_Invoices_and_Financial_Docs';
    } else if (catLower.includes('spec') || catLower.includes('parts') || catLower.includes('material')) {
      destSubfolder = '04_Technical_Specs_and_Spare_Parts';
    } else if (catLower.includes('report') || catLower.includes('handover') || catLower.includes('site')) {
      destSubfolder = '05_Site_Reports_and_Handover';
    }

    const targetDir = path.join(folderPath, destSubfolder);
    fs.mkdirSync(targetDir, { recursive: true });

    let finalFilename = filename || (sourcePath ? path.basename(sourcePath) : 'Document.pdf');
    let targetFilePath = '';

    if (sourcePath && fs.existsSync(sourcePath)) {
      targetFilePath = path.join(targetDir, finalFilename);
      if (fs.existsSync(targetFilePath)) {
        const ext = path.extname(finalFilename);
        const base = path.basename(finalFilename, ext);
        finalFilename = `${base}_${Date.now()}${ext}`;
        targetFilePath = path.join(targetDir, finalFilename);
      }
      fs.copyFileSync(sourcePath, targetFilePath);
    }

    return this.addProjectDocument({
      projectId: cleanId,
      filename: finalFilename,
      category: category || 'Tender / Contract',
      fileDate: fileDate,
      amount: amount || 0,
      notes: notes || '',
      filePath: targetFilePath
    });
  },

  clearDemoData() {
    if (useJson) {
      const s = loadStore();
      s.projects = [];
      s.project_documents = [];
      saveStore();
      return { success: true };
    }
    sqliteDb.prepare('DELETE FROM project_documents').run();
    sqliteDb.prepare('DELETE FROM projects').run();
    return { success: true };
  },

  resetDemoData() {
    if (useJson) {
      store = JSON.parse(JSON.stringify(DEFAULT_STORE));
      saveStore();
      return { success: true };
    }
    sqliteDb.prepare('DELETE FROM project_documents').run();
    sqliteDb.prepare('DELETE FROM projects').run();
    DEFAULT_STORE.projects.forEach(p => this.addProject(p));
    DEFAULT_STORE.project_documents.forEach(d => this.addProjectDocument(d));
    return { success: true };
  },

  getDatabaseFilePath() {
    if (useJson) {
      if (!fs.existsSync(JSON_FILE)) saveStore();
      return JSON_FILE;
    }
    if (fs.existsSync(DB_FILE)) return DB_FILE;
    if (fs.existsSync(JSON_FILE)) return JSON_FILE;
    saveStore();
    return JSON_FILE;
  },

  getStorageInfo() {
    const filePath = this.getDatabaseFilePath();
    return {
      engine: useJson ? 'Zero-Dependency JSON' : 'SQLite Database',
      fileName: filePath ? path.basename(filePath) : 'database',
      path: filePath,
      archivePath: getArchiveBasePath()
    };
  }
};

module.exports = dbService;
