    let monthHeaderTemplate = null;
    let monthHeaderTemplateDayWidth = -1;
    let weekHeaderTemplate = null;
    let weekHeaderTemplateDayWidth = -1;
    let monthCellsTemplate = null;
    let monthCellsTemplateDayWidth = -1;
    let legendHtmlCache = "";
    let legendDataRef = null;
    const MONTH_HEADER_HEIGHT = 24;
    const WEEK_HEADER_HEIGHT = 20;
    const TIMELINE_HEADER_HEIGHT = MONTH_HEADER_HEIGHT + WEEK_HEADER_HEIGHT;

    function getLegendHtml() {
      if (legendDataRef !== DATA || !legendHtmlCache) {
        legendDataRef = DATA;
        legendHtmlCache = DATA.map(s => `<span class="legend-item"><span class="legend-dot" style="background:${s.color}"></span>${s.section}</span>`).join("") +
          `<span class="legend-item" style="margin-left:12px">● Evento (clique p/ detalhes) &nbsp; ◆ Marco &nbsp; ▬ Intervalo &nbsp; 📄 Conteúdo do doc &nbsp; <em style="color:#94a3b8">itálico = sem data</em></span>`;
      }
      return legendHtmlCache;
    }

    function getMonthStartDay(monthIdx) {
      let total = 0;
      for (let i = 0; i < monthIdx; i++) total += MONTH_DAYS[i];
      return total;
    }

    function formatDayIndex(dayIdx) {
      const dt = new Date(YEAR, 0, dayIdx + 1);
      return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}`;
    }

    function getIsoWeekInfo(date) {
      const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const day = utcDate.getUTCDay() || 7;
      utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
      const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
      const week = Math.ceil((((utcDate - yearStart) / 86400000) + 1) / 7);
      return { week, year: utcDate.getUTCFullYear() };
    }

    function getWeekSegments() {
      const segments = [];
      let cursor = 0;
      while (cursor < 365) {
        const dt = new Date(YEAR, 0, cursor + 1);
        const mondayIndex = (dt.getDay() + 6) % 7;
        const end = Math.min(364, cursor + (6 - mondayIndex));
        const iso = getIsoWeekInfo(dt);
        segments.push({ week: iso.week, year: iso.year, start: cursor, end });
        cursor = end + 1;
      }
      return segments;
    }

    function getMonthHeaderRow() {
      if (!monthHeaderTemplate || monthHeaderTemplateDayWidth !== dayWidth) {
        const row = document.createElement("div");
        row.className = "month-header-row";
        for (let m = 0; m < 12; m++) {
          const mh = document.createElement("div");
          mh.className = "month-header";
          const start = getMonthStartDay(m);
          const end = start + MONTH_DAYS[m] - 1;
          mh.style.width = monthWidth(m) + "px";
          mh.dataset.start = String(start);
          mh.dataset.end = String(end);
          mh.dataset.month = String(m + 1);
          mh.title = `Zoom em ${MONTHS[m]} (${formatDayIndex(start)} a ${formatDayIndex(end)})`;
          mh.textContent = MONTHS[m];
          row.appendChild(mh);
        }
        monthHeaderTemplate = row;
        monthHeaderTemplateDayWidth = dayWidth;
      }
      const row = monthHeaderTemplate.cloneNode(true);
      row.querySelectorAll(".month-header").forEach(cell => {
        const start = Number(cell.dataset.start);
        const end = Number(cell.dataset.end);
        cell.addEventListener("click", () => zoomToRange(start, end));
      });
      return row;
    }

    function getWeekHeaderRow() {
      if (!weekHeaderTemplate || weekHeaderTemplateDayWidth !== dayWidth) {
        const row = document.createElement("div");
        row.className = "week-header-row";
        const segments = getWeekSegments();
        segments.forEach(seg => {
          const wh = document.createElement("div");
          const size = (seg.end - seg.start + 1) * dayWidth;
          wh.className = "week-header";
          wh.style.width = `${size}px`;
          wh.dataset.start = String(seg.start);
          wh.dataset.end = String(seg.end);
          wh.title = `Semana ${String(seg.week).padStart(2, "0")} (${formatDayIndex(seg.start)} a ${formatDayIndex(seg.end)})`;
          wh.textContent = `S${String(seg.week).padStart(2, "0")}`;
          row.appendChild(wh);
        });
        weekHeaderTemplate = row;
        weekHeaderTemplateDayWidth = dayWidth;
      }
      const row = weekHeaderTemplate.cloneNode(true);
      row.querySelectorAll(".week-header").forEach(cell => {
        const start = Number(cell.dataset.start);
        const end = Number(cell.dataset.end);
        cell.addEventListener("click", () => zoomToRange(start, end));
      });
      return row;
    }

    function getMonthCellsFragment() {
      if (!monthCellsTemplate || monthCellsTemplateDayWidth !== dayWidth) {
        const frag = document.createDocumentFragment();
        for (let m = 0; m < 12; m++) {
          const c = document.createElement("div");
          c.className = "month-cell";
          c.style.width = monthWidth(m) + "px";
          frag.appendChild(c);
        }
        monthCellsTemplate = frag;
        monthCellsTemplateDayWidth = dayWidth;
      }
      return monthCellsTemplate.cloneNode(true);
    }

    function render() {
      const labelsEl = document.getElementById("labels"), timelineEl = document.getElementById("timeline"), legendEl = document.getElementById("legend");
      labelsEl.innerHTML = ""; timelineEl.innerHTML = "";
      const tw = totalWidth();
      timelineEl.style.width = tw + "px";

      legendEl.innerHTML = getLegendHtml();

      timelineEl.appendChild(getMonthHeaderRow());
      timelineEl.appendChild(getWeekHeaderRow());
      const lblHeader = document.createElement("div");
      lblHeader.style.cssText = `height:${TIMELINE_HEADER_HEIGHT}px;border-bottom:2px solid #cbd5e1;background:#e2e8f0;display:flex;align-items:center;padding-left:8px;font-weight:600;font-size:12px;color:#475569`;
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
        const h = TIMELINE_HEADER_HEIGHT + rows.length * 28;
        const todayDiv = document.createElement("div");
        todayDiv.className = "today-line";
        todayDiv.style.cssText = `left:${tx}px;height:${h}px;top:${TIMELINE_HEADER_HEIGHT}px`;
        const todayLbl = document.createElement("span");
        todayLbl.className = "today-label";
        todayLbl.textContent = "Hoje";
        todayDiv.appendChild(todayLbl);
        timelineEl.appendChild(todayDiv);
      }
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
      d.appendChild(getMonthCellsFragment());
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
