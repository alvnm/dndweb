/* Grimhold DM Dashboard — estado persistente local + nube (Supabase) */
"use strict";

const STORE = "grimhold-dm-dashboard-v1";
const SYNC_TABLE = "dm_campaigns";
const SYNC_DEBOUNCE_MS = 700;
const SEARCH_DEBOUNCE_MS = 120;

const defaults = {
  monsters: [
    { id: "srd-goblin", name: "Goblin", type: "Humanoide", size: "Pequeño", ac: 15, hp: 7, speed: "30 pies", cr: 0.25, stats: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 }, abilities: "Sigiloso +6.", actions: "Cimitarra. +4 al ataque, 1d6 + 2 de daño cortante." },
    { id: "srd-orc", name: "Orco", type: "Humanoide", size: "Mediano", ac: 13, hp: 15, speed: "30 pies", cr: 0.5, stats: { str: 16, dex: 12, con: 16, int: 7, wis: 11, cha: 10 }, abilities: "Agresivo: puede moverse hacia una criatura hostil.", actions: "Hacha grande. +5 al ataque, 1d12 + 3 de daño cortante." },
    { id: "srd-wolf", name: "Lobo", type: "Bestia", size: "Mediano", ac: 13, hp: 11, speed: "40 pies", cr: 0.25, stats: { str: 12, dex: 15, con: 12, int: 3, wis: 12, cha: 6 }, abilities: "Tácticas de manada; oído y olfato agudos.", actions: "Mordisco. +4 al ataque, 2d4 + 2 perforante; puede derribar." },
    { id: "srd-skeleton", name: "Esqueleto", type: "No muerto", size: "Mediano", ac: 13, hp: 13, speed: "30 pies", cr: 0.25, stats: { str: 10, dex: 14, con: 15, int: 6, wis: 8, cha: 5 }, abilities: "Vulnerable a daño contundente.", actions: "Espada corta. +4 al ataque, 1d6 + 2 perforante." },
    { id: "srd-young-red-dragon", name: "Dragón rojo joven", type: "Dragón", size: "Grande", ac: 18, hp: 178, speed: "40 pies, volar 80 pies", cr: 10, stats: { str: 23, dex: 10, con: 21, int: 14, wis: 11, cha: 19 }, abilities: "Resistencia legendaria (3/día).", actions: "Ataque múltiple; mordisco y dos garras. Aliento de fuego (recarga 5–6)." }
  ],
  spells: [
    { id: "srd-fireball", name: "Bola de fuego", level: 3, school: "Evocación", castingTime: "1 acción", range: "150 pies", components: "V, S, M", duration: "Instantánea", description: "Una explosión de fuego de 20 pies de radio inflige 8d6 de daño de fuego; salvación de Destreza para mitad." },
    { id: "srd-cure-wounds", name: "Curar heridas", level: 1, school: "Evocación", castingTime: "1 acción", range: "Toque", components: "V, S", duration: "Instantánea", description: "Una criatura recupera 1d8 + tu modificador de aptitud mágica puntos de golpe." },
    { id: "srd-shield", name: "Escudo", level: 1, school: "Abjuración", castingTime: "1 reacción", range: "Personal", components: "V, S", duration: "1 asalto", description: "Obtienes +5 a la CA hasta el inicio de tu siguiente turno, incluso contra el ataque desencadenante." },
    { id: "srd-mage-hand", name: "Mano de mago", level: 0, school: "Conjuración", castingTime: "1 acción", range: "30 pies", components: "V, S", duration: "1 minuto", description: "Una mano espectral puede manipular un objeto a distancia." },
    { id: "srd-misty-step", name: "Paso brumoso", level: 2, school: "Conjuración", castingTime: "1 acción adicional", range: "Personal", components: "V", duration: "Instantánea", description: "Te teletransportas hasta 30 pies a un espacio desocupado que puedas ver." }
  ],
  npcs: [], combatants: [], activeIndex: -1, round: 1, notes: "", rolls: []
};

/* ---------- Utilidades base ---------- */

