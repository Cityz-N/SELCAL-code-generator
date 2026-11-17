// ICAO designator => [IATA code (used for the logo), airline name]
const AIRLINES = {
  AAL: ["AA", "American Airlines"], AAR: ["OZ", "Asiana Airlines"], ACA: ["AC", "Air Canada"],
  AEA: ["UX", "Air Europa"], AEE: ["A3", "Aegean Airlines"], AFL: ["SU", "Aeroflot"],
  AFR: ["AF", "Air France"], AIC: ["AI", "Air India"], AMX: ["AM", "Aeromexico"],
  ANA: ["NH", "All Nippon Airways"], ANZ: ["NZ", "Air New Zealand"], ARG: ["AR", "Aerolineas Argentinas"],
  ASA: ["AS", "Alaska Airlines"], AUA: ["OS", "Austrian Airlines"], AVA: ["AV", "Avianca"],
  AZU: ["AD", "Azul"], BAW: ["BA", "British Airways"], BEL: ["SN", "Brussels Airlines"],
  BTI: ["BT", "airBaltic"], CAL: ["CI", "China Airlines"], CCA: ["CA", "Air China"],
  CES: ["MU", "China Eastern"], CFG: ["DE", "Condor"], CLX: ["CV", "Cargolux"],
  CMP: ["CM", "Copa Airlines"], CPA: ["CX", "Cathay Pacific"], CRK: ["HX", "Hong Kong Airlines"],
  CRL: ["SS", "Corsair"], CSN: ["CZ", "China Southern"], DAH: ["AH", "Air Algerie"],
  DAL: ["DL", "Delta Air Lines"], DLH: ["LH", "Lufthansa"], EIN: ["EI", "Aer Lingus"],
  ELY: ["LY", "El Al"], ENY: ["MQ", "Envoy Air"], ETD: ["EY", "Etihad Airways"],
  ETH: ["ET", "Ethiopian Airlines"], EVA: ["BR", "EVA Air"], EWG: ["EW", "Eurowings"],
  EZY: ["U2", "easyJet"], FBU: ["BF", "French Bee"], FDX: ["FX", "FedEx Express"],
  FFT: ["F9", "Frontier Airlines"], FIN: ["AY", "Finnair"], FJI: ["FJ", "Fiji Airways"],
  GFA: ["GF", "Gulf Air"], GIA: ["GA", "Garuda Indonesia"], GLO: ["G3", "GOL"],
  GTI: ["5Y", "Atlas Air"], HAL: ["HA", "Hawaiian Airlines"], HVN: ["VN", "Vietnam Airlines"],
  IBE: ["IB", "Iberia"], ICE: ["FI", "Icelandair"], IGO: ["6E", "IndiGo"],
  ITY: ["AZ", "ITA Airways"], JAL: ["JL", "Japan Airlines"], JBU: ["B6", "JetBlue"],
  KAC: ["KU", "Kuwait Airways"], KAL: ["KE", "Korean Air"], KLM: ["KL", "KLM"],
  KQA: ["KQ", "Kenya Airways"], LAN: ["LA", "LATAM Airlines"], LGL: ["LG", "Luxair"],
  LOT: ["LO", "LOT Polish Airlines"], MAS: ["MH", "Malaysia Airlines"], MEA: ["ME", "Middle East Airlines"],
  MSR: ["MS", "EgyptAir"], NAX: ["DY", "Norwegian"], NKS: ["NK", "Spirit Airlines"],
  OMA: ["WY", "Oman Air"], PAL: ["PR", "Philippine Airlines"], PIA: ["PK", "Pakistan International"],
  QFA: ["QF", "Qantas"], QTR: ["QR", "Qatar Airways"], RAM: ["AT", "Royal Air Maroc"],
  RJA: ["RJ", "Royal Jordanian"], ROT: ["RO", "TAROM"], RYR: ["FR", "Ryanair"],
  SAA: ["SA", "South African Airways"], SAS: ["SK", "SAS"], SIA: ["SQ", "Singapore Airlines"],
  SKW: ["OO", "SkyWest"], SVA: ["SV", "Saudia"], SWA: ["WN", "Southwest Airlines"],
  SWR: ["LX", "Swiss"], TAM: ["JJ", "LATAM Brasil"], TAP: ["TP", "TAP Air Portugal"],
  TAR: ["TU", "Tunisair"], THA: ["TG", "Thai Airways"], THY: ["TK", "Turkish Airlines"],
  TRA: ["HV", "Transavia"], TSC: ["TS", "Air Transat"], TVF: ["TO", "Transavia France"],
  UAE: ["EK", "Emirates"], UAL: ["UA", "United Airlines"], UPS: ["5X", "UPS Airlines"],
  VIR: ["VS", "Virgin Atlantic"], VLG: ["VY", "Vueling"], VOZ: ["VA", "Virgin Australia"],
  WJA: ["WS", "WestJet"], WZZ: ["W6", "Wizz Air"]
};

