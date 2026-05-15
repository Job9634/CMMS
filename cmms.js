/* ============================================================
   CMMS SINGLE-PAGE APP
   Core shell, shared helpers, dashboard, assets, and settings.
   Module data comes from CMMS_Data/*.js (loaded before this file).
   ============================================================ */
const DB = window.CMMS_DB || {assets:[], workOrders:[], pmSchedules:[]};

/* ----- editable work-order store (localStorage-backed) ----- */
const LS_WO = 'cmms_wos_v1';
const LS_WO_DIRTY = 'cmms_wos_dirty_v1';
function loadWOs(){
  try{
    const raw = localStorage.getItem(LS_WO);
    if(raw){
      const rows = JSON.parse(raw);
      if(Array.isArray(rows)) return rows;
    }
  }catch(e){}
  return JSON.parse(JSON.stringify(DB.workOrders || []));
}
function persistWOs(){
  try{
    localStorage.setItem(LS_WO, JSON.stringify(WOS));
    localStorage.setItem(LS_WO_DIRTY, '1');
  }catch(e){
    toast('Could not save work orders locally.');
  }
}
function woDirty(){
  try{ return localStorage.getItem(LS_WO_DIRTY) === '1'; }
  catch(e){ return false; }
}
function clearWODirty(){
  try{ localStorage.removeItem(LS_WO_DIRTY); }
  catch(e){}
}
function resetWOsToFile(){
  try{
    localStorage.removeItem(LS_WO);
    localStorage.removeItem(LS_WO_DIRTY);
  }catch(e){}
  WOS.length = 0;
  JSON.parse(JSON.stringify(DB.workOrders || [])).forEach(row => WOS.push(row));
  refreshWOBadges();
  toast('Reverted work orders to the data file.');
}
let WOS = loadWOs();

/* ----- editable asset store (localStorage-backed) ----- */
const LS_DATA = 'cmms_assets_v3';
const LS_DIRTY = 'cmms_assets_dirty_v3';
let ASSETS = loadAssets();

function loadAssets(){
  try{
    const raw = localStorage.getItem(LS_DATA);
    if(raw){
      const rows = JSON.parse(raw);
      if(Array.isArray(rows)) return rows;
    }
  }catch(e){}
  return JSON.parse(JSON.stringify(DB.assets || []));
}
function persistAssets(){
  try{
    localStorage.setItem(LS_DATA, JSON.stringify(ASSETS));
    localStorage.setItem(LS_DIRTY, '1');
  }catch(e){
    toast('Could not save assets locally.');
  }
}
function isDirty(){
  try{ return localStorage.getItem(LS_DIRTY) === '1'; }
  catch(e){ return false; }
}
function resetAssetsToFile(){
  try{
    localStorage.removeItem(LS_DATA);
    localStorage.removeItem(LS_DIRTY);
  }catch(e){}
  ASSETS = JSON.parse(JSON.stringify(DB.assets || []));
  toast('Reverted assets to the data file.');
  go('assets');
}
function exportAssets(){
  const header =
'/* ============================================================\n' +
'   CMMS DATA FILE - Asset Register\n' +
'   Exported from the CMMS app on ' + new Date().toLocaleString('en-GB') + '\n' +
'   Replace CMMS_Data/assets.js with this file to make edits permanent.\n' +
'   ============================================================ */\n' +
'window.CMMS_DB = window.CMMS_DB || {};\n' +
'window.CMMS_DB.assets = ';
  const content = header + JSON.stringify(ASSETS, null, 2) + ';\n';
  downloadText(content, 'assets.js', 'text/javascript');
  try{ localStorage.removeItem(LS_DIRTY); }catch(e){}
  toast('assets.js downloaded. Replace CMMS_Data/assets.js to keep the changes.');
  if(current === 'assets') go('assets');
}

/* ----- settings store ----- */
const LS_SETTINGS = 'cmms_settings_v1';
const LS_SETTINGS_DIRTY = 'cmms_settings_dirty_v1';
const DEFAULT_CATEGORIES = ['SURFACE','EDGE','HC','MC','TINT','QC','LAB1','OFFICE','LOGISTIC','WH1','WH2'];
const DEFAULT_BUILDINGS = ['Main Site','Secondary Site'];
const DEFAULT_WO_PRIORITIES = ['High','Medium','Low'];
const DEFAULT_PM_FREQUENCIES = ['Daily','Weekly','Monthly','Quarterly','Semi-Annual','Annual'];
let SETTINGS = loadSettings();
let settingsTab = 'profile';

