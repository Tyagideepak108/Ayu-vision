'use strict';

const STORAGE_KEY = 'ayuvision.checkups.v1';
const CONTACT_KEY = 'ayuvision.contacts.v1';
const byId = (id) => document.getElementById(id);
const all = (selector, root = document) => [...root.querySelectorAll(selector)];
let toastTimeout;
let currentLocation = null;
let escalationInterval = null;
let escalationRemaining = 10;
let mediaRecorder = null;
let audioChunks = [];
let selectedEmergency = 'snake';
let selectedImageUrl = null;

const incidentData = {
  snake: {
    title: 'Snakebite — act quickly, keep movement minimal',
    intro: 'A suspected snakebite needs urgent medical assessment. Do not wait for symptoms or an app result.',
    steps: [
      'Move away from the snake; do not try to catch or kill it.',
      'Keep the person calm and as still as possible. Immobilise the bitten limb with a loose splint.',
      'Remove rings, anklets or tight items near the bite before swelling develops.',
      'Arrange urgent transport to a health facility. If vomiting or drowsy, protect the airway and follow emergency-dispatch guidance.'
    ],
    avoid: 'Do not apply a tight tourniquet, cut the wound, suck venom, apply ice, or use herbal / traditional remedies. Antivenom and clinical care must be provided by health professionals.'
  },
  burn: {
    title: 'Burn — cool safely and assess severity',
    intro: 'For a thermal burn, stop the burning process first. Severe or extensive burns need urgent medical care.',
    steps: [
      'Move away from the heat source and make sure the scene is safe.',
      'Cool the burn with cool running water where available; do not delay emergency care for severe burns.',
      'Remove jewellery or loose clothing near the area unless stuck to the skin.',
      'Cover loosely with a clean, non-fluffy dressing and seek medical advice, especially for large, deep, facial or airway burns.'
    ],
    avoid: 'Do not apply ice, butter, toothpaste, oils or home remedies. Do not peel off material stuck to the burn or break blisters.'
  },
  maternity: {
    title: 'Maternity emergency — contact care now',
    intro: 'Pregnancy complications can deteriorate quickly. Contact emergency services and the nearest maternity service immediately.',
    steps: [
      'Call 112 or the local maternity / emergency service; clearly state pregnancy stage and symptoms.',
      'Keep the person accompanied and in a comfortable, safe position while help is arranged.',
      'Share any known gestational age, bleeding, contractions, severe pain, seizure, fainting or fluid leakage with the responder.',
      'Keep antenatal records and medicines available if doing so will not delay transport.'
    ],
    avoid: 'Do not wait for the app timer or a hospital SMS acknowledgement when warning symptoms are present. Do not assume a particular hospital has capacity or that treatment is automatically cashless.'
  },
  breathing: {
    title: 'Severe breathing difficulty or chest pain',
    intro: 'Severe breathlessness, chest pain, collapse or abnormal breathing can be life-threatening. Call 112 now.',
    steps: [
      'Call 112 and follow the emergency operator’s instructions.',
      'Stop exertion; help the person rest in a position that makes breathing easiest.',
      'Loosen tight clothing and do not leave the person alone.',
      'If the person becomes unresponsive and is not breathing normally, tell the dispatcher and start CPR if trained / instructed.'
    ],
    avoid: 'Do not use cough audio or an AI prediction to rule out an emergency. Do not force food, drink or unprescribed medication.'
  }
};

