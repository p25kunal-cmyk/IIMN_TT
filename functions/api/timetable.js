export async function onRequest(context) {
  const EXEC_URL = 'https://script.google.com/a/macros/iimnagpur.ac.in/s/AKfycbxBxonDpBgnWDV-vChOuysOLA8WgjE0dZ6Fpl1FAPE9ju3WldBRdqWnXlqDQf2a4_Y31A/exec?action=data';

  const headers = new Headers({
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store'
  });

  try {
    const response = await fetch(EXEC_URL + '&t=' + Date.now(), {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TimetableProxy/1.0)'
      }
    });

    const contentType = response.headers.get('content-type') || '';

    // If Google returned HTML (login page), the script needs auth
    if (contentType.includes('text/html')) {
      return new Response(JSON.stringify({ error: 'auth', message: 'Apps Script requires authentication. Make sure deployment is set to "Anyone" access.' }), {
        status: 401,
        headers
      });
    }

    const text = await response.text();

    // Validate it's JSON before returning
    try {
      JSON.parse(text);
    } catch(e) {
      return new Response(JSON.stringify({ error: 'invalid_response', message: 'Apps Script did not return valid JSON.', raw: text.slice(0, 200) }), {
        status: 502,
        headers
      });
    }

    return new Response(text, {
      status: 200,
      headers
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: 'proxy_error', message: err.message }), {
      status: 500,
      headers
    });
  }
}
