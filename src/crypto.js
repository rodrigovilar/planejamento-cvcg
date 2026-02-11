    // Dados carregados de arquivo JSON com valores criptografados individualmente (AES-256-GCM, PBKDF2 100k iterações)
    const DATA_PROMISE = fetch("data.json").then(r => {
      if (!r.ok) {
        const err = new Error(`Falha ao carregar data.json (${r.status})`);
        err.name = "DataLoadError";
        throw err;
      }
      return r.json();
    });
    const ENC_PREFIX = "ENC:";

    async function deriveKey(password, salt) {
      const enc = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
      return crypto.subtle.deriveKey(
        { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["decrypt"]
      );
    }

    function b64toArr(b64) {
      const bin = atob(b64);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      return arr;
    }

    async function decryptValue(key, encStr) {
      const raw = b64toArr(encStr.slice(ENC_PREFIX.length));
      const iv = raw.slice(0, 12);
      const ct = raw.slice(12);
      const dec = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
      return new TextDecoder().decode(dec);
    }

    async function decryptTree(node, key) {
      if (typeof node === 'string' && node.startsWith(ENC_PREFIX))
        return decryptValue(key, node);
      if (Array.isArray(node))
        return Promise.all(node.map(n => decryptTree(n, key)));
      if (node !== null && typeof node === 'object') {
        const entries = Object.entries(node);
        const vals = await Promise.all(entries.map(([, v]) => decryptTree(v, key)));
        return Object.fromEntries(entries.map(([k], i) => [k, vals[i]]));
      }
      return node;
    }

    async function decryptData(password) {
      const envelope = await DATA_PROMISE;
      const salt = b64toArr(envelope.salt);
      const key = await deriveKey(password, salt);
      const test = await decryptValue(key, envelope.verify);
      if (test !== "CVCG2026") throw new Error("Senha incorreta");
      const data = await decryptTree(envelope.data, key);
      return normalizeAndAssertDecryptedData(data);
    }

    // DATA global — preenchido após descriptografia
    var DATA = null;

    async function doUnlock() {
      const pwd = document.getElementById("pwdInput").value;
      const errEl = document.getElementById("pwdError");
      errEl.textContent = "";

      // Descriptografia — erros aqui significam senha incorreta
      try {
        DATA = await decryptData(pwd);
        if (typeof resetSearchCaches === "function") resetSearchCaches();
      } catch (e) {
        if (e && e.name === "DataValidationError") {
          errEl.textContent = "Dados inválidos (formato do arquivo).";
        } else if (e && e.name === "DataLoadError") {
          errEl.textContent = "Não foi possível carregar data.json.";
        } else {
          errEl.textContent = "Senha incorreta.";
        }
        document.getElementById("pwdInput").select();
        return false;
      }

      // Rendering — erros aqui são bugs, não senha errada
      document.getElementById("lockScreen").style.display = "none";

      // Apresentação scroll-based
      renderPresentation();
      document.getElementById("presentation").style.display = "block";
      document.getElementById("scrollNav").style.display = "flex";
      document.getElementById("ganttSection").style.display = "block";

      // Gantt chart
      requestRender();

      // Navegação por scroll
      initScrollNav();

      initKeyboardNav();
      return false;
    }
