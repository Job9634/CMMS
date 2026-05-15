/* ============================================================
   CMMS - MODULE: PM SCHEDULE
   Loaded after cmms.js and cmms_workorders.js.
   ============================================================ */
const PM_TODAY = todayIso();
const PM_FREQ = {Daily:1, Weekly:7, Monthly:30, Quarterly:91, 'Semi-Annual':182, Annual:365};
const PM_FREQS = Object.keys(PM_FREQ);

/* ----- editable PM store (localStorage-backed) ----- */
const LS_PM = 'cmms_pms_v1';
const LS_PM_DIRTY = 'cmms_pms_dirty_v1';

function loadPMs(){
  try{
    const raw = localStorage.getItem(LS_PM);
    if(raw){
      const rows = JSON.parse(raw);
      if(Array.isArray(rows)) return rows;
    }
  }catch(e){}
  return JSON.parse(JSON.stringify(DB.pmSchedules || []));
}
function persistPMs(){
  try{
    localStorage.setItem(LS_PM, JSON.stringify(PMS));
    localStorage.setItem(LS_PM_DIRTY, '1');
  }catch(e){
    toast('Could not save PM schedules locally.');
  }
}
function pmDirty(){
  try{ return localStorage.getItem(LS_PM_DIRTY) === '1'; }
  catch(e){ return false; }
}
function clearPMDirty(){
  try{ localStorage.removeItem(LS_PM_DIRTY); }
  catch(e){}
}
function resetPMsToFile(){
  try{
    localStorage.removeItem(LS_PM);
    localStorage.removeItem(LS_PM_DIRTY);
  }catch(e){}
  PMS.length = 0;
  JSON.parse(JSON.stringify(DB.pmSchedules || [])).forEach(row => PMS.push(row));
  refreshPMBadge();
  toast('Reverted PM schedules to the data file.');
}
let PMS = loadPMs();

function refreshPMBadge(){
  const badge = $('#sb-pm');
  if(!badge) return;
  badge.textContent = PMS.filter(p => p.active && daysFromToday(p.nextDue) <= SETTINGS.pmDueSoonDays).length;
}
refreshPMBadge();

