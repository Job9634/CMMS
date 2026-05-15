/* ============================================================
   CMMS - MODULE: INFRASTRUCTURE MAINTENANCE
   Utility networks: city water, compressed air, waste water, etc.
   ============================================================ */
const LS_INFRA = 'cmms_infra_v1';
const LS_INFRA_ISSUES = 'cmms_infra_issues_v1';
const LS_INFRA_LOGS = 'cmms_infra_logs_v1';
const LS_INFRA_DIRTY = 'cmms_infra_dirty_v1';

const INFRA_UTILITIES = ['City Water','Compressed Air','Waste Water','RO Water','Cooling Water','Fire Water'];
const INFRA_STATUSES = ['Normal','Leak Watch','Restricted','Isolated','Repair Planned'];
const INFRA_RISKS = ['Critical','High','Medium','Low'];
const INFRA_ISSUE_TYPES = ['Leak','Pressure Drop','Blockage','Corrosion','Water Quality','Support Damage'];
const INFRA_ISSUE_STATUSES = ['Open','Monitoring','Closed'];
const INFRA_LOG_TYPES = ['Inspection','Leak Test','Flush','Repair Follow-up'];

let infraFilters = {q:'', utility:'', status:'', risk:''};

function buildInfraSeeds(){
  return [
    {
      id:'INF-001',
      name:'City Water Main Ring',
      utilityType:'City Water',
      zone:'Plant Perimeter',
      route:'Pump room -> molding -> surface -> utilities yard -> return loop',
      material:'HDPE / Galvanized Steel',
      size:'4 in',
      lengthM:185,
      pressureBar:3.8,
      flowM3h:19,
      condition:82,
      risk:'High',
      status:'Normal',
      lastInspection:addDays(todayIso(), -14),
      nextInspection:addDays(todayIso(), 16),
      inspectionFreqDays:30,
      isolationPoints:['Valve V-01','Valve V-02','Valve V-05'],
      affectedAreas:['Pump Room','Surface','Utility Yard'],
      notes:'Feeds domestic and process make-up water to the main plant.'
    },
    {
      id:'INF-002',
      name:'Compressed Air Loop A',
      utilityType:'Compressed Air',
      zone:'Production Spine',
      route:'Compressor house -> edging -> HC -> tint -> AR branch',
      material:'Aluminum Pipe',
      size:'3 in',
      lengthM:142,
      pressureBar:6.5,
      flowM3h:28,
      condition:71,
      risk:'Critical',
      status:'Leak Watch',
      lastInspection:addDays(todayIso(), -9),
      nextInspection:addDays(todayIso(), 5),
      inspectionFreqDays:14,
      isolationPoints:['AV-11','AV-12','AV-19'],
      affectedAreas:['Edging','HC','Tint','AR'],
      notes:'Primary compressed-air backbone with recurring pressure-loss complaints.'
    },
    {
      id:'INF-003',
      name:'Waste Water Neutralization Header',
      utilityType:'Waste Water',
      zone:'Chemical Utility Area',
      route:'HC drain pit -> neutralization tank -> holding pit -> municipal discharge point',
      material:'uPVC',
      size:'5 in',
      lengthM:96,
      pressureBar:0.6,
      flowM3h:12,
      condition:68,
      risk:'High',
      status:'Restricted',
      lastInspection:addDays(todayIso(), -21),
      nextInspection:addDays(todayIso(), 2),
      inspectionFreqDays:21,
      isolationPoints:['WW-01','WW-03'],
      affectedAreas:['HC','Waste Water Tank Farm'],
      notes:'Slope and solids build-up need close monitoring after heavy production days.'
    },
    {
      id:'INF-004',
      name:'RO Water Feed to Labs',
      utilityType:'RO Water',
      zone:'QA / Lab',
      route:'RO skid -> QC lab -> coating make-up station -> spare drop point',
      material:'Stainless / PPR',
      size:'1.5 in',
      lengthM:58,
      pressureBar:2.2,
      flowM3h:6,
      condition:88,
      risk:'Medium',
      status:'Normal',
      lastInspection:addDays(todayIso(), -11),
      nextInspection:addDays(todayIso(), 19),
      inspectionFreqDays:30,
      isolationPoints:['RO-2','RO-4'],
      affectedAreas:['QC Lab','Coating Make-up'],
      notes:'Low defect history, but water-quality drift impacts lens cleaning quality fast.'
    },
    {
      id:'INF-005',
      name:'Cooling Water Return Header',
      utilityType:'Cooling Water',
      zone:'Utilities Roof',
      route:'Chiller skid -> production exchangers -> roof return manifold',
      material:'Carbon Steel',
      size:'4 in',
      lengthM:124,
      pressureBar:2.9,
      flowM3h:24,
      condition:74,
      risk:'Medium',
      status:'Repair Planned',
      lastInspection:addDays(todayIso(), -18),
      nextInspection:addDays(todayIso(), 7),
      inspectionFreqDays:25,
      isolationPoints:['CW-01','CW-06','CW-09'],
      affectedAreas:['Surface','Compressor House','Roof Utilities'],
      notes:'Localized corrosion around one roof support is scheduled for repair.'
    },
    {
      id:'INF-006',
      name:'Fire Water Branch South Yard',
      utilityType:'Fire Water',
      zone:'South Yard',
      route:'Fire tank -> south hydrants -> warehouse branch',
      material:'Ductile Iron',
      size:'6 in',
      lengthM:110,
      pressureBar:5.4,
      flowM3h:34,
      condition:91,
      risk:'Critical',
      status:'Normal',
      lastInspection:addDays(todayIso(), -6),
      nextInspection:addDays(todayIso(), 24),
      inspectionFreqDays:30,
      isolationPoints:['FW-04','FW-07'],
      affectedAreas:['South Yard','Warehouse'],
      notes:'Keep hydrant valves free and visible at all times.'
    }
  ];
}
function buildInfraIssueSeeds(){
  return [
    {
      id:'INF-ISS-001',
      date:addDays(todayIso(), -4),
      segmentId:'INF-002',
      type:'Pressure Drop',
      severity:'High',
      status:'Open',
      reportedBy:'Production Supervisor',
      description:'Operators report intermittent low air pressure at edging benches during peak shift.',
      action:'Leak survey on branch drops pending.',
      impact:'Cycle-time increase and pneumatic tool slowdown.',
      woId:''
    },
    {
      id:'INF-ISS-002',
      date:addDays(todayIso(), -8),
      segmentId:'INF-003',
      type:'Blockage',
      severity:'Medium',
      status:'Monitoring',
      reportedBy:'HC Leader',
      description:'Neutralization header draining slower than normal after tank cleaning.',
      action:'Temporary flushing completed; confirm solids do not rebuild.',
      impact:'Risk of overflow in heavy-load periods.',
      woId:''
    },
    {
      id:'INF-ISS-003',
      date:addDays(todayIso(), -16),
      segmentId:'INF-005',
      type:'Corrosion',
      severity:'Medium',
      status:'Open',
      reportedBy:'Maintenance Team',
      description:'Coating loss and rust visible on roof return support near elbow joint.',
      action:'Scaffold access and clamp repair planned.',
      impact:'Potential leak if not repaired before rainy season.',
      woId:''
    },
    {
      id:'INF-ISS-004',
      date:addDays(todayIso(), -27),
      segmentId:'INF-001',
      type:'Leak',
      severity:'Low',
      status:'Closed',
      reportedBy:'Utility Technician',
      description:'Small seepage at gasket on valve chamber V-02.',
      action:'Gasket replaced and chamber cleaned.',
      impact:'No production impact.',
      woId:'WO-0004'
    }
  ];
}
function buildInfraLogSeeds(){
  return [
    {
      id:'INF-LOG-001',
      date:addDays(todayIso(), -14),
      segmentId:'INF-001',
      type:'Inspection',
      inspector:'Job',
      condition:82,
      pressureBar:3.8,
      findings:'Main ring stable. Chamber V-02 dry after last gasket replacement.'
    },
    {
      id:'INF-LOG-002',
      date:addDays(todayIso(), -9),
      segmentId:'INF-002',
      type:'Leak Test',
      inspector:'Somchai',
      condition:71,
      pressureBar:6.5,
      findings:'Minor audible leakage near drop to edging line 2. Requires follow-up survey.'
    },
    {
      id:'INF-LOG-003',
      date:addDays(todayIso(), -21),
      segmentId:'INF-003',
      type:'Flush',
      inspector:'Wattana',
      condition:68,
      pressureBar:0.6,
      findings:'Header flushed. Sediment observed near neutralization tank inlet.'
    },
    {
      id:'INF-LOG-004',
      date:addDays(todayIso(), -18),
      segmentId:'INF-005',
      type:'Inspection',
      inspector:'Job',
      condition:74,
      pressureBar:2.9,
      findings:'Support corrosion found at roof elbow; repair planned before next cycle.'
    },
    {
      id:'INF-LOG-005',
      date:addDays(todayIso(), -6),
      segmentId:'INF-006',
      type:'Inspection',
      inspector:'Safety Team',
      condition:91,
      pressureBar:5.4,
      findings:'Hydrants accessible and valve pit condition acceptable.'
    }
  ];
}

