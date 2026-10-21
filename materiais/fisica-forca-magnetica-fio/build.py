"""Gera o PDF A4 'Força magnética sobre um condutor retilíneo' (guia ilustrado + 20 exercícios + gabarito comentado)."""
import math, subprocess, sys, pathlib
from figs import *

HERE = pathlib.Path(__file__).parent
SEN37, COS37 = 0.6, 0.8

# ---------------------------------------------------------------- conferência numérica (gabarito)
def close(a, b): assert abs(a - b) < 1e-9, (a, b)
close(3 * 0.20 * 0.5, 0.30); close(2.5 * 0.40 * 0.10, 0.10)
close(4 * 0.5 * 0.6, 1.2); close(4 * 0.5 * 0.6 * 0.5, 0.6)
close(1.5 / (6 * 0.5), 0.5); close(1.0 / (2.0 * 0.25), 2.0); close(0.8 / (10 * 0.2), 0.4)
close(2 * 0.5 * 0.5 * 1, 0.5)
close(0.08 * 10 / (0.4 * 0.5), 4.0)
FT = 2.0 * 0.30 * 0.40; close(FT, 0.24); close(0.6 - FT, 0.36); close(0.6 + FT, 0.84)
close(0.5 * (20 * 0.06) * 0.8, 0.48)
close(5 * 0.8 * 0.5, 2.0); close(math.degrees(math.asin(1.0 / 2.0)), 30)
F15 = 4 * 0.20 * 0.50; close(F15, 0.40); close(F15 / 0.050, 8.0); close(8.0 * 0.5, 4.0)
f16 = 0.20 * 0.10 * 10; close(f16, 0.20); close(f16 / (0.50 * 0.40), 1.0)
close((2.0 * 0.5 * 0.4 - f16) / 0.10, 2.0)
F17 = 2.0 * SEN37 / COS37; close(F17, 1.5); close(F17 / (0.6 * 0.5), 5.0)
close(0.4 / (2 * 20), 0.01); close(0.4 - 2 * 20 * 0.005, 0.2); close(0.2 / (0.2 * 0.5), 2.0)
close(5 * (2 * 0.10) * 0.8, 0.8)
F20 = 3 * 0.10 * 0.5; close(F20, 0.15); close(F20 * 0.20, 0.030); close(3 * 0.02 * 0.5, 0.030)
# direções (produto vetorial)
assert force_dir("right", "up") == "out" and force_dir("up", "right") == "in"
assert force_dir("right", "in") == "up" and force_dir("up", "out") == "right"
assert force_dir("right", "right") is None
assert force_dir("in", "right") == "down" and force_dir("in", "left") == "up"
assert force_dir("right", "in") == "up" and force_dir("left", "out") == "up"
assert force_dir("in", "up") == "right" and force_dir("up", "left") == "out"
assert force_dir("up", "right") == "in" and force_dir("down", "right") == "out"

OUT, IN = icon("out"), icon("in")
I_ = '<b class="ci">i</b>'; B_ = '<b class="cb">B</b>'; F_ = '<b class="cf">F</b>'; P_ = '<b class="cp">P</b>'


def card(n, title, stars, body, fig=None, hint="", lines=2, wide=False):
    figh = f'<div class="qfig">{fig}</div>' if fig and not wide else ""
    figw = f'<div class="qwide">{fig}</div>' if fig and wide else ""
    return f'''<div class="q" id="q{n}">
<div class="qh"><span class="qn">{n}</span><span class="qt">{title}</span><span class="lvl">{stars}</span></div>
<div class="qbody"><div class="qtext">{body}</div>{figh}</div>{figw}
<div class="hint"><b>Dica leve</b> {hint}</div>
<div class="lines" style="height:{lines * 6.5}mm"></div>
</div>'''


def key(n, answer, strategy, steps, error, fig=None):
    figh = f'<div class="kfig">{fig}</div>' if fig else ""
    return f'''<div class="k">
<div class="kh"><span class="qn">{n}</span><span class="kans">{answer}</span></div>
<div class="kbody"><div>
<p><b class="ks">Estratégia.</b> {strategy}</p>
<div class="steps">{steps}</div>
<p class="err"><b>Erro comum.</b> {error}</p></div>{figh}</div></div>'''


def level(n, title, sub, stars):
    return f'<div class="level l{n}"><div class="lvn">NÍVEL {n}</div><div class="lvt">{title}<span>{sub}</span></div><div class="lvs">{stars}</div></div>'


def figbox(svgs, cap):
    return f'<div class="panels">' + "".join(f'<div class="pcell">{s}<div class="pcap">{c}</div></div>' for s, c in zip(svgs, cap)) + '</div>'


STAR = lambda k: "★" * k + "☆" * (5 - k)

# ================================================================ CONTEÚDO
cover = f'''
<section class="cover">
 <div class="kicker">FÍSICA · ENSINO MÉDIO · ELETROMAGNETISMO</div>
 <h1>Força magnética<br>sobre um fio com corrente</h1>
 <p class="sub">Um guia ilustrado, passo a passo. Sem pressa, sem decoreba — com 20 exercícios que sobem degrau por degrau.</p>
</section>
<div class="hero">{hero()}</div>
<div class="grid2">
 <div class="box big">
  <h3>A grande ideia em uma frase</h3>
  <p>Quando um <b>fio com corrente</b> está dentro de um <b>campo magnético</b>, o campo <b>empurra o fio</b>. Só isso. Toda a aula responde a duas perguntas:</p>
  <div class="two"><div><b>QUANTO</b> ele empurra?<br><small>→ uma fórmula</small></div><div><b>PARA ONDE</b> ele empurra?<br><small>→ a mão direita</small></div></div>
 </div>
 <div class="box">
  <h3>Os 3 personagens (e suas cores)</h3>
  <ul class="cast">
   <li>{I_} <span><b class="ci">corrente</b> no fio — <em>cor laranja</em></span></li>
   <li>{B_} <span><b class="cb">campo magnético</b> — <em>cor azul</em></span></li>
   <li>{F_} <span><b class="cf">força</b> que empurra o fio — <em>cor verde</em></span></li>
  </ul>
  <p class="small">Em todas as figuras deste material, as cores são sempre as mesmas.</p>
 </div>
</div>
<div class="roadmap">
 <h3>Seu mapa de viagem</h3>
 <ol>
  <li><b>Passo 1</b>Conhecer os 3 personagens</li>
  <li><b>Passo 2</b>QUANTO? A fórmula</li>
  <li><b>Passo 3</b>PARA ONDE? Mão direita</li>
  <li><b>Passo 4</b>Exemplos resolvidos</li>
  <li><b>Passo 5</b>Cuidados + mapa mental</li>
  <li><b>Treino</b>20 exercícios + gabarito</li>
 </ol>
</div>
<div class="box warmbox"><b>Como usar:</b> leia um passo por vez · tente os exemplos <i>antes</i> de ver a solução · use as <b>dicas leves</b> quando travar · o gabarito é para <b>conferir e entender</b>, não para copiar. Errou? Ótimo: é errando que o cérebro aprende. Você consegue.</div>
<div class="pb"></div>
'''

