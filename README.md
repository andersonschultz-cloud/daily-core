# Daily Core & Crédito — Sicredi

Painel de acompanhamento da Daily do time **Core & Crédito** (Coordenação de
DevOps · Confederação Sicredi). Aplicação **100% estática** (HTML/CSS/JS),
sem backend — pode ser publicada diretamente no **GitHub Pages**.

> Versão 5.0 — identidade visual "Cooperativismo Tech" (verde institucional,
> verde petróleo, grafite e dourado discreto), evoluída a partir da v4.0
> "Obsidian Tech". Ver changelog completo no topo de `js/app.js`.

---

## 1. Estrutura do projeto

```
/
├── index.html
├── css/
│   └── style.css
├── js/
│   └── app.js
├── data/
│   └── analistas.json      ← EDITE APENAS ESTE ARQUIVO toda semana
├── assets/
│   ├── fotos/               ← fotos dos analistas (já incluídas)
│   └── img/                  ← logo Sicredi (opcional)
└── README.md
```

---

## 2. Atualização semanal (rotina da Daily)

**Edite apenas `data/analistas.json`.** Não é necessário tocar em HTML, CSS
ou JS no dia a dia.

1. Atualize o campo **`"versao"`** (ex.: `"2026-06-21"`). Isso é importante:
   o app guarda os dados no navegador (LocalStorage) para permitir edição em
   tempo real durante a Daily. Sempre que `"versao"` mudar, o app descarta o
   cache antigo e carrega os dados novos do JSON automaticamente — sem isso,
   quem já abriu o app antes continuaria vendo a semana anterior.
2. Atualize `"dataDaily"`, `"titulo"`, `"subtitulo"`, `"descricao"` e
   `"destaques"` se necessário.
3. Para cada analista, atualize o array `"entregas"` (cada item é um bullet
   no card) e, se aplicável, `"badgeNumero"` / `"badgeTexto"`.
4. Salve, faça commit e dê push — o GitHub Pages atualiza em alguns minutos.

### Adicionar um novo analista
Copie o bloco de outro analista em `analistas.json` e ajuste:

```json
{
  "nome": "Nome Completo",
  "cargo": "Cargo / Função",
  "foto": "assets/fotos/novo.jpg",
  "badgeNumero": "0",
  "badgeTexto": "descrição do indicador",
  "badgeIcone": "fa-solid fa-chart-line",
  "corTema": "#357F82",
  "tags": ["SRE", "DevOps"],
  "entregas": ["Primeira entrega da semana."]
}
```

`corTema` define a cor de destaque do card (faixa superior, ícones, badge).
Sugestões da paleta atual: `#259A6C` (verde), `#357F82` (petróleo),
`#6F8794` (cinza corporativo), `#BB9748` (dourado), `#3FB585` (verde claro).

Também é possível adicionar/remover analistas **direto na interface**, em
**Modo Edição** (botão "Editar" → "Add" / botão "×" no card) — útil para
ajustes pontuais durante a própria Daily, mas para que a mudança valha para
todo o time, replique-a em `analistas.json`.

### Trocar/adicionar fotos
Coloque o arquivo em `assets/fotos/` (formato quadrado, ex. 200×200px,
JPEG) e referencie em `"foto"`. Alternativamente, em **Modo Edição**, clique
na foto do card para enviar uma imagem do computador — ela é redimensionada
automaticamente e fica salva no navegador de quem fez o upload (não é
compartilhada com o time; para isso, adicione o arquivo ao repositório).

---

## 3. Modo edição (uso durante a Daily)

Clique em **Editar** na barra de ferramentas para:

- Editar título, subtítulo, descrição, data e qualquer texto dos cards
  (clique no texto, edite, clique fora ou pressione Enter para confirmar).
- Adicionar/remover entregas (botão "Adicionar entrega" / "×" em cada item).
- Adicionar/remover analistas.
- Trocar a foto de um analista (clique na foto — no toque/tablet há um
  selo de câmera sempre visível indicando a área clicável).

Clique em **Salvar** (ou `Ctrl+S` / `Cmd+S`) para persistir as alterações no
navegador atual. **Esc** sai do modo edição.

> Importante: o "Salvar" grava no **LocalStorage do navegador** (por
> dispositivo). Para que a mudança apareça para todo o time, edite
> `data/analistas.json` e publique (veja seção 2).

---

## 4. Exportação

- **Imagem (PNG)**: gera uma captura completa da página — cabeçalho, todos
  os cards (com **todas** as entregas, mesmo as que ficam ocultas pelo
  scroll interno na tela) e rodapé. Útil para enviar o resumo da Daily por
  chat/e-mail.
- **Exportar (JSON)**: baixa um arquivo `dados-daily-AAAA-Wxx.json` com todo
  o conteúdo atual (inclui fotos enviadas via upload). Pode ser usado como
  backup ou para transferir o estado para outro navegador via **Importar**.
- **Link**: copia a URL atual para a área de transferência, preservando o
  filtro de busca e a ordenação ativos (útil para compartilhar uma visão já
  filtrada, ex. "entregas do Anderson").

---

## 5. Publicando no GitHub Pages

1. Crie um repositório no GitHub e envie todo o conteúdo desta pasta para a
   raiz (branch `main`).
2. Em **Settings → Pages**, selecione a branch `main` e a pasta `/ (root)`.
3. Aguarde alguns minutos — o GitHub fornecerá uma URL no formato
   `https://<usuario>.github.io/<repositorio>/`.

### ⚠️ Não abra `index.html` diretamente pelo navegador (`file://`)
O app carrega `data/analistas.json` via `fetch`, que **não funciona** com o
protocolo `file://` em navegadores modernos (bloqueio de CORS/segurança).
Para testar localmente, sirva a pasta por HTTP, por exemplo:

```bash
python -m http.server 8000
# depois acesse http://localhost:8000
```

Se o `fetch` falhar (sem servidor, sem rede), o app usa o último estado
salvo no navegador ou, na primeira vez, dados de demonstração — então a tela
nunca fica em branco.

---

## 6. Logo Sicredi (opcional)

Coloque o arquivo em `assets/img/logo.png`. Se o arquivo não existir, o
espaço do logo simplesmente não é exibido (sem erro). No tema escuro o logo é
exibido em branco (`filter: brightness(0) invert(1)`); no tema claro, com as
cores originais do PNG.

---

## 7. Compatibilidade

Testado em Chrome/Edge/Firefox/Safari recentes, em resoluções Desktop Full
HD, Ultrawide, Notebook, iPad/Android (tablet) e iPhone/Android (celular).
Recursos usados: `fetch`, `LocalStorage`, `Canvas` (compressão de fotos),
`URLSearchParams`, `clipboard API` (com fallback via `execCommand`),
[html2canvas](https://html2canvas.hertzen.com/) (exportação PNG, via CDN).