function uniqList(values){
  return [...new Set((values || []).map(v => String(v || '').trim()).filter(Boolean))];
}
function clamp(n, min, max){
  return Math.min(max, Math.max(min, Number(n) || 0));
}
function todayIso(){
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function sourcePMs(){
  try{
    return Array.isArray(PMS) ? PMS : JSON.parse(JSON.stringify(DB.pmSchedules || []));
  }catch(e){
    return JSON.parse(JSON.stringify(DB.pmSchedules || []));
  }
}
function buildDefaultSettings(){
  const pmRows = sourcePMs();
  const technicians = uniqList([
    ...WOS.map(w => w.technician),
    ...pmRows.map(p => p.technician)
  ]);
  const requesters = uniqList(
    WOS
      .map(w => w.requestedBy)
      .filter(v => v && !String(v).startsWith('PM Schedule '))
  );
  const categories = uniqList([...DEFAULT_CATEGORIES, ...ASSETS.map(a => a.category)]);
  const buildings = uniqList([...DEFAULT_BUILDINGS, ...ASSETS.map(a => a.building)]);
  return {
    plantName: 'Your Facility',
    shiftLabel: 'Current Shift',
    currentUser: 'Maintenance Team',
    userInitials: 'MT',
    timezone: 'Asia/Bangkok',
    workWeek: 'Mon-Sat',
    defaultBuilding: ASSETS[0] && ASSETS[0].building ? ASSETS[0].building : (buildings[0] || 'Main Site'),
    defaultCategory: categories[0] || 'SURFACE',
    defaultWOPriority: 'Medium',
    defaultPMFrequency: 'Monthly',
    dashboardWatchCount: 4,
    healthWatchThreshold: 60,
    woDueSoonDays: 3,
    pmDueSoonDays: 7,
    buildings,
    categories,
    technicians,
    requesters
  };
}
function normaliseSettings(raw){
  const base = buildDefaultSettings();
  const merged = Object.assign({}, base, raw || {});
  merged.buildings = uniqList([...(Array.isArray(merged.buildings) ? merged.buildings : []), ...ASSETS.map(a => a.building), ...DEFAULT_BUILDINGS]);
  merged.categories = uniqList([...(Array.isArray(merged.categories) ? merged.categories : []), ...ASSETS.map(a => a.category), ...DEFAULT_CATEGORIES]);
  merged.technicians = uniqList([
    ...(Array.isArray(merged.technicians) ? merged.technicians : []),
    ...WOS.map(w => w.technician),
    ...sourcePMs().map(p => p.technician)
  ]);
  merged.requesters = uniqList([
    ...(Array.isArray(merged.requesters) ? merged.requesters : []),
    ...WOS
      .map(w => w.requestedBy)
      .filter(v => v && !String(v).startsWith('PM Schedule '))
  ]);
  if(!merged.buildings.includes(merged.defaultBuilding)) merged.defaultBuilding = merged.buildings[0] || base.defaultBuilding;
  if(!merged.categories.includes(merged.defaultCategory)) merged.defaultCategory = merged.categories[0] || base.defaultCategory;
  merged.plantName = String(merged.plantName || base.plantName).trim() || base.plantName;
  merged.shiftLabel = String(merged.shiftLabel || base.shiftLabel).trim() || base.shiftLabel;
  merged.currentUser = String(merged.currentUser || base.currentUser).trim() || base.currentUser;
  merged.userInitials = String(merged.userInitials || base.userInitials).trim().slice(0, 4).toUpperCase() || base.userInitials;
  merged.timezone = String(merged.timezone || base.timezone).trim() || base.timezone;
  merged.workWeek = String(merged.workWeek || base.workWeek).trim() || base.workWeek;
  if(!DEFAULT_WO_PRIORITIES.includes(merged.defaultWOPriority)) merged.defaultWOPriority = base.defaultWOPriority;
  if(!DEFAULT_PM_FREQUENCIES.includes(merged.defaultPMFrequency)) merged.defaultPMFrequency = base.defaultPMFrequency;
  merged.dashboardWatchCount = clamp(merged.dashboardWatchCount, 1, 12) || base.dashboardWatchCount;
  merged.healthWatchThreshold = clamp(merged.healthWatchThreshold, 0, 100);
  merged.woDueSoonDays = clamp(merged.woDueSoonDays, 0, 30);
  merged.pmDueSoonDays = clamp(merged.pmDueSoonDays, 0, 60);
  return merged;
}
function loadSettings(){
  try{
    const raw = localStorage.getItem(LS_SETTINGS);
    if(raw) return normaliseSettings(JSON.parse(raw));
  }catch(e){}
  return normaliseSettings();
}
function persistSettings(){
  SETTINGS = normaliseSettings(SETTINGS);
  try{
    localStorage.setItem(LS_SETTINGS, JSON.stringify(SETTINGS));
    localStorage.setItem(LS_SETTINGS_DIRTY, '1');
  }catch(e){
    toast('Could not save settings locally.');
  }
}
function settingsDirty(){
  try{ return localStorage.getItem(LS_SETTINGS_DIRTY) === '1'; }
  catch(e){ return false; }
}
function clearSettingsDirty(){
  try{ localStorage.removeItem(LS_SETTINGS_DIRTY); }
  catch(e){}
}
function resetSettingsToDefault(){
  try{
    localStorage.removeItem(LS_SETTINGS);
    localStorage.removeItem(LS_SETTINGS_DIRTY);
  }catch(e){}
  SETTINGS = normaliseSettings();
  applySettingsToShell();
  toast('Settings reverted to defaults.');
  if(current === 'settings') renderSettings();
}
function exportSettings(){
  const content = JSON.stringify(SETTINGS, null, 2) + '\n';
  downloadText(content, 'cmms_settings.json', 'application/json');
  clearSettingsDirty();
  toast('cmms_settings.json downloaded.');
  if(current === 'settings') renderSettings();
}
function mergeIntoSettingList(key, values){
  SETTINGS[key] = uniqList([...(SETTINGS[key] || []), ...(Array.isArray(values) ? values : [values])]);
  persistSettings();
  applySettingsToShell();
}
function categoryOptions(){
  return uniqList([...(SETTINGS.categories || []), ...ASSETS.map(a => a.category)]);
}
function buildingOptions(){
  return uniqList([...(SETTINGS.buildings || []), ...ASSETS.map(a => a.building)]);
}
function technicianOptions(){
  return uniqList([
    ...(SETTINGS.technicians || []),
    ...((typeof STAFF !== 'undefined' ? STAFF : [])
      .filter(user => user.active && ['Admin','Supervisor','Technician'].includes(user.role))
      .map(user => user.name)),
    ...WOS.map(w => w.technician),
    ...sourcePMs().map(p => p.technician)
  ]);
}
function requesterOptions(){
  return uniqList([
    ...(SETTINGS.requesters || []),
    ...((typeof STAFF !== 'undefined' ? STAFF : [])
      .filter(user => user.active)
      .map(user => user.name)),
    ...WOS.map(w => w.requestedBy).filter(v => v && !String(v).startsWith('PM Schedule '))
  ]);
}
const LS_USERS = 'cmms_users_v1';
const LS_USERS_DIRTY = 'cmms_users_dirty_v1';
const LS_SESSION = 'cmms_session_v1';
const USER_ROLES = ['Admin','Supervisor','Technician','Staff'];
const PERMISSION_DEFS = [
  {key:'settings.manage', label:'Manage Settings', note:'Edit plant profile, workspace defaults, and system setup.'},
  {key:'users.manage', label:'Manage Users', note:'Create accounts, reset passwords, and change access.'},
  {key:'assets.manage', label:'Manage Assets', note:'Add, edit, delete, and reset asset records.'},
  {key:'workorders.manage', label:'Manage Work Orders', note:'Create, edit, delete, and reopen work orders.'},
  {key:'workorders.update', label:'Update Work Orders', note:'Log progress, change status, and complete work.'},
  {key:'pm.manage', label:'Manage PM', note:'Create, edit, delete, and reset PM schedules.'},
  {key:'pm.update', label:'Update PM', note:'Log PM completion and ongoing PM activity.'},
  {key:'requests.manage', label:'Manage Requests', note:'Create, edit, convert, and close service requests.'},
  {key:'breakdowns.manage', label:'Manage Breakdowns', note:'Log breakdowns, add updates, and close incidents.'},
  {key:'stores.manage', label:'Manage Stores', note:'Maintain parts, inventory, and stock transactions.'},
  {key:'infrastructure.manage', label:'Manage Infrastructure', note:'Edit networks, inspections, and utility incidents.'},
  {key:'data.export', label:'Export Data', note:'Download data snapshots and file exports.'}
];
const PERMISSION_LABELS = Object.fromEntries(PERMISSION_DEFS.map(def => [def.key, def.label]));
const LOGIN_REQUIRED_TEXT = 'Sign in to open the shared CMMS workspace.';
let loginLock = false;

function defaultPermissionsForRole(role){
  const all = Object.fromEntries(PERMISSION_DEFS.map(def => [def.key, false]));
  if(role === 'Admin'){
    PERMISSION_DEFS.forEach(def => { all[def.key] = true; });
    return all;
  }
  if(role === 'Supervisor'){
    [
      'assets.manage',
      'workorders.manage',
      'workorders.update',
      'pm.manage',
      'pm.update',
      'requests.manage',
      'breakdowns.manage',
      'stores.manage',
      'infrastructure.manage',
      'data.export'
    ].forEach(key => { all[key] = true; });
    return all;
  }
  if(role === 'Technician'){
    [
      'workorders.update',
      'pm.update',
      'requests.manage',
      'breakdowns.manage',
      'infrastructure.manage'
    ].forEach(key => { all[key] = true; });
    return all;
  }
  all['requests.manage'] = true;
  return all;
}
function normalizePermissions(raw, role){
  const base = defaultPermissionsForRole(role);
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  PERMISSION_DEFS.forEach(def => {
    if(Object.prototype.hasOwnProperty.call(source, def.key)) base[def.key] = source[def.key] === true;
  });
  return base;
}
function permissionCount(user){
  return Object.values((user && user.permissions) || {}).filter(Boolean).length;
}
function permissionSummary(user){
  if(!user || !user.permissions) return 'No permissions assigned.';
  const granted = PERMISSION_DEFS.filter(def => user.permissions[def.key]).map(def => def.label);
  return granted.length ? granted.join(', ') : 'No permissions assigned.';
}
function permissionBadges(user){
  const granted = PERMISSION_DEFS.filter(def => user && user.permissions && user.permissions[def.key]);
  return granted.length
    ? granted.map(def => `<span class="chip">${esc(def.label)}</span>`).join('')
    : '<span style="color:var(--ink-soft);font-size:13px">No permissions assigned.</span>';
}
function sessionAuthenticated(){
  const user = currentUserRecord();
  return !!(SESSION && SESSION.authenticated && user && user.active && user.canLogin);
}
function hasPermission(key){
  const user = currentUserRecord();
  if(!sessionAuthenticated() || !user || !user.permissions) return false;
  return user.permissions[key] === true;
}
function requirePermission(key, deniedMessage){
  if(!sessionAuthenticated()){
    openLoginModal(SESSION.userId || 'admin', {force:true, message:LOGIN_REQUIRED_TEXT});
    return false;
  }
  if(hasPermission(key)) return true;
  toast(deniedMessage || `Permission required: ${PERMISSION_LABELS[key] || key}`);
  return false;
}

function initialsFor(name){
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return (parts.map(part => part[0]).join('') || 'US').toUpperCase();
}
function normalizeStaffUser(row){
  const role = USER_ROLES.includes(row && row.role) ? row.role : 'Staff';
  return {
    id:String((row && row.id) || '').trim().toLowerCase(),
    password:String((row && row.password) || '').trim() || 'changeme',
    name:String((row && row.name) || '').trim() || 'Unnamed User',
    role,
    department:String((row && row.department) || '').trim() || 'General',
    title:String((row && row.title) || '').trim() || role,
    shift:String((row && row.shift) || '').trim() || 'Day',
    phone:String((row && row.phone) || '').trim(),
    email:String((row && row.email) || '').trim(),
    active:row && row.active !== false,
    canLogin:row && row.canLogin !== false,
    permissions:normalizePermissions(row && row.permissions, role),
    skills:uniqList(Array.isArray(row && row.skills) ? row.skills : []),
    notes:String((row && row.notes) || '').trim(),
    lastSeen:String((row && row.lastSeen) || '').trim()
  };
}
function buildSeedUsers(){
  const rows = [
    {
      id:'admin',
      password:'admin123',
      name:'CMMS Admin',
      role:'Admin',
      department:'Maintenance',
      title:'Maintenance Administrator',
      shift:SETTINGS.shiftLabel || 'Current Shift',
      phone:'Ext. 100',
      email:'admin@cmms.local',
      active:true,
      canLogin:true,
      skills:['System Setup','Planning','Approvals'],
      notes:'Default administrator account for this local CMMS workspace.'
    }
  ];
  uniqList([
    ...WOS.map(w => w.technician),
    ...sourcePMs().map(p => p.technician)
  ]).forEach((name, index) => {
    rows.push({
      id:`tech${String(index + 1).padStart(2, '0')}`,
      password:'tech123',
      name,
      role:'Technician',
      department:'Maintenance',
      title:'Maintenance Technician',
      shift:'Day',
      active:true,
      canLogin:true,
      skills:['Corrective Maintenance'],
      notes:'Seeded from technician references already used in work orders or PM.'
    });
  });
  uniqList([
    ...WOS.map(w => w.requestedBy).filter(v => v && !String(v).startsWith('PM Schedule ')),
    SETTINGS.currentUser
  ]).forEach((name, index) => {
    if(!rows.some(user => user.name === name)){
      rows.push({
        id:`staff${String(index + 1).padStart(2, '0')}`,
        password:'staff123',
        name,
        role:'Staff',
        department:'Operations',
        title:'Requester',
        shift:'Day',
        active:true,
        canLogin:true,
        skills:[],
        notes:'Seeded from requester history.'
      });
    }
  });
  return rows.map(normalizeStaffUser);
}
function loadUsers(){
  try{
    const raw = localStorage.getItem(LS_USERS);
    if(raw){
      const rows = JSON.parse(raw);
      if(Array.isArray(rows)) return rows.map(normalizeStaffUser).filter(user => user.id);
    }
  }catch(e){}
  return buildSeedUsers();
}
function persistUsers(markDirty){
  STAFF = STAFF.map(normalizeStaffUser).filter(user => user.id);
  try{
    localStorage.setItem(LS_USERS, JSON.stringify(STAFF));
    if(markDirty !== false) localStorage.setItem(LS_USERS_DIRTY, '1');
  }catch(e){
    toast('Could not save user accounts locally.');
  }
}
function usersDirty(){
  try{ return localStorage.getItem(LS_USERS_DIRTY) === '1'; }
  catch(e){ return false; }
}
function clearUsersDirty(){
  try{ localStorage.removeItem(LS_USERS_DIRTY); }
  catch(e){}
}
function resetUsersToSeed(){
  try{
    localStorage.removeItem(LS_USERS);
    localStorage.removeItem(LS_USERS_DIRTY);
  }catch(e){}
  STAFF = buildSeedUsers();
  ensureSessionUser();
  applySettingsToShell();
  toast('User accounts reverted to the seeded roster.');
}
function exportUsersSnapshot(){
  const payload = {
    exportedAt:new Date().toISOString(),
    users:STAFF
  };
  downloadText(JSON.stringify(payload, null, 2) + '\n', 'cmms_users_snapshot.json', 'application/json');
  clearUsersDirty();
  toast('cmms_users_snapshot.json downloaded.');
}
function loadSession(){
  try{
    const raw = localStorage.getItem(LS_SESSION);
    if(raw){
      const data = JSON.parse(raw);
      return {
        userId:String((data && data.userId) || '').trim().toLowerCase(),
        authenticated:false
      };
    }
  }catch(e){}
  return {userId:'admin', authenticated:false};
}
function persistSession(){
  try{
    localStorage.setItem(LS_SESSION, JSON.stringify({
      userId:SESSION.userId,
      authenticated:false
    }));
  }catch(e){}
}
let STAFF = loadUsers();
let SESSION = loadSession();
function userById(id){
  return STAFF.find(user => user.id === String(id || '').trim().toLowerCase());
}
function currentUserRecord(){
  return userById(SESSION.userId) || userById('admin') || STAFF[0] || null;
}
function ensureSessionUser(){
  const fallback = userById('admin') || STAFF[0] || null;
  if(!userById(SESSION.userId) || !(currentUserRecord() && currentUserRecord().active && currentUserRecord().canLogin)){
    SESSION.userId = fallback ? fallback.id : '';
    SESSION.authenticated = false;
    persistSession();
  }
}
function currentUserName(){
  if(!sessionAuthenticated()) return SETTINGS.currentUser;
  const user = currentUserRecord();
  return user ? user.name : SETTINGS.currentUser;
}
function currentUserId(){
  if(!sessionAuthenticated()) return 'guest';
  const user = currentUserRecord();
  return user ? user.id : 'guest';
}
function currentUserRole(){
  if(!sessionAuthenticated()) return 'Sign In Required';
  const user = currentUserRecord();
  return user ? user.role : 'Guest';
}
function currentUserInitials(){
  if(!sessionAuthenticated()) return SETTINGS.userInitials;
  const user = currentUserRecord();
  return user ? initialsFor(user.name) : SETTINGS.userInitials;
}
function currentUserDepartment(){
  if(!sessionAuthenticated()) return '';
  const user = currentUserRecord();
  return user ? user.department : '';
}
function defaultTechnicianName(){
  const user = currentUserRecord();
  return sessionAuthenticated() && user && ['Admin','Supervisor','Technician'].includes(user.role) ? user.name : '';
}
function isAdmin(){
  return hasPermission('users.manage') && currentUserRecord() && currentUserRecord().role === 'Admin';
}
function canManageSettings(){
  return hasPermission('settings.manage');
}
function canManageUsers(){
  return hasPermission('users.manage');
}
function setSessionUser(userId){
  const user = userById(userId);
  if(!user || !user.active || !user.canLogin) return false;
  SESSION.userId = user.id;
  SESSION.authenticated = true;
  user.lastSeen = new Date().toISOString();
  persistUsers(false);
  persistSession();
  applySettingsToShell();
  return true;
}
function openAccountModal(){
  if(!sessionAuthenticated()){
    openLoginModal(SESSION.userId || 'admin', {force:true, message:LOGIN_REQUIRED_TEXT});
    return;
  }
  const user = currentUserRecord();
  if(!user) return;
  modalHost.innerHTML = `
   <div class="modal confirm-box">
    <div class="modal-head"><h3>Signed In User</h3><div class="x" onclick="closeModal()">x</div></div>
    <div class="modal-body">
      <div class="kv-list">
        <div><span>Name</span><b>${esc(user.name)}</b></div>
        <div><span>User ID</span><b class="mono">${esc(user.id)}</b></div>
        <div><span>Role</span><b>${esc(user.role)}</b></div>
        <div><span>Department</span><b>${esc(user.department || '-')}</b></div>
        <div><span>Permissions</span><b>${permissionCount(user)} granted</b></div>
      </div>
      <p style="margin-top:14px;color:var(--ink-soft)">Use user ID and password to switch accounts. Administrators can manage shared accounts from the Technicians and Staff module.</p>
    </div>
    <div class="modal-foot">
      <button class="btn btn-ghost" onclick="closeModal();openLoginModal('${user.id}')">Switch User</button>
      <button class="btn btn-primary" onclick="closeModal();go('technicians')">Open Team Module</button>
    </div>
   </div>`;
  overlay.classList.add('show');
}
function openLoginModal(prefillId, options){
  const opts = options || {};
  const force = opts.force === true;
  const message = String(opts.message || '').trim();
  loginLock = force;
  modalHost.innerHTML = `
   <div class="modal confirm-box">
    <div class="modal-head"><h3>User Login</h3>${force ? '' : '<div class="x" onclick="closeModal()">x</div>'}</div>
    <div class="modal-body">
      <div class="form-err" id="login-err"></div>
      ${message ? `<p style="margin-bottom:12px;color:var(--ink-soft);font-size:12.5px;line-height:1.55">${esc(message)}</p>` : ''}
      <div class="form-grid" style="grid-template-columns:1fr">
        <div class="field"><label>User ID</label><input id="login-user" value="${esc(prefillId || SESSION.userId || 'admin')}" autocomplete="username"></div>
        <div class="field"><label>Password</label><input id="login-pass" type="password" autocomplete="current-password"></div>
      </div>
      <p style="margin-top:12px;color:var(--ink-soft);font-size:12px">Local workspace login. Administrators can add or reset accounts inside the Technicians and Staff module.</p>
    </div>
    <div class="modal-foot">
      ${force ? '' : '<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>'}
      <button class="btn btn-primary" onclick="submitLogin()">Sign In</button>
    </div>
   </div>`;
  overlay.classList.add('show');
  setTimeout(() => {
    const input = $('#login-pass');
    if(input) input.focus();
  }, 40);
}
function submitLogin(){
  const err = $('#login-err');
  const userId = ($('#login-user').value || '').trim().toLowerCase();
  const password = ($('#login-pass').value || '').trim();
  const user = userById(userId);
  if(err) err.classList.remove('show');
  if(!user || !user.active || !user.canLogin || user.password !== password){
    if(err){
      err.textContent = 'Invalid user ID or password.';
      err.classList.add('show');
    }
    return;
  }
  setSessionUser(user.id);
  loginLock = false;
  closeModal();
  toast(`Signed in as ${user.name}.`);
  if(current === 'settings' && !canManageSettings()) go('dashboard');
  else go(current);
}
function datalistHtml(id, values){
  const rows = uniqList(values).map(v => `<option value="${esc(v)}"></option>`).join('');
  return `<datalist id="${id}">${rows}</datalist>`;
}
function downloadText(content, filename, type){
  const blob = new Blob([content], {type});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
function normalizeAttachments(items){
  return Array.isArray(items) ? items.filter(Boolean).map(item => ({
    name:String(item.name || 'attachment').trim() || 'attachment',
    mime:String(item.mime || '').trim(),
    kind:item.kind === 'video' ? 'video' : 'image',
    src:String(item.src || '').trim(),
    size:Number(item.size) || 0,
    addedAt:String(item.addedAt || todayIso())
  })).filter(item => item.src) : [];
}
function attachmentKindFromMime(mime){
  return String(mime || '').startsWith('video/') ? 'video' : 'image';
}
function formatBytes(bytes){
  const value = Number(bytes) || 0;
  if(value < 1024) return `${value} B`;
  if(value < 1048576) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1048576).toFixed(1)} MB`;
}
function readFileAsDataURL(file){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('File read failed'));
    reader.readAsDataURL(file);
  });
}
async function filesToAttachments(fileList){
  const files = Array.from(fileList || []).filter(Boolean);
  const attachments = [];
  for(const file of files){
    const src = await readFileAsDataURL(file);
    attachments.push({
      name:file.name,
      mime:file.type || '',
      kind:attachmentKindFromMime(file.type),
      src,
      size:file.size || 0,
      addedAt:new Date().toISOString()
    });
  }
  return attachments;
}
async function attachmentsFromInput(inputId){
  const node = document.getElementById(inputId);
  return node && node.files ? filesToAttachments(node.files) : [];
}
function attachmentsFieldHtml(id, label, existing){
  const items = normalizeAttachments(existing);
  return `
    <div class="field full">
      <label>${label}</label>
      <div class="attach-box">
        <input id="${id}" type="file" accept="image/*,video/*" multiple>
        <div class="attach-help">Add photo or video evidence. Files stay in this browser because the CMMS is running locally, so short clips and compressed images work best.</div>
        ${items.length ? `<div class="attach-existing">${items.length} existing attachment(s) will be kept unless you replace the record.</div>` : ''}
      </div>
    </div>`;
}
function attachmentsGalleryHtml(items, title){
  const attachments = normalizeAttachments(items);
  return `
    <div class="panel attachment-panel">
      <div class="panel-head"><b>${title}</b><span style="font-size:12px;color:var(--ink-soft)">${attachments.length} item(s)</span></div>
      ${attachments.length ? `<div class="attach-grid">
        ${attachments.map((item, index) => `
          <div class="attach-card">
            <div class="attach-media">
              ${item.kind === 'video'
                ? `<video controls preload="metadata" src="${item.src}"></video>`
                : `<img src="${item.src}" alt="${esc(item.name)}">`}
            </div>
            <div class="attach-meta">
              <b>${esc(item.name || `${title} ${index + 1}`)}</b>
              <span>${item.kind === 'video' ? 'Video' : 'Photo'} · ${formatBytes(item.size)}</span>
            </div>
          </div>`).join('')}
      </div>` : '<div style="padding:22px 17px;color:var(--ink-soft);font-size:13px">No photos or videos attached yet.</div>'}
    </div>`;
}

/* ----- shared helpers ----- */
const $ = s => document.querySelector(s);
const view = $('#view');
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let toastT;
function toast(msg){
  const node = $('#toast');
  node.textContent = msg;
  node.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => node.classList.remove('show'), 2600);
}
function healthColor(h){ return h >= 80 ? 'var(--green)' : h >= 50 ? 'var(--amber)' : 'var(--red)'; }
function critClass(c){ return {Critical:'pill-crit', High:'pill-high', Medium:'pill-med', Low:'pill-low'}[c] || 'pill-low'; }
function statusClass(s){ return {Running:'pill-running', Down:'pill-down', Standby:'pill-standby'}[s] || 'pill-low'; }
function woStatusClass(s){ return {'Open':'pill-open', 'In Progress':'pill-prog', 'On Hold':'pill-hold', 'Completed':'pill-done'}[s] || 'pill-low'; }
function fmtDate(d){
  if(!d) return '-';
  const value = new Date(d + 'T00:00:00');
  return isNaN(value) ? d : value.toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'});
}
function daysFromToday(d){
  if(!d) return 0;
  const today = new Date(todayIso() + 'T00:00:00');
  const value = new Date(d + 'T00:00:00');
  return Math.round((value - today) / 86400000);
}
function woFor(id){ return WOS.filter(w => w.assetId === id); }
function woOpenCount(id){ return WOS.filter(w => w.assetId === id && w.status !== 'Completed').length; }
function priColor(p){ return p === 'High' ? 'var(--red)' : p === 'Medium' ? 'var(--amber)' : 'var(--blue)'; }
function optionList(field){
  return field === 'category' ? categoryOptions() : buildingOptions();
}
function applySettingsToShell(){
  const plant = $('#ribbon-plant');
  const shift = $('#ribbon-shift');
  const avatar = $('#avatar');
  const userName = $('#user-name');
  const userRole = $('#user-role');
  const search = document.querySelector('.searchbox input');
  if(plant) plant.textContent = SETTINGS.plantName;
  if(shift) shift.textContent = SETTINGS.shiftLabel;
  if(avatar) avatar.textContent = currentUserInitials();
  if(userName) userName.textContent = currentUserName();
  if(userRole) userRole.textContent = `${currentUserRole()} | ${currentUserId()}`;
  if(search) search.placeholder = 'Search work orders, assets, parts, or people';
  document.title = `CMMS - ${SETTINGS.plantName}`;
  if(typeof refreshAssignedTaskBadge === 'function') refreshAssignedTaskBadge();
}

function setSidebarOpen(open){
  document.body.classList.toggle('sidebar-open', !!open);
  const menuBtn = $('#mobile-menu-btn');
  if(menuBtn) menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
}
function hydrateInteractive(root){
  if(!root || !root.querySelectorAll) return;
  root.querySelectorAll('[data-nav], [onclick], .brand, .back, .tab').forEach(node => {
    const tag = node.tagName;
    if(['BUTTON','A','INPUT','SELECT','TEXTAREA','OPTION'].includes(tag)) return;
    if(!node.hasAttribute('tabindex')) node.setAttribute('tabindex', '0');
    if(!node.hasAttribute('role')) node.setAttribute('role', 'button');
    if(node.dataset.kbBound) return;
    node.dataset.kbBound = '1';
    node.addEventListener('keydown', e => {
      if(e.key === 'Enter' || e.key === ' '){
        e.preventDefault();
        node.click();
      }
    });
  });
}
function initShellChrome(){
  const menuBtn = $('#mobile-menu-btn');
  const backdrop = $('#sidebar-backdrop');
  if(menuBtn && !menuBtn.dataset.bound){
    menuBtn.dataset.bound = '1';
    menuBtn.addEventListener('click', () => setSidebarOpen(!document.body.classList.contains('sidebar-open')));
  }
  if(backdrop && !backdrop.dataset.bound){
    backdrop.dataset.bound = '1';
    backdrop.addEventListener('click', () => setSidebarOpen(false));
  }
  if(!document.body.dataset.sidebarEscBound){
    document.body.dataset.sidebarEscBound = '1';
    document.addEventListener('keydown', e => {
      if(e.key === 'Escape') setSidebarOpen(false);
    });
  }
  hydrateInteractive(document);
}
function wrapGuardedAction(name, permission, deniedMessage){
  const original = window[name];
  if(typeof original !== 'function' || original.__cmmsGuardWrapped) return;
  const wrapped = function(...args){
    if(!requirePermission(permission, deniedMessage)) return;
    return original.apply(this, args);
  };
  wrapped.__cmmsGuardWrapped = true;
  window[name] = wrapped;
}
function protectActions(){
  [
    ['openAssetModal', 'assets.manage', 'You do not have permission to edit assets.'],
    ['saveAsset', 'assets.manage', 'You do not have permission to edit assets.'],
    ['confirmDelete', 'assets.manage', 'You do not have permission to delete assets.'],
    ['doDelete', 'assets.manage', 'You do not have permission to delete assets.'],
    ['confirmReset', 'assets.manage', 'You do not have permission to reset asset data.'],
    ['resetAssetsToFile', 'assets.manage', 'You do not have permission to reset asset data.'],
    ['exportAssets', 'data.export', 'You do not have permission to export asset data.'],
    ['openWOModal', 'workorders.manage', 'You do not have permission to manage work orders.'],
    ['saveWO', 'workorders.manage', 'You do not have permission to manage work orders.'],
    ['confirmDeleteWO', 'workorders.manage', 'You do not have permission to delete work orders.'],
    ['doDeleteWO', 'workorders.manage', 'You do not have permission to delete work orders.'],
    ['confirmResetWOs', 'workorders.manage', 'You do not have permission to reset work orders.'],
    ['resetWOsToFile', 'workorders.manage', 'You do not have permission to reset work orders.'],
    ['exportWorkOrders', 'data.export', 'You do not have permission to export work orders.'],
    ['openWOUpdateModal', 'workorders.update', 'You do not have permission to update work orders.'],
    ['saveWOUpdate', 'workorders.update', 'You do not have permission to update work orders.'],
    ['setWOStatus', 'workorders.update', 'You do not have permission to update work orders.'],
    ['openPMModal', 'pm.manage', 'You do not have permission to manage PM schedules.'],
    ['savePM', 'pm.manage', 'You do not have permission to manage PM schedules.'],
    ['confirmDeletePM', 'pm.manage', 'You do not have permission to delete PM schedules.'],
    ['doDeletePM', 'pm.manage', 'You do not have permission to delete PM schedules.'],
    ['confirmResetPMs', 'pm.manage', 'You do not have permission to reset PM schedules.'],
    ['resetPMsToFile', 'pm.manage', 'You do not have permission to reset PM schedules.'],
    ['exportPMs', 'data.export', 'You do not have permission to export PM schedules.'],
    ['completePM', 'pm.update', 'You do not have permission to log PM completion.'],
    ['openRequestModal', 'requests.manage', 'You do not have permission to manage service requests.'],
    ['saveRequest', 'requests.manage', 'You do not have permission to manage service requests.'],
    ['confirmDeleteRequest', 'requests.manage', 'You do not have permission to delete service requests.'],
    ['doDeleteRequest', 'requests.manage', 'You do not have permission to delete service requests.'],
    ['confirmResetRequests', 'requests.manage', 'You do not have permission to reset service requests.'],
    ['resetRequestsToSeed', 'requests.manage', 'You do not have permission to reset service requests.'],
    ['exportRequestsSnapshot', 'data.export', 'You do not have permission to export service requests.'],
    ['setRequestStatus', 'requests.manage', 'You do not have permission to update service requests.'],
    ['convertRequestToWO', 'requests.manage', 'You do not have permission to convert service requests.'],
    ['openBreakdownModal', 'breakdowns.manage', 'You do not have permission to manage breakdowns.'],
    ['saveBreakdown', 'breakdowns.manage', 'You do not have permission to manage breakdowns.'],
    ['openBreakdownUpdateModal', 'breakdowns.manage', 'You do not have permission to update breakdowns.'],
    ['saveBreakdownUpdate', 'breakdowns.manage', 'You do not have permission to update breakdowns.'],
    ['setBreakdownStatus', 'breakdowns.manage', 'You do not have permission to update breakdowns.'],
    ['confirmDeleteBreakdown', 'breakdowns.manage', 'You do not have permission to delete breakdowns.'],
    ['doDeleteBreakdown', 'breakdowns.manage', 'You do not have permission to delete breakdowns.'],
    ['confirmResetBreakdowns', 'breakdowns.manage', 'You do not have permission to reset breakdown data.'],
    ['resetBreakdownsToSeed', 'breakdowns.manage', 'You do not have permission to reset breakdown data.'],
    ['exportBreakdownsSnapshot', 'data.export', 'You do not have permission to export breakdown data.'],
    ['openPartModal', 'stores.manage', 'You do not have permission to manage stores data.'],
    ['savePart', 'stores.manage', 'You do not have permission to manage stores data.'],
    ['confirmDeletePart', 'stores.manage', 'You do not have permission to delete stores data.'],
    ['doDeletePart', 'stores.manage', 'You do not have permission to delete stores data.'],
    ['openStockModal', 'stores.manage', 'You do not have permission to create stock transactions.'],
    ['saveStockTxn', 'stores.manage', 'You do not have permission to create stock transactions.'],
    ['openInventoryTxnModal', 'stores.manage', 'You do not have permission to create stock transactions.'],
    ['confirmResetStores', 'stores.manage', 'You do not have permission to reset stores data.'],
    ['resetStoresToSeed', 'stores.manage', 'You do not have permission to reset stores data.'],
    ['exportStoresSnapshot', 'data.export', 'You do not have permission to export stores data.'],
    ['openInfraModal', 'infrastructure.manage', 'You do not have permission to manage infrastructure records.'],
    ['saveInfrastructure', 'infrastructure.manage', 'You do not have permission to manage infrastructure records.'],
    ['confirmDeleteInfrastructure', 'infrastructure.manage', 'You do not have permission to delete infrastructure records.'],
    ['doDeleteInfrastructure', 'infrastructure.manage', 'You do not have permission to delete infrastructure records.'],
    ['openInfraInspectionModal', 'infrastructure.manage', 'You do not have permission to log inspections.'],
    ['saveInfraInspection', 'infrastructure.manage', 'You do not have permission to log inspections.'],
    ['openInfraIssueModal', 'infrastructure.manage', 'You do not have permission to log incidents.'],
    ['saveInfraIssue', 'infrastructure.manage', 'You do not have permission to log incidents.'],
    ['confirmResetInfra', 'infrastructure.manage', 'You do not have permission to reset infrastructure data.'],
    ['resetInfraToSeed', 'infrastructure.manage', 'You do not have permission to reset infrastructure data.'],
    ['exportInfraSnapshot', 'data.export', 'You do not have permission to export infrastructure data.'],
    ['exportUsersSnapshot', 'data.export', 'You do not have permission to export user data.'],
    ['confirmResetUsers', 'users.manage', 'You do not have permission to reset user accounts.'],
    ['resetUsersToSeed', 'users.manage', 'You do not have permission to reset user accounts.'],
    ['exportSettings', 'data.export', 'You do not have permission to export settings.'],
    ['confirmResetSettings', 'settings.manage', 'You do not have permission to reset settings.'],
    ['resetSettingsToDefault', 'settings.manage', 'You do not have permission to reset settings.'],
    ['saveSettingsSection', 'settings.manage', 'You do not have permission to edit settings.'],
    ['openPermissionModal', 'settings.manage', 'You do not have permission to edit user permissions.'],
    ['saveUserPermissions', 'settings.manage', 'You do not have permission to edit user permissions.']
  ].forEach(args => wrapGuardedAction(...args));
}

/* ----- live clock ----- */
function tick(){ $('#clock').textContent = new Date().toLocaleTimeString('en-GB'); }
tick();
setInterval(tick, 1000);

/* ----- work-order badges ----- */
function refreshWOBadges(){
  const open = WOS.filter(w => w.status !== 'Completed').length;
  const bd = typeof activeBreakdownCount === 'function'
    ? activeBreakdownCount()
    : WOS.filter(w => w.type === 'Breakdown' && w.status !== 'Completed').length;
  $('#ribbon-wo').textContent = open;
  $('#sb-wo').textContent = open;
  $('#sb-bd').textContent = bd;
}
refreshWOBadges();
ensureSessionUser();
applySettingsToShell();

/* ============================================================
   ROUTER
   ============================================================ */
const ROUTES = {
  'dashboard': renderDashboard,
  'assets': renderAssets,
  'asset-detail': renderAssetDetail,
  'settings': renderSettings
};
let current = 'dashboard';

function go(route, param){
  current = route;
  setSidebarOpen(false);
  document.querySelectorAll('.navbtn').forEach(node => node.classList.remove('active'));
  document.querySelectorAll('.side-item').forEach(node => node.classList.remove('active'));
  const navKey = {'asset-detail':'assets', 'wo-detail':'work-orders', 'pm-detail':'pm', 'part-detail':'parts', 'infrastructure-detail':'infrastructure', 'request-detail':'requests', 'technician-detail':'technicians', 'breakdown-detail':'breakdowns'}[route] || route;
  document.querySelectorAll(`[data-nav="${navKey}"]`).forEach(node => {
    if(node.classList.contains('navbtn') || node.classList.contains('side-item')) node.classList.add('active');
  });
  window.scrollTo(0, 0);
  (ROUTES[route] || (() => renderPlaceholder(route)))(param);
  hydrateInteractive(view);
}
document.querySelectorAll('[data-nav]').forEach(node => {
  node.addEventListener('click', e => {
    e.preventDefault();
    go(node.getAttribute('data-nav'));
  });
});

/* ============================================================
   MODULE - DASHBOARD
   ============================================================ */
function renderDashboard(){
  const critical = ASSETS.filter(a => a.criticality === 'Critical').length;
  const down = ASSETS.filter(a => a.status === 'Down').length;
  const avgHealth = ASSETS.length ? Math.round(ASSETS.reduce((sum, a) => sum + (+a.health || 0), 0) / ASSETS.length) : 0;
  const openWOcount = WOS.filter(w => w.status !== 'Completed').length;
  const breakdownCount = typeof activeBreakdownCount === 'function'
    ? activeBreakdownCount()
    : WOS.filter(w => w.type === 'Breakdown' && w.status !== 'Completed').length;
  const recentWO = WOS.filter(w => w.status !== 'Completed').slice(0, 5);
  const watchCount = clamp(SETTINGS.dashboardWatchCount, 1, 12) || 4;
  const worst = [...ASSETS].sort((a, b) => a.health - b.health).slice(0, watchCount);

  view.innerHTML = `
    <div class="greeting">
      <div>
        <h1>Maintenance Overview</h1>
        <p><b style="color:#fff">${esc(currentUserName())}</b> is tracking <b style="color:#fff">${ASSETS.length} assets</b>,
        <b style="color:#fff">${openWOcount} open work orders</b>, and
        <b style="color:#fff">${down}</b> asset(s) currently down at <b style="color:#fff">${esc(SETTINGS.plantName)}</b>.</p>
      </div>
      <div class="g-actions">
        <button class="btn btn-ghost-d" data-nav="reports">View Reports</button>
        <button class="btn btn-primary" onclick="openWOModal('add')">+ New Work Order</button>
      </div>
    </div>
    <div class="shared-note">
      <div>
        <b>Set this workspace up for your team</b>
        <p>Before sharing the CMMS file with other people, update the site profile, create user accounts, and export the latest settings or data snapshots when needed.</p>
      </div>
      <div class="shared-note-actions">
        <button class="btn btn-ghost" data-nav="technicians">Manage Users</button>
        <button class="btn btn-primary" data-nav="settings">Open Settings</button>
      </div>
    </div>
    <div class="section-title">Key Metrics</div>
    <div class="kpis">
      <div class="kpi" onclick="go('assets')"><div class="k-top"><div><div class="k-val">${ASSETS.length}</div><div class="k-label">Total Assets</div></div><div class="k-ico ico-steel">A</div></div><div class="k-trend trend-up">${critical} critical · ${avgHealth}% avg health</div></div>
      <div class="kpi" onclick="go('work-orders')"><div class="k-top"><div><div class="k-val">${openWOcount}</div><div class="k-label">Open Work Orders</div></div><div class="k-ico ico-orange">WO</div></div><div class="k-trend trend-down">${WOS.filter(w => w.status === 'On Hold').length} on hold</div></div>
      <div class="kpi" onclick="go('breakdowns')"><div class="k-top"><div><div class="k-val">${breakdownCount}</div><div class="k-label">Active Breakdowns</div></div><div class="k-ico ico-red">BD</div></div><div class="k-trend trend-up">${down} line(s) stopped</div></div>
      <div class="kpi" onclick="go('settings')"><div class="k-top"><div><div class="k-val">${avgHealth}%</div><div class="k-label">Fleet Health</div></div><div class="k-ico ico-green">OK</div></div><div class="k-trend trend-up">${watchCount} assets in watchlist</div></div>
    </div>
    <div class="cols">
      <div class="panel">
        <div class="panel-head"><b>Active Work Orders</b><a onclick="go('work-orders')">View all -></a></div>
        ${recentWO.length ? recentWO.map(w => {
          const asset = ASSETS.find(a => a.id === w.assetId);
          const overdue = daysFromToday(w.due) < 0;
          return `<div class="wo-line" style="cursor:pointer" onclick="go('asset-detail','${w.assetId}')">
            <div class="wo-pri" style="background:${priColor(w.priority)}"></div>
            <div style="flex:1;min-width:0"><b style="font-size:13px;display:block">${w.id} · ${esc(w.title)}</b>
              <span style="font-size:11.5px;color:var(--ink-soft)">${asset ? esc(asset.name) : w.assetId} · ${asset ? esc(asset.location) : ''}</span></div>
            <div style="font-size:11.5px;color:var(--ink-soft);width:110px">${esc(w.technician) || 'Unassigned'}</div>
            <div style="font-size:11.5px;width:78px;text-align:right;${overdue ? 'color:var(--red)' : ''}">${overdue ? 'Overdue' : fmtDate(w.due)}</div>
            <span class="pill ${woStatusClass(w.status)}" style="width:92px;text-align:center">${w.status}</span></div>`;
        }).join('') : '<div style="padding:22px 17px;color:var(--ink-soft);font-size:13px">No open work orders right now.</div>'}
      </div>
      <div class="panel">
        <div class="panel-head"><b>Asset Health Watchlist</b><a onclick="go('assets')">View all -></a></div>
        ${worst.map(a => `<div style="padding:13px 17px;border-bottom:1px solid var(--steel-50);cursor:pointer" onclick="go('asset-detail','${a.id}')">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px">
            <b style="font-size:12.5px">${a.id} · ${esc(a.name)}</b>
            <span style="font-size:11.5px;font-weight:700;color:${healthColor(a.health)}">${a.health}%</span></div>
          <div style="height:7px;border-radius:5px;background:var(--steel-100);overflow:hidden"><i style="display:block;height:100%;width:${a.health}%;background:${healthColor(a.health)}"></i></div>
          <small style="font-size:10.5px;color:var(--ink-soft)">${esc(a.category)} · ${a.status} · ${esc(a.manufacturer)}</small></div>`).join('')}
      </div>
    </div>`;
  bindNav();
}

/* ============================================================
   MODULE - ASSET REGISTER
   ============================================================ */
let assetFilters = {q:'', cat:'', crit:'', status:''};

function renderAssets(){
  const cats = categoryOptions();
  const down = ASSETS.filter(a => a.status === 'Down').length;
  const critical = ASSETS.filter(a => a.criticality === 'Critical').length;
  const avgHealth = ASSETS.length ? Math.round(ASSETS.reduce((sum, a) => sum + (+a.health || 0), 0) / ASSETS.length) : 0;
  const pmOverdue = ASSETS.filter(a => a.nextPM && daysFromToday(a.nextPM) < 0).length;
  const dirty = isDirty();

  view.innerHTML = `
    <div class="page-head">
      <div><h1>Asset Register</h1><div class="ph-sub">Master list of all maintainable equipment.</div></div>
      <button class="btn btn-primary" onclick="openAssetModal('add')">+ Add Asset</button>
    </div>
    <div class="databar ${dirty ? '' : 'clean'}">
      ${dirty
        ? `<b>Unsaved changes</b><span>You have asset edits stored in this browser that are not yet written to the data file.</span>`
        : `<b>In sync</b><span>The register matches the <span class="mono">CMMS_Data/assets.js</span> data file.</span>`}
      <span class="spacer"></span>
      <button class="btn btn-ghost btn-sm" onclick="exportAssets()">Export assets.js</button>
      ${dirty ? `<button class="btn btn-ghost btn-sm" onclick="confirmReset()">Revert</button>` : ''}
    </div>
    <div class="kpis" style="margin-bottom:18px">
      <div class="kpi"><div class="k-top"><div><div class="k-val">${ASSETS.length}</div><div class="k-label">Total Assets</div></div><div class="k-ico ico-steel">A</div></div></div>
      <div class="kpi"><div class="k-top"><div><div class="k-val">${critical}</div><div class="k-label">Critical Assets</div></div><div class="k-ico ico-orange">!</div></div></div>
      <div class="kpi"><div class="k-top"><div><div class="k-val" style="color:${down ? 'var(--red)' : 'inherit'}">${down}</div><div class="k-label">Currently Down</div></div><div class="k-ico ico-red">DN</div></div></div>
      <div class="kpi"><div class="k-top"><div><div class="k-val">${avgHealth}%</div><div class="k-label">Avg Health · ${pmOverdue} PM overdue</div></div><div class="k-ico ico-green">OK</div></div></div>
    </div>
    <div class="toolbar">
      <input class="tb-search" id="af-q" placeholder="Search by ID, name, manufacturer..." value="${esc(assetFilters.q)}">
      <select id="af-cat"><option value="">All Categories</option>${cats.map(c => `<option ${assetFilters.cat === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>
      <select id="af-crit"><option value="">All Criticality</option>${['Critical','High','Medium','Low'].map(c => `<option ${assetFilters.crit === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
      <select id="af-status"><option value="">All Status</option>${['Running','Down','Standby'].map(c => `<option ${assetFilters.status === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
      <span class="tb-count" id="af-count"></span>
    </div>
    <div class="tbl-wrap"><table>
      <thead><tr>
        <th>Asset ID</th><th>Name</th><th>Category</th><th>Location</th><th>Criticality</th>
        <th>Status</th><th>Health</th><th>Next PM</th><th>Open WO</th><th style="text-align:right">Actions</th>
      </tr></thead>
      <tbody id="asset-rows"></tbody>
    </table></div>`;

  const apply = () => {
    assetFilters.q = $('#af-q').value.toLowerCase();
    assetFilters.cat = $('#af-cat').value;
    assetFilters.crit = $('#af-crit').value;
    assetFilters.status = $('#af-status').value;
    const rows = ASSETS.filter(a => {
      const hay = `${a.id} ${a.name} ${a.manufacturer} ${a.model}`.toLowerCase();
      return hay.includes(assetFilters.q)
        && (!assetFilters.cat || a.category === assetFilters.cat)
        && (!assetFilters.crit || a.criticality === assetFilters.crit)
        && (!assetFilters.status || a.status === assetFilters.status);
    });
    $('#asset-rows').innerHTML = rows.length ? rows.map(a => {
      const pmOver = a.nextPM && daysFromToday(a.nextPM) < 0;
      return `<tr onclick="go('asset-detail','${a.id}')">
        <td class="mono">${a.id}</td>
        <td><b>${esc(a.name)}</b></td>
        <td>${esc(a.category)}</td>
        <td style="color:var(--ink-soft)">${esc(a.location)}</td>
        <td><span class="pill ${critClass(a.criticality)}">${a.criticality}</span></td>
        <td><span class="pill ${statusClass(a.status)}">${a.status}</span></td>
        <td><div class="hbar"><div class="bar"><i style="width:${a.health}%;background:${healthColor(a.health)}"></i></div><span style="color:${healthColor(a.health)}">${a.health}%</span></div></td>
        <td style="${pmOver ? 'color:var(--red);font-weight:600' : ''}">${pmOver ? 'Late ' + fmtDate(a.nextPM) : fmtDate(a.nextPM)}</td>
        <td>${woOpenCount(a.id) > 0 ? `<span class="pill pill-open">${woOpenCount(a.id)}</span>` : '<span style="color:var(--ink-soft)">0</span>'}</td>
        <td style="text-align:right;white-space:nowrap" onclick="event.stopPropagation()">
          <button class="iconbtn" title="Edit" onclick="openAssetModal('edit','${a.id}')">Edit</button>
          <button class="iconbtn del" title="Delete" onclick="confirmDelete('${a.id}')">Del</button>
        </td>
      </tr>`;
    }).join('') : `<tr><td colspan="10" style="text-align:center;color:var(--ink-soft);padding:30px">No assets match the current filters.</td></tr>`;
    $('#af-count').textContent = `Showing ${rows.length} of ${ASSETS.length} assets`;
  };
  ['af-q','af-cat','af-crit','af-status'].forEach(id => {
    $('#' + id).addEventListener('input', apply);
    $('#' + id).addEventListener('change', apply);
  });
  apply();
}

/* ============================================================
   MODULE - ASSET DETAIL
   ============================================================ */
function renderAssetDetail(id){
  const asset = ASSETS.find(a => a.id === id);
  if(!asset){ renderAssets(); return; }
  const workOrders = woFor(id);
  const openWork = workOrders.filter(w => w.status !== 'Completed');
  const pmOver = asset.nextPM && daysFromToday(asset.nextPM) < 0;
  const ageYears = asset.installDate
    ? ((new Date(todayIso()) - new Date(asset.installDate)) / (365.25 * 86400000)).toFixed(1)
    : '-';

  view.innerHTML = `
    <div class="back" onclick="go('assets')"><- Back to Asset Register</div>
    <div class="detail-hero">
      <div class="gauge" style="background:conic-gradient(${healthColor(asset.health)} ${asset.health * 3.6}deg, var(--steel-100) 0deg)">
        <div class="g-inner"><b style="color:${healthColor(asset.health)}">${asset.health}%</b><span>Health</span></div>
      </div>
      <div class="dh-main">
        <h1>${esc(asset.name)}</h1>
        <div class="dh-meta"><span class="mono">${asset.id}</span> · ${esc(asset.category)} · ${esc(asset.location)}</div>
        <div class="dh-tags">
          <span class="pill ${critClass(asset.criticality)}">${asset.criticality}</span>
          <span class="pill ${statusClass(asset.status)}">${asset.status}</span>
          ${pmOver ? '<span class="pill pill-hold">PM Overdue</span>' : ''}
          ${woOpenCount(asset.id) > 0 ? `<span class="pill pill-open">${woOpenCount(asset.id)} Open WO</span>` : ''}
        </div>
      </div>
      <div class="dh-actions">
        <button class="btn btn-primary" onclick="openAssetModal('edit','${asset.id}')">Edit Asset</button>
        <button class="btn btn-danger" onclick="confirmDelete('${asset.id}')">Delete Asset</button>
      </div>
    </div>
    <div class="statgrid">
      <div class="stat"><div class="s-label">Run Hours</div><div class="s-val">${Number(asset.runHours || 0).toLocaleString()}</div></div>
      <div class="stat"><div class="s-label">MTBF</div><div class="s-val">${asset.mtbfDays} days</div></div>
      <div class="stat"><div class="s-label">Last PM</div><div class="s-val" style="font-size:15px">${fmtDate(asset.lastPM)}</div></div>
      <div class="stat"><div class="s-label">Next PM</div><div class="s-val" style="font-size:15px;${pmOver ? 'color:var(--red)' : ''}">${fmtDate(asset.nextPM)}</div></div>
    </div>
    <div class="tabs">
      <div class="tab active" data-tab="overview">Overview</div>
      <div class="tab" data-tab="wohist">Work Order History (${workOrders.length})</div>
      <div class="tab" data-tab="specs">Specifications</div>
    </div>
    <div class="tabpane active" id="tp-overview">
      <div class="panel"><div class="panel-head"><b>Open Work Orders</b></div>
        ${openWork.length ? openWork.map(woRowHtml).join('') : '<div style="padding:22px 17px;color:var(--ink-soft);font-size:13px">No open work orders for this asset.</div>'}
      </div>
      <div class="notebox"><b>Maintenance Note:</b> ${esc(asset.notes) || '-'}</div>
    </div>
    <div class="tabpane" id="tp-wohist">
      <div class="panel"><div class="panel-head"><b>All Work Orders - ${asset.id}</b></div>
        ${workOrders.length ? workOrders.map(woRowHtml).join('') : '<div style="padding:22px 17px;color:var(--ink-soft);font-size:13px">No work order history.</div>'}
      </div>
    </div>
    <div class="tabpane" id="tp-specs">
      <div class="tbl-wrap"><table class="spec-tbl">
        <tr><td>Asset ID</td><td class="mono">${asset.id}</td></tr>
        <tr><td>Asset Name</td><td><b>${esc(asset.name)}</b></td></tr>
        <tr><td>Category</td><td>${esc(asset.category)}</td></tr>
        <tr><td>Location</td><td>${esc(asset.location)}</td></tr>
        <tr><td>Building</td><td>${esc(asset.building)}</td></tr>
        <tr><td>Manufacturer</td><td>${esc(asset.manufacturer)}</td></tr>
        <tr><td>Model</td><td>${esc(asset.model)}</td></tr>
        <tr><td>Serial Number</td><td class="mono">${esc(asset.serial)}</td></tr>
        <tr><td>Install Date</td><td>${fmtDate(asset.installDate)} <span style="color:var(--ink-soft)">${asset.installDate ? `(${ageYears} yrs old)` : ''}</span></td></tr>
        <tr><td>Criticality</td><td><span class="pill ${critClass(asset.criticality)}">${asset.criticality}</span></td></tr>
        <tr><td>Current Status</td><td><span class="pill ${statusClass(asset.status)}">${asset.status}</span></td></tr>
        <tr><td>Run Hours</td><td>${Number(asset.runHours || 0).toLocaleString()} hrs</td></tr>
      </table></div>
    </div>`;

  view.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      view.querySelectorAll('.tab').forEach(node => node.classList.remove('active'));
      view.querySelectorAll('.tabpane').forEach(node => node.classList.remove('active'));
      tab.classList.add('active');
      $('#tp-' + tab.getAttribute('data-tab')).classList.add('active');
    });
  });
}

function woRowHtml(w){
  const overdue = w.status !== 'Completed' && daysFromToday(w.due) < 0;
  return `<div class="wo-line" style="cursor:pointer" onclick="go('wo-detail','${w.id}')">
    <div class="wo-pri" style="background:${priColor(w.priority)}"></div>
    <div style="flex:1;min-width:0"><b style="font-size:13px;display:block"><span class="mono">${w.id}</span> · ${esc(w.title)}</b>
      <span style="font-size:11.5px;color:var(--ink-soft)">${w.type} · ${esc(w.technician) || 'Unassigned'} · ${w.labourHrs || 0}h labour</span></div>
    <div style="font-size:11.5px;width:90px;text-align:right;${overdue ? 'color:var(--red)' : 'color:var(--ink-soft)'}">${overdue ? 'Overdue' : 'Due ' + fmtDate(w.due)}</div>
    <span class="pill ${woStatusClass(w.status)}" style="width:92px;text-align:center">${w.status}</span>
  </div>`;
}

/* ============================================================
   ASSET CRUD
   ============================================================ */
const overlay = $('#overlay');
const modalHost = $('#modal-host');
function closeModal(){
  if(loginLock) return;
  loginLock = false;
  overlay.classList.remove('show');
  modalHost.innerHTML = '';
}
overlay.addEventListener('click', e => { if(e.target === overlay) closeModal(); });
document.addEventListener('keydown', e => { if(e.key === 'Escape') closeModal(); });

function openAssetModal(mode, id){
  const editing = mode === 'edit';
  const asset = editing ? ASSETS.find(a => a.id === id) : {
    id:'',
    name:'',
    category: SETTINGS.defaultCategory || categoryOptions()[0] || 'SURFACE',
    location:'',
    building: SETTINGS.defaultBuilding || buildingOptions()[0] || 'Gino Thai Plant',
    criticality:'Medium',
    status:'Running',
    health:100,
    manufacturer:'',
    model:'',
    serial:'',
    installDate:'',
    lastPM:'',
    nextPM:'',
    mtbfDays:120,
    runHours:0,
    openWOs:0,
    notes:''
  };
  if(editing && !asset){ toast('Asset not found.'); return; }

  const sel = (value, values) => values.map(v => `<option ${v === value ? 'selected' : ''}>${esc(v)}</option>`).join('');
  modalHost.innerHTML = `
   <div class="modal">
    <div class="modal-head">
      <h3>${editing ? 'Edit Asset - ' + asset.id : 'Add New Asset'}</h3>
      <div class="x" onclick="closeModal()">x</div>
    </div>
    <div class="modal-body">
      <div class="form-err" id="form-err"></div>
      <div class="form-grid">
        <div class="field"><label>Asset ID <span class="req">*</span></label><input id="f-id" value="${esc(asset.id)}" ${editing ? 'readonly' : ''} placeholder="e.g. SUR-030 or EDG-027"></div>
        <div class="field"><label>Asset Name <span class="req">*</span></label><input id="f-name" value="${esc(asset.name)}" placeholder="e.g. Lens Polisher Toro-X"></div>
        <div class="field"><label>Category / Department</label><select id="f-category">${sel(asset.category, categoryOptions())}</select></div>
        <div class="field"><label>Building / Site</label><select id="f-building">${sel(asset.building, buildingOptions())}</select></div>
        <div class="field"><label>Location <span class="req">*</span></label><input id="f-location" value="${esc(asset.location)}" placeholder="e.g. Surface Area"></div>
        <div class="field"><label>Criticality</label><select id="f-criticality">${sel(asset.criticality, ['Critical','High','Medium','Low'])}</select></div>
        <div class="field"><label>Status</label><select id="f-status">${sel(asset.status, ['Running','Down','Standby'])}</select></div>
        <div class="field"><label>Health % (0-100)</label><input id="f-health" type="number" min="0" max="100" value="${asset.health}"></div>
        <div class="field"><label>Manufacturer / Supplier</label><input id="f-manufacturer" value="${esc(asset.manufacturer)}"></div>
        <div class="field"><label>Model</label><input id="f-model" value="${esc(asset.model)}"></div>
        <div class="field"><label>Serial Number</label><input id="f-serial" value="${esc(asset.serial)}"></div>
        <div class="field"><label>Install Date</label><input id="f-installDate" type="date" value="${esc(asset.installDate)}"></div>
        <div class="field"><label>Last PM Date</label><input id="f-lastPM" type="date" value="${esc(asset.lastPM)}"></div>
        <div class="field"><label>Next PM Date</label><input id="f-nextPM" type="date" value="${esc(asset.nextPM)}"></div>
        <div class="field"><label>MTBF (days)</label><input id="f-mtbfDays" type="number" min="0" value="${asset.mtbfDays}"></div>
        <div class="field"><label>Run Hours</label><input id="f-runHours" type="number" min="0" value="${asset.runHours}"></div>
        <div class="field full"><label>Maintenance Notes</label><textarea id="f-notes" placeholder="Condition notes, known issues, history...">${esc(asset.notes)}</textarea></div>
      </div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveAsset('${mode}','${editing ? asset.id : ''}')">${editing ? 'Save Changes' : 'Add Asset'}</button>
    </div>
   </div>`;
  overlay.classList.add('show');
  setTimeout(() => {
    const focusNode = $(editing ? '#f-name' : '#f-id');
    if(focusNode) focusNode.focus();
  }, 50);
}

function saveAsset(mode, origId){
  const g = id => $('#f-' + id);
  const errBox = $('#form-err');
  const showErr = msg => {
    errBox.textContent = msg;
    errBox.classList.add('show');
  };
  errBox.classList.remove('show');
  ['id','name','location'].forEach(key => {
    const node = g(key);
    if(node) node.classList.remove('bad');
  });

  const rec = {
    id: g('id').value.trim(),
    name: g('name').value.trim(),
    category: g('category').value,
    location: g('location').value.trim(),
    building: g('building').value,
    criticality: g('criticality').value,
    status: g('status').value,
    health: clamp(g('health').value, 0, 100),
    manufacturer: g('manufacturer').value.trim(),
    model: g('model').value.trim(),
    serial: g('serial').value.trim(),
    installDate: g('installDate').value,
    lastPM: g('lastPM').value,
    nextPM: g('nextPM').value,
    mtbfDays: Math.max(0, parseInt(g('mtbfDays').value, 10) || 0),
    runHours: Math.max(0, parseInt(g('runHours').value, 10) || 0),
    openWOs: 0,
    notes: g('notes').value.trim()
  };

  if(!rec.id){ g('id').classList.add('bad'); showErr('Asset ID is required.'); return; }
  if(!/^[A-Za-z0-9\-_]+$/.test(rec.id)){ g('id').classList.add('bad'); showErr('Asset ID may only contain letters, numbers, hyphens, and underscores.'); return; }
  if(!rec.name){ g('name').classList.add('bad'); showErr('Asset Name is required.'); return; }
  if(!rec.location){ g('location').classList.add('bad'); showErr('Location is required.'); return; }

  if(mode === 'add'){
    if(ASSETS.some(a => a.id.toLowerCase() === rec.id.toLowerCase())){
      g('id').classList.add('bad');
      showErr(`An asset with ID "${rec.id}" already exists.`);
      return;
    }
    ASSETS.push(rec);
    persistAssets();
    mergeIntoSettingList('categories', rec.category);
    mergeIntoSettingList('buildings', rec.building);
    closeModal();
    toast(`Asset ${rec.id} added.`);
    go('assets');
  }else{
    const idx = ASSETS.findIndex(a => a.id === origId);
    if(idx < 0){ showErr('Original asset no longer exists.'); return; }
    rec.id = origId;
    ASSETS[idx] = rec;
    persistAssets();
    mergeIntoSettingList('categories', rec.category);
    mergeIntoSettingList('buildings', rec.building);
    closeModal();
    toast(`Asset ${origId} updated.`);
    go(current === 'asset-detail' ? 'asset-detail' : 'assets', origId);
  }
}

function confirmDelete(id){
  const asset = ASSETS.find(a => a.id === id);
  if(!asset) return;
  const linked = woFor(id).length;
  modalHost.innerHTML = `
   <div class="modal confirm-box">
    <div class="modal-head"><h3>Delete Asset</h3><div class="x" onclick="closeModal()">x</div></div>
    <div class="modal-body">
      <p>Remove <b>${asset.id} - ${esc(asset.name)}</b> from the Asset Register?</p>
      ${linked ? `<p style="margin-top:10px;color:var(--ink-soft)">Note: ${linked} linked work order(s) will remain in the system but will no longer point to a registered asset.</p>` : ''}
      <p style="margin-top:10px;color:var(--ink-soft)">This change is stored in your browser. Use <b>Export assets.js</b> to make it permanent.</p>
    </div>
    <div class="modal-foot">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-danger" onclick="doDelete('${id}')">Delete Asset</button>
    </div>
   </div>`;
  overlay.classList.add('show');
}
function doDelete(id){
  const idx = ASSETS.findIndex(a => a.id === id);
  if(idx >= 0){
    ASSETS.splice(idx, 1);
    persistAssets();
  }
  closeModal();
  toast(`Asset ${id} deleted.`);
  go('assets');
}
function confirmReset(){
  modalHost.innerHTML = `
   <div class="modal confirm-box">
    <div class="modal-head"><h3>Revert Changes</h3><div class="x" onclick="closeModal()">x</div></div>
    <div class="modal-body">
      <p>Discard all local asset edits and reload the Asset Register from the original <span class="mono">CMMS_Data/assets.js</span> file?</p>
      <p style="margin-top:10px;color:var(--ink-soft)">Anything you have not exported will be lost.</p>
    </div>
    <div class="modal-foot">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-danger" onclick="closeModal();resetAssetsToFile()">Revert to file</button>
    </div>
   </div>`;
  overlay.classList.add('show');
}

function openPermissionModal(userId){
  if(!canManageSettings() && !canManageUsers()){
    toast('You do not have permission to edit user access.');
    return;
  }
  const user = userById(userId);
  if(!user){
    toast('User not found.');
    return;
  }
  modalHost.innerHTML = `
   <div class="modal">
    <div class="modal-head"><h3>Edit Permissions - ${esc(user.name)}</h3><div class="x" onclick="closeModal()">x</div></div>
    <div class="modal-body">
      <div class="form-err" id="perm-err"></div>
      <p style="margin-bottom:14px;color:var(--ink-soft);font-size:12.5px;line-height:1.6">Choose which shared CMMS actions this user can perform. Role is still shown for reporting, but the checkboxes below control access.</p>
      <div class="perm-grid">
        ${PERMISSION_DEFS.map(def => `
          <label class="perm-option">
            <input type="checkbox" data-permission-key="${def.key}" ${user.permissions && user.permissions[def.key] ? 'checked' : ''}>
            <span>
              <b>${esc(def.label)}</b>
              <small>${esc(def.note)}</small>
            </span>
          </label>`).join('')}
      </div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-ghost" onclick="resetPermissionInputs('${user.id}','${user.role}')">Reset To Role Default</button>
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveUserPermissions('${user.id}')">Save Permissions</button>
    </div>
   </div>`;
  overlay.classList.add('show');
}
function resetPermissionInputs(userId, role){
  const defaults = defaultPermissionsForRole(role);
  document.querySelectorAll('[data-permission-key]').forEach(node => {
    node.checked = defaults[node.getAttribute('data-permission-key')] === true;
  });
  const err = $('#perm-err');
  if(err) err.classList.remove('show');
}
function saveUserPermissions(userId){
  const user = userById(userId);
  const err = $('#perm-err');
  if(err) err.classList.remove('show');
  if(!user){
    if(err){
      err.textContent = 'User no longer exists.';
      err.classList.add('show');
    }
    return;
  }
  const next = {};
  document.querySelectorAll('[data-permission-key]').forEach(node => {
    next[node.getAttribute('data-permission-key')] = node.checked === true;
  });
  if(user.id === currentUserId() && !next['users.manage'] && !next['settings.manage']){
    if(err){
      err.textContent = 'Keep at least one admin permission on the currently signed-in account so you do not lock yourself out.';
      err.classList.add('show');
    }
    return;
  }
  user.permissions = normalizePermissions(next, user.role);
  persistUsers();
  applySettingsToShell();
  closeModal();
  toast(`Permissions updated for ${user.name}.`);
  if(current === 'settings') renderSettings();
  else if(current === 'technician-detail') go('technician-detail', user.id);
  else go('technicians');
}

/* ============================================================
   MODULE - SETTINGS
   ============================================================ */
function renderSettings(){
  if(!canManageSettings()){
    view.innerHTML = `
      <div class="page-head">
        <div><h1>Settings</h1><div class="ph-sub">Permission-controlled setup area for the shared CMMS workspace.</div></div>
      </div>
      <div class="panel">
        <div class="panel-head"><b>Restricted Access</b><span style="font-size:12px;color:var(--ink-soft)">Signed in as ${esc(currentUserName())}</span></div>
        <div class="panel-body">
          <p style="font-size:13px;line-height:1.6">This account does not currently have permission to edit workspace settings. Ask an administrator to grant access from the Settings permission screen.</p>
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px">
            <button class="btn btn-primary" onclick="openLoginModal()">Switch User</button>
            <button class="btn btn-ghost" onclick="go('dashboard')">Back to Dashboard</button>
          </div>
        </div>
      </div>`;
    return;
  }
  const pmRows = sourcePMs();
  const dirty = settingsDirty();
  SETTINGS = normaliseSettings(SETTINGS);
  const moduleCards = [
    {label:'Assets', count:ASSETS.length, note:isDirty() ? 'Local edits pending export' : 'In sync', route:'assets'},
    {label:'Work Orders', count:WOS.length, note:woDirty() ? 'Local edits pending export' : 'In sync', route:'work-orders'},
    {label:'PM Schedules', count:pmRows.length, note:(typeof pmDirty === 'function' && pmDirty()) ? 'Local edits pending export' : 'In sync', route:'pm'},
    {label:'Breakdowns', count:(typeof BREAKDOWNS !== 'undefined' ? BREAKDOWNS.length : activeBreakdownCount()), note:(typeof breakdownDirty === 'function' && breakdownDirty()) ? 'Local edits pending export' : 'Failure event log', route:'breakdowns'},
    {label:'Service Requests', count:(typeof REQUESTS !== 'undefined' ? REQUESTS.length : 0), note:(typeof reqDirty === 'function' && reqDirty()) ? 'Local edits pending export' : 'Intake queue', route:'requests'},
    {label:'Infrastructure', count:(typeof INFRA !== 'undefined' ? INFRA.length : 0), note:(typeof infraDirty === 'function' && infraDirty()) ? 'Local edits pending export' : 'Utility network register', route:'infrastructure'},
    {label:'Spare Parts', count:(typeof PARTS !== 'undefined' ? PARTS.length : 0), note:(typeof storesDirty === 'function' && storesDirty()) ? 'Local edits pending export' : 'In sync', route:'parts'},
    {label:'Inventory', count:(typeof MOVES !== 'undefined' ? MOVES.length : 0), note:'Transaction history', route:'inventory'},
    {label:'Technicians & Staff', count:(typeof STAFF !== 'undefined' ? STAFF.length : technicianOptions().length), note:usersDirty() ? 'Local account edits pending export' : 'User roster and login accounts', route:'technicians'}
  ];

  view.innerHTML = `
    <div class="page-head">
      <div><h1>Settings</h1><div class="ph-sub">Control the site profile, shared lists, and app defaults for this CMMS workspace.</div></div>
    </div>
    <div class="databar ${dirty ? '' : 'clean'}">
      ${dirty
        ? `<b>Unsaved settings export</b><span>Your settings are saved in this browser. Export them if you want a portable backup.</span>`
        : `<b>Settings ready</b><span>The current workspace settings are loaded and no new export is pending.</span>`}
      <span class="spacer"></span>
      <button class="btn btn-ghost btn-sm" onclick="exportSettings()">Export settings</button>
      ${dirty ? `<button class="btn btn-ghost btn-sm" onclick="confirmResetSettings()">Revert</button>` : ''}
    </div>
    <div class="kpis" style="margin-bottom:18px">
      <div class="kpi"><div class="k-top"><div><div class="k-val">${buildingOptions().length}</div><div class="k-label">Sites / Buildings</div></div><div class="k-ico ico-steel">S</div></div></div>
      <div class="kpi"><div class="k-top"><div><div class="k-val">${categoryOptions().length}</div><div class="k-label">Asset Categories</div></div><div class="k-ico ico-blue">C</div></div></div>
      <div class="kpi"><div class="k-top"><div><div class="k-val">${technicianOptions().length}</div><div class="k-label">Technician Suggestions</div></div><div class="k-ico ico-orange">T</div></div></div>
      <div class="kpi"><div class="k-top"><div><div class="k-val">${SETTINGS.healthWatchThreshold}%</div><div class="k-label">Health Alert Threshold</div></div><div class="k-ico ico-red">H</div></div></div>
    </div>
    <div class="tabs settings-tabs">
      <div class="tab ${settingsTab === 'profile' ? 'active' : ''}" data-settings-tab="profile">Plant Profile</div>
      <div class="tab ${settingsTab === 'lists' ? 'active' : ''}" data-settings-tab="lists">Master Lists</div>
      <div class="tab ${settingsTab === 'defaults' ? 'active' : ''}" data-settings-tab="defaults">Defaults</div>
      <div class="tab ${settingsTab === 'permissions' ? 'active' : ''}" data-settings-tab="permissions">Permissions</div>
      <div class="tab ${settingsTab === 'data' ? 'active' : ''}" data-settings-tab="data">Data & Sync</div>
    </div>

    <div class="tabpane ${settingsTab === 'profile' ? 'active' : ''}" id="settings-profile">
      <div class="panel">
        <div class="panel-head"><b>Plant Profile</b><span style="font-size:12px;color:var(--ink-soft)">Shown in the app header and dashboard. Update these labels before sharing the workspace with another site or team.</span></div>
        <div class="panel-body settings-body">
          <div class="form-grid">
            <div class="field"><label>Plant Name</label><input id="s-plantName" value="${esc(SETTINGS.plantName)}"></div>
            <div class="field"><label>Shift Label</label><input id="s-shiftLabel" value="${esc(SETTINGS.shiftLabel)}"></div>
            <div class="field"><label>Default Signed-Out Name</label><input id="s-currentUser" value="${esc(SETTINGS.currentUser)}"></div>
            <div class="field"><label>Default Signed-Out Initials</label><input id="s-userInitials" maxlength="4" value="${esc(SETTINGS.userInitials)}"></div>
            <div class="field"><label>Timezone</label><input id="s-timezone" value="${esc(SETTINGS.timezone)}"></div>
            <div class="field"><label>Work Week</label><input id="s-workWeek" value="${esc(SETTINGS.workWeek)}"></div>
          </div>
          <div class="settings-actions">
            <button class="btn btn-primary" onclick="saveSettingsSection('profile')">Save Plant Profile</button>
          </div>
        </div>
      </div>
    </div>

    <div class="tabpane ${settingsTab === 'lists' ? 'active' : ''}" id="settings-lists">
      <div class="panel">
        <div class="panel-head"><b>Master Lists</b><span style="font-size:12px;color:var(--ink-soft)">One item per line. These feed dropdowns and suggestions across the app.</span></div>
        <div class="panel-body settings-body">
          <div class="form-grid">
            <div class="field"><label>Buildings / Sites</label><textarea id="s-buildings">${esc((SETTINGS.buildings || []).join('\n'))}</textarea></div>
            <div class="field"><label>Asset Categories</label><textarea id="s-categories">${esc((SETTINGS.categories || []).join('\n'))}</textarea></div>
            <div class="field"><label>Technicians</label><textarea id="s-technicians">${esc((SETTINGS.technicians || []).join('\n'))}</textarea></div>
            <div class="field"><label>Requesters</label><textarea id="s-requesters">${esc((SETTINGS.requesters || []).join('\n'))}</textarea></div>
          </div>
          <div class="settings-actions">
            <button class="btn btn-primary" onclick="saveSettingsSection('lists')">Save Master Lists</button>
          </div>
        </div>
      </div>
    </div>

    <div class="tabpane ${settingsTab === 'defaults' ? 'active' : ''}" id="settings-defaults">
      <div class="panel">
        <div class="panel-head"><b>App Defaults</b><span style="font-size:12px;color:var(--ink-soft)">Used when new assets, work orders, and PM schedules are created.</span></div>
        <div class="panel-body settings-body">
          <div class="form-grid">
            <div class="field"><label>Default Building</label><select id="s-defaultBuilding">${buildingOptions().map(v => `<option ${SETTINGS.defaultBuilding === v ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></div>
            <div class="field"><label>Default Category</label><select id="s-defaultCategory">${categoryOptions().map(v => `<option ${SETTINGS.defaultCategory === v ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></div>
            <div class="field"><label>Default WO Priority</label><select id="s-defaultWOPriority">${DEFAULT_WO_PRIORITIES.map(v => `<option ${SETTINGS.defaultWOPriority === v ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
            <div class="field"><label>Default PM Frequency</label><select id="s-defaultPMFrequency">${DEFAULT_PM_FREQUENCIES.map(v => `<option ${SETTINGS.defaultPMFrequency === v ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
            <div class="field"><label>Dashboard Watchlist Count</label><input id="s-dashboardWatchCount" type="number" min="1" max="12" value="${SETTINGS.dashboardWatchCount}"></div>
            <div class="field"><label>Health Watch Threshold (%)</label><input id="s-healthWatchThreshold" type="number" min="0" max="100" value="${SETTINGS.healthWatchThreshold}"></div>
            <div class="field"><label>WO Due Soon Window (days)</label><input id="s-woDueSoonDays" type="number" min="0" max="30" value="${SETTINGS.woDueSoonDays}"></div>
            <div class="field"><label>PM Due Soon Window (days)</label><input id="s-pmDueSoonDays" type="number" min="0" max="60" value="${SETTINGS.pmDueSoonDays}"></div>
          </div>
          <div class="settings-actions">
            <button class="btn btn-primary" onclick="saveSettingsSection('defaults')">Save Defaults</button>
          </div>
        </div>
      </div>
    </div>

    <div class="tabpane ${settingsTab === 'permissions' ? 'active' : ''}" id="settings-permissions">
      <div class="panel">
        <div class="panel-head"><b>User Permissions</b><span style="font-size:12px;color:var(--ink-soft)">Admins can decide who can edit which CMMS modules.</span></div>
        <div class="panel-body settings-body">
          <div class="databar clean" style="margin-bottom:0">
            <b>Shared access</b><span>Every user signs in before using the CMMS. Edit a row below to change who can manage assets, work orders, exports, or settings.</span>
          </div>
          <div class="tbl-wrap"><table>
            <thead><tr><th>User</th><th>Role</th><th>Login</th><th>Permissions</th><th style="text-align:right">Actions</th></tr></thead>
            <tbody>
              ${STAFF.map(user => `
                <tr>
                  <td><b>${esc(user.name)}</b><div style="font-size:11.5px;color:var(--ink-soft)"><span class="mono">${esc(user.id)}</span> · ${esc(user.department)}</div></td>
                  <td>${esc(user.role)}</td>
                  <td><span class="pill ${peopleStatusPill(user)}">${peopleStatusText(user)}</span></td>
                  <td>${permissionCount(user)} of ${PERMISSION_DEFS.length}</td>
                  <td style="text-align:right"><button class="btn btn-ghost btn-sm" onclick="openPermissionModal('${user.id}')">Edit Permissions</button></td>
                </tr>`).join('')}
            </tbody>
          </table></div>
        </div>
      </div>
    </div>

    <div class="tabpane ${settingsTab === 'data' ? 'active' : ''}" id="settings-data">
      <div class="settings-sync-grid">
        ${moduleCards.map(card => `<div class="settings-sync-card">
          <div class="sync-top"><b>${card.label}</b><span>${card.count}</span></div>
          <p>${card.note}</p>
          <button class="btn btn-ghost btn-sm" onclick="go('${card.route}')">Open ${card.label}</button>
        </div>`).join('')}
      </div>
      <div class="panel" style="margin-top:18px">
        <div class="panel-head"><b>Settings Tools</b><span style="font-size:12px;color:var(--ink-soft)">Backup and reset controls</span></div>
        <div class="panel-body settings-body">
          <div class="settings-tool-row">
            <div>
              <b>Export current settings</b>
              <p>Downloads the current settings as JSON so you can keep a backup.</p>
            </div>
            <button class="btn btn-primary" onclick="exportSettings()">Export settings</button>
          </div>
          <div class="settings-tool-row">
            <div>
              <b>Reset settings to defaults</b>
              <p>Only the settings profile is reset. Asset, work-order, and PM data stay untouched.</p>
            </div>
            <button class="btn btn-danger" onclick="confirmResetSettings()">Reset settings</button>
          </div>
        </div>
      </div>
    </div>`;

  view.querySelectorAll('[data-settings-tab]').forEach(tab => {
    tab.addEventListener('click', () => {
      settingsTab = tab.getAttribute('data-settings-tab');
      renderSettings();
    });
  });
}

function saveSettingsSection(section){
  const readLines = id => uniqList(($('#' + id).value || '').split(/\r?\n/));
  if(section === 'profile'){
    SETTINGS.plantName = ($('#s-plantName').value || '').trim();
    SETTINGS.shiftLabel = ($('#s-shiftLabel').value || '').trim();
    SETTINGS.currentUser = ($('#s-currentUser').value || '').trim();
    SETTINGS.userInitials = ($('#s-userInitials').value || '').trim().toUpperCase();
    SETTINGS.timezone = ($('#s-timezone').value || '').trim();
    SETTINGS.workWeek = ($('#s-workWeek').value || '').trim();
  }else if(section === 'lists'){
    SETTINGS.buildings = readLines('s-buildings');
    SETTINGS.categories = readLines('s-categories');
    SETTINGS.technicians = readLines('s-technicians');
    SETTINGS.requesters = readLines('s-requesters');
  }else if(section === 'defaults'){
    SETTINGS.defaultBuilding = $('#s-defaultBuilding').value;
    SETTINGS.defaultCategory = $('#s-defaultCategory').value;
    SETTINGS.defaultWOPriority = $('#s-defaultWOPriority').value;
    SETTINGS.defaultPMFrequency = $('#s-defaultPMFrequency').value;
    SETTINGS.dashboardWatchCount = $('#s-dashboardWatchCount').value;
    SETTINGS.healthWatchThreshold = $('#s-healthWatchThreshold').value;
    SETTINGS.woDueSoonDays = $('#s-woDueSoonDays').value;
    SETTINGS.pmDueSoonDays = $('#s-pmDueSoonDays').value;
  }
  SETTINGS = normaliseSettings(SETTINGS);
  persistSettings();
  applySettingsToShell();
  renderSettings();
  toast('Settings saved.');
}

function confirmResetSettings(){
  modalHost.innerHTML = `
   <div class="modal confirm-box">
    <div class="modal-head"><h3>Reset Settings</h3><div class="x" onclick="closeModal()">x</div></div>
    <div class="modal-body">
      <p>Reset the settings profile, master lists, and defaults back to the app baseline?</p>
      <p style="margin-top:10px;color:var(--ink-soft)">This does not touch assets, work orders, or PM schedules.</p>
    </div>
    <div class="modal-foot">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-danger" onclick="closeModal();resetSettingsToDefault()">Reset settings</button>
    </div>
   </div>`;
  overlay.classList.add('show');
}

/* ============================================================
   PLACEHOLDER MODULES
   ============================================================ */
const MODULE_INFO = {
  'work-orders':     {i:'WO', t:'Work Orders', d:'Create, assign, and track corrective and breakdown work orders through their full lifecycle.', step:'Built'},
  'pm':              {i:'PM', t:'PM Schedule', d:'Define recurring preventive maintenance tasks and view the upcoming PM calendar.', step:'Built'},
  'requests':        {i:'RQ', t:'Service Requests', d:'Intake queue for maintenance requests raised by production and other departments.', step:'Built'},
  'breakdowns':      {i:'BD', t:'Breakdown Log', d:'Report and analyse equipment breakdowns, downtime, root causes, and repair response.', step:'Built'},
  'parts':           {i:'SP', t:'Spare Parts', d:'Manage spare part catalogue, stock levels, min/max, and reorder points.', step:'Built'},
  'inventory':       {i:'IV', t:'Inventory', d:'Track stores inventory, issues to work orders, and stock movements.', step:'Built'},
  'infrastructure':  {i:'IN', t:'Infrastructure', d:'Manage utility networks such as city water, compressed air, cooling water, and waste-water lines.', step:'Built'},
  'purchase-orders': {i:'PO', t:'Purchase Orders', d:'Raise and approve purchase orders for parts and external services.', step:'Upcoming'},
  'technicians':     {i:'TM', t:'Technicians & Staff', d:'Maintenance team roster, skills, shift assignment, workload, and user accounts.', step:'Built'},
  'vendors':         {i:'VN', t:'Vendors', d:'Approved supplier and contractor directory with contact details.', step:'Upcoming'},
  'reports':         {i:'RP', t:'Reports & KPIs', d:'MTBF, MTTR, PM compliance, downtime, stores risk, and team workload analytics.', step:'Built'},
  'asset-health':    {i:'AH', t:'Asset Health', d:'Condition monitoring dashboard across the equipment fleet.', step:'Upcoming'},
  'my-tasks':        {i:'MT', t:'Assigned Tasks', d:'Assigned work orders and PM tasks for the signed-in user.', step:'Built'},
  'calendar':        {i:'CL', t:'Maintenance Calendar', d:'Unified calendar view of all scheduled maintenance activity.', step:'Built'},
  'notifications':   {i:'NT', t:'Notifications', d:'Alerts for breakdowns, overdue WOs, low stock, and PM due.', step:'Upcoming'}
};
function renderPlaceholder(route){
  const mod = MODULE_INFO[route] || {i:'--', t:route, d:'This module has not been built yet.', step:'Upcoming'};
  view.innerHTML = `
    <div class="page-head"><div><h1>${mod.t}</h1><div class="ph-sub">Module scaffold</div></div></div>
    <div class="placeholder">
      <div class="ph-ico">${mod.i}</div>
      <h2>${mod.t}</h2>
      <p>${mod.d}</p>
      <div class="ph-tag">${mod.step}</div>
      <p style="margin-top:18px;font-size:12px">The app shell, navigation, and data layer are ready. Continue with this module when you want the next slice.</p>
    </div>`;
}

function bindNav(){
  view.querySelectorAll('[data-nav]').forEach(node => {
    node.addEventListener('click', e => {
      e.preventDefault();
      go(node.getAttribute('data-nav'));
    });
  });
}

/* ----- boot ----- */
initShellChrome();
go('dashboard');
window.addEventListener('load', () => {
  protectActions();
  ensureSessionUser();
  SESSION.authenticated = false;
  persistSession();
  applySettingsToShell();
  openLoginModal(SESSION.userId || 'admin', {force:true, message:LOGIN_REQUIRED_TEXT});
});
