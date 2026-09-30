"""Builds index.html for the Bahar Al-Sharq square company profile.
Run:  python3 build.py && node render.js --png
"""
import math

W = 1080
SEA, DEEP, SUN, FOAM = "#1f5f94", "#0c3a63", "#f6b400", "#e9f1f8"


# ---------------------------------------------------------------- motifs
def rays(cx, cy, r1, r2, color=SUN, width=16, spread=150, n=7):
    """The seven rays of the logo, fanned above a centre point."""
    out = []
    for i in range(n):
        a = math.radians(-90 - spread / 2 + i * spread / (n - 1))
        x1, y1 = cx + r1 * math.cos(a), cy + r1 * math.sin(a)
        x2, y2 = cx + r2 * math.cos(a), cy + r2 * math.sin(a)
        out.append(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}"/>')
    return (f'<svg class="abs" style="left:0;top:0;width:{W}px;height:{W}px;z-index:3;pointer-events:none" '
            f'viewBox="0 0 {W} {W}"><g stroke="{color}" stroke-width="{width}" stroke-linecap="round">{"".join(out)}</g></svg>')


def waves(top, back, front, height=200, z=5, flip=False):
    """Two sea waves from the logo, spanning the page width."""
    t = ' transform="scale(1,-1) translate(0,-200)"' if flip else ""
    return (f'<svg class="abs" style="left:0;top:{top}px;width:{W}px;height:{height}px;z-index:{z}" viewBox="0 0 1080 200" preserveAspectRatio="none"><g{t}>'
            f'<path d="M0 92 C170 22 360 18 545 78 S905 150 1080 66 V200 H0Z" fill="{back}"/>'
            f'<path d="M0 142 C210 84 390 92 575 134 S915 178 1080 118 V200 H0Z" fill="{front}"/></g></svg>')


def chrome(n, section, logo="icon-white"):
    return (f'<div class="chrome"><span class="n">{n:02d}</span><span>{section}</span>'
            f'<img src="assets/logo/logo-{logo}.svg" alt=""></div>')


def ph(src, x, y, w, h, extra="", pos="50% 50%", cls=""):
    return (f'<div class="ph {cls}" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px;{extra}">'
            f'<img src="assets/img/{src}.jpg" style="object-position:{pos}" alt=""></div>')


def txt(x, y, w, html, extra=""):
    """Absolutely placed text block; x is measured from the RIGHT edge (RTL)."""
    return f'<div class="abs" style="right:{x}px;top:{y}px;width:{w}px;{extra}">{html}</div>'


pages = []
P = pages.append

# ================================================================ 01 COVER
P(f'''<section class="page blue">
  {ph("0342", 40, 300, 560, 560, f"border-radius:50%;z-index:2;box-shadow:0 0 0 18px {SUN}", "50% 55%")}
  {rays(320, 580, 330, 410, SUN, 18, 110)}
  <img class="abs" src="assets/logo/logo-h-white.svg" style="right:72px;top:70px;height:112px" alt="بحار الشرق للتسويق والإعلان">
  {txt(72, 300, 360, '<div class="tag">الملف التعريفي 2026</div>'
      '<div class="h1" style="margin-top:22px">نجعلك<br><span class="hl">مرئيّاً</span></div>'
      '<p class="lead" style="margin-top:18px">إعلانك لا ينتظر المارّة…<br>بل يذهب إليهم.</p>')}
  {waves(790, "#5d93c2", "#ffffff", 300, 6)}
  <div class="abs k" style="left:72px;right:72px;bottom:14px;display:flex;justify-content:space-between;z-index:7;color:{SEA};font-weight:700;font-size:17px">
    <span>الشاشات المتنقلة</span><span>الشاشات الثابتة</span><span>شاشات الفعاليات</span><span>التوريد والتركيب</span><span>التسويق الرقمي</span></div>
</section>''')

# ================================================================ 02 MANIFESTO
P(f'''<section class="page yellow">
  {txt(72, 110, 936, '<div class="tag">من قلب عدن</div>'
      '<p class="k" style="font-weight:800;font-size:54px;line-height:1.6;margin-top:30px">'
      'من عدن، حيث تلتقي ثلاثة من البحار السبعة وتُشرق الشمس كل صباح… '
      '<span class="hl">نصنع لعلامتك حضوراً يراه الجميع.</span></p>')}
  {ph("0241", 0, 640, 1080, 440, "", "50% 62%")}
  {waves(600, SUN, SUN, 130, 6, flip=True)}
  <div class="abs cap" style="right:72px;bottom:44px;z-index:7;color:#fff;font-family:Kufi;font-weight:600">شاشاتنا المتنقلة على طرقات عدن</div>
  <div class="abs k" style="left:72px;bottom:44px;z-index:7;color:#fff;font-size:15px;font-weight:600">02</div>
</section>''')

