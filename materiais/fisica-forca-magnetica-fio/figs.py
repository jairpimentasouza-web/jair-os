"""Figuras vetoriais (SVG) do material 'Força magnética sobre um condutor retilíneo'.

Todas as figuras com significado físico são geradas de forma determinística:
a direção da força vem do produto vetorial F = i (L x B) calculado em código,
nunca desenhada "a olho". Convenção: x = direita, y = cima, z = saindo da folha.
"""
import math
from html import escape

C_I, C_B, C_F, C_P = "#e8590c", "#1c7ed6", "#2f9e44", "#7048e8"
C_INK, C_WIRE, C_N, C_S = "#212529", "#343a40", "#c92a2a", "#495057"
FONT = "Inter, 'DejaVu Sans', sans-serif"

DIRS = {"right": (1, 0, 0), "left": (-1, 0, 0), "up": (0, 1, 0),
        "down": (0, -1, 0), "out": (0, 0, 1), "in": (0, 0, -1)}
NAMES = {"right": "para a direita", "left": "para a esquerda", "up": "para cima",
         "down": "para baixo", "out": "saindo da folha", "in": "entrando na folha"}


def cross(a, b):
    return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])


def dir_of(v):
    for k, d in DIRS.items():
        if tuple(v) == d:
            return k
    return None  # vetor nulo


def force_dir(i_dir, b_dir):
    """Sentido de F = i (L x B) para i e B em {right,left,up,down,out,in}."""
    return dir_of(cross(DIRS[i_dir], DIRS[b_dir]))


# ----------------------------------------------------------------- primitivas
def f(x):
    return f"{x:.1f}"


def text(x, y, s, size=14, color=C_INK, weight=600, anchor="start", italic=False, raw=False, extra=""):
    s = s if raw else escape(s)
    st = ' font-style="italic"' if italic else ""
    return (f'<text x="{f(x)}" y="{f(y)}" font-family="{FONT}" font-size="{size}" '
            f'font-weight="{weight}" fill="{color}" text-anchor="{anchor}"{st} {extra}>{s}</text>')


def sub(s):
    return f'<tspan baseline-shift="sub" font-size="70%">{s}</tspan>'


def line(x1, y1, x2, y2, color=C_INK, w=2, dash=None, cap="round"):
    d = f' stroke-dasharray="{dash}"' if dash else ""
    return (f'<line x1="{f(x1)}" y1="{f(y1)}" x2="{f(x2)}" y2="{f(y2)}" stroke="{color}" '
            f'stroke-width="{w}" stroke-linecap="{cap}"{d}/>')


def arrow(x1, y1, x2, y2, color, w=3, head=None, dash=None):
    L = math.hypot(x2 - x1, y2 - y1)
    if L == 0:
        return ""
    head = head or max(9, w * 3.4)
    ux, uy = (x2 - x1) / L, (y2 - y1) / L
    bx, by = x2 - ux * head * 0.85, y2 - uy * head * 0.85
    px, py = -uy, ux
    hw = head * 0.5
    pts = f"{f(x2)},{f(y2)} {f(bx + px * hw)},{f(by + py * hw)} {f(bx - px * hw)},{f(by - py * hw)}"
    return line(x1, y1, bx, by, color, w, dash) + f'<polygon points="{pts}" fill="{color}"/>'


def rect(x, y, w, h, fill="#fff", stroke="none", sw=1, rx=0, extra=""):
    return (f'<rect x="{f(x)}" y="{f(y)}" width="{f(w)}" height="{f(h)}" rx="{rx}" fill="{fill}" '
            f'stroke="{stroke}" stroke-width="{sw}" {extra}/>')


def circle(x, y, r, fill="none", stroke="none", sw=1, extra=""):
    return (f'<circle cx="{f(x)}" cy="{f(y)}" r="{f(r)}" fill="{fill}" stroke="{stroke}" '
            f'stroke-width="{sw}" {extra}/>')


def sym(x, y, kind, color, r=9, sw=2.2, bg="#fff"):
    """kind='out' -> ponto (saindo da folha); kind='in' -> xis (entrando na folha)."""
    o = circle(x, y, r, fill=bg, stroke=color, sw=sw)
    if kind == "out":
        o += circle(x, y, r * 0.36, fill=color)
    else:
        d = r * 0.58
        o += line(x - d, y - d, x + d, y + d, color, sw) + line(x - d, y + d, x + d, y - d, color, sw)
    return o


def svg(w, h, body, cls="fig", label=""):
    return (f'<svg class="{cls}" viewBox="0 0 {w} {h}" xmlns="http://www.w3.org/2000/svg" '
            f'role="img" aria-label="{escape(label)}">{body}</svg>')


def icon(kind, color=C_F, size=1.05):
    """Ícone inline (⊙ / ⊗) para usar dentro de texto HTML."""
    return (f'<svg class="ico" viewBox="0 0 20 20" style="height:{size}em;width:{size}em">'
            f'{sym(10, 10, kind, color, r=8, sw=2)}</svg>')


# ----------------------------------------------------------------- campo
def field_symbols(x0, x1, y0, y1, nx, ny, kind, skip=None, color=C_B, r=7):
    o = []
    for i in range(nx):
        x = x0 + (x1 - x0) * i / (nx - 1) if nx > 1 else (x0 + x1) / 2
        for j in range(ny):
            y = y0 + (y1 - y0) * j / (ny - 1) if ny > 1 else (y0 + y1) / 2
            if skip and skip(x, y):
                continue
            o.append(sym(x, y, kind, color, r=r, sw=1.8, bg="none"))
    return "".join(o)


