/* ============================================================
   CMMS - MODULE: WORK ORDERS
   Loaded after cmms.js and shares its global scope.
   ============================================================ */
const WO_TODAY = todayIso();
const WO_TYPES = ['Breakdown','Corrective','Preventive','Inspection'];
const WO_PRIORITIES = ['High','Medium','Low'];
const WO_STATUSES = ['Open','In Progress','On Hold','Completed'];
const WO_TYPE_ICON = {Breakdown:'BD', Corrective:'CM', Preventive:'PM', Inspection:'IN'};

function normalizeWOUpdate(update, fallbackStatus){
  const rawStatus = String((update && update.status) || fallbackStatus || 'In Progress').trim();
  return {
    id:String((update && update.id) || '').trim(),
    date:String((update && update.date) || todayIso()).trim() || todayIso(),
    author:String((update && update.author) || '').trim(),
    status:WO_STATUSES.includes(rawStatus) ? rawStatus : 'In Progress',
    note:String((update && update.note) || '').trim(),
    labourHrs:Math.max(0, Number(update && update.labourHrs) || 0),
    downtimeHrs:Math.max(0, Number(update && update.downtimeHrs) || 0),
    attachments:normalizeAttachments(update && update.attachments)
  };
}
function normalizeWORecord(row){
  const status = WO_STATUSES.includes(row && row.status) ? row.status : 'Open';
  return Object.assign({}, row || {}, {
    id:String((row && row.id) || '').trim(),
    title:String((row && row.title) || '').trim(),
    assetId:String((row && row.assetId) || '').trim(),
    type:WO_TYPES.includes(row && row.type) ? row.type : 'Corrective',
    priority:WO_PRIORITIES.includes(row && row.priority) ? row.priority : 'Medium',
    status,
    technician:String((row && row.technician) || '').trim(),
    requestedBy:String((row && row.requestedBy) || '').trim(),
    created:String((row && row.created) || WO_TODAY).trim() || WO_TODAY,
    due:String((row && row.due) || '').trim(),
    completed:String((row && row.completed) || '').trim(),
    description:String((row && row.description) || '').trim(),
    resolution:String((row && row.resolution) || '').trim(),
    labourHrs:Math.max(0, Number(row && row.labourHrs) || 0),
    downtimeHrs:Math.max(0, Number(row && row.downtimeHrs) || 0),
    attachments:normalizeAttachments(row && row.attachments),
    updates:Array.isArray(row && row.updates) ? row.updates.map(item => normalizeWOUpdate(item, status)) : []
  });
}
function woTypeClass(type){
  return {Breakdown:'pill-crit', Corrective:'pill-high', Preventive:'pill-med', Inspection:'pill-low'}[type] || 'pill-low';
}
function woAssetName(id){
  const asset = ASSETS.find(a => a.id === id);
  if(asset) return asset.name;
  const infra = typeof INFRA !== 'undefined' ? INFRA.find(row => row.id === id) : null;
  return infra ? infra.name : '(unknown asset)';
}
function woAssetRoute(id){
  if(ASSETS.find(a => a.id === id)) return 'asset-detail';
  if(typeof INFRA !== 'undefined' && INFRA.find(row => row.id === id)) return 'infrastructure-detail';
  return '';
}
function woAssetOptions(){
  const infraRows = typeof INFRA !== 'undefined' ? INFRA : [];
  return [
    ...ASSETS.map(a => ({id:a.id, label:`${a.id} - ${a.name}`})),
    ...infraRows.map(row => ({id:row.id, label:`${row.id} - ${row.name}`}))
  ];
}
function nextWOId(){
  let max = 0;
  WOS.forEach(w => {
    const match = /^WO-(\d+)$/.exec(w.id || '');
    if(match) max = Math.max(max, Number(match[1]));
  });
  return 'WO-' + String(max + 1).padStart(4, '0');
}
function nextWOUpdateId(w){
  let max = 0;
  (w.updates || []).forEach(update => {
    const match = /^UPD-(\d+)$/.exec(update.id || '');
    if(match) max = Math.max(max, Number(match[1]));
  });
  return 'UPD-' + String(max + 1).padStart(3, '0');
}
function woIsOverdue(w){
  return w.status !== 'Completed' && w.due && daysFromToday(w.due) < 0;
}
function woMediaCount(w){
  return normalizeAttachments(w && w.attachments).length + (w.updates || []).reduce((sum, item) => sum + normalizeAttachments(item.attachments).length, 0);
}
function renderAttachmentCards(items){
  const attachments = normalizeAttachments(items);
  return attachments.length ? attachments.map((item, index) => `
    <div class="attach-card">
      <div class="attach-media">
        ${item.kind === 'video'
          ? `<video controls preload="metadata" src="${item.src}"></video>`
          : `<img src="${item.src}" alt="${esc(item.name || `Attachment ${index + 1}`)}">`}
      </div>
      <div class="attach-meta">
        <b>${esc(item.name || `Attachment ${index + 1}`)}</b>
        <span>${item.kind === 'video' ? 'Video' : 'Photo'} | ${formatBytes(item.size)}</span>
      </div>
    </div>`).join('') : '';
}
function renderWOUpdates(w){
  const updates = [...(w.updates || [])].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return `
    <div class="panel" style="margin-top:18px">
      <div class="panel-head"><b>Technician Updates</b><a onclick="openWOUpdateModal('${w.id}',false)">Add update</a></div>
      ${updates.length ? `<div class="update-list">
        ${updates.map(update => `
          <div class="update-card">
            <div class="update-head">
              <div>
                <b>${esc(update.author || 'Technician update')}</b>
                <div class="update-sub">${fmtDate(update.date)}${update.status ? ` | ${update.status}` : ''}</div>
              </div>
              <span class="pill ${woStatusClass(update.status)}">${update.status}</span>
            </div>
            <div class="update-note">${esc(update.note || 'No note recorded for this update.')}</div>
            ${(update.labourHrs || update.downtimeHrs) ? `<div class="update-metrics">
              ${update.labourHrs ? `<span class="chip">+${update.labourHrs} labour hr</span>` : ''}
              ${update.downtimeHrs ? `<span class="chip">+${update.downtimeHrs} downtime hr</span>` : ''}
            </div>` : ''}
            ${normalizeAttachments(update.attachments).length ? `<div class="attach-grid attach-grid-tight">${renderAttachmentCards(update.attachments)}</div>` : ''}
          </div>`).join('')}
      </div>` : `<div style="padding:22px 17px;color:var(--ink-soft);font-size:13px">No technician updates yet. Use <b>Add update</b> or <b>Complete with Evidence</b> to log progress with photo or video proof.</div>`}
    </div>`;
}

