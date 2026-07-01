// ─────────────────────────────────────────────────────────────
// Netlify serverless function — fetches knockout matches only
// Called by browser at /.netlify/functions/api
// No CORS issues — runs server-side
// ─────────────────────────────────────────────────────────────
const API_KEY  = '835860c792e3461e93836e8b787ba0a1';
const API_BASE = 'https://api.football-data.org/v4';
const WC_ID    = 2000;

exports.handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET',
  };

  try {
    // Fetch all matches from football-data.org
    const res = await fetch(`${API_BASE}/competitions/${WC_ID}/matches`, {
      headers: { 'X-Auth-Token': API_KEY }
    });

    if (!res.ok) {
      return {
        statusCode: res.status,
        headers,
        body: JSON.stringify({ error: 'Upstream error', status: res.status })
      };
    }

    const data = await res.json();
    const matches = (data.matches || []);

    // Return only knockout matches to keep payload small
    const knockout = matches
      .filter(m => ['ROUND_OF_32','LAST_16','QUARTER_FINALS','SEMI_FINALS','FINAL','THIRD_PLACE'].includes(m.stage))
      .map(m => ({
        id:     m.id,
        date:   m.utcDate,
        stage:  m.stage,
        status: m.status,
        home:   m.homeTeam?.name || '',
        away:   m.awayTeam?.name || '',
        hs:     m.score?.fullTime?.home ?? m.score?.halfTime?.home ?? null,
        as:     m.score?.fullTime?.away ?? m.score?.halfTime?.away ?? null,
        penHome: m.score?.penalties?.home ?? null,
        penAway: m.score?.penalties?.away ?? null,
      }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ matches: knockout, updated: new Date().toISOString() })
    };

  } catch(err) {
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};

