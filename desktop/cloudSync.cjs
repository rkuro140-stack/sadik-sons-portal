/**
 * Sadik Sons Enterprise — Cloud Synchronization Service
 * Replicates local SQLite archive data to Supabase for 4G mobile QR scanning
 */
const fs = require('fs');
const path = require('path');

let config = null;
const configPath = path.join(__dirname, 'config.json');

function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (err) {
    console.warn('Could not read config.json:', err.message);
  }
}

loadConfig();

const cloudSync = {
  isConfigured() {
    loadConfig();
    return !!(config && config.supabaseUrl && config.supabaseKey && !config.supabaseUrl.includes('your-project'));
  },

  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'apikey': config.supabaseKey,
      'Authorization': `Bearer ${config.supabaseKey}`,
      'Prefer': 'resolution=merge-duplicates'
    };
  },

  async syncProject(project) {
    if (!this.isConfigured()) return { skipped: true };
    try {
      const payload = {
        id: project.id,
        title: project.title,
        client: project.client,
        site_address: project.site_address || project.siteAddress || '',
        start_date: project.start_date || project.startDate || '',
        end_date: project.end_date || project.endDate || '',
        contract_amount: Number(project.contract_amount || project.contractAmount || 0),
        currency: project.currency || 'LYD',
        paid_amount: Number(project.paid_amount || project.paidAmount || 0),
        payment_status: project.payment_status || project.paymentStatus || 'Pending',
        remarks: project.remarks || '',
        status: project.status || 'ACTIVE'
      };

      const res = await fetch(`${config.supabaseUrl}/rest/v1/projects`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload)
      });

      return { success: res.ok, status: res.status };
    } catch (err) {
      console.warn('Project cloud sync notice:', err.message);
      return { success: false, error: err.message };
    }
  },

  async syncDocument(doc) {
    if (!this.isConfigured()) return { skipped: true };
    try {
      const payload = {
        project_id: doc.project_id || doc.projectId,
        filename: doc.filename,
        category: doc.category,
        file_date: doc.file_date || doc.fileDate || '',
        amount: Number(doc.amount || 0),
        notes: doc.notes || ''
      };

      const res = await fetch(`${config.supabaseUrl}/rest/v1/project_documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': config.supabaseKey,
          'Authorization': `Bearer ${config.supabaseKey}`
        },
        body: JSON.stringify(payload)
      });

      return { success: res.ok, status: res.status };
    } catch (err) {
      console.warn('Document cloud sync notice:', err.message);
      return { success: false, error: err.message };
    }
  },

  async deleteProject(projectId) {
    if (!this.isConfigured()) return { skipped: true };
    try {
      const cleanId = String(projectId || '').trim().toUpperCase();
      // Delete documents first
      await fetch(`${config.supabaseUrl}/rest/v1/project_documents?project_id=eq.${encodeURIComponent(cleanId)}`, {
        method: 'DELETE',
        headers: {
          'apikey': config.supabaseKey,
          'Authorization': `Bearer ${config.supabaseKey}`
        }
      });
      // Delete project
      const res = await fetch(`${config.supabaseUrl}/rest/v1/projects?id=eq.${encodeURIComponent(cleanId)}`, {
        method: 'DELETE',
        headers: {
          'apikey': config.supabaseKey,
          'Authorization': `Bearer ${config.supabaseKey}`
        }
      });
      return { success: res.ok };
    } catch (err) {
      console.warn('Cloud project delete notice:', err.message);
      return { success: false, error: err.message };
    }
  },

  async deleteDocument(docId, projectId) {
    if (!this.isConfigured()) return { skipped: true };
    try {
      const res = await fetch(`${config.supabaseUrl}/rest/v1/project_documents?id=eq.${encodeURIComponent(docId)}`, {
        method: 'DELETE',
        headers: {
          'apikey': config.supabaseKey,
          'Authorization': `Bearer ${config.supabaseKey}`
        }
      });
      return { success: res.ok };
    } catch (err) {
      console.warn('Cloud document delete notice:', err.message);
      return { success: false, error: err.message };
    }
  },

  async syncAll(projects, documentsGetter) {
    if (!this.isConfigured()) return { success: false, message: 'Cloud credentials not configured' };
    try {
      let projectsSynced = 0;
      let docsSynced = 0;

      for (const p of projects) {
        await this.syncProject(p);
        projectsSynced++;

        if (typeof documentsGetter === 'function') {
          const docs = documentsGetter(p.id);
          for (const d of docs) {
            await this.syncDocument(d);
            docsSynced++;
          }
        }
      }

      return { success: true, projectsSynced, docsSynced };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
};

module.exports = cloudSync;
