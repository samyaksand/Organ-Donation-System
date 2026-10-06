/**
 * Pledge certificate PDF layout. Deliberately honest despite the polish: it states clearly that
 * this is a demo-platform record, not an official government donor registration, legal donor
 * document, medical certificate, proof of eligibility, or guarantee of allocation. See
 * prisma/schema.prisma's Pledge doc comment and CLAUDE.md for why a pledge is not a Donor.
 */
import type { OrganType } from '@prisma/client';
import PDFDocument from 'pdfkit';
import { ORGAN_TYPE_LABELS } from '../schemas/pledge.labels';

export interface PledgeCertificateData {
  referenceId: string;
  fullName: string;
  city: string;
  organPreference: string;
  pledgeDate: Date;
}

const BRAND = '#0f766e'; // teal-700, matches the client's primary brand color
const BRAND_SOFT = '#ccfbf1'; // teal-100, for the name-panel background
const INK = '#111827';
const MUTED = '#6b7280';
const FAINT = '#9ca3af';

/** Draws a small diamond accent, used at the corners of the decorative border. */
function corner(doc: PDFKit.PDFDocument, x: number, y: number) {
  const r = 4;
  doc.save().translate(x, y).rotate(45).rect(-r, -r, r * 2, r * 2).fill(BRAND).restore();
}

export function generatePledgeCertificatePdf(data: PledgeCertificateData) {
  const doc = new PDFDocument({ size: 'A4', margin: 0 });
  const { width, height } = doc.page;
  const margin = 40;

  // Decorative double border with corner accents.
  doc.rect(margin, margin, width - margin * 2, height - margin * 2).lineWidth(2.5).strokeColor(BRAND).stroke();
  doc
    .rect(margin + 10, margin + 10, width - (margin + 10) * 2, height - (margin + 10) * 2)
    .lineWidth(0.75)
    .strokeColor(BRAND)
    .stroke();
  for (const [cx, cy] of [
    [margin + 10, margin + 10],
    [width - margin - 10, margin + 10],
    [margin + 10, height - margin - 10],
    [width - margin - 10, height - margin - 10],
  ] as const) {
    corner(doc, cx, cy);
  }

  const contentX = margin + 50;
  const contentWidth = width - contentX * 2;
  let y = margin + 64;

  // Brand mark.
  doc.fillColor(BRAND).fontSize(15).font('Helvetica-Bold').text('ORGANFLOW', contentX, y, { width: contentWidth, align: 'center', characterSpacing: 5 });
  y += 30;
  doc.moveTo(width / 2 - 28, y).lineTo(width / 2 + 28, y).lineWidth(1.5).strokeColor(BRAND).stroke();
  y += 28;

  // Certificate title.
  doc.fillColor(INK).fontSize(23).font('Helvetica-Bold').text('Organ Donation Pledge Certificate', contentX, y, { width: contentWidth, align: 'center' });
  y += 36;
  doc
    .fillColor(MUTED)
    .fontSize(11.5)
    .font('Helvetica')
    .text('This certificate acknowledges the pledge recorded below.', contentX, y, { width: contentWidth, align: 'center' });
  y += 46;

  // Name panel - the visual centerpiece.
  const panelHeight = 92;
  doc.roundedRect(contentX, y, contentWidth, panelHeight, 12).fill(BRAND_SOFT);
  doc
    .fillColor(MUTED)
    .fontSize(10)
    .font('Helvetica')
    .text('PLEDGED BY', contentX, y + 18, { width: contentWidth, align: 'center', characterSpacing: 2.5 });
  doc
    .fillColor(BRAND)
    .fontSize(34)
    .font('Helvetica-Bold')
    .text(data.fullName, contentX + 10, y + 38, { width: contentWidth - 20, align: 'center' });
  y += panelHeight + 36;

  const organLabel = ORGAN_TYPE_LABELS[data.organPreference as OrganType] ?? data.organPreference;
  doc
    .fillColor(MUTED)
    .fontSize(11.5)
    .font('Helvetica')
    .text('has pledged to donate', contentX, y, { width: contentWidth, align: 'center' });
  y += 20;
  doc
    .fillColor(BRAND)
    .fontSize(19)
    .font('Helvetica-Bold')
    .text(organLabel, contentX, y, { width: contentWidth, align: 'center' });
  y += 42;

  // Motivational quote.
  doc
    .fillColor(BRAND)
    .fontSize(15)
    .font('Helvetica-BoldOblique')
    .text('“One pledge can give hope a future.”', contentX, y, { width: contentWidth, align: 'center' });
  y += 50;

  // Structured pledge details, as three evenly-spaced cards rather than a plain list.
  const cardGap = 16;
  const cardWidth = (contentWidth - cardGap * 2) / 3;
  const cardHeight = 72;
  const details: Array<[string, string]> = [
    ['Reference ID', data.referenceId],
    ['City', data.city],
    ['Pledge date', data.pledgeDate.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })],
  ];
  details.forEach(([label, value], i) => {
    const cardX = contentX + i * (cardWidth + cardGap);
    doc.roundedRect(cardX, y, cardWidth, cardHeight, 10).lineWidth(1).strokeColor('#e5e7eb').stroke();
    doc
      .fillColor(MUTED)
      .fontSize(9)
      .font('Helvetica')
      .text(label.toUpperCase(), cardX + 12, y + 16, { width: cardWidth - 24, characterSpacing: 1 });
    doc
      .fillColor(INK)
      .fontSize(13)
      .font('Helvetica-Bold')
      .text(value, cardX + 12, y + 38, { width: cardWidth - 24 });
  });
  y += cardHeight + 60;

  // A closing seal-style mark fills the remaining vertical space with something that belongs on
  // a certificate, rather than leaving a large empty gap before the disclaimer.
  doc.moveTo(width / 2 - 28, y).lineTo(width / 2 + 28, y).lineWidth(1.5).strokeColor(BRAND).stroke();
  y += 20;
  doc
    .fillColor(MUTED)
    .fontSize(10.5)
    .font('Helvetica-Oblique')
    .text('Issued by OrganFlow', contentX, y, { width: contentWidth, align: 'center' });
  y += 56;

  // Legal/demo disclaimer - kept small and unobtrusive, directly below the certificate body
  // rather than pinned to the page bottom (which left a large empty gap on an A4 page).
  doc
    .fillColor(FAINT)
    .fontSize(8.5)
    .font('Helvetica')
    .text(
      'This certificate acknowledges a pledge recorded in the OrganFlow demonstration platform. ' +
        'It is not an official government donor registration or legal donor document, not a medical ' +
        'certificate or proof of medical eligibility, and not a guarantee of organ allocation.',
      contentX,
      y,
      { width: contentWidth, align: 'center' },
    );

  return doc;
}
