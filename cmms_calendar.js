/* ============================================================
   CMMS - MODULE: MAINTENANCE CALENDAR
   Unified calendar across PM, work orders, requests, and breakdowns.
   ============================================================ */
let calendarState = {
  month: todayIso().slice(0, 7),
  selected: todayIso(),
  filters: {
    pm: true,
    wo: true,
    request: true,
    breakdown: true
  }
};

function calendarDateFromDate(value){
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}
function calendarDayLabel(iso){
  const value = new Date(`${iso}T00:00:00`);
  return isNaN(value) ? iso : value.toLocaleDateString('en-GB', {weekday:'long', day:'2-digit', month:'short', year:'numeric'});
}
function calendarTimeLabel(raw){
  if(!raw || !String(raw).includes('T')) return '';
  const value = new Date(raw);
  return isNaN(value) ? String(raw).split('T')[1].slice(0, 5) : value.toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'});
}
function calendarMarkerColor(type){
  return {
    pm: 'var(--green)',
    wo: 'var(--blue)',
    request: 'var(--orange)',
    breakdown: 'var(--red)'
  }[type] || 'var(--steel-700)';
}
function calendarChipClass(event){
  if(event.type === 'pm'){
    return event.status === 'Overdue' ? 'overdue' : event.status === 'Due Soon' ? 'due' : 'ok';
  }
  if(event.type === 'wo') return 'wo';
  if(event.type === 'request') return 'req';
  if(event.type === 'breakdown') return 'bd';
  return 'ok';
}
function calendarTypeLabel(type){
  return {
    pm: 'PM',
    wo: 'Work Order',
    request: 'Request',
    breakdown: 'Breakdown'
  }[type] || type;
}
function calendarEventStatus(event){
  return event.status ? ` | ${event.status}` : '';
}
function calendarMonthLabel(monthIso){
  const [year, month] = monthIso.split('-').map(Number);
  const value = new Date(year, month - 1, 1);
  return value.toLocaleDateString('en-GB', {month:'long', year:'numeric'});
}
function calendarShiftMonth(delta){
  let [year, month] = calendarState.month.split('-').map(Number);
  month += delta;
  if(month < 1){ month = 12; year -= 1; }
  if(month > 12){ month = 1; year += 1; }
  calendarState.month = `${year}-${String(month).padStart(2, '0')}`;
  const firstDay = `${calendarState.month}-01`;
  const lastDay = new Date(year, month, 0);
  const lastIso = calendarDateFromDate(lastDay);
  if(calendarState.selected < firstDay || calendarState.selected > lastIso){
    calendarState.selected = firstDay;
  }
  renderMaintenanceCalendar();
}
function calendarToggleFilter(type){
  calendarState.filters[type] = !calendarState.filters[type];
  renderMaintenanceCalendar();
}
function calendarSelectDate(iso){
  if(String(iso || '').slice(0, 7) !== calendarState.month){
    calendarState.month = String(iso || '').slice(0, 7) || calendarState.month;
  }
  calendarState.selected = iso;
  renderMaintenanceCalendar();
}
function calendarOpenEvent(route, refId){
  if(route) go(route, refId);
}
function calendarBuildEvents(){
  const events = [];

  (Array.isArray(PMS) ? PMS : []).forEach(p => {
    if(!p.active || !p.nextDue) return;
    events.push({
      type: 'pm',
      date: p.nextDue,
      rawDate: p.nextDue,
      refId: p.id,
      route: 'pm-detail',
      code: p.id,
      title: p.title,
      subtitle: `${pmAssetName(p.assetId)} | ${p.frequency}`,
      status: typeof pmStatus === 'function' ? pmStatus(p) : 'Scheduled',
      sortRank: 1
    });
  });

  WOS.filter(w => w.status !== 'Completed' && w.due).forEach(w => {
    events.push({
      type: 'wo',
      date: w.due,
      rawDate: w.due,
      refId: w.id,
      route: 'wo-detail',
      code: w.id,
      title: w.title,
      subtitle: `${woAssetName(w.assetId)} | ${w.priority}${w.technician ? ` | ${w.technician}` : ''}`,
      status: w.status,
      sortRank: 2
    });
  });

  (typeof REQUESTS !== 'undefined' ? REQUESTS : [])
    .filter(req => !['Converted','Rejected','Completed'].includes(req.status) && req.due)
    .forEach(req => {
      events.push({
        type: 'request',
        date: req.due,
        rawDate: req.due,
        refId: req.id,
        route: 'request-detail',
        code: req.id,
        title: req.title,
        subtitle: `${requestTargetName(req)} | ${req.requester}`,
        status: req.status,
        sortRank: 3
      });
    });

  (typeof BREAKDOWNS !== 'undefined' ? BREAKDOWNS : [])
    .filter(row => row.status !== 'Closed' && row.startedAt)
    .forEach(row => {
      const date = String(row.startedAt).slice(0, 10);
      events.push({
        type: 'breakdown',
        date,
        rawDate: row.startedAt,
        refId: row.id,
        route: 'breakdown-detail',
        code: row.id,
        title: row.title,
        subtitle: `${breakdownTargetName(row)}${calendarTimeLabel(row.startedAt) ? ` | ${calendarTimeLabel(row.startedAt)}` : ''}`,
        status: row.status,
        sortRank: 0
      });
    });

  return events
    .filter(event => calendarState.filters[event.type])
    .sort((a, b) => {
      if(a.date !== b.date) return a.date.localeCompare(b.date);
      if(a.sortRank !== b.sortRank) return a.sortRank - b.sortRank;
      return String(a.code).localeCompare(String(b.code));
    });
}
function calendarCounts(events){
  return {
    total: events.length,
    pm: events.filter(event => event.type === 'pm').length,
    wo: events.filter(event => event.type === 'wo').length,
    request: events.filter(event => event.type === 'request').length,
    breakdown: events.filter(event => event.type === 'breakdown').length
  };
}
function renderMaintenanceCalendarGrid(events){
  const [year, month] = calendarState.month.split('-').map(Number);
  const first = new Date(year, month - 1, 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const prevMonthDays = new Date(year, month - 1, 0).getDate();
  const eventMap = {};
  events.forEach(event => {
    (eventMap[event.date] = eventMap[event.date] || []).push(event);
  });

  const dows = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(day => `<div class="cal-dow">${day}</div>`).join('');
  let cells = '';

  for(let i = 0; i < 42; i++){
    let dayNum;
    let iso = '';
    let cls = 'cal-day';
    if(i < startDow){
      dayNum = prevMonthDays - startDow + 1 + i;
      const date = new Date(year, month - 2, dayNum);
      iso = calendarDateFromDate(date);
      cls += ' other';
    }else if(i < startDow + daysInMonth){
      dayNum = i - startDow + 1;
      iso = `${calendarState.month}-${String(dayNum).padStart(2, '0')}`;
      if(iso === todayIso()) cls += ' today';
    }else{
      dayNum = i - startDow - daysInMonth + 1;
      const date = new Date(year, month, dayNum);
      iso = calendarDateFromDate(date);
      cls += ' other';
    }
    if(iso === calendarState.selected) cls += ' selected';

    const dayEvents = eventMap[iso] || [];
    const visible = dayEvents.slice(0, 3).map(event => `
      <span class="cal-chip ${calendarChipClass(event)}" title="${esc(`${event.code} - ${event.title}`)}" onclick="event.stopPropagation();calendarOpenEvent('${esc(event.route)}','${esc(event.refId)}')">
        ${esc(event.code)} | ${esc(event.title)}
      </span>`).join('');
    const more = dayEvents.length > 3 ? `<span class="cal-chip more">+${dayEvents.length - 3} more</span>` : '';

    cells += `
      <div class="${cls}" onclick="calendarSelectDate('${iso}')">
        <div class="d-num">${dayNum}</div>
        ${visible || ''}
        ${more}
      </div>`;
  }

  return `
    <div class="panel">
      <div class="panel-head">
        <b>${calendarMonthLabel(calendarState.month)}</b>
        <div class="pm-cal-head" style="margin-bottom:0">
          <button class="pm-cal-nav" onclick="calendarShiftMonth(-1)"><</button>
          <button class="pm-cal-nav" onclick="calendarShiftMonth(1)">></button>
        </div>
      </div>
      <div class="panel-body">
        <div class="calendar-filter-row">
          <button class="calendar-filter ${calendarState.filters.pm ? 'active' : ''}" onclick="calendarToggleFilter('pm')">PM Due</button>
          <button class="calendar-filter ${calendarState.filters.wo ? 'active' : ''}" onclick="calendarToggleFilter('wo')">WO Due</button>
          <button class="calendar-filter ${calendarState.filters.request ? 'active' : ''}" onclick="calendarToggleFilter('request')">Requests</button>
          <button class="calendar-filter ${calendarState.filters.breakdown ? 'active' : ''}" onclick="calendarToggleFilter('breakdown')">Breakdowns</button>
        </div>
        <div class="calendar-legend">
          <span class="chip" style="background:#e3f3e9;color:var(--green)">PM Schedule</span>
          <span class="chip" style="background:#e4eef7;color:var(--blue)">Work Order</span>
          <span class="chip" style="background:#fff1e2;color:var(--orange-dark)">Service Request</span>
          <span class="chip" style="background:#fbe3e2;color:var(--red)">Breakdown</span>
        </div>
        <div class="pm-cal" style="margin-top:14px">${dows}${cells}</div>
      </div>
    </div>`;
}
function renderMaintenanceAgenda(events){
  const dayEvents = events.filter(event => event.date === calendarState.selected);
  const counts = calendarCounts(events);
  const selectedLabel = calendarDayLabel(calendarState.selected);

  return `
    <div class="calendar-side">
      <div class="report-mini-grid calendar-mini-stats">
        <div class="report-mini-card"><span>Visible Events</span><b>${counts.total}</b></div>
        <div class="report-mini-card"><span>PM Due</span><b>${counts.pm}</b></div>
        <div class="report-mini-card"><span>WO Due</span><b>${counts.wo}</b></div>
        <div class="report-mini-card"><span>Requests / Breakdowns</span><b>${counts.request + counts.breakdown}</b></div>
      </div>
      <div class="panel">
        <div class="panel-head"><b>Agenda - ${selectedLabel}</b><span style="font-size:12px;color:var(--ink-soft)">${dayEvents.length} event(s)</span></div>
        ${dayEvents.length ? `<div class="calendar-agenda">
        ${dayEvents.map(event => `
            <div class="calendar-agenda-item" onclick="calendarOpenEvent('${esc(event.route)}','${esc(event.refId)}')">
              <div class="calendar-agenda-marker" style="background:${calendarMarkerColor(event.type)}"></div>
              <div class="calendar-agenda-main">
                <b>${esc(event.code)} | ${esc(event.title)}</b>
                <span>${esc(calendarTypeLabel(event.type))}${esc(calendarEventStatus(event))}</span>
                <span>${esc(event.subtitle || '')}</span>
              </div>
            </div>`).join('')}
        </div>` : `<div class="calendar-empty">No visible maintenance activity on this date. Select another day or change the filters to review more events.</div>`}
      </div>
      <div class="panel">
        <div class="panel-head"><b>How To Use</b></div>
        <div class="panel-body">
          <p class="calendar-note">Use this calendar to coordinate planned PM work, due work orders, pending requests, and active breakdowns in one place. Click any event to open the full record and update it in its home module.</p>
        </div>
      </div>
    </div>`;
}
function renderMaintenanceCalendar(){
  const events = calendarBuildEvents();
  const monthStart = `${calendarState.month}-01`;
  if(calendarState.selected.slice(0, 7) !== calendarState.month) calendarState.selected = monthStart;

  view.innerHTML = `
    <div class="page-head">
      <div><h1>Maintenance Calendar</h1><div class="ph-sub">Shared month view of preventive work, due work orders, pending requests, and active breakdowns.</div></div>
    </div>
    <div class="calendar-layout">
      ${renderMaintenanceCalendarGrid(events)}
      ${renderMaintenanceAgenda(events)}
    </div>`;
  bindNav();
}

ROUTES['calendar'] = renderMaintenanceCalendar;
