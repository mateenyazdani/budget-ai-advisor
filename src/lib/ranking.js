// Beli's actual mechanic, not a reskin of it: a place is scored by comparing
// it against places you already rated, not by picking a number out of the air.
// "4 stars" means nothing next to another 4-star place — "better than this,
// worse than that" narrows a real position between them.

// Where a bucket's 0–10 range sits. Liked places always outscore fine ones,
// which always outscore disliked ones, no matter how the comparisons inside
// a bucket go.
export const SENTIMENT_RANGES = {
  like: [6.7, 10.0],
  fine: [3.4, 6.6],
  dislike: [0.0, 3.3],
};

export const SENTIMENTS = [
  { id: 'like', label: 'Liked it', emoji: '👍' },
  { id: 'fine', label: 'It was fine', emoji: '😐' },
  { id: 'dislike', label: "Didn't like it", emoji: '👎' },
];

// The place to compare against next, binary-searching toward where the new
// one belongs among `sorted` (ascending by score). `lo`/`hi` are indices into
// `sorted`; the search is done once lo === hi, which is also the insertion
// point. Capped implicitly at ceil(log2(n)) rounds by the caller just calling
// this until done — nobody compares against more than a handful of places.
export function nextComparison(sorted, lo, hi) {
  if (lo >= hi) return null;
  const mid = Math.floor((lo + hi) / 2);
  return sorted[mid];
}

// `won` means the new place beat `sorted[mid]` — i.e. is better than it —
// which pushes the search toward the higher (better) half.
export function afterComparison(lo, hi, mid, won) {
  return won ? { lo: mid + 1, hi } : { lo, hi: mid };
}

// Once lo === hi, that index is where the new place slots into the sorted
// list. Its score interpolates between its new neighbours, or sits at the
// bucket's own edge when it has none on one side.
export function scoreFromInsertion(sentiment, sorted, index) {
  const [floor, ceil] = SENTIMENT_RANGES[sentiment];
  const below = sorted[index - 1]?.score;
  const above = sorted[index]?.score;

  if (below == null && above == null) return Number(((floor + ceil) / 2).toFixed(1));
  if (below == null) return Number(Math.max(floor, above - 0.3).toFixed(1));
  if (above == null) return Number(Math.min(ceil, below + 0.3).toFixed(1));
  return Number(((below + above) / 2).toFixed(1));
}
