# Uso: python herramientas/acentos-pixel.py salida.ttf  -> escribe salida.ttf y salida.ttf.b64 (pegar en estilos.css, @font-face).
# Builds a tiny TTF with full-height pixel capitals Á É Í Ó Ú Ñ Ü matching Press Start 2P (125-unit grid, caps rows 1-7).
import base64, sys
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

BASE = {
 'A': ['..###..', '.##.##.', '##...##', '##...##', '#######', '##...##', '##...##'],
 'E': ['#######', '##.....', '##.....', '######.', '##.....', '##.....', '#######'],
 'I': ['.######', '...##..', '...##..', '...##..', '...##..', '...##..', '.######'],
 'O': ['.#####.', '##...##', '##...##', '##...##', '##...##', '##...##', '.#####.'],
 'U': ['##...##', '##...##', '##...##', '##...##', '##...##', '##...##', '.#####.'],
 'N': ['##...##', '###..##', '####.##', '##.####', '##..###', '##...##', '##...##'],
}
AGUDO = ['....#..', '...#...']           # rows 10, 9
TILDE = ['.###.##', '##.###.']
DIERESIS = ['', '.##.##.']
GLIFOS = {
 'Aacute': (0xC1, 'A', AGUDO), 'Eacute': (0xC9, 'E', AGUDO), 'Iacute': (0xCD, 'I', AGUDO),
 'Oacute': (0xD3, 'O', AGUDO), 'Uacute': (0xDA, 'U', AGUDO), 'Ntilde': (0xD1, 'N', TILDE), 'Udieresis': (0xDC, 'U', DIERESIS),
}

def glifo(base, acento):
    pen = TTGlyphPen(None)
    filas = {}
    for i, f in enumerate(BASE[base]): filas[7 - i] = f
    for i, f in enumerate(acento): filas[10 - i] = f
    for y, f in filas.items():
        for x, ch in enumerate(f):
            if ch != '#': continue
            x0, y0, x1, y1 = x * 125, y * 125, (x + 1) * 125, (y + 1) * 125
            pen.moveTo((x0, y0)); pen.lineTo((x0, y1)); pen.lineTo((x1, y1)); pen.lineTo((x1, y0)); pen.closePath()
    return pen.glyph()

orden = ['.notdef'] + list(GLIFOS)
fb = FontBuilder(1000, isTTF=True)
fb.setupGlyphOrder(orden)
fb.setupCharacterMap({cp: n for n, (cp, _, _) in GLIFOS.items()})
g = {'.notdef': TTGlyphPen(None).glyph()}
for n, (_, b, a) in GLIFOS.items(): g[n] = glifo(b, a)
fb.setupGlyf(g)
fb.setupHorizontalMetrics({n: (1000, 0) for n in orden})
fb.setupHorizontalHeader(ascent=1000, descent=0)
fb.setupNameTable({'familyName': 'PixelAcentos', 'styleName': 'Regular'})
fb.setupOS2(sTypoAscender=1000, sTypoDescender=0, usWinAscent=1000, usWinDescent=0)
fb.setupPost()
fb.save(sys.argv[1])
b64 = base64.b64encode(open(sys.argv[1], 'rb').read()).decode()
open(sys.argv[1] + '.b64', 'w').write(b64)
print(len(b64))
