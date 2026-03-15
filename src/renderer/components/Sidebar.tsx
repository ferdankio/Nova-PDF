import React from 'react'
import { useApp } from '../store/AppContext'

export function Sidebar() {
  const { state, dispatch } = useApp()

  async function openFiles() {
    const paths = await window.electronAPI.openFile()
    for (const p of paths) {
      dispatch({ type: 'SET_LOADING', payload: true })
      const result = await window.electronAPI.readFile(p)
      if (!result.success || !result.data) { dispatch({ type: 'SET_LOADING', payload: false }); continue }
      const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist')
      GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
      try {
        const pdf = await getDocument({ data: Uint8Array.from(atob(result.data), c => c.charCodeAt(0)) }).promise
        const name = p.split(/[\\/]/).pop() ?? 'document.pdf'
        const id = await window.electronAPI.addDocument({ path: p, name, size: result.size ?? 0, pageCount: pdf.numPages, hasPassword: false })
        const docs = await window.electronAPI.getDocuments()
        dispatch({ type: 'SET_DOCUMENTS', payload: docs })
        const doc = docs.find(d => d.id === id) ?? { id: id as number, path: p, name, size: result.size ?? 0, page_count: pdf.numPages, has_password: 0, last_page: 1, date_added: new Date().toISOString(), last_opened: new Date().toISOString() }
        dispatch({ type: 'SET_ACTIVE_DOC', payload: doc })
        dispatch({ type: 'SET_PDF_DATA', payload: result.data })
        dispatch({ type: 'SET_PAGE_COUNT', payload: pdf.numPages })
        const annotations = await window.electronAPI.getAnnotations(id as number)
        dispatch({ type: 'SET_ANNOTATIONS', payload: annotations })
        const bookmarks = await window.electronAPI.getBookmarks(id as number)
        dispatch({ type: 'SET_BOOKMARKS', payload: bookmarks })
        await pdf.destroy()
      } catch (e: any) {
        if (e?.name === 'PasswordException') {
          dispatch({ type: 'SET_PASSWORD_MODAL', payload: { open: true, docPath: p, docName: p.split(/[\\/]/).pop() ?? 'document.pdf' } })
        }
      }
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  const navItems = [
    { id: 'home', label: 'Inicio', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>, action: () => { dispatch({ type: 'SET_ACTIVE_DOC', payload: null }); dispatch({ type: 'SET_PDF_DATA', payload: null }) } },
    { id: 'annotations', label: 'Notas', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>, action: () => dispatch({ type: 'SET_RIGHT_PANEL', payload: 'annotations' }) },
    { id: 'bookmarks', label: 'Marks', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>, action: () => dispatch({ type: 'SET_RIGHT_PANEL', payload: 'bookmarks' }) },
    { id: 'settings', label: 'Config', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06-.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>, action: () => dispatch({ type: 'TOGGLE_SETTINGS' }) },
  ]

  return (
    <div style={{ width:72, background:'var(--bg-sidebar)', display:'flex', flexDirection:'column', alignItems:'center', padding:'14px 0', gap:4, flexShrink:0, borderRight:'1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ width:42, height:42, background:'#e63946', borderRadius:11, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:16, boxShadow:'0 4px 14px rgba(230,57,70,0.35)' }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/><line x1="9" y1="11" x2="15" y2="11"/></svg>
      </div>
      {navItems.slice(0, 3).map(item => (
        <button key={item.id} onClick={item.action} title={item.label} style={{ width:50, height:50, borderRadius:12, background:'transparent', border:'none', color:'rgba(255,255,255,0.35)', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:3 }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)' }}>
          <div style={{ width:20, height:20 }}>{item.icon}</div>
          <span style={{ fontSize:9, fontWeight:500 }}>{item.label}</span>
        </button>
      ))}
      <div style={{ flex:1 }} />
      <button onClick={openFiles} title="Abrir PDF" style={{ width:44, height:44, borderRadius:11, background:'rgba(230,57,70,0.15)', border:'1px solid rgba(230,57,70,0.3)', color:'#e63946', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:4 }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(230,57,70,0.28)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(230,57,70,0.15)')}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>
      <button key="settings" onClick={navItems[3].action} title="Config" style={{ width:50, height:50, borderRadius:12, background:'transparent', border:'none', color:'rgba(255,255,255,0.35)', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:3 }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)' }}>
        <div style={{ width:20, height:20 }}>{navItems[3].icon}</div>
        <span style={{ fontSize:9, fontWeight:500 }}>Config</span>
      </button>
    </div>
  )
}