WOS = WOS.map(normalizeWORecord);

/* ============================================================
   LIST VIEW
   ============================================================ */
let woFilters = {q:'', status:'', priority:'', type:''};

function renderWorkOrders(){
  const open = WOS.filter(w => w.status === 'Open').length;
  const progress = WOS.filter(w => w.status === 'In Progress').length;
  const overdue = WOS.filter(woIsOverdue).length;
  const done = WOS.filter(w => w.status === 'Completed').length;
  const dirty = woDirty();

  view.innerHTML = `
    <div class="page-head">
      <div><h1>Work Orders</h1><div class="ph-sub">Create, assign, and track maintenance work through its full lifecycle.</div></div>
      <button class="btn btn-primary" onclick="openWOModal('add')">+ New Work Order</button>
    </div>
    <div class="databar ${dirty ? '' : 'clean'}">
      ${dirty
        ? `<b>Unsaved changes</b><span>Work-order edits are stored in this browser but not yet written to the data file.</span>`
        : `<b>In sync</b><span>Work orders match the <span class="mono">CMMS_Data/work_orders.js</span> data file.</span>`}
      <span class="spacer"></span>
      <button class="btn btn-ghost btn-sm" onclick="exportWorkOrders()">Export work_orders.js</button>
      ${dirty ? `<button class="btn btn-ghost btn-sm" onclick="confirmResetWOs()">Revert</button>` : ''}
    </div>
    <div class="kpis" style="margin-bottom:18px">
      <div class="kpi"><div class="k-top"><div><div class="k-val">${open}</div><div class="k-label">Open</div></div><div class="k-ico ico-orange">OP</div></div></div>
      <div class="kpi"><div class="k-top"><div><div class="k-val">${progress}</div><div class="k-label">In Progress</div></div><div class="k-ico ico-blue">IP</div></div></div>
      <div class="kpi"><div class="k-top"><div><div class="k-val" style="color:${overdue ? 'var(--red)' : 'inherit'}">${overdue}</div><div class="k-label">Overdue</div></div><div class="k-ico ico-red">OD</div></div></div>
      <div class="kpi"><div class="k-top"><div><div class="k-val">${done}</div><div class="k-label">Completed</div></div><div class="k-ico ico-green">DN</div></div></div>
    </div>
    <div class="toolbar">
      <input class="tb-search" id="wf-q" placeholder="Search by WO no., title, asset, technician..." value="${esc(woFilters.q)}">
      <select id="wf-status"><option value="">All Status</option>${WO_STATUSES.map(v => `<option ${woFilters.status === v ? 'selected' : ''}>${v}</option>`).join('')}</select>
      <select id="wf-priority"><option value="">All Priority</option>${WO_PRIORITIES.map(v => `<option ${woFilters.priority === v ? 'selected' : ''}>${v}</option>`).join('')}</select>
      <select id="wf-type"><option value="">All Types</option>${WO_TYPES.map(v => `<option ${woFilters.type === v ? 'selected' : ''}>${v}</option>`).join('')}</select>
      <span class="tb-count" id="wf-count"></span>
    </div>
    <div class="tbl-wrap"><table>
      <thead><tr>
        <th>WO No.</th><th>Title</th><th>Asset</th><th>Type</th><th>Priority</th>
        <th>Status</th><th>Technician</th><th>Due</th><th style="text-align:right">Actions</th>
      </tr></thead>
      <tbody id="wo-rows"></tbody>
    </table></div>`;

  const apply = () => {
    woFilters.q = $('#wf-q').value.toLowerCase();
    woFilters.status = $('#wf-status').value;
    woFilters.priority = $('#wf-priority').value;
    woFilters.type = $('#wf-type').value;

    const rows = WOS.filter(w => {
      const hay = `${w.id} ${w.title} ${w.assetId} ${woAssetName(w.assetId)} ${w.technician}`.toLowerCase();
      return hay.includes(woFilters.q)
        && (!woFilters.status || w.status === woFilters.status)
        && (!woFilters.priority || w.priority === woFilters.priority)
        && (!woFilters.type || w.type === woFilters.type);
    });

    $('#wo-rows').innerHTML = rows.length ? rows.map(w => {
      const overdueFlag = woIsOverdue(w);
      const media = woMediaCount(w);
      return `<tr onclick="go('wo-detail','${w.id}')">
        <td class="mono">${w.id}</td>
        <td><b>${esc(w.title)}</b><div style="font-size:11.5px;color:var(--ink-soft)">${media ? `${media} media | ` : ''}${(w.updates || []).length} update(s)</div></td>
        <td><span class="mono">${w.assetId}</span> <span style="color:var(--ink-soft)">${esc(woAssetName(w.assetId))}</span></td>
        <td><span class="pill ${woTypeClass(w.type)}">${w.type}</span></td>
        <td><span class="pill ${critClass(w.priority)}">${w.priority}</span></td>
        <td><span class="pill ${woStatusClass(w.status)}">${w.status}</span></td>
        <td>${esc(w.technician) || '<span style="color:var(--ink-soft)">Unassigned</span>'}</td>
        <td style="${overdueFlag ? 'color:var(--red);font-weight:600' : ''}">${overdueFlag ? 'Late ' : ''}${fmtDate(w.due)}</td>
        <td style="text-align:right;white-space:nowrap" onclick="event.stopPropagation()">
          <button class="iconbtn" title="Edit" onclick="openWOModal('edit','${w.id}')">Edit</button>
          <button class="iconbtn" title="Update" onclick="openWOUpdateModal('${w.id}',false)">Update</button>
          <button class="iconbtn del" title="Delete" onclick="confirmDeleteWO('${w.id}')">Del</button>
        </td>
      </tr>`;
    }).join('') : `<tr><td colspan="9" style="text-align:center;color:var(--ink-soft);padding:30px">No work orders match the current filters.</td></tr>`;

    $('#wf-count').textContent = `Showing ${rows.length} of ${WOS.length} work orders`;
  };

  ['wf-q','wf-status','wf-priority','wf-type'].forEach(id => {
    $('#' + id).addEventListener('input', apply);
    $('#' + id).addEventListener('change', apply);
  });
  apply();
}

