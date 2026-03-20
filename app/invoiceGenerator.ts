import { jsPDF } from "jspdf";

export const generateInvoicePDF = (data: any) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const date = new Date().toLocaleDateString();
  const invoiceNum = Math.floor(Math.random() * 100000);

  // --- 1. BANDEAU DE STYLE (Identité Visuelle) ---
  doc.setFillColor(234, 179, 8);  doc.rect(0, 0, 70, 6, 'F');
  doc.setFillColor(220, 38, 38);  doc.rect(70, 0, 70, 6, 'F');
  doc.setFillColor(37, 99, 235); doc.rect(140, 70, 70, 6, 'F');

  // --- 2. EN-TÊTE & IDENTIFICATION ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.text("DISPROMALT", 20, 25);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Service Publicité & Affichage", 20, 32);
  
  doc.setFont("helvetica", "bold");
  doc.text(`FACTURE N°: ${invoiceNum}`, 140, 25);
  doc.setFont("helvetica", "normal");
  doc.text(`Date: ${date}`, 140, 30);

  // --- 3. BLOC CLIENT ---
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(20, 45, 170, 25, 3, 3, 'F');
  doc.setFont("helvetica", "bold");
  doc.text("CLIENT:", 25, 52);
  doc.setFont("helvetica", "normal");
  doc.text(data.societe || "Non spécifié", 45, 52);
  doc.text(`Moyen de paiement : ${data.paiement || "N/A"}`, 25, 62);

  // --- 4. DÉTAILS TECHNIQUES ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("DÉTAILS DU SUPPORT", 20, 90);
  doc.setDrawColor(37, 99, 235);
  doc.line(20, 93, 190, 93);

  const fields = [
    ["Référence Panneau", data.faceId],
    ["Adresse", data.adresse],
    ["Zone", data.zone],
    ["Format", data.dimension],
    ["Prix total", `${data.prix} USD`]
  ];

  let y = 105;
  fields.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, 20, y);
    doc.setFont("helvetica", "normal");
    doc.text(String(value), 80, y);
    y += 12;
  });

  // --- 5. MENTIONS LÉGALES ---
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.text("Ce document constitue un bon de réservation officiel pour les services de DISPROMALT.", 20, 250);

  // --- 6. PIED DE PAGE UNIFORMISÉ (Gauche | Milieu | Droite) ---
  doc.setDrawColor(200, 200, 200);
  doc.line(20, 275, 190, 275);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);

  doc.text("Kinshasa, RDC", 20, 282, { align: 'left' });
  doc.text("+243 81 000 0000", pageWidth / 2, 282, { align: 'center' });
  doc.text("contact@dispromalt.com", 190, 282, { align: 'right' });

  doc.save(`Facture_Dispromalt_${data.faceId}.pdf`);
};