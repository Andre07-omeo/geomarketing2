const {onDocumentUpdated} = require("firebase-functions/v2/firestore");
const {setGlobalOptions} = require("firebase-functions/v2");
const logger = require("firebase-functions/logger");

setGlobalOptions({ maxInstances: 10, region: "us-central1" });

exports.validatePanneauUpdate = onDocumentUpdated("panneaux/{panneauId}", async (event) => {
  const oldData = event.data.before.data();
  const newData = event.data.after.data();

  // 1. Logique : Vérifier si l'email de l'agent a changé sur une face occupée
  newData.faces.forEach((newFace, index) => {
    const oldFace = oldData.faces[index];

    // Si la face est occupée/réservée
    if ((newFace.statut === "Occupé" || newFace.statut === "Réservé") && oldFace.statut !== "Libre") {
      
      // Si l'agent actuel ne correspond pas à l'agent qui a réservé précédemment
      // (On suppose que 'agentEmail' est stocké dans la face)
      if (oldFace.agentEmail && oldFace.agentEmail !== event.auth?.token?.email) {
        logger.warn("Tentative de modification non autorisée détectée", {
          panneauId: event.params.panneauId,
          agentTentative: event.auth?.token?.email
        });
        
        // Note : Firestore Functions ne peuvent pas "annuler" une transaction 
        // une fois qu'elle est écrite. 
        // Pour une sécurité totale, la validation doit être faite côté client 
        // ou via une transaction Firestore explicite.
        throw new Error("Accès refusé : Vous ne pouvez pas modifier une face réservée par un autre agent.");
      }
    }
  });

  logger.info("Mise à jour du panneau validée avec succès.", {panneauId: event.params.panneauId});
});