passo1 = f'''
<h2><span class="step">1</span>Conheça os 3 personagens</h2>
<div class="grid3">
 <div class="char ci-bg"><div class="cl">{I_}</div><h4>Corrente elétrica</h4><p>Cargas elétricas <b>andando</b> dentro do fio.<br><b>Unidade:</b> ampère (A).<br>Usamos o <b>sentido convencional</b>: sai do polo <b>+</b> e vai para o <b>−</b>.</p></div>
 <div class="char cb-bg"><div class="cl">{B_}</div><h4>Campo magnético</h4><p>A “zona de influência” de um ímã. Desenhamos <b>linhas de campo</b>: elas <b>saem do polo Norte e entram no Sul</b>.<br><b>Unidade:</b> tesla (T).</p></div>
 <div class="char cf-bg"><div class="cl">{F_}</div><h4>Força magnética</h4><p>O <b>empurrão</b> que o campo dá no fio.<br><b>Unidade:</b> newton (N).<br>Se for zero, o fio nem se mexe por causa do campo.</p></div>
</div>
<div class="grid2 aligntop">
 <div>
  <h3>A regra de ouro: F fica a 90° de tudo</h3>
  <p>{I_} e {B_} desenham, juntos, um “chão” (um plano — no desenho, a própria folha). A força {F_} <b>não fica deitada nesse chão</b>: ela sai dele em linha reta, como um <b>prego fincado na parede</b>.</p>
  <div class="box key"><b>Em duas frases:</b><br>1) {F_} é <b>perpendicular a {I_}</b>.<br>2) {F_} é <b>perpendicular a {B_}</b>.<br>Por isso a força nunca aponta “para a frente” do fio, nem na direção das linhas de campo.</div>
 </div>
 <div>{triad()}</div>
</div>
<div class="grid2 aligntop">
 <div>
  <h3>Como desenhar “saindo” e “entrando”</h3>
  <p>Na folha de papel só temos duas dimensões. Para mostrar algo que <b>fura a folha</b> usamos dois símbolos — pense numa <b>flecha</b>:</p>
  <p>{OUT} <b>saindo</b>: você vê a <b>ponta</b> da flecha vindo até você (um pontinho).<br>{IN} <b>entrando</b>: você vê as <b>penas</b> da flecha indo embora (um xis).</p>
 </div>
 <div>{out_in_legend()}</div>
</div>
<div class="pb"></div>
'''

passo2 = f'''
<h2><span class="step">2</span>QUANTO empurra? A fórmula</h2>
<div class="formula"><span class="fl">F</span> = <span class="ci">i</span> · <span class="cl2">L</span> · <span class="cb">B</span> · sen <span class="th">θ</span></div>
<div class="grid2 aligntop">
 <div>
  <table class="tbl">
   <tr><th>Letra</th><th>Significa</th><th>Unidade</th></tr>
   <tr><td>{F_}</td><td>força magnética</td><td>newton (N)</td></tr>
   <tr><td>{I_}</td><td>corrente no fio</td><td>ampère (A)</td></tr>
   <tr><td><b>L</b></td><td>comprimento do fio <u>dentro do campo</u></td><td>metro (m)</td></tr>
   <tr><td>{B_}</td><td>intensidade do campo</td><td>tesla (T)</td></tr>
   <tr><td><b class="th">θ</b></td><td>ângulo entre o <b>fio</b> (sentido de i) e as <b>linhas de B</b></td><td>graus (°)</td></tr>
  </table>
  <div class="box warn"><b>Atenção às unidades!</b> A fórmula só funciona no SI.<br>
   <b>cm → m:</b> divida por 100 &nbsp;(50 cm = 0,50 m)<br><b>g → kg:</b> divida por 1000 &nbsp;(200 g = 0,200 kg)</div>
 </div>
 <div>{angle_fig(35)}<div class="pcap" style="margin-bottom:3mm">θ é o ângulo entre o fio e as linhas de campo. L é o pedaço do fio dentro do campo.</div>
 <div class="box key"><b>Receita de 4 passos (use sempre):</b>
 <ol class="recipe"><li><b>Dados</b>: escreva tudo e converta para o SI.</li><li><b>Ângulo</b>: ache θ entre fio e B. “Perpendicular” = 90°.</li><li><b>Conta</b>: F = i · L · B · sen θ.</li><li><b>Confira</b>: unidade em N? O número faz sentido?</li></ol></div></div>
</div>
<h3>O que o ângulo faz com a força</h3>
{three_positions()}
<div class="grid2 aligntop">
 <div class="box">
  <h3>Valores do seno que você usa</h3>
  <table class="tbl small"><tr><th>θ</th><th>0°</th><th>30°</th><th>45°</th><th>60°</th><th>90°</th></tr>
  <tr><td>sen θ</td><td>0</td><td>0,5</td><td>≈ 0,71</td><td>≈ 0,87</td><td>1</td></tr></table>
  <p class="small"><b>Perpendicular</b> ⇒ θ = 90° ⇒ sen θ = 1 ⇒ F <b>máxima</b>.<br><b>Paralelo</b> ⇒ θ = 0° ⇒ sen θ = 0 ⇒ <b>F = 0</b>.</p>
 </div>
 <div class="box">
  <h3>Proporcionalidade (sem fazer conta!)</h3>
  <p>{F_} cresce junto com {I_}, <b>L</b> e {B_}. Se dobra um deles, a força dobra:</p>
  <div class="chips"><span>{I_} ×2 → {F_} ×2</span><span>L ×3 → {F_} ×3</span><span>{B_} ÷2 → {F_} ÷2</span></div>
  <p class="small">Vários mudando juntos? <b>Multiplique</b> os fatores.</p>
 </div>
</div>
'''