function infraDirty(){
  try{ return localStorage.getItem(LS_INFRA_DIRTY) === '1'; }
  catch(e){ return false; }
}
function clearInfraDirty(){
  try{ localStorage.removeItem(LS_INFRA_DIRTY); }
  catch(e){}
}
function loadInfra(){
  try{
    const raw = localStorage.getItem(LS_INFRA);
    if(raw){
      const rows = JSON.parse(raw);
      if(Array.isArray(rows)) return rows;
    }
  }catch(e){}
  return buildInfraSeeds();
}
function loadInfraIssues(){
  try{
    const raw = localStorage.getItem(LS_INFRA_ISSUES);
    if(raw){
      const rows = JSON.parse(raw);
      if(Array.isArray(rows)) return rows;
    }
  }catch(e){}
  return buildInfraIssueSeeds();
}
function loadInfraLogs(){
  try{
    const raw = localStorage.getItem(LS_INFRA_LOGS);
    if(raw){
      const rows = JSON.parse(raw);
      if(Array.isArray(rows)) return rows;
    }
  }catch(e){}
  return buildInfraLogSeeds();
}

let INFRA = loadInfra();
let INFRA_ISSUES = loadInfraIssues();
let INFRA_LOGS = loadInfraLogs();

function persistInfra(){
  try{
    localStorage.setItem(LS_INFRA, JSON.stringify(INFRA));
    localStorage.setItem(LS_INFRA_ISSUES, JSON.stringify(INFRA_ISSUES));
    localStorage.setItem(LS_INFRA_LOGS, JSON.stringify(INFRA_LOGS));
    localStorage.setItem(LS_INFRA_DIRTY, '1');
  }catch(e){
    toast('Could not save infrastructure data locally.');
  }
  refreshInfraBadge();
}
function resetInfraToSeed(){
  try{
    localStorage.removeItem(LS_INFRA);
    localStorage.removeItem(LS_INFRA_ISSUES);
    localStorage.removeItem(LS_INFRA_LOGS);
    localStorage.removeItem(LS_INFRA_DIRTY);
  }catch(e){}
  INFRA = buildInfraSeeds();
  INFRA_ISSUES = buildInfraIssueSeeds();
  INFRA_LOGS = buildInfraLogSeeds();
  refreshInfraBadge();
  toast('Infrastructure data reverted to the seed set.');
}
function exportInfraSnapshot(){
  const payload = {
    exportedAt:new Date().toISOString(),
    networks:INFRA,
    incidents:INFRA_ISSUES,
    inspections:INFRA_LOGS
  };
  downloadText(JSON.stringify(payload, null, 2) + '\n', 'cmms_infrastructure_snapshot.json', 'application/json');
  clearInfraDirty();
  toast('cmms_infrastructure_snapshot.json downloaded.');
  refreshInfraBadge();
  if(current === 'infrastructure') go('infrastructure');
}

