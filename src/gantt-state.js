    // =====================================================================
    // MOTOR DE RENDERIZAÇÃO
    // =====================================================================
    const YEAR = 2026, MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    let dayWidth = 3, collapsed = {};
    let searchQuery = "";

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