const cloneDefault = () => JSON.parse(JSON.stringify(defaults));
const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
const genId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
const safe = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[c]);
const clampInt = (value, min, max, fallback = min) => {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};
const modifier = score => `${score >= 10 ? "+" : ""}${Math.floor((score - 10) / 2)}`;
const hpClass = c => (c.hp <= 0 ? "down" : c.hp / Math.max(c.maxHp, 1) <= .3 ? "wounded" : "");
const STAT_KEYS = ["str", "dex", "con", "int", "wis", "cha"];

function sanitizeStats(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const out = {};
  for (const key of STAT_KEYS) out[key] = clampInt(source[key], 1, 30, 10);
  return out;
}

/* Normaliza un monstruo arbitrario (importado o de la nube) a un registro válido. */
function sanitizeMonster(raw) {
  if (!raw || typeof raw !== "object" || !String(raw.name || "").trim()) return null;
  return {
    id: String(raw.id || genId()),
    name: String(raw.name).trim(),
    type: String(raw.type || "Criatura").trim(),
    size: String(raw.size || "Mediano").trim(),
    ac: clampInt(raw.ac, 0, 40, 10),
    hp: clampInt(raw.hp, 1, 9999, 1),
    speed: String(raw.speed || "30 pies").trim(),
    cr: clampInt(raw.cr, 0, 30, 0) || 0,
    stats: sanitizeStats(raw.stats),
    abilities: String(raw.abilities || "").trim(),
    actions: String(raw.actions || "").trim()
  };
}

function sanitizeSpell(raw) {
  if (!raw || typeof raw !== "object" || !String(raw.name || "").trim()) return null;
  return {
    id: String(raw.id || genId()),
    name: String(raw.name).trim(),
    level: clampInt(raw.level, 0, 9, 0),
    school: String(raw.school || "Universal").trim(),
    castingTime: String(raw.castingTime || "1 acción").trim(),
    range: String(raw.range || "Personal").trim(),
    components: String(raw.components || "").trim(),
    duration: String(raw.duration || "Instantánea").trim(),
    description: String(raw.description || "").trim()
  };
}

function sanitizeNpc(raw) {
  if (!raw || typeof raw !== "object" || !String(raw.name || "").trim()) return null;
  return {
    id: String(raw.id || genId()),
    name: String(raw.name).trim(),
    race: String(raw.race || "").trim(),
    alignment: String(raw.alignment || "").trim(),
    personality: String(raw.personality || "").trim(),
    notes: String(raw.notes || "").trim(),
    bonds: String(raw.bonds || "").trim()
  };
}

/* Estado persistente: se valida todo lo que viene de localStorage o de la nube. */
function sanitizeState(raw) {
  const base = cloneDefault();
  if (!raw || typeof raw !== "object") return base;
  const monsters = Array.isArray(raw.monsters) ? raw.monsters.map(sanitizeMonster).filter(Boolean) : base.monsters;
  const spells = Array.isArray(raw.spells) ? raw.spells.map(sanitizeSpell).filter(Boolean) : base.spells;
  const npcs = Array.isArray(raw.npcs) ? raw.npcs.map(sanitizeNpc).filter(Boolean) : [];
  const combatants = Array.isArray(raw.combatants) ? raw.combatants
    .map(c => {
      if (!c || !String(c.name || "").trim()) return null;
      const maxHp = clampInt(c.maxHp, 1, 9999, 1);
      return {
        id: String(c.id || genId()),
        kind: c.kind === "monster" ? "monster" : "player",
        name: String(c.name).trim(),
        hp: clampInt(c.hp, 0, maxHp, maxHp),
        maxHp,
        ac: clampInt(c.ac, 0, 40, 10),
        initiative: clampInt(c.initiative, -99, 99, 0)
      };
    }).filter(Boolean) : [];
  const activeIndex = clampInt(raw.activeIndex, -1, Math.max(0, combatants.length - 1), -1);
  return {
    monsters, spells, npcs, combatants,
    activeIndex: combatants.length ? activeIndex : -1,
    round: clampInt(raw.round, 1, 9999, 1),
    notes: typeof raw.notes === "string" ? raw.notes : "",
    rolls: Array.isArray(raw.rolls) ? raw.rolls.slice(0, 12)
      .map(r => r && typeof r === "object" ? { expression: String(r.expression || "").slice(0, 60), result: Number(r.result) || 0, time: String(r.time || "").slice(0, 40) } : null)
      .filter(Boolean) : []
  };
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE));
    return sanitizeState(saved);
  } catch {
    return cloneDefault();
  }
}

