"""Gera as AV1 adaptadas de Física (4º bimestre 2026) – 1ª, 2ª e 3ª séries.

Cada prova: 10 questões objetivas, 3 alternativas, enunciado direto,
comando simples e caixa com a fórmula da questão.
Uso: python3 gerar_provas.py  (gera os PDFs nesta pasta)
"""
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (KeepTogether, PageBreak, Paragraph, SimpleDocTemplate,
                                Spacer, Table, TableStyle)

FONT_DIR = "/usr/share/fonts/truetype/dejavu/"
pdfmetrics.registerFont(TTFont("DV", FONT_DIR + "DejaVuSans.ttf"))
pdfmetrics.registerFont(TTFont("DVB", FONT_DIR + "DejaVuSans-Bold.ttf"))
pdfmetrics.registerFontFamily("DV", normal="DV", bold="DVB")

OUT = Path(__file__).parent
AZUL = colors.HexColor("#1f3b73")
CAIXA = colors.HexColor("#eef3fb")

st_txt = ParagraphStyle("txt", fontName="DV", fontSize=12, leading=17)
st_cmd = ParagraphStyle("cmd", parent=st_txt, fontName="DVB")
st_alt = ParagraphStyle("alt", parent=st_txt, fontSize=12.5, leading=20, leftIndent=12)
st_form = ParagraphStyle("form", parent=st_txt, fontSize=12.5, leading=19)
st_qtit = ParagraphStyle("qtit", parent=st_txt, fontName="DVB", textColor=AZUL, fontSize=12.5)
st_tit = ParagraphStyle("tit", parent=st_txt, fontName="DVB", fontSize=14, alignment=TA_CENTER,
                        leading=20)
st_small = ParagraphStyle("small", parent=st_txt, fontSize=10.5, leading=14)

LETRAS = "ABC"

# (fórmula, enunciado, comando, [alternativas], índice correto, resolução)
SERIE_1 = [
    ("τ = F · d",
     "Uma pessoa empurra uma caixa com força F = 50 N. A caixa anda d = 4 m no mesmo sentido da força.",
     "Calcule o trabalho (τ) da força.",
     ["12,5 J", "54 J", "200 J"], 2,
     "τ = 50 · 4 = 200 J"),
    ("τ = F · d · cos θ",
     "Um pai puxa o velocípede do filho com força F = 100 N, inclinada θ = 60° com o chão, por d = 20 m. "
     "Use cos 60° = 0,5.",
     "Calcule o trabalho (τ) da força.",
     ["1 000 J", "2 000 J", "500 J"], 0,
     "τ = 100 · 20 · 0,5 = 1 000 J"),
    ("P = (m · g · h) / Δt",
     "Um atleta de massa m = 60 kg sobe uma escada de altura h = 10 m em Δt = 20 s. Use g = 10 m/s².",
     "Calcule a potência (P) do atleta.",
     ["120 W", "300 W", "6 000 W"], 1,
     "P = (60 · 10 · 10) / 20 = 6 000 / 20 = 300 W"),
    ("τ = área do gráfico F × x     (triângulo: área = base · altura / 2)",
     "Em um gráfico F × x, a força cresce de 0 N até 6 N enquanto o corpo vai de x = 0 até x = 4 m. "
     "O gráfico forma um triângulo de base 4 m e altura 6 N.",
     "Calcule o trabalho (τ) da força.",
     ["24 J", "6 J", "12 J"], 2,
     "τ = 4 · 6 / 2 = 12 J"),
    ("η = (P<sub>útil</sub> / P<sub>total</sub>) · 100%",
     "Um motor recebe P<sub>total</sub> = 1 500 W e entrega P<sub>útil</sub> = 900 W.",
     "Calcule o rendimento (η) do motor.",
     ["60%", "40%", "90%"], 0,
     "η = 900 / 1 500 = 0,6 → 60%"),
    ("E<sub>el</sub> = k · x² / 2",
     "Um elástico tem constante k = 200 N/m e foi esticado x = 0,5 m.",
     "Calcule a energia potencial elástica (E<sub>el</sub>).",
     ["50 J", "25 J", "100 J"], 1,
     "E = 200 · 0,25 / 2 = 25 J"),
    ("F = k · x     →     k = F / x",
     "Para esticar uma fita de borracha x = 0,4 m, uma pessoa faz força F = 40 N.",
     "Calcule a constante elástica (k) da fita.",
     ["100 N/m", "16 N/m", "10 N/m"], 0,
     "k = 40 / 0,4 = 100 N/m"),
    ("E<sub>c</sub> = m · v² / 2",
     "Um caixote de massa m = 20 kg se move com velocidade v = 3 m/s.",
     "Calcule a energia cinética (E<sub>c</sub>) do caixote.",
     ["30 J", "60 J", "90 J"], 2,
     "E<sub>c</sub> = 20 · 9 / 2 = 90 J"),
    ("τ<sub>peso</sub> = − m · g · h  (corpo SOBE)     τ<sub>peso</sub> = + m · g · h  (corpo DESCE)",
     "Um corpo de massa m = 2 kg SOBE uma altura h = 5 m. Use g = 10 m/s².",
     "Calcule o trabalho da força peso.",
     ["+100 J", "−100 J", "0 J"], 1,
     "Sobe → negativo: τ = − 2 · 10 · 5 = −100 J"),
    ("F<sub>at</sub> = μ · m · g",
     "Um bloco de massa m = 5 kg desliza em um piso horizontal. O coeficiente de atrito é μ = 0,2. "
     "Use g = 10 m/s².",
     "Calcule a força de atrito (F<sub>at</sub>).",
     ["10 N", "25 N", "50 N"], 0,
     "F<sub>at</sub> = 0,2 · 5 · 10 = 10 N"),
]

