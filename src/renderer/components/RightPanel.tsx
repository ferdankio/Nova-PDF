import React, { useState } from 'react'
import { useApp } from '../store/AppContext'

export function RightPanel() {
  const { state, dispatch } = useApp()
  const [editId, setEditId] = useState<number|null>(null)
  const [editText, setEditText] = useState('')

  async function saveEdit(id: number) {
    await window.electronAPI.updateAnnotation(id, editText)
    dispatch({ type: 'SET_ANNOTATIONS', payload: state.annotations.map(a => a.id===id ? {...a,content:editText} : a) })
    setEditId(null)
  }

  async function delAnn(id: number) {
    await window.electronAPI.deleteAnnotation(id)
    dispatch({ type: 'REMOVE_ANNOTATION', payload: id })
  }

  async function delBm(id: number) {
    await window.electronAPI.deleteBookmark(id)
    dispatch({ type: 'REMOVE_BOOKMARK', payload: id })
  }

  const byPage = state.annotations.reduce<Record<number,typeof state.annotations>>((acc,a)=>{ (acc[a.page]??=[]).push(a); return acc },{})

  return (
    <div style={{ width:240, background:'var(--bg-panel)', borderLeft:'1px solid var(--border)', display:'flex', flexDirection:'column', flexShrink:0 }}>
      <div style={{ display:'flex', borderBottom:'1px solid var(--border)' }}>
        {(['toc','annotations','bookmarks'] as const).map(tab=>(
          <button key={tab} onClick={()=>dispatch({type:'SET_RIGHT_PANEL',payload:tab})} style={{ flex:1, padding:'10px 4px', background:'transparent', border:'none', fontSize:11, fontWeight:600, color:state.rightPanel===tab?'#e63946':'var(--text-muted)', cursor:'pointer', borderBottom:`2px solid ${state.rightPanel===tab?'#e63946':'transparent'}` }}>
            {tab==='toc'?'Índice':tab==='annotations'?'Notas':'Marks'}
          </button>
        ))}
      </div>

      <div style={{ flex:1, overflowY:'auto' }}>
        {state.rightPanel==='toc' && (
          <div>
            <div style={{ padding:'10px 14px 6px', fontSize:10, fontWeight:700, color:'var(--text-muted)', letterSpacing:'0.08em', textTransform:'uppercase' }}>Páginas</div>
            {Array.from({length:Math.min(state.pageCount,200)},(_,i)=>i+1).map(p=>(
              <div key={p} onClick={()=>dispatch({type:'SET_PAGE',payload:p})} style={{ padding:'7px 16px', fontSize:12, color:state.currentPage===p?'#e63946':'var(--text-secondary)', background:state.currentPage===p?'var(--accent-muted)':'transparent', borderLeft:`2px solid ${state.currentPage===p?'#e63946':'transparent'}`, cursor:'pointer' }}
                onMouseEnter={e=>{if(state.currentPage!==p)e.currentTarget.style.background='var(--bg-hover)'}}
                onMouseLeave={e=>{if(state.currentPage!==p)e.currentTarget.style.background='transparent'}}>
                Página {p}
              </div>
            ))}
          </div>
        )}

        {state.rightPanel==='annotations' && (
          <div style={{ padding:8 }}>
            {state.annotations.length===0 ? (
              <div style={{ padding:'32px 16px', textAlign:'center', color:'var(--text-muted)' }}>
                <div style={{ fontSize:28, marginBottom:10 }}>✏️</div>
                <p style={{ fontSize:12, lineHeight:1.6 }}>Sin anotaciones. Usa las herramientas de la barra para resaltar o anotar.</p>
              </div>
            ) : Object.entries(byPage).sort(([a],[b])=>Number(a)-Number(b)).map(([page,anns])=>(
              <div key={page} style={{ marginBottom:12 }}>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', letterSpacing:'0.08em', textTransform:'uppercase', padding:'4px 8px 6px' }}>Página {page}</div>
                {anns.map(ann=>(
                  <div key={ann.id} style={{ background:'var(--bg-surface)', border:'1px solid var(--border)', borderLeft:`3px solid ${ann.color}`, borderRadius:8, padding:'8px 10px', marginBottom:6 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                      <span style={{ fontSize:9, fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', color:ann.type==='highlight'?'#f59e0b':ann.type==='note'?'#60a5fa':'#a78bfa' }}>
                        {ann.type==='highlight'?'Resaltado':ann.type==='note'?'Nota':'Subrayado'}
                      </span>
                      <div style={{ flex:1 }}/>
                      {ann.type==='note' && <button onClick={()=>{setEditId(ann.id);setEditText(ann.content)}} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:2 }}>✏️</button>}
                      <button onClick={()=>delAnn(ann.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:2 }}>✕</button>
                    </div>
                    {editId===ann.id ? (
                      <div>
                        <textarea autoFocus value={editText} onChange={e=>setEditText(e.target.value)} style={{ width:'100%', height:70, resize:'none', background:'var(--bg-input)', border:'1px solid var(--border)', borderRadius:5, padding:6, color:'var(--text-primary)', fontSize:12, fontFamily:'inherit' }}/>
                        <div style={{ display:'flex', gap:6, marginTop:5 }}>
                          <button className="btn-primary" style={{ fontSize:11, padding:'4px 10px' }} onClick={()=>saveEdit(ann.id)}>Guardar</button>
                          <button className="btn-ghost" style={{ fontSize:11, padding:'4px 10px' }} onClick={()=>setEditId(null)}>Cancelar</button>
                        </div>
                      </div>
                    ) : ann.content && <p style={{ fontSize:12, color:'var(--text-secondary)', margin:0, lineHeight:1.5 }}>{ann.content}</p>}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {state.rightPanel==='bookmarks' && (
          <div style={{ padding:8 }}>
            {state.bookmarks.length===0 ? (
              <div style={{ padding:'32px 16px', textAlign:'center', color:'var(--text-muted)' }}>
                <div style={{ fontSize:28, marginBottom:10 }}>🔖</div>
                <p style={{ fontSize:12, lineHeight:1.6 }}>Sin marcadores. Haz clic en el ícono de marcador en la barra.</p>
              </div>
            ) : state.bookmarks.map(bm=>(
              <div key={bm.id} onClick={()=>dispatch({type:'SET_PAGE',payload:bm.page})} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 10px', background:state.currentPage===bm.page?'var(--accent-muted)':'var(--bg-surface)', border:`1px solid ${state.currentPage===bm.page?'rgba(230,57,70,0.25)':'var(--border)'}`, borderRadius:8, marginBottom:5, cursor:'pointer' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill={state.currentPage===bm.page?'#e63946':'none'} stroke={state.currentPage===bm.page?'#e63946':'var(--text-muted)'} strokeWidth="2" strokeLinecap="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{bm.label}</div>
                  <div style={{ fontSize:10, color:'var(--text-muted)' }}>Página {bm.page}</div>
                </div>
                <button onClick={e=>{e.stopPropagation();delBm(bm.id)}} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:2 }}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ padding:'8px 14px', borderTop:'1px solid var(--border)', fontSize:11, color:'var(--text-muted)', display:'flex', gap:12 }}>
        <span>{state.annotations.length} notas</span>
        <span>{state.bookmarks.length} marcadores</span>
      </div>
    </div>
  )
}