cases_pass3 = [("right", "up"), ("up", "right"), ("right", "in"), ("up", "out")]
passo3 = f'''
<h2><span class="step">3</span>PARA ONDE empurra? A mão direita</h2>
<p class="lead">Na aula: <b>“para aplicar a regra da mão direita, aponte-a em L (o comprimento do fio) no sentido da corrente elétrica.”</b> Vamos por partes.</p>
<div class="grid3 steps3">
 <div class="s3"><b>1</b><p>Aponte os <b>dedos da mão direita</b> no <b>sentido da corrente</b> {I_} (ao longo do fio).</p></div>
 <div class="s3"><b>2</b><p><b>Feche os dedos</b> em direção ao campo {B_} (pelo menor caminho).</p></div>
 <div class="s3"><b>3</b><p>O <b>polegar</b> mostra o sentido da força {F_}.</p></div>
</div>
<div class="grid2 aligntop">
 <div>
  <h3>Atalho para desenhos na folha: “o giro”</h3>
  <p>Quando {I_} e {B_} estão <b>desenhados na folha</b>, imagine girar {I_} até encontrar {B_} pelo caminho mais curto:</p>
  <p><b>anti-horário</b> (contra os ponteiros do relógio) ⇒ {F_} <b>sai</b> {OUT}<br><b>horário</b> ⇒ {F_} <b>entra</b> {IN}</p>
  <div class="panels p2">{swirl(0, 90)}{swirl(90, 0)}</div>
 </div>
 <div>
  <h3>Outro jeito: a mão espalmada</h3>
  <p><b>Polegar</b> = {I_} · <b>dedos</b> = {B_} · a <b>palma da mão empurra</b> no sentido de {F_}.</p>
  {hand()}
 </div>
</div>
<h3>Treine com 4 casos resolvidos</h3>
{figbox([panel(i, b, True, letter=l) for (i, b), l in zip(cases_pass3, "ABCD")],
        [f"{I_} {NAMES[i].replace('para a ','→ ').replace('para ','→ ')}, {B_} {NAMES[b].replace('para a ','→ ').replace('para ','→ ')} ⇒ {F_} {NAMES[force_dir(i,b)].replace('para a ','→ ').replace('para ','→ ')}" for i, b in cases_pass3])}
<div class="grid2 aligntop">
 <div class="box key"><b>Teste de bolso</b> (use para conferir qualquer resposta):<br>
  • inverteu a corrente ⇒ {F_} <b>inverte</b><br>• inverteu o campo ⇒ {F_} <b>inverte</b><br>• inverteu os dois ⇒ {F_} <b>não muda</b><br>• {I_} paralelo a {B_} ⇒ <b>F = 0</b></div>
 <div class="box warn"><b>Cuidado:</b> use a <b>mão direita</b> e o <b>sentido convencional</b> da corrente (do + para o −). Se usar a esquerda, a resposta sai ao contrário!</div>
</div>
<div class="pb"></div>
'''

ex1 = [panel("up", "left", True, letter="1"), panel("right", "up", True, letter="2")]
assert force_dir("up", "left") == "out" and force_dir("right", "up") == "out"
passo4 = f'''
<h2><span class="step">4</span>Exemplos resolvidos (os da aula)</h2>
<div class="ex">
 <div class="exh">Exemplo 1 · Para onde aponta a força magnética?</div>
 {figbox(ex1, [f"Fio na vertical, {I_} para cima, {B_} para a esquerda", f"Fio na horizontal, {I_} para a direita, {B_} para cima"])}
 <p><b>Caso 1:</b> gire {I_} (para cima) até {B_} (para a esquerda): é uma volta de 90° no sentido <b>anti-horário</b> ⇒ {F_} <b>sai da folha</b> {OUT}.<br>
 <b>Caso 2:</b> gire {I_} (para a direita) até {B_} (para cima): também <b>anti-horário</b> ⇒ {F_} <b>sai da folha</b> {OUT}.</p>
</div>
<div class="ex">
 <div class="exh">Exemplo 2 · O fio que fica parado no ar (equilíbrio)</div>
 <div class="grid2 aligntop">
  <div>
   <p>Num fio condutor horizontal, <b>L = 50 cm</b> e <b>m = 200 g</b>. O campo {B_} é uniforme e <b>entra na folha</b> {IN}. Passa pelo fio uma corrente <b>i = 2,0 A</b>. Sabe-se que o <b>peso P e a força magnética F estão em equilíbrio</b> (g = 10 m/s²).<br>
   <b>a)</b> Sentido de {F_}? &nbsp; <b>b)</b> Sentido da corrente? &nbsp; <b>c)</b> Intensidade de {B_}?</p>
  </div>
  <div>{equilibrium_fig("in", False, None, W=300, H=170)}</div>
 </div>
 <div class="sol">
  <p><b>a)</b> Equilíbrio = as forças se cancelam. O peso {P_} puxa para <b>baixo</b>, então {F_} aponta para <b>cima</b>.</p>
  <p><b>b)</b> Queremos {F_} para cima com {B_} {IN} entrando. Testando com a mão direita: dedos para a <b>direita</b>, feche em direção a “para dentro da folha” ⇒ polegar para cima ✔. A corrente vai <b>para a direita</b>.</p>
  <p><b>c)</b> Converta: L = 0,50 m · m = 0,200 kg. &nbsp; Peso: P = m·g = 0,200 × 10 = <b>2,0 N</b>. &nbsp; Equilíbrio: F = P = 2,0 N.<br>
  Como o fio é perpendicular ao campo (sen 90° = 1): F = i·L·B ⇒ B = F ÷ (i·L) = 2,0 ÷ (2,0 × 0,50) = <b>2,0 T</b>.</p>
 </div>
 <div class="grid2 aligntop"><div>{equilibrium_fig("in", True, "right", W=300, H=170)}</div><div class="box key small">Resumo visual: o fio está parado porque <b>{F_} (para cima)</b> e <b>{P_} (para baixo)</b> são iguais. Com a corrente para a direita e {B_} entrando, a mão direita dá {F_} para cima ✔.</div></div>
</div>
<div class="pb"></div>
'''

passo5 = f'''
<h2><span class="step">5</span>Cuidados e mapa mental</h2>
<div class="grid2 aligntop">
 <div class="box warn">
  <h3>Os 6 erros mais comuns</h3>
  <ol class="errs">
   <li>Esquecer <b>cm → m</b> (50 cm ≠ 50 m).</li>
   <li>Esquecer <b>g → kg</b> no peso.</li>
   <li>Pegar o ângulo errado: θ é entre o <b>fio</b> e as <b>linhas de B</b>.</li>
   <li>Achar que {F_} aponta na direção de {B_} ou de {I_}. Ela é <b>perpendicular</b> aos dois.</li>
   <li>Usar a mão esquerda ou o sentido dos elétrons.</li>
   <li>Trocar {OUT} (sai) por {IN} (entra), ou esquecer que <b>{I_} ∥ {B_} ⇒ F = 0</b>.</li>
  </ol>
 </div>
 <div class="box key">
  <h3>Roteiro para QUALQUER exercício</h3>
  <ol class="recipe">
   <li><b>Leia e desenhe</b>: onde estão {I_}, {B_}, o fio?</li>
   <li><b>Dados no SI</b> (cm → m, g → kg).</li>
   <li><b>Quanto?</b> F = i · L · B · sen θ</li>
   <li><b>Para onde?</b> Mão direita / giro.</li>
   <li>Tem peso, mola, atrito? Desenhe <b>todas as forças</b> e aplique equilíbrio (F = P) ou Newton (F<sub>res</sub> = m·a).</li>
   <li><b>Confira</b> unidade e bom senso.</li>
  </ol>
 </div>
</div>
<h3>Mapa mental da aula</h3>
{mindmap()}
<div class="pb"></div>
'''

# ================================================================ EXERCÍCIOS
q = []
q.append(level(1, "Entendendo a ideia", "conceitos e conta direta", STAR(1)))
q.append(card(1, "Quando existe força?", STAR(1),
  "Em qual das situações abaixo o fio sofre força magnética?<br><br>"
  "<b>(A)</b> Fio com corrente, longe de qualquer ímã.<br><b>(B)</b> Fio <i>sem</i> corrente, dentro de um campo magnético.<br>"
  "<b>(C)</b> Fio com corrente, <b>perpendicular</b> às linhas de um campo magnético.<br><b>(D)</b> Fio com corrente, esticado <b>paralelo</b> às linhas de campo.",
  hint="A força precisa de <b>três coisas ao mesmo tempo</b>: corrente, campo e um ângulo diferente de 0°.", lines=1))
