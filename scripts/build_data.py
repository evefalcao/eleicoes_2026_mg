#!/usr/bin/env python3
"""Baixa os dados abertos do TSE (candidatos 2026) e gera os arquivos do site.

Uso:
    python3 scripts/build_data.py            # baixa (se preciso) e processa
    python3 scripts/build_data.py --refresh  # força novo download

Gera:
    public/data/candidatos.json  -> {"meta": {...}, "candidatos": [...]}
    public/fotos/<SQ_CANDIDATO>.jpg

Fonte: https://dadosabertos.tse.jus.br/dataset/candidatos-2026
Só usa a biblioteca padrão do Python.
"""
import csv
import json
import os
import re
import shutil
import sys
import urllib.request
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "raw")
OUT_DATA = os.path.join(ROOT, "public", "data", "candidatos.json")
OUT_FOTOS = os.path.join(ROOT, "public", "fotos")

UF = "MG"
CDN = "https://cdn.tse.jus.br/estatistica/sead"
DOWNLOADS = {
    "cand": f"{CDN}/odsele/consulta_cand/consulta_cand_2026.zip",
    "compl": f"{CDN}/odsele/consulta_cand_complementar/consulta_cand_complementar_2026.zip",
    "redes": f"{CDN}/odsele/consulta_cand/rede_social_candidato_2026.zip",
    f"fotos_{UF}": f"{CDN}/eleicoes/eleicoes2026/fotos/foto_cand2026_{UF}_div.zip",
    "fotos_BR": f"{CDN}/eleicoes/eleicoes2026/fotos/foto_cand2026_BR_div.zip",
}

# Cargos exibidos como candidatura principal e os cargos que acompanham a chapa.
PRINCIPAIS = ["PRESIDENTE", "GOVERNADOR", "SENADOR", "DEPUTADO FEDERAL", "DEPUTADO ESTADUAL"]
COMPANHEIROS = {
    "VICE-PRESIDENTE": "PRESIDENTE",
    "VICE-GOVERNADOR": "GOVERNADOR",
    "1º SUPLENTE": "SENADOR",
    "2º SUPLENTE": "SENADOR",
}
NULOS = {"#NULO", "#NE", "NÃO DIVULGÁVEL", "", "-1", "-3"}

MINUSCULAS = {"de", "da", "do", "das", "dos", "e", "di", "du", "del"}


def baixar(refresh=False):
    os.makedirs(RAW, exist_ok=True)
    for nome, url in DOWNLOADS.items():
        destino = os.path.join(RAW, nome)
        zip_path = destino + ".zip"
        if refresh or not os.path.exists(zip_path):
            print(f"Baixando {url}")
            urllib.request.urlretrieve(url, zip_path)
        if refresh or not os.path.isdir(destino):
            shutil.rmtree(destino, ignore_errors=True)
            with zipfile.ZipFile(zip_path) as z:
                z.extractall(destino)


def ler(caminho):
    with open(caminho, encoding="latin1", newline="") as f:
        return list(csv.DictReader(f, delimiter=";"))


def val(v):
    v = (v or "").strip()
    return None if v in NULOS else v


def titulo(texto):
    """'MARIA DA GLORIA' -> 'Maria da Gloria'; mantém siglas sem vogais (MLB, PT)."""
    if not texto:
        return texto
    palavras = []
    for i, p in enumerate(texto.lower().split()):
        if i > 0 and p in MINUSCULAS:
            palavras.append(p)
        elif not re.search(r"[aeiouáéíóúâêôãõà]", p) and len(p) > 1 and p.isalpha():
            palavras.append(p.upper())
        else:
            palavras.append("-".join(s[:1].upper() + s[1:] for s in p.split("-")))
    return " ".join(palavras)


