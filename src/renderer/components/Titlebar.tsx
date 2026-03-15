import React from 'react'
import { useApp } from '../store/AppContext'

export function Titlebar() {
  const { state } = useApp()
  const api = window.electronAPI
  return (
    <div style={{ height:38, background:'var(--bg-sidebar)', display:'flex', alignItems:'center', WebkitAppRegion:'drag' as any, borderBottom:'1px solid rgba(255,255,255,0.05)', flexShrink:0, paddingLeft:72 }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e63946" strokeWidth="2.2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/><line x1="9" y1="11" x2="15" y2="11"/></svg>
      <span style={{ fontSize:13, fontWeight:600, color:'#f0f0f5', marginLeft:8 }}>NovaPDF</span>
      {state.activeDoc && <><span style={{ color:'rgba(255,255,255,0.2)', margin:'0 6px' }}>›</span><span style={{ fontSize:12, color:'rgba(255,255,255,0.45)', maxWidth:300, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{state.activeDoc.name}</span></>}
      <div style={{ flex:1 }} />
      <div style={{ display:'flex', WebkitAppRegion:'no-drag' as any }}>
        {[
          { icon: <svg width="12" height="12" viewBox="0 0 12 12"><rect y="5.5" width="12" height="1" rx=".5" fill="currentColor"/></svg>, action: () => api.minimize(), danger: false },
          { icon: <svg width="12" height="12" viewBox="0 0 12 12"><rect x="1" y="1" width="10" height="10" rx="1" fill="none" stroke="currentColor" strokeWidth="1.2"/></svg>, action: () => api.maximize(), danger: false },
          { icon: <svg width="12" height="12" viewBox="0 0 12 12"><line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="10" y1="2" x2="2" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>, action: () => api.close(), danger: true },
        ].map((b, i) => (
          <button key={i} onClick={b.action} style={{ width:46, height:38, display:'flex', alignItems:'center', justifyContent:'center', background:'transparent', border:'none', color:'rgba(255,255,255,0.4)', cursor:'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.background = b.danger ? '#e63946' : 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'white' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)' }}>
            {b.icon}
          </button>
        ))}
      </div>
    </div>
  )
}
