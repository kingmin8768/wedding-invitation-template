const DEFAULT_MAX_EDGE = 2048;
const DEFAULT_QUALITY = 0.82;
const GIF_MIME_TYPE = 'image/gif';
const WEBP_MIME_TYPE = 'image/webp';

const getFileExtensionForMimeType = (mimeType) => {
  if (mimeType === WEBP_MIME_TYPE) {
    return '.webp';
  }

  if (mimeType === 'image/png') {
    return '.png';
  }

  return '.jpg';
};

const replaceFileExtension = (fileName, nextExtension) => {
  const baseName = fileName.replace(/\.[^.]+$/, '');
  return `${baseName}${nextExtension}`;
};

const createCanvas = (width, height) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

const loadImageElement = (file) =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('이미지를 읽지 못했습니다.'));
    };

    image.src = objectUrl;
  });

const getImageBitmapSource = async (file) => {
  if (typeof createImageBitmap !== 'function') {
    return loadImageElement(file);
  }

  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return loadImageElement(file);
  }
};

const toBlob = (canvas, mimeType, quality) =>
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('이미지 압축에 실패했습니다.'));
        return;
      }

      resolve(blob);
    }, mimeType, quality);
  });

const calculateTargetSize = (width, height, maxEdge) => {
  const longestEdge = Math.max(width, height);

  if (longestEdge <= maxEdge) {
    return { width, height };
  }

  const scale = maxEdge / longestEdge;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
};

const isOptimizableImageFile = (file) =>
  file.type.startsWith('image/') && file.type !== GIF_MIME_TYPE;

export const IMAGE_UPLOAD_HINT = `이미지는 업로드 전에 최적화됩니다. 긴 변 ${DEFAULT_MAX_EDGE}px 기준으로 줄이고 WebP로 압축합니다.`;

export const optimizeImageForUpload = async (
  file,
  { maxEdge = DEFAULT_MAX_EDGE, quality = DEFAULT_QUALITY } = {},
) => {
  if (!file || !isOptimizableImageFile(file)) {
    return file;
  }

  const source = await getImageBitmapSource(file);

  try {
    const sourceWidth = source.width || source.naturalWidth;
    const sourceHeight = source.height || source.naturalHeight;

    if (!sourceWidth || !sourceHeight) {
      return file;
    }

    const targetSize = calculateTargetSize(sourceWidth, sourceHeight, maxEdge);
    const canvas = createCanvas(targetSize.width, targetSize.height);
    const context = canvas.getContext('2d', { alpha: true });

    if (!context) {
      return file;
    }

    context.drawImage(source, 0, 0, targetSize.width, targetSize.height);

    const optimizedBlob = await toBlob(canvas, WEBP_MIME_TYPE, quality);

    if (optimizedBlob.size >= file.size) {
      return file;
    }

    return new File(
      [optimizedBlob],
      replaceFileExtension(file.name, getFileExtensionForMimeType(optimizedBlob.type)),
      {
        type: optimizedBlob.type,
        lastModified: Date.now(),
      },
    );
  } finally {
    if (typeof source.close === 'function') {
      source.close();
    }
  }
};
