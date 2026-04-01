export async function onRequest(context) {
    const url = new URL(context.request.url);
    url.pathname = '/index.html';
    const response = await context.env.ASSETS.fetch(url);
    return new Response(response.body, {
        headers: response.headers,
        status: 200
    });
}
