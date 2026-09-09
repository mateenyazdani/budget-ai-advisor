// Parses a bank statement export into transactions.
//
// Built around Revolut's personal export, but tolerant: banks vary in
// delimiter, header wording and decimal separator, and a statement that fails
// to import is far more annoying than one that guesses sensibly.

const HEADER_ALIASES = {
  date: ['completed date', 'started date', 'date', 'fecha', 'transaction date', 'booking date'],
  description: ['description', 'reference', 'concepto', 'details', 'narrative', 'payee'],
  amount: ['amount', 'importe', 'value', 'paid out', 'debit'],
  currency: ['currency', 'moneda', 'ccy'],
  state: ['state', 'status', 'estado'],
  fee: ['fee', 'comision', 'comisión'],
};

function detectDelimiter(line) {
  const counts = [
    [',', (line.match(/,/g) || []).length],
    [';', (line.match(/;/g) || []).length],
    ['\t', (line.match(/\t/g) || []).length],
  ];
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][1] > 0 ? counts[0][0] : ',';
}

// Splits one CSV line, honouring quoted fields containing the delimiter.
function splitLine(line, delimiter) {
  const out = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      out.push(field);
      field = '';
    } else {
      field += char;
    }
  }
  out.push(field);
  return out.map((f) => f.trim());
}

function findColumn(headers, aliases) {
  for (const alias of aliases) {
    const index = headers.findIndex((h) => h === alias);
    if (index !== -1) return index;
  }
  // Fall back to a partial match, so "Completed Date (UTC)" still resolves.
  for (const alias of aliases) {
    const index = headers.findIndex((h) => h.includes(alias));
    if (index !== -1) return index;
  }
  return -1;
}

