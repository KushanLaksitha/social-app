const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { saveEncrypted, serveDecrypted } = require('./utils/encryption');

const app = express();
const PORT = process.env.PORT || 5000;

// --- Multer: store in MEMORY (raw file never written to disk) ---
const storage = multer.memoryStorage();

// After multer stores file in memory, write it encrypted to disk
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg','image/png','image/gif','image/webp','video/mp4','video/webm','video/quicktime'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Invalid file type'));
  }
});

// Middleware: after multer memoryStorage, encrypt and save to disk
function encryptUpload(req, res, next) {
  const files = req.files ? Object.values(req.files).flat() : (req.file ? [req.file] : []);
  for (const file of files) {
    const encFilename = `${uuidv4()}.enc`;
    const encPath = path.join(uploadDir, encFilename);
    saveEncrypted(file.buffer, encPath);
    // Store meta for route handlers
    file.encFilename = encFilename;
    file.encPath = encPath;
    // Remove raw buffer from memory
    file.buffer = null;
  }
  next();
}

app.set('upload', upload);
app.set('encryptUpload', encryptUpload);

// --- MIME type detection from original extension ---
const MIME_MAP = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.gif': 'image/gif', '.webp': 'image/webp',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
};

function getMime(filename) {
  const m = filename.match(/mime-([a-z]+)-/);
  if (m) return `${m[1]}/*`;
  return 'application/octet-stream';
}

// Better: store mime in filename prefix: "mime_image_jpeg_<uuid>.enc"
// We'll handle this in routes

// --- Secure media serving ---
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.get('/api/media/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'uploads', filename);

  // Decode mime from filename prefix: "img-<uuid>.enc" or "vid-<uuid>.enc"
  let mimeType = 'application/octet-stream';
  if (filename.startsWith('img-')) mimeType = 'image/jpeg';
  else if (filename.startsWith('png-')) mimeType = 'image/png';
  else if (filename.startsWith('gif-')) mimeType = 'image/gif';
  else if (filename.startsWith('webp-')) mimeType = 'image/webp';
  else if (filename.startsWith('vid-')) mimeType = 'video/mp4';
  else if (filename.startsWith('webm-')) mimeType = 'video/webm';
  else if (filename.startsWith('mov-')) mimeType = 'video/quicktime';

  serveDecrypted(filePath, res, mimeType);
});

// --- Routes ---
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/stories', require('./routes/stories'));
app.use('/api/highlights', require('./routes/highlights'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Serve frontend in production
app.use(express.static(path.join(__dirname, '../frontend/build')));
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
