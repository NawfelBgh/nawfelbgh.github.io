
Quand on ajoute `<link rel="preload" as="fetch">` dans son HTML, on s'attend à ce que les requêtes de données démarrent plus tôt et finissent plus vite. Mais si les options de la balise `<link>` et celles de `fetch()` ne correspondent pas, le navigateur envoie deux requêtes au lieu de réutiliser la précharge. Cet article détaille les combinaisons d'options qui fonctionnent, celles qui ne fonctionnent pas, et où les navigateurs divergent.

Cet article est rédigé en anglais. Vous pouvez le lire dans son intégralité en suivant [ce lien](/blog/preload-as-fetch-in-practice).

## Table des matières

- Introduction
- Comment fonctionne le preloading
- Comment précharger correctement des requêtes de données
    - Options de fetch
    - Options de `<link rel="preload">`
    - Faire correspondre les options pour que fetch réutilise le preload
- Les preloads sont-ils réutilisés par les fetches avec des en-têtes personnalisés
- Conclusion