function parseAmount(raw) {
  if (raw === undefined || raw === null) return null;
  let s = String(raw).trim().replace(/[^\d,.\-+]/g, '');
  if (!s) return null;

  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');

  if (lastComma !== -1 && lastDot !== -1) {
    // Whichever comes last is the decimal separator.
    s = lastComma > lastDot ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (lastComma !== -1) {
    // A lone comma with two trailing digits is a decimal separator, not a
    // thousands separator: "1.234,56" vs "1,234".
    s = /,\d{1,2}$/.test(s) ? s.replace(',', '.') : s.replace(/,/g, '');
  }

  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function parseDate(raw) {
  if (!raw) return null;
  const s = String(raw).trim();

  // ISO-ish: 2026-01-15 or 2026-01-15 12:30:00
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  // Day-first: 15/01/2026 or 15-01-2026
  const dayFirst = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dayFirst) {
    const [, d, m, y] = dayFirst;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  const parsed = new Date(s);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

// Stable per-row id so re-uploading an overlapping statement does not duplicate.
function makeExternalId(date, amount, description) {
  const basis = `${date}|${amount.toFixed(2)}|${description.slice(0, 40).toLowerCase()}`;
  let hash = 0;
  for (let i = 0; i < basis.length; i += 1) {
    hash = (hash * 31 + basis.charCodeAt(i)) | 0;
  }
  return `csv_${Math.abs(hash).toString(36)}`;
}

const CATEGORY_RULES = [
  { category: 'Groceries', match: /mercadona|carrefour|lidl|aldi|dia\b|consum|alcampo|eroski|supermerc|grocery|tesco|sainsbury/i },
  { category: 'Dining Out', match: /restaurant|burger|pizza|kebab|mcdonald|kfc|telepizza|glovo|uber\s?eats|just\s?eat|deliveroo|taberna|bar\b/i },
  { category: 'Coffee & Snacks', match: /starbucks|costa|cafe|café|coffee|panaderia|panadería|dunkin/i },
  { category: 'Public Transport', match: /metro|emt\b|renfe|cercanias|cercanías|crtm|bus\b|tmb|transport|uber|cabify|bolt|taxi/i },
  { category: 'Gym', match: /gym|basic.?fit|mcfit|fitness|altafit|vivagym/i },
  { category: 'Padel', match: /padel|pádel/i },
  { category: 'Netflix', match: /netflix/i },
  { category: 'Spotify', match: /spotify/i },
  { category: 'iCloud+', match: /icloud|apple\.com\/bill|apple services/i },
  { category: 'Phone', match: /vodafone|movistar|orange|yoigo|o2\b|digi\b/i },
  { category: 'Electricity', match: /iberdrola|endesa|naturgy|holaluz|electric/i },
  { category: 'Clothing', match: /zara|h&m|primark|bershka|pull.?bear|uniqlo|decathlon|nike|adidas/i },
  { category: 'Cinema & Entertainment', match: /cinema|cine|yelmo|kinepolis|spotify|steam|playstation|xbox/i },
  { category: 'Housing', match: /rent|alquiler|landlord|mortgage|hipoteca/i },
];

// A guess, shown as such in the UI — never presented as the bank's own label.
function guessCategory(description) {
  for (const rule of CATEGORY_RULES) {
    if (rule.match.test(description)) return rule.category;
  }
  return 'Miscellaneous';
}

export function parseStatement(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) {
    return { error: 'That file looks empty.', transactions: [] };
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = splitLine(lines[0], delimiter).map((h) => h.toLowerCase().replace(/^"|"$/g, ''));

  const cols = {
    date: findColumn(headers, HEADER_ALIASES.date),
    description: findColumn(headers, HEADER_ALIASES.description),
    amount: findColumn(headers, HEADER_ALIASES.amount),
    currency: findColumn(headers, HEADER_ALIASES.currency),
    state: findColumn(headers, HEADER_ALIASES.state),
    fee: findColumn(headers, HEADER_ALIASES.fee),
  };

  if (cols.amount === -1 || cols.date === -1) {
    return {
      error: 'Could not find a date and amount column. Is this a bank statement export?',
      transactions: [],
    };
  }

  const transactions = [];
  let skipped = 0;

  for (let i = 1; i < lines.length; i += 1) {
    const row = splitLine(lines[i], delimiter);
    const amount = parseAmount(row[cols.amount]);
    const date = parseDate(row[cols.date]);

    if (amount === null || date === null) {
      skipped += 1;
      continue;
    }

    // Revolut marks reverted or pending rows; only completed ones are real.
    const state = cols.state !== -1 ? (row[cols.state] || '').toUpperCase() : '';
    if (state && !['COMPLETED', 'COMPLETADO', 'BOOKED', ''].includes(state)) {
      skipped += 1;
      continue;
    }

    const description = (cols.description !== -1 ? row[cols.description] : '') || 'Transaction';
    const fee = cols.fee !== -1 ? parseAmount(row[cols.fee]) || 0 : 0;
    const total = amount - Math.abs(fee) * (amount < 0 ? 1 : 0);

    transactions.push({
      externalId: makeExternalId(date, total, description),
      date,
      amount: total,
      currency: cols.currency !== -1 ? row[cols.currency] || null : null,
      description: description.slice(0, 140),
      category: guessCategory(description),
      direction: total < 0 ? 'out' : 'in',
    });
  }

  if (!transactions.length) {
    return { error: 'No usable rows found in that file.', transactions: [], skipped };
  }

  transactions.sort((a, b) => b.date.localeCompare(a.date));
  return { transactions, skipped, error: null };
}

export function summarise(transactions) {
  const spent = transactions.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const received = transactions.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);

  const byCategory = {};
  for (const t of transactions) {
    if (t.amount >= 0) continue;
    byCategory[t.category] = (byCategory[t.category] || 0) + Math.abs(t.amount);
  }

  const dates = transactions.map((t) => t.date).sort();

  return {
    spent: Number(spent.toFixed(2)),
    received: Number(received.toFixed(2)),
    count: transactions.length,
    currency: transactions.find((t) => t.currency)?.currency || '€',
    from: dates[0],
    to: dates[dates.length - 1],
    byCategory: Object.entries(byCategory)
      .map(([category, total]) => ({ category, total: Number(total.toFixed(2)) }))
      .sort((a, b) => b.total - a.total),
  };
}
