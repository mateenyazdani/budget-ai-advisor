const Anthropic = require('@anthropic-ai/sdk');

const MAX_RESUMES = 3;

function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced ? fenced[1] : text).trim();

  // Try whichever bracket opens first. Array-first would slice
  // {"subscriptions":[...]} down to its inner array and lose the key.
  const objectAt = candidate.indexOf('{');
  const arrayAt = candidate.indexOf('[');
  const order =
    objectAt === -1 ? [['[', ']']]
    : arrayAt === -1 ? [['{', '}']]
    : objectAt < arrayAt ? [['{', '}'], ['[', ']']]
    : [['[', ']'], ['{', '}']];

  for (const [open, close] of order) {
    const start = candidate.indexOf(open);
    const end = candidate.lastIndexOf(close);
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1));
      } catch {
        // fall through to the next shape
      }
    }
  }
  return null;
}

// Runs one Claude turn with server-side web search and returns parsed JSON.
// Returns null when the model answered but produced nothing parseable, which
// callers should treat as "no results" rather than as a failure.
async function searchJson({ system, prompt, city, countryCode, maxUses = 4, fetchUses = 0 }) {
  const client = new Anthropic();

  const params = {
    model: 'claude-opus-5',
    max_tokens: 8000,
    output_config: { effort: 'low' },
    tools: [
      {
        type: 'web_search_20260209',
        name: 'web_search',
        max_uses: maxUses,
        ...(city ? { user_location: { type: 'approximate', city, country: countryCode } } : {}),
      },
      // Search snippets often omit the actual figure, so callers that need one
      // can allow opening the pages search turns up. Fetching is slow, so it is
      // off unless asked for. It can only fetch URLs already found.
      ...(fetchUses > 0
        ? [{
            type: 'web_fetch_20260209',
            name: 'web_fetch',
            max_uses: fetchUses,
            max_content_tokens: 8000,
          }]
        : []),
    ],
    // web_fetch only accepts URLs already present in the conversation, so the
    // model must be told to search first rather than construct a likely URL.
    system: fetchUses > 0
      ? `${system}

Always run a web search before fetching. You may only fetch a URL that appeared in a search result — never type out a URL you expect to exist, as that fetch will fail.`
      : system,
  };

  let response = await client.messages.create({
    ...params,
    messages: [{ role: 'user', content: prompt }],
  });

  let resumes = 0;
  while (response.stop_reason === 'pause_turn' && resumes < MAX_RESUMES) {
    resumes += 1;
    response = await client.messages.create({
      ...params,
      messages: [
        { role: 'user', content: prompt },
        { role: 'assistant', content: response.content },
      ],
    });
  }

  if (response.stop_reason === 'refusal') return null;

  const text = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n');

  // Server tools fail with a 200 and an error object in the result block, so
  // a broken search looks exactly like a search that found nothing.
  for (const block of response.content) {
    if (block.type === 'web_search_tool_result' || block.type === 'web_fetch_tool_result') {
      const content = block.content;
      if (content && !Array.isArray(content) && content.error_code) {
        console.error('%s error: %s', block.type, content.error_code);
      }
    }
  }

  const parsed = extractJson(text);
  if (parsed === null) {
    // An empty result is otherwise indistinguishable from a parsing failure.
    console.error('No JSON in model reply. stop_reason=%s, text starts: %s', response.stop_reason, text.slice(0, 400));
  }
  return parsed;
}

function httpsUrlOrNull(value) {
  return typeof value === 'string' && /^https?:\/\//.test(value) ? value : null;
}

const COUNTRY_NAMES = {
  ES: 'Spain',
  GB: 'the United Kingdom',
  IE: 'Ireland',
  DE: 'Germany',
  FR: 'France',
  IT: 'Italy',
  PT: 'Portugal',
  NL: 'the Netherlands',
  US: 'the United States',
  AU: 'Australia',
};

const NAME_TO_CODE = {
  spain: 'ES',
  'united kingdom': 'GB',
  uk: 'GB',
  england: 'GB',
  ireland: 'IE',
  germany: 'DE',
  france: 'FR',
  italy: 'IT',
  portugal: 'PT',
  netherlands: 'NL',
  usa: 'US',
  'united states': 'US',
  australia: 'AU',
};

// user_location.country must be a 2-letter ISO code, but prompts read better
// with the full name, so callers get both from whichever form they have.
function resolveCountry(input) {
  const raw = String(input || '').trim();
  const code = /^[A-Za-z]{2}$/.test(raw)
    ? raw.toUpperCase()
    : NAME_TO_CODE[raw.toLowerCase()] || 'ES';
  return { code, name: COUNTRY_NAMES[code] || code };
}

module.exports = { searchJson, extractJson, httpsUrlOrNull, resolveCountry, Anthropic };
