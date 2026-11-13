# Configuration des notifications push

Cette fonctionnalité est développée sur la branche `feature/push-notifications`. Elle ne doit pas être fusionnée dans `main` avant la configuration Airtable, les clés VAPID et les essais sur un vrai téléphone.

Les trois tables décrites ci-dessous ont déjà été créées dans la base Airtable MALAWY OPEN UP. Cette section sert de référence pour vérifier leurs champs.

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
| Player record ID | Texte sur une seule ligne |
| Title | Texte sur une seule ligne |
| Message | Texte long |
| URL | Texte sur une seule ligne |
| Created At | Date avec heure |
| Read At | Date avec heure |
| Notification Key | Texte sur une seule ligne |

## 2. Générer les clés VAPID

Sur un ordinateur avec Node.js, exécuter :

```bash
npx web-push generate-vapid-keys
```

Garder les deux valeurs générées. Ne jamais publier ni partager la clé privée.

Dans cette branche, la clé publique et `VAPID_SUBJECT` sont déjà renseignés dans `wrangler.jsonc` et la clé publique est intégrée au bouton d’abonnement. Il reste à ajouter uniquement `VAPID_PRIVATE_KEY` comme secret dans Cloudflare > Workers & Pages > malawy-open-up > Settings > Variables and Secrets.

La clé privée ne doit jamais être ajoutée au dépôt GitHub.

## 3. Fonctionnement

- Les joueurs peuvent autoriser les notifications pendant leur inscription pour recevoir le message d'acceptation.
- Un joueur déjà accepté peut activer les notifications depuis la cloche de l'application.
- Les rappels de tournoi sont préparés automatiquement par le Cron Cloudflare existant (toutes les 15 minutes) : 24 h, 1 h, 15 min et au début.
- L'administrateur peut envoyer un message à tous les joueurs acceptés, aux participants d'un tournoi, ou à un joueur, immédiatement ou à une date programmée.
- Les notifications reçues sont conservées dans l'historique du joueur.

## 4. Sécurité et limites

- Les notifications ne sont envoyées qu'aux appareils ayant accepté l'autorisation du navigateur.
- Les abonnements sont liés à l'identifiant Airtable du joueur.
- Les erreurs de notification ne doivent pas bloquer les inscriptions ni les autres fonctions du site.
- Android/Chrome prend en charge les notifications push. Sur iPhone, la PWA doit être ajoutée à l'écran d'accueil et le système doit être compatible (iOS/iPadOS 16.4 ou ultérieur).
- Un téléphone éteint ne peut pas afficher immédiatement une notification. Elle peut être reçue lorsque le téléphone est rallumé, si l'abonnement est toujours valide.

## 5. Vérifications avant mise en production

1. Créer les trois tables Airtable et leurs champs.
2. Ajouter les variables VAPID dans Cloudflare.
3. Remplacer la clé publique dans le JavaScript.
4. Vérifier `/__health` : les deux indicateurs VAPID doivent être à `true`.
5. Tester l'activation et la réception sur deux téléphones.
6. Tester acceptation d'un compte, rappels de tournoi, envoi manuel, programmation et historique.
7. Seulement après validation, fusionner la branche dans `main`.