/* ============================================================
   DETAIL VIEW
   ============================================================ */
function renderWODetail(id){
  const w = WOS.find(row => row.id === id);
  if(!w){ renderWorkOrders(); return; }
  const statusColor = {'Open':'var(--orange)','In Progress':'var(--blue)','On Hold':'var(--red)','Completed':'var(--green)'}[w.status] || 'var(--steel-600)';
  const overdue = woIsOverdue(w);
  const targetRoute = woAssetRoute(w.assetId);
  const targetLink = targetRoute
    ? `<a style="color:var(--orange-dark);cursor:pointer" onclick="go('${targetRoute}','${w.assetId}')">${w.assetId}</a>`
    : esc(w.assetId);

  let flow = '';
  if(w.status === 'Open'){
    flow = `<button class="btn btn-primary btn-sm" onclick="setWOStatus('${w.id}','In Progress')">Start Work</button>
            <button class="btn btn-ghost btn-sm" onclick="openWOUpdateModal('${w.id}',false)">Add Update</button>
            <button class="btn btn-ghost btn-sm" onclick="setWOStatus('${w.id}','On Hold')">Put On Hold</button>`;
  }else if(w.status === 'In Progress'){
    flow = `<button class="btn btn-primary btn-sm" onclick="openWOUpdateModal('${w.id}',true)">Complete with Evidence</button>
            <button class="btn btn-ghost btn-sm" onclick="openWOUpdateModal('${w.id}',false)">Add Update</button>
            <button class="btn btn-ghost btn-sm" onclick="setWOStatus('${w.id}','On Hold')">Put On Hold</button>`;
  }else if(w.status === 'On Hold'){
    flow = `<button class="btn btn-primary btn-sm" onclick="setWOStatus('${w.id}','In Progress')">Resume Work</button>
            <button class="btn btn-ghost btn-sm" onclick="openWOUpdateModal('${w.id}',false)">Add Update</button>
            <button class="btn btn-ghost btn-sm" onclick="openWOUpdateModal('${w.id}',true)">Complete with Evidence</button>`;
  }else if(w.status === 'Completed'){
    flow = `<button class="btn btn-primary btn-sm" onclick="openWOUpdateModal('${w.id}',false)">Add Closeout Update</button>
            <button class="btn btn-ghost btn-sm" onclick="setWOStatus('${w.id}','Open')">Reopen</button>`;
  }

  view.innerHTML = `
    <div class="back" onclick="go('work-orders')"><- Back to Work Orders</div>
    <div class="detail-hero">
      <div style="width:96px;height:96px;border-radius:14px;flex-shrink:0;background:${statusColor};display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff">
        <div style="font-size:26px">${WO_TYPE_ICON[w.type] || 'WO'}</div>
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:.5px;margin-top:4px;text-align:center;padding:0 4px">${w.status}</div>
      </div>
      <div class="dh-main">
        <h1>${esc(w.title)}</h1>
        <div class="dh-meta"><span class="mono">${w.id}</span> | ${w.type} | raised ${fmtDate(w.created)}${w.requestedBy ? ' by ' + esc(w.requestedBy) : ''}</div>
        <div class="dh-tags">
          <span class="pill ${woTypeClass(w.type)}">${w.type}</span>
          <span class="pill ${critClass(w.priority)}">${w.priority} priority</span>
          <span class="pill ${woStatusClass(w.status)}">${w.status}</span>
          ${overdue ? '<span class="pill pill-hold">Overdue</span>' : ''}
        </div>
      </div>
      <div class="dh-actions">
        <button class="btn btn-primary" onclick="openWOModal('edit','${w.id}')">Edit</button>
        <button class="btn btn-danger" onclick="confirmDeleteWO('${w.id}')">Delete</button>
      </div>
    </div>
    <div class="panel" style="margin-bottom:18px">
      <div class="panel-head"><b>Workflow</b><span style="font-size:12px;color:var(--ink-soft)">Current status: ${w.status}</span></div>
      <div style="padding:14px 17px;display:flex;gap:10px;flex-wrap:wrap">${flow || '<span style="color:var(--ink-soft);font-size:13px">No actions available.</span>'}</div>
    </div>
    <div class="statgrid">
      <div class="stat"><div class="s-label">Target</div>
        <div class="s-val" style="font-size:14px">${targetLink}</div>
        <div style="font-size:11px;color:var(--ink-soft);margin-top:2px">${esc(woAssetName(w.assetId))}</div></div>
      <div class="stat"><div class="s-label">Due Date</div><div class="s-val" style="font-size:15px;${overdue ? 'color:var(--red)' : ''}">${fmtDate(w.due)}</div></div>
      <div class="stat"><div class="s-label">Labour Hours</div><div class="s-val">${w.labourHrs || 0}</div></div>
      <div class="stat"><div class="s-label">Media</div><div class="s-val">${woMediaCount(w)}</div></div>
    </div>
    <div class="panel" style="margin-bottom:18px">
      <div class="panel-head"><b>Description</b></div>
      <div style="padding:15px 17px;font-size:13px;line-height:1.55;white-space:pre-wrap">${esc(w.description) || '<span style="color:var(--ink-soft)">No description.</span>'}</div>
    </div>
    <div class="panel" style="margin-bottom:18px">
      <div class="panel-head"><b>Resolution / Work Done</b><a onclick="openWOUpdateModal('${w.id}',false)">Log progress</a></div>
      <div style="padding:15px 17px;font-size:13px;line-height:1.55;white-space:pre-wrap">${esc(w.resolution) || '<span style="color:var(--ink-soft)">Not yet recorded.</span>'}</div>
    </div>
    ${attachmentsGalleryHtml(w.attachments, 'Reference Photos / Videos')}
    ${renderWOUpdates(w)}
    ${w.completed ? `<div class="notebox" style="margin-top:16px"><b>Completed:</b> ${fmtDate(w.completed)}${w.technician ? ' by ' + esc(w.technician) : ''}</div>` : ''}`;
}

