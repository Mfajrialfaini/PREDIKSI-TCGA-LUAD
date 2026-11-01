/* ===================================================
   Deteksi LUAD — app.js
   Clinical Theme — TCGA-LUAD Mutation Predictor
   =================================================== */

'use strict';

// ─── State ────────────────────────────────────────────────
const STATE = {
  mode:        'patch',
  model:       'swin',
  patchFile:   null,
  wsiFile:     null,
  validStatus: null,
};

// ─── DOM Ready ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initNavbarScroll();
  initScrollReveal();
  initLockAspect();
  initAnalysisID();
  initDateDisplay();
});

// ─── Navbar ───────────────────────────────────────────────
function initNavbarScroll() {
  const nav = document.getElementById('mainNav');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 60) {
      nav.style.boxShadow = '0 4px 20px rgba(15,23,42,0.08)';
    } else {
      nav.style.boxShadow = '0 1px 3px rgba(15,23,42,0.04)';
    }
  });
}

// ─── Scroll Reveal ────────────────────────────────────────
function initScrollReveal() {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.style.opacity   = '1';
        e.target.style.transform = 'translateY(0)';
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.how-step-card, .class-info-card, .hstat-card, .category-card, .workflow-card').forEach(el => {
    el.style.opacity   = '0';
    el.style.transform = 'translateY(16px)';
    el.style.transition = 'opacity .45s ease, transform .45s ease';
    io.observe(el);
  });
}

// ─── Generate Analysis ID ─────────────────────────────────
function initAnalysisID() {
  const id = 'LUAD-' + Math.random().toString(36).substring(2,8).toUpperCase();
  const el = document.getElementById('analysisId');
  if (el) el.textContent = id;
}

// ─── Date Display ─────────────────────────────────────────
function initDateDisplay() {
  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID', {
    day: '2-digit', month: 'long', year: 'numeric'
  });
  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  const adEl = document.getElementById('analysisDate');
  if (adEl) adEl.textContent = `${dateStr}, ${timeStr} WIB`;

  const rmsDate = document.getElementById('rmsDate');
  if (rmsDate) rmsDate.textContent = dateStr;

  const topTime = document.getElementById('topNavTime');
  if (topTime) topTime.textContent = `${dateStr} • ${timeStr} WIB`;
}

// ─── Aspect Ratio Lock ────────────────────────────────────
function initLockAspect() {
  const lockCb = document.getElementById('lockAspect');
  const wInput = document.getElementById('patchW');
  const hInput = document.getElementById('patchH');
  if (!lockCb || !wInput || !hInput) return;

  wInput.addEventListener('input', () => { if (lockCb.checked) hInput.value = wInput.value; });
  hInput.addEventListener('input', () => { if (lockCb.checked) wInput.value = hInput.value; });

  // Also sync WSI patch inputs
  const wsiW = document.getElementById('wsiPatchW');
  const wsiH = document.getElementById('wsiPatchH');
  if (wsiW && wsiH) {
    wsiW.addEventListener('input', () => { wsiH.value = wsiW.value; });
    wsiH.addEventListener('input', () => { wsiW.value = wsiH.value; });
  }
}

// ─── Mode Switch ──────────────────────────────────────────
function switchMode(mode) {
  STATE.mode = mode;

  const patchPanel = document.getElementById('patchPanel');
  const wsiPanel   = document.getElementById('wsiPanel');
  const btnPatch   = document.getElementById('btnPatch');
  const btnWSI     = document.getElementById('btnWSI');

  if (mode === 'patch') {
    patchPanel.classList.remove('d-none');
    wsiPanel.classList.add('d-none');
    btnPatch.classList.add('active');
    btnWSI.classList.remove('active');
  } else {
    patchPanel.classList.add('d-none');
    wsiPanel.classList.remove('d-none');
    btnWSI.classList.add('active');
    btnPatch.classList.remove('active');
  }
  checkPredictReady();
}

// ─── Drag & Drop ──────────────────────────────────────────
function handleDragOver(e, mode) {
  e.preventDefault();
  const zoneId = mode === 'patch' ? 'uploadZonePatch' : 'uploadZoneWSI';
  document.getElementById(zoneId)?.classList.add('drag-over');
}

function handleDragLeave(e, mode) {
  const zoneId = mode === 'patch' ? 'uploadZonePatch' : 'uploadZoneWSI';
  document.getElementById(zoneId)?.classList.remove('drag-over');
}

function handleDrop(e, mode) {
  e.preventDefault();
  handleDragLeave(e, mode);
  const file = e.dataTransfer.files[0];
  if (file) processFile(file, mode);
}

// ─── File Input ───────────────────────────────────────────
function handleFileSelect(e, mode) {
  const file = e.target.files[0];
  if (file) processFile(file, mode);
}