# ================================================================ 03 ABOUT
P(f'''<section class="page white">
  {ph("0369", 0, 0, 470, 1080, "", "38% 50%")}
  <svg class="abs" style="left:420px;top:0;width:110px;height:1080px;z-index:3" viewBox="0 0 110 1080" preserveAspectRatio="none"><path d="M50 0 C110 180 0 360 60 540 S110 900 50 1080 H110 V0Z" fill="#fff"/></svg>
  {txt(72, 96, 450, '<div class="tag">من نحن</div>'
      '<h2 class="h2" style="margin-top:18px;font-size:50px">شريكك الإبداعي<br><span class="hl">في عدن</span></h2>'
      '<p style="margin-top:22px">بحار الشرق شركة إبداعية متكاملة للتسويق والإعلان، تدمج الأفكار الغزيرة بالأدوات المتطورة لصناعة حضور بصري فارق.</p>'
      '<p style="margin-top:14px">نعمل في شوارع المدينة وعلى شاشاتها ومسارحها، ونمتد إلى المنصّات الرقمية؛ ونورّد ونركّب الشاشات العملاقة بصفتنا وكلاء لمصنع متخصص.</p>')}
  <div class="abs" style="right:72px;top:700px;width:450px;display:grid;grid-template-columns:1fr 1fr;gap:26px 30px">
    <div><div class="k" style="font-size:52px;font-weight:900;color:{SEA};line-height:1.2">06</div><div style="font-size:18px">مجالات عمل متكاملة</div></div>
    <div><div class="k ltr" style="font-size:52px;font-weight:900;color:{SEA};line-height:1.2">24/7</div><div style="font-size:18px">شاشات تعمل ليلاً ونهاراً</div></div>
    <div><div class="k ltr" style="font-size:52px;font-weight:900;color:{SEA};line-height:1.2">360°</div><div style="font-size:18px">من الشارع إلى الشاشة إلى الهاتف</div></div>
    <div><div class="k" style="font-size:52px;font-weight:900;color:{SUN};line-height:1.2">01</div><div style="font-size:18px">فريق واحد من الفكرة حتى البث</div></div>
  </div>
  {chrome(3, "من نحن", "icon")}
</section>''')

# ================================================================ 04 VISION / MISSION / VALUES
vals = [("الاحترافية", "في كل خطوة، من التواصل حتى التسليم."), ("الالتزام", "بالمواعيد وبالجودة وبما نعد به."),
        ("الإبداع", "كل فكرة تستحق أن تصبح تحفة بصرية."), ("المرونة", "حلول تناسب كل عميل وميزانيته."),
        ("الشراكة", "علاقات طويلة الأمد مع عملائنا.")]
vhtml = "".join(f'<div><div class="h4">{a}</div><div style="font-size:17px;line-height:1.6;margin-top:6px">{b}</div></div>' for a, b in vals)
P(f'''<section class="page blue">
  <div class="abs circle" style="left:-120px;top:-120px;width:400px;height:400px;background:{SUN}"></div>
  {rays(80, 80, 250, 330, SUN, 14, 150)}
  <div class="abs" style="right:72px;top:96px;width:620px">
    <div class="tag">رؤيتنا</div>
    <p class="k" style="font-weight:700;font-size:36px;line-height:1.7;color:#fff;margin-top:18px">أن نصبح الشركة الرائدة في اليمن والشرق الأوسط في الحلول الدعائية والتسويقية الشاملة، <span class="hl">المبتكرة والفعّالة.</span></p>
  </div>
  <div class="abs" style="right:72px;top:470px;width:600px;border-top:2px solid rgba(255,255,255,.25);padding-top:26px">
    <div class="tag">رسالتنا</div>
    <p style="margin-top:12px;font-size:23px;line-height:1.8">تقديم منظومة متكاملة من الخدمات الدعائية والتسويقية، الإبداعية والرقمية، بكفاءة عالية وجودة عالمية، لتعزيز حضور عملائنا ومضاعفة تأثيرهم في السوق.</p>
  </div>
  <div class="abs yellow" style="left:0;right:0;bottom:0;height:300px;padding:44px 72px 0">
    <div class="tag">قيمنا</div>
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:28px;margin-top:20px">{vhtml}</div>
  </div>
</section>''')