function setWOStatus(id, status){
  if(status === 'Completed'){
    openWOUpdateModal(id, true);
    return;
  }
  const w = WOS.find(row => row.id === id);
  if(!w) return;
  w.status = status;
  if(status !== 'Completed') w.completed = '';
  persistWOs();
  refreshWOBadges();
  toast(`WO ${id} -> ${status}`);
  renderWODetail(id);
}

/* ============================================================
   CREATE / EDIT MODAL
   ============================================================ */
function openWOModal(mode, id){
  const editing = mode === 'edit';
  const w = editing ? WOS.find(row => row.id === id) : normalizeWORecord({
    id:nextWOId(),
    title:'',
    assetId:(ASSETS[0] && ASSETS[0].id) || '',
    type:'Corrective',
    priority:SETTINGS.defaultWOPriority || 'Medium',
    status:'Open',
    technician:defaultTechnicianName(),
    requestedBy:currentUserName(),
    created:WO_TODAY,
    due:'',
    completed:'',
    description:'',
    resolution:'',
    labourHrs:0,
    downtimeHrs:0,
    attachments:[],
    updates:[]
  });
  if(editing && !w){ toast('Work order not found.'); return; }

  const sel = (value, values) => values.map(v => `<option ${v === value ? 'selected' : ''}>${v}</option>`).join('');
  const targetOpts = woAssetOptions()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(row => `<option value="${row.id}" ${row.id === w.assetId ? 'selected' : ''}>${esc(row.label)}</option>`).join('');

  modalHost.innerHTML = `
   <div class="modal">
    <div class="modal-head"><h3>${editing ? 'Edit Work Order - ' + w.id : 'New Work Order - ' + w.id}</h3><div class="x" onclick="closeModal()">x</div></div>
    <div class="modal-body">
      <div class="form-err" id="form-err"></div>
      ${datalistHtml('wo-technician-options', technicianOptions())}
      ${datalistHtml('wo-requester-options', requesterOptions())}
      <div class="form-grid">
        <div class="field full"><label>Title <span class="req">*</span></label><input id="w-title" value="${esc(w.title)}" placeholder="e.g. Chiller not cooling - compressor fault"></div>
        <div class="field"><label>Target <span class="req">*</span></label><select id="w-assetId">${targetOpts}</select></div>
        <div class="field"><label>Type</label><select id="w-type">${sel(w.type, WO_TYPES)}</select></div>
        <div class="field"><label>Priority</label><select id="w-priority">${sel(w.priority, WO_PRIORITIES)}</select></div>
        <div class="field"><label>Status</label><select id="w-status">${sel(w.status, WO_STATUSES)}</select></div>
        <div class="field"><label>Technician</label><input id="w-technician" list="wo-technician-options" value="${esc(w.technician)}" placeholder="e.g. S. Wattana"></div>
        <div class="field"><label>Requested By</label><input id="w-requestedBy" list="wo-requester-options" value="${esc(w.requestedBy)}" placeholder="e.g. Surface Supervisor"></div>
        <div class="field"><label>Created Date</label><input id="w-created" type="date" value="${esc(w.created)}"></div>
        <div class="field"><label>Due Date</label><input id="w-due" type="date" value="${esc(w.due)}"></div>
        <div class="field"><label>Labour Hours</label><input id="w-labourHrs" type="number" min="0" step="0.5" value="${w.labourHrs || 0}"></div>
        <div class="field"><label>Downtime (hrs)</label><input id="w-downtimeHrs" type="number" min="0" step="0.5" value="${w.downtimeHrs || 0}"></div>
        <div class="field full"><label>Description</label><textarea id="w-description" placeholder="Problem, symptoms, scope of work...">${esc(w.description)}</textarea></div>
        <div class="field full"><label>Resolution / Work Done</label><textarea id="w-resolution" placeholder="What was done to resolve it...">${esc(w.resolution)}</textarea></div>
        ${attachmentsFieldHtml('w-attachments', 'Reference Photos / Videos', w.attachments)}
      </div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveWO('${mode}','${editing ? w.id : ''}')">${editing ? 'Save Changes' : 'Create Work Order'}</button>
    </div>
   </div>`;
  overlay.classList.add('show');
  setTimeout(() => {
    const focusNode = $('#w-title');
    if(focusNode) focusNode.focus();
  }, 50);
}

