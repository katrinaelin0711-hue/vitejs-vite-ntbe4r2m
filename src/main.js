// =====================================================================
// SUPABASE CONFIGURATION
// =====================================================================
const SUPABASE_URL = 'https://nrezcaresltzqcfsocrv.supabase.co';
const SUPABASE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yZXpjYXJlc2x0enFjZnNvY3J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2NTk2MDIsImV4cCI6MjA5NzIzNTYwMn0.znEsfLdunTU1jnR9CBE-e4GKHTxTOzLJdHjxFE7Y-6E';
 
// =====================================================================
// TABLE NAMES
// -----------------------------------------------------------------------
// You said you imported the CSVs using "short clean names" (e.g. Paper_DB).
// These are the names this file expects. If any fetch fails, open the
// browser console: a [FAILURE] line will print, and you can run
//   discoverTables()
// from the console to print the *actual* table names found in your
// Supabase project's public schema, then update the matching constant
// below to match exactly (case-sensitive).
// =====================================================================
const TABLES = {
  paper: 'Paper_DB',
  size: 'Size_DB',
  binding: 'Binding_DB',
  bindingStyle: 'Binding_Style_DB',
  ctpPlateCount: 'PPP_DB_CTP',      // print color count -> plate count
  ctpTotalColor: 'PPP_DB_PC',       // print color count -> total color count (unused directly, kept for reference)
  ctpPlateFee: 'CTP_print_DB1',     // plate / CTF fees
  printRun: 'CTP_print_DB2',        // per-ream press run cost, tiered by R volume
  coating: 'PPP_DB_Coating',
  epoxy: 'PPP_DB_Epoxy',
  grounding: 'PPP_DB_Grounding',
  dieCutting: 'PPP_DB_DieCutting',
};
 
// =====================================================================
// SUPABASE CLIENT INIT
// (Loaded via CDN <script> tag in index.html, so window.supabase exists
// as soon as this module runs — no async import needed.)
// =====================================================================
let supabaseClient = null;
 
function initSupabase() {
  if (typeof window !== 'undefined' && window.supabase && window.supabase.createClient) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    return true;
  }
  return false;
}
 
// =====================================================================
// DATA CACHE
// =====================================================================
const dbCache = {
  paper: [],
  size: [],
  binding: [],
  bindingStyle: [],
  ctpPlateCount: [],
  ctpTotalColor: [],
  ctpPlateFee: [],
  printRun: [],
  coating: [],
  epoxy: [],
  grounding: [],
  dieCutting: [],
};
 
// =====================================================================
// UTILITIES
// =====================================================================
 
// Clean numeric price parsing. Handles "1,234", " 1,234 ", "5원", "협의" (negotiable -> 0).
function parseDatabasePrice(priceVal) {
  if (priceVal === null || priceVal === undefined || priceVal === '') return 0;
  if (typeof priceVal === 'number') return priceVal;
  const cleanStr = String(priceVal)
    .replace(/,/g, '')
    .replace(/원/g, '')
    .replace(/%/g, '')
    .trim();
  if (cleanStr === '' || cleanStr === '협의' || isNaN(Number(cleanStr))) return 0;
  return parseFloat(cleanStr) || 0;
}
 
// Trim Korean DB strings that often have stray trailing spaces, e.g. "무선제본 "
function norm(str) {
  return (str ?? '').toString().trim();
}
 
function setStatus(msg) {
  const el = document.getElementById('status-line');
  if (el) el.textContent = msg;
  console.log(msg);
}
 
// =====================================================================
// FETCH ONE TABLE — exact name only, no guessing.
// =====================================================================
async function fetchTable(tableName) {
  if (!supabaseClient) return [];
  try {
    const { data, error } = await supabaseClient.from(tableName).select('*');
    if (error) {
      console.error(`[FAILURE] "${tableName}":`, error.message);
      return [];
    }
    console.log(`[OK] "${tableName}" — ${data.length} rows`);
    return data || [];
  } catch (err) {
    console.error(`[FAILURE] "${tableName}" threw:`, err);
    return [];
  }
}
 
