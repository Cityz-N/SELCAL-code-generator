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
