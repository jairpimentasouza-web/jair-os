"""Gera a AV1 de Física - 2ª CHAMADA (4º bimestre 2026) – 1ª, 2ª e 3ª séries.

Prova regular (não adaptada), mesmos conteúdos e estrutura da AV1 original,
com questões novas. Reaproveita o layout Legacy School de gerar_provas.py.
Uso: python3 gerar_segunda_chamada.py  (gera os PDFs em segunda-chamada/)
"""
from reportlab.graphics.shapes import Drawing, Line, PolyLine, String
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import KeepTogether, PageBreak, Paragraph, Spacer, Table, TableStyle

from gerar_provas import (BORDA, CINZA, CLARO, LARG, ORIENTACOES, OUT, cabecalho, documento,
                          faixa, moldura, orientacoes, st_label, st_small, st_txt, st_fim,
                          titulo_questao)

DEST = OUT / "segunda-chamada"
LETRAS = "ABCDE"
st_alt = ParagraphStyle("alt2", parent=st_txt, alignment=0)


# ---------- elementos ----------

def grafico(pontos, xticks, yticks, xlabel, ylabel, w=8 * cm, h=4.6 * cm):
    """Gráfico simples com grade (estilo das figuras de vestibular)."""
    d = Drawing(w, h)
    ox, oy = 1.0 * cm, 0.8 * cm
    gw, gh = w - 1.6 * cm, h - 1.2 * cm
    xmax, ymax = xticks[-1], yticks[-1]
    X = lambda x: ox + gw * x / xmax
    Y = lambda y: oy + gh * y / ymax
    for x in xticks[1:]:
        d.add(Line(X(x), oy, X(x), Y(ymax), strokeColor=colors.HexColor("#bbbbbb"), strokeWidth=0.4))
        d.add(String(X(x), oy - 10, f"{x}".replace(".", ","), fontName="LS", fontSize=7,
                     textAnchor="middle"))
    for y in yticks[1:]:
        d.add(Line(ox, Y(y), X(xmax), Y(y), strokeColor=colors.HexColor("#bbbbbb"), strokeWidth=0.4))
        d.add(String(ox - 4, Y(y) - 2.5, f"{y}".replace(".", ","), fontName="LS", fontSize=7,
                     textAnchor="end"))
    d.add(Line(ox, oy, X(xmax) + 8, oy, strokeWidth=1))
    d.add(Line(ox, oy, ox, Y(ymax) + 8, strokeWidth=1))
    d.add(String(ox - 4, oy - 10, "0", fontName="LS", fontSize=7, textAnchor="end"))
    d.add(String(X(xmax) + 10, oy - 3, xlabel, fontName="LSB", fontSize=7.5))
    d.add(String(ox - 4, Y(ymax) + 10, ylabel, fontName="LSB", fontSize=7.5))
    pts = []
    for x, y in pontos:
        pts += [X(x), Y(y)]
    d.add(PolyLine(pts, strokeWidth=1.6, strokeColor=colors.black))
    t = Table([[d]], colWidths=[LARG])
    t.setStyle(TableStyle([("ALIGN", (0, 0), (-1, -1), "CENTER")]))
    return t


def alternativas(alts):
    curtas = all(len(a) <= 14 for a in alts)
    cel = [Paragraph(f"<b>{LETRAS[k]}.</b>&nbsp; {a}", st_alt) for k, a in enumerate(alts)]
    if curtas:
        t = Table([cel], colWidths=[LARG / len(alts)] * len(alts))
    else:
        t = Table([[c] for c in cel], colWidths=[LARG - 0.4 * cm])
        t.setStyle(TableStyle([("TOPPADDING", (0, 0), (-1, -1), 1),
                               ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
                               ("LEFTPADDING", (0, 0), (-1, -1), 14)]))
    return t