let state = loadState();
let supabaseClient = null;
let campaignUserId = null;
let syncTimer = null;
let syncSeq = 0;          // descarta respuestas obsoletas de syncs solapadas
let syncOnline = true;    // false cuando el último intento a Supabase falló
let syncRetryDelay = SYNC_DEBOUNCE_MS;
let saveToastTimer = null;

function save() {
  localStorage.setItem(STORE, JSON.stringify(state));
  scheduleCloudSync();
}

/* ---------- Sincronización con Supabase ---------- */

function setSaveStatus(message, isError = false) {
  const status = $("#notes-status");
  if (!status) return;
  status.textContent = message;
  status.style.color = isError ? "var(--danger)" : "";
  status.classList.toggle("save-status-error", isError);
  clearTimeout(saveToastTimer);
  if (!isError && message && message !== "Guardado automáticamente") {
    saveToastTimer = setTimeout(() => { status.textContent = "Guardado automáticamente"; status.classList.remove("save-status-error"); }, 2500);
  }
}

function scheduleCloudSync() {
  if (!supabaseClient || !campaignUserId || !syncOnline) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(syncCampaign, syncRetryDelay);
}

/* Reintenta la sincronización pendiente al volver la conexión. */
window.addEventListener("online", () => { if (supabaseClient && campaignUserId) syncCampaign(); });

async function syncCampaign() {
  if (!supabaseClient || !campaignUserId) return;
  const seq = ++syncSeq;
  clearTimeout(syncTimer);
  setSaveStatus("Guardando en Supabase…");
  const payload = {
    user_id: campaignUserId,
    data: {
      monsters: state.monsters,
      spells: state.spells,
      npcs: state.npcs,
      combatants: state.combatants,
      activeIndex: state.activeIndex,
      round: state.round,
      notes: state.notes,
      rolls: state.rolls
    },
    updated_at: new Date().toISOString()
  };
  try {
    const { error } = await supabaseClient.from(SYNC_TABLE).upsert(payload, { onConflict: "user_id" });
    if (seq !== syncSeq) return; // ya hay una sync más reciente en curso
    if (error) throw error;
    syncOnline = true;
    syncRetryDelay = SYNC_DEBOUNCE_MS;
    setSaveStatus("Guardado en Supabase");
  } catch (error) {
    if (seq !== syncSeq) return;
    syncOnline = false;
    syncRetryDelay = Math.min(syncRetryDelay * 2, 30000);
    console.warn("Sync a Supabase falló; se reintenta al editar o recuperar conexión.", error);
    setSaveStatus("Sin conexión: guardado solo local", true);
    scheduleCloudSync(); // reintento con backoff: 0.7 s → 1.4 s → 2.8 s… (máx. 30 s)
  }
}

async function initializeSupabase() {
  const config = window.GRIMHOLD_SUPABASE;
  if (!config?.url || !config?.publishableKey || !window.supabase) return;
  try {
    supabaseClient = window.supabase.createClient(config.url, config.publishableKey);
    let { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      const { data, error } = await supabaseClient.auth.signInAnonymously();
      if (error) throw error;
      user = data.user;
    }
    campaignUserId = user.id;
    const { data, error } = await supabaseClient.from(SYNC_TABLE).select("data, monsters, notes").eq("user_id", campaignUserId).maybeSingle();
    if (error) throw error;
    // Fila nueva (JSONB "data") o fila legacy (columnas monsters/notes) que se migra.
    const remoteData = data?.data && typeof data.data === "object" ? data.data : null;
    const hasRemoteData = remoteData && Object.keys(remoteData).length > 0;
    const legacyData = data && (Array.isArray(data.monsters) || typeof data.notes === "string")
      ? { monsters: data.monsters, notes: data.notes } : null;
    if (hasRemoteData || legacyData) {
      const notesBefore = state.notes;
      const combatantsBefore = JSON.stringify(state.combatants);
      state = sanitizeState({ ...state, ...(remoteData || {}), ...(legacyData || {}) });
      // Conserva lo que el usuario haya cambiado durante la carga remota.
      if (state.notes !== notesBefore) state.notes = notesBefore;
      if (JSON.stringify(state.combatants) !== combatantsBefore && combatantsBefore !== JSON.stringify([])) state.combatants = JSON.parse(combatantsBefore);
      localStorage.setItem(STORE, JSON.stringify(state));
      renderAll();
    } else {
      await syncCampaign();
    }
    syncOnline = true;
    setSaveStatus("Guardado en Supabase");
  } catch (error) {
    console.warn("Supabase no está disponible; se usa el guardado local.", error);
    syncOnline = false;
    setSaveStatus("Guardado local (Supabase pendiente)", true);
  }
}

