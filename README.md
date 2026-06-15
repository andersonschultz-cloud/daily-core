# 📊 Daily Core & Crédito — Sicredi DevOps

> Dashboard semanal de entregas do time SRE & DevOps.
> Totalmente estático, compatível com **GitHub Pages**.

---

## 🗂 Estrutura

```
/
├── index.html
├── css/
│   └── style.css
├── js/
│   └── app.js
├── data/
│   └── analistas.json      ← EDITE APENAS ESTE ARQUIVO
├── assets/
│   ├── fotos/              ← Adicione as fotos aqui
│   └── img/
└── README.md
```

---

## 🚀 Como publicar no GitHub Pages

1. Crie um repositório público no GitHub
2. Faça upload de todos os arquivos
3. Vá em **Settings → Pages**
4. Em **Source**, selecione `main` e `/ (root)`
5. Clique em **Save**
6. Acesse: `https://SEU_USUARIO.github.io/NOME_DO_REPO`

---

## ✏️ Como atualizar entregas semanalmente

1. Abra o arquivo `data/analistas.json`
2. Localize o analista desejado pelo campo `"nome"`
3. Edite o array `"entregas"`:

```json
"entregas": [
  "Nova entrega 1",
  "Nova entrega 2"
]
```

4. Salve o arquivo e faça commit no GitHub
5. A página atualiza automaticamente

---

## 👤 Como adicionar um analista

Adicione um novo objeto no array `"analistas"`:

```json
{
  "nome": "Nome Completo",
  "cargo": "Analista SRE e DevOps PL",
  "foto": "assets/fotos/nome.jpg",
  "badgeNumero": "99",
  "badgeTexto": "texto do badge",
  "badgeIcone": "fa-solid fa-server",
  "corTema": "#2ec4ff",
  "tags": ["SRE", "DevOps"],
  "entregas": [
    "Entrega 1",
    "Entrega 2"
  ]
}
```

---

## 🖼️ Como trocar fotos

1. Adicione a foto em `assets/fotos/`
2. Formato: `.jpg` ou `.png`, tamanho recomendado: **400×400px**
3. Atualize o campo `"foto"` no JSON:

```json
"foto": "assets/fotos/nome.jpg"
```

> Se a foto não existir, o sistema exibe as iniciais automaticamente.

---

## 🎨 Como personalizar cores

Altere o campo `"corTema"` de cada analista:

```json
"corTema": "#2ec4ff"   // azul
"corTema": "#ff9500"   // laranja
"corTema": "#7c5cff"   // roxo
"corTema": "#00e5a0"   // verde
"corTema": "#ff4fa3"   // rosa
```

A cor altera automaticamente: borda do card, badge, bullets e foto.

---

## 🔧 Ícones disponíveis (badgeIcone)

Use qualquer ícone do [Font Awesome 6](https://fontawesome.com/icons):

```
fa-solid fa-server
fa-solid fa-shield-halved
fa-solid fa-database
fa-solid fa-headset
fa-solid fa-chart-line
fa-solid fa-cloud
fa-solid fa-gear
```

---

## 📋 Funcionalidades

| Feature | Status |
|---|---|
| Cards dinâmicos via JSON | ✅ |
| Fotos com fallback de iniciais | ✅ |
| Busca em tempo real | ✅ |
| Ordenação (nome, cargo, entregas) | ✅ |
| Tema claro / escuro | ✅ |
| Exportar PDF | ✅ |
| Gerar link compartilhável | ✅ |
| Responsivo (mobile-first) | ✅ |
| Sem backend / sem Node.js | ✅ |
| GitHub Pages ready | ✅ |
