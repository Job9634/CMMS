/* ============================================================
   CMMS - MODULE: SERVICE REQUESTS
   Intake queue before work becomes an official work order.
   ============================================================ */
const LS_REQ = 'cmms_requests_v1';
const LS_REQ_DIRTY = 'cmms_requests_dirty_v1';
const REQ_STATUSES = ['New','Screening','Approved','Converted','Rejected','Completed'];
const REQ_PRIORITIES = ['High','Medium','Low'];
const REQ_TYPES = ['Breakdown','Utility','Safety','Quality Support','Inspection','General Support'];
const REQ_TARGETS = ['Asset','Infrastructure','General Area'];

let reqFilters = {q:'', status:'', priority:'', type:''};

function reqTargetOptions(){
  const infraRows = typeof INFRA !== 'undefined' ? INFRA : [];
  return [
    ...ASSETS.map(a => ({type:'Asset', id:a.id, label:`${a.id} - ${a.name}`})),
    ...infraRows.map(row => ({type:'Infrastructure', id:row.id, label:`${row.id} - ${row.name}`}))
  ];
}
function normalizeRequestRecord(row){
  return Object.assign({}, row || {}, {
    id:String((row && row.id) || '').trim(),
    title:String((row && row.title) || '').trim(),
    type:REQ_TYPES.includes(row && row.type) ? row.type : 'General Support',
    priority:REQ_PRIORITIES.includes(row && row.priority) ? row.priority : 'Medium',
    status:REQ_STATUSES.includes(row && row.status) ? row.status : 'New',
    requester:String((row && row.requester) || '').trim(),
    department:String((row && row.department) || '').trim(),
    targetType:REQ_TARGETS.includes(row && row.targetType) ? row.targetType : 'General Area',
    targetId:String((row && row.targetId) || '').trim(),
    area:String((row && row.area) || '').trim(),
    created:String((row && row.created) || todayIso()).trim() || todayIso(),
    due:String((row && row.due) || '').trim(),
    symptoms:String((row && row.symptoms) || '').trim(),
    actionNeeded:String((row && row.actionNeeded) || '').trim(),
    woId:String((row && row.woId) || '').trim(),
    attachments:normalizeAttachments(row && row.attachments)
  });
}
function buildRequestSeeds(){
  const firstAsset = ASSETS[0] ? ASSETS[0].id : '';
  const secondAsset = ASSETS[1] ? ASSETS[1].id : firstAsset;
  return [
    normalizeRequestRecord({
      id:'REQ-001',
      title:'Compressed air pressure low at edging benches',
      type:'Utility',
      priority:'High',
      status:'Screening',
      requester:'Surface Supervisor',
      department:'Edging',
      targetType:'Infrastructure',
      targetId:'INF-002',
      area:'Edging line 2',
      created:addDays(todayIso(), -1),
      due:addDays(todayIso(), 1),
      symptoms:'Tools slow down during peak production and auto clamp cycles fail intermittently.',
      actionNeeded:'Leak survey and pressure verification required.',
      woId:'',
      attachments:[]
    }),
    normalizeRequestRecord({
      id:'REQ-002',
      title:'Cooling water drip near polishing exchanger',
      type:'Breakdown',
      priority:'High',
      status:'Approved',
      requester:'Polishing Leader',
      department:'Surface',
      targetType:'Infrastructure',
      targetId:'INF-005',
      area:'Surface utility platform',
      created:addDays(todayIso(), -2),
      due:addDays(todayIso(), 0),
      symptoms:'Small drip visible during shift startup, increasing after 20 minutes.',
      actionNeeded:'Inspect support and elbow joint before leak worsens.',
      woId:'',
      attachments:[]
    }),
    normalizeRequestRecord({
      id:'REQ-003',
      title:'Polisher guard interlock intermittently fails',
      type:'Safety',
      priority:'High',
      status:'Converted',
      requester:'HC Supervisor',
      department:'Surface',
      targetType:'Asset',
      targetId:secondAsset,
      area:'Surface line A',
      created:addDays(todayIso(), -4),
      due:addDays(todayIso(), -1),
      symptoms:'Machine stops with door closed and resets after tapping the switch housing.',
      actionNeeded:'Check interlock switch and relay wiring.',
      woId:'WO-0007',
      attachments:[]
    }),
    normalizeRequestRecord({
      id:'REQ-004',
      title:'Waste-water line draining slowly after tank cleaning',
      type:'Utility',
      priority:'Medium',
      status:'New',
      requester:'HC Leader',
      department:'HC',
      targetType:'Infrastructure',
      targetId:'INF-003',
      area:'Neutralization tank inlet',
      created:todayIso(),
      due:addDays(todayIso(), 2),
      symptoms:'Floor crew reported slower discharge and pooling near the pit.',
      actionNeeded:'Check solids build-up and flush if needed.',
      woId:'',
      attachments:[]
    }),
    normalizeRequestRecord({
      id:'REQ-005',
      title:'Need preventive inspection on backup transfer pump',
      type:'Inspection',
      priority:'Low',
      status:'Completed',
      requester:'Utility Technician',
      department:'Utilities',
      targetType:'Asset',
      targetId:firstAsset,
      area:'Pump room',
      created:addDays(todayIso(), -10),
      due:addDays(todayIso(), -5),
      symptoms:'No fault, but standby pump has not been tested this month.',
      actionNeeded:'Run functional check and record readings.',
      woId:'WO-0003',
      attachments:[]
    })
  ];
}
function reqDirty(){
  try{ return localStorage.getItem(LS_REQ_DIRTY) === '1'; }
  catch(e){ return false; }
}
function clearReqDirty(){
  try{ localStorage.removeItem(LS_REQ_DIRTY); }
  catch(e){}
}
function loadRequests(){
  try{
    const raw = localStorage.getItem(LS_REQ);
    if(raw){
      const rows = JSON.parse(raw);
      if(Array.isArray(rows)) return rows.map(normalizeRequestRecord);
    }
  }catch(e){}
  return buildRequestSeeds();
}
function persistRequests(){
  REQUESTS = REQUESTS.map(normalizeRequestRecord);
  try{
    localStorage.setItem(LS_REQ, JSON.stringify(REQUESTS));
    localStorage.setItem(LS_REQ_DIRTY, '1');
  }catch(e){
    toast('Could not save service requests locally. Large videos may exceed browser storage.');
  }
  refreshRequestBadge();
}
function resetRequestsToSeed(){
  try{
    localStorage.removeItem(LS_REQ);
    localStorage.removeItem(LS_REQ_DIRTY);
  }catch(e){}
  REQUESTS = buildRequestSeeds();
  refreshRequestBadge();
  toast('Service requests reverted to the seed set.');
}
function exportRequestsSnapshot(){
  const payload = {
    exportedAt:new Date().toISOString(),
    requests:REQUESTS.map(normalizeRequestRecord)
  };
  downloadText(JSON.stringify(payload, null, 2) + '\n', 'cmms_service_requests_snapshot.json', 'application/json');
  clearReqDirty();
  refreshRequestBadge();
  toast('cmms_service_requests_snapshot.json downloaded.');
  if(current === 'requests') go('requests');
}

