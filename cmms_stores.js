/* ============================================================
   CMMS - MODULE: SPARE PARTS + INVENTORY
   Loaded after the core shell and uses its shared globals.
   ============================================================ */
const LS_PARTS = 'cmms_parts_v1';
const LS_MOVES = 'cmms_inventory_moves_v1';
const LS_STORES_DIRTY = 'cmms_stores_dirty_v1';
const PART_STATUSES = ['Healthy','Low Stock','Out of Stock','Overstock','Inactive'];
const MOVE_TYPES = ['Receipt','Issue','Adjustment','Cycle Count'];
const REF_TYPES = ['PO','WO','PM','Manual','Cycle Count'];

let partFilters = {q:'', cat:'', status:'', location:''};
let inventoryFilters = {q:'', type:''};
let inventoryTab = 'movements';

function assetIdsFor(category, count){
  const exact = ASSETS.filter(a => a.category === category).map(a => a.id);
  const fallback = ASSETS.map(a => a.id);
  return uniqList([...exact, ...fallback]).slice(0, count);
}
function buildPartSeeds(){
  return [
    {
      id:'SP-001',
      name:'Vacuum Pump Oil ISO 68',
      category:'Lubrication',
      uom:'L',
      onHand:18,
      minQty:8,
      maxQty:24,
      reorderQty:12,
      unitCost:220,
      location:'MRO-A1',
      supplier:'Thai Industrial Supply',
      leadDays:5,
      criticality:'High',
      status:'Active',
      assetIds:assetIdsFor('SURFACE', 2),
      lastReceipt:addDays(todayIso(), -5),
      notes:'Used across polishing and vacuum systems.'
    },
    {
      id:'SP-002',
      name:'Drive Belt 5VX-630',
      category:'Mechanical',
      uom:'EA',
      onHand:4,
      minQty:4,
      maxQty:12,
      reorderQty:6,
      unitCost:480,
      location:'MRO-B2',
      supplier:'Motion Components Asia',
      leadDays:9,
      criticality:'Critical',
      status:'Active',
      assetIds:assetIdsFor('EDGE', 2),
      lastReceipt:addDays(todayIso(), -18),
      notes:'Primary belt for edging spindle drive.'
    },
    {
      id:'SP-003',
      name:'24VDC Proximity Sensor',
      category:'Electrical',
      uom:'EA',
      onHand:1,
      minQty:3,
      maxQty:8,
      reorderQty:4,
      unitCost:860,
      location:'MRO-C1',
      supplier:'Omni Automation',
      leadDays:14,
      criticality:'High',
      status:'Active',
      assetIds:assetIdsFor('MC', 2),
      lastReceipt:addDays(todayIso(), -41),
      notes:'Line sensor used on transfer and indexing stations.'
    },
    {
      id:'SP-004',
      name:'Pneumatic Solenoid Valve 1/4 in',
      category:'Pneumatic',
      uom:'EA',
      onHand:7,
      minQty:2,
      maxQty:8,
      reorderQty:3,
      unitCost:1250,
      location:'MRO-C3',
      supplier:'SMC Thailand',
      leadDays:7,
      criticality:'High',
      status:'Active',
      assetIds:assetIdsFor('TINT', 2),
      lastReceipt:addDays(todayIso(), -12),
      notes:'Common replacement valve for pneumatic manifolds.'
    },
    {
      id:'SP-005',
      name:'Circulation Pump Seal Kit',
      category:'Mechanical',
      uom:'KIT',
      onHand:0,
      minQty:2,
      maxQty:6,
      reorderQty:2,
      unitCost:1850,
      location:'MRO-D1',
      supplier:'Hydro Flow Services',
      leadDays:16,
      criticality:'Critical',
      status:'Active',
      assetIds:assetIdsFor('HC', 2),
      lastReceipt:addDays(todayIso(), -63),
      notes:'For hard-coating recirculation pumps.'
    },
    {
      id:'SP-006',
      name:'Filter Cartridge 10 Micron',
      category:'Consumable',
      uom:'EA',
      onHand:26,
      minQty:10,
      maxQty:30,
      reorderQty:12,
      unitCost:95,
      location:'MRO-A4',
      supplier:'Pure Process Co.',
      leadDays:4,
      criticality:'Medium',
      status:'Active',
      assetIds:assetIdsFor('QC', 1),
      lastReceipt:addDays(todayIso(), -3),
      notes:'Used in water and coolant filtration loops.'
    },
    {
      id:'SP-007',
      name:'PLC Battery CR17335',
      category:'Electrical',
      uom:'EA',
      onHand:5,
      minQty:2,
      maxQty:6,
      reorderQty:2,
      unitCost:320,
      location:'MRO-C2',
      supplier:'Control Partners',
      leadDays:6,
      criticality:'Medium',
      status:'Active',
      assetIds:assetIdsFor('LAB1', 1),
      lastReceipt:addDays(todayIso(), -28),
      notes:'Replace during annual PMs on controller racks.'
    },
    {
      id:'SP-008',
      name:'Safety Relay Module',
      category:'Electrical',
      uom:'EA',
      onHand:2,
      minQty:1,
      maxQty:3,
      reorderQty:1,
      unitCost:2450,
      location:'MRO-C5',
      supplier:'Control Partners',
      leadDays:21,
      criticality:'Critical',
      status:'Active',
      assetIds:assetIdsFor('EDGE', 1),
      lastReceipt:addDays(todayIso(), -75),
      notes:'Used for machine guarding and interlock circuits.'
    },
    {
      id:'SP-009',
      name:'Legacy Printer Ribbon',
      category:'Consumable',
      uom:'EA',
      onHand:14,
      minQty:2,
      maxQty:6,
      reorderQty:2,
      unitCost:110,
      location:'MRO-Z9',
      supplier:'Archive Supply',
      leadDays:10,
      criticality:'Low',
      status:'Inactive',
      assetIds:assetIdsFor('OFFICE', 1),
      lastReceipt:addDays(todayIso(), -120),
      notes:'Kept only for legacy label printer support.'
    }
  ];
}
function buildMoveSeeds(parts){
  const byId = Object.fromEntries(parts.map(p => [p.id, p]));
  const rows = [
    {date:addDays(todayIso(), -45), type:'Receipt', partId:'SP-001', qty:24, refType:'PO', refNo:'PO-2405', performedBy:'Stores', note:'Monthly oil replenishment'},
    {date:addDays(todayIso(), -14), type:'Issue', partId:'SP-001', qty:-6, refType:'WO', refNo:'WO-0011', performedBy:'Job', note:'Issued to polishing overhaul'},
    {date:addDays(todayIso(), -18), type:'Receipt', partId:'SP-002', qty:6, refType:'PO', refNo:'PO-2412', performedBy:'Stores', note:'Critical spare top-up'},
    {date:addDays(todayIso(), -6), type:'Issue', partId:'SP-002', qty:-2, refType:'PM', refNo:'PM-003', performedBy:'Somchai', note:'Consumed during monthly PM'},
    {date:addDays(todayIso(), -41), type:'Receipt', partId:'SP-003', qty:3, refType:'PO', refNo:'PO-2381', performedBy:'Stores', note:'Sensor replenishment'},
    {date:addDays(todayIso(), -8), type:'Issue', partId:'SP-003', qty:-2, refType:'WO', refNo:'WO-0014', performedBy:'Wattana', note:'Line sensor replacement'},
    {date:addDays(todayIso(), -12), type:'Receipt', partId:'SP-004', qty:4, refType:'PO', refNo:'PO-2430', performedBy:'Stores', note:'Valve stock received'},
    {date:addDays(todayIso(), -2), type:'Adjustment', partId:'SP-005', qty:-1, refType:'Cycle Count', refNo:'CC-0513', performedBy:'Stores', note:'Damaged kit scrapped'},
    {date:addDays(todayIso(), -3), type:'Receipt', partId:'SP-006', qty:12, refType:'PO', refNo:'PO-2441', performedBy:'Stores', note:'Filter restock'},
    {date:addDays(todayIso(), -1), type:'Cycle Count', partId:'SP-007', qty:0, refType:'Cycle Count', refNo:'CC-0514', performedBy:'Job', note:'Count verified'}
  ];
  return rows.map((row, idx) => ({
    id:'MV-' + String(idx + 1).padStart(4, '0'),
    date:row.date,
    type:row.type,
    partId:row.partId,
    qty:row.qty,
    balance:byId[row.partId] ? byId[row.partId].onHand : 0,
    refType:row.refType,
    refNo:row.refNo,
    performedBy:row.performedBy,
    note:row.note
  }));
}
function storesDirty(){
  try{ return localStorage.getItem(LS_STORES_DIRTY) === '1'; }
  catch(e){ return false; }
}
function clearStoresDirty(){
  try{ localStorage.removeItem(LS_STORES_DIRTY); }
  catch(e){}
}
function loadParts(){
  try{
    const raw = localStorage.getItem(LS_PARTS);
    if(raw){
      const rows = JSON.parse(raw);
      if(Array.isArray(rows)) return rows;
    }
  }catch(e){}
  return buildPartSeeds();
}
function loadMoves(seedParts){
  try{
    const raw = localStorage.getItem(LS_MOVES);
    if(raw){
      const rows = JSON.parse(raw);
      if(Array.isArray(rows)) return rows;
    }
  }catch(e){}
  return buildMoveSeeds(seedParts);
}
let PARTS = loadParts();
let MOVES = loadMoves(PARTS);