/* ---------- Render ---------- */

function renderCombatants() {
  const list = $("#combatant-list");
  $("#combatant-count").textContent = `${state.combatants.length} combatiente${state.combatants.length === 1 ? "" : "s"}`;
  $("#round-number").textContent = state.round;
  const active = state.combatants[state.activeIndex];
  $("#active-turn-label").textContent = active ? `Turno: ${active.name}` : "El combate aguarda";
  if (!state.combatants.length) {
    list.innerHTML = '<div class="empty-state"><span>⚔</span><p>Aún no hay combatientes.</p><small>Agrega aventureros o importa un monstruo.</small></div>';
    return;
  }
  list.innerHTML = state.combatants.map((c, index) => `
    <article class="combatant ${index === state.activeIndex ? "active" : ""}" data-id="${safe(c.id)}">
      <div class="initiative-score">${c.initiative}</div>
      <div><div class="combatant-name">${safe(c.name)} ${c.kind === "monster" ? '<span class="tag">Monstruo</span>' : ""}</div><div class="combatant-meta">CA ${c.ac} · <span class="${hpClass(c)}">HP ${c.hp} / ${c.maxHp}</span></div></div>
      <div class="hp-controls"><button data-hp="-5" title="Restar 5 HP">−5</button><button data-hp="-1" title="Restar 1 HP">−1</button><span class="hp-value">${c.hp}/${c.maxHp}</span><button data-hp="1" title="Sumar 1 HP">+1</button><button data-hp="5" title="Sumar 5 HP">+5</button><input class="manual-hp" type="number" min="0" max="${c.maxHp}" value="${c.hp}" title="HP actual" aria-label="HP actual de ${safe(c.name)}" /></div>
      <button class="remove-button" data-remove title="Quitar de combate" aria-label="Quitar ${safe(c.name)}">×</button>
    </article>`).join("");
}

function renderMonsterFilters() {
  const typeFilter = $("#monster-type-filter");
  const current = typeFilter.value;
  const types = [...new Set(state.monsters.map(m => m.type))].sort((a, b) => a.localeCompare(b, "es"));
  typeFilter.innerHTML = '<option value="">Todos los tipos</option>' + types.map(t => `<option${t === current ? " selected" : ""}>${safe(t)}</option>`).join("");
}

function renderMonsters() {
  const query = $("#monster-search").value.toLowerCase().trim(), type = $("#monster-type-filter").value, cr = $("#monster-cr-filter").value;
  const filtered = state.monsters.filter(m => (!query || `${m.name} ${m.type}`.toLowerCase().includes(query)) && (!type || m.type === type) && (!cr || (cr === "10" ? m.cr >= 10 : m.cr === Number(cr))));
  $("#monster-library").innerHTML = filtered.length ? filtered.map(m => `<article class="monster-card"><div class="card-head"><h4>${safe(m.name)}</h4><span class="tag">CR ${m.cr}</span></div><p class="card-subtitle">${safe(m.size)} ${safe(m.type)}</p><div class="stat-line"><span>CA <strong>${m.ac}</strong></span><span>HP <strong>${m.hp}</strong></span><span>${safe(m.speed)}</span></div><div class="card-actions"><button class="btn btn-ghost" data-view-monster="${safe(m.id)}">Ficha</button><button class="btn btn-primary" data-add-monster="${safe(m.id)}">Al combate</button><button class="btn delete-monster" data-delete-monster="${safe(m.id)}" title="Eliminar ${safe(m.name)}">Eliminar</button></div></article>`).join("") : '<div class="empty-state"><p>No se encontraron criaturas.</p></div>';
}