def normalizar_url(u):
    u = u.strip()
    if u.startswith("#") or " " in u or "." not in u:
        return None
    if not re.match(r"^https?://", u, re.I):
        u = "https://" + u
    m = re.match(r"^(https?://)([^/]+)(.*)$", u, re.I)
    if not m:
        return None
    esquema, host, resto = m.group(1).lower(), m.group(2).lower(), m.group(3)
    # O TSE publica tudo em maiúsculas; estas redes não diferenciam caixa no caminho.
    if re.search(r"instagram|facebook|tiktok|twitter|x\.com|threads|linkedin|kwai", host):
        resto = resto.lower()
    return esquema + host + resto


def rede_nome(url):
    host = re.sub(r"^https?://(www\.)?", "", url).split("/")[0]
    for chave, nome in [
        ("instagram", "Instagram"), ("facebook", "Facebook"), ("fb.", "Facebook"),
        ("tiktok", "TikTok"), ("youtube", "YouTube"), ("youtu.be", "YouTube"),
        ("twitter", "X"), ("x.com", "X"), ("threads", "Threads"),
        ("linkedin", "LinkedIn"), ("kwai", "Kwai"), ("wa.me", "WhatsApp"),
        ("whatsapp", "WhatsApp"), ("t.me", "Telegram"),
    ]:
        if chave in host:
            return nome
    return host


def situacao(compl):
    julg = val(compl.get("DS_SITUACAO_JULGAMENTO")) if compl else None
    tot = val(compl.get("DS_SITUACAO_CANDIDATO_TOT")) if compl else None
    return (tot or julg or "Não informada").capitalize()