q.append(card(2, "Conta direta", STAR(1),
  f"Um fio reto de comprimento <b>L = 0,20 m</b> é percorrido por <b>i = 3 A</b> e está <b>perpendicular</b> a um campo <b>B = 0,5 T</b>. Qual é a intensidade da força magnética?",
  hint="“Perpendicular” quer dizer θ = 90°. E quanto vale sen 90°?", lines=2))
q.append(card(3, "Cuidado com a unidade", STAR(1),
  f"Um fio de <b>40 cm</b>, percorrido por <b>i = 2,5 A</b>, está perpendicular a um campo de <b>0,10 T</b>. Calcule a força magnética, em newtons.",
  hint="Antes de qualquer coisa: 40 cm são quantos metros?", lines=2))
q.append(card(4, "O ângulo manda", STAR(1),
  f"Um fio de <b>L = 50 cm</b>, com <b>i = 4 A</b>, está num campo <b>B = 0,6 T</b>. Calcule {F_} quando o fio forma com as linhas de campo um ângulo de:<br><b>a)</b> 90° &nbsp;&nbsp; <b>b)</b> 0° &nbsp;&nbsp; <b>c)</b> 30°",
  hint="Só o seno muda: sen 0° = 0, sen 30° = 1/2, sen 90° = 1. Calcule o resto uma vez só.", lines=2))
q.append(f'<div class="q" id="q5"><div class="qh"><span class="qn">5</span><span class="qt">Para onde aponta?</span><span class="lvl">{STAR(1)}</span></div>'
  f'<div class="qtext">Em cada figura, o fio tem corrente {I_} no sentido indicado e o campo {B_} é uniforme. Diga a <b>direção e o sentido</b> da força magnética (use {OUT} saindo da folha e {IN} entrando na folha quando preciso).</div>'
  + figbox([panel("right", "up", letter="A"), panel("up", "right", letter="B"), panel("right", "in", letter="C"), panel("up", "out", letter="D"), panel("right", "right", letter="E")],
           ["", "", "", "", ""]).replace('class="panels"', 'class="panels p3"')
  + f'<div class="hint"><b>Dica leve</b> Nos casos A, B e E use o <b>giro</b>. Nos casos C e D, o campo {B_} fura a folha: use a <b>mão direita</b> (dedos em {I_}, feche para {B_}). E atenção ao caso E!</div>'
  + '<div class="lines" style="height:16mm"></div></div>')

q.append(level(2, "Pegando o jeito", "isolar incógnitas e raciocinar com proporções", STAR(2)))
q.append(card(6, "Descobrindo o campo", STAR(2),
  f"Um fio de <b>0,50 m</b>, percorrido por <b>6 A</b> e perpendicular ao campo, sofre uma força de <b>1,5 N</b>. Qual é o valor de {B_}?",
  hint="Parta de F = i·L·B e isole o que você quer descobrir (como numa equação do 1º grau).", lines=2))
q.append(card(7, "Descobrindo a corrente", STAR(2),
  f"Um fio de <b>25 cm</b>, num campo uniforme de <b>2,0 T</b> perpendicular a ele, sofre uma força de <b>1,0 N</b>. Qual é a corrente no fio?",
  hint="Converta 25 cm para metros e só depois isole {0}.".format(I_), lines=2))
q.append(card(8, "Descobrindo o comprimento", STAR(2),
  f"Um fio é percorrido por <b>10 A</b>, num campo <b>B = 0,20 T</b> perpendicular a ele. A força é de <b>0,80 N</b>. Qual é o comprimento do fio <b>em centímetros</b>?",
  hint="A pergunta pede cm, mas a fórmula pede metros. Calcule em metros e converta no final.", lines=2))
q.append(card(9, "Entre os polos do ímã", STAR(2),
  f"Um fio atravessa a folha, entre os polos de um ímã. A corrente <b>entra na folha</b> {IN}.<br><b>a)</b> Qual é o sentido de {B_} entre os polos?<br><b>b)</b> O fio é empurrado para cima ou para baixo?<br><b>c)</b> E se trocarmos os polos do ímã de lugar?",
  fig=magnet_fig(W=330, H=190),
  hint="As linhas de campo <b>saem do N</b> e <b>entram no S</b>. Depois use a mão direita com os dedos apontando <i>para dentro</i> da folha.", lines=2))
q.append(card(10, "Sem refazer a conta", STAR(2),
  f"Um fio sofre força <b>F = 2,0 N</b>. Sem refazer tudo, diga a nova força se:<br><b>a)</b> a corrente for <b>invertida</b>;<br><b>b)</b> a corrente <b>dobrar</b> e o campo cair à <b>metade</b>;<br><b>c)</b> o comprimento <b>triplicar</b> e o campo <b>dobrar</b>;<br><b>d)</b> a corrente cair à <b>metade</b>, o comprimento <b>dobrar</b> e o campo <b>triplicar</b>.",
  hint="{0} é proporcional a {1}, L e {2}: multiplique os fatores que mudaram. No item (a), pense na <i>direção</i> também.".format(F_, I_, B_), lines=3))

q.append(level(3, "Combinando ideias", "magnetismo + peso, tensão, espiras e ângulos", STAR(3)))
q.append(card(11, "O fio que flutua", STAR(3),
  f"Um fio condutor horizontal, de <b>40 cm</b> e <b>80 g</b>, está num campo uniforme <b>B = 0,50 T</b> que <b>sai da folha</b> {OUT}, perpendicular ao fio (g = 10 m/s²). Para o fio ficar <b>parado no ar</b>:<br><b>a)</b> qual deve ser o sentido da força magnética?<br><b>b)</b> qual deve ser o sentido da corrente?<br><b>c)</b> qual deve ser a corrente?",
  fig=equilibrium_fig("out", False, None, W=300, H=170),
  hint="Equilíbrio = forças que se cancelam. O peso puxa para baixo, então {0} precisa...? Depois confirme o sentido de {1} com a mão direita.".format(F_, I_), lines=3))
q.append(card(12, "Pendurado por fios", STAR(3),
  f"Um fio horizontal de <b>30 cm</b> e <b>60 g</b> está pendurado por <b>dois fios leves e isolantes</b>, num campo <b>B = 0,40 T</b> que <b>entra na folha</b> {IN}. A corrente é <b>i = 2,0 A</b>, para a <b>direita</b> (g = 10 m/s²).<br><b>a)</b> Qual é o sentido da força magnética?<br><b>b)</b> Qual é a tensão total nos fios (e em cada um)?<br><b>c)</b> E se a corrente for invertida?",
  fig=strings_fig(W=300, H=210),
  hint="Desenhe {0} (baixo), {1} e as tensões T. Os fios seguram só o que falta: T + (força para cima) = (força para baixo).".format(P_, F_), lines=3))