def field_lines(x0, x1, y0, y1, dname, n, skip=None, color=C_B, w=2, head=9):
    """Linhas de campo paralelas no plano, sentido dname."""
    o = []
    for k in range(n):
        t = k / (n - 1) if n > 1 else 0.5
        if dname in ("right", "left"):
            y = y0 + (y1 - y0) * t
            if skip and skip(None, y):
                continue
            a, b = (x0, x1) if dname == "right" else (x1, x0)
            o.append(arrow(a, y, b, y, color, w, head))
        else:
            x = x0 + (x1 - x0) * t
            if skip and skip(x, None):
                continue
            a, b = (y1, y0) if dname == "up" else (y0, y1)
            o.append(arrow(x, a, x, b, color, w, head))
    return "".join(o)


def wire_line(x1, y1, x2, y2, w=11):
    return line(x1, y1, x2, y2, C_WIRE, w) + line(x1, y1, x2, y2, "#adb5bd", w * 0.4)


# ----------------------------------------------------------------- painel fio+campo
def panel(i_dir, B, show_F=False, W=250, H=170, letter=None):
    """Fio reto (horizontal ou vertical) num campo uniforme; F calculado por produto vetorial."""
    cx, cy = W / 2, H / 2
    horiz = i_dir in ("right", "left")
    F = force_dir(i_dir, B)
    o = [rect(1, 1, W - 2, H - 2, "#f8fafc", "#ced4da", 2, rx=12)]
    if B in ("out", "in"):
        sk = (lambda x, y: abs(y - cy) < 12) if horiz else (lambda x, y: abs(x - cx) < 12)
        o.append(field_symbols(cx - 84, cx + 84, cy - 64, cy + 64, 5, 5, B, skip=sk))
        o.append(text(W - 14, 22, "B", 17, C_B, 700, "end", True))
    else:
        if B in ("right", "left"):
            sk = (lambda x, y: abs(y - cy) < 12) if horiz else None
            o.append(field_lines(16, W - 16, cy - 64, cy + 64, B, 5, sk))
        else:
            sk = (lambda x, y: abs(x - cx) < 12) if not horiz else None
            o.append(field_lines(cx - 84, cx + 84, 16, H - 16, B, 5, sk))
        o.append(text(W - 14, 22, "B", 17, C_B, 700, "end", True))
    # fio
    if horiz:
        o.append(wire_line(32, cy, W - 32, cy))
        a, b = (cx - 55, cx + 55) if i_dir == "right" else (cx + 55, cx - 55)
        o.append(arrow(a, cy, b, cy, C_I, 3.2, 13))
        o.append(text(b + (6 if i_dir == "right" else -6), cy - 12, "i", 18, C_I, 700,
                      "start" if i_dir == "right" else "end", True))
    else:
        o.append(wire_line(cx, 16, cx, H - 16))
        a, b = (cy + 52, cy - 52) if i_dir == "up" else (cy - 52, cy + 52)
        o.append(arrow(cx, a, cx, b, C_I, 3.2, 13))
        o.append(text(cx + 14, b + (8 if i_dir == "up" else -2), "i", 18, C_I, 700, "start", True))
    # força
    if show_F:
        if F in ("out", "in"):
            o.append(sym(cx, cy, F, C_F, r=14, sw=3))
            o.append(text(cx + 22, cy + 22, "F", 18, C_F, 700, "start", True))
        elif F is None:
            o.append(rect(cx - 44, cy - 30, 88, 22, "#fff", C_F, 2, rx=6))
            o.append(text(cx, cy - 14.5, "F = 0", 14, C_F, 700, "middle"))
        else:
            dx, dy = {"right": (1, 0), "left": (-1, 0), "up": (0, -1), "down": (0, 1)}[F]
            L = 46
            o.append(arrow(cx + dx * 6, cy + dy * 6, cx + dx * L, cy + dy * L, C_F, 4.2, 15))
            if dx == 0:
                o.append(text(cx + 14, cy + dy * (L - 8) + 6, "F", 18, C_F, 700, "start", True))
            else:
                o.append(text(cx + dx * (L - 2), cy - 12, "F", 18, C_F, 700, "middle", True))
    if letter:
        o.append(circle(20, 20, 12, C_INK))
        o.append(text(20, 25.5, letter, 14, "#fff", 700, "middle"))
    return svg(W, H, "".join(o), "panel",
               f"Fio com corrente {NAMES[i_dir]} em campo {NAMES[B]}")


# ----------------------------------------------------------------- capa
def hero():
    W, H = 680, 300
    o = [rect(0, 0, W, H, "#f8fafc", "#dee2e6", 2, rx=16)]
    # ímã
    o.append(rect(30, 50, 150, 200, C_N, rx=10))
    o.append(rect(500, 50, 150, 200, C_S, rx=10))
    o.append(text(105, 172, "N", 80, "#fff", 800, "middle"))
    o.append(text(575, 172, "S", 80, "#fff", 800, "middle"))
    # campo: N -> S
    for y in (70, 110, 230, 190):
        o.append(arrow(190, y, 490, y, C_B, 2.6, 12))
    o.append(text(340, 40, "campo magnético B  (sai do N e entra no S)", 14.5, C_B, 700, "middle"))
    # fio (seção transversal), corrente saindo da folha
    o.append(circle(340, 150, 24, "#868e96", C_WIRE, 5))
    o.append(sym(340, 150, "out", C_I, r=13, sw=3.2, bg="#fff"))
    o.append(text(340, 205, "fio com corrente i  (saindo da folha)", 14, C_I, 700, "middle"))
    # força
    o.append(arrow(340, 118, 340, 62, C_F, 6, 22))
    o.append(text(362, 78, "F", 28, C_F, 800, "start", True))
    o.append(text(340, 280, "o campo EMPURRA o fio para cima", 16, C_F, 800, "middle"))
    return svg(W, H, "".join(o), "fig hero", "Fio entre os polos de um ímã sendo empurrado para cima")