function showToast(message) {
  const toast = byId('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 3000);
}

function goToView(name) {
  const allowed = ['home', 'scan', 'emergency', 'daily'];
  if (!allowed.includes(name)) return;
  all('.view').forEach(view => view.classList.toggle('active', view.id === `view-${name}`));
  all('.nav-item').forEach(btn => btn.classList.toggle('active', btn.dataset.view === name));
  const context = { home: 'Project Ayu-Vision · Care workspace', scan: 'AI-assisted screening · demo only', emergency: 'Emergency response & escalation', daily: 'Daily wellness & EHR records' };
  byId('topContext').textContent = context[name];
  if (name === 'daily') renderRecords();
  if (name === 'home') renderSnapshot();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  byId(`view-${name}`).focus({ preventScroll: true });
}

all('[data-go]').forEach(btn => btn.addEventListener('click', () => goToView(btn.dataset.go)));
all('.nav-item').forEach(btn => btn.addEventListener('click', () => goToView(btn.dataset.view)));

function setNetworkState() {
  const online = navigator.onLine;
  byId('connectionLabel').textContent = online ? 'Online' : 'Offline mode';
  byId('connectionLabel').previousElementSibling.style.background = online ? '#49a77a' : '#c18a3d';
}
window.addEventListener('online', setNetworkState);
window.addEventListener('offline', setNetworkState);
setNetworkState();

function selectIncident(key) {
  if (!incidentData[key]) return;
  selectedEmergency = key;
  all('[data-emergency]').forEach(el => {
    if (el.classList.contains('emergency-option')) el.classList.toggle('selected', el.dataset.emergency === key);
  });
  const data = incidentData[key];
  const box = byId('firstAidContent');
  box.replaceChildren();
  const heading = document.createElement('h4');
  heading.textContent = data.title;
  const intro = document.createElement('p');
  intro.textContent = data.intro;
  const list = document.createElement('ul');
  list.className = 'first-aid-list';
  data.steps.forEach(step => {
    const li = document.createElement('li');
    li.textContent = step;
    list.appendChild(li);
  });
  const avoid = document.createElement('div');
  avoid.className = 'first-aid-avoid';
  const strong = document.createElement('b');
  strong.textContent = 'Avoid: ';
  avoid.append(strong, document.createTextNode(data.avoid));
  box.append(heading, intro, list, avoid);
}

all('[data-emergency]').forEach(btn => btn.addEventListener('click', () => {
  selectIncident(btn.dataset.emergency);
  if (btn.classList.contains('quick-list') || btn.closest('.quick-list')) goToView('emergency');
  else if (btn.classList.contains('quick-list')) goToView('emergency');
  else if (btn.classList.contains('emergency-option')) { /* already in emergency view */ }
}));

// A minimal, explicit bilingual switch for the main workspace.
const translations = {
  en: {
    overviewEyebrow: 'PROJECT AYU-VISION · RURAL HEALTHCARE', homeTitle: 'Care closer. Response faster.',
    homeLead: 'AI-assisted triage, emergency SOS and daily health records—connected in one practical prototype for rural communities.',
    heroKicker: 'A COMMUNITY-FIRST HEALTH PLATFORM', heroTitle: 'When every minute matters, make the next step clear.',
    heroText: 'Screening support when symptoms are unclear. Guided first-aid when action is urgent. Health trends for the next check-in.',
    openEmergency: 'Open emergency help', chooseAction: 'Three modules. One connected response.',
    scanTitle: 'AI Scan', scanDesc: 'Capture a photo or short audio sample to walk through the screening demo.',
    emergencyTitle: 'Emergency SOS', emergencyDesc: 'Choose an emergency, view safe first-aid steps, and prepare a location message.',
    dailyTitle: 'Daily Wellness & EHR', dailyDesc: 'Record vital signs, review trends and prepare for the next health-worker visit.'
  },
  hi: {
    overviewEyebrow: 'प्रोजेक्ट आयु-विजन · ग्रामीण स्वास्थ्य सेवा', homeTitle: 'देखभाल करीब। मदद तेज़।',
    homeLead: 'AI-सहायता वाली शुरुआती स्क्रीनिंग, इमरजेंसी SOS और रोज़ के स्वास्थ्य रिकॉर्ड—एक ही प्रोटोटाइप में।',
    heroKicker: 'समुदाय-केंद्रित स्वास्थ्य प्लेटफ़ॉर्म', heroTitle: 'जब हर मिनट मायने रखता है, अगला कदम स्पष्ट रखें।',
    heroText: 'लक्षण स्पष्ट न हों तो शुरुआती स्क्रीनिंग सहायता। आपातकाल में निर्देशित प्राथमिक सहायता। अगली जाँच के लिए स्वास्थ्य रुझान।',
    openEmergency: 'आपातकालीन सहायता खोलें', chooseAction: 'तीन मॉड्यूल। एक जुड़ा हुआ समाधान।',
    scanTitle: 'AI स्कैन', scanDesc: 'स्क्रीनिंग डेमो के लिए फोटो चुनें या छोटी ऑडियो रिकॉर्डिंग करें।',
    emergencyTitle: 'इमरजेंसी SOS', emergencyDesc: 'स्थिति चुनें, प्राथमिक सहायता के निर्देश देखें और लोकेशन वाला संदेश तैयार करें।',
    dailyTitle: 'दैनिक स्वास्थ्य रिकॉर्ड', dailyDesc: 'स्वास्थ्य मान दर्ज करें, रुझान देखें और अगली स्वास्थ्यकर्मी मुलाक़ात की तैयारी करें।'
  }
};
byId('languageSelect').addEventListener('change', (event) => {
  const language = event.target.value;
  document.documentElement.lang = language === 'hi' ? 'hi' : 'en';
  all('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (translations[language][key]) el.textContent = translations[language][key];
  });
});