function renderNPCs() {
  $("#npc-list").innerHTML = state.npcs.length ? state.npcs.map(n => `<article class="npc-card"><button class="npc-delete" data-delete-npc="${safe(n.id)}" title="Eliminar" aria-label="Eliminar ${safe(n.name)}">×</button><div class="card-head"><h4>${safe(n.name)}</h4><span class="tag">${safe(n.race || "Sin raza")}</span></div><div class="npc-meta">${safe(n.alignment || "Sin alineamiento")}</div>${n.personality ? `<p>${safe(n.personality)}</p>` : ""}${n.notes ? `<p><strong>Notas:</strong> ${safe(n.notes)}</p>` : ""}${n.bonds ? `<p><strong>Vínculos:</strong> ${safe(n.bonds)}</p>` : ""}</article>`).join("") : '<div class="empty-state"><span>♙</span><p>No hay NPCs todavía.</p><small>Guarda uno o genera un personaje improvisado.</small></div>';
}

function renderSpellFilters() {
  const schoolFilter = $("#spell-school-filter");
  const current = schoolFilter.value;
  const schools = [...new Set(state.spells.map(s => s.school))].sort((a, b) => a.localeCompare(b, "es"));
  schoolFilter.innerHTML = '<option value="">Todas las escuelas</option>' + schools.map(s => `<option${s === current ? " selected" : ""}>${safe(s)}</option>`).join("");
}

function renderSpells() {
  const query = $("#spell-search").value.toLowerCase().trim(), level = $("#spell-level-filter").value, school = $("#spell-school-filter").value;
  const filtered = state.spells.filter(s => (!query || `${s.name} ${s.school}`.toLowerCase().includes(query)) && (level === "" || s.level === Number(level)) && (!school || s.school === school));
  $("#spell-library").innerHTML = filtered.length ? filtered.map(s => `<article class="spell-card"><div class="card-head"><h4>${safe(s.name)}</h4><span class="tag">${s.level === 0 ? "Truco" : `Nivel ${s.level}`}</span></div><div class="spell-meta">${safe(s.school)} · ${safe(s.castingTime)} · ${safe(s.range)}</div><p>${safe(s.description)}</p></article>`).join("") : '<div class="empty-state"><p>No se encontraron hechizos.</p></div>';
}

function renderRolls() {
  const history = $("#roll-history");
  history.innerHTML = state.rolls.length ? state.rolls.map(r => `<li><strong>${safe(r.expression)}</strong> → ${r.result} <span class="combatant-meta">${safe(r.time)}</span></li>`).join("") : "<li>Las tiradas aparecerán aquí.</li>";
}

function renderAll() {
  renderCombatants();
  renderMonsterFilters();
  renderMonsters();
  renderNPCs();
  renderSpellFilters();
  renderSpells();
  renderRolls();
  $("#dm-notes").value = state.notes;
}

/* ---------- Modales y confirmación ---------- */

function closeModal() {
  const overlay = $(".modal-overlay");
  if (overlay) overlay.remove();
}

