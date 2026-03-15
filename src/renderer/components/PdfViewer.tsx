import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useApp } from '../store/AppContext'
import * as pdfjs from 'pdfjs-dist'

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()

export function PdfViewer() {
  const { state, dispatch } = useApp()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pdfRef = useRef<pdfjs.PDFDocumentProxy | null>(null)
  const renderTask = useRef<pdfjs.RenderTask | null>(null)
  const [pageInput, setPageInput] = useState('1')
  const [pendingNote, setPendingNote] = useState<{x:number;y:number}|null>(null)
  const [noteText, setNoteText] = useState('')

  useEffect(() => {
    if (!state.pdfData) return
    const data = Uint8Array.from(atob(state.pdfData), c => c.charCodeAt(0))
    pdfjs.getDocument({ data }).promise.then(pdf => { pdfRef.current = pdf })
    return () => { pdfRef.current?.destroy() }
  }, [state.pdfData])

  const renderPage = useCallback(async () => {
    if (!pdfRef.current || !canvasRef.current) return
    if (renderTask.current) { renderTask.current.cancel(); renderTask.current = null }
    try {
      const page = await pdfRef.current.getPage(state.currentPage)
      const dpr = window.devicePixelRatio || 1
      const vp = page.getViewport({ scale: state.zoom * dpr })
      const canvas = canvasRef.current
      canvas.width = vp.width; canvas.height = vp.height
      canvas.style.width = `${vp.width/dpr}px`; canvas.style.height = `${vp.height/dpr}px`
      const ctx = canvas.getContext('2d')!
      renderTask.current = page.render({ canvasContext: ctx, viewport: vp })
      await renderTask.current.promise
    } catch (e: any) { if (e?.name !== 'RenderingCancelledException') console.error(e) }
  }, [state.currentPage, state.zoom])

  useEffect(() => { renderPage() }, [renderPage])
  useEffect(() => { setPageInput(String(state.currentPage)) }, [state.currentPage])

  function handlePageBlur() {
    const n = parseInt(pageInput)
    if (!isNaN(n)) dispatch({ type: 'SET_PAGE', payload: n })
    else setPageInput(String(state.currentPage))
  }

  async function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (state.annotationTool === 'none') return
    const rect = canvasRef.current!.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width * 100)
    const y = ((e.clientY - rect.top) / rect.height * 100)
    if (state.annotationTool === 'note') { setPendingNote({ x: e.clientX - rect.left, y: e.clientY - rect.top }); return }
    if (!state.activeDoc) return
    const id = await window.electronAPI.addAnnotation({ documentId: state.activeDoc.id, page: state.currentPage, type: state.annotationTool, content: '', color: state.highlightColor, rect: JSON.stringify({ x, y, width: 15, height: 2.5 }) })
    dispatch({ type: 'ADD_ANNOTATION', payload: { id: id as number, document_id: state.activeDoc.id, page: state.currentPage, type: state.annotationTool, content: '', color: state.highlightColor, rect: JSON.stringify({ x, y, width: 15, height: 2.5 }), created_at: new Date().toISOString() } })
  }

  async function saveNote() {
    if (!pendingNote || !noteText.trim() || !state.activeDoc) { setPendingNote(null); setNoteText(''); return }
    const rect = canvasRef.current!.getBoundingClientRect()
    const x = (pendingNote.x / rect.width * 100), y = (pendingNote.y / rect.height * 100)
    const id = await window.electronAPI.addAnnotation({ documentId: state.activeDoc.id, page: state.currentPage, type: 'note', content: noteText, color: '#FBBF24', rect: JSON.stringify({ x, y, width: 4, height: 4 }) })
    dispatch({ type: 'ADD_ANNOTATION', payload: { id: id as number, document_id: state.activeDoc.id, page: state.currentPage, type: 'note', content: noteText, color: '#FBBF24', rect: JSON.stringify({ x, y, width: 4, height: 4 }), created_at: new Date().toISOString() } })
    setPendingNote(null); setNoteText('')
  }

  const pageAnns = state.annotations.filter(a => a.page === state.currentPage)
  const bgColor = state.pdfTheme === 'dark' ? '#1a1a1a' : state.pdfTheme === 'sepia' ? '#f4ecd8' : '#ffffff'
  const bookmarked = state.bookmarks.some(b => b.page === state.currentPage)

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      {/* Toolbar */}
      <div style={{ height:46, background:'var(--bg-panel)', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:6, padding:'0 12px', flexShrink:0 }}>
        <button className="icon-btn" title="Volver" onClick={()=>{dispatch({type:'SET_ACTIVE_DOC',payload:null});dispatch({type:'SET_PDF_DATA',payload:null})}}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div className="divider-v"/>
        <button className="icon-btn" disabled={state.currentPage<=1} onClick={()=>dispatch({type:'SET_PAGE',payload:state.currentPage-1})}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <input value={pageInput} onChange={e=>setPageInput(e.target.value)} onBlur={handlePageBlur} onKeyDown={e=>e.key==='Enter'&&handlePageBlur()}
          style={{ width:44, textAlign:'center', fontSize:13, fontWeight:500, background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:6, padding:'4px 6px', color:'var(--text-primary)' }}/>
        <span style={{ fontSize:12, color:'var(--text-muted)' }}>/ {state.pageCount}</span>
        <button className="icon-btn" disabled={state.currentPage>=state.pageCount} onClick={()=>dispatch({type:'SET_PAGE',payload:state.currentPage+1})}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
        <div className="divider-v"/>
        <button className="icon-btn" onClick={()=>dispatch({type:'SET_ZOOM',payload:state.zoom-0.1})}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
        </button>
        <span style={{ fontSize:12, color:'var(--text-muted)', minWidth:38, textAlign:'center' }}>{Math.round(state.zoom*100)}%</span>
        <button className="icon-btn" onClick={()=>dispatch({type:'SET_ZOOM',payload:state.zoom+0.1})}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
        </button>
        <div className="divider-v"/>
        {(['highlight','note','underline'] as const).map(tool => (
          <button key={tool} className={`icon-btn ${state.annotationTool===tool?'active':''}`} title={tool} onClick={()=>dispatch({type:'SET_ANN_TOOL',payload:state.annotationTool===tool?'none':tool})}>
            {tool==='highlight' && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>}
            {tool==='note'      && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>}
            {tool==='underline' && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"/><line x1="4" y1="21" x2="20" y2="21"/></svg>}
          </button>
        ))}
        {state.annotationTool!=='none' && (
          <div style={{ display:'flex', gap:4 }}>
            {['#FBBF24','#34D399','#60A5FA','#F87171','#A78BFA'].map(c=>(
              <button key={c} onClick={()=>dispatch({type:'SET_HL_COLOR',payload:c})} style={{ width:18, height:18, borderRadius:'50%', background:c, border:'none', cursor:'pointer', boxShadow:state.highlightColor===c?`0 0 0 2px var(--bg-panel),0 0 0 4px ${c}`:'none' }}/>
            ))}
          </div>
        )}
        <div style={{ flex:1 }}/>
        <button className={`icon-btn ${bookmarked?'active':''}`} title="Marcar página" onClick={async()=>{
          if (!state.activeDoc) return
          if (bookmarked) { const bm = state.bookmarks.find(b=>b.page===state.currentPage); if(bm){await window.electronAPI.deleteBookmark(bm.id);dispatch({type:'REMOVE_BOOKMARK',payload:bm.id})} }
          else { const id = await window.electronAPI.addBookmark({documentId:state.activeDoc.id,page:state.currentPage,label:`Página ${state.currentPage}`}); dispatch({type:'ADD_BOOKMARK',payload:{id:id as number,document_id:state.activeDoc.id,page:state.currentPage,label:`Página ${state.currentPage}`,created_at:new Date().toISOString()}}) }
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill={bookmarked?'currentColor':'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
        </button>
        <button className="icon-btn" title="Cambiar tema PDF" onClick={()=>{const t=['white','sepia','dark'] as const;const i=t.indexOf(state.pdfTheme);dispatch({type:'SET_PDF_THEME',payload:t[(i+1)%3]});window.electronAPI.setSetting('pdfTheme',t[(i+1)%3])}}>
          {state.pdfTheme==='white'?<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg>
          :<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>}
        </button>
      </div>

      {/* Canvas */}
      <div style={{ flex:1, overflowY:'auto', overflowX:'auto', background:'var(--pdf-bg)', display:'flex', justifyContent:'center', padding:24, cursor:state.annotationTool!=='none'?'crosshair':'default' }}>
        <div style={{ position:'relative', display:'inline-block' }}>
          <canvas ref={canvasRef} onClick={handleCanvasClick} style={{ background:bgColor, display:'block', boxShadow:'0 4px 40px rgba(0,0,0,0.4)' }}/>
          {pageAnns.filter(a=>a.type!=='note').map(ann=>{
            const r=JSON.parse(ann.rect)
            return <div key={ann.id} style={{ position:'absolute', left:`${r.x}%`, top:`${r.y}%`, width:`${r.width}%`, height:ann.type==='underline'?'2px':`${r.height}%`, background:ann.type==='highlight'?ann.color+'70':ann.color, pointerEvents:'none', borderRadius:2 }}/>
          })}
          {pageAnns.filter(a=>a.type==='note').map(ann=>{
            const r=JSON.parse(ann.rect)
            return <div key={ann.id} title={ann.content} style={{ position:'absolute', left:`${r.x}%`, top:`${r.y}%`, width:22, height:22, background:ann.color, borderRadius:5, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', boxShadow:'0 2px 8px rgba(0,0,0,0.3)', transform:'translate(-50%,-50%)' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
          })}
          {pendingNote && (
            <div style={{ position:'absolute', left:pendingNote.x+10, top:pendingNote.y+10, background:'var(--bg-panel)', border:'1px solid var(--border-hover)', borderRadius:10, padding:12, zIndex:50, boxShadow:'0 8px 24px rgba(0,0,0,0.3)', width:220 }}>
              <textarea autoFocus value={noteText} onChange={e=>setNoteText(e.target.value)} placeholder="Escribe tu nota..." style={{ width:'100%', height:80, resize:'none', background:'var(--bg-input)', border:'1px solid var(--border)', borderRadius:6, padding:8, color:'var(--text-primary)', fontSize:13, fontFamily:'inherit' }}/>
              <div style={{ display:'flex', gap:8, marginTop:8 }}>
                <button className="btn-primary" style={{ fontSize:12, padding:'5px 12px' }} onClick={saveNote}>Guardar</button>
                <button className="btn-ghost" style={{ fontSize:12, padding:'5px 12px' }} onClick={()=>{setPendingNote(null);setNoteText('')}}>Cancelar</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div style={{ height:28, background:'var(--bg-panel)', borderTop:'1px solid var(--border)', display:'flex', alignItems:'center', gap:16, padding:'0 16px', flexShrink:0 }}>
        <div style={{ width:7, height:7, borderRadius:'50%', background:'#22c55e' }}/>
        <span style={{ fontSize:11, color:'var(--text-muted)' }}>Página {state.currentPage} de {state.pageCount}</span>
        <span style={{ fontSize:11, color:'var(--text-muted)' }}>{pageAnns.length} anotaciones</span>
        {state.activeDoc?.has_password===1 && <span style={{ fontSize:11, color:'#e63946' }}>🔒 Protegido</span>}
        <div style={{ flex:1 }}/>
        <span style={{ fontSize:11, color:'var(--text-muted)' }}>{Math.round(state.zoom*100)}% · {state.pdfTheme}</span>
      </div>
    </div>
  )
}