// One-time helper you can run from the browser console to list every
// table Supabase's PostgREST schema cache currently exposes, so you can
// match real names against the TABLES constants above. Uses an exact
// row count (not just a sample fetch) so an RLS-blocked table — which
// returns an empty array with NO error — is correctly flagged instead
// of silently passing as "OK".
window.discoverTables = async function () {
  if (!supabaseClient) {
    console.log('Supabase client not ready yet.');
    return;
  }
  console.log('--- Table check ---');
  for (const [key, name] of Object.entries(TABLES)) {
    const { count, error } = await supabaseClient
      .from(name)
      .select('*', { count: 'exact', head: true });
    const status = error
      ? `MISSING (${error.message})`
      : !count
        ? `⚠ table found but 0 rows visible (check RLS policy)`
        : `OK (${count} rows)`;
    console.log(`${key.padEnd(14)} -> "${name}"`.padEnd(40), status);
  }
};
 
// =====================================================================
// LOAD ALL 12 TABLES
// =====================================================================
async function loadAllTables() {
  setStatus('Loading data from Supabase...');
 
  const [
    paper, size, binding, bindingStyle,
    ctpPlateCount, ctpTotalColor, ctpPlateFee, printRun,
    coating, epoxy, grounding, dieCutting,
  ] = await Promise.all([
    fetchTable(TABLES.paper),
    fetchTable(TABLES.size),
    fetchTable(TABLES.binding),
    fetchTable(TABLES.bindingStyle),
    fetchTable(TABLES.ctpPlateCount),
    fetchTable(TABLES.ctpTotalColor),
    fetchTable(TABLES.ctpPlateFee),
    fetchTable(TABLES.printRun),
    fetchTable(TABLES.coating),
    fetchTable(TABLES.epoxy),
    fetchTable(TABLES.grounding),
    fetchTable(TABLES.dieCutting),
  ]);
 
  dbCache.paper = paper;
  dbCache.size = size;
  dbCache.binding = binding;
  dbCache.bindingStyle = bindingStyle;
  dbCache.ctpPlateCount = ctpPlateCount;
  dbCache.ctpTotalColor = ctpTotalColor;
  dbCache.ctpPlateFee = ctpPlateFee;
  dbCache.printRun = printRun;
  dbCache.coating = coating;
  dbCache.epoxy = epoxy;
  dbCache.grounding = grounding;
  dbCache.dieCutting = dieCutting;
 
  const totalRows = Object.values(dbCache).reduce((sum, arr) => sum + arr.length, 0);
  if (totalRows === 0) {
    setStatus('⚠ No data loaded from Supabase. Open the console and run discoverTables() to debug table names.');
  } else {
    setStatus(`Loaded ${totalRows} rows across 12 tables. Ready.`);
  }
}
 
// =====================================================================
// POPULATE <select> DROPDOWNS FROM LOADED DATA
// =====================================================================
function fillSelect(selectEl, items, { valueKey, labelFn, placeholder }) {
  if (!selectEl) return;
  selectEl.innerHTML = '';
 
  if (placeholder) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = placeholder;
    selectEl.appendChild(opt);
  }
 
  // De-duplicate by value, since several DB rows can share the same
  // dropdown-worthy value (e.g. paper "item" repeats across weights).
  const seen = new Set();
  for (const row of items) {
    const value = norm(row[valueKey]);
    if (!value || seen.has(value)) continue;
    seen.add(value);
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = labelFn ? labelFn(row) : value;
    selectEl.appendChild(opt);
  }
}
 
