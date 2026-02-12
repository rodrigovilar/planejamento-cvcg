    // =====================================================================
    // APRESENTAÇÃO SCROLL-BASED
    // =====================================================================
    let calendarHeightSyncInitialized = false;
    let calendarHeightSyncTimer = null;
    let dashboardCloudRenderTimer = null;

    function renderDashboardWordClouds() {
      const cloudHosts = document.querySelectorAll(".dash-cloud[data-words]");
      if (!cloudHosts.length) return;

      const palette = ["#2563eb", "#14b8a6", "#6d28d9", "#f59e0b", "#ef4444", "#ec4899", "#16a34a", "#d97706"];
      cloudHosts.forEach(host => {
        let parsed = [];
        try {
          parsed = JSON.parse(decodeURIComponent(host.dataset.words || "[]"));
        } catch (_) {
          parsed = [];
        }
        if (!Array.isArray(parsed) || parsed.length === 0) {
          host.innerHTML = `<div class="dash-cloud-empty">Sem termos suficientes</div>`;
          return;
        }

        const width = Math.max(220, Math.floor(host.clientWidth));
        const height = Math.max(140, Math.floor(host.clientHeight || 170));

        if (typeof window.WordCloud !== "function") {
          host.innerHTML = `<div class="dash-cloud-fallback">${parsed
            .map(([word, count], idx) => `<span style="color:${palette[idx % palette.length]}" title="${count} ocorrências">${word}</span>`)
            .join("")}</div>`;
          return;
        }

        host.innerHTML = "";
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        host.appendChild(canvas);

        window.WordCloud(canvas, {
          list: parsed,
          gridSize: Math.max(6, Math.round(width / 36)),
          weightFactor: value => {
            const numeric = Number(value) || 1;
            return Math.max(16, Math.min(58, numeric * 6));
          },
          fontFamily: "Montserrat, Poppins, Nunito Sans, sans-serif",
          color: (_, weight) => {
            const idx = Math.max(0, Math.min(parsed.length - 1, Math.round(weight) - 1));
            return palette[idx % palette.length];
          },
          rotateRatio: 0.18,
          rotationSteps: 2,
          minRotation: -Math.PI / 2,
          maxRotation: Math.PI / 2,
          backgroundColor: "rgba(0,0,0,0)",
          drawOutOfBound: false,
          shuffle: true
        });
      });
    }

    function syncYearCalendarColumnHeights() {
      document.querySelectorAll('.year-calendar').forEach(calendar => {
        const eventsCol = calendar.querySelector('.year-calendar-events');
        const monthsCol = calendar.querySelector('.year-calendar-months');
        if (!eventsCol || !monthsCol) return;

        const monthsHeight = Math.ceil(monthsCol.getBoundingClientRect().height);
        if (monthsHeight > 0) {
          eventsCol.style.maxHeight = `${monthsHeight}px`;
        } else {
          eventsCol.style.removeProperty('max-height');
        }
      });
    }

    function scrollEventItemIntoView(eventsContainer, item) {
      const containerTop = eventsContainer.scrollTop;
      const containerHeight = eventsContainer.clientHeight;
      const containerRect = eventsContainer.getBoundingClientRect();
      const itemRect = item.getBoundingClientRect();
      const itemTop = (itemRect.top - containerRect.top) + containerTop;
      const itemHeight = itemRect.height;
      const itemBottom = itemTop + itemHeight;
      const visibleTop = containerTop;
      const visibleBottom = containerTop + containerHeight;
      if (itemTop >= visibleTop && itemBottom <= visibleBottom) return;
      const target = itemTop - Math.max(12, (containerHeight - itemHeight) / 2);
      eventsContainer.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
    }

    // Configura interatividade de highlight bidirecional nos calendários
    function setupCalendarHighlights() {
      // Para cada calendário na página
      document.querySelectorAll('.year-calendar').forEach(calendar => {
        const eventItems = calendar.querySelectorAll('.event-list-item');
        const calendarDays = calendar.querySelectorAll('.mini-calendar-day.event[data-date]');
        const eventsContainer = calendar.querySelector('.year-calendar-events');

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
            let firstMatchedItem = null;
            eventItems.forEach(item => {
              const eventDates = item.dataset.eventDates.split(',');
              if (eventDates.includes(dayDate)) {
                item.classList.add('highlight');
                if (!firstMatchedItem) firstMatchedItem = item;
              }
            });
            if (eventsContainer && firstMatchedItem) {
              scrollEventItemIntoView(eventsContainer, firstMatchedItem);
            }
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

      // 5. Renderizar nuvens dos dashboards
      renderDashboardWordClouds();
      requestAnimationFrame(renderDashboardWordClouds);

      // 6. Sincronizar altura da lista de eventos com a grade de meses
      syncYearCalendarColumnHeights();
      requestAnimationFrame(syncYearCalendarColumnHeights);
      if (!calendarHeightSyncInitialized) {
        calendarHeightSyncInitialized = true;
        window.addEventListener("resize", () => {
          clearTimeout(calendarHeightSyncTimer);
          calendarHeightSyncTimer = setTimeout(syncYearCalendarColumnHeights, 120);
          clearTimeout(dashboardCloudRenderTimer);
          dashboardCloudRenderTimer = setTimeout(renderDashboardWordClouds, 150);
        });
      }
    }
