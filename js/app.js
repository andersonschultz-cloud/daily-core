/**
 * Daily Core & Crédito — app.js v2.0
 * Sicredi Identity · Edição in-place · LocalStorage · Imagem · Import/Export
 */
(function () {
  'use strict';

  /* ============================================================
     CONSTANTES
  ============================================================ */
  const LS_KEY    = 'daily-core-dados-v2';
  const LS_THEME  = 'daily-core-theme';
  const LS_PHOTOS = 'daily-core-photos-v2';

  /* ============================================================
     ESTADO
  ============================================================ */
  const state = {
    dados:     null,
    analistas: [],
    filtrados: [],
    photos:    {},      // { nome: dataURL }
    query:     '',
    sortBy:    'default',
    editMode:  false,
    theme:     'dark',
  };

  /* ============================================================
     SELETORES
  ============================================================ */
  const $ = (s) => document.querySelector(s);
  const ui = {
    titulo:      $('#js-titulo'),
    subtitulo:   $('#js-subtitulo'),
    descricao:   $('#js-descricao'),
    avatares:    $('#js-avatares'),
    grid:        $('#js-grid'),
    empty:       $('#js-empty'),
    search:      $('#js-search'),
    sort:        $('#js-sort'),
    themeBtn:    $('#js-toggle-theme'),
    themeIcon:   $('#js-theme-icon'),
    editBtn:     $('#js-toggle-edit'),
    addAnalista: $('#js-add-analista'),
    saveBtn:     $('#js-save'),
    exportImg:   $('#js-export-img'),
    exportJson:  $('#js-export-json'),
    importInput: $('#js-import-input'),
    shareBtn:    $('#js-share'),
    toast:       $('#js-toast'),
    loading:     $('#js-loading'),
    modal:       $('#js-modal'),
    modalMsg:    $('#js-modal-msg'),
    modalCancel: $('#js-modal-cancel'),
    modalConfirm:$('#js-modal-confirm'),
    footerList:  $('#js-footer-list'),
  };

  /* ============================================================
     INIT
  ============================================================ */
  async function init() {
    loadTheme();
    loadPhotos();
    await fetchDados();
    bindEvents();
    hideLoading();
  }

  /* ============================================================
     FETCH / LOAD DADOS
  ============================================================ */
  async function fetchDados() {
    // 1) Tenta LocalStorage
    const saved = localStorage.getItem(LS_KEY);
    if (saved) {
      try {
        state.dados = JSON.parse(saved);
        processarDados();
        return;
      } catch (_) {}
    }
    // 2) Tenta JSON do servidor
    try {
      const res = await fetch('data/analistas.json?v=' + Date.now());
      if (!res.ok) throw new Error('HTTP ' + res.status);
      state.dados = await res.json();
    } catch (_) {
      state.dados = getDemoData();
    }
    processarDados();
  }

  /* ============================================================
     PROCESSAR DADOS
  ============================================================ */
  function processarDados() {
    const d = state.dados;
    ui.titulo.textContent    = d.titulo    || '';
    ui.subtitulo.textContent = d.subtitulo || '';
    ui.descricao.textContent = d.descricao || '';

    state.analistas = d.analistas || [];
    state.filtrados = [...state.analistas];

    renderAvatares();
    renderCards();
    renderFooter();
  }

  /* ============================================================
     AVATARES
  ============================================================ */
  function renderAvatares() {
    ui.avatares.innerHTML = '';
    state.analistas.forEach((a) => {
      const chip = document.createElement('div');
      chip.className = 'avatar-chip';
      chip.setAttribute('role', 'listitem');
      const photo = state.photos[a.nome];
      const primeiroNome = a.nome.split(' ')[0];
      chip.innerHTML = `
        ${photo
          ? `<img src="${photo}" alt="${a.nome}" />`
          : `<span style="
              display:inline-flex;width:30px;height:30px;border-radius:50%;
              background:${a.corTema||'#3FAE2A'}22;
              border:2px solid ${a.corTema||'#3FAE2A'};
              align-items:center;justify-content:center;
              font-size:10px;font-weight:800;color:${a.corTema||'#3FAE2A'};
             ">${getInitials(a.nome)}</span>`
        }
        <span>${primeiroNome}</span>`;
      ui.avatares.appendChild(chip);
    });
  }

  /* ============================================================
     RENDER CARDS
  ============================================================ */
  function renderCards() {
    ui.grid.innerHTML = '';
    if (state.filtrados.length === 0) {
      ui.empty.classList.remove('hidden'); return;
    }
    ui.empty.classList.add('hidden');
    state.filtrados.forEach((a) => {
      ui.grid.appendChild(buildCard(a));
    });
  }

  function buildCard(a) {
    const cor     = a.corTema || '#3FAE2A';
    const cor22   = hexToRgba(cor, 0.22);
    const cor10   = hexToRgba(cor, 0.10);
    const initials = getInitials(a.nome);
    const photo   = state.photos[a.nome] || a.foto || null;
    const tags    = a.tags || ['SRE','DevOps'];
    const badge   = a.badgeIcone || 'fa-solid fa-chart-line';
    const numE    = (a.entregas || []).length;

    const card = document.createElement('article');
    card.className = 'analyst-card';
    card.setAttribute('role', 'listitem');
    card.dataset.nome = a.nome;
    card.style.setProperty('--tema-cor', cor);
    card.style.borderColor = cor22;

    /* --- FOTO HTML --- */
    const fotoHtml = `
      <div class="card-photo-wrap" data-nome="${a.nome}" title="${state.editMode ? 'Clique para trocar foto' : ''}">
        <div class="card-photo-ring"></div>
        ${photo
          ? `<img class="card-photo" src="${photo}" alt="${a.nome}" loading="lazy"
               onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" />
             <div class="card-photo-fallback" style="display:none">${initials}</div>`
          : `<div class="card-photo-fallback">${initials}</div>`
        }
        <div class="card-photo-overlay"><i class="fa-solid fa-camera"></i>Trocar</div>
        <input type="file" class="card-photo-input" accept="image/*" data-nome="${a.nome}" />
      </div>`;

    /* --- TAGS HTML --- */
    const tagsHtml = tags.map(t => `
      <span class="card-tag" style="color:${cor};border-color:${cor22};background:${cor10};">
        <i class="fa-solid fa-circle-dot" style="font-size:6px"></i>${t}
      </span>`).join('');

    /* --- ENTREGAS HTML --- */
    const entregasHtml = (a.entregas || []).map((e, i) => buildEntregaItem(e, i, cor)).join('');

    card.innerHTML = `
      <!-- Remover card -->
      <button class="card-remove-btn" data-nome="${a.nome}" title="Remover analista">
        <i class="fa-solid fa-xmark"></i>
      </button>

      <!-- Header -->
      <div class="card-header">
        ${fotoHtml}
        <div class="card-info">
          <p class="card-name editable-field" contenteditable="false"
             data-field="nome" data-nome="${a.nome}">${a.nome}</p>
          <p class="card-cargo editable-field" contenteditable="false"
             data-field="cargo" data-nome="${a.nome}">${a.cargo || ''}</p>
          <div class="card-tags">${tagsHtml}</div>
        </div>
      </div>

      <!-- Badge -->
      ${a.badgeNumero ? `
      <div class="card-badge">
        <div class="badge-icon"><i class="${badge}"></i></div>
        <div>
          <div class="badge-number editable-field" contenteditable="false"
               data-field="badgeNumero" data-nome="${a.nome}">${a.badgeNumero}</div>
          <div class="badge-text editable-field" contenteditable="false"
               data-field="badgeTexto" data-nome="${a.nome}">${a.badgeTexto || ''}</div>
        </div>
      </div>` : ''}

      <!-- Entregas header -->
      <div class="card-entregas-header">
        <p class="card-entregas-title">
          <i class="fa-solid fa-check-circle"></i>
          Principais Entregas
        </p>
        <span class="entregas-count">${numE}</span>
      </div>

      <!-- Botão add entrega -->
      <button class="card-add-entrega" data-nome="${a.nome}">
        <i class="fa-solid fa-plus"></i> Adicionar entrega
      </button>

      <!-- Lista entregas -->
      <ul class="card-entregas" data-nome="${a.nome}">${entregasHtml}</ul>
    `;

    // Eventos do card
    bindCardEvents(card, a);

    return card;
  }

  function buildEntregaItem(texto, idx, cor) {
    return `
      <li class="entrega-item" data-idx="${idx}">
        <span class="bullet" style="background:${cor};box-shadow:0 0 5px ${cor};"></span>
        <span class="entrega-text" contenteditable="false"
              data-idx="${idx}">${sanitize(texto)}</span>
        <button class="entrega-remove" data-idx="${idx}" title="Remover entrega">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </li>`;
  }

  /* ============================================================
     EVENTOS DO CARD
  ============================================================ */
  function bindCardEvents(card, analista) {
    const nome = analista.nome;

    /* Troca de foto */
    const wrap = card.querySelector('.card-photo-wrap');
    const fileInput = card.querySelector('.card-photo-input');
    if (wrap) {
      wrap.addEventListener('click', () => {
        if (state.editMode) fileInput.click();
      });
    }
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          state.photos[nome] = ev.target.result;
          savePhotos();
          // Atualizar foto no card
          const existingImg = card.querySelector('.card-photo');
          const fallback = card.querySelector('.card-photo-fallback');
          if (existingImg) {
            existingImg.src = ev.target.result;
            existingImg.style.display = '';
            if (fallback) fallback.style.display = 'none';
          } else if (fallback) {
            const img = document.createElement('img');
            img.className = 'card-photo';
            img.src = ev.target.result;
            img.alt = nome;
            fallback.parentNode.insertBefore(img, fallback);
            fallback.style.display = 'none';
          }
          renderAvatares();
          showToast('📸 Foto atualizada!');
        };
        reader.readAsDataURL(file);
      });
    }

    /* Remover analista */
    const removeBtn = card.querySelector('.card-remove-btn');
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        confirm_('Remover o analista <strong>' + nome + '</strong>?', () => {
          state.analistas = state.analistas.filter(a => a.nome !== nome);
          state.dados.analistas = state.analistas;
          filtrarEOrdenar();
          renderAvatares();
          showToast('🗑️ Analista removido.');
        });
      });
    }

    /* Adicionar entrega */
    const addBtn = card.querySelector('.card-add-entrega');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const a = getAnalistaPorNome(nome);
        if (!a) return;
        a.entregas = a.entregas || [];
        a.entregas.push('Nova entrega — clique para editar');
        const ul = card.querySelector('.card-entregas');
        const idx = a.entregas.length - 1;
        ul.insertAdjacentHTML('beforeend', buildEntregaItem(a.entregas[idx], idx, a.corTema || '#3FAE2A'));
        // Bind nos novos itens
        bindEntregaEvents(card, a);
        updateEntregasCount(card, a);
        setEditableState(card, true);
        // Foco no novo item
        const newItem = ul.querySelector(`.entrega-text[data-idx="${idx}"]`);
        if (newItem) { newItem.focus(); selectAllContent(newItem); }
        showToast('✅ Entrega adicionada!');
      });
    }

    /* Entregas: remover e editar */
    bindEntregaEvents(card, analista);

    /* Campos editáveis */
    card.querySelectorAll('.editable-field').forEach(el => {
      el.addEventListener('blur', () => syncFieldToState(el, nome));
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); el.blur(); }
      });
    });
  }

  function bindEntregaEvents(card, analista) {
    const nome = analista.nome;
    card.querySelectorAll('.entrega-remove').forEach(btn => {
      // Remove listener antigo clonando
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
      newBtn.addEventListener('click', () => {
        const idx = parseInt(newBtn.dataset.idx);
        const a = getAnalistaPorNome(nome);
        if (!a) return;
        a.entregas.splice(idx, 1);
        // Re-renderizar apenas a lista
        reRenderEntregas(card, a);
        showToast('🗑️ Entrega removida.');
      });
    });

    card.querySelectorAll('.entrega-text').forEach(el => {
      const newEl = el.cloneNode(true);
      el.parentNode.replaceChild(newEl, el);
      newEl.addEventListener('blur', () => {
        const idx = parseInt(newEl.dataset.idx);
        const a = getAnalistaPorNome(nome);
        if (!a) return;
        a.entregas[idx] = newEl.textContent.trim() || a.entregas[idx];
        updateEntregasCount(card, a);
      });
      newEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); newEl.blur(); }
      });
      if (state.editMode) newEl.contentEditable = 'true';
    });
  }

  function reRenderEntregas(card, a) {
    const ul = card.querySelector('.card-entregas');
    if (!ul) return;
    ul.innerHTML = (a.entregas || []).map((e, i) =>
      buildEntregaItem(e, i, a.corTema || '#3FAE2A')).join('');
    bindEntregaEvents(card, a);
    updateEntregasCount(card, a);
    setEditableState(card, state.editMode);
  }

  function updateEntregasCount(card, a) {
    const ct = card.querySelector('.entregas-count');
    if (ct) ct.textContent = (a.entregas || []).length;
  }

  function syncFieldToState(el, nome) {
    const field = el.dataset.field;
    const a = getAnalistaPorNome(nome);
    if (!a || !field) return;
    const val = el.textContent.trim();
    if (field === 'nome') {
      // Atualizar chave em photos e outros refs
      if (val && val !== nome) {
        state.photos[val] = state.photos[nome];
        delete state.photos[nome];
        a.nome = val;
        card_updateNomeRefs(nome, val);
      }
    } else {
      a[field] = val;
    }
  }

  function card_updateNomeRefs(oldNome, newNome) {
    // Atualizar data-nome em todos os elementos do card correspondente
    const card = ui.grid.querySelector(`[data-nome="${oldNome}"]`);
    if (card) {
      card.dataset.nome = newNome;
      card.querySelectorAll(`[data-nome="${oldNome}"]`).forEach(el => {
        el.dataset.nome = newNome;
      });
    }
  }

  /* ============================================================
     FOOTER
  ============================================================ */
  function renderFooter() {
    const destaques = state.dados.destaques || [];
    const icons = [
      'fa-solid fa-eye','fa-solid fa-shield-halved',
      'fa-solid fa-gears','fa-solid fa-handshake',
      'fa-solid fa-triangle-exclamation'
    ];
    ui.footerList.innerHTML = destaques.map((d, i) => `
      <li><i class="${icons[i % icons.length]}"></i>${d}</li>`).join('');
  }

  /* ============================================================
     MODO EDIÇÃO
  ============================================================ */
  function toggleEditMode() {
    state.editMode = !state.editMode;
    document.body.classList.toggle('edit-mode', state.editMode);
    ui.editBtn.classList.toggle('active', state.editMode);
    ui.editBtn.querySelector('.btn-label').textContent =
      state.editMode ? 'Sair da Edição' : 'Modo Edição';

    // Mostrar/ocultar botões exclusivos de edição
    document.querySelectorAll('.edit-only').forEach(el => {
      el.classList.toggle('hidden', !state.editMode);
    });

    // Campos editáveis no header
    ['js-titulo','js-subtitulo','js-descricao'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.contentEditable = state.editMode ? 'true' : 'false';
    });

    // Campos editáveis nos cards
    document.querySelectorAll('.editable-field').forEach(el => {
      el.contentEditable = state.editMode ? 'true' : 'false';
    });
    document.querySelectorAll('.entrega-text').forEach(el => {
      el.contentEditable = state.editMode ? 'true' : 'false';
    });

    if (state.editMode) {
      showToast('✏️ Modo edição ativado. Clique nos textos para editar.');
    } else {
      showToast('👁️ Modo visualização ativado.');
    }
  }

  function setEditableState(card, enabled) {
    card.querySelectorAll('.editable-field, .entrega-text').forEach(el => {
      el.contentEditable = enabled ? 'true' : 'false';
    });
  }

  /* ============================================================
     SALVAR
  ============================================================ */
  function salvarDados() {
    // Sincronizar header
    const d = state.dados;
    d.titulo    = ui.titulo.textContent.trim();
    d.subtitulo = ui.subtitulo.textContent.trim();
    d.descricao = ui.descricao.textContent.trim();
    d.analistas = state.analistas;

    localStorage.setItem(LS_KEY, JSON.stringify(d));
    savePhotos();
    showToast('💾 Dados salvos com sucesso!');
  }

  /* ============================================================
     FOTOS — LocalStorage
  ============================================================ */
  function savePhotos() {
    try {
      localStorage.setItem(LS_PHOTOS, JSON.stringify(state.photos));
    } catch (e) {
      console.warn('Fotos muito grandes para LocalStorage:', e);
    }
  }
  function loadPhotos() {
    try {
      const saved = localStorage.getItem(LS_PHOTOS);
      if (saved) state.photos = JSON.parse(saved);
    } catch (_) {}
  }

  /* ============================================================
     EXPORTAR IMAGEM
  ============================================================ */
  async function exportarImagem() {
    const btn = ui.exportImg;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

    const toolbar = document.querySelector('.toolbar');
    const editMode = state.editMode;

    // Desativar edit mode temporariamente
    if (editMode) toggleEditMode();
    toolbar.style.display = 'none';

    try {
      const canvas = await html2canvas(document.documentElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: getComputedStyle(document.documentElement)
          .getPropertyValue('--bg-primary').trim() || '#0A1612',
        scrollY: 0,
        scrollX: 0,
        windowWidth: document.documentElement.scrollWidth,
        windowHeight: document.documentElement.scrollHeight,
        logging: false,
        onclone: (doc) => {
          doc.querySelector('.toolbar').style.display = 'none';
        }
      });

      const link = document.createElement('a');
      link.download = `Daily-Core-Credito-${getSemana()}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
      showToast('🖼️ Imagem gerada com sucesso!');
    } catch (err) {
      console.error(err);
      showToast('❌ Erro ao gerar imagem.');
    } finally {
      toolbar.style.display = '';
      if (editMode) toggleEditMode();
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-image"></i><span class="btn-label">Gerar Imagem</span>';
    }
  }

  /* ============================================================
     EXPORTAR JSON
  ============================================================ */
  function exportarJSON() {
    const d = { ...state.dados };
    d.titulo    = ui.titulo.textContent.trim();
    d.subtitulo = ui.subtitulo.textContent.trim();
    d.descricao = ui.descricao.textContent.trim();
    d.analistas = state.analistas;
    d._photos   = state.photos; // inclui fotos

    const blob = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `dados-${getSemana()}.json`;
    link.click();
    showToast('📦 Dados exportados!');
  }

  /* ============================================================
     IMPORTAR JSON
  ============================================================ */
  function importarJSON(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (imported._photos) {
          state.photos = imported._photos;
          delete imported._photos;
          savePhotos();
        }
        state.dados = imported;
        localStorage.setItem(LS_KEY, JSON.stringify(imported));
        processarDados();
        showToast('✅ Dados importados com sucesso!');
      } catch (_) {
        showToast('❌ JSON inválido. Verifique o arquivo.');
      }
    };
    reader.readAsText(file);
  }

  /* ============================================================
     GERAR LINK
  ============================================================ */
  function gerarLink() {
    try {
      const payload = btoa(encodeURIComponent(JSON.stringify({
        titulo:    ui.titulo.textContent.trim(),
        subtitulo: ui.subtitulo.textContent.trim(),
        semana:    getSemana(),
        membros:   state.analistas.map(a => a.nome),
      })));
      const url = `${location.origin}${location.pathname}?ref=${payload}`;
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(url).then(() => showToast('🔗 Link copiado!'));
      } else {
        const ta = document.createElement('textarea');
        ta.value = url; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); document.body.removeChild(ta);
        showToast('🔗 Link copiado!');
      }
    } catch (_) { showToast('❌ Não foi possível gerar o link.'); }
  }

  /* ============================================================
     ADICIONAR ANALISTA
  ============================================================ */
  function adicionarAnalista() {
    const novo = {
      nome:        'Novo Analista',
      cargo:       'Analista SRE e DevOps',
      foto:        '',
      badgeNumero: '0',
      badgeTexto:  'entregas esta semana',
      badgeIcone:  'fa-solid fa-chart-line',
      corTema:     '#3FAE2A',
      tags:        ['SRE','DevOps'],
      entregas:    ['Clique aqui para editar esta entrega']
    };
    state.analistas.push(novo);
    state.dados.analistas = state.analistas;
    filtrarEOrdenar();
    renderAvatares();
    // Scroll para o novo card
    setTimeout(() => {
      const cards = ui.grid.querySelectorAll('.analyst-card');
      if (cards.length) cards[cards.length - 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 200);
    showToast('👤 Analista adicionado! Edite os campos.');
  }

  /* ============================================================
     FILTRAR E ORDENAR
  ============================================================ */
  function filtrarEOrdenar() {
    let lista = [...state.analistas];
    if (state.query) {
      lista = lista.filter(a =>
        a.nome.toLowerCase().includes(state.query) ||
        (a.cargo || '').toLowerCase().includes(state.query) ||
        (a.entregas || []).some(e => e.toLowerCase().includes(state.query))
      );
    }
    switch (state.sortBy) {
      case 'nome':
        lista.sort((a,b) => a.nome.localeCompare(b.nome, 'pt-BR')); break;
      case 'cargo':
        lista.sort((a,b) => (a.cargo||'').localeCompare(b.cargo||'','pt-BR')); break;
      case 'entregas':
        lista.sort((a,b) => (b.entregas||[]).length - (a.entregas||[]).length); break;
    }
    state.filtrados = lista;
    renderCards();
    // Reaplicar estado de edição
    if (state.editMode) {
      document.querySelectorAll('.editable-field, .entrega-text').forEach(el => {
        el.contentEditable = 'true';
      });
    }
  }

  /* ============================================================
     TEMA
  ============================================================ */
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
    ui.themeIcon.className = t === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  }

  /* ============================================================
     TOAST
  ============================================================ */
  let toastTimer = null;
  function showToast(msg, dur = 3500) {
    ui.toast.innerHTML = msg;
    ui.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => ui.toast.classList.remove('show'), dur);
  }

  /* ============================================================
     MODAL CONFIRMAÇÃO
  ============================================================ */
  let confirmCb = null;
  function confirm_(msg, cb) {
    ui.modalMsg.innerHTML = msg;
    ui.modal.classList.remove('hidden');
    confirmCb = cb;
  }

  /* ============================================================
     LOADING
  ============================================================ */
  function hideLoading() {
    setTimeout(() => ui.loading.classList.add('hidden'), 600);
  }

  /* ============================================================
     BIND EVENTS
  ============================================================ */
  function bindEvents() {
    ui.search.addEventListener('input', e => {
      state.query = e.target.value.toLowerCase().trim();
      filtrarEOrdenar();
    });
    ui.sort.addEventListener('change', e => {
      state.sortBy = e.target.value;
      filtrarEOrdenar();
    });
    ui.themeBtn.addEventListener('click', toggleTheme);
    ui.editBtn.addEventListener('click', toggleEditMode);
    ui.addAnalista.addEventListener('click', adicionarAnalista);
    ui.saveBtn.addEventListener('click', salvarDados);
    ui.exportImg.addEventListener('click', exportarImagem);
    ui.exportJson.addEventListener('click', exportarJSON);
    ui.importInput.addEventListener('change', e => {
      importarJSON(e.target.files[0]);
      e.target.value = '';
    });
    ui.shareBtn.addEventListener('click', gerarLink);

    // Modal
    ui.modalCancel.addEventListener('click', () => {
      ui.modal.classList.add('hidden'); confirmCb = null;
    });
    ui.modalConfirm.addEventListener('click', () => {
      if (confirmCb) confirmCb();
      ui.modal.classList.add('hidden'); confirmCb = null;
    });
    ui.modal.addEventListener('click', e => {
      if (e.target === ui.modal) ui.modal.classList.add('hidden');
    });

    // Atalho Ctrl+S
    document.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (state.editMode) salvarDados();
      }
    });
  }

  /* ============================================================
     UTILS
  ============================================================ */
  function getAnalistaPorNome(nome) {
    return state.analistas.find(a => a.nome === nome) || null;
  }
  function getInitials(nome) {
    if (!nome) return '?';
    const p = nome.trim().split(' ');
    return p.length === 1
      ? p[0][0].toUpperCase()
      : (p[0][0] + p[p.length-1][0]).toUpperCase();
  }
  function hexToRgba(hex, alpha) {
    const c = hex.replace('#','');
    const r = parseInt(c.substring(0,2),16);
    const g = parseInt(c.substring(2,4),16);
    const b = parseInt(c.substring(4,6),16);
    if (isNaN(r)) return `rgba(63,174,42,${alpha})`;
    return `rgba(${r},${g},${b},${alpha})`;
  }
  function getSemana() {
    const n = new Date();
    const s = new Date(n.getFullYear(),0,1);
    const w = Math.ceil(((n-s)/86400000 + s.getDay()+1)/7);
    return `${n.getFullYear()}-W${String(w).padStart(2,'0')}`;
  }
  function sanitize(str) {
    return String(str)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;');
  }
  function selectAllContent(el) {
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel.removeAllRanges(); sel.addRange(range);
  }

  /* ============================================================
     DADOS DEMO
  ============================================================ */
  function getDemoData() {
    return {
      titulo: "Principais Entregas da Semana",
      subtitulo: "Time Core & Crédito",
      descricao: "Resultados, melhorias operacionais, estabilidade e evolução contínua dos ambientes.",
      destaques: [
        "Evolução da observabilidade dos ambientes",
        "Aumento da estabilidade operacional",
        "Modernização de ferramentas e processos",
        "Suporte contínuo às entregas de negócio",
        "Atuação preventiva — reduzindo riscos e incidentes"
      ],
      analistas: [
        {
          nome: "Anderson Schultz Ribeiro",
          cargo: "Analista SRE e DevOps PL",
          foto: "assets/fotos/anderson.jpg",
          badgeNumero: "55+",
          badgeTexto: "novos hosts no Promtail",
          badgeIcone: "fa-solid fa-server",
          corTema: "#3FAE2A",
          tags: ["SRE","DevOps"],
          entregas: [
            "Liderança e coordenação técnica do Programa Desenrola Brasil 2.0, conduzindo alinhamentos entre equipes, acompanhamento de histórias, PGDMs, CSS e tratativas operacionais.",
            "Análise e limpeza de cache do ambiente ArcGIS, atuando diretamente na estabilização da plataforma.",
            "Gestão e priorização dos cards problema do time — encerramento de 3 problemas, 1 PGDM e remoção de monitoramento desnecessário.",
            "Implementação de melhorias no processo de sobreaviso, concluindo a migração do Infraphone para Jira Service Management Cloud.",
            "Ajuste de logrotate em ambiente SOA3C para melhoria operacional.",
            "Criação de trap de Health Check para ws_mua, reduzindo acionamentos indevidos de monitoramento.",
            "Apoio em testes de conectividade entre microserviços e serviços externos na nova stack tecnológica.",
            "Expansão da observabilidade: 55 novos hosts no Promtail, superando 60 domínios monitorados.",
            "Apoio técnico em implantações críticas: CNPJ Alfanumérico PLD e estabilização do ambiente wsCadastro."
          ]
        },
        {
          nome: "Diego Gonçalves de Oliveira",
          cargo: "Analista SRE e DevOps SR",
          foto: "assets/fotos/diego.jpg",
          badgeNumero: "24/7",
          badgeTexto: "suporte contínuo aos times",
          badgeIcone: "fa-solid fa-headset",
          corTema: "#7ED957",
          tags: ["SRE","DevOps"],
          entregas: [
            "Atuação estratégica na atualização dos agentes de deploy no ambiente de homologação.",
            "Atendimento de requisições operacionais e suporte contínuo aos times via Teams.",
            "Evolução e sustentação do ambiente Hoverfly na nova stack tecnológica.",
            "Apoio à estabilidade e disponibilidade dos ambientes corporativos."
          ]
        },
        {
          nome: "Gilson Batista da Silva Souza",
          cargo: "Analista SRE e DevOps SR",
          foto: "assets/fotos/gilson.jpg",
          badgeNumero: "3",
          badgeTexto: "ambientes em análise de desativação",
          badgeIcone: "fa-solid fa-database",
          corTema: "#4CAF50",
          tags: ["SRE","DevOps"],
          entregas: [
            "Implementação de scripts JTA em ambiente legado e otimizações de cluster.",
            "Disponibilização da planilha corporativa de controle e liberação de acessos PAM.",
            "Levantamento e análise de ambientes HOM com RHEL5 para compartilhamento centralizado de logs.",
            "Ajustes de configuração e estabilização do ambiente Gesgara.",
            "Atuação conjunta com arquitetos e engenheiros na análise de desativação dos ambientes UCMDB, SOASCOM e WEBDB.",
            "Monitoramento preventivo e gestão de buckets com base em métricas e dashboards operacionais."
          ]
        },
        {
          nome: "Matheus da Silva de Farias",
          cargo: "Analista SRE e DevOps JR",
          foto: "assets/fotos/matheus.jpg",
          badgeNumero: "100%",
          badgeTexto: "revisão diária dos ambientes",
          badgeIcone: "fa-solid fa-shield-halved",
          corTema: "#2F7D23",
          tags: ["SRE","DevOps"],
          entregas: [
            "Instalação e configuração do Dynatrace no ambiente Gesgara.",
            "Atuação contínua na estabilidade dos ambientes e atendimento das demandas operacionais.",
            "Revisão diária dos ambientes Core & Crédito visando prevenção de incidentes e aumento da confiabilidade operacional."
          ]
        }
      ]
    };
  }

  /* ============================================================
     START
  ============================================================ */
  document.addEventListener('DOMContentLoaded', init);

})();
