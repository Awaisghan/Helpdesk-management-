export function jsonNoStore(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers); headers.set('Cache-Control','no-store, private');
  return Response.json(body, { ...init, headers });
}
