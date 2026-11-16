<?php
/**
 * ==============================================================================
 * Queens & Ko.nl - TransIP MySQL Database Bridge
 * Locatie op server: /www/api/database.php
 * ==============================================================================
 */

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Key");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

header("Content-Type: application/json; charset=UTF-8");

// ==========================================
// 1. DATABASE CONFIGURATIE LADEN
// ==========================================
$configFile = __DIR__ . '/config.php';
$config = file_exists($configFile) ? require $configFile : [];

$db_host = getenv('QUEENSKO_DB_HOST') ?: ($config['db_host'] ?? '127.0.0.1');
$db_port = (int)(getenv('QUEENSKO_DB_PORT') ?: ($config['db_port'] ?? 3306));
$db_name = getenv('QUEENSKO_DB_NAME') ?: ($config['db_name'] ?? '');
$db_user = getenv('QUEENSKO_DB_USER') ?: ($config['db_user'] ?? '');
$db_pass = getenv('QUEENSKO_DB_PASS') ?: ($config['db_pass'] ?? '');

if (empty($db_name) || empty($db_user)) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Database configuratie ontbreekt. Maak public/api/config.php aan op basis van config.example.php.'
    ]);
    exit;
}

// ==========================================
// 2. DATABASE VERBINDING (TransIP MySQL)
// ==========================================
$hostCandidates = array_unique([$db_host, '127.0.0.1', 'localhost;port=3306', 'localhost']);
$pdo = null;
$lastError = '';

foreach ($hostCandidates as $candidateHost) {
    try {
        $dsn = (strpos($candidateHost, ';') !== false)
            ? "mysql:host={$candidateHost};dbname={$db_name};charset=utf8mb4"
            : "mysql:host={$candidateHost};port={$db_port};dbname={$db_name};charset=utf8mb4";

        $pdo = new PDO($dsn, $db_user, $db_pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_TIMEOUT => 4
        ]);
        break;
    } catch (PDOException $e) {
        $lastError = $e->getMessage();
    }
}

if (!$pdo) {
    http_response_code(500);
    echo json_encode(['error' => 'Database verbinding mislukt: ' . $lastError]);
    exit;
}

if (isset($_GET['health'])) {
    echo json_encode(['status' => 'ok', 'database' => $db_name]);
    exit;
}

// ==========================================
// 3. COLLECTIE ROUTING & VALIDATIE
// ==========================================
$allowedCollections = ['agenda', 'sessions', 'daily_summaries', 'newsletter'];
$collection = $_GET['collection'] ?? '';

