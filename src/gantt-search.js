    // =====================================================================
    // BUSCA – pesquisa em todos os campos de dados
    // =====================================================================
    function normalize(s) { return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }

    function textFromMeta(meta) {
      if (!meta) return "";
      let parts = [meta.title || ""];
      (meta.blocks || []).forEach(b => {
        if (b.text) parts.push(b.text);
        if (b.html) parts.push(b.html.replace(/<[^>]*>/g, ""));
        if (b.items) parts.push(b.items.join(" ").replace(/<[^>]*>/g, ""));
        if (b.fields) b.fields.forEach(f => parts.push(f[0] + " " + f[1]));
        if (b.headers) parts.push(b.headers.join(" "));
        if (b.rows) b.rows.forEach(r => parts.push(r.join(" ")));
        if (b.entries) b.entries.forEach(e => parts.push((e.header || "") + " " + (e.detail || "")));
      });
      return parts.join(" ");
    }

    function textFromItem(item) {
      let parts = [item.name || ""];
      if (item.dates) parts.push(item.dates.join(" "));
      if (item.tip) {
        if (item.tip.title) parts.push(item.tip.title);
        if (item.tip.fields) item.tip.fields.forEach(f => parts.push(f[0] + " " + f[1]));
      }
      return parts.join(" ");
    }

    function itemMatches(item, q) { return normalize(textFromItem(item)).includes(q); }
    function groupMatches(grp, q) {
      const metaText = normalize(textFromMeta(grp.meta));
      if (metaText.includes(q)) return "full";
      if (normalize(grp.group).includes(q)) return "full";
      const matchItems = grp.items.filter(it => itemMatches(it, q));
      return matchItems.length > 0 ? "partial" : false;
    }

    function onSearch(val) {
      searchQuery = normalize(val.trim());
      // Auto-expand when searching
      if (searchQuery) { collapsed = {}; }
      render();
    }
    function clearSearch() {
      document.getElementById("searchInput").value = "";
      searchQuery = "";
      render();
    }

    function highlightText(text, q) {
      if (!q) return escapeHtml(text);
      const safe = escapeHtml(text);
      const nText = normalize(text);
      const idx = nText.indexOf(q);
      if (idx < 0) return safe;
      // Map normalized index back to original text
      return escapeHtml(text.substring(0, idx)) + '<span class="highlight">' + escapeHtml(text.substring(idx, idx + q.length)) + '</span>' + escapeHtml(text.substring(idx + q.length));
    }
