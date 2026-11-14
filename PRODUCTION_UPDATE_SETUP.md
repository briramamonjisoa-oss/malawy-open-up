# Mise à jour de production MALAWY OPEN UP

Cette branche d’intégration part de `main`. Elle ajoute les résultats Battle Royale et les notifications sans remplacer les comptes, les tournois ou les données existantes.

## Battle Royale

Créer dans Airtable la table `Résultats Battle Royale` avec ces champs :
- `ID tournoi` — texte sur une ligne
- `ID inscription tournoi` — texte sur une ligne
- `Nom tournoi` — texte sur une ligne
- `Pseudo` — texte sur une ligne
- `Map` — nombre
- `Classement` — nombre
- `Kills` — nombre
- `Points classement` — nombre
- `Points kills` — nombre
- `Total points` — nombre
- `Capture résultat` — texte sur une ligne

Barème : Top 1 = 20, Top 2 = 15, Top 3 = 10, autres = 0, chaque kill = 1 point. Les joueurs retenus doivent avoir une inscription acceptée dans le tournoi sélectionné. Les résultats sont saisis manuellement map par map (2 ou 3 maps). Le classement BR est séparé du classement général actuel.

Le bouton de réinitialisation supprime les résultats BR de tous les tournois. Une sauvegarde locale sur l’appareil de l’administrateur est proposée pour annuler, mais elle n’est pas une sauvegarde serveur et ne doit pas être considérée comme une garantie de restauration.

## Notifications push

Les tables Airtable `Push subscriptions`, `Notification queue` et `Notifications` doivent exister avec les champs exacts décrits dans `NOTIFICATIONS_SETUP.md`.

Générer une nouvelle paire VAPID sur un poste de confiance :
```powershell
npx web-push generate-vapid-keys
```
Ne jamais réutiliser une ancienne clé privée qui a été affichée dans une conversation. Ne jamais enregistrer la clé privée dans GitHub.

Configurer la clé publique dans `wrangler.jsonc` et `push-notifications.js`, puis ajouter la clé privée comme secret Cloudflare du Worker de production :
```powershell
npx wrangler secret put VAPID_PRIVATE_KEY
```
Les variables `AIRTABLE_TOKEN`, `AIRTABLE_BASE_ID` et `ADMIN_CODE` de production doivent rester inchangées. La configuration de notification ne doit pas remplacer les secrets existants.

## Déploiement

Avant déploiement, vérifier la configuration avec `/__health` et tester un compte joueur de test, l’activation push, l’envoi immédiat, la programmation, la saisie BR et le reset/restore. Ne pas fusionner tant que les tables et les clés VAPID ne sont pas prêtes.
