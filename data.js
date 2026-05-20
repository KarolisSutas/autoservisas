const MotorLab = (function() {

  const SERVICES = {
    'alyva':         { name: 'Alyvos keitimas',     duration: 30,  price: '29 €',     icon: '🛢',  color: '#85B7EB' },
    'padangos':      { name: 'Padangų keitimas',    duration: 45,  price: '15 €/vnt', icon: '🛞',  color: '#5DCAA5' },
    'diagnostika':   { name: 'OBD diagnostika',     duration: 60,  price: '49 €',     icon: '🔍',  color: '#FAC775' },
    'stabdziai':     { name: 'Stabdžių darbai',     duration: 120, price: '89 €',     icon: '🛑',  color: '#F0997B' },
    'pakaba':        { name: 'Pakaba ir vairas',    duration: 90,  price: '69 €',     icon: '🔧',  color: '#AFA9EC' },
    'variklis':      { name: 'Variklio remontas',   duration: 180, price: '150 €',    icon: '⚡',  color: '#ED93B1' }
  };

  const SETTINGS = {
    workDayMinutes: 480,
    mechanics: 2,
    bufferMinutes: 15,
    maxBigRepairs: 1,
    bigRepairThreshold: 120,
    minSlotInterval: 30,
    workHours: { start: 8, end: 17, lunchStart: 12, lunchEnd: 13 },
    workDays: [1, 2, 3, 4, 5, 6]
  };

  function loadBookings() {
    try {
      return JSON.parse(localStorage.getItem('motorlab_bookings') || '[]');
    } catch(e) {
      return [];
    }
  }

  function saveBookings(bookings) {
    localStorage.setItem('motorlab_bookings', JSON.stringify(bookings));
  }

  function formatDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function isWorkDay(d) {
    const dow = d.getDay();
    const dowNorm = dow === 0 ? 7 : dow;
    return SETTINGS.workDays.includes(dowNorm);
  }

  function isPast(d) {
    const today = new Date();
    today.setHours(0,0,0,0);
    return d < today;
  }

  function getDayMinutesUsed(dateStr) {
    const bookings = loadBookings();
    const dayBookings = bookings.filter(b => b.date === dateStr && b.status !== 'cancelled');
    return dayBookings.reduce((sum, b) => {
      const svc = SERVICES[b.serviceKey];
      return sum + (svc ? svc.duration + SETTINGS.bufferMinutes : 0);
    }, 0);
  }

  function getDayCapacity() {
    return SETTINGS.workDayMinutes * SETTINGS.mechanics;
  }

  function getDayStatus(date) {
    if (isPast(date) || !isWorkDay(date)) return 'unavailable';
    const used = getDayMinutesUsed(formatDate(date));
    const capacity = getDayCapacity();
    const usage = used / capacity;
    if (usage >= 1) return 'full';
    if (usage >= 0.85) return 'almost-full';
    return 'available';
  }

  function getDayBigRepairs(dateStr) {
    const bookings = loadBookings();
    return bookings.filter(b => {
      if (b.date !== dateStr || b.status === 'cancelled') return false;
      const svc = SERVICES[b.serviceKey];
      return svc && svc.duration >= SETTINGS.bigRepairThreshold;
    }).length;
  }

  function canFitService(dateStr, serviceKey) {
    const svc = SERVICES[serviceKey];
    if (!svc) return { ok: false, reason: 'Nežinoma paslauga' };

    const used = getDayMinutesUsed(dateStr);
    const needed = svc.duration + SETTINGS.bufferMinutes;
    const capacity = getDayCapacity();

    if (used + needed > capacity) {
      const leftMin = capacity - used;
      return {
        ok: false,
        reason: `Dienai liko ${leftMin} min. Reikia ${needed} min.`
      };
    }

    if (svc.duration >= SETTINGS.bigRepairThreshold) {
      const bigCount = getDayBigRepairs(dateStr);
      if (bigCount >= SETTINGS.maxBigRepairs) {
        return {
          ok: false,
          reason: `Daugiau didelių darbų šiai dienai nepriimame (max ${SETTINGS.maxBigRepairs})`
        };
      }
    }

    return { ok: true };
  }

  function getAvailableTimes(dateStr, serviceKey) {
    const svc = SERVICES[serviceKey];
    if (!svc) return [];

    const fit = canFitService(dateStr, serviceKey);
    if (!fit.ok) return [];

    const bookings = loadBookings()
      .filter(b => b.date === dateStr && b.status !== 'cancelled')
      .sort((a, b) => a.time.localeCompare(b.time));

    const occupiedSlots = {};
    bookings.forEach((b, idx) => {
      const mechanicIdx = idx % SETTINGS.mechanics;
      const startMin = timeToMin(b.time);
      const bsvc = SERVICES[b.serviceKey];
      const endMin = startMin + bsvc.duration + SETTINGS.bufferMinutes;
      if (!occupiedSlots[mechanicIdx]) occupiedSlots[mechanicIdx] = [];
      occupiedSlots[mechanicIdx].push({ start: startMin, end: endMin });
    });

    const times = [];
    const startMin = SETTINGS.workHours.start * 60;
    const endMin = SETTINGS.workHours.end * 60;
    const lunchStart = SETTINGS.workHours.lunchStart * 60;
    const lunchEnd = SETTINGS.workHours.lunchEnd * 60;

    for (let t = startMin; t + svc.duration <= endMin; t += SETTINGS.minSlotInterval) {
      const slotEnd = t + svc.duration;
      if (t < lunchEnd && slotEnd > lunchStart) continue;

      let anyMechanicFree = false;
      for (let m = 0; m < SETTINGS.mechanics; m++) {
        const mOcc = occupiedSlots[m] || [];
        const conflict = mOcc.some(s => t < s.end && slotEnd + SETTINGS.bufferMinutes > s.start);
        if (!conflict) {
          anyMechanicFree = true;
          break;
        }
      }
      times.push({ time: minToTime(t), available: anyMechanicFree });
    }
    return times;
  }

  function timeToMin(t) {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  }

  function minToTime(min) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
  }

  function addBooking(data) {
    const fit = canFitService(data.date, data.serviceKey);
    if (!fit.ok) return { ok: false, reason: fit.reason };

    const bookings = loadBookings();
    const id = 'B' + Date.now().toString(36).toUpperCase();
    const newBooking = {
      id,
      ...data,
      createdAt: new Date().toISOString(),
      status: 'confirmed'
    };
    bookings.push(newBooking);
    saveBookings(bookings);
    return { ok: true, booking: newBooking };
  }

  function cancelBooking(id) {
    const bookings = loadBookings();
    const idx = bookings.findIndex(b => b.id === id);
    if (idx === -1) return false;
    bookings[idx].status = 'cancelled';
    saveBookings(bookings);
    return true;
  }

  function deleteBooking(id) {
    const bookings = loadBookings();
    saveBookings(bookings.filter(b => b.id !== id));
    return true;
  }

  function getBookingsForDate(dateStr) {
    return loadBookings()
      .filter(b => b.date === dateStr && b.status !== 'cancelled')
      .sort((a, b) => a.time.localeCompare(b.time));
  }

  function getBookingsForWeek(startDate) {
    const result = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const ds = formatDate(d);
      result[ds] = getBookingsForDate(ds);
    }
    return result;
  }

  function getSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem('motorlab_settings') || 'null');
      return saved ? { ...SETTINGS, ...saved } : { ...SETTINGS };
    } catch(e) {
      return { ...SETTINGS };
    }
  }

  function updateSettings(updates) {
    const current = getSettings();
    const newSettings = { ...current, ...updates };
    localStorage.setItem('motorlab_settings', JSON.stringify(newSettings));
    Object.assign(SETTINGS, newSettings);
  }

  function seedDemoData() {
    const existing = loadBookings();
    if (existing.length > 0) return;

    const today = new Date();
    const demos = [];
    const names = [
      ['Tomas Kazlauskas', '+370 612 11111', 'VW Golf', '2018'],
      ['Vaida Mickeliūnė', '+370 615 22222', 'Toyota Yaris', '2020'],
      ['Rolandas Daunoras', '+370 618 33333', 'Audi A4', '2015'],
      ['Petras Bartkus', '+370 622 44444', 'BMW 320', '2019'],
      ['Laima Stankūnaitė', '+370 625 55555', 'Skoda Octavia', '2017']
    ];
    const services = ['alyva', 'padangos', 'diagnostika', 'stabdziai'];
    const sources = ['online', 'phone', 'walk-in'];

    for (let i = 1; i <= 5; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      if (!isWorkDay(d)) continue;
      const n = names[i % names.length];
      const svc = services[i % services.length];
      demos.push({
        id: 'DEMO' + i,
        date: formatDate(d),
        time: ['09:00', '10:30', '14:00'][i % 3],
        serviceKey: svc,
        customerName: n[0],
        customerPhone: n[1],
        customerEmail: '',
        carMake: n[2],
        carYear: n[3],
        notes: '',
        source: sources[i % sources.length],
        status: 'confirmed',
        createdAt: new Date().toISOString()
      });
    }
    saveBookings(demos);
  }

  function exportData() {
    return JSON.stringify({
      bookings: loadBookings(),
      settings: getSettings()
    }, null, 2);
  }

  function clearAllData() {
    localStorage.removeItem('motorlab_bookings');
    localStorage.removeItem('motorlab_settings');
  }

  return {
    SERVICES,
    SETTINGS,
    getSettings,
    updateSettings,
    loadBookings,
    saveBookings,
    formatDate,
    isWorkDay,
    isPast,
    getDayStatus,
    getDayMinutesUsed,
    getDayCapacity,
    canFitService,
    getAvailableTimes,
    addBooking,
    cancelBooking,
    deleteBooking,
    getBookingsForDate,
    getBookingsForWeek,
    seedDemoData,
    exportData,
    clearAllData,
    timeToMin,
    minToTime
  };
})();
