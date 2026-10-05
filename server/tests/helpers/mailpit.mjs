// Reads mail the server sent to the test Mailpit (docker-compose-test.yml).
const base = () => process.env.MAILPIT_API;

export async function clearMail() {
  await fetch(`${base()}/api/v1/messages`, { method: 'DELETE' });
}

// Message summaries, newest first. Optional filter: recipient address.
export async function listMail(to) {
  const res = await fetch(`${base()}/api/v1/messages?limit=200`);
  const { messages = [] } = await res.json();
  return to ? messages.filter((m) => m.To.some((r) => r.Address === to)) : messages;
}

export async function getMail(id) {
  const res = await fetch(`${base()}/api/v1/message/${id}`);
  return res.json();
}

// Waits for the first message to `to` (optionally whose subject matches).
export async function waitForMail(to, { subject, timeout = 10000 } = {}) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const hit = (await listMail(to)).find((m) => !subject || subject.test(m.Subject));
    if (hit) return getMail(hit.ID);
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`No mail to ${to}${subject ? ` matching ${subject}` : ''} within ${timeout}ms`);
}
