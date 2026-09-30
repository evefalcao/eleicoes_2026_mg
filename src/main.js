import "@fontsource-variable/inter";
import "@fontsource/fraunces/600.css";
import "@fontsource/fraunces/700.css";
import "./style.css";
import { FAIXAS, PARTIDOS, ORIGEM_NOTA } from "./partidos.js";

const CARGOS = [
  { id: "presidente", nome: "Presidente", escopo: "Brasil", majoritario: true, companheiro: "Vice" },
  { id: "governador", nome: "Governador", escopo: "MG", majoritario: true, companheiro: "Vice" },
  { id: "senador", nome: "Senador", escopo: "MG", majoritario: true, companheiro: "Suplentes" },
  { id: "federal", nome: "Deputado federal", escopo: "MG", majoritario: false },
  { id: "estadual", nome: "Deputado estadual", escopo: "MG", majoritario: false },
];
const INATIVAS = new Set(["Renúncia", "Indeferido", "Cancelado"]);
const POR_PAGINA = 60;
const SVG = "http://www.w3.org/2000/svg";

const BASE = import.meta.env.BASE_URL;
const { meta, candidatos: TODOS } = await fetch(`${BASE}data/candidatos.json`).then((r) => r.json());

// Cortes do artigo: 0–1,5 | 1,51–3 | 3,01–4,49 | 4,5–5,5 | 5,51–7 | 7,01–8,5 | 8,51–10
function faixaDe(nota) {
  if (nota <= 1.5) return FAIXAS[0];
  if (nota <= 3) return FAIXAS[1];
  if (nota < 4.5) return FAIXAS[2];
  if (nota <= 5.5) return FAIXAS[3];
  if (nota <= 7) return FAIXAS[4];
  if (nota <= 8.5) return FAIXAS[5];
  return FAIXAS[6];
}

function partido(num) {
  const p = PARTIDOS[num];
  if (!p) return { sigla: String(num), abrev: String(num), nome: "Partido " + num, nota: 5, origem: "estimada", faixa: FAIXAS[3] };
  if (!p.faixa) { p.faixa = faixaDe(p.nota); p.abrev = p.abrev || p.sigla; p.numero = num; }
  return p;
}
const cor = (faixa) => `var(--f-${faixa.id})`;
const fmtNota = (n) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtNum = (n) => n.toLocaleString("pt-BR");
const semAcento = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const iniciais = (nome) => nome.split(" ").filter((p) => p.length > 2).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
const fotoUrl = (sq) => `${BASE}fotos/${sq}.jpg`;
// Ficha oficial no DivulgaCandContas: #/candidato/{região}/{UF}/{eleição}/{SQ}/{ano}/{UE}
const ID_ELEICAO_TSE = "20322002026";
const REGIAO = { BR: "BR", MG: "SUDESTE" };
const urlTse = (c) =>
  `https://divulgacandcontas.tse.jus.br/divulga/#/candidato/${REGIAO[c.abrangencia]}/${c.abrangencia}/${ID_ELEICAO_TSE}/${c.sq}/2026/${c.abrangencia}`;
const ativa = (c) => !INATIVAS.has(c.situacao);

for (const c of TODOS) {
  c.p = partido(c.partidoNumero);
  c._busca = semAcento(`${c.urna} ${c.nome} ${c.numero} ${c.p.sigla}`);
}

// ---------- Estado ----------
const estado = {
  cargo: "presidente", busca: "", partido: "", faixa: "", genero: "", ordem: "espectro",
  inativos: false, limite: POR_PAGINA,
};
const $ = (id) => document.getElementById(id);
const el = {
  abas: $("abas"), espectro: $("espectro"), sub: $("sub-espectro"), tooltip: $("tooltip"),
  busca: $("f-busca"), partido: $("f-partido"), faixa: $("f-faixa"), genero: $("f-genero"),
  ordem: $("f-ordem"), inativos: $("f-inativos"), contagem: $("contagem"), limpar: $("btn-limpar"),
  grade: $("grade"), mais: $("btn-mais"), detalhe: $("detalhe"), detConteudo: $("det-conteudo"),
  tabela: document.querySelector("#tabela-partidos tbody"), thCargo: $("th-cargo"),
};
const cargoAtual = () => CARGOS.find((c) => c.id === estado.cargo);
const doCargo = () => TODOS.filter((c) => c.cargo === estado.cargo);

