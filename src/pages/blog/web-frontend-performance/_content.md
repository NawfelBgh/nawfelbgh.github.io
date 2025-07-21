# How to make fast web frontends

## Introduction

In this article, I will discuss techniques for optimizing the performance of web frontends.
There are many reasons to focus on this:

- Reducing costs for the website owners and the users
- Providing users with a smooth and enjoyable browsing experience
- Avoiding penalties from search engines that prioritize fast-loading sites
- Ensuring accessibility for users with slow devices and networks
- Reducing the environmental impact of web-based services

The article is structured as follows:

- I start by presenting the physical components underlying the web, highlighting its environmental impact.
- Next, I explore optimization strategies that work by reducing the workload required to deliver web content.
- Finally, I discuss strategies for scheduling tasks efficiently to minimize user wait times.

The focus in this article is to explain how various optimizations work and how different optimizations can help or interfere with each other.

## Table of content

- [Introduction](#introduction)
- [Table of content](#table-of-content)
- [1. The Web as a physical system](#1-the-web-as-a-physical-system)
  - [Frontends contribution to the web’s environmental footprint](#frontends-contribution-to-the-webs-environmental-footprint)
  - [Improving performance by using more powerful hardware](#improving-performance-by-using-more-powerful-hardware)
- [2. Optimizing performance by doing less work](#2-optimizing-performance-by-doing-less-work)
  - [2.1. Performance through minimalism](#21-performance-through-minimalism)
  - [2.2. Caching](#22-caching)
    - [HTTP caching](#http-caching)
    - [Fresh and stale cached data](#fresh-and-stale-cached-data)
    - [Revalidating stale data in the background](#revalidating-stale-data-in-the-background)
    - [Client-requested cache revalidation](#client-requested-cache-revalidation)
    - [Cache busting](#cache-busting)
    - [Caching the static portions of webpages](#caching-the-static-portions-of-webpages)
    - [Service Workers](#service-workers)
    - [Caching in interactive WebApps](#caching-in-interactive-webapps)
    - [Caching compiled code](#caching-compiled-code)
  - [2.3. Compression](#23-compression)
    - [HTTP responses compression](#http-responses-compression)
    - [HTTP headers compression](#http-headers-compression)
  - [2.4. Content Delivery Networks](#24-content-delivery-networks)
  - [2.5. Bundling resources](#25-bundling-resources)
    - [Bundling in the HTTP/2+ era](#bundling-in-the-http2-era)
  - [2.6. Reducing content size](#26-reducing-content-size)
    - [Image optimization](#image-optimization)
    - [Subsetting web font files](#subsetting-web-font-files)
  - [2.7. Reducing client-side code size](#27-reducing-client-side-code-size)
    - [2.7.1. Using optimizing bundlers](#271-using-optimizing-bundlers)
      - [Minification](#minification)
      - [Tree-shaking](#tree-shaking)
    - [2.7.2. Using small libraries and small third-party scripts](#272-using-small-libraries-and-small-third-party-scripts)
    - [2.7.3. Keeping code in the server](#273-keeping-code-in-the-server)
      - [Server-side and client-side rendering](#server-side-and-client-side-rendering)
      - [Partial hydration](#partial-hydration)
  - [2.8. Reducing CPU work in the client](#28-reducing-cpu-work-in-the-client)
    - [2.8.1. Optimizing layout and reflow](#281-optimizing-layout-and-reflow)
      - [Layout thrashing](#layout-thrashing)
      - [Overreacting to user inputs](#overreacting-to-user-inputs)
      - [Animating the wrong kind of CSS properties](#animating-the-wrong-kind-of-css-properties)
      - [Complex CSS and big DOM](#complex-css-and-big-dom)
    - [2.8.2. Client-side navigation](#282-client-side-navigation)
    - [2.8.3. Using WebAssembly](#283-using-webassembly)
      - [Control over Memory layout](#control-over-memory-layout)
      - [Dynamic vs Static Typing](#dynamic-vs-static-typing)
      - [Human-readable vs Binary code](#human-readable-vs-binary-code)
- [3. Scheduling work to make users wait less](#3-scheduling-work-to-make-users-wait-less)
  - [3.1. Do not block the UI thread](#31-do-not-block-the-ui-thread)
  - [3.2. Streaming](#32-streaming)
    - [Gradual content delivery with streaming](#gradual-content-delivery-with-streaming)
    - [Unlocking Parallelism with Streaming](#unlocking-parallelism-with-streaming)
    - [Out-Of-Order Streaming](#out-of-order-streaming)
    - [Beyond HTTP response streaming](#beyond-http-response-streaming)
  - [3.3. Preloading](#33-preloading)
    - [Preloading web fonts](#preloading-web-fonts)
    - [Speeding up SPAs startup](#speeding-up-spas-startup)
    - [Speeding up client-side navigation](#speeding-up-client-side-navigation)
  - [3.4. Deferring non-critical resources](#34-deferring-non-critical-resources)
  - [3.5. Lazy loading](#35-lazy-loading)
- [Conclusion](#conclusion)

## 1. The Web as a physical system

In this first chapter, I would like to highlight the environmental impact of the web as a motivation to focus on software performance optimizations. As mentioned in the introduction, there are many user-centric and business-centric reasons to improve web performance. However, I find that these enjoy [extensive coverage](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Performance/why_web_performance) already. Additionally, emphasizing the physical systems behind the web helps demonstrate that software optimizations ultimately conserve physical resources.

The [World Wide Web](https://en.wikipedia.org/wiki/World_Wide_Web) is a major user of the [Internet](https://en.wikipedia.org/wiki/Internet): a gigantic distributed system of machines and network infrastructure.
Like any other physical system, the Internet competes for resources with other human activities and with the natural world more broadly.

The hardware components making the Internet require physical resources and generate waste throughout their entire lifecycle: During mining and manufacturing, during their usage, and finally when they are disposed of.

One measure of the environmental footprint of the Internet is its carbon emissions: estimated around 4% of global carbon emissions, which is comparable to the entire aviation industry (See: [Introduction to web sustainability](https://developer.mozilla.org/en-US/blog/introduction-to-web-sustainability/)).

<figure id="figure-physical-web">
    <img
        alt="Web infrastructure"
        src="/blog/web-frontend-performance/physical-web.svg"
        width="900"
        height="600"
    />
    <figcaption>
       <p><a href="#figure-physical-web">The Web as a system with Physical components:</a> This figure shows components of the infrastructure of the Web: Servers, users' devices and network relay devices. It shows also that the web is embedded in a natural system. Space and resources are taken from nature to build and run the infrastructure of the Web. This is represented here by a mine, a factory and solar panels.</p>
       <p>
       This figure also highlights that not everybody has access to the same level of service in the web: A rich user has a more powerful machine and is connected to the web via faster network connections compared to less rich users.
       </p>
    </figcaption>
</figure>

### Frontends contribution to the web's environmental footprint

Studies [Environmental footprint of the digital world (2019)](https://www.greenit.fr/environmental-footprint-of-the-digital-world/) and [Estimating Digital Emissions (2023)](https://sustainablewebdesign.org/estimating-digital-emissions/) estimate that user devices have larger environmental impact than both networks and data centers, and that networks have a greater impact than data centers. This makes sense given the sheer number of user devices, the size of the network infrastructure, and the fact that manufacturing the devices is a big contributor to their environmental impact.

Based on these estimations, it appears that frontend developers have both the power and the responsibility to reduce the environmental impact of the web.

<figure id="figure-emissions-breakdown">
    <img
        alt="Emissions breakdown of the web's infrastructure"
        src="/blog/web-frontend-performance/energy-footprint-breakdown.svg"
        width="600"
        height="600"
    />
    <figcaption>
        <p>
            <a href="#figure-emissions-breakdown">The breakdown of emissions per tier and per lifecycle phase:</a> This figure showcases data from the article <a href="https://sustainablewebdesign.org/estimating-digital-emissions/">Estimating Digital Emissions (2023)</a>.
        </p>
        <p>
            It is estimated that data centers consume 22% of the energy of the web infrastructure, networks consume 24% and user devices dominate the mix consuming 54%.
        </p>
        <p>
            It is also estimated that both data centers and networks emit 18% greenhouse gases during manufacturing and 82% during operation.
            As for user devices, they emit 51% greenhouse gases during manufacturing and 49% during operation.
        </p>
    </figcaption>
</figure>

### Improving performance by using more powerful hardware

One way to make web applications run faster is by using more powerful hardware:

- Upgrading users' devices,
- Using faster networks,
- Upgrading server machines, and
- Using more server machines.

Relying on hardware upgrades to solve performance issues should be a considered after software optimizations as it can be costly financially and/or from an environmental point of view.

<figure id="figure-physical-web-bigger">
    <img
        alt="Bigger Web Infrastructure"
        src="/blog/web-frontend-performance/physical-web-bigger.svg"
        width="900"
        height="600"
    />
    <figcaption>
       <p><a href="#figure-physical-web-bigger">Expending the Web Infrastructure in size:</a> This figure shows a similar infrastructure to the one from <a href="#figure-physical-web">the previous figure</a>. Here, the servers and the network relay devices are more powerful. This is depicted using bigger sizes. The network connections are of bigger capacity. Users devices and connection speed increased a little bit, and the rich user's increased even more.
       </p>
       <p>
       In order to support the growth of the infrastructure of the Web, more space is taken from nature. This is depicted here with a larger mine, more solar panels and factories, and with the reduced presence of wild life.
       </p>
       <p>
       The facial expressions of the 3 characters in this figure mirror those from the previous one, highlighting that, even with system performance improvements, users may not always perceive the change. This is due to <a href="https://en.wikipedia.org/wiki/Hedonic_treadmill">hedonic adaptation</a> (The shifting of the baseline human expectation) and to <a href="https://en.wikipedia.org/wiki/Jevons_paradox">Jevons paradox</a> (The nullification of gains from efficiency because of the increase in consumption). This critique applies to performance improvements achieved through hardware upgrades or through software optimizations. However, hardware upgrades come at a higher environmental cost.
       </p>
    </figcaption>
</figure>

Having brought into attention the physical components that make up the web, let's explore some frontend optimizations techniques that reduce their workload.

---

## 2. Optimizing performance by doing less work

In this chapter, I present techniques that reduce the workload for server machines, user devices, and the network, by shifting work within the system as to:

- make efficient use of available hardware resources,
- reduce the overall work required in the whole system,
- and reduce the time needed to serve the frontend to the user.

### 2.1. Performance through minimalism

Before diving into the technical side of things, it is worth mentioning minimalism as a non technical, or a less technical, solution to make frontends fast.

Bloat is a very well known phenomenon in [software in general](https://en.wikipedia.org/wiki/Software_bloat) and in the web in particular. According to [the HTTP Archive](https://httparchive.org/reports/page-weight#bytesTotal), as of june 2025, the median desktop web pages loads 2.8 MB of data (5.8 times the size of the median web page from early 2011).

On this subject, I recommend Maciej Cegłowski's hilarious talk: [The Website Obesity Crisis](https://idlewords.com/talks/bsite_obesity.htm):

> <a href="https://x.com/pinboard/status/653714626857730048" target="_blank">Maciej's modest proposal</a>: your website should not exceed in file size the major works of Russian literature. Anna Karenina, for example, is 1.8 MB

Minimalism is one way to approach this issue of web bloat. It is encouraged in [Sustainable Web design](https://stainablewebdesign.org/) and the [eco-sufficiency](https://en.wikipedia.org/wiki/Eco-sufficiency) spheres, where people question the usefulness (to the site owner and to the users) of the content delivered by websites and applications. They ask questions like:

- Is this image or this script really useful
- Does this image or script have to be this big
- Is this old content, or say this polyfill script, still relevant today or should we remove it

[Sustainable Web design](https://sustainablewebdesign.org/) goes beyond minimalism. It encompasses user experience design, carbon intensity and also the technical solutions addressed in the rest of this article.

---

### 2.2. Caching

Caching is a powerful tool for optimizing performance. Instead of repeatedly performing the same task, such as sending identical data to the client over and over or regenerating the same page on the server multiple times, server responses can be stored in caches on both the client and server sides for reuse when requested again.

This approach sacrifices some memory on the client and server to reduce CPU workload on the server and decrease network bandwidth usage.

Caching can be implemented to some extent without users noticing. However, the best performance gains can only be realized by accepting that some users may not see the most recent version of certain data immediately after it is published: Clients are instructed to store and reuse a response until a certain expiration time without contacting the server. During that period, users may not see the latest content on the server.

As a result, caching decisions should not be made by developers alone; input from the product owner is crucial. Both developers and product owners need to understand the level of cache control that web technologies offer and what is acceptable for different types of resources on their websites and applications to implement effective caching.

#### HTTP caching

To support [caching requirements](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching), the HTTP protocol provides a range of [standard headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers). For example:

- Response [Cache-Control](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control) headers allow servers to tell clients and intermediary caches (between servers and clients) when they can store and reuse servers' responses, and for how long,
- Request Cache-Control headers allow clients to ask intermediary caches to reach to the origin server to get fresher content,
- Other response headers such as `Last-Modified` and `ETag` and request headers such as `If-Modified-Since` and `If-None-Match` allow implementing [conditional requests](https://developer.mozilla.org/en-US/docs/Web/HTTP/Conditional_requests) as we will see shortly.

Caching can be done both by clients and intermediary servers. Cache-Control headers can mark responses as private, making them cacheable by the end users' browsers only, or as public making them cacheable by intermediary servers too. This allows both public content and private and/or user-customized content to benefit from caching.

<figure id="caching-with-shared-cache">
    <img
        alt="Caching with shared cache"
        src="/blog/web-frontend-performance/caching-with-shared-cache.svg"
        width="1080"
        height="700"
    />
    <figcaption>
       <a href="#caching-with-shared-cache">Shared and private caches</a>: In this example, when the server responds to Client 1's request, both the shared cache and Client 1's private cache save the response. When Client 2 requests the same data, the shared cache responds without contacting the origin server, and Client 2's private cache saves the response as well. When both Clients 1 and 2 need the same data again, they can reuse the version saved in their private caches without requiring any network traffic. The origin server generates this piece of data only once.
    </figcaption>
</figure>

##### Fresh and stale cached data

When an HTTP response is stored in a cache, it remains fresh for a certain duration. Once that duration is elapsed, the response becomes stale. If the freshness duration is not specified by a `Cache-Control: max-age` header or an `Expires` header, caches will choose it heuristically.
Additionally, the freshness duration can be explicitly set to 0 (using `Cache-Control: max-age=0`), which makes the cached response stale immediately.

Cached responses that are still fresh can be reused on subsequent requests without soliciting the server. This eliminates the following steps:

- Sending a request to the server
- Waiting for the server to respond
- Receiving the server's response

Stale responses can also be reused, but the cache has to revalidate them first by sending a [conditional request](https://developer.mozilla.org/en-US/docs/Web/HTTP/Conditional_requests) to the server. The server will either reply with a new response or with an empty response and a `304 Not-Modified` status code, instructing the cache to reuse its stored response.

When making a conditional request, we still have to:

- Send a request to the server
- Wait for the server to respond, although this can be quick if the server determines that the client has up-to-date content
- Receive server response. When it is a `304 Not-Modified` response, it is still advantageous (compared to not using the cache at all) because the client does not need to download the response body again.

<figure id="cache-revalidation">
    <img
        alt="Cache with revalidation"
        src="/blog/web-frontend-performance/cache-revalidation.svg"
        width="1050"
        height="1380"
    />
    <figcaption>
        <p>
            <a href="#cache-revalidation">Cache revalidation</a>: In this example, the user requests a page and receives a 50KB response containing version 1 of the page, which stays fresh in the cache for 10 minutes. The user requests the page a second time after 5 minutes, and since the response stored in the cache is still fresh, the cache sends it to the user. After another 5 minutes, the user requests the page again, but the cached version is now stale. Therefore, the cache sends a conditional request (<code>If-None-Match: "version 1"</code>) to the server to verify that version 1 of the page is still the currently published version. The server sends back a 304 Not Modified header with no body. Seeing this, the cache marks the response it already has as fresh again and uses it to respond to the user.
       </p>
       <p>
            After that, the site editor publishes version 2 of the page. The user requests the page again. They get a version 1 response from the cache instead of version 2 because the cached data is still considered fresh. Finally, the user requests the page which is now stale in the cache. The cache sends another conditional request to the server, the server responds with a new 50KB response containing version 2 of the page, and the cache stores this new version (replacing the old one) and responds to the user with it.
       </p>
    </figcaption>
</figure>

##### Revalidating stale data in the background

`Stale-while-revalidate` (also referred to as SWR) is another cache control option that the server can provide alongside `max-age`. It defines a period during which the cache can respond with stale data while revalidating the content in the background using a conditional request, and therefore hiding the delays associated with the revalidation of cached data.

<figure id="cache-swr">
    <img
        alt="Stale While Revalidate caching mechanism"
        src="/blog/web-frontend-performance/cache-swr.svg"
        width="1020"
        height="1395"
    />
    <figcaption>
        <p>
            <a href="#cache-swr">Stale-while-revalidate</a>: In this example, the user requests a page, and the server responds with the currently published version (version 1), which is then stored in the cache. The server indicates that the response can be considered fresh for 10 minutes, and once it becomes stale, it can still be reused and revalidated in the background for an additional 5 minutes. Later, when the site editor publishes a new version, the user requests the same page again. At this point, the cached version has been stale for less than 5 minutes, so the cache immediately responds to the user with version 1. Meanwhile, it sends a conditional request to the server and subsequently retrieves version 2 of the page.
        </p>
        <p>
            Later, when the user requests the page again, the cache responds with version 2, which is still fresh, making the user perceive the new response as loading instantly. The stale-while-revalidate mechanism has effectively concealed the latency involved in retrieving version 2 of the page from the server.
        </p>
        <p>
            Fifteen minutes later, the user requests the page again. This time, the cached version is stale, and the stale-while-revalidate duration has also expired. As a result, the cache cannot respond to the user until it revalidates the cached version with the server.
        </p>
    </figcaption>
</figure>

##### Client-requested cache revalidation

Clients can ask intermediary caches to [disregard cached responses](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching#reload_and_force_reload) and to reach to the origin server:

- When the user presses the reload page button, the browser sends a conditional request (to revalidate the data it has in its cache) with `Cache-Control: max-age=0` to tell intermediary servers to do the same even if they have fresh data.
- And when the user does a forced reload (typically using the keyboard command Ctrl+Shift+R), the browser sends non-conditional requests with `Cache-Control: no-cache`, telling caches to ignore their stored content and forward the request to the origin server.

<figure id="figure-cache-revalidation-request">
    <img
        alt="Client-requested cache revalidation"
        src="/blog/web-frontend-performance/cache-revalidation-request.svg"
        width="1080"
        height="1000"
    />
    <figcaption>
        <p>
            <a href="#figure-cache-revalidation-request">Client-requested cache revalidation:</a> In this example, the user visits a page containing an image. Both the page and the image are received from a shared cache and are stored in the user's browser local cache.
        </p>
        <p>
            Later when the user navigates back to the page, it is served directly from the browser's cache.
        </p>
        <p>The user then presses Ctrl+Shift+R to trigger a forced reload. Although the page is still fresh in the local cache, the browser ignores its stored version and sends a request with <code>Cache-Control: no-cache</code> header to the server. Seeing this header, the shared cache ignores its stored version and forwards the request to the server which generates the page and sends the response. Once the browser receives the page, it requests the image referenced by the page, always using <code>Cache-Control: no-cache</code> header.
        </p>
    </figcaption>
</figure>

##### Cache busting

[Cache busting](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching#cache_busting) is a caching strategy commonly used to address the dilemma of having to choose between short and long cache freshness durations (`max-age`):

- Short `max-age`s allow users to see updated content soon after it is published, at the expense of increased traffic reaching the server.
- Long `max-age`s take more advantage of caching benefits, but make it harder to deliver updated content to the users.

Cache busting works as follows:

- Sub-resources, such as images, scripts and style sheets, that do not need fixed URLs:
  - have their versions encoded in their URLs (for example: `/path/to/file.css?version=1.0`),
  - they are served with a very long `max-age`,
  - and when new versions of these files are published, they are published on new URLs (for example: `/path/to/file.css?version=1.1`).
- As for webpages with user-visible URLs:
  - they are updated whenever their content changes and whenever some of their URL-versioned sub-resources are updated,
  - and they are given a short cache `max-age`, thanks to which, users get to see updated versions fast.

<figure id="figure-cache-busting">
    <img
        alt="Cache busting"
        src="/blog/web-frontend-performance/cache-busting.svg"
        width="1125"
        height="1600"
    />
    <figcaption>
        <p>
            <a href="#figure-cache-busting">Cache busting:</a> In this example, the client requests a page and receives a response that expires in 10 minutes. The page requests a script file <code>/navbar.js?version=1</code> and receives a response that can be reused for a whole year.
        </p>
        <p>
            The site editor publishes a new version of the page. The client requests the same page again, but since its cached version has expired, it reaches out to the server and gets the new page. The page requests the same script file again, which is delivered from the cache, as it remains fresh for a year.
        </p>
        <p>
            The site editor publishes a newer version of the page. The client requests the page again and reaches out to the server to retrieve it. The page requests a new script file this time (<code>/navbar.js?version=2</code>), which is downloaded from the server and cached to be reused for up to one year.
        </p>
    </figcaption>
</figure>

Cache busting, as explained so far, can be further optimized:

- Since sub-resources can link to other sub-resources, updating a sub-resource downstream requires not only republishing it with a new URL, but also republishing all sub-resources that link to it, recursively, which can invalidate many cached files. Import maps can be used to [solve this problem for javascript modules](https://spidermonkey.dev/blog/2023/02/23/javascript-import-maps-part-1-introduction.html), and Service Workers can [solve this problem more generally](https://banno.com/articles/improving-caching-with-import-maps/)

- Wikipedia, being one of the largest and most visited websites, want to cache their pages for as long as possible and cannot afford to update all their pages whenever a script or a style file is modified. So, [they implement cache busting as follows](https://www.mediawiki.org/wiki/ResourceLoader/Architecture): Their pages load a startup script from a fixed URL, and it is this startup script that points to versioned and cache-busted sub-resources. The startup script has a `max-age` of 5 minutes. This way, pages can have long `max-age`s while still being able to load newly published sub-resources (Basically the [fundamental theorem of software engineering](https://en.wikipedia.org/wiki/Fundamental_theorem_of_software_engineering) in work).

##### Caching the static portions of webpages

Web pages often contain both static elements, which are the same for all users, and dynamic elements that vary based on individual user sessions. For example, on a product page of an e-commerce site, the static elements would be the product details, while the dynamic elements would consist of the contents of the user's shopping basket, along with action forms that are secured by session-specific [CSRF](https://en.wikipedia.org/wiki/Cross-site_request_forgery) tokens.

We want to leverage caching for the static elements while still being able to provide personalized dynamic content. One approach to achieve this is to include only the static elements in the main HTML document, which can be cached on the client side and in intermediary caches. And to retrieve the dynamic parts of the page, additional requests are made, introducing some added loading latency.

For examples of how to do this, check out:

- [Caching the Uncacheable: CSRF Security (2014)](https://www.fastly.com/blog/caching-uncacheable-csrf-security): This article explains how to inject dynamic, user-specific CSRF tokens into cached HTML pages.
- Features from different frameworks allowing webpages to fetch page parts using separate HTTP requests:
  - [Hotwire Turbo](https://turbo.hotwired.dev/)'s [Frames](https://turbo.hotwired.dev/handbook/introduction#turbo-frames%3A-decompose-complex-pages).
  - [HTMX](https://htmx.org/)'s [Lazy Loading](https://htmx.org/examples/lazy-load/) feature.
  - [Unpoly](https://unpoly.com/)'s [deferred fragments](https://unpoly.com/lazy-loading).
  - [Astro](https://astro.build/)'s [Server Islands](https://docs.astro.build/en/guides/server-islands/).

<figure id="figure-cache-static-parts">
    <img
        alt="Fetching dynamic page parts with a separate request"
        src="/blog/web-frontend-performance/cache-static-parts.svg"
        width="1125"
        height="750"
    />
    <figcaption>
        <p>
            <a href="#figure-cache-static-parts">Fetching dynamic page parts with a separate request:</a> In this example, the client requests a page and receives a response from a shared cache. The page includes a script that fetches the dynamic parts of the page using a second request. This second request reaches the server, which responds with a non-publicly-cacheable response.
        </p>
        <p>
            Later on, the client requests the page again. This time, the page is loaded directly from the client's cache, and a request is sent to retrieve the dynamic parts from the server.
        </p>
    </figcaption>
</figure>

#### Service Workers

Since 2018, all major browsers support the [Service Worker](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API) and [Cache Storage](https://developer.mozilla.org/en-US/docs/Web/API/CacheStorage) APIs. The former API allows websites to register a JavaScript worker in the user's browser. This worker acts like a proxy server intercepting and responding to client network requests. As for the Cache Storage API, it allows web applications to programmatically manage a cache. Together, those APIs make it possible to write offline web applications and to implement caching rules that go beyond what is possible in standard HTTP.

#### Caching in interactive WebApps

In interactive [AJAX](<https://en.wikipedia.org/wiki/Ajax_(programming)>)-heavy web applications, it belongs to the client-side JavaScript code to decide when to load and reload data from the server. For example, it can automatically reload data after a certain time interval or after the user performs an action that writes to the database in the server.

This data loading and reloading by client-side code can be seen as a form of cache management, where the data loaded on the client is a cached version of server's data. Many developers in the JavaScript community reach for the [TanStack Query](https://tanstack.com/query/latest/docs/framework/react/overview) library, which provides APIs for cache management, as well as DevTools and integrations with various web frameworks.

#### Caching compiled code

Browsers do not only cache server responses; they can also cache compiled JavaScript code to optimize the startup time of frequently used web applications. For more information on this, check out the following articles by the [Chromium](https://v8.dev/blog/code-caching) and [Firefox](https://blog.mozilla.org/javascript/2017/12/12/javascript-startup-bytecode-cache/) teams.

---

### 2.3. Compression

#### HTTP responses compression

[Compressing HTTP responses](https://developer.mozilla.org/en-US/docs/Web/HTTP/Compression) can substantially reduce network usage. This feature is implemented by practically all web browsers, as well as most popular web server stacks and web hosting services, making its activation a matter of proper server configuration.

HTTP response compression works through content negotiation between clients and servers:

- Clients send the list of the compression formats they support using the `Accept-Encoding` request header,
- Servers can choose to compress their responses using an algorithm that both they and the client support.
  - They indicate which algorithm they used with the `Content-Encoding` response header.
  - They also send the `Vary` response header to instruct caches to treat requests to the same URL but with different `Accept-Encoding` header values as separately cacheable entities.

<figure id="figure-response-compression">
    <img
        alt="Cache busting"
        src="/blog/web-frontend-performance/content-negociation.svg"
        width="1050"
        height="930"
    />
    <figcaption>
        <p>
            <a href="#figure-response-compression">HTTP response compression:</a> In this example, Client 1, which supports gzip compression, requests a web page. The server sends a gzip-compressed response, which the shared cache saves for later reuse.
            Client 2, which also supports gzip compression, requests the same page and receives a response directly from the cache.
        </p>
        <p>
            Client 3, which supports Brotli compression (br), requests the same page. This time, the shared cache cannot reuse the gzip-compressed version, so it forwards the request to the server. The server sends a new response compressed with Brotli, which the shared cache saves for later reuse without overwriting the gzip response.
        </p>
        <p>
            When Clients 2 and 3 request the page again, the cache is able to provide a response to both of them without having to reach out to the server.
        </p>
    </figcaption>
</figure>

Note that not all resources need to use HTTP compression: Some file formats, such as images and video files, are already compressed. Therefore, recompressing them again would waste CPU cycles and can increase their sizes (although slightly).

#### HTTP headers compression

In addition to response body compression, the HTTP protocol introduced header compression via the [HPACK](https://www.rfc-editor.org/rfc/rfc7541.html) format in [HTTP/2](https://en.wikipedia.org/wiki/HTTP/2) and later via the [QPACK](https://www.rfc-editor.org/rfc/rfc9204.html) format in [HTTP/3](https://en.wikipedia.org/wiki/HTTP/3). Header compression is implemented by browsers and the HTTP stack of web servers, requiring no effort from web developers. That said, knowing that it exists and how it works can inform some optimization decisions.

Headers compression uses:

- A static dictionary containing a set of commonly used header fields,
- Per-connection dynamic dictionaries that are kept in sync between the client and the server, storing previously sent header fields.

Request and response header fields can be encoded either literally or, when possible, using indices that reference entries in the static or dynamic dictionaries.

By using dynamic dictionaries, headers that are repeatedly sent such as cookies can be sent only once during the lifetime of an HTTP connection, reducing network usage compared to HTTP/1.1, where they need to be sent with every request.

Thanks to headers compressing:

- It is possible to forgo the practice of hosting static content in cookie-less domains - an optimization used in HTTP/1.1 to avoid the cost of cookie retransmission.
- The overhead from patterns like authorization via [JSON Web Tokens (JWT)](https://en.wikipedia.org/wiki/JSON_Web_Token) is greatly reduced, removing barriers to using stateless and scalable server architectures.

<figure id="figure-hpack">
    <img
        alt="HPack HTTP header compression"
        src="/blog/web-frontend-performance/hpack.svg"
        width="1150"
        height="1230"
    />
    <figcaption>
        <p>
            <a href="#hpack">Header compression using HPACK:</a> In this example, the client requests two resources (the index page <code>"/"</code> and <code>"/favicon.ico"</code>) from the server using the large cookie header each time.
        </p>
        <p>
            In the first request (to <code>"/"</code>), the client encodes the cookie value literally in HPACK format tagging it with the HPACK <code>store</code> command so that both it and the server store the cookie value in the HTTP session's dynamic table. The HPACK store command adds an overhead of 3 bytes here to encode the length of the cookie string.
        </p>
        <p>
            In the second request (to <code>/favicon.ico</code>), the client encodes the cookie header value as a reference to the entry in the dynamic HPACK table. Instead of sending the whole cookie string, only one single byte is send to the server. Notice also that in this second request, the string <code>/favicon.ico</code> was also saved in the dynamic HPACK table, so that later requests to the same resource can replace it with one byte only. Since the string <code>/favicon.ico</code> is short, the HPACK store command adds 2 bytes of overhead.
        </p>
    </figcaption>
</figure>

---

### 2.4. Content Delivery Networks

It takes more time for data packets to travel between the client and the server the longer the distance is between the two. The time data takes to arrive from point A to B is called [network latency](https://developer.mozilla.org/en-US/docs/Web/Performance/Understanding_latency). Technological advancement can reduce latency only to a certain point due to physical limits such as the speed of light: It takes a beam of light approximately [130ms](https://blog.cloudflare.com/http-2-for-web-developers) to travel around the circumference of the Earth.

[Content Delivery Networks](https://en.wikipedia.org/wiki/Content_delivery_network) (CDNs) aim to address the issue of latency caused by the physical distance between servers and clients. A CDN is a group of geographically distributed proxy servers (called Point of Presence or PoP) that sit between the servers (called origin servers) and the clients. CDNs cache origin server responses when possible and deliver them to clients from a nearby PoP.

Typical CDN features include taking care of [TLS termination](https://en.wikipedia.org/wiki/TLS_termination_proxy), HTTP caching, and compression, in addition to other features that vary from provider to another.

<figure id="world-map-no-cdn">
    <img
        alt="Without CDN illustration"
        src="/blog/web-frontend-performance/world-map-no-cdn.svg"
        width="640"
        height="360"
    />
    <figcaption>
       <a href="#world-map-no-cdn">With no CDN:</a> In this example, all requests from users around the world are handled by the origin server, resulting in high latency for users who are far away.
    </figcaption>
</figure>

<figure id="world-map-cdn">
    <img
        alt="With CDN illustration"
        src="/blog/web-frontend-performance/world-map-cdn.svg"
        width="640"
        height="360"
    />
    <figcaption>
       <a href="#world-map-no-cdn">With a CDN:</a> In this example, most requests are handled by PoP servers located close to the users, resulting in low latency for all users. However, a small proportion of requests can only be processed by the origin server, resulting in high latency for distant users.
    </figcaption>
</figure>

---

### 2.5. Bundling resources

Some network latency is introduced each time an HTML document or one of its resources loads other resources. This latency and network overhead can be avoided by embedding resources inline instead of referencing them by URL. Depending on the context, this is referred to as inlining, embedding, concatenation, or bundling. For example:

- HTML documents can contain inline `<script>`, `<style>` and `<svg>` tags.
- HTML, CSS and JavaScript files can embed multimedia files using [data URLs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URLs).
- Stylesheet files can be concatenated.
- JavaScript modules and their dependencies can be bundled together and sent as a single file to the client.
- Multiple images can be combined into a single sprite image that is split back into individual pieces using [CSS](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_images/Implementing_image_sprites_in_CSS) or [SVG](https://www.sitepoint.com/use-svg-image-sprites/) techniques.

<figure id="figure-without-bundling">
    <img
        alt="Without resource bundling"
        src="/blog/web-frontend-performance/without-bundling.svg"
        width="600"
        height="1300"
    />
    <figcaption>
       <a href="#figure-without-bundling">Without resource bundling:</a> In this example, the client requests a page. Receiving the HTML file, it discovers that it needs to load icons 1, 2, and 3, as well as a script file. The client fetches these resources via additional HTTP requests. Once the script is loaded, the client finds that the script depends on another JavaScript module, necessitating yet another request to the server to load this module. The page finishes loading once all six resources are fully loaded.
    </figcaption>
</figure>

<figure id="figure-with-bundling">
    <img
        alt="With resource bundling"
        src="/blog/web-frontend-performance/with-bundling.svg"
        width="600"
        height="850"
    />
    <figcaption>
       <a href="#figure-with-bundling">With resource bundling:</a> In this example, the client requests a page. It discovers when it receives the HTML file that it needs to load the <code>icons-sprite.svg</code> file, which contains icons 1, 2, and 3, as well as a script file that includes both the page's script and its dependencies. The page finishes loading once the HTML, the sprite, and the script are fully loaded.
    </figcaption>
</figure>

As stated previously, the main benefit of bundling is reducing network overhead. In addition to that:

- Concatenating textual files works well in conjunction with compression because compression algorithms can take advantage of redundancy across a whole set of files, yielding better compression ratios compared to when the files are compressed individually.
- JavaScript bundling tools implement optimizations that help reduce the sizes of bundles, as we will see in the section on [Using optimizing bundlers](#271-using-optimizing-bundlers)

However, these gains come at a cost:

- Bundling makes caching less efficient:
  - Resources that are bundled together can only be cached as much as the least cacheable resource. We discussed this earlier in the section [Caching the static portions of webpages](#caching-the-static-portions-of-webpages) where dynamic content is loaded separately from static content to enable the caching of the static content.
  - If a resource is loaded on multiple pages, inlining it in the HTML documents leads to it being downloaded multiple times, and potentially also being cached multiple times.
  - When a single resource inside a bundle is updated, the bundle is updated as a unit, and users have to download the whole thing again.
- Bundling resources together also gives them all the same priority, which can lead to worse loading performance. We will revisit properly prioritizing resources in sections [3.3. Preloading](#33-preloading), [3.4. Deferring non-critical resources](#34-deferring-non-critical-resources) and [3.5. Lazy loading](#35-lazy-loading).

Because of the performance drawbacks of bundling, [some optimization tools](https://www.modpagespeed.com/doc/) implement the opposite optimization: outlining, i.e., extracting inlined elements into their own files.

<figure id="figure-cache-without-inlining">
    <img
        alt="Cache without inlining"
        src="/blog/web-frontend-performance/cache-without-inlining.svg"
        width="700"
        height="475"
    />
    <figcaption>
       <a href="#figure-cache-without-inlining">Caching without inlining:</a> In this example, both non-cacheable dynamic pages, <code>page1.html</code> and <code>page2.html</code>, use the same CSS file, which is properly cached and reused.
    </figcaption>
</figure>

<figure id="figure-cache-with-inlining">
    <img
        alt="Cache with inlining"
        src="/blog/web-frontend-performance/cache-with-inlining.svg"
        width="700"
        height="375"
    />
    <figcaption>
       <a href="#figure-cache-with-inlining">Caching with inlining:</a> In this example, non-cacheable dynamic pages, <code>page1.html</code> and <code>page2.html</code>, each inline the same CSS file into their content, requiring clients to download the styles again with each page visit.
    </figcaption>
</figure>

#### Bundling in the HTTP/2+ era

With the advent of HTTP/2, many web articles declared the death of resource bundling, because:

- HTTP/2 can multiplex the loading of several resources using a single HTTP connection, significantly reducing network overhead. This is an improvement over HTTP/1.1, where HTTP connections can only transmit a single resource at a time and where only a limited number of HTTP connections can be opened simultaneously.
- HTTP/2 defines the [server push extension](https://en.wikipedia.org/wiki/HTTP/2_Server_Push) which allows servers to push resources to the client before the client requests them. When a client requests a page, servers can push the page's sub-resources before the client discovers that it needs them, thereby eliminating some latency without having to bundle resources together.

[Smashing Magazine’s article series on HTTP/3](https://www.smashingmagazine.com/2021/08/http3-core-concepts-part1/) explains in details why bundling is still relevant in HTTP/2 and HTTP/3. Some of the reasons are that:

- Even with multiplexing, requests still incur overhead.
- HTTP Server Push support has been removed from [Chrome](https://developer.chrome.com/blog/removing-push) and [Firefox](https://www.mozilla.org/en-US/firefox/132.0/releasenotes/) due to compatibility issues and to empirical evidence showing performance loss from Server Push. One factor contributing to the observed performance loss is that servers may over-push data because they cannot know which data clients already have in their cache.

---

### 2.6. Reducing content size

By reducing the size of webpages' sub-resources, we reduce network bandwidth usage and the amount of data that the client has to process.

#### Image optimization

Images make up [around 50%](https://developer.mozilla.org/en-US/docs/Learn/Performance/Multimedia) of the bandwidth of the average website , making them a good candidate for optimization. Image file sizes can be reduced by:

- Resizing images to no more than the resolution at which they are ultimately rendered on users’ screens.
- Using vector graphics ([SVG](https://developer.mozilla.org/en-US/docs/Web/SVG)s) when possible.
- Encoding images using [lossy compression](https://en.wikipedia.org/wiki/Lossy_compression) when it provides good enough quality (for example, by using the JPEG format instead of PNG).
- Encoding images using modern, well-optimized file formats like [AVIF](https://en.wikipedia.org/wiki/AVIF) or [WEBP](https://en.wikipedia.org/wiki/WebP).

The HTML `<img>`, `<picture>` and `<video>` elements allow webpages to [provide multiple sources for the same multimedia item](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/source) and let the browser pick the version of the appropriate format and size.
This allows websites to provide alternative versions of the same image: Different resolutions for different screen sizes, and images in both modern, well-optimized file formats for new browsers and in older formats for legacy browsers.

As setting up a system that provides multiple sources for each image can be quite complex, many web frameworks and hosting services include image optimization tools to automate this task.

#### Subsetting web font files

Web pages can use text fonts installed on users' systems, and can also load custom [Web font](https://developer.mozilla.org/en-US/docs/Learn/CSS/Styling_text/Web_fonts) files. These files can be large, as they may include the glyphs of a very large set of Unicode characters to support many languages. To avoid loading glyphs that are never used on the web page, font files can be split into separate files that define each the glyphs of a subset of Unicode characters (for example, only Latin characters or only Arabic characters). This process is called subsetting.

When a web font is defined by multiple subset files, the browser ensures it downloads only the files containing glyphs that actually appear on the page. Check out the MDN articles on [unicode-range](https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/unicode-range) and the section on [loading only the glyphs you need](https://developer.mozilla.org/en-US/docs/Learn/Performance/CSS#loading_only_the_glyphs_you_need).

---

### 2.7. Reducing client-side code size

#### 2.7.1. Using optimizing bundlers

Developers do not typically ship their source code unchanged to clients. Instead, they use bundling tools or frameworks that include such tools to transform the website's source code and its dependencies (such as libraries and assets) into bundle files that are ultimately served to the clients.

As we discussed in [Bundling resources](#bundling-resources), bundling reduces network overhead. Additionally, bundling tools implement features like [Minification](#minification) and [Tree-Shaking](#tree-shaking), which help reduce code size.

##### Minification

Text files such as HTML, CSS, JavaScript and SVG files contain elements that are useful for developers but not for end users: whitespace formatting, comments and intuitive variable names.
[Minification](https://developer.mozilla.org/en-US/docs/Glossary/Minification) is the process of removing those elements.

Here is an example of source code:

```js
// This is a comment
function add(first, second) {
  return first + second;
}

// This is another comment
function multiply(first, second) {
  return first * second;
}
```

And here is the same source code after minification:

```
function add(n,t){return n+t}
function multiply(n,t){return n*t}
```

##### Tree-shaking

Bundlers can also reduce code size with [Tree-Shaking](https://en.wikipedia.org/wiki/Tree_shaking); by removing any code that static analysis shows to be unreachable from the bundle's entry points. Outside web circles, this concept is more generally known as [Dead-code Elimination](https://en.wikipedia.org/wiki/Dead-code_elimination).

Here is an example of source code:

```js
// utils.js
function add(first, second) {
  return first + second;
}
function multiply(first, second) {
  return first * second;
}

// main.js (entry point)
import { add } from "./utils.js";
console.log(add(0.1, 0.2));
```

And here is the same source code after tree-shaking and concatenation: The `multiply` function is removed because it's not used in `main.js`.

```js
function add(first, second) {
  return first + second;
}
console.log(add(0.1, 0.2));
```

#### 2.7.2. Using small libraries and small third-party scripts

When choosing libraries and third-party services, code size should be one of the selection criteria.

As a general rule, we should avoid using [kitchen sink libraries](https://www.quora.com/What-is-a-%E2%80%9Ckitchen-sink%E2%80%9D-in-the-context-of-programming) (i.e., libraries that integrate all sorts of features) and instead choose libraries that meet the specific needs of our applications. The appropriate libraries will differ when rendering, for instance, read-only tables versus editable ones. In the former case, a small and simple library may suffice, whereas in the latter case, a larger and more feature-rich library may be necessary.

Many tools can be used to determine the size of JavaScript libraries:

- [Webpack Bundle analyzer](https://www.npmjs.com/package/webpack-bundle-analyzer) and [Rollup Bundle Visualizer](https://www.npmjs.com/package/rollup-plugin-visualizer) show how much each JavaScript module and package contribute to the size of the built application bundle.
- The [Bundle Size](https://marketplace.visualstudio.com/items?itemName=ambar.bundle-size) extension for VSCode displays the code size of npm packages next to the imports in the code.
- The [bundlejs](https://bundlejs.com/) website allows users to partially import code from many JavaScript packages and then measures the resulting bundle size.
- The [bundlephobia](https://bundlephobia.com/) website shows code size of npm packages.
- The network tab in the web browsers' [DevTools](https://developer.mozilla.org/en-US/docs/Glossary/Developer_Tools) shows the exact size of each resource a webpage loads, before and after compression.

In addition to library size, the ability to **tree-shake** should also be considered when choosing libraries.

For example, check out the [You-Dont-Need-Momentjs](https://github.com/you-dont-need/You-Dont-Need-Momentjs) page comparing Moment.js, a utility library for handling date objects, with alternative libraries that are smaller and in the case of `date-fns` also tree-shakable.

It is important to note that tree-shaking has its limits as libraries typically contain a set of core modules that cannot be eliminated. For example, even though the MUI components library supports tree-shaking, using a single component from the library also loads the library's core modules, which include a style engine and various other utilities. Therefore, instead of reaching for MUI to use just one of its components, it is better to look for a specialized library.

<figure id="figure-library-sizes">
    <img
        alt="Comparing library sizes"
        src="/blog/web-frontend-performance/library-sizes.svg"
        width="1000"
        height="650"
    />
    <figcaption>
        <p>
            <a href="#figure-library-sizes">Large vs lightweight libraries:</a> This figure compares the gzipped client side bundle size of two versions of the same applications. In both versions, application code weighs 50KB.
        </p>
        <p>
            The first app uses very popular but quite large libraries: React v19.0 (53.7KB including React-DOM), Next.js App router v15.3 (~46.5KB), MUI Date picker v8.5 and its dependencies (133.7KB) and Recaptcha (~225KB). In total the app weighs 508.9KB.
        </p>
        <p>
            The second app uses SolidJS v1.9 (7.5KB), SolidRouter v0.15.3 (7.9KB), <code>@corvu/calendar</code> v0.1.2 (4.4KB) and ALTCHA v2.0 (23.9KB). In total the app weighs 93.7KB (18.4% the size of the large libraries version)
        </p>
    </figcaption>
</figure>

#### 2.7.3. Keeping code in the server

Sometimes, when some portions of code are very large, it makes sense to keep them in the server and to execute them on client requests to avoid burdening the client by downloading and executing them.

Before adopting such a strategy, some concerns have to be considered:

- Depending on the server to respond to certain user inputs introduces network latency, which users may not tolerate.
- The savings made from keeping code in the server should be weighed against the cost of clients sending requests and downloading results from the server.
- The server has to be sized adequately to support the added load.

<figure id="figure-run-code-on-the-client">
    <img
        alt="Running code on the client"
        src="/blog/web-frontend-performance/run-code-on-the-client.svg"
        width="700"
        height="700"
    />
    <figcaption>
       <a href="#figure-run-code-on-the-client">Running a lot of code on the client:</a> In this example, a large script <code>a-lot-of-code.js</code> is requested, downloaded and loaded by the client. When the user triggers events needing this script, the client executes the script locally without having to involve to the server.
    </figcaption>
</figure>

<figure id="figure-run-code-on-the-server">
    <img
        alt="Running code on the server"
        src="/blog/web-frontend-performance/run-code-on-the-server.svg"
        width="700"
        height="700"
    />
    <figcaption>
       <a href="#figure-run-code-on-the-server">Keeping large code on the server:</a> In this example, the script <code>a-lot-of-code.js</code> is kept in the server and never transferred to the client. Each time the user triggers events needing this script, the client sends a request to the server which runs <code>a-lot-of-code.js</code> and sends results. Each time, the script's inputs and output are serialized and sent through the network.
    </figcaption>
</figure>

Offloading code to the server can negatively impact developer experience (DX), as it can require creating API routes, modifying client code to call them, and managing serialization of inputs and outputs. However, this is not always an issue:

- If the offloaded code is executed during page loading, the server can run it without needing API routes. We will explore this further in the section on [server-side and client-side rendering](#server-side-and-client-side-rendering).
- If the offloaded code generates HTML fragments that require little to no processing on the client side, as is the case when using frameworks like [Hotwire](https://hotwired.dev/), [HTMX](https://htmx.org/) and [Unpoly](https://unpoly.com/), then developers can load these fragments without writing client-side JavaScript.

Some frameworks tackle this DX issue by making it simpler to send requests to the server:

- [tRPC](https://trpc.io/) offers a simple API for creating both the server and the client sides of API routes, resulting in well-typed and well-structured code.
- [Next.js](https://nextjs.org/docs/app/api-reference/directives/use-server) and [SolidStart](https://docs.solidjs.com/solid-start/reference/server/use-server#use-server) provide server functions: developers can mark modules or individual functions as server-side only and call them from client code like regular asynchronous functions. The framework transparently splits the code into server-side and client-side parts, generates API routes, and transforms the client code to communicate with the server through these routes.
  - SolidStart goes further by allowing servers to respond to clients with live objects (such as in-flight promises and ReadableStreams), while transparently taking care of serialization, streaming, and deserialization - thanks to the [Seroval](https://github.com/lxsmnsyc/seroval/blob/main/docs/compatibility.md#supported-types) library.

##### Server-side and client-side rendering

In this section, also generally in web frameworks circles, the word _rendering_ refers to the transformation of data from a structured format (like JSON) into the HTML that is displayed to the user. This is not to be confused by the rendering to the screen which is performed by [browser engines](https://en.wikipedia.org/wiki/Browser_engine).

Rendering can be done on the client, on the server, or on both. Where it is done has an effect on the amount of data that is sent to the client. Let's look first at client-side and server-side rendering in purest form:

- Client-side rendering (CSR) requires the client to load the data to render and the code to render it into HTML.
  - Typically, pure CSR code is written in a developer friendly declarative style using a frontend library or framework, which can lead to good development velocity.
- In contrast, with server-side rendering (SSR), in its pure form, the client receives rendered HTML from the server.
  - Client-side code can still be needed to implement interactivity, but not rendering, reducing its size.
  - SSR can also provide better initial page-load time compared to CSR when the server can render and send the page to the client before the client gets the time to download the page's JavaScript code. We will look at more techniques similar to this in the section [3. Scheduling work to make users wait less](#3-scheduling-work-to-make-users-wait-less).
  - The HTML received by the client can sometimes be larger in size than the original data and the code to render it combined. This can happen when HTML templates are rendered repeatedly in a page. [Compression](#http-responses-compression) can be used to solve this issue as it eliminates repetition. It is interesting that client-side rendering is in fact a form of compression.
  - Client-side code quality can suffer with pure SSR frameworks: Typically, a declarative templating language is used on the server to render data to HTML, while some imperative client-side code is written to make the server-generated HTML interactive. This can lead to less development velocity as imperative code is harder to reason about.

Hybrid approaches to rendering are possible too:

An application can render some parts of the page on the server and other parts on the client. For example, by rendering non-interactive page sections on the server and interactive ones on the client. This approach, which is quite easy to implement, can lead to a better code quality compared to doing pure SSR with imperative JavaScript for interactivity, as both SSR and CSR code can be written in a declarative style. For those familiar with the Astro framework, you can achieve this using the [client:only directive](https://docs.astro.build/en/reference/directives-reference/#clientonly).

Many modern JavaScript frameworks implement a more elaborate hybrid approach to rendering mixing SSR and CSR: The page is rendered a first time on the server. Then it is made interactive on the client by a process called [hydration](<https://en.wikipedia.org/wiki/Hydration_(web_development)>) which attaches event handlers to the server-rendered HTML. The page is, or sections of it are, rerendered again on the client when the user interacts with it. Such frameworks have some nice properties for users and developers:

- Like with pure SSR, the page may load earlier than it would with pure CSR, because the the client may receive the HTML before it would load the page's code and data if it did CSR.
- Developers can write a single codebase in a declarative style that works both on the server and the client.

As such frameworks do both SSR and CSR, using them comes at a cost:

- Unlike with pure SSR approaches, the client has to download rendering code.
- The framework's code size is increased (compared to a pure CSR version) in order to support hydration.
- These frameworks also face what [Ryan Carniato](https://x.com/RyanCarniato) (the creator of SolidJS) calls [the double data problem](https://dev.to/this-is-learning/why-efficient-hydration-in-javascript-frameworks-is-so-challenging-1ca3): The server has to send data in two formats to the client. Once in HTML format to optimize page-load time, and a second time in JSON format serving as input and state initialization for client-side code.
- Finally, like with pure SSR, HTML templates that are reused multiple times on the same page are included multiple times in the rendered HTML. And in addition to that, the templates are also sent in the CSR code.

<figure id="figure-pure-ssr">
    <img width="1050" height="650" alt="Pure SSR" src="/blog/web-frontend-performance/pure-ssr.svg" />
    <figcaption>
        <p>
            <a href="#figure-pure-ssr">Pure SSR:</a> In this example, the server, gets page data, renders the page and responds to the client with rendered HTML. Upon receiving the response, the client renders the page to the user. Later when the client receives the page's client-side code, it loads it, making the page interactive.
        </p>
    </figcaption>
</figure>

<figure id="figure-pure-csr">
    <img width="1050" height="800" alt="Pure CSR" src="/blog/web-frontend-performance/pure-csr.svg" />
    <figcaption>
        <p>
            <a href="#figure-pure-csr">Pure CSR:</a> In this example, the server responds with an empty page. The client downloads the page's code, loads it, figures which data it needs to get from the backend, requests it, and only upon receiving it can it render the page to the user. At that point the page is immediately interactive.
        </p>
    </figcaption>
</figure>

<figure id="figure-ssr-with-hydration">
    <img width="1050" height="700" alt="SSR with hydration" src="/blog/web-frontend-performance/ssr-with-hydration.svg" />
    <figcaption>
        <p>
            <a href="#figure-ssr-with-hydration">SSR with hydration:</a> In this example, the server, gets page data, renders the page and responds to the client with rendered HTML and page data. Upon receiving the response, the client renders the page to the user. Later when the client receives the page's client-side code, it loads it and applies hydration code to make the page interactive.
        </p>
    </figcaption>
</figure>

<figure id="figure-pure-ssr-vs-hydration-vs-pure-csr">
    <img width="950" height="950" alt="Pure SSR vs Hydration vs Pure CSR" src="/blog/web-frontend-performance/pure-ssr-vs-hydration-vs-pure-csr.svg" />
    <figcaption>
        <p>
            <a href="#figure-pure-ssr-vs-hydration-vs-pure-csr">Pure SSR vs Hydration vs Pure CSR:</a> This figure compares 3 approaches for implementing the same page. The page renders some data using 2 HTML templates, both of which are interactive requiring some client-side JavaScript code.
        </p>
        <p>
            The first approach is pure server side rendering. The client downloads the rendered HTML and the code that makes the page interactive. Notice how template 2 is repeated 3 times in the downloaded HTML.
        </p>
        <p>
            The second approach is to do server-side rendering, hydration and client-side rendering. The client downloads the rendered HTML, the code to render both templates 1 and 2, and the code that makes the page interactive. Like with the first framework, template 2 is repeated 3 times in the downloaded HTML. Notice also that the page loads more code to support hydration and client-side routing (We will talk about the routing part in the section <a href="#282-client-side-navigation">Client side navigation</a>). The page also loads the non-rendered data in order to support hydration and rerendering on the client when necessary. The page's data is downloaded twice: both in the rendered HTML and in raw format. This is sometimes called the <b>double data problem</b>.
        </p>
        <p>
            The third approach is pure client side rendering. The client downloads no rendered HTML. It downloads the code to render both templates 1 and 2, and the code that makes the page interactive. Unlike with the previous frameworks, there is no repetition of template 2 because no HTML is downloaded. And like the second framework, the page loads the code for client-side routing the non-rendered data which is rendered to HTML on the client.
        </p>
    </figcaption>
</figure>

##### Partial hydration

To help reduce code size, some frameworks allow developers to control which parts of the application are rendered exclusively on the server (server-only components) and which parts can be rendered on both the server and the client. Server-only components code does not need to be sent to the client, reducing client-side code size. Additionally, server-only components do not need to be hydrated on page load, reducing initialization work. This feature is commonly referred to as partial or selective hydration.

Right now, the most popular frameworks supporting partial hydration are [Astro](https://astro.build/) via [Islands](https://docs.astro.build/en/concepts/islands/), and [Next.js](https://nextjs.org/) via [Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components).

<figure id="figure-full-vs-partial-hydration">
    <img
        alt="Full Hydration vs Partial Hydration"
        src="/blog/web-frontend-performance/full-vs-partial-hydration.svg" 
        width="660"
        height="900"
    />
    <figcaption>
       <p>
            <a href="#figure-full-vs-partial-hydration">Full Hydration vs Partial Hydration:</a> This figure compares 2 approaches for implementing the same page. The page renders some data using 2 HTML templates. The first template is interactive requiring some client-side JavaScript code while the second template is not interactive.
        </p>
        <p>
            The first approach is full hydration: Both page's templates are rendered on the server and hydrated on the the client.
        </p>
        <p>
            The second approach is partial hydration: Template 2 is only rendered on the server. Notice that the client doesn't need to download template 2's code or data.
        </p>
    </figcaption>
</figure>

Note that partial hydration gains can be nullified in small applications if the framework is too large. For instance, in the demo [Movies App](https://movies-app.zaps.dev/), the fully hydrated [SolidStart version](https://solid-movies.app/) is smaller than the partially hydrated [Next.js version](https://movies.sst.dev). This is due to SolidStart being more lightweight compared to Next.js, as well as the fact that the app itself isn't large enough for the code size savings from partial hydration to outweigh the overhead of the larger framework.

<figure id="figure-movies-app">
    <img
        alt="Comparison of the client-side code size of two implementations of the Movies App demo"
        src="/blog/web-frontend-performance/movies-apps.svg"
        height="500"
        width="700"
    />
    <figcaption>
        <a href="#figure-movies-app">Comparison of the client-side code size of two implementations of the Movies App demo:</a> This figure shows the client-side code size of 2 implementations of the Movies App demo. While the Next.js (94KB) version partially hydrates the page, the SolidJS version fully hydrates it but still manages to load less JavaScript code (15.5KB).
    </figcaption>
</figure>

---

### 2.8. Reducing CPU work in the client

In order to display the page to the user, the browser has to construct the [DOM](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Introduction) (Document Object Model) and the [CSSOM](https://developer.mozilla.org/en-US/docs/Glossary/CSSOM) (CSS Object Model). It also has to calculate the positions and sizes of the elements on the page - a process commonly referred to as layout - and finally paint the result on the screen.
The browser has to repeat some of this work each time the page is manipulated by the user or by JavaScript code. Recalculating page layout is known as [reflow](https://developer.mozilla.org/en-US/docs/Glossary/Reflow).

To avoid overwhelming users' devices with too much CPU work, the DOM should be kept small, CSS rules should be simple, and JavaScript code should avoid running for too long or inducing unnecessary layouts and paints.

#### 2.8.1. Optimizing layout and reflow

If the browser DevTools show that the app is spending too much time doing layout, that may be caused by one of the following problems:

- Layout thrashing
- Overreacting to user inputs
- Animating the wrong kind of CSS properties
- Complex CSS and big DOM

##### Layout thrashing

When JavaScript code manipulates the DOM incorrectly, it can triggers unnecessary layout recalculations — a problem known as [layout thrashing](https://web.dev/articles/avoid-large-complex-layouts-and-layout-thrashing). This is showcased in the figures [Layout thrashing](#layout-thrashing) and [No layout thrashing](#no-layout-thrashing)). When JavaScript code writes to the DOM, the browser has to recalculate the layout to update the UI for the user, but it doesn't do that immediately. It waits to catch multiple DOM updates and then recalculates the layout once, repainting the page in its new state to the user. However, when JavaScript code reads certain properties from the DOM, it forces the browser to calculate the layout immediately. Now, when JavaScript code reads and writes repeatedly to the DOM in a loop, the browser is forced to recalculate layout again and again, and that is what we call layout thrashing.

<figure id="layout-thrashing">
    <img
        alt="Layout thrashing"
        src="/blog/web-frontend-performance/waterfall-diagram/layout-thrashing.svg"
        width="1241"
        height="580"
    />
    <figcaption>
       <a href="#layout-thrashing">Layout thrashing:</a> In this example, the click event handler writes to the DOM and then reads the state of the DOM repeatedly in a loop. Each DOM-write invalidates the current layout calculations, so each subsequent DOM-read requires the browser to recalculate layout to read the correct current state of the DOM. The result is that it takes the browser 1.2 seconds to process the click event handler, leaving it unresponsive to user events during this time.
    </figcaption>
</figure>

<figure id="no-layout-thrashing">
    <img
        alt="No layout thrashing"
        src="/blog/web-frontend-performance/waterfall-diagram/no-layout-thrashing.svg"
        width="341"
        height="220"
    />
    <figcaption>
       <a href="#no-layout-thrashing">No Layout thrashing:</a> In this example, the click event handler performs all the necessary DOM reads first. Then, it does all the DOM writes, invalidating the current layout calculations. Once the event handler has finished executing, the browser recalculates the layout once to render the final state to the user. The entire process takes 200 milliseconds to complete. Contrast it with the 1.2 seconds from the previous example.
    </figcaption>
</figure>

##### Overreacting to user inputs

Certain UI widgets can trigger work while the user is interacting with them. A searchbox, for instance, may trigger search while the user is typing. With such widgets, it is important to ensure that we do not overload the client's CPU, the network and the server with too much work which is likely to be discarded as the user continues editing. This can be achieved using techniques like [debouncing](https://developer.mozilla.org/en-US/docs/Glossary/Debounce) (Waiting for user edits to stop for a specific time before triggering work) and [throttling](https://developer.mozilla.org/en-US/docs/Glossary/Throttle) (Limiting the rate at which user edits trigger work).

##### Animating the wrong kind of CSS properties

Excessive layout recalculation can be triggered by using CSS animations or transitions on properties that cause reflow. For more information on this, check out [Choosing properties to animate](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Performance/CSS#choosing_properties_to_animate) on MDN.

##### Complex CSS and big DOM

Finally, layout and reflow take longer as CSS rules become more complex and as the DOM grows in size. To address CSS complexity, I refer you to the [MDN section on CSS performance](https://developer.mozilla.org/en-US/docs/Learn/Performance/CSS). Regarding the size of the DOM, it can be reduced by employing techniques such as [pagination](https://en.wikipedia.org/wiki/Pagination) or [virtualization](https://web.dev/articles/virtualize-long-lists-react-window) (also known as windowing). A newer solution to the problem of large DOM is [CSS containment](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Using_CSS_containment) which is widely available since september 2024. It allows developers to mark DOM sections that can be rendered independently from each other. This enables the browser to skip painting and calculating layout for offscreen sub-trees of the DOM.

#### 2.8.2. Client-side navigation

In web applications that load a lot of JavaScript code, it is inefficient to re-execute the app's code on every page navigation. Client-side navigation can help address this issue.

Let's first examine how browsers handle navigation by default. When a user clicks on a link:

- The browser fetches the new page and its resources from the server and renders it on the screen.
- The browser creates a new JavaScript execution context in which the scripts for the new page are executed.
  - The browser can freeze the execution context of the previous page, allowing it to be resumed later if the user clicks the back button, without having to reload it. This is known as the [Back/Forward Cache (bfcache)](https://developer.mozilla.org/en-US/docs/Glossary/bfcache) and it is good practice to avoid APIs that disable it.
- The browser also updates its UI to reflect the URL change and to enable the user to navigate back to the previous page.

An alternative way to handle navigation is through client-side navigation (also referred to as soft navigation or client-side routing):

- The application installs event handlers that cancel the browser's default behavior when links are clicked.
  - The current JavaScript execution context is preserved, and live objects such as video/audio elements and WebSocket/WebRTC/EventSource connections are not interrupted.
- The application fetches the new page's content and inserts it into the DOM.
- The application uses the [History API](https://developer.mozilla.org/en-US/docs/Web/API/History_API) to:
  - Instruct the browser to update the URL in the address bar and the state of the back and forward buttons.
  - Install event handlers to intercept and handle clicks on the back and forward buttons.

Client-side navigation requires the application to load additional code to simulate the default browser behavior and to manage routing on the client, rather than relying on the server for that like in traditional navigation. This increases the client-side code size and adds complexity, which can be excessive for many websites and applications.

However, client-side navigation is often a performance requirement in JavaScript-heavy [single-page applications](https://en.wikipedia.org/wiki/Single-page_application) (SPAs). It is also essential for applications that want to support URL-based navigation while maintaining the state of the page. For instance, in an audio streaming website, users expect the audio to continue playing seamlessly as they navigate between different pages.

<figure id="figure-classic-navigation">
    <img
        alt="Classic navigation"
        src="/blog/web-frontend-performance/execution-context-classic-navigation.svg"
        width="600"
        height="700"
    />
    <figcaption>
        <a href="#figure-classic-navigation">Default browser navigation:</a> In this example, the browser creates a new JavaScript context when navigating between Page A and Page B. Page A's context is suspended and stored in the bfcache. When the user clicks the back button, this context is resumed, and Page B's context is suspended and cached. Note that the shared resources of Page A and Page B are loaded twice.
    </figcaption>
</figure>

<figure id="figure-soft-navigation">
    <img
        alt="Soft navigation"
        src="/blog/web-frontend-performance/execution-context-soft-navigation.svg"
        width="600"
        height="600"
 />
    <figcaption>
        <a href="#figure-soft-navigation">Client-side navigation:</a> In this example, a SPA handles navigation. To do so, it loads a client-side router script. Notice that the shared resources of Page A and Page B are only loaded once.
    </figcaption>
</figure>

#### 2.8.3. Using WebAssembly

CPU load can also be reduced by using a faster programming language. On the web, only two client-side programming languages are supported: JavaScript and [WebAssembly](https://developer.mozilla.org/en-US/docs/WebAssembly) (or Wasm for short): JavaScript code can load and instantiate Wasm modules, providing them with the functions they require as dependencies, and it can subsequently call the functions they export. While JavaScript can access web APIs directly, Wasm code can only access them by calling back to JavaScript. For more information about how all of this work, I highly recommend [Lin Clark](https://www.code-cartoons.com/)'s article series: [A cartoon intro to WebAssembly Articles](https://hacks.mozilla.org/category/code-cartoons/a-cartoon-intro-to-webassembly/).

There are limits to how much performance can be derived from Wasm. Even if webApps use Wasm as much as possible, many (if not most) would not realize any significant performance gains because they are not usually [CPU-bound](https://en.wikipedia.org/wiki/CPU-bound).

The remaining webApps that are CPU-bound can achieve good performance using either Wasm or JavaScript code. It is surprising to what point JavaScript code can be optimized for performance, but for certain tasks, the optimal JavaScript code can be hard to read and to maintain. In those situations, it makes sense to write the code in a more adapted language and to compile it to Wasm.

Now, let's look at the features of Wasm that gives it an edge over JavaScript from a performance point of view:

- Control over Memory layout
- Dynamic vs Static Typing
- Human-readable vs Binary code

Feel free to skip to [the end of the chapter](#end-of-chapter-2), given that these subjects are quite technical and that a limited number of apps can derive performance gains from Wasm.

##### Control over Memory layout

The term [memory layout](https://en.wikipedia.org/wiki/Data_structure_alignment) is often used to describe the way objects are represented in memory. That is, each object's size, alignment, and the relative offsets of its fields.

Low level programming languages give programmers control over objects memory layout. They also give them the ability to work with objects as values and as references (I.e. pointers, storing the addresses of objects in memory). With this level of control, programmers can write code that maximizes the use of the [CPU cache](https://en.wikipedia.org/wiki/CPU_cache) and of [CPU data prefetching](https://en.wikipedia.org/wiki/Cache_prefetching) for best performance. For more on this, check out [Data-oriented design](https://en.wikipedia.org/wiki/Data-oriented_design).

High level languages on the other hand try to be easy to use. To achieve this:

- they control memory layout on behalf of the programmer
- and they usually only expose a simple object model to the programmer where objects are always referred to by reference and never by value.

**JavaScript** is one such a high level language, imposing both of these limitations on programmers.
In spite of that, researchers came up with [asm.js](https://en.wikipedia.org/wiki/Asm.js), [a subset of JavaScript](http://asmjs.org/spec/latest/) that controls memory layout by never using JS objects and by instead only reading and writing numbers from and into a typed array.
C++ programs can be compiled to asm.js code and can run in the browser. The Unreal 3D game engine, [for instance](https://blog.mozilla.org/futurereleases/2013/05/02/epic-citadel-demo-shows-the-power-of-the-web-as-a-platform-for-gaming/) was compiled back in 2013 to JavaScript and run at near native speed. Techniques from asm.js are still used today by [polywasm](https://github.com/evanw/polywasm) to run Wasm modules in browsers that don't support it or when it is disabled.

**Wasm** on the other hand is a low level language. Here is an overview of some of its memory related features:

- As of its initial MVP release [(2017)](https://caniuse.com/wasm), Wasm code can operate on numeric values and can load them and store them into a linear memory (an array of numbers). This alone makes Wasm a viable [compilation target](https://github.com/appcypher/awesome-wasm-langs) for low level languages such as C, C++ and Rust, and for the runtimes of high level languages.

- Thanks to the Reference Types extension [(2022)](https://caniuse.com/wasm-reference-types), Wasm code can receive opaque references from JavaScript code, pass them around as function arguments and results and store them in dedicated tables (because opaque references cannot be stored as numbers in the linear memory for portability and security reasons).

- Thanks to the Typed Function References extension, [(widely available since september 2024, or december 2023 if we discount Safari)](https://webassembly.org/features/), Wasm code can operate on typed function references, pass them around, store them in dedicated tables and call them without incurring overhead from having to check their types at runtime.

- Thanks to the Garbage collection extension, [(widely available since december 2024, or december 2023 if we discount Safari)](https://webassembly.org/features/), Wasm code can allocate statically typed garbage collected structs and arrays. It can pass them around and store them in typed tables.
  - Note that pre-existing code in low level languages like C, C++ and Rust, cannot be compiled to use Wasm's GC-references as these references live outside of the linear memory.
  - Note also that the current [MVP of Garbage Collection](https://github.com/WebAssembly/gc/blob/main/proposals/gc/MVP.md) in Wasm has limitations. For example: arrays and structs cannot be nested inline inside other arrays and structs without a pointer indirection. Due to this, the wasm compiler backends for [C#'s .NET runtime](https://github.com/dotnet/runtime/issues/94420) and for [Golang](https://github.com/golang/go/issues/63904) decided to stay away from using Wasm GC and to stick with linear memory until Wasm ships [Post-MVP GC](https://github.com/WebAssembly/gc/blob/main/proposals/gc/Post-MVP.md) features that lift these limitations.

The following 3 figures [Memory layout in JavaScript](#figure-memory-layout-js), [Memory layout in Wasm GC MVP](#figure-memory-layout-wasm-gc-mvp) and [Memory layout in a low level language](#figure-memory-layout-low-level-lang) show the memory layout of the objects needed to represent essentially the same object in JavaScript, in Java compiled to GC-using-Wasm, and in Rust compiled to Wasm.

The TypeScript code for constructing our object of interest is:

```ts
type Key = [number, number];
type Value = { id: number; name: string; tags: strings[] };

// Since JavaScript Maps hash object references instead of their values,
// we need a mechanism to get a stable reference for Key objects
function getStableReference(key: Key): Key {
  // Get a stable reference
  // (via interning for example, which may require another map object)
}

// Our map object of interest
const map = new Map<StableKey, Value>();
map.set(getStableKey([1, 2]), {
  id: 1,
  name: "name 1",
  tags: ["tag 1.1", "tag 1.2"],
});
map.set(getStableKey([3, 4]), {
  id: 2,
  name: "name 2",
  tags: ["tag 2.1", "tag 2.2"],
});
// ...
```

The equivalent Java code is:

```java
record Key (int x, int y) {}
class Value {
  Value(int id, String name, String[] tags) { /* ... */ }
  int id;
  String name;
  String[] tags;
}

// Our map object of interest
HashMap<Key, Value> map = new HashMap<>();
map.put(new Key(1, 2), new Value(
  1,
  "name1",
  new String[] {"tag 1.1", "tag 1.2"}
));
map.put(new Key(3, 4), new Value(
  2,
  "name2",
  new String[] {"tag 2.1", "tag 2.2"}
));
```

The Rust code for creating the equivalent object is :

```rust
##[derive(Hash, Eq)]
struct Key {
  x: i32,
  y: i32,
}
struct Value {
    id: u32,
    name: String,
    tags: Vec<String>,
}
type Map = HashMap<Key, Box<Value>>;

// Our map object of interest
let mut map = Map::new();
map.insert(Key {x: 1, y: 2}, Box::new(Value {
  id: 1,
  name: String::from("name 1"),
  tags: vec![String::from("tag 1.1"), String::from("tag 1.2")],
}));
map.insert(Key {x: 3, y: 4}, Box::new(Value {
  id: 2,
  name: String::from("name 2"),
  tags: vec![String::from("tag 2.1"), String::from("tag 2.2")],
}));
```

<figure id="figure-memory-layout-js">
    <img
        alt="Memory layout in JavaScript"
        src="/blog/web-frontend-performance/memory-layout-js.svg"
        height="800"
        width="1400"
 />
    <figcaption>
        <p>
          <a href="#figure-memory-layout-js">Memory layout in JavaScript:</a> This figure shows the memory layout of the map object from the previous TypeScript snippet.
        </p>
        <p>
          Note all the indirections needed at each level to represent this data structure. This problem is common in high level languages.
        </p>
        <p>
          Note also the shape objects, without which the JavaScript VM wouldn't know how to read the properties of the dynamically typed objects.
        </p>
        <p>
          Finally, note the extra props (properties) pointers added in each object to support any code that would extend our objects with more properties. We will get back to this in the section <a href="#dynamic-vs-static-typing">Dynamic vs static typing</a>.
        </p>
    </figcaption>
</figure>

<figure id="figure-memory-layout-wasm-gc-mvp">
    <img
        alt="Memory layout in Wasm GC MVP"
        src="/blog/web-frontend-performance/memory-layout-wasm-gc.svg"
        width="1400"
        height="750"
 />
    <figcaption>
        <p>
        <a href="#figure-memory-layout-wasm-gc-mvp">Memory layout in Wasm GC MVP:</a> This figure shows the memory layout of the objects constructed by the Java example that is compiled to use Wasm GC.
        </p>
        <p>
        Like in the JavaScript version, there is a lot of pointer indirection. In addition, this version uses a Java compatible hash table that is compiled to Wasm, which gives it two penalties: 1. It has to load the hash table code. And 2. this hash table is most likely less compact in memory compared to the native JavaScript Map.
        </p>
        <p>
        On the positive side and thanks to static typing, objects allocated by Wasm code take less space than JavaScript objects. There is no space wasted to account for dynamically added properties. And shape objects (called Runtime Types or RTTs in Wasm) are only needed to validate subtype-casting, meaning that they have to contain less data compared to the JS equivalent which we'll explore in <a href="#dynamic-vs-static-typing">Dynamic vs static typing</a>.
        </p>
    </figcaption>
</figure>

<figure id="figure-memory-layout-low-level-lang">
    <img
        alt="Memory layout in a low level language"
        src="/blog/web-frontend-performance/memory-layout-low-level-lang.svg"
        width="1100"
        height="625"
 />
    <figcaption>
        <p>
        <a href="#figure-memory-layout-low-level-lang">Memory layout in a low level language:</a> This figure shows the memory layout of the objects constructed by the Rust example.
        </p>
        <p>
        There is little indirection compared to the previous versions. Many child objects are stored inline inside their parents: The keys are directly stored inside the hash table, and the tags tables metadata are stored inline inside the <code>Value</code> object. There is also no runtime information to store about the shapes of objects.
        </p>
        <p>
        Unlike the JavaScript version which uses a native hash table implementation provided by the browser, and just like the Java version, the Rust hash table code must be bundled with the application code.
        </p>
    </figcaption>
</figure>

##### Dynamic vs Static Typing

JavaScript is a dynamically typed programming language were object shapes are determined at runtime:

- When code reads from or writes to a property of an object, it has to check the shape of the object to know where to read or write in memory.
- JavaScript objects can also change shape dynamically. This means that objects need to reserve extra space in memory in case new properties are added.
- To make the matter worse, JavaScript uses [Prototypal inheritance](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Inheritance_and_the_prototype_chain) which adds extra steps to object property lookup:
  - First, the property is searched in the object itself by querying its shape and is returned if found.
  - If not found, the property is looked up in the prototype of the object, the prototype itself being another JavaScript object. This process repeats until either the property is found or the prototype chain is exhausted. Since objects' methods are typically stored on the object prototype, this adds extra steps to the common operation of invoking a method.

To learn more about how JavaScript engines represent objects shapes information, I refer you to the article [JavaScript engine fundamentals: Shapes and Inline Caches](https://mathiasbynens.be/notes/shapes-ics) presented by Mathias Bynens and Benedikt Meurer at JSConf EU 2018.

Figure [Accessing JS objects' properties](#figure-accessing-js-object-properties) shows the representation of the object `myObject` from the following code example, and lists the steps required to execute the function `callMethod0`.

```javascript
class ParentClass {
  property0 = 123;
  method0() {
    return this.property0;
  }
}

class ChildClass extends ParentClass {
  property1 = 456;
  method1() {
    return this.property0 + 1;
  }
}

const myObject = new ChildClass();

function callMethod0(object) {
  object.method0();
}

/* This function can only work thanks to dynamic typing */
function addNewProperty(object) {
  object.newProperty = 2;
}
```

<figure id="figure-accessing-js-object-properties">
    <img
        alt="Accessing JS objects' properties"
        src="/blog/web-frontend-performance/memory-access-js.svg"
        width="1200"
        height="750"
 />
    <figcaption>
        <p>
        <a href="#figure-accessing-js-object-properties">Accessing JS objects' properties:</a> This figure shows the JS objects and the Shape objects needed to represent <code>myObject</code> from the previous code example.
        </p>
        <p>
        Steps 1 to 11 represent the memory accesses needed for the function <code>callMethod0</code> to get the address of the code implementing <code>method0</code>. Steps A to D represent the memory accesses needed for <code>method0</code> to read <code>property0</code> from  <code>myObject</code>.
        </p>
        <p>
        All objects in this example have their extra properties fields set to null. This field is needed in case a function like <code>addNewProperty</code> is called with one of our objects and if this object has no space in it to store the added property.
        </p>
    </figcaption>
</figure>

If JavaScript engines went through all the steps explained above on every object property access, they would be very slow. Thankfully, they are heavily optimized: They analyze [hot code paths](<https://en.wikipedia.org/wiki/Hot_spot_(computer_programming)>) (that is, frequently-run code sections) at runtime to detect which shapes of objects they operate on, and they generate optimized code for those shapes. For more on this, check out [inline caching](https://en.wikipedia.org/wiki/Inline_caching) and [Just-in-time (JIT) compilation](https://en.wikipedia.org/wiki/Just-in-time_compilation). Code specialized for an object shape doesn't have to lookup object property names in the shape dictionary on each access. Instead, it directly accesses the object property by its offset inside the object.

Unlike JavaScript, **Wasm** is a statically typed language. Object properties can be accessed using a single memory read at a relative offset from the object's address.

<figure id="figure-accessing-statically-typed-object-properties">
    <img
        alt="Accessing a statically typed objects' properties"
        src="/blog/web-frontend-performance/memory-access-statically-typed.svg"
        width="725"
        height="225"
 />
    <figcaption>
        <p>
        <a href="#figure-accessing-statically-typed-object-properties">Accessing a statically typed objects' properties:</a> This figure shows the objects needed to represent <code>myObject</code> from the previous code example in a statically typed language such as Wasm.
        </p>
        <p>
        Steps 1 to 3 represent the memory accesses needed for the function <code>callMethod0</code> to get the address of <code>method0</code>. And steps A and B represent the memory accesses needed for <code>method0</code> to read <code>property0</code> from the object.
        </p>
        <p>
        No extra properties fields need to be reserved inside our objects because functions like <code>addNewProperty</code> are simply invalid.
        </p>
    </figcaption>
</figure>

##### Human-readable vs Binary code

Before the browser gets to execute a JavaScript file, it has to download it fully and then to parse it (which is quite complex given the rich language syntax which is optimized for human readability).

Wasm's binary format [was designed](https://github.com/WebAssembly/design/blob/main/Rationale.md#why-a-binary-encoding) as to address this issue. To optimize loading time, many criteria were taken into account:

- Compact representation of code: Being a binary format, Wasm is more compact than if it was represented code using a textual representation.
- Compressibility: Wasm is compressible with gzip. More so than equivalent asm.js code.
- Fast parsing and validation: This disqualified the use of pre-existing binary code formats like the JVM's which isn't optimized for that.
- [Streaming compilation](https://developer.mozilla.org/en-US/docs/WebAssembly/Reference/JavaScript_interface/instantiateStreaming_static): The browser can start compiling Wasm code as it receives it from the network.

Nowadays, browsers can even [parallelize](https://www.infoq.com/news/2018/01/firefox-58-web-assembly-gets-10x/) wasm code compilation.

---

<span id='end-of-chapter-2'></span>
In chapter 2, so far, we looked at optimization techniques that work by reducing the amount of work that has to be done, or in other words, techniques that minimize resources wasting. In the next chapter, we look at optimization techniques that work by minimizing time wasting.

---

## 3. Scheduling work to make users wait less

In this chapter, I present techniques that allow websites and applications to reduce the time users have to wait for apps responses, without reducing the the amount of work the sites/apps have to do, but by scheduling work smartly.

To visualize the effect of different scheduling strategies, I generated waterfall charts with fixed parameters such as file sizes, execution times and network bandwidth and latency. I set network parameters as to simulate [regular 3G performance](https://developer.mozilla.org/en-US/docs/Web/Performance/Understanding_latency#network_throttling), and I divided the network bandwidth between simultaneously sent resources equally.
Feel free to [download the code](https://github.com/NawfelBgh/nawfelbgh.github.io/tree/main/src/pages/blog/web-frontend-performance/waterfall-diagram) and to generate charts with different parameters.

### 3.1. Do not block the UI thread

The browser runs JavaScript code in an [event loop](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Event_loop). When the user manipulates the page and when input/output operations progress, events are generated and JavaScript event handlers are run.
The browser has to wait for any currently running JavaScript code to finish before it can respond to new events.
So if JavaScript code runs for too long without yielding control to the event loop, the page becomes unresponsive to the user - a condition called [jank](https://developer.mozilla.org/en-US/docs/Glossary/Jank).

Therefore, JavaScript code should execute in brief bursts to keep the UI responsive. Two strategies can be used to handle long JavaScript tasks:

- Break them out into shorter tasks that interleave with the other tasks running in the event loop, or
- Run them in a separate thread which runs concurrently with the main thread (the thread running the UI's event loop) without blocking it. [Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers) enable this second option. A web worker executes JavaScript code in a separate thread that is isolated from the main thread and from other web workers. The main thread and web workers can communicate with each other using asynchronous message passing.

<figure id="figure-long-task">
    <img
        alt="Long task blocking the event loop"
        src="/blog/web-frontend-performance/waterfall-diagram/no-web-worker.svg"
        width="1141"
        height="260"
    />
    <figcaption>
       <a href="#figure-long-task">Long task blocking the event loop:</a> In this example, the user clicks on the UI twice: Once at t=0 and a second time at t=500ms. The first click's event handler runs for 50ms and then calls a function <code>Long task</code> which runs for 800ms. When the second click event arrives, <code>Long task</code> is still running, so the browser waits for it to finish (waiting 350ms). At t=850ms the main thread is free again, the second click handler is run taking 50ms and the browser runs layout (taking 100ms) to show the updated UI to the user. The user sees the result of the second click at 1000ms (A latency of 500ms).
    </figcaption>
</figure>

<figure id="figure-long-task-split">
    <img
        alt="Long task split into short ones to not block the event loop"
        src="/blog/web-frontend-performance/waterfall-diagram/no-web-worker-split-long-task.svg"
        width="1171"
        height="400"
    />
    <figcaption>
       <a href="#figure-long-task-split">Long task split into short ones to not block the event loop:</a> In this example, the user clicks on the UI twice: Once at t=0 and a second time at t=500ms. The first click's event handler runs for 50ms and then calls a function <code>Long task</code>. This function takes 800ms in total but it splits its work to chunks of 100ms yielding control to the main thread after each chunk. When the second click event arrives, chunk number 5 of <code>Long task</code> is running, so the browser waits for it to finish (waiting 70ms). At t=571ms the main thread is free again, the second click handler is run taking 50ms and the browser runs layout (taking 100ms) to show the updated UI to the user. The user sees the result of the second click at 721ms (A latency of 221ms).
    </figcaption>
</figure>

<figure id="figure-long-task-in-worker">
    <img
        alt="Long task running in a Web Worker"
        src="/blog/web-frontend-performance/waterfall-diagram/web-worker.svg"
        width="991"
        height="300"
    />
    <figcaption>
       <a href="#figure-long-task-in-worker">Long task running in a Web Worker to not block the event loop:</a> In this example, the user clicks on the UI twice: Once at t=0 and a second time at t=500ms. The first click's event handler runs for 50ms and trigger the execution of the function <code>Long task</code> in a Web Worker. When the second click event arrives, the function <code>Long task</code> is still running, but since it is running in a separate thread, the browser runs the second click's event handler immediately taking 50ms and then runs layout (taking 100ms) to show the updated UI to the user. The user sees the result of the second click at 650ms (A latency of 150ms). 
    </figcaption>
</figure>

> The [Partytown](https://partytown.builder.io/) library uses web workers in an interesting way: It allows running third-party scripts (analytics scripts for example) outside the main thread using proxy objects to simulate the DOM inside a web worker and using synchronous XHR to hide the asynchronicity of the communication between the main thread and the worker. This can help reduce jank coming from third-party scripts.

---

### 3.2. Streaming

#### Gradual content delivery with streaming

Dynamically generated web pages are sometimes composed of parts that are fast to generate and some other parts that take longer to generate.
It's desirable to deliver the parts that are ready to the user while the slower parts are still in the making. This way:

- The browser can start processing the page early,
- It can discover early the sub-resources to load like stylesheets, scripts and images, and
- The user gets to access and to interact with the parts that are ready without unnecessarily waiting for the whole page to load.

It is possible to do exactly that thanks to the streaming capability of HTTP (since version 1.1 of the protocol) and thanks to the HTML format being streaming-friendly (Browsers can process and show HTML documents progressively as they are received).

#### Unlocking Parallelism with Streaming

When the server receives a request for a page, it can:

- send a first chunk of HTML declaring the page's CSS and JavaScript resources,
- and, in parallel, start fetching or generating the page's data.

This way, the client can start loading the page's sub-resources in parallel with the server generating and sending the rest of the page.

<figure id="figure-not-streaming-html">
    <img
        alt="Not streaming HTML diagram"
        src="/blog/web-frontend-performance/waterfall-diagram/not-streaming-html.svg"
        width="1146"
        height="760" />
    <figcaption>
        <a href="#figure-not-streaming-html">Not streaming HTML:</a> In this example, the server waits for the whole page, head and body, to be generated (t=310ms) before it sends it to the client. The client receives the head of the page at t=362ms, at which point it starts loading the files <code>style.css</code> and <code>script.js</code> and continues loading the body of the page.
        When <code>style.css</code> is loaded (at t=473ms), the browser starts constructs the CSSOM. The browser also starts executing <code>script.js</code> onces it is loaded (t=672ms), waiting first for the CSSOM to be constructed (t=706ms).
        As a result, the page is rendered and interactive at t=1006ms - <a target="_blanc" href="/blog/web-frontend-performance/waterfall-diagram/not-streaming-html.json">Simulation numbers</a>.
    </figcaption>
</figure>

<figure id="figure-streaming-html">
    <img
        alt="Streaming HTML diagram"
        src="/blog/web-frontend-performance/waterfall-diagram/streaming-html.svg"
        width="925"
        height="780" />
    <figcaption>
        <a href="#figure-streaming-html">Streaming HTML:</a> In this example, the server streams the page parts, the head and the body, as soon as they are ready. It starts by streaming the page head to the client allowing it to request <code>style.css</code> and <code>script.js</code> at t=112ms (instead of t=362ms from the previous non streaming example).
        As a result, the page is rendered and interactive at t=785ms (248ms earlier than the non streaming example) - <a target="_blanc" href="/blog/web-frontend-performance/waterfall-diagram/streaming-html.json">Simulation numbers</a>.
    </figcaption>
</figure>

#### Out-Of-Order Streaming

Sometimes, webpages are composed of sections that can load concurrently and that may not finish loading in the right order to stream them directly to the client. For those situations, some frameworks implement a feature commonly called today **out-of-order streaming**: The framework loads page sections concurrently, streams them to the client as they become available, in whichever order that is, and ensure to render them in the correct position in the page.

Since [MarkoJS](https://markojs.com/#streaming) pioneering out-of-order streaming [in 2014](https://innovation.ebayinc.com/tech/engineering/async-fragments-rediscovering-progressive-html-rendering-with-marko/), some more popular JavaScript frameworks rediscovered and implemented the technique. An interesting example is [SolidStart](https://start.solidjs.com/) which supports out-of-order streaming in both server-side rendering (SSR) and client-side rendering (CSR) modes (modes that you can switch between by changing a configuration flag). In SSR mode, the server streams both HTML and data to the client: the framework inserts the HTML into the page and passes the data to client-side code. In CSR mode, the server streams only the data the client where client-side code renders it into HTML.

<figure id="figure-no-ooo-streaming">
    <img
        alt="No Out-Of-Order Streaming diagram"
        src="/blog/web-frontend-performance/waterfall-diagram/multi-sections-page-no-streaming.svg"
        width="1376"
        height="1020" />
    <figcaption>
        <a href="#figure-no-ooo-streaming">In-Order Streaming:</a> In this example, the server streams the head element of the page and loads the 3 sections of the page in parallel before streaming them to the client. The second and third sections finish loading early but they are not streamed to the client until after the first section to be ready.
        At t=1036ms, the client receives section 1, rendering it at t=1136ms (before that, all the user sees is an empty shell).
        The page is completely rendered and interactive only at t=1236ms - <a href="/blog/web-frontend-performance/waterfall-diagram/multi-sections-page-no-streaming.json">Simulation numbers</a>.
    </figcaption>
</figure>

<figure id="figure-ooo-streaming">
    <img
        alt="Out-Of-Order Streaming diagram"
        src="/blog/web-frontend-performance/waterfall-diagram/multi-sections-page-streaming.svg"
        width="1376"
        height="1060" />
    <figcaption>
        <a href="#figure-ooo-streaming">Out-Of-Order Streaming:</a> In this example, the server streams the head element of the page, loads the 3 sections of the page in parallel and streams them to the client as soon as they are ready. The client receives section 2 at t=536ms and renders it at t=756ms (480ms earlier than with in-order streaming). It receives section 3 at t=936 and renders it at t=1036ms (200ms earlier than with in-order streaming). And finally, it receives section 1 at t=1036ms and renders it at t=1136ms (100ms earlier than with in-order streaming) - <a href="/blog/web-frontend-performance/waterfall-diagram/multi-sections-page-streaming.json">Simulation numbers</a>.
    </figcaption>
</figure>

#### Beyond HTTP response streaming

In addition to HTTP response streaming, the Web platform provides APIs to stream data between the client and the server:

- [Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events) for textual server sent data,
- [WebSockets](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_client_applications) for bidirectional communication between servers and clients, and
- [WebRTC](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API) for peer to peer data streaming between clients.

More recently, newer APIs arrived like:

- [Streams API](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API) which allows reading standard HTTP response bodies and writing to HTTP request bodies in a streaming fashion, and
- [WebTransport](https://developer.mozilla.org/en-US/docs/Web/API/WebTransport_API) which is the newer and more capable replacement of WebSockets.

---

### 3.3. Preloading

In order to optimize the loading of webpages, browsers try to schedule the loading of resources assigning a [sensible priority](https://web.dev/articles/fetch-priority) to each sub-resource. As the browser parses the page, it discovers sub-resources and loads them or schedule them to be loaded. Browsers try to discover and load high priority resources as soon as possible - even before the page parser gets to see them. To do so, they use a [preload scanner](https://developer.mozilla.org/en-US/docs/Web/Performance/How_browsers_work#preload_scanner) process which runs concurrently with the main thread and which identifies and initiates the loading off sub-resources in the yet to be processed HTML.

There remains a limit though to what browsers can do automatically for us. After all, browsers cannot know if the page needs a sub-resource until they see it in the server response. For example: When loading a page which loads a CSS file `/style.css` which itself imports another CSS file `/style-dependency.css`. The browser may be able to discover the link to the first CSS file early by scanning the HTML document, but it has to fetch this file and to parse it before it discovers and fetches the second one.

```html
<!-- page1.html -->
<!doctype html>
<head>
  <link rel="stylesheet" href="/style.css" />
</head>
```

```css
/* /style.css */
@import "/style-dependency.css";
```

With preloading, web pages can declare the intent to use sub-resources without inserting them immediately into the page. This way the browser can start loading the preloaded sub-resources early, so that when they are ultimately needed, they load fast.

Preloading can be done using [`<link rel="preload">` tags](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/rel/preload), supported by all major browsers [since January 2021](https://caniuse.com/link-rel-preload). Using preload link tags in the previous example would look like the following:

```html
<!-- page1.html -->
<!doctype html>
<head>
  <link rel="preload" as="style" href="/style-dependency.css" />
  <link rel="stylesheet" href="/style.css" />
</head>
```

Another tool for preloading is the [Link HTTP response header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Link), supported by all major browsers [since late 2023](https://caniuse.com/mdn-http_headers_link). Link headers with `rel="preconnect"` or `rel="preload"` have the same semantic as the equivalent HTML `<link>` element, but they have the advantage that servers can send them before they start generating the page's HTML, helping browsers discover page sub-resources earlier. If we use Link headers in the previous example page, we get a first HTTP response chunk containing the headers:

```http
200 OK
Link: </style.css>; rel="preload"; as="style", </style-dependency.css>; rel="preload"; as="style"
```

followed by other response chunks with the rest of the page.

Since servers have to determine the status code of the page and sent it before they can send HTTP headers, there can be a delay before the Link HTTP headers are sent. That's why a third tool for preloading was created: The HTTP [103 Early Hints](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/103) informational response, available with preloading capability in all major browsers except Safari [since late 2023](https://caniuse.com/mdn-http_status_103_preload). Servers can send a 103 Early Hint response including preload Link headers and then send the actual response (including the status code) when they are ready. This allows browsers to discover and start fetching page sub-resources even earlier.

Using early hints, the previous example would look like. the following:

```http
103 Early Hint
Link: </style.css>; rel="preload"; as="style", </style-dependency.css>; rel="preload"; as="style"

200 OK
Content-Type: text/html

<!doctype html>
...
```

Note that you don't have to choose between preload link tags and preload link headers (with or without Early Hints). You can use both at the same time to support older browsers and to preload more things if they are discovered late during page loading.

The following 4 diagrams show the simulation of the loading of 4 versions of the same page `page.html` which loads a `style.css` stylesheet which itself requires another `style-dependency.css` stylesheet. The simulation uses the same parameters for the time it takes the server to determine the status code (250ms), to generate the page's head (100ms) and to generate the body (150ms). The 4 versions of the page differ in that:

- The first version does no preloading and loads in 1033ms.
- The second version preloads page styles using a `<link re="preload">` tag, and loads in 944ms.
- The third version preloads page styles using `Link` headers, and loads in 828ms.
- The forth version preloads page styles using an Early Hints response which delivers the preloading `Link` headers. And it loads in 796ms.

<figure id="figure-preload-not">
    <img
        alt="No preloading diagram"
        src="/blog/web-frontend-performance/waterfall-diagram/preload-not.svg"
        width="1173"
        height="820" />
    <figcaption>
        <a href="#figure-preload-not">No preloading:</a> In this example, after the client requests the page, it receives the page's head element at t=452ms, at which point it requests the <code>style.css</code>. Upon receiving this file (t=657ms), the client requests <code>style-dependency.css</code>. Only after receiving the two style files and the page's body, the client renders the page finishing at <a target="_blank" href="/blog/web-frontend-performance/waterfall-diagram/preload-not.json">t=1033ms</a>.
    </figcaption>
</figure>

<figure id="figure-preload-link-tag">
    <img
        alt="Preloading with link tags diagram"
        src="/blog/web-frontend-performance/waterfall-diagram/preload-link-tag.svg"
        width="1084"
        height="820" />
    <figcaption>
        <a href="#figure-preload-link-tag">Preloading with link tags:</a> In this example, after the client requests the page, it receives the page's head element at t=452ms, at which point it requests both <code>style.css</code> and the preloaded <code>style-dependency.css</code> file. After receiving the two style files and the page's body, the client renders the page finishing at <a target="_blank" href="/blog/web-frontend-performance/waterfall-diagram/preload-link-tag.json">t=944ms</a>.
    </figcaption>
</figure>

<figure id="figure-preload-link-header">
    <img
        alt="Preloading with link header diagram"
        src="/blog/web-frontend-performance/waterfall-diagram/preload-link-header.svg"
        width="968"
        height="980" />
    <figcaption>
        <a href="#figure-preload-link-header">Preloading with link headers:</a> In this example, after the client requests the page, it receives the page's headers for preloading at t=351ms, at which point it requests both <code>style.css</code> and <code>style-dependency.css</code> file. After receiving the two style files and the page's body, the client renders the page finishing at <a target="_blank" href="/blog/web-frontend-performance/waterfall-diagram/preload-link-header.json">t=828ms</a>.
    </figcaption>
</figure>

<figure id="figure-preload-early-hints">
    <img
        alt="Preloading with early hints diagram"
        src="/blog/web-frontend-performance/waterfall-diagram/preload-early-hints.svg"
        width="936"
        height="980" />
    <figcaption>
        <a href="#figure-preload-early-hints">Preloading with early hints:</a> In this example, after the client requests the page, it receives a 103 Early Hints response containing headers for preloading at t=101ms, at which point it requests both <code>style.css</code> and <code>style-dependency.css</code> file. After receiving the two style files and the page's body, the client renders the page finishing at <a target="_blank" href="/blog/web-frontend-performance/waterfall-diagram/preload-early-hints.json">t=796ms</a>.
    </figcaption>
</figure>

Now, let's explore now some use cases of preloading. The examples which will follow show loading speed improvements from preloading even though they only use the widely supported `<link rel="preload">` tags.

#### Preloading web fonts

By default, browsers load [web fonts](https://developer.mozilla.org/en-US/docs/Learn/CSS/Styling_text/Web_fonts) only when needed. That is, the browser doesn't load the web font files declared in the page's CSS until an element in the page uses `font-family` and `font-style` requiring them. Because of this, the browser may render parts of the page a first time using a system font and then rerender them again when the web fonts are loaded, causing layout shifts which can disturb users.

Preloading web font files helps address this problem. Layout shifts can be avoided altogether if the web fonts are loaded early enough, or at least they may occur early during the loading of the page as not to disturb the user too much. It is also good practice to [self host](https://web.dev/learn/performance/optimize-web-fonts#self-host_your_web_fonts) web fonts. Ie. to host them on one's own server, rather than relying on a third-party server, to avoid the latency of establishing a secure connection to a different host.

<figure id="figure-font-no-preload">
    <img
        alt="No web fonts preloading diagram"
        src="/blog/web-frontend-performance/waterfall-diagram/font-no-preload.svg"
        width="805"
        height="960" />
    <figcaption>
        <a href="#figure-font-no-preload">No web fonts preloading:</a> In this example, the client determines that it needs the two web font files only after it constructs the CSSOM (at t=388ms). It start fetching them at that point, renders the page a first time with a system font, and later rerenders the page a second time using the web fonts, finishing at <a target="_blank" href="/blog/web-frontend-performance/waterfall-diagram/font-no-preload.json">t=665ms</a>.
    </figcaption>
</figure>

<figure id="figure-font-preload">
    <img
        alt="Web fonts preloading diagram"
        src="/blog/web-frontend-performance/waterfall-diagram/font-preload.svg"
        width="696"
        height="940" />
    <figcaption>
    <p>
        <a href="#figure-font-preload">Web fonts preloading:</a> In this example, two web fonts are preloaded in the page's head element. As soon as the client receives the head element (t=112ms), it starts fetching the style file and the preloaded web fonts. Once the page's body is loaded and once the CSSOM is created, the client renders the page, once only, using the already loaded web fonts, finishing at <a target="_blank" href="/blog/web-frontend-performance/waterfall-diagram/font-preload.json">t=556ms</a> (109ms earlier than the example without preloading).
    </p>
    <p>
        Notice that <code>style.css</code> takes longer to load in this example than in the previous one. That is because the simulation is taking into account that the client is simultaneously downloading this file and the web font files.
    </p>
    </figcaption>
</figure>

#### Speeding up SPAs startup

In single-page applications that rely on client-side code for data retrieval, data fetching takes place only after the code is fully loaded and executed. To optimize this, we can use a preload tag to instruct the browser to start loading the page's data as soon as it retrieves the head of the page. This allows the data fetching to occur concurrently with the loading of the client-side code.

Preloading page data can enable performance that closely approximates what can be achieved using the streaming solutions discussed in the [previous section](#32-streaming), in which the server can start fetching page data as soon as it receives the request for the page's URL. Compared to that approach, preloading page data on the client adds latency because it has (1) to load the page's head and (2) to make a second request, before the actual data fetching can start on the server. However, this latency is significantly reduced when the webapp is served via a CDN, because the page's head is received very fast. Furthermore, when the page is loaded from the client cache, this latency disappears entirely, leading to no additional latency compared to the streaming solutions.

<figure id="figure-spa-no-preload">
    <img
        alt="SPA without preloading diagram"
        src="/blog/web-frontend-performance/waterfall-diagram/spa-no-preload.svg"
        width="1312"
        height="940" />
    <figcaption>
        <a href="#figure-spa-no-preload">SPA without preloading:</a> In this example, the client downloads the single page app's code which starts fetching page data at t=556ms. The data is received at t=972 and finally rendered to the screen at <a target="_blank" href="/blog/web-frontend-performance/waterfall-diagram/spa-no-preload.json">t=1172ms</a>.
    </figcaption>
</figure>

<figure id="figure-spa-preload">
    <img
        alt="SPA with preloading diagram"
        src="/blog/web-frontend-performance/waterfall-diagram/spa-preload.svg"
        width="896"
        height="920" />
    <figcaption>
        <a target="_blank" href="#figure-spa-preload">SPA with preloading:</a> In this example, as soon as the client receives the page's head element (t=112ms) it starts preloading the page's data. The data is received at t=529ms and is ultimately rendered to the screen at <a href="/blog/web-frontend-performance/waterfall-diagram/spa-preload.json">t=756ms</a> (416ms earlier than the example without preloading).
    </figcaption>
</figure>

#### Speeding up client-side navigation

Preloading can also improve the speed of client-side navigation. When the user clicks a link, the client-side router had to load the next page's JavaScript code and its data, ideally in parallel.
A further optimization is to prefetch next page's code and data when the user hovers over its link.

<figure id="figure-client-side-navigation-no-preload">
    <img
        alt="Client-side navigation without preloading diagram"
        src="/blog/web-frontend-performance/waterfall-diagram/client-side-navigation-no-preload.svg"
        width="1679"
        height="620" />
    <figcaption>
        <a href="#figure-client-side-navigation-no-preload">Client-side navigation without preloading:</a> In this example, when the user clicks the link at t=500ms (500ms after they hover over it), the client-side router downloads the code for the next page. Once the code is loaded (t=976ms), it fetches the data for that page. The data is received at t=1339ms and is rendered to the user at <a target="_blank" href="/blog/web-frontend-performance/waterfall-diagram/client-side-navigation-no-preload.json">t=1539ms</a> (1 second after the click).
    </figcaption>
</figure>

<figure id="figure-client-side-navigation-preload-data">
    <img
        alt="Waterfall diagram"
        src="/blog/web-frontend-performance/waterfall-diagram/client-side-navigation-preload-data.svg"
        width="1330"
        height="620" />
    <figcaption>
        <a href="#figure-client-side-navigation-preload-data">Client-side navigation with data preloading:</a> In this example, when the user clicks the link at t=500ms (500ms after they hover over it), the client-side router downloads the code for the next page while simultaneously fetching its data. The page is ultimately rendered to the user <a target="_blank" href="/blog/web-frontend-performance/waterfall-diagram/client-side-navigation-preload-data.json">t=1190ms</a> (690ms after the click).
    </figcaption>
</figure>

<figure id="figure-client-side-navigation-preload-code-data">
    <img
        alt="Waterfall diagram"
        src="/blog/web-frontend-performance/waterfall-diagram/client-side-navigation-preload-code-data.svg"
        width="840"
        height="620" />
    <figcaption>
    <p>
        <a href="#figure-client-side-navigation-preload-code-data">Client-side navigation with code and data preloading:</a> In this example, when the user hovers over the link, the client-side router preloads the next page's code and data. When the link is eventually clicked (t=500ms), both code and data are available. As a result, the page is rendered to the user at <a target="_blank" href="/blog/web-frontend-performance/waterfall-diagram/client-side-navigation-preload-code-data.json">t=700ms</a> (200ms after the click).
    </p>
    <p>
        In fact, if we started rendering the preloaded next page offscreen before the click, it could have been shown to the user even faster.
    </p>
    </figcaption>
</figure>

---

### 3.4. Deferring non-critical resources

CSS and JavaScript resources are sometimes [render-blocking](https://developer.mozilla.org/en-US/docs/Glossary/Render_blocking), meaning that the browser has to wait for them to load before rendering the page to the user. This is necessary to prevent the [Flash Of Unstyled Content (FOUC)](https://en.wikipedia.org/wiki/Flash_of_unstyled_content), where users briefly see unstyled elements before the styles are applied.

Any CSS and JavaScript resources that are not needed for the initial rendering of the page, should ideally be loaded asynchronously in order to unclutter the [critical rendering path](https://developer.mozilla.org/en-US/docs/Web/Performance/Critical_rendering_path).
This can be achieved using:

- the `async` and `defer` attributes on [script tags](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#async), and
- media queries to [asynchronously load CSS files](https://css-tricks.com/the-simplest-way-to-load-css-asynchronously/).

<figure id="figure-render-blocking-script">
    <img
        alt="Using a single render-blocking script diagram"
        src="/blog/web-frontend-performance/waterfall-diagram/streaming-html.svg"
        width="925"
        height="780" />
    <figcaption>
        <a href="#figure-render-blocking-script">Using a single render-blocking script:</a> In this example, the user requests an HTML page
        which loads render blocking CSS and JavaScript files. The browser processes these files constructing CSSOM and
        executing JavaScript code before rendering the page, finishing at <a href="/blog/web-frontend-performance/waterfall-diagram/streaming-html.json">t=785ms</a>.
    </figcaption>
</figure>

<figure id="figure-async-script">
    <img
        alt="Asynchronously loading non-critical JavaScript diagram"
        src="/blog/web-frontend-performance/waterfall-diagram/split-render-blocking-resources.svg"
        width="1025"
        height="1000" />
    <figcaption>
            <p>
                <a href="#figure-async-script">Asynchronously loading non-critical JavaScript:</a> In this example, the page's script is split into a render blocking one
                and a second asynchronously loaded script. As soon as the render blocking CSS and JavaScript resources are processed, the browser renders the page <a href="/blog/web-frontend-performance/waterfall-diagram/split-render-blocking-resources.json">at t=572ms</a> (213ms earlier than the <a href="#figure-render-blocking-script">previous example</a>). As for the async script, the browser loads it with low priority, executes it and rerenders the page again, finishing completely at t=885ms (100ms later than the previous example).
            </p>
            <p>
                Notice that <code>style.css</code> loads in this example faster than the same file in the previous example. That's because the simulation takes into account that once the smaller script file from this example is done loading, <code>style.css</code> continues loading using the whole network bandwidth. 
            </p>
    </figcaption>
</figure>

---

### 3.5. Lazy loading

Loading content only when necessary, a technique known as [lazy loading](https://developer.mozilla.org/en-US/docs/Web/Performance/Lazy_loading), can enhance performance by allowing high-priority resources to load without the interference of low-priority ones.
This can be achieved in HTML by marking images and iframes with the attribute `loading="lazy"` to delay their loading until they need to be rendered on the screen.

Beyond what is natively possible on the web, web frameworks offer means to lazily load code and data:

- Individual components can be marked as lazy which gets them extracted into a separate code bundle that is only loaded when the component is instantiated by the application.
- Client-side routers (previously discussed [here](#282-client-side-navigation)) often delay the loading of the code of different routes until the user navigates to them.
- Frameworks like [Astro](https://docs.astro.build/en/concepts/islands/#client-islands), [Nuxt](https://nuxt.com/modules/delay-hydration) and [Angular](https://angular.dev/guide/incremental-hydration) support lazy hydration where certain server-rendered components are initialized (and their code is loaded) only on certain conditions such as when they appear on the screen or when the user interacts with them. The [Qwik](https://qwik.dev/) framework achieves something similar with its [resumability](https://qwik.dev/docs/concepts/resumable/)

Keep in mind that lazy loading can cause users to wait when the resources are finally needed. To mitigate this, applications should start loading resources as they become likely to be needed.

---

## Conclusion

To summarize this article:

- In chapter 1, we briefly discussed that the web relies on a physical infrastructure, which has environmental and financial impacts. This motivates us to seek performance improvements mainly through software optimizations, rather than hardware upgrades.
- In chapter 2, we covered techniques that **reduce resource waste** by smartly reallocating work. Improving one area can sometimes negatively affect others, but good trade-offs exist and can lead to overall reduction of work and to better performance.
  - Minimalism, while not a technical method, can lower the workload on the entire system: clients, network and servers.
  - Caching uses persistent memory to reduce CPU load on servers and to save bandwidth.
  - Compression uses CPU cycles on both ends of the network to save bandwidth.
  - CDNs deploy a network of distributed servers to bring data closer to users.
  - Bundling sacrifices some caching opportunities to reduce latency by combining resources and avoiding network back-and-forths.
  - Reducing image and webfont sizes through proper formats and resizing helps improve load times.
  - Client-side code size can be reduced by:
    - Using optimizing bundlers, which can make build systems more complex and more resource intensive,
    - Choosing dependencies carefully,
    - Moving some work to the server, which can incur network overhead.
  - Client CPU usage can be lowered by:
    - Being mindful as developers of how browsers function and avoiding to accidentally overload them with work,
    - Using client-side routing in large apps, which adds complexity,
    - Using WebAssembly for intensive calculations.
- In chapter 3, we looked at techniques to **save time** by smart scheduling:
  - The client can respond fast to user events as long as long-running code doesn't block the main thread.
  - Pages can load faster through:
    - Streaming, which delivers content progressively and helps fetch sub-resources early,
    - Preloading, which informs the clients about resources needed soon so they fetch them early,
    - Deferring and lazy-loading, which loads some sub-resources later to speed up higher-priority content.

Due to the multiplicity of factors affecting performance, and due to the unique needs of websites and applications, there is not a one-size-fits-all solution or framework. In fact, websites and apps can perform well even when using subpar technologies, as long as the overall architecture fits their needs. That said, I would say that the best frameworks performance-wise are those that enable developers to choose the high-performance options with minimum friction and while keeping the code clear and maintainable.
