"""Builds website/index.html from src/index.src.html.
Fills {{img:...}}, {{icon:...}} and the repeated blocks, with real image sizes
(width/height) and responsive srcset so the page never shifts while loading.
Run from website/:  python3 src/build.py
"""
import re
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
IMG = ROOT / "assets/img"

ICONS = {
 "arrow": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>',
 "play": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M10 8v8l6-4z" fill="currentColor"/></svg>',
 "playfill": '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4v16l13-8z" fill="#0b2c4d"/></svg>',
 "download": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M6 11l6 6 6-6M4 21h16"/></svg>',
 "up": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6"/></svg>',
 "phone": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1 1 .4 1.9.7 2.8a2 2 0 01-.5 2.1L8.1 9.9a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.4c.9.3 1.8.6 2.8.7a2 2 0 011.7 2z"/></svg>',
 "mail": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2.5 6l9.5 7 9.5-7"/></svg>',
 "pin": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s7-6.2 7-12a7 7 0 10-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.6"/></svg>',
 "whatsapp": '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm0 18.2a8.2 8.2 0 01-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1112 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1c-.2.2-.3.2-.5.1a6.7 6.7 0 01-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 00-.7.3 3 3 0 00-.9 2.2 5.2 5.2 0 001.1 2.7 11.8 11.8 0 004.5 4c1.7.7 2.3.8 3.2.7a2.7 2.7 0 001.8-1.3 2.2 2.2 0 00.2-1.3c-.1-.1-.3-.2-.5-.3z"/></svg>',
 "facebook": '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M14 8V6.2c0-.8.2-1.2 1.4-1.2H17V2h-2.6C11.5 2 10.6 3.6 10.6 6v2H8.5v3h2.1v11H14V11h2.6l.4-3z"/></svg>',
 "instagram": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>',
 "x": '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.8 3h3.1l-6.8 7.7 8 10.3h-6.2l-4.9-6.3L5.4 21H2.3l7.3-8.3L2 3h6.4l4.4 5.8zm-1.1 16.2h1.7L7.4 4.7H5.6z"/></svg>',
 "tiktok": '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.6 2h-3.3v13.2a2.9 2.9 0 11-2.9-2.9c.3 0 .6 0 .9.1V9a6.3 6.3 0 105.3 6.2V8.6a8 8 0 004.4 1.3V6.6a4.5 4.5 0 01-4.4-4.6z"/></svg>',
 "youtube": '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M22 8.2a3 3 0 00-2.1-2.1C18 5.6 12 5.6 12 5.6s-6 0-7.9.5A3 3 0 002 8.2 31 31 0 001.6 12 31 31 0 002 15.8a3 3 0 002.1 2.1c1.9.5 7.9.5 7.9.5s6 0 7.9-.5a3 3 0 002.1-2.1 31 31 0 00.4-3.8 31 31 0 00-.4-3.8zM10 15V9l5.2 3z"/></svg>',
}


def img(idn, sizes="100vw", alt="", extra="", lazy=True):
    lg, sm = IMG / f"{idn}.webp", IMG / f"{idn}-sm.webp"
    w, h = Image.open(lg).size
    sw = Image.open(sm).size[0]
    load = ' loading="lazy" decoding="async"' if lazy else ' fetchpriority="high"'
    return (f'<img src="assets/img/{idn}.webp" srcset="assets/img/{idn}-sm.webp {sw}w, assets/img/{idn}.webp {w}w" '
            f'sizes="{sizes}" width="{w}" height="{h}" alt="{alt}"{load} {extra}>').replace(" >", ">")


SERVICES = [
 ("0363", "01", "الشاشات المتنقلة", "شاحنات بشاشات LED ملوّنة تجوب شوارع عدن وتقف حيث يتجمّع جمهورك، ليلاً ونهاراً.", ["3 واجهات", "حجز يومي", "تقارير"], "#mobile"),
 ("0044", "02", "الشاشات الثابتة", "شاشات عملاقة في مواقع استراتيجية، أبرزها شاشة سوق عدن الدولي بمساحة 60 م².", ["10×6 م", "24/7", "آلاف الزوار"], "#fixed"),
 ("0215", "03", "شاشات الفعاليات", "تأجير شاشات داخلية وخارجية بأحجام متعددة مع التركيب والتشغيل والبث.", ["مؤتمرات", "مهرجانات", "بث مباشر"], "#events"),
 ("0187", "04", "التوريد والتركيب", "وكلاء لمصنع شاشات LED — ننفّذ مشاريع الشاشات العملاقة تسليم مفتاح.", ["Outdoor P5", "Indoor P2.5", "صيانة"], "#supply"),
 ("0367", "05", "التسويق الرقمي", "إدارة الصفحات والحملات الممولة وصناعة المحتوى الذي يحمل حملتك إلى كل هاتف.", ["إعلانات ممولة", "محتوى", "تحليل"], "#digital"),
 ("0122", "06", "الإنتاج الإبداعي", "هوية بصرية، تصميم، تصوير، مونتاج، موشن جرافيك ومحتوى 3D لشاشاتنا ومنصّاتك.", ["هوية", "موشن", "3D / CGI"], "#digital"),
]
STEPS = [("نفهم", "هدفك وجمهورك وميزانيتك."), ("نخطّط", "القنوات والمواقع والتوقيت."), ("نُنتج", "محتوى جاهز لكل شاشة ومنصّة."),
         ("نُطلق", "على الشاحنات والشاشات والفعاليات."), ("نوسّع", "الحملة رقمياً إلى الهواتف."), ("نوثّق", "صور وتقارير بما تم عرضه.")]