// Visual scan: capture/preview only. A real, validated on-device model is a separate integration.
byId('imageInput').addEventListener('change', (event) => {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) { showToast('Choose an image file.'); return; }
  if (selectedImageUrl) URL.revokeObjectURL(selectedImageUrl);
  selectedImageUrl = URL.createObjectURL(file);
  const image = byId('imagePreview');
  image.src = selectedImageUrl;
  image.hidden = false;
  const stage = byId('uploadStage');
  stage.querySelector('.upload-icon').hidden = true;
  stage.querySelector('h3').textContent = file.name;
  stage.querySelector('p').textContent = `${Math.round(file.size / 1024)} KB · local preview`;
  byId('analyzeImageBtn').disabled = false;
  byId('imageAnalysisResult').hidden = true;
});
byId('analyzeImageBtn').addEventListener('click', () => {
  const result = byId('imageAnalysisResult');
  result.replaceChildren();
  const title = document.createElement('b');
  title.textContent = 'Capture complete · model not connected';
  const message = document.createElement('p');
  message.textContent = 'No disease prediction was performed. A production version should run a clinically evaluated, on-device model, show uncertainty, and direct concerning findings to a qualified health professional. A photo alone cannot confirm jaundice or another diagnosis.';
  result.append(title, message);
  result.hidden = false;
});

all('[data-scan-tab]').forEach(btn => btn.addEventListener('click', () => {
  const tab = btn.dataset.scanTab;
  all('[data-scan-tab]').forEach(el => {
    const active = el.dataset.scanTab === tab;
    el.classList.toggle('active', active);
    el.setAttribute('aria-selected', String(active));
  });
  byId('scanImagePanel').hidden = tab !== 'image';
  byId('scanImagePanel').classList.toggle('active', tab === 'image');
  byId('scanAudioPanel').hidden = tab !== 'audio';
  byId('scanAudioPanel').classList.toggle('active', tab === 'audio');
}));

byId('recordAudioBtn').addEventListener('click', async () => {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
    showToast('Audio recording is not supported in this browser. Try HTTPS or localhost.');
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioChunks = [];
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = event => { if (event.data.size) audioChunks.push(event.data); };
    mediaRecorder.onstop = () => {
      const blob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
      const audio = byId('audioPreview');
      if (audio.src) URL.revokeObjectURL(audio.src);
      audio.src = URL.createObjectURL(blob);
      audio.hidden = false;
      stream.getTracks().forEach(track => track.stop());
      byId('recordAudioBtn').textContent = '● Record again';
      byId('recordState').classList.remove('recording');
      byId('recordState').innerHTML = '<span class="status-dot"></span><span>Sample recorded locally · no classification performed</span>';
      const result = byId('audioAnalysisResult');
      result.replaceChildren();
      const title = document.createElement('b');
      title.textContent = 'Audio captured · model not connected';
      const copy = document.createElement('p');
      copy.textContent = 'This prototype did not analyse the recording. Do not infer TB, asthma or a heart attack from this screen. Severe breathlessness, chest pain, collapse or abnormal breathing needs immediate emergency help.';
      result.append(title, copy);
      result.hidden = false;
    };
    mediaRecorder.start();
    byId('recordAudioBtn').textContent = '■ Stop recording';
    byId('recordState').classList.add('recording');
    byId('recordState').innerHTML = '<span class="status-dot"></span><span>Recording… stops automatically in 5 seconds</span>';
    byId('audioAnalysisResult').hidden = true;
    setTimeout(() => { if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop(); }, 5000);
  } catch (error) {
    showToast('Microphone permission was denied or unavailable.');
  }
});