function infraById(id){ return INFRA.find(row => row.id === id); }
function infraOpenIssues(id){ return INFRA_ISSUES.filter(issue => issue.segmentId === id && issue.status !== 'Closed'); }
function infraLogsFor(id){
  return [...INFRA_LOGS]
    .filter(log => log.segmentId === id)
    .sort((a, b) => `${b.date}-${b.id}`.localeCompare(`${a.date}-${a.id}`));
}
function infraStatusClass(status){
  return {
    'Normal':'pill-done',
    'Leak Watch':'pill-open',
    'Restricted':'pill-hold',
    'Isolated':'pill-hold',
    'Repair Planned':'pill-med'
  }[status] || 'pill-low';
}
function infraIssueStatusClass(status){
  return {Open:'pill-hold', Monitoring:'pill-open', Closed:'pill-done'}[status] || 'pill-low';
}
function infraInspectionDue(row){
  if(!row.nextInspection) return false;
  return daysFromToday(row.nextInspection) <= SETTINGS.pmDueSoonDays;
}
function infraMetrics(){
  const openIssues = INFRA_ISSUES.filter(issue => issue.status !== 'Closed').length;
  const dueInspections = INFRA.filter(infraInspectionDue).length;
  const leakWatch = INFRA.filter(row => row.status === 'Leak Watch').length;
  const restricted = INFRA.filter(row => ['Restricted','Isolated'].includes(row.status)).length;
  return {openIssues, dueInspections, leakWatch, restricted};
}
function refreshInfraBadge(){
  const badge = $('#sb-infra');
  if(badge) badge.textContent = INFRA_ISSUES.filter(issue => issue.status !== 'Closed').length;
}
refreshInfraBadge();

function nextInfraIssueId(){
  let max = 0;
  INFRA_ISSUES.forEach(issue => {
    const match = /^INF-ISS-(\d+)$/.exec(issue.id || '');
    if(match) max = Math.max(max, Number(match[1]));
  });
  return 'INF-ISS-' + String(max + 1).padStart(3, '0');
}
function nextInfraLogId(){
  let max = 0;
  INFRA_LOGS.forEach(log => {
    const match = /^INF-LOG-(\d+)$/.exec(log.id || '');
    if(match) max = Math.max(max, Number(match[1]));
  });
  return 'INF-LOG-' + String(max + 1).padStart(3, '0');
}

/* ============================================================
   LIST VIEW
   ============================================================ */
