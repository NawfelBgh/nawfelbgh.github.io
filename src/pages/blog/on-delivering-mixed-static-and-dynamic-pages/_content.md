# On delivering mixed static and dynamic web pages

## Introduction

Web pages often contain static parts, which are the same for all users, an dynamic parts which change depending on the user.

Using cache to deliver the static parts is an effective way to improve performance and reduce server costs. Also, using preloading can help quickstart the loading of the dynamic parts early to reduce the latency of loading the whole page load.

But lately, with more JavaScript Web Frameworks shipping support for HTTP response streaming, it is tempting to use this feature to deliver the static parts while the dynamic parts are still getting generated.

In this article, I first elaborate on the strength and weaknesses of these two strategies: (Caching + Preloading) vs Streaming. Then I present a simulation case study to compare them.

## On the interactions between optimizations

In my article [How to make fast web frontends](/blog/web-frontend-performance), I classified optimizations broadly into those which reduce the work necessary to deliver pages to the user, and those which only reduce user wait time thanks to smart scheduling.

[HTTP response caching](#) is among the first type of optimizations: It saves the server from having to regenerate the same content many times. Also, it saves the network from having to transfer data when the data is already cached in the edge (on a CDN's PoP) or on users devices.

[HTTP response streaming](#) and [Preloading](#) are of the second type. They make web pages load faster by optimizing the scheduling of work: Streaming delivers page parts early to the user, and preloading starts loading page data early.

Streaming can be used to deliver the whole page's content, save for media-files and code, as a response to the page's initial request. Frameworks that support streaming, like Marko, Next.js and SolidJS can be used this way. Used this way, streaming can alleviate the need for preloading page content (although not the sub-resources) because the server can start loading all page parts in parallel as soon as it receives the page's request.

In this article, I explore the tension between this use of streaming and preloading.

Streaming multiple parts of the page as a single HTTP response is a form of [inlining](#). It shares the same benefits: It reduces latency from network back and forth exchanges between the client and the server. But it also shares inlining [disadvantages](#) - It interacts badly with caching: Parts of the page with differing potential for caching have to be cached together (using the shortest cache TTL of all the parts) or not be cached at all.

It is possible to address partially the caching potential that is lost by streaming the page as a whole by streaming the page from a smart edge function. An example implementation of this is Vercel's Next.js [Partial Pre-rendering](https://vercel.com/blog/partial-prerendering-with-next-js-creating-a-new-default-rendering-model): An edge function is installed on the edge (in Vercel's CDN). When a client request hit the edge, the edge function streams the page parts which it has already in its cache, and requests the page parts that it does not have from the origin server. This only solves the problem partially: The data don't have to travel again and again between the server and the edge, but it does have to travel between the edge and the clients.

Another aspect of streaming is that it allows the server to start loading all page parts as soon as it receives the page's request. In contrast, with browser preloading, the server has to wait for the following back and forth exchanges:

- The client request reaching the server
- The server response with preloading annotations reaching the client
- The client request for the preloaded page parts reaching the server.

But as I mentioned in [my previous article](/blog/web-frontend-performance#), when the page is cached on the client, streaming has no latency wins over preloading. And when the page is cached on the edge, streaming offers only a slight latency win over preloading. At the same time, preloading does not carry the latency and over-work penalties that comes from streaming worsening the cache-ability of the page.

So in the next section, we will see a comparison of the performance of streaming and preloading as a mean to deliver pages with mixed static, very cache-able content, and dynamic, less cacheable, content.

## Simulation

