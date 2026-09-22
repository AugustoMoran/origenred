import { Request, Response } from 'express';
import { getR2Object } from '../../marketplace/services/r2StorageService';

export const streamMediaObjectController = async (req: Request, res: Response) => {
  const key = decodeURIComponent(req.path.replace(/^\//, ''));
  if (!key || key.includes('..')) {
    return res.status(400).json({ message: 'Clave de archivo inválida' });
  }

  try {
    const object = await getR2Object(key);
    if (!object.Body) {
      return res.status(404).json({ message: 'Archivo no encontrado' });
    }

    res.setHeader('Content-Type', object.ContentType || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    if (object.ContentLength) {
      res.setHeader('Content-Length', String(object.ContentLength));
    }

    const stream = object.Body as NodeJS.ReadableStream;
    stream.pipe(res);
  } catch (error: any) {
    const status = error?.name === 'NoSuchKey' || error?.$metadata?.httpStatusCode === 404 ? 404 : 500;
    res.status(status).json({ message: status === 404 ? 'Archivo no encontrado' : 'Error al leer archivo' });
  }
};