let REQUESTS = loadRequests();

function requestById(id){ return REQUESTS.find(row => row.id === id); }
function requestStatusClass(status){
  return {
    New:'pill-open',
    Screening:'pill-med',
    Approved:'pill-high',
    Converted:'pill-done',
    Rejected:'pill-low',
    Completed:'pill-done'
  }[status] || 'pill-low';
}
function requestTargetName(req){
  if(req.targetType === 'Asset'){
    const asset = ASSETS.find(a => a.id === req.targetId);
    return asset ? asset.name : req.targetId || 'General area';
  }
  if(req.targetType === 'Infrastructure'){
    const row = typeof INFRA !== 'undefined' ? INFRA.find(x => x.id === req.targetId) : null;
    return row ? row.name : req.targetId || 'Infrastructure';
  }
  return req.area || 'General area';
}
function requestTargetRoute(req){
  if(req.targetType === 'Asset' && req.targetId) return 'asset-detail';
  if(req.targetType === 'Infrastructure' && req.targetId) return 'infrastructure-detail';
  return '';
}
function requestAttachmentCount(req){
  return normalizeAttachments(req && req.attachments).length;
}
function nextRequestId(){
  let max = 0;
  REQUESTS.forEach(req => {
    const match = /^REQ-(\d+)$/.exec(req.id || '');
    if(match) max = Math.max(max, Number(match[1]));
  });
  return 'REQ-' + String(max + 1).padStart(3, '0');
}
function refreshRequestBadge(){
  const badge = $('#sb-req');
  if(badge) badge.textContent = REQUESTS.filter(req => !['Converted','Rejected','Completed'].includes(req.status)).length;
}
refreshRequestBadge();