const STORE_KEY = "selcal.saved.v1";
const TTL_MS = 24 * 60 * 60 * 1000;
const MAX_PER_CALLSIGN = 10;

function normalizeCallsign(value) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function isValidCallsign(callsign) {
  return /^[A-Z0-9]{2,7}$/.test(callsign) && /[A-Z]/.test(callsign);
}

// Matches AFR, AFR123 or AFR12A, but not a registration such as FGABC.
function airlineFor(callsign) {
  const m = /^([A-Z]{3})(\d[A-Z0-9]*)?$/.exec(callsign);
  if (!m || !AIRLINES[m[1]]) return null;
  const [iata, name] = AIRLINES[m[1]];
  return { iata, name };
}

function fillTile(tile, callsign) {
  const airline = airlineFor(callsign);
  tile.textContent = callsign.slice(0, 3) || "–";
  tile.classList.remove("logo");
  delete tile.dataset.iata;
  if (!airline) return;
  const img = new Image();
  img.alt = airline.name;
  img.referrerPolicy = "no-referrer";
  img.onload = () => {
    if (tile.dataset.iata !== airline.iata) return;
    tile.textContent = "";
    tile.classList.add("logo");
    tile.appendChild(img);
  };
  tile.dataset.iata = airline.iata;
  img.src = `https://pics.avs.io/120/60/${airline.iata}.png`;
}

// Entries saved by the first version held a single code and no generation time.
function upgradeEntry(e) {
  if (!e || !e.code) return e;
  return { callsign: e.callsign, [e.type]: e.code, generated: e.expires - TTL_MS, expires: e.expires };
}

function readStore() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORE_KEY));
    return Array.isArray(parsed) ? parsed.map(upgradeEntry) : [];
  } catch (e) {
    return [];
  }
}

function writeStore(entries) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(entries));
    return true;
  } catch (e) {
    return false;
  }
}

function loadSaved() {
  const now = Date.now();
  const all = readStore();
  const live = all.filter(e => e && e.expires > now);
  if (live.length !== all.length) writeStore(live);
  return live.sort((a, b) => b.expires - a.expires);
}

function entriesFor(callsign) {
  return loadSaved().filter(e => e.callsign === callsign);
}

// One generation is one entry, so saving its second code joins the first and
// restarts the 24 hours. Returns "saved", "limit" or "blocked".
function saveEntry(callsign, generated, codes) {
  const all = loadSaved();
  const isSame = e => e.callsign === callsign && e.generated === generated;
  const existing = all.find(isSame);
  if (!existing && entriesFor(callsign).length >= MAX_PER_CALLSIGN) return "limit";
  const entry = { ...existing, callsign, generated, ...codes, expires: Date.now() + TTL_MS };
  return writeStore([entry, ...all.filter(e => !isSame(e))]) ? "saved" : "blocked";
}

function removeEntry(callsign, generated) {
  return writeStore(loadSaved().filter(e => !(e.callsign === callsign && e.generated === generated)));
}

function tooManyMessage(callsign) {
  return `Too many entries for ${callsign} (maximum ${MAX_PER_CALLSIGN}). Remove one on the Saved page.`;
}

