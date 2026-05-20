let bookingState = {
  step: 1,
  serviceKey: null,
  date: null,
  time: null,
  currentMonth: new Date()
};

function openBooking(preselectService) {
  bookingState = {
    step: 1,
    serviceKey: null,
    date: null,
    time: null,
    currentMonth: new Date()
  };

  MotorLab.seedDemoData();

  document.getElementById('bookingModal').classList.remove('hidden');
  document.getElementById('bookingModal').classList.add('flex');
  renderServiceList();
  showStep(1);

  if (preselectService) {
    const found = Object.entries(MotorLab.SERVICES).find(([k, s]) => s.name === preselectService);
    if (found) {
      setTimeout(() => selectService(found[0]), 100);
    }
  }
}

function closeBooking() {
  document.getElementById('bookingModal').classList.add('hidden');
  document.getElementById('bookingModal').classList.remove('flex');
}

function showStep(n) {
  bookingState.step = n;
  for (let i = 1; i <= 4; i++) {
    const stepEl = document.getElementById('step-' + i);
    const formEl = document.getElementById('form-step-' + i);
    stepEl.classList.remove('active', 'done');
    if (i < n) stepEl.classList.add('done');
    if (i === n) stepEl.classList.add('active');
    if (i === n) {
      formEl.classList.remove('hidden');
    } else {
      formEl.classList.add('hidden');
    }
  }

  const btnBack = document.getElementById('btn-back');
  const btnNext = document.getElementById('btn-next');
  const footer = document.getElementById('form-footer');

  if (n === 1) {
    btnBack.classList.add('invisible');
  } else {
    btnBack.classList.remove('invisible');
  }

  if (n === 4) {
    footer.style.display = 'none';
  } else {
    footer.style.display = 'flex';
  }

  if (n === 3) {
    btnNext.innerHTML = 'Patvirtinti rezervaciją <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg>';
  } else {
    btnNext.innerHTML = 'Toliau <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>';
  }

  updateNextButton();
}

function renderServiceList() {
  const list = document.getElementById('service-list');
  list.innerHTML = '';
  Object.entries(MotorLab.SERVICES).forEach(([key, svc]) => {
    const isSelected = bookingState.serviceKey === key;
    const div = document.createElement('div');
    div.className = `border rounded-xl p-4 cursor-pointer transition ${isSelected ? 'border-flame bg-flame/5' : 'border-smoke hover:border-steel'}`;
    div.onclick = () => selectService(key);
    div.innerHTML = `
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 rounded-lg flex items-center justify-center text-2xl" style="background:${svc.color}20">${svc.icon}</div>
        <div class="flex-1">
          <div class="font-medium">${svc.name}</div>
          <div class="text-xs text-chrome mt-1">${svc.duration} min · nuo ${svc.price}</div>
        </div>
        <div class="${isSelected ? 'text-flame' : 'text-chrome'}">
          ${isSelected
            ? '<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>'
            : '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"></path></svg>'
          }
        </div>
      </div>
    `;
    list.appendChild(div);
  });
}

function selectService(key) {
  bookingState.serviceKey = key;
  renderServiceList();
  updateNextButton();
}

function changeMonth(delta) {
  bookingState.currentMonth.setMonth(bookingState.currentMonth.getMonth() + delta);
  renderCalendar();
}

function renderCalendar() {
  const month = bookingState.currentMonth;
  const months = ['Sausis', 'Vasaris', 'Kovas', 'Balandis', 'Gegužė', 'Birželis', 'Liepa', 'Rugpjūtis', 'Rugsėjis', 'Spalis', 'Lapkritis', 'Gruodis'];
  document.getElementById('month-label').textContent = `${months[month.getMonth()]} ${month.getFullYear()}`;

  const grid = document.getElementById('calendar-grid');
  grid.innerHTML = '';

  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  let startDow = firstDay.getDay();
  startDow = startDow === 0 ? 6 : startDow - 1;

  for (let i = 0; i < startDow; i++) {
    grid.appendChild(document.createElement('div'));
  }

  for (let day = 1; day <= lastDay.getDate(); day++) {
    const d = new Date(month.getFullYear(), month.getMonth(), day);
    const status = MotorLab.getDayStatus(d);
    const dateStr = MotorLab.formatDate(d);

    const cell = document.createElement('button');
    cell.className = 'calendar-day rounded-lg py-2 text-sm';

    if (status === 'unavailable') {
      cell.classList.add('unavailable');
      cell.disabled = true;
    } else if (status === 'full') {
      cell.classList.add('full');
      cell.disabled = true;
      cell.title = 'Diena pilnai užimta';
    } else if (status === 'almost-full') {
      cell.classList.add('available', 'bg-amber/20', 'text-amber');
      cell.onclick = () => selectDate(dateStr);
    } else {
      cell.classList.add('available', 'hover:bg-flame', 'hover:text-ink', 'bg-smoke');
      cell.onclick = () => selectDate(dateStr);
    }

    if (bookingState.date === dateStr) {
      cell.classList.add('selected');
    }

    cell.textContent = day;
    grid.appendChild(cell);
  }
}