/* ----- helpers ----- */
function pmStatus(p){
  if(!p.active) return 'Inactive';
  const days = daysFromToday(p.nextDue);
  if(days < 0) return 'Overdue';
  if(days <= SETTINGS.pmDueSoonDays) return 'Due Soon';
  return 'Scheduled';
}
function pmStatusClass(status){
  return {Overdue:'pill-hold', 'Due Soon':'pill-open', Scheduled:'pill-done', Inactive:'pill-low'}[status] || 'pill-low';
}
function pmAssetName(id){
  const asset = ASSETS.find(a => a.id === id);
  return asset ? asset.name : '(unknown asset)';
}
function nextPMId(){
  let max = 0;
  PMS.forEach(p => {
    const match = /^PM-(\d+)$/.exec(p.id || '');
    if(match) max = Math.max(max, Number(match[1]));
  });
  return 'PM-' + String(max + 1).padStart(3, '0');
}
function addDays(iso, offset){
  const value = new Date(iso + 'T00:00:00');
  value.setDate(value.getDate() + offset);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

/* ----- view state ----- */
let pmView = 'list';
let pmFilters = {q:'', freq:'', status:''};
let pmCalMonth = PM_TODAY.slice(0, 7);

/* ============================================================
   MAIN VIEW
   ============================================================ */
function pmKPIs(){
  const active = PMS.filter(p => p.active).length;
  const dueWeek = PMS.filter(p => p.active && daysFromToday(p.nextDue) >= 0 && daysFromToday(p.nextDue) <= SETTINGS.pmDueSoonDays).length;
  const overdue = PMS.filter(p => p.active && daysFromToday(p.nextDue) < 0).length;
  const inactive = PMS.filter(p => !p.active).length;
  return `<div class="kpis">
    <div class="kpi"><div class="k-top"><div><div class="k-val">${active}</div><div class="k-label">Active Schedules</div></div><div class="k-ico ico-blue">PM</div></div></div>
    <div class="kpi"><div class="k-top"><div><div class="k-val">${dueWeek}</div><div class="k-label">Due Soon</div></div><div class="k-ico ico-orange">DU</div></div></div>
    <div class="kpi"><div class="k-top"><div><div class="k-val" style="color:${overdue ? 'var(--red)' : 'inherit'}">${overdue}</div><div class="k-label">Overdue</div></div><div class="k-ico ico-red">OD</div></div></div>
    <div class="kpi"><div class="k-top"><div><div class="k-val">${inactive}</div><div class="k-label">Inactive</div></div><div class="k-ico ico-steel">IN</div></div></div>
  </div>`;
}

function renderPM(){
  const dirty = pmDirty();
  view.innerHTML = `
    <div class="page-head">
      <div><h1>PM Schedule</h1><div class="ph-sub">Preventive maintenance schedules and the upcoming PM calendar.</div></div>
      <button class="btn btn-primary" onclick="openPMModal('add')">+ New PM Schedule</button>
    </div>
    <div class="databar ${dirty ? '' : 'clean'}">
      ${dirty
        ? `<b>Unsaved changes</b><span>PM edits are stored in this browser but not yet written to the data file.</span>`
        : `<b>In sync</b><span>PM schedules match the <span class="mono">CMMS_Data/pm_schedule.js</span> data file.</span>`}
      <span class="spacer"></span>
      <button class="btn btn-ghost btn-sm" onclick="exportPMs()">Export pm_schedule.js</button>
      ${dirty ? `<button class="btn btn-ghost btn-sm" onclick="confirmResetPMs()">Revert</button>` : ''}
    </div>
    ${pmKPIs()}
    <div style="margin:18px 0 14px">
      <div class="viewtoggle">
        <button class="${pmView === 'list' ? 'active' : ''}" onclick="setPMView('list')">List</button>
        <button class="${pmView === 'calendar' ? 'active' : ''}" onclick="setPMView('calendar')">Calendar</button>
      </div>
    </div>
    <div id="pm-body"></div>`;
  if(pmView === 'calendar') $('#pm-body').innerHTML = renderPMCalendar();
  else renderPMList();
}
function setPMView(viewMode){
  pmView = viewMode;
  renderPM();
}

/* ============================================================
   LIST VIEW
   ============================================================ */
function renderPMList(){
  $('#pm-body').innerHTML = `
    <div class="toolbar">
      <input class="tb-search" id="pf-q" placeholder="Search by PM no., title, asset, technician..." value="${esc(pmFilters.q)}">
      <select id="pf-freq"><option value="">All Frequencies</option>${PM_FREQS.map(v => `<option ${pmFilters.freq === v ? 'selected' : ''}>${v}</option>`).join('')}</select>
      <select id="pf-status"><option value="">All Status</option>${['Overdue','Due Soon','Scheduled','Inactive'].map(v => `<option ${pmFilters.status === v ? 'selected' : ''}>${v}</option>`).join('')}</select>
      <span class="tb-count" id="pf-count"></span>
    </div>
    <div class="tbl-wrap"><table>
      <thead><tr>
        <th>PM No.</th><th>Title</th><th>Asset</th><th>Frequency</th><th>Last Done</th>
        <th>Next Due</th><th>Technician</th><th>Status</th><th style="text-align:right">Actions</th>
      </tr></thead>
      <tbody id="pm-rows"></tbody>
    </table></div>`;

  const apply = () => {
    pmFilters.q = $('#pf-q').value.toLowerCase();
    pmFilters.freq = $('#pf-freq').value;
    pmFilters.status = $('#pf-status').value;
    const rows = PMS.filter(p => {
      const hay = `${p.id} ${p.title} ${p.assetId} ${pmAssetName(p.assetId)} ${p.technician}`.toLowerCase();
      return hay.includes(pmFilters.q)
        && (!pmFilters.freq || p.frequency === pmFilters.freq)
        && (!pmFilters.status || pmStatus(p) === pmFilters.status);
    });
    $('#pm-rows').innerHTML = rows.length ? rows.map(p => {
      const status = pmStatus(p);
      const days = daysFromToday(p.nextDue);
      const hint = !p.active ? '' : (days < 0 ? ` <span style="color:var(--red);font-size:11px">${Math.abs(days)}d late</span>` : ` <span style="color:var(--ink-soft);font-size:11px">in ${days}d</span>`);
      return `<tr onclick="go('pm-detail','${p.id}')">
        <td class="mono">${p.id}</td>
        <td><b>${esc(p.title)}</b></td>
        <td><span class="mono">${p.assetId}</span> <span style="color:var(--ink-soft)">${esc(pmAssetName(p.assetId))}</span></td>
        <td>${p.frequency}</td>
        <td>${fmtDate(p.lastDone)}</td>
        <td style="${status === 'Overdue' ? 'color:var(--red);font-weight:600' : ''}">${fmtDate(p.nextDue)}${hint}</td>
        <td>${esc(p.technician) || '<span style="color:var(--ink-soft)">Unassigned</span>'}</td>
        <td><span class="pill ${pmStatusClass(status)}">${status}</span></td>
        <td style="text-align:right;white-space:nowrap" onclick="event.stopPropagation()">
          <button class="iconbtn" title="Edit" onclick="openPMModal('edit','${p.id}')">Edit</button>
          <button class="iconbtn del" title="Delete" onclick="confirmDeletePM('${p.id}')">Del</button>
        </td>
      </tr>`;
    }).join('') : `<tr><td colspan="9" style="text-align:center;color:var(--ink-soft);padding:30px">No PM schedules match the current filters.</td></tr>`;
    $('#pf-count').textContent = `Showing ${rows.length} of ${PMS.length} schedules`;
  };
  ['pf-q','pf-freq','pf-status'].forEach(id => {
    $('#' + id).addEventListener('input', apply);
    $('#' + id).addEventListener('change', apply);
  });
  apply();
}

/* ============================================================
   CALENDAR VIEW
   ============================================================ */
function renderPMCalendar(){
  const [year, month] = pmCalMonth.split('-').map(Number);
  const first = new Date(year, month - 1, 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const prevMonthDays = new Date(year, month - 1, 0).getDate();
  const monthLabel = first.toLocaleDateString('en-GB', {month:'long', year:'numeric'});
  const byDate = {};
  PMS.forEach(p => {
    if(p.active){
      (byDate[p.nextDue] = byDate[p.nextDue] || []).push(p);
    }
  });

  let cells = '';
  for(let i = 0; i < 42; i++){
    let dayNum;
    let iso = null;
    let cls = 'cal-day';
    if(i < startDow){
      dayNum = prevMonthDays - startDow + 1 + i;
      cls += ' other';
    }else if(i < startDow + daysInMonth){
      dayNum = i - startDow + 1;
      iso = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      if(iso === PM_TODAY) cls += ' today';
    }else{
      dayNum = i - startDow - daysInMonth + 1;
      cls += ' other';
    }

    let chips = '';
    if(iso && byDate[iso]){
      chips = byDate[iso].map(p => {
        const status = pmStatus(p);
        const chipClass = status === 'Overdue' ? 'overdue' : (status === 'Due Soon' ? 'due' : 'ok');
        return `<span class="cal-chip ${chipClass}" title="${esc(p.id)} - ${esc(p.title)}" onclick="event.stopPropagation();go('pm-detail','${p.id}')">${p.id} · ${esc(pmAssetName(p.assetId))}</span>`;
      }).join('');
    }
    cells += `<div class="${cls}"><div class="d-num">${dayNum}</div>${chips}</div>`;
  }

  const dows = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => `<div class="cal-dow">${d}</div>`).join('');
  return `
    <div class="pm-cal-head">
      <button class="pm-cal-nav" onclick="pmCalNav(-1)"><</button>
      <b>${monthLabel}</b>
      <button class="pm-cal-nav" onclick="pmCalNav(1)">></button>
      <span style="font-size:12px;color:var(--ink-soft)">PM next-due dates. Click a chip to open the schedule.</span>
    </div>
    <div class="pm-cal">${dows}${cells}</div>`;
}
function pmCalNav(delta){
  let [year, month] = pmCalMonth.split('-').map(Number);
  month += delta;
  if(month < 1){ month = 12; year--; }
  if(month > 12){ month = 1; year++; }
  pmCalMonth = `${year}-${String(month).padStart(2, '0')}`;
  renderPM();
}

/* ============================================================
   DETAIL VIEW
   ============================================================ */
function renderPMDetail(id){
  const p = PMS.find(row => row.id === id);
  if(!p){ renderPM(); return; }
  const asset = ASSETS.find(a => a.id === p.assetId);
  const status = pmStatus(p);
  const days = daysFromToday(p.nextDue);
  const tasks = (p.tasks || '').split(';').map(t => t.trim()).filter(Boolean);
  const statusColor = {Overdue:'var(--red)', 'Due Soon':'var(--orange)', Scheduled:'var(--green)', Inactive:'var(--steel-600)'}[status];
  const relatedWOs = WOS.filter(w => w.requestedBy === 'PM Schedule ' + p.id);

  view.innerHTML = `
    <div class="back" onclick="go('pm')"><- Back to PM Schedule</div>
    <div class="detail-hero">
      <div style="width:96px;height:96px;border-radius:14px;flex-shrink:0;background:${statusColor};display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff">
        <div style="font-size:26px">PM</div>
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:.5px;margin-top:4px;text-align:center;padding:0 4px">${status}</div>
      </div>
      <div class="dh-main">
        <h1>${esc(p.title)}</h1>
        <div class="dh-meta"><span class="mono">${p.id}</span> · ${p.frequency} PM · ${esc(p.technician) || 'Unassigned'}</div>
        <div class="dh-tags">
          <span class="pill ${pmStatusClass(status)}">${status}</span>
          <span class="pill ${critClass(p.priority)}">${p.priority} priority</span>
          <span class="pill pill-low">${p.frequency}</span>
          ${!p.active ? '<span class="pill pill-low">Inactive</span>' : ''}
        </div>
      </div>
      <div class="dh-actions">
        <button class="btn btn-primary" onclick="openPMModal('edit','${p.id}')">Edit</button>
        <button class="btn btn-danger" onclick="confirmDeletePM('${p.id}')">Delete</button>
      </div>
    </div>
    <div class="panel" style="margin-bottom:18px">
      <div class="panel-head"><b>Schedule Actions</b><span style="font-size:12px;color:var(--ink-soft)">Next due ${fmtDate(p.nextDue)}${p.active ? ' (' + (days < 0 ? Math.abs(days) + ' days overdue' : 'in ' + days + ' days') + ')' : ''}</span></div>
      <div style="padding:14px 17px;display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn btn-primary btn-sm" onclick="completePM('${p.id}')">Log PM Completed</button>
        <button class="btn btn-ghost btn-sm" onclick="raiseWOFromPM('${p.id}')">Raise Work Order</button>
      </div>
    </div>
    <div class="statgrid">
      <div class="stat"><div class="s-label">Asset</div>
        <div class="s-val" style="font-size:14px"><a style="color:var(--orange-dark);cursor:pointer" onclick="go('asset-detail','${p.assetId}')">${p.assetId}</a></div>
        <div style="font-size:11px;color:var(--ink-soft);margin-top:2px">${esc(asset ? asset.name : 'unknown asset')}</div></div>
      <div class="stat"><div class="s-label">Frequency</div><div class="s-val" style="font-size:16px">${p.frequency}</div></div>
      <div class="stat"><div class="s-label">Last Done</div><div class="s-val" style="font-size:15px">${fmtDate(p.lastDone)}</div></div>
      <div class="stat"><div class="s-label">Next Due</div><div class="s-val" style="font-size:15px;${status === 'Overdue' ? 'color:var(--red)' : ''}">${fmtDate(p.nextDue)}</div></div>
    </div>
    <div class="panel" style="margin-bottom:18px">
      <div class="panel-head"><b>PM Task Checklist</b><span style="font-size:12px;color:var(--ink-soft)">Estimated ${p.estHours || 0} h</span></div>
      ${tasks.length
        ? `<ul class="pm-tasklist">${tasks.map(task => `<li>${esc(task)}</li>`).join('')}</ul>`
        : '<div style="padding:18px 17px;color:var(--ink-soft);font-size:13px">No tasks defined.</div>'}
    </div>
    <div class="panel">
      <div class="panel-head"><b>Work Orders raised from this PM</b><span style="font-size:12px;color:var(--ink-soft)">${relatedWOs.length} total</span></div>
      ${relatedWOs.length ? relatedWOs.map(w => `
        <div class="wo-line" style="cursor:pointer" onclick="go('wo-detail','${w.id}')">
          <div class="wo-pri" style="background:${priColor(w.priority)}"></div>
          <div style="flex:1;min-width:0"><b style="font-size:13px;display:block"><span class="mono">${w.id}</span> · ${esc(w.title)}</b>
            <span style="font-size:11.5px;color:var(--ink-soft)">${w.type} · ${esc(w.technician) || 'Unassigned'} · created ${fmtDate(w.created)}</span></div>
          <span class="pill ${woStatusClass(w.status)}" style="width:92px;text-align:center">${w.status}</span>
        </div>`).join('')
        : '<div style="padding:22px 17px;color:var(--ink-soft);font-size:13px">No work orders raised from this PM yet.</div>'}
    </div>`;
}

/* ============================================================
   ACTIONS
   ============================================================ */
function completePM(id){
  const p = PMS.find(row => row.id === id);
  if(!p) return;
  const interval = PM_FREQ[p.frequency] || 30;
  p.lastDone = PM_TODAY;
  p.nextDue = addDays(PM_TODAY, interval);
  persistPMs();
  refreshPMBadge();
  const wo = {
    id: nextWOId(),
    title: 'PM - ' + p.title,
    assetId: p.assetId,
    type: 'Preventive',
    priority: p.priority || 'Medium',
    status: 'Completed',
    technician: p.technician || '',
    requestedBy: 'PM Schedule ' + p.id,
    created: PM_TODAY,
    due: PM_TODAY,
    completed: PM_TODAY,
    description: p.tasks || '',
    resolution: 'PM completed per schedule.',
    labourHrs: p.estHours || 0,
    downtimeHrs: 0
  };
  WOS.push(wo);
  persistWOs();
  refreshWOBadges();
  toast(`PM ${id} logged. Next due ${fmtDate(p.nextDue)}.`);
  renderPMDetail(id);
}
function raiseWOFromPM(id){
  const p = PMS.find(row => row.id === id);
  if(!p) return;
  const wo = {
    id: nextWOId(),
    title: 'PM - ' + p.title,
    assetId: p.assetId,
    type: 'Preventive',
    priority: p.priority || 'Medium',
    status: 'Open',
    technician: p.technician || '',
    requestedBy: 'PM Schedule ' + p.id,
    created: PM_TODAY,
    due: p.nextDue || PM_TODAY,
    completed: '',
    description: p.tasks || '',
    resolution: '',
    labourHrs: 0,
    downtimeHrs: 0
  };
  WOS.push(wo);
  persistWOs();
  refreshWOBadges();
  toast(`Work order ${wo.id} raised from PM ${id}.`);
  go('wo-detail', wo.id);
}

/* ============================================================
   CREATE / EDIT MODAL
   ============================================================ */
function openPMModal(mode, id){
  const editing = mode === 'edit';
  const p = editing ? PMS.find(row => row.id === id) : {
    id: nextPMId(),
    title:'',
    assetId:(ASSETS[0] && ASSETS[0].id) || '',
    frequency:SETTINGS.defaultPMFrequency || 'Monthly',
    tasks:'',
    technician:'',
    priority:'Medium',
    estHours:1,
    lastDone:PM_TODAY,
    nextDue:'',
    active:true
  };
  if(editing && !p){ toast('PM schedule not found.'); return; }

  const sel = (value, values) => values.map(v => `<option ${v === value ? 'selected' : ''}>${v}</option>`).join('');
  const assetOpts = [...ASSETS].sort((a, b) => a.id.localeCompare(b.id))
    .map(a => `<option value="${a.id}" ${a.id === p.assetId ? 'selected' : ''}>${a.id} - ${esc(a.name)}</option>`).join('');

  modalHost.innerHTML = `
   <div class="modal">
    <div class="modal-head"><h3>${editing ? 'Edit PM Schedule - ' + p.id : 'New PM Schedule - ' + p.id}</h3><div class="x" onclick="closeModal()">x</div></div>
    <div class="modal-body">
      <div class="form-err" id="form-err"></div>
      ${datalistHtml('pm-technician-options', technicianOptions())}
      <div class="form-grid">
        <div class="field full"><label>Title <span class="req">*</span></label><input id="p-title" value="${esc(p.title)}" placeholder="e.g. Monthly lubrication and inspection"></div>
        <div class="field"><label>Asset <span class="req">*</span></label><select id="p-assetId">${assetOpts}</select></div>
        <div class="field"><label>Frequency</label><select id="p-frequency">${sel(p.frequency, PM_FREQS)}</select></div>
        <div class="field"><label>Priority</label><select id="p-priority">${sel(p.priority, ['High','Medium','Low'])}</select></div>
        <div class="field"><label>Technician</label><input id="p-technician" list="pm-technician-options" value="${esc(p.technician)}" placeholder="e.g. T. Somchai"></div>
        <div class="field"><label>Estimated Hours</label><input id="p-estHours" type="number" min="0" step="0.5" value="${p.estHours || 0}"></div>
        <div class="field"><label>Active</label><select id="p-active"><option value="yes" ${p.active ? 'selected' : ''}>Active</option><option value="no" ${!p.active ? 'selected' : ''}>Inactive</option></select></div>
        <div class="field"><label>Last Done</label><input id="p-lastDone" type="date" value="${esc(p.lastDone)}"></div>
        <div class="field"><label>Next Due ${editing ? '' : '(auto from Last Done if blank)'}</label><input id="p-nextDue" type="date" value="${esc(p.nextDue)}"></div>
        <div class="field full"><label>PM Task Checklist <span style="text-transform:none;font-weight:400;color:var(--ink-soft)">- separate tasks with semicolons ( ; )</span></label><textarea id="p-tasks" placeholder="Check oil level; inspect belts; clean air filter; log readings">${esc(p.tasks)}</textarea></div>
      </div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="savePM('${mode}','${editing ? p.id : ''}')">${editing ? 'Save Changes' : 'Create PM Schedule'}</button>
    </div>
   </div>`;
  overlay.classList.add('show');
  setTimeout(() => {
    const focusNode = $('#p-title');
    if(focusNode) focusNode.focus();
  }, 50);
}

function savePM(mode, origId){
  const g = id => $('#p-' + id);
  const errBox = $('#form-err');
  const showErr = msg => {
    errBox.textContent = msg;
    errBox.classList.add('show');
  };
  errBox.classList.remove('show');
  ['title','assetId'].forEach(key => {
    const node = g(key);
    if(node) node.classList.remove('bad');
  });

  const lastDone = g('lastDone').value;
  const frequency = g('frequency').value;
  let nextDue = g('nextDue').value;
  if(!nextDue && lastDone) nextDue = addDays(lastDone, PM_FREQ[frequency] || 30);

  const rec = {
    id: mode === 'add' ? nextPMId() : origId,
    title: g('title').value.trim(),
    assetId: g('assetId').value,
    frequency,
    tasks: g('tasks').value.trim(),
    technician: g('technician').value.trim(),
    priority: g('priority').value,
    estHours: Math.max(0, parseFloat(g('estHours').value) || 0),
    lastDone,
    nextDue,
    active: g('active').value === 'yes'
  };

  if(!rec.title){ g('title').classList.add('bad'); showErr('Title is required.'); return; }
  if(!rec.assetId){ g('assetId').classList.add('bad'); showErr('An asset must be selected.'); return; }
  if(!rec.nextDue){ showErr('Set a Next Due date, or a Last Done date so it can be auto-calculated.'); return; }

  if(mode === 'add'){
    PMS.push(rec);
    if(rec.technician) mergeIntoSettingList('technicians', rec.technician);
    persistPMs();
    refreshPMBadge();
    closeModal();
    toast(`${rec.id} created.`);
    go('pm');
  }else{
    const idx = PMS.findIndex(row => row.id === origId);
    if(idx < 0){ showErr('Original PM schedule no longer exists.'); return; }
    PMS[idx] = rec;
    if(rec.technician) mergeIntoSettingList('technicians', rec.technician);
    persistPMs();
    refreshPMBadge();
    closeModal();
    toast(`${origId} updated.`);
    go(current === 'pm-detail' ? 'pm-detail' : 'pm', origId);
  }
}

/* ============================================================
   DELETE / REVERT / EXPORT
   ============================================================ */
function confirmDeletePM(id){
  const p = PMS.find(row => row.id === id);
  if(!p) return;
  modalHost.innerHTML = `
   <div class="modal confirm-box">
    <div class="modal-head"><h3>Delete PM Schedule</h3><div class="x" onclick="closeModal()">x</div></div>
    <div class="modal-body">
      <p>Delete <b>${p.id} - ${esc(p.title)}</b>?</p>
      <p style="margin-top:10px;color:var(--ink-soft)">This change is stored in your browser. Use <b>Export pm_schedule.js</b> to make it permanent.</p>
    </div>
    <div class="modal-foot">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-danger" onclick="doDeletePM('${id}')">Delete</button>
    </div>
   </div>`;
  overlay.classList.add('show');
}
function doDeletePM(id){
  const idx = PMS.findIndex(row => row.id === id);
  if(idx >= 0){
    PMS.splice(idx, 1);
    persistPMs();
    refreshPMBadge();
  }
  closeModal();
  toast(`PM schedule ${id} deleted.`);
  go('pm');
}
function confirmResetPMs(){
  modalHost.innerHTML = `
   <div class="modal confirm-box">
    <div class="modal-head"><h3>Revert PM Schedules</h3><div class="x" onclick="closeModal()">x</div></div>
    <div class="modal-body">
      <p>Discard all local PM-schedule edits and reload from the original <span class="mono">CMMS_Data/pm_schedule.js</span> file?</p>
      <p style="margin-top:10px;color:var(--ink-soft)">Anything you have not exported will be lost.</p>
    </div>
    <div class="modal-foot">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-danger" onclick="closeModal(); resetPMsToFile(); go('pm')">Revert to file</button>
    </div>
   </div>`;
  overlay.classList.add('show');
}
function exportPMs(){
  const header =
'/* ============================================================\n' +
'   CMMS DATA FILE - Preventive Maintenance Schedules\n' +
'   Exported from the CMMS app on ' + new Date().toLocaleString('en-GB') + '\n' +
'   Replace CMMS_Data/pm_schedule.js with this file to make edits permanent.\n' +
'   ============================================================ */\n' +
'window.CMMS_DB = window.CMMS_DB || {};\n' +
'window.CMMS_DB.pmSchedules = ';
  const content = header + JSON.stringify(PMS, null, 2) + ';\n';
  downloadText(content, 'pm_schedule.js', 'text/javascript');
  clearPMDirty();
  toast('pm_schedule.js downloaded.');
  if(current === 'pm') go('pm');
}

/* ----- register routes ----- */
ROUTES['pm'] = renderPM;
ROUTES['pm-detail'] = renderPMDetail;
