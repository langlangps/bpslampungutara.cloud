(() => {
  "use strict";

  const DATA_URL = "data.json";
  const NIK_FIELDS = ["dtsen_no_kk", ...Array.from({ length: 10 }, (_, i) => `nik_dtsen#${i + 1}`)];
  const SENSITIVE_FIELDS = new Set(NIK_FIELDS);
  const FIELDS = {
    status: { keys: ["assignment_status_alias"], selectId: "filter-status", placeholder: "Semua status" },
    lokasi: { keys: ["instansi_lokasi", "lokasi_kerja_fasih"], selectId: "filter-lokasi", placeholder: "Semua lokasi" },
    instansiBkd: { keys: ["Instansi", "instansi_dari_bkd"], selectId: "filter-instansi-bkd", placeholder: "Semua instansi BKD" },
    unitBkd: { keys: ["Unit Kerja", "unit_kerja_dari_bkd"], selectId: "filter-unit-bkd", placeholder: "Semua unit kerja" },
    instansiFasih: { keys: ["instansi_kerja", "instansi_kerja_fasih"], selectId: "filter-instansi-fasih", placeholder: "Semua instansi Fasih" }
  };

  const state = {
    data: [], filtered: [], page: 1, pageSize: 12, query: "",
    activeRecord: null, filters: { status: "", lokasi: "", instansiBkd: "", unitBkd: "", instansiFasih: "" }
  };

  const $ = (selector) => document.querySelector(selector);
  const els = {
    search: $("#search-input"), reset: $("#reset-button"), emptyReset: $("#empty-reset-button"), pageSize: $("#page-size"),
    summary: $("#results-summary"), grid: $("#results-grid"), message: $("#data-message"), empty: $("#empty-state"),
    pagination: $("#pagination"), pageInfo: $("#page-info"), prev: $("#prev-page"), next: $("#next-page"),
    dialog: $("#verification-dialog"), dialogForm: $("#verification-form"), dialogClose: $("#verification-close"),
    dialogCancel: $("#verification-cancel"), dialogRecordName: $("#verification-record-name"), identityInput: $("#identity-input"),
    verificationError: $("#verification-error")
  };

  function asText(value) {
    if (value === null || value === undefined) return "";
    if (typeof value === "number" && Number.isNaN(value)) return "";
    const result = String(value).trim();
    return ["nan", "none", "null", "nat"].includes(result.toLowerCase()) ? "" : result;
  }

  function normalize(value) {
    return asText(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("id-ID");
  }

  function firstNonEmpty(...values) {
    for (const value of values) {
      const text = asText(value);
      if (text) return text;
    }
    return "";
  }

  function getField(record, keys) {
    return firstNonEmpty(...keys.map((key) => record?.[key]));
  }

  function getName(record) {
    return firstNonEmpty(record.nama_prelist, "Nama tidak tersedia");
  }

  function getAddress(record) {
    // Support both the new data shape (ALAMAT/data2) and the previous shape.
    return firstNonEmpty(record.ALAMAT, record.alamat_dari_bkd, record.data2, record.alamat_prelist);
  }

  function getInstansiBkd(record) { return getField(record, ["Instansi", "instansi_dari_bkd"]); }
  function getUnitBkd(record) { return getField(record, ["Unit Kerja", "unit_kerja_dari_bkd"]); }
  function getInstansiFasih(record) { return getField(record, ["instansi_kerja", "instansi_kerja_fasih"]); }
  function getLocation(record) { return getField(record, ["instansi_lokasi", "lokasi_kerja_fasih"]); }
  function getCawiValue(record) { return firstNonEmpty(record.url, record.link_cawi); }

  // Menerima URL biasa atau format Markdown seperti [label](https://contoh.id/tautan).
  // Hanya mengizinkan HTTPS ke domain CAWI BPS yang diharapkan.
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
      if (parsed.protocol !== "https:" || parsed.hostname !== "esurvey.bps.go.id" || !parsed.pathname.startsWith("/h/s/")) return "";
      return parsed.href;
    } catch (_) {
      return "";
    }
  }

  function createSvg(pathMarkup, className = "") {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    if (className) svg.setAttribute("class", className);
    svg.innerHTML = pathMarkup;
    return svg;
  }

  function getFilterValue(record, filterName) {
    return getField(record, FIELDS[filterName].keys);
  }

  function setOptions(select, placeholder) {
    const selected = select.value;
    select.replaceChildren();
    const allOption = document.createElement("option");
    allOption.value = "";
    allOption.textContent = placeholder;
    select.append(allOption);

    const unique = new Set();
    state.data.forEach((record) => {
      const value = getFilterValue(record, select.dataset.filter);
      if (value) unique.add(value);
    });
    const sorted = [...unique].sort((a, b) => a.localeCompare(b, "id", { sensitivity: "base", numeric: true }));
    sorted.forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.append(option);
    });
    select.value = sorted.includes(selected) ? selected : "";
  }

  function buildFilters() {
    Object.entries(FIELDS).forEach(([filterName, config]) => {
      const select = document.getElementById(config.selectId);
      select.dataset.filter = filterName;
      setOptions(select, config.placeholder);
    });
  }

  function recordSearchText(record) {
    // NIK/No. KK and URL are deliberately omitted from general search.
    const values = Object.entries(record).filter(([key, value]) => {
      if (SENSITIVE_FIELDS.has(key) || key === "url" || key === "link_cawi") return false;
      return value !== null && value !== undefined && typeof value !== "object";
    }).map(([, value]) => asText(value));
    return normalize(values.join(" "));
  }

  function applyFilters() {
    state.query = normalize(els.search.value);
    state.filtered = state.data.filter((record) => {
      if (state.query && !recordSearchText(record).includes(state.query)) return false;
      return Object.entries(FIELDS).every(([filterName]) => {
        const selected = state.filters[filterName];
        return !selected || getFilterValue(record, filterName) === selected;
      });
    });
    state.page = 1;
    render();
  }

  function appendDetail(list, label, value) {
    if (!asText(value)) return;
    const row = document.createElement("div");
    row.className = "detail-row";
    const dt = document.createElement("dt");
    dt.textContent = label;
    const dd = document.createElement("dd");
    dd.textContent = asText(value);
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
    name.textContent = getName(record);

    const address = document.createElement("p");
    address.className = "card-address";
    address.append(createSvg('<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"></path><circle cx="12" cy="10" r="2.5"></circle>'));
    const addressText = document.createElement("span");
    addressText.textContent = getAddress(record) || "Alamat belum tersedia";
    address.append(addressText);

    const details = document.createElement("dl");
    details.className = "card-details";
    const instansiBkd = getInstansiBkd(record);
    const unitBkd = getUnitBkd(record);
    const instansiFasih = getInstansiFasih(record);

    // Prioritaskan data BKD jika salah satunya terisi. Tampilkan Fasih hanya jika keduanya kosong.
    if (instansiBkd || unitBkd) {
      appendDetail(details, "Instansi (BKD)", instansiBkd);
      appendDetail(details, "Unit Kerja (BKD)", unitBkd);
    } else if (instansiFasih) {
      appendDetail(details, "Instansi (Fasih)", instansiFasih);
    }

    const location = getLocation(record);
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
    note.textContent = "Perlu verifikasi identitas";
    action.append(note);

    if (getCawiUrl(getCawiValue(record))) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "button cawi-button";
      button.append(document.createTextNode("Verifikasi & buka CAWI "));
      button.append(createSvg('<path d="M14 3h7v7"></path><path d="M10 14 21 3"></path><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>'));
      button.addEventListener("click", () => openVerification(record));
      action.append(button);
    } else {
      const unavailable = document.createElement("span");
      unavailable.className = "cawi-unavailable";
      unavailable.textContent = "Tautan tidak tersedia";
      action.append(unavailable);
    }

    card.append(top, name, address);
    if (details.children.length) card.append(details);
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
    if (state.query || Object.values(state.filters).some(Boolean)) els.summary.append(document.createTextNode(" · hasil pencarian"));

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

  function clearVerificationError() {
    els.verificationError.textContent = "";
    els.verificationError.hidden = true;
    els.identityInput.removeAttribute("aria-invalid");
  }

  function showVerificationError(message) {
    els.verificationError.textContent = message;
    els.verificationError.hidden = false;
    els.identityInput.setAttribute("aria-invalid", "true");
    els.identityInput.focus();
  }

  function openVerification(record) {
    state.activeRecord = record;
    els.dialogForm.reset();
    clearVerificationError();
    els.dialogRecordName.textContent = `Assignment: ${getName(record)}. Masukkan NIK atau Nomor KK.`;
    if (typeof els.dialog.showModal === "function") {
      els.dialog.showModal();
      window.setTimeout(() => els.identityInput.focus(), 0);
    } else {
      // Browser lawas: degrade gracefully to a blocking prompt.
      const value = window.prompt(`Verifikasi untuk ${getName(record)}\nMasukkan NIK atau Nomor KK:`);
      if (value !== null) validateAndOpen(value, record);
      state.activeRecord = null;
    }
  }

  function normalizeIdentity(value) {
    // Hanya abaikan spasi/tanda hubung saat pengguna memisahkan digit.
    return asText(value).replace(/[\s-]/g, "");
  }

  function validateAndOpen(inputValue, record) {
    const identity = normalizeIdentity(inputValue);
    if (!/^\d{16}$/.test(identity)) {
      showVerificationError("Input harus terdiri dari tepat 16 digit angka. Periksa kembali NIK atau Nomor KK.");
      return false;
    }

    const matched = NIK_FIELDS.some((field) => {
      const candidate = normalizeIdentity(record[field]);
      return /^\d{16}$/.test(candidate) && candidate === identity;
    });
    if (!matched) {
      showVerificationError("Data tidak cocok. Periksa kembali NIK atau Nomor KK yang dimasukkan untuk assignment ini.");
      return false;
    }

    const cawiUrl = getCawiUrl(getCawiValue(record));
    if (!cawiUrl) {
      showVerificationError("Tautan CAWI tidak tersedia atau format tautannya tidak dikenali.");
      return false;
    }

    // Called directly inside the submit interaction so browsers are less likely to block the new tab.
    window.open(cawiUrl, "_blank", "noopener,noreferrer");
    if (els.dialog.open) els.dialog.close("verified");
    els.dialogForm.reset();
    clearVerificationError();
    state.activeRecord = null;
    return true;
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
    els.prev.addEventListener("click", () => { if (state.page > 1) { state.page -= 1; render(); } });
    els.next.addEventListener("click", () => {
      const totalPages = Math.ceil(state.filtered.length / state.pageSize);
      if (state.page < totalPages) { state.page += 1; render(); }
    });

    els.dialogCancel.addEventListener("click", () => els.dialog.close("cancelled"));
    els.dialogClose.addEventListener("click", () => els.dialog.close("cancelled"));
    els.dialog.addEventListener("close", () => {
      els.dialogForm.reset();
      clearVerificationError();
      state.activeRecord = null;
    });
    els.dialog.addEventListener("click", (event) => {
      // Klik pada backdrop menutup dialog, klik di dalam kartu tidak.
      if (event.target === els.dialog) els.dialog.close("cancelled");
    });
    els.dialogForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (state.activeRecord) validateAndOpen(els.identityInput.value, state.activeRecord);
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
