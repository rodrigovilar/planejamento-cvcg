    function collectSectionMetrics(section) {
      const groups = section.groups || [];
      const items = groups.flatMap(g => g.items || []);
      const totalActivities = items.length;
      const withDate = items.filter(i => Array.isArray(i.dates) && i.dates.length > 0).length;
      const withoutDate = totalActivities - withDate;
      const multiDateCount = items.filter(i => Array.isArray(i.dates) && i.dates.length > 1).length;
      const coveragePct = totalActivities > 0 ? Math.round((withDate / totalActivities) * 100) : 0;
      return {
        groups: groups.length,
        totalActivities,
        withDate,
        withoutDate,
        multiDateCount,
        coveragePct
      };
    }

    function collectGlobalMetrics() {
      const groups = DATA.reduce((sum, sec) => sum + sec.groups.length, 0);
      const items = DATA.flatMap(sec => sec.groups.flatMap(g => g.items || []));
      const totalActivities = items.length;
      const withDate = items.filter(i => Array.isArray(i.dates) && i.dates.length > 0).length;
      const withoutDate = totalActivities - withDate;
      const multiDateCount = items.filter(i => Array.isArray(i.dates) && i.dates.length > 1).length;
      const coveragePct = totalActivities > 0 ? Math.round((withDate / totalActivities) * 100) : 0;
      return {
        areas: DATA.length,
        groups,
        totalActivities,
        withDate,
        withoutDate,
        multiDateCount,
        coveragePct
      };
    }

    function collectFrequentWords(sections, limit = 16) {
      const STOP_WORDS = new Set([
        "de", "da", "do", "das", "dos", "e", "a", "o", "as", "os", "com", "para", "por", "em", "na", "no", "nas", "nos",
        "uma", "um", "ao", "aos", "ou", "que", "se", "são", "ser", "mais", "menos", "sem", "cvcg", "cidade", "viva",
        "campina", "grande", "min", "ministério", "ministerio", "rede", "ano", "anos", "atividade", "atividades"
      ]);

      const textParts = [];
      sections.forEach(sec => {
        textParts.push(sec.section || "");
        (sec.groups || []).forEach(grp => {
          textParts.push(grp.group || "");
          (grp.items || []).forEach(item => {
            textParts.push(item.name || "");
            if (item.tip && item.tip.title) textParts.push(item.tip.title);
          });
        });
      });
      const text = textParts.join(" ").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const words = text.match(/[a-z0-9]{3,}/g) || [];
      const freq = new Map();
      words.forEach(word => {
        if (STOP_WORDS.has(word)) return;
        freq.set(word, (freq.get(word) || 0) + 1);
      });
      const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
      if (sorted.length === 0) return [];
      const max = sorted[0][1];
      const min = sorted[sorted.length - 1][1];
      return sorted.map(([word, count]) => {
        const scale = max === min ? 1 : (count - min) / (max - min);
        const size = Math.round(12 + (scale * 14));
        return { word, count, size };
      });
    }

    function renderWordCloud(words) {
      if (!words.length) return `<div class="dash-cloud-empty">Sem termos suficientes</div>`;
      const list = words.map(w => [w.word, w.count]);
      const encoded = encodeURIComponent(JSON.stringify(list));
      return `<div class="dash-cloud" data-words="${encoded}" aria-label="Nuvem de palavras"></div>`;
    }

    function renderDashboardCards(metrics, color, mode = "section", wordCloud = []) {
      const pieBg = `conic-gradient(#22c55e 0 ${metrics.coveragePct}%, #ef4444 ${metrics.coveragePct}% 100%)`;
      return `
    <div class="dash-cards dash-${mode}">
      <div class="dash-card dash-pie-card">
        <div class="dash-card-title">Cobertura de Datas</div>
        <div class="dash-pie-wrap">
          <div class="dash-pie" style="background:${pieBg}"></div>
          <div class="dash-pie-center">${metrics.coveragePct}%</div>
        </div>
        <div class="dash-meta">
          <span class="meta-with-date">Com data: <b>${metrics.withDate}</b></span>
          <span class="meta-without-date">Sem data: <b>${metrics.withoutDate}</b></span>
        </div>
      </div>

      <div class="dash-card">
        <div class="dash-card-title">${mode === "hero" ? "Áreas / Grupos" : "Grupos / Atividades"}</div>
        <div class="dash-value">${mode === "hero" ? metrics.areas : metrics.groups}<small> / ${mode === "hero" ? metrics.groups : metrics.totalActivities}</small></div>
        <div class="dash-sub">${mode === "hero" ? "áreas e grupos" : "grupos e atividades"}</div>
      </div>

      <div class="dash-card">
        <div class="dash-card-title">Atividades Recorrentes</div>
        <div class="dash-value">${metrics.multiDateCount}</div>
        <div class="dash-sub">itens com múltiplas datas</div>
      </div>

      <div class="dash-card dash-cloud-card">
        <div class="dash-card-title">Temas Frequentes</div>
        ${renderWordCloud(wordCloud)}
      </div>
    </div>`;
    }

    function buildHeroPage() {
      const page = document.createElement("div");
      page.className = "pres-page pres-hero";
      page.dataset.navLabel = "Início";
      const metrics = collectGlobalMetrics();
      const wordCloud = collectFrequentWords(DATA);

      page.innerHTML = `
    <div class="hero-badge">CIDADE VIVA CAMPINA GRANDE</div>
    <h1 class="hero-title">PLANEJAMENTO</h1>
    <p class="hero-subtitle">Visão geral das atividades e cronograma</p>
    ${renderDashboardCards(metrics, "#3b82f6", "hero", wordCloud)}
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

      const metrics = collectSectionMetrics(sec);
      const wordCloud = collectFrequentWords([sec]);

      page.innerHTML = `
    <div class="section-watermark">${escapeHtml(sec.section)}</div>
    <div class="section-name" style="color:${sec.color}">${escapeHtml(sec.section)}</div>
    ${renderDashboardCards(metrics, sec.color, "section", wordCloud)}
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