def caixa(rotulo, altura=2.6 * cm):
    t = Table([[Paragraph(f"{rotulo}:", st_label)]], colWidths=[LARG - 0.6 * cm], rowHeights=[altura])
    t.setStyle(TableStyle([("BOX", (0, 0), (-1, -1), 0.6, BORDA), ("VALIGN", (0, 0), (-1, -1), "TOP")]))
    return t


def linhas(n):
    t = Table([[""] for _ in range(n)], colWidths=[LARG - 0.6 * cm], rowHeights=[0.8 * cm] * n)
    t.setStyle(TableStyle([("LINEBELOW", (0, 0), (-1, -1), 0.6, CINZA)]))
    return [t]


def P(texto):
    return Paragraph(texto, st_txt)


# ---------- questões ----------
# Cada questão: dict(enun=[str], fig=flowable|None, alts=[...]|None, itens=[(str, flowables)],
#                    box=str|None, gab=str)

G_TRAP = grafico([(0, 0), (2, 8), (4, 8), (6, 0)], [0, 1, 2, 3, 4, 5, 6], [0, 2, 4, 6, 8],
                 "x (m)", "F (N)")
G_FITA = grafico([(0, 0), (0.30, 60)], [0, 0.10, 0.20, 0.30], [0, 20, 40, 60], "Δx (m)", "F (N)")
G_TRACAO = grafico([(0, 10), (2, 10), (4, 0)], [0, 1, 2, 3, 4], [0, 2, 4, 6, 8, 10],
                   "x (m)", "F (N)")

