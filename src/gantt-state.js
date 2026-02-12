    // =====================================================================
    // MOTOR DE RENDERIZAÇÃO
    // =====================================================================
const YEAR = 2026, MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
let dayWidth = 3, collapsed = {};
const MIN_DAY_WIDTH = 0.5;
const MAX_DAY_WIDTH = 220;
let zoomMode = "year";
let searchQuery = "";
let renderFramePending = false;
let yearZoomResizeTimer = null;
let yearZoomResizeBound = false;

    function parseDate(s) { const [m, d] = s.split("-").map(Number); return new Date(YEAR, m - 1, d); }
    function dayOfYear(d) { return Math.floor((d - new Date(YEAR, 0, 1)) / 864e5); }
    function dayX(s) { return dayOfYear(parseDate(s)) * dayWidth; }
    function monthWidth(m) { return MONTH_DAYS[m] * dayWidth; }
function totalWidth() { return 365 * dayWidth; }
function fmtDateFull(s) { const dt = parseDate(s); return String(dt.getDate()).padStart(2, "0") + "/" + String(dt.getMonth() + 1).padStart(2, "0") + "/2026 (" + WEEKDAYS[dt.getDay()] + ")"; }
function requestRender() {
  if (renderFramePending) return;
  renderFramePending = true;
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(() => {
      renderFramePending = false;
      render();
    });
  } else {
    renderFramePending = false;
    render();
  }
}
function getTimelineViewportWidth() {
  const wrap = document.getElementById("chartWrap");
  const wrapWidth = wrap ? wrap.clientWidth : 1200;
  const labelsWidth = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--label-w")) || 370;
  return Math.max(240, wrapWidth - labelsWidth - 8);
}
function fitDayWidth(dayCount) {
  const target = getTimelineViewportWidth() / Math.max(1, dayCount);
  return Math.max(MIN_DAY_WIDTH, Math.min(MAX_DAY_WIDTH, target));
}
function updateResetZoomButton() {
  const btn = document.getElementById("resetZoomBtn");
  if (!btn) return;
  btn.style.display = zoomMode === "range" ? "inline-flex" : "none";
}
function applyYearZoom() {
  zoomMode = "year";
  dayWidth = fitDayWidth(365);
  updateResetZoomButton();
}
function resetYearZoom() {
  applyYearZoom();
  requestRender();
  const wrap = document.getElementById("chartWrap");
  if (wrap) wrap.scrollTo({ left: 0, behavior: "smooth" });
}
function zoom(dir) {
  zoomMode = "manual";
  dayWidth = Math.max(MIN_DAY_WIDTH, Math.min(MAX_DAY_WIDTH, dayWidth + dir));
  updateResetZoomButton();
  requestRender();
}
function zoomToRange(startDayIdx, endDayIdx) {
  const start = Math.max(0, Math.min(364, startDayIdx));
  const end = Math.max(start, Math.min(364, endDayIdx));
  const dayCount = (end - start) + 1;
  zoomMode = "range";
  const wrap = document.getElementById("chartWrap");
  dayWidth = fitDayWidth(dayCount);
  updateResetZoomButton();
  requestRender();
  if (wrap) {
    requestAnimationFrame(() => {
      wrap.scrollTo({
        left: Math.max(0, (start * dayWidth) - 10),
        behavior: "smooth"
      });
    });
  }
}
function ensureYearZoomResizeHandler() {
  if (yearZoomResizeBound) return;
  yearZoomResizeBound = true;
  window.addEventListener("resize", () => {
    clearTimeout(yearZoomResizeTimer);
    yearZoomResizeTimer = setTimeout(() => {
      if (zoomMode !== "year") return;
      applyYearZoom();
      requestRender();
    }, 120);
  });
}
function toggleSection(i) { collapsed["s:" + i] = !collapsed["s:" + i]; requestRender(); }
function toggleGroup(i, j) { collapsed["g:" + i + ":" + j] = !collapsed["g:" + i + ":" + j]; requestRender(); }
function toggleAll(exp) { collapsed = {}; if (!exp) DATA.forEach((_, i) => { collapsed["s:" + i] = true; }); requestRender(); }
