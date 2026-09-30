# Candidatos 2026 · Minas Gerais

Site estático com todas as candidaturas das eleições de 2026 para **presidente** (nacional) e para **governador, senador, deputado federal e deputado estadual** em Minas Gerais, com a posição de cada partido no espectro político.

## Rodar localmente

Requer Node 20+ e Python 3 (só para baixar os dados).

```sh
npm install
npm run dev       # servidor de desenvolvimento em http://localhost:5173
npm run build     # gera o site estático em dist/
npm run preview   # serve o dist/ para conferir o build
```

O build usa caminhos relativos (`base: "./"`), então `dist/` pode ser publicado em qualquer pasta, inclusive no GitHub Pages.

Links diretos: `#presidente`, `#governador`, `#senador`, `#federal`, `#estadual`, ou `#<cargo>/<SQ_CANDIDATO>` para abrir a ficha de uma candidatura.

## Atualizar os dados

O TSE atualiza os arquivos com frequência (situação das candidaturas, substituições, fotos).

```sh
npm run data:refresh   # baixa tudo de novo do TSE
npm run data           # reprocessa os arquivos já baixados em raw/
```

Os dados ficam em `public/` e são carregados pela página em tempo de execução: depois de atualizá-los, o `npm run dev` já mostra a versão nova.

O script (só biblioteca padrão do Python) baixa de [dadosabertos.tse.jus.br/dataset/candidatos-2026](https://dadosabertos.tse.jus.br/dataset/candidatos-2026):

- `consulta_cand_2026.zip`: candidaturas
- `consulta_cand_complementar_2026.zip`: situação do julgamento, idade, naturalidade, limite de gastos
- `rede_social_candidato_2026.zip`: redes sociais
- `foto_cand2026_MG_div.zip` e `foto_cand2026_BR_div.zip`: fotos

e gera `public/data/candidatos.json` e `public/fotos/<SQ_CANDIDATO>.jpg`. Vices e suplentes são ligados à cabeça de chapa pelo número. CPF, título de eleitor e e-mail não são incluídos.

Para outro estado, troque `UF = "MG"` em `scripts/build_data.py`.

## Espectro político

As notas ficam em `src/partidos.js`, que é editado à mão. A fonte é a média de 2022 do survey com especialistas de Bolognesi, Ribeiro, Codato & Silva, *O desaparecimento do centro ideológico no sistema partidário brasileiro* ([Opinião Pública, 2026](https://www.scielo.br/j/op/a/hv8GBg9hfCCZLwcWktfYhtC/)): escala de 0 (extrema esquerda) a 10 (extrema direita), com os cortes de faixa do artigo.

Partidos que não estão no survey:

| Partido | Tratamento |
|---|---|
| MOBILIZA (33) | antigo PMN, herda a nota do PMN |
| DEMOCRATA (35) | antigo PMB, herda a nota do PMB |
| PRD (25) | fusão PTB + Patriota, média das duas notas |
| MISSÃO (14) | sem avaliação acadêmica, **estimativa editorial** (8,5), destacada com contorno tracejado |

## Estrutura

```
index.html                    # entrada do Vite
vite.config.js
src/main.js                   # interface
src/partidos.js               # notas e faixas do espectro (editável)
src/style.css
public/data/candidatos.json   # gerado por npm run data
public/fotos/                 # gerado por npm run data
scripts/build_data.py         # download e tratamento dos dados do TSE
```

## Me dê um cafézinho
[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/M4M212BC7C)

### Chave Pix
falcao.eveline@gmail.com