SERIE_1 = [
    dict(enun=["Uma caixa é arrastada sobre uma superfície horizontal sem atrito por uma força F de "
               "intensidade constante, ao longo de um mesmo deslocamento d, em duas situações:",
               "<b>I.</b> a força F é horizontal (θ = 0°);<br/><b>II.</b> a força F forma um ângulo "
               "θ = 60° com a horizontal.",
               "Sendo cos 60° = 0,5 e considerando τ<sub>I</sub> e τ<sub>II</sub> os trabalhos "
               "realizados por F nas situações I e II, é correto afirmar que"],
         alts=["τ<sub>I</sub> = τ<sub>II</sub>, pois a força e o deslocamento são os mesmos.",
               "τ<sub>I</sub> = 2 · τ<sub>II</sub>.",
               "τ<sub>II</sub> = 2 · τ<sub>I</sub>.",
               "τ<sub>I</sub> = 4 · τ<sub>II</sub>.",
               "τ<sub>II</sub> = 0, pois a força está inclinada."],
         gab="B — τ<sub>I</sub> = F·d; τ<sub>II</sub> = F·d·cos 60° = F·d/2 → τ<sub>I</sub> = 2τ<sub>II</sub>"),
    dict(enun=["Um elevador de carga ergue, com velocidade constante, 800 kg de material de "
               "construção até uma altura de 15 m em 20 s. A potência útil desenvolvida pelo motor "
               "do elevador é", "Dado: aceleração da gravidade local = 10 m/s²."],
         alts=["3 000 W.", "4 500 W.", "6 000 W.", "8 000 W.", "12 000 W."], box="Cálculos",
         gab="C — P = m·g·h/Δt = 800·10·15/20 = 6 000 W"),
    dict(enun=["Um carrinho é puxado por uma corda que forma um ângulo de 37° com a horizontal. "
               "A força aplicada pela corda tem intensidade constante de 50 N e o carrinho percorre "
               "12 m em linha reta, no plano horizontal.",
               "Desprezando as forças dissipativas, calcule, em joules, o trabalho realizado pela "
               "força da corda nesse deslocamento.", "(Dados: sen 37° = 0,6; cos 37° = 0,8)"],
         box="Resolução", gab="τ = F·d·cos 37° = 50·12·0,8 = 480 J"),
    dict(enun=["Uma partícula está inicialmente em repouso em x = 0 m. Sobre ela atua uma única "
               "força F, paralela ao deslocamento, que varia com a posição x conforme o gráfico."],
         fig=G_TRAP,
         itens=[("Qual o trabalho realizado pela força F, em J, quando a partícula se desloca de "
                 "x = 0 m até x = 6 m?", [])],
         alts=["16.", "24.", "32.", "40.", "48."],
         gab="C — τ = área do trapézio = (6 + 2)·8/2 = 32 J"),
    dict(enun=["Uma bomba de potência total igual a 2 000 W eleva 7,2 · 10<super>4</super> L de água "
               "de um reservatório até uma caixa d'água situada 10 m acima, durante 4 horas de "
               "funcionamento. O rendimento da bomba, nessa operação, é de",
               "(Dados: aceleração da gravidade = 10 m/s²; densidade da água = 1 kg/L.)"],
         alts=["20%.", "25%.", "40%.", "50%.", "75%."],
         gab="B — P<sub>útil</sub> = m·g·h/Δt = 7,2·10<super>4</super>·10·10/14 400 = 500 W; "
             "η = 500/2 000 = 25%"),
    dict(enun=["Um equipamento de <i>bungee jumping</i> será instalado em uma plataforma a 25 m de "
               "altura em relação ao solo. O elástico utilizado tem comprimento relaxado de 15 m. "
               "Qual deve ser o valor mínimo da constante elástica do elástico para que uma pessoa "
               "de 80 kg (incluindo o equipamento) não toque o solo?",
               "<b>Note e adote:</b> despreze a massa do elástico, as forças dissipativas e as "
               "dimensões da pessoa; aceleração da gravidade = 10 m/s²."],
         alts=["160 N/m", "200 N/m", "320 N/m", "400 N/m", "800 N/m"],
         gab="D — m·g·H = k·x²/2 → 80·10·25 = k·10²/2 → k = 400 N/m"),
    dict(enun=["Um aparelho de exercícios usa uma mola. O gráfico mostra o módulo da força F que "
               "uma pessoa deve aplicar para deformar a mola de um comprimento Δx."],
         fig=G_FITA,
         itens=[("<b>A.</b> Qual o trabalho que a pessoa realiza para deformar a mola de 30 cm a "
                 "partir da posição de equilíbrio? (0,4 ponto)", [caixa("Resolução", 2.0 * cm)]),
                ("<b>B.</b> Qual é a constante elástica dessa mola? (0,4 ponto)",
                 [caixa("Resolução", 2.0 * cm)])],
         gab="A) τ = área = 0,30·60/2 = 9 J &nbsp; B) k = F/x = 60/0,30 = 200 N/m"),
    dict(enun=["Um caixote de massa 40 kg está em repouso sobre um piso horizontal. Um funcionário "
               "o empurra com uma força horizontal constante, deslocando-o 5,0 m em linha reta, "
               "quando ele atinge velocidade de módulo v = 2,0 m/s. Sabendo que o coeficiente de "
               "atrito cinético entre o caixote e o piso é μ<sub>c</sub> = 0,20 e que g = 10 m/s², "
               "o trabalho realizado pelo funcionário sobre o caixote nesse deslocamento foi de:"],
         alts=["8,0 × 10¹ J", "3,2 × 10² J", "4,0 × 10² J", "4,8 × 10² J", "5,6 × 10² J"],
         box="Cálculos",
         gab="D — τ<sub>F</sub> − F<sub>at</sub>·d = ΔE<sub>c</sub> → τ<sub>F</sub> − 0,2·400·5 = "
             "40·2²/2 → τ<sub>F</sub> = 400 + 80 = 480 J"),
    dict(enun=["Durante uma aula sobre trabalho, um estudante afirmou:",
               "<i>“Se um corpo se move com velocidade constante, nenhuma força realiza trabalho "
               "sobre ele.”</i>",
               "Considere as seguintes situações reais:",
               "<b>I.</b> Uma caixa é empurrada em um piso horizontal rugoso, com velocidade "
               "constante.<br/><b>II.</b> Um paraquedista desce verticalmente com velocidade "
               "constante, sob a ação da resistência do ar.",
               "Analise criticamente a afirmação do estudante, discutindo, em cada situação:<br/>"
               "• o trabalho de cada força envolvida (peso, normal, força aplicada, atrito, "
               "resistência do ar);<br/>• o trabalho total (resultante) sobre o corpo.",
               "Sua resposta deve deixar claro se a afirmação é válida ou não."],
         itens=[("", linhas(7))],
         gab="Afirmação incorreta. I: força aplicada → τ &gt; 0; atrito → τ &lt; 0; peso e normal → "
             "τ = 0 (perpendiculares). II: peso → τ &gt; 0; resistência do ar → τ &lt; 0. Em ambos "
             "os casos as forças realizam trabalho, mas o trabalho TOTAL é nulo, pois ΔE<sub>c</sub> = 0 "
             "(teorema da energia cinética)."),
    dict(enun=["Em um experimento, um bloco de massa 2,0 kg desliza sobre uma superfície horizontal "
               "de coeficiente de atrito cinético μ desconhecido. O bloco está submetido a uma força "
               "de tração horizontal de intensidade variável, conforme o gráfico. Se a variação de "
               "energia cinética do bloco entre x = 0 e x = 4,0 m foi de 14 J, o valor de μ é",
               "(Dado: g = 10 m/s²)"],
         fig=G_TRACAO, alts=["0,10", "0,15", "0,20", "0,25", "0,30"], box="Cálculos",
         gab="C — τ<sub>F</sub> = 2·10 + 2·10/2 = 30 J; τ<sub>at</sub> = 30 − 14 = 16 J = μ·2·10·4 "
             "→ μ = 0,20"),
]