function openModal(title, bodyHtml) {
  closeModal();
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="${safe(title)}">
      <div class="modal-header"><h3>${safe(title)}</h3><button class="modal-close" aria-label="Cerrar">×</button></div>
      <div class="modal-body">${bodyHtml}</div>
    </div>`;
  overlay.addEventListener("click", event => { if (event.target === overlay || event.target.closest(".modal-close")) closeModal(); });
  document.body.appendChild(overlay);
  $(".modal-close", overlay).focus();
  return overlay;
}

function confirmDialog(message) {
  return new Promise(resolve => {
    const overlay = openModal("Confirmar", `<p>${safe(message)}</p><div class="modal-actions"><button class="btn btn-ghost" data-cancel>Cancelar</button><button class="btn btn-danger" data-confirm>Eliminar</button></div>`);
    overlay.addEventListener("click", event => {
      if (event.target.closest("[data-confirm]")) { closeModal(); resolve(true); }
      else if (event.target === overlay || event.target.closest("[data-cancel]") || event.target.closest(".modal-close")) { closeModal(); resolve(false); }
    });
  });
}

/* ---------- Acciones ---------- */

function addCombatant(data) {
  const maxHp = clampInt(data.maxHp, 1, 9999, 1);
  state.combatants.push({
    id: genId(),
    kind: data.kind === "monster" ? "monster" : "player",
    name: String(data.name || "Combatiente").trim(),
    hp: clampInt(data.hp, 0, maxHp, maxHp),
    maxHp,
    ac: clampInt(data.ac, 0, 40, 10),
    initiative: clampInt(data.initiative, -99, 99, 0)
  });
  save();
  renderCombatants();
}

function openMonsterSheet(monster) {
  const s = monster.stats;
  const stat = (label, value) => `<div class="sheet-stat"><span>${label}</span><strong>${value}</strong><small>${modifier(value)}</small></div>`;
  openModal(monster.name, `
    <p class="sheet-subtitle">${safe(monster.size)} ${safe(monster.type)} · CR ${safe(monster.cr)} · CA ${safe(monster.ac)} · HP ${safe(monster.hp)} · ${safe(monster.speed)}</p>
    <div class="sheet-stats">${stat("FUE", s.str)}${stat("DES", s.dex)}${stat("CON", s.con)}${stat("INT", s.int)}${stat("SAB", s.wis)}${stat("CAR", s.cha)}</div>
    <h4>Habilidades</h4><p>${safe(monster.abilities) || "—"}</p>
    <h4>Acciones</h4><p>${safe(monster.actions) || "—"}</p>`);
}

/* Export / import */

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

async function importMonsters(event) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!Array.isArray(data)) throw new Error("formato");
    const incoming = data.map(sanitizeMonster).filter(Boolean);
    if (!incoming.length) throw new Error("vacío");
    state.monsters.push(...incoming);
    save();
    renderMonsterFilters();
    renderMonsters();
    setSaveStatus(`${incoming.length} monstruo${incoming.length === 1 ? "" : "s"} importado${incoming.length === 1 ? "" : "s"}`);
  } catch {
    alert("El archivo no contiene una lista JSON válida de monstruos.");
  } finally {
    event.target.value = "";
  }
}

/* ---------- Navegación y menú móvil ---------- */

$$('.nav-link').forEach(button => button.addEventListener('click', () => {
  const key = button.dataset.section;
  $$('.nav-link').forEach(b => b.classList.toggle('active', b === button));
  $$('.section').forEach(s => s.classList.toggle('active', s.id === key));
  $("#page-title").textContent = button.textContent.trim();
  $(".sidebar").classList.remove("open");
  $(".menu-toggle").setAttribute("aria-expanded", "false");
}));

$(".menu-toggle").addEventListener("click", () => {
  const sidebar = $(".sidebar");
  const open = sidebar.classList.toggle("open");
  $(".menu-toggle").setAttribute("aria-expanded", String(open));
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    const overlay = $(".modal-overlay");
    if (overlay) closeModal();
    else if ($(".sidebar").classList.contains("open")) { $(".sidebar").classList.remove("open"); $(".menu-toggle").setAttribute("aria-expanded", "false"); }
  }
});

/* ---------- Combate ---------- */

let combatantType = "player";

/* Los atributos admiten el rango normal de 5e sin permitir valores vacíos o inválidos. */
STAT_KEYS.forEach(statId => {
  const input = $(`#${statId}`);
  input.min = "1";
  input.max = "30";
  input.step = "1";
  input.addEventListener("change", () => {
    const value = Number(input.value);
    input.value = Number.isFinite(value) ? Math.min(30, Math.max(1, Math.round(value))) : 10;
  });
});

$$('.mini-tab').forEach(tab => tab.addEventListener('click', () => {
  combatantType = tab.dataset.combatantType;
  $$('.mini-tab').forEach(t => t.classList.toggle('active', t === tab));
}));

$("#combatant-form").addEventListener("submit", event => {
  event.preventDefault();
  addCombatant({ name: $("#combatant-name").value.trim(), hp: $("#combatant-hp").value, maxHp: $("#combatant-max-hp").value, ac: $("#combatant-ac").value, initiative: $("#combatant-initiative").value, kind: combatantType });
  event.target.reset();
  $("#combatant-hp").value = $("#combatant-max-hp").value = 10;
  $("#combatant-ac").value = 10;
});

