# -*- coding: utf-8 -*-
# Stitch src/ modules back into the single deployable lv_calc.html.
#
#   python build.py
#
# Edit the small files under src/ (one section each), then run this to produce
# the single self-contained HTML to paste into Squarespace. Lossless: the JS
# modules are concatenated in filename order into one <script>, the CSS into one
# <style>. Run after every source edit.
import io, os, glob

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC  = os.path.join(ROOT, 'src')
OUT  = os.path.join(ROOT, 'lv_calc.html')

index = io.open(os.path.join(SRC, 'index.html'), encoding='utf-8').read()
css   = io.open(os.path.join(SRC, 'css', 'styles.css'), encoding='utf-8').read()

js_files = sorted(glob.glob(os.path.join(SRC, 'js', '*.js')))
js = ''.join(io.open(f, encoding='utf-8').read() for f in js_files)

out = index.replace('/* @@BUILD:CSS@@ */', css).replace('/* @@BUILD:JS@@ */', js)

if out.count('�'):
    raise SystemExit(f'ABORT: {out.count(chr(0xFFFD))} replacement char(s) in output — a source file is corrupted.')

io.open(OUT, 'w', encoding='utf-8', newline='').write(out)
print(f'[build] {len(js_files)} js modules + css -> lv_calc.html ({len(out):,} chars, {len(out.splitlines()):,} lines)')