/* ============================================================
   LIST VIEW
   ============================================================ */
function renderRequests(){
  const dirty = reqDirty();
  const open = REQUESTS.filter(req => ['New','Screening','Approved'].includes(req.status)).length;
  const screening = REQUESTS.filter(req => req.status === 'Screening').length;
  const converted = REQUESTS.filter(req => req.status === 'Converted').length;
  const overdue = REQUESTS.filter(req => ['New','Screening','Approved'].includes(req.status) && req.due && daysFromToday(req.due) < 0).length;

  view.innerHTML = `
    <div class="page-head">
      <div><h1>Service Requests</h1><div class="ph-sub">Intake queue for maintenance, utility, and support calls before they become work orders.</div></div>
      <button class="btn btn-primary" onclick="openRequestModal('add')">+ New Request</button>
    </div>
    <div class="databar ${dirty ? '' : 'clean'}">
      ${dirty
        ? `<b>Unsaved changes</b><span>Service request updates are stored in this browser.</span>`
        : `<b>In sync</b><span>Using the current local request snapshot.</span>`}
      <span class="spacer"></span>
      <button class="btn btn-ghost btn-sm" onclick="exportRequestsSnapshot()">Export snapshot</button>
      ${dirty ? `<button class="btn btn-ghost btn-sm" onclick="confirmResetRequests()">Revert</button>` : ''}
    </div>
    <div class="kpis" style="margin-bottom:18px">
      <div class="kpi"><div class="k-top"><div><div class="k-val">${open}</div><div class="k-label">Open Queue</div></div><div class="k-ico ico-orange">RQ</div></div></div>
      <div class="kpi"><div class="k-top"><div><div class="k-val">${screening}</div><div class="k-label">In Screening</div></div><div class="k-ico ico-blue">TR</div></div></div>
      <div class="kpi"><div class="k-top"><div><div class="k-val">${converted}</div><div class="k-label">Converted to WO</div></div><div class="k-ico ico-green">WO</div></div></div>
      <div class="kpi"><div class="k-top"><div><div class="k-val" style="color:${overdue ? 'var(--red)' : 'inherit'}">${overdue}</div><div class="k-label">Overdue Response</div></div><div class="k-ico ico-red">OD</div></div></div>
    </div>
    <div class="toolbar">
      <input class="tb-search" id="rq-q" placeholder="Search by request no., title, requester, area..." value="${esc(reqFilters.q)}">
      <select id="rq-status"><option value="">All Status</option>${REQ_STATUSES.map(v => `<option ${reqFilters.status === v ? 'selected' : ''}>${v}</option>`).join('')}</select>
      <select id="rq-priority"><option value="">All Priority</option>${REQ_PRIORITIES.map(v => `<option ${reqFilters.priority === v ? 'selected' : ''}>${v}</option>`).join('')}</select>
      <select id="rq-type"><option value="">All Request Types</option>${REQ_TYPES.map(v => `<option ${reqFilters.type === v ? 'selected' : ''}>${v}</option>`).join('')}</select>
      <span class="tb-count" id="rq-count"></span>
    </div>
    <div class="tbl-wrap"><table>
      <thead><tr>
        <th>Req No.</th><th>Title</th><th>Requester</th><th>Target</th><th>Type</th>
        <th>Priority</th><th>Status</th><th>Due</th><th style="text-align:right">Actions</th>
      </tr></thead>
      <tbody id="rq-rows"></tbody>
    </table></div>`;

  const apply = () => {
    reqFilters.q = $('#rq-q').value.toLowerCase();
    reqFilters.status = $('#rq-status').value;
    reqFilters.priority = $('#rq-priority').value;
    reqFilters.type = $('#rq-type').value;
    const rows = REQUESTS.filter(req => {
      const hay = `${req.id} ${req.title} ${req.requester} ${req.area} ${requestTargetName(req)}`.toLowerCase();
      return hay.includes(reqFilters.q)
        && (!reqFilters.status || req.status === reqFilters.status)
        && (!reqFilters.priority || req.priority === reqFilters.priority)
        && (!reqFilters.type || req.type === reqFilters.type);
    });
    $('#rq-rows').innerHTML = rows.length ? rows.map(req => {
      const overdueFlag = ['New','Screening','Approved'].includes(req.status) && req.due && daysFromToday(req.due) < 0;
      const mediaCount = requestAttachmentCount(req);
      return `<tr onclick="go('request-detail','${req.id}')">
        <td class="mono">${req.id}</td>
        <td><b>${esc(req.title)}</b><div style="font-size:11.5px;color:var(--ink-soft)">${esc(req.department || '-')} | ${esc(req.area || '-')} ${mediaCount ? `| ${mediaCount} media` : ''}</div></td>
        <td>${esc(req.requester)}</td>
        <td>${esc(requestTargetName(req))}</td>
        <td><span class="pill pill-low">${req.type}</span></td>
        <td><span class="pill ${critClass(req.priority)}">${req.priority}</span></td>
        <td><span class="pill ${requestStatusClass(req.status)}">${req.status}</span></td>
        <td style="${overdueFlag ? 'color:var(--red);font-weight:600' : ''}">${fmtDate(req.due)}</td>
        <td style="text-align:right;white-space:nowrap" onclick="event.stopPropagation()">
          ${req.status !== 'Converted' ? `<button class="iconbtn" onclick="convertRequestToWO('${req.id}')">WO</button>` : `<button class="iconbtn" onclick="go('wo-detail','${req.woId}')">Open</button>`}
        </td>
      </tr>`;
    }).join('') : `<tr><td colspan="9" style="text-align:center;color:var(--ink-soft);padding:30px">No service requests match the current filters.</td></tr>`;
    $('#rq-count').textContent = `Showing ${rows.length} of ${REQUESTS.length} requests`;
  };
  ['rq-q','rq-status','rq-priority','rq-type'].forEach(id => {
    $('#' + id).addEventListener('input', apply);
    $('#' + id).addEventListener('change', apply);
  });
  apply();
}

