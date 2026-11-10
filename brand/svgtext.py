"""Gera paths de texto em SVG a partir das fontes variáveis (self-hosted)."""
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.misc.transform import Transform

CACHE = {}


def load(path, axes):
    key = (path, tuple(sorted(axes.items())))
    if key in CACHE:
        return CACHE[key]
    f = TTFont(path)
    f = instantiateVariableFont(f, axes, inplace=True)
    CACHE[key] = f
    return f


def run(font, text, size, tracking=0.0):
    """Devolve (d, bbox, advance). tracking em unidades do size final."""
    upem = font["head"].unitsPerEm
    gs = font.getGlyphSet()
    cmap = font.getBestCmap()
    s = size / upem
    x = 0.0
    parts = []
    bounds = None
    for ch in text:
        gn = cmap.get(ord(ch))
        if gn is None:
            x += size * 0.25
            continue
        g = gs[gn]
        spen = SVGPathPen(gs)
        g.draw(TransformPen(spen, Transform().translate(x, 0).scale(s, -s)))
        d = spen.getCommands()
        if d:
            parts.append(d)
        bp = BoundsPen(gs)
        g.draw(bp)
        if bp.bounds:
            x0, y0, x1, y1 = bp.bounds
            b = (x0 * s + x, -y1 * s, x1 * s + x, -y0 * s)
            bounds = b if bounds is None else (
                min(bounds[0], b[0]), min(bounds[1], b[1]),
                max(bounds[2], b[2]), max(bounds[3], b[3]))
        x += g.width * s + tracking
    if bounds is None:
        bounds = (0, 0, 0, 0)
    return " ".join(parts), bounds, x


def place(d, bounds, cx, cy, anchor="center"):
    """Translada o path para centrar o bbox em (cx,cy)."""
    w = bounds[2] - bounds[0]
    h = bounds[3] - bounds[1]
    tx = cx - w / 2 - bounds[0] if anchor == "center" else cx - bounds[0]
    ty = cy - h / 2 - bounds[1]
    return f'<g transform="translate({-tx:.2f},{-ty:.2f}) scale(-1,1)"><path d="{d}"/></g>' if False else \
           f'<g transform="translate({tx:.2f},{ty:.2f})"><path d="{d}"/></g>'
