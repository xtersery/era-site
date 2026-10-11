<?php
/**
 * GET https://api.era-cosmetology.ru/health/ — the relay's host is up and
 * runs PHP. It never calls Vercel and never reads the private config.
 */

declare(strict_types=1);

ini_set('display_errors', '0');

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

$method = $_SERVER['REQUEST_METHOD'] ?? '';
if ($method !== 'GET' && $method !== 'HEAD') {
    http_response_code(405);
    header('Allow: GET, HEAD');
    echo '{"ok":false,"error":"method"}';
    exit;
}

echo '{"ok":true}';
