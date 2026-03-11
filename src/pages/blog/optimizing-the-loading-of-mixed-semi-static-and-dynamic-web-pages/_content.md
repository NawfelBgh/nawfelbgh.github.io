# Optimizing The Loading Of Mixed Semi-Static And Dynamic Web Pages. Or: Do Not Jump Straight To Streaming.

## Introduction

Web pages often contain dynamic parts which change frequently and whose content may depend on the user, and they contain also semi-static parts which change infrequently and which are the same for all users.

Recently released JavaScript frameworks, and pioneers like MarkoJS, can optimize performance by streaming different parts of the page progressively to the user. Although an effective optimization, I argue in this article that we should reach for streaming only after taking into account a more important optimization: Caching. 

In my article, [How to make fast web frontends](/blog/web-frontend-performance), I classified optimization techniques broadly into 2 categories:

- Techniques which speed up loading by reducing the work necessary to deliver the content. of these techniques, Caching is a prime example.
- Techniques which do not necessarily reduce work but instead reduce user wait time by scheduling resources loading intelligently. Both Pre-Loading and HTTP-streaming fall into this category.
    - With HTTP-streaming, the server can start loading all page parts in parallel as soon as it receives the client's request.
    - With Pre-Loading, the client can start fetching page parts as soon as it receives the page page's headers or its head element.

Although HTTP-streaming can start fetching resources earlier than pre-loading, it has some disadvantages which Pre-Loading completely avoids:

