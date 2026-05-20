let currentWeekStart = getMonday(new Date());
let newBookingSource = 'phone';

function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function init() {
  MotorLab.seedDemoData();
  renderWeek();
  renderStats();
  setupNewBookingDefaults();
  loadSettingsForm();
}

function switchTab(name) {
  ['calendar', 'list', 'settings'].forEach(t => {
    document.getElementById('view-' + t).classList.add('hidden');
    document.getElementById('tab-' + t).classList.remove('active');
  });
  document.getElementById('view-' + name).classList.remove('hidden');
  document.getElementById('tab-' + name).classList.add('active');
  if (name === 'list') renderList();
  if (name === 'calendar') { renderWeek(); renderStats(); }
  if (name === 'settings') loadSettingsForm();
}

function changeWeek(delta) {
  currentWeekStart.setDate(currentWeekStart.getDate() + delta * 7);
  renderWeek();
  renderStats();
}

function goToday() {
  currentWeekStart = getMonday(new Date());
  renderWeek();
  renderStats();
}

function renderWeek() {
  const months = ['Sausio', 'Vasario', 'Kovo', 'Balandžio', 'Gegužės', 'Birželio', 'Liepos', 'Rugpjūčio', 'Rugsėjo', 'Spalio', 'Lapkričio', 'Gruodžio'];
  const end = new Date(currentWeekStart);
  end.setDate(end.getDate() + 6);

  document.getElementById('week-label').textContent =
    `${currentWeekStart.getDate()} ${months[currentWeekStart.getMonth()]} – ${end.getDate()} ${months[end.getMonth()]} ${end.getFullYear()}`;

  const grid = document.getElementById('week-grid');
  grid.innerHTML = '';

  const dayNames = ['PIRMADIENIS', 'ANTRADIENIS', 'TREČIADIENIS', 'KETVIRTADIENIS', 'PENKTADIENIS', 'ŠEŠTADIENIS', 'SEKMADIENIS'];
  const today = MotorLab.formatDate(new Date());

  for (let i = 0; i < 7; i++) {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + i);
    const dateStr = MotorLab.formatDate(d);
    const isToday = dateStr === today;
    const bookings = MotorLab.getBookingsForDate(dateStr);
    const used = MotorLab.getDayMinutesUsed(dateStr);
    const cap = MotorLab.getDayCapacity();
    const pct = Math.min(100, Math.round(used / cap * 100));
    const isWeekend = !MotorLab.isWorkDay(d);

    const col = document.createElement('div');
    col.className = `day-cell border-r border-smoke last:border-r-0 ${isToday ? 'today bg-flame/5' : ''} ${isWeekend ? 'opacity-50' : ''}`;
    col.style.minHeight = '420px';

    col.innerHTML = `
      <div class="p-3 border-b border-smoke">
        <div class="text-[10px] text-chrome mono">${dayNames[i].substring(0,2)}</div>
        <div class="flex items-baseline justify-between">
          <div class="display text-2xl ${isToday ? 'text-flame' : ''}">${d.getDate()}</div>
          <div class="text-xs text-chrome">${bookings.length} rez.</div>
        </div>
        ${!isWeekend ? `
          <div class="mt-2">
            <div class="flex justify-between text-[10px] mono text-chrome mb-1">
              <span>${pct}%</span>
              <span>${used}/${cap}m</span>
            </div>
            <div class="h-1 bg-smoke rounded-full overflow-hidden">
              <div class="capacity-bar h-full ${pct > 85 ? 'bg-amber' : 'bg-flame'}" style="width:${pct}%"></div>
            </div>
          </div>
        ` : '<div class="text-[10px] text-chrome mono mt-2">SAVAITGALIS</div>'}
      </div>
      <div class="p-2 space-y-1" id="day-events-${dateStr}"></div>
      ${!isWeekend && !MotorLab.isPast(d) ? `
        <button onclick="openNewBookingForDate('${dateStr}')" class="m-2 w-[calc(100%-1rem)] py-2 border border-dashed border-smoke rounded text-xs text-chrome hover:border-flame hover:text-flame transition flex items-center justify-center gap-1">
          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"></path></svg>
          Pridėti
        </button>
      ` : ''}
    `;
    grid.appendChild(col);

    const evContainer = col.querySelector(`#day-events-${dateStr}`);
    bookings.forEach(b => {
      const svc = MotorLab.SERVICES[b.serviceKey];
      const sourceColors = { online: '#85B7EB', phone: '#5DCAA5', 'walk-in': '#FAC775' };
      const color = sourceColors[b.source] || '#888780';
      const ev = document.createElement('div');
      ev.className = 'event-bar rounded p-2 text-xs';
      ev.style.background = color + '20';
      ev.style.borderLeft = `3px solid ${color}`;
      ev.onclick = () => showDetail(b.id);
      ev.innerHTML = `
        <div class="font-medium text-bone mono" style="color:${color}">${b.time}</div>
        <div class="font-medium truncate">${b.customerName}</div>
        <div class="text-[10px] text-chrome truncate">${svc ? svc.name : '?'}</div>
      `;
      evContainer.appendChild(ev);
    });
  }
}

