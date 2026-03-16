export async function onRequestGet(context) {
    const { env } = context;
    try {
        const data = await env.SALA_DATA.get('athletes');
        return new Response(data || '[]', {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}

export async function onRequestPost(context) {
    const { env, request } = context;
    try {
        const body = await request.text();
        // Basic validation: ensure it's valid JSON
        JSON.parse(body);
        await env.SALA_DATA.put('athletes', body);
        return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
