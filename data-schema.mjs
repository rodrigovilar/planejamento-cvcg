const META_BLOCK_TYPES = new Set(["h3", "h4", "p", "ul", "grid", "note", "table", "cal"]);

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isDateToken(token) {
  if (typeof token !== "string") return false;
  if (token.includes(">")) {
    const [start, end] = token.split(">");
    return isDateToken(start) && isDateToken(end);
  }
  const m = /^(\d{2})-(\d{2})$/.exec(token);
  if (!m) return false;
  const month = Number(m[1]);
  const day = Number(m[2]);
  if (month < 1 || month > 12) return false;
  const monthDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day >= 1 && day <= monthDays[month - 1];
}

function addError(errors, path, message) {
  errors.push(`${path}: ${message}`);
}

function validateTip(tip, errors, path) {
  if (!isObject(tip)) {
    addError(errors, path, "deve ser objeto");
    return;
  }
  if (tip.title !== undefined && typeof tip.title !== "string") {
    addError(errors, `${path}.title`, "deve ser string");
  }
  if (tip.fields !== undefined) {
    if (!Array.isArray(tip.fields)) {
      addError(errors, `${path}.fields`, "deve ser array");
    } else {
      tip.fields.forEach((field, index) => {
        if (!Array.isArray(field) || field.length !== 2) {
          addError(errors, `${path}.fields[${index}]`, "deve ser tupla [chave, valor]");
          return;
        }
        if (typeof field[0] !== "string" || typeof field[1] !== "string") {
          addError(errors, `${path}.fields[${index}]`, "chave e valor devem ser string");
        }
      });
    }
  }
}

function validateMeta(meta, errors, path) {
  if (!isObject(meta)) {
    addError(errors, path, "deve ser objeto");
    return;
  }
  if (meta.title !== undefined && typeof meta.title !== "string") {
    addError(errors, `${path}.title`, "deve ser string");
  }
  if (!Array.isArray(meta.blocks)) {
    addError(errors, `${path}.blocks`, "deve ser array");
    return;
  }

  meta.blocks.forEach((block, bi) => {
    const blockPath = `${path}.blocks[${bi}]`;
    if (!isObject(block)) {
      addError(errors, blockPath, "deve ser objeto");
      return;
    }
    if (typeof block.type !== "string" || !META_BLOCK_TYPES.has(block.type)) {
      addError(errors, `${blockPath}.type`, "tipo de bloco inválido");
      return;
    }

    switch (block.type) {
      case "h3":
      case "h4":
      case "note":
        if (typeof block.text !== "string") addError(errors, `${blockPath}.text`, "deve ser string");
        break;
      case "p":
        if (typeof block.html !== "string") addError(errors, `${blockPath}.html`, "deve ser string");
        break;
      case "ul":
        if (!Array.isArray(block.items) || block.items.some(item => typeof item !== "string")) {
          addError(errors, `${blockPath}.items`, "deve ser array de strings");
        }
        break;
      case "grid":
        if (!Array.isArray(block.fields)) {
          addError(errors, `${blockPath}.fields`, "deve ser array");
          break;
        }
        block.fields.forEach((field, fi) => {
          if (!Array.isArray(field) || field.length !== 2 || typeof field[0] !== "string" || typeof field[1] !== "string") {
            addError(errors, `${blockPath}.fields[${fi}]`, "deve ser tupla [string, string]");
          }
        });
        break;
      case "table":
        if (!Array.isArray(block.headers) || block.headers.some(h => typeof h !== "string")) {
          addError(errors, `${blockPath}.headers`, "deve ser array de strings");
        }
        if (!Array.isArray(block.rows) || block.rows.some(r => !Array.isArray(r) || r.some(c => typeof c !== "string"))) {
          addError(errors, `${blockPath}.rows`, "deve ser matriz de strings");
        }
        break;
      case "cal":
        if (!Array.isArray(block.entries)) {
          addError(errors, `${blockPath}.entries`, "deve ser array");
          break;
        }
        block.entries.forEach((entry, ei) => {
          if (!isObject(entry)) {
            addError(errors, `${blockPath}.entries[${ei}]`, "deve ser objeto");
            return;
          }
          if (entry.header !== undefined && entry.header !== null && typeof entry.header !== "string") {
            addError(errors, `${blockPath}.entries[${ei}].header`, "deve ser string");
          }
          if (entry.detail !== undefined && entry.detail !== null && typeof entry.detail !== "string") {
            addError(errors, `${blockPath}.entries[${ei}].detail`, "deve ser string");
          }
        });
        break;
      default:
        break;
    }
  });
}