function selectDate(dateStr) {
  bookingState.date = dateStr;
  bookingState.time = null;
  renderCalendar();
  renderTimes();
  updateNextButton();
}

function renderTimes() {
  if (!bookingState.date || !bookingState.serviceKey) return;
  const section = document.getElementById('time-section');
  section.classList.remove('hidden');

  const used = MotorLab.getDayMinutesUsed(bookingState.date);
  const cap = MotorLab.getDayCapacity();
  const left = cap - used;
  const pct = Math.round(used / cap * 100);
  const svc = MotorLab.SERVICES[bookingState.serviceKey];

  const info = document.getElementById('capacity-info');
  const fits = left >= svc.duration + 15;
  info.innerHTML = `
    <div class="bg-ink rounded-lg p-3 border border-smoke">
      <div class="flex justify-between items-center mb-2">
        <span class="text-chrome mono">DIENOS APKROVA</span>
        <span class="${pct > 85 ? 'text-amber' : 'text-chrome'}">${pct}% · liko ${left} min</span>
      </div>
      <div class="h-1.5 bg-smoke rounded-full overflow-hidden">
        <div class="h-full ${pct > 85 ? 'bg-amber' : 'bg-flame'}" style="width:${pct}%"></div>
      </div>
    </div>
  `;

  const slots = MotorLab.getAvailableTimes(bookingState.date, bookingState.serviceKey);
  const slotsEl = document.getElementById('time-slots');
  slotsEl.innerHTML = '';

  if (slots.length === 0) {
    slotsEl.innerHTML = `<div class="col-span-4 text-center py-6 text-chrome text-sm">Šią dieną laisvų laikų nėra. Pasirinkite kitą datą.</div>`;
    return;
  }

  slots.forEach(slot => {
    const btn = document.createElement('button');
    btn.className = `time-slot border border-smoke rounded-lg py-2.5 text-sm mono ${slot.available ? '' : 'disabled'}`;
    if (!slot.available) btn.disabled = true;
    if (bookingState.time === slot.time) btn.classList.add('selected');
    btn.textContent = slot.time;
    btn.onclick = () => selectTime(slot.time);
    slotsEl.appendChild(btn);
  });
}

function selectTime(time) {
  bookingState.time = time;
  renderTimes();
  updateNextButton();
}

function nextStep() {
  if (bookingState.step === 1) {
    if (!bookingState.serviceKey) return;
    showStep(2);
    renderCalendar();
  } else if (bookingState.step === 2) {
    if (!bookingState.date || !bookingState.time) return;
    showStep(3);
  } else if (bookingState.step === 3) {
    submitBooking();
  }
}

function prevStep() {
  if (bookingState.step > 1) {
    showStep(bookingState.step - 1);
    if (bookingState.step === 2) renderCalendar();
  }
}

function updateNextButton() {
  const btn = document.getElementById('btn-next');
  let canProceed = false;
  if (bookingState.step === 1) canProceed = !!bookingState.serviceKey;
  if (bookingState.step === 2) canProceed = !!bookingState.date && !!bookingState.time;
  if (bookingState.step === 3) canProceed = true;
  btn.disabled = !canProceed;
}

function submitBooking() {
  const name = document.getElementById('customer-name').value.trim();
  const phone = document.getElementById('customer-phone').value.trim();

  if (!name || !phone) {
    showToast('Užpildykite vardą ir telefoną', 'error');
    return;
  }

  const data = {
    serviceKey: bookingState.serviceKey,
    date: bookingState.date,
    time: bookingState.time,
    customerName: name,
    customerPhone: phone,
    customerEmail: document.getElementById('customer-email').value.trim(),
    carMake: document.getElementById('car-make').value.trim(),
    carYear: document.getElementById('car-year').value.trim(),
    notes: document.getElementById('customer-notes').value.trim(),
    source: 'online'
  };

  const result = MotorLab.addBooking(data);
  if (!result.ok) {
    showToast(result.reason, 'error');
    return;
  }

  const svc = MotorLab.SERVICES[data.serviceKey];
  document.getElementById('confirm-num').textContent = result.booking.id;
  document.getElementById('sum-service').textContent = svc.name;
  document.getElementById('sum-when').textContent = `${formatDateNice(data.date)} · ${data.time}`;
  document.getElementById('sum-duration').textContent = `${svc.duration} min`;
  document.getElementById('sum-name').textContent = name;

  showStep(4);
  showToast('Registracija sėkminga!', 'success');
}

function formatDateNice(dateStr) {
  const months = ['sausio', 'vasario', 'kovo', 'balandžio', 'gegužės', 'birželio', 'liepos', 'rugpjūčio', 'rugsėjo', 'spalio', 'lapkričio', 'gruodžio'];
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${d} ${months[m-1]}`;
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
    const modal = document.getElementById('bookingModal');
    if (!modal.classList.contains('hidden')) closeBooking();
  }
});
