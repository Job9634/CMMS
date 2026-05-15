/* ============================================================
   CMMS - MODULE: BREAKDOWNS
   Event log for equipment and utility failures with WO linkage.
   ============================================================ */
const LS_BD = 'cmms_breakdowns_v1';
const LS_BD_DIRTY = 'cmms_breakdowns_dirty_v1';
const BD_TARGETS = ['Asset','Infrastructure'];
const BD_CATEGORIES = ['Mechanical','Electrical','Utility','Instrumentation','Process'];
const BD_SEVERITIES = ['Critical','High','Medium','Low'];
const BD_STATUSES = ['Open','Diagnosing','Repairing','Monitoring','Closed'];

let bdFilters = {q:'', status:'', severity:'', targetType:''};

function nowLocalValue(){
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}T${hh}:${mm}`;
}
function fmtDateTime(value){
  if(!value) return '-';
  const stamp = new Date(value);
  return isNaN(stamp) ? value : stamp.toLocaleString('en-GB', {
    day:'2-digit',
    month:'short',
    year:'numeric',
    hour:'2-digit',
    minute:'2-digit'
  });
}
function bdTargetOptions(){
  const infraRows = typeof INFRA !== 'undefined' ? INFRA : [];
  return [
    ...ASSETS.map(a => ({type:'Asset', id:a.id, label:`${a.id} - ${a.name}`})),
    ...infraRows.map(row => ({type:'Infrastructure', id:row.id, label:`${row.id} - ${row.name}`}))
  ];
}
function breakdownTargetName(row){
  if(row.targetType === 'Asset'){
    const asset = ASSETS.find(a => a.id === row.targetId);
    return asset ? asset.name : row.targetId || 'Unknown asset';
  }
  const infra = typeof INFRA !== 'undefined' ? INFRA.find(item => item.id === row.targetId) : null;
  return infra ? infra.name : row.targetId || 'Unknown infrastructure';
}
function breakdownTargetRoute(row){
  return row.targetType === 'Infrastructure' ? 'infrastructure-detail' : 'asset-detail';
}
function breakdownStatusClass(status){
  return {
    Open:'pill-crit',
    Diagnosing:'pill-high',
    Repairing:'pill-med',
    Monitoring:'pill-open',
    Closed:'pill-done'
  }[status] || 'pill-low';
}
function normalizeBreakdownUpdate(update, fallbackStatus){
  const rawStatus = String((update && update.status) || fallbackStatus || 'Diagnosing').trim();
  return {
    id:String((update && update.id) || '').trim(),
    date:String((update && update.date) || nowLocalValue()).trim() || nowLocalValue(),
    author:String((update && update.author) || '').trim(),
    status:BD_STATUSES.includes(rawStatus) ? rawStatus : 'Diagnosing',
    note:String((update && update.note) || '').trim(),
    downtimeHrs:Math.max(0, Number(update && update.downtimeHrs) || 0),
    rootCause:String((update && update.rootCause) || '').trim(),
    attachments:normalizeAttachments(update && update.attachments)
  };
}
function normalizeBreakdown(row){
  const status = BD_STATUSES.includes(row && row.status) ? row.status : 'Open';
  const severity = BD_SEVERITIES.includes(row && row.severity) ? row.severity : 'Medium';
  return Object.assign({}, row || {}, {
    id:String((row && row.id) || '').trim(),
    title:String((row && row.title) || '').trim(),
    category:BD_CATEGORIES.includes(row && row.category) ? row.category : 'Mechanical',
    severity,
    status,
    targetType:BD_TARGETS.includes(row && row.targetType) ? row.targetType : 'Asset',
    targetId:String((row && row.targetId) || '').trim(),
    area:String((row && row.area) || '').trim(),
    line:String((row && row.line) || '').trim(),
    startedAt:String((row && row.startedAt) || nowLocalValue()).trim() || nowLocalValue(),
    restoredAt:String((row && row.restoredAt) || '').trim(),
    reportedBy:String((row && row.reportedBy) || '').trim(),
    shift:String((row && row.shift) || '').trim() || SETTINGS.shiftLabel,
    symptoms:String((row && row.symptoms) || '').trim(),
    suspectedCause:String((row && row.suspectedCause) || '').trim(),
    rootCause:String((row && row.rootCause) || '').trim(),
    impact:String((row && row.impact) || '').trim(),
    downtimeHrs:Math.max(0, Number(row && row.downtimeHrs) || 0),
    woId:String((row && row.woId) || '').trim(),
    attachments:normalizeAttachments(row && row.attachments),
    updates:Array.isArray(row && row.updates) ? row.updates.map(item => normalizeBreakdownUpdate(item, status)) : []
  });
}
function buildBreakdownSeeds(){
  const asset1 = ASSETS[0] ? ASSETS[0].id : '';
  const asset2 = ASSETS[1] ? ASSETS[1].id : asset1;
  return [
    normalizeBreakdown({
      id:'BD-001',
      title:'Edger spindle trips during production ramp',
      category:'Mechanical',
      severity:'Critical',
      status:'Repairing',
      targetType:'Asset',
      targetId:asset1,
      area:'Surface line A',
      line:'Edging 1',
      startedAt:addDays(todayIso(), -1) + 'T08:10',
      restoredAt:'',
      reportedBy:'Surface Supervisor',
      shift:'Day A',
      symptoms:'Spindle overload alarm every 10 to 15 minutes with heat around bearing housing.',
      suspectedCause:'Bearing wear or lubrication failure.',
      rootCause:'',
      impact:'Production line slowed and backlog transferred to line B.',
      downtimeHrs:2.5,
      woId:'',
      attachments:[],
      updates:[
        {
          id:'BDU-001',
          date:addDays(todayIso(), -1) + 'T09:20',
          author:'CMMS Admin',
          status:'Diagnosing',
          note:'Locked out the edger and started vibration and temperature checks.',
          downtimeHrs:1,
          attachments:[]
        }
      ]
    }),
    normalizeBreakdown({
      id:'BD-002',
      title:'Compressed air drop at edging benches',
      category:'Utility',
      severity:'High',
      status:'Open',
      targetType:'Infrastructure',
      targetId:'INF-002',
      area:'Edging line 2',
      line:'Utility backbone',
      startedAt:todayIso() + 'T06:45',
      restoredAt:'',
      reportedBy:'Surface Supervisor',
      shift:'Day A',
      symptoms:'Clamp cylinders respond slowly and auto-unload fails intermittently.',
      suspectedCause:'Leak on local drop or regulator problem.',
      rootCause:'',
      impact:'Machine cycle time up and operators manually bypassing unload steps.',
      downtimeHrs:1.2,
      woId:'',
      attachments:[],
      updates:[]
    }),
    normalizeBreakdown({
      id:'BD-003',
      title:'Guard interlock false stop on polishing cell',
      category:'Electrical',
      severity:'High',
      status:'Monitoring',
      targetType:'Asset',
      targetId:asset2,
      area:'Polishing',
      line:'Polishing Cell 2',
      startedAt:addDays(todayIso(), -3) + 'T13:30',
      restoredAt:'',
      reportedBy:'HC Leader',
      shift:'Night B',
      symptoms:'Cell stops with guard closed and can restart after cabinet tap.',
      suspectedCause:'Loose interlock relay contact.',
      rootCause:'Vibration loosened relay terminal on safety loop.',
      impact:'Short interruptions every few batches.',
      downtimeHrs:0.8,
      woId:'WO-0007',
      attachments:[],
      updates:[
        {
          id:'BDU-002',
          date:addDays(todayIso(), -2) + 'T10:05',
          author:'Somchai',
          status:'Monitoring',
          note:'Retightened terminal and checked continuity. Leaving issue under observation for two shifts.',
          downtimeHrs:0.3,
          rootCause:'Loose interlock relay terminal.',
          attachments:[]
        }
      ]
    }),
    normalizeBreakdown({
      id:'BD-004',
      title:'Waste-water header blockage after tank cleaning',
      category:'Utility',
      severity:'Medium',
      status:'Closed',
      targetType:'Infrastructure',
      targetId:'INF-003',
      area:'Neutralization tank inlet',
      line:'Waste-water header',
      startedAt:addDays(todayIso(), -7) + 'T14:10',
      restoredAt:addDays(todayIso(), -7) + 'T17:40',
      reportedBy:'HC Leader',
      shift:'Day A',
      symptoms:'Slow draining and floor pooling near the pit after cleaning.',
      suspectedCause:'Sediment build-up in the low point of the header.',
      rootCause:'Accumulated solids at elbow downstream of tank inlet.',
      impact:'Temporary cleaning delay with spill risk.',
      downtimeHrs:1.9,
      woId:'WO-0004',
      attachments:[],
      updates:[
        {
          id:'BDU-003',
          date:addDays(todayIso(), -7) + 'T17:20',
          author:'Wattana',
          status:'Closed',
          note:'Flushed and rodded the low point. Flow normal after restart.',
          downtimeHrs:1.9,
          rootCause:'Accumulated solids at elbow downstream of tank inlet.',
          attachments:[]
        }
      ]
    })
  ];
}
function breakdownDirty(){
  try{ return localStorage.getItem(LS_BD_DIRTY) === '1'; }
  catch(e){ return false; }
}
function clearBreakdownDirty(){
  try{ localStorage.removeItem(LS_BD_DIRTY); }
  catch(e){}
}
function loadBreakdowns(){
  try{
    const raw = localStorage.getItem(LS_BD);
    if(raw){
      const rows = JSON.parse(raw);
      if(Array.isArray(rows)) return rows.map(normalizeBreakdown);
    }
  }catch(e){}
  return buildBreakdownSeeds();
}
function persistBreakdowns(){
  BREAKDOWNS = BREAKDOWNS.map(normalizeBreakdown);
  try{
    localStorage.setItem(LS_BD, JSON.stringify(BREAKDOWNS));
    localStorage.setItem(LS_BD_DIRTY, '1');
  }catch(e){
    toast('Could not save breakdowns locally. Large videos may exceed browser storage.');
  }
  refreshBreakdownBadge();
  refreshWOBadges();
}
function resetBreakdownsToSeed(){
  try{
    localStorage.removeItem(LS_BD);
    localStorage.removeItem(LS_BD_DIRTY);
  }catch(e){}
  BREAKDOWNS = buildBreakdownSeeds();
  refreshBreakdownBadge();
  refreshWOBadges();
  toast('Breakdowns reverted to the seeded log.');
}
function exportBreakdownsSnapshot(){
  const payload = {
    exportedAt:new Date().toISOString(),
    breakdowns:BREAKDOWNS
  };
  downloadText(JSON.stringify(payload, null, 2) + '\n', 'cmms_breakdowns_snapshot.json', 'application/json');
  clearBreakdownDirty();
  toast('cmms_breakdowns_snapshot.json downloaded.');
  if(current === 'breakdowns') go('breakdowns');
}
function nextBreakdownId(){
  let max = 0;
  BREAKDOWNS.forEach(row => {
    const match = /^BD-(\d+)$/.exec(row.id || '');
    if(match) max = Math.max(max, Number(match[1]));
  });
  return 'BD-' + String(max + 1).padStart(3, '0');
}
function nextBreakdownUpdateId(row){
  let max = 0;
  (row.updates || []).forEach(update => {
    const match = /^BDU-(\d+)$/.exec(update.id || '');
    if(match) max = Math.max(max, Number(match[1]));
  });
  return 'BDU-' + String(max + 1).padStart(3, '0');
}
function breakdownById(id){
  return BREAKDOWNS.find(row => row.id === id);
}
function activeBreakdownCount(){
  if(typeof BREAKDOWNS === 'undefined') return WOS.filter(w => w.type === 'Breakdown' && w.status !== 'Completed').length;
  return BREAKDOWNS.filter(row => row.status !== 'Closed').length;
}
function refreshBreakdownBadge(){
  const badge = $('#sb-bd');
  if(badge) badge.textContent = activeBreakdownCount();
}
let BREAKDOWNS = loadBreakdowns();
refreshBreakdownBadge();

/* ============================================================
   LIST VIEW
   ============================================================ */
function renderBreakdowns(){
  const dirty = breakdownDirty();
  const open = BREAKDOWNS.filter(row => row.status !== 'Closed').length;
  const critical = BREAKDOWNS.filter(row => row.status !== 'Closed' && row.severity === 'Critical').length;
  const linked = BREAKDOWNS.filter(row => row.woId).length;
  const avgDown = BREAKDOWNS.length ? (BREAKDOWNS.reduce((sum, row) => sum + (Number(row.downtimeHrs) || 0), 0) / BREAKDOWNS.length).toFixed(1) : '0.0';

  view.innerHTML = `
    <div class="page-head">
      <div><h1>Breakdowns</h1><div class="ph-sub">Capture failure events, downtime, root causes, and linked repair work orders.</div></div>
      <button class="btn btn-primary" onclick="openBreakdownModal('add')">+ Log Breakdown</button>
    </div>
    <div class="databar ${dirty ? '' : 'clean'}">
      ${dirty
        ? `<b>Unsaved changes</b><span>Breakdown log updates are stored in this browser.</span>`
        : `<b>In sync</b><span>Using the current local breakdown snapshot.</span>`}
      <span class="spacer"></span>
      <button class="btn btn-ghost btn-sm" onclick="exportBreakdownsSnapshot()">Export snapshot</button>
      ${dirty ? `<button class="btn btn-ghost btn-sm" onclick="confirmResetBreakdowns()">Revert</button>` : ''}
    </div>
    <div class="kpis" style="margin-bottom:18px">
      <div class="kpi"><div class="k-top"><div><div class="k-val">${open}</div><div class="k-label">Active Breakdowns</div></div><div class="k-ico ico-red">BD</div></div></div>
      <div class="kpi"><div class="k-top"><div><div class="k-val">${critical}</div><div class="k-label">Critical Open</div></div><div class="k-ico ico-orange">CR</div></div></div>
      <div class="kpi"><div class="k-top"><div><div class="k-val">${linked}</div><div class="k-label">Linked WOs</div></div><div class="k-ico ico-blue">WO</div></div></div>
      <div class="kpi"><div class="k-top"><div><div class="k-val">${avgDown}</div><div class="k-label">Avg Downtime (hrs)</div></div><div class="k-ico ico-steel">DT</div></div></div>
    </div>
    <div class="toolbar">
      <input class="tb-search" id="bd-q" placeholder="Search by breakdown no., title, target, reporter..." value="${esc(bdFilters.q)}">
      <select id="bd-status"><option value="">All Status</option>${BD_STATUSES.map(v => `<option ${bdFilters.status === v ? 'selected' : ''}>${v}</option>`).join('')}</select>
      <select id="bd-severity"><option value="">All Severity</option>${BD_SEVERITIES.map(v => `<option ${bdFilters.severity === v ? 'selected' : ''}>${v}</option>`).join('')}</select>
      <select id="bd-targetType"><option value="">All Targets</option>${BD_TARGETS.map(v => `<option ${bdFilters.targetType === v ? 'selected' : ''}>${v}</option>`).join('')}</select>
      <span class="tb-count" id="bd-count"></span>
    </div>
    <div class="tbl-wrap"><table>
      <thead><tr>
        <th>BD No.</th><th>Title</th><th>Target</th><th>Severity</th><th>Status</th><th>Started</th><th>Downtime</th><th style="text-align:right">Actions</th>
      </tr></thead>
      <tbody id="bd-rows"></tbody>
    </table></div>`;

  const apply = () => {
    bdFilters.q = $('#bd-q').value.toLowerCase();
    bdFilters.status = $('#bd-status').value;
    bdFilters.severity = $('#bd-severity').value;
    bdFilters.targetType = $('#bd-targetType').value;
    const rows = BREAKDOWNS.filter(row => {
      const hay = `${row.id} ${row.title} ${breakdownTargetName(row)} ${row.reportedBy} ${row.area}`.toLowerCase();
      return hay.includes(bdFilters.q)
        && (!bdFilters.status || row.status === bdFilters.status)
        && (!bdFilters.severity || row.severity === bdFilters.severity)
        && (!bdFilters.targetType || row.targetType === bdFilters.targetType);
    });
    $('#bd-rows').innerHTML = rows.length ? rows.map(row => `
      <tr onclick="go('breakdown-detail','${row.id}')">
        <td class="mono">${row.id}</td>
        <td><b>${esc(row.title)}</b><div style="font-size:11.5px;color:var(--ink-soft)">${esc(row.category)} | ${esc(row.area || '-')}</div></td>
        <td>${esc(breakdownTargetName(row))}</td>
        <td><span class="pill ${critClass(row.severity === 'Critical' ? 'Critical' : row.severity)}">${row.severity}</span></td>
        <td><span class="pill ${breakdownStatusClass(row.status)}">${row.status}</span></td>
        <td>${fmtDateTime(row.startedAt)}</td>
        <td>${Number(row.downtimeHrs || 0).toFixed(1)} hr</td>
        <td style="text-align:right;white-space:nowrap" onclick="event.stopPropagation()">
          ${row.woId ? `<button class="iconbtn" onclick="go('wo-detail','${row.woId}')">WO</button>` : `<button class="iconbtn" onclick="createBreakdownWO('${row.id}')">Make WO</button>`}
        </td>
      </tr>`).join('') : `<tr><td colspan="8" style="text-align:center;color:var(--ink-soft);padding:30px">No breakdowns match the current filters.</td></tr>`;
    $('#bd-count').textContent = `Showing ${rows.length} of ${BREAKDOWNS.length} breakdowns`;
  };
  ['bd-q','bd-status','bd-severity','bd-targetType'].forEach(id => {
    $('#' + id).addEventListener('input', apply);
    $('#' + id).addEventListener('change', apply);
  });
  apply();
}

/* ============================================================
   DETAIL VIEW
   ============================================================ */
function renderBreakdownDetail(id){
  const row = breakdownById(id);
  if(!row){ renderBreakdowns(); return; }
  const targetRoute = breakdownTargetRoute(row);
  const updates = [...(row.updates || [])].sort((a, b) => String(b.date).localeCompare(String(a.date)));

  let flow = '';
  if(row.status === 'Open'){
    flow = `<button class="btn btn-primary btn-sm" onclick="setBreakdownStatus('${row.id}','Diagnosing')">Start Diagnosis</button>
            <button class="btn btn-ghost btn-sm" onclick="createBreakdownWO('${row.id}')">${row.woId ? 'Open WO' : 'Create WO'}</button>`;
  }else if(row.status === 'Diagnosing'){
    flow = `<button class="btn btn-primary btn-sm" onclick="openBreakdownUpdateModal('${row.id}',false)">Log Update</button>
            <button class="btn btn-ghost btn-sm" onclick="setBreakdownStatus('${row.id}','Repairing')">Move to Repairing</button>
            <button class="btn btn-ghost btn-sm" onclick="createBreakdownWO('${row.id}')">${row.woId ? 'Open WO' : 'Create WO'}</button>`;
  }else if(row.status === 'Repairing'){
    flow = `<button class="btn btn-primary btn-sm" onclick="openBreakdownUpdateModal('${row.id}',true)">Close Breakdown</button>
            <button class="btn btn-ghost btn-sm" onclick="openBreakdownUpdateModal('${row.id}',false)">Log Update</button>
            <button class="btn btn-ghost btn-sm" onclick="createBreakdownWO('${row.id}')">${row.woId ? 'Open WO' : 'Create WO'}</button>`;
  }else if(row.status === 'Monitoring'){
    flow = `<button class="btn btn-primary btn-sm" onclick="openBreakdownUpdateModal('${row.id}',true)">Close Breakdown</button>
            <button class="btn btn-ghost btn-sm" onclick="openBreakdownUpdateModal('${row.id}',false)">Log Update</button>`;
  }else if(row.status === 'Closed'){
    flow = `<button class="btn btn-ghost btn-sm" onclick="setBreakdownStatus('${row.id}','Open')">Reopen</button>
            <button class="btn btn-ghost btn-sm" onclick="createBreakdownWO('${row.id}')">${row.woId ? 'Open WO' : 'Create WO'}</button>`;
  }

  view.innerHTML = `
    <div class="back" onclick="go('breakdowns')"><- Back to Breakdowns</div>
    <div class="detail-hero">
      <div style="width:96px;height:96px;border-radius:14px;flex-shrink:0;background:var(--steel-700);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff">
        <div style="font-size:24px">${row.severity}</div>
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:.5px">${row.status}</div>
      </div>
      <div class="dh-main">
        <h1>${esc(row.title)}</h1>
        <div class="dh-meta"><span class="mono">${row.id}</span> | ${esc(row.category)} | reported ${fmtDateTime(row.startedAt)} by ${esc(row.reportedBy || '-')}</div>
        <div class="dh-tags">
          <span class="pill ${critClass(row.severity === 'Critical' ? 'Critical' : row.severity)}">${row.severity}</span>
          <span class="pill ${breakdownStatusClass(row.status)}">${row.status}</span>
          <span class="pill pill-low">${esc(row.targetType)}</span>
        </div>
      </div>
      <div class="dh-actions">
        <button class="btn btn-primary" onclick="openBreakdownModal('edit','${row.id}')">Edit Breakdown</button>
        <button class="btn btn-danger" onclick="confirmDeleteBreakdown('${row.id}')">Delete</button>
      </div>
    </div>
    <div class="panel" style="margin-bottom:18px">
      <div class="panel-head"><b>Workflow</b><span style="font-size:12px;color:var(--ink-soft)">Current status: ${row.status}</span></div>
      <div style="padding:14px 17px;display:flex;gap:10px;flex-wrap:wrap">${flow || '<span style="color:var(--ink-soft);font-size:13px">No actions available.</span>'}</div>
    </div>
    <div class="statgrid">
      <div class="stat"><div class="s-label">Target</div><div class="s-val" style="font-size:14px"><a style="color:var(--orange-dark);cursor:pointer" onclick="go('${targetRoute}','${row.targetId}')">${esc(breakdownTargetName(row))}</a></div></div>
      <div class="stat"><div class="s-label">Started</div><div class="s-val" style="font-size:15px">${fmtDateTime(row.startedAt)}</div></div>
      <div class="stat"><div class="s-label">Downtime</div><div class="s-val">${Number(row.downtimeHrs || 0).toFixed(1)} hr</div></div>
      <div class="stat"><div class="s-label">WO Link</div><div class="s-val" style="font-size:14px">${row.woId ? `<a style="color:var(--orange-dark);cursor:pointer" onclick="go('wo-detail','${row.woId}')">${row.woId}</a>` : '-'}</div></div>
    </div>
    <div class="cols">
      <div>
        <div class="panel" style="margin-bottom:18px">
          <div class="panel-head"><b>Symptoms</b></div>
          <div class="panel-body" style="font-size:13px;line-height:1.55">${esc(row.symptoms) || '<span style="color:var(--ink-soft)">No symptoms recorded.</span>'}</div>
        </div>
        <div class="panel" style="margin-bottom:18px">
          <div class="panel-head"><b>Failure Analysis</b></div>
          <div class="panel-body">
            <div class="kv-list">
              <div><span>Suspected Cause</span><b>${esc(row.suspectedCause || '-')}</b></div>
              <div><span>Root Cause</span><b>${esc(row.rootCause || '-')}</b></div>
              <div><span>Impact</span><b>${esc(row.impact || '-')}</b></div>
              <div><span>Restored</span><b>${row.restoredAt ? fmtDateTime(row.restoredAt) : '-'}</b></div>
            </div>
          </div>
        </div>
        ${attachmentsGalleryHtml(row.attachments, 'Breakdown Photos / Videos')}
      </div>
      <div>
        <div class="panel" style="margin-bottom:18px">
          <div class="panel-head"><b>Breakdown Profile</b></div>
          <div class="panel-body">
            <div class="kv-list">
              <div><span>Area</span><b>${esc(row.area || '-')}</b></div>
              <div><span>Line</span><b>${esc(row.line || '-')}</b></div>
              <div><span>Shift</span><b>${esc(row.shift || '-')}</b></div>
              <div><span>Reported By</span><b>${esc(row.reportedBy || '-')}</b></div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="panel" style="margin-top:18px">
      <div class="panel-head"><b>Breakdown Updates</b><a onclick="openBreakdownUpdateModal('${row.id}',false)">Add update</a></div>
      ${updates.length ? `<div class="update-list">
        ${updates.map(update => `
          <div class="update-card">
            <div class="update-head">
              <div>
                <b>${esc(update.author || 'Update')}</b>
                <div class="update-sub">${fmtDateTime(update.date)} | ${update.status}</div>
              </div>
              <span class="pill ${breakdownStatusClass(update.status)}">${update.status}</span>
            </div>
            <div class="update-note">${esc(update.note || 'No note recorded.')}</div>
            ${(update.downtimeHrs || update.rootCause) ? `<div class="update-metrics">
              ${update.downtimeHrs ? `<span class="chip">+${update.downtimeHrs} downtime hr</span>` : ''}
              ${update.rootCause ? `<span class="chip">Root cause logged</span>` : ''}
            </div>` : ''}
            ${normalizeAttachments(update.attachments).length ? `<div class="attach-grid attach-grid-tight">${renderAttachmentCards(update.attachments)}</div>` : ''}
          </div>`).join('')}
      </div>` : `<div style="padding:22px 17px;color:var(--ink-soft);font-size:13px">No updates yet. Add diagnosis or repair progress to build the event history.</div>`}
    </div>`;
}

/* ============================================================
   CRUD
   ============================================================ */
function openBreakdownModal(mode, id){
  const editing = mode === 'edit';
  const row = editing ? breakdownById(id) : normalizeBreakdown({
    id:nextBreakdownId(),
    title:'',
    category:'Mechanical',
    severity:'High',
    status:'Open',
    targetType:'Asset',
    targetId:(ASSETS[0] && ASSETS[0].id) || '',
    area:'',
    line:'',
    startedAt:nowLocalValue(),
    restoredAt:'',
    reportedBy:currentUserName(),
    shift:SETTINGS.shiftLabel,
    symptoms:'',
    suspectedCause:'',
    rootCause:'',
    impact:'',
    downtimeHrs:0,
    woId:'',
    attachments:[],
    updates:[]
  });
  if(editing && !row){ toast('Breakdown not found.'); return; }
  const opts = bdTargetOptions();
  const assetOpts = opts.filter(item => item.type === 'Asset');
  const infraOpts = opts.filter(item => item.type === 'Infrastructure');
  modalHost.innerHTML = `
   <div class="modal">
    <div class="modal-head"><h3>${editing ? 'Edit Breakdown - ' + row.id : 'Log Breakdown - ' + row.id}</h3><div class="x" onclick="closeModal()">x</div></div>
    <div class="modal-body">
      <div class="form-err" id="form-err"></div>
      ${datalistHtml('bd-reporter-options', requesterOptions())}
      <div class="form-grid">
        <div class="field full"><label>Title <span class="req">*</span></label><input id="b-title" value="${esc(row.title)}" placeholder="e.g. Edger spindle trips during ramp-up"></div>
        <div class="field"><label>Category</label><select id="b-category">${BD_CATEGORIES.map(v => `<option ${row.category === v ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
        <div class="field"><label>Severity</label><select id="b-severity">${BD_SEVERITIES.map(v => `<option ${row.severity === v ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
        <div class="field"><label>Status</label><select id="b-status">${BD_STATUSES.map(v => `<option ${row.status === v ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
        <div class="field"><label>Target Type</label><select id="b-targetType" onchange="toggleBreakdownTargetFields()">${BD_TARGETS.map(v => `<option ${row.targetType === v ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
        <div class="field"><label>Reported By</label><input id="b-reportedBy" list="bd-reporter-options" value="${esc(row.reportedBy)}"></div>
        <div class="field full bd-target-asset"><label>Asset Target</label><select id="b-targetAsset">${assetOpts.map(item => `<option value="${item.id}" ${row.targetType === 'Asset' && row.targetId === item.id ? 'selected' : ''}>${esc(item.label)}</option>`).join('')}</select></div>
        <div class="field full bd-target-infra"><label>Infrastructure Target</label><select id="b-targetInfra">${infraOpts.map(item => `<option value="${item.id}" ${row.targetType === 'Infrastructure' && row.targetId === item.id ? 'selected' : ''}>${esc(item.label)}</option>`).join('')}</select></div>
        <div class="field"><label>Area</label><input id="b-area" value="${esc(row.area)}"></div>
        <div class="field"><label>Line / Cell</label><input id="b-line" value="${esc(row.line)}"></div>
        <div class="field"><label>Started At</label><input id="b-startedAt" type="datetime-local" value="${esc(row.startedAt)}"></div>
        <div class="field"><label>Downtime (hrs)</label><input id="b-downtimeHrs" type="number" min="0" step="0.1" value="${Number(row.downtimeHrs || 0)}"></div>
        <div class="field full"><label>Symptoms <span class="req">*</span></label><textarea id="b-symptoms">${esc(row.symptoms)}</textarea></div>
        <div class="field full"><label>Suspected Cause</label><textarea id="b-suspectedCause">${esc(row.suspectedCause)}</textarea></div>
        <div class="field full"><label>Impact</label><textarea id="b-impact">${esc(row.impact)}</textarea></div>
        ${attachmentsFieldHtml('b-attachments', 'Breakdown Photos / Videos', row.attachments)}
      </div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveBreakdown('${mode}','${editing ? row.id : ''}')">${editing ? 'Save Changes' : 'Create Breakdown'}</button>
    </div>
   </div>`;
  overlay.classList.add('show');
  toggleBreakdownTargetFields();
}
function toggleBreakdownTargetFields(){
  const targetType = $('#b-targetType') ? $('#b-targetType').value : 'Asset';
  document.querySelectorAll('.bd-target-asset').forEach(node => {
    node.style.display = targetType === 'Asset' ? '' : 'none';
  });
  document.querySelectorAll('.bd-target-infra').forEach(node => {
    node.style.display = targetType === 'Infrastructure' ? '' : 'none';
  });
}
async function saveBreakdown(mode, origId){
  const errBox = $('#form-err');
  const g = id => $('#b-' + id);
  const showErr = msg => {
    errBox.textContent = msg;
    errBox.classList.add('show');
  };
  errBox.classList.remove('show');
  ['title','symptoms','targetAsset','targetInfra'].forEach(key => {
    const node = g(key);
    if(node) node.classList.remove('bad');
  });
  const targetType = g('targetType').value;
  const targetId = targetType === 'Infrastructure' ? $('#b-targetInfra').value : $('#b-targetAsset').value;
  let newAttachments = [];
  try{
    newAttachments = await attachmentsFromInput('b-attachments');
  }catch(e){
    showErr('Could not read the selected photo or video files.');
    return;
  }
  const prev = mode === 'edit' ? breakdownById(origId) : null;
  const row = normalizeBreakdown({
    id:mode === 'add' ? nextBreakdownId() : origId,
    title:g('title').value.trim(),
    category:g('category').value,
    severity:g('severity').value,
    status:g('status').value,
    targetType,
    targetId,
    area:g('area').value.trim(),
    line:g('line').value.trim(),
    startedAt:g('startedAt').value || nowLocalValue(),
    restoredAt:prev ? prev.restoredAt : '',
    reportedBy:g('reportedBy').value.trim() || currentUserName(),
    shift:SETTINGS.shiftLabel,
    symptoms:g('symptoms').value.trim(),
    suspectedCause:g('suspectedCause').value.trim(),
    rootCause:prev ? prev.rootCause : '',
    impact:g('impact').value.trim(),
    downtimeHrs:Math.max(0, parseFloat(g('downtimeHrs').value) || 0),
    woId:prev ? prev.woId : '',
    attachments:[...(prev ? prev.attachments : []), ...newAttachments],
    updates:prev ? prev.updates : []
  });
  if(!row.title){ g('title').classList.add('bad'); showErr('Title is required.'); return; }
  if(!row.targetId){
    (targetType === 'Infrastructure' ? $('#b-targetInfra') : $('#b-targetAsset')).classList.add('bad');
    showErr('A target asset or infrastructure segment must be selected.');
    return;
  }
  if(!row.symptoms){ g('symptoms').classList.add('bad'); showErr('Symptoms are required.'); return; }
  if(mode === 'add'){
    BREAKDOWNS.push(row);
    persistBreakdowns();
    closeModal();
    toast(`${row.id} logged.`);
    go('breakdowns');
  }else{
    const idx = BREAKDOWNS.findIndex(item => item.id === origId);
    if(idx < 0){ showErr('Original breakdown no longer exists.'); return; }
    BREAKDOWNS[idx] = row;
    persistBreakdowns();
    closeModal();
    toast(`${origId} updated.`);
    go(current === 'breakdown-detail' ? 'breakdown-detail' : 'breakdowns', origId);
  }
}

/* ============================================================
   UPDATE / WORKFLOW
   ============================================================ */
function setBreakdownStatus(id, status){
  const row = breakdownById(id);
  if(!row) return;
  row.status = status;
  if(status !== 'Closed') row.restoredAt = '';
  persistBreakdowns();
  toast(`${id} -> ${status}`);
  renderBreakdownDetail(id);
}
function openBreakdownUpdateModal(id, closeMode){
  const row = breakdownById(id);
  if(!row){ toast('Breakdown not found.'); return; }
  const defaultStatus = closeMode ? 'Closed' : (row.status === 'Open' ? 'Diagnosing' : row.status);
  const options = closeMode ? ['Closed'] : ['Diagnosing','Repairing','Monitoring','Closed'];
  modalHost.innerHTML = `
   <div class="modal">
    <div class="modal-head"><h3>${closeMode ? 'Close Breakdown' : 'Breakdown Update'} - ${row.id}</h3><div class="x" onclick="closeModal()">x</div></div>
    <div class="modal-body">
      <div class="form-err" id="form-err"></div>
      ${datalistHtml('bd-author-options', technicianOptions())}
      <div class="form-grid">
        <div class="field"><label>Status After Update</label><select id="bu-status">${options.map(v => `<option ${v === defaultStatus ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
        <div class="field"><label>Author</label><input id="bu-author" list="bd-author-options" value="${esc(defaultTechnicianName() || currentUserName())}"></div>
        <div class="field"><label>Update Time</label><input id="bu-date" type="datetime-local" value="${nowLocalValue()}"></div>
        <div class="field"><label>Add Downtime (hrs)</label><input id="bu-downtimeHrs" type="number" min="0" step="0.1" value="0"></div>
        <div class="field full"><label>${closeMode ? 'Closeout Note' : 'Update Note'} <span class="req">*</span></label><textarea id="bu-note"></textarea></div>
        <div class="field full"><label>Root Cause</label><textarea id="bu-rootCause" placeholder="Capture the confirmed root cause if known.">${esc(row.rootCause || '')}</textarea></div>
        ${attachmentsFieldHtml('bu-attachments', closeMode ? 'Closeout Photos / Videos' : 'Update Photos / Videos', [])}
      </div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveBreakdownUpdate('${row.id}',${closeMode ? 'true' : 'false'})">${closeMode ? 'Close Breakdown' : 'Save Update'}</button>
    </div>
   </div>`;
  overlay.classList.add('show');
}
async function saveBreakdownUpdate(id, closeMode){
  const row = breakdownById(id);
  if(!row) return;
  const errBox = $('#form-err');
  const noteNode = $('#bu-note');
  const showErr = msg => {
    errBox.textContent = msg;
    errBox.classList.add('show');
  };
  errBox.classList.remove('show');
  noteNode.classList.remove('bad');
  let attachments = [];
  try{
    attachments = await attachmentsFromInput('bu-attachments');
  }catch(e){
    showErr('Could not read the selected photo or video files.');
    return;
  }
  const note = noteNode.value.trim();
  if(!note){
    noteNode.classList.add('bad');
    showErr('An update note is required.');
    return;
  }
  const status = closeMode ? 'Closed' : $('#bu-status').value;
  const rootCause = ($('#bu-rootCause').value || '').trim();
  const update = normalizeBreakdownUpdate({
    id:nextBreakdownUpdateId(row),
    date:$('#bu-date').value || nowLocalValue(),
    author:($('#bu-author').value || '').trim() || currentUserName(),
    status,
    note,
    downtimeHrs:Math.max(0, parseFloat($('#bu-downtimeHrs').value) || 0),
    rootCause,
    attachments
  }, status);
  row.updates = [...(row.updates || []), update];
  row.status = status;
  row.downtimeHrs = Math.round(((Number(row.downtimeHrs) || 0) + update.downtimeHrs) * 100) / 100;
  if(rootCause) row.rootCause = rootCause;
  if(status === 'Closed') row.restoredAt = update.date;
  persistBreakdowns();
  closeModal();
  toast(status === 'Closed' ? `${id} closed.` : `Update logged on ${id}.`);
  go('breakdown-detail', id);
}
function createBreakdownWO(id){
  const row = breakdownById(id);
  if(!row) return;
  if(row.woId){
    go('wo-detail', row.woId);
    return;
  }
  const wo = normalizeWORecord({
    id:nextWOId(),
    title:row.title,
    assetId:row.targetId,
    type:'Breakdown',
    priority:row.severity === 'Critical' ? 'High' : row.severity,
    status:'Open',
    technician:defaultTechnicianName(),
    requestedBy:row.reportedBy || currentUserName(),
    created:todayIso(),
    due:todayIso(),
    completed:'',
    description:`Breakdown ${row.id}\nTarget: ${row.targetType} - ${row.targetId}\nArea: ${row.area || '-'}\nSymptoms: ${row.symptoms}\nSuspected cause: ${row.suspectedCause || '-'}\nImpact: ${row.impact || '-'}`,
    resolution:'',
    labourHrs:0,
    downtimeHrs:Number(row.downtimeHrs) || 0,
    attachments:row.attachments,
    updates:[]
  });
  WOS.push(wo);
  persistWOs();
  row.woId = wo.id;
  if(['Open','Diagnosing'].includes(row.status)) row.status = 'Repairing';
  persistBreakdowns();
  toast(`Work order ${wo.id} created from ${row.id}.`);
  go('wo-detail', wo.id);
}

/* ============================================================
   DELETE / REVERT
   ============================================================ */
function confirmDeleteBreakdown(id){
  const row = breakdownById(id);
  if(!row) return;
  modalHost.innerHTML = `
   <div class="modal confirm-box">
    <div class="modal-head"><h3>Delete Breakdown</h3><div class="x" onclick="closeModal()">x</div></div>
    <div class="modal-body">
      <p>Delete <b>${row.id} - ${esc(row.title)}</b> from the breakdown log?</p>
      <p style="margin-top:10px;color:var(--ink-soft)">Any linked work order will remain in the system.</p>
    </div>
    <div class="modal-foot">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-danger" onclick="doDeleteBreakdown('${id}')">Delete</button>
    </div>
   </div>`;
  overlay.classList.add('show');
}
function doDeleteBreakdown(id){
  const idx = BREAKDOWNS.findIndex(row => row.id === id);
  if(idx >= 0) BREAKDOWNS.splice(idx, 1);
  persistBreakdowns();
  closeModal();
  toast(`Breakdown ${id} deleted.`);
  go('breakdowns');
}
function confirmResetBreakdowns(){
  modalHost.innerHTML = `
   <div class="modal confirm-box">
    <div class="modal-head"><h3>Revert Breakdowns</h3><div class="x" onclick="closeModal()">x</div></div>
    <div class="modal-body">
      <p>Discard all local breakdown edits and reload the seeded breakdown log?</p>
      <p style="margin-top:10px;color:var(--ink-soft)">Anything you have not exported will be lost.</p>
    </div>
    <div class="modal-foot">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-danger" onclick="closeModal();resetBreakdownsToSeed();go('breakdowns')">Revert to seed</button>
    </div>
   </div>`;
  overlay.classList.add('show');
}

ROUTES['breakdowns'] = renderBreakdowns;
ROUTES['breakdown-detail'] = renderBreakdownDetail;