function populateDropdowns() {
  // Book size dropdown (Size_DB: size, length_width)
  fillSelect(
    document.getElementById('select-size'),
    dbCache.size,
    {
      valueKey: 'size',
      labelFn: (r) => `${norm(r.size)}${r.length_width ? ` (${r.length_width}mm)` : ''}`,
    }
  );
 
  // Paper dropdown (Paper_DB: item, thickness, size, supply price)
  // We show one option per unique (item + thickness) combo; the actual
  // sheet-size price lookup happens at calculation time based on the
  // "Paper Standard Size" selector (국전/전지).
  const paperSeen = new Set();
  const paperSelect = document.getElementById('select-paper');
  if (paperSelect) {
    paperSelect.innerHTML = '';
    for (const row of dbCache.paper) {
      const item = norm(row.item);
      const thickness = norm(row.thickness);
      if (!item || !thickness) continue;
      const key = `${item}|${thickness}`;
      if (paperSeen.has(key)) continue;
      paperSeen.add(key);
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = `${item} ${thickness}`;
      paperSelect.appendChild(opt);
    }
  }
 
  // Color profile dropdown (PPP_DB_CTP: print color count, plate count)
  fillSelect(
    document.getElementById('select-color-count'),
    dbCache.ctpPlateCount,
    {
      valueKey: 'print color count',
      labelFn: (r) => `${norm(r['print color count'])} (${r['plate count']} plates)`,
    }
  );
 
  // Plate / Film type dropdown (CTP_print_DB1 / ctpPlateFee: item, size, supply price).
  // item+size combined into one value since "item" alone repeats
  // (e.g. 인쇄판대[소부] appears at two different plate sizes).
  const plateSelect = document.getElementById('select-plate-type');
  if (plateSelect) {
    plateSelect.innerHTML = '';
    const seenPlate = new Set();
    for (const row of dbCache.ctpPlateFee) {
      const item = norm(row.item);
      const size = norm(row.size);
      if (!item) continue;
      const key = `${item}|${size}`;
      if (seenPlate.has(key)) continue;
      seenPlate.add(key);
      const opt = document.createElement('option');
      opt.value = key;
      const fee = parseDatabasePrice(row['supply price']);
      opt.textContent = `${item} ${size} (${fee.toLocaleString()} KRW)`;
      plateSelect.appendChild(opt);
    }
  }
 
  // Binding method dropdown (Binding_DB: Binding, English)
  fillSelect(
    document.getElementById('select-binding'),
    dbCache.binding,
    {
      valueKey: 'Binding',
      labelFn: (r) => `${norm(r.Binding)} (${norm(r.English)})`,
    }
  );
 
  // Binding style dropdown (Binding_Style_DB: Binding Style, English)
  fillSelect(
    document.getElementById('select-binding-style'),
    dbCache.bindingStyle,
    {
      valueKey: 'Binding Style',
      labelFn: (r) => `${norm(r['Binding Style'])} (${norm(r.English)})`,
    }
  );
 
  // Coating dropdown (PPP_DBP_Coating: item = coating type, size)
  fillSelect(
    document.getElementById('select-coating'),
    dbCache.coating,
    {
      valueKey: 'item',
      placeholder: 'None',
    }
  );
 
  // Epoxy dropdown (PPP_DB_Epoxy: item=에폭시 always, size = sheet size)
  fillSelect(
    document.getElementById('select-epoxy'),
    dbCache.epoxy,
    {
      valueKey: 'size',
      placeholder: 'None',
    }
  );
 
  // Grounding/folding dropdown (PPP_DB_Grounding: size = fold type)
  fillSelect(
    document.getElementById('select-grounding'),
    dbCache.grounding,
    {
      valueKey: 'size',
      placeholder: 'None',
    }
  );
}
 
// =====================================================================
// CALCULATION LOGIC
// =====================================================================
 
// A "Ream" (R) = 500 sheets, standard Korean printing trade unit.
const SHEETS_PER_REAM = 500;
 