SERIE_2 = [
    ("r = i     (ângulo de reflexão = ângulo de incidência)",
     "Um raio de luz chega a um espelho plano com ângulo de incidência i = 35°.",
     "Marque o ângulo de reflexão (r).",
     ["55°", "35°", "70°"], 1,
     "r = i = 35°"),
    ("D = 2 · d     (distância entre a pessoa e sua imagem)",
     "Uma pessoa está a d = 2 m de um espelho plano.",
     "Calcule a distância (D) entre a pessoa e a sua imagem.",
     ["2 m", "1 m", "4 m"], 2,
     "D = 2 · 2 = 4 m"),
    ("N = (360° / α) − 1",
     "Dois espelhos planos formam um ângulo α = 90° entre si.",
     "Calcule o número de imagens (N) formadas.",
     ["3", "4", "2"], 0,
     "N = 360/90 − 1 = 4 − 1 = 3"),
    ("f = R / 2",
     "Um espelho côncavo tem raio de curvatura R = 24 cm.",
     "Calcule a distância focal (f).",
     ["48 cm", "12 cm", "24 cm"], 1,
     "f = 24 / 2 = 12 cm"),
    ("1/f = 1/p + 1/p'     →     1/p' = 1/f − 1/p",
     "Um espelho côncavo tem f = 12 cm. Um objeto está a p = 48 cm do espelho.",
     "Calcule a distância da imagem (p').",
     ["36 cm", "12 cm", "16 cm"], 2,
     "1/p' = 1/12 − 1/48 = 4/48 − 1/48 = 3/48 = 1/16 → p' = 16 cm"),
    ("A = − p' / p",
     "Em um espelho esférico, o objeto está a p = 20 cm e a imagem está a p' = 10 cm.",
     "Calcule o aumento (A).",
     ["−0,5", "−2", "+2"], 0,
     "A = −10 / 20 = −0,5 (imagem invertida e menor)"),
    ("Espelho convexo: f = − R / 2          1/p' = 1/f − 1/p",
     "Um espelho convexo tem R = 12 m, então f = −6 m. Um objeto está a p = 30 m do espelho.",
     "Calcule a distância da imagem ao espelho.",
     ["30 m", "5 m (imagem virtual)", "6 m"], 1,
     "1/p' = −1/6 − 1/30 = −5/30 − 1/30 = −6/30 = −1/5 → p' = −5 m (virtual, 5 m)"),
    ("A = − p' / p     →     p' = − A · p",
     "Um palhaço usa um espelho que aumenta a imagem do rosto A = 2 vezes. Ele está a p = 5 cm do espelho.",
     "Calcule a distância da imagem ao espelho (em módulo).",
     ["2,5 cm", "7 cm", "10 cm"], 2,
     "p' = − 2 · 5 = −10 cm → imagem virtual a 10 cm"),
    ("f &gt; 0 → espelho côncavo          f &lt; 0 → espelho convexo",
     "Um espelho esférico tem distância focal f = +10 cm.",
     "Marque o tipo de espelho.",
     ["Côncavo", "Convexo", "Plano"], 0,
     "f positivo → côncavo"),
    ("A = i / o     (0 &lt; A &lt; 1: imagem direita e MENOR → convexo;  A &gt; 1: direita e MAIOR → côncavo)",
     "No retrovisor de uma moto, um carro de altura o = 2 m aparece com imagem direita de i = 0,5 m.",
     "Calcule A e marque o tipo de espelho usado.",
     ["A = 1 → plano", "A = 0,25 → convexo", "A = 4 → côncavo"], 1,
     "A = 0,5 / 2 = 0,25 → imagem menor → convexo (maior campo visual)"),
]

