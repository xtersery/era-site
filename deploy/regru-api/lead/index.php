<?php
/**
 * POST https://api.era-cosmetology.ru/lead/ — a relay only.
 *
 * REG.RU shared hosting cannot reach api.telegram.org, but it can reach
 * Vercel. So this file forwards the inquiry, byte for byte, to the existing
 * Vercel Function (`api/lead.ts`), which keeps validation, bot protection,
 * rate limiting and the Telegram call (`server/lead/`). Nothing here parses,
 * checks, transforms or logs the lead.
 *
 * Trusted-proxy protocol — the same as the Cloudflare front
 * (`functions/api/lead.ts`, `server/lead/proxy.ts`):
 *   x-era-proxy-secret  LEAD_PROXY_SECRET, shared with Vercel
 *   x-era-client-ip     the visitor's address — here REMOTE_ADDR only,
 *                       never a visitor-supplied X-Forwarded-For / X-Real-IP
 *
 * The secret lives in a private config OUTSIDE the document root
 * (README.md → «Private config»), never in this file.
 *
 * Logs carry the request id, the status, the upstream status and the time —
 * never the body, a field of it, an address or the secret.
 *
 * PHP 7.4+, ext-curl.
 */

declare(strict_types=1);

ini_set('display_errors', '0');

const ALLOWED_ORIGIN = 'https://www.era-cosmetology.ru';
const UPSTREAM = 'https://era-site-eight.vercel.app/api/lead';
const MAX_BODY = 8 * 1024;
/** an upstream answer larger than this is not the handler's small JSON */
const MAX_RESPONSE = 64 * 1024;
const CONNECT_TIMEOUT = 5;
const TOTAL_TIMEOUT = 15;

$requestId = bin2hex(random_bytes(8));
$startedAt = microtime(true);

/** one log line: only what is listed here, ever */
function relay_log(string $requestId, float $startedAt, int $status, string $upstream, string $note = ''): void
{
    $ms = (int) round((microtime(true) - $startedAt) * 1000);
    error_log(sprintf(
        '[lead-relay] id=%s status=%d upstream=%s ms=%d%s',
        $requestId,
        $status,
        $upstream,
        $ms,
        $note === '' ? '' : ' note=' . $note
    ));
}

function relay_headers(bool $originAllowed, string $requestId): void
{
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    header('Vary: Origin');
    header('X-Request-Id: ' . $requestId);
    if ($originAllowed) {
        header('Access-Control-Allow-Origin: ' . ALLOWED_ORIGIN);
    }
}

/** answers with a local JSON body and ends the request */
function relay_json(int $status, string $body, bool $originAllowed, string $requestId, float $startedAt, string $upstream = '-', string $note = ''): void
{
    http_response_code($status);
    relay_headers($originAllowed, $requestId);
    echo $body;
    relay_log($requestId, $startedAt, $status, $upstream, $note);
    exit;
}

/** the private config, outside the document root: ['LEAD_PROXY_SECRET' => '…'] */
function relay_secret(): string
{
    $path = getenv('ERA_LEAD_RELAY_CONFIG');
    if (!is_string($path) || $path === '') {
        // docroot/lead/index.php → docroot → the site's folder → the account's data folder
        $path = dirname(__DIR__, 3) . '/era-private/lead-relay.php';
    }
    if (!is_file($path) || !is_readable($path)) {
        return '';
    }
    $config = require $path;
    $secret = is_array($config) ? ($config['LEAD_PROXY_SECRET'] ?? '') : '';
    return is_string($secret) && $secret !== 'replace-me' ? $secret : '';
}

$method = $_SERVER['REQUEST_METHOD'] ?? '';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$originAllowed = $origin === ALLOWED_ORIGIN;

// --- preflight, answered here ---------------------------------------------
if ($method === 'OPTIONS') {
    if (!$originAllowed) {
        relay_json(403, '{"ok":false,"error":"origin"}', false, $requestId, $startedAt, '-', 'preflight');
    }
    http_response_code(204);
    header('Access-Control-Allow-Origin: ' . ALLOWED_ORIGIN);
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    header('Access-Control-Max-Age: 3600');
    header('Vary: Origin');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    relay_log($requestId, $startedAt, 204, '-', 'preflight');
    exit;
}

