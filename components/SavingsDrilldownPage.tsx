'use client';
import React, { useState } from 'react';
import { STATES, BRANCHES, CAS, getFilteredBills } from '@/lib/calculations';

type SavingsKey = 'contract' | 'pf' | 'affected' | 'clean';

interface SavingsDrilldownPageProps {
  savingsKey: SavingsKey;
  onBack: () => void;
  appState: { view: string; stateF: string; branchF: string; caF: string };
}

const CONFIG: Record<SavingsKey, { label: string; color: string; bg: string; border: string; desc: string; recommendation: string }> = {
  'contract': { label: 'Contract Revision Saving', color: '#DC2626', bg: '#fef2f2', border: '#fecaca', desc: 'CAs with excess demand charges that can be eliminated by revising contracted demand.', recommendation: 'Raise contracted demand to P90 MDI + 15% buffer to eliminate all excess demand charges.' },
  'pf':       { label: 'PF Improvement Saving', color: '#F59E0B', bg: '#fffbeb', border: '#fde68a', desc: 'CAs with power factor below 0.92 incurring monthly penalty charges.', recommendation: 'Install capacitor banks to bring PF above 0.95 across all affected CAs.' },
  'affected': { label: 'Affected Bill Rate', color: '#DC2626', bg: '#fef2f2', border: '#fecaca', desc: 'Bills carrying one or more avoidable charges — excess demand, PF penalty, or late payment surcharge.', recommendation: 'Address each leakage type per CA to move bills to clean status.' },
  'clean':    { label: 'Clean Bill Rate', color: '#2563EB', bg: '#eff6ff', border: '#bfdbfe', desc: 'Bills with zero avoidable charges across all leakage types.', recommendation: 'Maintain PF ≥ 0.95, pay on time, and keep demand within contracted limits.' },
};

// Format month label to short format (e.g., "Apr 2024" -> "Apr", "April" -> "Apr")
function formatShortMonth(label: string): string {
  const monthMap: Record<string, string> = {
    'january': 'Jan', 'february': 'Feb', 'march': 'Mar', 'april': 'Apr',
    'may': 'May', 'june': 'Jun', 'july': 'Jul', 'august': 'Aug',
    'september': 'Sep', 'october': 'Oct', 'november': 'Nov', 'december': 'Dec',
    'jan': 'Jan', 'feb': 'Feb', 'mar': 'Mar', 'apr': 'Apr',
    'jun': 'Jun', 'jul': 'Jul', 'aug': 'Aug', 'sep': 'Sep', 'oct': 'Oct', 'nov': 'Nov', 'dec': 'Dec',
  };
  const parts = label.toLowerCase().split(/[\s,]+/);
  for (const part of parts) {
    if (monthMap[part]) return monthMap[part];
  }
  return label.substring(0, 3).charAt(0).toUpperCase() + label.substring(1, 3).toLowerCase();
}

interface BillDetail {
  billNumber: string;
  billMonth: string;
  leakageAmount: number;
}

