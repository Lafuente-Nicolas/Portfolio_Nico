# Portfolio Nico

Portfolio de Nicolas Lafuente : création de sites internet pour restaurants, salons et artisans.

- **Front** : HTML, CSS et JavaScript sans framework (`src/Portfolio.Web/wwwroot`)
- **Back** : C# / ASP.NET Core 8 (API minimale) qui sert le site et gère le formulaire de contact

## Lancer le site en local

Prérequis : le [SDK .NET 8](https://dotnet.microsoft.com/download/dotnet/8.0).

```bash
cd src/Portfolio.Web
dotnet run
```

Le site s'ouvre sur http://localhost:5080.

Avec Visual Studio ou Rider : ouvrir `src/Portfolio.Web/Portfolio.Web.csproj` puis lancer le profil `http`.

> Le site doit être ouvert via le serveur (`dotnet run`), pas en double-cliquant sur `index.html` :
> le formulaire de contact et les aperçus animés des projets ont besoin du serveur.

## Structure

```
src/Portfolio.Web/
├── Program.cs                  Démarrage, sécurité, limitation, fichiers statiques
├── Contact/
│   ├── ContactEndpoints.cs     POST /api/contact
│   ├── ContactModels.cs        Données du formulaire et message enregistré
│   ├── ContactValidator.cs     Règles de validation
│   ├── MessageStore.cs         Enregistrement dans App_Data/messages.jsonl
│   └── EmailNotifier.cs        Email de notification (SMTP, optionnel)
├── appsettings.json            Configuration (dont SMTP)
└── wwwroot/
    ├── index.html              Le portfolio
    ├── assets/                 CSS, JS, favicon
    └── projets/                Les 3 sites de démonstration (4 pages chacun)
        ├── restaurant/
        ├── coiffure/
        └── paysagiste/
```

## API

| Méthode | Route          | Rôle                                                |
|---------|----------------|-----------------------------------------------------|
| GET     | `/api/health`  | Vérifie que le serveur tourne                       |
| POST    | `/api/contact` | Reçoit un message `{ name, email, message }`        |

Protection du formulaire :
- validation côté navigateur **et** côté serveur ;
- champ piège invisible contre les robots ;
- 5 messages maximum par adresse IP toutes les 10 minutes (réponse `429` au-delà).

Chaque message est enregistré, une ligne JSON par message, dans
`src/Portfolio.Web/App_Data/messages.jsonl` (dossier ignoré par Git).

## Recevoir les messages par email (optionnel)

Sans configuration, les messages sont seulement enregistrés dans le fichier.
Pour recevoir un email à chaque message, renseigner la section `Smtp`.
Ne jamais mettre le mot de passe dans `appsettings.json` : utiliser les secrets utilisateur.

Exemple avec Gmail (il faut créer un « mot de passe d'application » dans le compte Google) :

```bash
cd src/Portfolio.Web
dotnet user-secrets set "Smtp:Host" "smtp.gmail.com"
dotnet user-secrets set "Smtp:User" "lafuentenicolas1@gmail.com"
dotnet user-secrets set "Smtp:Password" "mot-de-passe-d-application"
dotnet user-secrets set "Smtp:From" "lafuentenicolas1@gmail.com"
```

En production, ces valeurs se passent en variables d'environnement
(`Smtp__Host`, `Smtp__User`, `Smtp__Password`, `Smtp__From`).

## Effets du portfolio

Intro animée, titres qui apparaissent lettre par lettre, révélations au défilement,
curseur personnalisé, boutons magnétiques, aperçus live des sites qui défilent au survol,
inclinaison 3D des aperçus, barre de progression, navigation qui se masque en descendant.
Tout est désactivé automatiquement si l'utilisateur a demandé à réduire les animations,
et le curseur personnalisé n'apparaît que sur ordinateur.

## Photos

Les sites de démonstration utilisent pour l'instant des emplacements colorés,
avec une étiquette « Photo · … » qui indique l'image à mettre.

## Mise en ligne : points à régler

- **Mentions légales** (`wwwroot/mentions-legales.html`) : compléter le statut / SIRET et les coordonnées
  de l'hébergeur (lignes surlignées en doré).
- **Proxy de l'hébergeur** : passer `"ReverseProxy": { "Enabled": true }` dans la configuration de production,
  pour que la limite anti-spam utilise la vraie adresse IP des visiteurs.
- Les messages du formulaire de plus de 12 mois sont supprimés automatiquement au démarrage du serveur.

## Vie privée

- Les polices sont hébergées dans `wwwroot/fonts` : aucun appel à Google Fonts.
- La carte Google Maps du site de démo ne se charge qu'après un clic du visiteur.
- Les sites de démonstration (`/projets`) sont exclus de l'indexation Google (`noindex` + en-tête `X-Robots-Tag`).
