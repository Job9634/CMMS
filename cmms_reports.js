/* ============================================================
   CMMS - MODULE: REPORTS & KPI
   Read-only analytics computed from live CMMS data.
   ============================================================ */
let reportRangeDays = 30;
const REPORT_RANGES = [30, 90, 365];

function reportDateValue(raw){
  if(!raw) return null;
  if(/^\d{4}-\d{2}-\d{2}$/.test(raw)) return new Date(raw + 'T00:00:00');
  return new Date(raw);
}
function reportDateIso(raw){
  return String(raw || '').slice(0, 10);
}
function reportDaysAgo(raw){
  const date = reportDateValue(raw);
  if(!date || isNaN(date)) return null;
  const today = new Date(todayIso() + 'T23:59:59');
  return Math.floor((today - date) / 86400000);
}
function inReportRange(raw){
  const days = reportDaysAgo(raw);
  return days != null && days >= 0 && days < reportRangeDays;
}
function pct(numerator, denominator){
  if(!denominator) return 0;
  return Math.round((numerator / denominator) * 100);
}
function avg(values){
  const rows = (values || []).filter(v => !isNaN(v));
  if(!rows.length) return 0;
  return rows.reduce((sum, v) => sum + Number(v || 0), 0) / rows.length;
}
function sum(values){
  return (values || []).reduce((total, value) => total + Number(value || 0), 0);
}
function barRows(items, total, formatter){
  return items.length ? items.map(item => {
    const percent = total ? Math.max(8, Math.round((item.value / total) * 100)) : 0;
    return `
      <div class="report-bar-row">
        <div class="report-bar-head">
          <b>${esc(item.label)}</b>
          <span>${formatter ? formatter(item.value) : item.value}</span>
        </div>
        <div class="report-bar-track"><i style="width:${percent}%"></i></div>
      </div>`;
  }).join('') : '<div style="color:var(--ink-soft);font-size:13px">No data in the selected range.</div>';
}
function reportScope(){
  const rangeLabel = reportRangeDays === 365 ? 'last 12 months' : `last ${reportRangeDays} days`;
  const completedWOs = WOS.filter(w => w.status === 'Completed' && inReportRange(w.completed || w.created));
  const openWOs = WOS.filter(w => w.status !== 'Completed');
  const preventiveClosed = completedWOs.filter(w => w.type === 'Preventive' || String(w.requestedBy || '').startsWith('PM Schedule '));
  const correctiveClosed = completedWOs.filter(w => ['Breakdown','Corrective','Inspection'].includes(w.type));
  const breakdowns = (typeof BREAKDOWNS !== 'undefined' ? BREAKDOWNS : []).filter(b => inReportRange(b.startedAt));
  const closedBreakdowns = breakdowns.filter(b => b.status === 'Closed');
  const openBreakdowns = (typeof BREAKDOWNS !== 'undefined' ? BREAKDOWNS : []).filter(b => b.status !== 'Closed');
  const requests = (typeof REQUESTS !== 'undefined' ? REQUESTS : []).filter(req => inReportRange(req.created));
  const convertedRequests = requests.filter(req => req.status === 'Converted' || req.woId);
  const pmActive = typeof PMS !== 'undefined' ? PMS.filter(p => p.active) : [];
  const pmOverdue = pmActive.filter(p => daysFromToday(p.nextDue) < 0);
  const pmDueSoon = pmActive.filter(p => daysFromToday(p.nextDue) >= 0 && daysFromToday(p.nextDue) <= SETTINGS.pmDueSoonDays);
  const moveRows = typeof MOVES !== 'undefined' ? MOVES.filter(m => inReportRange(m.date)) : [];
  const parts = typeof PARTS !== 'undefined' ? PARTS : [];
  const lowStock = typeof partStockStatus === 'function' ? parts.filter(p => ['Low Stock','Out of Stock'].includes(partStockStatus(p))) : [];
  return {
    rangeLabel,
    completedWOs,
    openWOs,
    preventiveClosed,
    correctiveClosed,
    breakdowns,
    closedBreakdowns,
    openBreakdowns,
    requests,
    convertedRequests,
    pmActive,
    pmOverdue,
    pmDueSoon,
    moveRows,
    parts,
    lowStock
  };
}
function reliabilityMetrics(scope){
  const mttr = avg(scope.closedBreakdowns.map(b => Number(b.downtimeHrs) || 0));
  const assetEvents = scope.breakdowns.filter(b => b.targetType === 'Asset').length;
  const mtbfHours = assetEvents ? Math.round((ASSETS.length * reportRangeDays * 24) / assetEvents) : 0;
  const totalDown = sum(scope.breakdowns.map(b => Number(b.downtimeHrs) || 0));
  const topDowntime = [...scope.breakdowns]
    .sort((a, b) => (Number(b.downtimeHrs) || 0) - (Number(a.downtimeHrs) || 0))
    .slice(0, 5)
    .map(b => ({label:`${b.id} | ${breakdownTargetName(b)}`, value:Number(b.downtimeHrs) || 0}));
  const byCategoryMap = {};
  scope.breakdowns.forEach(b => {
    byCategoryMap[b.category] = (byCategoryMap[b.category] || 0) + 1;
  });
  const byCategory = Object.keys(byCategoryMap).map(label => ({label, value:byCategoryMap[label]})).sort((a, b) => b.value - a.value);
  return {mttr, mtbfHours, totalDown, topDowntime, byCategory};
}
function maintenanceMetrics(scope){
  const woCompletionRate = pct(scope.completedWOs.length, scope.completedWOs.length + scope.openWOs.length);
  const pmCompliance = pct(scope.pmActive.length - scope.pmOverdue.length, scope.pmActive.length);
  const backlogOverdue = scope.openWOs.filter(woIsOverdue).length;
  const totalLabour = sum(scope.completedWOs.map(w => Number(w.labourHrs) || 0));
  const statusMap = {};
  WOS.forEach(w => {
    statusMap[w.status] = (statusMap[w.status] || 0) + 1;
  });
  const byStatus = Object.keys(statusMap).map(label => ({label, value:statusMap[label]}));
  const teamRows = technicianOptions().map(name => {
    const openCount = WOS.filter(w => w.status !== 'Completed' && w.technician === name).length;
    const closedCount = scope.completedWOs.filter(w => w.technician === name).length;
    return {label:name, openCount, closedCount, value:openCount + closedCount};
  }).filter(row => row.value > 0).sort((a, b) => b.value - a.value).slice(0, 6);
  return {woCompletionRate, pmCompliance, backlogOverdue, totalLabour, byStatus, teamRows};
}
function requestMetrics(scope){
  const approvalRate = pct(scope.convertedRequests.length, scope.requests.length);
  const openRequests = (typeof REQUESTS !== 'undefined' ? REQUESTS : []).filter(req => ['New','Screening','Approved'].includes(req.status));
  const overdue = openRequests.filter(req => req.due && daysFromToday(req.due) < 0).length;
  const byTypeMap = {};
  scope.requests.forEach(req => {
    byTypeMap[req.type] = (byTypeMap[req.type] || 0) + 1;
  });
  const byType = Object.keys(byTypeMap).map(label => ({label, value:byTypeMap[label]})).sort((a, b) => b.value - a.value);
  return {approvalRate, overdue, openRequests, byType};
}
function storesMetricsReport(scope){
  const receipts = scope.moveRows.filter(m => m.type === 'Receipt').length;
  const issues = scope.moveRows.filter(m => m.type === 'Issue').length;
  const adjustments = scope.moveRows.filter(m => ['Adjustment','Cycle Count'].includes(m.type)).length;
  const stockValue = typeof partValue === 'function' ? Math.round(sum(scope.parts.map(partValue))) : 0;
  const reorderRows = scope.lowStock
    .map(part => ({
      label:`${part.id} | ${part.name}`,
      value:Math.max(Number(part.reorderQty) || 0, (Number(part.maxQty) || 0) - (Number(part.onHand) || 0))
    }))
    .slice(0, 6);
  return {receipts, issues, adjustments, stockValue, reorderRows};
}
function assetMetricsReport(scope){
  const avgHealth = ASSETS.length ? Math.round(avg(ASSETS.map(a => Number(a.health) || 0))) : 0;
  const downAssets = ASSETS.filter(a => a.status === 'Down').length;
  const weakAssets = [...ASSETS]
    .sort((a, b) => (Number(a.health) || 0) - (Number(b.health) || 0))
    .slice(0, 5)
    .map(a => ({label:`${a.id} | ${a.name}`, value:Number(a.health) || 0}));
  const criticalWatch = ASSETS.filter(a => a.criticality === 'Critical' && Number(a.health) <= SETTINGS.healthWatchThreshold).length;
  return {avgHealth, downAssets, weakAssets, criticalWatch};
}
function reportsSummaryHtml(scope){
  const reliability = reliabilityMetrics(scope);
  const maintenance = maintenanceMetrics(scope);
  const requests = requestMetrics(scope);
  const stores = storesMetricsReport(scope);
  return `
    <div class="kpis" style="margin-bottom:18px">
      <div class="kpi"><div class="k-top"><div><div class="k-val">${scope.openBreakdowns.length}</div><div class="k-label">Open Breakdowns</div></div><div class="k-ico ico-red">BD</div></div><div class="k-trend trend-down">${Math.round(reliability.totalDown * 10) / 10} downtime hr in ${scope.rangeLabel}</div></div>
      <div class="kpi"><div class="k-top"><div><div class="k-val">${maintenance.pmCompliance}%</div><div class="k-label">PM Compliance</div></div><div class="k-ico ico-green">PM</div></div><div class="k-trend trend-up">${scope.pmOverdue.length} overdue schedule(s)</div></div>
      <div class="kpi"><div class="k-top"><div><div class="k-val">${maintenance.woCompletionRate}%</div><div class="k-label">WO Completion</div></div><div class="k-ico ico-blue">WO</div></div><div class="k-trend trend-down">${maintenance.backlogOverdue} overdue open WO(s)</div></div>
      <div class="kpi"><div class="k-top"><div><div class="k-val">${stores.stockValue.toLocaleString()}</div><div class="k-label">Stores Value</div></div><div class="k-ico ico-orange">THB</div></div><div class="k-trend trend-up">${scope.lowStock.length} part(s) need reorder</div></div>
    </div>
    <div class="report-mini-grid">
      <div class="report-mini-card"><span>MTTR</span><b>${reliability.mttr.toFixed(1)} hr</b></div>
      <div class="report-mini-card"><span>MTBF</span><b>${reliability.mtbfHours || 0} hr</b></div>
      <div class="report-mini-card"><span>Request Conversion</span><b>${requests.approvalRate}%</b></div>
      <div class="report-mini-card"><span>Completed Labour</span><b>${Math.round(maintenance.totalLabour * 10) / 10} hr</b></div>
    </div>`;
}
function renderReports(){
  const scope = reportScope();
  const reliability = reliabilityMetrics(scope);
  const maintenance = maintenanceMetrics(scope);
  const requests = requestMetrics(scope);
  const stores = storesMetricsReport(scope);
  const assets = assetMetricsReport(scope);
  const duePMRows = [...scope.pmOverdue, ...scope.pmDueSoon].slice(0, 8);

  view.innerHTML = `
    <div class="page-head">
      <div><h1>Reports & KPIs</h1><div class="ph-sub">Live maintenance analytics built from current CMMS data across work, reliability, stores, and team activity.</div></div>
    </div>
    <div class="toolbar">
      <div class="viewtoggle">
        ${REPORT_RANGES.map(days => `<button class="${reportRangeDays === days ? 'active' : ''}" onclick="setReportRange(${days})">${days === 365 ? '12 Months' : `${days} Days`}</button>`).join('')}
      </div>
      <span class="tb-count">Scope: ${scope.rangeLabel}</span>
    </div>
    ${reportsSummaryHtml(scope)}
    <div class="report-grid">
      <div class="panel">
        <div class="panel-head"><b>Reliability</b><span style="font-size:12px;color:var(--ink-soft)">Breakdown-driven view</span></div>
        <div class="panel-body">
          <div class="report-stat-row">
            <div><span>Total Downtime</span><b>${Math.round(reliability.totalDown * 10) / 10} hr</b></div>
            <div><span>Closed Events</span><b>${scope.closedBreakdowns.length}</b></div>
            <div><span>Open Events</span><b>${scope.openBreakdowns.length}</b></div>
          </div>
          <div class="report-section-title">Breakdowns by Category</div>
          ${barRows(reliability.byCategory, Math.max(1, scope.breakdowns.length))}
          <div class="report-section-title">Top Downtime Events</div>
          ${barRows(reliability.topDowntime, Math.max(1, reliability.totalDown), value => `${value.toFixed(1)} hr`)}
        </div>
      </div>
      <div class="panel">
        <div class="panel-head"><b>Maintenance Execution</b><span style="font-size:12px;color:var(--ink-soft)">Work orders and PM response</span></div>
        <div class="panel-body">
          <div class="report-stat-row">
            <div><span>Open WOs</span><b>${scope.openWOs.length}</b></div>
            <div><span>Completed WOs</span><b>${scope.completedWOs.length}</b></div>
            <div><span>Preventive Closed</span><b>${scope.preventiveClosed.length}</b></div>
          </div>
          <div class="report-section-title">WO Status Mix</div>
          ${barRows(maintenance.byStatus, Math.max(1, WOS.length))}
          <div class="report-section-title">Technician Load</div>
          ${maintenance.teamRows.length ? `<div class="report-table-lite">
            ${maintenance.teamRows.map(row => `<div class="report-table-row">
              <b>${esc(row.label)}</b>
              <span>${row.openCount} open | ${row.closedCount} closed</span>
            </div>`).join('')}
          </div>` : '<div style="color:var(--ink-soft);font-size:13px">No technician activity recorded.</div>'}
        </div>
      </div>
      <div class="panel">
        <div class="panel-head"><b>Requests & PM</b><span style="font-size:12px;color:var(--ink-soft)">Intake and schedule health</span></div>
        <div class="panel-body">
          <div class="report-stat-row">
            <div><span>Requests Raised</span><b>${scope.requests.length}</b></div>
            <div><span>Converted</span><b>${scope.convertedRequests.length}</b></div>
            <div><span>Open Requests</span><b>${requests.openRequests.length}</b></div>
          </div>
          <div class="report-section-title">Request Types</div>
          ${barRows(requests.byType, Math.max(1, scope.requests.length))}
          <div class="report-section-title">PM Watch</div>
          ${duePMRows.length ? `<div class="report-table-lite">
            ${duePMRows.map(pm => `<div class="report-table-row">
              <b>${esc(pm.id)} | ${esc(pm.title)}</b>
              <span>${pmStatus(pm)} | ${fmtDate(pm.nextDue)}</span>
            </div>`).join('')}
          </div>` : '<div style="color:var(--ink-soft);font-size:13px">No PM schedules are overdue or due soon.</div>'}
        </div>
      </div>
      <div class="panel">
        <div class="panel-head"><b>Assets & Stores</b><span style="font-size:12px;color:var(--ink-soft)">Risk and support inventory</span></div>
        <div class="panel-body">
          <div class="report-stat-row">
            <div><span>Avg Asset Health</span><b>${assets.avgHealth}%</b></div>
            <div><span>Down Assets</span><b>${assets.downAssets}</b></div>
            <div><span>Critical Watch</span><b>${assets.criticalWatch}</b></div>
          </div>
          <div class="report-section-title">Lowest Health Assets</div>
          ${barRows(assets.weakAssets, 100, value => `${value}%`)}
          <div class="report-section-title">Reorder Watch</div>
          ${stores.reorderRows.length ? `<div class="report-table-lite">
            ${stores.reorderRows.map(row => `<div class="report-table-row">
              <b>${esc(row.label)}</b>
              <span>Suggest order ${row.value}</span>
            </div>`).join('')}
          </div>` : '<div style="color:var(--ink-soft);font-size:13px">No parts currently need reorder.</div>'}
        </div>
      </div>
    </div>
    <div class="panel" style="margin-top:18px">
      <div class="panel-head"><b>Analytics Notes</b><span style="font-size:12px;color:var(--ink-soft)">How these KPIs are derived</span></div>
      <div class="panel-body">
        <div class="report-notes">
          <p><b>MTTR</b> uses closed breakdown events in the selected range and averages their recorded downtime hours.</p>
          <p><b>MTBF</b> is estimated from asset-count operating hours divided by asset-target breakdown events in the selected range.</p>
          <p><b>PM compliance</b> is a current-state measure: active schedules not overdue divided by all active schedules.</p>
          <p><b>Reports stay live</b> because they recalculate from current assets, work orders, PM schedules, requests, breakdowns, and stores data each time you open this module.</p>
        </div>
      </div>
    </div>`;
}
function setReportRange(days){
  reportRangeDays = days;
  renderReports();
}

ROUTES['reports'] = renderReports;
