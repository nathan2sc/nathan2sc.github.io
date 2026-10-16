/* 데이터 안내 카드 (2026-10-16).
 * meta/datacards.json 한 파일을 읽어 세 곳에 그린다.
 *   1) 대시보드 각 항목 오른쪽 카드(넓은 화면) + 제목 아래 'ⓘ 데이터 출처·한계' 링크(좁은 화면)
 *   2) 방법론 탭의 '데이터 출처 소개'(#src-dir)
 *   3) 별도 페이지 guide.html(#guide-root) — 모든 카드와 출처를 한곳에
 * 카드 내용을 바꿀 때는 JSON 만 고치면 된다. 이 파일은 app.js 와 독립적으로 돈다.
 */
(function () {
  "use strict";

  const KIND_SHORT = {
    "onchain": "온체인",
    "onchain-agg": "온체인·집계사 경유",
    "offchain": "오프체인",
    "mixed": "혼합",
    "derived": "파생 계산",
    "ai": "AI 작성",
  };

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const safeUrl = (u) => (/^https:\/\//.test(u || "") ? u : "");

  function tags(card, kinds) {
    const k = (card.kind || []).map((x) =>
      `<span class="dc-tag dc-k-${esc(x)}" title="${esc(kinds[x] || "")}">${esc(KIND_SHORT[x] || x)}</span>`).join("");
    const c = card.cadence ? `<span class="dc-tag dc-cad">${esc(card.cadence)}</span>` : "";
    return `<p class="dc-tags">${k}${c}</p>`;
  }

  function srcLinks(card, byId, base) {
    if (!card.sources || !card.sources.length) return "이 사이트의 다른 데이터 파일(외부 호출 없음)";
    return card.sources.map((id) => {
      const s = byId[id];
      return s ? `<a href="${base}#s-${esc(id)}">${esc(s.name)}</a>` : esc(id);
    }).join(" · ");
  }

  function cardBody(card, byId, kinds, base) {
    const lim = (card.limits || []).map((l) => `<li>${esc(l)}</li>`).join("");
    return `${tags(card, kinds)}
      <dl>
        <dt>무엇을</dt><dd>${esc(card.what)}</dd>
        <dt>출처</dt><dd>${srcLinks(card, byId, base)}</dd>
        <dt>수집 방법</dt><dd>${esc(card.method)}</dd>
        <dt>한계</dt><dd><ul>${lim}</ul></dd>
      </dl>`;
  }

  function sourceBody(s) {
    const ref = safeUrl(s.ref);
    return `<dl>
        <dt>무엇</dt><dd>${esc(s.about)}</dd>
        <dt>이 사이트가 쓰는 것</dt><dd>${esc(s.use)}</dd>
        <dt>운영 주체</dt><dd>${esc(s.operator)}</dd>
        <dt>관할</dt><dd>${esc(s.jurisdiction)}</dd>
        ${s.note ? `<dt>참고</dt><dd>${esc(s.note)}</dd>` : ""}
      </dl>
      <p class="dc-chk">확인 ${esc(s.checked || "—")}${ref ? ` · <a href="${esc(ref)}" rel="noopener" target="_blank">근거</a>` : ""}</p>`;
  }

  function sourceGrid(data, idPrefix) {
    const groups = [];
    data.sources.forEach((s) => {
      let g = groups.find((x) => x.name === s.group);
      if (!g) groups.push(g = { name: s.group, items: [] });
      g.items.push(s);
    });
    return groups.map((g) => `<h4 class="src-g">${esc(g.name)}</h4>
      <div class="src-grid">${g.items.map((s) =>
        `<article class="src-card" id="${idPrefix}${esc(s.id)}"><h5>${esc(s.name)}</h5>${sourceBody(s)}</article>`).join("")}</div>`).join("");
  }

  // 1) 대시보드 각 항목
  function attachToSections(data, byId) {
    data.cards.forEach((card) => {
      const h = document.getElementById(card.section);
      const sec = h && h.closest("section");
      if (!sec || sec.querySelector(":scope > .dc")) return;
      const aside = document.createElement("aside");
      aside.className = "dc";
      aside.setAttribute("aria-label", "데이터 정보: " + card.title);
      aside.innerHTML = `<p class="dc-head">데이터 정보</p>${cardBody(card, byId, data.kinds, "guide.html")}
        <a class="dc-more" href="guide.html#c-${esc(card.id)}">데이터 안내 전체 보기 →</a>`;
      sec.appendChild(aside);
      sec.classList.add("withdc");
      const link = document.createElement("p");
      link.className = "dc-linkp";
      link.innerHTML = `<a class="dc-link" href="guide.html#c-${esc(card.id)}">ⓘ 데이터 출처·한계</a>`;
      h.insertAdjacentElement("afterend", link);
    });
  }

  // 3) 별도 안내 페이지
  function renderGuide(root, data, byId) {
    const tabs = [];
    data.cards.forEach((c) => {
      let t = tabs.find((x) => x.name === c.tab);
      if (!t) tabs.push(t = { name: c.tab, items: [] });
      t.items.push(c);
    });
    const legend = Object.keys(data.kinds).map((k) =>
      `<li><span class="dc-tag dc-k-${esc(k)}">${esc(KIND_SHORT[k] || k)}</span> ${esc(String(data.kinds[k]).replace(/^[^—]*—\s*/, ""))}</li>`).join("");
    const toc = tabs.map((t) => `<li><b>${esc(t.name)}</b> ${t.items.map((c) =>
      `<a href="#c-${esc(c.id)}">${esc(c.title)}</a>`).join(" · ")}</li>`).join("");
    root.innerHTML = `
      <section class="g-sec"><h2>데이터 구분</h2><ul class="g-legend">${legend}</ul>
        <p class="g-note">카드 내용 기준일 ${esc(data.updated)}. 운영 주체는 각 출처의 약관·회사 소개·보도로 확인했고, 확인하지 못한 것은 ‘미확인’으로 적었습니다.</p></section>
      <nav class="g-sec g-toc" aria-label="항목 목록"><h2>항목</h2><ul>${toc}<li><b>출처</b> <a href="#sources">데이터 출처 소개</a></li></ul></nav>
      ${tabs.map((t) => `<section class="g-sec"><h2>${esc(t.name)}</h2>
        ${t.items.map((c) => `<article class="dc dc-page" id="c-${esc(c.id)}"><h3>${esc(c.title)}</h3>${cardBody(c, byId, data.kinds, "")}</article>`).join("")}
      </section>`).join("")}
      <section class="g-sec" id="sources"><h2>데이터 출처 소개</h2>${sourceGrid(data, "s-")}</section>`;
    // 렌더 뒤에 주소의 #항목으로 다시 이동(처음 로드 시 대상이 아직 없었으므로)
    if (location.hash) {
      const t = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (t) { t.classList.add("is-target"); t.scrollIntoView(); }
    }
    addEventListener("hashchange", () => {
      document.querySelectorAll(".is-target").forEach((e) => e.classList.remove("is-target"));
      const t = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (t) t.classList.add("is-target");
    });
  }

  async function init() {
    let data;
    try {
      const r = await fetch("meta/datacards.json", { cache: "no-cache" });
      if (!r.ok) return;
      data = await r.json();
    } catch (e) {
      console.info("datacards.json 없음 — 데이터 안내 카드 생략");
      return;
    }
    const byId = {};
    (data.sources || []).forEach((s) => { byId[s.id] = s; });
    const guide = document.getElementById("guide-root");
    if (guide) { renderGuide(guide, data, byId); return; }
    attachToSections(data, byId);
    const dir = document.getElementById("src-dir");
    if (dir) dir.innerHTML = sourceGrid(data, "m-s-");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