# ----------------------------------------------------------------- passo 1
def triad():
    W, H = 420, 270
    ox, oy = 120, 170
    o = [rect(0, 0, W, H, "#f8fafc", "#dee2e6", 2, rx=14)]
    o.append(f'<polygon points="{ox},{oy} {ox+240},{oy} {ox+240},{oy-130} {ox},{oy-130}" '
             f'fill="#fff3bf" fill-opacity=".55" stroke="#f08c00" stroke-width="1.5" stroke-dasharray="6 5"/>')
    o.append(text(ox + 236, oy - 136, "plano formado por i e B", 12.5, "#b45309", 600, "end"))
    o.append(arrow(ox, oy, ox + 215, oy, C_I, 5, 20))
    o.append(text(ox + 222, oy - 8, "i", 26, C_I, 800, "start", True))
    o.append(arrow(ox, oy, ox, oy - 112, C_B, 5, 20))
    o.append(text(ox - 14, oy - 100, "B", 26, C_B, 800, "end", True))
    o.append(arrow(ox, oy, ox - 62, oy + 62, C_F, 5, 20))
    o.append(text(ox - 70, oy + 58, "F", 26, C_F, 800, "end", True))
    # marcas de 90 graus
    o.append(f'<polyline points="{ox+16},{oy} {ox+16},{oy-16} {ox},{oy-16}" fill="none" stroke="{C_INK}" stroke-width="1.6"/>')
    o.append(text(ox + 112, oy + 40, "F sai da folha, a 90° de i e de B", 13, C_F, 700, "middle"))
    o.append(text(ox + 112, oy + 58, "(em direção a você)", 13, C_F, 600, "middle"))
    return svg(W, H, "".join(o), "fig", "i e B formam um plano; F é perpendicular a esse plano")


def out_in_legend():
    W, H = 420, 110
    o = [rect(0, 0, W, H, "#f8fafc", "#dee2e6", 2, rx=14)]
    o.append(sym(60, 42, "out", C_F, r=22, sw=3.4))
    o.append(text(60, 92, "ponta da flecha", 12.5, C_INK, 700, "middle"))
    o.append(text(60, 106, "vindo até você", 12.5, C_INK, 600, "middle"))
    o.append(text(112, 48, "SAINDO da folha", 15, C_F, 800))
    o.append(sym(262, 42, "in", C_F, r=22, sw=3.4))
    o.append(text(262, 92, "penas da flecha", 12.5, C_INK, 700, "middle"))
    o.append(text(262, 106, "indo embora", 12.5, C_INK, 600, "middle"))
    o.append(text(314, 48, "ENTRANDO", 15, C_F, 800))
    o.append(text(314, 66, "na folha", 15, C_F, 800))
    return svg(W, H, "".join(o), "fig", "Símbolos de saindo e entrando na folha")


# ----------------------------------------------------------------- passo 2
def angle_fig(theta=35, label="θ", W=430, H=230, show_L=True):
    ox, oy = 80, 188
    Lpx = 230
    th = math.radians(theta)
    ex, ey = ox + Lpx * math.cos(th), oy - Lpx * math.sin(th)
    o = [rect(0, 0, W, H, "#f8fafc", "#dee2e6", 2, rx=14)]
    for y in (36, 84, 132, 180, 214):
        o.append(arrow(12, y, W - 12, y, C_B, 1.8, 8))
    o.append(text(W - 16, 56, "B", 22, C_B, 800, "end", True))
    o.append(line(ox, oy, ox + 250, oy, C_INK, 2, "7 6"))
    o.append(wire_line(ox, oy, ex, ey, 11))
    mx, my = ox + 0.5 * Lpx * math.cos(th), oy - 0.5 * Lpx * math.sin(th)
    o.append(arrow(ox + 40 * math.cos(th), oy - 40 * math.sin(th), ox + 195 * math.cos(th),
                   oy - 195 * math.sin(th), C_I, 3.4, 14))
    o.append(text(mx + 18, my + 6, "i", 22, C_I, 800, "start", True))
    r = 62
    o.append(f'<path d="M {f(ox+r)} {f(oy)} A {r} {r} 0 0 0 {f(ox+r*math.cos(th))} {f(oy-r*math.sin(th))}" '
             f'fill="#fff3bf" stroke="#e67700" stroke-width="2.4"/>')
    ma = th / 2
    o.append(text(ox + 84 * math.cos(ma), oy - 84 * math.sin(ma) + 7, label, 22, "#e67700", 800, "middle", True))
    if show_L:
        nx, ny = -math.sin(th), -math.cos(th)  # normal ao fio (lado de cima/esquerda)
        off = 30
        a = (ox + nx * off * -1, oy + ny * off * -1)
        # linha de cota paralela ao fio, do lado de baixo/direita
        px, py = math.sin(th), math.cos(th)
        sx, sy = ox + px * 30, oy + py * 30
        tx, ty = ex + px * 30, ey + py * 30
        o.append(arrow(sx, sy, tx, ty, C_INK, 1.8, 9))
        o.append(arrow(tx, ty, sx, sy, C_INK, 1.8, 9))
        o.append(line(ox, oy, sx, sy, C_INK, 1.2))
        o.append(line(ex, ey, tx, ty, C_INK, 1.2))
        o.append(f'<rect x="{f((sx+tx)/2-14)}" y="{f((sy+ty)/2-12)}" width="28" height="22" rx="5" fill="#f8fafc"/>')
        o.append(text((sx + tx) / 2, (sy + ty) / 2 + 6, "L", 20, C_INK, 800, "middle", True))
    return svg(W, H, "".join(o), "fig", f"Fio inclinado {theta} graus em relação às linhas de campo")


