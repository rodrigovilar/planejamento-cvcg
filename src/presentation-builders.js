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
      page.dataset.section = sec.section;
      page.dataset.sectionColor = sec.color;

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
      page.dataset.section = sec.section;
      page.dataset.sectionColor = sec.color;

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
