'use client';

import React, { useState } from 'react';
import { STATES, BRANCHES, CAS, BILL_CATEGORIES, BillCategory } from '@/lib/calculations';

interface AppState {
  view: 'yearly' | 'monthly';
  stateF: string;
  branchF: string;
  caF: string;
  billCategory: BillCategory;
  section: string;
}

interface DashboardNavProps {
  activeProduct: 'bill-payment' | 'vendor-payment' | 'rental-payment' | 'gst';
  onProductChange: (product: 'bill-payment' | 'vendor-payment' | 'rental-payment' | 'gst') => void;
  activeSection: string;
  onSectionChange: (section: string) => void;
  appState: AppState;
  onStateChange: (state: string) => void;
  onBranchChange: (branch: string) => void;
  onCAChange: (ca: string) => void;
  onBillCategoryChange: (category: string) => void;
  onPeriodChange: (period: string) => void;
  analyticsMode: 'basic' | 'advanced';
  onModeChange: (mode: 'basic' | 'advanced') => void;
  basicSection?: string;
  onBasicSectionChange?: (section: string) => void;
}

export default function DashboardNav({
  activeProduct,
  onProductChange,
  activeSection,
  onSectionChange,
  appState,
  onStateChange,
  onBranchChange,
  onCAChange,
  onBillCategoryChange,
  onPeriodChange,
  analyticsMode,
  onModeChange,
  basicSection = 'summary',
  onBasicSectionChange,
}: DashboardNavProps) {
  const [localState, setLocalState] = useState('');
  const [localBranch, setLocalBranch] = useState('');
  const [localCA, setLocalCA] = useState('');
  const [localBillCategory, setLocalBillCategory] = useState('all');
  const [period, setPeriod] = useState('1Y');
  const [dateRange, setDateRange] = useState('1Y');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const basicSections = [
    { id: 'summary',   label: 'Summary',   icon: <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><rect x="1" y="1" width="4.5" height="4.5" rx="1"/><rect x="7.5" y="1" width="4.5" height="4.5" rx="1"/><rect x="1" y="7.5" width="4.5" height="4.5" rx="1"/><rect x="7.5" y="7.5" width="4.5" height="4.5" rx="1"/></svg> },
    { id: 'locations', label: 'Locations', icon: <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M6.5 1C4.5 1 3 2.6 3 4.5c0 2.7 3.5 7.5 3.5 7.5S10 7.2 10 4.5C10 2.6 8.5 1 6.5 1z"/><circle cx="6.5" cy="4.5" r="1.2"/></svg> },
    { id: 'trends',    label: 'Trends',    icon: <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M1 10l3.5-3.5 2.5 2L11 3"/></svg> },
    { id: 'billers',   label: 'Billers',   icon: <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><rect x="1.5" y="2" width="10" height="9" rx="1.5"/><path d="M4 5.5h5M4 7.5h3"/></svg> },
  ]
  const sections = [
    { id: 'excess-demand', label: 'Excess demand' },
    { id: 'consumption', label: 'Consumption' },
    { id: 'leakages', label: 'Leakages' },
    { id: 'savings', label: 'Savings' },
  ];

  const products = [
    { value: 'bill-payment', label: 'Bill Payment' },
    { value: 'vendor-payment', label: 'Vendor Payment' },
    { value: 'rental-payment', label: 'Rental Payment' },
    { value: 'gst', label: 'GST' },
  ];

  const showSectionPills = activeProduct === 'bill-payment';

  const getStateOptions = () => {
    return STATES.map((name) => ({
      value: name,
      label: name,
    }));
  };

  const getBranchOptions = () => {
    if (appState.stateF === 'all') return [];
    const branches = BRANCHES[appState.stateF] || [];
    return branches.map((name) => ({
      value: name,
      label: name,
    }));
  };

  const getCAOptions = () => {
    if (appState.branchF === 'all') return [];
    const caList = CAS[appState.branchF] || [];
    return caList.map((ca) => ({
      value: ca,
      label: ca,
    }));
  };

  const getSectionIcon = (sectionId: string) => {
    switch (sectionId) {
      case 'overview':
        return (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
            <rect x="2" y="2" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.5"/>
            <rect x="8" y="2" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.5"/>
            <rect x="2" y="8" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.5"/>
            <rect x="8" y="8" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
        );
      case 'billers':
        return (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
            <rect x="2" y="2" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M2 5h10" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M5 8h7" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M5 11h7" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
        );
      case 'excess-demand':
        return (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
            <path d="M8.5 2L4 7.5h5L5 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'consumption':
        return (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
            <path d="M2 10l3-3.5 2.5 2L11 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9.5 4H11v1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'leakages':
        return (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
            <path d="M7 2.5L1.5 11.5h11L7 2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M7 6v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="7" cy="10" r="0.5" fill="currentColor"/>
          </svg>
        );
      case 'savings':
        return (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
            <circle cx="7" cy="6" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M7 9.5V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M5 11.5l2 1 2-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M5.5 5.5C5.5 5.5 6 4.5 7 4.5s1.5.8 1.5 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <nav style={{ position: 'sticky', top: 0, zIndex: 50, backgroundColor: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderBottom: '1px solid #F3F4F6' }}>
      {/* Analytics mode toggle */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 24px',
        background: '#fff',
        borderBottom: '0.5px solid rgba(0,0,0,0.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Mode toggle pill */}
          <div style={{ display: 'flex', gap: '3px', background: 'transparent', borderRadius: '10px', padding: '3px' }}>
            {([
              { id: 'basic', label: 'Basic Analytics', icon: '◎' },
              { id: 'advanced', label: 'Advanced Analytics', icon: '⬡', badge: 'BILL COPY' },
            ] as const).map(mode => (
              <button
                key={mode.id}
                onClick={() => onModeChange?.(mode.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '5px 14px', borderRadius: '6px',
                  fontSize: '12px', fontWeight: analyticsMode === mode.id ? 600 : 400,
                  border: analyticsMode === mode.id ? '1.5px solid #E5E7EB' : '1.5px solid transparent',
                  cursor: 'pointer',
                  background: analyticsMode === mode.id ? '#F3F4F6' : 'transparent',
                  color: analyticsMode === mode.id ? '#111827' : '#6B7280',
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: '10px', color: analyticsMode === mode.id ? '#4F46E5' : '#6B7280' }}>{mode.icon}</span>
                {mode.label}
                {'badge' in mode && (
                  <span style={{
                    fontSize: '9px', fontWeight: 700, padding: '1px 5px', borderRadius: '4px',
                    background: '#EEF2FF',
                    border: '1px solid #C7D2FE',
                    color: '#4F46E5',
                    letterSpacing: '0.04em',
                  }}>
                    {mode.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Breadcrumb — only shown in Advanced */}
          {analyticsMode === 'advanced' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#9b9b96' }}>
              <span>·</span>
              <span>Bill copy data connected</span>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#1D9E75', display: 'inline-block', marginLeft: '2px' }} />
            </div>
          )}
        </div>

        {/* Right — data freshness */}
        <div style={{ fontSize: '11px', color: '#b0b0b0' }}>
          Updated daily · Apr 2025
        </div>
      </div>

      {/* Product Navigation - Primary */}
      <div style={{ 
        display: 'flex', 
        gap: '24px', 
        padding: '12px 24px', 
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #E5E7EB',
        alignItems: 'center'
      }}>
        {products.map((p) => (
          <button
            key={p.value}
            onClick={() => onProductChange(p.value as any)}
            style={{
              padding: '8px 0',
              fontFamily: '"Inter", sans-serif',
              fontSize: '14px',
              fontWeight: activeProduct === p.value ? 600 : 400,
              color: activeProduct === p.value ? '#4F46E5' : '#6B7280',
              background: 'transparent',
              border: 'none',
              borderBottom: activeProduct === p.value ? '2px solid #4F46E5' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              whiteSpace: 'nowrap',
              position: 'relative',
            }}
            onMouseEnter={(e) => {
              if (activeProduct !== p.value) {
                (e.target as HTMLButtonElement).style.color = '#374151';
              }
            }}
            onMouseLeave={(e) => {
              if (activeProduct !== p.value) {
                (e.target as HTMLButtonElement).style.color = '#6B7280';
              }
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Filter bar — row 1: search + date + apply */}
      {showSectionPills && (
        <div style={{ padding: '10px 24px 6px', display: 'flex', gap: '8px', alignItems: 'center', borderBottom: '1px solid #F3F4F6', backgroundColor: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, background: '#F3F4F6', border: '1.5px solid #E5E7EB', borderRadius: '8px', padding: '7px 12px' }}>
            <svg width="14" height="14" viewBox="0 0 15 15" fill="none" stroke="#9CA3AF" strokeWidth="1.7" strokeLinecap="round"><circle cx="6.5" cy="6.5" r="4.5"/><path d="M10.5 10.5l2.5 2.5"/></svg>
            <input placeholder="Search state, branch, or CA number…" style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '13px', color: '#111827', width: '100%', fontFamily: 'inherit' }} />
          </div>
          {(() => {
            const dateLabel = dateRange === '1M' ? 'Last 1 month' : dateRange === '3M' ? 'Last 3 months' : dateRange === 'Custom' ? (customFrom && customTo ? `${customFrom} – ${customTo}` : 'Custom range') : 'Apr 2024 – Mar 2025'
            return (
              <>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: '8px', padding: '7px 12px', fontSize: '12.5px', color: '#6B7280', whiteSpace: 'nowrap' }}>
                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round"><rect x="1" y="2" width="12" height="11" rx="2"/><path d="M1 6h12M4 1v2M10 1v2"/></svg>
                    <span>{dateLabel}</span>
                    <svg width="10" height="10" viewBox="0 0 13 13" fill="none" stroke="#6B7280" strokeWidth="1.8" strokeLinecap="round"><path d="M3 5l3.5 3.5L10 5"/></svg>
                  </div>
                  <select value={dateRange} onChange={e => setDateRange(e.target.value)} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%' }}>
                    <option value="1M">Last 1 month</option>
                    <option value="3M">Last 3 months</option>
                    <option value="1Y">Last 1 year</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>
                {dateRange === 'Custom' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: '8px', padding: '7px 12px', fontSize: '12.5px', color: '#6B7280' }}>
                    <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} style={{ border: 'none', outline: 'none', fontFamily: 'inherit', fontSize: '12.5px', color: '#6B7280', background: 'transparent', cursor: 'pointer' }}/>
                    <span style={{ color: '#9CA3AF' }}>–</span>
                    <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} style={{ border: 'none', outline: 'none', fontFamily: 'inherit', fontSize: '12.5px', color: '#6B7280', background: 'transparent', cursor: 'pointer' }}/>
                  </div>
                )}
              </>
            )
          })()}
          <button style={{ background: '#4F46E5', color: '#fff', border: 'none', borderRadius: '8px', padding: '7px 14px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0 }}>Apply</button>
        </div>
      )}

      {/* Filter bar — row 2: pinned + chips */}
      {showSectionPills && (
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', padding: '6px 24px 8px', backgroundColor: '#fff', borderBottom: '1px solid #F3F4F6' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, background: '#F3F4F6', border: '1.5px solid #E5E7EB', borderRadius: '20px', padding: '4px 10px', cursor: 'pointer' }}>
            <svg width="12" height="12" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M1 3h11M3.5 6.5h6M5.5 10h2"/></svg>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>Pinned</span>
            <span style={{ background: '#4F46E5', color: '#fff', borderRadius: '8px', minWidth: '16px', height: '16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, padding: '0 4px' }}>3</span>
          </div>
          {['Maharashtra', 'Mumbai North', 'MH-MN-0101'].map(l => (
            <div key={l} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', flexShrink: 0, background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: '20px', padding: '4px 8px 4px 10px', fontSize: '12px', fontWeight: 500, color: '#111827', whiteSpace: 'nowrap' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22C55E' }}/>
              {l}
            </div>
          ))}
        </div>
      )}

      {/* Section Navigation - Secondary (only for Bill Payment AND Advanced mode) */}
      {showSectionPills && (
        <div style={{ 
          display: 'flex', 
          gap: '8px', 
          padding: '10px 24px', 
          backgroundColor: '#F3F4F6',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center', overflowX: 'auto', flexWrap: 'nowrap', scrollbarWidth: 'none', flex: 1, minWidth: 0 }}>
            {analyticsMode === 'basic' ? (
              <React.Fragment>
                {[
                  { id: 'summary',   label: 'Summary',   icon: <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><rect x="1" y="1" width="4.5" height="4.5" rx="1"/><rect x="7.5" y="1" width="4.5" height="4.5" rx="1"/><rect x="1" y="7.5" width="4.5" height="4.5" rx="1"/><rect x="7.5" y="7.5" width="4.5" height="4.5" rx="1"/></svg> },
                  { id: 'locations', label: 'Locations', icon: <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M6.5 1C4.5 1 3 2.6 3 4.5c0 2.7 3.5 7.5 3.5 7.5S10 7.2 10 4.5C10 2.6 8.5 1 6.5 1z"/><circle cx="6.5" cy="4.5" r="1.2"/></svg> },
                  { id: 'trends',    label: 'Trends',    icon: <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M1 10l3.5-3.5 2.5 2L11 3"/></svg> },
                  { id: 'billers',   label: 'Billers',   icon: <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><rect x="1.5" y="2" width="10" height="9" rx="1.5"/><path d="M4 5.5h5M4 7.5h3"/></svg> },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => onBasicSectionChange?.(s.id)}
                    style={{
                      border: 'none',
                      fontFamily: '"Inter", sans-serif',
                      padding: '5px 12px',
                      fontSize: '12.5px',
                      fontWeight: basicSection === s.id ? 600 : 400,
                      color: basicSection === s.id ? '#4F46E5' : '#6B7280',
                      cursor: 'pointer',
                      background: basicSection === s.id ? '#EEF2FF' : 'transparent',
                      borderRadius: '20px',
                      outline: basicSection === s.id ? '1.5px solid #C7D2FE' : '1.5px solid transparent',
                      transition: 'all .12s',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {s.icon}{s.label}
                  </button>
                ))}
              </React.Fragment>
            ) : (
              <React.Fragment>
                {basicSections.map((s) => (
                  <button key={s.id} onClick={() => onSectionChange(s.id)} style={{
                    border: 'none', fontFamily: 'inherit',
                    padding: '5px 12px', fontSize: '12.5px',
                    fontWeight: activeSection === s.id ? 600 : 400,
                    color: activeSection === s.id ? '#4F46E5' : '#6B7280',
                    cursor: 'pointer',
                    background: activeSection === s.id ? '#EEF2FF' : 'transparent',
                    borderRadius: '20px',
                    outline: activeSection === s.id ? '1.5px solid #C7D2FE' : '1.5px solid transparent',
                    transition: 'all .12s', display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap',
                  }}>
                    {s.icon}{s.label}
                  </button>
                ))}

                {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => onSectionChange(section.id)}
                style={{
                  border: 'none',
                  fontFamily: '"Inter", sans-serif',
                  padding: '5px 12px',
                  fontSize: '12.5px',
                  fontWeight: activeSection === section.id ? 600 : 400,
                  color: activeSection === section.id ? '#4F46E5' : '#6B7280',
                  cursor: 'pointer',
                  background: activeSection === section.id ? '#EEF2FF' : 'transparent',
                  borderRadius: '20px',
                  outline: activeSection === section.id ? '1.5px solid #C7D2FE' : '1.5px solid transparent',
                  transition: 'all .12s',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  if (activeSection !== section.id) {
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(79, 70, 229, 0.05)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeSection !== section.id) {
                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  }
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {getSectionIcon(section.id)}
                </span>
                {section.label}
              </button>
                ))}
              </React.Fragment>
            )}
          </div>

          {/* Bill Category Filter - Right side */}
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <select
              value={appState.billCategory}
              onChange={(e) => onBillCategoryChange(e.target.value)}
              style={{
                height: '32px',
                background: '#ffffff',
                borderRadius: '20px',
                padding: '6px 12px 6px 14px',
                fontSize: '13px',
                color: '#6B7280',
                fontWeight: 500,
                appearance: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: '"Inter", sans-serif',
                border: '1.5px solid #E5E7EB',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLSelectElement).style.borderColor = '#D1D5DB';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLSelectElement).style.borderColor = '#E5E7EB';
              }}
            >
              <option value="all">All categories</option>
              {BILL_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <svg
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
                width: '12px',
                height: '12px',
                color: '#6B7280',
                flexShrink: 0,
              }}
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 14l-7 7m0 0l-7-7m7 7V3' />
            </svg>
          </div>
        </div>
      )}
    </nav>
  );
}
