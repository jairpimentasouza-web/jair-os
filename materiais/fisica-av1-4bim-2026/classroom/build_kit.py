# Gera o kit de implantação do Google Sala de Aula (HTML) e os banners das turmas (PNG 1000x250).
# Uso: python3 build_kit.py && node banners.js
import html, json, os
from kit_data import SERIES

HERE = os.path.dirname(os.path.abspath(__file__))
E = html.escape

def yt(vid): return f"https://www.youtube.com/watch?v={vid}"

def posts(k, s):
    """Lista ordenada de postagens: (tipo, tópico, título, texto, anexos, configurações)."""
    T = s["turma"]; tema = s["tema"]
    P = []
    P.append(("Aviso (mural)", "—", "Abertura da revisão",
f"""📣 REVISÃO PARA A AV1 DE FÍSICA ESTÁ NO AR!

Turma, preparei um percurso completo para vocês chegarem à AV1 do 4º bimestre seguros e confiantes.
Tema: {tema}.

Na aba Atividades vocês vão encontrar, nesta ordem:
📌 Comece aqui — o roteiro de estudos
🗺️ Mapa mental + resumo teórico com as pegadinhas mais comuns
🎬 Videoaulas selecionadas por assunto (curtas e diretas)
✍️ Lista graduada em 4 níveis (do aquecimento ao desafio)
🧠 Quiz de autoavaliação com correção automática
✅ Gabarito comentado passo a passo (liberado após o prazo da lista)

Dica de ouro: estudar um pouco por dia rende muito mais do que estudar tudo na véspera.
Qualquer dúvida, use o tópico "Plantão de dúvidas". Bons estudos! 💪
Prof. Jair Pimenta""", [], "Publicar no início da revisão (D-10)."))
    P.append(("Material", "📌 COMECE AQUI", f"Roteiro de estudos — AV1 {T}",
f"""Este é o seu mapa até a AV1. Siga as etapas na ordem e marque o que já concluiu.

O QUE CAI: {s['assuntos']}.

ROTEIRO SUGERIDO
1️⃣ D-10 a D-8 → Leia o mapa mental e o resumo teórico (páginas 1 a 3 do PDF). Anote dúvidas.
2️⃣ D-8 a D-6 → Assista às videoaulas do tópico 🎬, respondendo à "missão" de cada vídeo.
3️⃣ D-7 a D-5 → Resolva a Lista Níveis 1 e 2 e entregue a foto da resolução.
4️⃣ D-5 a D-2 → Resolva a Lista Níveis 3 e 4 (padrão prova e desafio).
5️⃣ D-2 → Corrija tudo com o Gabarito Comentado. Errou? Refaça sem olhar.
6️⃣ D-1 → Faça o Quiz de autoavaliação e revise o checklist "Eu sei..." do PDF.

COMO ESTUDAR MELHOR
• Tente cada questão sozinho antes de olhar a resolução.
• Escreva as unidades em todas as contas (cm → m, min → s, km/h → m/s).
• Faça o desenho/diagrama da situação antes de calcular.
• Errou? Classifique o erro: conceito, conta ou interpretação.""",
      [f"PDF: {s['pdf_lista']}"], "Fixar no topo do tópico."))
    P.append(("Material", "🗺️ 1. Mapa mental e resumo teórico", f"Mapa mental, teoria e pegadinhas — {tema}",
f"""Material-base da revisão (lista sem gabarito).

Páginas 1–3: mapa mental, teoria essencial, dicas 💡 e pegadinhas ⚠ que mais tiram pontos.
Página do checklist "Eu sei...": use para conferir se está pronto para a prova.
Páginas seguintes: lista com 20 exercícios graduados.

Sugestão: imprima o mapa mental e deixe à vista na sua mesa de estudos.""",
      [f"PDF: {s['pdf_lista']}"], "Anexar o PDF."))
    for i, (assunto, objetivo, vids, missao) in enumerate(s["videos"], 1):
        lst = "\n".join(f"▶ {t} — {c} ({d})\n   {yt(v)}" for v, t, c, d in vids)
        P.append(("Material", "🎬 2. Videoaulas por assunto", f"🎬 {i}. {assunto}",
f"""OBJETIVO: {objetivo}

VÍDEOS RECOMENDADOS
{lst}

🎯 MISSÃO DO VÍDEO: {missao}
Responda no caderno — essa ideia costuma aparecer na prova.""",
          [f"YouTube: {yt(v)}" for v, *_ in vids], "Anexar cada vídeo pelo botão YouTube (o Classroom mostra a miniatura)."))
    P.append(("Atividade", "✍️ 3. Lista graduada — Níveis 1 e 2", "Lista de revisão — Níveis 1 e 2 (questões 1 a 10)",
"""Resolva as questões 1 a 10 do PDF de revisão.

🟢 Nível 1 (1–5): aquecimento — aplicação direta.
🔵 Nível 2 (6–10): fixação — duas etapas, gráficos e conversões.

COMO ENTREGAR
1. Resolva no caderno, mostrando os cálculos e as unidades.
2. Tire fotos nítidas (ou digitalize) e anexe aqui.
3. Clique em "Marcar como concluída".

Critério: entrega completa e organizada. O objetivo é treinar — não tenha medo de errar!""",
      [f"PDF: {s['pdf_lista']}"], "Pontos: sem nota (ou 0,5 de participação, a critério). Data de entrega: D-5, 23h59."))
    P.append(("Atividade", "🎯 4. Lista graduada — Níveis 3 e 4", "Lista de revisão — Níveis 3 e 4 (questões 11 a 20)",
"""Resolva as questões 11 a 20 do PDF de revisão.

🟠 Nível 3 (11–15): PADRÃO DA PROVA — mesmo estilo e dificuldade da AV1.
🔴 Nível 4 (16–20): DESAFIO — acima do nível da prova. Quem domina estas, chega à prova com folga.

COMO ENTREGAR
Fotos nítidas da resolução completa (com desenho, fórmula, substituição e unidade).
Travou numa questão? Escreva até onde chegou e onde travou — isso também conta!""",
      [f"PDF: {s['pdf_lista']}"], "Pontos: sem nota (ou 0,5 de participação). Data de entrega: D-2, 23h59."))
    P.append(("Teste (Formulário)", "🧠 6. Quiz de autoavaliação", f"Quiz relâmpago — AV1 {T} (10 questões)",
"""Quiz com 10 questões rápidas e correção automática.

• Faça sem consultar, em até 15 minutos.
• Ao enviar, veja quais errou e leia o feedback de cada questão.
• Meta: 8 acertos ou mais. Abaixo disso, volte ao mapa mental e aos vídeos do assunto em que errou.
• Pode refazer quantas vezes quiser.""",
      ["Google Forms (Teste) — criar com as questões da aba “Quiz” deste kit"], "Atividade com teste · sem nota · data: D-1. Ativar ordem aleatória das opções e mostrar respostas após o envio."))
    P.append(("Material (agendado)", "✅ 5. Gabarito comentado", f"Gabarito comentado — Lista de revisão {T}",
"""Resolução passo a passo das 20 questões, com os erros mais comuns em cada uma.

COMO CORRIGIR
1. Compare só a resposta final primeiro. Marque ✔ ou ✘.
2. Nas erradas, leia a resolução e identifique ONDE errou (conceito, conta ou interpretação).
3. Feche o gabarito e refaça a questão sozinho.
4. Ainda com dúvida? Poste no Plantão de dúvidas com o número da questão.""",
      [f"PDF: {s['pdf_completo']}"], "Agendar para D-2 às 23h59 (logo após o prazo da lista de níveis 3 e 4)."))
    P.append(("Pergunta", "❓ Plantão de dúvidas", "Plantão de dúvidas: em qual questão você travou?",
"""Escreva o número da questão (ou o assunto) em que você mais travou e o que exatamente não entendeu.
Responda e comente nas dúvidas dos colegas — explicar para alguém é uma das melhores formas de aprender!""",
      [], "Pergunta de resposta curta · permitir que os alunos vejam e respondam uns aos outros · sem nota."))
    P.append(("Aviso (mural)", "—", "Lembrete D-3",
f"""⏰ Faltam 3 dias para a AV1 de Física!

Checklist rápido:
☐ Já resolvi a Lista Níveis 1 e 2?
☐ Já comecei a Lista Níveis 3 e 4? (prazo: D-2)
☐ Assisti aos vídeos dos assuntos em que tenho mais dificuldade?

Lembrem: o nível 3 da lista tem o mesmo estilo da prova. Prof. Jair""", [], "Agendar para D-3, 7h."))
    P.append(("Aviso (mural)", "—", "Véspera da prova",
f"""🎯 AMANHÃ É DIA DE AV1!

Para hoje:
✔ Faça o Quiz relâmpago (meta: 8/10).
✔ Revise o mapa mental e as caixas ⚠ Pegadinha do PDF.
✔ Confira o gabarito comentado das questões que errou.

Para amanhã: caneta azul ou preta, nada de corretivo, celular guardado e calma.
Leia cada enunciado duas vezes e escreva as unidades. Vocês estão preparados. Boa prova! 🍀
Prof. Jair Pimenta""", [], "Agendar para D-1, 17h."))
    return P

