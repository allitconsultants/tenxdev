import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export interface SignatureEmbedOptions {
  signerName: string;
  signerEmail: string;
  signedAt: Date;
  signerIp?: string;
  /** Position from bottom of page in points (default: 80) */
  yPosition?: number;
  /** Position from left of page in points (default: 50) */
  xPosition?: number;
  /** Width of signature image in points (default: 200) */
  signatureWidth?: number;
  /** Height of signature image in points (default: 50) */
  signatureHeight?: number;
}

/**
 * Embed a signature image into a PDF document
 *
 * @param pdfBuffer - Original PDF as Buffer
 * @param signatureImage - Signature image as Buffer (PNG format)
 * @param options - Signature metadata and positioning options
 * @returns Buffer of the signed PDF
 */
export async function embedSignature(
  pdfBuffer: Buffer,
  signatureImage: Buffer,
  options: SignatureEmbedOptions
): Promise<Buffer> {
  const {
    signerName,
    signerEmail,
    signedAt,
    signerIp,
    yPosition = 80,
    xPosition = 50,
    signatureWidth = 200,
    signatureHeight = 50,
  } = options;

  // Load the PDF
  const pdfDoc = await PDFDocument.load(pdfBuffer);

  // Embed the signature image
  const signatureImg = await pdfDoc.embedPng(signatureImage);

  // Get the last page (or create one if needed)
  const pages = pdfDoc.getPages();
  const lastPage = pages[pages.length - 1];

  // Get page dimensions
  const { width: pageWidth } = lastPage.getSize();

  // Load font for text
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSize = 8;

  // Draw signature image
  lastPage.drawImage(signatureImg, {
    x: xPosition,
    y: yPosition,
    width: signatureWidth,
    height: signatureHeight,
  });

  // Draw signature line
  const lineY = yPosition - 5;
  lastPage.drawLine({
    start: { x: xPosition, y: lineY },
    end: { x: xPosition + signatureWidth, y: lineY },
    thickness: 0.5,
    color: rgb(0.4, 0.4, 0.4),
  });

  // Format date
  const dateStr = signedAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  // Draw signature details below the line
  const textY = lineY - 12;
  lastPage.drawText(`Signed by: ${signerName}`, {
    x: xPosition,
    y: textY,
    size: fontSize,
    font,
    color: rgb(0.3, 0.3, 0.3),
  });

  lastPage.drawText(`Email: ${signerEmail}`, {
    x: xPosition,
    y: textY - 10,
    size: fontSize,
    font,
    color: rgb(0.3, 0.3, 0.3),
  });

  lastPage.drawText(`Date: ${dateStr}`, {
    x: xPosition,
    y: textY - 20,
    size: fontSize,
    font,
    color: rgb(0.3, 0.3, 0.3),
  });

  if (signerIp) {
    lastPage.drawText(`IP: ${signerIp}`, {
      x: xPosition,
      y: textY - 30,
      size: fontSize,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });
  }

  // Add document metadata
  pdfDoc.setProducer('TenxDev E-Signature');
  pdfDoc.setModificationDate(signedAt);

  // Save and return the modified PDF
  const signedPdfBytes = await pdfDoc.save();
  return Buffer.from(signedPdfBytes);
}

/**
 * Add a signature page to the end of a PDF
 * Creates a dedicated page with signature block
 */