def main():
    baixar(refresh="--refresh" in sys.argv)

    cand = ler(os.path.join(RAW, "cand", f"consulta_cand_2026_{UF}.csv")) + ler(
        os.path.join(RAW, "cand", "consulta_cand_2026_BR.csv"))
    compl = {}
    for arq in (f"consulta_cand_complementar_2026_{UF}.csv", "consulta_cand_complementar_2026_BR.csv"):
        for r in ler(os.path.join(RAW, "compl", arq)):
            compl[r["SQ_CANDIDATO"]] = r
    redes = {}
    for arq in (f"rede_social_candidato_2026_{UF}.csv", "rede_social_candidato_2026_BR.csv"):
        for r in ler(os.path.join(RAW, "redes", arq)):
            url = normalizar_url(r["DS_URL"])
            if url:
                redes.setdefault(r["SQ_CANDIDATO"], []).append(
                    {"rede": rede_nome(url), "url": url, "ordem": int(r["NR_ORDEM_REDE_SOCIAL"] or 0)})

    fotos_src = {}
    for pasta in (f"fotos_{UF}", "fotos_BR"):
        for arq in os.listdir(os.path.join(RAW, pasta)):
            m = re.match(r"^F[A-Z]{2}(\d+)_div\.jpe?g$", arq, re.I)
            if m:
                fotos_src[m.group(1)] = os.path.join(RAW, pasta, arq)

    os.makedirs(OUT_FOTOS, exist_ok=True)
    registros = []
    for r in cand:
        sq = r["SQ_CANDIDATO"]
        c = compl.get(sq, {})
        idade = val(c.get("NR_IDADE_DATA_POSSE"))
        despesa = val(c.get("VR_DESPESA_MAX_CAMPANHA"))
        naturalidade = val(c.get("NM_MUNICIPIO_NASCIMENTO"))
        uf_nasc = val(r["SG_UF_NASCIMENTO"])
        tem_foto = sq in fotos_src
        if tem_foto:
            destino = os.path.join(OUT_FOTOS, f"{sq}.jpg")
            if not os.path.exists(destino):
                shutil.copyfile(fotos_src[sq], destino)
        comp_colig = val(r["DS_COMPOSICAO_COLIGACAO"])
        registros.append({
            "sq": sq,
            "cargo": r["DS_CARGO"],
            "abrangencia": "BR" if r["SG_UF"] == "BR" else UF,
            "numero": r["NR_CANDIDATO"],
            "urna": titulo(r["NM_URNA_CANDIDATO"]),
            "nome": titulo(val(r["NM_SOCIAL_CANDIDATO"]) or r["NM_CANDIDATO"]),
            "partidoNumero": int(r["NR_PARTIDO"]),
            "federacao": val(r["NM_FEDERACAO"]),
            "coligacao": val(r["NM_COLIGACAO"]) if r["TP_AGREMIACAO"] == "COLIGAÇÃO" else None,
            "composicao": comp_colig if r["TP_AGREMIACAO"] != "PARTIDO ISOLADO" else None,
            "genero": (val(r["DS_GENERO"]) or "").capitalize() or None,
            "idade": int(idade) if idade and idade.isdigit() else None,
            "instrucao": (val(r["DS_GRAU_INSTRUCAO"]) or "").capitalize() or None,
            "ocupacao": (val(r["DS_OCUPACAO"]) or "").capitalize() or None,
            "corRaca": (val(r["DS_COR_RACA"]) or "").capitalize() or None,
            "estadoCivil": (val(r["DS_ESTADO_CIVIL"]) or "").capitalize() or None,
            "naturalidade": " – ".join(x for x in [titulo(naturalidade), uf_nasc] if x) or None,
            "situacao": situacao(c),
            "naUrna": c.get("ST_CANDIDATO_INSERIDO_URNA") == "SIM",
            "despesaMax": float(despesa) if despesa and float(despesa) > 0 else None,
            "redes": [{"rede": x["rede"], "url": x["url"]} for x in sorted(redes.get(sq, []), key=lambda x: x["ordem"])],
            "foto": tem_foto,
        })

    # Liga vices e suplentes à candidatura principal (mesmo número e cargo correspondente).
    principais = [x for x in registros if x["cargo"] in PRINCIPAIS]
    por_chave = {}
    for x in principais:
        por_chave.setdefault((x["cargo"], x["numero"]), []).append(x)
    for x in registros:
        if x["cargo"] not in COMPANHEIROS:
            continue
        opcoes = por_chave.get((COMPANHEIROS[x["cargo"]], x["numero"]), [])
        if not opcoes:
            continue
        # Se houver mais de uma chapa com o número (substituição), prefere a que está na urna.
        alvo = next((o for o in opcoes if o["naUrna"] == x["naUrna"]), opcoes[0])
        alvo.setdefault("chapa", []).append({
            "sq": x["sq"], "cargo": x["cargo"].capitalize(), "urna": x["urna"], "nome": x["nome"],
            "partidoNumero": x["partidoNumero"], "foto": x["foto"], "situacao": x["situacao"],
            "naUrna": x["naUrna"],
        })
    for x in principais:
        x.get("chapa", []).sort(key=lambda c: (not c["naUrna"], c["cargo"]))
        x["cargo"] = {"PRESIDENTE": "presidente", "GOVERNADOR": "governador", "SENADOR": "senador",
                      "DEPUTADO FEDERAL": "federal", "DEPUTADO ESTADUAL": "estadual"}[x["cargo"]]

    meta = {
        "geradoEm": cand[0]["DT_GERACAO"] + " " + cand[0]["HH_GERACAO"],
        "uf": UF,
        "dataEleicao": cand[0]["DT_ELEICAO"],
    }
    os.makedirs(os.path.dirname(OUT_DATA), exist_ok=True)
    with open(OUT_DATA, "w", encoding="utf-8") as f:
        json.dump({"meta": meta, "candidatos": principais}, f, ensure_ascii=False, separators=(",", ":"))

    from collections import Counter
    print(f"{len(principais)} candidaturas principais:", dict(Counter(x["cargo"] for x in principais)))
    print("sem foto:", sum(1 for x in principais if not x["foto"]))
    print("gerado em", meta["geradoEm"])


if __name__ == "__main__":
    main()