// Tudo menos o partido: o espectro mostra os partidos e destaca o escolhido.
function filtrarBase() {
  const q = semAcento(estado.busca.trim());
  return doCargo().filter((c) =>
    (estado.inativos || ativa(c)) &&
    (!q || c._busca.includes(q)) &&
    (!estado.faixa || c.p.faixa.id === estado.faixa) &&
    (!estado.genero || c.genero === estado.genero));
}
const passaPartido = (c) => !estado.partido || String(c.partidoNumero) === estado.partido;

function ordenar(lista) {
  const porNome = (a, b) => a.urna.localeCompare(b.urna, "pt-BR");
  const f = {
    espectro: (a, b) => a.p.nota - b.p.nota || a.p.sigla.localeCompare(b.p.sigla) || porNome(a, b),
    nome: porNome,
    numero: (a, b) => Number(a.numero) - Number(b.numero),
    idade: (a, b) => (a.idade ?? 999) - (b.idade ?? 999) || porNome(a, b),
  }[estado.ordem];
  return lista.slice().sort((a, b) => (ativa(b) - ativa(a)) || f(a, b));
}

// ---------- Abas ----------
function renderAbas() {
  el.abas.innerHTML = "";
  for (const c of CARGOS) {
    const n = TODOS.filter((x) => x.cargo === c.id && ativa(x)).length;
    const b = document.createElement("button");
    b.className = "aba";
    b.type = "button";
    b.setAttribute("role", "tab");
    b.setAttribute("aria-selected", String(c.id === estado.cargo));
    b.innerHTML = `${esc(c.nome)}<small>${c.escopo} · ${fmtNum(n)}</small>`;
    b.addEventListener("click", () => trocarCargo(c.id));
    el.abas.appendChild(b);
  }
}

function trocarCargo(id) {
  if (!CARGOS.some((c) => c.id === id)) id = "presidente";
  estado.cargo = id;
  estado.partido = "";
  estado.limite = POR_PAGINA;
  history.replaceState(null, "", "#" + id);
  renderAbas();
  renderSelects();
  render();
}

// ---------- Filtros ----------
function opcoes(select, itens, rotuloTodos) {
  const atual = select.value;
  select.innerHTML = `<option value="">${rotuloTodos}</option>` +
    itens.map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join("");
  select.value = itens.some(([v]) => String(v) === atual) ? atual : "";
}

function renderSelects() {
  const lista = doCargo().filter((c) => estado.inativos || ativa(c));
  const cont = {};
  for (const c of lista) cont[c.partidoNumero] = (cont[c.partidoNumero] || 0) + 1;
  const partidos = Object.keys(cont).map(Number).sort((a, b) => partido(a).nota - partido(b).nota);
  opcoes(el.partido, partidos.map((n) => [n, `${partido(n).sigla} (${cont[n]})`]), "Todos");
  el.partido.value = estado.partido;
  opcoes(el.faixa, FAIXAS.map((f) => [f.id, f.nome]), "Todas as faixas");
  el.faixa.value = estado.faixa;
  const generos = [...new Set(lista.map((c) => c.genero).filter(Boolean))].sort();
  opcoes(el.genero, generos.map((g) => [g, g]), "Todos");
  if (!generos.includes(estado.genero)) estado.genero = "";
  el.genero.value = estado.genero;
}

function ligarFiltros() {
  let t;
  el.busca.addEventListener("input", () => {
    clearTimeout(t);
    t = setTimeout(() => { estado.busca = el.busca.value; estado.limite = POR_PAGINA; render(); }, 120);
  });
  for (const [k, s] of [["partido", el.partido], ["faixa", el.faixa], ["genero", el.genero], ["ordem", el.ordem]]) {
    s.addEventListener("change", () => { estado[k] = s.value; estado.limite = POR_PAGINA; render(); });
  }
  el.inativos.addEventListener("change", () => {
    estado.inativos = el.inativos.checked; estado.limite = POR_PAGINA; renderSelects(); render();
  });
  el.limpar.addEventListener("click", () => {
    Object.assign(estado, { busca: "", partido: "", faixa: "", genero: "", limite: POR_PAGINA });
    el.busca.value = "";
    renderSelects();
    render();
  });
  el.mais.addEventListener("click", () => { estado.limite += POR_PAGINA * 2; renderGrade(); });
  $("btn-metodo").addEventListener("click", () => $("metodo").scrollIntoView({ behavior: "smooth" }));
}

