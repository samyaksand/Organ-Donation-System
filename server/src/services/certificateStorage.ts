/**
 * Certificate storage abstraction. Current implementation generates the PDF on demand and
 * streams it straight to the HTTP response - nothing is persisted to disk or any remote store,
 * since a pledge certificate is fully deterministic from the Pledge row (same input always
 * produces the same bytes) and there's no need to cache a file for it.
 *
 * Future S3 implementation point: if certificates ever need to be pre-generated and served from
 * a URL (e.g. for emailing a link rather than attaching a file), implement `CertificateStorage`
 * with an S3-backed version that uploads the buffer from `generatePledgeCertificatePdf` and
 * returns a signed URL, and swap it in at the one call site in pledge.service.ts. Do NOT add
 * the AWS SDK or any S3 credentials now - there is no requirement driving it yet.
 */
import type { Response } from 'express';
import { generatePledgeCertificatePdf, type PledgeCertificateData } from './pledgeCertificate';

export interface CertificateStorage {
  /** Writes the certificate directly to an HTTP response as a downloadable attachment. */
  streamToResponse(data: PledgeCertificateData, res: Response): void;
}

class LocalCertificateStorage implements CertificateStorage {
  streamToResponse(data: PledgeCertificateData, res: Response): void {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="OrganFlow-Pledge-${data.referenceId}.pdf"`);
    const doc = generatePledgeCertificatePdf(data);
    doc.pipe(res);
    doc.end();
  }
}

export const certificateStorage: CertificateStorage = new LocalCertificateStorage();