function renderStats() {
  const today = MotorLab.formatDate(new Date());
  const todayBookings = MotorLab.getBookingsForDate(today);
  const used = MotorLab.getDayMinutesUsed(today);
  const cap = MotorLab.getDayCapacity();
  const pct = Math.round(used / cap * 100);

  document.getElementById('stat-today').textContent = todayBookings.length;
  document.getElementById('stat-load').textContent = pct + '%';
  document.getElementById('stat-load-min').textContent = `${used} / ${cap} min`;

  const weekBookings = Object.values(MotorLab.getBookingsForWeek(currentWeekStart)).flat();
  document.getElementById('stat-week').textContent = weekBookings.length;

  document.getElementById('stat-online').textContent = todayBookings.filter(b => b.source === 'online').length;
  document.getElementById('stat-phone').textContent = todayBookings.filter(b => b.source === 'phone').length;
  document.getElementById('stat-walk').textContent = todayBookings.filter(b => b.source === 'walk-in').length;
}

function renderList() {
  const search = (document.getElementById('search')?.value || '').toLowerCase();
  const filter = document.getElementById('filter-status')?.value || 'all';
  const all = MotorLab.loadBookings()
    .filter(b => {
      if (filter !== 'all' && b.status !== filter) return false;
      if (search) {
        const txt = [b.customerName, b.customerPhone, b.carMake].join(' ').toLowerCase();
        if (!txt.includes(search)) return false;
      }
      return true;
    })
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

  const list = document.getElementById('bookings-list');
  list.innerHTML = '';

  if (all.length === 0) {
    list.innerHTML = '<div class="text-center py-12 text-chrome">Rezervacijų nėra</div>';
    return;
  }

  all.forEach(b => {
    const svc = MotorLab.SERVICES[b.serviceKey];
    const sourceColors = { online: '#85B7EB', phone: '#5DCAA5', 'walk-in': '#FAC775' };
    const sourceNames = { online: 'Online', phone: 'Telefonu', 'walk-in': 'Atvyko' };
    const color = sourceColors[b.source] || '#888780';

    const card = document.createElement('div');
    card.className = 'booking-card bg-ash rounded-xl p-4 cursor-pointer';
    card.style.borderLeftColor = color;
    card.onclick = () => showDetail(b.id);
    card.innerHTML = `
      <div class="grid md:grid-cols-12 gap-4 items-center">
        <div class="md:col-span-2">
          <div class="display text-xl">${b.date.split('-').slice(1).reverse().join('.')}</div>
          <div class="text-flame mono text-sm">${b.time}</div>
        </div>
        <div class="md:col-span-3">
          <div class="font-medium">${b.customerName}</div>
          <div class="text-xs text-chrome">${b.customerPhone}</div>
        </div>
        <div class="md:col-span-3">
          <div class="text-sm">${svc ? svc.name : '?'}</div>
          <div class="text-xs text-chrome">${svc ? svc.duration + ' min' : ''}</div>
        </div>
        <div class="md:col-span-2 text-sm">
          ${b.carMake || '—'} ${b.carYear || ''}
        </div>
        <div class="md:col-span-2 flex items-center justify-end gap-2">
          <span class="text-[10px] px-2 py-1 rounded mono" style="background:${color}20;color:${color}">${sourceNames[b.source]}</span>
          ${b.status === 'cancelled' ? '<span class="text-[10px] px-2 py-1 rounded bg-red-500/20 text-red-400">ATŠAUKTA</span>' : ''}
        </div>
      </div>
    `;
    list.appendChild(card);
  });
}

