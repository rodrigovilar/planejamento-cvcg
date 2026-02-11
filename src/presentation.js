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
