// ─────────────────────────────────────────────────────────────
// Netlify serverless function — proxies football-data.org
// Returns ALL matches (group + knockout) so the browser
// can build everything dynamically from one source of truth.
// ─────────────────────────────────────────────────────────────
const API_KEY  = '835860c792e3461e93836e8b787ba0a1';
const API_BASE = 'https://api.football-data.org/v4';
const WC_ID    = 2000;

exports.handler = async function(event) {
  const headers = {
    'Content-Type':                'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control':               'no-store',
  };

  try {
    // Fetch matches + standings in parallel
    const [mRes, sRes] = await Promise.all([
      fetch(`${API_BASE}/competitions/${WC_ID}/matches`,   { headers: { 'X-Auth-Token': API_KEY } }),
      fetch(`${API_BASE}/competitions/${WC_ID}/standings`, { headers: { 'X-Auth-Token': API_KEY } }),
    ]);

    if (!mRes.ok) throw new Error(`matches HTTP ${mRes.status}`);
    if (!sRes.ok) throw new Error(`standings HTTP ${sRes.status}`);

    const [mData, sData] = await Promise.all([mRes.json(), sRes.json()]);

    // Slim down matches to only what the browser needs
    const matches = (mData.matches || []).map(m => ({
      id:      m.id,
      utcDate: m.utcDate,
      stage:   m.stage,
      group:   m.group || null,
      matchday:m.matchday,
      status:  m.status,           // SCHEDULED, IN_PLAY, PAUSED, HALFTIME, FINISHED
      home:    m.homeTeam?.name  || m.homeTeam?.shortName  || 'TBD',
      away:    m.awayTeam?.name  || m.awayTeam?.shortName  || 'TBD',
      homeCode:m.homeTeam?.tla   || '',
      awayCode:m.awayTeam?.tla   || '',
      hs:      m.score?.fullTime?.home  ?? m.score?.halfTime?.home  ?? null,
      as_:     m.score?.fullTime?.away  ?? m.score?.halfTime?.away  ?? null,
      penH:    m.score?.penalties?.home ?? null,
      penA:    m.score?.penalties?.away ?? null,
      winner:  m.score?.winner || null, // HOME_TEAM, AWAY_TEAM, DRAW
    }));

    // Slim down standings
    const standings = (sData.standings || [])
      .filter(s => s.type === 'TOTAL')
      .map(s => ({
        group: s.group,
        table: (s.table || []).map(r => ({
          pos:  r.position,
          name: r.team?.name || '',
          tla:  r.team?.tla  || '',
          p:    r.playedGames,
          w:    r.won,  d: r.draw, l: r.lost,
          gf:   r.goalsFor, ga: r.goalsAgainst,
          pts:  r.points,
        })),
      }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        matches,
        standings,
        updated: new Date().toISOString(),
      }),
    };

  } catch(err) {
    console.error('API function error:', err.message);
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