SERIE_2 = [
    dict(enun=["O ângulo formado entre um raio de luz que incide em um espelho plano e o respectivo "
               "raio refletido é de 80°. Nessa situação, o ângulo entre o espelho e o raio refletido "
               "é igual a:"],
         alts=["10°", "40°", "50°", "80°", "100°"],
         gab="C — i = r = 40° (com a normal) → com o espelho: 90° − 40° = 50°"),
    dict(enun=["Uma pessoa está parada a 1,5 m de um espelho plano vertical. Em seguida, ela se "
               "afasta 0,5 m do espelho, em linha reta. A nova distância entre a pessoa e a sua "
               "imagem, em metros, é:"],
         alts=["2,0", "3,0", "3,5", "4,0", "5,0"],
         gab="D — nova distância ao espelho = 2,0 m → pessoa–imagem = 2 · 2,0 = 4,0 m"),
    dict(enun=["Na parte da frente de muitas ambulâncias, a palavra AMBULÂNCIA é pintada com as "
               "letras invertidas da direita para a esquerda. Isso é feito para que os motoristas "
               "que estão à frente leiam a palavra corretamente pelo espelho retrovisor (plano). "
               "Esse procedimento é necessário porque a imagem fornecida por um espelho plano é"],
         alts=["real e invertida verticalmente (de cabeça para baixo).",
               "virtual e enantiomorfa, ou seja, com inversão entre direita e esquerda.",
               "virtual e maior que o objeto.",
               "real, direita e do mesmo tamanho do objeto.",
               "formada atrás do espelho e, por isso, sempre menor que o objeto."],
         gab="B — o espelho plano conjuga imagem virtual, direita, de mesmo tamanho e enantiomorfa"),
    dict(enun=["Dois espelhos planos são associados de modo que suas faces refletoras formam um "
               "ângulo α entre si. Um objeto colocado entre eles produz 7 imagens. O valor de α é:"],
         alts=["30°", "45°", "60°", "72°", "90°"], box="Cálculos",
         gab="B — N = 360°/α − 1 → 7 = 360°/α − 1 → α = 45°"),
    dict(enun=["Um objeto real é colocado entre o foco principal e o vértice de um espelho esférico "
               "côncavo. A imagem conjugada por esse espelho é:"],
         alts=["real, invertida e maior que o objeto.",
               "virtual, direita e maior que o objeto.",
               "virtual, direita e menor que o objeto.",
               "real, invertida e menor que o objeto.",
               "imprópria (formada no infinito)."],
         gab="B — objeto entre F e V no côncavo: imagem virtual, direita e ampliada"),
    dict(enun=["Um objeto real é colocado sobre o centro de curvatura C, no eixo principal de um "
               "espelho esférico côncavo. A imagem conjugada pelo espelho situa-se"],
         alts=["atrás do espelho, sendo virtual e direita.",
               "sobre o foco principal F.",
               "sobre o centro de curvatura C, sendo real, invertida e do mesmo tamanho do objeto.",
               "no infinito (imagem imprópria).",
               "entre o foco F e o vértice V, sendo real e maior."],
         gab="C — objeto em C: imagem em C, real, invertida e de mesmo tamanho"),
    dict(enun=["Os espelhos estão presentes em diversas situações do cotidiano, e a escolha do tipo "
               "adequado depende das características da imagem e do campo visual desejado.",
               "Para cada situação a seguir, escolha dentre os tipos de espelho — plano, esférico "
               "côncavo, esférico convexo — o melhor a ser utilizado. Justifique sua resposta, "
               "caracterizando a imagem obtida e, quando necessário, a vantagem relacionada ao "
               "campo visual."],
         itens=[("<b>Situação 1</b> — Espelho instalado na porta de um ônibus para o motorista "
                 "observar a entrada e a saída de passageiros. (0,3 ponto)", linhas(3)),
                ("<b>Situação 2</b> — Espelho usado pelo dentista para observar os dentes do paciente "
                 "com detalhes. (0,2 ponto)", linhas(3)),
                ("<b>Situação 3</b> — Espelho de parede de um banheiro, usado para pentear o "
                 "cabelo. (0,3 ponto)", linhas(3))],
         gab="1) Convexo: imagem virtual, direita e menor; maior campo visual. 2) Côncavo (objeto "
             "entre F e V): imagem virtual, direita e ampliada. 3) Plano: imagem virtual, direita, "
             "de mesmo tamanho e à mesma distância (sem deformação)."),
    dict(enun=["Espelhos convexos são usados em saídas de garagem. Suponha que um carro de 1,5 m de "
               "altura esteja a 20 m de um espelho convexo de raio de curvatura 10 m, "
               "perpendicularmente ao seu eixo principal."],
         itens=[("<b>a)</b> A que distância do espelho se forma a imagem do carro? (0,4 ponto)",
                 [caixa("Resolução", 2.2 * cm)]),
                ("<b>b)</b> Qual é a altura da imagem do carro? (0,4 ponto)",
                 [caixa("Resolução", 2.2 * cm)])],
         gab="a) f = −5 m; 1/p' = −1/5 − 1/20 = −1/4 → p' = −4 m (imagem virtual a 4 m do espelho). "
             "b) A = −p'/p = 4/20 = 0,2 → i = 0,2·1,5 = 0,30 m"),
    dict(enun=["Um espelho côncavo tem raio de curvatura igual a 40 cm. Um objeto de 5 cm de altura "
               "é colocado a 30 cm à frente desse espelho."],
         itens=[("<b>a)</b> A que distância do espelho se forma a imagem? (0,4 ponto)",
                 [caixa("Resolução", 2.2 * cm)]),
                ("<b>b)</b> O que se pode dizer a respeito da natureza e do tamanho dessa imagem? "
                 "(0,4 ponto)", [caixa("Resolução", 2.2 * cm)])],
         gab="a) f = 20 cm; 1/p' = 1/20 − 1/30 = 1/60 → p' = 60 cm. b) A = −60/30 = −2 → imagem "
             "real, invertida e maior, com 10 cm de altura"),
    dict(enun=["Uma pessoa, para se maquiar, utiliza um espelho esférico que aumenta em três vezes "
               "a imagem do seu rosto quando ela se coloca a 10 cm do espelho."],
         itens=[("<b>a)</b> Qual é o raio de curvatura desse espelho? (0,3 ponto)",
                 [caixa("Resolução", 2.0 * cm)]),
                ("<b>b)</b> Que tipo de espelho esférico está sendo usado? (0,2 ponto)", linhas(1)),
                ("<b>c)</b> Represente esquematicamente o espelho, posicionando, no eixo principal, o "
                 "objeto, a imagem e os elementos geométricos desse espelho esférico. (0,3 ponto)",
                 [caixa("Esquema", 3.6 * cm)])],
         gab="a) A = 3 = −p'/10 → p' = −30 cm; 1/f = 1/10 − 1/30 = 1/15 → f = 15 cm → R = 30 cm. "
             "b) Côncavo. c) Objeto entre F e V (a 10 cm), F a 15 cm, C a 30 cm; imagem virtual, "
             "direita, atrás do espelho, a 30 cm."),
]