def three_positions():
    W, H = 640, 190
    o = []
    cfg = [(0, "θ = 0°", "sen 0° = 0", "F = 0"), (30, "θ = 30°", "sen 30° = 0,5", "F = metade"),
           (90, "θ = 90°", "sen 90° = 1", "F = máxima")]
    for k, (ang, t1, t2, t3) in enumerate(cfg):
        x0 = 6 + k * 212
        o.append(rect(x0, 2, 200, 186, "#f8fafc", "#ced4da", 2, rx=12))
        cx, cy = x0 + 100, 82
        for dy in (-52, -28, 28, 52):
            o.append(arrow(x0 + 10, cy + dy, x0 + 190, cy + dy, C_B, 1.6, 7))
        th = math.radians(ang)
        L = 54
        ax, ay = cx - L * math.cos(th), cy + L * math.sin(th)
        bx, by = cx + L * math.cos(th), cy - L * math.sin(th)
        o.append(wire_line(ax, ay, bx, by, 9))
        o.append(arrow(cx - 0.6 * L * math.cos(th), cy + 0.6 * L * math.sin(th),
                       cx + 0.6 * L * math.cos(th), cy - 0.6 * L * math.sin(th), C_I, 2.6, 11))
        if ang == 30:
            o.append(sym(cx + 44, cy + 14, "in", C_F, r=7, sw=2.4))
        if ang == 90:
            o.append(sym(cx + 28, cy, "in", C_F, r=14, sw=3))
        o.append(text(x0 + 100, 158, t1, 14, C_INK, 800, "middle"))
        o.append(text(x0 + 100, 176, t2 + "  →  " + t3, 12.5, C_F, 700, "middle"))
    return svg(W, H, "".join(o), "fig", "Fio a 0, 30 e 90 graus em relação ao campo")


# ----------------------------------------------------------------- passo 3
def hand():
    W, H = 460, 300
    skin, edge = "#f4c9a0", "#b9784a"
    o = [rect(0, 0, W, H, "#f8fafc", "#dee2e6", 2, rx=14)]
    # antebraço e dorso da mão (vista de costas), dedos para a direita, polegar para cima
    o.append(rect(34, 150, 90, 70, skin, edge, 3, rx=14))
    o.append(rect(110, 134, 120, 100, skin, edge, 3, rx=22))
    fingers = [(142, 112, 150), (118, 128, 160), (96, 120, 152), (74, 100, 128)]
    ycs = [150, 172, 194, 216]
    lens = [118, 130, 122, 96]
    for yc, ln in zip(ycs, lens):
        o.append(rect(224, yc - 11, ln, 22, skin, edge, 3, rx=11))
        o.append(rect(224 + ln - 22, yc - 7, 16, 14, "#fde4cf", edge, 1.6, rx=6))  # unha
    # polegar apontando para cima
    o.append(f'<path d="M 132 146 L 146 52 Q 148 36 166 38 Q 184 40 182 58 L 176 150 Z" fill="{skin}" stroke="{edge}" stroke-width="3" stroke-linejoin="round"/>')
    o.append(rect(150, 40, 20, 18, "#fde4cf", edge, 1.6, rx=7))
    o.append(rect(124, 140, 56, 20, skin, "none"))
    # setas explicativas
    o.append(arrow(200, 110, 200, 30, C_I, 5, 20))
    o.append(text(214, 46, "polegar = i", 17, C_I, 800))
    o.append(arrow(260, 108, 410, 108, C_B, 5, 20))
    o.append(text(262, 96, "dedos = B", 17, C_B, 800))
    o.append(sym(180, 194, "in", C_F, r=19, sw=4, bg="#fff"))
    o.append(text(230, 274, "a palma empurra para DENTRO da folha = F", 14.5, C_F, 800, "middle", extra=""))
    o.append(text(230, 292, "(você está vendo as costas da mão)", 12.5, "#495057", 600, "middle"))
    return svg(W, H, "".join(o), "fig", "Mão direita espalmada: polegar i, dedos B, palma F")


def swirl(i_ang, B_ang, W=210, H=190):
    """Atalho do giro: gire i até B pelo menor ângulo; anti-horário -> sai, horário -> entra."""
    ox, oy = W / 2 - 10, H / 2 + 20
    L = 80
    ix, iy = math.cos(math.radians(i_ang)), math.sin(math.radians(i_ang))
    bx, by = math.cos(math.radians(B_ang)), math.sin(math.radians(B_ang))
    zc = ix * by - iy * bx  # componente z de i x B
    kind = "out" if zc > 0 else "in"
    o = [rect(1, 1, W - 2, H - 2, "#f8fafc", "#ced4da", 2, rx=12)]
    o.append(arrow(ox, oy, ox + L * ix, oy - L * iy, C_I, 4, 15))
    o.append(arrow(ox, oy, ox + L * bx, oy - L * by, C_B, 4, 15))
    o.append(text(ox + (L + 12) * ix, oy - (L + 12) * iy + 6, "i", 20, C_I, 800, "middle", True))
    o.append(text(ox + (L + 12) * bx, oy - (L + 12) * by + 6, "B", 20, C_B, 800, "middle", True))
    r = 44
    a0, a1 = math.radians(i_ang), math.radians(B_ang)
    # arco de i até B (sentido do giro)
    x0, y0 = ox + r * math.cos(a0), oy - r * math.sin(a0)
    x1, y1 = ox + r * math.cos(a1), oy - r * math.sin(a1)
    sweep = 0 if zc > 0 else 1  # svg: sweep-flag 0 = anti-horário na tela
    o.append(f'<path d="M {f(x0)} {f(y0)} A {r} {r} 0 0 {sweep} {f(x1)} {f(y1)}" fill="none" stroke="{C_INK}" '
             f'stroke-width="2.6" stroke-dasharray="1 0"/>')
    # ponta do arco
    t = (-math.sin(a1), -math.cos(a1)) if zc > 0 else (math.sin(a1), math.cos(a1))
    tx, ty = t
    hx, hy = x1, y1
    o.append(f'<polygon points="{f(hx+tx*10)},{f(hy+ty*10)} {f(hx-ty*5)},{f(hy+tx*5)} {f(hx+ty*5)},{f(hy-tx*5)}" fill="{C_INK}"/>')
    label = "anti-horário  →  F SAI" if zc > 0 else "horário  →  F ENTRA"
    o.append(text(W / 2, H - 10, label, 13.5, C_F, 800, "middle"))
    o.append(sym(W - 28, 28, kind, C_F, r=14, sw=3))
    return svg(W, H, "".join(o), "panel", "Atalho do giro")


