    // =====================================================================
    // MOTOR DE RENDERIZAÇÃO
    // =====================================================================
    const YEAR = 2026, MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    let dayWidth = 3, collapsed = {};
    let searchQuery = "";

    // =====================================================================
    // BUSCA – pesquisa em todos os campos de dados
    // =====================================================================
    function normalize(s) { return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }

    function textFromMeta(meta) {
      if (!meta) return "";
      let parts = [meta.title || ""];
      (meta.blocks || []).forEach(b => {
        if (b.text) parts.push(b.text);
        if (b.html) parts.push(b.html.replace(/<[^>]*>/g, ""));
        if (b.items) parts.push(b.items.join(" ").replace(/<[^>]*>/g, ""));
        if (b.fields) b.fields.forEach(f => parts.push(f[0] + " " + f[1]));
        if (b.headers) parts.push(b.headers.join(" "));
        if (b.rows) b.rows.forEach(r => parts.push(r.join(" ")));
        if (b.entries) b.entries.forEach(e => parts.push((e.header || "") + " " + (e.detail || "")));
      });
      return parts.join(" ");
    }

    function textFromItem(item) {
      let parts = [item.name || ""];
      if (item.dates) parts.push(item.dates.join(" "));
      if (item.tip) {
        if (item.tip.title) parts.push(item.tip.title);
        if (item.tip.fields) item.tip.fields.forEach(f => parts.push(f[0] + " " + f[1]));
      }
      return parts.join(" ");
    }

    function itemMatches(item, q) { return normalize(textFromItem(item)).includes(q); }
    function groupMatches(grp, q) {
      const metaText = normalize(textFromMeta(grp.meta));
      if (metaText.includes(q)) return "full";
      if (normalize(grp.group).includes(q)) return "full";
      const matchItems = grp.items.filter(it => itemMatches(it, q));
      return matchItems.length > 0 ? "partial" : false;
    }

    function onSearch(val) {
      searchQuery = normalize(val.trim());
      // Auto-expand when searching
      if (searchQuery) { collapsed = {}; }
      render();
    }
    function clearSearch() {
      document.getElementById("searchInput").value = "";
      searchQuery = "";
      render();
    }

    function parseDate(s) { const [m, d] = s.split("-").map(Number); return new Date(YEAR, m - 1, d); }
    function dayOfYear(d) { return Math.floor((d - new Date(YEAR, 0, 1)) / 864e5); }
    function dayX(s) { return dayOfYear(parseDate(s)) * dayWidth; }
    function monthWidth(m) { return MONTH_DAYS[m] * dayWidth; }
    function totalWidth() { return 365 * dayWidth; }
    function fmtDateFull(s) { const dt = parseDate(s); return String(dt.getDate()).padStart(2, "0") + "/" + String(dt.getMonth() + 1).padStart(2, "0") + "/2026 (" + WEEKDAYS[dt.getDay()] + ")"; }
    function zoom(dir) { dayWidth = Math.max(2, Math.min(8, dayWidth + dir)); render(); }
    function toggleSection(i) { collapsed["s:" + i] = !collapsed["s:" + i]; render(); }
    function toggleGroup(i, j) { collapsed["g:" + i + ":" + j] = !collapsed["g:" + i + ":" + j]; render(); }
    function toggleAll(exp) { collapsed = {}; if (!exp) DATA.forEach((_, i) => { collapsed["s:" + i] = true; }); render(); }

    // Tooltip
    const tooltipEl = document.getElementById("tooltip");
    function showTip(e, tipData, dateStr) {
      let html = "";
      if (typeof tipData === "object" && tipData.title) {
        html += `<div class="tt-title">${escapeHtml(tipData.title)}</div>`;
        if (dateStr) {
          let d = dateStr;
          if (d.includes(">")) { const [a, b] = d.split(">"); d = fmtDateFull(a) + " a " + fmtDateFull(b); }
          else d = fmtDateFull(dateStr);
          html += `<div class="tt-date">${escapeHtml(d)}</div>`;
        }
        if (tipData.fields) {
          html += `<div class="tt-detail">`;
          tipData.fields.forEach(([k, v]) => { html += `<span><b>${escapeHtml(k)}:</b> ${escapeHtml(v)}</span>`; });
          html += `</div>`;
        }
      } else {
        html = escapeHtml(tipData || "");
      }
      tooltipEl.innerHTML = html;
      tooltipEl.style.display = "block";
      const r = tooltipEl.getBoundingClientRect();
      let x = e.clientX + 12, y = e.clientY - 8;
      if (x + r.width > window.innerWidth) x = e.clientX - r.width - 8;
      if (y + r.height > window.innerHeight) y = e.clientY - r.height - 8;
      tooltipEl.style.left = x + "px"; tooltipEl.style.top = y + "px";
    }
    function hideTip() { tooltipEl.style.display = "none"; }

    // Modal
    function openModal(groupName, color, meta) {
      document.getElementById("modalTitle").textContent = groupName;
      document.getElementById("modalBadge").style.background = color;
      document.getElementById("modalBadge").textContent = DATA.find(s => s.groups.some(g => g.group === groupName))?.section || "";
      document.getElementById("modalBody").innerHTML = renderDocHtml(meta);
      document.getElementById("modalOverlay").classList.add("open");
    }
    function closeModal() { document.getElementById("modalOverlay").classList.remove("open"); }
    document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });

    function openEventModal(mk) {
      const item = mk.itemData, tip = mk.tipData;
      let dateDisplay = mk.dateStr;
      if (dateDisplay.includes(">")) {
        const [a, b] = dateDisplay.split(">");
        dateDisplay = fmtDateFull(a) + " a " + fmtDateFull(b);
      } else {
        dateDisplay = fmtDateFull(mk.dateStr);
      }
      // Build all other dates for this item
      let otherDates = "";
      if (item.dates && item.dates.length > 1) {
        otherDates = `<h4>Todas as ocorrências (${item.dates.length})</h4><div style="display:flex;flex-wrap:wrap;gap:4px;margin:4px 0 12px">`;
        item.dates.forEach(ds => {
          const isCurrent = (ds === mk.dateStr);
          let label = ds;
          if (ds.includes(">")) { const [a, b] = ds.split(">"); label = fmtDate2(a) + "–" + fmtDate2(b); }
          else label = fmtDate2(ds);
          otherDates += `<span style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;${isCurrent ? 'background:' + mk.sectionColor + ';color:#fff;font-weight:700' : 'background:#f1f5f9;color:#475569'}">${label}</span>`;
        });
        otherDates += "</div>";
      }
      // Build fields
      let fieldsHtml = "";
      if (tip && tip.fields) {
        fieldsHtml = `<div class="info-grid" style="margin-top:8px">`;
        tip.fields.forEach(([k, v]) => { fieldsHtml += `<span class="info-label">${escapeHtml(k)}:</span><span class="info-value">${escapeHtml(v)}</span>`; });
        fieldsHtml += `</div>`;
      }
      const html = `
    <h3 style="margin-top:0">${escapeHtml(tip && tip.title ? tip.title : item.name)}</h3>
    <div style="display:flex;align-items:center;gap:8px;margin:8px 0">
      <span style="background:${mk.sectionColor};color:#fff;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600">${escapeHtml(mk.sectionName)}</span>
      <span style="color:#64748b;font-size:12px">›</span>
      <span style="color:#475569;font-size:12px;font-weight:600">${escapeHtml(mk.groupName)}</span>
    </div>
    <div style="background:#fef3c7;border-left:3px solid #f59e0b;padding:8px 12px;border-radius:0 4px 4px 0;margin:12px 0;font-size:14px;font-weight:600;color:#92400e">
      📅 ${escapeHtml(dateDisplay)}
    </div>
    ${fieldsHtml}
    ${otherDates}
    ${item.milestone ? '<div style="margin-top:8px;color:#64748b;font-size:12px">◆ Este evento é um <b>marco</b> (milestone)</div>' : ''}
  `;
      document.getElementById("modalTitle").textContent = item.name;
      document.getElementById("modalBadge").style.background = mk.sectionColor;
      document.getElementById("modalBadge").textContent = mk.sectionName;
      document.getElementById("modalBody").innerHTML = html;
      document.getElementById("modalOverlay").classList.add("open");
    }
    function fmtDate2(s) { if (s.includes(">")) { const [a, b] = s.split(">"); return fmtDate2(a) + "–" + fmtDate2(b); } const [m, d] = s.split("-"); return d + "/" + m; }

    function render() {
      const labelsEl = document.getElementById("labels"), timelineEl = document.getElementById("timeline"), legendEl = document.getElementById("legend");
      labelsEl.innerHTML = ""; timelineEl.innerHTML = "";
      const tw = totalWidth();
      timelineEl.style.width = tw + "px";

      legendEl.innerHTML = DATA.map(s => `<span class="legend-item"><span class="legend-dot" style="background:${s.color}"></span>${s.section}</span>`).join("") +
        `<span class="legend-item" style="margin-left:12px">● Evento (clique p/ detalhes) &nbsp; ◆ Marco &nbsp; ▬ Intervalo &nbsp; 📄 Conteúdo do doc &nbsp; <em style="color:#94a3b8">itálico = sem data</em></span>`;

      // Month headers (usa DOM para preservar handlers)
      const mhRow = document.createElement("div");
      mhRow.className = "month-header-row";
      for (let m = 0; m < 12; m++) { const mh = document.createElement("div"); mh.className = "month-header"; mh.style.width = monthWidth(m) + "px"; mh.textContent = MONTHS[m]; mhRow.appendChild(mh); }
      timelineEl.appendChild(mhRow);
      const lblHeader = document.createElement("div");
      lblHeader.style.cssText = "height:24px;border-bottom:2px solid #cbd5e1;background:#e2e8f0;display:flex;align-items:center;padding-left:8px;font-weight:600;font-size:12px;color:#475569";
      lblHeader.textContent = "Atividade";
      labelsEl.appendChild(lblHeader);

      const q = searchQuery;
      let matchCount = 0;

      DATA.forEach((sec, si) => {
        // Se buscando, verificar se a seção tem algum match
        if (q) {
          const secHasMatch = sec.groups.some(g => groupMatches(g, q));
          if (!secHasMatch) return; // pula seção inteira
        }
        const sC = collapsed["s:" + si];
        addLabel(labelsEl, sec.section, "section", sec.color, () => toggleSection(si), sC);
        addTlRow(timelineEl, tw, "section-row", sec.color, null);
        if (sC) return;
        sec.groups.forEach((grp, gi) => {
          const gMatch = q ? groupMatches(grp, q) : true;
          if (q && !gMatch) return; // pula grupo sem match
          const gC = collapsed["g:" + si + ":" + gi];
          addLabel(labelsEl, grp.group, "group", sec.color, () => toggleGroup(si, gi), gC, false, grp.meta ? { color: sec.color, name: grp.group, meta: grp.meta } : null, q);
          addTlRow(timelineEl, tw, "group-row", null, null);
          if (gC) return;
          grp.items.forEach(item => {
            // Filtra items quando busca parcial (match veio dos items, não do grupo inteiro)
            if (q && gMatch === "partial" && !itemMatches(item, q)) return;
            if (q) matchCount++;
            const has = item.dates && item.dates.length > 0;
            addLabel(labelsEl, item.name, "item", sec.color, null, false, !has, null, q);
            const mk = [];
            if (has) {
              item.dates.forEach(ds => {
                const base = { color: sec.color, tipData: item.tip, dateStr: ds, itemData: item, groupName: grp.group, sectionName: sec.section, sectionColor: sec.color };
                if (ds.includes(">")) {
                  const [a, b] = ds.split(">"); const x1 = dayX(a), x2 = dayX(b) + dayWidth;
                  mk.push({ ...base, type: "range", x: x1, w: Math.max(x2 - x1, dayWidth * 2) });
                } else {
                  mk.push({ ...base, type: item.milestone ? "milestone" : "point", x: dayX(ds) });
                }
              });
            }
            addTlRow(timelineEl, tw, "", null, mk);
          });
        });
      });

      // Atualizar contador de busca
      const countEl = document.getElementById("searchCount");
      if (q) { countEl.textContent = matchCount + " item" + (matchCount !== 1 ? "s" : ""); }
      else { countEl.textContent = ""; }

      // Today line (usa appendChild para não destruir handlers)
      const today = new Date();
      if (today.getFullYear() === YEAR) {
        const tx = dayOfYear(today) * dayWidth;
        const rows = timelineEl.querySelectorAll('.tl-row');
        const h = 24 + rows.length * 28;
        const todayDiv = document.createElement("div");
        todayDiv.className = "today-line";
        todayDiv.style.cssText = `left:${tx}px;height:${h}px;top:24px`;
        const todayLbl = document.createElement("span");
        todayLbl.className = "today-label";
        todayLbl.textContent = "Hoje";
        todayDiv.appendChild(todayLbl);
        timelineEl.appendChild(todayDiv);
      }
    }

    function highlightText(text, q) {
      if (!q) return escapeHtml(text);
      const safe = escapeHtml(text);
      const nText = normalize(text);
      const idx = nText.indexOf(q);
      if (idx < 0) return safe;
      // Map normalized index back to original text
      return escapeHtml(text.substring(0, idx)) + '<span class="highlight">' + escapeHtml(text.substring(idx, idx + q.length)) + '</span>' + escapeHtml(text.substring(idx + q.length));
    }

    function addLabel(ct, text, type, color, onclick, isC, noDate, docInfo, q) {
      const d = document.createElement("div");
      d.className = "label-row label-" + type + (isC ? " collapsed" : "") + (noDate ? " no-date" : "");
      if (type === "section") {
        d.style.background = color;
        d.innerHTML = `<span class="collapse-icon">▼</span> ${highlightText(text, q)}`;
        if (onclick) d.onclick = onclick;
      } else if (type === "group") {
        let html = `<span class="collapse-icon">▼</span><span class="group-name">${highlightText(text, q)}</span>`;
        if (docInfo) html += `<span class="doc-btn" title="Ver detalhes do documento">📄</span>`;
        d.innerHTML = html;
        d.style.borderLeft = `3px solid ${color}`;
        // Click handlers
        const nameEl = () => d.querySelector(".group-name");
        const iconEl = () => d.querySelector(".collapse-icon");
        const docEl = () => d.querySelector(".doc-btn");
        d.addEventListener("click", e => {
          if (docInfo && docEl() && (e.target === docEl() || docEl().contains(e.target))) {
            e.stopPropagation();
            openModal(docInfo.name, docInfo.color, docInfo.meta);
          } else if (onclick) {
            onclick();
          }
        });
      } else {
        d.innerHTML = highlightText(text, q) + (noDate ? ' <span style="color:#94a3b8;font-style:italic">(sem data)</span>' : "");
        d.style.borderLeft = `3px solid ${color}20`;
      }
      ct.appendChild(d);
    }

    function addTlRow(ct, tw, cls, bg, markers) {
      const d = document.createElement("div");
      d.className = "tl-row " + (cls || "");
      d.style.width = tw + "px";
      if (bg && cls === "section-row") d.style.background = bg + "15";
      for (let m = 0; m < 12; m++) {
        const c = document.createElement("div");
        c.className = "month-cell"; c.style.width = monthWidth(m) + "px";
        d.appendChild(c);
      }
      if (markers) {
        markers.forEach(mk => {
          const el = document.createElement("div");
          if (mk.type === "range") {
            el.className = "evt-range"; el.style.left = mk.x + "px"; el.style.width = mk.w + "px"; el.style.background = mk.color;
          } else if (mk.type === "milestone") {
            el.className = "evt milestone"; el.style.left = mk.x + "px"; el.style.background = mk.color;
          } else {
            el.className = "evt"; el.style.left = mk.x + "px"; el.style.background = mk.color;
          }
          el.onmouseenter = e => showTip(e, mk.tipData, mk.dateStr);
          el.onmousemove = e => showTip(e, mk.tipData, mk.dateStr);
          el.onmouseleave = hideTip;
          el.onclick = e => { e.stopPropagation(); hideTip(); openEventModal(mk); };
          d.appendChild(el);
        });
      }
      ct.appendChild(d);
    }

    // render() chamado após descriptografia