export default function SavingsDrilldownPage({ savingsKey, onBack, appState }: SavingsDrilldownPageProps) {
  const [sortCol, setSortCol] = useState<'amount' | 'months' | 'ca' | 'branch' | 'state'>('amount');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [search, setSearch] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleExpand = (ca: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(ca)) next.delete(ca);
      else next.add(ca);
      return next;
    });
  };

  const cfg = CONFIG[savingsKey];

  // Build rows by iterating CAS directly so we have ca/branch/state
  const rows = (() => {
    const result: { ca: string; branch: string; state: string; months: number; amount: number; billDetails: BillDetail[] }[] = [];
    for (const state of STATES) {
      if (appState.stateF !== 'all' && appState.stateF !== state) continue;
      const branches = BRANCHES[state] ?? [];
      for (const branch of branches) {
        if (appState.branchF !== 'all' && appState.branchF !== branch) continue;
        const cas = CAS[branch] ?? [];
        for (const ca of cas) {
          if (appState.caF !== 'all' && appState.caF !== ca) continue;
          const bills = getFilteredBills('monthly', state, branch, ca);
          let amount = 0;
          let monthsAffected = 0;
          const billDetails: BillDetail[] = [];
          
          for (const b of bills as any[]) {
            let leakageAmt = 0;
            
            if (savingsKey === 'contract') {
              leakageAmt = b.excessCharge ?? 0;
            } else if (savingsKey === 'pf') {
              leakageAmt = b.pfPenalty ?? 0;
            } else if (savingsKey === 'affected') {
              leakageAmt = b.totalLeakage ?? 0;
            } else if (savingsKey === 'clean') {
              // For clean, we want to show CAs with zero leakage
              leakageAmt = b.totalLeakage ?? 0;
            }
            
            if (savingsKey === 'clean') {
              // For clean bills, track months with NO leakage
              if (leakageAmt === 0) {
                monthsAffected++;
                billDetails.push({
                  billNumber: `${ca}-${b.label?.replace(/\s/g, '') || 'BILL'}`,
                  billMonth: formatShortMonth(b.label || 'Unknown'),
                  leakageAmount: 0,
                });
              }
            } else {
              // For other keys, track months WITH leakage
              if (leakageAmt > 0) {
                amount += leakageAmt;
                monthsAffected++;
                billDetails.push({
                  billNumber: `${ca}-${b.label?.replace(/\s/g, '') || 'BILL'}`,
                  billMonth: formatShortMonth(b.label || 'Unknown'),
                  leakageAmount: leakageAmt,
                });
              }
            }
          }
          
          if (savingsKey === 'clean') {
            // For clean, include CAs that have at least one clean bill
            if (monthsAffected > 0) result.push({ ca, branch, state, months: monthsAffected, amount: 0, billDetails });
          } else {
            // For others, include CAs with leakage
            if (amount > 0) result.push({ ca, branch, state, months: monthsAffected, amount, billDetails });
          }
        }
      }
    }
    return result;
  })();

  // Search
  const filtered = rows.filter((r: any) =>
    r.ca.toLowerCase().includes(search.toLowerCase()) ||
    r.branch.toLowerCase().includes(search.toLowerCase()) ||
    r.state.toLowerCase().includes(search.toLowerCase())
  );

  // Sort
  const sorted = [...filtered].sort((a: any, b: any) => {
    const av = a[sortCol], bv = b[sortCol];
    const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const totalAmount = sorted.reduce((s: number, r: any) => s + r.amount, 0);

  const handleSort = (col: typeof sortCol) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  };

  const SortArrow = ({ col }: { col: typeof sortCol }) => (
    <span style={{ marginLeft: 3, opacity: sortCol === col ? 1 : 0.25, fontSize: 8 }}>
      {sortCol === col && sortDir === 'asc' ? '▲' : '▼'}
    </span>
  );

  const isCleanView = savingsKey === 'clean';
  
  const COLS = [
    { key: 'ca',     label: 'CA Number',       align: 'left'  },
    { key: 'branch', label: 'Branch',          align: 'left'  },
    { key: 'state',  label: 'State',           align: 'left'  },
    { key: 'months', label: isCleanView ? 'Clean Months' : 'Months Affected', align: 'right' },
    { key: 'amount', label: isCleanView ? 'Status' : 'Saving Potential',  align: 'right' },
    { key: null,     label: 'Share',           align: 'right' },
  ];

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1200, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <button onClick={onBack} style={{
          fontFamily: 'inherit', fontSize: 12, fontWeight: 500,
          color: '#858ea2', background: '#fff',
          border: '1px solid #f0f1f5', borderRadius: 6,
          padding: '6px 12px', cursor: 'pointer', marginTop: 3,
          boxShadow: '0 1px 2px rgba(25,39,68,.04)',
        }}>← Back</button>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.color }} />
            <span style={{ fontSize: 10, fontWeight: 600, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{cfg.label}</span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#192744', letterSpacing: '-0.01em', marginBottom: 4 }}>
            {isCleanView ? 'Clean bill profile' : 'CA-level savings breakdown'}
          </div>
          <div style={{ fontSize: 12, color: '#858ea2' }}>{cfg.desc}</div>
        </div>
      </div>

      {/* Summary strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { label: isCleanView ? 'Clean CAs' : 'Total saving potential', value: isCleanView ? String(sorted.length) : '₹' + (totalAmount / 100000).toFixed(1) + 'L', color: cfg.color, highlight: true },
          { label: 'CAs in scope',   value: String(sorted.length), color: '#192744', highlight: false },
          { label: isCleanView ? 'Avg clean months' : 'Avg per CA', value: sorted.length > 0 ? (isCleanView ? (sorted.reduce((s, r) => s + r.months, 0) / sorted.length).toFixed(1) : '₹' + (totalAmount / sorted.length / 100000).toFixed(2) + 'L') : '—', color: '#192744', highlight: false },
          { label: 'Branches covered', value: String(new Set(sorted.map((r: any) => r.branch)).size), color: '#192744', highlight: false },
        ].map((s, i) => (
          <div key={i} style={{
            background: s.highlight ? cfg.bg : '#fff',
            border: '1px solid ' + (s.highlight ? cfg.border : '#f0f1f5'),
            borderRadius: 8, padding: '14px 16px',
          }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#858ea2', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color, letterSpacing: '-0.01em', lineHeight: 1.3 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Recommendation banner */}
      <div style={{ background: cfg.bg, border: '1px solid ' + cfg.border, borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
        <div style={{ fontSize: 13, color: '#192744' }}>
          <span style={{ fontWeight: 600 }}>Recommendation: </span>
          {cfg.recommendation}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid #f0f1f5', borderRadius: 8, boxShadow: '0 1px 3px rgba(25,39,68,.04)', overflow: 'hidden' }}>

        {/* Toolbar */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f1f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#192744' }}>
            {sorted.length} CA{sorted.length !== 1 ? 's' : ''} {isCleanView ? 'with clean bills' : 'with saving potential'}
            {search && <span style={{ fontWeight: 400, color: '#858ea2', fontSize: 12 }}> · filtered</span>}
          </div>
          <div style={{ position: 'relative', width: 280 }}>
            <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.35 }}
              width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#192744" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search CA, branch, state..."
              style={{ width: '100%', padding: '7px 10px 7px 30px', border: '1px solid #f0f1f5', borderRadius: 6, fontSize: 12, fontFamily: 'inherit', color: '#192744', background: '#f5f6fa', outline: 'none' }}
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f5f6fa' }}>
                {COLS.map((col, i) => (
                  <th key={i}
                    onClick={col.key ? () => handleSort(col.key as typeof sortCol) : undefined}
                    style={{
                      padding: '9px 16px', textAlign: col.align as any,
                      fontSize: 10, fontWeight: 600, color: '#858ea2',
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                      borderBottom: '1px solid #f0f1f5', whiteSpace: 'nowrap',
                      cursor: col.key ? 'pointer' : 'default', userSelect: 'none',
                    }}>
                    {col.label}{col.key && <SortArrow col={col.key as typeof sortCol} />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: '#858ea2', fontSize: 13 }}>
                  {search ? `No CAs matching "${search}"` : (isCleanView ? 'No CAs with clean bills found' : 'No CAs with saving potential')}
                </td></tr>
              ) : sorted.map((r: any, i: number) => {
                const sharePct = isCleanView ? (r.months / 12) * 100 : (totalAmount > 0 ? (r.amount / totalAmount) * 100 : 0);
                const monthColor = isCleanView 
                  ? (r.months >= 10 ? '#16a34a' : r.months >= 6 ? '#F59E0B' : '#858ea2')
                  : (r.months >= 9 ? '#DC2626' : r.months >= 6 ? '#F59E0B' : '#858ea2');
                const isExpanded = expandedRows.has(r.ca);
                return (
                  <React.Fragment key={i}>
                    <tr
                      style={{ borderBottom: isExpanded ? 'none' : '1px solid #f0f1f5', transition: 'background .1s', background: isExpanded ? '#fafbfc' : 'transparent' }}
                      onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = '#f5f6fa'; }}
                      onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = 'transparent'; }}>
                      <td style={{ padding: '11px 16px', fontWeight: 600, color: '#192744', fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.02em' }}>{r.ca}</td>
                      <td style={{ padding: '11px 16px', color: '#192744' }}>{r.branch}</td>
                      <td style={{ padding: '11px 16px' }}>
                        <span style={{ fontSize: 11, color: '#858ea2', background: '#f5f6fa', border: '1px solid #f0f1f5', borderRadius: 4, padding: '2px 7px' }}>{r.state}</span>
                      </td>
                      <td style={{ padding: '11px 16px', textAlign: 'right' }}>
                        <button
                          onClick={() => toggleExpand(r.ca)}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px',
                            borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 4,
                            transition: 'background .15s',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#e5e7eb')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                        >
                          <span style={{ fontWeight: 600, color: monthColor }}>{r.months}</span>
                          <span style={{ color: '#c8cbd6' }}> / 12</span>
                          <span style={{ fontSize: 10, color: '#858ea2', marginLeft: 4, transition: 'transform .2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                        </button>
                      </td>
                      <td style={{ padding: '11px 16px', textAlign: 'right', fontWeight: 700, color: cfg.color, letterSpacing: '-0.01em' }}>
                        {isCleanView ? (
                          <span style={{ fontSize: 11, color: '#16a34a', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 4, padding: '2px 8px' }}>Clean</span>
                        ) : (
                          '₹' + (r.amount / 100000).toFixed(2) + 'L'
                        )}
                      </td>
                      <td style={{ padding: '11px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                          <div style={{ width: 64, height: 4, background: '#f0f1f5', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{ width: sharePct + '%', height: '100%', background: cfg.color, borderRadius: 99, opacity: 0.7 }} />
                          </div>
                          <span style={{ fontSize: 11, color: '#858ea2', minWidth: 34, textAlign: 'right' }}>{sharePct.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                    {/* Expanded bill details row */}
                    {isExpanded && (
                      <tr style={{ background: '#fafbfc' }}>
                        <td colSpan={6} style={{ padding: '0 16px 16px 48px' }}>
                          <div style={{ background: '#fff', border: '1px solid #f0f1f5', borderRadius: 6, overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                              <thead>
                                <tr style={{ background: '#f5f6fa' }}>
                                  <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 9, fontWeight: 600, color: '#858ea2', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Bill Number</th>
                                  <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 9, fontWeight: 600, color: '#858ea2', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Bill Month</th>
                                  <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: 9, fontWeight: 600, color: '#858ea2', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{isCleanView ? 'Status' : 'Leakage Amount'}</th>
                                  <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: 9, fontWeight: 600, color: '#858ea2', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Share</th>
                                </tr>
                              </thead>
                              <tbody>
                                {r.billDetails.map((bill: BillDetail, bi: number) => {
                                  const billSharePct = isCleanView ? 100 / r.billDetails.length : (r.amount > 0 ? (bill.leakageAmount / r.amount) * 100 : 0);
                                  return (
                                    <tr key={bi} style={{ borderBottom: bi < r.billDetails.length - 1 ? '1px solid #f0f1f5' : 'none' }}>
                                      <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 10, color: '#192744', fontWeight: 500 }}>{bill.billNumber}</td>
                                      <td style={{ padding: '8px 12px', color: '#6b7280' }}>{bill.billMonth}</td>
                                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: cfg.color }}>
                                        {isCleanView ? (
                                          <span style={{ fontSize: 10, color: '#16a34a' }}>Clean</span>
                                        ) : (
                                          '₹' + (bill.leakageAmount / 100000).toFixed(2) + 'L'
                                        )}
                                      </td>
                                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                                          <div style={{ width: 40, height: 3, background: '#f0f1f5', borderRadius: 99, overflow: 'hidden' }}>
                                            <div style={{ width: billSharePct + '%', height: '100%', background: cfg.color, borderRadius: 99, opacity: 0.6 }} />
                                          </div>
                                          <span style={{ fontSize: 10, color: '#858ea2', minWidth: 30, textAlign: 'right' }}>{billSharePct.toFixed(0)}%</span>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{ padding: '10px 16px', borderTop: '1px solid #f0f1f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#858ea2' }}>
            {sorted.length} CAs · sorted by {sortCol} ({sortDir})
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: cfg.color }}>
            {isCleanView ? `${sorted.length} clean CAs` : `Total: ₹${(totalAmount / 100000).toFixed(1)}L`}
          </span>
        </div>
      </div>
    </div>
  );
}