function selecionarPartido(num) {
  estado.partido = estado.partido === String(num) ? "" : String(num);
  el.partido.value = estado.partido;
  estado.limite = POR_PAGINA;
  render();
}

// ---------- Espectro (beeswarm de um lado só) ----------
function empilhar(itens, gap) {
  const postos = [];
  const ordenados = itens.slice().sort((a, b) => a.x - b.x || b.r - a.r);
  for (const it of ordenados) {
    const cands = [it.r];
    for (const p of postos) {
      const d = it.r + p.r + gap;
      const dx = Math.abs(it.x - p.x);
      if (dx < d) {
        const dy = Math.sqrt(d * d - dx * dx);
        cands.push(p.y + dy);
        if (p.y - dy >= it.r) cands.push(p.y - dy);
      }
    }
    cands.sort((a, b) => a - b);
    it.y = cands.find((y) => postos.every((p) => {
      const d = it.r + p.r + gap;
      return (it.x - p.x) ** 2 + (y - p.y) ** 2 >= d * d - 0.01;
    }));
    postos.push(it);
  }
  return ordenados;
}

function no(tag, attrs, pai) {
  const n = document.createElementNS(SVG, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (pai) pai.appendChild(n);
  return n;
}

function corTextoSobre(faixa) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(`--f-${faixa.id}`).trim();
  const m = v.match(/^#(..)(..)(..)$/);
  if (!m) return "#fff";
  const [r, g, b] = m.slice(1).map((h) => parseInt(h, 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.3 ? "#0b0b0b" : "#ffffff";
}

function renderEspectro(base) {
  const cargo = cargoAtual();
  const W = Math.max(300, el.espectro.clientWidth);
  const estreito = W < 640;
  const lista = cargo.majoritario ? base : base.filter(passaPartido);
  const baseTotal = doCargo().filter((c) => estado.inativos || ativa(c));

  let itens;
  if (cargo.majoritario) {
    const r = estreito ? 17 : 22;
    itens = base.map((c) => ({ tipo: "pessoa", c, nota: c.p.nota, r }));
  } else {
    const grupos = new Map();
    for (const c of base) grupos.set(c.partidoNumero, (grupos.get(c.partidoNumero) || 0) + 1);
    const maxTotal = Math.max(1, ...Object.values(baseTotal.reduce((a, c) => ((a[c.partidoNumero] = (a[c.partidoNumero] || 0) + 1), a), {})));
    const rMax = estreito ? 26 : 36;
    itens = [...grupos].map(([num, n]) => ({
      tipo: "partido", num, n, p: partido(num), nota: partido(num).nota,
      r: Math.max(estreito ? 9 : 11, rMax * Math.sqrt(n / maxTotal)),
    }));
  }
  const rMaior = Math.max(22, ...itens.map((i) => i.r));
  const m = rMaior + 4;
  const x = (v) => m + (v / 10) * (W - 2 * m);
  for (const it of itens) it.x = x(it.nota);
  empilhar(itens, cargo.majoritario ? 3 : 2);

  const topo = 12;
  const alturaPlot = Math.max(120, Math.max(0, ...itens.map((i) => i.y + i.r)) + topo + (cargo.majoritario ? 0 : 14));
  const base0 = alturaPlot;
  const H = base0 + (estreito ? 62 : 58);

  const svg = no("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H });
  // Faixas ao fundo + barra colorida + rótulos com contagem
  const contFaixa = {};
  for (const c of lista) contFaixa[c.p.faixa.id] = (contFaixa[c.p.faixa.id] || 0) + 1;
  for (const f of FAIXAS) {
    const x0 = x(f.min), x1 = x(f.max);
    no("rect", { x: x0, y: 0, width: x1 - x0, height: base0, fill: cor(f), style: "fill-opacity: var(--band-alpha)" }, svg);
    no("rect", { x: x0 + 1, y: base0, width: x1 - x0 - 2, height: 6, rx: 2, fill: cor(f) }, svg);
    const cx = (x0 + x1) / 2;
    const k = contFaixa[f.id] || 0;
    if (estreito) {
      // Em telas estreitas os rótulos alternam entre duas linhas para não colidir.
      const i = FAIXAS.indexOf(f);
      const rot = no("text", { x: cx, y: base0 + 22 + (i % 2) * 15, "text-anchor": "middle", class: "faixa-rot" }, svg);
      rot.textContent = f.curto + " ";
      no("tspan", { class: "faixa-n" }, rot).textContent = k ? fmtNum(k) : "—";
    } else {
      no("text", { x: cx, y: base0 + 24, "text-anchor": "middle", class: "faixa-rot" }, svg).textContent = f.nome;
      no("text", { x: cx, y: base0 + 40, "text-anchor": "middle", class: "faixa-n" }, svg).textContent = k ? fmtNum(k) : "—";
    }
  }
  for (let v = 0; v <= 10; v += estreito ? 5 : 1) {
    no("line", { x1: x(v), x2: x(v), y1: base0 + 6, y2: base0 + 9, class: "eixo" }, svg);
  }
  const t0 = no("text", { x: x(0), y: H - 2, class: "tick", "text-anchor": "start" }, svg);
  t0.textContent = "← esquerda (0)";
  const t10 = no("text", { x: x(10), y: H - 2, class: "tick", "text-anchor": "end" }, svg);
  t10.textContent = "direita (10) →";

  if (!itens.length) {
    const v = no("text", { x: W / 2, y: base0 / 2, "text-anchor": "middle", class: "vazio" }, svg);
    v.textContent = "Nenhuma candidatura com esses filtros";
  }

  const defs = no("defs", {}, svg);
  const rotulosFora = [];
  itens.forEach((it, i) => {
    const cy = base0 - it.y;
    const g = no("g", { class: "item", transform: `translate(${it.x.toFixed(1)},${cy.toFixed(1)})`, tabindex: 0, role: "button" }, svg);
    if (it.tipo === "pessoa") {
      const c = it.c;
      g.setAttribute("aria-label", `${c.urna}, ${c.p.sigla}, ${c.p.faixa.nome}`);
      if (!ativa(c)) g.classList.add("inativo");
      if (!passaPartido(c)) g.classList.add("apagado");
      no("circle", { r: it.r, class: "fundo" }, g);
      if (c.foto) {
        const cp = no("clipPath", { id: `cp${i}` }, defs);
        no("circle", { r: it.r }, cp);
        no("image", { href: fotoUrl(c.sq), x: -it.r, y: -it.r, width: it.r * 2, height: it.r * 2.8, preserveAspectRatio: "xMidYMin slice", "clip-path": `url(#cp${i})` }, g);
      } else {
        const t = no("text", { "text-anchor": "middle", dy: "0.35em", class: "bolha-n" }, g);
        t.textContent = iniciais(c.urna);
      }
      const anel = no("circle", { r: it.r - 1, class: "anel", stroke: cor(c.p.faixa) }, g);
      if (c.p.origem === "estimada") anel.setAttribute("stroke-dasharray", "4 3");
      g.addEventListener("click", () => abrirDetalhe(c));
      g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); abrirDetalhe(c); } });
      ligarTooltip(g, () => `<b>${esc(c.urna)} · ${esc(c.numero)}</b><span>${esc(c.p.sigla)} · nota ${fmtNota(c.p.nota)} · ${esc(c.p.faixa.nome)}</span>${ativa(c) ? "" : `<br><span>${esc(c.situacao)}</span>`}`);
    } else {
      const p = it.p;
      g.setAttribute("aria-label", `${p.sigla}: ${it.n} candidaturas, ${p.faixa.nome}. Filtrar.`);
      if (estado.partido && estado.partido !== String(it.num)) g.classList.add("apagado");
      if (estado.partido === String(it.num)) g.classList.add("sel");
      no("circle", { r: it.r, fill: cor(p.faixa), class: "bolha" + (p.origem === "estimada" ? " estimada" : "") }, g);
      const fs = Math.min(11, (2 * it.r - 5) / (p.abrev.length * 0.72));
      if (fs >= 7) {
        const fill = corTextoSobre(p.faixa);
        const duas = it.r >= 22;
        const t = no("text", { "text-anchor": "middle", dy: duas ? "-0.1em" : "0.35em", class: "bolha-rot", fill, "font-size": fs.toFixed(1) }, g);
        t.textContent = p.abrev;
        if (duas) {
          const n = no("text", { "text-anchor": "middle", dy: "1.2em", class: "bolha-n", fill }, g);
          n.textContent = fmtNum(it.n);
        }
      } else {
        rotulosFora.push({ it, g, texto: p.abrev });
      }
      g.addEventListener("click", () => selecionarPartido(it.num));
      g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selecionarPartido(it.num); } });
      ligarTooltip(g, () => `<b>${esc(p.sigla)} · ${fmtNum(it.n)} candidatura${it.n > 1 ? "s" : ""}</b><span>${esc(p.nome)}<br>nota ${fmtNota(p.nota)} · ${esc(p.faixa.nome)}${p.origem !== "survey" ? ` (${esc(ORIGEM_NOTA[p.origem].toLowerCase())})` : ""}</span>`);
    }
  });

  // Rótulos fora da bolha só entram se não colidirem com bolhas nem com outros rótulos.
  const caixas = [];
  const livre = (b) => b.x0 >= 0 && b.x1 <= W && b.y0 >= 0 &&
    caixas.every((c) => b.x1 < c.x0 || b.x0 > c.x1 || b.y1 < c.y0 || b.y0 > c.y1) &&
    itens.every((o) => {
      const cy = base0 - o.y, nx = Math.max(b.x0, Math.min(o.x, b.x1)), ny = Math.max(b.y0, Math.min(cy, b.y1));
      return (o.x - nx) ** 2 + (cy - ny) ** 2 > o.r * o.r;
    });
  for (const { it, g, texto } of rotulosFora) {
    const w = texto.length * 6.8, cy = base0 - it.y;
    const opcoes = [
      { dx: 0, dy: -it.r - 4, anchor: "middle", b: { x0: it.x - w / 2, x1: it.x + w / 2, y0: cy - it.r - 15, y1: cy - it.r - 3 } },
      { dx: it.r + 3, dy: 4, anchor: "start", b: { x0: it.x + it.r + 2, x1: it.x + it.r + 3 + w, y0: cy - 7, y1: cy + 6 } },
      { dx: -it.r - 3, dy: 4, anchor: "end", b: { x0: it.x - it.r - 3 - w, x1: it.x - it.r - 2, y0: cy - 7, y1: cy + 6 } },
    ];
    const ok = opcoes.find((o) => livre(o.b));
    if (!ok) continue;
    caixas.push(ok.b);
    const t = no("text", { x: ok.dx, y: ok.dy, "text-anchor": ok.anchor, class: "rot-fora" }, g);
    t.textContent = texto;
  }

  el.espectro.replaceChildren(svg);
  el.espectro.setAttribute("aria-label", `Espectro político das candidaturas a ${cargo.nome.toLowerCase()}`);
  el.sub.textContent = cargo.majoritario
    ? "Cada foto é uma candidatura, posicionada pela nota do seu partido. Clique para ver a ficha."
    : "Cada círculo é um partido; o tamanho indica quantas candidaturas ele lançou. Clique para filtrar.";
}

