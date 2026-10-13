// Shapes Arabic strings with HarfBuzz and writes glyph outlines as SVG path data,
// so the browser scene can extrude real 3D Arabic lettering.
const fs = require('fs');
const path = require('path');

const FONTS = {
  cairo: 'node_modules/@expo-google-fonts/cairo/900Black/Cairo_900Black.ttf',
  cairoBold: 'node_modules/@expo-google-fonts/cairo/700Bold/Cairo_700Bold.ttf',
};

const TEXTS = {
  brand: ['cairo', 'بحار الشرق'],
  sub: ['cairoBold', 'للتسويق والإعلان'],
  design: ['cairo', 'نصمم إعلانك'],
  illusion: ['cairo', 'بالخداع البصري'],
  threeD: ['cairo', '3D'],
  screens: ['cairoBold', 'شاشاتنا المتنقلة تدعم العرض ثلاثي الأبعاد'],
  slogan: ['cairo', 'إعلانك ... يصل للجميع'],
  phones: ['cairoBold', '784006800  |  784007800'],
  handle: ['cairoBold', '@baharalsharq'],
  wow: ['cairo', 'خلّي إعلانك يطلع من الشاشة'],
};

require('harfbuzzjs').then((hb) => {
  const out = {};
  const faces = {};
  for (const [key, [fontKey, str]] of Object.entries(TEXTS)) {
    if (!faces[fontKey]) {
      const blob = hb.createBlob(fs.readFileSync(path.join(__dirname, '..', FONTS[fontKey])));
      const face = hb.createFace(blob, 0);
      faces[fontKey] = { face, font: hb.createFont(face), upem: face.upem };
    }
    const { font, upem } = faces[fontKey];
    const buf = hb.createBuffer();
    buf.addText(str);
    buf.guessSegmentProperties();
    hb.shape(font, buf);
    const glyphs = buf.json();
    let x = 0;
    const parts = [];
    for (const g of glyphs) {
      const d = font.glyphToPath(g.g);
      if (d) parts.push({ d, x: x + g.dx, y: g.dy });
      x += g.ax;
    }
    out[key] = { text: str, upem, advance: x, glyphs: parts };
    buf.destroy();
  }
  fs.writeFileSync(path.join(__dirname, 'text-paths.json'), JSON.stringify(out));
  for (const [k, v] of Object.entries(out)) console.log(k, v.glyphs.length, v.advance / v.upem);
});