function renderInfrastructure(){
  const dirty = infraDirty();
  const {openIssues, dueInspections, leakWatch, restricted} = infraMetrics();
  const utilityOpts = uniqList(INFRA.map(row => row.utilityType));

  view.innerHTML = `
    <div class="page-head">
      <div><h1>Infrastructure</h1><div class="ph-sub">Utility network maintenance for city water, compressed air, waste water, and support systems.</div></div>
      <button class="btn btn-primary" onclick="openInfraModal('add')">+ Add Network</button>
    </div>
    <div class="databar ${dirty ? '' : 'clean'}">
      ${dirty
        ? `<b>Unsaved changes</b><span>Infrastructure edits, incidents, and inspections are stored in this browser.</span>`
        : `<b>In sync</b><span>Using the current local infrastructure snapshot.</span>`}
      <span class="spacer"></span>
      <button class="btn btn-ghost btn-sm" onclick="exportInfraSnapshot()">Export snapshot</button>
      ${dirty ? `<button class="btn btn-ghost btn-sm" onclick="confirmResetInfra()">Revert</button>` : ''}
    </div>
    <div class="kpis" style="margin-bottom:18px">
      <div class="kpi"><div class="k-top"><div><div class="k-val">${INFRA.length}</div><div class="k-label">Network Segments</div></div><div class="k-ico ico-steel">IN</div></div></div>
      <div class="kpi"><div class="k-top"><div><div class="k-val" style="color:${openIssues ? 'var(--red)' : 'inherit'}">${openIssues}</div><div class="k-label">Active Incidents</div></div><div class="k-ico ico-red">AL</div></div></div>
      <div class="kpi"><div class="k-top"><div><div class="k-val" style="color:${dueInspections ? 'var(--orange-dark)' : 'inherit'}">${dueInspections}</div><div class="k-label">Inspections Due</div></div><div class="k-ico ico-orange">DU</div></div></div>
      <div class="kpi"><div class="k-top"><div><div class="k-val">${leakWatch + restricted}</div><div class="k-label">Watch / Restricted</div></div><div class="k-ico ico-blue">WT</div></div></div>
    </div>
    <div class="toolbar">
      <input class="tb-search" id="nf-q" placeholder="Search by network, utility, area..." value="${esc(infraFilters.q)}">
      <select id="nf-utility"><option value="">All Utilities</option>${utilityOpts.map(v => `<option ${infraFilters.utility === v ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select>
      <select id="nf-status"><option value="">All Status</option>${INFRA_STATUSES.map(v => `<option ${infraFilters.status === v ? 'selected' : ''}>${v}</option>`).join('')}</select>
      <select id="nf-risk"><option value="">All Risk</option>${INFRA_RISKS.map(v => `<option ${infraFilters.risk === v ? 'selected' : ''}>${v}</option>`).join('')}</select>
      <span class="tb-count" id="nf-count"></span>
    </div>
    <div class="tbl-wrap"><table>
      <thead><tr>
        <th>ID</th><th>Network</th><th>Utility</th><th>Zone</th><th>Condition</th>
        <th>Next Inspection</th><th>Status</th><th>Risk</th><th>Open Issues</th><th style="text-align:right">Actions</th>
      </tr></thead>
      <tbody id="infra-rows"></tbody>
    </table></div>`;

  const apply = () => {
    infraFilters.q = $('#nf-q').value.toLowerCase();
    infraFilters.utility = $('#nf-utility').value;
    infraFilters.status = $('#nf-status').value;
    infraFilters.risk = $('#nf-risk').value;
    const rows = INFRA.filter(row => {
      const hay = `${row.id} ${row.name} ${row.utilityType} ${row.zone} ${row.route}`.toLowerCase();
      return hay.includes(infraFilters.q)
        && (!infraFilters.utility || row.utilityType === infraFilters.utility)
        && (!infraFilters.status || row.status === infraFilters.status)
        && (!infraFilters.risk || row.risk === infraFilters.risk);
    });
    $('#infra-rows').innerHTML = rows.length ? rows.map(row => {
      const due = infraInspectionDue(row);
      const issues = infraOpenIssues(row.id).length;
      return `<tr onclick="go('infrastructure-detail','${row.id}')">
        <td class="mono">${row.id}</td>
        <td><b>${esc(row.name)}</b><div style="font-size:11.5px;color:var(--ink-soft)">${esc(row.route)}</div></td>
        <td>${esc(row.utilityType)}</td>
        <td>${esc(row.zone)}</td>
        <td><div class="hbar"><div class="bar"><i style="width:${row.condition}%;background:${healthColor(row.condition)}"></i></div><span style="color:${healthColor(row.condition)}">${row.condition}%</span></div></td>
        <td style="${due ? 'color:var(--orange-dark);font-weight:600' : ''}">${fmtDate(row.nextInspection)}</td>
        <td><span class="pill ${infraStatusClass(row.status)}">${row.status}</span></td>
        <td><span class="pill ${critClass(row.risk)}">${row.risk}</span></td>
        <td>${issues ? `<span class="pill pill-hold">${issues}</span>` : '<span style="color:var(--ink-soft)">0</span>'}</td>
        <td style="text-align:right;white-space:nowrap" onclick="event.stopPropagation()">
          <button class="iconbtn" onclick="openInfraIssueModal('${row.id}')">Alert</button>
          <button class="iconbtn" onclick="openInfraInspectionModal('${row.id}')">Inspect</button>
        </td>
      </tr>`;
    }).join('') : `<tr><td colspan="10" style="text-align:center;color:var(--ink-soft);padding:30px">No infrastructure segments match the current filters.</td></tr>`;
    $('#nf-count').textContent = `Showing ${rows.length} of ${INFRA.length} networks`;
  };
  ['nf-q','nf-utility','nf-status','nf-risk'].forEach(id => {
    $('#' + id).addEventListener('input', apply);
    $('#' + id).addEventListener('change', apply);
  });
  apply();
}

/* ============================================================
   DETAIL VIEW
   ============================================================ */
function renderInfrastructureDetail(id){
  const row = infraById(id);
  if(!row){ renderInfrastructure(); return; }
  const issues = [...INFRA_ISSUES]
    .filter(issue => issue.segmentId === id)
    .sort((a, b) => `${b.date}-${b.id}`.localeCompare(`${a.date}-${a.id}`));
  const logs = infraLogsFor(id);
  const due = infraInspectionDue(row);

  view.innerHTML = `
    <div class="back" onclick="go('infrastructure')"><- Back to Infrastructure</div>
    <div class="detail-hero">
      <div class="gauge" style="background:conic-gradient(${healthColor(row.condition)} ${row.condition * 3.6}deg, var(--steel-100) 0deg)">
        <div class="g-inner"><b style="color:${healthColor(row.condition)}">${row.condition}%</b><span>Condition</span></div>
      </div>
      <div class="dh-main">
        <h1>${esc(row.name)}</h1>
        <div class="dh-meta"><span class="mono">${row.id}</span> · ${esc(row.utilityType)} · ${esc(row.zone)} · ${esc(row.material)} ${esc(row.size)}</div>
        <div class="dh-tags">
          <span class="pill ${infraStatusClass(row.status)}">${row.status}</span>
          <span class="pill ${critClass(row.risk)}">${row.risk} risk</span>
          ${due ? '<span class="pill pill-open">Inspection Due</span>' : ''}
          ${infraOpenIssues(row.id).length ? `<span class="pill pill-hold">${infraOpenIssues(row.id).length} Active Incident(s)</span>` : ''}
        </div>
      </div>
      <div class="dh-actions">
        <button class="btn btn-primary" onclick="openInfraInspectionModal('${row.id}')">Log Inspection</button>
        <button class="btn btn-ghost" onclick="openInfraIssueModal('${row.id}')">Report Incident</button>
        <button class="btn btn-ghost" onclick="openInfraModal('edit','${row.id}')">Edit Network</button>
      </div>
    </div>
    <div class="statgrid">
      <div class="stat"><div class="s-label">Length</div><div class="s-val">${row.lengthM} m</div></div>
      <div class="stat"><div class="s-label">Pressure</div><div class="s-val">${row.pressureBar} bar</div></div>
      <div class="stat"><div class="s-label">Flow</div><div class="s-val">${row.flowM3h} m3/h</div></div>
      <div class="stat"><div class="s-label">Next Inspection</div><div class="s-val" style="font-size:15px;${due ? 'color:var(--orange-dark)' : ''}">${fmtDate(row.nextInspection)}</div></div>
    </div>
    <div class="cols">
      <div>
        <div class="panel" style="margin-bottom:18px">
          <div class="panel-head"><b>Coverage & Isolation</b></div>
          <div class="panel-body settings-body">
            <div>
              <div style="font-size:11px;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.4px;margin-bottom:8px">Affected Areas</div>
              <div class="chip-row">${(row.affectedAreas || []).map(v => `<span class="chip">${esc(v)}</span>`).join('')}</div>
            </div>
            <div>
              <div style="font-size:11px;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.4px;margin-bottom:8px">Isolation Points</div>
              <div class="chip-row">${(row.isolationPoints || []).map(v => `<span class="chip">${esc(v)}</span>`).join('')}</div>
            </div>
            <div class="notebox" style="margin-top:0"><b>Notes:</b> ${esc(row.notes) || '-'}</div>
          </div>
        </div>
        <div class="panel">
          <div class="panel-head"><b>Inspection Log</b><span style="font-size:12px;color:var(--ink-soft)">${logs.length} entries</span></div>
          ${logs.length ? logs.slice(0, 8).map(log => `
            <div class="wo-line">
              <div class="wo-pri" style="background:${healthColor(log.condition || row.condition)}"></div>
              <div style="flex:1;min-width:0">
                <b style="font-size:13px;display:block">${log.type} · ${fmtDate(log.date)}</b>
                <span style="font-size:11.5px;color:var(--ink-soft)">${esc(log.inspector)} · ${log.pressureBar} bar · ${log.condition}% condition</span>
                <div style="font-size:12px;color:var(--ink-soft);margin-top:4px">${esc(log.findings || '-')}</div>
              </div>
            </div>`).join('')
            : '<div style="padding:22px 17px;color:var(--ink-soft);font-size:13px">No inspection logs yet.</div>'}
        </div>
      </div>
      <div>
        <div class="panel" style="margin-bottom:18px">
          <div class="panel-head"><b>Active / Historical Incidents</b><span style="font-size:12px;color:var(--ink-soft)">${issues.length} total</span></div>
          ${issues.length ? issues.map(issue => `
            <div class="wo-line">
              <div class="wo-pri" style="background:${issue.status === 'Closed' ? 'var(--green)' : 'var(--red)'}"></div>
              <div style="flex:1;min-width:0">
                <b style="font-size:13px;display:block">${issue.type} · ${fmtDate(issue.date)}</b>
                <span style="font-size:11.5px;color:var(--ink-soft)">${esc(issue.reportedBy)} · ${issue.impact}</span>
                <div style="font-size:12px;color:var(--ink-soft);margin-top:4px">${esc(issue.description)}</div>
                <div style="display:flex;gap:8px;align-items:center;margin-top:8px;flex-wrap:wrap">
                  <span class="pill ${infraIssueStatusClass(issue.status)}">${issue.status}</span>
                  <span class="pill ${critClass(issue.severity)}">${issue.severity}</span>
                  ${issue.woId ? `<span class="pill pill-med" style="cursor:pointer" onclick="go('wo-detail','${issue.woId}')">${issue.woId}</span>` : `<button class="btn btn-ghost btn-sm" onclick="raiseWOFromInfrastructure('${issue.id}')">Raise WO</button>`}
                  ${issue.status !== 'Closed' ? `<button class="btn btn-ghost btn-sm" onclick="closeInfrastructureIssue('${issue.id}')">Close</button>` : ''}
                </div>
              </div>
            </div>`).join('')
            : '<div style="padding:22px 17px;color:var(--ink-soft);font-size:13px">No incidents logged for this network.</div>'}
        </div>
        <div class="panel">
          <div class="panel-head"><b>Network Profile</b></div>
          <div class="panel-body">
            <div class="kv-list">
              <div><span>Route</span><b style="text-align:right">${esc(row.route)}</b></div>
              <div><span>Inspection Frequency</span><b>${row.inspectionFreqDays} days</b></div>
              <div><span>Last Inspection</span><b>${fmtDate(row.lastInspection)}</b></div>
              <div><span>Material / Size</span><b>${esc(row.material)} / ${esc(row.size)}</b></div>
            </div>
          </div>
          <div class="modal-foot" style="background:var(--white);justify-content:space-between">
            <button class="btn btn-ghost" onclick="raiseWOFromInfrastructure('', '${row.id}')">Raise Generic WO</button>
            <button class="btn btn-danger" onclick="confirmDeleteInfrastructure('${row.id}')">Delete Network</button>
          </div>
        </div>
      </div>
    </div>`;
}

/* ============================================================
   CRUD + ACTIONS
   ============================================================ */
function openInfraModal(mode, id){
  const editing = mode === 'edit';
  const row = editing ? infraById(id) : {
    id:'',
    name:'',
    utilityType:'City Water',
    zone:'',
    route:'',
    material:'HDPE',
    size:'2 in',
    lengthM:0,
    pressureBar:0,
    flowM3h:0,
    condition:85,
    risk:'Medium',
    status:'Normal',
    lastInspection:'',
    nextInspection:'',
    inspectionFreqDays:30,
    isolationPoints:[],
    affectedAreas:[],
    notes:''
  };
  if(editing && !row){ toast('Infrastructure segment not found.'); return; }
  modalHost.innerHTML = `
    <div class="modal">
      <div class="modal-head"><h3>${editing ? 'Edit Infrastructure - ' + row.id : 'Add Infrastructure Network'}</h3><div class="x" onclick="closeModal()">x</div></div>
      <div class="modal-body">
        <div class="form-err" id="form-err"></div>
        <div class="form-grid">
          <div class="field"><label>ID <span class="req">*</span></label><input id="in-id" value="${esc(row.id)}" ${editing ? 'readonly' : ''} placeholder="e.g. INF-007"></div>
          <div class="field"><label>Name <span class="req">*</span></label><input id="in-name" value="${esc(row.name)}" placeholder="e.g. Process Water Loop B"></div>
          <div class="field"><label>Utility Type</label><select id="in-utilityType">${INFRA_UTILITIES.map(v => `<option ${row.utilityType === v ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
          <div class="field"><label>Zone</label><input id="in-zone" value="${esc(row.zone)}" placeholder="e.g. Surface North"></div>
          <div class="field full"><label>Route</label><input id="in-route" value="${esc(row.route)}" placeholder="Main route description"></div>
          <div class="field"><label>Material</label><input id="in-material" value="${esc(row.material)}"></div>
          <div class="field"><label>Pipe Size</label><input id="in-size" value="${esc(row.size)}"></div>
          <div class="field"><label>Length (m)</label><input id="in-lengthM" type="number" min="0" value="${row.lengthM}"></div>
          <div class="field"><label>Pressure (bar)</label><input id="in-pressureBar" type="number" min="0" step="0.1" value="${row.pressureBar}"></div>
          <div class="field"><label>Flow (m3/h)</label><input id="in-flowM3h" type="number" min="0" step="0.1" value="${row.flowM3h}"></div>
          <div class="field"><label>Condition %</label><input id="in-condition" type="number" min="0" max="100" value="${row.condition}"></div>
          <div class="field"><label>Risk</label><select id="in-risk">${INFRA_RISKS.map(v => `<option ${row.risk === v ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
          <div class="field"><label>Status</label><select id="in-status">${INFRA_STATUSES.map(v => `<option ${row.status === v ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
          <div class="field"><label>Last Inspection</label><input id="in-lastInspection" type="date" value="${esc(row.lastInspection)}"></div>
          <div class="field"><label>Next Inspection</label><input id="in-nextInspection" type="date" value="${esc(row.nextInspection)}"></div>
          <div class="field"><label>Inspection Frequency (days)</label><input id="in-inspectionFreqDays" type="number" min="1" value="${row.inspectionFreqDays}"></div>
          <div class="field full"><label>Isolation Points <span style="text-transform:none;font-weight:400;color:var(--ink-soft)">- separate with commas</span></label><input id="in-isolationPoints" value="${esc((row.isolationPoints || []).join(', '))}"></div>
          <div class="field full"><label>Affected Areas <span style="text-transform:none;font-weight:400;color:var(--ink-soft)">- separate with commas</span></label><input id="in-affectedAreas" value="${esc((row.affectedAreas || []).join(', '))}"></div>
          <div class="field full"><label>Notes</label><textarea id="in-notes">${esc(row.notes)}</textarea></div>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="saveInfrastructure('${mode}','${editing ? row.id : ''}')">${editing ? 'Save Changes' : 'Add Network'}</button>
      </div>
    </div>`;
  overlay.classList.add('show');
}
function saveInfrastructure(mode, origId){
  const g = id => $('#in-' + id);
  const errBox = $('#form-err');
  const showErr = msg => {
    errBox.textContent = msg;
    errBox.classList.add('show');
  };
  errBox.classList.remove('show');
  ['id','name'].forEach(k => { const node = g(k); if(node) node.classList.remove('bad'); });
  const rec = {
    id:g('id').value.trim(),
    name:g('name').value.trim(),
    utilityType:g('utilityType').value,
    zone:g('zone').value.trim(),
    route:g('route').value.trim(),
    material:g('material').value.trim(),
    size:g('size').value.trim(),
    lengthM:Math.max(0, parseFloat(g('lengthM').value) || 0),
    pressureBar:Math.max(0, parseFloat(g('pressureBar').value) || 0),
    flowM3h:Math.max(0, parseFloat(g('flowM3h').value) || 0),
    condition:clamp(g('condition').value, 0, 100),
    risk:g('risk').value,
    status:g('status').value,
    lastInspection:g('lastInspection').value,
    nextInspection:g('nextInspection').value,
    inspectionFreqDays:Math.max(1, parseInt(g('inspectionFreqDays').value, 10) || 30),
    isolationPoints:uniqList((g('isolationPoints').value || '').split(',').map(v => v.trim())),
    affectedAreas:uniqList((g('affectedAreas').value || '').split(',').map(v => v.trim())),
    notes:g('notes').value.trim()
  };
  if(!rec.id){ g('id').classList.add('bad'); showErr('Infrastructure ID is required.'); return; }
  if(!/^[A-Za-z0-9\-_]+$/.test(rec.id)){ g('id').classList.add('bad'); showErr('Infrastructure ID may only contain letters, numbers, hyphens, and underscores.'); return; }
  if(!rec.name){ g('name').classList.add('bad'); showErr('Network name is required.'); return; }

  if(mode === 'add'){
    if(INFRA.some(row => row.id.toLowerCase() === rec.id.toLowerCase())){
      g('id').classList.add('bad');
      showErr(`A network with ID "${rec.id}" already exists.`);
      return;
    }
    INFRA.push(rec);
    persistInfra();
    closeModal();
    toast(`Infrastructure ${rec.id} added.`);
    go('infrastructure');
  }else{
    const idx = INFRA.findIndex(row => row.id === origId);
    if(idx < 0){ showErr('Original network no longer exists.'); return; }
    rec.id = origId;
    INFRA[idx] = rec;
    persistInfra();
    closeModal();
    toast(`Infrastructure ${origId} updated.`);
    go(current === 'infrastructure-detail' ? 'infrastructure-detail' : 'infrastructure', origId);
  }
}
function confirmDeleteInfrastructure(id){
  const row = infraById(id);
  if(!row) return;
  modalHost.innerHTML = `
    <div class="modal confirm-box">
      <div class="modal-head"><h3>Delete Infrastructure Network</h3><div class="x" onclick="closeModal()">x</div></div>
      <div class="modal-body">
        <p>Delete <b>${row.id} - ${esc(row.name)}</b> from the infrastructure register?</p>
        <p style="margin-top:10px;color:var(--ink-soft)">Incident and inspection history will remain in the snapshot only if you export it first.</p>
      </div>
      <div class="modal-foot">
        <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button class="btn btn-danger" onclick="doDeleteInfrastructure('${id}')">Delete Network</button>
      </div>
    </div>`;
  overlay.classList.add('show');
}
function doDeleteInfrastructure(id){
  const idx = INFRA.findIndex(row => row.id === id);
  if(idx >= 0) INFRA.splice(idx, 1);
  INFRA_ISSUES = INFRA_ISSUES.filter(issue => issue.segmentId !== id);
  INFRA_LOGS = INFRA_LOGS.filter(log => log.segmentId !== id);
  persistInfra();
  closeModal();
  toast(`Infrastructure ${id} deleted.`);
  go('infrastructure');
}

function openInfraInspectionModal(segmentId){
  const row = infraById(segmentId);
  if(!row) return;
  modalHost.innerHTML = `
    <div class="modal">
      <div class="modal-head"><h3>Log Inspection - ${row.id}</h3><div class="x" onclick="closeModal()">x</div></div>
      <div class="modal-body">
        <div class="form-err" id="form-err"></div>
        <div class="form-grid">
          <div class="field"><label>Date</label><input id="ii-date" type="date" value="${todayIso()}"></div>
          <div class="field"><label>Type</label><select id="ii-type">${INFRA_LOG_TYPES.map(v => `<option>${v}</option>`).join('')}</select></div>
          <div class="field"><label>Inspector</label><input id="ii-inspector" list="wo-technician-options" value="${esc(SETTINGS.currentUser)}"></div>
          <div class="field"><label>Condition %</label><input id="ii-condition" type="number" min="0" max="100" value="${row.condition}"></div>
          <div class="field"><label>Pressure (bar)</label><input id="ii-pressureBar" type="number" min="0" step="0.1" value="${row.pressureBar}"></div>
          <div class="field"><label>Next Inspection (optional)</label><input id="ii-nextInspection" type="date" value=""></div>
          <div class="field full"><label>Findings</label><textarea id="ii-findings" placeholder="Observed condition, leakage points, support damage, housekeeping, etc."></textarea></div>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="saveInfraInspection('${segmentId}')">Save Inspection</button>
      </div>
    </div>`;
  modalHost.innerHTML = datalistHtml('wo-technician-options', technicianOptions()) + modalHost.innerHTML;
  overlay.classList.add('show');
}
function saveInfraInspection(segmentId){
  const row = infraById(segmentId);
  if(!row) return;
  const date = $('#ii-date').value || todayIso();
  const condition = clamp($('#ii-condition').value, 0, 100);
  const pressureBar = Math.max(0, parseFloat($('#ii-pressureBar').value) || 0);
  const nextInspection = $('#ii-nextInspection').value || addDays(date, row.inspectionFreqDays);
  INFRA_LOGS.push({
    id:nextInfraLogId(),
    date,
    segmentId,
    type:$('#ii-type').value,
    inspector:$('#ii-inspector').value.trim() || SETTINGS.currentUser,
    condition,
    pressureBar,
    findings:$('#ii-findings').value.trim()
  });
  row.lastInspection = date;
  row.nextInspection = nextInspection;
  row.condition = condition;
  row.pressureBar = pressureBar;
  if(condition >= 80 && row.status === 'Leak Watch') row.status = 'Normal';
  persistInfra();
  closeModal();
  toast(`Inspection logged for ${segmentId}.`);
  go('infrastructure-detail', segmentId);
}

function openInfraIssueModal(segmentId){
  const row = infraById(segmentId);
  if(!row) return;
  modalHost.innerHTML = `
    <div class="modal">
      <div class="modal-head"><h3>Report Infrastructure Incident - ${row.id}</h3><div class="x" onclick="closeModal()">x</div></div>
      <div class="modal-body">
        <div class="form-err" id="form-err"></div>
        <div class="form-grid">
          <div class="field"><label>Date</label><input id="ir-date" type="date" value="${todayIso()}"></div>
          <div class="field"><label>Type</label><select id="ir-type">${INFRA_ISSUE_TYPES.map(v => `<option>${v}</option>`).join('')}</select></div>
          <div class="field"><label>Severity</label><select id="ir-severity">${INFRA_RISKS.map(v => `<option ${v === 'High' ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
          <div class="field"><label>Reported By</label><input id="ir-reportedBy" value="${esc(SETTINGS.currentUser)}"></div>
          <div class="field full"><label>Impact Summary</label><input id="ir-impact" placeholder="e.g. Pressure loss at edging and HC tools"></div>
          <div class="field full"><label>Description</label><textarea id="ir-description" placeholder="What happened, where, and what symptoms were seen?"></textarea></div>
          <div class="field full"><label>Immediate Action</label><textarea id="ir-action" placeholder="Isolation, cleanup, temporary bypass, warning tape, etc."></textarea></div>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="saveInfraIssue('${segmentId}')">Save Incident</button>
      </div>
    </div>`;
  overlay.classList.add('show');
}
function saveInfraIssue(segmentId){
  const errBox = $('#form-err');
  const showErr = msg => {
    errBox.textContent = msg;
    errBox.classList.add('show');
  };
  errBox.classList.remove('show');
  const impact = $('#ir-impact').value.trim();
  const description = $('#ir-description').value.trim();
  if(!impact){ showErr('Impact summary is required.'); return; }
  if(!description){ showErr('Description is required.'); return; }
  const issue = {
    id:nextInfraIssueId(),
    date:$('#ir-date').value || todayIso(),
    segmentId,
    type:$('#ir-type').value,
    severity:$('#ir-severity').value,
    status:'Open',
    reportedBy:$('#ir-reportedBy').value.trim() || SETTINGS.currentUser,
    description,
    action:$('#ir-action').value.trim(),
    impact,
    woId:''
  };
  INFRA_ISSUES.push(issue);
  const row = infraById(segmentId);
  if(row && issue.severity !== 'Low') row.status = row.status === 'Normal' ? 'Leak Watch' : row.status;
  persistInfra();
  closeModal();
  toast(`Incident ${issue.id} logged.`);
  go('infrastructure-detail', segmentId);
}

function closeInfrastructureIssue(issueId){
  const issue = INFRA_ISSUES.find(row => row.id === issueId);
  if(!issue) return;
  issue.status = 'Closed';
  const row = infraById(issue.segmentId);
  if(row && !infraOpenIssues(issue.segmentId).filter(i => i.id !== issueId).length && row.status === 'Leak Watch'){
    row.status = 'Normal';
  }
  persistInfra();
  toast(`Incident ${issueId} closed.`);
  go('infrastructure-detail', issue.segmentId);
}

function raiseWOFromInfrastructure(issueId, segmentId){
  let issue = null;
  let row = null;
  if(issueId){
    issue = INFRA_ISSUES.find(item => item.id === issueId);
    if(!issue) return;
    row = infraById(issue.segmentId);
    if(issue.woId){ go('wo-detail', issue.woId); return; }
  }else{
    row = infraById(segmentId);
    if(!row) return;
  }
  const wo = {
    id:nextWOId(),
    title: issue ? `Infrastructure - ${row.name} - ${issue.type}` : `Infrastructure - ${row.name} follow-up`,
    assetId: row.id,
    type: 'Corrective',
    priority: issue ? (issue.severity === 'Critical' ? 'High' : issue.severity) : 'Medium',
    status: 'Open',
    technician: '',
    requestedBy: 'Infrastructure ' + row.id,
    created: todayIso(),
    due: addDays(todayIso(), issue && issue.severity === 'Critical' ? 0 : 2),
    completed: '',
    description: issue
      ? `${issue.description}\nImpact: ${issue.impact}\nImmediate action: ${issue.action || '-'}`
      : `General corrective / preventive work requested for infrastructure network ${row.id} - ${row.name}.`,
    resolution: '',
    labourHrs: 0,
    downtimeHrs: 0
  };
  WOS.push(wo);
  if(issue) issue.woId = wo.id;
  persistWOs();
  refreshWOBadges();
  persistInfra();
  toast(`Work order ${wo.id} raised from infrastructure.`);
  go('wo-detail', wo.id);
}

function confirmResetInfra(){
  modalHost.innerHTML = `
    <div class="modal confirm-box">
      <div class="modal-head"><h3>Revert Infrastructure Data</h3><div class="x" onclick="closeModal()">x</div></div>
      <div class="modal-body">
        <p>Discard all local infrastructure edits, incidents, and inspection logs and reload the seed data set?</p>
        <p style="margin-top:10px;color:var(--ink-soft)">Anything you have not exported will be lost.</p>
      </div>
      <div class="modal-foot">
        <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button class="btn btn-danger" onclick="closeModal();resetInfraToSeed();go('infrastructure')">Revert to seed</button>
      </div>
    </div>`;
  overlay.classList.add('show');
}

/* ----- register routes ----- */
ROUTES['infrastructure'] = renderInfrastructure;
ROUTES['infrastructure-detail'] = renderInfrastructureDetail;
