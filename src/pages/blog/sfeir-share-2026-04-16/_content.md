> I presented my article [When Pre-Loading Beats Streaming: The Caching Advantage](/blog/when-pre-loading-beats-streaming-the-caching-advantage) at the event *[SFEIR](https://sfeir.com/en/) Share*, in French.
>
> I put here a translated version of the presentation. You can also check out the slides and the script of the talk, in French, on the page:[Présentation SFEIR Share: Quand le pré-chargement l'emporte sur le streaming - l'avantage du cache](/fr/blog/sfeir-share-2026-04-16)

<div class="slide">
    <img src="/blog/sfeir-share-2026-04-16/slide-0-0-en.svg" style="top:0; left:0; width:100%;" />
</div>

## Introduction

Hello everyone. Today, I am going to present the content of my article: ["When Pre-Loading Beats Streaming: The Caching Advantage"](/blog/when-pre-loading-beats-streaming-the-caching-advantage).

I will compare two different ways to deliver web pages: streaming, which is increasingly supported by web frameworks, and pre-loading, which gets less attention. I show that both optimizations can provide similar performance. I compare both approaches in depth, showing in which situation each is the better one.

In fact, one goal of writing my article is to highlight the limitations of streaming and defend pre-loading as a simple and efficient optimization that deserves deeper integration in web frameworks.

---

## Simulation

To be as fair as possible in my comparison, I created and used a simulator to generate the page loading timelines of different scenarios.

The diagrams that I'll be showing on these slides are very simplified and hand-created. I invite you to check the article for the simulation-generated diagrams with more fine-grained details, distinguishing:

- the loading and execution of the script
- the page content loading, rendering and hydration
- server-side rendering and database lookups

The article also links to a [simulation playground](/blog/when-pre-loading-beats-streaming-the-caching-advantage/simulation/playground) which lets you try out different parameters like network bandwidth, file sizes, processing time and more.

<div class="slide">
    <img src="/blog/sfeir-share-2026-04-16/slide-0-1-en.svg" style="top:0; left:0; width:100%;" />
    <img src="/blog/when-pre-loading-beats-streaming-the-caching-advantage/simulation/true_true_true_false_true_false_split-page.svg" style="top:20%; left:20%; width:60%; border: solid 1px #999;" />
</div>

---

## Table Of Contents

- I will first define what kind of pages we will be optimizing
- Then we will see the loading timeline diagrams in many different setups
- Finally we will conclude with takeaways and a view on framework support for different techniques

<div class="slide">
    <img src="/blog/sfeir-share-2026-04-16/slide-0-2-en.svg" style="top:0; left:0; width:100%;" />
</div>

---

## The page to optimize

First, let's look at the problem statement: We have a web page which contains two types of content:

- Semi-static content, color-coded in orange, which changes infrequently and which is the same for all users,
- Dynamic content, color-coded in red, which changes frequently and/or which depends on the user.

We want to load this page as fast and efficiently as possible.

<div class="slide">
    <img loading="lazy" src="/blog/sfeir-share-2026-04-16/slide-1-0-en.svg" style="top:0; left:0; width:100%;" />
</div>

---

Let's first show a very naive way to deliver our page: The server returns an empty HTML document which loads a script which when loaded on the client will load the page semi-static and the dynamic parts.

I'm using this example solely as a worst-case scenario, showcasing clearly the main performance problem: the latency induced from the network round trips between the client and the server, and the need to execute the script on the client before the server even starts loading or generating the page content.

<div class="slide">
    <img loading="lazy" src="/blog/sfeir-share-2026-04-16/slide-1-1-en.svg" style="top:0; left:0; width:100%;" />
</div>

---

## Full-Page Streaming

Let's now see how to load this page with streaming:

- The server returns all page content to the client in the same HTML file, streaming different parts as they become available.
  - The page `head` is streamed very early to quickly start loading the page's script.
- The server can start loading, both the semi-static and the dynamic part of the page, as soon as it receives the first request.
  - Note that once the dynamic part is ready on the server side, it must wait for the semi-static part to be transmitted before being sent to the client.

<div class="slide">
    <img loading="lazy" src="/blog/sfeir-share-2026-04-16/slide-1-2-en.svg" style="top:0; left:0; width:100%;" />
</div>

---

## Split-Page with Pre-loading

Now let's see how to load this page in an alternative way: By splitting the semi-static and dynamic parts as 2 different resources.

- Streaming is used here to deliver the page `head` even before the server generates its content, although caching makes this detail irrelevant in the next pre-loading examples.
- The server serves only the semi-static part to the page in response to the initial request.
- The client sends a second request to get the dynamic part.
  - Pre-loading is used so that the client can request the dynamic page part as soon as it gets the page `head`.
- The server can start loading the semi-static page part as soon as it receives the first request, but it starts loading the dynamic page part after an additional network round trip with the client

<div class="slide">
    <img loading="lazy" src="/blog/sfeir-share-2026-04-16/slide-1-3-en.svg" style="top:0; left:0; width:100%;" />
</div>

---

## Comparison (1)

If we compare the pre-loading and the streaming approaches, it looks like streaming is the winner here because it starts loading the page's dynamic content earlier.

Now let's look what happens when we add caching.

<div class="slide">
    <img loading="lazy" src="/blog/sfeir-share-2026-04-16/slide-1-4-en.svg" style="top:0; left:0; width:100%;" />
</div>

---

## Caching

Now let's add two layers of cache:

- A CDN/Edge node between the client and the server.
  - The edge node is close to the client in order to reduce latency for cached content
- A server-side cache which is used in case the edge cache can't be used.

<div class="slide">
    <img loading="lazy" src="/blog/sfeir-share-2026-04-16/slide-2-0-en.svg" style="top: 0; left: 0%; width: 100%;" />
</div>

---

### Streaming with caching

Let's look at the loading timeline for the streamed full-page version:

- The head element and the semi-static page part cannot benefit from the edge cache because they are bundled with the non-cacheable dynamic part as a single resource.
  - The semi-static page part is served from the server cache, hence the faster loading.
- The script can now be loaded from the edge, instead of the server, which reduces its loading time.

<div class="slide">
    <img loading="lazy" src="/blog/sfeir-share-2026-04-16/slide-2-1-en.svg" style="top: 0; left: 0%; width: 100%;" />
</div>

---

### Pre-loading with caching

Now let's look at the loading timeline for the split-page with pre-loading:

- The semi-static page part is served from the edge cache which reduces latency.
  - The head of the page is loaded earlier. The client can start loading the dynamic part earlier than without the edge cache.
  - The script starts loading earlier too, and is loaded from the edge with reduced latency.

<div class="slide">
    <img loading="lazy" src="/blog/sfeir-share-2026-04-16/slide-2-2-en.svg" style="top: 0; left: 0%; width: 100%;" />
</div>

---

## Comparison (2)

"If we compare both approaches in the presence of the edge cache, we can see that the split-page with pre-loading version wins over the streaming version in terms of First-Paint and final load. The client receives the semi-static content and static script earlier, clearing the way for faster dynamic content processing.

<div class="slide">
    <img loading="lazy" src="/blog/sfeir-share-2026-04-16/slide-2-3-en.svg" style="top: 0; left: 0%; width: 100%;" />
</div>

---

## Edge-Side Page Assembly (For Better Caching)

We saw that the streaming approach could not take full advantage of the edge cache because both semi-static and dynamic page parts are bundled as a single resource.

This problem can be solved by doing some computation at the edge. Among the possible solutions, I cite:

- [Edge Side Includes (ESI)](https://en.wikipedia.org/wiki/Edge_Side_Includes), designed in the early 2000s, are special HTML tags that are interpreted at the edge to allow injecting dynamic content into a cached page.
- More recently, [Next.js](https://nextjs.org/) implemented [Partial Pre-rendering (PPR)](https://vercel.com/blog/partial-prerendering-with-next-js-creating-a-new-default-rendering-model) which serves cacheable page components from the edge cache and streams the dynamic content from the origin server. PPR is only available on Vercel edge infrastructure.
- Today, many JavaScript frameworks can run entirely at the edge. Frameworks that support streaming can therefore stream from the edge and take advantage of the edge cache.

<div class="slide">
    <img loading="lazy" src="/blog/sfeir-share-2026-04-16/slide-3-0-en.svg" style="top: 0; left: 0%; width: 100%;" />
</div>

---

### Streaming with Edge-side page assembly

Let's see the timeline of the page loading when the page is assembled on the edge.

- Now, the edge can serve the semi-static page part directly from the cache
- To get the dynamic page part, the edge fetches a different resource (URL) from the server, but then streams the response to the client as part of the original page
- The script is now loaded early, just like with the pre-loading version

<div class="slide">
    <img loading="lazy" src="/blog/sfeir-share-2026-04-16/slide-3-1-en.svg" style="top: 0; left: 0%; width: 100%;" />
</div>

---

## Comparison (Edge-Side Page Assembly)

Now, thanks to edge-side page assembly, the full-page streaming approach recovers its edge over the pre-loading version, because it is as efficient at loading the semi-static page part, and the dynamic page part starts loading earlier.

<div class="slide">
    <img loading="lazy" src="/blog/sfeir-share-2026-04-16/slide-3-2-en.svg" style="top: 0; left: 0%; width: 100%;" />
</div>

---

## Returning users with a fresh cache

### Streaming with Edge-side page assembly, for returning users

Now let's examine what happens when a returning user revisits our streamed page with a fresh cache.

- The edge re-sends the static page content from its cache.
- As soon as the client receives the page head, it can start executing the script it already has in its cache.
  - The script doesn't need to get downloaded, only executed, which is faster.

<div class="slide">
    <img loading="lazy" src="/blog/sfeir-share-2026-04-16/slide-4-0-en.svg" style="top: 0; left: 0%; width: 100%;" />
</div>

---

### Pre-loading with caching, for returning users

When a user revisits our pre-loaded page with a fresh cache, things are a bit different:

- Thanks to the semi-static page part being cached on the client, the client can start rendering the page and executing the script at T=0s.
  - Both the semi-static page part and the script take less time to load because they don't need to be downloaded.
- The client also starts pre-loading the dynamic page part at T=0s which is optimal.

<div class="slide">
    <img loading="lazy" src="/blog/sfeir-share-2026-04-16/slide-4-1-en.svg" style="top: 0; left: 0%; width: 100%;" />
</div>

---

## Comparison (Returning users)

For returning users with a fresh cache, pre-loading gives earlier First-Paint than streaming. Pre-loading manages to load the page's dynamic part as fast as streaming too.

<div class="slide">
    <img loading="lazy" src="/blog/sfeir-share-2026-04-16/slide-4-2-en.svg" style="top: 0; left: 0%; width: 100%;" />
</div>

---

## Takeaways

What we can conclude from all of this is that both full-page streaming and split-page with pre-loading techniques improve page loading performance. Pre-loading wins over streaming and vice-versa in different contexts:

- Pre-loading is the winner for returning users with a fresh browser cache, because static and semi-static content are processed immediately, and dynamic content is fetched with no added latency.
- Otherwise,
  - Without edge-side caching, the winner is streaming, because it starts loading page data, semi-static and dynamic, sooner.
  - With edge-side caching, the winner is pre-loading, because it can serve cacheable page content early from the edge,
    - Except if we use edge-side page assembly, in which case the winner is streaming.

<div class="slide">
    <img loading="lazy" src="/blog/sfeir-share-2026-04-16/slide-5-0-en.svg" style="top: 0; left: 0%; width: 100%;" />
</div>

---

## Support in mainstream frameworks

- Streaming requires framework support.
  - The good thing is that increasingly more frameworks support it
- Streaming while taking advantage from the edge cache is possible in:
  - Next.js via edge-side page assembly (via PPR)
  - Frameworks that support streaming when deployed at the edge.
- Pre-loading works well with traditional edge caching
  - It does not require framework support. But for optimal developer experience, framework support is needed:
    - Server functions make it possible to call backend code from the frontend in a type safe way without having to declare endpoints. But to support both using server functions and pre-loading, the framework must provide at least APIs to get server function URLs. Currently, these APIs are either absent or not documented
  - Astro's server islands are the closest thing to implementing the split-page with pre-loading pattern with first-class DX.

<div class="slide">
    <img loading="lazy" src="/blog/sfeir-share-2026-04-16/slide-5-1-en.svg" style="top: 0; left: 0%; width: 100%;" />
</div>

---

<div class="slide">
    <img loading="lazy" src="/blog/sfeir-share-2026-04-16/slide-5-2-en.svg" style="top: 0; left: 0%; width: 100%;" />
</div>