export function validatePlanningData(data) {
  const errors = [];
  const summary = {
    sections: 0,
    groups: 0,
    items: 0,
    itemsWithDates: 0
  };

  if (!Array.isArray(data)) {
    addError(errors, "data", "deve ser array de seções");
    return { ok: false, errors, summary };
  }

  summary.sections = data.length;

  data.forEach((section, si) => {
    const sectionPath = `data[${si}]`;
    if (!isObject(section)) {
      addError(errors, sectionPath, "deve ser objeto");
      return;
    }
    if (typeof section.section !== "string" || !section.section.trim()) {
      addError(errors, `${sectionPath}.section`, "deve ser string não vazia");
    }
    if (typeof section.color !== "string" || !/^#[0-9a-fA-F]{6}$/.test(section.color)) {
      addError(errors, `${sectionPath}.color`, "deve ser cor hex (#RRGGBB)");
    }
    if (!Array.isArray(section.groups)) {
      addError(errors, `${sectionPath}.groups`, "deve ser array");
      return;
    }

    summary.groups += section.groups.length;

    section.groups.forEach((group, gi) => {
      const groupPath = `${sectionPath}.groups[${gi}]`;
      if (!isObject(group)) {
        addError(errors, groupPath, "deve ser objeto");
        return;
      }
      if (typeof group.group !== "string" || !group.group.trim()) {
        addError(errors, `${groupPath}.group`, "deve ser string não vazia");
      }
      if (!Array.isArray(group.items)) {
        addError(errors, `${groupPath}.items`, "deve ser array");
        return;
      }
      if (group.meta !== undefined) validateMeta(group.meta, errors, `${groupPath}.meta`);

      summary.items += group.items.length;

      group.items.forEach((item, ii) => {
        const itemPath = `${groupPath}.items[${ii}]`;
        if (!isObject(item)) {
          addError(errors, itemPath, "deve ser objeto");
          return;
        }
        if (typeof item.name !== "string" || !item.name.trim()) {
          addError(errors, `${itemPath}.name`, "deve ser string não vazia");
        }
        if (item.milestone !== undefined && typeof item.milestone !== "boolean") {
          addError(errors, `${itemPath}.milestone`, "deve ser boolean");
        }
        if (item.tip !== undefined) validateTip(item.tip, errors, `${itemPath}.tip`);

        if (item.dates !== undefined) {
          if (!Array.isArray(item.dates)) {
            addError(errors, `${itemPath}.dates`, "deve ser array");
          } else {
            if (item.dates.length > 0) summary.itemsWithDates++;
            item.dates.forEach((token, di) => {
              if (!isDateToken(token)) {
                addError(errors, `${itemPath}.dates[${di}]`, "data inválida (esperado MM-DD ou MM-DD>MM-DD)");
              }
            });
          }
        }
      });
    });
  });

  return {
    ok: errors.length === 0,
    errors,
    summary
  };
}

export function assertPlanningData(data) {
  const result = validatePlanningData(data);
  if (!result.ok) {
    const preview = result.errors.slice(0, 20).join("\n");
    const extra = result.errors.length > 20 ? `\n... +${result.errors.length - 20} erro(s)` : "";
    throw new Error(`Modelo de dados inválido:\n${preview}${extra}`);
  }
  return result;
}
