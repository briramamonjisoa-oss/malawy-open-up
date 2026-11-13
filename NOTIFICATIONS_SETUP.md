# Configuration des notifications push

Cette fonctionnalité est développée sur la branche `feature/push-notifications-safe`. La production (`main` et le Worker `malawy-open-up`) reste inchangée pendant les essais.

Les trois tables de notifications ont déjà été créées dans Airtable. Leurs champs sont listés plus bas.

## 1. Tables Airtable

Les noms de tables et de champs doivent être respectés exactement. Pour les champs de statut et de type, utiliser du texte sur une seule ligne (pas un champ Select).

### Table `Push subscriptions`

| Champ | Type Airtable |
|---|---|
| Endpoint | Texte sur une seule ligne |
| P256dh | Texte sur une seule ligne |
| Auth | Texte sur une seule ligne |
| Player record ID | Texte sur une seule ligne |
| Pseudo | Texte sur une seule ligne |
| UID | Texte sur une seule ligne |
| Active | Case à cocher |
| Created At | Date avec heure |

### Table `Notification queue`

| Champ | Type Airtable |
|---|---|
| Title | Texte sur une seule ligne |
| Message | Texte long |
| URL | Texte sur une seule ligne |
| Target type | Texte sur une seule ligne |
| Target ID | Texte sur une seule ligne |
| Scheduled At | Date avec heure |
| Status | Texte sur une seule ligne |
| Sent At | Date avec heure |
| Notification Key | Texte sur une seule ligne |
| Recipient Count | Nombre entier |
| Error | Texte long |

### Table `Notifications`

| Champ | Type Airtable |
|---|---|
| Title | Texte sur une seule ligne |
| Player record ID | Texte sur une seule ligne |
| Message | Texte long |
| URL | Texte sur une seule ligne |
| Created At | Date avec heure |
| Read At | Date avec heure |
| Notification Key | Texte sur une seule ligne |

## 2. Clés VAPID — créer une nouvelle paire pour les tests

La clé privée VAPID utilisée précédemment a été affichée dans une conversation. Par précaution, ne pas la réutiliser.

Sur un ordinateur avec Node.js, exécuter :

```bash
npx web-push generate-vapid-keys
```

Garder la clé privée pour Cloudflare uniquement. Ne jamais la mettre dans GitHub, dans le code ou dans un message. La clé publique doit être reportée dans `wrangler.test.jsonc` et `push-notifications.js` avant le déploiement. La clé publique actuelle dans ces fichiers est provisoire et doit être remplacée par la nouvelle.

## 3. Worker de test isolé

Un fichier dédié `wrangler.test.jsonc` a été ajouté. Il crée un Worker nommé `malawy-open-up-test`, sans Cron, pour ne pas envoyer de rappels automatiques pendant les premiers essais.

Après remplacement de la clé publique, depuis le dossier du projet :

```bash
npm install
npm run build
npx wrangler deploy --config wrangler.test.jsonc
```

Dans Cloudflare > Workers & Pages > `malawy-open-up-test` > Settings > Variables and Secrets, configurer les mêmes valeurs de connexion Airtable et d'administration que celles du Worker actuel :
- `AIRTABLE_TOKEN` : Secret
- `ADMIN_CODE` : Secret
- `VAPID_PRIVATE_KEY` : Secret (la nouvelle clé privée)
- `AIRTABLE_BASE_ID` : Variable texte
- `VAPID_PUBLIC_KEY` : Variable texte (la nouvelle clé publique)
- `VAPID_SUBJECT` : Variable texte, par exemple l'URL GitHub du projet

Ne pas modifier les secrets du Worker de production. Ne pas activer de Cron sur le Worker de test.

## 4. Vérifier la configuration

Ouvrir :

```
https://malawy-open-up-test.<sous-domaine>.workers.dev/__health
```

Les cinq indicateurs `ADMIN_CODE`, `AIRTABLE_TOKEN`, `AIRTABLE_BASE_ID`, `VAPID_PUBLIC_KEY` et `VAPID_PRIVATE_KEY` doivent être à `true`. Cette route ne renvoie jamais les valeurs des secrets.

## 5. Tests sur Android

1. Ouvrir l'URL du Worker de test dans Chrome Android.
2. Ajouter la PWA à l'écran d'accueil si nécessaire.
3. Se connecter avec un compte joueur de test et activer les notifications.
4. Vérifier qu'un abonnement est créé dans Airtable > `Push subscriptions`.
5. Fermer l'application (la laisser en arrière-plan) et déclencher un envoi depuis l'administration de test.
6. Vérifier la bannière Android et l'historique dans l'application.
7. Tester ensuite l'acceptation d'une inscription et les rappels en déclenchant manuellement des événements de test. Le Cron reste désactivé sur le Worker de test.

Utiliser de préférence un compte joueur de test. Les données d'abonnement et d'historique seront écrites dans les tables Airtable de la base du projet.

## 6. Fonctionnement prévu

- Les joueurs peuvent autoriser les notifications pendant leur inscription pour recevoir le message d'acceptation.
- Un joueur déjà accepté peut activer les notifications depuis la cloche de l'application.
- Les rappels de tournoi sont prévus à 24 h, 1 h, 15 min et au début.
- L'administration peut envoyer un message à tous les joueurs acceptés, aux participants d'un tournoi, ou à un joueur, immédiatement ou à une date programmée.
- Les notifications reçues sont conservées dans l'historique du joueur.

## 7. Sécurité et limites

- Les notifications ne sont envoyées qu'aux appareils ayant accepté l'autorisation du navigateur.
- Les abonnements sont liés à l'identifiant Airtable du joueur.
- Les erreurs de notification ne doivent pas bloquer les inscriptions ni les autres fonctions du site.
- Android/Chrome prend en charge les notifications push.
- Un téléphone éteint ne peut pas afficher immédiatement une notification.
- Ne fusionner dans `main` qu'après validation complète des essais sur téléphone.
