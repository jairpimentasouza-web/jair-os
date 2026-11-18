"""Cérebro JOS — o Jarvis do Jair OS: comando de voz em português que entende, decide e executa."""
__version__ = "1.0.0"


def __getattr__(nome):  # importação preguiçosa: "from cerebro import Cerebro"
    if nome == "Cerebro":
        from .nucleo import Cerebro
        return Cerebro
    if nome == "Config":
        from .config import Config
        return Config
    raise AttributeError(nome)
