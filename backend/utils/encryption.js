const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ALGORITHM = 'aes-256-cbc';
const SECRET = 'vibe-app-secret-key-2024!';
const KEY = crypto.scryptSync(SECRET, 'vibe-salt', 32);
const IV_LENGTH = 16;

/**
 * Encrypts a buffer and writes it to disk as .enc file.
 * The raw file is NEVER stored on disk.
 */
function saveEncrypted(buffer, outputPath) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
    const encryptedData = Buffer.concat([iv, cipher.update(buffer), cipher.final()]);
    fs.writeFileSync(outputPath, encryptedData);
}

/**
 * Reads and decrypts an .enc file, streams decrypted bytes to response.
 */
function serveDecrypted(filePath, res, mimeType) {
    if (!fs.existsSync(filePath)) return res.status(404).end();

    try {
        const fileBuffer = fs.readFileSync(filePath);
        const iv = fileBuffer.slice(0, IV_LENGTH);
        const encryptedData = fileBuffer.slice(IV_LENGTH);
        const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
        const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);

        if (mimeType) res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', 'inline'); // prevent download prompt
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.end(decrypted);
    } catch (e) {
        console.error('Decryption error:', e.message);
        res.status(500).end();
    }
}

module.exports = { saveEncrypted, serveDecrypted };
