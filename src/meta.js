    // =====================================================================
    // RENDER HTML FROM META OBJECT
    // =====================================================================

    // Renderiza calendário visual anual
    function renderYearCalendar(calBlock, groupName = "Grupo", year = 2026) {
      const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
      const monthShort = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
      const weekdayShort = ["D", "S", "T", "Q", "Q", "S", "S"];
      const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

      // Extrair eventos e datas
      const eventsByMonth = {};
      const eventDates = new Set();

      let currentMonth = -1;

      calBlock.entries.forEach(entry => {
        // Se header é nome de mês (ex: "Janeiro", "Fevereiro"), atualiza contexto
        const monthNameMatch = entry.header && entry.header.match(/^(Janeiro|Fevereiro|Março|Abril|Maio|Junho|Julho|Agosto|Setembro|Outubro|Novembro|Dezembro)/i);
        if (monthNameMatch) {
          const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
          currentMonth = monthNames.findIndex(m => m.toLowerCase() === monthNameMatch[1].toLowerCase());
          // Não retorna - continua para processar o campo detail usando o currentMonth
        }

        // Tentar extrair data do header primeiro (formato Rede Kids)
        if (entry.header) {
          // Intervalo: "24 a 26/07"
          const rangeMatch = entry.header.match(/(\d{2})\s+a\s+(\d{2})\/(\d{2})/);
          if (rangeMatch) {
            const startDay = parseInt(rangeMatch[1]);
            const endDay = parseInt(rangeMatch[2]);
            const month = parseInt(rangeMatch[3]) - 1;

            if (!eventsByMonth[month]) eventsByMonth[month] = [];
            eventsByMonth[month].push({
              date: `${rangeMatch[1]} a ${rangeMatch[2]}/${rangeMatch[3]}`,
              day: startDay,
              header: entry.header,
              detail: entry.detail
            });

            for (let d = startDay; d <= endDay; d++) {
              eventDates.add(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
            }
            return;
          }

          // Data única no header: "25/01"
          const singleMatch = entry.header.match(/(\d{2})\/(\d{2})/);
          if (singleMatch) {
            const day = parseInt(singleMatch[1]);
            const month = parseInt(singleMatch[2]) - 1;
            if (!eventsByMonth[month]) eventsByMonth[month] = [];
            eventsByMonth[month].push({
              date: `${singleMatch[1]}/${singleMatch[2]}`,
              day,
              header: entry.header,
              detail: entry.detail
            });
            eventDates.add(`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
            return;
          }
        }

        // Extrair data do detail (formato COMPARTILHAR: "31 – Reunião..." ou "21/02 – Ação...")
        if (entry.detail && currentMonth >= 0) {
          // Tenta formato "DD/MM"
          const detailDateMatch = entry.detail.match(/(\d{2})\/(\d{2})/);
          if (detailDateMatch) {
            const day = parseInt(detailDateMatch[1]);
            const month = parseInt(detailDateMatch[2]) - 1;
            if (!eventsByMonth[month]) eventsByMonth[month] = [];
            eventsByMonth[month].push({
              date: `${detailDateMatch[1]}/${detailDateMatch[2]}`,
              day,
              header: entry.header || `${day}/${String(month + 1).padStart(2, '0')}`,
              detail: entry.detail
            });
            eventDates.add(`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
            return;
          }

          // Tenta formato intervalo "DD a DD –" (usa currentMonth)
          const detailRangeMatch = entry.detail.match(/^(\d{1,2})\s+a\s+(\d{1,2})\s+[–-]/);
          if (detailRangeMatch) {
            const startDay = parseInt(detailRangeMatch[1]);
            const endDay = parseInt(detailRangeMatch[2]);
            if (!eventsByMonth[currentMonth]) eventsByMonth[currentMonth] = [];
            eventsByMonth[currentMonth].push({
              date: `${String(startDay).padStart(2, '0')} a ${String(endDay).padStart(2, '0')}/${String(currentMonth + 1).padStart(2, '0')}`,
              day: startDay,
              header: entry.header || `${startDay} a ${endDay}/${String(currentMonth + 1).padStart(2, '0')}`,
              detail: entry.detail
            });
            for (let d = startDay; d <= endDay; d++) {
              eventDates.add(`${year}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
            }
            return;
          }

          // Tenta formato "DD –" (usa currentMonth)
          const detailDayMatch = entry.detail.match(/^(\d{1,2})\s+[–-]/);
          if (detailDayMatch) {
            const day = parseInt(detailDayMatch[1]);
            if (!eventsByMonth[currentMonth]) eventsByMonth[currentMonth] = [];
            eventsByMonth[currentMonth].push({
              date: `${String(day).padStart(2, '0')}/${String(currentMonth + 1).padStart(2, '0')}`,
              day,
              header: entry.header || `${day}/${String(currentMonth + 1).padStart(2, '0')}`,
              detail: entry.detail
            });
            eventDates.add(`${year}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
            return;
          }

          // Múltiplas datas: "12/02 e 26/02"
          const multiMatch = entry.detail.matchAll(/(\d{2})\/(\d{2})/g);
          for (const match of multiMatch) {
            const day = parseInt(match[1]);
            const month = parseInt(match[2]) - 1;
            if (!eventsByMonth[month]) eventsByMonth[month] = [];
            eventsByMonth[month].push({
              date: `${match[1]}/${match[2]}`,
              day,
              header: entry.header || `${match[1]}/${match[2]}`,
              detail: entry.detail
            });
            eventDates.add(`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
          }
        }
      });

      // HTML do calendário
      let html = '<div class="year-calendar">';
      html += '<div class="year-calendar-grid">';

      // Lado esquerdo: lista compacta de eventos
      html += '<div class="year-calendar-events">';
      html += '<h4>Eventos do Ano</h4>';

      // Coletar todos os eventos e ordenar por data
      const allEvents = [];

      Object.keys(eventsByMonth).forEach(monthIdx => {
        eventsByMonth[monthIdx].forEach(evt => {
          // Coletar todas as datas deste evento (para intervalos)
          const eventDatesArr = [];

          // Verifica se é um intervalo
          const rangeMatch = evt.date.match(/(\d{2})\s+a\s+(\d{2})\/(\d{2})/);
          if (rangeMatch) {
            const startDay = parseInt(rangeMatch[1]);
            const endDay = parseInt(rangeMatch[2]);
            const month = parseInt(rangeMatch[3]) - 1;
            for (let d = startDay; d <= endDay; d++) {
              eventDatesArr.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
            }
          } else {
            // Data única
            eventDatesArr.push(`${year}-${String(parseInt(monthIdx) + 1).padStart(2, '0')}-${String(evt.day).padStart(2, '0')}`);
          }

          allEvents.push({
            month: parseInt(monthIdx),
            ...evt,
            allDates: eventDatesArr
          });
        });
      });

      allEvents.sort((a, b) => {
        if (a.month !== b.month) return a.month - b.month;
        return a.day - b.day;
      });

      // Renderizar lista simples
      allEvents.forEach((evt, idx) => {
        const datesStr = evt.allDates.join(',');
        html += `<div class="event-list-item" data-event-id="${idx}" data-event-dates="${datesStr}">`;
        html += `<div class="event-date-badge">${evt.date}</div>`;
        const eventText = evt.detail.replace(/^\d{1,2}\/\d{2}\s*[–-]\s*/, '').replace(/^\d{1,2}\s*[–-]\s*/, '');
        html += `<div class="event-text">${escapeHtml(eventText)}</div>`;
        html += '</div>';
      });
      html += '</div>';

      // Lado direito: mini calendários
      html += '<div class="year-calendar-months">';
      for (let m = 0; m < 12; m++) {
        const firstDay = new Date(year, m, 1).getDay();
        const days = daysInMonth[m];

        html += '<div class="mini-calendar">';
        html += `<div class="mini-calendar-header">${monthShort[m]}</div>`;
        html += '<div class="mini-calendar-weekdays">';
        weekdayShort.forEach(wd => html += `<div class="mini-calendar-weekday">${wd}</div>`);
        html += '</div>';
        html += '<div class="mini-calendar-days">';

        // Dias em branco antes do 1º dia
        for (let i = 0; i < firstDay; i++) {
          html += '<div class="mini-calendar-day"></div>';
        }

        // Dias do mês
        const today = new Date();
        for (let d = 1; d <= days; d++) {
          const dateStr = `${year}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const isToday = today.getFullYear() === year && today.getMonth() === m && today.getDate() === d;
          const hasEvent = eventDates.has(dateStr);
          const dayOfWeek = new Date(year, m, d).getDay();
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

          let classes = 'mini-calendar-day';
          if (hasEvent) classes += ' event';
          else if (isToday) classes += ' today';
          else if (isWeekend) classes += ' weekend';

          const dataAttr = hasEvent ? ` data-date="${dateStr}"` : '';
          html += `<div class="${classes}"${dataAttr}>${d}</div>`;
        }

        html += '</div></div>';
      }
      html += '</div>';

      html += '</div></div>';
      return html;
    }

    function renderDocHtml(meta) {
      if (!meta || !meta.blocks) return "";
      let html = meta.title ? `<h3>${escapeHtml(meta.title)}</h3>` : "";
      let prevBlock = null;
      meta.blocks.forEach(block => {
        switch (block.type) {
          case "h3": html += `<h3>${escapeHtml(block.text)}</h3>`; break;
          case "h4": html += `<h4>${escapeHtml(block.text)}</h4>`; break;
          case "p": html += `<p>${sanitizeHtml(block.html)}</p>`; break;
          case "ul": html += `<ul>${block.items.map(item => `<li>${sanitizeHtml(item)}</li>`).join("")}</ul>`; break;
          case "grid": html += `<div class="info-grid">${block.fields.map(([l, v]) => `<span class="info-label">${escapeHtml(l)}:</span><span class="info-value">${sanitizeHtml(v)}</span>`).join("")}</div>`; break;
          case "note": html += `<div class="note">${escapeHtml(block.text)}</div>`; break;
          case "table": html += `<table><tr>${block.headers.map(h => `<th>${escapeHtml(h)}</th>`).join("")}</tr>${block.rows.map(row => `<tr>${row.map(c => `<td>${escapeHtml(c)}</td>`).join("")}</tr>`).join("")}</table>`; break;
          case "cal":
            // Se o bloco anterior é h4 "Calendário de Eventos", usa renderização visual
            if (prevBlock && prevBlock.type === "h4" && prevBlock.text.includes("Calendário")) {
              html += renderYearCalendar(block, meta.title || "Grupo");
            } else {
              html += block.entries.map(e => (e.header ? `<div class="cal-month">${escapeHtml(e.header)}</div>` : "") + `<div class="cal-entry">${escapeHtml(e.detail)}</div>`).join("");
            }
            break;
        }
        prevBlock = block;
      });
      return html;
    }

    function escapeHtml(s) {
      const d = document.createElement("div"); d.textContent = s; return d.innerHTML;
    }

    function sanitizeHtml(raw) {
      if (!raw) return "";
      const tpl = document.createElement("template");
      tpl.innerHTML = String(raw);
      tpl.content.querySelectorAll("script,style,iframe,object,embed").forEach(el => el.remove());
      tpl.content.querySelectorAll("*").forEach(el => {
        [...el.attributes].forEach(attr => {
          const name = attr.name.toLowerCase();
          const value = attr.value || "";
          if (name.startsWith("on")) el.removeAttribute(attr.name);
          if ((name === "href" || name === "src") && /^\s*javascript:/i.test(value)) el.removeAttribute(attr.name);
        });
      });
      return tpl.innerHTML;
    }