# ----------------------------------------------------------------- equilíbrio / mecânica
def equilibrium_fig(B="in", forces=False, i_dir=None, W=330, H=190, labels=True):
    cx, cy = W / 2, H / 2 + 6
    o = [rect(1, 1, W - 2, H - 2, "#f8fafc", "#ced4da", 2, rx=12)]
    o.append(field_symbols(cx - 120, cx + 120, 24, H - 24, 7, 5, B, skip=lambda x, y: abs(y - cy) < 14))
    o.append(text(W - 14, 24, "B", 18, C_B, 700, "end", True))
    o.append(wire_line(cx - 105, cy, cx + 105, cy, 12))
    if i_dir:
        a, b = (cx - 70, cx + 70) if i_dir == "right" else (cx + 70, cx - 70)
        o.append(arrow(a, cy, b, cy, C_I, 3.4, 13))
        o.append(text((a + b) / 2, cy - 14, "i", 19, C_I, 700, "middle", True))
    if forces:
        o.append(arrow(cx - 40, cy + 8, cx - 40, cy + 66, C_P, 5, 18))
        o.append(text(cx - 52, cy + 60, "P", 19, C_P, 800, "end", True))
        o.append(arrow(cx + 40, cy - 8, cx + 40, cy - 66, C_F, 5, 18))
        o.append(text(cx + 54, cy - 52, "F", 19, C_F, 800, "start", True))
    return svg(W, H, "".join(o), "fig", "Fio horizontal em campo uniforme")


def strings_fig(W=330, H=230):
    cx = W / 2
    wy = 150
    o = [rect(1, 1, W - 2, H - 2, "#f8fafc", "#ced4da", 2, rx=12)]
    o.append(field_symbols(cx - 120, cx + 120, 92, H - 28, 7, 3, "in", skip=lambda x, y: abs(y - wy) < 14))
    o.append(rect(30, 14, W - 60, 12, "#adb5bd", C_WIRE, 2, rx=3))
    for x in range(40, W - 40, 16):
        o.append(line(x, 26, x - 7, 33, C_WIRE, 1.4))
    o.append(line(cx - 80, 26, cx - 80, wy, C_WIRE, 2))
    o.append(line(cx + 80, 26, cx + 80, wy, C_WIRE, 2))
    o.append(wire_line(cx - 90, wy, cx + 90, wy, 12))
    o.append(arrow(cx - 55, wy, cx + 55, wy, C_I, 3.4, 13))
    o.append(text(cx + 62, wy - 14, "i", 19, C_I, 700, "start", True))
    o.append(text(cx - 88, 50, "fios leves", 12, "#495057", 600, "end"))
    o.append(text(cx - 88, 64, "e isolantes", 12, "#495057", 600, "end"))
    o.append(text(W - 14, 64, "B", 18, C_B, 700, "end", True))
    return svg(W, H, "".join(o), "fig", "Fio pendurado por dois fios isolantes")


def spring(x, y0, y1, n=7, amp=11):
    pts = [(x, y0)]
    seg = (y1 - y0 - 16) / n
    yy = y0 + 8
    pts.append((x, yy))
    for k in range(n):
        pts.append((x + (amp if k % 2 == 0 else -amp), yy + seg * (k + 0.5)))
    pts.append((x, y1 - 8))
    pts.append((x, y1))
    return f'<polyline points="{" ".join(f(a)+","+f(b) for a,b in pts)}" fill="none" stroke="{C_WIRE}" stroke-width="2.6" stroke-linejoin="round"/>'


def springs_fig(W=330, H=240):
    cx = W / 2
    wy = 170
    o = [rect(1, 1, W - 2, H - 2, "#f8fafc", "#ced4da", 2, rx=12)]
    o.append(field_symbols(cx - 120, cx + 120, 78, H - 24, 7, 4, "in", skip=lambda x, y: abs(y - wy) < 14 or abs(x - (cx - 80)) < 16 or abs(x - (cx + 80)) < 16 or abs(x - cx) > 110))
    o.append(rect(30, 14, W - 60, 12, "#adb5bd", C_WIRE, 2, rx=3))
    for x in range(40, W - 40, 16):
        o.append(line(x, 26, x - 7, 33, C_WIRE, 1.4))
    o.append(spring(cx - 80, 26, wy))
    o.append(spring(cx + 80, 26, wy))
    o.append(wire_line(cx - 92, wy, cx + 92, wy, 12))
    o.append(arrow(cx - 50, wy, cx + 50, wy, C_I, 3.4, 13))
    o.append(text(cx + 58, wy - 14, "i", 19, C_I, 700, "start", True))
    o.append(text(cx - 98, 98, "mola", 13, "#495057", 700, "end"))
    o.append(text(cx - 98, 113, "k", 15, "#495057", 700, "end", True))
    o.append(text(cx + 98, 98, "mola", 13, "#495057", 700, "start"))
    o.append(text(cx + 98, 113, "k", 15, "#495057", 700, "start", True))
    o.append(text(W - 14, 64, "B", 18, C_B, 700, "end", True))
    return svg(W, H, "".join(o), "fig", "Fio pendurado por duas molas")