function ligarTooltip(g, html) {
  const painel = el.espectro.closest(".painel");
  const mover = (e) => {
    const r = painel.getBoundingClientRect();
    const tt = el.tooltip;
    let left = e.clientX - r.left + 14;
    if (left + tt.offsetWidth > r.width - 8) left = e.clientX - r.left - tt.offsetWidth - 14;
    tt.style.left = Math.max(8, left) + "px";
    tt.style.top = (e.clientY - r.top - tt.offsetHeight - 12) + "px";
  };
  g.addEventListener("pointerenter", (e) => {
    if (e.pointerType === "touch") return;
    el.tooltip.innerHTML = html();
    el.tooltip.hidden = false;
    mover(e);
  });
  g.addEventListener("pointermove", (e) => { if (!el.tooltip.hidden) mover(e); });
  g.addEventListener("pointerleave", () => { el.tooltip.hidden = true; });
}

// ---------- Grade ----------
let listaAtual = [];

function chipPartido(p) {
  return `<span class="partido"><i class="ponto${p.origem === "estimada" ? " estimada" : ""}" style="background:${cor(p.faixa)}"></i><b>${esc(p.sigla)}</b> ${esc(p.faixa.nome)}</span>`;
}

function seloSituacao(c) {
  if (c.situacao === "Deferido") return "";
  const ruim = INATIVAS.has(c.situacao) || c.situacao.startsWith("Indeferido");
  return `<span class="selo${ruim ? " ruim" : ""}">${esc(c.situacao)}</span>`;
}

