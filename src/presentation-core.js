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