// ─── Process Uploaded File ────────────────────────────────
function processFile(file, mode) {
  if (mode === 'patch') {
    STATE.patchFile = file;
    showPatchPreview(file);
  } else {
    STATE.wsiFile = file;
    showWSIPreview(file);
  }
  checkPredictReady();
}

// ── Patch Preview ─────────────────────────────────────────
function showPatchPreview(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const src = e.target.result;

    // Show preview
    document.getElementById('patchPlaceholder').classList.add('d-none');
    document.getElementById('patchPreviewWrap').classList.remove('d-none');
    document.getElementById('previewImgPatch').src = src;

    // Info bar
    const info = document.getElementById('patchInfo');
    info.classList.remove('d-none');
    document.getElementById('patchFileName').textContent = truncateFilename(file.name, 28);
    document.getElementById('patchSize').textContent = formatBytes(file.size);

    // Get dimensions + validate
    const tmp = new Image();
    tmp.onload = () => {
      document.getElementById('patchDim').textContent = `${tmp.width}×${tmp.height}`;
      validatePatch(tmp.width, tmp.height, file);
    };
    tmp.src = src;
  };
  reader.readAsDataURL(file);
}

// ── WSI Preview ───────────────────────────────────────────
function showWSIPreview(file) {
  document.getElementById('wsiPlaceholder').classList.add('d-none');
  document.getElementById('wsiPreviewWrap').classList.remove('d-none');
  document.getElementById('wsiFileName').textContent = truncateFilename(file.name, 25);
  document.getElementById('wsiFileSize').textContent = formatBytes(file.size);

  const info = document.getElementById('wsiInfo');
  info.classList.remove('d-none');
  document.getElementById('wsiInfoName').textContent = truncateFilename(file.name, 28);
  document.getElementById('wsiInfoSize').textContent = formatBytes(file.size);

  STATE.validStatus = 'valid';
  checkPredictReady();
}

// ─── Patch Validation ─────────────────────────────────────
function validatePatch(w, h, file) {
  const chip = document.getElementById('patchValidChip');
  const isImage     = file.type.startsWith('image/');
  const isLargeEnough = w >= 32 && h >= 32;
  const isSquarish  = Math.max(w / h, h / w) < 4;

  const valid = isImage && isLargeEnough && isSquarish;
  STATE.validStatus = valid ? 'valid' : 'invalid';

  if (chip) {
    if (valid) {
      chip.className = 'sib-chip sib-valid';
      chip.innerHTML = '<i class="bi bi-check-circle-fill me-1"></i>Valid';
    } else {
      chip.className = 'sib-chip sib-invalid';
      chip.innerHTML = '<i class="bi bi-x-circle-fill me-1"></i>Tidak Valid';
    }
  }
  checkPredictReady();
}

// ─── Reset ────────────────────────────────────────────────
function resetMode(mode) {
  if (mode === 'patch') {
    STATE.patchFile   = null;
    STATE.validStatus = null;
    document.getElementById('patchPlaceholder').classList.remove('d-none');
    document.getElementById('patchPreviewWrap').classList.add('d-none');
    document.getElementById('patchInfo').classList.add('d-none');
    document.getElementById('fileInputPatch').value = '';

    const chip = document.getElementById('patchValidChip');
    if (chip) {
      chip.className = 'sib-chip';
      chip.innerHTML = '<i class="bi bi-question me-1"></i>Validasi...';
    }
  } else {
    STATE.wsiFile     = null;
    STATE.validStatus = null;
    document.getElementById('wsiPlaceholder').classList.remove('d-none');
    document.getElementById('wsiPreviewWrap').classList.add('d-none');
    document.getElementById('wsiInfo').classList.add('d-none');
    document.getElementById('fileInputWSI').value = '';
  }

  checkPredictReady();
  showResultPanel('empty');
  setStatusBadge('sys-idle', 'Menunggu Input');
}

function resetAll() {
  resetMode('patch');
  resetMode('wsi');
}

// ─── Re-upload Trigger ────────────────────────────────────
function triggerReupload() {
  resetAll();
  document.getElementById('predictor').scrollIntoView({ behavior: 'smooth' });
  setTimeout(() => {
    if (STATE.mode === 'patch') {
      document.getElementById('fileInputPatch').click();
    } else {
      document.getElementById('fileInputWSI').click();
    }
  }, 700);
}

// ─── Check Predict Ready ──────────────────────────────────
function checkPredictReady() {
  const btn     = document.getElementById('predictBtn');
  const hasFile = STATE.mode === 'patch' ? !!STATE.patchFile : !!STATE.wsiFile;
  btn.disabled  = !hasFile;
}

// ─── Model Selection ──────────────────────────────────────
function selectModel(el, modelId) {
  if (el.classList.contains('model-row-locked')) return;
  STATE.model = modelId;
}