async function saveWO(mode, origId){
  const g = id => $('#w-' + id);
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

  let newAttachments = [];
  try{
    newAttachments = await attachmentsFromInput('w-attachments');
  }catch(e){
    showErr('Could not read the selected photo or video files.');
    return;
  }

  const prev = mode === 'edit' ? WOS.find(row => row.id === origId) : null;
  const rec = normalizeWORecord({
    id:mode === 'add' ? nextWOId() : origId,
    title:g('title').value.trim(),
    assetId:g('assetId').value,
    type:g('type').value,
    priority:g('priority').value,
    status:g('status').value,
    technician:g('technician').value.trim(),
    requestedBy:g('requestedBy').value.trim(),
    created:g('created').value || WO_TODAY,
    due:g('due').value,
    completed:'',
    description:g('description').value.trim(),
    resolution:g('resolution').value.trim(),
    labourHrs:Math.max(0, parseFloat(g('labourHrs').value) || 0),
    downtimeHrs:Math.max(0, parseFloat(g('downtimeHrs').value) || 0),
    attachments:[...(prev ? prev.attachments : []), ...newAttachments],
    updates:prev ? prev.updates : []
  });

  if(!rec.title){ g('title').classList.add('bad'); showErr('Title is required.'); return; }
  if(!rec.assetId){ g('assetId').classList.add('bad'); showErr('A target asset or infrastructure line must be selected.'); return; }

  if(mode === 'add'){
    if(rec.status === 'Completed') rec.completed = WO_TODAY;
    WOS.push(rec);
    if(rec.technician) mergeIntoSettingList('technicians', rec.technician);
    if(rec.requestedBy && !rec.requestedBy.startsWith('PM Schedule ')) mergeIntoSettingList('requesters', rec.requestedBy);
    persistWOs();
    refreshWOBadges();
    closeModal();
    toast(`${rec.id} created.`);
    go('work-orders');
  }else{
    const idx = WOS.findIndex(row => row.id === origId);
    if(idx < 0){ showErr('Original work order no longer exists.'); return; }
    const existing = WOS[idx];
    rec.completed = rec.status === 'Completed' ? (existing.completed || WO_TODAY) : '';
    WOS[idx] = rec;
    if(rec.technician) mergeIntoSettingList('technicians', rec.technician);
    if(rec.requestedBy && !rec.requestedBy.startsWith('PM Schedule ')) mergeIntoSettingList('requesters', rec.requestedBy);
    persistWOs();
    refreshWOBadges();
    closeModal();
    toast(`${origId} updated.`);
    go(current === 'wo-detail' ? 'wo-detail' : 'work-orders', origId);
  }
}

