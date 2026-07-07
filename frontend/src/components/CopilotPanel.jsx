import React, { useMemo, useState } from 'react'
import clsx from 'clsx'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  ReferenceLine,
} from 'recharts'
import {
  Sparkles, TrendingUp, TrendingDown, Minus, ExternalLink,
  AlertTriangle, Info, ChevronDown, ChevronUp, Users,
} from 'lucide-react'

// ── Detection ──────────────────────────────────────────────────────────────────

function isCopilotResource(r) {
  const t  = (r.resource_type   || '').toLowerCase()
  const rg = (r.resource_group  || '').toLowerCase()
  return (
    t.startsWith('microsoft.powerplatform') ||
    rg.includes('copilot-credits')
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(n, decimals = 0) {
  if (!n && n !== 0) return '—'
  return `$${Number(n).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`
}

function fmtCompact(n) {
  if (!n) return '$0'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}k`
  return `$${n.toFixed(0)}`
}

function daysElapsedThisMonth() {
  const now = new Date()
  return now.getDate()
}

function daysInCurrentMonth() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
}

// ── KPI card ──────────────────────────────────────────────────────────────────

function KPI({ label, value, sub, trend, accent = 'violet' }) {
  const styles = {
    violet: 'from-violet-900/40 to-violet-900/10 border-violet-800/50',
    purple: 'from-purple-900/40 to-purple-900/10 border-purple-800/50',
    blue:   'from-blue-900/40   to-blue-900/10   border-blue-800/50',
    amber:  'from-amber-900/30  to-amber-900/5   border-amber-800/40',
    green:  'from-green-900/30  to-green-900/5   border-green-800/40',
  }
  return (
    <div className={clsx('rounded-xl border bg-gradient-to-br p-4', styles[accent])}>
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-white mt-1 tabular-nums">{value}</p>
      {sub && (
        <div className="flex items-center gap-1 mt-1">
          {trend === 'up'   && <TrendingUp   size={11} className="text-red-400 shrink-0" />}
          {trend === 'down' && <TrendingDown  size={11} className="text-green-400 shrink-0" />}
          {trend === 'flat' && <Minus         size={11} className="text-gray-500 shrink-0" />}
          <span className="text-xs text-gray-400">{sub}</span>
        </div>
      )}
    </div>
  )
}

// ── MoM bar chart tooltip ──────────────────────────────────────────────────────

function MoMTooltip({ active, payload }) {
  if (!active || !payload?.[0]) return null
  const d = payload[0].payload
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="font-semibold text-white mb-1">{d.label}</p>
      <p className="text-violet-300 tabular-nums">{fmt(d.value, 2)}</p>
    </div>
  )
}

// ── Info accordion ────────────────────────────────────────────────────────────

function InfoAccordion() {
  const [open, setOpen] = useState(false)
  return (
    <div className="card border border-violet-800/30 bg-violet-900/10">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center justify-between w-full text-left gap-2"
      >
        <div className="flex items-center gap-2">
          <Info size={13} className="text-violet-400 shrink-0" />
          <span className="text-sm font-medium text-violet-300">What are Copilot credits billed through Azure?</span>
        </div>
        {open ? <ChevronUp size={13} className="text-gray-500 shrink-0" /> : <ChevronDown size={13} className="text-gray-500 shrink-0" />}
      </button>
      {open && (
        <div className="mt-3 space-y-2 text-xs text-gray-400 leading-relaxed">
          <p>
            Microsoft 365 Copilot and Copilot Studio can be licensed on a <strong className="text-gray-300">pay-as-you-go basis</strong> via Azure.
            Instead of per-seat M365 licenses, credit consumption is billed directly to your Azure subscription under the resource group <code className="text-violet-300 bg-violet-900/30 px-1 rounded">copilot-credits-rg</code>.
          </p>
          <p>
            Each <strong className="text-gray-300">billing policy</strong> (e.g. "all users policy") defines which users can consume credits and maps consumption to this Azure resource. Credits are spent per Copilot interaction — chat messages, summarisations, document generation, and Copilot Studio agent sessions.
          </p>
          <p className="text-amber-400">
            To review user assignment or consumption detail, go to the <strong>Microsoft 365 admin centre</strong> or <strong>Power Platform admin centre</strong> — granular per-user data is not available from Azure Cost Management.
          </p>
        </div>
      )}
    </div>
  )
}

// ── Recommendations ────────────────────────────────────────────────────────────

function Recommendations({ resources, momDelta, totalCurrent }) {
  const items = []

  if (momDelta > 20) {
    items.push({
      icon:  <TrendingUp size={13} className="text-red-400 shrink-0" />,
      color: 'border-red-800/40 bg-red-900/10',
      title: 'Copilot spend is growing rapidly',
      body:  `Credit consumption is up ${momDelta.toFixed(1)}% vs last month. Review which users are assigned to each policy in the Microsoft 365 admin centre and consider tightening the scope if usage is broader than intended.`,
    })
  }

  if (totalCurrent > 300) {
    items.push({
      icon:  <Users size={13} className="text-amber-400 shrink-0" />,
      color: 'border-amber-800/40 bg-amber-900/10',
      title: 'Review user scope against licensed headcount',
      body:  `At ${fmtCompact(totalCurrent)}/month (${fmtCompact(totalCurrent * 12)}/year projected), confirm that the number of active Copilot users aligns with your intended rollout. Unused seats consuming credits are common when policies are set to "all users".`,
    })
  }

  if (resources.length > 1) {
    items.push({
      icon:  <Info size={13} className="text-blue-400 shrink-0" />,
      color: 'border-blue-800/40 bg-blue-900/10',
      title: `${resources.length} Copilot billing policies detected`,
      body:  'Multiple billing policies are active. Each policy bills independently. If some policies cover overlapping user groups, consolidation could simplify cost attribution.',
    })
  }

  if (items.length === 0) return null

  return (
    <div className="card">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="p-2 rounded-lg bg-violet-900/40">
          <Sparkles size={14} className="text-violet-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Copilot Recommendations</h3>
          <p className="text-xs text-gray-500">{items.length} item{items.length !== 1 ? 's' : ''} to review</p>
        </div>
      </div>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className={clsx('rounded-lg border p-3 flex gap-3', item.color)}>
            <div className="mt-0.5">{item.icon}</div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white">{item.title}</p>
              <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{item.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main panel ─────────────────────────────────────────────────────────────────

export default function CopilotPanel({ resources = [], onResourceClick }) {
  const [sortCol, setSortCol] = useState('cost_current_month')
  const [sortDir, setSortDir] = useState('desc')

  const copilotResources = useMemo(
    () => resources.filter(isCopilotResource),
    [resources],
  )

  const totalCurrent  = useMemo(() => copilotResources.reduce((s, r) => s + (r.cost_current_month  || 0), 0), [copilotResources])
  const totalPrevious = useMemo(() => copilotResources.reduce((s, r) => s + (r.cost_previous_month || 0), 0), [copilotResources])
  const momDelta      = totalPrevious > 0 ? ((totalCurrent - totalPrevious) / totalPrevious) * 100 : 0
  const trendDir      = momDelta > 5 ? 'up' : momDelta < -5 ? 'down' : 'flat'

  const daysElapsed  = daysElapsedThisMonth()
  const daysTotal    = daysInCurrentMonth()
  const dailyRate    = daysElapsed > 0 ? totalCurrent / daysElapsed : 0
  const projected    = dailyRate * daysTotal

  const sorted = useMemo(() => {
    return [...copilotResources].sort((a, b) => {
      const av = a[sortCol] ?? 0
      const bv = b[sortCol] ?? 0
      const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [copilotResources, sortCol, sortDir])

  function toggleSort(col) {
    if (col === sortCol) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('desc') }
  }

  const momChartData = [
    { label: 'Last month',    value: totalPrevious, fill: '#6b7280' },
    { label: 'This month',    value: totalCurrent,  fill: '#7c3aed' },
    { label: 'Projected EOM', value: projected,     fill: '#a78bfa' },
  ]

  if (copilotResources.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center py-16 gap-3 text-center">
        <div className="w-14 h-14 rounded-full bg-violet-900/30 flex items-center justify-center">
          <Sparkles size={24} className="text-violet-400" />
        </div>
        <p className="text-gray-400 font-medium">No Copilot billing resources found</p>
        <p className="text-xs text-gray-500 max-w-xs">
          Copilot credits billed through Azure appear as <code className="bg-gray-800 px-1 rounded">microsoft.powerplatform/accounts</code> resources, typically in a resource group named <code className="bg-gray-800 px-1 rounded">copilot-credits-rg</code>.
        </p>
        <InfoAccordion />
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* Info accordion */}
      <InfoAccordion />

      {/* ── Hero card ── */}
      <div className="rounded-2xl border border-violet-700/40 bg-gradient-to-br from-violet-950/60 to-gray-900 p-6 flex items-center gap-6">
        <div className="w-14 h-14 rounded-2xl bg-violet-900/60 border border-violet-700/50 flex items-center justify-center shrink-0">
          <Sparkles size={26} className="text-violet-300" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-violet-400 uppercase tracking-widest mb-1">Microsoft Copilot Spend This Month</p>
          <p className="text-4xl font-bold text-white tabular-nums">{fmtCompact(totalCurrent)}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {trendDir === 'up'   && <TrendingUp   size={13} className="text-red-400" />}
            {trendDir === 'down' && <TrendingDown  size={13} className="text-green-400" />}
            {trendDir === 'flat' && <Minus         size={13} className="text-gray-500" />}
            <span className={clsx('text-sm font-medium',
              trendDir === 'up' ? 'text-red-400' : trendDir === 'down' ? 'text-green-400' : 'text-gray-500'
            )}>
              {momDelta >= 0 ? '+' : ''}{momDelta.toFixed(1)}% vs last month
            </span>
            <span className="text-gray-600 text-xs">·</span>
            <span className="text-gray-500 text-xs">{fmtCompact(projected)} projected end of month</span>
            <span className="text-gray-600 text-xs">·</span>
            <span className="text-gray-500 text-xs">{copilotResources.length} billing polic{copilotResources.length !== 1 ? 'ies' : 'y'}</span>
          </div>
        </div>
        <div className="shrink-0 text-right hidden sm:block">
          <p className="text-xs text-gray-500 mb-0.5">Projected annual</p>
          <p className="text-xl font-bold text-violet-300 tabular-nums">
            {fmtCompact(projected * 12)}
          </p>
        </div>
      </div>

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPI
          label="MTD Spend"
          value={fmt(totalCurrent, 2)}
          sub={`Day ${daysElapsed} of ${daysTotal}`}
          accent="violet"
        />
        <KPI
          label="Last Month"
          value={fmt(totalPrevious, 2)}
          sub={totalPrevious > 0 ? `${momDelta >= 0 ? '+' : ''}${momDelta.toFixed(1)}% change` : 'no prior data'}
          trend={trendDir}
          accent="purple"
        />
        <KPI
          label="Projected EOM"
          value={fmt(projected, 0)}
          sub={`at $${dailyRate.toFixed(2)}/day`}
          accent="blue"
        />
        <KPI
          label="Annual Forecast"
          value={fmtCompact(projected * 12)}
          sub="at current monthly rate"
          accent={projected * 12 > 5000 ? 'amber' : 'green'}
        />
      </div>

      {/* ── Recommendations ── */}
      <Recommendations
        resources={copilotResources}
        momDelta={momDelta}
        totalCurrent={totalCurrent}
      />

      {/* ── MoM Spend Chart ── */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
          Spend Comparison
        </h3>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={momChartData} margin={{ left: 0, right: 24, top: 4, bottom: 0 }}>
            <XAxis dataKey="label" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={v => `$${v.toFixed(0)}`} axisLine={false} tickLine={false} width={54} />
            <Tooltip content={<MoMTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={60}>
              {momChartData.map((d, i) => (
                <Cell key={i} fill={d.fill} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="text-xs text-gray-600 mt-2">
          Projected EOM is extrapolated from {daysElapsed} days of billing data at ${dailyRate.toFixed(2)}/day.
        </p>
      </div>

      {/* ── Policy table ── */}
      <div className="card overflow-x-auto">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
          Billing Policy Breakdown
        </h3>
        <table className="w-full text-left" style={{ minWidth: '700px' }}>
          <thead>
            <tr className="border-b border-gray-800">
              {[
                { key: 'resource_name',       label: 'Policy Name'    },
                { key: 'resource_group',       label: 'Resource Group' },
                { key: 'subscription_id',      label: 'Subscription'   },
                { key: 'cost_current_month',   label: 'MTD Cost'       },
                { key: 'cost_previous_month',  label: 'Last Month'     },
                { key: '_mom',                 label: 'MoM Δ'          },
              ].map(col => (
                <th
                  key={col.key}
                  onClick={() => col.key !== '_mom' && toggleSort(col.key)}
                  className={clsx(
                    'px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider select-none whitespace-nowrap',
                    col.key !== '_mom' && 'cursor-pointer hover:text-gray-300',
                  )}
                >
                  {col.label} {sortCol === col.key ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
              ))}
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {sorted.map(r => {
              const momPct = r.cost_previous_month > 0
                ? ((r.cost_current_month - r.cost_previous_month) / r.cost_previous_month) * 100
                : null
              const isRising = momPct !== null && momPct > 5

              return (
                <tr
                  key={r.resource_id}
                  onClick={() => onResourceClick?.(r)}
                  className={clsx(
                    'transition-colors',
                    onResourceClick ? 'cursor-pointer hover:bg-gray-700/40' : 'hover:bg-gray-800/30',
                    isRising && 'bg-red-950/10',
                  )}
                >
                  {/* Policy name */}
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <Sparkles size={12} className="text-violet-400 shrink-0" />
                      <span className="text-sm font-medium text-white truncate max-w-[200px]" title={r.resource_name}>
                        {r.resource_name}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5 ml-5">microsoft.powerplatform/accounts</p>
                  </td>

                  {/* Resource group */}
                  <td className="px-3 py-3">
                    <span className="text-xs text-violet-300 bg-violet-900/20 border border-violet-800/30 px-2 py-0.5 rounded-md">
                      {r.resource_group}
                    </span>
                  </td>

                  {/* Subscription */}
                  <td className="px-3 py-3 text-xs text-gray-500 font-mono truncate max-w-[120px]">
                    {r.subscription_id ? r.subscription_id.slice(0, 8) + '…' : '—'}
                  </td>

                  {/* MTD cost */}
                  <td className="px-3 py-3">
                    <p className="text-sm font-semibold text-white tabular-nums">{fmt(r.cost_current_month, 2)}</p>
                  </td>

                  {/* Last month */}
                  <td className="px-3 py-3">
                    <p className="text-sm text-gray-400 tabular-nums">{fmt(r.cost_previous_month, 2)}</p>
                  </td>

                  {/* MoM delta */}
                  <td className="px-3 py-3">
                    {momPct !== null ? (
                      <span className={clsx(
                        'text-sm font-medium tabular-nums',
                        momPct > 5  ? 'text-red-400' : momPct < -5 ? 'text-green-400' : 'text-gray-500',
                      )}>
                        {momPct >= 0 ? '+' : ''}{momPct.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-gray-600 text-sm">—</span>
                    )}
                  </td>

                  {/* Portal link */}
                  <td className="px-3 py-3">
                    {r.portal_url && (
                      <a
                        href={r.portal_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        title="Open in Azure Portal"
                        className="text-gray-600 hover:text-violet-400 transition-colors"
                      >
                        <ExternalLink size={13} />
                      </a>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>

          {/* Totals row */}
          {copilotResources.length > 1 && (
            <tfoot>
              <tr className="border-t border-gray-700">
                <td colSpan={3} className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</td>
                <td className="px-3 py-3 text-sm font-bold text-white tabular-nums">{fmt(totalCurrent, 2)}</td>
                <td className="px-3 py-3 text-sm font-medium text-gray-400 tabular-nums">{fmt(totalPrevious, 2)}</td>
                <td colSpan={2} className="px-3 py-3">
                  {totalPrevious > 0 && (
                    <span className={clsx('text-sm font-semibold tabular-nums',
                      momDelta > 5 ? 'text-red-400' : momDelta < -5 ? 'text-green-400' : 'text-gray-500'
                    )}>
                      {momDelta >= 0 ? '+' : ''}{momDelta.toFixed(1)}%
                    </span>
                  )}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Footer note */}
      <p className="text-xs text-gray-600 text-center pb-2">
        Per-user consumption detail is only available in the Microsoft 365 admin centre or Power Platform admin centre — not exposed via Azure Cost Management APIs.
      </p>
    </div>
  )
}
