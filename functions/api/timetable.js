export async function onRequest(context) {
  const BASE_URL = 'https://script.google.com/a/macros/iimnagpur.ac.in/s/AKfycbwqaKOCa597wRpWy1ywlCDPHpoQgAC3n0AsurAUjgLeIDRU0M9nwRpgW_IhKm6gvpT8sA/exec?action=data';

  // Forward the `term` query parameter (default: 4)
  const url = new URL(context.request.url);
  const term = url.searchParams.get('term') || '4';
  const EXEC_URL = BASE_URL + '&term=' + encodeURIComponent(term);

  const headers = new Headers({
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store'
  });

  try {
    const response = await fetch(EXEC_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
      },
      redirect: 'follow'
    });

    const contentType = response.headers.get('content-type') || '';

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