# ================================================================ 05 IDENTITY
P(f'''<section class="page white">
  <div class="abs circle" style="left:-150px;top:120px;width:720px;height:720px;background:{FOAM}"></div>
  <img class="abs" src="assets/logo/logo-icon.svg" style="left:70px;top:250px;width:420px" alt="">
  {txt(72, 96, 470, '<div class="tag">هويتنا</div>'
      '<h2 class="h2" style="margin-top:18px;font-size:50px">شعار يحكي قصة<br><span class="hl">الشرق والبحر والضوء</span></h2>')}
  <div class="abs" style="right:72px;top:370px;width:470px;display:grid;gap:22px">
    <div><div class="h4"><span style="color:{SUN}">●</span> الشمس المشرقة</div><p style="font-size:18px;line-height:1.7">بداية كل حملة؛ رمز النهوض والنمو، ولونها الدافئ للطاقة والأمل والتميّز.</p></div>
    <div><div class="h4"><span style="color:{SUN}">●</span> سبعة أشعة</div><p style="font-size:18px;line-height:1.7">البحار السبعة: طرق التجارة والتواصل والمعرفة، وامتداد تأثيرنا.</p></div>
    <div><div class="h4"><span style="color:{SEA}">●</span> زر التشغيل</div><p style="font-size:18px;line-height:1.7">الإعلام والإنتاج البصري، وفكرة الإطلاق والانطلاق.</p></div>
    <div><div class="h4"><span style="color:{SEA}">●</span> الأمواج الثنائية</div><p style="font-size:18px;line-height:1.7">الحركة المستمرة والتدفّق الإبداعي، بأزرق يمنح الثقة والاحتراف.</p></div>
  </div>
  <div class="abs" style="left:72px;top:880px;display:flex;gap:14px">
    <div style="width:130px"><div style="height:64px;background:{SUN}"></div><div class="cap" style="margin-top:8px">أصفر الشروق<br><b class="ltr">#F6B400</b></div></div>
    <div style="width:130px"><div style="height:64px;background:{SEA}"></div><div class="cap" style="margin-top:8px">أزرق البحر<br><b class="ltr">#1F5F94</b></div></div>
    <div style="width:130px"><div style="height:64px;background:#fff;border:2px solid {FOAM}"></div><div class="cap" style="margin-top:8px">أبيض الوضوح<br><b class="ltr">#FFFFFF</b></div></div>
  </div>
  {chrome(5, "هويتنا", "icon")}
</section>''')

# ================================================================ 06 SERVICES
svcs = [("0363", "01", "الشاشات المتنقلة", "شاحنات LED تجوب الشوارع"),
        ("0044", "02", "الشاشات الثابتة", "شاشات عملاقة في مواقع استراتيجية"),
        ("0215", "03", "الفعاليات والتأجير", "شاشات داخلية وخارجية بأحجام متعددة"),
        ("0135", "04", "التوريد والتركيب", "وكلاء مصنع وتنفيذ تسليم مفتاح"),
        ("0367", "05", "التسويق الرقمي", "إدارة الصفحات والحملات الممولة"),
        ("0122", "06", "الإنتاج الإبداعي", "تصميم، فيديو، 3D وموشن")]
cells = []
for i, (img, n, t, d) in enumerate(svcs):
    col, row = i % 3, i // 3
    x = W - 72 - 250 - col * 318   # right to left
    y = 300 + row * 360
    cells.append(ph(img, x, y, 250, 250, f"border-radius:50%;box-shadow:0 0 0 8px {SUN}", "50% 50%"))
    cells.append(f'<div class="abs" style="left:{x-30}px;top:{y+268}px;width:310px;text-align:center">'
                 f'<div class="k" style="color:{SUN};font-weight:800;font-size:16px">{n}</div>'
                 f'<div class="h4" style="color:#fff">{t}</div><div style="font-size:16px;color:rgba(255,255,255,.75);line-height:1.5">{d}</div></div>')
P(f'''<section class="page blue">
  {txt(72, 90, 936, '<div class="tag">خدماتنا</div><h2 class="h2" style="margin-top:14px">ستة مجالات… <span class="hl">تعمل معاً</span></h2>')}
  {"".join(cells)}
</section>''')

# ================================================================ 07 OPENER · MOBILE
P(f'''<section class="page yellow">
  {ph("0180", -170, 330, 820, 820, "border-radius:50%;z-index:2;box-shadow:0 0 0 22px #fff", "30% 60%")}
  {rays(240, 740, 450, 540, "#fff", 18, 120)}
  <div class="abs k" style="right:72px;top:40px;font-size:300px;font-weight:900;line-height:1.2;color:transparent;-webkit-text-stroke:4px {DEEP}">01</div>
  {txt(72, 420, 470, '<div class="tag">Mobile LED Trucks</div>'
      '<h2 class="h2" style="font-size:66px;margin-top:10px">الشاشات<br>المتنقلة</h2>'
      '<p class="lead" style="margin-top:14px">نحن لا نبيع مساحة إعلانية…<br><b class="k" style="font-weight:800">نحن نحرّك الظهور.</b></p>')}
</section>''')

