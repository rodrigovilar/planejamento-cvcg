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