def rails_fig(show_F=False, W=440, H=230, friction=False):
    top, bot = 56, 176
    xl, xr = 66, 408
    rod = 250
    o = [rect(1, 1, W - 2, H - 2, "#f8fafc", "#ced4da", 2, rx=12)]
    o.append(text(16, 24, "vista de cima", 13, "#495057", 700))
    o.append(field_symbols(130, 340, top + 22, bot - 22, 5, 3, "out", skip=lambda x, y: abs(x - rod) < 18))
    o.append(text(W - 14, 24, "B", 18, C_B, 700, "end", True))
    # trilhos e circuito
    o.append(line(xl, top, xr, top, C_WIRE, 6))
    o.append(line(xl, bot, xr, bot, C_WIRE, 6))
    o.append(line(xl, top, xl, 100, C_WIRE, 4))
    o.append(line(xl, 128, xl, bot, C_WIRE, 4))
    # bateria: placa longa (+) embaixo, curta (−) em cima
    o.append(line(xl - 16, 128, xl + 16, 128, C_INK, 4))
    o.append(line(xl - 8, 112, xl + 8, 112, C_INK, 4))
    o.append(text(xl + 24, 134, "+", 17, C_INK, 800))
    o.append(text(xl + 24, 118, "−", 17, C_INK, 800))
    # barra
    o.append(wire_line(rod, top, rod, bot, 13))
    o.append(text(rod, top - 12, "barra", 13, "#495057", 700, "middle"))
    # corrente: + -> trilho de baixo -> sobe pela barra -> trilho de cima -> bateria
    o.append(arrow(110, bot, 190, bot, C_I, 3.2, 13))
    o.append(arrow(rod, bot - 18, rod, top + 36, C_I, 3.2, 13))
    o.append(arrow(330, top, 250 + 30, top, C_I, 3.2, 13))
    o.append(arrow(190, top, 110, top, C_I, 3.2, 13))
    o.append(text(rod - 14, 152, "i", 19, C_I, 700, "end", True))
    # cota L
    o.append(arrow(384, top + 6, 384, bot - 6, C_INK, 1.6, 8))
    o.append(arrow(384, bot - 6, 384, top + 6, C_INK, 1.6, 8))
    o.append(rect(372, 106, 24, 22, "#f8fafc"))
    o.append(text(384, 123, "L", 18, C_INK, 800, "middle", True))
    if friction:
        o.append(text(xr - 4, bot + 24, "trilhos com atrito (μ)", 12.5, "#495057", 700, "end"))
    if show_F:
        o.append(arrow(rod + 10, 116, rod + 66, 116, C_F, 5, 18))
        o.append(text(rod + 72, 108, "F", 19, C_F, 800, "start", True))
    return svg(W, H, "".join(o), "fig", "Barra sobre trilhos, vista de cima")


def incline_fig(W=360, H=262, show_F=False):
    gx0, gx1, gy = 30, 340, 238
    th = math.radians(37)
    base = 280
    x0 = 40
    x1 = x0 + base
    yt = gy - base * math.tan(th)
    o = [rect(1, 1, W - 2, H - 2, "#f8fafc", "#ced4da", 2, rx=12)]
    # campo vertical para cima (somente fora do plano)
    def surf(x):
        return gy - (x - x0) * math.tan(th)
    for x in (66, 104, 190, 228, 266, 304):
        ys = surf(x) - 8
        if ys - 28 > 22:
            o.append(arrow(x, ys, x, 28, C_B, 1.8, 8))
    o.append(text(W - 16, 26, "B", 18, C_B, 700, "end", True))
    o.append(f'<polygon points="{x0},{gy} {x1},{gy} {x1},{f(yt)}" fill="#dee2e6" stroke="{C_WIRE}" stroke-width="3" stroke-linejoin="round"/>')
    o.append(line(gx0, gy, gx1, gy, C_WIRE, 3))
    r = 13
    s = 150
    px, py = x0 + s * math.cos(th), gy - s * math.sin(th)
    cx, cy = px - math.sin(th) * r, py - math.cos(th) * r
    o.append(circle(cx, cy, r, "#868e96", C_WIRE, 3.5))
    o.append(sym(cx, cy, "in", C_I, r=9, sw=2.6, bg="#fff"))
    o.append(text(cx - 22, cy + 22, "i", 17, C_I, 700, "end", True))
    # ângulo
    rr = 60
    o.append(f'<path d="M {x0+rr} {gy} A {rr} {rr} 0 0 0 {f(x0+rr*math.cos(th))} {f(gy-rr*math.sin(th))}" fill="#fff3bf" stroke="#e67700" stroke-width="2.4"/>')
    o.append(text(x0 + 86, gy - 9, "37°", 15, "#e67700", 800, "middle"))
    if show_F:
        o.append(arrow(cx + r + 2, cy, cx + r + 70, cy, C_F, 5, 17))
        o.append(text(cx + r + 76, cy + 6, "F", 19, C_F, 800, "start", True))
        o.append(arrow(cx, cy + 4, cx, cy + 62, C_P, 4.5, 16))
        o.append(text(cx - 8, cy + 66, "P", 18, C_P, 800, "end", True))
        nx, ny = -math.sin(th), -math.cos(th)
        o.append(arrow(cx, cy, cx + nx * 60, cy + ny * 60, "#868e96", 4, 15))
        o.append(text(cx + nx * 60 - 8, cy + ny * 60 - 6, "N", 18, "#495057", 800, "end", True))
    return svg(W, H, "".join(o), "fig", "Barra sobre plano inclinado de 37 graus")