# ================================================================ 08 MOBILE DETAIL
truck = f'''<svg viewBox="0 0 560 230" style="width:100%">
  <g fill="none" stroke="{SEA}" stroke-width="3">
    <rect x="20" y="20" width="360" height="160" rx="4" fill="{FOAM}"/>
    <rect x="380" y="20" width="0" height="160"/>
    <path d="M380 80 H455 L520 140 V180 H380Z" fill="#fff"/>
    <path d="M392 92 H450 L494 136 H392Z" fill="{FOAM}"/>
    <line x1="10" y1="186" x2="540" y2="186" stroke-width="5"/>
    <circle cx="90" cy="198" r="22" fill="#fff"/><circle cx="450" cy="198" r="22" fill="#fff"/>
  </g>
  <g font-family="Kufi" font-size="17" font-weight="700" fill="{DEEP}" text-anchor="middle">
    <text x="200" y="95">واجهة جانبية</text><text x="200" y="125" direction="ltr" fill="{SEA}">4 × 2 m</text>
  </g></svg>'''
P(f'''<section class="page white">
  {ph("0260", 0, 0, 400, 1080, "", "45% 50%")}
  {ph("0368", 150, 640, 290, 290, f"border-radius:50%;box-shadow:0 0 0 12px #fff;z-index:4", "50% 55%")}
  {txt(72, 90, 520, '<div class="tag">الشاشات المتنقلة</div>'
      '<h2 class="h2" style="margin-top:14px;font-size:50px">إعلانٌ على مسار…<br><span class="hl">لا على جدار</span></h2>'
      '<p style="margin-top:16px">كنّا أول شركة في عدن تقدّم الشاشات الإعلانية المتنقلة. نضع رسالتك على شاشة تتحرك في أكثر الشوارع ازدحاماً، ونركنها حيث يتجمّع جمهورك، بألوان كاملة ليلاً ونهاراً.</p>')}
  <div class="abs" style="right:72px;top:500px;width:520px">
    {truck}
    <div style="display:flex;justify-content:space-between;margin-top:8px;font-family:Kufi;font-weight:700;font-size:17px">
      <span>واجهتان جانبيتان <b class="ltr" style="color:{SEA}">4 × 2 m</b></span><span>واجهة خلفية <b class="ltr" style="color:{SEA}">2 × 2 m</b></span></div>
  </div>
  <ul class="plays abs" style="right:72px;top:800px;width:520px;font-size:18px;grid-template-columns:1fr 1fr;gap:10px 24px">
    <li>شاشات LED Full Color Outdoor</li><li>حجز باليوم أو بالحملة</li>
    <li>مسارات وجدولة حسب جمهورك</li><li>تصميم وإنتاج الإعلان داخلياً</li>
    <li>توزيع على الأسواق وأماكن التجمّع</li><li>توثيق وتقارير بأماكن العرض</li>
  </ul>
  {chrome(8, "الشاشات المتنقلة", "icon")}
</section>''')

# ================================================================ 09 GALLERY
G = [("0069", "MIXA", "55% 50%"), ("0229", "المقبلي للطاقة", "50% 60%"), ("0237", "حملة رمضانية", "60% 50%"),
     ("0099", "TEDx Aden Youth", "50% 50%"), ("0363", "حملة منتجات ليلاً", "50% 60%"), ("0053", "السنابل", "50% 55%")]
gx = [(72, 250, 452, 330), (556, 250, 452, 330), (72, 612, 290, 330), (394, 612, 290, 330), (716, 612, 292, 330)]
cells = []
for (img, cap, pos), (x, y, w, h) in zip(G, gx):
    cells.append(ph(img, x, y, w, h, "", pos))
    cells.append(f'<div class="abs k" style="left:{x}px;top:{y+h+10}px;width:{w}px;text-align:right;font-size:15px;font-weight:600;color:rgba(255,255,255,.85)">{cap}</div>')
P(f'''<section class="page blue">
  {txt(72, 84, 936, '<div class="tag">من أعمالنا</div><h2 class="h2" style="margin-top:12px;font-size:50px">حملات حقيقية… <span class="hl">في شوارع عدن</span></h2>')}
  {"".join(cells)}
  {chrome(9, "الشاشات المتنقلة")}
</section>''')

