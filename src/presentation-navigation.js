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

      function createDot({ label, color, isArea, onClick }) {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = "nav-dot";
        if (isArea) dot.classList.add("area-dot");
        dot.style.setProperty("--dot-color", color || "#94a3b8");
        dot.title = label || "";
        dot.setAttribute("aria-label", label || "");
        dot.onclick = onClick;

        const chip = document.createElement("span");
        chip.className = "nav-dot-chip";
        chip.textContent = label || "";
        dot.appendChild(chip);

        return dot;
      }

      const pages = document.querySelectorAll(".pres-page");
      pages.forEach((page, i) => {
        const section = page.dataset.section || "";
        const label = page.classList.contains("pres-content-page")
          ? `${section} · ${page.dataset.navLabel || ""}`
          : (page.dataset.navLabel || "");
        const color = page.dataset.sectionColor
          || (page.classList.contains("pres-hero") ? "#475569" : "#64748b");
        const dot = createDot({
          label,
          color,
          isArea: page.classList.contains("pres-section-title"),
          onClick: () => page.scrollIntoView({ behavior: "smooth" })
        });
        nav.appendChild(dot);
      });

      // Dot para o Gantt
      const ganttDot = createDot({
        label: "Gantt",
        color: "#1e293b",
        isArea: true,
        onClick: () => document.getElementById("ganttSection").scrollIntoView({ behavior: "smooth" })
      });
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
            if (entry.target.id === "ganttSection") {
              allDots.forEach((d, di) => d.classList.toggle("active", di === allDots.length - 1));
            }
          }
        });
      }, { threshold: 0.4 });

      pages.forEach(page => observer.observe(page));
      observer.observe(document.getElementById("ganttSection"));
    }
