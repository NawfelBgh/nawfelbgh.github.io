> J'ai présenté mon article [Quand le pré-chargement l'emporte sur le streaming&nbsp;: l'avantage du cache](/blog/when-pre-loading-beats-streaming-the-caching-advantage) lors de l'événement _[SFEIR](https://sfeir.com/en/) Share_.

<div class="slide">
    <img src="/blog/sfeir-share-2026-04-16/slide-0-0-fr.svg" style="top:0; left:0; width:100%;" />
</div>

## Introduction

Bonjour à tous. Aujourd'hui, je vais vous présenter le contenu de mon article&nbsp;: ["Quand le pré-chargement l'emporte sur le streaming&nbsp;: l'avantage du cache"](/blog/when-pre-loading-beats-streaming-the-caching-advantage).

Je vais comparer deux manières différentes de livrer des pages web&nbsp;: le streaming, qui est de plus en plus supporté par les frameworks, et le pre-loading, qui reçoit moins d'attention. Je montre que les deux optimisations peuvent fournir des performances similaires. Je compare les deux approches en profondeur, montrant dans quelle situation chacune est la meilleure.

En fait, un but de l'écriture de mon article est de rappeler les limites du streaming et défendre le pre-loading en tant qu'optimisation simple et efficace qui mérite une intégration plus poussée dans les frameworks web.

---

## Simulation

Pour être aussi équitable que possible dans ma comparaison, j'ai créé et utilisé un simulateur pour générer les diagrammes de chargement de différents scénarios.

Les diagrammes que je vais montrer sur ces slides sont très simplifiés et créés à la main.
Je vous invite à consulter l'article pour les diagrammes générés par simulation qui ont des détails plus fins, distinguant&nbsp;:

- le chargement et l'exécution du script
- le chargement du contenu, le rendu et l'hydratation de la page
- le rendu côté serveur et les requêtes à la base de données

L'article donne également accès à [un environnement de simulation](/blog/when-pre-loading-beats-streaming-the-caching-advantage/simulation/playground) permettant de tester différents paramètres tels que la bande passante du réseau, la taille des fichiers, le temps de traitement, etc.

<div class="slide">
    <img src="/blog/sfeir-share-2026-04-16/slide-0-1-fr.svg" style="top:0; left:0; width:100%;" />
    <img src="/blog/when-pre-loading-beats-streaming-the-caching-advantage/simulation/true_true_true_false_true_false_split-page.svg" style="top:20%; left:20%; width:60%; border: solid 1px #999;" />
</div>

---

## Table des matières

- Je vais d'abord définir quel type de pages nous allons optimiser
- Ensuite nous verrons les diagrammes de chargement dans de nombreuses configurations différentes
- Nous terminerons par les enseignements et une vue sur le support des différentes techniques par les frameworks

<div class="slide">
    <img src="/blog/sfeir-share-2026-04-16/slide-0-2-fr.svg" style="top:0; left:0; width:100%;" />
</div>

---

## La page à optimiser

Voici l'énoncé du problème&nbsp;: nous avons une page web qui contient deux types de contenu&nbsp;:

- Du contenu semi-statique, codé en orange, qui change rarement et qui est le même pour tous les utilisateurs,
- Du contenu dynamique, codé en rouge, qui change fréquemment et/ou qui dépend de l'utilisateur.

Nous voulons charger cette page aussi rapidement et efficacement que possible.

<div class="slide">
    <img loading="lazy" src="/blog/sfeir-share-2026-04-16/slide-1-0-en.svg" style="top:0; left:0; width:100%;" />
</div>

---

Montrons d'abord une manière très naïve de livrer notre page&nbsp;: le serveur retourne un document HTML vide qui charge un script qui, une fois chargé sur le client, chargera les parties semi-statique et dynamique de la page.

Je montre cet exemple ici uniquement comme pire cas, illustrant clairement le principal problème de performance&nbsp;: la latence induite par les allers-retours réseau entre le client et le serveur, et le fait qu'il faut exécuter le script côté client avant même que le serveur ne commence à charger ou à générer le contenu de la page.

<div class="slide">
    <img loading="lazy" src="/blog/sfeir-share-2026-04-16/slide-1-1-en.svg" style="top:0; left:0; width:100%;" />
</div>

---

## Streaming de page complète

Voyons maintenant comment charger cette page avec du streaming&nbsp;:

- Le serveur retourne tout le contenu de la page au client dans le même fichier HTML, streamant différentes parties de la page au fur et à mesure qu'elles deviennent disponibles.
  - La balise `head` de la page est streamée très tôt pour démarrer rapidement le chargement du script de la page.
- Le serveur peut commencer à charger, et la partie semi-statique et la partie dynamique de la page dès qu'il reçoit la première requête.
  - On remarque qu'une fois la partie dynamique est prête coté serveur, elle doit attendre la transmission de la partie semi-statique avant d'être envoyée au client.

<div class="slide">
    <img loading="lazy" src="/blog/sfeir-share-2026-04-16/slide-1-2-en.svg" style="top:0; left:0; width:100%;" />
</div>

---

## Page divisée avec pre-loading

Voyons maintenant une autre façon de charger cette page&nbsp;: en divisant les parties semi-statiques et dynamiques en 2 ressources différentes.

- Le streaming est utilisé ici pour envoyer le `head` de la page avant même que le serveur ne génère son contenu. Mais le cache rend ce détail sans importance dans les exemples suivants de pre-loading.
- Le serveur répond uniquement avec la partie semi-statique à la requête initiale de la page.
- Le client envoie une deuxième requête pour obtenir la partie dynamique.
  - Le pre-loading est utilisé pour que le client puisse demander la partie dynamique dès qu'il reçoit la balise `head` de la page.
- Le serveur peut commencer à charger la partie semi-statique dès qu'il reçoit la première requête, mais il commence à charger la partie dynamique après un aller-retour réseau supplémentaire avec le client.

<div class="slide">
    <img loading="lazy" src="/blog/sfeir-share-2026-04-16/slide-1-3-en.svg" style="top:0; left:0; width:100%;" />
</div>

---

## Comparaison (1)

Si nous comparons les approches de pre-loading et de streaming, le streaming semble l'emporter ici car il commence à charger le contenu dynamique de la page plus tôt. 

Voyons ce qui se passe quand nous ajoutons la mise en cache.

<div class="slide">
    <img loading="lazy" src="/blog/sfeir-share-2026-04-16/slide-1-4-en.svg" style="top:0; left:0; width:100%;" />
</div>

---

## Mise en cache

Ajoutons maintenant deux couches de cache&nbsp;:

- Un nœud CDN/Edge entre le client et le serveur.
  - Ce nœud est proche du client pour réduire la latence du contenu mis en cache.
- Un cache côté serveur qui est utilisé au cas où le cache edge ne peut pas être utilisé.

<div class="slide">
    <img loading="lazy" src="/blog/sfeir-share-2026-04-16/slide-2-0-en.svg" style="top: 0; left: 0%; width: 100%;" />
</div>

---

### Streaming avec le cache côté edge

Regardons le diagramme de chargement pour la version en streaming de la page&nbsp;:

- Le `head` et la partie semi-statique ne peuvent pas bénéficier du cache edge car ils sont groupés avec la partie dynamique non cacheable en une seule ressource.
  - La partie semi-statique est servie depuis le cache serveur, d'où un chargement plus rapide.
- Le script peut maintenant être chargé depuis l'edge, au lieu du serveur, ce qui réduit son temps de chargement.

<div class="slide">
    <img loading="lazy" src="/blog/sfeir-share-2026-04-16/slide-2-1-en.svg" style="top: 0; left: 0%; width: 100%;" />
</div>

---

### Pre-loading avec le cache côté edge

Regardons maintenant le diagramme de chargement pour la page divisée avec pre-loading&nbsp;:

- La partie semi-statique est servie depuis le cache edge ce qui réduit la latence.
  - Le `head` de la page étant chargé plus tôt, le client peut commencer à charger la partie dynamique plus tôt que sans le cache edge.
  - Le script commence aussi à charger plus tôt, et est chargé depuis l'edge avec latence réduite.

<div class="slide">
    <img loading="lazy" src="/blog/sfeir-share-2026-04-16/slide-2-2-en.svg" style="top: 0; left: 0%; width: 100%;" />
</div>

---

## Comparaison (2)

Si nous comparons les deux approches en présence du cache edge, nous voyons que la version avec pre-loading l'emporte sur la version streaming en termes de First-Paint et de chargement final. Le client reçoit le contenu semi-statique et le script statique plus tôt, dégageant la voie pour un traitement plus rapide du contenu dynamique.

<div class="slide">
    <img loading="lazy" src="/blog/sfeir-share-2026-04-16/slide-2-3-en.svg" style="top: 0; left: 0%; width: 100%;" />
</div>

---

## Assemblage de page côté edge

Nous avons vu que l'approche streaming ne pouvait pas profiter pleinement du cache edge car les parties semi-statiques et dynamiques sont groupées en une seule ressource.

Ce problème peut être réglé en faisant du calcul côté edge. Parmi les solutions possibles, je cite&nbsp;:

- [Edge Side Includes (ESI)](https://en.wikipedia.org/wiki/Edge_Side_Includes), désigné an début des années 2000, sont des balises HTML spéciales interprétées sur l'edge pour permettre l'injection de contenu dynamique dans une page mise en cache.
- Plus récemment, [Next.js](https://nextjs.org/) a implémenté [Partial Pre-rendering (PPR)](https://vercel.com/blog/partial-prerendering-with-next-js-creating-a-new-default-rendering-model) qui sert les composants de page cacheables depuis le cache d'edge et stream le contenu dynamique depuis le serveur d'origine. PPR n'est disponible que sur l'edge de Vercel.
- Aujourd'hui, de nombreux frameworks JavaScript peuvent fonctionner entièrement sur l'edge. Les frameworks qui supportent le streaming peuvent donc streamer depuis l'edge tout en profitant du cache côté edge.

<div class="slide">
    <img loading="lazy" src="/blog/sfeir-share-2026-04-16/slide-3-0-fr.svg" style="top: 0; left: 0%; width: 100%;" />
</div>

---

### Streaming avec assemblage côté edge

Regardons le diagramme de chargement de la page quand elle est assemblée sur l'edge.

- Maintenant, l'edge peut servir la partie semi-statique directement depuis le cache.
- Pour obtenir la partie dynamique, l'edge récupère une ressource (URL) différente du serveur, puis stream la réponse au client comme partie de la page originale.
- Le script est maintenant chargé tôt, comme avec la version pre-loading.

<div class="slide">
    <img loading="lazy" src="/blog/sfeir-share-2026-04-16/slide-3-1-en.svg" style="top: 0; left: 0%; width: 100%;" />
</div>

---

## Comparaison (Assemblage côté edge)

Maintenant, grâce à l'assemblage côté edge, l'approche streaming récupère son avantage sur la version pre-loading, car elle est aussi efficace pour charger la partie semi-statique, et la partie dynamique commence à charger plus tôt.

<div class="slide">
    <img loading="lazy" src="/blog/sfeir-share-2026-04-16/slide-3-2-en.svg" style="top: 0; left: 0%; width: 100%;" />
</div>

---

## Utilisateurs récurrents

### Streaming avec assemblage côté edge, pour les utilisateurs récurrents

Examinons ce qui se passe quand un utilisateur récurrent revisite notre page en streaming avec un cache récent.

- L'edge re-envoie le contenu statique de la page depuis son cache.
- Dès que le client reçoit le `head` de la page, il peut commencer à exécuter le script qu'il a déjà dans son cache.
  - Le script n'a pas besoin d'être téléchargé, juste exécuté, ce qui est plus rapide.

<div class="slide">
    <img loading="lazy" src="/blog/sfeir-share-2026-04-16/slide-4-0-en.svg" style="top: 0; left: 0%; width: 100%;" />
</div>

---

### Pre-loading avec cache, pour les utilisateurs récurrents

Quand un utilisateur revisite notre page pré-chargée avec un cache récent, les choses sont un peu différentes&nbsp;:

- Grâce au fait que la partie semi-statique est mise en cache sur le client, le client peut commencer à faire le rendu de la page et à exécuter le script à T=0s.
  - La partie semi-statique et le script prennent moins de temps à charger car ils n'ont pas besoin d'être téléchargés.
- Le client commence aussi à pré-charger la partie dynamique à T=0s ce qui est optimal.

<div class="slide">
    <img loading="lazy" src="/blog/sfeir-share-2026-04-16/slide-4-1-en.svg" style="top: 0; left: 0%; width: 100%;" />
</div>

---

## Comparaison (Utilisateurs récurrents)

Pour les utilisateurs récurrents avec un cache récent, le pre-loading donne un First-Paint plus rapide que le streaming. Le pre-loading arrive également à charger la partie dynamique de la page aussi vite que le streaming.

<div class="slide">
    <img loading="lazy" src="/blog/sfeir-share-2026-04-16/slide-4-2-en.svg" style="top: 0; left: 0%; width: 100%;" />
</div>

---

## En résumé

Ce que nous pouvons conclure de tout cela est que les deux techniques, streaming de page complète et page divisée avec pre-loading, améliorent les performances de chargement. Le pre-loading surpasse le streaming et inversement dans différents contextes&nbsp;:

- Le pre-loading est le gagnant pour les utilisateurs récurrents avec un cache navigateur récent, car le contenu statique et semi-statique est traité immédiatement et le contenu dynamique est récupéré sans latence ajoutée.
- Sinon,
  - Sans cache côté edge, le gagnant est le streaming, car il commence à charger les données de la page, semi-statiques et dynamiques, plus tôt.
  - Avec cache côté edge, le gagnant est le pre-loading, car il peut servir le contenu cacheable tôt depuis l'edge,
    - Sauf si nous utilisons l'assemblage côté edge, auquel cas le gagnant est le streaming.

<div class="slide">
    <img loading="lazy" src="/blog/sfeir-share-2026-04-16/slide-5-0-en.svg" style="top: 0; left: 0%; width: 100%;" />
</div>

---

## Support dans les frameworks

- Le streaming nécessite le support du framework.
  - La bonne chose est que de plus en plus de frameworks le supportent.
- Le streaming tout en profitant du cache edge est possible avec&nbsp;:
  - Next.js via l'assemblage côté edge (via PPR)
  - Les frameworks qui supportent le streaming déployés sur l'edge.
- Le pre-loading fonctionne bien avec la mise en cache edge traditionnelle.
  - Il ne nécessite pas le support du framework. Mais pour une expérience développeur optimale, le support du framework est nécessaire&nbsp;:
    - Les _server functions_ permettent d'appeler du code backend depuis le frontend de manière type-safe sans avoir à déclarer d'endpoints. Mais pour supporter le pre-loading des _server functions_, le framework doit fournir au minimum des APIs pour obtenir leurs URLs. Actuellement, ces APIs sont absentes ou non documentées.
  - Les server islands d'Astro sont l'approche la plus proche pour implémenter le pattern de page divisée avec pre-loading, tout en bénéficiant d'une DX de première classe.

<div class="slide">
    <img loading="lazy" src="/blog/sfeir-share-2026-04-16/slide-5-1-fr.svg" style="top: 0; left: 0%; width: 100%;" />
</div>

---

<div class="slide">
    <img loading="lazy" src="/blog/sfeir-share-2026-04-16/slide-5-2-fr.svg" style="top: 0; left: 0%; width: 100%;" />
</div>
