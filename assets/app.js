(() => {
  "use strict";

  const PRODUCTS = window.PRODUCTS || [];
  const INITIATIVES = (window.INITIATIVES || []).map((x, i) => ({ ...x, id: i + 1 }));
  const STORE_KEY = "bankshield.decision-file.v1";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const ar = (n) => Number(n).toLocaleString("ar-IQ");
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pad = (n, w) => String(n).padStart(w, "0");
  const keyP = (p) => "P-" + pad(p.id, 3);
  const keyI = (x) => "M-" + pad(x.id, 2);

  const PRIO = { high: "عالية", mid: "متوسطة", low: "منخفضة" };
  const SECTION_LABEL = {
    "منتجات الودائع الإسلامية": "الودائع والاستثمار",
    "منتجات الائتمان الإسلامي": "الائتمان والتمويل",
    "المنتجات المتنوعة": "الحسابات والبطاقات والخدمات",
  };

  /* ---------- state ---------- */
  let store = { items: {}, meta: {} };
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) store = Object.assign(store, JSON.parse(raw));
  } catch (_) { /* storage unavailable: work in memory */ }
  const save = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (_) {} };

  const view = { section: "all", cat: "", sharia: "", q: "", onlySel: false, iniCat: "" };

  /* ---------- lookup ---------- */
  const byKey = new Map();
  PRODUCTS.forEach((p) => byKey.set(keyP(p), { type: "product", key: keyP(p), ...p }));
  INITIATIVES.forEach((x) => byKey.set(keyI(x), { type: "initiative", key: keyI(x), ...x }));

  /* ---------- stamp svg ---------- */
  const stampSVG = `
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" stroke-width="3"/>
      <circle cx="50" cy="50" r="39" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="2 3"/>
      <text x="50" y="47" text-anchor="middle" font-size="19" fill="currentColor">مُختار</text>
      <text x="50" y="66" text-anchor="middle" font-size="10" fill="currentColor">لدراسة الجدوى</text>
    </svg>`;
  const checkSVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`;
  const plusSVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>`;

  const pickBtn = (key, name) => {
    const on = !!store.items[key];
    return `<button type="button" class="pick" data-pick="${key}" aria-pressed="${on}" aria-label="${on ? "إزالة" : "اختيار"} ${esc(name)}">
      ${on ? checkSVG + "مُختار" : plusSVG + "اختيار"}</button>`;
  };

  /* ---------- initiatives ---------- */
  function renderIniFilter() {
    const cats = {};
    INITIATIVES.forEach((x) => { const c = x.cat.split("/")[0].trim(); cats[c] = (cats[c] || 0) + 1; });
    const host = $("[data-ini-filter]");
    host.innerHTML =
      `<button type="button" class="chip" data-ini-cat="" aria-pressed="${!view.iniCat}">الكل <small>${ar(INITIATIVES.length)}</small></button>` +
      Object.entries(cats).map(([c, n]) =>
        `<button type="button" class="chip" data-ini-cat="${esc(c)}" aria-pressed="${view.iniCat === c}">${esc(c)} <small>${ar(n)}</small></button>`
      ).join("");
  }

  function renderInitiatives() {
    const list = INITIATIVES.filter((x) => !view.iniCat || x.cat.split("/")[0].trim() === view.iniCat);
    $("[data-initiatives]").innerHTML = list.map((x) => {
      const k = keyI(x);
      return `<article class="ini card ${store.items[k] ? "is-picked" : ""}" data-key="${k}">
        <div class="card__serial"><span>${k}</span><span class="ini__cat">${esc(x.cat)}</span></div>
        <h3>${esc(x.name)}</h3>
        <p>${esc(x.desc)}</p>
        ${pickBtn(k, x.name)}
        <div class="stamp">${stampSVG}</div>
      </article>`;
    }).join("");
  }

  /* ---------- catalog ---------- */
  const sections = [...new Set(PRODUCTS.map((p) => p.sec))];

  function renderTabs() {
    const tabs = [["all", "كل المنتجات", PRODUCTS.length]].concat(
      sections.map((s) => [s, SECTION_LABEL[s] || s, PRODUCTS.filter((p) => p.sec === s).length])
    );
    $("[data-sections]").innerHTML = tabs.map(([v, label, n]) =>
      `<button type="button" role="tab" class="tab" data-section="${esc(v)}" aria-selected="${view.section === v}">${esc(label)}<small>${ar(n)}</small></button>`
    ).join("");
  }

  function renderCats() {
    const pool = PRODUCTS.filter((p) => view.section === "all" || p.sec === view.section);
    const cats = [];
    pool.forEach((p) => { const c = cats.find((x) => x[0] === p.cat); c ? c[1]++ : cats.push([p.cat, 1]); });
    $("[data-cats]").innerHTML =
      `<button type="button" class="chip" data-cat="" aria-pressed="${!view.cat}">كل الفئات</button>` +
      cats.map(([c, n]) => `<button type="button" class="chip" data-cat="${esc(c)}" aria-pressed="${view.cat === c}">${esc(c)} <small>${ar(n)}</small></button>`).join("");
  }

  function renderSharia() {
    const counts = {};
    PRODUCTS.forEach((p) => p.sharia.split("+").map((s) => s.trim()).forEach((s) => { counts[s] = (counts[s] || 0) + 1; }));
    const opts = Object.entries(counts).filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1]);
    $("[data-sharia]").insertAdjacentHTML("beforeend",
      opts.map(([s, n]) => `<option value="${esc(s)}">${esc(s)} (${ar(n)})</option>`).join(""));
  }

  const norm = (s) => s.replace(/[إأآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/[ً-ْ]/g, "").toLowerCase();

  function filtered() {
    const q = norm(view.q.trim());
    return PRODUCTS.filter((p) =>
      (view.section === "all" || p.sec === view.section) &&
      (!view.cat || p.cat === view.cat) &&
      (!view.sharia || p.sharia.includes(view.sharia)) &&
      (!view.onlySel || store.items[keyP(p)]) &&
      (!q || norm([p.name, p.desc, p.target, p.sharia, p.cat, keyP(p)].join(" ")).includes(q))
    );
  }

  function renderProducts() {
    const list = filtered();
    let html = "", lastCat = null;
    const groupCounts = {};
    list.forEach((p) => { groupCounts[p.cat] = (groupCounts[p.cat] || 0) + 1; });
    list.forEach((p) => {
      if (p.cat !== lastCat) {
        lastCat = p.cat;
        const secLabel = view.section === "all" ? ` · ${esc(SECTION_LABEL[p.sec] || p.sec)}` : "";
        html += `<h3 class="group-title">${esc(p.cat)} <small>${ar(groupCounts[p.cat])} منتجات${secLabel}</small></h3>`;
      }
      const k = keyP(p);
      html += `<article class="card ${store.items[k] ? "is-picked" : ""}" data-key="${k}">
        <div class="card__serial"><span>${k}</span><span></span></div>
        <h3>${esc(p.name)}</h3>
        <p>${esc(p.desc)}</p>
        <dl class="card__facts">
          <div><dt>الصيغة:</dt><dd class="tag-sharia">${esc(p.sharia)}</dd></div>
          <div><dt>تستهدف:</dt><dd>${esc(p.target)}</dd></div>
        </dl>
        ${pickBtn(k, p.name)}
        <div class="stamp">${stampSVG}</div>
      </article>`;
    });
    $("[data-products]").innerHTML = html;
    $("[data-empty]").hidden = list.length > 0;
    const sel = list.filter((p) => store.items[keyP(p)]).length;
    $("[data-result-line]").textContent = list.length
      ? `يظهر ${ar(list.length)} من ${ar(PRODUCTS.length)} منتجاً` + (sel ? ` — منها ${ar(sel)} مختارة` : "")
      : "";
  }

  /* ---------- decision file ---------- */
  function updateCounts() {
    const n = Object.keys(store.items).length;
    $$("[data-count]").forEach((el) => (el.textContent = ar(n)));
    $("[data-count-label]").textContent = n === 0 ? "لم يُختر شيء بعد" : n === 1 ? "عنصر في ملف القرار" : "عناصر في ملف القرار";
    $("[data-bar]").style.width = Math.min(100, (n / 20) * 100) + "%";
  }

  function orderedItems() {
    return Object.keys(store.items)
      .map((k) => ({ ...byKey.get(k), ...store.items[k] }))
      .filter((x) => x.key)
      .sort((a, b) => (a.type === b.type ? a.key.localeCompare(b.key) : a.type === "initiative" ? -1 : 1));
  }

  function renderFile() {
    const items = orderedItems();
    const host = $("[data-file-list]");
    $$("[data-export-csv],[data-print],[data-copy],[data-clear]").forEach((b) => (b.disabled = items.length === 0));
    if (!items.length) {
      host.innerHTML = `<div class="file-empty"><b>الملف فارغ</b>اضغطوا «اختيار» على أي مبادرة أو منتج لإضافته هنا.</div>`;
      return;
    }
    const groups = [
      ["المبادرات", items.filter((x) => x.type === "initiative")],
      ...sections.map((s) => [SECTION_LABEL[s] || s, items.filter((x) => x.type === "product" && x.sec === s)]),
    ].filter(([, g]) => g.length);
    host.innerHTML = groups.map(([title, g]) => `
      <div class="file-group">
        <h3>${esc(title)} — ${ar(g.length)}</h3>
        ${g.map((x) => `
          <div class="file-item" data-key="${x.key}">
            <div class="file-item__top">
              <div class="file-item__name"><code>${x.key}</code>${esc(x.name)}<small>${esc(x.type === "product" ? x.cat : x.cat)}</small></div>
              <div class="prio" role="group" aria-label="الأولوية">
                ${Object.entries(PRIO).map(([p, l]) => `<button type="button" data-p="${p}" aria-pressed="${x.prio === p}">${l}</button>`).join("")}
              </div>
            </div>
            <input class="file-item__note" type="text" placeholder="ملاحظة للدراسة (اختياري)" value="${esc(x.note || "")}" aria-label="ملاحظة ${esc(x.name)}">
            <button type="button" class="file-item__remove" data-remove>إزالة من الملف</button>
          </div>`).join("")}
      </div>`).join("");
  }

  function toggle(key) {
    if (store.items[key]) delete store.items[key];
    else store.items[key] = { prio: "mid", note: "", t: Date.now() };
    save();
    const on = !!store.items[key];
    $$(`[data-key="${key}"]`).forEach((card) => {
      if (!card.classList.contains("card")) return;
      card.classList.toggle("is-picked", on);
      const name = byKey.get(key).name;
      card.querySelector(".pick").outerHTML = pickBtn(key, name);
    });
    updateCounts();
    if (view.onlySel) renderProducts();
    toast(on ? "أُضيف إلى ملف القرار" : "أُزيل من ملف القرار");
  }

  /* ---------- exports ---------- */
  const rows = () => orderedItems().map((x) => ({
    "الرقم": x.key,
    "النوع": x.type === "initiative" ? "مبادرة" : "منتج",
    "الاسم": x.name,
    "القسم": x.type === "initiative" ? "المبادرات الاستراتيجية" : x.sec,
    "الفئة / التصنيف": x.cat,
    "الصيغة الشرعية": x.sharia || "",
    "الفئة المستهدفة": x.target || "",
    "الوصف": x.desc,
    "الأولوية": PRIO[x.prio] || "",
    "ملاحظات الإدارة": x.note || "",
  }));

  function exportCSV() {
    const data = rows();
    const head = Object.keys(data[0]);
    const cell = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = "﻿" + [head.map(cell).join(","), ...data.map((r) => head.map((h) => cell(r[h])).join(","))].join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `ملف-القرار-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast("نُزّل ملف القرار");
  }

  function copyList() {
    const text = orderedItems().map((x, i) =>
      `${i + 1}. [${x.key}] ${x.name} — الأولوية: ${PRIO[x.prio]}${x.note ? " — " + x.note : ""}`).join("\n");
    const done = () => toast("نُسخت القائمة");
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done));
    else fallbackCopy(text, done);
  }
  function fallbackCopy(text, done) {
    const t = document.createElement("textarea"); t.value = text; document.body.appendChild(t); t.select();
    try { document.execCommand("copy"); done(); } catch (_) { toast("تعذّر النسخ — استخدموا تنزيل Excel"); }
    t.remove();
  }

  function printMemo() {
    const items = orderedItems();
    const m = store.meta || {};
    const date = m.date || new Date().toISOString().slice(0, 10);
    const byPrio = (p) => items.filter((x) => x.prio === p).length;
    const table = (list) => `<table><thead><tr><th>الرقم</th><th>الاسم</th><th>الفئة</th><th>الصيغة الشرعية</th><th>الأولوية</th><th>ملاحظات</th></tr></thead><tbody>
      ${list.map((x) => `<tr><td>${x.key}</td><td>${esc(x.name)}</td><td>${esc(x.cat)}</td><td>${esc(x.sharia || "—")}</td><td>${PRIO[x.prio]}</td><td>${esc(x.note || "")}</td></tr>`).join("")}
    </tbody></table>`;
    const ini = items.filter((x) => x.type === "initiative");
    const prod = items.filter((x) => x.type === "product");
    $("[data-memo]").innerHTML = `
      <h1>مذكرة قرار: المنتجات المختارة لدراسة الجدوى</h1>
      <p class="memo__meta">الجهة المقرِّرة: ${esc(m.committee || "………………………")} &nbsp;|&nbsp; التاريخ: ${esc(date)} &nbsp;|&nbsp;
        إجمالي المختار: ${ar(items.length)} (أولوية عالية ${ar(byPrio("high"))}، متوسطة ${ar(byPrio("mid"))}، منخفضة ${ar(byPrio("low"))})</p>
      ${ini.length ? `<h2>أولاً: المبادرات الاستراتيجية (${ar(ini.length)})</h2>${table(ini)}` : ""}
      ${prod.length ? `<h2>${ini.length ? "ثانياً" : "أولاً"}: المنتجات (${ar(prod.length)})</h2>${table(prod)}` : ""}
      <p>توصي الإدارة بإعداد دراسة جدوى كاملة للعناصر أعلاه، بدءاً بالعناصر ذات الأولوية العالية.</p>
      <div class="memo__sign"><div>المدير العام</div><div>مدير تطوير المنتجات</div><div>هيئة الرقابة الشرعية</div></div>`;
    window.print();
  }

  /* ---------- drawer ---------- */
  let lastFocus = null;
  function openFile() {
    lastFocus = document.activeElement;
    renderFile();
    $("[data-meta=committee]").value = store.meta.committee || "";
    $("[data-meta=date]").value = store.meta.date || "";
    $("[data-drawer]").hidden = false;
    document.body.style.overflow = "hidden";
    $(".drawer__panel .icon-btn").focus();
  }
  function closeFile() {
    $("[data-drawer]").hidden = true;
    document.body.style.overflow = "";
    renderInitiatives(); renderProducts();
    if (lastFocus) lastFocus.focus();
  }

  /* ---------- toast ---------- */
  let tt;
  function toast(msg) {
    const el = $("[data-toast]");
    el.textContent = msg; el.classList.add("show");
    clearTimeout(tt); tt = setTimeout(() => el.classList.remove("show"), 1600);
  }

  /* ---------- events ---------- */
  document.addEventListener("click", (e) => {
    const t = e.target.closest("button, [data-close-file]");
    if (!t) return;
    if (t.dataset.pick) return toggle(t.dataset.pick);
    if ("iniCat" in t.dataset) { view.iniCat = t.dataset.iniCat; renderIniFilter(); renderInitiatives(); return; }
    if (t.dataset.section) { view.section = t.dataset.section; view.cat = ""; renderTabs(); renderCats(); renderProducts(); return; }
    if ("cat" in t.dataset) { view.cat = t.dataset.cat; renderCats(); renderProducts(); return; }
    if ("reset" in t.dataset) { resetFilters(); return; }
    if ("openFile" in t.dataset) return openFile();
    if ("closeFile" in t.dataset) return closeFile();
    if ("exportCsv" in t.dataset) return exportCSV();
    if ("print" in t.dataset) return printMemo();
    if ("copy" in t.dataset) return copyList();
    if ("clear" in t.dataset) {
      if (confirm("إفراغ ملف القرار بالكامل؟")) { store.items = {}; save(); updateCounts(); renderFile(); toast("أُفرغ الملف"); }
      return;
    }
    const item = t.closest(".file-item");
    if (item) {
      const k = item.dataset.key;
      if (t.dataset.p) { store.items[k].prio = t.dataset.p; save(); $$("button", t.parentElement).forEach((b) => b.setAttribute("aria-pressed", b === t)); }
      if ("remove" in t.dataset) { delete store.items[k]; save(); updateCounts(); renderFile(); }
    }
  });

  document.addEventListener("input", (e) => {
    const t = e.target;
    if (t.matches("[data-search]")) { view.q = t.value; renderProducts(); }
    else if (t.matches(".file-item__note")) { store.items[t.closest(".file-item").dataset.key].note = t.value; save(); }
    else if (t.dataset.meta) { store.meta[t.dataset.meta] = t.value; save(); }
  });
  document.addEventListener("change", (e) => {
    const t = e.target;
    if (t.matches("[data-sharia]")) { view.sharia = t.value; renderProducts(); }
    if (t.matches("[data-only-selected]")) { view.onlySel = t.checked; renderProducts(); }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !$("[data-drawer]").hidden) closeFile();
  });

  function resetFilters() {
    Object.assign(view, { section: "all", cat: "", sharia: "", q: "", onlySel: false });
    $("[data-search]").value = ""; $("[data-sharia]").value = ""; $("[data-only-selected]").checked = false;
    renderTabs(); renderCats(); renderProducts();
  }

  /* ---------- guilloche hero ---------- */
  function guilloche() {
    const cv = $(".hero__guilloche");
    if (!cv || !cv.getContext) return;
    const ctx = cv.getContext("2d");
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let W, H, progress = reduceMotion ? 1 : 0, raf;

    // Rosettes: epitrochoid curves, the security linework of banknotes
    const rosette = (cx, cy, R, r, d, turns, color, alpha, p) => {
      ctx.beginPath();
      const steps = 2400 * p;
      for (let i = 0; i <= steps; i++) {
        const t = (i / 2400) * Math.PI * 2 * turns;
        const x = cx + (R + r) * Math.cos(t) - d * Math.cos(((R + r) / r) * t);
        const y = cy + (R + r) * Math.sin(t) - d * Math.sin(((R + r) / r) * t);
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.strokeStyle = color; ctx.globalAlpha = alpha; ctx.lineWidth = .7; ctx.stroke();
    };
    const waves = (y0, amp, n, color, p) => {
      for (let k = 0; k < n; k++) {
        ctx.beginPath();
        for (let x = 0; x <= W * p; x += 4) {
          const y = y0 + Math.sin(x / 38 + k * .42) * amp + Math.sin(x / 113 + k) * amp * .6 + k * 2.2;
          x ? ctx.lineTo(W - x, y) : ctx.moveTo(W - x, y);
        }
        ctx.strokeStyle = color; ctx.globalAlpha = .22; ctx.lineWidth = .6; ctx.stroke();
      }
    };

    function size() {
      const r = cv.getBoundingClientRect();
      W = r.width; H = r.height;
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function draw() {
      ctx.clearRect(0, 0, W, H);
      const s = Math.min(1, W / 1200);
      const cx = W < 760 ? W * .12 : W * .16, cy = H * .36;
      const p = 1 - Math.pow(1 - progress, 3);
      rosette(cx, cy, 120 * s + 40, 23 * s + 7, 70 * s + 22, 23, "#5A4A8C", .35, p);
      rosette(cx, cy, 80 * s + 26, 17 * s + 5, 48 * s + 16, 17, "#0F3B37", .28, p);
      rosette(cx, cy, 44 * s + 14, 9 * s + 3, 24 * s + 8, 9, "#A9822B", .45, p);
      waves(H - 70, 9, 14, "#5A4A8C", p);
      ctx.globalAlpha = 1;
    }
    function tick() {
      progress = Math.min(1, progress + 0.012);
      draw();
      if (progress < 1) raf = requestAnimationFrame(tick);
    }
    size(); reduceMotion ? draw() : tick();
    let rt;
    window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { size(); draw(); }, 120); });
  }

  /* ---------- init ---------- */
  renderIniFilter(); renderInitiatives();
  renderTabs(); renderCats(); renderSharia(); renderProducts();
  updateCounts();
  guilloche();
})();