/* ============================================================
   TECHNICIAN UPDATE MODAL
   ============================================================ */
function openWOUpdateModal(id, completionMode){
  const w = WOS.find(row => row.id === id);
  if(!w){ toast('Work order not found.'); return; }
  const defaultStatus = completionMode ? 'Completed' : (w.status === 'Open' ? 'In Progress' : w.status);
  const statusOptions = completionMode ? ['Completed'] : ['In Progress','On Hold','Completed'];
  modalHost.innerHTML = `
   <div class="modal">
    <div class="modal-head"><h3>${completionMode ? 'Complete Work Order' : 'Technician Update'} - ${w.id}</h3><div class="x" onclick="closeModal()">x</div></div>
    <div class="modal-body">
      <div class="form-err" id="form-err"></div>
      ${datalistHtml('wo-update-tech-options', technicianOptions())}
      <div class="form-grid">
        <div class="field"><label>Status After Update</label><select id="wu-status">${statusOptions.map(v => `<option ${v === defaultStatus ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
        <div class="field"><label>Technician</label><input id="wu-technician" list="wo-update-tech-options" value="${esc(w.technician || defaultTechnicianName() || currentUserName())}"></div>
        <div class="field"><label>Update Date</label><input id="wu-date" type="date" value="${WO_TODAY}"></div>
        <div class="field"><label>Add Labour (hrs)</label><input id="wu-labourHrs" type="number" min="0" step="0.5" value="0"></div>
        <div class="field"><label>Add Downtime (hrs)</label><input id="wu-downtimeHrs" type="number" min="0" step="0.5" value="0"></div>
        <div class="field full"><label>${completionMode ? 'Completion Note' : 'Update Note'} <span class="req">*</span></label><textarea id="wu-note" placeholder="${completionMode ? 'Describe the repair, checks, and result...' : 'Describe the latest work progress...'}"></textarea></div>
        ${attachmentsFieldHtml('wu-attachments', completionMode ? 'Completion Photos / Videos' : 'Update Photos / Videos', [])}
      </div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveWOUpdate('${w.id}',${completionMode ? 'true' : 'false'})">${completionMode ? 'Complete Work Order' : 'Save Update'}</button>
    </div>
   </div>`;
  overlay.classList.add('show');
  setTimeout(() => {
    const focusNode = $('#wu-note');
    if(focusNode) focusNode.focus();
  }, 50);
}
async function saveWOUpdate(id, completionMode){
  const w = WOS.find(row => row.id === id);
  if(!w) return;
  const errBox = $('#form-err');
  const noteNode = $('#wu-note');
  const showErr = msg => {
    errBox.textContent = msg;
    errBox.classList.add('show');
  };
  errBox.classList.remove('show');
  noteNode.classList.remove('bad');

  let attachments = [];
  try{
    attachments = await attachmentsFromInput('wu-attachments');
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

  const status = completionMode ? 'Completed' : $('#wu-status').value;
  const author = $('#wu-technician').value.trim() || w.technician || defaultTechnicianName() || currentUserName();
  const date = $('#wu-date').value || WO_TODAY;
  const labourHrs = Math.max(0, parseFloat($('#wu-labourHrs').value) || 0);
  const downtimeHrs = Math.max(0, parseFloat($('#wu-downtimeHrs').value) || 0);
  const update = normalizeWOUpdate({
    id:nextWOUpdateId(w),
    date,
    author,
    status,
    note,
    labourHrs,
    downtimeHrs,
    attachments
  }, status);

  w.updates = [...(w.updates || []), update];
  w.status = status;
  w.technician = author;
  w.completed = status === 'Completed' ? date : '';
  w.labourHrs = Math.round(((Number(w.labourHrs) || 0) + labourHrs) * 100) / 100;
  w.downtimeHrs = Math.round(((Number(w.downtimeHrs) || 0) + downtimeHrs) * 100) / 100;
  const stampedNote = `${date}${author ? ' - ' + author : ''}: ${note}`;
  w.resolution = w.resolution ? `${w.resolution}\n\n${stampedNote}` : stampedNote;

  if(author) mergeIntoSettingList('technicians', author);
  persistWOs();
  refreshWOBadges();
  closeModal();
  toast(status === 'Completed' ? `${id} completed with evidence.` : `Update logged on ${id}.`);
  go('wo-detail', id);
}

/* ============================================================
   DELETE / REVERT / EXPORT
   ============================================================ */
function confirmDeleteWO(id){
  const w = WOS.find(row => row.id === id);
  if(!w) return;
  modalHost.innerHTML = `
   <div class="modal confirm-box">
    <div class="modal-head"><h3>Delete Work Order</h3><div class="x" onclick="closeModal()">x</div></div>
    <div class="modal-body">
      <p>Delete <b>${w.id} - ${esc(w.title)}</b>?</p>
      <p style="margin-top:10px;color:var(--ink-soft)">This change is stored in your browser. Use <b>Export work_orders.js</b> to make it permanent.</p>
    </div>
    <div class="modal-foot">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-danger" onclick="doDeleteWO('${id}')">Delete</button>
    </div>
   </div>`;
  overlay.classList.add('show');
}
function doDeleteWO(id){
  const idx = WOS.findIndex(row => row.id === id);
  if(idx >= 0){
    WOS.splice(idx, 1);
    persistWOs();
    refreshWOBadges();
  }
  closeModal();
  toast(`Work order ${id} deleted.`);
  go('work-orders');
}
function confirmResetWOs(){
  modalHost.innerHTML = `
   <div class="modal confirm-box">
    <div class="modal-head"><h3>Revert Work Orders</h3><div class="x" onclick="closeModal()">x</div></div>
    <div class="modal-body">
      <p>Discard all local work-order edits and reload from the original <span class="mono">CMMS_Data/work_orders.js</span> file?</p>
      <p style="margin-top:10px;color:var(--ink-soft)">Anything you have not exported will be lost.</p>
    </div>
    <div class="modal-foot">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-danger" onclick="closeModal(); resetWOsToFile(); WOS = WOS.map(normalizeWORecord); go('work-orders')">Revert to file</button>
    </div>
   </div>`;
  overlay.classList.add('show');
}
function exportWorkOrders(){
  const header =
'/* ============================================================\n' +
'   CMMS DATA FILE - Work Orders\n' +
'   Exported from the CMMS app on ' + new Date().toLocaleString('en-GB') + '\n' +
'   Replace CMMS_Data/work_orders.js with this file to make edits permanent.\n' +
'   ============================================================ */\n' +
'window.CMMS_DB = window.CMMS_DB || {};\n' +
'window.CMMS_DB.workOrders = ';
  const content = header + JSON.stringify(WOS.map(normalizeWORecord), null, 2) + ';\n';
  downloadText(content, 'work_orders.js', 'text/javascript');
  clearWODirty();
  toast('work_orders.js downloaded.');
  if(current === 'work-orders') go('work-orders');
}

/* ----- register routes ----- */
ROUTES['work-orders'] = renderWorkOrders;
ROUTES['wo-detail'] = renderWODetail;