def semicircle_fig(show_F=False, W=380, H=240):
    cx, cy, R = 190, 176, 100
    o = [rect(1, 1, W - 2, H - 2, "#f8fafc", "#ced4da", 2, rx=12)]
    o.append(field_symbols(36, W - 36, 28, H - 22, 7, 5, "in"))
    o.append(text(W - 14, 24, "B", 18, C_B, 700, "end", True))
    o.append(line(30, cy, cx - R, cy, C_WIRE, 5))
    o.append(line(cx + R, cy, W - 30, cy, C_WIRE, 5))
    o.append(f'<path d="M {cx-R} {cy} A {R} {R} 0 0 1 {cx+R} {cy}" fill="none" stroke="{C_WIRE}" stroke-width="8"/>')
    o.append(f'<path d="M {cx-R} {cy} A {R} {R} 0 0 1 {cx+R} {cy}" fill="none" stroke="#adb5bd" stroke-width="3"/>')
    o.append(arrow(cx - 26, cy - R, cx + 30, cy - R, C_I, 3.6, 14))
    o.append(text(cx + 36, cy - R - 12, "i", 19, C_I, 700, "start", True))
    o.append(arrow(44, cy, 90, cy, C_I, 3.2, 12))
    o.append(line(cx, cy, cx + R * math.cos(math.radians(40)), cy - R * math.sin(math.radians(40)), C_INK, 1.8, "6 5"))
    o.append(rect(cx + 34, cy - 48, 24, 20, "#f8fafc"))
    o.append(text(cx + 46, cy - 32, "R", 18, C_INK, 800, "middle", True))
    o.append(circle(cx, cy, 3.5, C_INK))
    if show_F:
        o.append(arrow(cx, cy - 30, cx, cy - 92 + 12, C_F, 5, 18))
        o.append(text(cx + 12, cy - 56, "F", 20, C_F, 800, "start", True))
    return svg(W, H, "".join(o), "fig", "Fio em forma de semicircunferência em campo entrando na folha")


def loop_fig(show_F=False, W=420, H=250):
    x0, y0, w, h = 110, 70, 200, 110  # espira 20 cm x 10 cm (10 px por cm)
    o = [rect(1, 1, W - 2, H - 2, "#f8fafc", "#ced4da", 2, rx=12)]
    for y in (28, 60, 92, 125, 158, 190, 222):
        if y < 62 or y > 188 or True:
            o.append(arrow(14, y, W - 14, y, C_B, 1.8, 8))
    o.append(text(W - 18, 46, "B", 20, C_B, 800, "end", True))
    o.append(f'<rect x="{x0}" y="{y0}" width="{w}" height="{h}" fill="#f8fafc" fill-opacity=".92" stroke="{C_WIRE}" stroke-width="7" rx="3"/>')
    o.append(f'<rect x="{x0}" y="{y0}" width="{w}" height="{h}" fill="none" stroke="#adb5bd" stroke-width="2.6" rx="3"/>')
    # corrente anti-horária: base →, direita ↑, topo ←, esquerda ↓
    o.append(arrow(cx := x0 + w / 2 - 22, y0 + h, x0 + w / 2 + 22, y0 + h, C_I, 3.4, 13))
    o.append(arrow(x0 + w, y0 + h / 2 + 20, x0 + w, y0 + h / 2 - 20, C_I, 3.4, 13))
    o.append(arrow(x0 + w / 2 + 22, y0, x0 + w / 2 - 22, y0, C_I, 3.4, 13))
    o.append(arrow(x0, y0 + h / 2 - 20, x0, y0 + h / 2 + 20, C_I, 3.4, 13))
    o.append(text(x0 + w / 2 + 34, y0 + h + 22, "i", 19, C_I, 700, "start", True))
    # cotas
    o.append(arrow(x0, y0 - 18, x0 + w, y0 - 18, C_INK, 1.6, 8))
    o.append(arrow(x0 + w, y0 - 18, x0, y0 - 18, C_INK, 1.6, 8))
    o.append(rect(x0 + w / 2 - 28, y0 - 32, 56, 20, "#f8fafc"))
    o.append(text(x0 + w / 2, y0 - 17, "20 cm", 14, C_INK, 800, "middle"))
    o.append(arrow(x0 + w + 20, y0, x0 + w + 20, y0 + h, C_INK, 1.6, 8))
    o.append(arrow(x0 + w + 20, y0 + h, x0 + w + 20, y0, C_INK, 1.6, 8))
    o.append(rect(x0 + w + 8, y0 + h / 2 - 24, 54, 20, "#f8fafc"))
    o.append(text(x0 + w + 35, y0 + h / 2 - 9, "10 cm", 14, C_INK, 800, "middle"))
    if show_F:
        o.append(sym(x0 + w, y0 + h / 2 + 34, "in", C_F, r=13, sw=3))
        o.append(text(x0 + w + 20, y0 + h / 2 + 62, "F", 18, C_F, 800, "middle", True))
        o.append(sym(x0, y0 + h / 2 + 34, "out", C_F, r=13, sw=3))
        o.append(text(x0 - 20, y0 + h / 2 + 62, "F", 18, C_F, 800, "middle", True))
    return svg(W, H, "".join(o), "fig", "Espira retangular em campo paralelo ao seu plano")


