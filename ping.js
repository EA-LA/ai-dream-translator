export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).end(JSON.stringify({ pong: true, now: Date.now() }));
}