SERIE_3 = [
    dict(enun=["Dois móveis, A e B, ambos em movimento uniforme, percorrem a mesma trajetória "
               "retilínea, no mesmo sentido. Em t = 0, o móvel A está na posição 20 m e o móvel B "
               "na posição 140 m. As velocidades escalares são v<sub>A</sub> = 40 m/s e "
               "v<sub>B</sub> = 25 m/s.", "Em qual posição da trajetória ocorrerá o encontro dos móveis?"],
         alts=["260 m", "300 m", "320 m", "340 m", "380 m"],
         gab="D — 20 + 40t = 140 + 25t → t = 8 s → S = 20 + 40·8 = 340 m"),
    dict(enun=["Dois ciclistas estão separados por 1,2 km em uma estrada retilínea e pedalam um ao "
               "encontro do outro com velocidades constantes de 18 km/h e 30 km/h. O intervalo de "
               "tempo, em minutos, até o encontro vale:"],
         alts=["1,5", "2,4", "3,0", "4,0", "6,0"],
         gab="A — v<sub>rel</sub> = 48 km/h; Δt = 1,2/48 = 0,025 h = 1,5 min"),
    dict(enun=["O movimento retilíneo uniformemente variado de um objeto pode ser representado pela "
               "seguinte progressão aritmética, em que cada número representa a variação do espaço, "
               "em metros, a cada segundo:",
               "<para alignment='center'>4 &nbsp;&nbsp; 10 &nbsp;&nbsp; 16 &nbsp;&nbsp; 22 "
               "&nbsp;&nbsp; 28 &nbsp;&nbsp; ...</para>",
               "A função horária dos espaços, em unidades SI, que pode descrever a posição desse "
               "objeto é:"],
         alts=["t + 3t²", "4t + 6t²", "2 + t + 6t²", "4t + 3t²", "1 + 4t + 3t²"],
         gab="A — razão 6 → a = 6 m/s²; 1º segundo: v<sub>0</sub> + a/2 = 4 → v<sub>0</sub> = 1 m/s "
             "→ S = t + 3t²"),
    dict(enun=["Um motorista dirige em uma estrada retilínea com velocidade constante de 90 km/h "
               "quando avista um tronco caído na pista, a 80 m de distância. Imediatamente ele aciona "
               "os freios, adquirindo uma aceleração escalar de módulo 5 m/s². Pode-se afirmar que "
               "o motorista:"],
         alts=["não conseguirá evitar a colisão com o tronco.",
               "conseguirá parar o carro exatamente na frente do tronco.",
               "conseguirá parar o carro a 17,5 m do tronco.",
               "conseguirá parar o carro a 25 m do tronco.",
               "conseguirá parar o carro a 62,5 m do tronco."],
         gab="C — 25² = 2·5·Δs → Δs = 62,5 m → para a 80 − 62,5 = 17,5 m do tronco"),
    dict(enun=["Considere as frases:",
               "<b>1.</b> Ao remar, o barco avança porque o remo empurra a água para trás e a água "
               "empurra o remo para frente.<br/><b>2.</b> Um caminhão carregado precisa de uma força "
               "maior que um caminhão vazio para obter a mesma aceleração.<br/><b>3.</b> Ao puxar "
               "rapidamente a toalha, a louça permanece sobre a mesa.",
               "Pode-se associá-las com as leis de Newton:",
               "<b>A.</b> Primeira lei de Newton ou Princípio da Inércia.<br/><b>B.</b> Segunda lei "
               "de Newton ou Princípio Fundamental da Dinâmica.<br/><b>C.</b> Terceira lei de Newton "
               "ou Princípio da ação e reação.", "A combinação correta é:"],
         alts=["A-1; B-2; C-3", "A-2; B-1; C-3", "A-3; B-2; C-1", "A-1; B-3; C-2", "A-2; B-3; C-1"],
         gab="C — Inércia: toalha (3); F = m·a: caminhão (2); ação e reação: remo (1)"),
    dict(enun=["Uma pessoa tenta levantar uma caixa de 8 kg, que está em repouso sobre uma mesa, "
               "aplicando uma força vertical para cima de 30 N. Considere g = 10 m/s².",
               "Nessa situação, o valor da força que a mesa aplica na caixa é:"],
         alts=["0 N", "30 N", "50 N", "80 N", "110 N"],
         gab="C — N + F = P → N = 80 − 30 = 50 N"),
    dict(enun=["Um guindaste de massa total igual a 2 toneladas levanta verticalmente uma caixa de "
               "300 kg, com uma aceleração inicial de 2 m/s², que se mantém constante durante um "
               "curto intervalo de tempo. Use g = 10 m/s² e calcule, nesse intervalo de tempo:"],
         itens=[("<b>a)</b> a intensidade da força que o guindaste exerce sobre a caixa; (0,4 ponto)",
                 [caixa("Resolução", 2.2 * cm)]),
                ("<b>b)</b> a intensidade da força que o chão exerce sobre o guindaste (despreze a "
                 "massa das partes móveis do guindaste). (0,4 ponto)", [caixa("Resolução", 2.2 * cm)])],
         gab="a) F − P = m·a → F = 300·(10 + 2) = 3 600 N. b) N = M·g + F = 20 000 + 3 600 = 23 600 N"),
    dict(enun=["Um bloco de massa 2,0 kg está em repouso sobre um plano inclinado de 30° com a "
               "horizontal, preso por um fio paralelo ao plano. Não há atrito entre o bloco e o plano.",
               "(Dados: g = 10 m/s²; sen 30° = 0,50; cos 30° = 0,87)"],
         itens=[("<b>a)</b> Qual é a tração exercida pelo fio? (0,4 ponto)", [caixa("Resolução", 2.2 * cm)]),
                ("<b>b)</b> Cortando-se o fio, qual é a aceleração adquirida pelo bloco? (0,4 ponto)",
                 [caixa("Resolução", 2.2 * cm)])],
         gab="a) T = m·g·sen 30° = 2·10·0,5 = 10 N. b) a = g·sen 30° = 5 m/s²"),
    dict(enun=["Uma esteira rolante, inclinada de 25° com a horizontal, transporta caixas de 50 kg "
               "cada uma, com velocidade constante. O menor coeficiente de atrito estático entre as "
               "caixas e a esteira, necessário para que elas não deslizem, é:",
               "(Dados: sen 25° = 0,42; cos 25° = 0,91)"],
         alts=["0,25", "0,42", "0,46", "0,58", "0,91"], box="Cálculos",
         gab="C — μ·m·g·cos θ = m·g·sen θ → μ = tg 25° = 0,42/0,91 ≈ 0,46"),
    dict(enun=["Um pequeno bloco é lançado para <b>cima</b>, ao longo de um plano inclinado que forma "
               "um ângulo θ com a horizontal. O coeficiente de atrito dinâmico entre o bloco e o "
               "plano é μ e a aceleração local da gravidade é g. Durante a subida, o módulo da "
               "aceleração do bloco é dado por:"],
         alts=["g · (sen θ − μ · cos θ)", "g · (sen θ + μ · cos θ)", "g · (cos θ + μ · sen θ)",
               "g · sen θ", "μ · g"],
         gab="B — na subida, P<sub>t</sub> e atrito apontam para baixo do plano: a = g(sen θ + μ cos θ)"),
]

