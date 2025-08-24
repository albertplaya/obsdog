const API_BASE = 'http://localhost:3003'

export async function getSnapshot() {
  const res = await fetch(`${API_BASE}/api/snapshot`)
  return res.json()
}

export function connectEvents(onEvent: (type: string, data: any) => void) {
  const ev = new EventSource(`${API_BASE}/events`)
  ev.addEventListener('request', (e: MessageEvent) => onEvent('request', JSON.parse(e.data)))
  ev.addEventListener('sql', (e: MessageEvent) => onEvent('sql', JSON.parse(e.data)))
  return () => ev.close()
}