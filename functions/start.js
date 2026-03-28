export async function onRequest(context) {
    // Fetch the main index.html and serve it at /start
    // The client-side JS in app.js detects pathname '/start' and shows the start screen
    const url = new URL(context.request.url);
    url.pathname = '/index.html';
    const response = await context.env.ASSETS.fetch(url);
    return new Response(response.body, {
        headers: response.headers,
        status: 200
    });
}