function persistStores(){
  try{
    localStorage.setItem(LS_PARTS, JSON.stringify(PARTS));
    localStorage.setItem(LS_MOVES, JSON.stringify(MOVES));
    localStorage.setItem(LS_STORES_DIRTY, '1');
  }catch(e){
    toast('Could not save spare-parts data locally.');
  }
  refreshStoresBadges();
}
function resetStoresToSeed(){
  try{
    localStorage.removeItem(LS_PARTS);
    localStorage.removeItem(LS_MOVES);
    localStorage.removeItem(LS_STORES_DIRTY);
  }catch(e){}
  PARTS = buildPartSeeds();
  MOVES = buildMoveSeeds(PARTS);
  refreshStoresBadges();
  toast('Spare-parts and inventory data reset to the seed set.');
}
function exportStoresSnapshot(){
  const snapshot = {
    exportedAt:new Date().toISOString(),
    parts:PARTS,
    movements:MOVES
  };
  downloadText(JSON.stringify(snapshot, null, 2) + '\n', 'cmms_stores_snapshot.json', 'application/json');
  clearStoresDirty();
  toast('cmms_stores_snapshot.json downloaded.');
  refreshStoresBadges();
  if(current === 'parts') go('parts');
  else if(current === 'inventory') go('inventory');
}

