import React, { useState } from 'react'
import { useApp } from '../store/AppContext'
import type { Document } from '../types'

function fmt(b: number) { return b < 1048576 ? `${Math.round(b/1024)} KB` : `${(b/1048576).toFixed(1)} MB` }
function ago(iso: string) { const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000); return d === 0 ? 'Hoy' : d === 1 ? 'Ayer' : `Hace ${d} días` }

export function Library() {
  const { state, dispatch } = useApp()
  const [search, setSearch] = useState('')

  async function openDoc(doc: Document) {
    const exists = await window.electronAPI.fileExists(doc.path)
    if (!exists) { alert(`Archivo no encontrado:\n${doc.path}`); return }
    const result = await window.electronAPI.readFile(doc.path)
    if (!result.success || !result.data) return
    dispatch({ type: 'SET_ACTIVE_DOC', payload: doc })
    dispatch({ type: 'SET_PDF_DATA', payload: result.data })
    dispatch({ type: 'SET_PAGE_COUNT', payload: doc.page_count })
    const ann = await window.electronAPI.getAnnotations(doc.id)
    dispatch({ type: 'SET_ANNOTATIONS', payload: ann })
    const bm = await window.electronAPI.getBookmarks(doc.id)
    dispatch({ type: 'SET_BOOKMARKS', payload: bm })
  }

  async function handleSearch(q: string) {
    setSearch(q)
    const docs = q.trim() ? await window.electronAPI.searchDocuments(q) : await window.electronAPI.getDocuments()
    dispatch({ type: 'SET_DOCUMENTS', payload: docs })
  }

  async function delDoc(id: number) {
    await window.electronAPI.deleteDocument(id)
    dispatch({ type: 'SET_DOCUMENTS', payload: await window.electronAPI.getDocuments() })
  }

  async function openFiles() {
    const paths = await window.electronAPI.openFile()
    for (const p of paths) {
      const result = await window.electronAPI.readFile(p)
      if (!result.success || !result.data) continue
      const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist')
      GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
      try {
        const pdf = await getDocument({ data: Uint8Array.from(atob(result.data), c => c.charCodeAt(0)) }).promise
        const name = p.split(/[\\/]/).pop() ?? 'document.pdf'
        await window.electronAPI.addDocument({ path: p, name, size: result.size ?? 0, pageCount: pdf.numPages, hasPassword: false })
        await pdf.destroy()
      } catch {}
    }
    dispatch({ type: 'SET_DOCUMENTS', payload: await window.electronAPI.getDocuments() })
  }

  const totalSize = state.documents.reduce((s, d) => s + d.size, 0)

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:'var(--bg-app)' }}>
      <div style={{ padding:'28px 32px 20px', borderBottom:'1px solid var(--border)' }}>
        <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between' }}>
          <div>
            <h1 style={{ fontSize:26, fontWeight:600, letterSpacing:'-0.02em' }}>Biblioteca</h1>
            <p style={{ fontSize:13, color:'var(--text-secondary)', marginTop:3 }}>Tu colección PDF, 100% privada y local.</p>
          </div>
          <button onClick={openFiles} style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 18px', background:'#e63946', color:'white', border:'none', borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', boxShadow:'0 4px 14px rgba(230,57,70,0.3)' }}
            onMouseEnter={e => (e.currentTarget.style.background='#c1121f')} onMouseLeave={e => (e.currentTarget.style.background='#e63946')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Agregar PDF
          </button>
        </div>
        <div style={{ display:'flex', gap:12, marginTop:20 }}>
          {[{val:state.documents.length,lbl:'documentos'},{val:fmt(totalSize),lbl:'almacenado'},{val:state.documents.filter(d=>d.has_password).length,lbl:'protegidos'}].map((s,i)=>(
            <div key={i} style={{ background:'var(--bg-surface)', borderRadius:10, padding:'12px 18px', border:'1px solid var(--border)' }}>
              <div style={{ fontSize:22, fontWeight:600, color:i===0?'#e63946':'var(--text-primary)' }}>{s.val}</div>
              <div style={{ fontSize:11, color:'var(--text-secondary)', marginTop:2 }}>{s.lbl}</div>
            </div>
          ))}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10, background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:9, padding:'8px 14px', marginTop:16 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input value={search} onChange={e=>handleSearch(e.target.value)} placeholder="Buscar documentos..." style={{ flex:1, border:'none', background:'transparent', color:'var(--text-primary)', fontSize:13, outline:'none' }} />
        </div>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:'20px 32px' }}>
        {state.documents.length === 0 ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:16, color:'var(--text-muted)' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <p style={{ fontSize:16, fontWeight:600, color:'var(--text-primary)' }}>Sin documentos</p>
            <p style={{ fontSize:13 }}>Agrega tu primer PDF para comenzar</p>
            <button onClick={openFiles} className="btn-primary">+ Agregar PDF</button>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {state.documents.map(doc => (
              <div key={doc.id} onClick={()=>openDoc(doc)} style={{ display:'flex', alignItems:'center', gap:14, padding:'11px 14px', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg-surface)', cursor:'pointer' }}
                onMouseEnter={e=>{e.currentTarget.style.background='var(--bg-hover)';e.currentTarget.style.borderColor='var(--border-hover)'}}
                onMouseLeave={e=>{e.currentTarget.style.background='var(--bg-surface)';e.currentTarget.style.borderColor='var(--border)'}}>
                <div style={{ width:38, height:44, background:'rgba(230,57,70,0.12)', border:'1px solid rgba(230,57,70,0.2)', borderRadius:7, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:2, flexShrink:0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e63946" strokeWidth="1.8" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  <span style={{ fontSize:8, fontWeight:700, color:'#e63946' }}>PDF</span>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:14, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{doc.name.replace(/\.pdf$/i,'')}</span>
                    {doc.has_password===1 && <span style={{ fontSize:10, padding:'1px 6px', borderRadius:4, background:'rgba(230,57,70,0.12)', color:'#e63946', fontWeight:600 }}>🔒</span>}
                  </div>
                  <div style={{ display:'flex', gap:12, marginTop:3 }}>
                    <span style={{ fontSize:11, color:'var(--text-secondary)' }}>{fmt(doc.size)}</span>
                    {doc.page_count>0 && <span style={{ fontSize:11, color:'var(--text-muted)' }}>{doc.page_count} págs</span>}
                    {doc.last_page>1 && <span style={{ fontSize:11, color:'var(--text-muted)' }}>Última: p.{doc.last_page}</span>}
                  </div>
                </div>
                <span style={{ fontSize:11, color:'var(--text-muted)', flexShrink:0 }}>{ago(doc.last_opened)}</span>
                <button onClick={e=>{e.stopPropagation();delDoc(doc.id)}} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:4, flexShrink:0 }}
                  onMouseEnter={e=>(e.currentTarget.style.color='#e63946')} onMouseLeave={e=>(e.currentTarget.style.color='var(--text-muted)')}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
