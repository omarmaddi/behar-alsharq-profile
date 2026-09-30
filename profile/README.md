# بحار الشرق — الملف التعريفي 2026

- **الملف النهائي:** `Bahar-Al-Sharq-Profile-2026.pdf` (18 صفحة، مقاس مربع 1080×1080)
- **نسخة خفيفة للجوال:** `Bahar-Al-Sharq-Profile-2026-mobile.pdf`
- **معاينة الصفحات:** مجلد `preview/`
- **المصدر:** `build.py` يولّد `index.html` + `profile.css` (الخطوط والشعارات والصور داخل `assets/`)

## إعادة التوليد بعد أي تعديل
```bash
cd profile
python3 build.py
node render.js --png   # يتطلب Playwright + Chromium
```