SERIE_3 = [
    ("No encontro: S<sub>A</sub> = S<sub>B</sub>",
     "Dois carros seguem as funções S<sub>A</sub> = 50 · t e S<sub>B</sub> = 100 + 30 · t (SI).",
     "Calcule o instante (t) do encontro.",
     ["2 s", "10 s", "5 s"], 2,
     "50t = 100 + 30t → 20t = 100 → t = 5 s"),
    ("S = S<sub>0</sub> + v<sub>0</sub> · t + a · t² / 2",
     "Um objeto segue a função S = 5 · t + 2 · t² (SI).",
     "Calcule a posição (S) no instante t = 2 s.",
     ["18 m", "13 m", "26 m"], 0,
     "S = 5 · 2 + 2 · 4 = 10 + 8 = 18 m"),
    ("v² = v<sub>0</sub>² + 2 · a · Δs",
     "Um carro a v<sub>0</sub> = 20 m/s freia com a = −5 m/s² até parar (v = 0).",
     "Calcule a distância de frenagem (Δs).",
     ["80 m", "40 m", "100 m"], 1,
     "0 = 400 + 2 · (−5) · Δs → 10 Δs = 400 → Δs = 40 m"),
    ("1ª lei (Inércia): F<sub>R</sub> = 0 → o corpo mantém sua velocidade",
     "Em uma freada brusca, o passageiro tende a continuar indo para frente. Por isso usamos o cinto de segurança.",
     "Marque a lei de Newton que explica o uso do cinto.",
     ["1ª lei – Inércia", "2ª lei – F = m · a", "3ª lei – Ação e reação"], 0,
     "O corpo tende a manter o movimento → Inércia (1ª lei)"),
    ("F = m · a",
     "Um bloco de massa m = 10 kg tem aceleração a = 2 m/s².",
     "Calcule a força resultante (F).",
     ["5 N", "20 N", "12 N"], 1,
     "F = 10 · 2 = 20 N"),
    ("P = m · g          N = P − F",
     "Uma caixa de m = 5 kg está sobre uma mesa. Um homem puxa a caixa para cima com F = 10 N, "
     "mas ela não sai do lugar. Use g = 10 m/s².",
     "Calcule a força normal (N) da mesa.",
     ["50 N", "10 N", "40 N"], 2,
     "P = 5 · 10 = 50 N → N = 50 − 10 = 40 N"),
    ("F − P = m · a     →     F = m · (g + a)",
     "Uma empilhadeira levanta uma caixa de m = 500 kg com aceleração a = 0,5 m/s². Use g = 10 m/s².",
     "Calcule a força (F) da empilhadeira na caixa.",
     ["5 250 N", "5 000 N", "4 750 N"], 0,
     "F = 500 · (10 + 0,5) = 500 · 10,5 = 5 250 N"),
    ("a = g · sen θ     (plano inclinado sem atrito)",
     "Um bloco desce um plano inclinado sem atrito. Use g = 10 m/s² e sen θ = 0,6.",
     "Calcule a aceleração (a) do bloco.",
     ["8 m/s²", "6 m/s²", "10 m/s²"], 1,
     "a = 10 · 0,6 = 6 m/s²"),
    ("T = m · g · sen θ     (bloco parado no plano, preso por um fio)",
     "Um bloco de m = 0,5 kg está parado em um plano inclinado sem atrito, preso por um fio. "
     "Use g = 10 m/s² e sen θ = 0,6.",
     "Calcule a tração (T) no fio.",
     ["4 N", "5 N", "3 N"], 2,
     "T = 0,5 · 10 · 0,6 = 3 N"),
    ("a = g · (sen θ − μ · cos θ)     (plano inclinado com atrito)",
     "Um bloco desce um plano inclinado com atrito. Use g = 10 m/s², sen θ = 0,6, cos θ = 0,8 e μ = 0,5.",
     "Calcule a aceleração (a) do bloco.",
     ["2 m/s²", "6 m/s²", "10 m/s²"], 0,
     "a = 10 · (0,6 − 0,5 · 0,8) = 10 · (0,6 − 0,4) = 10 · 0,2 = 2 m/s²"),
]

