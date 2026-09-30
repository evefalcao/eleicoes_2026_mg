// Posição dos partidos no espectro esquerda–direita (0 = extrema esquerda, 10 = extrema direita).
//
// Fonte principal: média de 2022 do survey com especialistas em
// Bolognesi, Ribeiro, Codato & Silva, "O desaparecimento do centro ideológico no
// sistema partidário brasileiro: a classificação mais atualizada dos experts",
// Opinião Pública, v. 31 (2026). https://www.scielo.br/j/op/a/hv8GBg9hfCCZLwcWktfYhtC/
//
// origem:
//   "survey"   -> nota publicada no artigo para o próprio partido
//   "herdada"  -> partido renomeado; usa a nota da legenda anterior
//   "derivada" -> partido resultante de fusão; média das legendas que o formaram
//   "estimada" -> partido sem avaliação acadêmica; estimativa editorial, sujeita a revisão
export const FAIXAS = [
  { id: "ee", nome: "Extrema esquerda", curto: "Ext. esq.", min: 0, max: 1.5 },
  { id: "e", nome: "Esquerda", curto: "Esq.", min: 1.5, max: 3 },
  { id: "ce", nome: "Centro-esquerda", curto: "C.-esq.", min: 3, max: 4.5 },
  { id: "c", nome: "Centro", curto: "Centro", min: 4.5, max: 5.5 },
  { id: "cd", nome: "Centro-direita", curto: "C.-dir.", min: 5.5, max: 7 },
  { id: "d", nome: "Direita", curto: "Dir.", min: 7, max: 8.5 },
  { id: "ed", nome: "Extrema direita", curto: "Ext. dir.", min: 8.5, max: 10 },
];

export const PARTIDOS = {
  10: { sigla: "REPUBLICANOS", abrev: "REP", nome: "Republicanos", nota: 8.33, origem: "survey" },
  11: { sigla: "PP", nome: "Progressistas", nota: 8.15, origem: "survey" },
  12: { sigla: "PDT", nome: "Partido Democrático Trabalhista", nota: 3.86, origem: "survey" },
  13: { sigla: "PT", nome: "Partido dos Trabalhadores", nota: 2.68, origem: "survey" },
  14: { sigla: "MISSÃO", abrev: "MIS", nome: "Partido Missão", nota: 8.5, origem: "estimada",
        obs: "Registrado em 2025, não foi avaliado pelo survey. Posição estimada a partir do programa liberal-conservador do partido." },
  15: { sigla: "MDB", nome: "Movimento Democrático Brasileiro", nota: 6.5, origem: "survey" },
  16: { sigla: "PSTU", nome: "Partido Socialista dos Trabalhadores Unificado", nota: 0.51, origem: "survey" },
  18: { sigla: "REDE", nome: "Rede Sustentabilidade", nota: 3.69, origem: "survey" },
  20: { sigla: "PODE", nome: "Podemos", nota: 7.44, origem: "survey" },
  21: { sigla: "PCB", nome: "Partido Comunista Brasileiro", nota: 0.69, origem: "survey" },
  22: { sigla: "PL", nome: "Partido Liberal", nota: 8.8, origem: "survey" },
  23: { sigla: "CIDADANIA", abrev: "CID", nome: "Cidadania", nota: 6.17, origem: "survey" },
  25: { sigla: "PRD", nome: "Partido Renovação Democrática", nota: 8.16, origem: "derivada",
        obs: "Fusão de PTB (7,72) e Patriota (8,60) em 2023. Nota = média das duas." },
  27: { sigla: "DC", nome: "Democracia Cristã", nota: 8.21, origem: "survey" },
  28: { sigla: "PRTB", nome: "Partido Renovador Trabalhista Brasileiro", nota: 7.49, origem: "survey" },
  29: { sigla: "PCO", nome: "Partido da Causa Operária", nota: 0.55, origem: "survey" },
  30: { sigla: "NOVO", nome: "Partido Novo", nota: 8.67, origem: "survey" },
  33: { sigla: "MOBILIZA", abrev: "MOB", nome: "Mobilização Nacional", nota: 6.74, origem: "herdada",
        obs: "Antigo PMN. Usa a nota do PMN." },
  35: { sigla: "DEMOCRATA", abrev: "DEMO", nome: "Democrata", nota: 7.29, origem: "herdada",
        obs: "Antigo PMB (Partido da Mulher Brasileira), renomeado em 2025. Usa a nota do PMB." },
  36: { sigla: "AGIR", nome: "Agir", nota: 7.55, origem: "survey" },
  40: { sigla: "PSB", nome: "Partido Socialista Brasileiro", nota: 3.59, origem: "survey" },
  43: { sigla: "PV", nome: "Partido Verde", nota: 4.12, origem: "survey" },
  44: { sigla: "UNIÃO", abrev: "UNIÃO", nome: "União Brasil", nota: 8.49, origem: "survey" },
  45: { sigla: "PSDB", nome: "Partido da Social Democracia Brasileira", nota: 6.76, origem: "survey" },
  50: { sigla: "PSOL", nome: "Partido Socialismo e Liberdade", nota: 1.41, origem: "survey" },
  55: { sigla: "PSD", nome: "Partido Social Democrático", nota: 6.94, origem: "survey" },
  65: { sigla: "PCdoB", nome: "Partido Comunista do Brasil", nota: 1.78, origem: "survey" },
  70: { sigla: "AVANTE", abrev: "AVANTE", nome: "Avante", nota: 6.47, origem: "survey" },
  77: { sigla: "SOLIDARIEDADE", abrev: "SD", nome: "Solidariedade", nota: 6.01, origem: "survey" },
  80: { sigla: "UP", nome: "Unidade Popular", nota: 1.63, origem: "survey" },
};

export const ORIGEM_NOTA = {
  survey: "Nota do survey com especialistas (2022)",
  herdada: "Nota herdada da legenda anterior",
  derivada: "Nota derivada de fusão",
  estimada: "Estimativa editorial (sem avaliação acadêmica)",
};