function partById(id){ return PARTS.find(p => p.id === id); }
function partAssetNames(part){
  return (part.assetIds || []).map(id => {
    const asset = ASSETS.find(a => a.id === id);
    return asset ? `${id} - ${asset.name}` : id;
  });
}
function partStockStatus(part){
  if(part.status === 'Inactive') return 'Inactive';
  if(part.onHand <= 0) return 'Out of Stock';
  if(part.onHand < part.minQty) return 'Low Stock';
  if(part.onHand > part.maxQty) return 'Overstock';
  return 'Healthy';
}
function partStatusClass(status){
  return {
    'Healthy':'pill-done',
    'Low Stock':'pill-open',
    'Out of Stock':'pill-hold',
    'Overstock':'pill-med',
    'Inactive':'pill-low'
  }[status] || 'pill-low';
}
function partValue(part){
  return (Number(part.onHand) || 0) * (Number(part.unitCost) || 0);
}
function storesMetrics(){
  const low = PARTS.filter(p => partStockStatus(p) === 'Low Stock').length;
  const out = PARTS.filter(p => partStockStatus(p) === 'Out of Stock').length;
  const active = PARTS.filter(p => p.status !== 'Inactive').length;
  const totalValue = PARTS.reduce((sum, p) => sum + partValue(p), 0);
  return {low, out, active, totalValue};
}
function refreshStoresBadges(){
  const {low, out} = storesMetrics();
  const partBadge = $('#sb-parts');
  const invBadge = $('#sb-inv');
  if(partBadge) partBadge.textContent = low + out;
  if(invBadge) invBadge.textContent = MOVES.length;
}
refreshStoresBadges();

function nextMoveId(){
  let max = 0;
  MOVES.forEach(m => {
    const match = /^MV-(\d+)$/.exec(m.id || '');
    if(match) max = Math.max(max, Number(match[1]));
  });
  return 'MV-' + String(max + 1).padStart(4, '0');
}
function recentMovesForPart(partId){
  return [...MOVES]
    .filter(m => m.partId === partId)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 8);
}
function issuesLast30Days(partId){
  return MOVES
    .filter(m => m.partId === partId && m.type === 'Issue' && daysFromToday(m.date) >= -30)
    .reduce((sum, m) => sum + Math.abs(Number(m.qty) || 0), 0);
}
function formatQty(value, uom){
  return `${Number(value).toLocaleString()} ${uom || ''}`.trim();
}
function inventoryRows(){
  return [...MOVES].sort((a, b) => `${b.date}-${b.id}`.localeCompare(`${a.date}-${a.id}`));
}

/* ============================================================
   SPARE PARTS LIST
   ============================================================ */
