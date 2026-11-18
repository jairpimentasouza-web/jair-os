"""O Cérebro precisa funcionar antes da primeira sincronização do léxico local."""
from cerebro.lexico import Lexico
from cerebro.nlu.motor import Motor
from cerebro.texto.normalizar import Normalizador


def test_sem_lexico_local():
    lx = Lexico.carregar()  # sem alunos, escolas, turmas
    n = Normalizador(lx)
    m = Motor(lx, n)
    for frase in ["acabou a aula do rafael ele foi bem", "mostra os avisos da turma 2101", "abre o sistema da escola",
                  "esquisa no youtube aula de cinematica", "abre o chrome"]:
        m.entender(n.normalizar(frase), usar_llm=False)  # não pode quebrar
    h = m.entender(n.normalizar("abre o chrome"), usar_llm=False)
    assert h[0].intencao == "app.abrir"
    assert lx.gaz("aluno").resolver("rafael") is None