# ================================================================ 10 FIXED SCREENS
P(f'''<section class="page photo" style="background:#0c2238">
  {ph("0044", 0, 0, 1080, 1080, "", "50% 30%")}
  <div class="abs" style="inset:0;background:linear-gradient(to top,rgba(12,58,99,.96) 0%,rgba(12,58,99,.75) 38%,rgba(12,58,99,0) 62%)"></div>
  <div class="abs k" style="right:72px;top:64px;font-size:200px;font-weight:900;line-height:1.2;color:transparent;-webkit-text-stroke:3px {SUN}">02</div>
  {txt(72, 640, 560, '<div class="tag" style="color:#f6b400">Digital Outdoor</div>'
      '<h2 class="h2" style="color:#fff;margin-top:8px;font-size:52px">شاشة سوق عدن الدولي</h2>'
      '<p style="color:rgba(255,255,255,.82);font-size:20px;margin-top:6px">فوق أكبر سوق تجاري في عدن، في قلب الحركة التجارية؛ أعلى ظهور وأقوى مشاهدة.</p>', "z-index:3")}
  <div class="abs yellow" style="left:72px;top:640px;width:330px;padding:28px 30px;z-index:3;display:grid;gap:14px">
    <div><div class="k ltr" style="font-size:44px;font-weight:900;line-height:1.2">10 × 6 m</div><div style="font-size:16px">مساحة عرض 60 م²</div></div>
    <div style="border-top:2px solid rgba(12,58,99,.2);padding-top:12px"><div class="k ltr" style="font-size:44px;font-weight:900;line-height:1.2">24/7</div><div style="font-size:16px">تشغيل على مدار الساعة</div></div>
    <div style="border-top:2px solid rgba(12,58,99,.2);padding-top:12px"><div class="k" style="font-size:30px;font-weight:900;line-height:1.4">آلاف الزوار</div><div style="font-size:16px">يومياً أمام شاشتك</div></div>
  </div>
  {chrome(10, "الشاشات الثابتة")}
</section>''')

# ================================================================ 11 EVENTS
P(f'''<section class="page white">
  {ph("0372", 0, 0, 1080, 560, "", "50% 55%")}
  {waves(470, "#9cc0e0", "#ffffff", 120, 3)}
  {ph("0071", 72, 470, 300, 300, f"border-radius:50%;box-shadow:0 0 0 12px #fff;z-index:4", "50% 60%")}
  {txt(72, 610, 560, '<div class="tag">03 · شاشات الفعاليات والتأجير</div>'
      '<h2 class="h2" style="margin-top:10px;font-size:48px">اجعل اللحظة <span class="hl">عملاقة</span></h2>'
      '<p style="margin-top:10px;font-size:20px">نؤجّر شاشات LED داخلية وخارجية عملاقة بأحجام متعددة، ونتولّى التركيب والتشغيل والتفكيك للمؤتمرات والإطلاقات والمهرجانات والبث الجماهيري.</p>')}
  <ul class="plays abs" style="left:72px;top:820px;width:360px;font-size:17px;gap:6px">
    <li>شاشات داخلية للقاعات والمؤتمرات</li><li>شاشات خارجية للساحات والمباريات</li><li>فريق فني يدير البث طوال الحدث</li></ul>
  <div class="abs" style="right:72px;top:930px;width:560px;font-size:16px">وثق بنا: <b class="ltr" style="color:{SEA}">TEDx Aden Youth</b> · <b class="ltr" style="color:{SEA}">Yemen Angel Investment Network</b></div>
  {chrome(11, "الفعاليات والتأجير", "icon")}
</section>''')

# ================================================================ 12 IMPORT (blueprint)
def cabinet(x, y, s):
    g = [f'<rect x="{x}" y="{y}" width="{s}" height="{s}" fill="rgba(255,255,255,.06)"/>']
    for i in range(1, 3): g.append(f'<line x1="{x+i*s/3}" y1="{y}" x2="{x+i*s/3}" y2="{y+s}"/>')
    for j in range(1, 6): g.append(f'<line x1="{x}" y1="{y+j*s/6}" x2="{x+s}" y2="{y+j*s/6}"/>')
    return "".join(g)

def poster(x, y, w, h):
    g = [f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="rgba(255,255,255,.06)"/>',
         f'<line x1="{x+w/2}" y1="{y}" x2="{x+w/2}" y2="{y+h}"/>']
    for j in range(1, 12): g.append(f'<line x1="{x}" y1="{y+j*h/12}" x2="{x+w}" y2="{y+j*h/12}"/>')
    g.append(f'<path d="M{x-14} {y+h+14} H{x+w+14} M{x+6} {y+h} v14 M{x+w-6} {y+h} v14"/>')
    return "".join(g)