if ($method !== 'POST') {
    header('Allow: POST, OPTIONS');
    relay_json(405, '{"ok":false,"error":"method"}', $originAllowed, $requestId, $startedAt);
}

if (!$originAllowed) {
    relay_json(403, '{"ok":false,"error":"origin"}', false, $requestId, $startedAt);
}

$type = strtolower(trim(explode(';', (string) ($_SERVER['CONTENT_TYPE'] ?? ''))[0]));
if ($type !== 'application/json') {
    relay_json(415, '{"ok":false,"error":"type"}', true, $requestId, $startedAt);
}

// --- the body, raw and bounded --------------------------------------------
$declared = $_SERVER['CONTENT_LENGTH'] ?? '';
if ($declared !== '' && ctype_digit((string) $declared) && (int) $declared > MAX_BODY) {
    relay_json(413, '{"ok":false,"error":"too-large"}', true, $requestId, $startedAt);
}
// read one byte past the cap, so a body without Content-Length (chunked) is bounded too
$body = file_get_contents('php://input', false, null, 0, MAX_BODY + 1);
if ($body === false) {
    relay_json(400, '{"ok":false,"error":"invalid"}', true, $requestId, $startedAt);
}
if (strlen($body) > MAX_BODY) {
    relay_json(413, '{"ok":false,"error":"too-large"}', true, $requestId, $startedAt);
}

$secret = relay_secret();
if ($secret === '') {
    // without the secret Vercel would put every visitor in REG.RU's one rate-limit bucket
    relay_json(503, '{"ok":false,"error":"not-configured"}', true, $requestId, $startedAt, '-', 'no-secret');
}

// --- upstream -------------------------------------------------------------
$headers = [
    'Content-Type: application/json',
    'Accept: application/json',
    'Origin: ' . ALLOWED_ORIGIN,
    'x-era-proxy-secret: ' . $secret,
    'Expect:', // no 100-continue round trip
];
$visitor = (string) ($_SERVER['REMOTE_ADDR'] ?? '');
if (filter_var($visitor, FILTER_VALIDATE_IP) !== false) {
    $headers[] = 'x-era-client-ip: ' . $visitor;
}

$response = '';
$curl = curl_init(UPSTREAM);
curl_setopt_array($curl, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $body, // a string: sent as is
    CURLOPT_HTTPHEADER => $headers,
    CURLOPT_CONNECTTIMEOUT => CONNECT_TIMEOUT,
    CURLOPT_TIMEOUT => TOTAL_TIMEOUT,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_SSL_VERIFYHOST => 2,
    CURLOPT_FOLLOWLOCATION => false,
    CURLOPT_PROTOCOLS => CURLPROTO_HTTPS,
    CURLOPT_HEADER => false,
    CURLOPT_WRITEFUNCTION => static function ($handle, string $chunk) use (&$response): int {
        if (strlen($response) + strlen($chunk) > MAX_RESPONSE) {
            return 0; // aborts the transfer
        }
        $response .= $chunk;
        return strlen($chunk);
    },
]);
$ok = curl_exec($curl);
$errno = curl_errno($curl);
$upstreamStatus = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
curl_close($curl);
unset($secret, $headers);

if ($ok === false || $errno !== 0 || $upstreamStatus < 100) {
    relay_json(502, '{"ok":false,"error":"delivery"}', true, $requestId, $startedAt, 'none', 'curl-' . $errno);
}

// the handler always answers a small JSON; anything else (a platform error page, a redirect) is not passed on
json_decode($response);
if ($response === '' || json_last_error() !== JSON_ERROR_NONE) {
    relay_json(502, '{"ok":false,"error":"delivery"}', true, $requestId, $startedAt, (string) $upstreamStatus, 'non-json');
}

relay_json($upstreamStatus, $response, true, $requestId, $startedAt, (string) $upstreamStatus);