- Being a form of inlining, HTTP-streaming [hiders caching](/blog/web-frontend-performance#25-bundling-resources): The highly cacheable semi-static page parts cannot benefit from HTTP caching as they are bundled with delivered the dynamic parts in a single URL.
- HTTP-streaming requires support at the framework level, and may require non standard edge runtimes for the best performance.

So in this article, I compare the performance of page loads when using Pre-Loading versus HTTP-Streaming, both combined with Caching, using diagrams produced by simulation. I aim to show that both can achieve similar performance.

<!--
## On the interactions between optimizations

In my article [How to make fast web frontends](/blog/web-frontend-performance), I classified optimizations broadly into those which reduce the work necessary to deliver pages to the user, and those which only reduce user wait time thanks to smart scheduling.

[HTTP response caching](#) is among the first type of optimizations: It saves the server from having to regenerate the same content many times. Also, it saves the network from having to transfer data when the data is already cached in the edge (on a CDN's PoP) or on users devices.

[HTTP response streaming](#) and [Preloading](#) are of the second type. They make web pages load faster by optimizing the scheduling of work: Streaming delivers page parts early to the user, and preloading starts loading page data early.

Streaming can be used to deliver the whole page's content, save for media-files and code, as a response to the page's initial request. Frameworks that support streaming, like Marko, Next.js and SolidJS can be used this way. Used this way, streaming can alleviate the need for preloading page content (although not the sub-resources) because the server can start loading all page parts in parallel as soon as it receives the page's request.

In this article, I explore the tension between this use of streaming and preloading.

Streaming multiple parts of the page as a single HTTP response is a form of [inlining](#). It shares the same benefits: It reduces latency from network back and forth exchanges between the client and the server. But it also shares inlining [disadvantages](#) - It interacts badly with caching: Parts of the page with differing potential for caching have to be cached together (using the shortest cache TTL of all the parts) or not be cached at all.



Another aspect of streaming is that it allows the server to start loading all page parts as soon as it receives the page's request. In contrast, with browser preloading, the server has to wait for the following back and forth exchanges:

- The client request reaching the server
- The server response with preloading annotations reaching the client
- The client request for the preloaded page parts reaching the server.

But as I mentioned in [my previous article](/blog/web-frontend-performance#), when the page is cached on the client, streaming has no latency wins over preloading. And when the page is cached on the edge, streaming offers only a slight latency win over preloading. At the same time, preloading does not carry the latency and over-work penalties that comes from streaming worsening the cache-ability of the page.

So in the next section, we will see a comparison of the performance of streaming and preloading as a mean to deliver pages with mixed static, very cache-able content, and dynamic, less cacheable, content.

## Simulation
-->

## Table of content

- [Introduction](#introduction)
- [Table of content](#table-of-content)
- [Simulation Settings](#simulation-settings)


## Simulation Settings

In the remaining of the article, I'll be showing timeline charts (or Gantt charts) of the page loading of multiple versions of the same web page.
These charts were generated by simulating the client, the server, the network and the database containing the page's data.

The page of interest is composed of 2 parts: One semi-static part which is cacheable, and a dynamic part which is not. The page also loads a script file. It's considered completely loaded once both page parts are loaded, the script is loaded and executed and when both page parts are hydrated/made interactive.

The simulation is produced using the parameters:

| Parameter                             | Value             |
| ------------------------------------- | ----------------- |
| Database Query Duration               | 50 milliseconds   |
| Database Query Response Size          | 50 KB             |
| Render Data To HTML Duration          | 50 milliseconds   |
| Render From HTML Duration             | 50 milliseconds   |
| Render From JSON Duration             | 100 milliseconds  |
| Execute Script Duration               | 200 milliseconds  |
| Hydration Duration                    | 50 milliseconds   |
| Request Size                          | 250 Bytes         |
| Head Size                             | 1 KB              |
| Static HTML Part Size                 | 50 KB             |
| Dynamic HTML Part Size                | 50 KB             |
| Script Size                           | 50 KB             |
| Dynamic JSON Data Size                | 50 KB             |
| Client To Server Network Latency      | 200 milliseconds  |
| Client To Server Network Bandwidth    | 2.5 MB/s          |
| Client To Edge Network Latency        | 50 milliseconds   |
| Client To Edge Network Bandwidth      | 2.5 MB/s          |
| Edge To Server Network Latency        | 150 milliseconds  |
| Edge To Server Network Bandwidth      | 10 MB/s           |

Additionally, the simulations assume that:

- The server and the database are completely idle when the request arrives.
- The server and the database are mono threaded processing requests one at a time.
- The network is completely un-congested.
- The whole network bandwidth is instantly available (no slow starting).
- No additional latency is created by HTTPS handshake
- The page's script is async and therefore non render blocking

## The Base Web Page To Optimize

Let's see the page loading timeline diagrams for 2 unoptimized versions of a web page:

- The first version streams all page content as response to a single URL `full-page`.
- The second version delivers the semi-static page part in response to the URL `split-page`, and then the dynamic part as a response to `dynamic-page-part.json`.


TODO: Maybe instead of the table with numbers make it possible to collapse partly the charts so that we can compare them with eyes

| Page                      | Time To First Byte (ms)   | First Contentful Paint (ms)   | Total Load Time (ms)  |
| ------------------------- | ------------------------- | ----------------------------- | --------------------- |
| `full-page`               | 400                       | ?                             | ?                     |
| `split-page`              | 400                       | ?                             | ?                     |

<figure id="full-page-naive">
    <img
        alt="Streaming naive version"
        src="/blog/optimizing-the-loading-of-mixed-semi-static-and-dynamic-web-pages/simulation/false_false_false_false_false_false_full-page.svg"
        width="1409"
        height="1220"
    />
    <figcaption>
       <p><a href="#full-page-naive">Streaming naive version:</a> ...
       </p>
    </figcaption>
</figure>

<figure id="split-page-naive">
    <img
        alt="Separate semi-static and dynamic resources version"
        src="/blog/optimizing-the-loading-of-mixed-semi-static-and-dynamic-web-pages/simulation/false_false_false_false_false_false_split-page.svg"
        width="1888"
        height="1220"
    />
    <figcaption>
       <p><a href="#split-page-naive">Separate semi-static and dynamic resources version:</a> ...
       </p>
    </figcaption>
</figure>

## Preloading to optimize the split page version

With pre-loading, the loading of the dynamic page part can be [quick-started earlier during the page loading cycle](blog/web-frontend-performance#speeding-up-spas-startup).

<figure id="split-page-preloading">
    <img
        alt="Separate semi-static and dynamic resources version"
        src="/blog/optimizing-the-loading-of-mixed-semi-static-and-dynamic-web-pages/simulation/false_true_false_false_false_false_split-page.svg"
        width="1459"
        height="1220"
    />
    <figcaption>
       <p><a href="#split-page-preloading">Pre-loading dynamic resources version:</a> ...
       </p>
    </figcaption>
</figure>

## The effect of caching on the server

<figure id="full-page-server-caching">
    <img
        alt="Streaming version with server caching"
        src="/blog/optimizing-the-loading-of-mixed-semi-static-and-dynamic-web-pages/simulation/true_true_false_false_true_true_full-page.svg"
        width="1409"
        height="1040"
    />
    <figcaption>
       <p><a href="#full-page-server-caching">Streaming version with server caching:</a> ...
       </p>
    </figcaption>
</figure>

<figure id="split-page-server-caching">
    <img
        alt="Split page version with server caching"
        src="/blog/optimizing-the-loading-of-mixed-semi-static-and-dynamic-web-pages/simulation/true_true_false_false_true_true_split-page.svg"
        width="1459"
        height="1040"
    />
    <figcaption>
       <p><a href="#split-page-server-caching">Split page version with server caching:</a> ...
       </p>
    </figcaption>
</figure>

## The effect of further caching on the edge

<figure id="full-page-edge-caching">
    <img
        alt="Streaming naive version"
        src="/blog/optimizing-the-loading-of-mixed-semi-static-and-dynamic-web-pages/simulation/true_true_true_false_true_true_full-page.svg"
        width="1209"
        height="1600"
    />
    <figcaption>
       <p><a href="#full-page-edge-caching">Streaming version with edge caching:</a> ...
       </p>
    </figcaption>
</figure>

<figure id="split-page-edge-caching">
    <img
        alt="Separate semi-static and dynamic resources version"
        src="/blog/optimizing-the-loading-of-mixed-semi-static-and-dynamic-web-pages/simulation/true_true_true_false_true_true_split-page.svg"
        width="973"
        height="1260"
    />
    <figcaption>
       <p><a href="#split-page-edge-caching">Split page version with edge caching:</a> ...
       </p>
    </figcaption>
</figure>

## Page loading from a returning user with warm client cache

<figure id="full-page-edge+client-caching">
    <img
        alt="Streaming naive version"
        src="/blog/optimizing-the-loading-of-mixed-semi-static-and-dynamic-web-pages/simulation/true_true_true_false_true_false_full-page.svg"
        width="1090"
        height="1480"
    />
    <figcaption>
       <p><a href="#full-page-edge+client-caching">Streaming version for a returning user:</a> ...
       </p>
    </figcaption>
</figure>

<figure id="split-page-edge-caching">
    <img
        alt="Separate semi-static and dynamic resources version"
        src="/blog/optimizing-the-loading-of-mixed-semi-static-and-dynamic-web-pages/simulation/true_true_true_false_true_false_split-page.svg"
        width="873"
        height="900"
    />
    <figcaption>
       <p><a href="#split-page-edge+client-caching">Split page version for a returning user:</a> ...
       </p>
    </figcaption>
</figure>

## Assembling the streamed page on the edge

It is possible to address partially the caching potential that is lost by streaming the page as a whole by streaming the page from a smart edge function. An example implementation of this is Vercel's Next.js [Partial Pre-rendering](https://vercel.com/blog/partial-prerendering-with-next-js-creating-a-new-default-rendering-model): An edge function is installed on the edge (in Vercel's CDN). When a client request hit the edge, the edge function streams the page parts which it has already in its cache, and requests the page parts that it does not have from the origin server. This only solves the problem partially: The data don't have to travel again and again between the server and the edge, but it does have to travel between the edge and the clients.

<figure id="full-page-edge-page-assembly">
    <img
        alt="Streaming naive version"
        src="/blog/optimizing-the-loading-of-mixed-semi-static-and-dynamic-web-pages/simulation/true_true_true_true_true_true_full-page.svg"
        width="923"
        height="1320"
    />
    <figcaption>
       <p><a href="#full-page-edge-page-assembly">Streaming version with edge page assembly:</a> ...
       </p>
    </figcaption>
</figure>

## Conclusion

diagram with, total load time &. 