export async function addSignaturePage(
  pdfBuffer: Buffer,
  signatureImage: Buffer,
  options: SignatureEmbedOptions & {
    documentName?: string;
    message?: string;
  }
): Promise<Buffer> {
  const {
    signerName,
    signerEmail,
    signedAt,
    signerIp,
    documentName,
    message,
  } = options;

  // Load the PDF
  const pdfDoc = await PDFDocument.load(pdfBuffer);

  // Add a new page at the end
  const signaturePage = pdfDoc.addPage();
  const { width, height } = signaturePage.getSize();

  // Embed fonts
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Embed signature image
  const signatureImg = await pdfDoc.embedPng(signatureImage);

  // Draw title
  const titleY = height - 100;
  signaturePage.drawText('SIGNATURE PAGE', {
    x: 50,
    y: titleY,
    size: 18,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.1),
  });

  // Draw document name if provided
  let currentY = titleY - 40;
  if (documentName) {
    signaturePage.drawText(`Document: ${documentName}`, {
      x: 50,
      y: currentY,
      size: 12,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
    currentY -= 30;
  }

  // Draw message if provided
  if (message) {
    signaturePage.drawText(message, {
      x: 50,
      y: currentY,
      size: 10,
      font,
      color: rgb(0.3, 0.3, 0.3),
      maxWidth: width - 100,
    });
    currentY -= 50;
  }

  // Draw signature section
  currentY -= 20;
  signaturePage.drawText('Signature:', {
    x: 50,
    y: currentY,
    size: 10,
    font: boldFont,
    color: rgb(0.2, 0.2, 0.2),
  });

  // Draw signature image
  const sigY = currentY - 70;
  signaturePage.drawImage(signatureImg, {
    x: 50,
    y: sigY,
    width: 200,
    height: 50,
  });

  // Draw signature line
  signaturePage.drawLine({
    start: { x: 50, y: sigY - 5 },
    end: { x: 250, y: sigY - 5 },
    thickness: 1,
    color: rgb(0.1, 0.1, 0.1),
  });

  // Draw signer details
  const detailsY = sigY - 25;
  const dateStr = signedAt.toISOString();

  signaturePage.drawText(`Name: ${signerName}`, {
    x: 50,
    y: detailsY,
    size: 10,
    font,
    color: rgb(0.2, 0.2, 0.2),
  });

  signaturePage.drawText(`Email: ${signerEmail}`, {
    x: 50,
    y: detailsY - 15,
    size: 10,
    font,
    color: rgb(0.2, 0.2, 0.2),
  });

  signaturePage.drawText(`Signed: ${dateStr}`, {
    x: 50,
    y: detailsY - 30,
    size: 10,
    font,
    color: rgb(0.2, 0.2, 0.2),
  });

  if (signerIp) {
    signaturePage.drawText(`IP Address: ${signerIp}`, {
      x: 50,
      y: detailsY - 45,
      size: 10,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
  }

  // Draw footer
  const footerY = 50;
  signaturePage.drawLine({
    start: { x: 50, y: footerY + 20 },
    end: { x: width - 50, y: footerY + 20 },
    thickness: 0.5,
    color: rgb(0.7, 0.7, 0.7),
  });

  signaturePage.drawText(
    'This document was electronically signed using TenxDev E-Signature.',
    {
      x: 50,
      y: footerY,
      size: 8,
      font,
      color: rgb(0.5, 0.5, 0.5),
    }
  );

  // Update metadata
  pdfDoc.setProducer('TenxDev E-Signature');
  pdfDoc.setModificationDate(signedAt);

  // Save and return
  const signedPdfBytes = await pdfDoc.save();
  return Buffer.from(signedPdfBytes);
}

/**
 * Field value for embedding into PDF
 */
export interface FieldValue {
  fieldId: string;
  type: 'signature' | 'initials' | 'date' | 'text';
  value: string; // Base64 image for signature/initials, text for date/text
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Signer data for multi-signer embedding
 */
export interface SignerData {
  signerName: string;
  signerEmail: string;
  signedAt: Date;
  signerIp?: string;
  fields: FieldValue[];
}

/**
 * Embed multiple field values into a PDF at specified positions
 *
 * @param pdfBuffer - Original PDF as Buffer
 * @param signers - Array of signer data with their field values
 * @returns Buffer of the signed PDF with all fields embedded
 */
export async function embedFieldSignatures(
  pdfBuffer: Buffer,
  signers: SignerData[]
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (const signer of signers) {
    for (const field of signer.fields) {
      const pageIndex = field.pageNumber - 1;
      if (pageIndex < 0 || pageIndex >= pages.length) {
        continue;
      }

      const page = pages[pageIndex];
      const { height: pageHeight } = page.getSize();

      // PDF coordinates are from bottom-left, but we store from top-left
      // Convert Y position
      const pdfY = pageHeight - field.y - field.height;

      if (field.type === 'signature' || field.type === 'initials') {
        // Decode base64 image
        const imageData = field.value.replace(/^data:image\/png;base64,/, '');
        const imageBuffer = Buffer.from(imageData, 'base64');

        try {
          const image = await pdfDoc.embedPng(imageBuffer);
          page.drawImage(image, {
            x: field.x,
            y: pdfY,
            width: field.width,
            height: field.height,
          });
        } catch (error) {
          // If PNG embedding fails, try as raw image
          console.warn('Failed to embed signature image:', error);
        }
      } else if (field.type === 'date') {
        // Draw date text
        page.drawText(field.value, {
          x: field.x + 5,
          y: pdfY + field.height / 2 - 4,
          size: 10,
          font,
          color: rgb(0, 0, 0),
        });
      } else if (field.type === 'text') {
        // Draw text
        page.drawText(field.value, {
          x: field.x + 5,
          y: pdfY + field.height / 2 - 4,
          size: 10,
          font,
          color: rgb(0, 0, 0),
          maxWidth: field.width - 10,
        });
      }
    }
  }

  // Update metadata
  pdfDoc.setProducer('TenxDev E-Signature');
  pdfDoc.setModificationDate(new Date());

  const signedPdfBytes = await pdfDoc.save();
  return Buffer.from(signedPdfBytes);
}

/**
 * Generate final signed document with all signatures and a signature summary page
 *
 * @param pdfBuffer - Original PDF as Buffer
 * @param signers - Array of signer data with their field values
 * @param documentName - Name of the document
 * @returns Buffer of the final signed PDF
 */
export async function generateFinalSignedDocument(
  pdfBuffer: Buffer,
  signers: SignerData[],
  documentName: string
): Promise<Buffer> {
  // First embed all field signatures
  const signedPdf = await embedFieldSignatures(pdfBuffer, signers);

  // Load the signed PDF to add summary page
  const pdfDoc = await PDFDocument.load(signedPdf);

  // Add signature summary page
  const summaryPage = pdfDoc.addPage();
  const { width, height } = summaryPage.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let currentY = height - 80;

  // Title
  summaryPage.drawText('SIGNATURE CERTIFICATE', {
    x: 50,
    y: currentY,
    size: 20,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.1),
  });

  currentY -= 40;

  // Document info
  summaryPage.drawText(`Document: ${documentName}`, {
    x: 50,
    y: currentY,
    size: 12,
    font,
    color: rgb(0.2, 0.2, 0.2),
  });

  currentY -= 20;

  summaryPage.drawText(`Completed: ${new Date().toISOString()}`, {
    x: 50,
    y: currentY,
    size: 10,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });

  currentY -= 40;

  // Signers section
  summaryPage.drawText('Signers:', {
    x: 50,
    y: currentY,
    size: 14,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.1),
  });

  currentY -= 25;

  // List each signer
  for (let i = 0; i < signers.length; i++) {
    const signer = signers[i];

    // Draw signer box
    summaryPage.drawRectangle({
      x: 50,
      y: currentY - 60,
      width: width - 100,
      height: 70,
      borderColor: rgb(0.8, 0.8, 0.8),
      borderWidth: 1,
    });

    // Signer number
    summaryPage.drawText(`${i + 1}.`, {
      x: 60,
      y: currentY - 15,
      size: 12,
      font: boldFont,
      color: rgb(0.2, 0.2, 0.2),
    });

    // Signer name and email
    summaryPage.drawText(signer.signerName, {
      x: 85,
      y: currentY - 15,
      size: 12,
      font: boldFont,
      color: rgb(0.2, 0.2, 0.2),
    });

    summaryPage.drawText(signer.signerEmail, {
      x: 85,
      y: currentY - 30,
      size: 10,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });

    // Signed date
    const signedDateStr = signer.signedAt.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });

    summaryPage.drawText(`Signed: ${signedDateStr}`, {
      x: 85,
      y: currentY - 45,
      size: 9,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });

    // IP address if available
    if (signer.signerIp) {
      summaryPage.drawText(`IP: ${signer.signerIp}`, {
        x: 350,
        y: currentY - 45,
        size: 9,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });
    }

    // Checkmark
    summaryPage.drawText('✓', {
      x: width - 80,
      y: currentY - 30,
      size: 20,
      font,
      color: rgb(0.2, 0.6, 0.2),
    });

    currentY -= 80;

    // Add new page if running out of space
    if (currentY < 100 && i < signers.length - 1) {
      const newPage = pdfDoc.addPage();
      currentY = newPage.getHeight() - 80;
    }
  }

  // Footer
  const footerY = 50;
  summaryPage.drawLine({
    start: { x: 50, y: footerY + 20 },
    end: { x: width - 50, y: footerY + 20 },
    thickness: 0.5,
    color: rgb(0.7, 0.7, 0.7),
  });

  summaryPage.drawText(
    'This document was electronically signed using TenxDev E-Signature.',
    {
      x: 50,
      y: footerY,
      size: 8,
      font,
      color: rgb(0.5, 0.5, 0.5),
    }
  );

  summaryPage.drawText(
    'All signatures are legally binding electronic signatures.',
    {
      x: 50,
      y: footerY - 12,
      size: 8,
      font,
      color: rgb(0.5, 0.5, 0.5),
    }
  );

  // Update metadata
  pdfDoc.setProducer('TenxDev E-Signature');
  pdfDoc.setModificationDate(new Date());
  pdfDoc.setTitle(`${documentName} - Signed`);

  const finalPdfBytes = await pdfDoc.save();
  return Buffer.from(finalPdfBytes);
}

/**
 * Validate that a buffer is a valid PDF
 */
export async function isValidPdf(buffer: Buffer): Promise<boolean> {
  try {
    await PDFDocument.load(buffer);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get page count from a PDF
 */
export async function getPageCount(buffer: Buffer): Promise<number> {
  const pdfDoc = await PDFDocument.load(buffer);
  return pdfDoc.getPageCount();
}
