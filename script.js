const STORAGE_KEY = "narai_content_entries_v1";
const API_ENDPOINT = "/api/entries";
const isWebPage = location.protocol === "http:" || location.protocol === "https:";
const isGithubPages = location.hostname.endsWith(".github.io");
const apiEnabled = isWebPage && !isGithubPages;
const SYNC_INTERVAL_MS = 10000;

const plan = [
  {
    id: "happy",
    name: "Narai Happy Living",
    accent: "#D49A6A",
    tracks: [
      { id: "happy-quotes", name: "คำคมสร้างแรงบันดาลใจ", target: 12 },
      { id: "happy-stories", name: "แชร์เรื่องราวความสุขลูกบ้าน", target: 6 },
      { id: "happy-games", name: "กิจกรรมเกมส์แจกของรางวัล", target: 4 },
    ],
  },
  {
    id: "green",
    name: "Narai Green Living",
    accent: "#5B9B79",
    tracks: [{ id: "green-living", name: "Sustainability Living / CSR / นวัตกรรมรักษ์โลก", target: 6 }],
  },
  {
    id: "smart",
    name: "Narai Smart Living",
    accent: "#447C9D",
    tracks: [{ id: "smart-innovation", name: "นวัตกรรมภายในโครงการ", target: 6 }],
  },
  {
    id: "after-sales",
    name: "Narai After Sales",
    accent: "#8E6F9F",
    tracks: [{ id: "after-sales", name: "After Sales Content", target: 6 }],
  },
  {
    id: "lifestyle",
    name: "Narai Lifestyle",
    accent: "#C76F5D",
    tracks: [
      { id: "lifestyle-neighborhood", name: "กินเที่ยวรอบโครงการ / ไลฟ์สไตล์การใช้ชีวิต", target: 12 },
      { id: "lifestyle-realtime", name: "Real Time Content", target: 12 },
    ],
  },
];

const socialGoals = [
  {
    id: "facebook",
    name: "Facebook Like Page",
    target: 18000,
    cadence: "1,500 like/เดือน",
    unit: "like",
    accent: "#447C9D",
  },
  {
    id: "line",
    name: "LINE Official",
    target: 1000,
    cadence: "1,000 คน/ปี",
    unit: "คน",
    accent: "#5B9B79",
  },
  {
    id: "instagram",
    name: "Instagram",
    target: 1000,
    cadence: "1,000 คน/ปี",
    unit: "คน",
    accent: "#C76F5D",
  },
  {
    id: "tiktok",
    name: "TikTok",
    target: 8000,
    cadence: "8,000 คน/ปี",
    unit: "คน",
    accent: "#1F302B",
  },
];

const trackById = new Map();
const topicByTrackId = new Map();
const socialGoalById = new Map(socialGoals.map((goal) => [goal.id, goal]));
plan.forEach((topic) => {
  topic.tracks.forEach((track) => {
    trackById.set(track.id, track);
    topicByTrackId.set(track.id, topic);
  });
});

let entries = [];
let editingId = null;
const today = toDateInputValue(new Date());
let selectedYear = String(new Date().getFullYear());

const yearFilter = document.querySelector("#yearFilter");
const contentForm = document.querySelector("#contentForm");
const socialForm = document.querySelector("#socialForm");
const trackSelect = document.querySelector("#trackSelect");
const editTrack = document.querySelector("#editTrack");
const socialPlatform = document.querySelector("#socialPlatform");

setupYearFilter();
populateTrackSelect(trackSelect);
populateTrackSelect(editTrack);
populateSocialSelect(socialPlatform);
document.querySelector("#contentDate").value = today;
document.querySelector("#socialDate").value = today;

contentForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(contentForm);
  const entry = {
    id: createId(),
    type: "content",
    date: normalizeDate(formData.get("date")),
    trackId: formData.get("track"),
    title: String(formData.get("title") || "").trim(),
    link: String(formData.get("link") || "").trim(),
    note: String(formData.get("note") || "").trim(),
    createdAt: new Date().toISOString(),
  };

  if (!entry.title || !trackById.has(entry.trackId)) {
    return;
  }

  entries.unshift(entry);
  selectedYear = entry.date.slice(0, 4);
  yearFilter.value = selectedYear;
  contentForm.reset();
  document.querySelector("#contentDate").value = today;
  showStatus(`บันทึก "${entry.title}" แล้ว`);
  saveAndRender();
});

socialForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(socialForm);
  const entry = {
    id: createId(),
    type: "social",
    date: normalizeDate(formData.get("date")),
    platform: formData.get("platform"),
    value: toCount(formData.get("value")),
    note: String(formData.get("note") || "").trim(),
    createdAt: new Date().toISOString(),
  };

  if (!socialGoalById.has(entry.platform)) {
    return;
  }

  entries.unshift(entry);
  selectedYear = entry.date.slice(0, 4);
  yearFilter.value = selectedYear;
  socialForm.reset();
  document.querySelector("#socialDate").value = today;
  showStatus(`บันทึกยอด ${socialGoalById.get(entry.platform).name} แล้ว`, "#socialSaveStatus");
  saveAndRender();
});

yearFilter.addEventListener("change", () => {
  selectedYear = yearFilter.value;
  render();
});

document.querySelector("#clearYear").addEventListener("click", () => {
  const yearlyEntries = entries.filter(isInSelectedYear);
  if (yearlyEntries.length === 0) return;
  const confirmed = window.confirm(`ต้องการล้างรายการทั้งหมดของปี ${selectedYear} ใช่ไหม?`);
  if (!confirmed) return;
  entries = entries.filter((entry) => !isInSelectedYear(entry));
  saveAndRender();
});

document.querySelector("#exportData").addEventListener("click", exportData);

document.querySelector("#editForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const entry = entries.find((item) => item.id === editingId);
  if (!entry) return;

  entry.date = normalizeDate(document.querySelector("#editDate").value);
  entry.trackId = document.querySelector("#editTrack").value;
  entry.title = document.querySelector("#editTitle").value.trim();
  entry.link = document.querySelector("#editLink").value.trim();
  entry.note = document.querySelector("#editNote").value.trim();

  document.querySelector("#editDialog").close();
  editingId = null;
  saveAndRender();
});

document.querySelector("#deleteEntry").addEventListener("click", () => {
  if (!editingId) return;
  entries = entries.filter((entry) => entry.id !== editingId);
  document.querySelector("#editDialog").close();
  editingId = null;
  saveAndRender();
});

document.querySelector("#socialRecordRows").addEventListener("click", (event) => {
  const button = event.target.closest("[data-delete-social]");
  if (!button) return;
  const entry = entries.find((item) => item.id === button.dataset.deleteSocial);
  if (!entry) return;
  const confirmed = window.confirm(`ต้องการลบยอด ${socialGoalById.get(entry.platform)?.name || "Social"} รายการนี้ใช่ไหม?`);
  if (!confirmed) return;
  entries = entries.filter((item) => item.id !== entry.id);
  saveAndRender();
});

document.querySelector("#closeDialog").addEventListener("click", () => {
  document.querySelector("#editDialog").close();
  editingId = null;
});

loadEntries().then((loadedEntries) => {
  entries = normalizeEntries(loadedEntries);
  updateYearOptions();
  render();
});

if (apiEnabled) {
  window.addEventListener("focus", refreshEntriesFromApi);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refreshEntriesFromApi();
  });
  setInterval(() => {
    if (!document.hidden) refreshEntriesFromApi();
  }, SYNC_INTERVAL_MS);
}

