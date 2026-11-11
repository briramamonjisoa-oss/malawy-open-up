MALAWY OPEN UP — première version PWA

CONTENU
- Application web mobile installable (PWA).
- Formulaire d'inscription connecté à une fonction serveur Airtable.
- Liste publique limitée au pseudo et au mode (l'ID Free Fire n'est pas exposé dans la liste).
- Saisie des résultats et classement local sur l'appareil dans cette version initiale.
- Mode aperçu local si Airtable n'est pas encore configuré.

DÉPLOIEMENT
1. Crée un compte sur https://www.netlify.com/ et connecte-le à GitHub, ou déploie le dossier via Netlify.
2. Dans Netlify > Site configuration > Environment variables, ajoute :
   AIRTABLE_TOKEN = ton jeton Airtable personnel (ne le partage jamais)
   AIRTABLE_BASE_ID = appUXdWXyTbNXBPPB
3. Redéploie le site.
4. Vérifie que la table s'appelle exactement Inscriptions et que les champs sont :
   Pseudo Free Fire (texte), ID Free Fire (texte), Mode de combat (choix unique : 1 VS 1 / 2 VS 1).
5. Ouvre l'URL Netlify sur Android avec Chrome > menu ⋮ > Installer l'application.

SÉCURITÉ
- Ne place jamais le jeton Airtable dans app.js ou dans le navigateur.
- La fonction publique d'inscription ne permet que l'ajout d'un participant.
- La liste publique ne renvoie que pseudo et mode, pas les IDs.
- La gestion des matchs et le classement sont conservés localement dans cette première version.
- Pour une vraie administration multi-appareils, il faudra ajouter une authentification admin et stocker les matchs dans Airtable.

La connexion Airtable n'est pas active tant que AIRTABLE_TOKEN n'est pas configuré côté hébergeur.
