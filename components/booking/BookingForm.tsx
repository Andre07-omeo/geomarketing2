"use client"; // Important si vous utilisez Next.js App Router

import { useState } from 'react';
import { UploadCloud, CheckCircle2 } from 'lucide-react'; // Pour améliorer l'UI

interface BookingFormProps {
  face: any;
  panneau: any;
  onClose: () => void;
}

interface FormState {
  societe: string;
  dateFin: string;
  paiement: string;
  file: File | null;
}

const BookingForm = ({ face, panneau, onClose }: BookingFormProps) => {
  const [formData, setFormData] = useState<FormState>({
    societe: '',
    dateFin: '',
    paiement: 'Virement Bancaire',
    file: null
  });

  const handleGenerateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Import dynamique de jsPDF
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const reservationNum = Math.floor(Math.random() * 90000) + 10000;

      // --- 1. BANDEAU IDENTITAIRE ---
      doc.setFillColor(0, 51, 102); 
      doc.rect(0, 0, pageWidth, 15, 'F');
      
      // --- 2. EN-TÊTE ---
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 51, 102);
      doc.setFontSize(28);
      doc.text("DISPROMALT", 20, 30);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text("Régie Publicitaire & Affichage", 20, 37);
      
      // --- 3. DÉTAILS DE LA FACTURE ---
      doc.setFontSize(10);
      doc.setTextColor(0);
      doc.text(`Facture N° : ${reservationNum}`, 140, 25);
      doc.text(`Date : ${new Date().toLocaleDateString('fr-FR')}`, 140, 30);

      // --- 4. BLOC CLIENT ---
      doc.setDrawColor(200, 200, 200);
      doc.roundedRect(20, 45, 170, 25, 2, 2);
      doc.setFont("helvetica", "bold");
      doc.text("INFORMATIONS CLIENT", 25, 52);
      doc.setFont("helvetica", "normal");
      doc.text(`Société : ${formData.societe.toUpperCase() || "N/A"}`, 25, 60);
      doc.text(`Paiement : ${formData.paiement || "N/A"}`, 25, 66);

      // --- 5. DÉTAILS TECHNIQUES ---
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("DÉTAILS TECHNIQUES DU SUPPORT", 20, 90);
      doc.setDrawColor(0, 51, 102);
      doc.line(20, 93, 190, 93);

      const details = [
        ["Référence", face?.idPan || face?.id || "N/A"],
        ["Adresse", panneau?.adresse || "N/A"],
        ["Zone", panneau?.zone || "N/A"],
        ["Dimension", panneau?.dimension || "4m x 3m"],
        ["Prix Mensuel", `${face?.prix || "450"} $`]
      ];

      let y = 110;
      details.forEach(([label, value]) => {
        doc.setFont("helvetica", "bold");
        doc.text(`${label}`, 20, y);
        doc.setFont("helvetica", "normal");
        doc.text(`${value}`, 80, y);
        y += 10;
      });

      // --- 6. ZONE D'ENGAGEMENT ET SIGNATURE ---
      doc.setFillColor(245, 245, 245);
      doc.rect(20, 170, 170, 25, 'F');
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(50);
      doc.text("Engagement de DISPROMALT : Nous garantissons une visibilité optimale sur nos supports.", 25, 180);
      doc.text("Ce document est une preuve officielle de votre réservation.", 25, 186);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(0);
      doc.setFontSize(10);
      doc.text("Pour la Direction,", 140, 215);
      doc.text("Signature & Cachet", 140, 222);
      
      doc.setDrawColor(0);
      doc.setLineWidth(0.2);
      doc.line(140, 235, 185, 235);
      
      doc.setFontSize(7);
      doc.setTextColor(150);
      doc.text("(Espace réservé au cachet)", 147, 240);

      // --- 7. PIED DE PAGE ---
      doc.setDrawColor(0, 51, 102);
      doc.line(20, 270, 190, 270);
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text("Kinshasa, RDC", 20, 280);
      doc.text("+243 81 000 0000", pageWidth / 2, 280, { align: 'center' });
      doc.text("www.dispromalt.com", 190, 280, { align: 'right' });

      doc.save(`Facture_Dispromalt_${face?.id || 'F1'}.pdf`);
      onClose();
    } catch (error) {
      console.error("Erreur PDF:", error);
      alert("Erreur lors de la génération du PDF.");
    }
  };

  return (
    <form onSubmit={handleGenerateInvoice} className="space-y-4">
      <div className="space-y-1">
        <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1">Client</label>
        <input 
          required 
          placeholder="Ex: SOCIÉTÉ SARL" 
          className="w-full bg-zinc-900 p-4 rounded-xl border border-zinc-700 text-white focus:border-blue-500 outline-none transition-all" 
          onChange={(e) => setFormData({...formData, societe: e.target.value})} 
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1">Période jusqu'au</label>
          <input 
            type="date" 
            required 
            className="w-full bg-zinc-900 p-4 rounded-xl border border-zinc-700 text-white focus:border-blue-500 outline-none" 
            onChange={(e) => setFormData({...formData, dateFin: e.target.value})} 
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1">Méthode</label>
          <select 
            required
            className="w-full bg-zinc-900 p-4 rounded-xl border border-zinc-700 text-white focus:border-blue-500 outline-none appearance-none" 
            onChange={(e) => setFormData({...formData, paiement: e.target.value})}
            value={formData.paiement}
          >
            <option value="Virement Bancaire">Virement</option>
            <option value="M-Pesa">M-Pesa</option>
            <option value="Orange Money">Orange Money</option>
            <option value="Airtel Money">Airtel Money</option>
            <option value="Cash">Cash</option>
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1">Preuve de paiement / Logo</label>
        <input 
          type="file" id="file-upload" className="hidden" accept="image/*,.pdf"
          onChange={(e) => setFormData(prev => ({ ...prev, file: e.target.files?.[0] || null }))}
        />
        <label 
          htmlFor="file-upload"
          className={`flex items-center justify-between w-full p-4 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
            formData.file ? 'bg-blue-500/10 border-blue-500' : 'bg-zinc-900 border-zinc-700 hover:border-zinc-500'
          }`}
        >
          <div className="flex items-center gap-3 truncate">
            {formData.file ? <CheckCircle2 size={18} className="text-blue-500" /> : <UploadCloud size={18} className="text-zinc-500" />}
            <span className={`text-xs font-medium truncate ${formData.file ? 'text-blue-400' : 'text-zinc-500'}`}>
              {formData.file ? formData.file.name : "Joindre un fichier (Optionnel)"}
            </span>
          </div>
        </label>
      </div>

      <button 
        type="submit" 
        className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/20 active:scale-[0.98]"
      >
        VALIDER ET TÉLÉCHARGER LE CONTRAT
      </button>
    </form>
  );
};

export default BookingForm;