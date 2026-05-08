'use client';

import React, { useState } from 'react';
import DashboardNav from '@/components/DashboardNav';
import TopFilter from '@/components/TopFilter';
import ExcessDemandSection from '@/components/ExcessDemandSection';
import LeakagesSection from '@/components/LeakagesSection';
import BillersSection from '@/components/BillersSection';
import ConsumptionSection from '@/components/ConsumptionSection';
import SavingsSection from '@/components/SavingsSection';
import HeatmapDrilldownPage from '@/components/HeatmapDrilldownPage';
import AnomalyDrilldownPage from '@/components/AnomalyDrilldownPage';
import LeakageDrilldownPage from '@/components/LeakageDrilldownPage';
import SavingsDrilldownPage from '@/components/SavingsDrilldownPage';
import MultiBillReviewPage from '@/components/MultiBillReviewPage';
import BasicAnalyticsShell from '@/components/BasicAnalyticsShell';
import { BillCategory } from '@/lib/calculations';

export default function AnalyticsPage() {
  const [activeProduct, setActiveProduct] = useState<'bill-payment' | 'vendor-payment' | 'rental-payment' | 'gst'>('bill-payment');
  const [activeSection, setActiveSection] = useState<'billers' | 'excess-demand' | 'consumption' | 'leakages' | 'savings'>('leakages');
  const [analyticsMode, setAnalyticsMode] = useState<'basic' | 'advanced'>('basic');
  const [basicSection, setBasicSection] = useState('summary');

  const [appState, setAppState] = useState({
    view: 'yearly' as 'yearly' | 'monthly',
    stateF: 'all',
    branchF: 'all',
    caF: 'all',
    billCategory: 'all' as BillCategory,
    section: 'leakages',
  });

  const [drilldown, setDrilldown] = useState<{ state: string; month: string; monthIndex: number } | null>(null);
  const [anomalyDrilldown, setAnomalyDrilldown] = useState<'over_contracted_every_month' | 'pf_below_threshold' | 'recurring_late_payment' | 'under_utilised' | null>(null);
  const [leakageDrilldown, setLeakageDrilldown] = useState<string | null>(null);
  const [savingsDrilldown, setSavingsDrilldown] = useState<'contract' | 'pf' | 'affected' | 'clean' | null>(null);
  const [multiBillReview, setMultiBillReview] = useState(false);

  const handleProductChange = (product: 'bill-payment' | 'vendor-payment' | 'rental-payment' | 'gst') => {
    setActiveProduct(product);
    if (product === 'bill-payment') {
      setActiveSection('leakages');
    }
  };

  const handleStateChange = (value: string) => {
    setAppState(prev => ({ ...prev, stateF: value, branchF: 'all', caF: 'all' }));
  };

  const handleBranchChange = (value: string) => {
    setAppState(prev => ({ ...prev, branchF: value, caF: 'all' }));
  };

  const handleCAChange = (value: string) => {
    setAppState(prev => ({ ...prev, caF: value }));
  };

  const handleBillCategoryChange = (value: string) => {
    setAppState(prev => ({ ...prev, billCategory: value as BillCategory }));
  };

  const handlePeriodChange = (value: string) => {
    const viewMap: Record<string, 'yearly' | 'monthly'> = {
      '1m': 'monthly',
      '3m': 'monthly',
      '6m': 'monthly',
      '1y': 'yearly',
      'custom': 'monthly',
    };
    setAppState(prev => ({ ...prev, view: viewMap[value] || 'yearly' }));
  };

  return (
    <div className="page-wrapper" style={{ background: '#F3F4F6' }}>
      <DashboardNav
        activeProduct={activeProduct}
        onProductChange={handleProductChange}
        activeSection={activeSection}
        onSectionChange={(s) => setActiveSection(s as any)}
        appState={appState}
        onStateChange={handleStateChange}
        onBranchChange={handleBranchChange}
        onCAChange={handleCAChange}
        onBillCategoryChange={handleBillCategoryChange}
        onPeriodChange={handlePeriodChange}
        analyticsMode={analyticsMode}
        onModeChange={setAnalyticsMode}
        basicSection={basicSection}
        onBasicSectionChange={setBasicSection}
      />


      {/* Section content */}
      <div className="content">
        {analyticsMode === 'basic' ? (
          <BasicAnalyticsShell appState={appState} section={basicSection} analyticsMode={analyticsMode} />
        ) : (
          <>
            {savingsDrilldown ? (
              <SavingsDrilldownPage
                savingsKey={savingsDrilldown}
                onBack={() => setSavingsDrilldown(null)}
                appState={appState}
              />
            ) : leakageDrilldown ? (
              <LeakageDrilldownPage
                leakageKey={leakageDrilldown as any}
                onBack={() => setLeakageDrilldown(null)}
                appState={appState}
              />
            ) : multiBillReview ? (
              <MultiBillReviewPage onBack={() => setMultiBillReview(false)} />
            ) : anomalyDrilldown ? (
              <AnomalyDrilldownPage
                anomalyKey={anomalyDrilldown}
                onBack={() => setAnomalyDrilldown(null)}
                onNavigate={(section, filters) => {
                  setAnomalyDrilldown(null);
                  if (filters?.caF) handleCAChange(filters.caF);
                  if (filters?.branchF) handleBranchChange(filters.branchF);
                  setActiveSection(section as any);
                }}
                appState={appState}
              />
            ) : drilldown ? (
              <HeatmapDrilldownPage
                state={drilldown.state}
                month={drilldown.month}
                monthIndex={drilldown.monthIndex}
                onBack={() => setDrilldown(null)}
                onViewAllSections={() => {
                  setDrilldown(null);
                  handleStateChange(drilldown.state);
                  setActiveSection('leakages');
                }}
                onBranchClick={(branch) => {
                  setDrilldown(null);
                  handleBranchChange(branch);
                  setActiveSection('leakages');
                }}
                appState={appState}
              />
            ) : (
              <>
                {activeProduct === 'bill-payment' ? (
                  <>
                    {['summary','locations','trends','billers'].includes(activeSection) && (
                      <BasicAnalyticsShell appState={appState} section={activeSection} analyticsMode='advanced' />
                    )}

                    {activeSection === 'excess-demand' && <ExcessDemandSection appState={appState} />}
                    {activeSection === 'consumption' && <ConsumptionSection appState={appState} />}
                    {activeSection === 'leakages' && <LeakagesSection onDrilldown={(state, month, monthIndex) => setDrilldown({ state, month, monthIndex })} onLeakageCardClick={(key) => setLeakageDrilldown(key)} appState={appState} />}
                    {activeSection === 'savings' && <SavingsSection appState={appState} onCTAClick={(key) => setSavingsDrilldown(key)} />}
                    
                  </>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '320px',
                      background: '#ffffff',
                      borderRadius: '12px',
                      border: '0.5px solid rgba(0,0,0,0.15)',
                      margin: '20px',
                      gap: '8px',
                    }}
                  >
                    <div style={{ fontSize: '15px', fontWeight: 500, color: '#192744' }}>
                      {activeProduct === 'vendor-payment' && 'Vendor Payment'}
                      {activeProduct === 'rental-payment' && 'Rental Payment'}
                      {activeProduct === 'gst' && 'GST'}
                    </div>
                    <div style={{ fontSize: '13px', color: '#858ea2' }}>
                      Analytics for this product are coming soon
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
