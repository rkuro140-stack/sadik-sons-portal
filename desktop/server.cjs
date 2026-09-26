const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const db = require('./db.cjs');
const cloudSync = require('./cloudSync.cjs');

const PORT = process.env.PORT || 3000;
const DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'application/javascript',
  '.cjs': 'application/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-cache, no-store, must-revalidate'
  });
  res.end(JSON.stringify(data));
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const urlParts = req.url.split('?');
  const reqPath = urlParts[0];

  // Enable CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  // --- REST API ENDPOINTS ---
  if (reqPath.startsWith('/api/')) {
    try {
      // GET /api/config
      if (reqPath === '/api/config' && req.method === 'GET') {
        const localIP = getLocalIP();
        return sendJson(res, 200, {
          localIP: localIP,
          port: PORT,
          hostUrl: `http://${localIP}:${PORT}`
        });
      }

      // GET /api/tools
      if (reqPath === '/api/tools' && req.method === 'GET') {
        return sendJson(res, 200, db.getTools());
      }

      // GET /api/tools/:id
      if (reqPath.startsWith('/api/tools/') && req.method === 'GET') {
        const id = decodeURIComponent(reqPath.replace('/api/tools/', ''));
        const tool = db.getTool(id);
        if (!tool) return sendJson(res, 404, { error: 'Tool not found' });
        return sendJson(res, 200, tool);
      }

      // POST /api/tools
      if (reqPath === '/api/tools' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const newTool = db.addTool(body);
        return sendJson(res, 201, newTool);
      }

      // POST /api/checkout
      if (reqPath === '/api/checkout' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const updated = db.checkoutTool(body);
        return sendJson(res, 200, updated);
      }

      // POST /api/checkin
      if (reqPath === '/api/checkin' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const updated = db.checkinTool(body);
        return sendJson(res, 200, updated);
      }

      // GET /api/technicians
      if (reqPath === '/api/technicians' && req.method === 'GET') {
        return sendJson(res, 200, db.getTechnicians());
      }

      // GET /api/sites
      if (reqPath === '/api/sites' && req.method === 'GET') {
        return sendJson(res, 200, db.getSites());
      }

      // GET /api/logs
      if (reqPath === '/api/logs' && req.method === 'GET') {
        return sendJson(res, 200, db.getLogs());
      }

      // GET /api/stats
      if (reqPath === '/api/stats' && req.method === 'GET') {
        return sendJson(res, 200, db.getStats());
      }

      // --- PROJECT ARCHIVE APIS ---
      // GET /api/projects
      if (reqPath === '/api/projects' && req.method === 'GET') {
        return sendJson(res, 200, db.getProjects());
      }

      // GET /api/projects/:id
      if (reqPath.startsWith('/api/projects/') && req.method === 'GET') {
        const id = decodeURIComponent(reqPath.replace('/api/projects/', ''));
        const proj = db.getProject(id);
        if (!proj) return sendJson(res, 404, { error: 'Project not found' });
        return sendJson(res, 200, proj);
      }

      // POST /api/projects
      if (reqPath === '/api/projects' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const created = db.addProject(body);
        cloudSync.syncProject(created).catch(() => {});
        return sendJson(res, 201, created);
      }

      // PUT /api/projects/:id
      if (reqPath.startsWith('/api/projects/') && req.method === 'PUT') {
        const id = decodeURIComponent(reqPath.replace('/api/projects/', ''));
        const body = await parseJsonBody(req);
        const updated = db.updateProject({ ...body, id });
        cloudSync.syncProject(updated).catch(() => {});
        return sendJson(res, 200, updated);
      }

      // DELETE /api/projects/:id
      if (reqPath.startsWith('/api/projects/') && !reqPath.includes('/documents') && req.method === 'DELETE') {
        const id = decodeURIComponent(reqPath.replace('/api/projects/', ''));
        const result = db.deleteProject(id);
        cloudSync.deleteProject(id).catch(() => {});
        return sendJson(res, 200, result);
      }

      // GET /api/projects/:id/documents
      if (reqPath.startsWith('/api/projects/') && reqPath.endsWith('/documents') && req.method === 'GET') {
        const id = decodeURIComponent(reqPath.replace('/api/projects/', '').replace('/documents', ''));
        return sendJson(res, 200, db.getProjectDocuments(id));
      }

      // POST /api/projects/:id/documents
      if (reqPath.startsWith('/api/projects/') && reqPath.endsWith('/documents') && req.method === 'POST') {
        const id = decodeURIComponent(reqPath.replace('/api/projects/', '').replace('/documents', ''));
        const body = await parseJsonBody(req);
        const docs = db.addProjectDocument({ ...body, projectId: id });
        cloudSync.syncDocument({ ...body, projectId: id }).catch(() => {});
        const updatedProj = db.getProject(id);
        if (updatedProj) cloudSync.syncProject(updatedProj).catch(() => {});
        return sendJson(res, 201, docs);
      }

      // PUT /api/documents/:id
      if (reqPath.startsWith('/api/documents/') && req.method === 'PUT') {
        const docId = decodeURIComponent(reqPath.replace('/api/documents/', ''));
        const body = await parseJsonBody(req);
        const updated = db.updateDocument(docId, body);
        if (!updated) return sendJson(res, 404, { error: 'Document not found' });
        cloudSync.syncDocument(updated).catch(() => {});
        const updatedProj = db.getProject(updated.project_id);
        if (updatedProj) cloudSync.syncProject(updatedProj).catch(() => {});
        return sendJson(res, 200, updated);
      }

      // DELETE /api/documents/:id
      if (reqPath.startsWith('/api/documents/') && req.method === 'DELETE') {
        const docId = decodeURIComponent(reqPath.replace('/api/documents/', ''));
        // Find doc first to know project id for cloud sync
        const allProjects = db.getProjects();
        let targetProjId = null;
        for (const p of allProjects) {
          const docs = db.getProjectDocuments(p.id);
          if (docs.some(d => String(d.id) === String(docId))) {
            targetProjId = p.id;
            break;
          }
        }
        const result = db.deleteProjectDocument(docId);
        cloudSync.deleteDocument(docId, targetProjId).catch(() => {});
        if (targetProjId) {
          const updatedProj = db.getProject(targetProjId);
          if (updatedProj) cloudSync.syncProject(updatedProj).catch(() => {});
        }
        return sendJson(res, 200, result);
      }

      // POST /api/documents/attach
      if (reqPath === '/api/documents/attach' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const docs = db.attachFile(body);
        cloudSync.syncDocument({ ...body, filename: body.filename }).catch(() => {});
        const updatedProj = db.getProject(body.projectId);
        if (updatedProj) cloudSync.syncProject(updatedProj).catch(() => {});
        return sendJson(res, 201, docs);
      }

      // POST /api/documents/open-file
      if (reqPath === '/api/documents/open-file' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const result = db.openFile(body.filePath);
        return sendJson(res, 200, result);
      }

      // POST /api/system/clear-demo
      if (reqPath === '/api/system/clear-demo' && req.method === 'POST') {
        const result = db.clearDemoData();
        return sendJson(res, 200, result);
      }

      // POST /api/system/reset-demo
      if (reqPath === '/api/system/reset-demo' && req.method === 'POST') {
        const result = db.resetDemoData();
        return sendJson(res, 200, result);
      }

      // GET /api/cloud-status
      if (reqPath === '/api/cloud-status' && req.method === 'GET') {
        return sendJson(res, 200, { configured: cloudSync.isConfigured() });
      }

      // POST /api/sync-cloud
      if (reqPath === '/api/sync-cloud' && req.method === 'POST') {
        const result = await cloudSync.syncAll(db.getProjects(), id => db.getProjectDocuments(id));
        return sendJson(res, 200, result);
      }

      // POST /api/projects/open-folder
      if ((reqPath === '/api/projects/open-folder' || reqPath === '/api/open-folder') && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const result = db.openProjectFolder(body.id);
        return sendJson(res, 200, result);
      }

      // GET /api/info
      if (reqPath === '/api/info' && req.method === 'GET') {
        return sendJson(res, 200, db.getStorageInfo());
      }

      // GET /api/backup
      if (reqPath === '/api/backup' && req.method === 'GET') {
        const fileToSend = db.getDatabaseFilePath();
        if (fileToSend && fs.existsSync(fileToSend)) {
          const ext = path.extname(fileToSend) || '.json';
          const filename = `sadik_sons_backup_${new Date().toISOString().split('T')[0]}${ext}`;
          res.writeHead(200, {
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${filename}"`
          });
          fs.createReadStream(fileToSend).pipe(res);
          return;
        }
        return sendJson(res, 404, { error: 'No database file found to backup' });
      }

      return sendJson(res, 404, { error: 'API endpoint not found' });
    } catch (apiErr) {
      console.error('API Error:', apiErr);
      return sendJson(res, 400, { error: apiErr.message || 'Server API Error' });
    }
  }

  // --- STATIC WEB PAGE ROUTING ---
  
  // Route: /scan or /scan?id=... -> mobile-scan.html
  if (reqPath === '/scan' || reqPath === '/scan.html' || reqPath === '/mobile') {
    const mobilePath = path.join(DIR, 'mobile-scan.html');
    fs.readFile(mobilePath, (err, content) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error loading mobile scan page');
        return;
      }
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=UTF-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      });
      res.end(content);
    });
    return;
  }

  // Route: Main Index / Fallback
  let targetFile = reqPath === '/' || reqPath === '' ? 'index.html' : reqPath;
  const filePath = path.join(DIR, targetFile);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      const indexPath = path.join(DIR, 'index.html');
      fs.readFile(indexPath, (readErr, content) => {
        if (readErr) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('404 Not Found');
          return;
        }
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=UTF-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        });
        res.end(content);
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Server Error');
        return;
      }
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      });
      res.end(content);
    });
  });
});

function startServer(port = PORT, cb) {
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} already active. Connecting to running server.`);
      if (cb) cb(null, port);
    } else {
      console.error('Server error:', err);
      if (cb) cb(err);
    }
  });

  server.listen(port, '0.0.0.0', () => {
    const localIP = getLocalIP();
    console.log('====================================================');
    console.log('  ⚡ SADIK SONS ENTERPRISES | Office Operations Suite');
    console.log('====================================================');
    console.log(`  > Desktop App:    http://localhost:${port}`);
    console.log(`  > Office Network: http://${localIP}:${port}`);
    console.log('====================================================');
    if (cb) cb(null, port);
  });
}

if (require.main === module) {
  startServer(PORT);
}

module.exports = { server, startServer };