SERIES = [("1", "1ª SÉRIE EM", SERIE_1), ("2", "2ª SÉRIE EM", SERIE_2), ("3", "3ª SÉRIE EM", SERIE_3)]


def bloco_questao(i, q):
    b = [titulo_questao(i), Spacer(1, 4)]
    b += [P(t) for t in q["enun"]]
    if q.get("fig"):
        b += [Spacer(1, 4), q["fig"], Spacer(1, 4)]
    for texto, extras in q.get("itens", []):
        if texto:
            b += [Spacer(1, 3), P(texto)]
        b += [Spacer(1, 3), *extras]
    if q.get("alts"):
        b += [Spacer(1, 3), alternativas(q["alts"])]
    if q.get("box"):
        b += [Spacer(1, 5), caixa(q["box"])]
    return KeepTogether(b + [Spacer(1, 12)])


def gerar_prova(num, serie, questoes):
    caminho = DEST / f"AV1_2a_Chamada_Fisica_{num}a_Serie_4Bim_2026.pdf"
    doc = documento(caminho, f"AV1 2ª Chamada Física {num}ª Série")
    h = [cabecalho(serie), Spacer(1, 6), *orientacoes(ORIENTACOES[:-1]), Spacer(1, 14),
         faixa(f"AV1 - 2ª CHAMADA - FÍSICA - {num}ª SÉRIE - 4º BIMESTRE"), Spacer(1, 10)]
    h += [bloco_questao(i, q) for i, q in enumerate(questoes, 1)]
    h.append(Paragraph("Boa prova!", st_fim))
    rod = moldura(f"Legacy School - Barra da Tijuca | Física | {num}ª Série EM | "
                  "AV1 2ª Chamada - 4º Bimestre")
    doc.build(h, onFirstPage=rod, onLaterPages=rod)
    return caminho