function linhaChapa(c) {
  const cargo = cargoAtual();
  if (!cargo.majoritario || !c.chapa) return "";
  const membros = c.chapa.filter((m) => m.naUrna === c.naUrna);
  if (!membros.length) return "";
  return `<p class="chapa">${cargo.companheiro}: ${membros.map((m) => esc(m.urna) + (m.partidoNumero !== c.partidoNumero ? ` (${esc(partido(m.partidoNumero).sigla)})` : "")).join(", ")}</p>`;
}

function fotoHtml(c, comNumero) {
  return `<div class="foto">${c.foto ? `<img loading="lazy" src="${fotoUrl(c.sq)}" alt="">` : `<span class="ini">${esc(iniciais(c.urna))}</span>`}${comNumero ? `<span class="numero">${esc(c.numero)}</span>` : ""}</div>`;
}

function renderGrade() {
  const vis = listaAtual.slice(0, estado.limite);
  if (!vis.length) {
    el.grade.innerHTML = `<p class="vazio-lista">Nenhuma candidatura encontrada.</p>`;
  } else {
    el.grade.innerHTML = vis.map((c, i) => `
      <button type="button" class="card${ativa(c) ? "" : " inativo"}" data-i="${i}" aria-label="${esc(c.urna)}, ${esc(c.numero)}, ${esc(c.p.sigla)}">
        ${fotoHtml(c, true)}
        <div class="faixa-barra" style="background:${cor(c.p.faixa)}"></div>
        <div class="card-corpo">
          <h3>${esc(c.urna)}</h3>
          ${chipPartido(c.p)}
          ${linhaChapa(c)}
          ${seloSituacao(c)}
        </div>
      </button>`).join("");
  }
  const resta = listaAtual.length - vis.length;
  el.mais.hidden = resta <= 0;
  el.mais.textContent = `Mostrar mais (${fmtNum(resta)} restantes)`;
}

