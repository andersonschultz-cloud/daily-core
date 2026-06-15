/**
 * Daily Core & Crédito — app.js v5.0
 * "Cooperativismo Tech" · Sicredi Identity
 * Edição in-place · LocalStorage · PNG Export · Import/Export
 *
 * CHANGELOG v5.0 (evolução do v4.0 "Obsidian Tech"):
 * - [BUG] fetchDados agora SEMPRE consulta data/analistas.json e
 *   compara o campo "versao" com o cache local. Se a versão mudou
 *   (nova semana), os dados do JSON têm prioridade — mas as fotos
 *   enviadas pela equipe (LS_PHOTOS) são preservadas. Antes, o
 *   cache local tinha prioridade absoluta e o JSON nunca era lido
 *   de novo enquanto houvesse cache.
 * - [BUG] Exportação de imagem totalmente refeita: classe
 *   `body.is-exporting` remove o scroll interno de `.card-entregas`,
 *   oculta camadas de fundo fixas e ajusta o background ANTES de
 *   medir as dimensões e chamar o html2canvas — garante que TODOS
 *   os analistas e TODAS as entregas apareçam, sem cortes.
 * - [BUG] Upload de foto agora é redimensionado/comprimido via
 *   <canvas> (máx. 480px, JPEG) antes de ir para o LocalStorage,
 *   evitando QuotaExceededError. Falhas de armazenamento agora
 *   exibem toast (antes só logavam no console).
 * - [BUG] Botão "Link" agora é funcional: codifica busca/ordenação
 *   atuais no hash da URL e restaura ao abrir o link.
 * - [BUG] Removido código morto em syncField (querySelectorAll
 *   de atributo que nunca existia).
 * - [A11Y] Modal de confirmação agora gerencia foco (foco vai para
 *   o botão Cancelar ao abrir e retorna ao elemento de origem ao
 *   fechar); Esc fecha o modal.
 * - Paleta de cores/fallbacks atualizada para "Cooperativismo Tech"
 *   (verde institucional / petróleo / dourado), LS_KEY -> v5.
 * - escHtml agora também escapa aspas simples.
 */