def dim(x1, y1, x2, y2, label, vertical=False):
    lx, ly = (x1 + x2) / 2, (y1 + y2) / 2
    t = (f'<text x="{lx - 14}" y="{ly}" transform="rotate(-90 {lx - 14} {ly})" text-anchor="middle">{label}</text>' if vertical
         else f'<text x="{lx}" y="{ly - 12}" text-anchor="middle">{label}</text>')
    tick = (f'<path d="M{x1-8} {y1} h16 M{x2-8} {y2} h16"/>' if vertical else f'<path d="M{x1} {y1-8} v16 M{x2} {y2-8} v16"/>')
    return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke-dasharray="6 6"/>{tick}{t}'

bp = f'''<svg class="abs" style="left:72px;top:320px;width:936px;height:440px" viewBox="0 -20 936 440">
  <g stroke="#fff" stroke-width="2" fill="none">{cabinet(560, 70, 280)}<rect x="870" y="70" width="36" height="280" fill="rgba(255,255,255,.06)"/>
    {poster(150, 40, 110, 330)}</g>
  <g stroke="{SUN}" stroke-width="2" fill="{SUN}" font-family="Kufi" font-size="17" font-weight="700" style="direction:ltr">
    {dim(560, 50, 840, 50, "960 mm")}{dim(540, 70, 540, 350, "960 mm", True)}{dim(870, 372, 906, 372, "")}
    <text x="888" y="400" text-anchor="middle">120</text>
    {dim(150, 22, 260, 22, "640 mm")}{dim(128, 40, 128, 370, "1920 mm", True)}
  </g></svg>'''
spec = lambda rows: "".join(f'<div style="display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.18);font-size:16px"><span style="color:rgba(255,255,255,.7)">{a}</span><b class="ltr" style="color:#fff;font-weight:700">{b}</b></div>' for a, b in rows)
P(f'''<section class="page blue" style="background-image:linear-gradient(rgba(255,255,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.06) 1px,transparent 1px);background-size:36px 36px">
  {txt(72, 84, 620, '<div class="tag">04 · الاستيراد والتوريد والتركيب</div>'
      '<h2 class="h2" style="margin-top:12px;font-size:50px">شاشات LED… <span class="hl">من المصنع إلى مشروعك</span></h2>')}
  <div class="abs yellow k" style="left:72px;top:110px;padding:14px 24px;font-weight:800;font-size:20px;line-height:1.5">وكيل مصنع <span class="ltr">EnBon</span><div style="font-family:Almarai;font-weight:400;font-size:15px">لشاشات LED · الصين</div></div>
  {bp}
  <div class="abs" style="right:72px;top:770px;width:420px">
    <div class="k ltr" style="font-size:26px;font-weight:800;color:{SUN};display:block;text-align:right">OUTDOOR P5</div>
    {spec([("الحماية", "IP65"), ("معدل التحديث", "≥ 7680 Hz"), ("الخدمة", "Front + Rear")])}
  </div>
  <div class="abs" style="left:72px;top:770px;width:420px">
    <div class="k ltr" style="font-size:26px;font-weight:800;color:{SUN};display:block;text-align:right">INDOOR P2.5 POSTER</div>
    {spec([("نوع الـ LED", "SMD2121 · GOB"), ("معدل التحديث", "3840 Hz"), ("التحكم", "Novastar · Wi-Fi · HDMI")])}
  </div>
  {chrome(12, "الاستيراد والتوريد")}
</section>''')

# ================================================================ 13 TURNKEY
steps = [("المعاينة", "دراسة الموقع والمسافة وزاوية الرؤية"), ("الاختيار", "الدقة والمقاس والتقنية المناسبة"),
         ("التوريد", "مباشرة من المصنع بضمان الجودة"), ("التركيب", "الهيكل المعدني والتركيب الآمن"),
         ("التشغيل", "نظام التحكم والمحتوى الأول"), ("الدعم", "صيانة ودعم فني متواصل")]
st = "".join(f'<div style="text-align:center"><div class="k" style="width:64px;height:64px;margin:0 auto;border-radius:50%;background:{SUN};color:{DEEP};font-weight:900;font-size:22px;display:grid;place-items:center">{i+1:02d}</div>'
             f'<div class="h4" style="margin-top:10px">{a}</div><div style="font-size:15px;line-height:1.55;color:#3d5673">{b}</div></div>' for i, (a, b) in enumerate(steps))
