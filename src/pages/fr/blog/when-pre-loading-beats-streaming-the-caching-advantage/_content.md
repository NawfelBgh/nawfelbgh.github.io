Les pages web sont souvent composées de :

- parties semi-statiques qui changent rarement et qui sont identiques pour tous les utilisateurs,
- parties dynamiques qui changent fréquemment et dont le contenu peut dépendre de l'utilisateur.

Les frameworks JavaScript récents, et le framework pionnier [Marko](https://markojs.com/), optimisent le chargement des pages en streamant progressivement différentes parties de la page au client. Bien que ce type de streaming soit une optimisation efficace, je soutiens dans cet article qu'il faut l'envisager seulement après avoir pris en compte une optimisation plus importante : le cache.

Dans mon article, [Comment créer des frontends web rapides](/blog/web-frontend-performance), j'ai classé les techniques d'optimisation en deux grandes catégories :

- Les techniques qui accélèrent le chargement des pages en réduisant le travail nécessaire, coté serveur et réseau, pour livrer le contenu au client. Le cache en est un exemple majeur.
- Les techniques qui ne réduisent pas nécessairement le travail mais qui réduisent plutôt le temps d'attente de l'utilisateur en planifiant intelligemment le chargement des ressources. Le streaming HTTP et le pré-chargement rentrent dans cette catégorie.
  - Avec le streaming HTTP, le serveur peut commencer à charger toutes les parties de la page en parallèle dès qu'il reçoit la requête du client.
  - Avec le pré-chargement, le client peut commencer à récupérer les parties de la page dès qu'il reçoit les en-têtes de la page ou son élément head.

Bien que le streaming HTTP permette au serveur de commencer à charger les ressources plus tôt que le pré-chargement, il présente des inconvénients :

- Le streaming est une forme de bundling, qui a l'inconvénient d'entraver le cache : les parties semi-statiques ne peuvent pas bénéficier du cache HTTP car elles sont regroupées avec les parties dynamiques sous une URL unique.
- Le streaming doit être implémenté au niveau du framework.

Dans cet article, [en anglais](/blog/when-pre-loading-beats-streaming-the-caching-advantage), je compare les performances de chargement des pages en utilisant le pré-chargement versus le streaming HTTP, tous deux combinés avec la mise en cache. En utilisant des diagrammes générés par simulation, je démontre que le pré-chargement et le streaming peuvent atteindre des performances similaires, le premier étant plus efficace pour réduire le travail global grâce à une meilleure compatibilité avec le cache.

## Table des matières

- Introduction
- Table des matières
- Paramètres de simulation
- Les pages de référence à comparer : Full-Page avec streaming vs Split-Page avec pré-chargement
- L'effet du cache côté serveur et edge
- Assembler la version Full-Page sur l'edge pour une meilleure utilisation des caches
- Comparaison du chargement pour les utilisateurs récurrents avec un cache chaud
- Conclusion