(function () {
  'use strict';

  /* ══════════════════════════════════════
     CONSTANTES
  ══════════════════════════════════════ */
  const LS_KEY     = 'sicredi-daily-v5';
  const LS_THEME   = 'sicredi-daily-theme-v5';
  const LS_PHOTOS  = 'sicredi-daily-photos-v5';
  const LS_VERSION = 'sicredi-daily-versao-v5';
  const DATA_URL   = 'data/analistas.json';

  // Cor padrão (verde institucional) usada como fallback sempre que
  // um analista não tiver "corTema" definido ou o valor for inválido.
  const COR_PADRAO = '#259A6C';

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
    restoreFromHash();
    hideLoading();
  }

  /* ══════════════════════════════════════
     FETCH / LOAD
     ------------------------------------
     Estratégia v5 (corrige bug de cache):
     1. Tenta buscar data/analistas.json (sempre).
     2. Lê o cache local (se existir).
     3. Se NÃO houver JSON remoto -> usa cache local ou demo.
     4. Se houver JSON remoto e a "versao" for DIFERENTE da
        versão salva localmente (ou não houver cache) -> usa o
        JSON remoto (nova semana). As fotos enviadas pela equipe
        continuam vindo do LS_PHOTOS, independente da versão.
     5. Se a "versao" for IGUAL -> usa o cache local (preserva
        edições feitas em modo edição + "Salvar" nesta sessão).
  ══════════════════════════════════════ */
  async function fetchDados() {
    let remote = null;
    try {
      const res = await fetch(DATA_URL + '?_=' + Date.now());
      if (res.ok) remote = await res.json();
    } catch (_) {
      // Sem rede ou executando via file:// (fetch bloqueado).
      // Segue com o cache local / dados de demonstração.
    }

    let local = null;
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) local = JSON.parse(raw);
    } catch (_) {
      local = null; // cache corrompido — ignora
    }

    if (remote) {
      const remoteVersao = String(remote.versao || remote.dataDaily || '');
      const localVersao  = localStorage.getItem(LS_VERSION) || '';

      if (!local || remoteVersao !== localVersao) {
        // Nova semana (ou primeira carga): dados do JSON têm prioridade.
        state.dados = remote;
        localStorage.setItem(LS_VERSION, remoteVersao);
        try { localStorage.setItem(LS_KEY, JSON.stringify(remote)); } catch (_) {}
      } else {
        // Mesma versão: preserva edições feitas nesta sessão.
        state.dados = local;
      }
    } else {
      state.dados = local || getDemoData();
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
      const cor   = a.corTema || COR_PADRAO;

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
    const cor      = a.corTema   || COR_PADRAO;
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
        <span class="card-photo-badge" aria-hidden="true"><i class="fa-solid fa-camera"></i></span>
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

      <button type="button" class="card-remove-btn" title="Remover analista" aria-label="Remover ${escHtml(a.nome)}">
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

    photoInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      e.target.value = '';
      if (!file) return;

      let dataUrl;
      try {
        // Redimensiona/comprime antes de gravar no LocalStorage
        // (evita QuotaExceededError com fotos grandes de celular).
        dataUrl = await resizeImageFile(file, 480, 0.85);
      } catch (err) {
        console.error('Erro ao processar imagem:', err);
        showToast('❌ Não foi possível processar a imagem selecionada.');
        return;
      }

      const nomeAtual = card.dataset.nome;
      state.photos[nomeAtual] = dataUrl;
      const ok = savePhotos();

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
      if (ok) showToast('📸 Foto atualizada com sucesso!');
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
      const cor = a.corTema || COR_PADRAO;
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
    const cor = a.corTema || COR_PADRAO;
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
      // A versão local acompanha o "versao"/"dataDaily" atual, para
      // que esta sessão continue usando os dados editados até que
      // data/analistas.json seja publicado com uma versão diferente.
      localStorage.setItem(LS_VERSION, String(d.versao || d.dataDaily || ''));
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
      return true;
    } catch (e) {
      console.warn('Não foi possível salvar fotos no LocalStorage:', e);
      showToast('⚠️ Foto não pôde ser salva — armazenamento do navegador está cheio.');
      return false;
    }
  }
  function loadPhotos() {
    try {
      const s = localStorage.getItem(LS_PHOTOS);
      if (s) state.photos = JSON.parse(s);
    } catch (_) {}
  }

  /**
   * Redimensiona uma imagem (arquivo selecionado pelo usuário) usando
   * <canvas>, limitando o lado maior a `maxSize` pixels, e retorna um
   * data URL JPEG comprimido. Evita estourar a cota do LocalStorage
   * com fotos de celular (que costumam ter vários MB).
   */
  function resizeImageFile(file, maxSize, quality) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error || new Error('Falha ao ler arquivo'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Arquivo não é uma imagem válida'));
        img.onload = () => {
          let { width, height } = img;
          if (width > maxSize || height > maxSize) {
            if (width >= height) {
              height = Math.round(height * (maxSize / width));
              width  = maxSize;
            } else {
              width  = Math.round(width * (maxSize / height));
              height = maxSize;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width  = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  /* ══════════════════════════════════════
     EXPORTAR IMAGEM
     ------------------------------------
     CORREÇÃO COMPLETA (v5):
     - Adiciona a classe `body.is-exporting` ANTES de medir as
       dimensões da página. Essa classe (definida em style.css):
         • remove max-height/overflow de .card-entregas, exibindo
           TODAS as entregas de TODOS os analistas;
         • oculta as camadas de fundo `position:fixed`
           (.bg-grid/.bg-glow), que causavam duplicações/cortes;
         • troca `background-attachment: fixed` por `scroll`.
     - Aguarda reflow (sleep) e recalcula altura/largura DEPOIS de
       aplicar a classe, garantindo que o html2canvas capture a
       página já expandida.
     - Remove a classe no `finally`, restaurando o layout normal.
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
    // Ativa o modo de exportação: expande listas de entregas,
    // oculta fundos fixos e ajusta o background-attachment.
    document.body.classList.add('is-exporting');

    // Aguarda o navegador recalcular o layout (reflow) com o novo
    // tamanho dos cards antes de medir a página.
    await sleep(150);

    try {
      const docEl = document.documentElement;
      const totalH = Math.max(
        document.body.scrollHeight, document.body.offsetHeight,
        docEl.scrollHeight, docEl.offsetHeight
      );
      const totalW = Math.max(
        document.body.scrollWidth, docEl.scrollWidth, docEl.clientWidth
      );

      const bgColor = getComputedStyle(document.body).backgroundColor || '#0F1B16';

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
          // Garantia extra: mesmo que alguma regra não tenha sido
          // aplicada a tempo, força a expansão total das entregas
          // e remove animações no documento clonado.
          clonedDoc.querySelectorAll('.card-entregas').forEach(ul => {
            ul.style.maxHeight = 'none';
            ul.style.overflow  = 'visible';
          });
          clonedDoc.querySelectorAll('.analyst-card').forEach(c => {
            c.style.animation = 'none';
            c.style.opacity   = '1';
            c.style.transform = 'none';
          });
        }
      });

      const dataDaily = (ui.dataDaily.textContent || '').trim()
        .replace(/[^\d]/g, '-').replace(/^-+|-+$/g, '') || getSemana();

      const link    = document.createElement('a');
      link.download = `Daily-Core-Credito-${dataDaily}.png`;
      link.href     = canvas.toDataURL('image/png', 1.0);
      link.click();
      showToast('🖼️ Imagem gerada com sucesso!');
    } catch (err) {
      console.error('Erro ao gerar imagem:', err);
      showToast('❌ Erro ao gerar imagem. Tente novamente.');
    } finally {
      document.body.classList.remove('is-exporting');
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
        try {
          localStorage.setItem(LS_KEY, JSON.stringify(imported));
          localStorage.setItem(LS_VERSION, String(imported.versao || imported.dataDaily || ''));
        } catch (_) {}
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
    // Paleta "Cooperativismo Tech" — verde institucional, petróleo,
    // cinza corporativo, dourado e verde claro de apoio.
    const cores = ['#259A6C', '#357F82', '#6F8794', '#BB9748', '#3FB585'];
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
     LINK COMPARTILHÁVEL
     ------------------------------------
     CORREÇÃO (v5): o link agora é funcional de fato. A busca e a
     ordenação atuais são codificadas no hash da URL (#q=...&ordenar=...)
     e restauradas automaticamente por restoreFromHash() ao abrir o
     link — útil para compartilhar, por exemplo, "veja as entregas do
     Anderson" já filtradas.
  ══════════════════════════════════════ */
  function gerarLink() {
    try {
      const params = new URLSearchParams();
      if (state.query)                       params.set('q', state.query);
      if (state.sortBy && state.sortBy !== 'default') params.set('ordenar', state.sortBy);

      const hash = params.toString();
      const url  = `${location.origin}${location.pathname}${hash ? '#' + hash : ''}`;
      const msg  = hash
        ? '🔗 Link copiado! Inclui o filtro/ordenação atuais.'
        : '🔗 Link copiado para a área de transferência!';

      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(url).then(() => showToast(msg));
      } else {
        fallbackCopy(url);
        showToast(msg);
      }
    } catch (_) {
      showToast('❌ Não foi possível gerar o link.');
    }
  }

  /** Restaura busca/ordenação a partir do hash da URL (#q=...&ordenar=...) */
  function restoreFromHash() {
    if (!location.hash || location.hash.length < 2) return;
    try {
      const params  = new URLSearchParams(location.hash.slice(1));
      const q       = params.get('q');
      const ordenar = params.get('ordenar');
      let changed = false;

      if (q) {
        state.query = q.toLowerCase();
        if (ui.search) ui.search.value = q;
        changed = true;
      }
      if (ordenar && ui.sort && [...ui.sort.options].some(o => o.value === ordenar)) {
        state.sortBy = ordenar;
        ui.sort.value = ordenar;
        changed = true;
      }
      if (changed) filtrarEOrdenar();
    } catch (_) { /* hash inválido — ignora */ }
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
     ------------------------------------
     CORREÇÃO (v5): gerenciamento básico de foco. Ao abrir, o foco
     vai para o botão "Cancelar" (ação não-destrutiva); ao fechar
     (por qualquer meio), o foco retorna ao elemento que abriu o
     modal. Esc também fecha o modal.
  ══════════════════════════════════════ */
  let _confirmCb = null;
  let _lastFocused = null;

  function confirmDialog(msg, cb) {
    ui.modalMsg.innerHTML = msg;
    ui.modal.classList.remove('hidden');
    _confirmCb = cb;
    _lastFocused = document.activeElement;
    ui.modalCancel.focus();
  }

  function closeModal() {
    ui.modal.classList.add('hidden');
    _confirmCb = null;
    if (_lastFocused && typeof _lastFocused.focus === 'function') {
      _lastFocused.focus();
    }
    _lastFocused = null;
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

    ui.modalCancel.addEventListener('click', closeModal);
    ui.modalConfirm.addEventListener('click', () => {
      const cb = _confirmCb;
      closeModal();
      if (typeof cb === 'function') cb();
    });
    ui.modal.addEventListener('click', (e) => {
      if (e.target === ui.modal) closeModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !ui.modal.classList.contains('hidden')) {
        e.preventDefault();
        closeModal();
        return;
      }
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
    const c = String(hex || '').replace('#', '');
    const fallback = `rgba(37,154,108,${alpha})`; // verde institucional
    if (c.length < 6) return fallback;
    const r = parseInt(c.slice(0,2), 16);
    const g = parseInt(c.slice(2,4), 16);
    const b = parseInt(c.slice(4,6), 16);
    if (isNaN(r+g+b)) return fallback;
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function escHtml(str) {
    return String(str || '')
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#39;');
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
     DADOS DEMO (fallback — usado apenas se
     data/analistas.json não puder ser carregado
     e não houver cache local)
  ══════════════════════════════════════ */
  function getDemoData() {
    return {
      versao:    getTodayFormatted(),
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
          corTema: '#259A6C', tags: ['SRE', 'DevOps'],
          entregas: ['Liderança técnica do Programa Desenrola Brasil 2.0.', 'Expansão da observabilidade: 55 novos hosts no Promtail.'],
        },
        {
          nome: 'Diego Gonçalves de Oliveira', cargo: 'Analista SRE e DevOps SR',
          foto: 'assets/fotos/diego.jpg', badgeNumero: '24/7',
          badgeTexto: 'suporte contínuo aos times', badgeIcone: 'fa-solid fa-headset',
          corTema: '#357F82', tags: ['SRE', 'DevOps'],
          entregas: ['Atualização dos agentes de deploy em homologação.', 'Evolução do ambiente Hoverfly na nova stack.'],
        },
        {
          nome: 'Gilson Batista da Silva Souza', cargo: 'Analista SRE e DevOps SR',
          foto: 'assets/fotos/gilson.jpg', badgeNumero: '3',
          badgeTexto: 'ambientes em análise de desativação', badgeIcone: 'fa-solid fa-database',
          corTema: '#6F8794', tags: ['SRE', 'DevOps'],
          entregas: ['Análise de desativação dos ambientes UCMDB, SOASCOM e WEBDB.', 'Disponibilização da planilha de controle PAM.'],
        },
        {
          nome: 'Matheus da Silva de Farias', cargo: 'Analista SRE e DevOps JR',
          foto: 'assets/fotos/matheus.jpg', badgeNumero: '100%',
          badgeTexto: 'revisão diária dos ambientes', badgeIcone: 'fa-solid fa-shield-halved',
          corTema: '#BB9748', tags: ['SRE', 'DevOps'],
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