P(f'''<section class="page white">
  {ph("0187", 72, 84, 300, 540, "", "50% 30%")}
  {ph("0151", 392, 84, 300, 540, "", "50% 50%")}
  {txt(72, 84, 300, '<div class="tag">تسليم مفتاح</div>'
      '<h2 class="h2" style="margin-top:12px;font-size:42px">ننفّذ شاشتك <span class="hl">من المعاينة حتى أول بث</span></h2>'
      '<p style="font-size:18px;margin-top:10px">فريق هندسي وميداني يتولى المشروع كاملاً؛ جهة واحدة مسؤولة عن كل التفاصيل.</p>')}
  <svg class="abs" style="left:72px;top:722px;width:936px;height:60px" viewBox="0 0 936 60" preserveAspectRatio="none"><path d="M0 30 C80 0 150 60 234 30 S390 0 468 30 S624 60 702 30 S858 0 936 30" stroke="{SEA}" stroke-width="3" fill="none" stroke-dasharray="8 8"/></svg>
  <div class="abs" style="left:72px;right:72px;top:720px;display:grid;grid-template-columns:repeat(6,1fr);gap:14px;direction:rtl">{st}</div>
  {chrome(13, "التنفيذ", "icon")}
</section>''')

# ================================================================ 14 TEAM
P(f'''<section class="page yellow">
  {ph("0089", 0, 0, 560, 1080, "", "50% 45%")}
  {txt(72, 96, 400, '<div class="tag">فريقنا</div>'
      '<h2 class="h2" style="margin-top:14px">فريق واحد<br><span class="hl">من الفكرة حتى التنفيذ</span></h2>'
      '<p style="margin-top:16px;font-size:20px">مهندسون وفنيون ميدانيون، مصممون ومصوّرون ومحررو فيديو، ومسوّقون يديرون الحملات؛ يعملون معاً على كل مشروع.</p>')}
  {ph("0169", 620, 560, 190, 190, "border-radius:50%;box-shadow:0 0 0 8px #fff", "50% 20%")}
  {ph("0203", 825, 560, 190, 190, "border-radius:50%;box-shadow:0 0 0 8px #fff", "50% 30%")}
  {ph("0185", 720, 740, 190, 190, "border-radius:50%;box-shadow:0 0 0 8px #fff;z-index:2", "50% 40%")}
  {chrome(14, "فريقنا", "icon")}
</section>''')

# ================================================================ 15 DIGITAL & CREATIVE
caps = ["إدارة الصفحات والحملات الممولة", "الاستراتيجية والتخطيط التسويقي", "الهوية البصرية وتصميم الشعارات",
        "التصميم الجرافيكي والمطبوعات", "التصوير والمونتاج والإخراج الفني", "الموشن جرافيك والأنيميشن",
        "فيديوهات 3D ثلاثية الأبعاد", "إعلانات CGI و FOOH"]
P(f'''<section class="page blue">
  {ph("0122", 72, 440, 400, 400, f"border-radius:50%;box-shadow:0 0 0 16px {SUN}", "50% 55%")}
  {rays(272, 640, 225, 290, SUN, 14, 120)}
  {txt(72, 84, 560, '<div class="tag">05 · 06 · التسويق الرقمي والإنتاج الإبداعي</div>'
      '<h2 class="h2" style="margin-top:12px;font-size:52px">من الشارع…<br><span class="hl">إلى شاشة هاتفك</span></h2>'
      '<p style="margin-top:12px;font-size:20px">كل شاشة تحتاج محتوى يستحق المشاهدة. نصمّم ونصوّر وننتج، ثم ننقل الحملة إلى المنصّات الرقمية.</p>')}
  <ul class="plays abs" style="right:72px;top:500px;width:470px;font-size:20px;gap:12px;font-family:Kufi;font-weight:600">{"".join(f"<li>{c}</li>" for c in caps)}</ul>
  <div class="abs cap" style="left:102px;top:870px;width:340px;text-align:center;color:rgba(255,255,255,.8)">محتوى ثلاثي الأبعاد من إنتاجنا على إحدى شاشاتنا</div>
  {chrome(15, "التسويق الرقمي والإنتاج")}
</section>''')

# ================================================================ 16 WHY + HOW
why = [("الرواد في عدن", "أول من قدّم الشاشات الإعلانية المتنقلة في المدينة."), ("إنتاج داخلي", "فريقنا يصنع المحتوى من الفكرة حتى البث."),
       ("منظومة واحدة", "الشارع والشاشة والفعالية والمنصّات لدى جهة واحدة."), ("وكلاء مصنع", "توريد مباشر للشاشات بضمان ودعم فني."),
       ("مرونة", "حلول وعروض تناسب حجم كل عميل وميزانيته."), ("فهم الجمهور", "نعرف الثقافة المحلية ونخاطبها بفعالية.")]
