    // Dados carregados de arquivo JSON com valores criptografados individualmente (AES-256-GCM, PBKDF2 100k iterações)
    const DATA_PROMISE = fetch("data.json").then(r => r.json());
    const ENC_PREFIX = "ENC:";

    async function deriveKey(password, salt) {
      const enc = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
      return crypto.subtle.deriveKey(
        { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["decrypt"]
      );
    }

    function b64toArr(b64) {
      const bin = atob(b64);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      return arr;
    }

    async function decryptValue(key, encStr) {
      const raw = b64toArr(encStr.slice(ENC_PREFIX.length));
      const iv = raw.slice(0, 12);
      const ct = raw.slice(12);
      const dec = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
      return new TextDecoder().decode(dec);
    }

    async function decryptTree(node, key) {
      if (typeof node === 'string' && node.startsWith(ENC_PREFIX))
        return decryptValue(key, node);
      if (Array.isArray(node))
        return Promise.all(node.map(n => decryptTree(n, key)));
      if (node !== null && typeof node === 'object') {
        const entries = Object.entries(node);
        const vals = await Promise.all(entries.map(([, v]) => decryptTree(v, key)));
        return Object.fromEntries(entries.map(([k], i) => [k, vals[i]]));
      }
      return node;
    }

    async function decryptData(password) {
      const envelope = await DATA_PROMISE;
      const salt = b64toArr(envelope.salt);
      const key = await deriveKey(password, salt);
      const test = await decryptValue(key, envelope.verify);
      if (test !== "CVCG2026") throw new Error("Senha incorreta");
      return decryptTree(envelope.data, key);
    }

    // DATA global — preenchido após descriptografia
    var DATA = null;

    async function doUnlock() {
      const pwd = document.getElementById("pwdInput").value;
      const errEl = document.getElementById("pwdError");
      errEl.textContent = "";

      // Descriptografia — erros aqui significam senha incorreta
      try {
        DATA = await decryptData(pwd);
      } catch (e) {
        errEl.textContent = "Senha incorreta.";
        document.getElementById("pwdInput").select();
        return false;
      }

      // Rendering — erros aqui são bugs, não senha errada
      document.getElementById("lockScreen").style.display = "none";

      // Apresentação scroll-based
      renderPresentation();
      document.getElementById("presentation").style.display = "block";
      document.getElementById("scrollNav").style.display = "flex";
      document.getElementById("ganttSection").style.display = "block";

      // Gantt chart
      render();

      // Navegação por scroll
      initScrollNav();

      initKeyboardNav();
      return false;
    }

    // =====================================================================
    // APRESENTAÇÃO SCROLL-BASED
    // =====================================================================

    // Configura interatividade de highlight bidirecional nos calendários
    function setupCalendarHighlights() {
      // Para cada calendário na página
      document.querySelectorAll('.year-calendar').forEach(calendar => {
        const eventItems = calendar.querySelectorAll('.event-list-item');
        const calendarDays = calendar.querySelectorAll('.mini-calendar-day.event[data-date]');

        // Hover nos itens da lista → highlight dias no calendário
        eventItems.forEach(item => {
          const eventDates = item.dataset.eventDates.split(',');

          item.addEventListener('mouseenter', () => {
            calendarDays.forEach(day => {
              if (eventDates.includes(day.dataset.date)) {
                day.classList.add('highlight');
              }
            });
          });

          item.addEventListener('mouseleave', () => {
            calendarDays.forEach(day => {
              day.classList.remove('highlight');
            });
          });
        });

        // Hover nos dias do calendário → highlight eventos na lista
        calendarDays.forEach(day => {
          const dayDate = day.dataset.date;

          day.addEventListener('mouseenter', () => {
            eventItems.forEach(item => {
              const eventDates = item.dataset.eventDates.split(',');
              if (eventDates.includes(dayDate)) {
                item.classList.add('highlight');
              }
            });
          });

          day.addEventListener('mouseleave', () => {
            eventItems.forEach(item => {
              item.classList.remove('highlight');
            });
          });
        });
      });
    }

    function renderPresentation() {
      const container = document.getElementById("presentation");
      container.innerHTML = "";

      // 1. Hero
      container.appendChild(buildHeroPage());

      // 2. Seções para apresentação: CONECTAR, CRESCER, COMPARTILHAR e DEMANDAS AVULSAS
      const sectionsToShow = ["CONECTAR", "CRESCER", "COMPARTILHAR", "DEMANDAS AVULSAS"];

      sectionsToShow.forEach(sectionName => {
        const sec = DATA.find(s => s.section === sectionName);
        if (!sec) return; // Pula se não encontrar

        const secIdx = DATA.indexOf(sec);
        container.appendChild(buildSectionTitlePage(sec, secIdx));

        // Todos os grupos da seção
        sec.groups.forEach(grp => {
          container.appendChild(buildGroupPage(sec, grp));
        });
      });

      // 3. Transição para o Gantt
      container.appendChild(buildGanttDivider());

      // 4. Configurar highlights bidirecionais nos calendários
      setupCalendarHighlights();
    }

    function initKeyboardNav() {
      console.log("Inicializando navegação por teclado...");
      window.addEventListener("keydown", (e) => {
        // Ignorar se estiver em input ou textarea
        if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

        // Ignorar se não for setas verticais
        if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;

        console.log("Tecla pressionada:", e.key);
        e.preventDefault();

        const sections = [...document.querySelectorAll(".pres-page"), document.getElementById("ganttSection")];
        // Find section closest to top of viewport
        const current = sections.reduce((prev, curr) =>
          Math.abs(curr.getBoundingClientRect().top) < Math.abs(prev.getBoundingClientRect().top) ? curr : prev
        );

        const idx = sections.indexOf(current);
        let nextIdx = idx;

        if (e.key === "ArrowDown") {
          nextIdx = Math.min(sections.length - 1, idx + 1);
        } else if (e.key === "ArrowUp") {
          nextIdx = Math.max(0, idx - 1);
        }

        if (nextIdx !== idx) {
          console.log(`Navegando de ${idx} para ${nextIdx}`);
          sections[nextIdx].scrollIntoView({ behavior: "smooth" });
        }
      });
    }

    function buildHeroPage() {
      const page = document.createElement("div");
      page.className = "pres-page pres-hero";
      page.dataset.navLabel = "Início";

      const totalItems = DATA.reduce((s, sec) => s + sec.groups.reduce((s2, g) => s2 + g.items.length, 0), 0);
      const totalGroups = DATA.reduce((s, sec) => s + sec.groups.length, 0);

      page.innerHTML = `
    <div class="hero-badge">CIDADE VIVA CAMPINA GRANDE</div>
    <h1 class="hero-title">PLANEJAMENTO</h1>
    <p class="hero-subtitle">Visão geral das atividades e cronograma</p>
    <div class="hero-stats">
      <div class="hero-stat"><div class="stat-num">${DATA.length}</div><div class="stat-label">Áreas</div></div>
      <div class="hero-stat"><div class="stat-num">${totalGroups}</div><div class="stat-label">Grupos</div></div>
      <div class="hero-stat"><div class="stat-num">${totalItems}</div><div class="stat-label">Atividades</div></div>
    </div>
    <div class="hero-year">2026</div>
    <div class="hero-scroll" onclick="document.querySelector('.pres-section-title').scrollIntoView({behavior:'smooth'})" style="cursor:pointer">Role para baixo<br>▼</div>
  `;
      return page;
    }

    function buildSectionTitlePage(sec, idx) {
      const page = document.createElement("div");
      page.className = "pres-page pres-section-title";
      page.dataset.navLabel = sec.section;

      // Fundo com tom claro da cor da seção
      const r = parseInt(sec.color.slice(1, 3), 16), g = parseInt(sec.color.slice(3, 5), 16), b = parseInt(sec.color.slice(5, 7), 16);
      page.style.background = `linear-gradient(135deg, rgba(${r},${g},${b},.12), rgba(${r},${g},${b},.06))`;

      const itemCount = sec.groups.reduce((s, gr) => s + gr.items.length, 0);

      page.innerHTML = `
    <div class="section-watermark">${escapeHtml(sec.section)}</div>
    <div class="section-name" style="color:${sec.color}">${escapeHtml(sec.section)}</div>
    <div class="section-stats">${sec.groups.length} grupos · ${itemCount} atividades</div>
  `;
      return page;
    }

    function buildGroupPage(sec, grp) {
      const page = document.createElement("div");
      page.className = "pres-page pres-content-page";
      page.dataset.navLabel = grp.group;

      // Header
      const header = document.createElement("div");
      header.className = "content-header";
      header.innerHTML = `
    <span class="section-tag" style="background:${sec.color}">${escapeHtml(sec.section)}</span>
    <h2>${escapeHtml(grp.group)}</h2>
  `;
      page.appendChild(header);

      // Body: usar renderDocHtml para renderizar o meta
      const body = document.createElement("div");
      body.className = "content-body";
      if (grp.meta) {
        body.innerHTML = renderDocHtml(grp.meta);
      } else {
        body.innerHTML = '<p style="color:#94a3b8;font-style:italic">Detalhes a definir.</p>';
      }
      page.appendChild(body);

      return page;
    }

    function buildGanttDivider() {
      const page = document.createElement("div");
      page.className = "pres-page pres-gantt-divider";
      page.dataset.navLabel = "Cronograma";
      page.innerHTML = `
    <div>
      <h2>Cronograma Geral</h2>
      <p>Visualização completa de todas as atividades ao longo do ano</p>
      <div class="arrow-down" onclick="document.getElementById('ganttSection').scrollIntoView({behavior:'smooth'})" style="cursor:pointer">▼</div>
    </div>
  `;
      return page;
    }

    function initScrollNav() {
      const nav = document.getElementById("scrollNav");
      nav.innerHTML = "";

      const pages = document.querySelectorAll(".pres-page");
      pages.forEach((page, i) => {
        const dot = document.createElement("button");
        dot.className = "nav-dot";
        // Dots maiores para hero e seções
        if (page.classList.contains("pres-hero") || page.classList.contains("pres-section-title") || page.classList.contains("pres-gantt-divider")) {
          dot.classList.add("section-dot");
        }
        dot.title = page.dataset.navLabel || "";
        dot.onclick = () => page.scrollIntoView({ behavior: "smooth" });
        nav.appendChild(dot);
      });

      // Dot para o Gantt
      const ganttDot = document.createElement("button");
      ganttDot.className = "nav-dot section-dot";
      ganttDot.title = "Gantt";
      ganttDot.style.background = "#1e293b";
      ganttDot.onclick = () => document.getElementById("ganttSection").scrollIntoView({ behavior: "smooth" });
      nav.appendChild(ganttDot);

      // IntersectionObserver para highlight
      const allDots = nav.querySelectorAll(".nav-dot");
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const idx = Array.from(pages).indexOf(entry.target);
            if (idx >= 0) {
              allDots.forEach((d, di) => d.classList.toggle("active", di === idx));
            }
          }
        });
      }, { threshold: 0.4 });

      pages.forEach(page => observer.observe(page));
    }

    // =====================================================================
    // Código de rendering (funções globais, acessíveis pelos handlers HTML)
    // =====================================================================


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
          case "p": html += `<p>${block.html}</p>`; break;
          case "ul": html += `<ul>${block.items.map(item => `<li>${item}</li>`).join("")}</ul>`; break;
          case "grid": html += `<div class="info-grid">${block.fields.map(([l, v]) => `<span class="info-label">${escapeHtml(l)}:</span><span class="info-value">${v}</span>`).join("")}</div>`; break;
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
        html += `<div class="tt-title">${tipData.title}</div>`;
        if (dateStr) {
          let d = dateStr;
          if (d.includes(">")) { const [a, b] = d.split(">"); d = fmtDateFull(a) + " a " + fmtDateFull(b); }
          else d = fmtDateFull(dateStr);
          html += `<div class="tt-date">${d}</div>`;
        }
        if (tipData.fields) {
          html += `<div class="tt-detail">`;
          tipData.fields.forEach(([k, v]) => { html += `<span><b>${k}:</b> ${v}</span>`; });
          html += `</div>`;
        }
      } else {
        html = tipData || "";
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
        tip.fields.forEach(([k, v]) => { fieldsHtml += `<span class="info-label">${k}:</span><span class="info-value">${v}</span>`; });
        fieldsHtml += `</div>`;
      }
      const html = `
    <h3 style="margin-top:0">${tip && tip.title ? tip.title : item.name}</h3>
    <div style="display:flex;align-items:center;gap:8px;margin:8px 0">
      <span style="background:${mk.sectionColor};color:#fff;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600">${mk.sectionName}</span>
      <span style="color:#64748b;font-size:12px">›</span>
      <span style="color:#475569;font-size:12px;font-weight:600">${mk.groupName}</span>
    </div>
    <div style="background:#fef3c7;border-left:3px solid #f59e0b;padding:8px 12px;border-radius:0 4px 4px 0;margin:12px 0;font-size:14px;font-weight:600;color:#92400e">
      📅 ${dateDisplay}
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