function getInputs() {
  return {
    bookSize: document.getElementById('select-size').value,
    paperStdSize: document.getElementById('select-paper-size').value, // 국전 / 전지
    pageYield: parseInt(document.getElementById('input-page-yield').value, 10) || 16,
    quantity: parseInt(document.getElementById('input-quantity').value, 10) || 0,
    totalPages: parseInt(document.getElementById('input-pages').value, 10) || 0,
    paperKey: document.getElementById('select-paper').value, // "item|thickness"
    colorProfile: document.getElementById('select-color-count').value,
    plateKey: document.getElementById('select-plate-type').value, // "item|size"
    bindingMethod: document.getElementById('select-binding').value,
    bindingStyle: document.getElementById('select-binding-style').value,
    bindingPrice: parseFloat(document.getElementById('input-binding-price').value) || 0,
    coating: document.getElementById('select-coating').value,
    epoxySize: document.getElementById('select-epoxy').value,
    groundingFold: document.getElementById('select-grounding').value,
    dieCutting: document.getElementById('select-diecutting').value === 'true',
  };
}
 
// Number of physical press sheets needed, then converted to Reams (500 sheets/ream).
function calcReams(quantity, totalPages, pageYield) {
  if (!quantity || !totalPages || !pageYield) return 0;
  const sheetsNeeded = Math.ceil((quantity * totalPages) / pageYield);
  return sheetsNeeded / SHEETS_PER_REAM;
}
 
// Look up the per-sheet supply price for the chosen paper item+thickness at the chosen standard size.
function getPaperUnitPrice(paperKey, paperStdSize) {
  if (!paperKey) return 0;
  const [item, thickness] = paperKey.split('|');
  const row = dbCache.paper.find(
    (r) => norm(r.item) === item && norm(r.thickness) === thickness && norm(r.size) === paperStdSize
  );
  if (!row) return 0;
  return parseDatabasePrice(row['supply price']);
}
 
function calcPaperCost(reams, paperKey, paperStdSize) {
  const pricePerReam = getPaperUnitPrice(paperKey, paperStdSize);
  return reams * pricePerReam;
}
 
// CTP plate cost = (plate count for the chosen color profile) x (per-plate fee
// of the explicitly chosen plate/film type).
//
// CONFIRMED against the original source spreadsheet (2026-0501 quotation
// form, sheet "CTP_print_DB"): columns A-E (item, size, estimate, discount
// rate, supply price) are the real plate-fee table. Columns G-I (plate type,
// plate size, paper size) are a separate, unrelated reference list that
// happens to sit in the same rows — there are NO merged cells and no
// structural link between them. There is no automatic mapping from the
// 국전/전지 "Paper Standard Size" selector to a plate price, so the user
// picks the plate/film type explicitly via #select-plate-type.
function calcPlateCost(colorProfile, plateKey) {
  const plateRow = dbCache.ctpPlateCount.find(
    (r) => norm(r['print color count']) === colorProfile
  );
  const plateCount = plateRow ? parseInt(plateRow['plate count'], 10) || 0 : 0;
 
  let perPlateFee = 0;
  if (plateKey) {
    const [item, size] = plateKey.split('|');
    const feeRow = dbCache.ctpPlateFee.find(
      (r) => norm(r.item) === item && norm(r.size) === size
    );
    perPlateFee = feeRow ? parseDatabasePrice(feeRow['supply price']) : 0;
  }
 
  return plateCount * perPlateFee;
}
 