$("#combatant-list").addEventListener("click", event => {
  const card = event.target.closest(".combatant");
  const combatant = card && state.combatants.find(c => c.id === card.dataset.id);
  if (!combatant) return;
  if (event.target.dataset.hp) {
    combatant.hp = clampInt(combatant.hp + Number(event.target.dataset.hp), 0, combatant.maxHp, 0);
    save();
    renderCombatants();
  }
  if (event.target.matches("[data-remove]")) {
    const old = state.combatants.indexOf(combatant);
    state.combatants.splice(old, 1);
    if (state.activeIndex >= state.combatants.length) state.activeIndex = state.combatants.length - 1;
    save();
    renderCombatants();
  }
});

$("#combatant-list").addEventListener("change", event => {
  if (!event.target.matches(".manual-hp")) return;
  const card = event.target.closest(".combatant");
  const combatant = card && state.combatants.find(c => c.id === card.dataset.id);
  if (!combatant) return;
  combatant.hp = clampInt(event.target.value, 0, combatant.maxHp, 0);
  save();
  renderCombatants();
});

$("#sort-initiative").addEventListener("click", () => {
  const activeId = state.combatants[state.activeIndex]?.id;
  state.combatants.sort((a, b) => b.initiative - a.initiative);
  state.activeIndex = state.combatants.findIndex(c => c.id === activeId);
  save();
  renderCombatants();
});

$("#next-turn").addEventListener("click", () => {
  if (!state.combatants.length) return;
  if (state.activeIndex < 0) state.activeIndex = 0;
  else if (state.activeIndex === state.combatants.length - 1) { state.activeIndex = 0; state.round += 1; }
  else state.activeIndex += 1;
  save();
  renderCombatants();
});

/* ---------- Monstruos ---------- */

$("#monster-form").addEventListener("submit", event => {
  event.preventDefault();
  const stats = Object.fromEntries(STAT_KEYS.map(k => [k, clampInt($(`#${k}`).value, 1, 30, 10)]));
  state.monsters.push({
    id: genId(),
    name: $("#monster-name").value.trim(),
    type: $("#monster-type").value.trim() || "Criatura",
    size: $("#monster-size").value,
    ac: clampInt($("#monster-ac").value, 0, 40, 12),
    hp: clampInt($("#monster-hp").value, 1, 9999, 10),
    cr: clampInt($("#monster-cr").value, 0, 30, 1) || 0,
    speed: $("#monster-speed").value.trim() || "30 pies",
    stats,
    abilities: $("#monster-abilities").value.trim(),
    actions: $("#monster-actions").value.trim()
  });
  save();
  event.target.reset();
  renderMonsterFilters();
  renderMonsters();
});

const searchDebounces = new WeakMap();
function debouncedRender(selector, renderFn) {
  $(selector).addEventListener("input", () => {
    clearTimeout(searchDebounces.get(selector));
    searchDebounces.set(selector, setTimeout(renderFn, SEARCH_DEBOUNCE_MS));
  });
}
debouncedRender("#monster-search", renderMonsters);
["#monster-type-filter", "#monster-cr-filter"].forEach(selector => $(selector).addEventListener("change", renderMonsters));

$("#monster-library").addEventListener("click", async event => {
  const target = event.target;
  const monsterId = target.dataset.addMonster || target.dataset.viewMonster || target.dataset.deleteMonster;
  const monster = state.monsters.find(m => m.id === monsterId);
  if (!monster) return;
  if (target.dataset.deleteMonster) {
    const confirmed = await confirmDialog(`¿Eliminar a «${monster.name}» del bestiario? Esta acción no se puede deshacer.`);
    if (!confirmed) return;
    state.monsters = state.monsters.filter(m => m.id !== monster.id);
    save();
    renderMonsterFilters();
    renderMonsters();
    return;
  }
  if (target.dataset.viewMonster) openMonsterSheet(monster);
  else addCombatant({ name: monster.name, hp: monster.hp, maxHp: monster.hp, ac: monster.ac, initiative: 0, kind: "monster" });
});

$("#export-monsters").addEventListener("click", () => downloadJson("grimhold-monstruos.json", state.monsters));
$("#import-monsters").addEventListener("change", importMonsters);

/* ---------- NPCs ---------- */

