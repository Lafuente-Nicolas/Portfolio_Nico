# Portfolio Nico

Portfolio de Nicolas Lafuente, création de sites internet pour restaurants, salons et artisans.

**Site en ligne : https://portfolio-nico-v5ut.onrender.com**

## Contenu

- Page portfolio avec animations, aperçus live des projets et formulaire de contact
- Trois sites de démonstration (4 pages chacun) : restaurant, salon de coiffure, paysagiste
- Mentions légales et politique de confidentialité

## Stack

- **Front** : HTML, CSS, JavaScript (sans framework)
- **Back** : C# / ASP.NET Core 8, API minimale
- **Email** : MailKit (SMTP)
- **Hébergement** : Render (Docker)

## Lancer en local

```bash
cd src/Portfolio.Web
dotnet run
```

## Structure

```
src/Portfolio.Web/
├── Program.cs         Configuration du serveur
├── Contact/           API du formulaire de contact
└── wwwroot/           Portfolio, polices et sites de démonstration
```
