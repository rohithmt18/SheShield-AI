import multer from 'multer';
import { config } from '../config.js';

/**
 * Single-image upload handling.
 *
 * Memory storage rather than disk: the buffer goes straight to OCR and is never
 * needed again. Writing a screenshot of someone's harassment to disk — where it
 * outlives the request and lands in whatever backup the host runs — is a
 * property this app should not acquire by accident.
 */

/** Extensions are advisory; the signature check below is what actually decides. */
export const ACCEPTED_TYPES = {
  'image/jpeg': 'JPG',
  'image/png': 'PNG',
  'image/webp': 'WebP',
};

export const ACCEPTED_LABEL = 'JPG, PNG or WebP';

/**
 * Identifies an image by its leading bytes.
 *
 * `file.mimetype` is whatever the browser chose to send, so it is a hint, not a
 * fact. Renaming `payload.svg` to `.png` sails past a mimetype check; it does
 * not survive this.
 *
 * @returns {'image/jpeg'|'image/png'|'image/webp'|null}
 */
export function sniffImageType(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;

  // FF D8 FF — JPEG SOI + first marker.
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';

  // 89 50 4E 47 0D 0A 1A 0A — PNG signature.
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'image/png';
  }

  // 'RIFF' …4 byte length… 'WEBP'
  if (buffer.subarray(0, 4).toString('ascii') === 'RIFF'
    && buffer.subarray(8, 12).toString('ascii') === 'WEBP') {
    return 'image/webp';
  }

  return null;
}

const multerUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.image.maxBytes,
    files: 1,
    // The route needs sessionId, sourceLabel and region alongside the file.
    fields: 8,
    fieldSize: 1024,
  },
  fileFilter(_req, file, cb) {
    if (ACCEPTED_TYPES[file.mimetype]) return cb(null, true);
    const kind = file.mimetype ? file.mimetype.replace(/^image\//, '').toUpperCase() : 'That file type';
    const err = new Error(`${kind} files are not supported. Upload a ${ACCEPTED_LABEL} image.`);
    err.status = 415;
    cb(err);
  },
});

const mb = (bytes) => `${(bytes / 1_000_000).toFixed(0)} MB`;

/**
 * Wraps multer so its errors arrive as plain, actionable messages.
 *
 * Multer's own codes ('LIMIT_FILE_SIZE') would otherwise reach the generic
 * error handler and surface as "Something went wrong on our end", which is both
 * wrong and unhelpful — the fix is entirely on the user's side.
 */
export function uploadImage(field = 'image') {
  const handler = multerUpload.single(field);

  return (req, res, next) => handler(req, res, (err) => {
    if (!err) return next();

    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: `That image is larger than ${mb(config.image.maxBytes)}. `
          + 'Crop it to the part that matters, or take a fresh screenshot.',
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'Upload one image at a time.' });
    }
    if (err.status === 415) {
      return res.status(415).json({ error: err.message });
    }
    return next(err);
  });
}
