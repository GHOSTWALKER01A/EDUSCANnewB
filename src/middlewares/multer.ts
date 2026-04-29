
import multer from 'multer'
import path from 'path'
import fs from 'fs'


const allowed = /jpeg|jpg|png|gif|mp4|mov|pdf|doc|docx|ppt|pptx/

const ALLOWED_FILE_MIMES = [
  allowed,
  'image/jpg',
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf',
  'video/mp4',
]

const uploadDir = path.join(process.cwd(), 'public', 'temp')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/\s+/g, '-').toLowerCase();
    cb(null, `${Date.now()}-${name}${ext}`);
  }
})

function fileFilter(req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  if (ALLOWED_FILE_MIMES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file type'));
  }
}

export const upload = multer({
   storage ,
   limits: {
    fileSize: 40 * 1024 * 1024 
   },
   fileFilter
})