el.grade.addEventListener("click", (e) => {
  const b = e.target.closest(".card");
  if (b) abrirDetalhe(listaAtual[Number(b.dataset.i)]);
});

// ---------- Tabela de partidos ----------
function renderTabela() {
  const cargo = cargoAtual();
  el.thCargo.textContent = `(${cargo.nome.toLowerCase()})`;
  const cont = {};
  for (const c of doCargo()) if (ativa(c)) cont[c.partidoNumero] = (cont[c.partidoNumero] || 0) + 1;
  const nums = Object.keys(PARTIDOS).map(Number).sort((a, b) => partido(a).nota - partido(b).nota);
  el.tabela.innerHTML = nums.map((n) => {
    const p = partido(n);
    const k = cont[n] || 0;
    return `<tr class="${k ? "clicavel" : ""}" data-n="${n}" ${k ? 'tabindex="0"' : ""}>
      <td>${chipPartido({ ...p, faixa: { ...p.faixa, nome: "" } })}<small>${esc(p.nome)} · nº ${n}</small></td>
      <td class="num">${fmtNota(p.nota)}</td>
      <td>${esc(p.faixa.nome)}</td>
      <td>${esc(ORIGEM_NOTA[p.origem])}${p.obs ? `<small>${esc(p.obs)}</small>` : ""}</td>
      <td class="num">${k ? fmtNum(k) : "—"}</td></tr>`;
  }).join("");
}
const aoEscolherLinha = (tr) => {
  if (!tr || !tr.classList.contains("clicavel")) return;
  estado.partido = "";
  selecionarPartido(tr.dataset.n);
  $("filtros").scrollIntoView({ behavior: "smooth", block: "start" });
};
el.tabela.addEventListener("click", (e) => aoEscolherLinha(e.target.closest("tr")));
el.tabela.addEventListener("keydown", (e) => { if (e.key === "Enter") aoEscolherLinha(e.target.closest("tr")); });

