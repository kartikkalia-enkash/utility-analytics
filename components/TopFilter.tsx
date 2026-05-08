'use client'

import React, { useState, useMemo, useRef, useEffect } from 'react'
import { STATES, BRANCHES, CAS } from '@/lib/calculations'

interface Entity { name: string; type: 'state' | 'branch' | 'ca' }

interface TopFilterProps {
  onSearch?: (query: string) => void
  onDateRangeChange?: (range: string) => void
  onApply?: (filters: { stateF: string; branchF: string; caF: string; dateRange: string }) => void
  onSelectEntity?: (name: string, type: string) => void
}

const MAX_PINS = 10
const DOT_COLOR: Record<string, string> = { state: '#2500D7', branch: '#1D9E75', ca: '#1D9E75' }

export default function TopFilter({ onSearch, onDateRangeChange, onApply, onSelectEntity }: TopFilterProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen]   = useState(false)
  const [dateRange, setDateRange]     = useState('1Y')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo,   setCustomTo]   = useState('')

  const getDateLabel = (range: string, from: string, to: string): string => {
    const now = new Date(2025, 2, 31)
    if (range === 'Custom' && from && to) {
      const f = new Date(from), t = new Date(to)
      return f.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) + ' – ' +
             t.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
    }
    const months: Record<string, number> = { '1M': 1, '3M': 3, '6M': 6, '1Y': 12 }
    const m = months[range] ?? 12
    const start = new Date(now.getFullYear(), now.getMonth() - m + 1, 1)
    return start.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) + ' – ' +
           now.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
  }
  const dateLabel = getDateLabel(dateRange, customFrom, customTo)
  const [pinnedOpen, setPinnedOpen]   = useState(false)
  const [selectedState,  setSelectedState]  = useState('all')
  const [selectedBranch, setSelectedBranch] = useState('all')
  const [selectedCA,     setSelectedCA]     = useState('all')
  const popoverRef = useRef<HTMLDivElement>(null)

  const [pinnedEntities, setPinnedEntities] = useState<Entity[]>([
    { name: 'Maharashtra',  type: 'state'  },
    { name: 'Mumbai North', type: 'branch' },
    { name: 'MH-MN-0101',  type: 'ca'     },
    { name: 'DL-DS-4202',  type: 'ca'     },
  ])
  const [recentEntities] = useState<Entity[]>([
    { name: 'Delhi South',    type: 'branch' },
    { name: 'Gujarat',        type: 'state'  },
    { name: 'KA-BE-1103',    type: 'ca'     },
    { name: 'Tamil Nadu',     type: 'state'  },
    { name: 'Bangalore East', type: 'branch' },
    { name: 'UP-LE-6101',    type: 'ca'     },
  ])

  // Close popover on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPinnedOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const q = searchQuery.toLowerCase()
  const filteredStates = useMemo(() =>
    STATES.filter(s => s.toLowerCase().includes(q)).slice(0, 4).map(s => ({
      name: s, initials: s.substring(0, 2).toUpperCase(),
      branches: (BRANCHES[s] ?? []).length,
      cas: (BRANCHES[s] ?? []).reduce((sum, br) => sum + (CAS[br]?.length ?? 0), 0),
    })), [q])
  const filteredBranches = useMemo(() =>
    Object.keys(BRANCHES).filter(b => b.toLowerCase().includes(q)).slice(0, 4).map(b => ({
      name: b, initials: b.substring(0, 2).toUpperCase(),
      state: STATES.find(s => (BRANCHES[s] ?? []).includes(b)) ?? '',
      cas: CAS[b]?.length ?? 0,
    })), [q])
  const filteredCAs = useMemo(() =>
    Object.values(CAS).flat().filter(c => c.toLowerCase().includes(q)).slice(0, 5).map(c => ({
      id: c, branch: Object.keys(CAS).find(b => CAS[b]?.includes(c)) ?? '',
    })), [q])

  const handleUnpin = (name: string) => setPinnedEntities(prev => prev.filter(e => e.name !== name))
  const handlePin   = (entity: Entity) => {
    if (pinnedEntities.length >= MAX_PINS) return
    if (pinnedEntities.find(e => e.name === entity.name)) return
    setPinnedEntities(prev => [...prev, entity])
  }
  const visibleRecent = recentEntities.filter(r => !pinnedEntities.find(p => p.name === r.name))

  const handleSelectEntity = (name: string, type: string) => {
    setSearchQuery(''); setSearchOpen(false)
    if (type === 'state')  { setSelectedState(name);  setSelectedBranch('all'); setSelectedCA('all') }
    if (type === 'branch') { setSelectedBranch(name); setSelectedCA('all') }
    if (type === 'ca')     { setSelectedCA(name) }
    onSelectEntity?.(name, type)
  }

  // Inline pinned chips — show first 3, rest as +N more
  const SHOW_MAX = 3
  const visiblePinned = pinnedEntities.slice(0, SHOW_MAX)
  const overflowCount = pinnedEntities.length - SHOW_MAX

  return (
    <div style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '12px 24px' }}>

      {/* Row 1 — Search + date pills + Apply */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>

        {/* Search */}
        <div style={{ flex: 1, position: 'relative', maxWidth: '360px' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <circle cx="5.5" cy="5.5" r="4.5" stroke="#9b9b96" strokeWidth="1.2" fill="none"/>
            <line x1="9" y1="9" x2="12.5" y2="12.5" stroke="#9b9b96" strokeWidth="1.2"/>
          </svg>
          <input
            type="text" placeholder="Search state, branch, or CA num…"
            value={searchQuery}
            onChange={e => { console.log('[v0] searchQuery changed:', e.target.value); setSearchQuery(e.target.value); onSearch?.(e.target.value) }}
            onFocus={() => { console.log('[v0] search focused, opening dropdown'); setSearchOpen(true) }}
            onBlur={() => { console.log('[v0] search blurred, closing dropdown in 150ms'); setTimeout(() => setSearchOpen(false), 150) }}
            style={{ width: '100%', height: '40px', border: '1.5px solid #E5E7EB', borderRadius: '8px', padding: '0 12px 0 36px', fontSize: '13px', background: '#F3F4F6', outline: 'none', color: '#192744', fontFamily: 'Inter, sans-serif' }}
          />
          {console.log('[v0] dropdown render check: searchOpen=', searchOpen, 'searchQuery=', searchQuery)}
          {searchOpen && (searchQuery.length > 0) && (
            <div style={{ position: 'absolute', top: '46px', left: 0, right: 0, background: '#fff', border: '1px solid #f3f4f6', borderRadius: '8px', zIndex: 200, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
              {filteredStates.length > 0 && <>
                <div style={{ fontSize: '10px', fontWeight: 600, color: '#858ea2', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '10px 12px 4px' }}>States</div>
                {filteredStates.map(s => <SearchRow key={s.name} icon={s.initials} iconBg="#EBEAFF" iconColor="#2500D7" name={s.name} meta={s.branches + ' branches · ' + s.cas + ' CAs'} onClick={() => handleSelectEntity(s.name, 'state')} />)}
              </>}
              {filteredBranches.length > 0 && <>
                <div style={{ fontSize: '10px', fontWeight: 600, color: '#858ea2', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '10px 12px 4px' }}>Branches</div>
                {filteredBranches.map(b => <SearchRow key={b.name} icon={b.initials} iconBg="#E6F1FB" iconColor="#0C447C" name={b.name} meta={b.state + ' · ' + b.cas + ' CAs'} onClick={() => handleSelectEntity(b.name, 'branch')} />)}
              </>}
              {filteredCAs.length > 0 && <>
                <div style={{ fontSize: '10px', fontWeight: 600, color: '#858ea2', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '10px 12px 4px' }}>CA numbers</div>
                {filteredCAs.map(c => <SearchRow key={c.id} icon="CA" iconBg="#EAF3DE" iconColor="#27500A" name={c.id} meta={c.branch} onClick={() => handleSelectEntity(c.id, 'ca')} />)}
              </>}
              {filteredStates.length === 0 && filteredBranches.length === 0 && filteredCAs.length === 0 && (
                <div style={{ padding: '14px 12px', fontSize: '13px', color: '#858ea2', textAlign: 'center' }}>No results for "{searchQuery}"</div>
              )}
            </div>
          )}
        </div>

        {/* Date range */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: '8px', padding: '0 12px', height: '40px' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="2" width="12" height="11" rx="1.5" stroke="#858ea2" strokeWidth="1.2" fill="none"/>
            <line x1="1" y1="5" x2="13" y2="5" stroke="#858ea2" strokeWidth="1.2"/>
            <line x1="4" y1="1" x2="4" y2="3" stroke="#858ea2" strokeWidth="1.2" strokeLinecap="round"/>
            <line x1="10" y1="1" x2="10" y2="3" stroke="#858ea2" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          <span style={{ fontSize: '13px', fontWeight: 500, color: '#192744', whiteSpace: 'nowrap' }}>{dateLabel}</span>
          <div style={{ width: '1px', height: '16px', background: '#f3f4f6' }} />
          <select
            value={dateRange}
            onChange={e => { setDateRange(e.target.value); onDateRangeChange?.(e.target.value) }}
            style={{ border: 'none', background: 'transparent', fontSize: '13px', fontWeight: 500, color: '#192744', cursor: 'pointer', outline: 'none', fontFamily: 'Inter, sans-serif', appearance: 'none', paddingRight: '4px' }}
          >
            <option value="1M">Last 1 month</option>
            <option value="3M">Last 3 months</option>
            <option value="6M">Last 6 months</option>
            <option value="1Y">Last 1 year</option>
            <option value="Custom">Custom range</option>
          </select>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 3.5L5 6.5L8 3.5" stroke="#858ea2" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        {dateRange === 'Custom' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              type="date"
              value={customFrom}
              onChange={e => setCustomFrom(e.target.value)}
              style={{ height: '40px', padding: '0 10px', border: '1px solid #f3f4f6', borderRadius: '8px', fontSize: '12px', color: '#192744', background: '#fff', cursor: 'pointer', outline: 'none' }}
            />
            <span style={{ fontSize: '12px', color: '#858ea2' }}>–</span>
            <input
              type="date"
              value={customTo}
              onChange={e => setCustomTo(e.target.value)}
              style={{ height: '40px', padding: '0 10px', border: '1px solid #f3f4f6', borderRadius: '8px', fontSize: '12px', color: '#192744', background: '#fff', cursor: 'pointer', outline: 'none' }}
            />
          </div>
        )}

        {/* Apply */}
        <button onClick={() => onApply?.({ stateF: selectedState, branchF: selectedBranch, caF: selectedCA, dateRange })}
          style={{ height: '40px', padding: '0 14px', background: '#4F46E5', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'background 0.15s' }}
          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = '#4338CA'}
          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = '#4F46E5'}>
          Apply
        </button>
      </div>

      {/* Row 2 — Pinned toggle + inline chips */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', position: 'relative' }} ref={popoverRef}>

        {/* Pinned toggle button */}
        <button onClick={() => setPinnedOpen(p => !p)} style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          height: '32px', padding: '0 12px',
          background: pinnedOpen ? '#EEF2FF' : '#F3F4F6',
          border: '1.5px solid ' + (pinnedOpen ? '#C7D2FE' : '#E5E7EB'),
          borderRadius: '20px', cursor: 'pointer', flexShrink: 0,
          transition: 'all 0.15s',
        }}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <line x1="1" y1="3.5" x2="12" y2="3.5" stroke={pinnedOpen ? '#4F46E5' : '#6B7280'} strokeWidth="1.3" strokeLinecap="round"/>
            <line x1="3" y1="6.5" x2="10" y2="6.5" stroke={pinnedOpen ? '#4F46E5' : '#6B7280'} strokeWidth="1.3" strokeLinecap="round"/>
            <line x1="5" y1="9.5" x2="8" y2="9.5" stroke={pinnedOpen ? '#4F46E5' : '#6B7280'} strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          <span style={{ fontSize: '12px', fontWeight: 600, color: pinnedOpen ? '#4F46E5' : '#111827' }}>Pinned</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '18px', height: '18px', borderRadius: '50%', background: '#4F46E5', color: '#fff', fontSize: '10px', fontWeight: 700 }}>
            {pinnedEntities.length}
          </span>
          <span style={{ fontSize: '10px', color: pinnedOpen ? '#4F46E5' : '#6B7280' }}>{pinnedOpen ? '▲' : '▾'}</span>
        </button>

        {/* Inline pinned chips — first 3 */}
        {visiblePinned.map(e => (
          <div key={e.name} style={{ display: 'flex', alignItems: 'center', gap: '5px', height: '32px', padding: '0 10px', borderRadius: '20px', border: '1.5px solid #E5E7EB', background: '#fff', fontSize: '12px', fontWeight: 500, color: '#111827', cursor: 'pointer' }}
            onClick={() => handleSelectEntity(e.name, e.type)}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: DOT_COLOR[e.type], flexShrink: 0 }} />
            <span>{e.name}</span>
            <button onClick={ev => { ev.stopPropagation(); handleUnpin(e.name) }}
              style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#858ea2', fontSize: '14px', padding: 0, lineHeight: 1, marginLeft: '2px', flexShrink: 0 }}
              onMouseEnter={ev => (ev.currentTarget as HTMLButtonElement).style.color = '#A32D2D'}
              onMouseLeave={ev => (ev.currentTarget as HTMLButtonElement).style.color = '#858ea2'}>
              ×
            </button>
          </div>
        ))}

        {/* +N more overflow */}
        {overflowCount > 0 && (
          <button onClick={() => setPinnedOpen(true)}
            style={{ height: '32px', padding: '0 12px', borderRadius: '20px', border: '1.5px solid #E5E7EB', background: '#fff', fontSize: '12px', color: '#6B7280', cursor: 'pointer', fontWeight: 500 }}>
            +{overflowCount} more
          </button>
        )}

        {/* Popover panel */}
        {pinnedOpen && (
          <div style={{ position: 'absolute', top: '40px', left: 0, width: '560px', background: '#fff', border: '1px solid #f3f4f6', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.10)', zIndex: 100, padding: '16px 18px' }}>

            {/* Pinned section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#858ea2', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pinned ({pinnedEntities.length}/{MAX_PINS})</span>
              <button onClick={() => setPinnedEntities([])} style={{ fontSize: '12px', color: '#858ea2', border: 'none', background: 'none', cursor: 'pointer' }}>Clear all</button>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px', minHeight: '32px' }}>
              {pinnedEntities.length === 0 && <span style={{ fontSize: '12px', color: '#c4c4c4' }}>No pinned items</span>}
              {pinnedEntities.map(e => (
                <div key={e.name} style={{ display: 'flex', alignItems: 'center', gap: '5px', height: '32px', padding: '0 10px', borderRadius: '20px', border: '1px solid #f3f4f6', background: '#fff', fontSize: '12px', fontWeight: 500, color: '#192744' }}>
                  <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: DOT_COLOR[e.type], flexShrink: 0 }} />
                  <span>{e.name}</span>
                  <button onClick={() => handleUnpin(e.name)}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#858ea2', fontSize: '14px', padding: 0, lineHeight: 1, marginLeft: '2px' }}>×</button>
                </div>
              ))}
            </div>

            {/* Divider */}
            <div style={{ height: '1px', background: '#f3f4f6', marginBottom: '14px' }} />

            {/* Recent section */}
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#858ea2', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Recent</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {visibleRecent.map(e => (
                <div key={e.name} style={{ display: 'flex', alignItems: 'center', gap: '5px', height: '32px', padding: '0 10px', borderRadius: '20px', border: '1px dashed #d4d4d0', background: '#fff', fontSize: '12px', color: '#6b6b67', cursor: 'pointer' }}
                  onClick={() => { if (pinnedEntities.length < MAX_PINS) handlePin(e) }}>
                  <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#d4d4d0', flexShrink: 0 }} />
                  <span>{e.name}</span>
                  {pinnedEntities.length < MAX_PINS && (
                    <span style={{ color: '#858ea2', fontSize: '13px', marginLeft: '2px' }}>+</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function SearchRow({ icon, iconBg, iconColor, name, meta, onClick }: { icon: string; iconBg: string; iconColor: string; name: string; meta: string; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{ padding: '9px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #f3f4f6' }}
      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#f5f6fa'}
      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}>
      <div style={{ width: '26px', height: '26px', borderRadius: '6px', background: iconBg, color: iconColor, fontSize: '10px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: '12px', fontWeight: 500, color: '#192744' }}>{name}</div>
        <div style={{ fontSize: '11px', color: '#858ea2' }}>{meta}</div>
      </div>
    </div>
  )
}
