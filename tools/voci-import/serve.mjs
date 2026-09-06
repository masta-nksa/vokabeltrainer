// Kleiner Server für die Kurier-Oberfläche. Keine Abhängigkeiten – nur die
// Node-Standardbibliothek, im Geist des `python -m http.server` aus der README.
//
// Aufruf:  node tools/voci-import/serve.mjs [port]
//
// Stellt bereit:
//   GET  /              die Oberfläche (curate.html)
//   GET  /draft.json    der aktuelle Entwurf
//   POST /draft.json    Entwurf speichern (Body = JSON)
//   GET  /pages/<datei>  die gerenderten Blattseiten

import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname, basename } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const draftDir = join(here, 'draft');
const draftFile = join(draftDir, 'draft.json');
const port = Number(process.argv[2] || process.env.PORT || 5511);

const TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg'
};

function send(res, status, body, type = 'text/plain; charset=utf-8') {
    res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
    res.end(body);
}

const server = createServer(async (req, res) => {
    try {
        const url = new URL(req.url, `http://localhost:${port}`);
        const path = url.pathname;

        if (path === '/' || path === '/index.html') {
            return send(res, 200, await readFile(join(here, 'curate.html')), TYPES['.html']);
        }

        if (path === '/draft.json') {
            if (req.method === 'GET') {
                return send(res, 200, await readFile(draftFile), TYPES['.json']);
            }
            if (req.method === 'POST') {
                const chunks = [];
                for await (const chunk of req) chunks.push(chunk);
                const text = Buffer.concat(chunks).toString('utf8');
                JSON.parse(text); // wirft bei kaputtem JSON, dann 400
                await writeFile(draftFile, JSON.stringify(JSON.parse(text), null, 2) + '\n');
                return send(res, 200, '{"ok":true}', TYPES['.json']);
            }
            return send(res, 405, 'Method Not Allowed');
        }

        if (path.startsWith('/pages/')) {
            const name = basename(path);
            const file = join(draftDir, 'pages', name);
            return send(res, 200, await readFile(file), TYPES[extname(name)] || 'application/octet-stream');
        }

        return send(res, 404, 'Not Found');
    } catch (error) {
        if (error.code === 'ENOENT') return send(res, 404, 'Not Found');
        if (error instanceof SyntaxError) return send(res, 400, `Kaputtes JSON: ${error.message}`);
        return send(res, 500, String(error));
    }
});

server.listen(port, () => {
    console.log(`Kurier-Oberfläche: http://localhost:${port}`);
    console.log(`Entwurf: ${draftFile}`);
    console.log('Zum Beenden Ctrl+C.');
});
