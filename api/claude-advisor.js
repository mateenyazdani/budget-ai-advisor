const Anthropic = require('@anthropic-ai/sdk');
const { rateLimited } = require('./_lib/ratelimit');

const MAX_MESSAGE_CHARS = 2000;
const MAX_HISTORY_TURNS = 20;

function summariseBudget(budget) {
  if (!budget || typeof budget !== 'object') return 'No budget data was provided.';

  const currency = String(budget.currency || '').slice(0, 3);
  const country = String(budget.country || 'unknown').slice(0, 40);
  const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

  const income = num(budget.monthlyIncome);
  const expenses = num(budget.totalExpenses);
  const surplus = num(budget.surplus);

  const categories = Object.entries(budget.categories || {})
    .filter(([, amount]) => num(amount) !== null && amount > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 40)
    .map(([name, amount]) => `- ${String(name).slice(0, 40)}: ${currency}${amount}`)
    .join('\n');

  return [
    `Country: ${country}`,
    income !== null ? `Monthly income: ${currency}${income}` : null,
    expenses !== null ? `Total monthly expenses: ${currency}${expenses}` : null,
    surplus !== null ? `Monthly surplus: ${currency}${surplus}` : null,
    budget.savingsRate ? `Savings rate: ${String(budget.savingsRate).slice(0, 10)}%` : null,
    categories ? `\nBreakdown:\n${categories}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

function toApiMessages(history) {
  if (!Array.isArray(history)) return [];
  const mapped = history
    .filter((m) => m && typeof m.content === 'string' && m.content.trim())
    .map((m) => ({
      role: m.type === 'user' ? 'user' : 'assistant',
      content: m.content.slice(0, MAX_MESSAGE_CHARS),
    }));

  // The API requires the conversation to open with a user turn, so drop the
  // component's canned greeting and anything else leading before the first one.
  const firstUser = mapped.findIndex((m) => m.role === 'user');
  return firstUser === -1 ? [] : mapped.slice(firstUser).slice(-MAX_HISTORY_TURNS);
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({
      error: 'The advisor is not configured. Set ANTHROPIC_API_KEY in your environment.',
    });
  }

  const { message, budget, conversationHistory } = req.body || {};

  if (typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'A message is required.' });
  }

  const client = new Anthropic();

  const system = `You are a practical personal-budget advisor inside a budgeting app.

The user's current budget:
${summariseBudget(budget)}

Guidelines:
- Be concise. Two or three short paragraphs, or a short list. This renders in a small chat bubble.
- Give concrete numbers from their actual budget above rather than generic advice.
- Amounts in the breakdown are modelled estimates from a questionnaire, not real transactions. Say so if the user treats them as exact.
- You are not a licensed financial adviser. Do not give investment, tax, or debt-restructuring advice; suggest a qualified professional for those.`;

  try {
    const response = await client.messages.create({
      model: 'claude-opus-5',
      max_tokens: 4000,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'low' },
      system,
      messages: [
        ...toApiMessages(conversationHistory),
        { role: 'user', content: message.slice(0, MAX_MESSAGE_CHARS) },
      ],
    });

    if (response.stop_reason === 'refusal') {
      return res.status(200).json({
        response: "I can't help with that one. Try asking about your spending categories or savings instead.",
      });
    }

    const text = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim();

    return res.status(200).json({ response: text || 'Sorry, I had nothing useful to add there.' });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      console.error('Anthropic auth failed - check ANTHROPIC_API_KEY');
      return res.status(503).json({ error: 'The advisor is not configured correctly.' });
    }
    if (error instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ error: 'Too many requests right now. Try again in a moment.' });
    }
    console.error('Advisor request failed:', error);
    return res.status(502).json({ error: 'The advisor is unavailable right now.' });
  }
}

module.exports = rateLimited({ endpoint: 'advisor', limit: 40 }, handler);
