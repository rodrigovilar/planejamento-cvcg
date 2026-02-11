    // =====================================================================
    // APRESENTAÇÃO SCROLL-BASED
    // =====================================================================
    let calendarHeightSyncInitialized = false;
    let calendarHeightSyncTimer = null;

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

      // 5. Sincronizar altura da lista de eventos com a grade de meses
      syncYearCalendarColumnHeights();
      requestAnimationFrame(syncYearCalendarColumnHeights);
      if (!calendarHeightSyncInitialized) {
        calendarHeightSyncInitialized = true;
        window.addEventListener("resize", () => {
          clearTimeout(calendarHeightSyncTimer);
          calendarHeightSyncTimer = setTimeout(syncYearCalendarColumnHeights, 120);
        });
      }
    }