function showDetail(id) {
  const booking = MotorLab.loadBookings().find(b => b.id === id);
  if (!booking) return;
  const svc = MotorLab.SERVICES[booking.serviceKey];
  const sourceNames = { online: 'Online forma', phone: 'Telefono skambutis', 'walk-in': 'Atvyko tiesiogiai' };

  document.getElementById('detail-content').innerHTML = `
    <div class="flex items-start justify-between mb-4">
      <div>
        <div class="text-xs text-chrome mono">${booking.id}</div>
        <div class="display text-2xl mt-1">${booking.customerName}</div>
      </div>
      <button onclick="closeDetail()" class="w-9 h-9 rounded-lg border border-smoke hover:border-flame hover:text-flame flex items-center justify-center">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
      </button>
    </div>

    <div class="space-y-3 mb-6">
      <div class="grid grid-cols-2 gap-2 text-sm">
        <div class="text-chrome">Data:</div><div>${booking.date}</div>
        <div class="text-chrome">Laikas:</div><div class="text-flame mono">${booking.time}</div>
        <div class="text-chrome">Paslauga:</div><div>${svc ? svc.name : '?'}</div>
        <div class="text-chrome">Trukmė:</div><div>${svc ? svc.duration + ' min' : '?'}</div>
        <div class="text-chrome">Telefonas:</div><div><a href="tel:${booking.customerPhone}" class="text-flame">${booking.customerPhone}</a></div>
        ${booking.customerEmail ? `<div class="text-chrome">El. paštas:</div><div>${booking.customerEmail}</div>` : ''}
        ${booking.carMake ? `<div class="text-chrome">Automobilis:</div><div>${booking.carMake} ${booking.carYear || ''}</div>` : ''}
        <div class="text-chrome">Šaltinis:</div><div>${sourceNames[booking.source]}</div>
        <div class="text-chrome">Statusas:</div><div class="${booking.status === 'cancelled' ? 'text-red-400' : 'text-green-400'}">${booking.status === 'cancelled' ? 'Atšaukta' : 'Patvirtinta'}</div>
      </div>

      ${booking.notes ? `
        <div class="border-t border-smoke pt-3">
          <div class="text-xs text-chrome mono mb-1">PASTABOS</div>
          <div class="text-sm">${booking.notes}</div>
        </div>
      ` : ''}
    </div>

    <div class="flex gap-2">
      ${booking.status !== 'cancelled' ? `
        <button onclick="cancelBookingAction('${booking.id}')" class="btn-outline text-amber hover:text-amber px-4 py-2 rounded-lg text-sm flex-1">Atšaukti</button>
      ` : ''}
      <button onclick="deleteBookingAction('${booking.id}')" class="btn-outline text-red-400 hover:text-red-400 px-4 py-2 rounded-lg text-sm flex-1">Ištrinti</button>
    </div>
  `;
  document.getElementById('detailModal').classList.remove('hidden');
  document.getElementById('detailModal').classList.add('flex');
}

function closeDetail() {
  document.getElementById('detailModal').classList.add('hidden');
  document.getElementById('detailModal').classList.remove('flex');
}