function getCheckups() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}
function saveCheckups(items) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); return true; }
  catch { showToast('Unable to save. Check browser storage settings.'); return false; }
}
function getContacts() {
  try { return JSON.parse(localStorage.getItem(CONTACT_KEY) || '{}') || {}; } catch { return {}; }
}
function saveContacts() {
  try { localStorage.setItem(CONTACT_KEY, JSON.stringify({ patient: byId('patientLabel').value.trim(), primary: byId('primaryNumber').value.trim(), backup: byId('backupNumber').value.trim() })); }
  catch { /* non-critical preference */ }
}
function restoreContacts() {
  const contacts = getContacts();
  byId('patientLabel').value = contacts.patient || '';
  byId('primaryNumber').value = contacts.primary || '';
  byId('backupNumber').value = contacts.backup || '';
}
['patientLabel', 'primaryNumber', 'backupNumber'].forEach(id => byId(id).addEventListener('change', saveContacts));

function dateText(timestamp, includeTime = false) {
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat(undefined, includeTime ? { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' } : { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}
function numericOrNull(id) {
  const raw = byId(id).value.trim();
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}
byId('checkupForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const entry = {
    id: (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`),
    timestamp: new Date().toISOString(), systolic: numericOrNull('systolic'), diastolic: numericOrNull('diastolic'),
    pulse: numericOrNull('pulse'), temperature: numericOrNull('temperature'), spo2: numericOrNull('spo2'),
    respiratoryRate: numericOrNull('respiratoryRate'), symptoms: byId('symptoms').value.trim()
  };
  if (entry.systolic === null && entry.diastolic === null && entry.pulse === null && entry.temperature === null && entry.spo2 === null && entry.respiratoryRate === null && !entry.symptoms) {
    showToast('Enter at least one reading or a note.'); return;
  }
  if ((entry.systolic === null) !== (entry.diastolic === null)) {
    showToast('Enter both systolic and diastolic BP, or leave both blank.'); return;
  }
  const items = getCheckups();
  items.push(entry);
  if (saveCheckups(items)) {
    byId('checkupForm').reset();
    renderRecords(); renderSnapshot(); showToast('Checkup saved on this device.');
  }
});
byId('clearFormBtn').addEventListener('click', () => byId('checkupForm').reset());
byId('loadSampleBtn').addEventListener('click', () => {
  const now = Date.now();
  const demo = [
    { days: 6, s: 132, d: 85, p: 82 }, { days: 5, s: 129, d: 83, p: 78 },
    { days: 4, s: 128, d: 82, p: 81 }, { days: 3, s: 126, d: 81, p: 76 },
    { days: 2, s: 124, d: 80, p: 77 }, { days: 1, s: 123, d: 79, p: 74 }, { days: 0, s: 121, d: 79, p: 75 }
  ].map(row => ({ id: `sample-${row.days}-${now}`, timestamp: new Date(now - row.days * 86400000).toISOString(), systolic: row.s, diastolic: row.d, pulse: row.p, temperature: null, spo2: null, respiratoryRate: null, symptoms: 'DEMO SAMPLE — replace with real measured values.' }));
  const actual = getCheckups().filter(item => !String(item.id).startsWith('sample-'));
  if (saveCheckups([...actual, ...demo])) { renderRecords(); renderSnapshot(); showToast('Clearly labelled demo readings added.'); }
});
byId('deleteRecordsBtn').addEventListener('click', () => {
  if (!getCheckups().length) { showToast('There is no history to clear.'); return; }
  if (window.confirm('Delete all checkup history saved in this browser? This cannot be undone.')) {
    localStorage.removeItem(STORAGE_KEY); renderRecords(); renderSnapshot(); showToast('Local checkup history cleared.');
  }
});

function renderChart(items) {
  const svg = byId('bpChart');
  const bpItems = items.filter(x => Number.isFinite(x.systolic) && Number.isFinite(x.diastolic)).slice(-7);
  if (bpItems.length < 2) {
    svg.replaceChildren();
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', '260'); text.setAttribute('y', '110'); text.setAttribute('text-anchor', 'middle'); text.setAttribute('fill', '#7e8984'); text.setAttribute('font-size', '14');
    text.textContent = bpItems.length === 1 ? 'Add one more BP reading to show a trend' : 'Add readings to see your trend'; svg.appendChild(text); return;
  }
  const ns = 'http://www.w3.org/2000/svg';
  svg.replaceChildren();
  const min = Math.min(50, Math.floor((Math.min(...bpItems.map(x => x.diastolic)) - 10) / 10) * 10);
  const max = Math.max(160, Math.ceil((Math.max(...bpItems.map(x => x.systolic)) + 10) / 10) * 10);
  const left = 36, right = 500, top = 18, bottom = 180;
  const xAt = i => left + (i * (right - left)) / Math.max(1, bpItems.length - 1);
  const yAt = v => bottom - (v - min) * (bottom - top) / (max - min);
  const add = (tag, attrs, content) => { const el = document.createElementNS(ns, tag); Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v)); if (content !== undefined) el.textContent = content; svg.appendChild(el); return el; };
  for (let v = min; v <= max; v += Math.max(10, Math.round((max - min) / 4 / 10) * 10)) {
    const y = yAt(v); add('line', { x1: left, y1: y, x2: right, y2: y, stroke: '#e9eee9', 'stroke-width': 1 });
    add('text', { x: 27, y: y + 4, 'text-anchor': 'end', fill: '#9aa39c', 'font-size': 10 }, String(v));
  }
  const pathFor = key => bpItems.map((item, i) => `${i ? 'L' : 'M'} ${xAt(i)} ${yAt(item[key])}`).join(' ');
  add('path', { d: pathFor('systolic'), fill: 'none', stroke: '#2d8b5a', 'stroke-width': 2.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
  add('path', { d: pathFor('diastolic'), fill: 'none', stroke: '#d9a04b', 'stroke-width': 2.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
  bpItems.forEach((item, i) => {
    add('circle', { cx: xAt(i), cy: yAt(item.systolic), r: 4, fill: '#fff', stroke: '#2d8b5a', 'stroke-width': 2 });
    add('circle', { cx: xAt(i), cy: yAt(item.diastolic), r: 4, fill: '#fff', stroke: '#d9a04b', 'stroke-width': 2 });
    add('text', { x: xAt(i), y: 205, 'text-anchor': 'middle', fill: '#8b978f', 'font-size': 9 }, new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(new Date(item.timestamp)));
  });
}
function renderRecords() {
  const items = getCheckups().sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  renderChart(items);
  const latest = items[items.length - 1];
  byId('trendSummary').innerHTML = `<div><small>READINGS SAVED</small><b>${items.length}</b></div><div><small>LAST ENTRY</small><b>${latest ? dateText(latest.timestamp) : '—'}</b></div><div><small>STORAGE</small><b>On device</b></div>`;
  const list = byId('recordsList'); list.replaceChildren();
  const shown = [...items].reverse().slice(0, 6);
  if (!shown.length) {
    const empty = document.createElement('div'); empty.className = 'empty-records'; empty.textContent = 'Your saved readings will appear here.'; list.appendChild(empty); return;
  }
  shown.forEach(item => {
    const row = document.createElement('div'); row.className = 'record-item';
    const main = document.createElement('div'); const title = document.createElement('b'); title.textContent = dateText(item.timestamp, true); const sub = document.createElement('small'); sub.textContent = item.symptoms || (String(item.id).startsWith('sample-') ? 'DEMO SAMPLE DATA' : 'No note'); main.append(title, sub);
    const values = document.createElement('div'); values.className = 'record-values';
    const specs = [['BP', item.systolic !== null && item.diastolic !== null ? `${item.systolic}/${item.diastolic}` : '—'], ['Pulse', item.pulse ?? '—'], ['SpO₂', item.spo2 !== null && item.spo2 !== undefined ? `${item.spo2}%` : '—']];
    specs.forEach(([label, value]) => { const wrap = document.createElement('div'); const l = document.createElement('span'); l.textContent = label; const v = document.createElement('b'); v.textContent = String(value); wrap.append(l, v); values.appendChild(wrap); });
    row.append(main, values); list.appendChild(row);
  });
}
function renderSnapshot() {
  const items = getCheckups().sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  const latest = items[items.length - 1];
  const target = byId('latestSnapshot');
  target.replaceChildren();
  if (!latest) {
    target.className = 'snapshot-empty';
    const icon = document.createElement('span'); icon.className = 'empty-icon'; icon.textContent = '＋';
    const copy = document.createElement('div'); const b = document.createElement('b'); b.textContent = 'No readings yet'; const p = document.createElement('p'); p.textContent = 'Add a checkup to start a private, on-device trend.'; copy.append(b, p); target.append(icon, copy); return;
  }
  target.className = 'snapshot-values';
  const specs = [['BLOOD PRESSURE', latest.systolic !== null && latest.diastolic !== null ? `${latest.systolic}/${latest.diastolic}` : '—', 'mmHg'], ['PULSE', latest.pulse ?? '—', 'bpm'], ['LAST UPDATED', dateText(latest.timestamp), '']];
  specs.forEach(([label, value, unit]) => { const div = document.createElement('div'); const small = document.createElement('small'); small.textContent = label; const b = document.createElement('b'); b.textContent = String(value); const span = document.createElement('span'); span.textContent = unit; div.append(small, b, span); target.appendChild(div); });
}

// GPS is opt-in and only used to prepare a message; coordinates are not transmitted by this page.
byId('getLocationBtn').addEventListener('click', () => {
  if (!navigator.geolocation) { showToast('Geolocation is not supported on this device.'); return; }
  byId('getLocationBtn').disabled = true;
  byId('getLocationBtn').textContent = 'Getting location…';
  navigator.geolocation.getCurrentPosition(position => {
    currentLocation = { lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy, isDemo: false };
    byId('locationText').textContent = `LIVE GPS · ${currentLocation.lat.toFixed(5)}, ${currentLocation.lng.toFixed(5)} · ±${Math.round(currentLocation.accuracy)} m`;
    byId('getLocationBtn').disabled = false; byId('getLocationBtn').textContent = 'Refresh GPS location';
    showToast('Location ready for the SMS draft.');
  }, error => {
    const messages = { 1: 'Location permission was denied.', 2: 'Current location is unavailable.', 3: 'Location request timed out.' };
    byId('locationText').textContent = messages[error.code] || 'Could not retrieve location.';
    byId('getLocationBtn').disabled = false; byId('getLocationBtn').textContent = 'Try GPS again';
  }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 });
});
byId('useDemoLocationBtn').addEventListener('click', () => {
  currentLocation = { lat: 25.4358, lng: 81.8463, accuracy: 50, isDemo: true };
  byId('locationText').textContent = `DEMO LOCATION · ${currentLocation.lat.toFixed(5)}, ${currentLocation.lng.toFixed(5)} (sample coordinates, not live GPS)`;
  showToast('Sample coordinates added for presentation only.');
});
function buildSmsBody() {
  const incident = incidentData[selectedEmergency].title;
  const name = byId('patientLabel').value.trim();
  const parts = [`EMERGENCY: ${incident}.`, name ? `Patient/caller: ${name}.` : '', currentLocation ? `${currentLocation.isDemo ? 'DEMO LOCATION (sample coordinates, not live GPS): ' : 'Live GPS location: '}${currentLocation.lat.toFixed(6)}, ${currentLocation.lng.toFixed(6)}. Map: https://maps.google.com/?q=${currentLocation.lat},${currentLocation.lng}` : 'Location unavailable; caller needs to share location.', `Time: ${new Date().toLocaleString()}.`, 'Please call back and arrange appropriate emergency medical help.'].filter(Boolean);
  return parts.join(' ');
}
let pendingSmsNumber = '';
let pendingSmsBody = '';
function prepareSms(number) {
  const cleanNumber = String(number || '').trim().replace(/[^+\d]/g, '');
  if (!cleanNumber) { showToast('Enter a recipient phone number first.'); return; }
  saveContacts();
  pendingSmsNumber = cleanNumber;
  pendingSmsBody = buildSmsBody();
  byId('smsDraftRecipient').textContent = `To: ${cleanNumber}`;
  byId('smsDraftText').textContent = pendingSmsBody;
  byId('smsPreview').hidden = false;
  showToast('SMS draft prepared on screen. It has not been sent.');
  byId('smsPreview').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
function launchSmsComposer() {
  if (!pendingSmsNumber || !pendingSmsBody) { showToast('Prepare an SMS draft first.'); return; }
  // Opens the device messaging app where the user must review and send.
  window.location.href = `sms:${pendingSmsNumber}?body=${encodeURIComponent(pendingSmsBody)}`;
}
byId('openSmsBtn').addEventListener('click', () => prepareSms(byId('primaryNumber').value));
byId('openBackupSmsBtn').addEventListener('click', () => prepareSms(byId('backupNumber').value));
byId('openSmsComposerBtn').addEventListener('click', launchSmsComposer);

function resetEscalationControls() {
  byId('startEscalationBtn').disabled = false;
  byId('startEscalationBtn').innerHTML = 'Run no-response scenario <span>→</span>';
  byId('simulateAckBtn').disabled = false;
}
function finishEscalation(kind) {
  if (escalationInterval) clearInterval(escalationInterval);
  escalationInterval = null;
  const state = byId('escalationState');
  const progress = byId('escalationProgressFill');
  const backupButton = byId('openBackupSmsBtn');
  state.hidden = false;
  byId('escalationProgress').hidden = false;
  progress.style.width = '100%';
  if (kind === 'ack') {
    state.className = 'escalation-state escalation-success';
    state.textContent = 'ACKNOWLEDGEMENT RECEIVED · SIMULATED. Primary CHC acknowledged the alert. Backup escalation is not triggered. No hospital was contacted.';
    backupButton.hidden = true;
  } else {
    state.className = 'escalation-state escalation-warning';
    state.textContent = 'NO ACKNOWLEDGEMENT · SIMULATED. The 10-second demo timer expired (representing the intended 5-minute policy window). Prepare a backup SMS if a responder number is configured. No hospital was contacted automatically.';
    backupButton.hidden = false;
  }
  resetEscalationControls();
}
byId('startEscalationBtn').addEventListener('click', () => {
  if (escalationInterval) clearInterval(escalationInterval);
  escalationRemaining = 10;
  const state = byId('escalationState');
  const progressWrap = byId('escalationProgress');
  const progressFill = byId('escalationProgressFill');
  byId('openBackupSmsBtn').hidden = true;
  state.hidden = false;
  state.className = 'escalation-state';
  state.textContent = `SIMULATION RUNNING · Waiting for primary acknowledgement… ${escalationRemaining}s`;
  progressWrap.hidden = false;
  progressFill.style.width = '0%';
  byId('startEscalationBtn').disabled = true;
  byId('startEscalationBtn').textContent = 'Escalation simulation running…';
  byId('simulateAckBtn').disabled = false;
  escalationInterval = setInterval(() => {
    escalationRemaining -= 1;
    progressFill.style.width = `${((10 - escalationRemaining) / 10) * 100}%`;
    if (escalationRemaining > 0) state.textContent = `SIMULATION RUNNING · Waiting for primary acknowledgement… ${escalationRemaining}s`;
    else finishEscalation('no-ack');
  }, 1000);
});
byId('simulateAckBtn').addEventListener('click', () => {
  if (!escalationInterval) {
    const state = byId('escalationState');
    state.hidden = false;
    state.className = 'escalation-state escalation-success';
    state.textContent = 'ACKNOWLEDGEMENT RECEIVED · SIMULATED. This scenario demonstrates how a confirmed primary response should stop backup escalation. No hospital was contacted.';
    byId('escalationProgress').hidden = false;
    byId('escalationProgressFill').style.width = '100%';
    byId('openBackupSmsBtn').hidden = true;
    return;
  }
  finishEscalation('ack');
});

// Export only when explicitly requested by the user. The file is generated locally.
byId('exportRecordsBtn').addEventListener('click', () => {
  const items = getCheckups().sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  if (!items.length) { showToast('No readings to export yet.'); return; }
  const columns = ['timestamp', 'systolic_mmHg', 'diastolic_mmHg', 'pulse_bpm', 'temperature_C', 'spo2_percent', 'respiratory_rate_per_min', 'symptoms_or_notes'];
  const escapeCell = value => {
    let text = value === null || value === undefined ? '' : String(value);
    if (/^[=+@\-]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  const rows = items.map(item => [item.timestamp, item.systolic, item.diastolic, item.pulse, item.temperature, item.spo2, item.respiratoryRate, item.symptoms]);
  const csv = [columns, ...rows].map(row => row.map(escapeCell).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = `ayu-vision-health-records-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
  showToast('CSV export created on this device. Treat it as private health information.');
});

// Static-first PWA caching: core shell, styles and scripts are available after first successful load.
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

const today = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
byId('todayLabel').textContent = today.format(new Date());
restoreContacts();
selectIncident('snake');
renderRecords();
renderSnapshot();
