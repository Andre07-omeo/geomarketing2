export const panneaux = [
  // 4 Faces (Panneau 360)
  {
    id: "PAN-100",
    zone: "Gombe",
    coords: [-4.315, 15.295],
    adresse: "Boulevard du 30 Juin",
    dimension: "4m x 3m",
    faces: [
      { id: "PAN-100-F1", statut: "Libre", societe: null, prix: "500$" , dureeRestante: ""},
      { id: "PAN-100-F2", statut: "Occupé", societe: "Vodacom", prix: "500$", dureeRestante: "15/06/2026" },
      { id: "PAN-100-F3", statut: "Libre", societe: null, prix: "500$" , dureeRestante: ""},
      { id: "PAN-100-F4", statut: "Réservé", societe: "Airtel", prix: "500$", dureeRestante: "20/05/2026" }
    ]
  },
  // 3 Faces
  {
    id: "PAN-101",
    zone: "Gombe",
    coords: [-4.318, 15.305],
    adresse: "Avenue des Huileries",
    dimension: "6m x 3m",
    faces: [
      { id: "PAN-101-F1", statut: "Occupé", societe: "Orange", prix: "800$", dureeRestante: "10/09/2026" },
      { id: "PAN-101-F2", statut: "Libre", societe: null, prix: "800$" , dureeRestante: "" },
      { id: "PAN-101-F3", statut: "Libre", societe: null, prix: "800$" , dureeRestante: "" }
    ]
  },
  // 2 Faces
  {
    id: "PAN-102",
    zone: "Gombe",
    coords: [-4.321, 15.312],
    adresse: "Croisement Royal",
    dimension: "4m x 3m",
    faces: [
      { id: "PAN-102-F1", statut: "Réservé", societe: "Canal+", prix: "600$", dureeRestante: "01/05/2026" },
      { id: "PAN-102-F2", statut: "Libre", societe: null, prix: "600$" , dureeRestante: ""}
    ]
  },
  // 1 Face
  { id: "PAN-103", zone: "Gombe", coords: [-4.325, 15.318], adresse: "Place de la Gare", dimension: "8m x 4m", faces: [{ id: "PAN-103-F1", statut: "Maintenance", societe: null, prix: "1200$", dureeRestante: "" }] },
  { id: "PAN-104", zone: "Gombe", coords: [-4.312, 15.322], adresse: "Avenue du Commerce", dimension: "4m x 3m", faces: [{ id: "PAN-104-F1", statut: "Libre", societe: null, prix: "550$" , dureeRestante: ""}] },
  { id: "PAN-105", zone: "Gombe", coords: [-4.328, 15.302], adresse: "Route des Poids Lourds", dimension: "6m x 3m", faces: [{ id: "PAN-105-F1", statut: "Occupé", societe: "Bralima", prix: "900$", dureeRestante: "30/12/2026" }] },
  { id: "PAN-106", zone: "Gombe", coords: [-4.310, 15.308], adresse: "Avenue Kasa-Vubu", dimension: "4m x 3m", faces: [{ id: "PAN-106-F1", statut: "Occupé", societe: 'Vodacom', prix: "500$", dureeRestante: "07/04/2026" }] },
  { id: "PAN-107", zone: "Gombe", coords: [-4.330, 15.315], adresse: "Boulevard Sendwe", dimension: "4m x 3m", faces: [{ id: "PAN-107-F1", statut: "Réservé", societe: "Tigo", prix: "450$", dureeRestante: "15/05/2026" }] },
  { id: "PAN-108", zone: "Gombe", coords: [-4.322, 15.300], adresse: "Avenue de la Libération", dimension: "6m x 3m", faces: [{ id: "PAN-108-F1", statut: "Maintenance", societe: null, prix: "750$" , dureeRestante: "" }] },
  { id: "PAN-109", zone: "Gombe", coords: [-4.319, 15.325], adresse: "Avenue des Aviateurs", dimension: "8m x 4m", faces: [{ id: "PAN-109-F1", statut: "Occupé", societe: "Rawbank", prix: "1500$", dureeRestante: "12/11/2026" }] }
];