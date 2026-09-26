/**
 * Sadik Sons Enterprises — Desktop Main Process (Electron)
 * Industrial & MEP Contracting Operations Suite
 */
const { app, BrowserWindow, ipcMain, shell, dialog, Menu } = require('electron');
const path = require('path');
const { startServer } = require('./server.cjs');

let mainWindow = null;
const PORT = process.env.PORT || 3000;

function createWindow() {
  const iconPath = path.join(__dirname, 'assets', 'icon.png');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 1024,
    minHeight: 700,
    title: 'Sadik Sons Enterprises — Office Management Suite',
    icon: iconPath,
    backgroundColor: '#F8FAFC',
    show: true, // Always show window immediately
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false
    }
  });

  const targetUrl = `http://localhost:${PORT}`;

  function loadWithRetry(retries = 15) {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.loadURL(targetUrl).catch(err => {
      console.log(`Waiting for local server... (${retries} retries left)`);
      if (retries > 0) {
        setTimeout(() => loadWithRetry(retries - 1), 400);
      }
    });
  }

  loadWithRetry();

  // IPC: Open local hard drive folder in native OS Explorer / Finder
  ipcMain.handle('open-folder', async (event, folderPath) => {
    try {
      if (folderPath) {
        await shell.openPath(folderPath);
        return { success: true };
      }
      return { success: false, error: 'Path not specified' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // IPC: Open local file directly with default OS application
  ipcMain.handle('open-file', async (event, filePath) => {
    try {
      if (filePath) {
        await shell.openPath(filePath);
        return { success: true };
      }
      return { success: false, error: 'File path not specified' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // IPC: Native File Selector
  ipcMain.handle('select-file', async (event, options = {}) => {
    const res = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Project Document or CAD Drawing',
      properties: ['openFile'],
      filters: [
        { name: 'All Project Documents', extensions: ['pdf', 'dwg', 'dxf', 'doc', 'docx', 'xls', 'xlsx', 'png', 'jpg', 'zip'] },
        { name: 'CAD Drawings (*.dwg, *.dxf)', extensions: ['dwg', 'dxf'] },
        { name: 'PDF Documents (*.pdf)', extensions: ['pdf'] },
        { name: 'All Files (*.*)', extensions: ['*'] }
      ]
    });
    return res;
  });

  // IPC: Native Print
  ipcMain.handle('print-spine', async () => {
    if (mainWindow) {
      mainWindow.webContents.print({
        silent: false,
        printBackground: true,
        deviceName: ''
      });
    }
  });

  ipcMain.handle('get-app-version', () => app.getVersion());

  setupAppMenu();
}

function setupAppMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{
      label: 'Sadik Sons Enterprises',
      submenu: [
        { role: 'about', label: 'About Sadik Sons Enterprises' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide', label: 'Hide Application' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit', label: 'Quit Sadik Sons Enterprises' }
      ]
    }] : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'Print Binder Spine Label',
          accelerator: 'CmdOrCtrl+P',
          click: () => {
            if (mainWindow) mainWindow.webContents.print({ silent: false, printBackground: true });
          }
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Open Cloud Portal (4G Scanner)',
          click: async () => {
            await shell.openExternal('https://sadik-sons-portal.pages.dev');
          }
        },
        {
          label: 'Supabase Cloud Database',
          click: async () => {
            await shell.openExternal('https://supabase.com/dashboard');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  startServer(PORT, (err) => {
    if (err) console.error('Server startup error:', err);
    createWindow();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