// Press run cost: tiered per-Ream rate based on total reams and paper standard size.
// CTP_print_DB2 "notes" column holds bands like " 5R 미만 ", " 5R 이상 ~ 10R 미만 ", " 150R 이상 ".
function parseReamBand(noteStr) {
  const note = norm(noteStr);
  // " 5R 미만 " -> max 5
  const underMatch = note.match(/^(\d+(\.\d+)?)R\s*미만/);
  if (underMatch) return { min: 0, max: parseFloat(underMatch[1]) };
 
  // " 150R 이상 " -> min 150, no max
  const overOnlyMatch = note.match(/^(\d+(\.\d+)?)R\s*이상\s*$/);
  if (overOnlyMatch) return { min: parseFloat(overOnlyMatch[1]), max: Infinity };
 
  // " 5R 이상 ~ 10R 미만 " -> min 5, max 10
  const rangeMatch = note.match(/^(\d+(\.\d+)?)R\s*이상\s*~\s*(\d+(\.\d+)?)R\s*미만/);
  if (rangeMatch) return { min: parseFloat(rangeMatch[1]), max: parseFloat(rangeMatch[3]) };
 
  return null;
}
 
function calcPrintRunCost(reams, paperStdSize) {
  const rows = dbCache.printRun.filter((r) => norm(r.size) === paperStdSize);
  let perReamRate = 0;
  for (const row of rows) {
    const band = parseReamBand(row.notes);
    if (!band) continue;
    if (reams >= band.min && reams < band.max) {
      perReamRate = parseDatabasePrice(row['supply price']);
      break;
    }
  }
  // If volume exceeds every band's max (shouldn't normally happen, bands end open-ended),
  // fall back to the cheapest (highest-volume) tier found.
  if (perReamRate === 0 && rows.length > 0) {
    const last = rows[rows.length - 1];
    perReamRate = parseDatabasePrice(last['supply price']);
  }
  return reams * perReamRate;
}
 
// Coating cost: flat supply-price lookup by coating type + sheet size.
function calcCoatingCost(coatingType, paperStdSize) {
  if (!coatingType) return 0;
  const row = dbCache.coating.find(
    (r) => norm(r.item) === coatingType && norm(r.size) === paperStdSize
  );
  return row ? parseDatabasePrice(row['supply price']) : 0;
}
 
// Epoxy / Spot UV cost: flat supply-price lookup by plate/sheet size.
function calcEpoxyCost(epoxySize) {
  if (!epoxySize) return 0;
  const row = dbCache.epoxy.find((r) => norm(r.size) === epoxySize);
  return row ? parseDatabasePrice(row['supply price']) : 0;
}
 
// Folding (Grounding) cost: per-copy rate (in 원, e.g. "3원") x quantity,
// plus a flat plate fee for that fold type if one is listed.
function calcGroundingCost(foldType, quantity) {
  if (!foldType) return 0;
  const rows = dbCache.grounding.filter((r) => norm(r.size) === foldType);
  let total = 0;
  for (const row of rows) {
    const price = parseDatabasePrice(row['supply price']);
    // Per-copy rates are tiny (single-digit/low-double-digit 원); flat plate
    // fees are in the tens of thousands. Use magnitude to tell them apart.
    if (price > 0 && price < 1000) {
      total += price * quantity;
    } else if (price >= 1000) {
      total += price; // one-time plate/setup fee
    }
  }
  return total;
}
 
// Die-cutting cost: flat supply-price lookup, using the lowest-volume tier
// for the chosen paper standard size as a baseline estimate.
function calcDieCuttingCost(enabled, paperStdSize, reams) {
  if (!enabled) return 0;
  const rows = dbCache.dieCutting.filter((r) => norm(r.size) === paperStdSize);
  for (const row of rows) {
    const band = parseReamBand(row.notes);
    if (!band) continue;
    if (reams >= band.min && reams < band.max) {
      return parseDatabasePrice(row['supply price']);
    }
  }
  return rows.length > 0 ? parseDatabasePrice(rows[0]['supply price']) : 0;
}
 
function formatKRW(num) {
  return Math.round(num).toLocaleString('ko-KR');
}
 