q.append(card(13, "Alto-falante", STAR(3),
  f"No alto-falante, a bobina tem <b>20 voltas</b> de fio; cada volta tem <b>6,0 cm</b> de fio dentro do campo do ímã, cujo valor é <b>B = 0,80 T</b> e que é <b>perpendicular ao fio em todos os pontos</b>. A corrente é <b>0,50 A</b>. Qual é a intensidade da força magnética sobre a bobina?",
  fig=coil_fig(W=270, H=200),
  hint="O campo age em <b>todo</b> o fio da bobina. Quantos centímetros de fio, ao todo, estão dentro do campo?", lines=2))
q.append(card(14, "Inclinando o fio", STAR(3),
  f"Um fio de <b>80 cm</b> conduz <b>i = 5,0 A</b> num campo uniforme <b>B = 0,50 T</b>.<br><b>a)</b> Qual é a <b>maior</b> força possível sobre o fio? Em que posição ela ocorre?<br><b>b)</b> Em que ângulo θ com as linhas de campo o fio deve ficar para a força valer <b>1,0 N</b>?",
  fig=angle_fig(30, "θ", W=330, H=190),
  hint="A força máxima acontece quando sen θ tem o maior valor possível. No item (b), descubra primeiro quanto vale <b>sen θ</b>.", lines=2))

q.append(level(4, "Desafios", "magnetismo + dinâmica", STAR(4)))
q.append(card(15, "A barra nos trilhos", STAR(4),
  f"Uma barra metálica de <b>50 g</b> e comprimento <b>L = 20 cm</b> repousa sobre dois trilhos horizontais <b>lisos</b>, ligados a uma bateria (vista de cima). O campo é vertical, <b>saindo da folha</b> {OUT}, com <b>B = 0,50 T</b>. A corrente na barra é <b>4,0 A</b> (sentido da figura). Despreze a indução eletromagnética e o ar.<br><b>a)</b> Para onde a barra é empurrada?<br><b>b)</b> Qual é a intensidade da força?<br><b>c)</b> Qual é a aceleração da barra?<br><b>d)</b> Qual é a velocidade 0,5 s após partir do repouso?",
  fig=rails_fig(W=420, H=215),
  hint="O magnetismo dá a <b>força</b>; depois vira um problema de Dinâmica (F = m·a). Cuidado: 50 g em kg.", lines=3))
q.append(card(16, "Com atrito", STAR(4),
  f"Na mesma montagem, agora a barra tem <b>m = 0,10 kg</b> e <b>L = 0,50 m</b>, o campo vertical vale <b>B = 0,40 T</b> e há atrito com os trilhos: <b>μ = 0,20</b> (g = 10 m/s²). Despreze a indução.<br><b>a)</b> Qual corrente faz a barra andar com <b>velocidade constante</b>?<br><b>b)</b> Se a corrente for <b>2,0 A</b>, qual será a aceleração?",
  fig=rails_fig(friction=True, W=420, H=215),
  hint="Velocidade constante significa força resultante <b>zero</b>. O que equilibra {0} aqui? (Lembre: atrito = μ · N, e N = m·g.)".format(F_), lines=3))
q.append(card(17, "Na rampa", STAR(4),
  f"Uma barra condutora de <b>0,20 kg</b> e <b>0,50 m</b> (horizontal, perpendicular à folha) repousa sobre um plano inclinado <b>liso</b> de <b>37°</b>. Há um campo magnético <b>vertical, para cima</b>, <b>B = 0,60 T</b>. A corrente na barra <b>entra na folha</b> {IN}. (g = 10 m/s²; sen 37° = 0,6; cos 37° = 0,8)<br><b>a)</b> Qual é a direção e o sentido da força magnética?<br><b>b)</b> Qual deve ser o valor de {F_} para a barra ficar em repouso?<br><b>c)</b> Qual deve ser a corrente?",
  fig=incline_fig(W=330, H=240),
  hint="Desenhe {0} (baixo), N (perpendicular à rampa) e {1}. Em equilíbrio, as forças <b>ao longo da rampa</b> se cancelam — decomponha o que estiver inclinado.".format(P_, F_), lines=3))
q.append(card(18, "Fio nas molas", STAR(4),
  f"Um fio horizontal de <b>50 cm</b> e <b>40 g</b> está pendurado por <b>duas molas iguais</b>, de constante <b>k = 20 N/m</b> cada, num campo <b>B = 0,20 T</b> que <b>entra na folha</b> {IN} (g = 10 m/s²).<br><b>a)</b> Sem corrente, qual é o alongamento de cada mola?<br><b>b)</b> Passa-se uma corrente que produz força magnética <b>para cima</b>, e o alongamento cai para <b>0,5 cm</b>. Qual é essa corrente e qual é o seu sentido?",
  fig=springs_fig(W=300, H=220),
  hint="Sem corrente: peso = força das duas molas. Com corrente: peso = molas + {0}. Lei de Hooke: F<sub>el</sub> = k·x.".format(F_), lines=3))

q.append(level(5, "Nível vestibular", "visão de conjunto e transferência", STAR(5)))
q.append(card(19, "O fio curvo", STAR(5),
  f"Um fio em forma de <b>semicircunferência</b> de raio <b>R = 10 cm</b> conduz <b>i = 5,0 A</b> (da esquerda para a direita, passando por cima). Ele está num campo uniforme <b>B = 0,80 T</b> que <b>entra na folha</b> {IN}, perpendicular ao plano do fio. Despreze a força nos fios de ligação.<br><b>a)</b> Qual é a intensidade da força magnética resultante sobre o semicírculo?<br><b>b)</b> Qual é a direção e o sentido dessa força?",
  fig=semicircle_fig(W=330, H=215),
  hint="Em campo uniforme, o que importa é só “onde o fio começa e onde termina”. Pense num fio <b>reto equivalente</b> com a mesma corrente. Qual seria o comprimento dele?", lines=3))
q.append(card(20, "O motor elétrico", STAR(5),
  f"Uma espira retangular de lados <b>20 cm</b> (horizontais) e <b>10 cm</b> (verticais) conduz <b>i = 3,0 A</b> no sentido <b>anti-horário</b>, dentro de um campo uniforme <b>B = 0,50 T</b> <b>paralelo ao plano da espira</b>, para a direita.<br><b>a)</b> Qual é a força em cada lado horizontal?<br><b>b)</b> Qual é a força em cada lado vertical, e com qual sentido ({OUT} ou {IN})?<br><b>c)</b> Qual é a força resultante na espira inteira?<br><b>d)</b> Então o que as forças tendem a fazer com a espira?<br><b>e)</b> (Bônus) Calcule o torque τ = F · d, sendo d a distância entre as duas forças.",
  fig=loop_fig(W=400, H=240), wide=True,
  hint="Cada lado é um pedaço de fio reto: aplique a regra a <b>um lado por vez</b>. Lado paralelo a {0}: θ = 0°.".format(B_), lines=4))

exercises = f'''
<div class="part-title"><span>TREINO</span><h2 class="nohead">20 exercícios em degraus</h2>
<p>Comece pelo Nível 1 e <b>só suba quando estiver confortável</b>. Em cada exercício há uma <b>dica leve</b> (ela ajuda a começar, mas não resolve por você). Use g = 10 m/s². Desenhe sempre!</p>
<div class="lvlbar"><i class="l1">1</i><i class="l2">2</i><i class="l3">3</i><i class="l4">4</i><i class="l5">5</i></div></div>
{"".join(q)}
<div class="pb"></div>
'''