function cancelBookingAction(id) {
  if (!confirm('Atšaukti šią rezervaciją?')) return;
  MotorLab.cancelBooking(id);
  closeDetail();
  renderWeek();
  renderStats();
  renderList();
  showToast('Rezervacija atšaukta', 'info');
}

function deleteBookingAction(id) {
  if (!confirm('Ištrinti rezervaciją negrįžtamai?')) return;
  MotorLab.deleteBooking(id);
  closeDetail();
  renderWeek();
  renderStats();
  renderList();
  showToast('Rezervacija ištrinta', 'info');
}

function setupNewBookingDefaults() {
  const sel = document.getElementById('nb-service');
  sel.innerHTML = '';
  Object.entries(MotorLab.SERVICES).forEach(([key, svc]) => {
    sel.innerHTML += `<option value="${key}">${svc.name} (${svc.duration} min · ${svc.price})</option>`;
  });
  const today = new Date();
  document.getElementById('nb-date').value = MotorLab.formatDate(today);
  document.getElementById('nb-time').value = '10:00';
}

function openNewBooking() {
  document.getElementById('newBookingModal').classList.remove('hidden');
  document.getElementById('newBookingModal').classList.add('flex');
  setupNewBookingDefaults();
  newBookingSource = 'phone';
  updateSourceButtons();
  ['nb-name', 'nb-phone', 'nb-car', 'nb-year', 'nb-notes'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('capacity-warn').classList.add('hidden');
  setTimeout(() => document.getElementById('nb-name').focus(), 100);
}

function openNewBookingForDate(dateStr) {
  openNewBooking();
  document.getElementById('nb-date').value = dateStr;
  checkCapacityNB();
}

function closeNewBooking() {
  document.getElementById('newBookingModal').classList.add('hidden');
  document.getElementById('newBookingModal').classList.remove('flex');
}

function setSource(src) {
  newBookingSource = src;
  updateSourceButtons();
}

function updateSourceButtons() {
  ['online', 'phone', 'walkin'].forEach(s => {
    const btn = document.getElementById('src-' + s);
    const mapKey = s === 'walkin' ? 'walk-in' : s;
    if (newBookingSource === mapKey) {
      btn.className = 'src-btn flex-1 px-3 py-2.5 rounded-lg text-sm border border-flame bg-flame/10 text-flame';
    } else {
      btn.className = 'src-btn flex-1 px-3 py-2.5 rounded-lg text-sm border border-smoke';
    }
  });
}

function checkCapacityNB() {
  const date = document.getElementById('nb-date').value;
  const svcKey = document.getElementById('nb-service').value;
  if (!date || !svcKey) return;

  const fit = MotorLab.canFitService(date, svcKey);
  const used = MotorLab.getDayMinutesUsed(date);
  const cap = MotorLab.getDayCapacity();
  const pct = Math.round(used / cap * 100);
  const svc = MotorLab.SERVICES[svcKey];

  const warn = document.getElementById('capacity-warn');
  warn.classList.remove('hidden');

  if (!fit.ok) {
    warn.innerHTML = `
      <div class="border border-red-500/40 bg-red-500/10 rounded-lg p-3 text-sm">
        <div class="text-red-400 font-medium flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          Pastaba: ${fit.reason}
        </div>
        <div class="text-xs text-chrome mt-2">Vis tiek galite įrašyti — admin įrašai ne ribojami sistemos.</div>
      </div>`;
  } else {
    warn.innerHTML = `
      <div class="border border-smoke bg-ink rounded-lg p-3 text-xs">
        <div class="flex justify-between mb-1">
          <span class="text-chrome mono">DIENOS APKROVA PO ŠIO ĮRAŠO:</span>
          <span class="${(used + svc.duration + 15) / cap > 0.85 ? 'text-amber' : 'text-flame'}">${Math.round((used + svc.duration + 15) / cap * 100)}%</span>
        </div>
        <div class="h-1.5 bg-smoke rounded-full overflow-hidden">
          <div class="h-full bg-flame" style="width:${pct}%"></div>
          <div class="h-full bg-flame/50 -mt-1.5" style="width:${Math.min(100, Math.round((used + svc.duration + 15) / cap * 100))}%"></div>
        </div>
      </div>`;
  }
}

function saveNewBooking() {
  const name = document.getElementById('nb-name').value.trim();
  const phone = document.getElementById('nb-phone').value.trim();
  const date = document.getElementById('nb-date').value;
  const time = document.getElementById('nb-time').value;
  const svcKey = document.getElementById('nb-service').value;

  if (!name || !phone || !date || !time) {
    showToast('Užpildykite privalomus laukus', 'error');
    return;
  }

  const data = {
    customerName: name,
    customerPhone: phone,
    customerEmail: '',
    carMake: document.getElementById('nb-car').value.trim(),
    carYear: document.getElementById('nb-year').value.trim(),
    serviceKey: svcKey,
    date,
    time,
    notes: document.getElementById('nb-notes').value.trim(),
    source: newBookingSource
  };

  const bookings = MotorLab.loadBookings();
  const id = 'B' + Date.now().toString(36).toUpperCase();
  bookings.push({
    id,
    ...data,
    createdAt: new Date().toISOString(),
    status: 'confirmed'
  });
  MotorLab.saveBookings(bookings);

  closeNewBooking();
  renderWeek();
  renderStats();
  renderList();
  showToast(`Įrašyta: ${name} · ${date} ${time}`, 'success');
}

function loadSettingsForm() {
  const s = MotorLab.getSettings();
  document.getElementById('set-workday').value = s.workDayMinutes;
  document.getElementById('set-mechanics').value = s.mechanics;
  document.getElementById('set-buffer').value = s.bufferMinutes;
  document.getElementById('set-big-max').value = s.maxBigRepairs;

  const cfg = document.getElementById('services-config');
  cfg.innerHTML = '';
  Object.entries(MotorLab.SERVICES).forEach(([key, svc]) => {
    cfg.innerHTML += `
      <div class="flex items-center gap-3 py-2 border-b border-smoke last:border-b-0">
        <div class="w-3 h-3 rounded" style="background:${svc.color}"></div>
        <div class="flex-1">
          <div class="text-sm font-medium">${svc.name}</div>
          <div class="text-xs text-chrome">${svc.icon} ${svc.price}</div>
        </div>
        <div class="text-sm mono text-flame">${svc.duration} min</div>
        <div class="text-xs text-chrome ml-2">max ~${Math.floor(s.workDayMinutes * s.mechanics / (svc.duration + s.bufferMinutes))}/dieną</div>
      </div>
    `;
  });
}

function saveSettings() {
  const updates = {
    workDayMinutes: parseInt(document.getElementById('set-workday').value) || 480,
    mechanics: parseInt(document.getElementById('set-mechanics').value) || 2,
    bufferMinutes: parseInt(document.getElementById('set-buffer').value) || 15,
    maxBigRepairs: parseInt(document.getElementById('set-big-max').value) || 1
  };
  MotorLab.updateSettings(updates);
  loadSettingsForm();
  showToast('Nustatymai išsaugoti', 'success');
}

function resetData() {
  if (!confirm('Ištrinti VISUS rezervacijų duomenis? Šis veiksmas negrįžtamas.')) return;
  MotorLab.clearAllData();
  location.reload();
}

function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  const colors = {
    success: 'border-green-500 bg-green-500/10 text-green-400',
    error: 'border-red-500 bg-red-500/10 text-red-400',
    info: 'border-flame bg-flame/10 text-flame'
  };
  toast.className = `toast border ${colors[type]} px-4 py-3 rounded-lg backdrop-blur text-sm max-w-sm shadow-xl`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeNewBooking();
    closeDetail();
  }
});

init();
