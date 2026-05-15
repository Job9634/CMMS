/* ============================================================
   CMMS - MODULE: TECHNICIANS & STAFF
   User accounts, roles, and team roster.
   ============================================================ */
let peopleFilters = {q:'', role:'', dept:'', active:''};

function peopleRecordById(id){
  return STAFF.find(user => user.id === id);
}
function peopleStatusPill(user){
  if(!user.active) return 'pill-hold';
  if(!user.canLogin) return 'pill-low';
  return 'pill-done';
}
function peopleStatusText(user){
  if(!user.active) return 'Inactive';
  if(!user.canLogin) return 'No Login';
  return 'Active';
}
function peopleDepartments(){
  return uniqList(STAFF.map(user => user.department));
}
function peopleAssignmentSummary(user){
  const openWOs = WOS.filter(w => w.status !== 'Completed' && w.technician === user.name).length;
  const completedWOs = WOS.filter(w => w.status === 'Completed' && w.technician === user.name).length;
  const pmRows = typeof PMS !== 'undefined' ? PMS.filter(p => p.technician === user.name) : [];
  const requestsRaised = typeof REQUESTS !== 'undefined' ? REQUESTS.filter(req => req.requester === user.name).length : 0;
  return {openWOs, completedWOs, pmRows, requestsRaised};
}
function peopleAssignedWOs(user){
  return WOS.filter(w => w.technician === user.name);
}
function peopleManagedPMs(user){
  return typeof PMS !== 'undefined' ? PMS.filter(p => p.technician === user.name) : [];
}
function renderTechnicians(){
  const dirty = usersDirty();
  const activeUsers = STAFF.filter(user => user.active).length;
  const technicians = STAFF.filter(user => ['Admin','Supervisor','Technician'].includes(user.role)).length;
  const staffUsers = STAFF.filter(user => user.role === 'Staff').length;
  const loginUsers = STAFF.filter(user => user.active && user.canLogin).length;

  view.innerHTML = `
    <div class="page-head">
      <div><h1>Technicians & Staff</h1><div class="ph-sub">Manage maintenance technicians, normal staff, and local user login accounts.</div></div>
      ${canManageUsers() ? `<button class="btn btn-primary" onclick="openPersonModal('add')">+ New User</button>` : ''}
    </div>
    <div class="databar ${dirty ? '' : 'clean'}">
      ${dirty
        ? `<b>Unsaved account changes</b><span>User account updates are stored in this browser until you export a snapshot.</span>`
        : `<b>Accounts ready</b><span>The local team roster and login accounts are loaded.</span>`}
      <span class="spacer"></span>
      <button class="btn btn-ghost btn-sm" onclick="exportUsersSnapshot()">Export users</button>
      ${canManageUsers() ? `<button class="btn btn-ghost btn-sm" onclick="openLoginModal()">Switch user</button>` : ''}
      ${dirty && canManageUsers() ? `<button class="btn btn-ghost btn-sm" onclick="confirmResetUsers()">Revert</button>` : ''}
    </div>
    <div class="kpis" style="margin-bottom:18px">
      <div class="kpi"><div class="k-top"><div><div class="k-val">${activeUsers}</div><div class="k-label">Active Users</div></div><div class="k-ico ico-green">US</div></div></div>
      <div class="kpi"><div class="k-top"><div><div class="k-val">${technicians}</div><div class="k-label">Tech / Admin</div></div><div class="k-ico ico-orange">TM</div></div></div>
      <div class="kpi"><div class="k-top"><div><div class="k-val">${staffUsers}</div><div class="k-label">Normal Staff</div></div><div class="k-ico ico-blue">ST</div></div></div>
      <div class="kpi"><div class="k-top"><div><div class="k-val">${loginUsers}</div><div class="k-label">Login Enabled</div></div><div class="k-ico ico-steel">ID</div></div></div>
    </div>
    <div class="toolbar">
      <input class="tb-search" id="pp-q" placeholder="Search by user ID, name, department, role..." value="${esc(peopleFilters.q)}">
      <select id="pp-role"><option value="">All Roles</option>${USER_ROLES.map(v => `<option ${peopleFilters.role === v ? 'selected' : ''}>${v}</option>`).join('')}</select>
      <select id="pp-dept"><option value="">All Departments</option>${peopleDepartments().map(v => `<option ${peopleFilters.dept === v ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select>
      <select id="pp-active">
        <option value="">Any Status</option>
        <option value="active" ${peopleFilters.active === 'active' ? 'selected' : ''}>Active</option>
        <option value="inactive" ${peopleFilters.active === 'inactive' ? 'selected' : ''}>Inactive</option>
      </select>
      <span class="tb-count" id="pp-count"></span>
    </div>
    <div class="tbl-wrap"><table>
      <thead><tr>
        <th>User ID</th><th>Name</th><th>Role</th><th>Department</th><th>Shift</th><th>Status</th><th>Permissions</th><th>Workload</th><th style="text-align:right">Actions</th>
      </tr></thead>
      <tbody id="pp-rows"></tbody>
    </table></div>`;

  const apply = () => {
    peopleFilters.q = $('#pp-q').value.toLowerCase();
    peopleFilters.role = $('#pp-role').value;
    peopleFilters.dept = $('#pp-dept').value;
    peopleFilters.active = $('#pp-active').value;
    const rows = STAFF.filter(user => {
      const hay = `${user.id} ${user.name} ${user.department} ${user.role} ${user.title}`.toLowerCase();
      const activeOk = !peopleFilters.active || (peopleFilters.active === 'active' ? user.active : !user.active);
      return hay.includes(peopleFilters.q)
        && (!peopleFilters.role || user.role === peopleFilters.role)
        && (!peopleFilters.dept || user.department === peopleFilters.dept)
        && activeOk;
    });
    $('#pp-rows').innerHTML = rows.length ? rows.map(user => {
      const summary = peopleAssignmentSummary(user);
      const self = currentUserId() === user.id;
      return `<tr onclick="go('technician-detail','${user.id}')">
        <td class="mono">${esc(user.id)}</td>
        <td><b>${esc(user.name)}</b><div style="font-size:11.5px;color:var(--ink-soft)">${esc(user.title || user.role)}${self ? ' | Signed in' : ''}</div></td>
        <td><span class="pill pill-low">${esc(user.role)}</span></td>
        <td>${esc(user.department)}</td>
        <td>${esc(user.shift || '-')}</td>
        <td><span class="pill ${peopleStatusPill(user)}">${peopleStatusText(user)}</span></td>
        <td>${permissionCount(user)} of ${PERMISSION_DEFS.length}</td>
        <td>${summary.openWOs} WO | ${summary.pmRows.length} PM</td>
        <td style="text-align:right;white-space:nowrap" onclick="event.stopPropagation()">
          <button class="iconbtn" onclick="go('technician-detail','${user.id}')">Open</button>
          ${canManageUsers() ? `<button class="iconbtn" onclick="openPersonModal('edit','${user.id}')">Edit</button>` : ''}
        </td>
      </tr>`;
    }).join('') : `<tr><td colspan="9" style="text-align:center;color:var(--ink-soft);padding:30px">No users match the current filters.</td></tr>`;
    $('#pp-count').textContent = `Showing ${rows.length} of ${STAFF.length} users`;
  };
  ['pp-q','pp-role','pp-dept','pp-active'].forEach(id => {
    $('#' + id).addEventListener('input', apply);
    $('#' + id).addEventListener('change', apply);
  });
  apply();
}

function renderTechnicianDetail(id){
  const user = peopleRecordById(id);
  if(!user){ renderTechnicians(); return; }
  const summary = peopleAssignmentSummary(user);
  const assignedWOs = peopleAssignedWOs(user);
  const assignedPMs = peopleManagedPMs(user);
  const ownAccount = currentUserId() === user.id;

  view.innerHTML = `
    <div class="back" onclick="go('technicians')"><- Back to Technicians & Staff</div>
    <div class="detail-hero">
      <div style="width:96px;height:96px;border-radius:50%;flex-shrink:0;background:var(--steel-700);display:flex;align-items:center;justify-content:center;color:#fff;font-size:28px;font-weight:800">${esc(initialsFor(user.name))}</div>
      <div class="dh-main">
        <h1>${esc(user.name)}</h1>
        <div class="dh-meta"><span class="mono">${esc(user.id)}</span> | ${esc(user.title || user.role)} | ${esc(user.department)}</div>
        <div class="dh-tags">
          <span class="pill pill-low">${esc(user.role)}</span>
          <span class="pill ${peopleStatusPill(user)}">${peopleStatusText(user)}</span>
          ${ownAccount ? '<span class="pill pill-med">Current Session</span>' : ''}
        </div>
      </div>
      <div class="dh-actions">
        ${canManageUsers() ? `<button class="btn btn-primary" onclick="openPersonModal('edit','${user.id}')">Edit User</button>` : ''}
        ${canManageUsers() ? `<button class="btn btn-ghost" onclick="openPasswordModal('${user.id}')">Reset Password</button>` : `<button class="btn btn-ghost" onclick="openLoginModal('${user.id}')">Switch User</button>`}
      </div>
    </div>
    <div class="statgrid">
      <div class="stat"><div class="s-label">Open WOs</div><div class="s-val">${summary.openWOs}</div></div>
      <div class="stat"><div class="s-label">Completed WOs</div><div class="s-val">${summary.completedWOs}</div></div>
      <div class="stat"><div class="s-label">PM Routes</div><div class="s-val">${summary.pmRows.length}</div></div>
      <div class="stat"><div class="s-label">Requests Raised</div><div class="s-val">${summary.requestsRaised}</div></div>
    </div>
    <div class="cols">
      <div>
        <div class="panel" style="margin-bottom:18px">
          <div class="panel-head"><b>Account Profile</b></div>
          <div class="panel-body">
            <div class="kv-list">
              <div><span>User ID</span><b class="mono">${esc(user.id)}</b></div>
              <div><span>Role</span><b>${esc(user.role)}</b></div>
              <div><span>Department</span><b>${esc(user.department)}</b></div>
              <div><span>Shift</span><b>${esc(user.shift || '-')}</b></div>
              <div><span>Phone</span><b>${esc(user.phone || '-')}</b></div>
              <div><span>Email</span><b>${esc(user.email || '-')}</b></div>
              <div><span>Login</span><b>${user.canLogin ? 'Enabled' : 'Disabled'}</b></div>
              <div><span>Permissions</span><b>${permissionCount(user)} granted</b></div>
            </div>
          </div>
        </div>
        <div class="panel" style="margin-bottom:18px">
          <div class="panel-head"><b>Permissions</b>${canManageSettings() ? `<a onclick="openPermissionModal('${user.id}')">Edit access</a>` : ''}</div>
          <div class="panel-body">
            <div class="chip-row">${permissionBadges(user)}</div>
          </div>
        </div>
        <div class="panel" style="margin-bottom:18px">
          <div class="panel-head"><b>Skills</b></div>
          <div class="panel-body">
            <div class="chip-row">
              ${(user.skills || []).length ? user.skills.map(skill => `<span class="chip">${esc(skill)}</span>`).join('') : '<span style="color:var(--ink-soft);font-size:13px">No skills recorded.</span>'}
            </div>
          </div>
        </div>
        <div class="panel">
          <div class="panel-head"><b>Notes</b></div>
          <div class="panel-body" style="font-size:13px;line-height:1.6">${esc(user.notes || 'No notes recorded.')}</div>
        </div>
      </div>
      <div>
        <div class="panel" style="margin-bottom:18px">
          <div class="panel-head"><b>Assigned Work Orders</b></div>
          ${assignedWOs.length ? assignedWOs.slice(0, 8).map(w => `
            <div class="wo-line" onclick="go('wo-detail','${w.id}')" style="cursor:pointer">
              <div class="wo-pri" style="background:${priColor(w.priority)}"></div>
              <div style="flex:1;min-width:0">
                <b style="font-size:12.5px;display:block">${w.id} | ${esc(w.title)}</b>
                <span style="font-size:11.5px;color:var(--ink-soft)">${esc(woAssetName(w.assetId))}</span>
              </div>
              <span class="pill ${woStatusClass(w.status)}">${w.status}</span>
            </div>`).join('') : `<div style="padding:18px;color:var(--ink-soft);font-size:13px">No work orders assigned.</div>`}
        </div>
        <div class="panel">
          <div class="panel-head"><b>Assigned PM Schedules</b></div>
          ${assignedPMs.length ? assignedPMs.slice(0, 8).map(pm => `
            <div class="wo-line" onclick="go('pm-detail','${pm.id}')" style="cursor:pointer">
              <div class="wo-pri" style="background:var(--blue)"></div>
              <div style="flex:1;min-width:0">
                <b style="font-size:12.5px;display:block">${pm.id} | ${esc(pm.title)}</b>
                <span style="font-size:11.5px;color:var(--ink-soft)">${esc(woAssetName(pm.assetId))}</span>
              </div>
              <span class="pill pill-med">${esc(pm.frequency)}</span>
            </div>`).join('') : `<div style="padding:18px;color:var(--ink-soft);font-size:13px">No PM schedules assigned.</div>`}
        </div>
      </div>
    </div>
    ${canManageUsers() ? `<div class="panel" style="margin-top:18px">
      <div class="panel-head"><b>Account Controls</b><span style="font-size:12px;color:var(--ink-soft)">Admin only</span></div>
      <div class="panel-body people-actions">
        <button class="btn btn-ghost" onclick="openLoginModal('${user.id}')">Test Login</button>
        <button class="btn btn-ghost" onclick="openPasswordModal('${user.id}')">Reset Password</button>
        ${user.id !== 'admin' ? `<button class="btn btn-danger" onclick="confirmDeleteUser('${user.id}')">Delete User</button>` : ''}
      </div>
    </div>` : ''}`;
}

function openPersonModal(mode, id){
  if(!canManageUsers()){
    toast('Only admin can manage user accounts.');
    return;
  }
  const editing = mode === 'edit';
  const user = editing ? peopleRecordById(id) : normalizeStaffUser({
    id:'',
    password:'changeme',
    name:'',
    role:'Technician',
    department:'Maintenance',
    title:'Maintenance Technician',
    shift:SETTINGS.shiftLabel || 'Current Shift',
    phone:'',
    email:'',
    active:true,
    canLogin:true,
    skills:[],
    notes:''
  });
  if(editing && !user){ toast('User not found.'); return; }
  modalHost.innerHTML = `
   <div class="modal">
    <div class="modal-head"><h3>${editing ? 'Edit User - ' + user.id : 'New User Account'}</h3><div class="x" onclick="closeModal()">x</div></div>
    <div class="modal-body">
      <div class="form-err" id="form-err"></div>
      <div class="form-grid">
        <div class="field"><label>User ID <span class="req">*</span></label><input id="u-id" ${editing ? 'readonly' : ''} value="${esc(user.id)}" placeholder="e.g. tech01"></div>
        <div class="field"><label>Password <span class="req">*</span></label><input id="u-password" value="${esc(user.password)}" placeholder="Local demo password"></div>
        <div class="field"><label>Full Name <span class="req">*</span></label><input id="u-name" value="${esc(user.name)}"></div>
        <div class="field"><label>Role</label><select id="u-role">${USER_ROLES.map(v => `<option ${user.role === v ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
        <div class="field"><label>Department</label><input id="u-department" value="${esc(user.department)}"></div>
        <div class="field"><label>Title</label><input id="u-title" value="${esc(user.title)}"></div>
        <div class="field"><label>Shift</label><input id="u-shift" value="${esc(user.shift)}"></div>
        <div class="field"><label>Phone</label><input id="u-phone" value="${esc(user.phone)}"></div>
        <div class="field"><label>Email</label><input id="u-email" value="${esc(user.email)}"></div>
        <div class="field"><label>Status</label><select id="u-active"><option value="true" ${user.active ? 'selected' : ''}>Active</option><option value="false" ${!user.active ? 'selected' : ''}>Inactive</option></select></div>
        <div class="field"><label>Login Access</label><select id="u-canLogin"><option value="true" ${user.canLogin ? 'selected' : ''}>Enabled</option><option value="false" ${!user.canLogin ? 'selected' : ''}>Disabled</option></select></div>
        <div class="field full"><label>Skills</label><textarea id="u-skills" placeholder="One skill per line">${esc((user.skills || []).join('\n'))}</textarea></div>
        <div class="field full"><label>Notes</label><textarea id="u-notes">${esc(user.notes || '')}</textarea></div>
      </div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="savePerson('${mode}','${editing ? user.id : ''}')">${editing ? 'Save Changes' : 'Create User'}</button>
    </div>
   </div>`;
  overlay.classList.add('show');
}

function savePerson(mode, origId){
  if(!canManageUsers()) return;
  const errBox = $('#form-err');
  const g = id => $('#u-' + id);
  const showErr = msg => {
    errBox.textContent = msg;
    errBox.classList.add('show');
  };
  errBox.classList.remove('show');
  ['id','name','password'].forEach(key => {
    const node = g(key);
    if(node) node.classList.remove('bad');
  });
  const rec = normalizeStaffUser({
    id:g('id').value,
    password:g('password').value,
    name:g('name').value,
    role:g('role').value,
    department:g('department').value,
    title:g('title').value,
    shift:g('shift').value,
    phone:g('phone').value,
    email:g('email').value,
    active:g('active').value === 'true',
    canLogin:g('canLogin').value === 'true',
    permissions:mode === 'edit' && peopleRecordById(origId) ? peopleRecordById(origId).permissions : undefined,
    skills:(g('skills').value || '').split(/\r?\n/),
    notes:g('notes').value
  });
  if(!rec.id){ g('id').classList.add('bad'); showErr('User ID is required.'); return; }
  if(!rec.name){ g('name').classList.add('bad'); showErr('Full name is required.'); return; }
  if(!rec.password){ g('password').classList.add('bad'); showErr('Password is required.'); return; }

  if(mode === 'add' && peopleRecordById(rec.id)){
    g('id').classList.add('bad');
    showErr('That user ID already exists.');
    return;
  }
  if(mode === 'add'){
    STAFF.push(rec);
  }else{
    const idx = STAFF.findIndex(user => user.id === origId);
    if(idx < 0){ showErr('Original user no longer exists.'); return; }
    if(origId === currentUserId() && !rec.active){
      showErr('You cannot deactivate the account that is currently signed in.');
      return;
    }
    if(origId === currentUserId() && !rec.canLogin){
      showErr('You cannot disable login for the account that is currently signed in.');
      return;
    }
    STAFF[idx] = rec;
  }
  persistUsers();
  applySettingsToShell();
  closeModal();
  toast(mode === 'add' ? `User ${rec.id} created.` : `User ${origId} updated.`);
  go('technicians');
}

function openPasswordModal(id){
  if(!canManageUsers()){
    toast('Only admin can reset passwords.');
    return;
  }
  const user = peopleRecordById(id);
  if(!user) return;
  modalHost.innerHTML = `
   <div class="modal confirm-box">
    <div class="modal-head"><h3>Reset Password</h3><div class="x" onclick="closeModal()">x</div></div>
    <div class="modal-body">
      <div class="form-err" id="pw-err"></div>
      <p style="margin-bottom:12px">Set a new local password for <b>${esc(user.name)}</b> (<span class="mono">${esc(user.id)}</span>).</p>
      <div class="field"><label>New Password</label><input id="pw-value" value="${esc(user.password)}"></div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="savePassword('${user.id}')">Save Password</button>
    </div>
   </div>`;
  overlay.classList.add('show');
}
function savePassword(id){
  const user = peopleRecordById(id);
  const value = ($('#pw-value').value || '').trim();
  const err = $('#pw-err');
  if(err) err.classList.remove('show');
  if(!user || !value){
    if(err){
      err.textContent = 'Password is required.';
      err.classList.add('show');
    }
    return;
  }
  user.password = value;
  persistUsers();
  closeModal();
  toast(`Password updated for ${user.id}.`);
  go(current === 'technician-detail' ? 'technician-detail' : 'technicians', id);
}

function confirmDeleteUser(id){
  if(!canManageUsers()){
    toast('Only admin can delete users.');
    return;
  }
  const user = peopleRecordById(id);
  if(!user) return;
  modalHost.innerHTML = `
   <div class="modal confirm-box">
    <div class="modal-head"><h3>Delete User</h3><div class="x" onclick="closeModal()">x</div></div>
    <div class="modal-body">
      <p>Delete <b>${esc(user.name)}</b> (<span class="mono">${esc(user.id)}</span>) from the local team roster?</p>
      <p style="margin-top:10px;color:var(--ink-soft)">This does not delete existing work-order history. It only removes the login account and roster record.</p>
    </div>
    <div class="modal-foot">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-danger" onclick="doDeleteUser('${id}')">Delete User</button>
    </div>
   </div>`;
  overlay.classList.add('show');
}
function doDeleteUser(id){
  if(id === currentUserId()){
    toast('You cannot delete the account that is currently signed in.');
    return;
  }
  const idx = STAFF.findIndex(user => user.id === id);
  if(idx < 0) return;
  STAFF.splice(idx, 1);
  persistUsers();
  ensureSessionUser();
  applySettingsToShell();
  closeModal();
  toast(`User ${id} deleted.`);
  go('technicians');
}

function confirmResetUsers(){
  if(!canManageUsers()){
    toast('Only admin can revert user accounts.');
    return;
  }
  modalHost.innerHTML = `
   <div class="modal confirm-box">
    <div class="modal-head"><h3>Revert User Accounts</h3><div class="x" onclick="closeModal()">x</div></div>
    <div class="modal-body">
      <p>Discard all local account edits and restore the seeded roster?</p>
      <p style="margin-top:10px;color:var(--ink-soft)">Any new users or password changes that were not exported will be lost.</p>
    </div>
    <div class="modal-foot">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-danger" onclick="closeModal();resetUsersToSeed();go('technicians')">Revert Accounts</button>
    </div>
   </div>`;
  overlay.classList.add('show');
}

ROUTES['technicians'] = renderTechnicians;
ROUTES['technician-detail'] = renderTechnicianDetail;
