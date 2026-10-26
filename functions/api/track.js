
export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.API_WORKER) {
    return Response.json(
      {
        ok: false,
        error: "Chưa cấu hình API_WORKER"
      },
      { status: 503 }
    );
  }

  return env.API_WORKER.fetch(request);
}