def gerar_gabarito():
    caminho = DEST / "Gabarito_AV1_2a_Chamada_Fisica_4Bim_2026.pdf"
    doc = documento(caminho, "Gabarito AV1 2ª Chamada Física")
    h = []
    for n, (num, serie, questoes) in enumerate(SERIES):
        if n:
            h.append(PageBreak())
        h += [cabecalho(serie), Spacer(1, 14),
              faixa(f"GABARITO DO PROFESSOR - AV1 2ª CHAMADA - FÍSICA - {num}ª SÉRIE"), Spacer(1, 10)]
        dados = [[Paragraph("<b>Q</b>", st_small), Paragraph("<b>Resposta / Resolução</b>", st_small)]]
        dados += [[Paragraph(f"{i:02d}", st_small), Paragraph(q["gab"], st_small)]
                  for i, q in enumerate(questoes, 1)]
        t = Table(dados, colWidths=[1.2 * cm, LARG - 1.2 * cm])
        t.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), 0.5, BORDA),
                               ("BACKGROUND", (0, 0), (-1, 0), CLARO),
                               ("VALIGN", (0, 0), (-1, -1), "MIDDLE")]))
        h.append(t)
    rod = moldura("Legacy School - Barra da Tijuca | Física | Gabarito AV1 2ª Chamada - 4º Bimestre")
    doc.build(h, onFirstPage=rod, onLaterPages=rod)
    return caminho


if __name__ == "__main__":
    DEST.mkdir(exist_ok=True)
    for num, serie, qs in SERIES:
        assert len(qs) == 10
        print(gerar_prova(num, serie, qs))
    print(gerar_gabarito())
