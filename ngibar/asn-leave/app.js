(() => {
  "use strict";

  const DATA_URL = "data.json";
  const FIELDS = {
    status: { key: "assignment_status_alias", selectId: "filter-status", placeholder: "Semua status" },
    lokasi: { key: "lokasi_kerja_fasih", selectId: "filter-lokasi", placeholder: "Semua lokasi" },
    instansiBkd: { key: "instansi_dari_bkd", selectId: "filter-instansi-bkd", placeholder: "Semua instansi BKD" },
    unitBkd: { key: "unit_kerja_dari_bkd", selectId: "filter-unit-bkd", placeholder: "Semua unit kerja" },
    instansiFasih: { key: "instansi_kerja_fasih", selectId: "filter-instansi-fasih", placeholder: "Semua instansi Fasih" }
  };

  const state = {
    data: [],
    filtered: [],
    page: 1,
    pageSize: 12,
    query: "",
    filters: { status: "", lokasi: "", instansiBkd: "", unitBkd: "", instansiFasih: "" }
  };

  const $ = (selector) => document.querySelector(selector);
  const els = {
    search: $("#search-input"),
    reset: $("#reset-button"),
    emptyReset: $("#empty-reset-button"),
    pageSize: $("#page-size"),
    summary: $("#results-summary"),
    grid: $("#results-grid"),
    message: $("#data-message"),
    empty: $("#empty-state"),
    pagination: $("#pagination"),
    pageInfo: $("#page-info"),
    prev: $("#prev-page"),
    next: $("#next-page")
  };

  function asText(value) {
    if (value === null || value === undefined) return "";
    const result = String(value).trim();
    return result.toLowerCase() === "nan" || result.toLowerCase() === "none" ? "" : result;
  }

  function normalize(value) {
    return asText(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("id-ID");
  }

  function firstNonEmpty(...values) {
    for (const value of values) {
      const text = asText(value);
      if (text) return text;
    }
    return "";
  }

  function getAddress(record) {
    return firstNonEmpty(record.alamat_dari_bkd, record.alamat_prelist);
  }

  // Menerima URL biasa maupun Markdown link seperti [label](https://contoh.id/...).
  function getCawiUrl(value) {
    let text = asText(value);
    if (!text) return "";
    text = text.replace(/\\\[/g, "[").replace(/\\\]/g, "]");

    const markdownMatch = text.match(/\]\((https?:\/\/[^\s)]+)\)/i);
    if (markdownMatch) text = markdownMatch[1];
    else {
      const urlMatch = text.match(/https?:\/\/[^\s)\]>]+/i);
      if (urlMatch) text = urlMatch[0];
    }

    try {
      const parsed = new URL(text);
      if (parsed.protocol === "https:" || parsed.protocol === "http:") return parsed.href;
    } catch (_) {
      return "";
    }
    return "";
  }

  function createSvg(pathMarkup, className = "") {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    if (className) svg.setAttribute("class", className);
    svg.innerHTML = pathMarkup;
    return svg;
  }

  function setOptions(select, values, placeholder) {
    const selected = select.value;
    select.replaceChildren();
    const allOption = document.createElement("option");
    allOption.value = "";
    allOption.textContent = placeholder;
    select.append(allOption);

    const unique = new Map();
    state.data.forEach((record) => {
      const raw = asText(record[select.dataset.field]);
      if (raw && !unique.has(raw)) unique.set(raw, raw);
    });
    [...unique.values()]
      .sort((a, b) => a.localeCompare(b, "id", { sensitivity: "base", numeric: true }))
      .forEach((value) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        select.append(option);
      });
    select.value = [...unique.values()].includes(selected) ? selected : "";
  }

  function buildFilters() {
    Object.entries(FIELDS).forEach(([filterName, config]) => {
      const select = document.getElementById(config.selectId);
      select.dataset.filter = filterName;
      select.dataset.field = config.key;
      setOptions(select, state.data, config.placeholder);
    });
  }

  function recordSearchText(record) {
    return normalize([
      record.assignment_id,
      record.code_identity,
      record.nama_prelist,
      record.alamat_prelist,
      record.alamat_dari_bkd,
      record["SATUAN KERJA"],
      record.assignment_status_alias,
      record.instansi_dari_bkd,
      record.unit_kerja_dari_bkd,
      record.instansi_kerja_fasih,
      record.lokasi_kerja_fasih,
      record.link_cawi
    ].map(asText).join(" "));
  }

  function applyFilters() {
    state.query = normalize(els.search.value);
    state.filtered = state.data.filter((record) => {
      if (state.query && !recordSearchText(record).includes(state.query)) return false;
      return Object.entries(FIELDS).every(([filterName, config]) => {
        const selected = state.filters[filterName];
        return !selected || asText(record[config.key]) === selected;
      });
    });
    state.page = 1;
    render();
  }

  function appendDetail(list, label, value) {
    const row = document.createElement("div");
    row.className = "detail-row";
    const dt = document.createElement("dt");
    dt.textContent = label;
    const dd = document.createElement("dd");
    const text = asText(value);
    dd.textContent = text || "Belum tersedia";
    if (!text) dd.className = "detail-empty";
    row.append(dt, dd);
    list.append(row);
  }

  function createCard(record) {
    const card = document.createElement("article");
    card.className = "assignment-card";

    const top = document.createElement("div");
    top.className = "card-top";
    const status = document.createElement("span");
    const statusText = asText(record.assignment_status_alias) || "Status tidak tersedia";
    status.className = `status-badge${statusText === "Status tidak tersedia" ? " neutral" : ""}`;
    status.textContent = statusText;
    const code = document.createElement("span");
    code.className = "card-code";
    code.textContent = asText(record.code_identity);
    code.title = code.textContent;
    top.append(status, code);

    const name = document.createElement("h3");
    name.className = "card-name";
    name.textContent = firstNonEmpty(record.nama_prelist, "Nama tidak tersedia");

    const address = document.createElement("p");
    address.className = "card-address";
    address.append(createSvg('<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"></path><circle cx="12" cy="10" r="2.5"></circle>'));
    const addressText = document.createElement("span");
    addressText.textContent = getAddress(record) || "Alamat belum tersedia";
    address.append(addressText);

    const details = document.createElement("dl");
    details.className = "card-details";
    appendDetail(details, "Instansi (BKD)", record.instansi_dari_bkd);
    appendDetail(details, "Unit Kerja (BKD)", record.unit_kerja_dari_bkd);
    appendDetail(details, "Instansi (Fasih)", record.instansi_kerja_fasih);

    const location = asText(record.lokasi_kerja_fasih);
    let locationElement = null;
    if (location) {
      locationElement = document.createElement("p");
      locationElement.className = "card-lokasi";
      locationElement.append(createSvg('<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"></path><circle cx="12" cy="10" r="2.5"></circle>'));
      const locationText = document.createElement("span");
      locationText.textContent = `Lokasi: ${location}`;
      locationElement.append(locationText);
    }

    const action = document.createElement("div");
    action.className = "card-action";
    const note = document.createElement("span");
    note.className = "card-action-note";
    note.textContent = "Tautan pengisian";
    action.append(note);

    const cawiUrl = getCawiUrl(record.link_cawi);
    if (cawiUrl) {
      const link = document.createElement("a");
      link.className = "button cawi-button";
      link.href = cawiUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.append(document.createTextNode("Buka CAWI "));
      link.append(createSvg('<path d="M14 3h7v7"></path><path d="M10 14 21 3"></path><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>'));
      action.append(link);
    } else {
      const unavailable = document.createElement("span");
      unavailable.className = "cawi-unavailable";
      unavailable.textContent = "Tautan tidak tersedia";
      action.append(unavailable);
    }

    card.append(top, name, address, details);
    if (locationElement) card.append(locationElement);
    card.append(action);
    return card;
  }

  function render() {
    const total = state.filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / state.pageSize));
    if (state.page > totalPages) state.page = totalPages;
    const startIndex = (state.page - 1) * state.pageSize;
    const pageData = state.filtered.slice(startIndex, startIndex + state.pageSize);

    els.grid.replaceChildren();
    pageData.forEach((record) => els.grid.append(createCard(record)));
    els.grid.setAttribute("aria-busy", "false");

    const filteredNumber = total.toLocaleString("id-ID");
    const allNumber = state.data.length.toLocaleString("id-ID");
    els.summary.replaceChildren();
    const strong = document.createElement("strong");
    strong.textContent = filteredNumber;
    els.summary.append(strong, document.createTextNode(` dari ${allNumber} assignment ditampilkan`));
    if (state.query || Object.values(state.filters).some(Boolean)) {
      els.summary.append(document.createTextNode(" · hasil pencarian"));
    }

    const hasResults = total > 0;
    els.empty.hidden = hasResults;
    els.grid.hidden = !hasResults;
    els.pagination.hidden = !hasResults || total <= state.pageSize;
    if (hasResults) {
      const from = startIndex + 1;
      const to = Math.min(startIndex + state.pageSize, total);
      els.pageInfo.textContent = `Menampilkan ${from.toLocaleString("id-ID")}–${to.toLocaleString("id-ID")} dari ${filteredNumber}`;
      els.prev.disabled = state.page <= 1;
      els.next.disabled = state.page >= totalPages;
    }
  }

  function resetAll() {
    els.search.value = "";
    Object.keys(state.filters).forEach((key) => { state.filters[key] = ""; });
    Object.values(FIELDS).forEach((config) => { document.getElementById(config.selectId).value = ""; });
    state.page = 1;
    applyFilters();
    els.search.focus();
  }

  function showLoadError(error) {
    els.grid.setAttribute("aria-busy", "false");
    els.summary.textContent = "Data belum dapat dimuat.";
    els.message.hidden = false;
    els.message.textContent = `Gagal membaca ${DATA_URL}. Pastikan file tersebut ada di folder yang sama dengan index.html dan jalankan situs melalui web server/hosting (bukan membuka index.html langsung). Detail: ${error.message || "format data tidak sesuai"}`;
    els.empty.hidden = true;
    els.grid.hidden = true;
    els.pagination.hidden = true;
  }

  async function init() {
    Object.entries(FIELDS).forEach(([filterName, config]) => {
      const select = document.getElementById(config.selectId);
      select.addEventListener("change", () => {
        state.filters[filterName] = select.value;
        state.page = 1;
        applyFilters();
      });
    });

    els.search.addEventListener("input", applyFilters);
    els.reset.addEventListener("click", resetAll);
    els.emptyReset.addEventListener("click", resetAll);
    els.pageSize.addEventListener("change", () => {
      state.pageSize = Number(els.pageSize.value) || 12;
      state.page = 1;
      render();
    });
    els.prev.addEventListener("click", () => {
      if (state.page > 1) { state.page -= 1; render(); }
    });
    els.next.addEventListener("click", () => {
      const totalPages = Math.ceil(state.filtered.length / state.pageSize);
      if (state.page < totalPages) { state.page += 1; render(); }
    });

    document.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        els.search.focus();
      }
      if (event.key === "Escape" && document.activeElement === els.search) {
        els.search.value = "";
        applyFilters();
      }
    });

    try {
      const response = await fetch(DATA_URL, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      if (!Array.isArray(json)) throw new Error("data.json harus berupa array JSON berisi objek");
      state.data = json.filter((item) => item && typeof item === "object" && !Array.isArray(item));
      buildFilters();
      state.filtered = state.data.slice();
      render();
    } catch (error) {
      showLoadError(error);
      console.error("Gagal memuat data assignment:", error);
    }
  }

  init();
})();