def topics(s):
    return ["📌 COMECE AQUI", "🗺️ 1. Mapa mental e resumo teórico", "🎬 2. Videoaulas por assunto",
            "✍️ 3. Lista graduada — Níveis 1 e 2", "🎯 4. Lista graduada — Níveis 3 e 4",
            "✅ 5. Gabarito comentado", "🧠 6. Quiz de autoavaliação", "❓ Plantão de dúvidas"]

def copybox(text):
    return f'<div class="cb"><button class="copy" type="button">Copiar</button><pre>{E(text)}</pre></div>'

def section(k, s):
    out = [f'<section class="serie" id="s{k}" style="--c:{s["cor"]}">']
    out.append(f'<div class="hero"><img src="banner-{k}a-serie.png" alt="Banner da turma {E(s["turma"])}"><div><h2>{E(s["turma"])} · {E(s["tema"])}</h2><p>{len(s["videos"])} blocos de vídeo · {sum(len(v[2]) for v in s["videos"])} vídeos verificados · quiz de 10 questões · {len(posts(k,s))} postagens prontas</p></div></div>')
    desc = f"Física · {s['turma']} · Prof. Jair Pimenta · Legacy School — Barra da Tijuca. Revisão para a AV1 do 4º bimestre: {s['tema']}. Comece pelo tópico 📌 COMECE AQUI."
    out.append('<h3>1. Configuração da turma</h3><ol class="steps">')
    out.append(f'<li><b>Personalizar → Selecionar tema → Fazer upload de foto</b>: envie <code>banner-{k}a-serie.png</code> (1000 × 250 px).</li>')
    out.append('<li><b>Configurações → Descrição da turma</b>:</li></ol>' + copybox(desc))
    out.append('<h3>2. Tópicos (crie nesta ordem e arraste para ficarem assim)</h3><ol class="topics">' + "".join(f"<li>{E(t)}</li>" for t in topics(s)) + '</ol>')
    out.append('<h3>3. Postagens — na ordem de publicação</h3>')
    for i, (tipo, top, tit, txt, anexos, cfg) in enumerate(posts(k, s), 1):
        out.append(f'<details class="post"{" open" if i <= 2 else ""}><summary><span class="n">{i:02d}</span><span class="tipo">{E(tipo)}</span><span class="tt">{E(tit)}</span><span class="top">{E(top)}</span></summary>')
        out.append('<div class="pb"><div class="lbl">Título</div>' + copybox(tit) + '<div class="lbl">Texto / instruções</div>' + copybox(txt))
        if anexos:
            out.append('<div class="lbl">Anexos</div><ul class="anx">' + "".join(
                f'<li><a href="{E(a.split(": ",1)[1])}" target="_blank" rel="noopener">{E(a)}</a></li>' if a.startswith("YouTube") else f"<li>{E(a)}</li>" for a in anexos) + "</ul>")
        out.append(f'<div class="cfg"><b>Configurar:</b> {E(cfg)}</div></div></details>')
    out.append('<h3>4. Quiz de autoavaliação (Google Forms → Teste)</h3>')
    out.append('<p class="note">Em Configurações do Forms: <b>Transformar em teste</b>; liberar nota <b>imediatamente após o envio</b>; mostrar respostas corretas e valores; em cada questão, ativar <b>Ordem aleatória das opções</b> (aqui a correta aparece sempre primeiro, marcada com ✔) e colar o feedback em “Feedback para respostas”.</p><ol class="quiz">')
    for q, ops, ok, fb in s["quiz"]:
        out.append(f'<li><div class="q">{E(q)}</div><ul>' + "".join(f'<li class="{"ok" if j == ok else ""}">{"✔ " if j == ok else ""}{E(o)}</li>' for j, o in enumerate(ops)) + f'</ul><div class="fb">Feedback: {E(fb)}</div></li>')
    out.append('</ol>')
    out.append('<h3>5. Videoteca da turma</h3><table class="vt"><tr><th>Assunto</th><th>Vídeo</th><th>Canal</th><th>Duração</th></tr>')
    for assunto, _, vids, _ in s["videos"]:
        for v, t, c, d in vids:
            out.append(f'<tr><td>{E(assunto)}</td><td><a href="{yt(v)}" target="_blank" rel="noopener">{E(t)}</a></td><td>{E(c)}</td><td>{d}</td></tr>')
    out.append('</table></section>')
    return "\n".join(out)

tabs = "".join(f'<button class="tab" data-t="s{k}" style="--c:{s["cor"]}" type="button">{E(s["turma"])}</button>' for k, s in SERIES.items())
body = "\n".join(section(k, s) for k, s in SERIES.items())
page = open(os.path.join(HERE, "kit_template.html"), encoding="utf-8").read().replace("{{TABS}}", tabs).replace("{{BODY}}", body)
open(os.path.join(HERE, "kit-classroom.html"), "w", encoding="utf-8").write(page)
print("kit-classroom.html ok,", sum(len(posts(k, s)) for k, s in SERIES.items()), "postagens")