function renderParts(){
  const dirty = storesDirty();
  const {low, out, totalValue} = storesMetrics();
  const categories = uniqList(PARTS.map(p => p.category));
  const locations = uniqList(PARTS.map(p => p.location));

  view.innerHTML = `
    <div class="page-head">
      <div><h1>Spare Parts</h1><div class="ph-sub">MRO catalogue, stocking policy, and linked equipment coverage.</div></div>
      <button class="btn btn-primary" onclick="openPartModal('add')">+ Add Part</button>
    </div>
    <div class="databar ${dirty ? '' : 'clean'}">
      ${dirty
        ? `<b>Unsaved changes</b><span>Spare-parts and inventory edits are stored in this browser.</span>`
        : `<b>In sync</b><span>Using the current local stores snapshot.</span>`}
      <span class="spacer"></span>
      <button class="btn btn-ghost btn-sm" onclick="exportStoresSnapshot()">Export snapshot</button>
      ${dirty ? `<button class="btn btn-ghost btn-sm" onclick="confirmResetStores()">Revert</button>` : ''}
    </div>
    <div class="kpis" style="margin-bottom:18px">
      <div class="kpi"><div class="k-top"><div><div class="k-val">${PARTS.length}</div><div class="k-label">Total SKUs</div></div><div class="k-ico ico-steel">SP</div></div></div>
      <div class="kpi"><div class="k-top"><div><div class="k-val" style="color:${low ? 'var(--orange-dark)' : 'inherit'}">${low}</div><div class="k-label">Low Stock</div></div><div class="k-ico ico-orange">LS</div></div></div>
      <div class="kpi"><div class="k-top"><div><div class="k-val" style="color:${out ? 'var(--red)' : 'inherit'}">${out}</div><div class="k-label">Out of Stock</div></div><div class="k-ico ico-red">OS</div></div></div>
      <div class="kpi"><div class="k-top"><div><div class="k-val">${Math.round(totalValue).toLocaleString()}</div><div class="k-label">Inventory Value</div></div><div class="k-ico ico-green">THB</div></div></div>
    </div>
    <div class="toolbar">
      <input class="tb-search" id="pf-q" placeholder="Search by part no., description, supplier..." value="${esc(partFilters.q)}">
      <select id="pf-cat"><option value="">All Categories</option>${categories.map(v => `<option ${partFilters.cat === v ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select>
      <select id="pf-status"><option value="">All Stock Status</option>${PART_STATUSES.map(v => `<option ${partFilters.status === v ? 'selected' : ''}>${v}</option>`).join('')}</select>
      <select id="pf-loc"><option value="">All Bin Locations</option>${locations.map(v => `<option ${partFilters.location === v ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select>
      <span class="tb-count" id="pf-count"></span>
    </div>
    <div class="tbl-wrap"><table>
      <thead><tr>
        <th>Part No.</th><th>Description</th><th>Category</th><th>Bin</th><th>Linked Assets</th>
        <th>On Hand</th><th>Min / Max</th><th>Status</th><th>Value</th><th style="text-align:right">Actions</th>
      </tr></thead>
      <tbody id="part-rows"></tbody>
    </table></div>`;

  const apply = () => {
    partFilters.q = $('#pf-q').value.toLowerCase();
    partFilters.cat = $('#pf-cat').value;
    partFilters.status = $('#pf-status').value;
    partFilters.location = $('#pf-loc').value;
    const rows = PARTS.filter(p => {
      const hay = `${p.id} ${p.name} ${p.supplier} ${p.location}`.toLowerCase();
      return hay.includes(partFilters.q)
        && (!partFilters.cat || p.category === partFilters.cat)
        && (!partFilters.status || partStockStatus(p) === partFilters.status)
        && (!partFilters.location || p.location === partFilters.location);
    });
    $('#part-rows').innerHTML = rows.length ? rows.map(p => {
      const status = partStockStatus(p);
      return `<tr onclick="go('part-detail','${p.id}')">
        <td class="mono">${p.id}</td>
        <td><b>${esc(p.name)}</b><div style="font-size:11.5px;color:var(--ink-soft)">${esc(p.supplier)}</div></td>
        <td>${esc(p.category)}</td>
        <td>${esc(p.location)}</td>
        <td style="color:var(--ink-soft)">${esc((p.assetIds || []).slice(0, 2).join(', ') || '-')}</td>
        <td><b>${formatQty(p.onHand, p.uom)}</b></td>
        <td>${p.minQty} / ${p.maxQty}</td>
        <td><span class="pill ${partStatusClass(status)}">${status}</span></td>
        <td>${Math.round(partValue(p)).toLocaleString()}</td>
        <td style="text-align:right;white-space:nowrap" onclick="event.stopPropagation()">
          <button class="iconbtn" onclick="openStockModal('issue','${p.id}')">Issue</button>
          <button class="iconbtn" onclick="openPartModal('edit','${p.id}')">Edit</button>
        </td>
      </tr>`;
    }).join('') : `<tr><td colspan="10" style="text-align:center;color:var(--ink-soft);padding:30px">No spare parts match the current filters.</td></tr>`;
    $('#pf-count').textContent = `Showing ${rows.length} of ${PARTS.length} parts`;
  };
  ['pf-q','pf-cat','pf-status','pf-loc'].forEach(id => {
    $('#' + id).addEventListener('input', apply);
    $('#' + id).addEventListener('change', apply);
  });
  apply();
}

/* ============================================================
   SPARE PART DETAIL
   ============================================================ */
function renderPartDetail(id){
  const part = partById(id);
  if(!part){ renderParts(); return; }
  const status = partStockStatus(part);
  const recent = recentMovesForPart(id);
  const assetNames = partAssetNames(part);

  view.innerHTML = `
    <div class="back" onclick="go('parts')"><- Back to Spare Parts</div>
    <div class="detail-hero">
      <div style="width:96px;height:96px;border-radius:14px;flex-shrink:0;background:var(--steel-700);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff">
        <div style="font-size:26px">${part.onHand}</div>
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:.5px">${esc(part.uom)}</div>
      </div>
      <div class="dh-main">
        <h1>${esc(part.name)}</h1>
        <div class="dh-meta"><span class="mono">${part.id}</span> · ${esc(part.category)} · ${esc(part.location)} · ${esc(part.supplier)}</div>
        <div class="dh-tags">
          <span class="pill ${partStatusClass(status)}">${status}</span>
          <span class="pill ${critClass(part.criticality)}">${part.criticality}</span>
          <span class="pill pill-low">${part.leadDays} day lead time</span>
        </div>
      </div>
      <div class="dh-actions">
        <button class="btn btn-primary" onclick="openStockModal('receive','${part.id}')">Receive Stock</button>
        <button class="btn btn-ghost" onclick="openStockModal('issue','${part.id}')">Issue Stock</button>
        <button class="btn btn-ghost" onclick="openStockModal('adjust','${part.id}')">Adjust</button>
      </div>
    </div>
    <div class="statgrid">
      <div class="stat"><div class="s-label">On Hand</div><div class="s-val">${formatQty(part.onHand, part.uom)}</div></div>
      <div class="stat"><div class="s-label">Stock Value</div><div class="s-val">${Math.round(partValue(part)).toLocaleString()}</div></div>
      <div class="stat"><div class="s-label">30d Issues</div><div class="s-val">${issuesLast30Days(part.id)}</div></div>
      <div class="stat"><div class="s-label">Min / Max</div><div class="s-val" style="font-size:16px">${part.minQty} / ${part.maxQty}</div></div>
    </div>
    <div class="cols">
      <div>
        <div class="panel" style="margin-bottom:18px">
          <div class="panel-head"><b>Linked Assets</b><span style="font-size:12px;color:var(--ink-soft)">${assetNames.length} linked</span></div>
          <div class="panel-body">
            ${assetNames.length
              ? `<div class="chip-row">${assetNames.map(name => `<span class="chip">${esc(name)}</span>`).join('')}</div>`
              : '<div style="color:var(--ink-soft);font-size:13px">No linked assets yet.</div>'}
          </div>
        </div>
        <div class="panel">
          <div class="panel-head"><b>Recent Inventory Activity</b><a onclick="go('inventory')">Open inventory -></a></div>
          ${recent.length ? recent.map(m => `
            <div class="wo-line">
              <div class="wo-pri" style="background:${m.type === 'Issue' ? 'var(--red)' : (m.type === 'Receipt' ? 'var(--green)' : 'var(--blue)')}"></div>
              <div style="flex:1;min-width:0">
                <b style="font-size:13px;display:block">${m.type} · ${formatQty(m.qty, part.uom)}</b>
                <span style="font-size:11.5px;color:var(--ink-soft)">${fmtDate(m.date)} · ${esc(m.refType)} ${esc(m.refNo || '-')} · ${esc(m.performedBy || '-')}</span>
              </div>
            </div>`).join('')
            : '<div style="padding:22px 17px;color:var(--ink-soft);font-size:13px">No movement history yet.</div>'}
        </div>
      </div>
      <div>
        <div class="panel" style="margin-bottom:18px">
          <div class="panel-head"><b>Stock Policy</b></div>
          <div class="panel-body">
            <div class="kv-list">
              <div><span>Reorder Qty</span><b>${part.reorderQty}</b></div>
              <div><span>Unit Cost</span><b>${Math.round(part.unitCost).toLocaleString()}</b></div>
              <div><span>Last Receipt</span><b>${fmtDate(part.lastReceipt)}</b></div>
              <div><span>Status</span><b>${part.status}</b></div>
            </div>
          </div>
        </div>
        <div class="panel">
          <div class="panel-head"><b>Notes</b></div>
          <div class="panel-body" style="font-size:13px;line-height:1.55">${esc(part.notes) || '<span style="color:var(--ink-soft)">No notes.</span>'}</div>
          <div class="modal-foot" style="background:var(--white);justify-content:space-between">
            <button class="btn btn-ghost" onclick="openPartModal('edit','${part.id}')">Edit Part</button>
            <button class="btn btn-danger" onclick="confirmDeletePart('${part.id}')">Delete Part</button>
          </div>
        </div>
      </div>
    </div>`;
}

/* ============================================================
   INVENTORY VIEW
   ============================================================ */
function renderInventory(){
  const dirty = storesDirty();
  const moves = inventoryRows();
  const reorderRows = PARTS.filter(p => ['Low Stock','Out of Stock'].includes(partStockStatus(p)));
  const receipts30 = moves.filter(m => m.type === 'Receipt' && daysFromToday(m.date) >= -30).length;
  const issues30 = moves.filter(m => m.type === 'Issue' && daysFromToday(m.date) >= -30).length;
  const adjustments30 = moves.filter(m => ['Adjustment','Cycle Count'].includes(m.type) && daysFromToday(m.date) >= -30).length;

  view.innerHTML = `
    <div class="page-head">
      <div><h1>Inventory</h1><div class="ph-sub">Stock movements, replenishment watchlist, and transaction history.</div></div>
      <button class="btn btn-primary" onclick="openInventoryTxnModal()">+ New Transaction</button>
    </div>
    <div class="databar ${dirty ? '' : 'clean'}">
      ${dirty
        ? `<b>Unsaved changes</b><span>Inventory transactions are stored in this browser.</span>`
        : `<b>In sync</b><span>Using the current local stores snapshot.</span>`}
      <span class="spacer"></span>
      <button class="btn btn-ghost btn-sm" onclick="exportStoresSnapshot()">Export snapshot</button>
      ${dirty ? `<button class="btn btn-ghost btn-sm" onclick="confirmResetStores()">Revert</button>` : ''}
    </div>
    <div class="kpis" style="margin-bottom:18px">
      <div class="kpi"><div class="k-top"><div><div class="k-val">${receipts30}</div><div class="k-label">Receipts 30d</div></div><div class="k-ico ico-green">RC</div></div></div>
      <div class="kpi"><div class="k-top"><div><div class="k-val">${issues30}</div><div class="k-label">Issues 30d</div></div><div class="k-ico ico-red">IS</div></div></div>
      <div class="kpi"><div class="k-top"><div><div class="k-val">${adjustments30}</div><div class="k-label">Adjustments 30d</div></div><div class="k-ico ico-blue">AD</div></div></div>
      <div class="kpi"><div class="k-top"><div><div class="k-val" style="color:${reorderRows.length ? 'var(--orange-dark)' : 'inherit'}">${reorderRows.length}</div><div class="k-label">Need Reorder</div></div><div class="k-ico ico-orange">RQ</div></div></div>
    </div>
    <div class="tabs inventory-tabs">
      <div class="tab ${inventoryTab === 'movements' ? 'active' : ''}" data-itab="movements">Movements</div>
      <div class="tab ${inventoryTab === 'reorder' ? 'active' : ''}" data-itab="reorder">Reorder Watch</div>
    </div>
    <div id="inventory-body"></div>`;

  $('#inventory-body').innerHTML = inventoryTab === 'reorder' ? renderReorderWatch() : renderMovementTable();
  view.querySelectorAll('[data-itab]').forEach(tab => {
    tab.addEventListener('click', () => {
      inventoryTab = tab.getAttribute('data-itab');
      renderInventory();
    });
  });
}
function renderMovementTable(){
  const types = uniqList(MOVES.map(m => m.type));
  return `
    <div class="toolbar">
      <input class="tb-search" id="if-q" placeholder="Search by part, ref no., note..." value="${esc(inventoryFilters.q)}">
      <select id="if-type"><option value="">All Movement Types</option>${types.map(v => `<option ${inventoryFilters.type === v ? 'selected' : ''}>${v}</option>`).join('')}</select>
      <span class="tb-count" id="if-count"></span>
    </div>
    <div class="tbl-wrap"><table>
      <thead><tr>
        <th>Date</th><th>Type</th><th>Part</th><th>Qty</th><th>Reference</th><th>By</th><th>Balance</th><th>Note</th>
      </tr></thead>
      <tbody id="inv-rows"></tbody>
    </table></div>`;
}
function bindMovementTable(){
  const apply = () => {
    inventoryFilters.q = $('#if-q').value.toLowerCase();
    inventoryFilters.type = $('#if-type').value;
    const rows = inventoryRows().filter(m => {
      const part = partById(m.partId);
      const hay = `${m.id} ${m.partId} ${part ? part.name : ''} ${m.refNo || ''} ${m.note || ''}`.toLowerCase();
      return hay.includes(inventoryFilters.q)
        && (!inventoryFilters.type || m.type === inventoryFilters.type);
    });
    $('#inv-rows').innerHTML = rows.length ? rows.map(m => {
      const part = partById(m.partId);
      return `<tr onclick="go('part-detail','${m.partId}')">
        <td>${fmtDate(m.date)}</td>
        <td><span class="pill ${m.type === 'Receipt' ? 'pill-done' : (m.type === 'Issue' ? 'pill-hold' : 'pill-med')}">${m.type}</span></td>
        <td><span class="mono">${m.partId}</span> <span style="color:var(--ink-soft)">${esc(part ? part.name : '')}</span></td>
        <td style="${m.qty < 0 ? 'color:var(--red);font-weight:700' : 'color:var(--green);font-weight:700'}">${m.qty > 0 ? '+' : ''}${m.qty}</td>
        <td>${esc(m.refType)} ${esc(m.refNo || '-')}</td>
        <td>${esc(m.performedBy || '-')}</td>
        <td>${m.balance}</td>
        <td style="color:var(--ink-soft)">${esc(m.note || '-')}</td>
      </tr>`;
    }).join('') : `<tr><td colspan="8" style="text-align:center;color:var(--ink-soft);padding:30px">No inventory movements match the current filters.</td></tr>`;
    $('#if-count').textContent = `Showing ${rows.length} of ${MOVES.length} transactions`;
  };
  ['if-q','if-type'].forEach(id => {
    const node = $('#' + id);
    node.addEventListener('input', apply);
    node.addEventListener('change', apply);
  });
  apply();
}
function renderReorderWatch(){
  const rows = PARTS
    .filter(p => ['Low Stock','Out of Stock'].includes(partStockStatus(p)))
    .sort((a, b) => a.onHand - b.onHand);
  return `
    <div class="tbl-wrap"><table>
      <thead><tr>
        <th>Part No.</th><th>Description</th><th>Status</th><th>On Hand</th><th>Min</th><th>Suggested Order</th><th>Lead Time</th><th>Supplier</th><th style="text-align:right">Action</th>
      </tr></thead>
      <tbody>
        ${rows.length ? rows.map(p => {
          const status = partStockStatus(p);
          const suggested = Math.max(p.reorderQty, p.maxQty - p.onHand);
          return `<tr onclick="go('part-detail','${p.id}')">
            <td class="mono">${p.id}</td>
            <td><b>${esc(p.name)}</b></td>
            <td><span class="pill ${partStatusClass(status)}">${status}</span></td>
            <td>${formatQty(p.onHand, p.uom)}</td>
            <td>${p.minQty}</td>
            <td><b>${suggested}</b> ${esc(p.uom)}</td>
            <td>${p.leadDays} days</td>
            <td>${esc(p.supplier)}</td>
            <td style="text-align:right" onclick="event.stopPropagation()"><button class="btn btn-ghost btn-sm" onclick="openStockModal('receive','${p.id}')">Receive</button></td>
          </tr>`;
        }).join('') : `<tr><td colspan="9" style="text-align:center;color:var(--ink-soft);padding:30px">No parts currently need reorder.</td></tr>`}
      </tbody>
    </table></div>`;
}

/* ============================================================
   PART CRUD + STOCK ACTIONS
   ============================================================ */
function openPartModal(mode, id){
  const editing = mode === 'edit';
  const part = editing ? partById(id) : {
    id:'',
    name:'',
    category:'Mechanical',
    uom:'EA',
    onHand:0,
    minQty:1,
    maxQty:5,
    reorderQty:1,
    unitCost:0,
    location:'MRO-A1',
    supplier:'',
    leadDays:7,
    criticality:'Medium',
    status:'Active',
    assetIds:[],
    lastReceipt:'',
    notes:''
  };
  if(editing && !part){ toast('Part not found.'); return; }
  const categories = uniqList([...PARTS.map(p => p.category), 'Mechanical','Electrical','Consumable','Pneumatic','Lubrication']);
  const uoms = ['EA','L','KIT','SET','M','BOX'];
  modalHost.innerHTML = `
    <div class="modal">
      <div class="modal-head"><h3>${editing ? 'Edit Part - ' + part.id : 'Add Spare Part'}</h3><div class="x" onclick="closeModal()">x</div></div>
      <div class="modal-body">
        <div class="form-err" id="form-err"></div>
        <div class="form-grid">
          <div class="field"><label>Part No. <span class="req">*</span></label><input id="sp-id" value="${esc(part.id)}" ${editing ? 'readonly' : ''} placeholder="e.g. SP-010"></div>
          <div class="field"><label>Description <span class="req">*</span></label><input id="sp-name" value="${esc(part.name)}" placeholder="e.g. Bearing 6204-2RS"></div>
          <div class="field"><label>Category</label><select id="sp-category">${categories.map(v => `<option ${part.category === v ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></div>
          <div class="field"><label>UoM</label><select id="sp-uom">${uoms.map(v => `<option ${part.uom === v ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
          <div class="field"><label>On Hand</label><input id="sp-onHand" type="number" min="0" value="${part.onHand}"></div>
          <div class="field"><label>Bin Location</label><input id="sp-location" value="${esc(part.location)}" placeholder="e.g. MRO-B4"></div>
          <div class="field"><label>Min Qty</label><input id="sp-minQty" type="number" min="0" value="${part.minQty}"></div>
          <div class="field"><label>Max Qty</label><input id="sp-maxQty" type="number" min="0" value="${part.maxQty}"></div>
          <div class="field"><label>Reorder Qty</label><input id="sp-reorderQty" type="number" min="0" value="${part.reorderQty}"></div>
          <div class="field"><label>Unit Cost</label><input id="sp-unitCost" type="number" min="0" step="0.01" value="${part.unitCost}"></div>
          <div class="field"><label>Supplier</label><input id="sp-supplier" value="${esc(part.supplier)}"></div>
          <div class="field"><label>Lead Time (days)</label><input id="sp-leadDays" type="number" min="0" value="${part.leadDays}"></div>
          <div class="field"><label>Criticality</label><select id="sp-criticality">${['Critical','High','Medium','Low'].map(v => `<option ${part.criticality === v ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
          <div class="field"><label>Status</label><select id="sp-status">${['Active','Inactive'].map(v => `<option ${part.status === v ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
          <div class="field"><label>Last Receipt</label><input id="sp-lastReceipt" type="date" value="${esc(part.lastReceipt)}"></div>
          <div class="field full"><label>Linked Asset IDs <span style="text-transform:none;font-weight:400;color:var(--ink-soft)">- separate with commas</span></label><input id="sp-assetIds" value="${esc((part.assetIds || []).join(', '))}" placeholder="e.g. SUR-001, SUR-002"></div>
          <div class="field full"><label>Notes</label><textarea id="sp-notes">${esc(part.notes)}</textarea></div>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="savePart('${mode}','${editing ? part.id : ''}')">${editing ? 'Save Changes' : 'Add Part'}</button>
      </div>
    </div>`;
  overlay.classList.add('show');
}
function savePart(mode, origId){
  const g = id => $('#sp-' + id);
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
    category:g('category').value,
    uom:g('uom').value,
    onHand:Math.max(0, parseFloat(g('onHand').value) || 0),
    minQty:Math.max(0, parseFloat(g('minQty').value) || 0),
    maxQty:Math.max(0, parseFloat(g('maxQty').value) || 0),
    reorderQty:Math.max(0, parseFloat(g('reorderQty').value) || 0),
    unitCost:Math.max(0, parseFloat(g('unitCost').value) || 0),
    location:g('location').value.trim(),
    supplier:g('supplier').value.trim(),
    leadDays:Math.max(0, parseInt(g('leadDays').value, 10) || 0),
    criticality:g('criticality').value,
    status:g('status').value,
    assetIds:uniqList((g('assetIds').value || '').split(',').map(v => v.trim())),
    lastReceipt:g('lastReceipt').value,
    notes:g('notes').value.trim()
  };
  if(!rec.id){ g('id').classList.add('bad'); showErr('Part number is required.'); return; }
  if(!/^[A-Za-z0-9\-_]+$/.test(rec.id)){ g('id').classList.add('bad'); showErr('Part number may only contain letters, numbers, hyphens, and underscores.'); return; }
  if(!rec.name){ g('name').classList.add('bad'); showErr('Description is required.'); return; }
  if(rec.maxQty && rec.minQty > rec.maxQty){ showErr('Min quantity cannot be greater than max quantity.'); return; }

  if(mode === 'add'){
    if(PARTS.some(p => p.id.toLowerCase() === rec.id.toLowerCase())){
      g('id').classList.add('bad');
      showErr(`A part with ID "${rec.id}" already exists.`);
      return;
    }
    PARTS.push(rec);
    persistStores();
    closeModal();
    toast(`Part ${rec.id} added.`);
    go('parts');
  }else{
    const idx = PARTS.findIndex(p => p.id === origId);
    if(idx < 0){ showErr('Original part no longer exists.'); return; }
    rec.id = origId;
    PARTS[idx] = rec;
    persistStores();
    closeModal();
    toast(`Part ${origId} updated.`);
    go(current === 'part-detail' ? 'part-detail' : 'parts', origId);
  }
}
function confirmDeletePart(id){
  const part = partById(id);
  if(!part) return;
  const linkedMoves = MOVES.filter(m => m.partId === id).length;
  modalHost.innerHTML = `
    <div class="modal confirm-box">
      <div class="modal-head"><h3>Delete Spare Part</h3><div class="x" onclick="closeModal()">x</div></div>
      <div class="modal-body">
        <p>Delete <b>${part.id} - ${esc(part.name)}</b> from the spare-parts catalogue?</p>
        ${linkedMoves ? `<p style="margin-top:10px;color:var(--ink-soft)">${linkedMoves} movement record(s) will stay in history and reference this deleted part number.</p>` : ''}
      </div>
      <div class="modal-foot">
        <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button class="btn btn-danger" onclick="doDeletePart('${id}')">Delete Part</button>
      </div>
    </div>`;
  overlay.classList.add('show');
}
function doDeletePart(id){
  const idx = PARTS.findIndex(p => p.id === id);
  if(idx >= 0) PARTS.splice(idx, 1);
  persistStores();
  closeModal();
  toast(`Part ${id} deleted.`);
  go('parts');
}

function openStockModal(action, partId){
  const part = partById(partId);
  if(!part){ toast('Part not found.'); return; }
  const isAdjust = action === 'adjust';
  modalHost.innerHTML = `
    <div class="modal">
      <div class="modal-head"><h3>${action === 'receive' ? 'Receive Stock' : action === 'issue' ? 'Issue Stock' : 'Adjust Stock'} - ${part.id}</h3><div class="x" onclick="closeModal()">x</div></div>
      <div class="modal-body">
        <div class="form-err" id="form-err"></div>
        <div class="notebox" style="margin:0 0 14px 0"><b>Current on hand:</b> ${formatQty(part.onHand, part.uom)}</div>
        <div class="form-grid">
          <div class="field"><label>Part</label><input value="${esc(part.id + ' - ' + part.name)}" readonly></div>
          <div class="field"><label>Date</label><input id="tx-date" type="date" value="${todayIso()}"></div>
          ${isAdjust
            ? `<div class="field"><label>New On Hand Qty</label><input id="tx-qty" type="number" min="0" value="${part.onHand}"></div>`
            : `<div class="field"><label>Quantity</label><input id="tx-qty" type="number" min="0" step="1" value=""></div>`}
          <div class="field"><label>Reference Type</label><select id="tx-refType">${REF_TYPES.map(v => `<option ${((action === 'issue' && v === 'WO') || (action === 'receive' && v === 'PO') || (action === 'adjust' && v === 'Manual')) ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
          <div class="field"><label>Reference No.</label><input id="tx-refNo" placeholder="e.g. WO-0016 or PO-2450"></div>
          <div class="field"><label>Performed By</label><input id="tx-user" value="${esc(SETTINGS.currentUser)}"></div>
          <div class="field ${action === 'receive' ? '' : 'full'}"><label>${action === 'receive' ? 'New Unit Cost (optional)' : 'Notes'}</label>${action === 'receive'
            ? `<input id="tx-cost" type="number" min="0" step="0.01" placeholder="${part.unitCost}">`
            : `<textarea id="tx-note"></textarea>`}</div>
          ${action === 'receive' ? `<div class="field full"><label>Notes</label><textarea id="tx-note"></textarea></div>` : ''}
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="saveStockTxn('${action}','${part.id}')">Save Transaction</button>
      </div>
    </div>`;
  overlay.classList.add('show');
}
function openInventoryTxnModal(){
  const partOptions = [...PARTS]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(p => `<option value="${p.id}">${p.id} - ${esc(p.name)}</option>`).join('');
  modalHost.innerHTML = `
    <div class="modal">
      <div class="modal-head"><h3>Inventory Transaction</h3><div class="x" onclick="closeModal()">x</div></div>
      <div class="modal-body">
        <div class="form-grid">
          <div class="field"><label>Action</label><select id="bulk-action">${['receive','issue','adjust'].map(v => `<option>${v}</option>`).join('')}</select></div>
          <div class="field"><label>Part</label><select id="bulk-partId">${partOptions}</select></div>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="closeModal();openStockModal($('#bulk-action').value,$('#bulk-partId').value)">Continue</button>
      </div>
    </div>`;
  overlay.classList.add('show');
}
function saveStockTxn(action, partId){
  const part = partById(partId);
  if(!part) return;
  const errBox = $('#form-err');
  const showErr = msg => {
    errBox.textContent = msg;
    errBox.classList.add('show');
  };
  errBox.classList.remove('show');
  const rawQty = parseFloat($('#tx-qty').value);
  const refType = $('#tx-refType').value;
  const refNo = $('#tx-refNo').value.trim();
  const performedBy = $('#tx-user').value.trim();
  const note = ($('#tx-note') && $('#tx-note').value.trim()) || '';
  const date = $('#tx-date').value || todayIso();
  let qty = 0;
  let movementType = 'Adjustment';
  let newBalance = part.onHand;

  if(action === 'receive'){
    if(!(rawQty > 0)){ showErr('Receipt quantity must be greater than zero.'); return; }
    qty = rawQty;
    movementType = 'Receipt';
    newBalance = part.onHand + rawQty;
    const newCost = parseFloat(($('#tx-cost').value || '').trim());
    if(!isNaN(newCost) && newCost > 0) part.unitCost = newCost;
    part.lastReceipt = date;
  }else if(action === 'issue'){
    if(!(rawQty > 0)){ showErr('Issue quantity must be greater than zero.'); return; }
    if(rawQty > part.onHand){ showErr('Issue quantity cannot exceed current on-hand stock.'); return; }
    qty = -rawQty;
    movementType = 'Issue';
    newBalance = part.onHand - rawQty;
  }else{
    if(isNaN(rawQty) || rawQty < 0){ showErr('Adjusted on-hand quantity must be zero or greater.'); return; }
    qty = rawQty - part.onHand;
    movementType = refType === 'Cycle Count' ? 'Cycle Count' : 'Adjustment';
    newBalance = rawQty;
  }

  part.onHand = newBalance;
  MOVES.push({
    id:nextMoveId(),
    date,
    type:movementType,
    partId,
    qty,
    balance:newBalance,
    refType,
    refNo,
    performedBy:performedBy || SETTINGS.currentUser,
    note
  });
  persistStores();
  closeModal();
  toast(`${movementType} saved for ${partId}.`);
  if(current === 'inventory'){
    renderInventory();
    if(inventoryTab === 'movements') bindMovementTable();
  }else{
    go('part-detail', partId);
  }
}

function confirmResetStores(){
  modalHost.innerHTML = `
    <div class="modal confirm-box">
      <div class="modal-head"><h3>Revert Stores Data</h3><div class="x" onclick="closeModal()">x</div></div>
      <div class="modal-body">
        <p>Discard all local spare-parts and inventory changes and reload the seed data set?</p>
        <p style="margin-top:10px;color:var(--ink-soft)">Anything you have not exported will be lost.</p>
      </div>
      <div class="modal-foot">
        <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button class="btn btn-danger" onclick="closeModal();resetStoresToSeed();go('parts')">Revert to seed</button>
      </div>
    </div>`;
  overlay.classList.add('show');
}

/* ============================================================
   ROUTES
   ============================================================ */
const _renderInventoryBase = renderInventory;
renderInventory = function(){
  _renderInventoryBase();
  if(inventoryTab === 'movements') bindMovementTable();
};

ROUTES['parts'] = renderParts;
ROUTES['part-detail'] = renderPartDetail;
ROUTES['inventory'] = renderInventory;