// ---------- Detalhe ----------
function miniEspectro(p) {
  const W = 600, m = 8, x = (v) => m + (v / 10) * (W - 2 * m);
  const faixas = FAIXAS.map((f) => `<rect x="${x(f.min) + 1}" y="14" width="${x(f.max) - x(f.min) - 2}" height="8" rx="2" fill="${cor(f)}" opacity="${f.id === p.faixa.id ? 1 : 0.35}"/>`).join("");
  const px = x(p.nota);
  return `<svg viewBox="0 0 ${W} 44" aria-hidden="true">${faixas}
    <line x1="${px}" x2="${px}" y1="6" y2="30" stroke="currentColor" stroke-width="2.5"/>
    <circle cx="${px}" cy="18" r="6" fill="${cor(p.faixa)}" stroke="currentColor" stroke-width="2" ${p.origem === "estimada" ? 'stroke-dasharray="3 2"' : ""}/>
    <text x="${m}" y="42" font-size="11" fill="var(--muted)">0 · esquerda</text>
    <text x="${W - m}" y="42" font-size="11" fill="var(--muted)" text-anchor="end">direita · 10</text></svg>`;
}

const COM_USUARIO = new Set(["Instagram", "X", "TikTok", "Threads", "Kwai", "YouTube"]);
// Um link por URL, com o nome de usuário quando a rede for conhecida.
function redesUnicas(redes) {
  const vistos = new Set();
  return redes.filter((r) => {
    const k = r.url.replace(/[?#].*$/, "").replace(/\/+$/, "").replace(/^https?:\/\/(www\.)?/, "");
    return !vistos.has(k) && vistos.add(k);
  }).map((r) => {
    const partes = r.url.replace(/[?#].*$/, "").split("/").filter(Boolean).slice(2);
    const usuario = COM_USUARIO.has(r.rede) && partes.length ? partes[partes.length - 1].replace(/^@/, "") : "";
    return { url: r.url, rotulo: usuario && usuario.length < 30 ? `${r.rede} · ${usuario}` : r.rede };
  });
}

function abrirDetalhe(c) {
  const cargo = CARGOS.find((x) => x.id === c.cargo);
  const p = c.p;
  const brl = (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  const dados = [
    ["Idade na posse", c.idade != null ? `${c.idade} anos` : null],
    ["Gênero", c.genero],
    ["Cor/raça", c.corRaca],
    ["Grau de instrução", c.instrucao],
    ["Ocupação", c.ocupacao],
    ["Estado civil", c.estadoCivil],
    ["Naturalidade", c.naturalidade],
    ["Limite de gastos", c.despesaMax ? brl(c.despesaMax) : null],
  ].filter(([, v]) => v);
  const agremiacao = c.coligacao
    ? `<b>Coligação ${esc(c.coligacao)}</b><br>${esc(c.composicao)}`
    : c.composicao ? esc(c.composicao) : "Partido isolado";
  const chapa = (c.chapa || []).filter((m) => m.naUrna === c.naUrna || !c.naUrna);
  el.detConteudo.innerHTML = `
    <button type="button" class="det-fechar" aria-label="Fechar">×</button>
    <div class="det-topo">
      ${fotoHtml(c, false)}
      <div>
        <h2 id="det-nome">${esc(c.urna)}</h2>
        <p class="nome-civil">${esc(c.nome)} · ${esc(cargo.nome)}${cargo.escopo === "MG" ? " por Minas Gerais" : ""}</p>
        <div class="det-num">${esc(c.numero)}<small>número na urna</small></div>
        ${seloSituacao(c) || `<span class="selo" style="background:var(--surface-2);color:var(--ink-2)">Candidatura deferida</span>`}
        ${c.naUrna && INATIVAS.has(c.situacao) ? `<p class="nota-obs">O nome ainda aparece na urna, mas a candidatura não está válida.</p>` : ""}
        <p class="link-tse"><a href="${urlTse(c)}" target="_blank" rel="noopener">Ver candidatura no TSE (DivulgaCandContas) ↗</a></p>
      </div>
    </div>

    <div class="det-sec">
      <h3>Partido e espectro</h3>
      ${chipPartido(p)} <span class="partido">· nota ${fmtNota(p.nota)} de 10</span>
      <div class="mini-espectro">${miniEspectro(p)}</div>
      <p class="nota-obs">${esc(p.nome)}. ${esc(ORIGEM_NOTA[p.origem])}.${p.obs ? " " + esc(p.obs) : ""}</p>
      <p class="nota-obs">${agremiacao}</p>
    </div>

    ${chapa.length ? `<div class="det-sec"><h3>${cargo.companheiro === "Vice" ? "Vice na chapa" : "Suplentes"}</h3><div class="chapa-lista">
      ${chapa.map((m) => `<div class="chapa-item">${m.foto ? `<img src="${fotoUrl(m.sq)}" alt="">` : `<span class="ini-mini"></span>`}
        <div><b>${esc(m.urna)}</b><span>${esc(m.cargo)} · ${esc(partido(m.partidoNumero).sigla)}${m.situacao !== "Deferido" ? " · " + esc(m.situacao) : ""}</span></div></div>`).join("")}
    </div></div>` : ""}

    ${dados.length ? `<div class="det-sec"><h3>Perfil</h3><dl class="dados">${dados.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl></div>` : ""}

    ${c.redes.length ? `<div class="det-sec"><h3>Redes e sites</h3><div class="redes">${redesUnicas(c.redes).map((r) => `<a href="${esc(r.url)}" target="_blank" rel="noopener nofollow">${esc(r.rotulo)}</a>`).join("")}</div></div>` : ""}
  `;
  el.detConteudo.querySelector(".det-fechar").addEventListener("click", () => el.detalhe.close());
  el.tooltip.hidden = true;
  if (!el.detalhe.open) el.detalhe.showModal();
  el.detalhe.scrollTop = 0;
  history.replaceState(null, "", `#${c.cargo}/${c.sq}`);
}
el.detalhe.addEventListener("click", (e) => { if (e.target === el.detalhe) el.detalhe.close(); });
el.detalhe.addEventListener("close", () => history.replaceState(null, "", "#" + estado.cargo));

// ---------- Render ----------
function render() {
  const base = filtrarBase();
  listaAtual = ordenar(base.filter(passaPartido));
  renderEspectro(base);
  renderGrade();
  renderTabela();
  const cargo = cargoAtual();
  const total = doCargo().filter((c) => estado.inativos || ativa(c)).length;
  const filtrado = estado.busca || estado.partido || estado.faixa || estado.genero;
  el.contagem.textContent = filtrado
    ? `${fmtNum(listaAtual.length)} de ${fmtNum(total)} candidaturas a ${cargo.nome.toLowerCase()}`
    : `${fmtNum(total)} candidaturas a ${cargo.nome.toLowerCase()}${cargo.escopo === "MG" ? " em Minas Gerais" : ""}`;
  el.limpar.hidden = !filtrado;
}

// ---------- Início ----------
if (meta.geradoEm) $("gerado-em").textContent = meta.geradoEm.replace(" ", " às ");
if (meta.dataEleicao) {
  const [d, mth, y] = meta.dataEleicao.split("/").map(Number);
  $("data-eleicao").textContent = new Date(y, mth - 1, d).toLocaleDateString("pt-BR", { day: "numeric", month: "long" });
}
ligarFiltros();
// Endereços: #cargo ou #cargo/SQ_CANDIDATO (abre a ficha).
function lerEndereco() {
  const [cargo, sq] = location.hash.slice(1).split("/");
  if (cargo !== estado.cargo || !el.abas.children.length) trocarCargo(cargo || "presidente");
  const c = sq && TODOS.find((x) => x.sq === sq);
  if (c) abrirDetalhe(c);
}
lerEndereco();
window.addEventListener("hashchange", lerEndereco);

let largura = el.espectro.clientWidth;
new ResizeObserver(() => {
  if (Math.abs(el.espectro.clientWidth - largura) < 4) return;
  largura = el.espectro.clientWidth;
  renderEspectro(filtrarBase());
}).observe(el.espectro);
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => renderEspectro(filtrarBase()));