# ================================================================ GABARITO
rapid = [("1", "C"), ("2", "0,30 N"), ("3", "0,10 N"), ("4", "1,2 N · 0 · 0,6 N"), ("5", "A: ⊙ · B: ⊗ · C: ↑ · D: → · E: F = 0"),
         ("6", "0,5 T"), ("7", "2,0 A"), ("8", "40 cm"), ("9", "→ · para baixo · para cima"), ("10", "2,0 N (oposta) · 2,0 N · 12 N · 6,0 N"),
         ("11", "↑ · para a esquerda · 4,0 A"), ("12", "↑ · 0,36 N (0,18 N cada) · 0,84 N (0,42 N cada)"), ("13", "0,48 N"), ("14", "2,0 N (θ = 90°) · θ = 30°"),
         ("15", "→ · 0,40 N · 8,0 m/s² · 4,0 m/s"), ("16", "1,0 A · 2,0 m/s²"), ("17", "→ horizontal · 1,5 N · 5,0 A"), ("18", "1,0 cm · 2,0 A, para a direita"),
         ("19", "0,80 N · vertical, para cima"), ("20", "0 · 0,15 N (⊗ à direita, ⊙ à esquerda) · 0 · gira · 0,030 N·m")]
rapid_html = '<table class="rapid">' + "".join(
    "<tr>" + "".join(f'<td><b>{n}</b></td><td>{a}</td>' for n, a in rapid[r::10]) + "</tr>" for r in range(10)) + "</table>"

ks = []
ks.append(key(1, "Resposta: (C)",
  f"Faça três perguntas ao fio: <b>tem {I_}? tem {B_}? o ângulo é diferente de 0°?</b> Só com três “sim” há força.",
  "<p>(A) Sem campo: B = 0 ⇒ F = 0. · (B) Sem corrente: i = 0 ⇒ F = 0. · <b>(C) i ≠ 0, B ≠ 0 e θ = 90° ⇒ sen 90° = 1 ⇒ F = i·L·B (máxima).</b> · (D) θ = 0° ⇒ sen 0° = 0 ⇒ F = 0.</p>",
  "marcar (D) pensando “tem corrente e tem campo, então tem força”. Falta olhar o <b>ângulo</b>: fio paralelo ao campo não sente nada."))
ks.append(key(2, "F = 0,30 N",
  "Dados já estão no SI. Perpendicular ⇒ θ = 90°.",
  "<p>F = i · L · B · sen 90° = 3 × 0,20 × 0,5 × 1 = <b>0,30 N</b>.</p><p>Unidade: A · m · T = N ✔.</p>",
  "usar “sen 90° = 90”. O seno de 90° vale <b>1</b>, não 90."))
ks.append(key(3, "F = 0,10 N",
  "Antes da conta, converta: <b>40 cm = 0,40 m</b>.",
  "<p>F = 2,5 × 0,40 × 0,10 × 1 = <b>0,10 N</b>.</p>",
  "usar 40 em vez de 0,40: o resultado sairia <b>100 vezes maior</b> (10 N) — um valor absurdo para esse fio."))
ks.append(key(4, "a) 1,2 N · b) 0 · c) 0,6 N",
  "Calcule uma vez o que não muda: i · L · B = 4 × 0,50 × 0,6 = 1,2. A força é <b>1,2 × sen θ</b>.",
  "<p><b>a)</b> θ = 90° ⇒ 1,2 × 1 = <b>1,2 N</b> (a máxima).<br><b>b)</b> θ = 0° ⇒ 1,2 × 0 = <b>0</b> (fio paralelo ao campo).<br><b>c)</b> θ = 30° ⇒ 1,2 × 0,5 = <b>0,6 N</b> (metade da máxima).</p>",
  "deixar a calculadora em radianos, ou achar que sen 30° = 30. Lembre: sen 30° = 0,5."))
k5_cases = [("right", "up", "A"), ("up", "right", "B"), ("right", "in", "C"), ("up", "out", "D"), ("right", "right", "E")]
k5_svgs = figbox([panel(i, b, True, letter=l) for i, b, l in k5_cases], [""] * 5).replace('class="panels"', 'class="panels p3"')
ks.append(f'''<div class="k"><div class="kh"><span class="qn">5</span><span class="kans">A: {OUT} · B: {IN} · C: ↑ · D: → · E: F = 0</span></div>
<div class="kbody wide"><div><p><b class="ks">Estratégia.</b> Dois métodos: o <b>giro</b> (quando {I_} e {B_} estão na folha) e a <b>mão direita</b> (quando um deles fura a folha).</p>
<div class="steps"><p><b>A)</b> Gire {I_} (→) até {B_} (↑): anti-horário ⇒ {F_} <b>sai</b> {OUT}.<br>
<b>B)</b> Gire {I_} (↑) até {B_} (→): horário ⇒ {F_} <b>entra</b> {IN}.<br>
<b>C)</b> Dedos para a direita, feche em direção a “para dentro da folha”: polegar <b>para cima</b>.<br>
<b>D)</b> Dedos para cima, feche em direção a “saindo da folha” (para você): polegar <b>para a direita</b>.<br>
<b>E)</b> {I_} e {B_} <b>paralelos</b> ⇒ θ = 0° ⇒ <b>F = 0</b>.</p></div>
<p class="err"><b>Erro comum.</b> desenhar uma força no caso E, ou trocar {OUT} por {IN}. Use o <b>teste de bolso</b>: inverter a corrente tem que inverter {F_}.</p></div>{k5_svgs}</div></div>''')
ks.append(key(6, "B = 0,5 T",
  "Isole B: de F = i·L·B (θ = 90°) vem B = F ÷ (i·L).",
  "<p>B = 1,5 ÷ (6 × 0,50) = 1,5 ÷ 3 = <b>0,5 T</b>.</p>",
  "dividir só por i e esquecer o L (ou o contrário). O denominador tem <b>dois</b> fatores."))
ks.append(key(7, "i = 2,0 A",
  "25 cm = 0,25 m. Depois isole a corrente: i = F ÷ (L·B).",
  "<p>i = 1,0 ÷ (0,25 × 2,0) = 1,0 ÷ 0,50 = <b>2,0 A</b>.</p>",
  "usar 25 em vez de 0,25 (daria 0,02 A, um valor absurdo)."))
ks.append(key(8, "L = 40 cm",
  "Isole L: L = F ÷ (i·B). A fórmula dá <b>metros</b>; converta no final.",
  "<p>L = 0,80 ÷ (10 × 0,20) = 0,80 ÷ 2,0 = 0,40 m = <b>40 cm</b>.</p>",
  "responder “0,4” sem converter: a pergunta pedia centímetros."))
