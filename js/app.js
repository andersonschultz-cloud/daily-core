/**
 * Daily Core & Crédito — app.js v4.0
 * Obsidian Tech · Sicredi Identity · Edição in-place · LocalStorage · PNG Export · Import/Export
 *
 * CORREÇÕES v4.0:
 * - Paleta de cores migrada para Obsidian Tech (ciano, teal, dourado, slate)
 * - LS_KEY atualizado para v4 (evita conflito com cache antigo)
 * - Cores fallback atualizadas (rgba ciano)
 * - adicionarAnalista usa nova paleta
 * - getDemoData com corTema v4 e dataDaily
 * - Bug fix: ui.sort adicionado aos seletores
 */
(function () {
  'use strict';

  /* ══════════════════════════════════════
     CONSTANTES
  ══════════════════════════════════════ */
  const LS_KEY    = 'sicredi-daily-v4';
  const LS_THEME  = 'sicredi-daily-theme-v4';
  const LS_PHOTOS = 'sicredi-daily-photos-v4';
  const DATA_URL  = 'data/analistas.json';

  /* ══════════════════════════════════════
     ESTADO
  ══════════════════════════════════════ */
  const state = {
    dados:     null,
    analistas: [],
    filtrados: [],
    photos:    {},
    query:     '',
    sortBy:    'default',
    editMode:  false,
    theme:     'dark',
    saving:    false,
    exporting: false,
  };

  /* ══════════════════════════════════════
     SELETORES
  ══════════════════════════════════════ */
  const $ = (s) => document.querySelector(s);

  const ui = {
    titulo:       $('#js-titulo'),
    subtitulo:    $('#js-subtitulo'),
    descricao:    $('#js-descricao'),
    dataDaily:    $('#js-data-daily'),
    avatares:     $('#js-avatares'),
    grid:         $('#js-grid'),
    empty:        $('#js-empty'),
    search:       $('#js-search'),
    sort:         $('#js-sort'),
    themeBtn:     $('#js-toggle-theme'),
    themeIcon:    $('#js-theme-icon'),
    editBtn:      $('#js-toggle-edit'),
    addAnalista:  $('#js-add-analista'),
    saveBtn:      $('#js-save'),
    exportImg:    $('#js-export-img'),
    exportJson:   $('#js-export-json'),
    importInput:  $('#js-import-input'),
    shareBtn:     $('#js-share'),
    toast:        $('#js-toast'),
    loading:      $('#js-loading'),
    modal:        $('#js-modal'),
    modalMsg:     $('#js-modal-msg'),
    modalCancel:  $('#js-modal-cancel'),
    modalConfirm: $('#js-modal-confirm'),
    footerList:   $('#js-footer-list'),
    toolbar:      $('#js-toolbar'),
  };

  /* ══════════════════════════════════════
     INIT
  ══════════════════════════════════════ */
  async function init() {
    loadTheme();
    loadPhotos();
    await fetchDados();
    bindGlobalEvents();
    hideLoading();
  }

  /* ══════════════════════════════════════
     FETCH / LOAD
  ══════════════════════════════════════ */
  async function fetchDados() {
    // 1. LocalStorage tem prioridade
    const saved = localStorage.getItem(LS_KEY);
    if (saved) {
      try {
        state.dados = JSON.parse(saved);
        processarDados();
        return;
      } catch (_) { /* corrompido, carrega JSON */ }
    }
    // 2. JSON do servidor
    try {
      const res = await fetch(DATA_URL + '?_=' + Date.now());
      if (!res.ok) throw new Error('HTTP ' + res.status);
      state.dados = await res.json();
    } catch (_) {
      state.dados = getDemoData();
    }
    processarDados();
  }

  /* ══════════════════════════════════════
     PROCESSAR DADOS
  ══════════════════════════════════════ */
  function processarDados() {
    const d = state.dados;

    // Header
    ui.titulo.textContent    = d.titulo    || 'Principais Entregas da Semana';
    ui.subtitulo.textContent = d.subtitulo || 'Time Core & Crédito';
    ui.descricao.textContent = d.descricao || '';

    // Data Daily
    ui.dataDaily.textContent = d.dataDaily || getTodayFormatted();

    state.analistas = Array.isArray(d.analistas) ? d.analistas : [];
    state.filtrados = [...state.analistas];

    renderAvatares();
    renderCards();
    renderFooter();
  }

  /* ══════════════════════════════════════
     AVATARES
  ══════════════════════════════════════ */
  function renderAvatares() {
    ui.avatares.innerHTML = '';
    state.analistas.forEach((a) => {
      const chip = document.createElement('div');
      chip.className = 'avatar-chip';
      chip.setAttribute('role', 'listitem');

      const photo = state.photos[a.nome] || a.foto || null;
      const first = (a.nome || '').split(' ')[0];
      const inits = getInitials(a.nome);
      const cor   = a.corTema || '#00C2E0';

      chip.innerHTML = `
        ${photo
          ? `<img src="${photo}" alt="${escHtml(a.nome)}" loading="lazy"
               onerror="this.style.display='none';this.nextSibling.style.display='inline-flex'" />
             <span class="avatar-chip-initials" style="display:none;
               background:${cor}22;border:2px solid ${cor};
               color:${cor};font-size:10px;font-weight:800;">${inits}</span>`
          : `<span class="avatar-chip-initials" style="
               background:${cor}22;border:2px solid ${cor};
               color:${cor};font-size:10px;font-weight:800;">${inits}</span>`
        }
        <span class="avatar-name">${escHtml(first)}</span>`;

      ui.avatares.appendChild(chip);
    });
  }

  /* ══════════════════════════════════════
     RENDER CARDS
  ══════════════════════════════════════ */
  function renderCards() {
    ui.grid.innerHTML = '';

    if (state.filtrados.length === 0) {
      ui.empty.classList.remove('hidden');
      return;
    }
    ui.empty.classList.add('hidden');

    state.filtrados.forEach((a) => {
      const card = buildCard(a);
      ui.grid.appendChild(card);
    });

    if (state.editMode) applyEditStateToAll(true);
  }

  /* ══════════════════════════════════════
     BUILD CARD
  ══════════════════════════════════════ */
  function buildCard(a) {
    const cor      = a.corTema   || '#00C2E0';
    const cor22    = hexAlpha(cor, 0.22);
    const cor10    = hexAlpha(cor, 0.10);
    const inits    = getInitials(a.nome);
    const photo    = state.photos[a.nome] || a.foto || null;
    const tags     = Array.isArray(a.tags) ? a.tags : ['SRE', 'DevOps'];
    const badgeIco = a.badgeIcone || 'fa-solid fa-chart-line';
    const numE     = Array.isArray(a.entregas) ? a.entregas.length : 0;

    const card = document.createElement('article');
    card.className = 'analyst-card';
    card.setAttribute('role', 'listitem');
    card.setAttribute('aria-label', `Card de ${a.nome}`);
    card.dataset.nome = a.nome;
    card.style.setProperty('--tema-cor', cor);
    card.style.borderColor = cor22;

    /* Foto HTML */
    const fotoHTML = `
      <div class="card-photo-wrap" title="Clique para trocar foto">
        <div class="card-photo-ring"></div>
        ${photo
          ? `<img class="card-photo" src="${photo}" alt="${escHtml(a.nome)}" loading="lazy"
               onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" />
             <div class="card-photo-fallback" style="display:none;background:linear-gradient(135deg,${cor},${hexAlpha(cor,0.4)})">${inits}</div>`
          : `<div class="card-photo-fallback" style="background:linear-gradient(135deg,${cor},${hexAlpha(cor,0.4)})">${inits}</div>`
        }
        <div class="card-photo-overlay"><i class="fa-solid fa-camera"></i><span>Trocar</span></div>
        <input type="file" class="card-photo-input" accept="image/*" />
      </div>`;

    /* Tags HTML */
    const tagsHTML = tags.map(t =>
      `<span class="card-tag" style="color:${cor};border-color:${cor22};background:${cor10};">
         <i class="fa-solid fa-circle-dot" style="font-size:6px"></i>${escHtml(t)}
       </span>`
    ).join('');

    /* Entregas HTML */
    const entregasHTML = (Array.isArray(a.entregas) ? a.entregas : [])
      .map((e, i) => buildEntregaHTML(e, i, cor)).join('');

    card.innerHTML = `
      <div class="card-accent-line" style="background:linear-gradient(90deg,${cor},${hexAlpha(cor,0.4)})"></div>

      <button class="card-remove-btn" title="Remover analista" aria-label="Remover ${escHtml(a.nome)}">
        <i class="fa-solid fa-xmark"></i>
      </button>

      <div class="card-header">
        ${fotoHTML}
        <div class="card-info">
          <p class="card-name editable-field"
             contenteditable="false"
             data-field="nome"
             spellcheck="false"
             title="${escHtml(a.nome)}">${escHtml(a.nome)}</p>
          <p class="card-cargo editable-field"
             contenteditable="false"
             data-field="cargo"
             spellcheck="false">${escHtml(a.cargo || '')}</p>
          <div class="card-tags">${tagsHTML}</div>
        </div>
      </div>

      ${a.badgeNumero ? `
      <div class="card-badge">
        <div class="badge-icon" style="background:linear-gradient(135deg,${cor},${hexAlpha(cor,0.6)})">
          <i class="${escHtml(badgeIco)}"></i>
        </div>
        <div>
          <div class="badge-number editable-field"
               contenteditable="false"
               data-field="badgeNumero"
               spellcheck="false">${escHtml(a.badgeNumero)}</div>
          <div class="badge-text editable-field"
               contenteditable="false"
               data-field="badgeTexto"
               spellcheck="false">${escHtml(a.badgeTexto || '')}</div>
        </div>
      </div>` : ''}

      <div class="card-entregas-header">
        <p class="card-entregas-title">
          <i class="fa-solid fa-circle-check"></i>
          Principais Entregas
        </p>
        <span class="entregas-count">${numE}</span>
      </div>

      <button class="card-add-entrega" type="button">
        <i class="fa-solid fa-plus"></i> Adicionar entrega
      </button>

      <ul class="card-entregas">${entregasHTML}</ul>
    `;

    bindCardEvents(card, a);
    return card;
  }

  function buildEntregaHTML(texto, idx, cor) {
    return `
      <li class="entrega-item" data-idx="${idx}">
        <span class="bullet" style="background:${cor};box-shadow:0 0 5px ${hexAlpha(cor,0.55)};"></span>
        <span class="entrega-text"
              contenteditable="false"
              data-idx="${idx}"
              spellcheck="false">${escHtml(texto)}</span>
        <button class="entrega-remove" type="button" data-idx="${idx}" title="Remover entrega" aria-label="Remover entrega">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </li>`;
  }

  /* ══════════════════════════════════════
     EVENTOS DO CARD
  ══════════════════════════════════════ */
  function bindCardEvents(card, analista) {
    const photoWrap  = card.querySelector('.card-photo-wrap');
    const photoInput = card.querySelector('.card-photo-input');

    photoWrap.addEventListener('click', () => {
      if (state.editMode) photoInput.click();
    });

    photoInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl   = ev.target.result;
        const nomeAtual = card.dataset.nome;
        state.photos[nomeAtual] = dataUrl;
        savePhotos();

        let img = card.querySelector('.card-photo');
        const fallback = card.querySelector('.card-photo-fallback');
        if (img) {
          img.src = dataUrl;
          img.style.display = '';
          if (fallback) fallback.style.display = 'none';
        } else if (fallback) {
          img = document.createElement('img');
          img.className = 'card-photo';
          img.src = dataUrl;
          img.alt = nomeAtual;
          img.loading = 'lazy';
          fallback.parentNode.insertBefore(img, fallback);
          fallback.style.display = 'none';
        }
        renderAvatares();
        showToast('📸 Foto atualizada com sucesso!');
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    });

    card.querySelector('.card-remove-btn').addEventListener('click', () => {
      const nomeAtual = card.dataset.nome;
      confirmDialog(
        `Remover o analista <strong>${escHtml(nomeAtual)}</strong>?`,
        () => {
          state.analistas = state.analistas.filter(a => a.nome !== nomeAtual);
          state.filtrados = state.filtrados.filter(a => a.nome !== nomeAtual);
          state.dados.analistas = state.analistas;
          card.style.animation = 'cardOut 0.28s ease forwards';
          setTimeout(() => {
            renderCards();
            renderAvatares();
            showToast('🗑️ Analista removido.');
          }, 290);
        }
      );
    });

    card.querySelector('.card-add-entrega').addEventListener('click', () => {
      const nomeAtual = card.dataset.nome;
      const a = getByNome(nomeAtual);
      if (!a) return;
      if (!Array.isArray(a.entregas)) a.entregas = [];
      const newText = 'Nova entrega — clique para editar';
      a.entregas.push(newText);

      const ul  = card.querySelector('.card-entregas');
      const idx = a.entregas.length - 1;
      const cor = a.corTema || '#00C2E0';
      ul.insertAdjacentHTML('beforeend', buildEntregaHTML(newText, idx, cor));
      bindEntregaEvents(card, a);
      updateEntregasCount(card, a);
      applyEditStateToCard(card, true);

      const newEl = ul.querySelector(`.entrega-text[data-idx="${idx}"]`);
      if (newEl) { newEl.focus(); selectAll(newEl); }
      showToast('✅ Entrega adicionada!');
    });

    card.querySelectorAll('.editable-field').forEach(el => {
      el.addEventListener('blur', () => syncField(el, card));
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); el.blur(); }
      });
    });

    bindEntregaEvents(card, analista);
  }

  function bindEntregaEvents(card, analista) {
    card.querySelectorAll('.entrega-remove').forEach(btn => {
      const nb = btn.cloneNode(true);
      btn.parentNode.replaceChild(nb, btn);
      nb.addEventListener('click', () => {
        const nomeAtual = card.dataset.nome;
        const a = getByNome(nomeAtual);
        if (!a) return;
        const idx = parseInt(nb.dataset.idx, 10);
        a.entregas.splice(idx, 1);
        reRenderEntregas(card, a);
        showToast('🗑️ Entrega removida.');
      });
    });

    card.querySelectorAll('.entrega-text').forEach(el => {
      const ne = el.cloneNode(true);
      el.parentNode.replaceChild(ne, el);
      ne.addEventListener('blur', () => {
        const nomeAtual = card.dataset.nome;
        const a = getByNome(nomeAtual);
        if (!a) return;
        const idx = parseInt(ne.dataset.idx, 10);
        const txt = ne.textContent.trim();
        if (txt) a.entregas[idx] = txt;
        updateEntregasCount(card, a);
      });
      ne.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ne.blur(); }
      });
      if (state.editMode) ne.contentEditable = 'true';
    });
  }

  function reRenderEntregas(card, a) {
    const ul  = card.querySelector('.card-entregas');
    const cor = a.corTema || '#00C2E0';
    if (!ul) return;
    ul.innerHTML = (a.entregas || []).map((e, i) => buildEntregaHTML(e, i, cor)).join('');
    bindEntregaEvents(card, a);
    updateEntregasCount(card, a);
    applyEditStateToCard(card, state.editMode);
  }

  function updateEntregasCount(card, a) {
    const ct = card.querySelector('.entregas-count');
    if (ct) ct.textContent = (a.entregas || []).length;
  }

  function syncField(el, card) {
    const field     = el.dataset.field;
    const nomeAtual = card.dataset.nome;
    if (!field || !nomeAtual) return;
    const a = getByNome(nomeAtual);
    if (!a) return;
    const val = el.textContent.trim();
    if (!val) return;

    if (field === 'nome' && val !== nomeAtual) {
      if (state.photos[nomeAtual]) {
        state.photos[val] = state.photos[nomeAtual];
        delete state.photos[nomeAtual];
        savePhotos();
      }
      a.nome = val;
      card.dataset.nome = val;
      card.querySelectorAll('[data-nome]').forEach(sub => sub.dataset.nome = val);
    } else {
      a[field] = val;
    }
  }

  /* ══════════════════════════════════════
     FOOTER
  ══════════════════════════════════════ */
  function renderFooter() {
    const destaques = Array.isArray(state.dados.destaques) ? state.dados.destaques : [];
    const icons = [
      'fa-solid fa-eye',
      'fa-solid fa-shield-halved',
      'fa-solid fa-gears',
      'fa-solid fa-handshake',
      'fa-solid fa-triangle-exclamation',
    ];
    ui.footerList.innerHTML = destaques.map((d, i) => `
      <li><i class="${icons[i % icons.length]}"></i>${escHtml(d)}</li>`
    ).join('');
  }

  /* ══════════════════════════════════════
     MODO EDIÇÃO
  ══════════════════════════════════════ */
  function toggleEditMode() {
    state.editMode = !state.editMode;
    document.body.classList.toggle('edit-mode', state.editMode);

    ui.editBtn.classList.toggle('active', state.editMode);
    ui.editBtn.querySelector('.btn-label').textContent =
      state.editMode ? 'Sair Edição' : 'Editar';

    document.querySelectorAll('.edit-only').forEach(el =>
      el.classList.toggle('hidden', !state.editMode)
    );

    const headerFields = [ui.titulo, ui.subtitulo, ui.descricao, ui.dataDaily];
    headerFields.forEach(el => {
      if (el) el.contentEditable = state.editMode ? 'true' : 'false';
    });

    applyEditStateToAll(state.editMode);

    showToast(
      state.editMode
        ? '✏️ Modo edição ativado — clique nos textos para editar.'
        : '👁️ Modo visualização ativado.'
    );
  }

  function applyEditStateToAll(enabled) {
    document.querySelectorAll('.editable-field, .entrega-text').forEach(el => {
      el.contentEditable = enabled ? 'true' : 'false';
    });
  }

  function applyEditStateToCard(card, enabled) {
    card.querySelectorAll('.editable-field, .entrega-text').forEach(el => {
      el.contentEditable = enabled ? 'true' : 'false';
    });
  }

  /* ══════════════════════════════════════
     SALVAR
  ══════════════════════════════════════ */
  function salvar() {
    if (state.saving) return;
    state.saving = true;

    const d = state.dados;
    d.titulo    = ui.titulo.textContent.trim()    || d.titulo;
    d.subtitulo = ui.subtitulo.textContent.trim() || d.subtitulo;
    d.descricao = ui.descricao.textContent.trim() || d.descricao;
    d.dataDaily = ui.dataDaily.textContent.trim() || d.dataDaily;
    d.analistas = state.analistas;

    try {
      localStorage.setItem(LS_KEY, JSON.stringify(d));
      savePhotos();
      showToast('💾 Dados salvos com sucesso!');
    } catch (e) {
      showToast('⚠️ Erro ao salvar — armazenamento cheio?');
      console.error('Erro ao salvar:', e);
    }

    setTimeout(() => { state.saving = false; }, 1000);
  }

  /* ══════════════════════════════════════
     FOTOS
  ══════════════════════════════════════ */
  function savePhotos() {
    try {
      localStorage.setItem(LS_PHOTOS, JSON.stringify(state.photos));
    } catch (e) {
      console.warn('Fotos grandes demais para LocalStorage:', e);
    }
  }
  function loadPhotos() {
    try {
      const s = localStorage.getItem(LS_PHOTOS);
      if (s) state.photos = JSON.parse(s);
    } catch (_) {}
  }

  /* ══════════════════════════════════════
     EXPORTAR IMAGEM
  ══════════════════════════════════════ */
  async function exportarImagem() {
    if (state.exporting) return;
    state.exporting = true;

    const btn = ui.exportImg;
    const originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    showToast('⏳ Gerando imagem... aguarde.');

    const wasEditing = state.editMode;
    if (wasEditing) {
      document.body.classList.remove('edit-mode');
      applyEditStateToAll(false);
    }

    ui.toolbar.style.setProperty('display', 'none', 'important');
    await sleep(120);

    try {
      const docEl  = document.documentElement;
      const totalH = Math.max(
        document.body.scrollHeight, document.body.offsetHeight,
        docEl.scrollHeight, docEl.offsetHeight
      );
      const totalW = Math.max(
        document.body.scrollWidth, docEl.scrollWidth, docEl.clientWidth
      );

      const bgColor = getComputedStyle(document.body).backgroundColor || '#04070D';

      const canvas = await html2canvas(document.body, {
        scale:           2,
        useCORS:         true,
        allowTaint:      true,
        backgroundColor: bgColor,
        scrollX: 0, scrollY: 0,
        x: 0, y: 0,
        width:        totalW,
        height:       totalH,
        windowWidth:  totalW,
        windowHeight: totalH,
        logging:         false,
        removeContainer: true,
        imageTimeout:    8000,
        onclone: (clonedDoc) => {
          const tb = clonedDoc.getElementById('js-toolbar');
          if (tb) tb.style.display = 'none';
          clonedDoc.querySelectorAll('.analyst-card').forEach(c => {
            c.style.animation = 'none';
            c.style.opacity   = '1';
            c.style.transform = 'none';
          });
        }
      });

      const link    = document.createElement('a');
      link.download = `Daily-Core-Credito-${getSemana()}.png`;
      link.href     = canvas.toDataURL('image/png', 1.0);
      link.click();
      showToast('🖼️ Imagem gerada com sucesso!');
    } catch (err) {
      console.error('Erro ao gerar imagem:', err);
      showToast('❌ Erro ao gerar imagem. Tente novamente.');
    } finally {
      ui.toolbar.style.removeProperty('display');
      if (wasEditing) {
        document.body.classList.add('edit-mode');
        applyEditStateToAll(true);
      }
      btn.disabled = false;
      btn.innerHTML = originalHTML;
      state.exporting = false;
    }
  }

  /* ══════════════════════════════════════
     EXPORTAR JSON
  ══════════════════════════════════════ */
  function exportarJSON() {
    const d = { ...state.dados };
    d.titulo    = ui.titulo.textContent.trim()    || d.titulo;
    d.subtitulo = ui.subtitulo.textContent.trim() || d.subtitulo;
    d.descricao = ui.descricao.textContent.trim() || d.descricao;
    d.dataDaily = ui.dataDaily.textContent.trim() || d.dataDaily;
    d.analistas = state.analistas;
    d._photos   = state.photos;

    const json = JSON.stringify(d, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href     = url;
    link.download = `dados-daily-${getSemana()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('📦 Dados exportados com sucesso!');
  }

  /* ══════════════════════════════════════
     IMPORTAR JSON
  ══════════════════════════════════════ */
  function importarJSON(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (imported._photos && typeof imported._photos === 'object') {
          state.photos = imported._photos;
          delete imported._photos;
          savePhotos();
        }
        state.dados = imported;
        try { localStorage.setItem(LS_KEY, JSON.stringify(imported)); } catch (_) {}
        processarDados();
        showToast('✅ Dados importados com sucesso!');
      } catch (_) {
        showToast('❌ Arquivo inválido — verifique o JSON.');
      }
    };
    reader.readAsText(file);
  }

  /* ══════════════════════════════════════
     ADICIONAR ANALISTA
  ══════════════════════════════════════ */
  function adicionarAnalista() {
    // Paleta Obsidian Tech v4
    const cores = ['#00C2E0', '#14DEC8', '#E2B842', '#8EA3BC', '#33D2EE'];
    const cor   = cores[state.analistas.length % cores.length];
    const novo  = {
      nome:        'Novo Analista',
      cargo:       'Analista SRE e DevOps',
      foto:        '',
      badgeNumero: '0',
      badgeTexto:  'entregas esta semana',
      badgeIcone:  'fa-solid fa-chart-line',
      corTema:     cor,
      tags:        ['SRE', 'DevOps'],
      entregas:    ['Clique para editar esta entrega'],
    };
    state.analistas.push(novo);
    state.dados.analistas = state.analistas;
    filtrarEOrdenar();
    renderAvatares();

    setTimeout(() => {
      const cards = ui.grid.querySelectorAll('.analyst-card');
      if (cards.length) {
        cards[cards.length - 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 200);
    showToast('👤 Analista adicionado! Edite os campos.');
  }

  /* ══════════════════════════════════════
     FILTRAR E ORDENAR
  ══════════════════════════════════════ */
  function filtrarEOrdenar() {
    let lista = [...state.analistas];
    const q   = state.query;

    if (q) {
      lista = lista.filter(a =>
        (a.nome || '').toLowerCase().includes(q) ||
        (a.cargo || '').toLowerCase().includes(q) ||
        (a.entregas || []).some(e => e.toLowerCase().includes(q))
      );
    }

    switch (state.sortBy) {
      case 'nome':
        lista.sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR')); break;
      case 'cargo':
        lista.sort((a, b) => (a.cargo || '').localeCompare(b.cargo || '', 'pt-BR')); break;
      case 'entregas':
        lista.sort((a, b) => (b.entregas || []).length - (a.entregas || []).length); break;
    }

    state.filtrados = lista;
    renderCards();
  }

  /* ══════════════════════════════════════
     GERAR LINK
  ══════════════════════════════════════ */
  function gerarLink() {
    try {
      const payload = {
        titulo:    ui.titulo.textContent.trim(),
        subtitulo: ui.subtitulo.textContent.trim(),
        semana:    getSemana(),
        membros:   state.analistas.map(a => a.nome),
      };
      const encoded = btoa(encodeURIComponent(JSON.stringify(payload)));
      const url     = `${location.origin}${location.pathname}?ref=${encoded}`;

      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(url)
          .then(() => showToast('🔗 Link copiado para a área de transferência!'));
      } else {
        fallbackCopy(url);
        showToast('🔗 Link copiado!');
      }
    } catch (_) {
      showToast('❌ Não foi possível gerar o link.');
    }
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0;';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (_) {}
    document.body.removeChild(ta);
  }

  /* ══════════════════════════════════════
     TEMA
  ══════════════════════════════════════ */
  function loadTheme() {
    applyTheme(localStorage.getItem(LS_THEME) || 'dark');
  }
  function toggleTheme() {
    applyTheme(state.theme === 'dark' ? 'light' : 'dark');
    localStorage.setItem(LS_THEME, state.theme);
  }
  function applyTheme(t) {
    state.theme = t;
    document.documentElement.setAttribute('data-theme', t);
    if (ui.themeIcon) {
      ui.themeIcon.className = t === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    }
  }

  /* ══════════════════════════════════════
     TOAST
  ══════════════════════════════════════ */
  let toastTimer = null;
  function showToast(msg, dur = 3800) {
    ui.toast.innerHTML = msg;
    ui.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => ui.toast.classList.remove('show'), dur);
  }

  /* ══════════════════════════════════════
     MODAL
  ══════════════════════════════════════ */
  let _confirmCb = null;
  function confirmDialog(msg, cb) {
    ui.modalMsg.innerHTML = msg;
    ui.modal.classList.remove('hidden');
    _confirmCb = cb;
  }

  /* ══════════════════════════════════════
     LOADING
  ══════════════════════════════════════ */
  function hideLoading() {
    setTimeout(() => ui.loading.classList.add('hidden'), 500);
  }

  /* ══════════════════════════════════════
     BIND GLOBAL EVENTS
  ══════════════════════════════════════ */
  function bindGlobalEvents() {
    ui.search.addEventListener('input', (e) => {
      state.query = e.target.value.toLowerCase().trim();
      filtrarEOrdenar();
    });

    ui.sort.addEventListener('change', (e) => {
      state.sortBy = e.target.value;
      filtrarEOrdenar();
    });

    ui.themeBtn.addEventListener('click', toggleTheme);
    ui.editBtn.addEventListener('click', toggleEditMode);
    ui.addAnalista.addEventListener('click', adicionarAnalista);
    ui.saveBtn.addEventListener('click', salvar);
    ui.exportImg.addEventListener('click', exportarImagem);
    ui.exportJson.addEventListener('click', exportarJSON);

    ui.importInput.addEventListener('change', (e) => {
      importarJSON(e.target.files[0]);
      e.target.value = '';
    });

    ui.shareBtn.addEventListener('click', gerarLink);

    ui.modalCancel.addEventListener('click', () => {
      ui.modal.classList.add('hidden');
      _confirmCb = null;
    });
    ui.modalConfirm.addEventListener('click', () => {
      if (typeof _confirmCb === 'function') _confirmCb();
      ui.modal.classList.add('hidden');
      _confirmCb = null;
    });
    ui.modal.addEventListener('click', (e) => {
      if (e.target === ui.modal) ui.modal.classList.add('hidden');
    });

    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (state.editMode) salvar();
      }
      if (e.key === 'Escape' && state.editMode) toggleEditMode();
    });

    [ui.titulo, ui.subtitulo, ui.descricao, ui.dataDaily].forEach(el => {
      if (!el) return;
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); el.blur(); }
      });
    });
  }

  /* ══════════════════════════════════════
     UTILS
  ══════════════════════════════════════ */
  function getByNome(nome) {
    return state.analistas.find(a => a.nome === nome) || null;
  }

  function getInitials(nome) {
    if (!nome) return '?';
    const parts = nome.trim().split(/\s+/);
    return parts.length === 1
      ? parts[0][0].toUpperCase()
      : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function hexAlpha(hex, alpha) {
    const c = hex.replace('#', '');
    if (c.length < 6) return `rgba(0,194,224,${alpha})`;
    const r = parseInt(c.slice(0,2), 16);
    const g = parseInt(c.slice(2,4), 16);
    const b = parseInt(c.slice(4,6), 16);
    if (isNaN(r+g+b)) return `rgba(0,194,224,${alpha})`;
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function escHtml(str) {
    return String(str || '')
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;');
  }

  function getSemana() {
    const n = new Date();
    const s = new Date(n.getFullYear(), 0, 1);
    const w = Math.ceil(((n - s) / 86400000 + s.getDay() + 1) / 7);
    return `${n.getFullYear()}-W${String(w).padStart(2, '0')}`;
  }

  function getTodayFormatted() {
    const d = new Date();
    return d.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric' });
  }

  function selectAll(el) {
    const r = document.createRange();
    r.selectNodeContents(el);
    const s = window.getSelection();
    s.removeAllRanges(); s.addRange(r);
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /* ══════════════════════════════════════
     DADOS DEMO (fallback)
  ══════════════════════════════════════ */
  function getDemoData() {
    return {
      titulo:    'Principais Entregas da Semana',
      subtitulo: 'Time Core & Crédito',
      descricao: 'Resultados, melhorias operacionais, estabilidade e evolução contínua dos ambientes.',
      dataDaily: getTodayFormatted(),
      destaques: [
        'Evolução da observabilidade dos ambientes',
        'Aumento da estabilidade operacional',
        'Modernização de ferramentas e processos',
        'Suporte contínuo às entregas de negócio',
        'Atuação preventiva — reduzindo riscos e incidentes',
      ],
      analistas: [
        {
          nome: 'Anderson Schultz Ribeiro', cargo: 'Analista SRE e DevOps PL',
          foto: 'assets/fotos/anderson.jpg', badgeNumero: '55+',
          badgeTexto: 'novos hosts no Promtail', badgeIcone: 'fa-solid fa-server',
          corTema: '#00C2E0', tags: ['SRE', 'DevOps'],
          entregas: ['Liderança técnica do Programa Desenrola Brasil 2.0.', 'Expansão da observabilidade: 55 novos hosts no Promtail.'],
        },
        {
          nome: 'Diego Gonçalves de Oliveira', cargo: 'Analista SRE e DevOps SR',
          foto: 'assets/fotos/diego.jpg', badgeNumero: '24/7',
          badgeTexto: 'suporte contínuo aos times', badgeIcone: 'fa-solid fa-headset',
          corTema: '#14DEC8', tags: ['SRE', 'DevOps'],
          entregas: ['Atualização dos agentes de deploy em homologação.', 'Evolução do ambiente Hoverfly na nova stack.'],
        },
        {
          nome: 'Gilson Batista da Silva Souza', cargo: 'Analista SRE e DevOps SR',
          foto: 'assets/fotos/gilson.jpg', badgeNumero: '3',
          badgeTexto: 'ambientes em análise de desativação', badgeIcone: 'fa-solid fa-database',
          corTema: '#8EA3BC', tags: ['SRE', 'DevOps'],
          entregas: ['Análise de desativação dos ambientes UCMDB, SOASCOM e WEBDB.', 'Disponibilização da planilha de controle PAM.'],
        },
        {
          nome: 'Matheus da Silva de Farias', cargo: 'Analista SRE e DevOps JR',
          foto: 'assets/fotos/matheus.jpg', badgeNumero: '100%',
          badgeTexto: 'revisão diária dos ambientes', badgeIcone: 'fa-solid fa-shield-halved',
          corTema: '#E2B842', tags: ['SRE', 'DevOps'],
          entregas: ['Instalação e configuração do Dynatrace no ambiente Gesgara.', 'Revisão diária dos ambientes Core & Crédito.'],
        },
      ],
    };
  }

  /* ══════════════════════════════════════
     START
  ══════════════════════════════════════ */
  document.addEventListener('DOMContentLoaded', init);

})();