/* ============================================================
   DETAIL VIEW
   ============================================================ */
function renderRequestDetail(id){
  const req = requestById(id);
  if(!req){ renderRequests(); return; }
  const targetRoute = requestTargetRoute(req);
  const overdue = ['New','Screening','Approved'].includes(req.status) && req.due && daysFromToday(req.due) < 0;
  const targetLink = targetRoute
    ? `<a style="color:var(--orange-dark);cursor:pointer" onclick="go('${targetRoute}','${req.targetId}')">${esc(requestTargetName(req))}</a>`
    : esc(requestTargetName(req));

  let flow = '';
  if(req.status === 'New'){
    flow = `<button class="btn btn-primary btn-sm" onclick="setRequestStatus('${req.id}','Screening')">Start Screening</button>
            <button class="btn btn-ghost btn-sm" onclick="setRequestStatus('${req.id}','Approved')">Approve</button>
            <button class="btn btn-ghost btn-sm" onclick="setRequestStatus('${req.id}','Rejected')">Reject</button>`;
  }else if(req.status === 'Screening'){
    flow = `<button class="btn btn-primary btn-sm" onclick="setRequestStatus('${req.id}','Approved')">Approve</button>
            <button class="btn btn-ghost btn-sm" onclick="convertRequestToWO('${req.id}')">Convert to WO</button>
            <button class="btn btn-ghost btn-sm" onclick="setRequestStatus('${req.id}','Rejected')">Reject</button>`;
  }else if(req.status === 'Approved'){
    flow = `${req.woId ? `<button class="btn btn-primary btn-sm" onclick="go('wo-detail','${req.woId}')">Open WO</button>` : `<button class="btn btn-primary btn-sm" onclick="convertRequestToWO('${req.id}')">Convert to WO</button>`}
            <button class="btn btn-ghost btn-sm" onclick="setRequestStatus('${req.id}','Completed')">Mark Done</button>`;
  }else if(req.status === 'Converted' && req.woId){
    flow = `<button class="btn btn-primary btn-sm" onclick="go('wo-detail','${req.woId}')">Open WO</button>
            <button class="btn btn-ghost btn-sm" onclick="setRequestStatus('${req.id}','Completed')">Close Request</button>`;
  }else if(req.status === 'Rejected'){
    flow = `<button class="btn btn-ghost btn-sm" onclick="setRequestStatus('${req.id}','Screening')">Reopen</button>`;
  }

  view.innerHTML = `
    <div class="back" onclick="go('requests')"><- Back to Service Requests</div>
    <div class="detail-hero">
      <div style="width:96px;height:96px;border-radius:14px;flex-shrink:0;background:var(--steel-700);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff">
        <div style="font-size:24px">${req.priority}</div>
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:.5px">${req.status}</div>
      </div>
      <div class="dh-main">
        <h1>${esc(req.title)}</h1>
        <div class="dh-meta"><span class="mono">${req.id}</span> | ${req.type} | raised ${fmtDate(req.created)} by ${esc(req.requester)}</div>
        <div class="dh-tags">
          <span class="pill ${critClass(req.priority)}">${req.priority} priority</span>
          <span class="pill ${requestStatusClass(req.status)}">${req.status}</span>
          <span class="pill pill-low">${req.department || 'Unassigned dept.'}</span>
          ${overdue ? '<span class="pill pill-hold">Overdue</span>' : ''}
        </div>
      </div>
      <div class="dh-actions">
        <button class="btn btn-primary" onclick="openRequestModal('edit','${req.id}')">Edit Request</button>
        <button class="btn btn-danger" onclick="confirmDeleteRequest('${req.id}')">Delete</button>
      </div>
    </div>
    <div class="panel" style="margin-bottom:18px">
      <div class="panel-head"><b>Workflow</b><span style="font-size:12px;color:var(--ink-soft)">Current status: ${req.status}</span></div>
      <div style="padding:14px 17px;display:flex;gap:10px;flex-wrap:wrap">${flow || '<span style="color:var(--ink-soft);font-size:13px">No actions available.</span>'}</div>
    </div>
    <div class="statgrid">
      <div class="stat"><div class="s-label">Requester</div><div class="s-val" style="font-size:16px">${esc(req.requester)}</div></div>
      <div class="stat"><div class="s-label">Target</div><div class="s-val" style="font-size:14px">${targetLink}</div></div>
      <div class="stat"><div class="s-label">Due</div><div class="s-val" style="font-size:15px;${overdue ? 'color:var(--red)' : ''}">${fmtDate(req.due)}</div></div>
      <div class="stat"><div class="s-label">Media</div><div class="s-val" style="font-size:15px">${requestAttachmentCount(req)}</div></div>
    </div>
    <div class="cols">
      <div>
        <div class="panel" style="margin-bottom:18px">
          <div class="panel-head"><b>Symptoms</b></div>
          <div class="panel-body" style="font-size:13px;line-height:1.55">${esc(req.symptoms) || '<span style="color:var(--ink-soft)">No symptoms recorded.</span>'}</div>
        </div>
        <div class="panel" style="margin-bottom:18px">
          <div class="panel-head"><b>Requested Action</b></div>
          <div class="panel-body" style="font-size:13px;line-height:1.55">${esc(req.actionNeeded) || '<span style="color:var(--ink-soft)">No action recorded.</span>'}</div>
        </div>
        ${attachmentsGalleryHtml(req.attachments, 'Request Photos / Videos')}
      </div>
      <div>
        <div class="panel">
          <div class="panel-head"><b>Request Profile</b></div>
          <div class="panel-body">
            <div class="kv-list">
              <div><span>Department</span><b>${esc(req.department || '-')}</b></div>
              <div><span>Area</span><b>${esc(req.area || '-')}</b></div>
              <div><span>Target Type</span><b>${esc(req.targetType || 'General Area')}</b></div>
              <div><span>Target ID</span><b>${esc(req.targetId || '-')}</b></div>
              <div><span>WO Link</span><b>${req.woId ? `<a style="color:var(--orange-dark);cursor:pointer" onclick="go('wo-detail','${req.woId}')">${req.woId}</a>` : '-'}</b></div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
}

/* ============================================================
   CRUD
   ============================================================ */
function openRequestModal(mode, id){
  const editing = mode === 'edit';
  const req = editing ? requestById(id) : normalizeRequestRecord({
    id:nextRequestId(),
    title:'',
    type:'General Support',
    priority:'Medium',
    status:'New',
    requester:currentUserName(),
    department:currentUserDepartment(),
    targetType:'Asset',
    targetId:(ASSETS[0] && ASSETS[0].id) || '',
    area:'',
    created:todayIso(),
    due:addDays(todayIso(), 2),
    symptoms:'',
    actionNeeded:'',
    woId:'',
    attachments:[]
  });
  if(editing && !req){ toast('Request not found.'); return; }
  const options = reqTargetOptions();
  const assetOpts = options.filter(o => o.type === 'Asset');
  const infraOpts = options.filter(o => o.type === 'Infrastructure');
  modalHost.innerHTML = `
    <div class="modal">
      <div class="modal-head"><h3>${editing ? 'Edit Request - ' + req.id : 'New Service Request - ' + req.id}</h3><div class="x" onclick="closeModal()">x</div></div>
      <div class="modal-body">
        <div class="form-err" id="form-err"></div>
        ${datalistHtml('req-requester-options', requesterOptions())}
        <div class="form-grid">
          <div class="field full"><label>Title <span class="req">*</span></label><input id="sr-title" value="${esc(req.title)}" placeholder="e.g. Air pressure low at line 2"></div>
          <div class="field"><label>Type</label><select id="sr-type">${REQ_TYPES.map(v => `<option ${req.type === v ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
          <div class="field"><label>Priority</label><select id="sr-priority">${REQ_PRIORITIES.map(v => `<option ${req.priority === v ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
          <div class="field"><label>Status</label><select id="sr-status">${REQ_STATUSES.map(v => `<option ${req.status === v ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
          <div class="field"><label>Requester</label><input id="sr-requester" list="req-requester-options" value="${esc(req.requester)}"></div>
          <div class="field"><label>Department</label><input id="sr-department" value="${esc(req.department)}" placeholder="e.g. Surface, HC, Utilities"></div>
          <div class="field"><label>Target Type</label><select id="sr-targetType" onchange="toggleRequestTargetFields()">${REQ_TARGETS.map(v => `<option ${req.targetType === v ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
          <div class="field"><label>Area / Sub-location</label><input id="sr-area" value="${esc(req.area)}" placeholder="e.g. HC neutralization tank inlet"></div>
          <div class="field full req-target-asset"><label>Asset Target</label><select id="sr-targetAsset"><option value="">No asset selected</option>${assetOpts.map(o => `<option value="${o.id}" ${req.targetType === 'Asset' && req.targetId === o.id ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select></div>
          <div class="field full req-target-infra"><label>Infrastructure Target</label><select id="sr-targetInfra"><option value="">No infrastructure selected</option>${infraOpts.map(o => `<option value="${o.id}" ${req.targetType === 'Infrastructure' && req.targetId === o.id ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select></div>
          <div class="field"><label>Created Date</label><input id="sr-created" type="date" value="${esc(req.created)}"></div>
          <div class="field"><label>Due Date</label><input id="sr-due" type="date" value="${esc(req.due)}"></div>
          <div class="field full"><label>Symptoms <span class="req">*</span></label><textarea id="sr-symptoms" placeholder="What was observed?">${esc(req.symptoms)}</textarea></div>
          <div class="field full"><label>Requested Action</label><textarea id="sr-actionNeeded" placeholder="What help is needed?">${esc(req.actionNeeded)}</textarea></div>
          ${attachmentsFieldHtml('sr-attachments', 'Photos / Videos', req.attachments)}
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="saveRequest('${mode}','${editing ? req.id : ''}')">${editing ? 'Save Changes' : 'Create Request'}</button>
      </div>
    </div>`;
  overlay.classList.add('show');
  toggleRequestTargetFields();
  setTimeout(() => {
    const focusNode = $('#sr-title');
    if(focusNode) focusNode.focus();
  }, 50);
}
function toggleRequestTargetFields(){
  const targetType = $('#sr-targetType') ? $('#sr-targetType').value : 'Asset';
  document.querySelectorAll('.req-target-asset').forEach(node => {
    node.style.display = targetType === 'Asset' ? '' : 'none';
  });
  document.querySelectorAll('.req-target-infra').forEach(node => {
    node.style.display = targetType === 'Infrastructure' ? '' : 'none';
  });
}
async function saveRequest(mode, origId){
  const g = id => $('#sr-' + id);
  const errBox = $('#form-err');
  const showErr = msg => {
    errBox.textContent = msg;
    errBox.classList.add('show');
  };
  errBox.classList.remove('show');
  ['title','symptoms'].forEach(k => {
    const node = g(k);
    if(node) node.classList.remove('bad');
  });
  const targetType = g('targetType').value;
  const targetId = targetType === 'Asset'
    ? $('#sr-targetAsset').value
    : targetType === 'Infrastructure'
      ? $('#sr-targetInfra').value
      : '';

  let newAttachments = [];
  try{
    newAttachments = await attachmentsFromInput('sr-attachments');
  }catch(e){
    showErr('Could not read the selected photo or video files.');
    return;
  }

  const prev = mode === 'edit' ? requestById(origId) : null;
  const rec = normalizeRequestRecord({
    id:mode === 'add' ? nextRequestId() : origId,
    title:g('title').value.trim(),
    type:g('type').value,
    priority:g('priority').value,
    status:g('status').value,
    requester:g('requester').value.trim() || currentUserName(),
    department:g('department').value.trim(),
    targetType,
    targetId,
    area:g('area').value.trim(),
    created:g('created').value || todayIso(),
    due:g('due').value,
    symptoms:g('symptoms').value.trim(),
    actionNeeded:g('actionNeeded').value.trim(),
    woId:mode === 'add' ? '' : ((prev && prev.woId) || ''),
    attachments:[...(prev ? prev.attachments : []), ...newAttachments]
  });

  if(!rec.title){ g('title').classList.add('bad'); showErr('Title is required.'); return; }
  if(!rec.symptoms){ g('symptoms').classList.add('bad'); showErr('Symptoms are required.'); return; }
  if(rec.requester) mergeIntoSettingList('requesters', rec.requester);

  if(mode === 'add'){
    REQUESTS.push(rec);
    persistRequests();
    closeModal();
    toast(`${rec.id} created.`);
    go('requests');
  }else{
    const idx = REQUESTS.findIndex(row => row.id === origId);
    if(idx < 0){ showErr('Original request no longer exists.'); return; }
    REQUESTS[idx] = rec;
    persistRequests();
    closeModal();
    toast(`${origId} updated.`);
    go(current === 'request-detail' ? 'request-detail' : 'requests', origId);
  }
}
function confirmDeleteRequest(id){
  const req = requestById(id);
  if(!req) return;
  modalHost.innerHTML = `
    <div class="modal confirm-box">
      <div class="modal-head"><h3>Delete Service Request</h3><div class="x" onclick="closeModal()">x</div></div>
      <div class="modal-body">
        <p>Delete <b>${req.id} - ${esc(req.title)}</b> from the request queue?</p>
      </div>
      <div class="modal-foot">
        <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button class="btn btn-danger" onclick="doDeleteRequest('${id}')">Delete</button>
      </div>
    </div>`;
  overlay.classList.add('show');
}
function doDeleteRequest(id){
  const idx = REQUESTS.findIndex(row => row.id === id);
  if(idx >= 0) REQUESTS.splice(idx, 1);
  persistRequests();
  closeModal();
  toast(`Request ${id} deleted.`);
  go('requests');
}

/* ============================================================
   ACTIONS
   ============================================================ */
function setRequestStatus(id, status){
  const req = requestById(id);
  if(!req) return;
  req.status = status;
  persistRequests();
  toast(`${id} -> ${status}`);
  if(current === 'request-detail') renderRequestDetail(id);
  else renderRequests();
}
function convertRequestToWO(id){
  const req = requestById(id);
  if(!req) return;
  if(req.woId){
    go('wo-detail', req.woId);
    return;
  }
  if(!req.targetId && req.targetType !== 'General Area'){
    toast('Select a valid target before converting this request to a work order.');
    return;
  }
  const assetId = req.targetType === 'General Area' ? ((ASSETS[0] && ASSETS[0].id) || '') : req.targetId;
  if(!assetId){
    toast('No target asset is available for this request.');
    return;
  }
  const wo = normalizeWORecord({
    id:nextWOId(),
    title:req.title,
    assetId,
    type:req.type === 'Inspection' ? 'Inspection' : (req.type === 'Breakdown' ? 'Breakdown' : 'Corrective'),
    priority:req.priority,
    status:'Open',
    technician:'',
    requestedBy:req.requester,
    created:todayIso(),
    due:req.due || addDays(todayIso(), 2),
    completed:'',
    description:`Request ${req.id}\nTarget: ${req.targetType}${req.targetId ? ' - ' + req.targetId : ''}\nArea: ${req.area || '-'}\nSymptoms: ${req.symptoms}\nAction needed: ${req.actionNeeded || '-'}`,
    resolution:'',
    labourHrs:0,
    downtimeHrs:0,
    attachments:req.attachments,
    updates:[]
  });
  WOS.push(wo);
  persistWOs();
  refreshWOBadges();
  req.woId = wo.id;
  req.status = 'Converted';
  persistRequests();
  toast(`Work order ${wo.id} created from ${req.id}.`);
  go('wo-detail', wo.id);
}
function confirmResetRequests(){
  modalHost.innerHTML = `
    <div class="modal confirm-box">
      <div class="modal-head"><h3>Revert Service Requests</h3><div class="x" onclick="closeModal()">x</div></div>
      <div class="modal-body">
        <p>Discard all local request edits and reload the seed request queue?</p>
        <p style="margin-top:10px;color:var(--ink-soft)">Anything you have not exported will be lost.</p>
      </div>
      <div class="modal-foot">
        <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button class="btn btn-danger" onclick="closeModal();resetRequestsToSeed();go('requests')">Revert to seed</button>
      </div>
    </div>`;
  overlay.classList.add('show');
}

/* ----- register routes ----- */
ROUTES['requests'] = renderRequests;
ROUTES['request-detail'] = renderRequestDetail;
