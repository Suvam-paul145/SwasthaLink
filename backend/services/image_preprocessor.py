"""
Image Preprocessing Service for Prescription Images.

Pipeline:
  1. EXIF orientation correction
  2. Grayscale conversion
  3. CLAHE contrast enhancement
  4. Gaussian denoising
  5. Adaptive binarization (optional)

Uses OpenCV (headless) + Pillow.  Falls back gracefully if deps missing.
"""

import io
import logging
from typing import Optional, Tuple

logger = logging.getLogger(__name__)

# --- Optional dependency imports ------------------------------------------------

try:
    import cv2
    import numpy as np
    _HAS_CV2 = True
except ImportError:
    _HAS_CV2 = False
    logger.warning("opencv-python-headless not installed — image preprocessing disabled")

try:
    from PIL import Image, ImageOps
    _HAS_PIL = True
except ImportError:
    _HAS_PIL = False
    logger.warning("Pillow not installed — EXIF orientation fix disabled")


# --- Public API ----------------------------------------------------------------

def preprocess_image(
    image_data: bytes,
    mime_type: str,
    *,
    apply_clahe: bool = True,
    apply_denoise: bool = True,
    apply_binarize: bool = False,
    target_size: Optional[Tuple[int, int]] = (2048, 2048),
) -> bytes:
    """
    Apply the full preprocessing pipeline to a raw image.

    Returns the preprocessed image as JPEG bytes.
    If dependencies are missing the original bytes are returned unchanged.
    """
    if not _HAS_CV2 or not _HAS_PIL:
        logger.info("Preprocessing skipped — missing dependencies")
        return image_data

    # Skip non-image types (PDFs go straight to Gemini)
    if mime_type and "pdf" in mime_type.lower():
        logger.info("PDF detected — preprocessing skipped")
        return image_data

    try:
        # Step 1: Fix EXIF orientation via Pillow
        pil_img = Image.open(io.BytesIO(image_data))
        pil_img = ImageOps.exif_transpose(pil_img) or pil_img
        pil_img = pil_img.convert("RGB")

        # Step 2: Resize if too large (saves Gemini tokens)
        if target_size:
            pil_img.thumbnail(target_size, Image.LANCZOS)

        # Convert to OpenCV numpy array (BGR)
        img_array = np.array(pil_img)
        img_bgr = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)

        # Step 3: Convert to grayscale for preprocessing
        gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)

        # Step 4: CLAHE contrast enhancement
        if apply_clahe:
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            gray = clahe.apply(gray)

        # Step 5: Gaussian denoising
        if apply_denoise:
            gray = cv2.GaussianBlur(gray, (3, 3), 0)

        # Step 6: Adaptive binarization (optional — helps very poor quality)
        if apply_binarize:
            gray = cv2.adaptiveThreshold(
                gray, 255,
                cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                cv2.THRESH_BINARY,
                blockSize=15,
                C=8,
            )

        # Encode back to JPEG bytes
        success, encoded = cv2.imencode(".jpg", gray, [cv2.IMWRITE_JPEG_QUALITY, 92])
        if not success:
            logger.warning("cv2.imencode failed — returning original image")
            return image_data

        processed_bytes = encoded.tobytes()
        logger.info(
            f"Image preprocessed: {len(image_data)} → {len(processed_bytes)} bytes "
            f"(CLAHE={apply_clahe}, denoise={apply_denoise}, binarize={apply_binarize})"
        )
        return processed_bytes

    except Exception as exc:
        logger.error(f"Image preprocessing failed: {exc} — returning original")
        return image_data