async function loadEntries() {
  // 1) โหลดข้อมูลหลักจากไฟล์ entries.json ก่อน
  // เหมาะสำหรับ GitHub Pages เพราะไม่มีฐานข้อมูลกลางแบบ Netlify
  try {
    const response = await fetch("./entries.json", { cache: "no-store" });
    if (response.ok) {
      const fileData = await response.json();
      if (Array.isArray(fileData)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fileData));
        return fileData;
      }
    }
  } catch (error) {
    console.warn("Cannot load entries.json", error);
  }

  // 2) ถ้าโหลด entries.json ไม่ได้ ค่อยใช้ข้อมูลที่เคยเก็บในเครื่อง
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [];
  } catch {
    return [];
  }
}
}

async function fetchRemoteEntries() {
  const response = await fetch(API_ENDPOINT, { cache: "no-store" });
  if (!response.ok) throw new Error("Storage request failed");
  return await response.json();
}

async function refreshEntriesFromApi() {
  if (!apiEnabled || document.querySelector("#editDialog")?.open) return;

  try {
    entries = normalizeEntries(await fetchRemoteEntries());
    updateYearOptions();
    render();
  } catch {
    // Keep the current screen stable if the network drops briefly.
  }
}

function saveAndRender() {
  updateYearOptions();
  render();
  saveEntries();
}

async function saveEntries() {
  if (apiEnabled) {
    try {
      const response = await fetch(API_ENDPOINT, {
        method: "PUT",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entries),
      });

      if (response.ok) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
        return;
      }
    } catch {
      showStatus("บันทึกบนหน้านี้แล้ว แต่ยังส่งเข้า storage ไม่สำเร็จ");
    }
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    showStatus("บันทึกแสดงบนหน้านี้แล้ว แต่เบราว์เซอร์ไม่ให้เก็บข้อมูลถาวร");
  }
}

function render() {
  entries = normalizeEntries(entries);
  const yearlyEntries = entries.filter(isInSelectedYear);
  const yearlyContentEntries = yearlyEntries.filter((entry) => entry.type === "content");
  const yearlySocialEntries = yearlyEntries.filter((entry) => entry.type === "social");
  const completed = yearlyContentEntries.length;
  const target = getTotalTarget();
  const percent = getPercent(completed, target);

  setText("#overallPercent", `${percent}%`);
  setText("#completedCount", completed);
  setText("#targetCount", target);
  setText("#remainingPercent", `${Math.max(100 - percent, 0)}%`);
  document.querySelector("#overallDonut").style.setProperty("--progress", percent);

  renderTopicCards(yearlyContentEntries);
  renderSocialCards(yearlySocialEntries);
  renderTrackList(yearlyContentEntries);
  renderRecords(yearlyContentEntries);
  renderSocialRecords(yearlySocialEntries);
}

