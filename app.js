/* ─── Config ────────────────────────────────────────────────────────────── */
const PLACEHOLDER_WORDS = {
  ashkenazi: ['נו, שוין', 'האק נישט אין טשייניק', 'גגנגן', 'פון אונזרר'],
  mizrahi:   ['מחלוטה', 'צ׳לה בלה', 'טבחה', 'שופוני יא נאס', 'פנאני'],
};

const CHIPS = {
  ashkenazi: ['נו שוין', 'פון אונזרר', 'האק נישט אין טשייניק', 'שלעפן'],
  mizrahi:   ['יאללה', 'וואלה', 'פנאני', 'שופוני יא נאס'],
};

/* ─── State ─────────────────────────────────────────────────────────────── */
let isMizrahi = false;

/* ─── DOM ───────────────────────────────────────────────────────────────── */
const body              = document.body;
const toggleBtn         = document.getElementById('toggleBtn');
const heroTitle         = document.getElementById('heroTitle');
const searchInput       = document.getElementById('searchInput');
const searchPlaceholder = document.getElementById('searchPlaceholder');
const searchBtn         = document.getElementById('searchBtn');
const chipsEl           = document.getElementById('chips');
const resultCard        = document.getElementById('resultCard');
const resultLoader      = document.getElementById('resultLoader');
const resultText        = document.getElementById('resultText');

/* ─── Toggle ────────────────────────────────────────────────────────────── */
toggleBtn.addEventListener('click', () => {
  isMizrahi = !isMizrahi;
  toggleBtn.setAttribute('aria-pressed', isMizrahi);
  body.classList.toggle('ashkenazi', !isMizrahi);
  body.classList.toggle('mizrahi',    isMizrahi);

  heroTitle.classList.add('switching');
  setTimeout(() => {
    heroTitle.textContent = isMizrahi ? 'מזרחים' : 'אשכנזים';
    heroTitle.classList.remove('switching');
  }, 160);

  searchInput.value = '';
  hideResult();
  restartPlaceholder();
  renderChips();
});

/* ─── Chips ─────────────────────────────────────────────────────────────── */
function renderChips() {
  const mode  = isMizrahi ? 'mizrahi' : 'ashkenazi';
  const words = CHIPS[mode];
  chipsEl.innerHTML = '';
  words.forEach(word => {
    const btn = document.createElement('button');
    btn.className = 'chip';
    btn.textContent = word;
    btn.addEventListener('click', () => {
      searchInput.value = word;
      searchPlaceholder.style.opacity = '0';
      doSearch();
    });
    chipsEl.appendChild(btn);
  });
}

/* ─── Animated placeholder ──────────────────────────────────────────────── */
let placeholderTimeout = null;
let phIndex   = 0;
let phCharIdx = 0;
let phDeleting = false;

function currentSuggestions() {
  return isMizrahi ? PLACEHOLDER_WORDS.mizrahi : PLACEHOLDER_WORDS.ashkenazi;
}

function renderPlaceholder(text) {
  const visible = searchInput.value.length === 0;
  searchPlaceholder.style.opacity = visible ? '1' : '0';
  searchPlaceholder.innerHTML = escapeHTML(text) + '<span class="cursor"></span>';
}

function escapeHTML(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function tickPlaceholder() {
  const words = currentSuggestions();
  const word  = words[phIndex % words.length];

  if (!phDeleting) {
    phCharIdx++;
    renderPlaceholder(word.slice(0, phCharIdx));
    if (phCharIdx >= word.length) {
      phDeleting = true;
      placeholderTimeout = setTimeout(tickPlaceholder, 1800);
    } else {
      placeholderTimeout = setTimeout(tickPlaceholder, 85 + Math.random() * 45);
    }
  } else {
    phCharIdx--;
    renderPlaceholder(word.slice(0, phCharIdx));
    if (phCharIdx === 0) {
      phDeleting = false;
      phIndex++;
      placeholderTimeout = setTimeout(tickPlaceholder, 400);
    } else {
      placeholderTimeout = setTimeout(tickPlaceholder, 40 + Math.random() * 25);
    }
  }
}

function restartPlaceholder() {
  clearTimeout(placeholderTimeout);
  phIndex    = 0;
  phCharIdx  = 0;
  phDeleting = false;
  renderPlaceholder('');
  placeholderTimeout = setTimeout(tickPlaceholder, 600);
}

searchInput.addEventListener('input', () => {
  searchPlaceholder.style.opacity = searchInput.value.length ? '0' : '1';
});

/* ─── Search ────────────────────────────────────────────────────────────── */
async function doSearch() {
  const query = searchInput.value.trim();
  if (!query) return;

  const mode = isMizrahi ? 'מזרחי' : 'אשכנזי';
  showLoader();

  try {
    const explanation = await fetchGemini(query, mode);
    showResult(explanation);
  } catch (err) {
    showResult('שגיאה בחיבור לשרת. נסה שוב.');
    console.error(err);
  }
}

searchBtn.addEventListener('click', doSearch);
searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });

/* ─── Gemini API ────────────────────────────────────────────────────────── */
async function fetchGemini(word, mode) {
  const res = await fetch('/api/explain', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ word, mode }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.explanation;
}

/* ─── Result helpers ─────────────────────────────────────────────────────── */
function showLoader() {
  resultCard.classList.add('visible');
  resultLoader.classList.add('active');
  resultText.textContent = '';
  resultText.style.display = 'none';
}

function showResult(text) {
  resultLoader.classList.remove('active');
  resultText.style.display = '';
  resultText.textContent = text;
  resultCard.classList.add('visible');
}

function hideResult() {
  resultCard.classList.remove('visible');
  resultLoader.classList.remove('active');
  resultText.textContent = '';
}

/* ─── Init ──────────────────────────────────────────────────────────────── */
renderChips();
restartPlaceholder();
