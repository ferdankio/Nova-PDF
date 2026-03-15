import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import { initDatabase, getDb } from './database'

const isDev = process.env.NODE_ENV === 'development'
let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400, height: 860, minWidth: 900, minHeight: 600,
    frame: false,
    backgroundColor: '#1a1a2e',
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  })
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
  mainWindow.once('ready-to-show', () => mainWindow?.show())
  mainWindow.on('closed', () => { mainWindow = null })
}

app.whenReady().then(() => { initDatabase(); createWindow() })
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })

ipcMain.handle('window:minimize', () => mainWindow?.minimize())
ipcMain.handle('window:maximize', () => { if (mainWindow?.isMaximized()) mainWindow.unmaximize(); else mainWindow?.maximize() })
ipcMain.handle('window:close', () => mainWindow?.close())

ipcMain.handle('file:open', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
  })
  return result.canceled ? [] : result.filePaths
})

ipcMain.handle('file:read', async (_e, filePath: string) => {
  try {
    const buffer = fs.readFileSync(filePath)
    return { success: true, data: buffer.toString('base64'), size: buffer.length }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('file:exists', (_e, filePath: string) => fs.existsSync(filePath))
ipcMain.handle('file:showInFolder', (_e, filePath: string) => shell.showItemInFolder(filePath))

ipcMain.handle('db:addDocument', (_e, doc: any) => {
  const db = getDb()
  const existing = db.prepare('SELECT id FROM documents WHERE path = ?').get(doc.path) as any
  if (existing) {
    db.prepare('UPDATE documents SET last_opened = CURRENT_TIMESTAMP WHERE id = ?').run(existing.id)
    return existing.id
  }
  const result = db.prepare(`INSERT INTO documents (path, name, size, page_count, has_password, date_added, last_opened) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`).run(doc.path, doc.name, doc.size, doc.pageCount, doc.hasPassword ? 1 : 0)
  return result.lastInsertRowid
})

ipcMain.handle('db:getDocuments', () => getDb().prepare('SELECT * FROM documents ORDER BY last_opened DESC').all())
ipcMain.handle('db:deleteDocument', (_e, id: number) => {
  const db = getDb()
  db.prepare('DELETE FROM annotations WHERE document_id = ?').run(id)
  db.prepare('DELETE FROM bookmarks WHERE document_id = ?').run(id)
  db.prepare('DELETE FROM documents WHERE id = ?').run(id)
})
ipcMain.handle('db:updateLastPage', (_e, id: number, page: number) => getDb().prepare('UPDATE documents SET last_page = ?, last_opened = CURRENT_TIMESTAMP WHERE id = ?').run(page, id))
ipcMain.handle('db:searchDocuments', (_e, q: string) => getDb().prepare('SELECT * FROM documents WHERE name LIKE ? ORDER BY last_opened DESC').all(`%${q}%`))

ipcMain.handle('db:addAnnotation', (_e, ann: any) => {
  const result = getDb().prepare(`INSERT INTO annotations (document_id, page, type, content, color, rect, created_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`).run(ann.documentId, ann.page, ann.type, ann.content, ann.color, ann.rect)
  return result.lastInsertRowid
})
ipcMain.handle('db:getAnnotations', (_e, docId: number) => getDb().prepare('SELECT * FROM annotations WHERE document_id = ? ORDER BY page, created_at').all(docId))
ipcMain.handle('db:deleteAnnotation', (_e, id: number) => getDb().prepare('DELETE FROM annotations WHERE id = ?').run(id))
ipcMain.handle('db:updateAnnotation', (_e, id: number, content: string) => getDb().prepare('UPDATE annotations SET content = ? WHERE id = ?').run(content, id))

ipcMain.handle('db:addBookmark', (_e, bm: any) => {
  const result = getDb().prepare(`INSERT INTO bookmarks (document_id, page, label, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)`).run(bm.documentId, bm.page, bm.label)
  return result.lastInsertRowid
})
ipcMain.handle('db:getBookmarks', (_e, docId: number) => getDb().prepare('SELECT * FROM bookmarks WHERE document_id = ? ORDER BY page').all(docId))
ipcMain.handle('db:deleteBookmark', (_e, id: number) => getDb().prepare('DELETE FROM bookmarks WHERE id = ?').run(id))

ipcMain.handle('settings:get', (_e, key: string) => {
  const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key) as any
  return row ? row.value : null
})
ipcMain.handle('settings:set', (_e, key: string, value: string) => getDb().prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value))
