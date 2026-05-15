/* ============================================================
   CMMS - MODULE: ASSIGNED TASKS
   Personal queue for the signed-in user.
   ============================================================ */
function assignedTaskWorkOrders(userName){
  return WOS
    .filter(w => w.status !== 'Completed' && String(w.technician || '').trim() === userName)
    .sort((a, b) => {
      const aDue = a.due || '9999-12-31';
      const bDue = b.due || '9999-12-31';
      if(aDue !== bDue) return aDue.localeCompare(bDue);
      return String(a.id).localeCompare(String(b.id));
    });
}
function assignedTaskPMs(userName){
  return (Array.isArray(PMS) ? PMS : [])
    .filter(p => p.active && String(p.technician || '').trim() === userName)
    .sort((a, b) => {
      const aDue = a.nextDue || '9999-12-31';
      const bDue = b.nextDue || '9999-12-31';
      if(aDue !== bDue) return aDue.localeCompare(bDue);
      return String(a.id).localeCompare(String(b.id));
    });
}
function assignedTaskRequests(userName){
  return (typeof REQUESTS !== 'undefined' ? REQUESTS : [])
    .filter(req => String(req.requester || '').trim() === userName && !['Rejected','Completed'].includes(req.status))
    .sort((a, b) => {
      const aDue = a.due || '9999-12-31';
      const bDue = b.due || '9999-12-31';
      if(aDue !== bDue) return aDue.localeCompare(bDue);
      return String(a.id).localeCompare(String(b.id));
    });
}
function assignedTaskFocusItems(userName){
  const woItems = assignedTaskWorkOrders(userName).map(w => ({
    type: 'wo',
    code: w.id,
    title: w.title,
    route: 'wo-detail',
    refId: w.id,
    due: w.due || '',
    status: w.status,
    note: `${woAssetName(w.assetId)} | ${w.priority}${w.due ? ` | due ${fmtDate(w.due)}` : ''}`,
    urgency: w.due ? daysFromToday(w.due) : 99
  }));
  const pmItems = assignedTaskPMs(userName)
    .filter(p => daysFromToday(p.nextDue) <= SETTINGS.pmDueSoonDays)
    .map(p => ({
      type: 'pm',
      code: p.id,
      title: p.title,
      route: 'pm-detail',
      refId: p.id,
      due: p.nextDue || '',
      status: pmStatus(p),
      note: `${pmAssetName(p.assetId)} | ${p.frequency}${p.nextDue ? ` | due ${fmtDate(p.nextDue)}` : ''}`,
      urgency: p.nextDue ? daysFromToday(p.nextDue) : 99
    }));
  const requestItems = assignedTaskRequests(userName)
    .filter(req => !req.woId || req.status !== 'Converted')
    .map(req => ({
      type: 'request',
      code: req.id,
      title: req.title,
      route: 'request-detail',
      refId: req.id,
      due: req.due || '',
      status: req.status,
      note: `${requestTargetName(req)}${req.due ? ` | due ${fmtDate(req.due)}` : ''}`,
      urgency: req.due ? daysFromToday(req.due) : 99
    }));

  return [...woItems, ...pmItems, ...requestItems]
    .sort((a, b) => {
      if(a.urgency !== b.urgency) return a.urgency - b.urgency;
      return String(a.code).localeCompare(String(b.code));
    })
    .slice(0, 8);
}
function assignedTaskTypePill(item){
  return {
    wo: 'pill-med',
    pm: 'pill-done',
    request: 'pill-open'
  }[item.type] || 'pill-low';
}
function assignedTaskEmptyState(title, detail){
  return `<div style="padding:18px;color:var(--ink-soft);font-size:13px">${esc(title)}${detail ? `<div style="margin-top:6px;font-size:12px">${esc(detail)}</div>` : ''}</div>`;
}
function refreshAssignedTaskBadge(){
  const badge = $('#sb-tasks');
  if(!badge) return;
  if(!sessionAuthenticated()){
    badge.textContent = '0';
    return;
  }
  const userName = currentUserName();
  badge.textContent = assignedTaskWorkOrders(userName).length + assignedTaskPMs(userName).filter(p => daysFromToday(p.nextDue) <= SETTINGS.pmDueSoonDays).length;
}
function renderAssignedTasks(){
  if(!sessionAuthenticated()){
    openLoginModal(SESSION.userId || 'admin', {force:true, message:LOGIN_REQUIRED_TEXT});
    return;
  }

  const userName = currentUserName();
  const userRole = currentUserRole();
  const assignedWOs = assignedTaskWorkOrders(userName);
  const assignedPM = assignedTaskPMs(userName);
  const openRequests = assignedTaskRequests(userName);
  const focusItems = assignedTaskFocusItems(userName);

  const woOverdue = assignedWOs.filter(woIsOverdue).length;
  const woInProgress = assignedWOs.filter(w => w.status === 'In Progress').length;
  const pmDueSoon = assignedPM.filter(p => daysFromToday(p.nextDue) <= SETTINGS.pmDueSoonDays).length;
  const pmOverdue = assignedPM.filter(p => daysFromToday(p.nextDue) < 0).length;
  const reqWaiting = openRequests.filter(req => ['New','Screening','Approved'].includes(req.status)).length;
  const reqConverted = openRequests.filter(req => req.status === 'Converted').length;
  refreshAssignedTaskBadge();

  view.innerHTML = `
    <div class="page-head">
      <div><h1>Assigned Tasks</h1><div class="ph-sub">Personal work queue for ${esc(userName)}.</div></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        ${hasPermission('requests.manage') ? `<button class="btn btn-ghost" onclick="openRequestModal('add')">+ New Request</button>` : ''}
        ${hasPermission('workorders.manage') ? `<button class="btn btn-primary" onclick="openWOModal('add')">+ New Work Order</button>` : ''}
      </div>
    </div>
    <div class="shared-note">
      <div>
        <b>${esc(userRole)} workload</b>
        <p>This screen collects the work orders assigned to you, PM schedules under your name, and the requests you raised that still need follow-up.</p>
      </div>
      <div class="shared-note-actions">
        <button class="btn btn-ghost" data-nav="calendar">Open Calendar</button>
        <button class="btn btn-ghost" data-nav="dashboard">Back to Dashboard</button>
      </div>
    </div>
    <div class="kpis" style="margin-bottom:18px">
      <div class="kpi"><div class="k-top"><div><div class="k-val">${assignedWOs.length}</div><div class="k-label">Open Work Orders</div></div><div class="k-ico ico-blue">WO</div></div><div class="k-trend ${woOverdue ? 'trend-down' : 'trend-up'}">${woOverdue} overdue | ${woInProgress} in progress</div></div>
      <div class="kpi"><div class="k-top"><div><div class="k-val">${assignedPM.length}</div><div class="k-label">Assigned PM Routes</div></div><div class="k-ico ico-green">PM</div></div><div class="k-trend ${pmOverdue ? 'trend-down' : 'trend-up'}">${pmDueSoon} due soon | ${pmOverdue} overdue</div></div>
      <div class="kpi"><div class="k-top"><div><div class="k-val">${reqWaiting}</div><div class="k-label">Requests Waiting</div></div><div class="k-ico ico-orange">RQ</div></div><div class="k-trend trend-up">${reqConverted} already converted to WO</div></div>
      <div class="kpi"><div class="k-top"><div><div class="k-val">${focusItems.length}</div><div class="k-label">Priority Focus</div></div><div class="k-ico ico-red">NOW</div></div><div class="k-trend trend-up">Top urgent tasks across your queue</div></div>
    </div>
    <div class="panel" style="margin-bottom:18px">
      <div class="panel-head"><b>Today Focus</b><span style="font-size:12px;color:var(--ink-soft)">Items due now or needing immediate attention</span></div>
      ${focusItems.length ? focusItems.map(item => `
        <div class="wo-line" style="cursor:pointer" onclick="go('${item.route}','${item.refId}')">
          <div class="wo-pri" style="background:${item.urgency < 0 ? 'var(--red)' : item.urgency === 0 ? 'var(--orange)' : 'var(--blue)'}"></div>
          <div style="flex:1;min-width:0">
            <b style="font-size:13px;display:block">${esc(item.code)} | ${esc(item.title)}</b>
            <span style="font-size:11.5px;color:var(--ink-soft)">${esc(item.note)}</span>
          </div>
          <span class="pill ${assignedTaskTypePill(item)}">${esc(item.type.toUpperCase())}</span>
          <span class="pill ${item.type === 'wo' ? woStatusClass(item.status) : item.type === 'request' ? requestStatusClass(item.status) : pmStatusClass(item.status)}">${esc(item.status)}</span>
        </div>`).join('') : assignedTaskEmptyState('No urgent items right now.', 'Your queue is clear for today based on current due dates and statuses.')}
    </div>
    <div class="cols">
      <div>
        <div class="panel" style="margin-bottom:18px">
          <div class="panel-head"><b>Assigned Work Orders</b><span style="font-size:12px;color:var(--ink-soft)">${assignedWOs.length} open</span></div>
          ${assignedWOs.length ? assignedWOs.map(w => `
            <div class="wo-line" style="cursor:pointer" onclick="go('wo-detail','${w.id}')">
              <div class="wo-pri" style="background:${priColor(w.priority)}"></div>
              <div style="flex:1;min-width:0">
                <b style="font-size:13px;display:block">${esc(w.id)} | ${esc(w.title)}</b>
                <span style="font-size:11.5px;color:var(--ink-soft)">${esc(woAssetName(w.assetId))} | ${esc(w.type)}${w.due ? ` | due ${fmtDate(w.due)}` : ''}</span>
              </div>
              <span class="pill ${woStatusClass(w.status)}">${esc(w.status)}</span>
            </div>`).join('') : assignedTaskEmptyState('No active work orders are assigned to you.', 'When a work order technician matches your signed-in name, it will appear here.')}
        </div>
        <div class="panel">
          <div class="panel-head"><b>Requests Raised By You</b><span style="font-size:12px;color:var(--ink-soft)">${openRequests.length} open</span></div>
          ${openRequests.length ? openRequests.map(req => `
            <div class="wo-line" style="cursor:pointer" onclick="go('request-detail','${req.id}')">
              <div class="wo-pri" style="background:${req.due && daysFromToday(req.due) < 0 ? 'var(--red)' : 'var(--orange)'}"></div>
              <div style="flex:1;min-width:0">
                <b style="font-size:13px;display:block">${esc(req.id)} | ${esc(req.title)}</b>
                <span style="font-size:11.5px;color:var(--ink-soft)">${esc(requestTargetName(req))}${req.due ? ` | due ${fmtDate(req.due)}` : ''}${req.woId ? ` | WO ${esc(req.woId)}` : ''}</span>
              </div>
              <span class="pill ${requestStatusClass(req.status)}">${esc(req.status)}</span>
            </div>`).join('') : assignedTaskEmptyState('No open requests raised by you.', 'Create a new request if you need maintenance support from another team member.')}
        </div>
      </div>
      <div>
        <div class="panel" style="margin-bottom:18px">
          <div class="panel-head"><b>Assigned PM Schedules</b><span style="font-size:12px;color:var(--ink-soft)">${assignedPM.length} active</span></div>
          ${assignedPM.length ? assignedPM.map(p => {
            const status = pmStatus(p);
            return `
            <div class="wo-line" style="cursor:pointer" onclick="go('pm-detail','${p.id}')">
              <div class="wo-pri" style="background:${status === 'Overdue' ? 'var(--red)' : status === 'Due Soon' ? 'var(--orange)' : 'var(--green)'}"></div>
              <div style="flex:1;min-width:0">
                <b style="font-size:13px;display:block">${esc(p.id)} | ${esc(p.title)}</b>
                <span style="font-size:11.5px;color:var(--ink-soft)">${esc(pmAssetName(p.assetId))} | ${esc(p.frequency)}${p.nextDue ? ` | due ${fmtDate(p.nextDue)}` : ''}</span>
              </div>
              <span class="pill ${pmStatusClass(status)}">${esc(status)}</span>
            </div>`;
          }).join('') : assignedTaskEmptyState('No PM schedules are assigned to you.', 'PM routes appear here when the schedule technician matches your signed-in name.')}
        </div>
        <div class="panel">
          <div class="panel-head"><b>Quick Guidance</b></div>
          <div class="panel-body">
            <div class="kv-list">
              <div><span>Work Orders</span><b>Start, update, or complete them from the detail page.</b></div>
              <div><span>PM Tasks</span><b>Use the PM detail page to log completion or raise a WO.</b></div>
              <div><span>Requests</span><b>Track whether your requests are screened, approved, or converted.</b></div>
              <div><span>Shared Planning</span><b>Open the Maintenance Calendar to compare your queue with the team schedule.</b></div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  bindNav();
}

ROUTES['my-tasks'] = renderAssignedTasks;
refreshAssignedTaskBadge();
