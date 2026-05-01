import multer from 'multer'

const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_IMAGE_SIZE_BYTES,
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
      return
    }

    cb(new Error('ONLY_IMAGE_FILES'))
  },
})
