/**
 * Daily Core & Crédito — app.js
 * Toda a lógica de renderização, busca, ordenação, tema, PDF e compartilhamento.
 */

(function () {
  'use strict';

  /* ============================================================
     ESTADO GLOBAL
     ============================================================ */
  const state = {
    dados: null,          // JSON completo
    analistas: [],        // lista original
    filtrados: [],        // lista após filtros
    query: '',
    sortBy: 'default',
    theme: 'dark',
  };

  /* ============================================================
     SELETORES
     ============================================================ */
  const $ = (sel) => document.querySelector(sel);
  const els = {
    titulo:       $('#js-titulo'),
    subtitulo:    $('#js-subtitulo'),
    descricao:    $('#js-descricao'),
    avatares:     $('#js-avatares'),
    grid:         $('#js-grid'),
    empty:        $('#js-empty'),
    search:       $('#js-search'),
    sort:         $('#js-sort'),
    toggleTheme:  $('#js-toggle-theme'),
    themeIcon:    $('#js-theme-icon'),
    btnExport:    $('#js-export'),
    btnShare:     $('#js-share'),
    footer:       $('#js-footer'),
    footerList:   $('#js-footer-list'),
    toast:        $('#js-toast'),
    loading:      $('#js-loading'),
  };

  /* ============================================================
     INICIALIZAÇÃO
     ============================================================ */
  async function init() {
    loadTheme();
    await fetchDados();
    bindEvents();
    hideLoading();
  }

  /* ============================================================
     FETCH JSON
     ============================================================ */
  async function fetchDados() {
    try {
      const res = await fetch('data/analistas.json?v=' + Date.now());
      if (!res.ok) throw new Error('HTTP ' + res.status);
      state.dados = await res.json();
    } catch (e) {
      console.error('Erro ao carregar JSON:', e);
      // Fallback com dados de demo para desenvolvimento local
      state.dados = getDemoData();
    }
    processarDados();
  }

  /* ============================================================
     PROCESSAR E RENDERIZAR
     ============================================================ */
  function processarDados() {
    const d = state.dados;
    // Header
    if (d.titulo)    els.titulo.textContent    = d.titulo;
    if (d.subtitulo) els.subtitulo.textContent = d.subtitulo;
    if (d.descricao) els.descricao.textContent = d.descricao;

    state.analistas = d.analistas || [];
    state.filtrados = [...state.analistas];

    renderAvatares();
    renderCards();
    renderFooter();
  }

  /* ============================================================
     AVATARES NO HEADER
     ============================================================ */
  function renderAvatares() {
    els.avatares.innerHTML = '';
    state.analistas.forEach((a) => {
      const chip = document.createElement('div');
      chip.className = 'avatar-chip';
      chip.setAttribute('role', 'listitem');

      const primeiroNome = a.nome.split(' ')[0];

      chip.innerHTML = `
        <img
          src="${a.foto || ''}"
          alt="${a.nome}"
          loading="lazy"
          onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"
        />
        <span style="
          display:none; width:30px; height:30px; border-radius:50%;
          background:${a.corTema || '#2ec4ff'}33;
          border:2px solid ${a.corTema || '#2ec4ff'};
          align-items:center; justify-content:center;
          font-size:11px; font-weight:800; color:${a.corTema || '#2ec4ff'};
        ">${getInitials(a.nome)}</span>
        <span>${primeiroNome}</span>
      `;
      els.avatares.appendChild(chip);
    });
  }

  /* ============================================================
     CARDS
     ============================================================ */
  function renderCards() {
    els.grid.innerHTML = '';

    if (state.filtrados.length === 0) {
      els.empty.classList.remove('hidden');
      return;
    }
    els.empty.classList.add('hidden');

    state.filtrados.forEach((analista, idx) => {
      const card = buildCard(analista, idx);
      els.grid.appendChild(card);
    });
  }

  function buildCard(a, idx) {
    const card = document.createElement('article');
    card.className = 'analyst-card';
    card.setAttribute('role', 'listitem');
    card.setAttribute('aria-label', `Card de ${a.nome}`);
    card.style.setProperty('--tema-cor', a.corTema || '#2ec4ff');

    // Bordas coloridas via CSS var
    card.style.borderColor = hexToRgba(a.corTema || '#2ec4ff', 0.20);

    const initials    = getInitials(a.nome);
    const numEntregas = (a.entregas || []).length;
    const badgeIcon   = a.badgeIcone || 'fa-solid fa-chart-line';
    const tags        = a.tags || ['SRE', 'DevOps'];

    /* ---- FOTO ---- */
    const fotoHtml = a.foto
      ? `<img class="card-photo" src="${a.foto}" alt="${a.nome}" loading="lazy"
             onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" />
         <div class="card-photo-fallback" style="display:none">${initials}</div>`
      : `<div class="card-photo-fallback">${initials}</div>`;

    /* ---- TAGS ---- */
    const tagsHtml = tags.map((t) => `
      <span class="card-tag" style="
        color:${a.corTema || '#2ec4ff'};
        border-color:${hexToRgba(a.corTema || '#2ec4ff', 0.35)};
        background:${hexToRgba(a.corTema || '#2ec4ff', 0.08)};
      ">
        <i class="fa-solid fa-circle-dot" style="font-size:7px"></i>${t}
      </span>
    `).join('');

    /* ---- ENTREGAS ---- */
    const entregasHtml = (a.entregas || []).map((e) => `
      <li>
        <span class="bullet"></span>
        <span>${e}</span>
      </li>
    `).join('');

    card.innerHTML = `
      <!-- Header do card -->
      <div class="card-header">
        <div class="card-photo-wrap">${fotoHtml}</div>
        <div class="card-info">
          <p class="card-name" title="${a.nome}">${a.nome}</p>
          <p class="card-cargo">${a.cargo || ''}</p>
          <div class="card-tags">${tagsHtml}</div>
        </div>
      </div>

      <!-- Badge de métrica -->
      ${a.badgeNumero ? `
      <div class="card-badge">
        <div class="badge-icon">
          <i class="${badgeIcon}"></i>
        </div>
        <div>
          <div class="badge-number">${a.badgeNumero}</div>
          <div class="badge-text">${a.badgeTexto || ''}</div>
        </div>
      </div>
      ` : ''}

      <!-- Entregas -->
      <p class="card-entregas-title">
        <i class="fa-solid fa-check-circle"></i>
        Principais Entregas
        <span style="margin-left:auto;
          background:${hexToRgba(a.corTema||'#2ec4ff',0.15)};
          color:${a.corTema||'#2ec4ff'};
          font-size:10px; font-weight:700;
          padding:2px 8px; border-radius:99px;">
          ${numEntregas}
        </span>
      </p>
      <ul class="card-entregas">${entregasHtml}</ul>
    `;

    return card;
  }

  /* ============================================================
     FOOTER
     ============================================================ */
  function renderFooter() {
    const destaques = state.dados.destaques || [];
    if (!destaques.length) return;

    const icons = [
      'fa-solid fa-eye',
      'fa-solid fa-shield-halved',
      'fa-solid fa-gear',
      'fa-solid fa-handshake',
      'fa-solid fa-triangle-exclamation',
    ];

    els.footerList.innerHTML = destaques.map((d, i) => `
      <li>
        <i class="${icons[i % icons.length]}" style="color:${getDestaqueCor(i)}"></i>
        ${d}
      </li>
    `).join('');
  }

  function getDestaqueCor(i) {
    const cores = ['#2ec4ff', '#00e5a0', '#7c5cff', '#ff9500', '#ff4fa3'];
    return cores[i % cores.length];
  }

  /* ============================================================
     EVENTOS
     ============================================================ */
  function bindEvents() {
    // Busca
    els.search.addEventListener('input', (e) => {
      state.query = e.target.value.toLowerCase().trim();
      filtrarEOrdenar();
    });

    // Ordenação
    els.sort.addEventListener('change', (e) => {
      state.sortBy = e.target.value;
      filtrarEOrdenar();
    });

    // Tema
    els.toggleTheme.addEventListener('click', toggleTheme);

    // Export PDF
    els.btnExport.addEventListener('click', exportPDF);

    // Compartilhar
    els.btnShare.addEventListener('click', gerarLink);
  }

  /* ============================================================
     FILTRAR E ORDENAR
     ============================================================ */
  function filtrarEOrdenar() {
    let lista = [...state.analistas];

    // Filtrar
    if (state.query) {
      lista = lista.filter((a) =>
        a.nome.toLowerCase().includes(state.query) ||
        (a.cargo || '').toLowerCase().includes(state.query) ||
        (a.entregas || []).some((e) => e.toLowerCase().includes(state.query))
      );
    }

    // Ordenar
    switch (state.sortBy) {
      case 'nome':
        lista.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
        break;
      case 'cargo':
        lista.sort((a, b) => (a.cargo || '').localeCompare(b.cargo || '', 'pt-BR'));
        break;
      case 'entregas':
        lista.sort((a, b) => (b.entregas || []).length - (a.entregas || []).length);
        break;
      case 'badge':
        lista.sort((a, b) => {
          const va = parseFloat((a.badgeNumero || '0').replace(/[^\d.]/g, '')) || 0;
          const vb = parseFloat((b.badgeNumero || '0').replace(/[^\d.]/g, '')) || 0;
          return vb - va;
        });
        break;
    }

    state.filtrados = lista;
    renderCards();
  }

  /* ============================================================
     TEMA CLARO / ESCURO
     ============================================================ */
  function loadTheme() {
    const saved = localStorage.getItem('dc-theme') || 'dark';
    applyTheme(saved);
  }

  function toggleTheme() {
    const next = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem('dc-theme', next);
  }

  function applyTheme(theme) {
    state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    els.themeIcon.className = theme === 'dark'
      ? 'fa-solid fa-sun'
      : 'fa-solid fa-moon';
  }

  /* ============================================================
     EXPORTAR PDF
     ============================================================ */
  async function exportPDF() {
    const btn = els.btnExport;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Gerando...';

    try {
      const { jsPDF } = window.jspdf;
      const toolbar = document.querySelector('.toolbar');
      toolbar.style.display = 'none';

      const canvas = await html2canvas(document.body, {
        scale: 1.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: state.theme === 'dark' ? '#080e1d' : '#f0f4ff',
        logging: false,
      });

      toolbar.style.display = '';

      const imgW = 297; // A4 landscape mm
      const imgH = (canvas.height * imgW) / canvas.width;

      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      let y = 0;
      const pageH = 210;

      while (y < imgH) {
        if (y > 0) pdf.addPage();
        pdf.addImage(
          canvas.toDataURL('image/jpeg', 0.92),
          'JPEG', 0, -y, imgW, imgH
        );
        y += pageH;
      }

      const semana = getSemanaAtual();
      pdf.save(`Daily-Core-Credito-${semana}.pdf`);
      showToast('✅ PDF exportado com sucesso!');
    } catch (err) {
      console.error(err);
      showToast('❌ Erro ao gerar PDF. Tente novamente.');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-file-arrow-down"></i><span>Exportar PDF</span>';
    }
  }

  /* ============================================================
     GERAR LINK COMPARTILHÁVEL
     ============================================================ */
  function gerarLink() {
    try {
      const payload = JSON.stringify({
        titulo:    state.dados.titulo,
        subtitulo: state.dados.subtitulo,
        semana:    getSemanaAtual(),
        analistas: state.analistas.map((a) => ({
          nome:    a.nome,
          entregas: (a.entregas || []).length,
        })),
      });

      const compressed = btoa(encodeURIComponent(payload));
      const url = `${location.origin}${location.pathname}?share=${compressed}`;

      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(url).then(() => {
          showToast('🔗 Link copiado para a área de transferência!');
        });
      } else {
        // Fallback
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast('🔗 Link copiado!');
      }
    } catch (e) {
      showToast('❌ Não foi possível gerar o link.');
    }
  }

  /* ============================================================
     TOAST
     ============================================================ */
  let toastTimer = null;
  function showToast(msg, duration = 3500) {
    els.toast.textContent = msg;
    els.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove('show'), duration);
  }

  /* ============================================================
     LOADING
     ============================================================ */
  function hideLoading() {
    setTimeout(() => els.loading.classList.add('hidden'), 500);
  }

  /* ============================================================
     UTILS
     ============================================================ */
  function getInitials(nome) {
    if (!nome) return '?';
    const partes = nome.trim().split(' ');
    if (partes.length === 1) return partes[0][0].toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  }

  function hexToRgba(hex, alpha) {
    const clean = hex.replace('#', '');
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return `rgba(46,196,255,${alpha})`;
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function getSemanaAtual() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const week = Math.ceil(((now - start) / 86400000 + start.getDay() + 1) / 7);
    return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`;
  }

  /* ============================================================
     DADOS DE DEMO (fallback local sem servidor)
     ============================================================ */
  function getDemoData() {
    return {
      "titulo": "Principais Entregas da Semana",
      "subtitulo": "Time Core & Crédito",
      "descricao": "Resultados, melhorias operacionais, estabilidade e evolução contínua dos ambientes.",
      "destaques": [
        "Evolução da observabilidade dos ambientes",
        "Aumento da estabilidade operacional",
        "Modernização de ferramentas e processos",
        "Suporte contínuo às entregas de negócio",
        "Atuação preventiva — reduzindo riscos e incidentes"
      ],
      "analistas": [
        {
          "nome": "Anderson Schultz Ribeiro",
          "cargo": "Analista SRE e DevOps PL",
          "foto": "assets/fotos/anderson.jpg",
          "badgeNumero": "55+",
          "badgeTexto": "novos hosts no Promtail",
          "badgeIcone": "fa-solid fa-server",
          "corTema": "#2ec4ff",
          "tags": ["SRE", "DevOps"],
          "entregas": [
            "Liderança e coordenação técnica do Programa Desenrola Brasil 2.0, conduzindo alinhamentos entre equipes, acompanhamento de histórias, PGDMs, CSS e tratativas operacionais.",
            "Análise e limpeza de cache do ambiente ArcGIS, atuando diretamente na estabilização da plataforma.",
            "Gestão e priorização dos cards problema do time, resultando no encerramento de 3 problemas, 1 PGDM e remoção de monitoramento desnecessário.",
            "Implementação de melhorias no processo de sobreaviso, concluindo a migração do Infraphone para Jira Service Management Cloud.",
            "Ajuste de logrotate em ambiente SOA3C para melhoria operacional.",
            "Criação de trap de Health Check para ws_mua, reduzindo acionamentos indevidos de monitoramento.",
            "Apoio em testes de conectividade entre microserviços e serviços externos na nova stack tecnológica.",
            "Expansão da observabilidade: 55 novos hosts no Promtail, superando 60 domínios monitorados.",
            "Apoio técnico em implantações críticas: CNPJ Alfanumérico PLD e estabilização do ambiente wsCadastro."
          ]
        },
        {
          "nome": "Diego Gonçalves de Oliveira",
          "cargo": "Analista SRE e DevOps SR",
          "foto": "assets/fotos/diego.jpg",
          "badgeNumero": "24/7",
          "badgeTexto": "suporte contínuo aos times",
          "badgeIcone": "fa-solid fa-headset",
          "corTema": "#ff9500",
          "tags": ["SRE", "DevOps"],
          "entregas": [
            "Atuação estratégica na atualização dos agentes de deploy no ambiente de homologação.",
            "Atendimento de requisições operacionais e suporte contínuo aos times via Teams.",
            "Evolução e sustentação do ambiente Hoverfly na nova stack tecnológica.",
            "Apoio à estabilidade e disponibilidade dos ambientes corporativos."
          ]
        },
        {
          "nome": "Gilson Batista da Silva Souza",
          "cargo": "Analista SRE e DevOps SR",
          "foto": "assets/fotos/gilson.jpg",
          "badgeNumero": "3",
          "badgeTexto": "ambientes em análise de desativação",
          "badgeIcone": "fa-solid fa-database",
          "corTema": "#7c5cff",
          "tags": ["SRE", "DevOps"],
          "entregas": [
            "Implementação de scripts JTA em ambiente legado e otimizações de cluster.",
            "Disponibilização da planilha corporativa de controle e liberação de acessos PAM.",
            "Levantamento e análise de ambientes HOM com RHEL5 para compartilhamento centralizado de logs.",
            "Ajustes de configuração e estabilização do ambiente Gesgara.",
            "Atuação conjunta com arquitetos e engenheiros na análise de desativação dos ambientes UCMDB, SOASCOM e WEBDB.",
            "Monitoramento preventivo e gestão de buckets com base em métricas e dashboards operacionais."
          ]
        },
        {
          "nome": "Matheus da Silva de Farias",
          "cargo": "Analista SRE e DevOps JR",
          "foto": "assets/fotos/matheus.jpg",
          "badgeNumero": "100%",
          "badgeTexto": "revisão diária dos ambientes",
          "badgeIcone": "fa-solid fa-shield-check",
          "corTema": "#00e5a0",
          "tags": ["SRE", "DevOps"],
          "entregas": [
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
