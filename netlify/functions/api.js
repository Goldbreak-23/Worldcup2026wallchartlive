// ─────────────────────────────────────────────────────────────
// Netlify Serverless Function — proxies football-data.org API
// Lives server-side so there are zero CORS issues
// ─────────────────────────────────────────────────────────────
const API_KEY  = '835860c792e3461e93836e8b787ba0a1';
const API_BASE = 'https://api.football-data.org/v4';

exports.handler = async function(event) {
  // Which endpoint does the browser want?
  const path = event.queryStringParameters?.path || '';
  if (!path) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing path parameter' }) };
  }

  const url = `${API_BASE}${path}`;
  console.log('Proxying:', url);

  try {
    const response = await fetch(url, {
      headers: {
        'X-Auth-Token': API_KEY,
        'Accept':       'application/json',
      },
    });

    const text = await response.text();

    return {
      statusCode: response.status,
      headers: {
        'Content-Type':                'application/json',
        'Access-Control-Allow-Origin': '*',   // allow browser to read response
      },
      body: text,
    };
  } catch (err) {
    console.error('Proxy error:', err);
    return {
      statusCode: 502,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Upstream fetch failed', detail: err.message }),
    };
  }
};