function formatGenerated(time) {
  return new Date(time).toLocaleString([], { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function timeLeft(expires) {
  const mins = Math.floor((expires - Date.now()) / 60000);
  if (mins < 1) return "under a minute left";
  const h = Math.floor(mins / 60);
  return h ? `${h}h ${mins % 60}m left` : `${mins}m left`;
}

function codeHtml(code) {
  return code.replace("-", '<span class="dash">-</span>');
}

// ---------- SELCAL tones (shared by the generator and the checks) ----------
const STD = "ABCDEFGHJKLMPQRS".split("");
const EXT_NEW = "TUVWXYZ123456789".split("");
const EXT = STD.concat(EXT_NEW);

// "ERMP", "er-mp", "SEL/ER-MP" -> "ER-MP" (null if it isn't four different valid tones)
function parseCode(text) {
  const raw = String(text || "").toUpperCase().replace("SEL/", "").replace(/[^A-Z0-9]/g, "");
  if (raw.length !== 4 || [...raw].some(c => !EXT.includes(c)) || new Set(raw).size !== 4) return null;
  return raw.slice(0, 2) + "-" + raw.slice(2);
}

const isExtended = code => [...String(code || "").replace("-", "")].some(c => EXT_NEW.includes(c));

// Throws a readable message when the code breaks a rule; returns the clean code otherwise.
function validateCode(text) {
  const code = parseCode(text);
  if (!code) throw new Error("A SELCAL is four different tones, e.g. AB-CD (A–S without I, N, O; extended adds T–Z, 1–9).");
  const tones = isExtended(code) ? EXT : STD;
  const t = code.replace("-", "");
  const order = c => tones.indexOf(c);
  if (order(t[0]) > order(t[1]) || order(t[2]) > order(t[3])) {
    const fix = [...t.slice(0, 2)].sort((a, b) => order(a) - order(b)).join("") + "-" + [...t.slice(2)].sort((a, b) => order(a) - order(b)).join("");
    throw new Error(`Tones must be in order within each pair (${fix}, not ${code}).`);
  }
  return code;
}

// The same tones in either pair order count as the same code (AB-CD = CD-AB).
function codeKey(code) {
  const a = [...code.slice(0, 2)].sort().join(""), b = [...code.slice(3)].sort().join("");
  return [a, b].sort().join("-");
}

// ---------- VATSIM: which codes are already in flight plans (online and prefiled) ----------
const VATSIM_FEED = "https://data.vatsim.net/v3/vatsim-data.json";
const VATSIM_MAX_AGE = 60 * 1000;
let vatsim = null;           // { ts, used: Map(key -> [{ callsign, code, where }]), count }
let vatsimLoading = null;

function loadVatsim(force) {
  if (!force && vatsim && Date.now() - vatsim.ts < VATSIM_MAX_AGE) return Promise.resolve(vatsim);
  if (vatsimLoading) return vatsimLoading;
  vatsimLoading = fetch(VATSIM_FEED, { cache: "no-store" })
    .then(r => { if (!r.ok) throw new Error("VATSIM data not reachable"); return r.json(); })
    .then(data => {
      const used = new Map();
      let count = 0;
      [["online", data.pilots || []], ["prefiled", data.prefiles || []]].forEach(([where, list]) => {
        list.forEach(p => {
          count++;
          const m = /\bSEL\/([A-Z0-9]{2}-?[A-Z0-9]{2})\b/.exec(String((p.flight_plan || {}).remarks || "").toUpperCase());
          const code = m && parseCode(m[1]);
          if (!code) return;
          const k = codeKey(code);
          if (!used.has(k)) used.set(k, []);
          used.get(k).push({ callsign: String(p.callsign || "").toUpperCase(), code, where });
        });
      });
      vatsim = { ts: Date.now(), used, count };
      return vatsim;
    })
    .finally(() => { vatsimLoading = null; });
  return vatsimLoading;
}

// Who else uses this code on VATSIM. null = not checked (VATSIM data not loaded).
// `exclude`: a callsign or a list of callsigns that are you (your own prefile is not "used by").
function usedBy(code, exclude) {
  if (!code || !vatsim) return null;
  const skip = [].concat(exclude || []).filter(Boolean).map(normalizeCallsign);
  return (vatsim.used.get(codeKey(code)) || []).filter(u => !skip.includes(u.callsign));
}

function usedText(list) {
  if (list === null) return { text: "Not checked on VATSIM", cls: "" };
  if (!list.length) return { text: "Free on VATSIM", cls: "free" };
  const who = list.slice(0, 3).map(u => u.callsign + (u.where === "prefiled" ? " (prefiled)" : "")).join(", ");
  return { text: `Used by ${who}${list.length > 3 ? ` +${list.length - 3}` : ""}`, cls: "taken" };
}

// ---------- SimBrief: latest flight plan of a user ----------
const SIMBRIEF_KEY = "selcal.simbrief.user";

function simbriefUser() { try { return localStorage.getItem(SIMBRIEF_KEY) || ""; } catch (e) { return ""; } }
function setSimbriefUser(u) { try { localStorage.setItem(SIMBRIEF_KEY, u); } catch (e) {} }

async function fetchSimbrief(user) {
  user = String(user || "").trim();
  if (!user) throw new Error("Enter your SimBrief username or pilot ID.");
  const key = /^\d+$/.test(user) ? "userid" : "username";
  let res;
  try { res = await fetch(`https://www.simbrief.com/api/xml.fetcher.php?${key}=${encodeURIComponent(user)}&json=v2`, { cache: "no-store" }); }
  catch (e) { throw new Error("SimBrief not reachable."); }
  if (res.status === 400) throw new Error("SimBrief didn't find a flight plan for that user.");
  if (!res.ok) throw new Error(`SimBrief error ${res.status}.`);
  const ofp = await res.json();
  const dig = (...path) => { let o = ofp; for (const k of path) o = o && typeof o === "object" ? o[k] : undefined; return typeof o === "object" ? "" : (o ?? ""); };
  const callsign = normalizeCallsign(String(dig("atc", "callsign") || (String(dig("general", "icao_airline")) + String(dig("general", "flight_number")))));
  let code = parseCode(dig("aircraft", "selcal"));
  if (!code) {
    const m = /\bSEL\/([A-Z0-9]{2}-?[A-Z0-9]{2})\b/.exec((String(dig("atc", "section18")) + " " + String(dig("atc", "flightplan_text"))).toUpperCase());
    code = m && parseCode(m[1]);
  }
  return {
    callsign, selcal: code || null,
    departure: String(dig("origin", "icao_code")), arrival: String(dig("destination", "icao_code")),
    aircraft: String(dig("aircraft", "icaocode") || dig("aircraft", "icao_code")), reg: String(dig("aircraft", "reg")),
  };
}