$("#npc-form").addEventListener("submit", event => {
  event.preventDefault();
  state.npcs.unshift({
    id: genId(),
    name: $("#npc-name").value.trim(),
    race: $("#npc-race").value.trim(),
    alignment: $("#npc-alignment").value.trim(),
    personality: $("#npc-personality").value.trim(),
    notes: $("#npc-notes").value.trim(),
    bonds: $("#npc-bonds").value.trim()
  });
  save();
  event.target.reset();
  renderNPCs();
});

$("#npc-list").addEventListener("click", async event => {
  const npcId = event.target.dataset.deleteNpc;
  if (!npcId) return;
  const npc = state.npcs.find(n => n.id === npcId);
  const confirmed = await confirmDialog(`¿Eliminar a «${npc ? npc.name : "este NPC"}»? Esta acción no se puede deshacer.`);
  if (!confirmed) return;
  state.npcs = state.npcs.filter(n => n.id !== npcId);
  save();
  renderNPCs();
});

$("#random-npc").addEventListener("click", () => {
  const pick = list => list[Math.floor(Math.random() * list.length)];
  const first = ["Aldric", "Mira", "Brom", "Elowen", "Cassian", "Nyx", "Tamsin", "Orla"];
  const last = ["Brumaforja", "Veloazul", "del Roble", "Cenizal", "Ríorápido"];
  const races = ["Humano", "Elfo", "Enano", "Mediano", "Tiefling"];
  const traits = ["No puede dejar de mirar por encima del hombro.", "Habla en susurros incluso en una taberna llena.", "Colecciona botones de uniformes militares.", "Siempre tiene una historia demasiado conveniente.", "Protege a los niños del barrio con fiereza."];
  const bonds = ["Debe un favor a la Cofradía de Ladrones.", "Busca a su hermana desaparecida.", "Sirve en secreto a una bruja del bosque.", "Tiene una deuda con el capitán de la guardia."];
  state.npcs.unshift({
    id: genId(),
    name: `${pick(first)} ${pick(last)}`,
    race: pick(races),
    alignment: pick(["Neutral bueno", "Caótico neutral", "Legal neutral", "Neutral"]),
    personality: pick(traits),
    notes: "Generado para improvisación.",
    bonds: pick(bonds)
  });
  save();
  renderNPCs();
});

/* ---------- Hechizos ---------- */

$("#spell-form").addEventListener("submit", event => {
  event.preventDefault();
  state.spells.push({
    id: genId(),
    name: $("#spell-name").value.trim(),
    level: clampInt($("#spell-level").value, 0, 9, 0),
    school: $("#spell-school").value.trim() || "Universal",
    castingTime: $("#spell-casting-time").value.trim() || "1 acción",
    range: $("#spell-range").value.trim() || "Personal",
    components: $("#spell-components").value.trim(),
    duration: $("#spell-duration").value.trim(),
    description: $("#spell-description").value.trim()
  });
  save();
  event.target.reset();
  renderSpellFilters();
  renderSpells();
});

debouncedRender("#spell-search", renderSpells);
["#spell-level-filter", "#spell-school-filter"].forEach(selector => $(selector).addEventListener("change", renderSpells));

/* ---------- Dados ---------- */

let selectedDie = 20;

$(".dice-buttons").addEventListener("click", event => {
  if (!event.target.dataset.die) return;
  selectedDie = Number(event.target.dataset.die);
  $$(".dice-buttons button").forEach(b => {
    const selected = Number(b.dataset.die) === selectedDie;
    b.classList.toggle("selected", selected);
    b.setAttribute("aria-pressed", String(selected));
  });
  $("#dice-expression").textContent = `d${selectedDie}`;
});

$("#roll-dice").addEventListener("click", () => {
  const result = Math.floor(Math.random() * selectedDie) + 1;
  $("#dice-result").textContent = result;
  state.rolls.unshift({ expression: `d${selectedDie}`, result, time: new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }) });
  state.rolls = state.rolls.slice(0, 12);
  save();
  renderRolls();
});

$("#clear-roll-history").addEventListener("click", () => {
  state.rolls = [];
  save();
  renderRolls();
});

/* ---------- Notas ---------- */

$("#dm-notes").addEventListener("input", event => {
  state.notes = event.target.value;
  save();
  // El estado real ("Guardando…", "Guardado en Supabase", error) lo comunica syncCampaign.
});

/* ---------- Arranque ---------- */

renderAll();
initializeSupabase();