wh = "".join(f'<div style="border-top:3px solid {SUN};padding-top:12px"><div class="h3">{a}</div><div style="font-size:18px;line-height:1.65;color:#3d5673">{b}</div></div>' for a, b in why)
how = ["نفهم", "نخطّط", "نُنتج", "نُطلق", "نوسّع", "نوثّق"]
hw = "".join(f'<div style="text-align:center"><div class="k" style="font-size:15px;color:{SUN};font-weight:800">{i+1:02d}</div><div class="k" style="font-size:24px;font-weight:800">{h}</div></div>' for i, h in enumerate(how))
P(f'''<section class="page white">
  {txt(72, 84, 936, '<div class="tag">لماذا بحار الشرق</div><h2 class="h2" style="margin-top:12px;font-size:52px">ستة أسباب <span class="hl">لتُبحر معنا</span></h2>')}
  <div class="abs" style="right:72px;left:72px;top:300px;display:grid;grid-template-columns:repeat(3,1fr);gap:46px 36px">{wh}</div>
  <div class="abs blue" style="left:0;right:0;top:720px;height:360px;padding:46px 72px 0">
    <div class="tag">كيف نعمل</div>
    <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-top:26px">{hw}</div>
    <div style="height:2px;background:rgba(255,255,255,.25);margin-top:22px"></div>
    <p style="font-size:17px;margin-top:14px">نفهم هدفك وجمهورك، نخطّط القنوات والمواقع، نُنتج المحتوى، نُطلقه على الشاشات، نوسّعه رقمياً، ثم نوثّق النتائج.</p>
  </div>
  {chrome(16, "لماذا نحن")}
</section>''')

# ================================================================ 17 PARTNERS
names = ["بنك عدن الإسلامي للتمويل الأصغر", "الجامعة الألمانية الدولية – عدن", "TEDx Aden Youth", "Yemen Angel Investment Network",
         "MIXA", "المقبلي للطاقة", "السنابل", "NAS Group", "EPC", "Crystal", "شركة الجيلاني التجارية"]
nm = "".join(f'<span class="k" style="font-weight:800;font-size:30px;line-height:1.6;white-space:nowrap;unicode-bidi:isolate">{n}</span><span style="color:#fff;font-size:30px"> ● </span>' for n in names)
P(f'''<section class="page yellow">
  {txt(72, 84, 936, '<div class="tag">شركاء النجاح</div><h2 class="h2" style="margin-top:12px">ثقة متبادلة… <span class="hl">شراكة مستدامة</span></h2>')}
  <div class="abs" style="right:72px;left:72px;top:300px;line-height:1.9">{nm}<span class="k" style="font-weight:800;font-size:30px;opacity:.55">وغيرهم</span></div>
  {ph("0229", 0, 760, 1080, 320, "", "50% 62%")}
  {waves(700, SUN, SUN, 110, 6, flip=True)}
  <div class="abs" style="left:72px;bottom:44px;z-index:7;color:#fff;font-family:Kufi;font-weight:600;font-size:15px">17</div>
</section>''')

# ================================================================ 18 BACK COVER
P(f'''<section class="page blue">
  <img class="abs" src="assets/logo/logo-v-white.svg" style="left:380px;top:110px;width:320px;z-index:4" alt="">
  <div class="abs" style="left:72px;right:72px;top:590px;text-align:center">
    <div class="h2" style="font-size:46px">جاهز لتكون <span class="hl">مرئيّاً؟</span></div>
    <div style="display:flex;justify-content:center;gap:40px;margin-top:22px;font-family:Kufi;font-weight:700;font-size:26px">
      <span class="ltr">784 007 800</span><span style="color:{SUN}">|</span><span class="ltr">784 006 800</span></div>
    <div style="display:flex;justify-content:center;gap:34px;margin-top:10px;font-size:19px;color:rgba(255,255,255,.85)">
      <span class="ltr">www.bahrshrq.com</span><span class="ltr">info@baharalsharq.com</span><span class="ltr">@bahrshrq</span></div>
    <div style="margin-top:6px;font-size:18px;color:rgba(255,255,255,.75)">عدن – المنصورة، ريمي، خلف الحجاز</div>
  </div>
  <div class="abs" style="left:72px;top:600px;background:#fff;padding:10px;z-index:4"><img src="assets/qr.svg" style="width:110px;height:110px" alt=""></div>
  {waves(880, "#5d93c2", SUN, 200, 6)}
</section>''')

html = f'''<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8">
<title>بحار الشرق — الملف التعريفي 2026</title>
<link rel="stylesheet" href="profile.css"></head>
<body>
{"".join(pages)}
</body></html>'''
open("index.html", "w").write(html)
print(len(pages), "pages")