def coil_fig(show_F=False, W=300, H=220):
    cx, cy, R = 150, 112, 62
    o = [rect(1, 1, W - 2, H - 2, "#f8fafc", "#ced4da", 2, rx=12)]
    o.append(text(14, 24, "bobina vista de frente", 12.5, "#495057", 700))
    for k in range(12):
        a = math.radians(k * 30 + 15)
        o.append(arrow(cx + 20 * math.cos(a), cy - 20 * math.sin(a), cx + 98 * math.cos(a), cy - 98 * math.sin(a), C_B, 1.8, 8))
    o.append(circle(cx, cy, 15, C_N, "#fff", 2))
    o.append(text(cx, cy + 6, "N", 17, "#fff", 800, "middle"))
    o.append(circle(cx, cy, R, "none", C_WIRE, 8))
    o.append(circle(cx, cy, R, "none", "#adb5bd", 3))
    for a_deg in (0, 90, 180, 270):
        a = math.radians(a_deg)
        tx, ty = -math.sin(a), -math.cos(a)  # tangente anti-horária (coords de tela)
        px, py = cx + R * math.cos(a), cy - R * math.sin(a)
        o.append(arrow(px - tx * 10, py - ty * 10, px + tx * 12, py + ty * 12, C_I, 3.2, 12))
    o.append(text(cx + R + 12, cy - 16, "i", 19, C_I, 700, "start", True))
    o.append(text(W - 14, 24, "B", 18, C_B, 700, "end", True))
    if show_F:
        for a_deg in (45, 135, 225, 315):
            a = math.radians(a_deg)
            o.append(sym(cx + R * math.cos(a), cy - R * math.sin(a), "in", C_F, r=9, sw=2.6))
    return svg(W, H, "".join(o), "fig", "Bobina com campo radial")


def magnet_fig(W=420, H=220, swap=False):
    o = [rect(1, 1, W - 2, H - 2, "#f8fafc", "#ced4da", 2, rx=12)]
    left, right = ("S", "N") if swap else ("N", "S")
    cl = C_S if swap else C_N
    cr = C_N if swap else C_S
    o.append(rect(20, 24, 100, 124, cl, rx=10))
    o.append(rect(W - 120, 24, 100, 124, cr, rx=10))
    o.append(text(70, 108, left, 56, "#fff", 800, "middle"))
    o.append(text(W - 70, 108, right, 56, "#fff", 800, "middle"))
    o.append(circle(W / 2, 86, 16, "#868e96", C_WIRE, 4))
    o.append(sym(W / 2, 86, "in", C_I, r=11, sw=3, bg="#fff"))
    o.append(text(W / 2, H - 22, "fio (a corrente entra na folha)", 14, C_I, 700, "middle"))
    return svg(W, H, "".join(o), "fig", "Fio entre os polos de um ímã")


def mindmap():
    W, H = 700, 470
    boxes = [
        (10, 8, 218, 126, "#1c7ed6", "1 · Ingredientes", ["corrente i  (ampère, A)", "campo B  (tesla, T)", "comprimento L  (metro, m)"]),
        (472, 8, 218, 126, "#2f9e44", "2 · Quanto?", ["F = i · L · B · sen θ", "θ = 90°  →  F máxima", "θ = 0°  →  F = 0"]),
        (10, 338, 218, 126, "#e8590c", "3 · Para onde?", ["F ⟂ i  e  F ⟂ B", "mão direita: dedos em i,", "gire até B, polegar = F"]),
        (241, 338, 218, 126, "#7048e8", "4 · Equilíbrio", ["parado: F = P = m · g", "acelerando: F = m · a", "desenhe todas as forças!"]),
        (472, 338, 218, 126, "#c92a2a", "5 · Cuidados", ["cm → m   ·   g → kg", "θ é entre o fio e B", "i ∥ B  →  não há força"]),
    ]
    o = []
    cx, cy = 350, 236
    targets = [(119, 134), (581, 134), (119, 338), (350, 338), (581, 338)]
    for (tx, ty), b in zip(targets, boxes):
        o.append(f'<path d="M {cx} {cy} C {cx} {(cy+ty)/2} {tx} {(cy+ty)/2} {tx} {ty}" fill="none" stroke="{b[4]}" stroke-width="4" stroke-linecap="round"/>')
    for x, y, w, h, col, title, lines_ in boxes:
        o.append(rect(x, y, w, h, "#fff", col, 3, rx=14))
        o.append(f'<path d="M {x} {y+14} Q {x} {y} {x+14} {y} L {x+w-14} {y} Q {x+w} {y} {x+w} {y+14} L {x+w} {y+34} L {x} {y+34} Z" fill="{col}"/>')
        o.append(text(x + w / 2, y + 24, title, 16, "#fff", 800, "middle"))
        for k, ln in enumerate(lines_):
            o.append(text(x + 14, y + 62 + k * 22, ln, 13.5, C_INK, 600))
    o.append(f'<ellipse cx="{cx}" cy="{cy}" rx="128" ry="52" fill="#212529"/>')
    o.append(text(cx, cy - 8, "FORÇA MAGNÉTICA", 17, "#fff", 800, "middle"))
    o.append(text(cx, cy + 14, "sobre um fio com corrente", 14, "#e9ecef", 600, "middle"))
    return svg(W, H, "".join(o), "fig", "Mapa mental da aula")
