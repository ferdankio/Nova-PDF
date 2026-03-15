import React, { useState } from 'react'
import { useApp } from '../store/AppContext'

export function SettingsModal() {
  const { state, dispatch } = useApp()
  const api = window.electronAPI

  return (
    <div className="modal-overlay" onClick={()=>dispatch({type:'TOGGLE_SETTINGS'})}>
      <div className="modal-box" style={{ width:460 }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <h3 style={{ margin:0 }}>Configuración</h3>
          <button className="icon-btn" onClick={()=>dispatch({type:'TOGGLE_SETTINGS'})}>✕</button>
        </div>

        <Section title="Interfaz">
          <Row label="Tema">
            <Seg options={[{v:'dark',l:'🌙 Oscuro'},{v:'light',l:'☀️ Claro'}]} value={state.theme} onChange={async v=>{dispatch({type:'SET_THEME',payload:v as any});await api.setSetting('theme',v)}}/>
          </Row>
        </Section>

        <Section title="PDF">
          <Row label="Fondo del documento">
            <Seg options={[{v:'white',l:'Blanco'},{v:'sepia',l:'Sepia'},{v:'dark',l:'Oscuro'}]} value={state.pdfTheme} onChange={async v=>{dispatch({type:'SET_PDF_THEME',payload:v as any});await api.setSetting('pdfTheme',v)}}/>
          </Row>
          <Row label="Zoom por defecto">
            <select value={state.zoom} onChange={async e=>{const z=parseFloat(e.target.value);dispatch({type:'SET_ZOOM',payload:z});await api.setSetting('zoom',String(z))}}
              style={{ background:'var(--bg-input)', border:'1px solid var(--border)', borderRadius:7, padding:'6px 10px', fontSize:13, color:'var(--text-primary)', cursor:'pointer' }}>
              {[0.75,1.0,1.25,1.5,2.0].map(z=><option key={z} value={z}>{Math.round(z*100)}%</option>)}
            </select>
          </Row>
        </Section>

        <Section title="Acerca de">
          <div style={{ padding:'10px 0', color:'var(--text-secondary)', fontSize:13 }}>
            <p><strong style={{ color:'var(--text-primary)' }}>NovaPDF</strong> v1.0.0</p>
            <p style={{ marginTop:4 }}>Lector PDF privado para Windows. Datos 100% locales.</p>
          </div>
        </Section>

        <div style={{ display:'flex', justifyContent:'flex-end', marginTop:8 }}>
          <button className="btn-primary" onClick={()=>dispatch({type:'TOGGLE_SETTINGS'})}>Cerrar</button>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom:20 }}>
      <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:8 }}>{title}</div>
      <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:10, overflow:'hidden' }}>{children}</div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 14px', borderBottom:'1px solid var(--border)' }}>
      <span style={{ fontSize:13 }}>{label}</span>
      {children}
    </div>
  )
}

function Seg({ options, value, onChange }: { options:{v:string;l:string}[]; value:string; onChange:(v:string)=>void }) {
  return (
    <div style={{ display:'flex', background:'var(--bg-input)', border:'1px solid var(--border)', borderRadius:8, overflow:'hidden' }}>
      {options.map(o=>(
        <button key={o.v} onClick={()=>onChange(o.v)} style={{ padding:'5px 12px', background:value===o.v?'#e63946':'transparent', border:'none', color:value===o.v?'white':'var(--text-secondary)', fontSize:12, fontWeight:value===o.v?600:400, cursor:'pointer', whiteSpace:'nowrap' }}>
          {o.l}
        </button>
      ))}
    </div>
  )
}

export function PasswordModal() {
  const { state, dispatch } = useApp()
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')

  const modal = state.passwordModal
  if (!modal) return null

  async function handleSubmit() {
    if (!password.trim()) { setError('Ingresa la contraseña'); return }
    dispatch({ type: 'SET_PASSWORD_MODAL', payload: null })
    const result = await window.electronAPI.readFile(modal.docPath)
    if (!result.success || !result.data) return
    try {
      const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist')
      GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
      const pdf = await getDocument({ data: Uint8Array.from(atob(result.data), c => c.charCodeAt(0)), password }).promise
      const id = await window.electronAPI.addDocument({ path: modal.docPath, name: modal.docName, size: result.size??0, pageCount: pdf.numPages, hasPassword: true })
      const docs = await window.electronAPI.getDocuments()
      dispatch({ type: 'SET_DOCUMENTS', payload: docs })
      const doc = docs.find(d=>d.id===id)!
      dispatch({ type: 'SET_ACTIVE_DOC', payload: doc })
      dispatch({ type: 'SET_PDF_DATA', payload: result.data })
      dispatch({ type: 'SET_PAGE_COUNT', payload: pdf.numPages })
      await pdf.destroy()
    } catch { setError('Contraseña incorrecta.'); dispatch({ type: 'SET_PASSWORD_MODAL', payload: modal }) }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div style={{ width:52, height:52, background:'rgba(230,57,70,0.12)', border:'1px solid rgba(230,57,70,0.25)', borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:16 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e63946" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>
        <h3>Documento protegido</h3>
        <p style={{ fontSize:13, color:'var(--text-secondary)', marginBottom:20 }}>{modal.docName} requiere contraseña.</p>
        <label className="field-label">Contraseña</label>
        <div style={{ position:'relative' }}>
          <input autoFocus type={show?'text':'password'} value={password} onChange={e=>{setPassword(e.target.value);setError('')}} onKeyDown={e=>e.key==='Enter'&&handleSubmit()} className="field-input" style={{ paddingRight:40 }}/>
          <button onClick={()=>setShow(s=>!s)} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)' }}>{show?'🙈':'👁'}</button>
        </div>
        {error && <p style={{ fontSize:12, color:'#e63946', marginTop:8 }}>{error}</p>}
        <div className="modal-actions">
          <button className="btn-ghost" onClick={()=>dispatch({type:'SET_PASSWORD_MODAL',payload:null})}>Cancelar</button>
          <button className="btn-primary" onClick={handleSubmit}>Abrir</button>
        </div>
      </div>
    </div>
  )
}