GALLERY = [
 ("0180", "mobile", "حملة رمضانية ليلاً"), ("0069", "mobile", "MIXA — إطلاق مشروب طاقة"), ("0369", "events", "مهرجان على كورنيش عدن"),
 ("0368", "mobile", "السنابل — حملة ليلية"), ("0175", "fixed", "شاشة سوق عدن الدولي"), ("0241", "mobile", "EPC — أمام جبال عدن"),
 ("0215", "events", "بث جماهيري في ساحة مفتوحة"), ("0260", "mobile", "الجامعة الألمانية الدولية – عدن"), ("0135", "install", "تركيب الهيكل المعدني"),
 ("0237", "mobile", "في قلب حركة المرور"), ("0099", "mobile", "TEDx Aden Youth"), ("0372", "events", "فعالية جماهيرية"),
 ("0229", "mobile", "المقبلي للطاقة"), ("0151", "install", "فريقنا على الارتفاع"), ("0080", "mobile", "NAS Group"),
 ("0062", "fixed", "موقع شاشة سوق عدن الدولي"), ("0124", "mobile", "محتوى 3D على الشاشة"), ("0187", "install", "التخطيط في الموقع"),
 ("0113", "mobile", "وضوح عالٍ نهاراً"), ("0078", "events", "مهرجان الإفطار"), ("0350", "mobile", "حملة منتجات ليلاً"),
]
CLIENTS = [("بنك عدن الإسلامي", "للتمويل الأصغر"), ("الجامعة الألمانية الدولية", "عدن"), ("TEDx Aden Youth", "فعاليات"),
           ("Yemen Angel Network", "فعاليات"), ("MIXA", "مشروبات"), ("المقبلي للطاقة", "طاقة"), ("السنابل", "أغذية"),
           ("NAS Group", "سفر وسياحة"), ("EPC", "خدمات"), ("Crystal", "شراكة"), ("الجيلاني التجارية", "تجارة"), ("وغيرهم", "في عدن واليمن")]
MARQ = ["الشاشات المتنقلة", "الشاشات الثابتة", "شاشات الفعاليات", "توريد وتركيب", "تسويق رقمي", "موشن جرافيك", "3D", "هوية بصرية"]
MARQ2 = ["MIXA", "المقبلي للطاقة", "TEDx Aden Youth", "السنابل", "NAS Group", "الجامعة الألمانية الدولية", "EPC", "Crystal", "بنك عدن الإسلامي"]


def build():
    s = (ROOT / "src/index.src.html").read_text()
    s = s.replace(' style-hook', '').replace(' class="mt"', '')
    s = s.replace("{{marquee}}", "".join(f"<span>{m}</span>" for m in MARQ * 4))
    s = s.replace("{{marquee2}}", "".join(f"<span>{m}</span>" for m in MARQ2 * 3))
    s = s.replace("{{services}}", "".join(
        f'<a class="svc" href="{href}">{img(i, "(max-width:1023px) 100vw, 32vw", t)}<span class="num">{n}</span>'
        f'<div class="body"><h3>{t}</h3><p>{d}</p><ul>{"".join(f"<li>{x}</li>" for x in tags)}</ul></div></a>'
        for i, n, t, d, tags, href in SERVICES))
    s = s.replace("{{steps}}", "".join(
        f'<div class="step" data-reveal><div class="dot">{k+1:02d}</div><h3>{a}</h3><p>{b}</p></div>' for k, (a, b) in enumerate(STEPS)))
    s = s.replace("{{gallery}}", "".join(
        f'<figure class="g-item" data-cat="{c}" tabindex="0" role="button" aria-label="عرض: {cap}" data-full="assets/img/{i}.webp">'
        f'{img(i, "(max-width:700px) 50vw, 25vw", cap)}<figcaption>{cap}</figcaption></figure>' for i, c, cap in GALLERY))
    s = s.replace("{{clients}}", "".join(f'<div class="client" data-reveal>{a}<small>{b}</small></div>' for a, b in CLIENTS))
    s = re.sub(r"\{\{img:([^|}]+)\|([^|}]*)\|([^|}]*)(?:\|([^}]*))?\}\}", lambda m: img(m[1], m[2], m[3], m[4] or ""), s)
    s = re.sub(r"\{\{icon:(\w+)\}\}", lambda m: ICONS[m[1]], s)
    assert "{{" not in s, re.findall(r"\{\{[^}]*\}\}", s)[:3]
    (ROOT / "index.html").write_text(s)
    print("index.html", len(s) // 1024, "KB")


if __name__ == "__main__":
    build()
