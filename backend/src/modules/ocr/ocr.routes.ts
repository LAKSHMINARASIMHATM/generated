import { Router } from 'express';
import { processImage } from './ocr.controller';

const router = Router();

router.post('/process-image', processImage);

export default router;
