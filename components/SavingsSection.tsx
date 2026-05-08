'use client'

import React, { useEffect, useRef, useState } from 'react'
import '@/lib/chartSetup'
import { Chart } from 'chart.js'
import { SummaryCard } from './SummaryCard'
import { KpiCard } from './KpiCard'
import { getFilteredBills, CAS, getCABills, inr, inrK } from '@/lib/calculations'

interface SavingsSectionProps {
  appState: { view: string; stateF: string; branchF: string; caF: string }
}

export default function SavingsSection({ appState }: SavingsSectionProps) {
  const cleanVsPenaltyRef   = useRef<HTMLCanvasElement>(null)
  const savingsTrendRef     = useRef<HTMLCanvasElement>(null)
  const cleanVsPenaltyChart = useRef<Chart | null>(null)
  const savingsTrendChart   = useRef<Chart | null>(null)

  const [summary, setSummary] = useState({
    totalBill: 0, avoidable: 0, cleanBill: 0,
    cleanPct: 0, avoidablePct: 0,
    contractSaving: 0, pfSaving: 0, totalSaving: 0,
    earnedPfIncentive: 0, potentialPfIncentive: 0,
    promptPaymentPotential: 0, totalIncentivePotential: 0,
    digitalPaymentBenefit: 0, earlyPaymentDiscount: 0,
    totalEarnedIncentives: 0, digitalPotential: 0,
    totalBillGenerated: 0, paidViaPlatform: 0, paidViaPlatformPct: 0,
    earnedEarlyBenefit: 0, earlyBenefitBills: 0,
    missedDigitalDiscount: 0, missedDigitalAmount: 0, totalPeriods: 0,
  })
  const [cleanData, setCleanData]             = useState<any[]>([])
  const [savingsTrendData, setSavingsTrendData] = useState<any[]>([])
  const [cleanChartView, setCleanChartView]   = useState<'amount' | 'count'>('amount')

  useEffect(() => {
    const data = getFilteredBills(
      'monthly',
      appState?.stateF  ?? 'all',
      appState?.branchF ?? 'all',
      appState?.caF     ?? 'all'
    )

    const totalBill      = data.reduce((s, d) => s + d.totalBill,    0)
    const avoidable      = data.reduce((s, d) => s + d.totalLeakage, 0)
    const cleanBill      = totalBill - avoidable
    const cleanPct       = Math.round(cleanBill  / Math.max(totalBill, 1) * 100)
    const avoidablePct   = Math.round(avoidable  / Math.max(totalBill, 1) * 100)
    const pfSaving       = data.reduce((s, d) => s + d.pfPenalty + (d.lvSurcharge ?? 0), 0)
    const mdiArr         = data.map(d => d.mdi)
    const sorted         = [...mdiArr].sort((a, b) => a - b)
    const p90            = sorted[Math.floor(sorted.length * 0.9)] ?? 0
    const recommended    = Math.round(p90 * 1.15 / 10) * 10
    const avgContracted  = Math.round(data.reduce((s, d) => s + d.contracted, 0) / Math.max(data.length, 1))
    const avgDemandRate  = data.reduce((s, d) => s + d.fixedCharge / Math.max(d.contracted, 1), 0) / Math.max(data.length, 1)
    const annualExcess   = data.reduce((s, d) => s + d.excessCharge, 0)
    const extraFixed     = Math.max(0, recommended - avgContracted) * avgDemandRate * 12
    const contractSaving = Math.max(0, Math.round(annualExcess - extraFixed))
    const totalSaving    = contractSaving + pfSaving

    const totalEnergyCharge       = data.reduce((s, d) => s + d.energyCharge, 0)
    const earnedPfIncentive       = data.reduce((s, d) => s + d.pfIncentive, 0)
    const digitalPaymentBenefit   = data.reduce((s, d) => s + (d.digitalPaymentBenefit ?? 0), 0)
    const earlyPaymentDiscount    = data.reduce((s, d) => s + (d.earlyPaymentDiscount ?? 0), 0)
    const totalEarnedIncentives   = earnedPfIncentive + digitalPaymentBenefit + earlyPaymentDiscount
    const potentialPfIncentive    = Math.round(totalEnergyCharge * ((0.97 - 0.95) / 0.95) * 0.5)
    const totalBillBeforeLPS      = data.reduce((s, d) => s + d.totalBill - d.latePayment, 0)
    const promptPaymentPotential  = Math.round(totalBillBeforeLPS * 0.015)
    const digitalPotential        = Math.round(totalEnergyCharge * 0.0075)
    const totalIncentivePotential = potentialPfIncentive + promptPaymentPotential + digitalPotential
    const totalBillGenerated      = totalBill
    const paidViaPlatform         = data.reduce((s, d) => s + ((d.earlyPaymentDiscount ?? 0) > 0 || (d.digitalPaymentBenefit ?? 0) > 0 ? d.totalBill : 0), 0)
    const paidViaPlatformPct      = Math.round(paidViaPlatform / Math.max(totalBillGenerated, 1) * 100)
    const earnedEarlyBenefit      = earlyPaymentDiscount
    const earlyBenefitBills       = data.filter(d => (d.earlyPaymentDiscount ?? 0) > 0).length
    const missedDigitalAmount     = data.filter(d => d.latePayment === 0 && (d.digitalPaymentBenefit ?? 0) === 0).reduce((s, d) => s + d.totalBill, 0)
    const missedDigitalDiscount   = Math.round(missedDigitalAmount * 0.0075)

    setSummary({
      totalBill, avoidable, cleanBill, cleanPct, avoidablePct,
      contractSaving, pfSaving, totalSaving,
      earnedPfIncentive, potentialPfIncentive, promptPaymentPotential, totalIncentivePotential,
      digitalPaymentBenefit, earlyPaymentDiscount, totalEarnedIncentives, digitalPotential,
      totalBillGenerated, paidViaPlatform, paidViaPlatformPct,
      earnedEarlyBenefit, earlyBenefitBills,
      missedDigitalDiscount, missedDigitalAmount, totalPeriods: data.length,
    })

    const allCAs = Object.values(CAS).flat()
    setCleanData(data.map((d, mi) => {
      const monthBills   = allCAs.map(ca => getCABills(ca, 'monthly')[mi]).filter(Boolean)
      const cleanCount   = monthBills.filter(b => (b?.totalLeakage ?? 0) === 0).length
      const penaltyCount = monthBills.filter(b => (b?.totalLeakage ?? 0) > 0).length
      return { label: d.label, clean: d.totalBill - d.totalLeakage, penalty: d.totalLeakage, cleanCount, penaltyCount }
    }))

    setSavingsTrendData(data.map(d => ({
      label:          d.label,
      totalSaved:     (d.digitalPaymentBenefit ?? 0) + (d.earlyPaymentDiscount ?? 0) + d.pfIncentive,
      pfIncentive:    d.pfIncentive,
      digitalBenefit: d.digitalPaymentBenefit ?? 0,
      earlyDiscount:  d.earlyPaymentDiscount ?? 0,
    })))
  }, [appState?.stateF, appState?.branchF, appState?.caF])

  // Clean vs penalty chart
  useEffect(() => {
    if (cleanData.length === 0) return
    const isAmount = cleanChartView === 'amount'
    const timer = setTimeout(() => {
      if (!cleanVsPenaltyRef.current) return
      const ctx = cleanVsPenaltyRef.current.getContext('2d')
      if (!ctx) return
      if (cleanVsPenaltyChart.current) cleanVsPenaltyChart.current.destroy()
      cleanVsPenaltyChart.current = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: cleanData.map(d => d.label),
          datasets: [
            {
              label: isAmount ? 'Clean bill' : 'Clean bills',
              data: cleanData.map(d => isAmount ? d.clean : d.cleanCount),
              backgroundColor: 'rgba(29,158,117,0.75)',
              borderRadius: 0,
              borderSkipped: false,
              barPercentage: 0.75,
              categoryPercentage: 0.85,
            },
            {
              label: isAmount ? 'Penalties' : 'Penalised bills',
              data: cleanData.map(d => isAmount ? d.penalty : d.penaltyCount),
              backgroundColor: '#E24B4A',
              borderRadius: { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 } as any,
              borderSkipped: false,
              barPercentage: 0.75,
              categoryPercentage: 0.85,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#192744',
              titleColor: '#fff',
              bodyColor: 'rgba(255,255,255,0.85)',
              padding: 12,
              cornerRadius: 8,
              callbacks: {
                label: item => isAmount
                  ? `  ${item.dataset.label}: ${inrK(item.raw as number)}`
                  : `  ${item.dataset.label}: ${item.raw} bills`,
                footer: items => isAmount
                  ? `Total: ${inrK(items.reduce((s, i) => s + (i.raw as number), 0))}`
                  : `Total: ${items.reduce((s, i) => s + (i.raw as number), 0)} bills`,
              }
            }
          },
          scales: {
            x: { stacked: true, grid: { display: false }, border: { display: false }, ticks: { color: '#858ea2', font: { size: 11 } } },
            y: {
              stacked: true,
              border: { display: false },
              grid: { color: 'rgba(0,0,0,0.05)' },
              ticks: {
                color: '#858ea2',
                font: { size: 11 },
                callback: isAmount
                  ? (v: any) => '₹' + (Number(v)/100000).toFixed(1) + 'L'
                  : (v: any) => Number.isInteger(Number(v)) ? v + ' bills' : '',
              }
            },
          },
        },
      })
    }, 100)
    return () => {
      clearTimeout(timer)
      if (cleanVsPenaltyChart.current) cleanVsPenaltyChart.current.destroy()
    }
  }, [cleanData, cleanChartView])

  // Monthly savings trend
  useEffect(() => {
    if (savingsTrendData.length === 0) return
    const timer = setTimeout(() => {
    if (!savingsTrendRef.current) return
    const ctx = savingsTrendRef.current.getContext('2d')
    if (!ctx) return
    if (savingsTrendChart.current) savingsTrendChart.current.destroy()
    savingsTrendChart.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: savingsTrendData.map(d => d.label),
        datasets: [{
          label: 'Total incentives earned',
          data: savingsTrendData.map(d => d.totalSaved),
          borderColor: '#1D9E75',
          borderWidth: 2.5,
          pointBackgroundColor: '#1D9E75',
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0.4,
          fill: true,
          backgroundColor: (context: any) => {
            const { ctx: c, chartArea } = context.chart
            if (!chartArea) return 'rgba(29,158,117,0.08)'
            const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
            g.addColorStop(0, 'rgba(29,158,117,0.18)')
            g.addColorStop(1, 'rgba(29,158,117,0.01)')
            return g
          },
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#fff',
            titleColor: '#192744',
            titleFont: { size: 13, weight: 'bold' as const },
            bodyColor: '#3B6D11',
            bodyFont: { size: 13 },
            borderColor: 'rgba(0,0,0,0.08)',
            borderWidth: 1,
            padding: 12,
            cornerRadius: 10,
            displayColors: false,
            callbacks: {
              title: items => items[0].label,
              label: item => `Savings: ${inr(item.raw as number)}`,
            }
          }
        },
        scales: {
          x: { grid: { display: false }, border: { display: false }, ticks: { color: '#858ea2', font: { size: 11 } } },
          y: {
            border: { display: false },
            grid: { color: 'rgba(0,0,0,0.05)' },
            min: 0,
            ticks: {
              color: '#858ea2',
              font: { size: 11 },
              callback: (v: any) => {
                const n = Number(v)
                if (n >= 100000) return '₹' + (n/100000).toFixed(1) + 'L'
                if (n >= 1000)   return '₹' + (n/1000).toFixed(0) + 'K'
                return '₹' + n
              },
            },
          },
        },
      },
    })
    }, 100)
    return () => { clearTimeout(timer); if (savingsTrendChart.current) savingsTrendChart.current.destroy() }
  }, [savingsTrendData])

  return (
    <div style={{ background: '#f5f6fa', padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

      {/* Summary cards */}
      <div style={{ background: '#fff', border: '1px solid #f0f1f5', borderRadius: '6px', boxShadow: '0 1px 3px rgba(25,39,68,.04)', display: 'flex', overflow: 'hidden' }}>
        {[
          { label: 'Total bill generated',   value: inr(summary.totalBillGenerated),   sub: `across ${summary.totalPeriods ?? 12} billing periods`,          subColor: '#6B7280' },
          { label: 'Paid via platform',       value: inr(summary.paidViaPlatform),       sub: `${summary.paidViaPlatformPct}% of total bill`,                  subColor: '#1D4ED8' },
          { label: 'Early payment benefit',   value: inr(summary.earnedEarlyBenefit),    sub: `earned across ${summary.earlyBenefitBills} billing periods`,     subColor: '#15803D' },
          { label: 'Missed digital discount', value: inr(summary.missedDigitalDiscount), sub: 'bills paid outside platform · 0.75% discount foregone',    subColor: '#B91C1C' },
        ].map((k, i) => (
          <div key={k.label} style={{ flex: 1, padding: '20px 24px', position: 'relative' }}>
            {i > 0 && <div style={{ position: 'absolute', left: 0, top: '16px', bottom: '16px', width: '1px', background: '#f0f1f5' }} />}
            <div style={{ fontSize: '10px', fontWeight: 600, color: '#9aa0b0', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>{k.label}</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#192744', letterSpacing: '-0.02em', lineHeight: 1, marginBottom: '4px' }}>{k.value}</div>
            <div style={{ fontSize: '12px', color: k.subColor }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: '14px' }}>

        {/* Clean vs penalty with toggle */}
        <div style={{ background: '#fff', border: '1px solid #f0f1f5', borderRadius: '6px', boxShadow: '0 1px 3px rgba(25,39,68,.04)' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0f1f5', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#192744', marginBottom: '2px' }}>Realized savings vs avoidable losses</div>
              <div style={{ fontSize:'12px', color:'#858ea2' }}>
                {cleanChartView === 'amount' ? 'Clean bill ₹ vs penalty ₹ · monthly' : 'Count of clean bills vs penalised bills · monthly'}
              </div>
            </div>
            <div style={{ display:'flex', background:'#f5f5f4', borderRadius:'8px', padding:'3px', gap:'2px', flexShrink:0 }}>
              {(['amount', 'count'] as const).map(v => (
                <button key={v} onClick={() => setCleanChartView(v)} style={{
                  padding:'4px 12px', borderRadius:'6px', fontSize:'12px', fontWeight:500,
                  border:'none', cursor:'pointer',
                  background: cleanChartView === v ? '#fff' : 'transparent',
                  color: cleanChartView === v ? '#192744' : '#858ea2',
                  boxShadow: cleanChartView === v ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}>
                  {v === 'amount' ? '₹ Amount' : '# Count'}
                </button>
              ))}
            </div>
          </div>
          <div style={{ padding: '14px 20px 16px' }}>
          <div style={{ display:'flex', gap:'14px', marginBottom:'10px', fontSize:'12px', color:'#9aa0b0' }}>
            <span style={{ display:'flex', alignItems:'center', gap:'5px' }}>
              <span style={{ width:'10px', height:'10px', borderRadius:'2px', background:'rgba(54,179,126,0.75)', display:'inline-block' }} />
              {cleanChartView === 'amount' ? 'Clean bill' : 'Clean bills'}
            </span>
            <span style={{ display:'flex', alignItems:'center', gap:'5px' }}>
              <span style={{ width:'10px', height:'10px', borderRadius:'2px', background:'#e53935', display:'inline-block' }} />
              {cleanChartView === 'amount' ? 'Penalties' : 'Penalised bills'}
            </span>
          </div>
          <div style={{ position:'relative', width:'100%', height:'220px' }}>
            <canvas ref={cleanVsPenaltyRef}></canvas>
          </div>
          </div>
        </div>

        {/* Monthly savings trend */}
        <div style={{ background: '#fff', border: '1px solid #f0f1f5', borderRadius: '6px', boxShadow: '0 1px 3px rgba(25,39,68,.04)' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0f1f5' }}>
            <div style={{ fontSize:'14px', fontWeight:600, color:'#192744', marginBottom:'2px' }}>Monthly savings trend</div>
            <div style={{ fontSize:'12px', color:'#9aa0b0' }}>Net savings per month · ₹L</div>
          </div>
          <div style={{ padding: '14px 20px 16px' }}>
          <div style={{ display:'flex', gap:'14px', marginBottom:'10px', fontSize:'12px', color:'#9aa0b0' }}>
            <span style={{ display:'flex', alignItems:'center', gap:'6px' }}>
              <span style={{ width:'18px', height:'2px', background:'#36b37e', display:'inline-block', borderRadius:'1px' }} />
              PF incentive + digital + early payment · monthly
            </span>
          </div>
          <div style={{ position:'relative', width:'100%', height:'220px' }}>
            <canvas ref={savingsTrendRef}></canvas>
          </div>
          </div>
        </div>

      </div>

      {/* KPI insight cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, minmax(0,1fr))', gap:'14px' }}>
        {([
          { color: '#DC2626', label: 'Contract revision saving', value: inr(summary.contractSaving), valueSub: 'No excess demand charges', desc: 'Raise contracted demand to P80 MDI + 10% buffer — eliminates all excess demand charges.', cta: 'Model revision' },
          { color: '#F59E0B', label: 'PF improvement saving',    value: inr(summary.pfSaving),       valueSub: 'Maintain PF ≥ 0.95 via capacitor banks', desc: 'Eliminating PF penalties by maintaining power factor above 0.95 across all CAs.', cta: 'View CA list' },
          { color: '#22C55E', label: 'Total recoverable',        value: inr(summary.totalSaving),    valueSub: Math.round(summary.totalSaving / Math.max(summary.totalBill,1)*100) + '% of total bills avoidable', desc: 'Total savings achievable with recommended contract and PF improvement actions.', cta: 'See breakdown' },
          { color: '#2563EB', label: 'Clean bill rate',          value: summary.cleanPct + '%',       valueSub: 'Avg across all CAs · higher is better', desc: 'Bills at ' + summary.cleanPct + '% clean — ' + (100 - summary.cleanPct) + '% still carry avoidable charges that can be eliminated.', cta: 'View profile' },
        ] as Array<{ color: string; label: string; value: string; valueSub: string; desc: string; cta: string }>).map((item, i) => (
          <div key={i} style={{ background: '#fff', borderLeft: '1px solid #f0f1f5', borderRight: '1px solid #f0f1f5', borderBottom: '1px solid #f0f1f5', borderTop: '2.5px solid ' + item.color, borderRadius: '6px', boxShadow: '0 1px 3px rgba(25,39,68,.04)', padding: '18px 20px 16px', display: 'flex', flexDirection: 'column', gap: 0, cursor: 'default', minHeight: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: item.color, flexShrink: 0 }} />
              <div style={{ fontSize: '10px', fontWeight: 600, color: item.color, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{item.label}</div>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: item.color, lineHeight: 1, letterSpacing: '-0.02em', marginBottom: '10px' }}>{item.value}</div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', color: '#858ea2', marginBottom: '3px' }}>{item.valueSub}</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#192744', letterSpacing: '-0.01em' }}>{item.desc}</div>
            </div>
            <button style={{ alignSelf: 'flex-start', fontSize: '12px', fontWeight: 500, color: item.color, background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', marginTop: 'auto' }}>{item.cta} →</button>
          </div>
        ))}
      </div>

      {/* Incentives & Credits */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ fontSize: '10px', fontWeight: 600, color: '#9aa0b0', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Incentives &amp; credits</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: '12px' }}>
          {(() => {
            const totalPotential = summary.totalIncentivePotential
const paidViaPlatform = summary.paidViaPlatform || 1
  const items = [
  { label: 'Digital payment benefit', value: summary.digitalPaymentBenefit, total: summary.totalIncentivePotential, sub: 'Accrued this period', sub2: ((summary.digitalPaymentBenefit / paidViaPlatform) * 100).toFixed(2) + '% of EnKash paid bills', color: '#36b37e', bg: '#f0faf6', bd: '#bbf7d0' },
  { label: 'Early payment discount',  value: summary.earlyPaymentDiscount,  total: summary.totalIncentivePotential, sub: 'Across discount windows', sub2: ((summary.earlyPaymentDiscount / paidViaPlatform) * 100).toFixed(2) + '% of EnKash paid bills', color: '#36b37e', bg: '#f0faf6', bd: '#bbf7d0' },
  { label: 'PF incentive',            value: summary.earnedPfIncentive,     total: summary.totalIncentivePotential, sub: 'Months in target', sub2: ((summary.earnedPfIncentive / paidViaPlatform) * 100).toFixed(2) + '% of EnKash paid bills', color: '#f59e0b', bg: '#fffbeb', bd: '#fde68a' },
  { label: 'Potential upside',        value: Math.max(0, totalPotential - summary.totalEarnedIncentives), total: totalPotential, sub: 'If all targets met', sub2: ((Math.max(0, totalPotential - summary.totalEarnedIncentives) / paidViaPlatform) * 100).toFixed(2) + '% additional possible', color: '#1c5af4', bg: '#eef3fe', bd: '#c7d2fe' },
  ] as Array<{ label: string; value: number; total: number; sub: string; sub2: string; color: string; bg: string; bd: string }>
            return items.map((item, i) => {
              const pct = Math.round((item.value / Math.max(item.total, 1)) * 100)
              const r = 17, circ = 2 * Math.PI * r, dash = (pct / 100) * circ
              return (
                <div key={i} style={{ background: item.bg, border: `1px solid ${item.bd}`, borderRadius: '6px', padding: '16px 16px 0', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 1px 3px rgba(25,39,68,.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontSize: '26px', fontWeight: 700, color: item.color, lineHeight: 1, letterSpacing: '-0.02em' }}>{inr(item.value)}</div>
                      <div style={{ fontSize: '10px', fontWeight: 600, color: item.color, textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: '5px' }}>{item.label}</div>
                    </div>
                    <svg width="42" height="42" viewBox="0 0 42 42" style={{ flexShrink: 0 }}>
                      <circle cx="21" cy="21" r={r} fill="none" stroke={item.color} strokeOpacity="0.15" strokeWidth="4"/>
                      <circle cx="21" cy="21" r={r} fill="none" stroke={item.color} strokeWidth="4" strokeLinecap="round"
                        strokeDasharray={`${dash} ${circ}`} transform="rotate(-90 21 21)"/>
                      <text x="21" y="25" textAnchor="middle" fontSize="9" fontWeight="600" fill={item.color} fontFamily="Inter,sans-serif">{pct}%</text>
                    </svg>
                  </div>
                  <div style={{ fontSize: '11px', color: item.color, opacity: 0.7, marginBottom: '4px' }}>{item.sub}</div>
  <div style={{ fontSize: '10px', color: '#858ea2', marginBottom: '10px' }}>{item.sub2}</div>
                  <div style={{ height: '3px', background: item.bd, margin: '0 -16px' }}>
                    <div style={{ height: '100%', width: pct + '%', background: item.color, opacity: 0.6, borderRadius: '0 2px 2px 0' }} />
                  </div>
                </div>
              )
            })
          })()}
        </div>
      </div>

    </div>
  )
}
