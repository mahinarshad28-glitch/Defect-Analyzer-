// POST /api/inspect  { image: <base64 jpeg>, mime: "image/jpeg" }  ->  { object, condition, defects[], shape, ... }
// The API key lives only in Vercel's environment variables, never in the browser.

const MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest';
const MAX_B64 = 3_500_000;                       // ~2.6 MB of image; Vercel's request limit is 4.5 MB
const hits = new Map();                          // tiny per-instance rate limit (the real brake is Gemini's own quota)

const PROMPT = `You are a strict industrial visual inspector. Look at the object in the photo and return ONLY JSON:
{"object":"short name","condition":"intact|damaged|uncertain","summary":"one or two sentences",
"defects":[{"type":"crack|chip|dent|scratch|stain|missing part|other","severity":1-5,"note":"short","box":[x,y,w,h]}],
"objectBox":[x,y,w,h],"shape":"round|box|other","depth":0.3,"axis":"vertical|horizontal","profile":[[t,r],...]}
All boxes are [x,y,w,h]: x and y are the top-left corner, w and h the width and height, each as a FRACTION between 0 and 1 of the
image width/height (origin top-left). Example: a box covering the right half of the image is [0.5,0,0.5,1].
Report only damage you can actually see; if none, defects is [].
depth: the object's thickness (front to back) as a fraction of its longest side, e.g. phone 0.06, book 0.15, cup 1.0.
shape: round (cup, mug, jug, bottle, vase, can, pen, tube), box (boxes, phones, books, laptops), or other.
profile: ONLY if shape is round, else null: 12-16 points [t,r] along its outline from one end (t=0) to the other (t=1) along its
long axis (bottom to top if vertical, left to right if horizontal); r = radius as a fraction of the object's length (0..0.6).`;

const num = (v, lo, hi, d) => (Number.isFinite(+v) ? Math.min(hi, Math.max(lo, +v)) : d);
const str = (v, n) => String(v ?? '').slice(0, n);
const box = (b) => (Array.isArray(b) && b.length === 4 ? [num(b[0], 0, 1, 0), num(b[1], 0, 1, 0), num(b[2], 0, 1, 0.1), num(b[3], 0, 1, 0.1)] : null);

// never trust model output: shape it into exactly what the page expects
export function clean(d) {
  const defects = (Array.isArray(d.defects) ? d.defects : []).slice(0, 8)
    .map((x) => ({ type: str(x.type, 30), severity: Math.round(num(x.severity, 1, 5, 1)), note: str(x.note, 200), box: box(x.box) }))
    .filter((x) => x.box);
  const profile = Array.isArray(d.profile)
    ? d.profile.slice(0, 24).filter((p) => Array.isArray(p) && p.length >= 2).map((p) => [num(p[0], 0, 1, 0), num(p[1], 0.01, 0.7, 0.2)])
    : null;
  return {
    object: str(d.object, 60) || 'object',
    condition: ['intact', 'damaged', 'uncertain'].includes(d.condition) ? d.condition : 'uncertain',
    summary: str(d.summary, 400),
    defects,
    objectBox: box(d.objectBox) || [0, 0, 1, 1],
    shape: ['round', 'box', 'other'].includes(d.shape) ? d.shape : 'other',
    depth: num(d.depth, 0.03, 0.9, 0.25),
    axis: d.axis === 'horizontal' ? 'horizontal' : 'vertical',
    profile: profile && profile.length >= 4 ? profile : null,
  };
}

export function parseModelText(text) {
  try { return JSON.parse(text); } catch { /* fall through */ }
  const m = String(text).match(/\{[\s\S]*\}/);
  return m ? JSON.parse(m[0]) : null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'post_only' });
  const need = process.env.ACCESS_CODE;
  if (need && req.headers['x-access-code'] !== need) return res.status(401).json({ error: 'access_code' });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: 'server_not_configured' });

  const ip = String(req.headers['x-forwarded-for'] || 'x').split(',')[0].trim();
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 60_000);
  if (recent.length >= 6) return res.status(429).json({ error: 'rate_limited' });
  hits.set(ip, [...recent, now]);

  const { image, mime } = req.body || {};
  if (typeof image !== 'string' || !['image/jpeg', 'image/png', 'image/webp'].includes(mime)) return res.status(400).json({ error: 'bad_request' });
  if (image.length > MAX_B64) return res.status(413).json({ error: 'too_large' });

  let r;
  try {
    r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ parts: [{ inline_data: { mime_type: mime, data: image } }, { text: PROMPT }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
      }),
    });
  } catch {
    return res.status(502).json({ error: 'ai_error' });
  }
  if (r.status === 429) return res.status(429).json({ error: 'rate_limited' });
  if (!r.ok) return res.status(502).json({ error: 'ai_error', status: r.status });

  const j = await r.json().catch(() => null);
  const text = (j?.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
  let parsed = null;
  try { parsed = parseModelText(text); } catch { /* handled below */ }
  if (!parsed || typeof parsed !== 'object') return res.status(502).json({ error: 'ai_error' });
  return res.status(200).json(clean(parsed));
}