// ─── Stride Label ─────────────────────────────────────────
function updateStrideLabel(val, targetId) {
  const el = document.getElementById(targetId);
  if (!el) return;
  const pw = parseInt(document.getElementById('wsiPatchW')?.value || 224);
  el.textContent = parseInt(val) === pw ? `${val}px` : `${val}px`;
}

// ─── Prediction ───────────────────────────────────────────
async function startPrediction() {
  const hasFile = STATE.mode === 'patch' ? !!STATE.patchFile : !!STATE.wsiFile;
  if (!hasFile) return;

  showResultPanel('loading');
  setStatusBadge('sys-processing', 'Menganalisis...');

  const title = document.getElementById('loadingTitle');
  title.textContent = STATE.mode === 'wsi'
    ? 'Memproses WSI — Membagi menjadi Patch...'
    : 'Menganalisis Specimen Histopatologi...';

  // Step-by-step loading
  await activateStep('step1', 700);
  await activateStep('step2', 900);
  await activateStep('step3', 1100);
  await activateStep('step4', 600);
  await delay(300);

  // Get outcome
  const outcome = mockPredict();
  renderResult(outcome);
}

// ─── Mock Predict ─────────────────────────────────────────
function mockPredict() {
  const r = Math.random();
  if (r < 0.40) return 'mutant';
  if (r < 0.80) return 'wildtype';
  return 'invalid';
}