// Binding cost.
// - 무선제본 (Perfect Bound): no pricing table exists yet. Cost is 0 for
//   now, pending a real Binding price/cost table from the source data.
// - Every other binding method: per your instruction, price is entered
//   manually by the user (per-copy KRW), shown/hidden via
//   toggleBindingPriceField() based on the selected method.
const PERFECT_BINDING_VALUE = '무선제본'; // matches Binding_DB row after trim()
 
function calcBindingCost(bindingMethod, bindingPricePerCopy, quantity) {
  if (norm(bindingMethod) === PERFECT_BINDING_VALUE) return 0;
  if (!bindingMethod) return 0;
  return bindingPricePerCopy * quantity;
}
 
// Show the manual price input only when a non-perfect-bound method is
// selected; show the "no pricing table yet" note only for perfect binding.
function toggleBindingPriceField() {
  const method = norm(document.getElementById('select-binding').value);
  const label = document.getElementById('label-binding-price');
  const input = document.getElementById('input-binding-price');
  const note = document.getElementById('note-perfect-binding');
  const isPerfectBound = method === PERFECT_BINDING_VALUE;
 
  if (label) label.style.display = isPerfectBound ? 'none' : '';
  if (input) input.style.display = isPerfectBound ? 'none' : '';
  if (note) note.style.display = isPerfectBound ? '' : 'none';
}
 
function runCalculation() {
  const input = getInputs();
  const reams = calcReams(input.quantity, input.totalPages, input.pageYield);
 
  const paperCost = calcPaperCost(reams, input.paperKey, input.paperStdSize);
  const plateCost = calcPlateCost(input.colorProfile, input.plateKey);
  const printRunCost = calcPrintRunCost(reams, input.paperStdSize);
  const bindingCost = calcBindingCost(input.bindingMethod, input.bindingPrice, input.quantity);
 
  const coatingCost = calcCoatingCost(input.coating, input.paperStdSize);
  const epoxyCost = calcEpoxyCost(input.epoxySize);
  const groundingCost = calcGroundingCost(input.groundingFold, input.quantity);
  const dieCutCost = calcDieCuttingCost(input.dieCutting, input.paperStdSize, reams);
  const finishingCost = coatingCost + epoxyCost + groundingCost + dieCutCost + bindingCost;
 
  const total = paperCost + plateCost + printRunCost + finishingCost;
 
  document.getElementById('output-reams').textContent = reams.toFixed(2);
  document.getElementById('cost-paper').textContent = formatKRW(paperCost);
  document.getElementById('cost-plates').textContent = formatKRW(plateCost);
  document.getElementById('cost-printing').textContent = formatKRW(printRunCost);
  document.getElementById('cost-finishing').textContent = formatKRW(finishingCost);
  document.getElementById('cost-total').textContent = formatKRW(total);
}
 
// =====================================================================
// WIRE UP EVENT LISTENERS
// =====================================================================
function attachListeners() {
  const ids = [
    'select-size', 'select-paper-size', 'input-page-yield', 'input-quantity',
    'input-pages', 'select-paper', 'select-color-count', 'select-plate-type',
    'select-binding', 'select-binding-style', 'input-binding-price',
    'select-coating', 'select-epoxy', 'select-grounding', 'select-diecutting',
  ];
  for (const id of ids) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', runCalculation);
    if (el && el.tagName === 'INPUT') el.addEventListener('input', runCalculation);
  }
 
  const bindingSelect = document.getElementById('select-binding');
  if (bindingSelect) {
    bindingSelect.addEventListener('change', toggleBindingPriceField);
  }
}
 
// =====================================================================
// BOOTSTRAP
// =====================================================================
async function initializeCalculatorApp() {
  if (!initSupabase()) {
    setStatus('⚠ Supabase library did not load. Check the CDN <script> tag in index.html and your network connection.');
    return;
  }
  await loadAllTables();
  populateDropdowns();
  attachListeners();
  toggleBindingPriceField();
  runCalculation();
}
 
document.addEventListener('DOMContentLoaded', initializeCalculatorApp);