if (!in_array($collection, $allowedCollections, true)) {
    http_response_code(400);
    echo json_encode(['error' => 'Ongeldige collectie.']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

function decodeJsonField($val, $default) {
    if ($val === null || $val === '') return $default;
    if (is_array($val)) return $val;
    $decoded = json_decode($val, true);
    return (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) ? $decoded : $default;
}

function encodeJsonField($val, $default = '{}') {
    if ($val === null) return $default;
    if (is_string($val)) return $val;
    return json_encode($val, JSON_UNESCAPED_UNICODE);
}

try {
    if ($method === 'GET') {
        $stmt = $pdo->query("SELECT * FROM `{$collection}`");
        $rows = $stmt->fetchAll();

        $result = array_map(function ($row) use ($collection) {
            if ($collection === 'agenda') {
                $row['isVisible'] = (bool)$row['isVisible'];
                $row['isSoldOut'] = (bool)$row['isSoldOut'];
                unset($row['updatedAt']);
            } elseif ($collection === 'sessions') {
                $row['duration'] = (int)$row['duration'];
                $row['latitude'] = (float)$row['latitude'];
                $row['longitude'] = (float)$row['longitude'];
                $row['views'] = decodeJsonField($row['views'] ?? null, new stdClass());
                $row['clicks'] = decodeJsonField($row['clicks'] ?? null, []);
                unset($row['updatedAt']);
            } elseif ($collection === 'daily_summaries') {
                $row['totalVisitors'] = (int)$row['totalVisitors'];
                $row['avgDuration'] = (float)$row['avgDuration'];
                $row['cities'] = decodeJsonField($row['cities'] ?? null, new stdClass());
                $row['devices'] = decodeJsonField($row['devices'] ?? null, new stdClass());
                $row['os'] = decodeJsonField($row['os'] ?? null, new stdClass());
                $row['referrers'] = decodeJsonField($row['referrers'] ?? null, new stdClass());
                $row['clicks'] = decodeJsonField($row['clicks'] ?? null, new stdClass());
                unset($row['updatedAt']);
            } elseif ($collection === 'newsletter') {
                unset($row['createdAt']);
            }
            return $row;
        }, $rows);

        echo json_encode($result, JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!is_array($input)) {
            http_response_code(400);
            echo json_encode(['error' => 'Ongeldige JSON body.']);
            exit;
        }

        $id = $_GET['id'] ?? ($input['id'] ?? ('doc_' . time() . '_' . mt_rand(100, 999)));

        if ($collection === 'agenda') {
            $sql = "INSERT INTO `agenda`
                (`id`, `date`, `locationName`, `locationCity`, `infoLink`, `ticketPrice`, `displayFrom`, `displayUntil`, `isVisible`, `ticketLink`, `isSoldOut`, `comments`, `address`)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                `date` = VALUES(`date`),
                `locationName` = VALUES(`locationName`),
                `locationCity` = VALUES(`locationCity`),
                `infoLink` = VALUES(`infoLink`),
                `ticketPrice` = VALUES(`ticketPrice`),
                `displayFrom` = VALUES(`displayFrom`),
                `displayUntil` = VALUES(`displayUntil`),
                `isVisible` = VALUES(`isVisible`),
                `ticketLink` = VALUES(`ticketLink`),
                `isSoldOut` = VALUES(`isSoldOut`),
                `comments` = VALUES(`comments`),
                `address` = VALUES(`address`)";

            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $id,
                $input['date'] ?? '',
                $input['locationName'] ?? '',
                $input['locationCity'] ?? '',
                $input['infoLink'] ?? '',
                $input['ticketPrice'] ?? '',
                $input['displayFrom'] ?? '',
                $input['displayUntil'] ?? '',
                !empty($input['isVisible']) ? 1 : 0,
                $input['ticketLink'] ?? '',
                !empty($input['isSoldOut']) ? 1 : 0,
                $input['comments'] ?? '',
                $input['address'] ?? '',
            ]);
        } elseif ($collection === 'sessions') {
            $sql = "INSERT INTO `sessions`
                (`id`, `startedAt`, `lastActiveAt`, `duration`, `referrer`, `city`, `country`, `latitude`, `longitude`, `device`, `os`, `userAgent`, `views`, `clicks`)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                `startedAt` = VALUES(`startedAt`),
                `lastActiveAt` = VALUES(`lastActiveAt`),
                `duration` = VALUES(`duration`),
                `referrer` = VALUES(`referrer`),
                `city` = VALUES(`city`),
                `country` = VALUES(`country`),
                `latitude` = VALUES(`latitude`),
                `longitude` = VALUES(`longitude`),
                `device` = VALUES(`device`),
                `os` = VALUES(`os`),
                `userAgent` = VALUES(`userAgent`),
                `views` = VALUES(`views`),
                `clicks` = VALUES(`clicks`)";

            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $id,
                $input['startedAt'] ?? '',
                $input['lastActiveAt'] ?? '',
                (int)($input['duration'] ?? 0),
                $input['referrer'] ?? '',
                $input['city'] ?? '',
                $input['country'] ?? '',
                (float)($input['latitude'] ?? 0),
                (float)($input['longitude'] ?? 0),
                $input['device'] ?? '',
                $input['os'] ?? '',
                $input['userAgent'] ?? '',
                encodeJsonField($input['views'] ?? null, '{}'),
                encodeJsonField($input['clicks'] ?? null, '[]'),
            ]);
        } elseif ($collection === 'daily_summaries') {
            $sql = "INSERT INTO `daily_summaries`
                (`id`, `date`, `totalVisitors`, `avgDuration`, `cities`, `devices`, `os`, `referrers`, `clicks`)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                `date` = VALUES(`date`),
                `totalVisitors` = VALUES(`totalVisitors`),
                `avgDuration` = VALUES(`avgDuration`),
                `cities` = VALUES(`cities`),
                `devices` = VALUES(`devices`),
                `os` = VALUES(`os`),
                `referrers` = VALUES(`referrers`),
                `clicks` = VALUES(`clicks`)";

            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $id,
                $input['date'] ?? $id,
                (int)($input['totalVisitors'] ?? 0),
                (float)($input['avgDuration'] ?? 0),
                encodeJsonField($input['cities'] ?? null, '{}'),
                encodeJsonField($input['devices'] ?? null, '{}'),
                encodeJsonField($input['os'] ?? null, '{}'),
                encodeJsonField($input['referrers'] ?? null, '{}'),
                encodeJsonField($input['clicks'] ?? null, '{}'),
            ]);
        } elseif ($collection === 'newsletter') {
            $sql = "INSERT INTO `newsletter` (`id`, `email`, `subscribedAt`)
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE
                `email` = VALUES(`email`),
                `subscribedAt` = VALUES(`subscribedAt`)";

            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $id,
                $input['email'] ?? '',
                $input['subscribedAt'] ?? date('c'),
            ]);
        }

        echo json_encode(['success' => true, 'id' => $id]);
        exit;
    }

    if ($method === 'DELETE') {
        $id = $_GET['id'] ?? '';
        if (empty($id)) {
            http_response_code(400);
            echo json_encode(['error' => 'Document id ontbreekt.']);
            exit;
        }

        $stmt = $pdo->prepare("DELETE FROM `{$collection}` WHERE `id` = ?");
        $stmt->execute([$id]);

        echo json_encode(['success' => true, 'id' => $id]);
        exit;
    }

    http_response_code(405);
    echo json_encode(['error' => 'Methode niet toegestaan.']);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