ks.append(key(9, "a) → · b) para baixo · c) para cima",
  "Primeiro ache {0}: ele <b>sai do N e entra no S</b>. Depois use a mão direita.".format(B_),
  f"<p><b>a)</b> N está à esquerda e S à direita ⇒ {B_} aponta <b>para a direita</b>.<br><b>b)</b> Dedos <b>para dentro</b> da folha ({I_} entrando), feche em direção à direita ({B_}): o polegar aponta <b>para baixo</b> ⇒ o fio é empurrado para baixo.<br><b>c)</b> Trocando os polos, {B_} inverte ⇒ {F_} inverte ⇒ fio empurrado <b>para cima</b>.</p>",
  f"esquecer que {B_} vai do N para o S, e não do S para o N."))
ks.append(key(10, "a) 2,0 N (sentido oposto) · b) 2,0 N · c) 12 N · d) 6,0 N",
  f"{F_} é proporcional a {I_}, L e {B_}: multiplique os fatores de cada item.",
  "<p><b>a)</b> O módulo não muda: <b>2,0 N</b>, mas com <b>sentido oposto</b>.<br><b>b)</b> ×2 e ×1/2 ⇒ ×1 ⇒ <b>2,0 N</b>.<br><b>c)</b> ×3 e ×2 ⇒ ×6 ⇒ <b>12 N</b>.<br><b>d)</b> ×1/2, ×2 e ×3 ⇒ ×3 ⇒ <b>6,0 N</b>.</p>",
  "<b>somar</b> as mudanças em vez de multiplicar (por exemplo, achar que “×3 e ×2” dá ×5)."))
ks.append(key(11, f"a) ↑ · b) esquerda · c) 4,0 A",
  "Parado no ar = forças se cancelam: {0} tem de ser igual e oposta ao peso.".format(F_),
  f"<p><b>a)</b> O peso puxa para baixo ⇒ {F_} para <b>cima</b>.<br><b>b)</b> {F_} para cima com {B_} saindo {OUT}: dedos para a <b>esquerda</b>, feche em direção a você ⇒ polegar para cima ✔. A corrente vai <b>para a esquerda</b>.<br><b>c)</b> m = 0,080 kg ⇒ P = 0,080 × 10 = 0,80 N. F = P ⇒ i·L·B = 0,80 ⇒ i = 0,80 ÷ (0,40 × 0,50) = 0,80 ÷ 0,20 = <b>4,0 A</b>.</p>",
  "converter errado 80 g (use 0,080 kg) ou achar que a corrente vai para a direita só porque “na aula foi assim”. Aqui o campo <b>saindo</b> inverte o sentido da corrente.",
  equilibrium_fig("out", True, "left", W=300, H=170)))
ks.append(key(12, "a) ↑ · b) 0,36 N (0,18 N cada) · c) 0,84 N (0,42 N cada)",
  f"Desenhe {P_} para baixo, {F_} e as tensões. Os fios seguram o que a força magnética não segura.",
  f"<p><b>a)</b> {I_} → e {B_} entrando {IN}: dedos à direita, feche para dentro da folha ⇒ polegar <b>para cima</b>.<br>"
  f"<b>b)</b> F = i·L·B = 2,0 × 0,30 × 0,40 = 0,24 N. P = 0,060 × 10 = 0,60 N. Equilíbrio: T + F = P ⇒ T = 0,60 − 0,24 = <b>0,36 N</b> no total, ou <b>0,18 N</b> em cada fio.<br>"
  f"<b>c)</b> Invertendo a corrente, {F_} passa a apontar <b>para baixo</b>: T = P + F = 0,60 + 0,24 = <b>0,84 N</b> no total (<b>0,42 N</b> em cada).</p>",
  "esquecer de dividir por <b>dois</b> fios, ou subtrair quando a força magnética aponta para baixo."))
ks.append(key(13, "F = 0,48 N",
  "O campo age em todo o fio: some o comprimento de todas as voltas.",
  "<p>Comprimento total: L = 20 × 6,0 cm = 120 cm = <b>1,20 m</b>.<br>F = i·L·B = 0,50 × 1,20 × 0,80 = <b>0,48 N</b>.</p><p>Regra geral: com N voltas, F = N · i · L · B.</p>",
  "usar só os 6,0 cm de uma volta (daria 0,024 N, vinte vezes menor)."))
ks.append(key(14, "a) 2,0 N em θ = 90° · b) θ = 30°",
  "F = F<sub>máx</sub> · sen θ. A máxima ocorre quando sen θ = 1.",
  "<p><b>a)</b> F<sub>máx</sub> = i·L·B = 5,0 × 0,80 × 0,50 = <b>2,0 N</b>, com o fio <b>perpendicular</b> ao campo (θ = 90°).<br><b>b)</b> 1,0 = 2,0 × sen θ ⇒ sen θ = 0,5 ⇒ <b>θ = 30°</b> (o ângulo suplementar, 150°, também dá o mesmo seno).</p>",
  "tentar achar θ dividindo 1,0 por 2,0 e responder “0,5°”: 0,5 é o <b>seno</b>, não o ângulo."))
ks.append(key(15, "a) → · b) 0,40 N · c) 8,0 m/s² · d) 4,0 m/s",
  "Primeiro o magnetismo (direção e valor de F); depois Dinâmica (F = m·a) e cinemática (v = a·t).",
  f"<p><b>a)</b> {I_} sobe pela barra e {B_} sai da folha {OUT}: gire {I_} (↑) até {B_} (para você) ⇒ polegar <b>para a direita</b>, afastando a barra da bateria.<br><b>b)</b> F = i·L·B = 4,0 × 0,20 × 0,50 = <b>0,40 N</b>.<br><b>c)</b> m = 0,050 kg ⇒ a = F ÷ m = 0,40 ÷ 0,050 = <b>8,0 m/s²</b>.<br><b>d)</b> v = a·t = 8,0 × 0,5 = <b>4,0 m/s</b>.</p>",
  "usar 50 em vez de 0,050 kg; ou esquecer que, sem atrito, a força magnética é a <b>única</b> força horizontal.",
  rails_fig(True, W=420, H=215)))
ks.append(key(16, "a) 1,0 A · b) 2,0 m/s²",
  "Velocidade constante ⇒ resultante nula ⇒ a força magnética <b>equilibra o atrito</b>.",
  "<p><b>a)</b> Atrito: f = μ·N = μ·m·g = 0,20 × 0,10 × 10 = 0,20 N. F = f ⇒ i·L·B = 0,20 ⇒ i = 0,20 ÷ (0,50 × 0,40) = 0,20 ÷ 0,20 = <b>1,0 A</b>.<br><b>b)</b> F = 2,0 × 0,50 × 0,40 = 0,40 N. Resultante: F − f = 0,40 − 0,20 = 0,20 N. a = 0,20 ÷ 0,10 = <b>2,0 m/s²</b>.</p>",
  "usar F = m·a com a força magnética inteira, esquecendo de descontar o atrito.",
  rails_fig(True, W=420, H=215, friction=True)))