function renderTopicCards(yearlyEntries) {
  document.querySelector("#topicCards").innerHTML = plan
    .map((topic) => {
      const target = topic.tracks.reduce((sum, track) => sum + track.target, 0);
      const done = yearlyEntries.filter((entry) => topicByTrackId.get(entry.trackId)?.id === topic.id).length;
      const percent = getPercent(done, target);
      return `
        <article class="topic-card" style="--accent: ${topic.accent}; --progress: ${percent}">
          <div class="mini-donut"><span>${percent}%</span></div>
          <div>
            <h2>${escapeHtml(topic.name)}</h2>
            <p>${done} จาก ${target} ครั้ง</p>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderTrackList(yearlyEntries) {
  document.querySelector("#trackList").innerHTML = plan
    .map(
      (topic) => `
        <div class="track-group">
          <h3>${escapeHtml(topic.name)}</h3>
          ${topic.tracks
            .map((track) => {
              const done = yearlyEntries.filter((entry) => entry.trackId === track.id).length;
              const percent = getPercent(done, track.target);
              return `
                <div class="track-row">
                  <div class="track-meta">
                    <span>${escapeHtml(track.name)}</span>
                    <strong>${done}/${track.target}</strong>
                  </div>
                  <div class="progress-bar" aria-label="${escapeHtml(track.name)} ${percent}%">
                    <span style="width: ${Math.min(percent, 100)}%"></span>
                  </div>
                </div>
              `;
            })
            .join("")}
        </div>
      `,
    )
    .join("");
}

function renderSocialCards(yearlyEntries) {
  document.querySelector("#socialCards").innerHTML = socialGoals
    .map((goal) => {
      const latest = getLatestSocialEntry(yearlyEntries, goal.id);
      const value = latest?.value || 0;
      const percent = getPercent(value, goal.target);
      return `
        <article class="social-card" style="--accent: ${goal.accent}; --progress: ${percent}">
          <div class="social-card-top">
            <div>
              <h3>${escapeHtml(goal.name)}</h3>
              <p>${escapeHtml(goal.cadence)}</p>
            </div>
            <span>${percent}%</span>
          </div>
          <strong>${formatNumber(value)} / ${formatNumber(goal.target)}</strong>
          <div class="progress-bar" aria-label="${escapeHtml(goal.name)} ${percent}%">
            <span style="width: ${Math.min(percent, 100)}%"></span>
          </div>
          <small>${latest ? `อัปเดตล่าสุด ${formatShortDate(latest.date)}` : "ยังไม่มีข้อมูล"}</small>
        </article>
      `;
    })
    .join("");
}

function renderRecords(yearlyEntries) {
  const rows = document.querySelector("#recordRows");
  const sorted = [...yearlyEntries].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  rows.innerHTML = sorted
    .map((entry) => {
      const topic = topicByTrackId.get(entry.trackId);
      const track = trackById.get(entry.trackId);
      const linkCell = entry.link
        ? `<a class="post-link" href="${escapeAttribute(entry.link)}" target="_blank" rel="noreferrer">เปิดลิงก์</a>`
        : `<span class="muted">-</span>`;
      const previewCell = entry.link ? renderLinkPreview(entry.link) : `<span class="preview-empty">No link</span>`;
      return `
        <tr>
          <td>${formatShortDate(entry.date)}</td>
          <td>${escapeHtml(topic?.name || "-")}</td>
          <td>${escapeHtml(track?.name || "-")}</td>
          <td>
            <strong>${escapeHtml(entry.title)}</strong>
            ${entry.note ? `<small>${escapeHtml(entry.note)}</small>` : ""}
          </td>
          <td>${linkCell}</td>
          <td>${previewCell}</td>
          <td><button class="edit-row-button" data-edit="${entry.id}" type="button">แก้ไข</button></td>
        </tr>
      `;
    })
    .join("");

  document.querySelector("#emptyState").hidden = yearlyEntries.length > 0;
  document.querySelectorAll("[data-edit]").forEach((button) => {
    button.addEventListener("click", () => openEdit(button.dataset.edit));
  });
}

function renderSocialRecords(yearlyEntries) {
  const rows = document.querySelector("#socialRecordRows");
  const sorted = [...yearlyEntries].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  rows.innerHTML = sorted
    .map((entry) => {
      const goal = socialGoalById.get(entry.platform);
      const percent = getPercent(entry.value, goal?.target || 0);
      return `
        <tr>
          <td>${formatShortDate(entry.date)}</td>
          <td>${escapeHtml(goal?.name || "-")}</td>
          <td>${formatNumber(entry.value)} ${escapeHtml(goal?.unit || "")}</td>
          <td>${formatNumber(goal?.target || 0)} ${escapeHtml(goal?.unit || "")} (${percent}%)</td>
          <td>${entry.note ? escapeHtml(entry.note) : `<span class="muted">-</span>`}</td>
          <td><button class="edit-row-button" data-delete-social="${entry.id}" type="button">ลบ</button></td>
        </tr>
      `;
    })
    .join("");

  document.querySelector("#socialEmptyState").hidden = yearlyEntries.length > 0;
}

function openEdit(id) {
  const entry = entries.find((item) => item.id === id);
  if (!entry) return;

  editingId = id;
  document.querySelector("#editDate").value = entry.date;
  document.querySelector("#editTrack").value = entry.trackId;
  document.querySelector("#editTitle").value = entry.title;
  document.querySelector("#editLink").value = entry.link;
  document.querySelector("#editNote").value = entry.note;
  document.querySelector("#editDialog").showModal();
}

function getLatestSocialEntry(items, platform) {
  return [...items]
    .filter((entry) => entry.platform === platform)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))[0];
}

function renderLinkPreview(link) {
  const previewUrl = createPreviewUrl(link);
  if (!previewUrl) {
    return `<span class="preview-empty">No preview</span>`;
  }

  return `
    <a class="preview-thumb" href="${escapeAttribute(link)}" target="_blank" rel="noreferrer" aria-label="เปิด preview">
      <img src="${escapeAttribute(previewUrl)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.closest('.preview-thumb').classList.add('is-empty'); this.remove();" />
      <span>Preview</span>
    </a>
  `;
}

function createPreviewUrl(link) {
  try {
    const url = new URL(link);
    if (!["http:", "https:"].includes(url.protocol)) return "";
    return `https://image.thum.io/get/width/360/crop/230/noanimate/${url.href}`;
  } catch {
    return "";
  }
}

function populateTrackSelect(select) {
  select.innerHTML = plan
    .map(
      (topic) => `
        <optgroup label="${escapeAttribute(topic.name)}">
          ${topic.tracks.map((track) => `<option value="${track.id}">${escapeHtml(track.name)} (${track.target} ครั้ง/ปี)</option>`).join("")}
        </optgroup>
      `,
    )
    .join("");
}

function populateSocialSelect(select) {
  select.innerHTML = socialGoals.map((goal) => `<option value="${goal.id}">${escapeHtml(goal.name)} - ${escapeHtml(goal.cadence)}</option>`).join("");
}

function setupYearFilter() {
  const currentYear = new Date().getFullYear();
  yearFilter.innerHTML = Array.from({ length: 5 }, (_, index) => String(currentYear - 2 + index))
    .map((year) => `<option value="${year}">${Number(year) + 543}</option>`)
    .join("");
  yearFilter.value = selectedYear;
}

function updateYearOptions() {
  const years = new Set([...Array.from(yearFilter.options).map((option) => option.value), ...entries.map((entry) => entry.date.slice(0, 4)), selectedYear]);
  yearFilter.innerHTML = [...years]
    .sort()
    .map((year) => `<option value="${year}">${Number(year) + 543}</option>`)
    .join("");
  yearFilter.value = selectedYear;
}

function normalizeEntries(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      const legacyZone = entry.zone ? null : entry.trackId;
      if (entry.type === "social" || entry.platform) {
        return {
          id: entry.id || createId(),
          type: "social",
          date: normalizeDate(entry.date),
          platform: socialGoalById.has(entry.platform) ? entry.platform : "facebook",
          value: toCount(entry.value),
          note: String(entry.note || "").trim(),
          createdAt: entry.createdAt || new Date().toISOString(),
        };
      }

      return {
        id: entry.id || createId(),
        type: "content",
        date: normalizeDate(entry.date),
        trackId: trackById.has(entry.trackId) ? entry.trackId : legacyZone,
        title: String(entry.title || "").trim(),
        link: String(entry.link || "").trim(),
        note: String(entry.note || "").trim(),
        createdAt: entry.createdAt || new Date().toISOString(),
      };
    })
    .filter((entry) => {
      if (!entry.date) return false;
      if (entry.type === "social") return socialGoalById.has(entry.platform);
      return trackById.has(entry.trackId) && entry.title;
    });
}

