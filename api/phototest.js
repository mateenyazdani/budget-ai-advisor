// Temporary: verifies the Places API (New) photos field and media endpoint
// actually work as expected before building the real feature. Delete once
// confirmed.
module.exports = async function handler(req, res) {
  if (req.query.token !== process.env.PHOTOTEST_TOKEN || !process.env.PHOTOTEST_TOKEN) {
    return res.status(404).json({ error: 'Not found' });
  }
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'no key' });

  const searchRes = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.photos',
    },
    body: JSON.stringify({ textQuery: 'restaurants in Madrid', maxResultCount: 3 }),
  });
  const searchData = await searchRes.json();
  if (!searchRes.ok) return res.status(200).json({ step: 'search', error: searchData });

  const firstPhoto = searchData.places?.[0]?.photos?.[0];
  if (!firstPhoto) {
    return res.status(200).json({
      step: 'no-photo',
      places: searchData.places?.map((p) => ({ name: p.displayName?.text, photoCount: p.photos?.length || 0 })),
    });
  }

  const mediaRes = await fetch(
    `https://places.googleapis.com/v1/${firstPhoto.name}/media?maxWidthPx=800&key=${apiKey}&skipHttpRedirect=true`
  );
  const mediaData = await mediaRes.json().catch(async () => ({ raw: await mediaRes.text() }));

  return res.status(200).json({
    step: 'ok',
    placeName: searchData.places[0].displayName?.text,
    photoRef: firstPhoto.name,
    photoCount: searchData.places[0].photos?.length,
    mediaStatus: mediaRes.status,
    mediaData,
  });
};