ks.append(key(17, "a) horizontal, para a direita · b) 1,5 N · c) 5,0 A",
  f"{F_} é perpendicular a {I_} (que entra na folha) <b>e</b> a {B_} (vertical): só pode ser <b>horizontal</b>. Em equilíbrio, as forças <b>ao longo da rampa</b> se cancelam.",
  f"<p><b>a)</b> Dedos para dentro da folha, feche em direção a “para cima” ({B_}): polegar <b>para a direita</b> — empurra a barra contra a rampa.<br><b>b)</b> P = 0,20 × 10 = 2,0 N. Ao longo da rampa: F·cos 37° = P·sen 37° ⇒ F = P · (0,6 ÷ 0,8) = 2,0 × 0,75 = <b>1,5 N</b>.<br><b>c)</b> i = F ÷ (B·L) = 1,5 ÷ (0,60 × 0,50) = 1,5 ÷ 0,30 = <b>5,0 A</b>.</p>",
  "achar que a força magnética é paralela à rampa. Ela é horizontal; só a sua <b>componente</b> F·cos 37° age ao longo da rampa.",
  incline_fig(show_F=True, W=330, H=240)))
ks.append(key(18, "a) 1,0 cm · b) 2,0 A, para a direita",
  "Sem corrente: peso = força das duas molas. Com corrente: peso = molas + F.",
  f"<p><b>a)</b> P = 0,040 × 10 = 0,40 N. 2·k·x = P ⇒ x = 0,40 ÷ (2 × 20) = 0,010 m = <b>1,0 cm</b>.<br><b>b)</b> x = 0,5 cm = 0,0050 m ⇒ força elástica total = 2 × 20 × 0,0050 = 0,20 N. Equilíbrio: F + 0,20 = 0,40 ⇒ F = 0,20 N ⇒ i = F ÷ (B·L) = 0,20 ÷ (0,20 × 0,50) = <b>2,0 A</b>.<br>Sentido: {F_} para cima e {B_} entrando ⇒ corrente <b>para a direita</b>.</p>",
  "esquecer que há <b>duas</b> molas (a força elástica total é 2·k·x)."))
ks.append(key(19, "a) 0,80 N · b) vertical, para cima",
  "Em campo uniforme, o fio curvo equivale a um fio <b>reto</b> ligando as pontas, com a mesma corrente.",
  f"<p><b>a)</b> O fio reto equivalente vai de uma ponta à outra do diâmetro: L = 2R = 0,20 m. F = i·L·B = 5,0 × 0,20 × 0,80 = <b>0,80 N</b>.<br><b>b)</b> Com esse fio reto: {I_} → e {B_} entrando {IN} ⇒ polegar <b>para cima</b>.<br><i>Por que funciona?</i> Cada pedacinho do arco é empurrado “para fora”; as componentes horizontais se cancelam aos pares e só sobra a vertical, para cima.</p>",
  "usar o comprimento do arco (πR ≈ 0,31 m) no lugar da distância entre as pontas (2R)."))
ks.append(key(20, "a) 0 · b) 0,15 N (⊗ à direita, ⊙ à esquerda) · c) 0 · d) gira · e) 0,030 N·m",
  "Trate cada lado como um fio reto e aplique a regra a <b>um lado por vez</b>.",
  f"<p><b>a)</b> Lados horizontais: paralelos a {B_} ⇒ θ = 0° ⇒ <b>F = 0</b>.<br><b>b)</b> Lados verticais (perpendiculares a {B_}, L = 0,10 m): F = 3,0 × 0,10 × 0,50 = <b>0,15 N</b>. Lado direito ({I_} ↑, {B_} →): giro horário ⇒ {IN} <b>entra</b>. Lado esquerdo ({I_} ↓): {OUT} <b>sai</b>.<br><b>c)</b> As duas forças são iguais e opostas ⇒ resultante <b>nula</b>: a espira não se desloca.<br><b>d)</b> Mas elas formam um <b>par</b> em lados opostos: a espira <b>gira</b> em torno de um eixo vertical passando pelo centro — é o princípio do motor elétrico.<br><b>e)</b> d = 20 cm = 0,20 m ⇒ τ = 0,15 × 0,20 = <b>0,030 N·m</b> (confere: τ = i·A·B = 3,0 × 0,020 × 0,50).</p>",
  "concluir que “resultante zero ⇒ nada acontece”. Forças opostas em pontos diferentes giram o corpo.",
  loop_fig(True, W=400, H=240)))

gabarito = f'''
<div class="part-title gab"><span>GABARITO</span><h2 class="nohead">Gabarito comentado</h2>
<p><b>Só confira depois de tentar!</b> Cada resolução mostra a estratégia, o passo a passo (com unidades) e o <b>erro mais comum</b>. Se errou, refaça o exercício antes de seguir.</p></div>
<h3>Respostas rápidas</h3>
{rapid_html}
<h3 style="margin-top:6mm">Resoluções</h3>
{"".join(ks)}
'''

CSS = (HERE / "style.css").read_text()
PB = '<div class="pb"></div>'
chrome = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"
FOOT = "Força magnética sobre um fio com corrente  ·  página "


def render(parts, stem, foot):
    body = "".join(f'<div class="sec">{p.replace(PB, "")}</div>' for p in parts)
    css = CSS.replace(FOOT, foot)
    html = f'''<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>Força magnética sobre um fio com corrente — {stem}</title>
<style>{css}</style></head><body>
{body}
</body></html>'''
    out_html = HERE / f"{stem}.html"
    out_html.write_text(html)
    pdf = HERE / f"{stem}.pdf"
    subprocess.run([chrome, "--headless", "--no-sandbox", "--disable-gpu", "--no-pdf-header-footer",
                    f"--print-to-pdf={pdf}", f"file://{out_html}"], check=True, capture_output=True)
    print("ok", pdf)


list_head = f'''
<section class="cover mini">
 <div class="kicker">FÍSICA · ENSINO MÉDIO · ELETROMAGNETISMO</div>
 <h1>Força magnética sobre um fio — 20 exercícios</h1>
 <div class="idline"><span>Aluna: ________________________________</span><span>Data: ____ / ____ / ________</span></div>
</section>
<div class="box key quick"><b>Lembrete rápido</b>
 <div class="qgrid">
  <div><b>Quanto?</b> F = {I_} · L · {B_} · sen θ &nbsp;(θ = ângulo entre o fio e as linhas de {B_}; perpendicular ⇒ sen θ = 1; paralelo ⇒ F = 0)</div>
  <div><b>Unidades (SI):</b> {F_} em N · {I_} em A · L em m · {B_} em T · cm ÷ 100 · g ÷ 1000 · g = 10 m/s²</div>
  <div><b>Para onde?</b> Mão direita: dedos em {I_}, feche em direção a {B_}, polegar = {F_}. Na folha: giro de {I_} até {B_}, anti-horário ⇒ {F_} sai {OUT}, horário ⇒ {F_} entra {IN}.</div>
 </div>
</div>
'''
render([cover, passo1, passo2, passo3, passo4, passo5, exercises, gabarito], "forca-magnetica-fio", FOOT)
render([list_head + exercises.replace(exercises[exercises.index('<div class="part-title">'):exercises.index('</div></div>', exercises.index('lvlbar')) + len('</div></div>')], '')], "forca-magnetica-fio-lista-20-exercicios", "Força magnética sobre um fio · 20 exercícios  ·  página ")
render([gabarito], "forca-magnetica-fio-gabarito-comentado", "Força magnética sobre um fio · Gabarito comentado  ·  página ")
