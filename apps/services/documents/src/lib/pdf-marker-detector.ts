import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');
import { PDFDocument } from 'pdf-lib';

/**
 * Marker types supported for detection
 */
export type MarkerType = 'signature' | 'initials' | 'date' | 'text';

/**
 * Detected marker in a PDF
 */
export interface DetectedMarker {
  type: MarkerType;
  markerText: string;
  signerIndex: number; // 0-based, 0 = first signer
  pageNumber: number;
  // Approximate position (percentage of page dimensions)
  xPosition: number;
  yPosition: number;
  width: number;
  height: number;
}

/**
 * PDF page information
 */
export interface PageInfo {
  pageNumber: number;
  width: number;
  height: number;
}

/**
 * Marker patterns to detect
 * Format: [TYPE_HERE] or [TYPE_HERE_N] where N is signer index (1-based)
 */
const MARKER_PATTERNS: Record<string, MarkerType> = {
  SIGN_HERE: 'signature',
  SIGNATURE_HERE: 'signature',
  SIGN: 'signature',
  INITIAL_HERE: 'initials',
  INITIALS_HERE: 'initials',
  INITIAL: 'initials',
  DATE_HERE: 'date',
  DATE: 'date',
  TEXT_HERE: 'text',
  TEXT: 'text',
};

/**
 * Default field dimensions (in points, at 72 DPI)
 */
const DEFAULT_DIMENSIONS: Record<MarkerType, { width: number; height: number }> = {
  signature: { width: 200, height: 50 },
  initials: { width: 80, height: 40 },
  date: { width: 120, height: 25 },
  text: { width: 200, height: 25 },
};

/**
 * Detect signature markers in a PDF
 *
 * Supported marker formats:
 * - [SIGN_HERE] - Signature for default (first) signer
 * - [SIGN_HERE_1] - Signature for signer 1 (first)
 * - [SIGN_HERE_2] - Signature for signer 2 (second)
 * - [INITIAL_HERE] - Initials for default signer
 * - [INITIAL_HERE_N] - Initials for signer N
 * - [DATE_HERE] - Auto-filled date field
 * - [DATE_HERE_N] - Date field for signer N
 * - [TEXT_HERE] - Text input field
 * - [TEXT_HERE_N] - Text field for signer N
 *
 * @param pdfBuffer - The PDF file buffer
 * @returns Array of detected markers with positions
 */
export async function detectMarkers(pdfBuffer: Buffer): Promise<DetectedMarker[]> {
  const markers: DetectedMarker[] = [];

  // Extract text content using pdf-parse
  const data = await pdf(pdfBuffer);

  // Get page information using pdf-lib
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const pages = pdfDoc.getPages();

  const pageInfos: PageInfo[] = pages.map((page, index) => ({
    pageNumber: index + 1,
    width: page.getWidth(),
    height: page.getHeight(),
  }));

  // Build regex pattern for all marker types
  const markerTypes = Object.keys(MARKER_PATTERNS).join('|');
  // Pattern matches: [MARKER_TYPE], [MARKER_TYPE_N], where N is a number
  const markerRegex = new RegExp(`\\[(${markerTypes})(?:_(\\d+))?\\]`, 'gi');

  // Split text by pages (pdf-parse separates pages with form feed)
  const pageTexts: string[] = data.text.split('\f');

  pageTexts.forEach((pageText: string, pageIndex: number) => {
    const pageNumber = pageIndex + 1;
    const pageInfo = pageInfos[pageIndex] || { width: 612, height: 792 }; // Default letter size

    let match;

    // Reset regex state
    markerRegex.lastIndex = 0;

    while ((match = markerRegex.exec(pageText)) !== null) {
      const fullMarker = match[0];
      const markerType = match[1].toUpperCase();
      const signerNumber = match[2] ? parseInt(match[2], 10) : 1;

      // Determine field type
      const type = MARKER_PATTERNS[markerType] || 'signature';
      const dimensions = DEFAULT_DIMENSIONS[type];

      // Calculate approximate position based on text position
      // This is a rough estimate - actual position would require PDF text extraction
      // with position data, which is more complex
      const textRatio = match.index / pageText.length;

      // Estimate Y position (top-to-bottom)
      // Assume text flows top to bottom, so higher textRatio = lower on page
      const estimatedY = pageInfo.height * (1 - textRatio * 0.8 - 0.1);

      // Center horizontally with some offset based on match position in line
      const lineStart = pageText.lastIndexOf('\n', match.index) + 1;
      const lineEnd = pageText.indexOf('\n', match.index);
      const lineLength = (lineEnd > 0 ? lineEnd : pageText.length) - lineStart;
      const positionInLine = match.index - lineStart;
      const lineRatio = lineLength > 0 ? positionInLine / lineLength : 0.5;

      // Estimate X position (centered around line ratio)
      const estimatedX = pageInfo.width * (0.1 + lineRatio * 0.8);

      markers.push({
        type,
        markerText: fullMarker,
        signerIndex: signerNumber - 1, // Convert to 0-based
        pageNumber,
        xPosition: Math.round(estimatedX),
        yPosition: Math.round(estimatedY),
        width: dimensions.width,
        height: dimensions.height,
      });
    }
  });

  return markers;
}

/**
 * Get markers grouped by signer index
 */
export function groupMarkersBySigner(markers: DetectedMarker[]): Map<number, DetectedMarker[]> {
  const grouped = new Map<number, DetectedMarker[]>();

  for (const marker of markers) {
    const existing = grouped.get(marker.signerIndex) || [];
    existing.push(marker);
    grouped.set(marker.signerIndex, existing);
  }

  return grouped;
}

/**
 * Validate that markers match the number of signers
 */
export function validateMarkersForSigners(
  markers: DetectedMarker[],
  signerCount: number
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const grouped = groupMarkersBySigner(markers);

  // Check each signer has at least one signature field
  for (let i = 0; i < signerCount; i++) {
    const signerMarkers = grouped.get(i) || [];
    const hasSignature = signerMarkers.some((m) => m.type === 'signature');

    if (!hasSignature) {
      errors.push(`Signer ${i + 1} does not have a signature field`);
    }
  }

  // Check for markers assigned to non-existent signers
  for (const [signerIndex] of grouped) {
    if (signerIndex >= signerCount) {
      errors.push(
        `Found markers for signer ${signerIndex + 1}, but only ${signerCount} signers are defined`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get page dimensions from a PDF
 */
export async function getPageDimensions(pdfBuffer: Buffer): Promise<PageInfo[]> {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const pages = pdfDoc.getPages();

  return pages.map((page, index) => ({
    pageNumber: index + 1,
    width: page.getWidth(),
    height: page.getHeight(),
  }));
}
