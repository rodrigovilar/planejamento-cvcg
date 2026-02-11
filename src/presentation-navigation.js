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