SERIES = [
    ("1", "1ª SÉRIE EM", "Trabalho, Potência e Energia", SERIE_1),
    ("2", "2ª SÉRIE EM", "Espelhos Planos e Esféricos", SERIE_2),
    ("3", "3ª SÉRIE EM", "Cinemática e Leis de Newton", SERIE_3),
]


def cabecalho(serie):
    linhas = [
        ["STUDENT: ______________________________________", "SCORE: ________"],
        ["TEACHER: JAIR PIMENTA", ""],
        ["DATE: ____/____/______", f"GRADE: {serie}"],
    ]
    t = Table([[Paragraph(a, st_small), Paragraph(b, st_small)] for a, b in linhas],
              colWidths=[12.5 * cm, 5 * cm])
    t.setStyle(TableStyle([("BOX", (0, 0), (-1, -1), 0.8, AZUL),
                           ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                           ("TOPPADDING", (0, 0), (-1, -1), 6)]))
    return t


def caixa_formula(formula):
    t = Table([[Paragraph(f"<b>Fórmula:</b>  {formula}", st_form)]], colWidths=[17.5 * cm])
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), CAIXA),
                           ("BOX", (0, 0), (-1, -1), 0.8, AZUL),
                           ("LEFTPADDING", (0, 0), (-1, -1), 8),
                           ("TOPPADDING", (0, 0), (-1, -1), 6),
                           ("BOTTOMPADDING", (0, 0), (-1, -1), 6)]))
    return t


def rodape(serie_num):
    def desenhar(canvas, doc):
        canvas.saveState()
        canvas.setFont("DV", 8.5)
        canvas.drawCentredString(A4[0] / 2, 1.1 * cm,
                                 f"Legacy School | Física | {serie_num}ª Série EM | "
                                 f"AV1 Adaptada - 4º Bimestre 2026 | Página {doc.page}")
        canvas.restoreState()
    return desenhar


