'use client';
import React, { useState } from 'react';
import { STATES, BRANCHES, CAS, getFilteredBills } from '@/lib/calculations';

type LeakageKey = 'Excess demand' | 'Power factor <0.92' | 'Demand shrinkage' | 'Late payment surcharge' | 'Under-utilised demand';

interface LeakageDrilldownPageProps {
  leakageKey: LeakageKey;
  onBack: () => void;
  appState: { view: string; stateF: string; branchF: string; caF: string };
}

const CONFIG: Record<LeakageKey, { color: string; bg: string; border: string; desc: string; recommendation: string }> = {
  'Excess demand':         { color: '#DC2626', bg: '#fef2f2', border: '#fecaca', desc: 'CAs exceeding contracted demand limit every month.', recommendation: 'Revise contracted demand upward to P90 MDI + 15% buffer to eliminate excess charges.' },
  'Power factor <0.92':    { color: '#DC2626', bg: '#fef2f2', border: '#fecaca', desc: 'CAs with PF below 0.92 triggering monthly penalty charges.', recommendation: 'Install capacitor banks at high-impact locations to bring PF above 0.95.' },
  'Demand shrinkage':      { color: '#DC2626', bg: '#fef2f2', border: '#fecaca', desc: 'CAs where contracted demand is exceeded every month.', recommendation: 'Revise contracted demand upward to P90 MDI + 15% buffer.' },
  'Late payment surcharge':{ color: '#F59E0B', bg: '#fffbeb', border: '#fde68a', desc: 'CAs with 3+ consecutive months of late payment surcharge.', recommendation: 'Align payment scheduling to due dates.' },
  'Under-utilised demand': { color: '#16a34a', bg: '#f0faf6', border: '#bbf7d0', desc: 'CAs with demand consistently under-utilised below 70%.', recommendation: 'Reduce contracted demand or correct TOD slot.' },
};

// Build lookup: caNumber -> { branch, state }
function buildCAMeta(): Record<string, { branch: string; state: string }> {
  const meta: Record<string, { branch: string; state: string }> = {};
  for (const state of STATES) {
    const branches = BRANCHES[state] ?? [];
    for (const branch of branches) {
      const cas = CAS[branch] ?? [];
      for (const ca of cas) {
        meta[ca] = { branch, state };
      }
    }
  }
  return meta;
}

interface BillDetail {
  billNumber: string;
  billMonth: string;
  leakageAmount: number;
}

export default function LeakageDrilldownPage({ leakageKey, onBack, appState }: LeakageDrilldownPageProps) {
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

  const cfg = CONFIG[leakageKey];
  const caMeta = buildCAMeta();

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
          const bills = getFilteredBills(appState.view as 'yearly' | 'monthly', state, branch, ca);
          let amount = 0;
          let monthsAffected = 0;
          const billDetails: BillDetail[] = [];
          for (const b of bills as any[]) {
            let leakageAmt = 0;
            if (leakageKey === 'Excess demand') {
              leakageAmt = b.excessCharge ?? 0;
            } else if (leakageKey === 'Power factor <0.92') {
              leakageAmt = b.pfPenalty ?? 0;
            } else if (leakageKey === 'Demand shrinkage') {
              leakageAmt = b.excessCharge ?? 0;
            } else if (leakageKey === 'Late payment surcharge') {
              leakageAmt = b.latePayment ?? 0;
            } else {
              leakageAmt = b.todViolation ?? 0;
            }
            if (leakageAmt > 0) {
              amount += leakageAmt;
              monthsAffected++;
              billDetails.push({
                billNumber: `${ca}-${b.label?.replace(/\s/g, '') || 'BILL'}`,
                billMonth: b.label || 'Unknown',
                leakageAmount: leakageAmt,
              });
            }
          }
          if (amount > 0) result.push({ ca, branch, state, months: monthsAffected, amount, billDetails });
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

  const COLS = [
    { key: 'ca',     label: 'CA Number',       align: 'left'  },
    { key: 'branch', label: 'Branch',          align: 'left'  },
    { key: 'state',  label: 'State',           align: 'left'  },
    { key: 'months', label: 'Months Affected', align: 'right' },
    { key: 'amount', label: 'Leakage Amount',  align: 'right' },
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
            <span style={{ fontSize: 10, fontWeight: 600, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{leakageKey}</span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#192744', letterSpacing: '-0.01em', marginBottom: 4 }}>
            CA-level leakage breakdown
          </div>
          <div style={{ fontSize: 12, color: '#858ea2' }}>{cfg.desc}</div>
        </div>
      </div>

      {/* Summary strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { label: 'Total leakage',  value: '₹' + (totalAmount / 100000).toFixed(1) + 'L', color: cfg.color, highlight: true },
          { label: 'CAs affected',   value: String(sorted.length), color: '#192744', highlight: false },
          { label: 'Avg per CA',     value: sorted.length > 0 ? '₹' + (totalAmount / sorted.length / 100000).toFixed(2) + 'L' : '—', color: '#192744', highlight: false },
          { label: 'Recommendation', value: cfg.recommendation, color: '#192744', highlight: false, small: true },
        ].map((s, i) => (
          <div key={i} style={{
            background: s.highlight ? cfg.bg : '#fff',
            border: '1px solid ' + (s.highlight ? cfg.border : '#f0f1f5'),
            borderRadius: 8, padding: '14px 16px',
          }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#858ea2', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: s.small ? 11 : 22, fontWeight: s.small ? 400 : 700, color: s.color, letterSpacing: '-0.01em', lineHeight: 1.3 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid #f0f1f5', borderRadius: 8, boxShadow: '0 1px 3px rgba(25,39,68,.04)', overflow: 'hidden' }}>

        {/* Toolbar */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f1f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#192744' }}>
            {sorted.length} CA{sorted.length !== 1 ? 's' : ''} affected
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
                  {search ? `No CAs matching "${search}"` : 'No CAs affected by this leakage type'}
                </td></tr>
              ) : sorted.map((r: any, i: number) => {
                const sharePct = totalAmount > 0 ? (r.amount / totalAmount) * 100 : 0;
                const monthColor = r.months >= 9 ? '#DC2626' : r.months >= 6 ? '#F59E0B' : '#858ea2';
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
                        ₹{(r.amount / 100000).toFixed(2)}L
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
                                  <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: 9, fontWeight: 600, color: '#858ea2', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Leakage Amount</th>
                                  <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: 9, fontWeight: 600, color: '#858ea2', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Share</th>
                                </tr>
                              </thead>
                              <tbody>
                                {r.billDetails.map((bill: BillDetail, bi: number) => {
                                  const billSharePct = r.amount > 0 ? (bill.leakageAmount / r.amount) * 100 : 0;
                                  return (
                                    <tr key={bi} style={{ borderBottom: bi < r.billDetails.length - 1 ? '1px solid #f0f1f5' : 'none' }}>
                                      <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 10, color: '#192744', fontWeight: 500 }}>{bill.billNumber}</td>
                                      <td style={{ padding: '8px 12px', color: '#6b7280' }}>{bill.billMonth}</td>
                                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: cfg.color }}>₹{(bill.leakageAmount / 100000).toFixed(2)}L</td>
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
            Total: ₹{(totalAmount / 100000).toFixed(1)}L
          </span>
        </div>
      </div>
    </div>
  );
}