function normalizeDate(value) {
  if (typeof value !== "string") return today;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : today;
}

function isInSelectedYear(entry) {
  return entry.date?.startsWith(selectedYear);
}

function getTotalTarget() {
  return plan.reduce((sum, topic) => sum + topic.tracks.reduce((trackSum, track) => trackSum + track.target, 0), 0);
}

function getPercent(done, target) {
  if (!target) return 0;
  return Math.min(Math.round((done / target) * 100), 100);
}

function toCount(value) {
  return Math.max(0, Number.parseInt(value, 10) || 0);
}

function formatNumber(value) {
  return new Intl.NumberFormat("th-TH").format(value || 0);
}

function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatShortDate(dateValue) {
  return new Intl.DateTimeFormat("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${dateValue}T12:00:00`));
}

function showStatus(message, selector = "#saveStatus") {
  const status = document.querySelector(selector);
  status.textContent = message;
  const timerKey = `${selector}Timer`;
  window.clearTimeout(showStatus[timerKey]);
  showStatus[timerKey] = window.setTimeout(() => {
    status.textContent = "";
  }, 2600);
}

function exportData() {
  const yearlyEntries = entries.filter(isInSelectedYear);
  if (yearlyEntries.length === 0) {
    showStatus("ยังไม่มีข้อมูลสำหรับ export");
    return;
  }

  const contentRows = yearlyEntries
    .filter((entry) => entry.type === "content")
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))
    .map((entry) => {
      const topic = topicByTrackId.get(entry.trackId);
      const track = trackById.get(entry.trackId);
      return `
        <tr>
          <td>${escapeHtml(entry.date)}</td>
          <td>${escapeHtml(topic?.name || "")}</td>
          <td>${escapeHtml(track?.name || "")}</td>
          <td>${escapeHtml(entry.title)}</td>
          <td>${escapeHtml(entry.link)}</td>
          <td>${escapeHtml(entry.note)}</td>
          <td>${escapeHtml(entry.createdAt)}</td>
        </tr>
      `;
    })
    .join("");

  const socialRows = yearlyEntries
    .filter((entry) => entry.type === "social")
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))
    .map((entry) => {
      const goal = socialGoalById.get(entry.platform);
      return `
        <tr>
          <td>${escapeHtml(entry.date)}</td>
          <td>${escapeHtml(goal?.name || "")}</td>
          <td>${entry.value}</td>
          <td>${goal?.target || 0}</td>
          <td>${escapeHtml(goal?.unit || "")}</td>
          <td>${escapeHtml(entry.note)}</td>
          <td>${escapeHtml(entry.createdAt)}</td>
        </tr>
      `;
    })
    .join("");

  const workbook = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: Arial, sans-serif; }
          table { border-collapse: collapse; margin-bottom: 28px; }
          th, td { border: 1px solid #9eb5a5; padding: 8px 10px; }
          th { background: #dfeee6; font-weight: bold; }
        </style>
      </head>
      <body>
        <h2>Narai Property Content Tracker ${escapeHtml(selectedYear)}</h2>
        <h3>Content Records</h3>
        <table>
          <thead>
            <tr>
              <th>Date</th><th>Main Topic</th><th>Sub Topic</th><th>Post Title</th><th>Post Link</th><th>Note</th><th>Created At</th>
            </tr>
          </thead>
          <tbody>${contentRows || `<tr><td colspan="7">No content records</td></tr>`}</tbody>
        </table>
        <h3>Social Records</h3>
        <table>
          <thead>
            <tr>
              <th>Date</th><th>Platform</th><th>Value</th><th>Target</th><th>Unit</th><th>Note</th><th>Created At</th>
            </tr>
          </thead>
          <tbody>${socialRows || `<tr><td colspan="7">No social records</td></tr>`}</tbody>
        </table>
      </body>
    </html>
  `;

  const blob = new Blob([workbook], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `narai-property-tracker-${selectedYear}.xls`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 120000);
  showStatus("Export Excel แล้ว");
}

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.textContent = value;
}

function createId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("'", "&#039;");
}