def gerar_prova(num, serie, tema, questoes):
    caminho = OUT / f"AV1_Adaptada_Fisica_{num}a_Serie_4Bim_2026.pdf"
    doc = SimpleDocTemplate(str(caminho), pagesize=A4, leftMargin=1.75 * cm, rightMargin=1.75 * cm,
                            topMargin=1.5 * cm, bottomMargin=1.8 * cm,
                            title=f"AV1 Adaptada Física {num}ª Série")
    h = [cabecalho(serie), Spacer(1, 10),
         Paragraph(f"AV1 ADAPTADA - FÍSICA - {serie.replace(' EM', '')} - 4º BIMESTRE", st_tit),
         Paragraph(f"Tema: {tema}", ParagraphStyle("t2", parent=st_txt, alignment=TA_CENTER)),
         Spacer(1, 8),
         Paragraph("<b>Como fazer a prova:</b> leia a fórmula, troque as letras pelos números "
                   "e faça a conta. Marque <b>UMA</b> alternativa (A, B ou C) em cada questão. "
                   "Use caneta azul ou preta.", st_txt),
         Spacer(1, 12)]
    for i, (formula, enun, cmd, alts, _, _) in enumerate(questoes, 1):
        bloco = [Paragraph(f"QUESTÃO {i:02d} | 0,8 ponto", st_qtit), Spacer(1, 4),
                 caixa_formula(formula), Spacer(1, 5),
                 Paragraph(enun, st_txt), Spacer(1, 3),
                 Paragraph(cmd, st_cmd), Spacer(1, 3)]
        bloco += [Paragraph(f"(&nbsp;&nbsp;) {LETRAS[k]}) {a}", st_alt) for k, a in enumerate(alts)]
        bloco += [Paragraph("Cálculos:", st_small), Spacer(1, 2.2 * cm)]
        h.append(KeepTogether(bloco))
    h.append(Paragraph("Boa prova!", st_tit))
    doc.build(h, onFirstPage=rodape(num), onLaterPages=rodape(num))
    return caminho


def gerar_gabarito():
    caminho = OUT / "Gabarito_AV1_Adaptada_Fisica_4Bim_2026.pdf"
    doc = SimpleDocTemplate(str(caminho), pagesize=A4, leftMargin=1.75 * cm, rightMargin=1.75 * cm,
                            topMargin=1.5 * cm, bottomMargin=1.5 * cm,
                            title="Gabarito AV1 Adaptada Física")
    h = []
    for n, (num, serie, tema, questoes) in enumerate(SERIES):
        if n:
            h.append(PageBreak())
        h += [Paragraph(f"GABARITO (PROFESSOR) – AV1 ADAPTADA – {serie}", st_tit),
              Paragraph(tema, ParagraphStyle("t3", parent=st_txt, alignment=TA_CENTER)),
              Spacer(1, 10)]
        dados = [[Paragraph("<b>Q</b>", st_small), Paragraph("<b>Resp.</b>", st_small),
                  Paragraph("<b>Resolução</b>", st_small)]]
        for i, (_, _, _, alts, c, res) in enumerate(questoes, 1):
            dados.append([Paragraph(f"{i:02d}", st_small),
                          Paragraph(f"<b>{LETRAS[c]}</b>", st_small),
                          Paragraph(f"{res}  <b>({alts[c]})</b>", st_small)])
        t = Table(dados, colWidths=[1.2 * cm, 1.6 * cm, 14.7 * cm])
        t.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                               ("BACKGROUND", (0, 0), (-1, 0), CAIXA),
                               ("VALIGN", (0, 0), (-1, -1), "MIDDLE")]))
        h.append(t)
    doc.build(h)
    return caminho


if __name__ == "__main__":
    for num, serie, tema, qs in SERIES:
        assert len(qs) == 10 and all(len(q[3]) == 3 for q in qs)
        print(gerar_prova(num, serie, tema, qs))
    print(gerar_gabarito())
