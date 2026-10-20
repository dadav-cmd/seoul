/* 大谷マップinSeoul
   データ: data/spots.json  地図: Leaflet + OpenStreetMap タイル */
(function () {
  "use strict";

  // ---------- 定数 ----------
  const CATEGORIES = {
    architecture: { label: "建築・アート", glyph: "建" },
    cafe:         { label: "カフェ・飲食", glyph: "喫" },
    shop:         { label: "ショップ",     glyph: "店" },
    park:         { label: "公園・庭園",   glyph: "園" },
    public:       { label: "公共施設",     glyph: "公" }
  };
  const WARDS = ["鍾路区","中区","龍山区","城東区","広津区","東大門区","中浪区","城北区","江北区","道峰区","蘆原区","恩平区","西大門区","麻浦区","陽川区","江西区","九老区","衿川区","永登浦区","銅雀区","冠岳区","瑞草区","江南区","松坡区","江東区"];
  const WEEKDAYS = ["日","月","火","水","木","金","土"];
  const CITY_CENTER = [37.5665, 126.9780]; // ソウル市庁
  // claude.ai 上のプレビューでは外部の地図画像と端末の位置情報が使えないため、
  // 区境の簡易地図と「仮の現在地」で代用する。GitHub Pages 版では undefined。
  const PREVIEW = window.TDM_PREVIEW || null;
  const STATIONS = [
    ["ソウル駅", 37.5547, 126.9707], ["市庁駅", 37.5657, 126.9769], ["明洞駅", 37.5609, 126.9863],
    ["景福宮駅", 37.5759, 126.9735], ["安国駅", 37.5765, 126.9854], ["東大門歴史文化公園駅", 37.5652, 127.0080],
    ["弘大入口駅", 37.5572, 126.9245], ["梨泰院駅", 37.5345, 126.9946], ["聖水駅", 37.5446, 127.0559],
    ["狎鴎亭ロデオ駅", 37.5273, 127.0405], ["江南駅", 37.4979, 127.0276], ["蚕室駅", 37.5133, 127.1001]
  ];
  // 「気分で探す」ボタン：韓国モチーフのイラストつきのテーマ絞り込み
  const hasTag = (s, list) => (s.tags || []).some((t) => list.includes(t));
  const MOODS = [
    { id: "food", label: "焼肉・グルメ", test: (s) => s.category === "cafe",
      icon: '<path class="i-line" d="M11 7.5c-1.6-1.6 1.6-2.6 0-4.6M16 7.5c-1.6-1.6 1.6-2.6 0-4.6M21 7.5c-1.6-1.6 1.6-2.6 0-4.6"/><ellipse class="i-dark" cx="16" cy="19.5" rx="13" ry="7.5"/><ellipse class="i-grate" cx="16" cy="18.7" rx="10.5" ry="5.3"/><path class="i-grate-line" d="M6.5 18.7h19M8 16h16M8 21.4h16"/><rect class="i-meat" x="8.6" y="15" width="8" height="3.4" rx="1.7" transform="rotate(-10 12.6 16.7)"/><rect class="i-meat" x="15.6" y="18.6" width="8" height="3.4" rx="1.7" transform="rotate(8 19.6 20.3)"/><path class="i-fat" d="M10 16.4l5-.9M17 19.8l5 .7"/>' },
    { id: "beauty", label: "コスメ・お買い物", test: (s) => s.category === "shop",
      icon: '<rect class="i-gold" x="5" y="15.5" width="8" height="12.5" rx="1.6"/><rect class="i-gold-dark" x="6.2" y="10" width="5.6" height="6"/><path class="i-red" d="M6.2 10V5.6Q9.4 2.2 11.8 4.8V10z"/><circle class="i-pink" cx="22.5" cy="21" r="7.5"/><circle class="i-blush" cx="22.5" cy="21" r="4.6"/><path class="i-blue" d="M25 4.5l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9z"/>' },
    { id: "palace", label: "宮殿・韓屋", test: (s) => hasTag(s, ["宮殿", "韓屋", "世界遺産", "王陵", "門", "城郭"]),
      icon: '<path class="i-dark" d="M1.5 12.5Q16 3 30.5 12.5Q27.5 11.6 25.5 13.6H6.5Q4.5 11.6 1.5 12.5z"/><rect class="i-green" x="6" y="13.6" width="20" height="2.4"/><path class="i-col" d="M8.5 16v10.5M14 16v10.5M18 16v10.5M23.5 16v10.5"/><rect class="i-stone" x="4" y="26.5" width="24" height="3" rx="1"/>' },
    { id: "night", label: "夜景・漢江", test: (s) => hasTag(s, ["夜景", "漢江", "展望"]),
      icon: '<path class="i-gold" d="M19.5 3.5a9 9 0 1 0 9 12.5 7 7 0 1 1-9-12.5z"/><circle class="i-gold" cx="7" cy="6" r="1.2"/><circle class="i-gold" cx="11" cy="11" r=".9"/><path class="i-wave" d="M2 22.5q3.5-3 7 0t7 0 7 0 7 0M2 27.5q3.5-3 7 0t7 0 7 0 7 0"/>' },
    { id: "arch", label: "名建築めぐり", test: (s) => s.category === "architecture" && (s.designers || []).length > 0,
      icon: '<path class="i-silver" d="M3 28Q3 11 15 8.5Q28 9 29 28z"/><path class="i-silver-line" d="M7 28Q8 15 15 12.5M12 28q1-9 6-12.5M19 28q.5-7 4-10"/><circle class="i-red" cx="25" cy="7" r="3"/>' }
  ];
  const RADIUS_LABEL = { 500: "500m", 1000: "1km", 3000: "3km" };
  const WALK_M_PER_MIN = 80; // 不動産広告の徒歩分速に合わせる

  // ---------- 状態 ----------
  const state = {
    spots: [],
    filters: { cats: new Set(), ward: "", mood: "", tourist: false, designed: false, indoor: false, free: false, openToday: false, q: "" },
    radius: 3000,
    here: null,          // 現在地 L.LatLng
    selectedId: null,
    view: "list"
  };

  // ---------- DOM ----------
  const $ = (s) => document.querySelector(s);
  const el = {
    q: $("#q"), filterBtn: $("#filter-btn"), filterCount: $("#filter-count"), filters: $("#filters"),
    catChips: $("#cat-chips"), ward: $("#ward"), reset: $("#filter-reset"), close: $("#filter-close"),
    locate: $("#locate"), toast: $("#toast"), sheet: $("#sheet"), handle: $("#sheet-handle"),
    listView: $("#list-view"), detailView: $("#detail-view"), detail: $("#detail"), back: $("#back"),
    list: $("#list"), listEmpty: $("#list-empty"), listCount: $("#list-count"), listBasis: $("#list-basis"),
    stage: document.querySelector(".stage")
  };

  // ---------- 地図 ----------
  const map = L.map("map", {
    center: CITY_CENTER, zoom: 12, minZoom: 10, maxZoom: 18,
    zoomControl: false, attributionControl: false, maxBounds: [[37.30, 126.60], [37.80, 127.35]]
  });
  L.control.zoom({ position: "topright" }).addTo(map);
  L.control.attribution({ position: "topleft", prefix: (PREVIEW ? "プレビュー（簡易地図）｜" : "") + '<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>' }).addTo(map);

  if (PREVIEW) buildPreviewBase(); else buildTileBase();

  function buildPreviewBase() {
    map.getContainer().classList.add("is-preview");
    L.geoJSON(PREVIEW.wards, {
      interactive: false,
      filter: (f) => !f.properties.river,
      style: () => ({ className: "ward", weight: 1 }),
      attribution: "区境：southkorea/seoul-maps を加工"
    }).addTo(map);
    // 漢江：北岸の区と南岸の区の境界線（＝川の中心線）を太い水色の線で描く
    L.geoJSON(PREVIEW.wards, {
      interactive: false,
      filter: (f) => !!f.properties.river,
      style: () => ({ className: "river", weight: 16, lineCap: "round", lineJoin: "round" })
    }).addTo(map);
    const labels = L.layerGroup();
    PREVIEW.wards.features.filter((f) => !f.properties.river).forEach((f) => {
      L.marker([f.properties.lat, f.properties.lng], {
        interactive: false, keyboard: false,
        icon: L.divIcon({ className: "ward-label", html: `<span>${f.properties.name}</span>`, iconSize: [0, 0] })
      }).addTo(labels);
    });
    STATIONS.forEach(([n, lat, lng]) => {
      L.marker([lat, lng], {
        interactive: false, keyboard: false,
        icon: L.divIcon({ className: "station", html: `<i></i><span>${n}</span>`, iconSize: [0, 0] })
      }).addTo(labels);
    });
    labels.addTo(map);
    const zoomClass = () => { const z = map.getZoom(); map.getContainer().dataset.z = z < 13 ? "low" : z >= 15 ? "high" : "mid"; };
    map.on("zoomend", zoomClass); zoomClass();
  }

  function buildTileBase() {
  // CARTO の地図タイルは API キーが必要になったため、キー不要の OpenStreetMap を使う。
  // 「淡色」は同じタイルを CSS で淡く表示したもの（ピンを見やすくするため）。
  const osmAttr = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';
  const pale = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, className: "tiles-pale", attribution: osmAttr });
  const osm = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: osmAttr });
  pale.addTo(map);
  L.control.layers({ "淡色地図": pale, "カラー地図（OpenStreetMap）": osm }, null, { position: "topright" }).addTo(map);
  }

  const cluster = L.markerClusterGroup({
    disableClusteringAtZoom: 15, showCoverageOnHover: false, spiderfyOnMaxZoom: false, maxClusterRadius: 48,
    iconCreateFunction: (c) => L.divIcon({ html: `<div class="cluster">${c.getChildCount()}</div>`, className: "", iconSize: [40, 40] })
  });
  map.addLayer(cluster);
  const markers = new Map(); // id -> L.Marker

  let hereMarker = null, hereAccuracy = null, watchId = null, firstFix = true;

  // ---------- ユーティリティ ----------
  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function distanceM(a, b) {
    const R = 6371000, toRad = (d) => d * Math.PI / 180;
    const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function fmtDist(m) { return m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`; }
  function fmtWalk(m) { const min = Math.max(1, Math.ceil(m / WALK_M_PER_MIN)); return min > 60 ? "徒歩圏外" : `徒歩${min}分`; }
  function catColor(cat) { return `var(--cat-${cat})`; }
  let toastTimer = null;
  function toast(msg, ms = 4200) {
    el.toast.textContent = msg; el.toast.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.toast.hidden = true; }, ms);
  }
  function origin() {
    return state.here ? { latlng: state.here, label: "現在地から近い順" } : { latlng: map.getCenter(), label: "地図の中心から近い順" };
  }
  // closedDays: 配列＝定休曜日（空配列は定休日なし）、null／未設定＝未確認
  function isOpenToday(s) { return !(s.closedDays || []).includes(new Date().getDay()); }
  function closedKnown(s) { return Array.isArray(s.closedDays); }

  // ---------- 絞り込み ----------
  function matches(s) {
    const f = state.filters;
    if (f.cats.size && !f.cats.has(s.category)) return false;
    if (f.ward && s.ward !== f.ward) return false;
    if (f.tourist && !s.tourist) return false;
    if (f.mood) { const m = MOODS.find((x) => x.id === f.mood); if (m && !m.test(s)) return false; }
    if (f.designed && !(s.designers && s.designers.length)) return false;
    if (f.indoor && !s.indoor) return false;
    if (f.free && s.free !== true) return false;
    if (f.openToday && !isOpenToday(s)) return false;
    if (f.q) {
      const hay = [s.name, s.nameKo, s.ward, s.address, ...(s.designers || []), ...(s.tags || []), CATEGORIES[s.category]?.label].join(" ").toLowerCase();
      if (!f.q.toLowerCase().split(/\s+/).filter(Boolean).every((w) => hay.includes(w))) return false;
    }
    return true;
  }
  function activeFilterCount() {
    const f = state.filters;
    return f.cats.size + (f.ward ? 1 : 0) + [f.mood, f.tourist, f.designed, f.indoor, f.free, f.openToday].filter(Boolean).length;
  }

  // ---------- マーカー ----------
  function pinIcon(s, selected) {
    const c = CATEGORIES[s.category];
    return L.divIcon({
      className: "",
      html: `<div class="pin${selected ? " is-selected" : ""}" style="--c:${catColor(s.category)}"><span>${c.glyph}</span></div>`,
      iconSize: [30, 30], iconAnchor: [15, 30]
    });
  }
  function buildMarkers() {
    state.spots.forEach((s) => {
      const m = L.marker([s.lat, s.lng], { icon: pinIcon(s, false), title: s.name, keyboard: true, alt: s.name });
      m.on("click", () => openDetail(s.id, { pan: false }));
      markers.set(s.id, m);
    });
  }
  function renderMarkers() {
    cluster.clearLayers();
    const visible = state.spots.filter(matches).map((s) => markers.get(s.id));
    cluster.addLayers(visible);
  }
  function setSelected(id) {
    if (state.selectedId && markers.has(state.selectedId)) {
      const prev = state.spots.find((s) => s.id === state.selectedId);
      markers.get(state.selectedId).setIcon(pinIcon(prev, false)).setZIndexOffset(0);
    }
    state.selectedId = id;
    if (id && markers.has(id)) {
      const s = state.spots.find((x) => x.id === id);
      markers.get(id).setIcon(pinIcon(s, true)).setZIndexOffset(1000);
    }
  }

  // ---------- 一覧 ----------
  function renderList() {
    const o = origin();
    const base = { lat: o.latlng.lat, lng: o.latlng.lng };
    const rows = state.spots.filter(matches)
      .map((s) => ({ s, d: distanceM(base, s) }))
      .sort((a, b) => a.d - b.d);
    const inRange = state.radius ? rows.filter((r) => r.d <= state.radius) : rows;

    el.listBasis.textContent = o.label;
    el.listCount.textContent = `${inRange.length}件` + (state.radius ? ` / ${RADIUS_LABEL[state.radius]}以内` : "");
    el.list.innerHTML = inRange.map(({ s, d }) => {
      const c = CATEGORIES[s.category];
      const who = s.designers && s.designers.length ? s.designers.join("・") : c.label;
      return `<li><button class="item" type="button" data-id="${esc(s.id)}" style="--c:${catColor(s.category)}">
        <span class="item-icon" aria-hidden="true">${c.glyph}</span>
        <span><span class="item-name">${esc(s.name)}${s.tourist ? '<span class="tour-pill">観光</span>' : ""}</span><span class="item-sub">${esc(s.ward)}・${esc(who)}</span></span>
        <span class="item-dist">${fmtDist(d)}<small>${fmtWalk(d)}</small></span>
      </button></li>`;
    }).join("");

    if (!inRange.length) {
      el.listEmpty.hidden = false;
      el.listEmpty.textContent = rows.length
        ? `この範囲には該当するスポットがありません。範囲を広げると${rows.length}件見つかります。`
        : "아이고〜！条件に合うスポットがありません。絞り込みや「気分で探す」をゆるめてください。";
    } else {
      el.listEmpty.hidden = true;
    }
  }

  // ---------- 詳細 ----------
  function openDetail(id, { pan = true } = {}) {
    const s = state.spots.find((x) => x.id === id);
    if (!s) return;
    setSelected(id);
    const c = CATEGORIES[s.category];
    const o = origin();
    const d = distanceM({ lat: o.latlng.lat, lng: o.latlng.lng }, s);
    const closed = !closedKnown(s) ? "未確認"
      : s.closedDays.length ? (s.closedDays.map((n) => WEEKDAYS[n]).join("・") + "曜（祝日・臨時休あり）") : "定休日なし";
    const openNow = !closedKnown(s) ? "" : (isOpenToday(s) ? "（今日は開いている日）" : "（今日は休み）");
    const designers = s.designers && s.designers.length
      ? s.designers.map((n, i) => `<strong>${esc(n)}</strong>${s.designerTypes && s.designerTypes[i] && s.designerTypes[i] !== "建築家" ? `（${esc(s.designerTypes[i])}）` : ""}`).join("・")
      : "設計者情報なし";
    // 位置は目安のため、地図アプリでは韓国語の施設名で検索させる（韓国ではGoogleマップの徒歩経路が使えない）
    const q = encodeURIComponent(s.nameKo);
    const naver = `https://map.naver.com/p/search/${q}`;
    const kakao = `https://map.kakao.com/link/search/${q}`;
    const google = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(s.nameKo + " " + s.address)}&travelmode=transit`;
    const official = s.url || `https://www.google.com/search?q=${encodeURIComponent(s.nameKo + " 공식")}`;

    el.detail.innerHTML = `
      <span class="cat-tag" style="--c:${catColor(s.category)}">${c.label}</span>
      <h2>${esc(s.name)}</h2>
      <p class="name-ko"><span lang="ko">${esc(s.nameKo)}</span><button type="button" class="copy-btn" id="copy-ko">韓国語名をコピー</button></p>
      <p class="byline">${designers}${s.year ? `<span class="year">　${esc(s.year)}</span>` : ""}</p>
      <p class="summary">${esc(s.summary)}</p>
      ${s.highlights && s.highlights.length ? `<div class="highlights"><h3>見どころ</h3><ul>${s.highlights.map((h) => `<li>${esc(h)}</li>`).join("")}</ul></div>` : ""}
      <dl class="facts">
        <dt>所在地</dt><dd><span lang="ko">${esc(s.address)}</span></dd>
        ${state.here ? `<dt>距離</dt><dd><span class="mono">${fmtDist(d)}</span>（${fmtWalk(d)}・現在地から）</dd>` : ""}
        <dt>見学</dt><dd>${esc(s.visit || "未確認")}</dd>
        <dt>休み</dt><dd>${esc(closed)}${openNow}</dd>
        <dt>料金</dt><dd>${s.free === true ? "無料" : s.free === false ? "有料" : "未確認"}</dd>
        <dt>屋内外</dt><dd>${s.indoor ? "屋内（雨の日OK）" : "屋外中心"}</dd>
      </dl>
      ${s.tags && s.tags.length ? `<ul class="tags">${s.tags.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}
      <p class="route-label">経路を開く</p>
      <div class="actions">
        <a class="action primary" href="${naver}" target="_blank" rel="noopener">NAVER地図</a>
        <a class="action primary" href="${kakao}" target="_blank" rel="noopener">KakaoMap</a>
        <a class="action" href="${google}" target="_blank" rel="noopener">Googleマップ（電車）</a>
      </div>
      <div class="actions">
        <a class="action" href="${official}" target="_blank" rel="noopener">${s.url ? "公式サイト" : "公式サイトを探す"}</a>
        <button class="action" type="button" id="show-on-map">地図で見る</button>
      </div>
      <p class="notice">${noticeText(s)}<br><span class="mono">${esc(s.id)}</span></p>`;

    $("#show-on-map").addEventListener("click", () => { focusOn(s); setSheet("min"); });
    $("#copy-ko").addEventListener("click", (e) => {
      const btn = e.currentTarget;
      const done = () => { btn.textContent = "コピーしました"; setTimeout(() => { btn.textContent = "韓国語名をコピー"; }, 1600); };
      const fallback = () => { const r = document.createRange(); r.selectNodeContents(btn.previousElementSibling); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); toast("韓国語名を選択しました。長押しでコピーできます。"); };
      try { navigator.clipboard.writeText(s.nameKo).then(done, fallback); } catch (err) { fallback(); }
    });
    el.listView.hidden = true; el.detailView.hidden = false; state.view = "detail";
    el.detailView.scrollTop = 0;
    if (pan) focusOn(s); else ensureVisible(s);
    if (el.sheet.dataset.state === "min") setSheet("peek");
    try { location.replace("#" + s.id); } catch (e) { /* 埋め込み表示では無視 */ }
  }
  function noticeText(s) {
    const parts = [];
    if (s.status === "checked") parts.push(`<span class="mono">${esc(s.checkedAt || "")}</span> にウェブで開館・所在を確認しました。時間や料金は公式情報でご確認ください。`);
    else parts.push("営業・開館状況は未確認です。出かける前に公式情報でご確認ください。");
    if (s.approx) parts.push("地図上の位置は目安です。経路ボタンは韓国語の施設名で検索します。");
    return parts.join("<br>");
  }
  function closeDetail() {
    setSelected(null);
    el.detailView.hidden = true; el.listView.hidden = false; state.view = "list";
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) { /* 埋め込み表示では無視 */ }
    renderList();
  }
  function focusOn(s) {
    map.flyTo([s.lat, s.lng], Math.max(map.getZoom(), 16), { duration: 0.6 });
  }
  function ensureVisible(s) {
    if (!map.getBounds().pad(-0.15).contains([s.lat, s.lng])) map.panTo([s.lat, s.lng]);
  }

  // ---------- シート ----------
  function setSheet(st) {
    el.sheet.dataset.state = st;
    el.handle.setAttribute("aria-expanded", String(st === "full"));
    el.handle.setAttribute("aria-label", st === "full" ? "一覧を縮める" : "一覧を広げる");
    requestAnimationFrame(syncSheetOffset);
    setTimeout(syncSheetOffset, 280);
  }
  function syncTopbar() {
    const tb = document.querySelector(".topbar");
    if (tb) document.documentElement.style.setProperty("--topbar-h", tb.offsetHeight + "px");
  }
  function syncSheetOffset() {
    syncTopbar();
    const wide = window.matchMedia("(min-width: 900px)").matches;
    el.stage.style.setProperty("--sheet-peek", wide ? "0px" : el.sheet.offsetHeight + "px");
  }

  // ---------- 現在地 ----------
  function startLocate() {
    if (PREVIEW) { togglePicker(); return; }
    if (!("geolocation" in navigator)) { toast("この端末では位置情報を使えません。"); return; }
    if (!window.isSecureContext) { toast("位置情報は https のページでのみ使えます。GitHub Pages で開いてください。"); return; }
    el.locate.classList.add("is-busy");
    firstFix = true;
    watchId = navigator.geolocation.watchPosition(onPosition, onPositionError, { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 });
  }
  function stopLocate() {
    if (watchId !== null && !PREVIEW) navigator.geolocation.clearWatch(watchId);
    watchId = null; state.here = null;
    if (hereMarker) { map.removeLayer(hereMarker); hereMarker = null; }
    if (hereAccuracy) { map.removeLayer(hereAccuracy); hereAccuracy = null; }
    el.locate.setAttribute("aria-pressed", "false"); el.locate.classList.remove("is-busy");
    refresh();
  }
  function onPosition(pos) {
    const ll = L.latLng(pos.coords.latitude, pos.coords.longitude);
    state.here = ll;
    el.locate.classList.remove("is-busy"); el.locate.setAttribute("aria-pressed", "true");
    if (!hereMarker) {
      hereMarker = L.marker(ll, { icon: L.divIcon({ className: "", html: '<div class="here-dot"></div>', iconSize: [18, 18] }), interactive: false, zIndexOffset: 2000 }).addTo(map);
      hereAccuracy = L.circle(ll, { radius: pos.coords.accuracy, color: "#1F6BFF", weight: 1, opacity: .4, fillOpacity: .08, interactive: false }).addTo(map);
    } else {
      hereMarker.setLatLng(ll); hereAccuracy.setLatLng(ll).setRadius(pos.coords.accuracy);
    }
    if (firstFix) {
      firstFix = false;
      const inSeoul = ll.lat > 37.42 && ll.lat < 37.71 && ll.lng > 126.76 && ll.lng < 127.19;
      if (inSeoul) map.flyTo(ll, 15, { duration: 0.8 });
      else toast("現在地がソウル市外のため、地図は移動しません。距離は現在地から計算します。");
    }
    refresh();
  }
  function onPositionError(err) {
    el.locate.classList.remove("is-busy");
    const msg = {
      1: "位置情報の利用が許可されていません。ブラウザの設定でこのサイトの位置情報を許可してください。",
      2: "現在地を取得できませんでした。電波の良い場所で再度お試しください。",
      3: "現在地の取得に時間がかかっています。もう一度ボタンを押してください。"
    }[err.code] || "現在地を取得できませんでした。";
    toast(msg, 6000);
    if (err.code === 1) stopLocate();
  }

  // ---------- プレビュー用：仮の現在地 ----------
  let picker = null, placing = false;
  function buildPicker() {
    picker = document.createElement("div");
    picker.className = "picker"; picker.id = "picker"; picker.hidden = true;
    picker.setAttribute("role", "dialog"); picker.setAttribute("aria-label", "仮の現在地を選ぶ");
    picker.innerHTML = `
      <p class="picker-title">現在地を仮に置く</p>
      <p class="picker-note">プレビューでは端末の位置情報を使えないため、駅を選ぶか地図をタップして現在地の代わりにします。</p>
      <div class="picker-stations">${STATIONS.map(([n], i) => `<button type="button" class="chip" data-st="${i}">${n}</button>`).join("")}</div>
      <div class="picker-actions">
        <button type="button" class="text-btn" id="pick-tap">地図をタップして置く</button>
        <button type="button" class="text-btn" id="pick-clear" hidden>仮の現在地を消す</button>
      </div>`;
    el.stage.appendChild(picker);
    picker.addEventListener("click", (e) => {
      const st = e.target.closest("[data-st]");
      if (st) { const [, lat, lng] = STATIONS[Number(st.dataset.st)]; fakePosition(lat, lng); togglePicker(false); return; }
      if (e.target.id === "pick-tap") { placing = true; togglePicker(false); map.getContainer().classList.add("is-placing"); toast("地図上の現在地にしたい場所をタップしてください。", 8000); }
      if (e.target.id === "pick-clear") { togglePicker(false); stopLocate(); toast("仮の現在地を消しました。"); }
    });
    map.on("click", (e) => {
      if (!placing) return;
      placing = false; map.getContainer().classList.remove("is-placing");
      fakePosition(e.latlng.lat, e.latlng.lng); el.toast.hidden = true;
    });
  }
  function togglePicker(open) {
    if (!picker) buildPicker();
    const willOpen = open ?? picker.hidden;
    picker.hidden = !willOpen;
    picker.querySelector("#pick-clear").hidden = !state.here;
    if (willOpen) toggleFilters(false);
  }
  function fakePosition(lat, lng) {
    watchId = "preview"; firstFix = true;
    onPosition({ coords: { latitude: lat, longitude: lng, accuracy: 40 } });
  }

  // ---------- 描画まとめ ----------
  function refresh() {
    renderMarkers();
    if (state.view === "list") renderList();
    const n = activeFilterCount();
    el.filterCount.hidden = n === 0; el.filterCount.textContent = n;
  }

  // ---------- 絞り込みUI ----------
  function buildFilterUI() {
    el.catChips.innerHTML = Object.entries(CATEGORIES).map(([k, c]) =>
      `<button type="button" class="chip" data-cat="${k}" aria-pressed="false" style="--c:${catColor(k)}"><span class="dot" aria-hidden="true"></span>${c.label}</button>`
    ).join("");
    const used = new Set(state.spots.map((s) => s.ward));
    const count = (w) => state.spots.filter((s) => s.ward === w).length;
    el.ward.insertAdjacentHTML("beforeend", WARDS.map((w) => `<option value="${w}">${w}（${used.has(w) ? count(w) : 0}件）</option>`).join(""));
  }
  function buildMoodUI() {
    const row = $("#mood-chips");
    row.innerHTML = MOODS.map((m) => `<button type="button" class="mood" data-mood="${m.id}" aria-pressed="false"><svg viewBox="0 0 32 32" aria-hidden="true">${m.icon}</svg><span>${m.label}</span></button>`).join("");
    row.addEventListener("click", (e) => {
      const b = e.target.closest(".mood"); if (!b) return;
      state.filters.mood = state.filters.mood === b.dataset.mood ? "" : b.dataset.mood;
      syncFilterUI(); refresh();
    });
  }
  function syncFilterUI() {
    const f = state.filters;
    document.querySelectorAll(".mood").forEach((b) => b.setAttribute("aria-pressed", String(f.mood === b.dataset.mood)));
    el.catChips.querySelectorAll(".chip").forEach((b) => b.setAttribute("aria-pressed", String(f.cats.has(b.dataset.cat))));
    document.querySelectorAll(".chip.toggle").forEach((b) => b.setAttribute("aria-pressed", String(!!f[b.dataset.flag])));
    el.ward.value = f.ward;
  }
  function toggleFilters(open) {
    const willOpen = open ?? el.filters.hidden;
    el.filters.hidden = !willOpen;
    el.filterBtn.setAttribute("aria-expanded", String(willOpen));
  }

  // ---------- イベント ----------
  function bindEvents() {
    el.filterBtn.addEventListener("click", () => toggleFilters());
    el.close.addEventListener("click", () => toggleFilters(false));
    el.catChips.addEventListener("click", (e) => {
      const b = e.target.closest(".chip"); if (!b) return;
      const k = b.dataset.cat; state.filters.cats.has(k) ? state.filters.cats.delete(k) : state.filters.cats.add(k);
      syncFilterUI(); refresh();
    });
    document.querySelectorAll(".chip.toggle").forEach((b) => b.addEventListener("click", () => {
      const k = b.dataset.flag; state.filters[k] = !state.filters[k]; syncFilterUI(); refresh();
    }));
    el.ward.addEventListener("change", () => {
      state.filters.ward = el.ward.value; refresh();
      const inWard = state.spots.filter((s) => s.ward === el.ward.value);
      if (inWard.length) map.fitBounds(L.latLngBounds(inWard.map((s) => [s.lat, s.lng])).pad(0.3), { maxZoom: 15 });
    });
    el.reset.addEventListener("click", () => {
      state.filters = { cats: new Set(), ward: "", mood: "", tourist: false, designed: false, indoor: false, free: false, openToday: false, q: state.filters.q };
      syncFilterUI(); refresh();
    });

    let qTimer = null;
    el.q.addEventListener("input", () => {
      clearTimeout(qTimer);
      qTimer = setTimeout(() => {
        state.filters.q = el.q.value.trim();
        if (state.view === "detail") closeDetail();
        refresh();
        if (state.filters.q) { state.radius = 0; syncRadius(); renderList(); if (el.sheet.dataset.state === "min") setSheet("peek"); }
      }, 200);
    });

    document.querySelectorAll(".seg").forEach((b) => b.addEventListener("click", () => {
      state.radius = Number(b.dataset.radius); syncRadius(); renderList();
    }));

    el.list.addEventListener("click", (e) => { const b = e.target.closest(".item"); if (b) openDetail(b.dataset.id); });
    el.back.addEventListener("click", closeDetail);

    el.handle.addEventListener("click", () => {
      const st = el.sheet.dataset.state;
      setSheet(st === "full" ? "peek" : st === "min" ? "peek" : "full");
    });
    // 地図をドラッグしたら一覧を小さくして地図を広く見せる（スマホ）
    map.on("dragstart", () => { if (el.sheet.dataset.state === "full") setSheet("peek"); toggleFilters(false); if (picker) togglePicker(false); });

    el.locate.addEventListener("click", () => {
      if (PREVIEW) { togglePicker(); return; }
      if (watchId !== null && state.here) { map.flyTo(state.here, Math.max(map.getZoom(), 15), { duration: 0.6 }); return; }
      if (watchId !== null) { stopLocate(); return; }
      startLocate();
    });
    // 現在地を長押し（右クリック）で追従を止める
    el.locate.addEventListener("contextmenu", (e) => { e.preventDefault(); if (watchId !== null) { stopLocate(); toast("現在地の表示を止めました。"); } });

    let moveTimer = null;
    map.on("moveend", () => {
      if (state.here || state.view !== "list") return;
      clearTimeout(moveTimer); moveTimer = setTimeout(renderList, 120);
    });
    window.addEventListener("resize", () => { syncSheetOffset(); map.invalidateSize(); });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { if (!el.filters.hidden) toggleFilters(false); else if (state.view === "detail") closeDetail(); }
    });
  }
  function syncRadius() {
    document.querySelectorAll(".seg").forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.radius) === state.radius)));
  }

  // ---------- 起動 ----------
  async function init() {
    bindEvents();
    syncSheetOffset();
    try {
      let json = PREVIEW && PREVIEW.spots;
      if (!json) {
        const res = await fetch("data/spots.json", { cache: "no-cache" });
        if (!res.ok) throw new Error(res.status);
        json = await res.json();
      }
      state.spots = json.spots.filter((s) => s.status !== "hidden");
    } catch (e) {
      el.listEmpty.hidden = false;
      el.listEmpty.textContent = location.protocol === "file:"
        ? "データを読み込めませんでした。ファイルを直接開くと読み込めないため、GitHub Pages か簡易サーバー（README参照）で開いてください。"
        : "データを読み込めませんでした。data/spots.json の場所と書式を確認してください。";
      return;
    }
    buildFilterUI(); buildMoodUI(); syncFilterUI(); syncRadius();
    buildMarkers();
    refresh();
    const fromHash = decodeURIComponent(location.hash.slice(1));
    if (fromHash && state.spots.some((s) => s.id === fromHash)) openDetail(fromHash);
  }
  init();
})();