// ─── Render Result ────────────────────────────────────────
function renderResult(outcome) {
  const now      = new Date();
  const elapsed  = (Math.random() * 2 + 0.6).toFixed(2) + 's';
  const modeLabel= STATE.mode === 'wsi' ? 'Whole Slide Image (WSI)' : `Patch (${document.getElementById('patchW')?.value || 224}×${document.getElementById('patchH')?.value || 224}px)`;
  const dateStr  = now.toLocaleString('id-ID', { day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' });

  // Update report meta strip
  const sampleEl = document.getElementById('sampleId');
  const sampleId = sampleEl?.value?.trim() || '—';
  const rmsId    = document.getElementById('rmsId');
  if (rmsId) rmsId.textContent = sampleId;

  if (outcome === 'mutant') {
    const mutConf = +(Math.random() * 22 + 74).toFixed(1);   // 74–96%
    const wtConf  = +(100 - mutConf).toFixed(1);

    fill('mutantTime',    elapsed);
    fill('mutantMode',    modeLabel);
    fill('mutantDate',    dateStr);
    fill('mutantConfPct', mutConf.toFixed(1) + '%');
    fill('mutantWtPct',   wtConf.toFixed(1) + '%');

    showResultPanel('mutant');
    setStatusBadge('sys-done-mut', 'MUTANT Terdeteksi');

    setTimeout(() => {
      animateBar('mutantBar', mutConf);
      animateBar('mutantWtBar', wtConf);
    }, 120);

  } else if (outcome === 'wildtype') {
    const wtConf  = +(Math.random() * 22 + 74).toFixed(1);
    const mutConf = +(100 - wtConf).toFixed(1);

    fill('wtTime',       elapsed);
    fill('wtMode',       modeLabel);
    fill('wtDate',       dateStr);
    fill('wtConfPct',    wtConf.toFixed(1) + '%');
    fill('wtMutantPct',  mutConf.toFixed(1) + '%');

    showResultPanel('wildtype');
    setStatusBadge('sys-done-ok', 'WILDTYPE Terdeteksi');

    setTimeout(() => {
      animateBar('wtBar', wtConf);
      animateBar('wtMutantBar', mutConf);
    }, 120);

  } else {
    showResultPanel('invalid');
    setStatusBadge('sys-error', 'Specimen Tidak Valid');
  }
}

// ─── Panel Controller ─────────────────────────────────────
function showResultPanel(state) {
  ['emptyState','loadingState','resultMutant','resultWildtype','resultInvalid'].forEach(id => {
    document.getElementById(id)?.classList.add('d-none');
  });

  // Reset loading steps
  ['step1','step2','step3','step4'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.className = 'lps-item';
  });

  switch (state) {
    case 'empty':    document.getElementById('emptyState').classList.remove('d-none'); break;
    case 'loading':  document.getElementById('loadingState').classList.remove('d-none'); break;
    case 'mutant':   document.getElementById('resultMutant').classList.remove('d-none'); break;
    case 'wildtype': document.getElementById('resultWildtype').classList.remove('d-none'); break;
    case 'invalid':  document.getElementById('resultInvalid').classList.remove('d-none'); break;
  }
}

// ─── Loading Steps ────────────────────────────────────────
const STEPS = ['step1','step2','step3','step4'];

async function activateStep(id, ms) {
  const idx = STEPS.indexOf(id);
  if (idx > 0) {
    const prev = document.getElementById(STEPS[idx - 1]);
    if (prev) { prev.classList.remove('step-active'); prev.classList.add('step-done'); }
  }
  const el = document.getElementById(id);
  if (el) el.classList.add('step-active');
  await delay(ms);
}

// ─── Status Badge ─────────────────────────────────────────
function setStatusBadge(dotClass, label) {
  const badge = document.getElementById('statusBadge');
  if (!badge) return;
  badge.innerHTML = `<span class="sys-dot ${dotClass}"></span><span class="sys-label">${label}</span>`;
}

// ─── Bar Animation ────────────────────────────────────────
function animateBar(id, pct) {
  const el = document.getElementById(id);
  if (el) el.style.width = pct + '%';
}

// ─── Download ─────────────────────────────────────────────
function downloadResult(type) {
  const sampleId = document.getElementById('sampleId')?.value?.trim() || 'TCGA-UNKNOWN';
  const fileName = STATE.mode === 'patch'
    ? STATE.patchFile?.name || 'unknown.png'
    : STATE.wsiFile?.name   || 'unknown.svs';

  const mutConf = type === 'mutant'
    ? document.getElementById('mutantConfPct')?.textContent || '—'
    : document.getElementById('wtMutantPct')?.textContent   || '—';

  const wtConf = type === 'mutant'
    ? document.getElementById('mutantWtPct')?.textContent   || '—'
    : document.getElementById('wtConfPct')?.textContent     || '—';

  const elapsed = type === 'mutant'
    ? document.getElementById('mutantTime')?.textContent || '—'
    : document.getElementById('wtTime')?.textContent     || '—';

  const predClass = type === 'mutant' ? 'MUTANT' : 'WILDTYPE';
  const now = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });

  const w = document.getElementById('patchW')?.value || 224;
  const h = document.getElementById('patchH')?.value || 224;

  const content = [
    '════════════════════════════════════════════════════════════',
    '       DETEKSI LUAD — LAPORAN ANALISIS HISTOPATOLOGI        ',
    '       Sistem Identifikasi Mutasi Genetik TCGA-LUAD         ',
    '════════════════════════════════════════════════════════════',
    '',
    'INFORMASI SPESIMEN & ANALISIS',
    '────────────────────────────────────────────────────────────',
    `ID Analisis      : ${document.getElementById('analysisId')?.textContent || '—'}`,
    `ID Sampel        : ${sampleId}`,
    `File Input       : ${fileName}`,
    `Mode Input       : ${STATE.mode === 'wsi' ? 'Whole Slide Image (WSI)' : `Patch (${w}×${h} px)`}`,
    `Model Inferensi  : Swin-Transformer (Hierarchical Vision)`,
    `Dataset Referensi: TCGA-LUAD (Lung Adenocarcinoma)`,
    `Waktu Inferensi  : ${elapsed}`,
    `Waktu Pengujian  : ${now}`,
    '',
    'HASIL DIAGNOSTIK PREDIKSI',
    '────────────────────────────────────────────────────────────',
    `Hasil Klasifikasi: *** ${predClass} ***`,
    '',
    `Probabilitas Mutant   : ${mutConf}`,
    `Probabilitas Wildtype : ${wtConf}`,
    '',
    'INTERPRETASI PATOLOGI',
    '────────────────────────────────────────────────────────────',
    'MUTANT   : Terdeteksi pola arsitektur histologis yang',
    '           berasosiasi dengan mutasi genetik (KRAS/TP53).',
    'WILDTYPE : Tidak ditemukan pola mutasi, profil jaringan',
    '           berada dalam kategori alami / non-mutan.',
    '',
    '════════════════════════════════════════════════════════════',
    '  ⚠  CATATAN & PERINGATAN MEDIS                             ',
    '────────────────────────────────────────────────────────────',
    '  Hasil analisis ini merupakan komputasi model AI untuk     ',
    '  keperluan RISET DAN PENGEMBANGAN AKADEMIK. Bukan pengganti',
    '  diagnosis klinis resmi. Selalu konsultasikan dengan dokter',
    '  spesialis patologi anatomi yang kompeten.                 ',
    '════════════════════════════════════════════════════════════',
  ].join('\n');

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `DeteksiLUAD_${predClass}_${sampleId}_${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Utilities ────────────────────────────────────────────
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function fill(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024)         return bytes + ' B';
  if (bytes < 1024 ** 2)    return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 ** 3)    return (bytes / 1024 ** 2).toFixed(1) + ' MB';
  return (bytes / 1024 ** 3).toFixed(2) + ' GB';
}

function truncateFilename(name, maxLen) {
  if (!name || name.length <= maxLen) return name;
  const ext = name.lastIndexOf('.') > -1 ? name.slice(name.lastIndexOf('.')) : '';
  return name.slice(0, maxLen - ext.length - 3) + '...' + ext;
}
