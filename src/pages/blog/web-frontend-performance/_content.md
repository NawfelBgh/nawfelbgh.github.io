# Introduction

In this article, I will discuss techniques for optimizing the performance of web frontends.
There are many reasons to focus on this:

- Reducing costs for the website owners and the users
- Providing users with a smooth and enjoyable browsing experience
- Avoiding penalties from search engines that prioritize fast-loading sites
- Ensuring accessibility for users with slow devices and networks
- Reducing the environmental impact of web-based services

The article is structured as follows:

- I start with an overview of the logical and physical components that make up the web.
- Next, I explore optimization strategies that minimize the workload required to display web content.
- Finally, I discuss strategies for scheduling tasks efficiently to minimize user wait times.

Here are some key takeaways from the article:

- Trade-offs are necessary. Optimizing one aspect can negatively affect performance in another area. I tried to highlight this whenever possible throughout the document.
- Websites and apps can still perform well, even with less-than-ideal technologies on the client or server side, as long as the architecture is well-designed.
- Some optimizations come with trade-offs that can impact users, which means they should only be pursued at the product owner's request. Project owners need to understand what architectural elements contribute to high-performing websites and apps, ask developers to adopt these designs, and ensure they're implemented during quality control.

Finally, this article is by no means a comprehensive guide to web performance. It completely glosses over backend performance. And, It is inevitably biased by my experience using JavaScript frameworks (mainly React) and with WordPress.

# Table of content

- [Introduction](#introduction)
- [Table of content](#table-of-content)
- [What makes up Web frontends](#what-makes-up-web-frontends)
  - [Improving performance by using more powerful hardware](#improving-performance-by-using-more-powerful-hardware)
  - [The environmental footprint of the Web](#the-environmental-footprint-of-the-web)
    - [Frontends contribution to the web's environmental footprint](#frontends-contribution-to-the-webs-environmental-footprint)
- [Optimizing performance by doing less work](#optimizing-performance-by-doing-less-work)
  - [Caching](#caching)
    - [HTTP caching](#http-caching)
      - [Fresh and stale cached data](#fresh-and-stale-cached-data)
      - [Revalidating stale data in the background](#revalidating-stale-data-in-the-background)
      - [Client-requested cache revalidation](#client-requested-cache-revalidation)
      - [Cache busting](#cache-busting)
      - [Caching static portions of webpages](#caching-static-portions-of-webpages)
    - [Service Workers](#service-workers)
    - [Caching in interactive WebApps](#caching-in-interactive-webapps)
    - [Caching compiled code](#caching-compiled-code)
  - [Reducing content size](#reducing-content-size)
    - [Image optimization](#image-optimization)
    - [Subsetting web font files](#subsetting-web-font-files)
    - [HTTP responses compression](#http-responses-compression)
    - [HTTP headers compression](#http-headers-compression)
  - [Content Delivery Networks](#content-delivery-networks)
  - [Bundling resources](#bundling-resources)
    - [Bundling in the HTTP/2 era](#bundling-in-the-http2-era)
  - [Reducing client-side code size](#reducing-client-side-code-size)
    - [Using optimizing bundlers](#using-optimizing-bundlers)
      - [Minification](#minification)
      - [Tree-shaking](#tree-shaking)
    - [Using small libraries and third-party scripts](#using-small-libraries-and-third-party-scripts)
    - [Keeping code in the server](#keeping-code-in-the-server)
      - [Server side rendering](#server-side-rendering)
  - [Reducing CPU work in the client](#reducing-cpu-work-in-the-client)
- [Scheduling work to make users wait less](#scheduling-work-to-make-users-wait-less)
  - [Do not block the UI thread](#do-not-block-the-ui-thread)
  - [Optimizing resources loading](#optimizing-resources-loading)
    - [Gradual content delivery with streaming](#gradual-content-delivery-with-streaming)
      - [Unlocking Parallelism with Streaming](#unlocking-parallelism-with-streaming)
      - [Out-Of-Order Streaming](#out-of-order-streaming)
      - [Beyond HTTP responses streaming](#beyond-http-responses-streaming)
    - [Loading resources at the right time](#loading-resources-at-the-right-time)
      - [Preloading](#preloading)
        - [Preloading web fonts](#preloading-web-fonts)
        - [Speeding up SPAs startup](#speeding-up-spas-startup)
      - [Deferring non-critical styles and scripts](#deferring-non-critical-styles-and-scripts)
      - [Lazy loading](#lazy-loading)
- [Throwing hardware at the problem](#throwing-hardware-at-the-problem)
  - [Scaling the server](#scaling-the-server)
    - [Scaling different services as needed](#scaling-different-services-as-needed)
  - [On the environmental footprint of the Web](#on-the-environmental-footprint-of-the-web)
- [Conclusion](#conclusion)

# What makes up Web frontends

Let's begin with a simple overview of the key components that make up the web:

Users access the web using web browsers, also referred to as web clients, which are installed on their devices. These devices are connected to the Internet, a global network of computers linked by relay devices. Besides user devices, there are server machines that also connect to the Internet.

The term "server" can refer to the physical hardware, but it also describes the server software (referred to simply as "servers" in this article) that runs on these machines.

Clients can request [Web resources](https://en.wikipedia.org/wiki/Web_resource) (referred to simply as "resources" in this article) from servers. These resources are essentially files that can be identified by [URLs](https://en.wikipedia.org/wiki/URL) (Uniform Resource Locators).

Servers have various roles, including database servers, backend servers (which implement business logic), and frontend servers (sometimes called Back for Front or BFF servers) that respond to requests from web clients. In this article, we will explore how to optimize frontend servers, along with client code and network usage.

<figure id="figure-client-server-model">
    <img />
    <figcaption>
        <a href="#figure-client-server-model">The Web's client-server model:</a> blah blah user client frontend server backend server network resources requests responses
    </figcaption>
</figure>

<figure id="figure-web-infra">
    <img
        alt="Web infrastructure"
        src="/blog/web-frontend-performance/web-infra.svg"
        width="1000"
    />
    <figcaption>
       <a href="#figure-web-infra">The physical infrastructure of the Web:</a> This figure shows components of the infrastructure of the Web: Servers, users' devices, network relay devices. It shows also that the web is embedded in a natural system. Space is taken from those natural systems to make the physical resources necessary for running the Web. This is represented here by mines, factories and solar panels.
       The network connections have different capacities (or bandwidth). User devices also are not equally powerful. In this figure, a rich user (the user with the hat) has a stronger device and is connected to the Internet through a higher capacity link, compared to the other two users.
    </figcaption>
</figure>

## Improving performance by using more powerful hardware

One way to make web frontends faster is by using more powerful hardware:

- Upgrading users' devices,
- Building faster networks,
- Using more powerful server machines, and
- Using more server machines.

The first two options usually require users to pay, as they cannot change the web applications themselves. Users may upgrade their devices or internet plans, or they may look for faster alternative web applications.

The last three upgrades are paid for by the website owners, which can lead to higher costs for users. These upgrades are necessary when the current infrastructure cannot adequately serve users and when software optimizations are not feasible—perhaps because the software is already optimized for the existing hardware, or due to a lack of time or manpower for software optimization.

Relying on hardware upgrades to solve performance issues should be a last resort, as it can be costly and therefore only affordable for those with financial resources. Furthermore, the production of hardware and the consumption of energy for web services compete for physical resources with other human activities and have an environmental impact.

<figure id="figure-web-infra-bigger">
    <img
        alt="Bigger Web Infrastructure"
        src="/blog/web-frontend-performance/web-infra-bigger.svg"
        width="1000"
    />
    <figcaption>
       <a href="#figure-web-infra-bigger">Bigger Web Infrastructure:</a> This figure shows a similar infrastructure to the one in <a>the previous figure</a>: Here, the servers and the network relay devices are more powerful. This is depicted using bigger sizes. And the network connections are of bigger capacity. The rich user device is also more powerful. The other users devices and connection is the same. I note also that to grow the web infrastructure, more space is taken from the natural systems. This is depicted here with more mines, solar panels and factories and with less presence of wild life.
    </figcaption>
</figure>

## The environmental footprint of the Web

The web is a vast distributed system of hardware components that require physical resources throughout their entire lifecycle:

- Building the hardware requires mining and manufacturing, both of which consume energy and generate pollution.
- Using the hardware also requires energy.
- Finally, disposing of retired hardware has an impact on the environment.

If we only take into account carbon emissions, which is a proxy for energy consumption, the Internet is currently estimated to account for around 4% of global carbon emissions. This is comparable to the entire aviation industry (See: [Introduction to web sustainability](https://developer.mozilla.org/en-US/blog/introduction-to-web-sustainability/)).

It’s also worth noting that, worldwide, around 60% of electricity is generated by burning fossil fuels ([Electricity Mix](https://ourworldindata.org/electricity-mix)), and that certain processes in the mining, metals refinement, and the manufacturing industry currently require burning fossil fuels. For example, for generating high heat and for transportation.

### Frontends contribution to the web's environmental footprint

Due to the sheer number of user devices, studies (such as [Estimating Digital Emissions](https://sustainablewebdesign.org/estimating-digital-emissions/) and [Environmental footprint of the digital world](https://www.greenit.fr/environmental-footprint-of-the-digital-world/)) estimate that user devices have larger environmental impact than both networks and data centers, and that networks have a greater impact than data centers.

This means that frontend developers have both the power and the responsibility to reduce the environmental impact of the web.

<figure id="figure-emissions-breakdown">
    <img
        alt="Emissions breakdown of the web's infrastructure"
        src="/blog/web-frontend-performance/web-infra-bigger.svg"
        width="1000"
    />
    <figcaption>
        <p>
            <a href="#figure-emissions-breakdown">The breakdown of emissions per tier and per lifecycle phase:</a> This figure showcases data from the article <a href="https://sustainablewebdesign.org/estimating-digital-emissions/">Estimating Digital Emissions</a>.
        </p>
        <p>
            The x-axis shows estimated percentages of the energy used by data centers, networks and user devices. Respectively: 22%, 24% and 54%, user devices dominating the mix.
        </p>
        <p>
            The y-axis shows estimated percentages of Greenhouse gases emitted during the manufacturing phase (embodied emissions) and during the operational phase of Data centers, Networks and User devices.
            Both data centers and networks emit 82% during operation and 18% during manufacturing.
            As for user devices, they emit 49% during operation and 51% during manufacturing.
        </p>
        Replace with
        https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4424264
        file:///Users/nawfelbengherbia/Downloads/ssrn-4424264.pdf
        page 12 fig 3
    </figcaption>
</figure>

---

# Optimizing performance by doing less work

In this chapter, I present techniques that reduce the workload for server machines, user devices, and the network, by shifting work within the system as to:

- make efficient use of available hardware resources,
- reduce the overall work required in the whole system,
- and reduce the time needed to serve the frontend to the user.

## Performance through minimalism

Before diving into the technical side of things, it is worth mentioning minimalism as a non technical, or a less technical, solution to make frontends fast.

Bloat is a very well known phenomenon in [software in general](https://en.wikipedia.org/wiki/Software_bloat) and in the web in particular. According to [the HTTP Archive](https://httparchive.org/reports/page-weight#bytesTotal), as of december 2024, the median desktop web pages loads 2.67 MB of data (almost 6 times the median web page from 2011).

On this subject, I recommend Maciej Cegłowski's hilarious talk: [The Website Obesity Crisis](https://idlewords.com/talks/bsite_obesity.htm):

> [Maciej's] modest proposal: your website should not exceed in file size the major works of Russian literature. Anna Karenina, for example, is 1.8 MB

Minimalism is one way to approach this issue of web bloat. It is encouraged in the [Sustainable Web design](https://stainablewebdesign.org/) and the [eco-sufficiency](https://en.wikipedia.org/wiki/Eco-sufficiency) spheres, where people question the usefulness (to the site owner and to the users) of the content delivered by websites and applications. They ask questions like:

- Is this image or this script really useful
- Does this image or script have to be this big
- Is this old content, or say this polyfill script, still relevant today or should we remove it

[Sustainable Web design](https://sustainablewebdesign.org/) goes beyond minimalism. It encompasses user experience design, carbon intensity and also the technical solutions addressed in the rest of this article.

## Caching

Caching is a powerful tool for optimizing performance. Instead of repeatedly performing the same task, such as sending identical data to the client over and over or regenerating the same page on the server multiple times, server responses can be stored in caches on both the client and server sides for reuse when requested again.

This approach sacrifices some memory on the client and server to reduce CPU workload on the server and decrease network bandwidth usage.

Caching can be implemented to some extent without users noticing. However, the best performance gains can only be realized by accepting that some users may not see the most recent version of certain data immediately after it is published. The challenge arises when clients are instructed to store and reuse a response until a certain expiration time without contacting the server; it can be difficult to inform them of updates that occur before that expiration.

As a result, caching decisions should not be made by developers alone; input from the product owner is crucial. Both developers and product owners need to understand the level of cache control that web technologies offer and what is acceptable for different types of resources on their websites and applications to implement effective caching.

### HTTP caching

To support [caching requirements](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching), the HTTP protocol provides a range of [standard headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers). For example:

- Response [Cache-Control](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control) headers allow servers to tell clients and intermediary caches when they can store and reuse server’s responses, and for how long,
- Request Cache-Control headers allow clients to ask intermediary caches to reach to the origin server to get fresher content,
- Other response headers such as `Last-Modified` and `ETag` and request headers such as `If-Modified-Since` and `If-None-Match` allow implementing [conditional requests](https://developer.mozilla.org/en-US/docs/Web/HTTP/Conditional_requests) as we will see shortly.

Caching can be done both by clients and intermediary servers. Cache-Control headers can mark responses as private, making them cacheable by the end users' browsers only, or as public making them cacheable by intermediary servers too. This allows both public content and private and/or user-customized content to benefit from caching.

<figure id="caching-with-shared-cache">
    <img
        alt="Caching with shared cache"
        src="/blog/web-frontend-performance/caching-with-shared-cache.svg"
        width="1000"
    />
    <figcaption>
       <a href="#caching-with-shared-cache">Shared and private caches</a>: In this example, when the server responds to Client 1's request, both the shared cache and Client 1's private cache save the response. When Client 2 requests the same data, the shared cache responds without contacting the origin server, and Client 2's private cache saves the response as well. When both Clients 1 and 2 need the same data again, they can reuse the version saved in their private caches without requiring any network traffic. The origin server generates this piece of data only once.
    </figcaption>
</figure>

#### Fresh and stale cached data

When an HTTP response is stored in a cache, it remains fresh for a certain duration. Once that duration is elapsed, the response becomes stale. If the freshness duration is not specified by a `Cache-Control: max-age` header or an `Expires` header, caches will chose it heuristically.
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
        width="1000"
    />
    <figcaption>
        <p>
            <a href="#cache-revalidation">Cache revalidation</a>: In this example, the user requests a page and receives a 50KB response containing version 1 of the page, which stays fresh in the cache for 10 minutes. The user requests the page a second time after 5 minutes, and since the response stored in the cache is still fresh, the cache sends it to the user. After another 5 minutes, the user requests the page again, but the cached version is now stale. Therefore, the cache sends a conditional request (<code>If-None-Match: "version 1"</code>) to the server to verify that version 1 of the page is still the currently published version. In response to this conditional request, the server sends a 304 Not Modified header with no body. Seeing this, the cache marks the response it already has as fresh again and uses it to respond to the user.
       </p>
       <p>
            After that, the site editor publishes version 2 of the page. When the user requests the page once more, the cached version is now stale. The cache sends another conditional request to the server, to which the server responds with a new 50KB response containing version 2 of the page. The cache stores this new version (replacing the old one) and responds to the user with it.
       </p>
    </figcaption>
</figure>

#### Revalidating stale data in the background

`Stale-while-revalidate` (also referred to as SWR) is another cache control option that the server can provide alongside `max-age`. It defines a period during which the cache can respond with stale data while revalidating the content in the background using a conditional request.
The stale-while-revalidate strategy can only be used when it is acceptable to show not up-to-date content to the user. It has the advantage of hiding the delays associated with the revalidation of cached data.

<figure id="cache-swr">
    <img
        alt="Stale While Revalidate caching mechanism"
        src="/blog/web-frontend-performance/cache-swr.svg"
        width="1000"
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

#### Client-requested cache revalidation

Clients can ask intermediary caches to [disregard cached responses](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching#reload_and_force_reload) and to reach to the origin server:

- When the user presses the reload page button, the browser sends a conditional request with `Cache-Control: max-age=0` so that cached responses are not reused.
- And when the user does a forced reload (typically using the keyboard command Ctrl+Shift+R), the browser sends non-conditional requests with `Cache-Control: no-cache`, telling caches to ignore their stored content and forward the request to the origin server.

<figure id="figure-client-requested-cache-revalidation">
    <img
        alt="Client-requested cache revalidation"
        src="/blog/web-frontend-performance/client-requested-cache-revalidation.svg"
        width="1000"
    />
    <figcaption>
        <p>
            <a href="#figure-client-requested-cache-revalidation">Client-requested cache revalidation:</a> In this example, the client requests a page containing an image. It receives responses from a shared cache, which are also stored in the client's local cache. The user then presses Ctrl+Shift+R. Although the page is still fresh in the local cache, the client ignores its stored version and sends a request with <code>Cache-Control: no-cache</code> header to the server. Seeing this header, the shared cache ignores its stored version and forwards the request to the server. Once the client receives the page, it requests the image on the page, always using <code>Cache-Control: no-cache</code> header.
        </p>
    </figcaption>
</figure>

#### Cache busting

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
        width="1000"
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

- Wikipedia, being one of the largest and most visited websites, want to cache their pages for as long as possible and cannot afford to update all their pages whenever a script or a style file is modified. So, [they implement cache busting as follows](https://www.mediawiki.org/wiki/ResourceLoader/Architecture): Their pages load a startup script from a fixed URL, and it is this startup script that points to versioned and cache-busted sub-resources. The startup script has a `max-age` of 5 minutes. This way, pages can have long `max-age`s while still being able to load newly published sub-resources.

#### Caching static portions of webpages

Web pages often contain both static elements, which are the same for all users, and dynamic elements that vary based on individual user sessions. For example, on a product page of an e-commerce site, the static elements would include the product details, while the dynamic elements would consist of the contents of the user's shopping basket, along with action forms that are secured by session-specific [CSRF](https://en.wikipedia.org/wiki/Cross-site_request_forgery) tokens.

We want to leverage caching for the static elements while still being able to provide personalized dynamic content. One approach to achieve this is to include only the static elements in the main HTML document, which can be cached on the client side and in intermediary caches. To retrieve the dynamic parts of the page, additional requests are made, which introduce some latency for these parts.

For examples of how to do this, check out:

- [Caching the Uncacheable: CSRF Security](https://www.fastly.com/blog/caching-uncacheable-csrf-security): This article from 2014 explains how to inject dynamic, user-specific CSRF tokens into cached HTML pages.
- Features from different frameworks allowing webpages to fetch page parts using separate HTTP requests:
  - [Hotwire Turbo](https://turbo.hotwired.dev/)'s [Frames](https://turbo.hotwired.dev/handbook/introduction#turbo-frames%3A-decompose-complex-pages).
  - [HTMX](https://htmx.org/)'s [Lazy Loading](https://htmx.org/examples/lazy-load/) feature.
  - [Unpoly](https://unpoly.com/)'s [deferred fragments](https://unpoly.com/lazy-loading).
  - [Astro](https://astro.build/)'s [Server Islands](https://docs.astro.build/en/guides/server-islands/).

<figure id="figure-request-dynamic-page-parts">
    <img
        alt="Fetching dynamic page parts with a separate request"
        src="/blog/web-frontend-performance/request-dynamic-page-parts.svg"
        width="1000"
    />
    <figcaption>
        <p>
            <a href="#figure-request-dynamic-page-parts">Fetching dynamic page parts with a separate request:</a> In this example, the client requests a page and receives a response from a shared cache. The page includes a script that fetches the dynamic parts of the page using a second request. This second request reaches the server, which responds with a non-cacheable response. The client requests the page again. This time, it is loaded directly from its local cache, and a second request is sent to retrieve the dynamic parts from the server.
        </p>
    </figcaption>
</figure>

### Service Workers

Since 2018, all major browsers support the [Service Worker](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API) and [Cache Storage](https://developer.mozilla.org/en-US/docs/Web/API/CacheStorage) APIs. The former API allows websites to register a JavaScript worker in clients’ browsers. This worker acts like a proxy server intercepting and responding to client network requests. As for the Cache Storage API, it allows web applications to programmatically manage a cache. Together, those APIs make it possible to write offline web applications and to implement caching rules that go beyond what is possible in standard HTTP.

### Caching in interactive WebApps

In interactive [AJAX](<https://en.wikipedia.org/wiki/Ajax_(programming)>)-heavy web applications, client-side JavaScript code loads data from the server and later decides when to refetch the data again, for example, after a certain time interval or after the user performs an action that writes to the server's database.

This data loading and reloading by client-side code can be seen as cache management, where the data loaded on the client is regarded as a cached version of the server data. Many developers in the JavaScript community reach for the [TanStack Query](https://tanstack.com/query/latest/docs/framework/react/overview) library, which provides APIs for cache management, as well as DevTools and integrations with various web frameworks.

### Caching compiled code

Browsers do not only cache server responses; they can also cache compiled JavaScript code to optimize the startup time of frequently used web applications. For more information on this, check out the following articles by the [Chromium](https://v8.dev/blog/code-caching) and [Firefox](https://blog.mozilla.org/javascript/2017/12/12/javascript-startup-bytecode-cache/) teams.

---

## Reducing content size

Now, we will look at techniques to reduce the size of webpages and their sub-resources. This helps reduce network traffic and the amount of data that the client has to process.

### Image optimization

Images make up [around 50%](https://developer.mozilla.org/en-US/docs/Learn/Performance/Multimedia) of the bandwidth of the average website , making them a good candidate for optimization. Image file sizes can be reduced by:

- Resizing images to no more than the resolution at which they are ultimately rendered on users’ screens.
- Using vector graphics ([SVG](https://developer.mozilla.org/en-US/docs/Web/SVG)s) when possible.
- Encoding images using [lossy compression](https://en.wikipedia.org/wiki/Lossy_compression) when it provides good enough quality (for example, by using the JPEG format instead of PNG).
- Encoding images using modern, well-optimized file formats like [AVIF](https://en.wikipedia.org/wiki/AVIF) or [WEBP](https://en.wikipedia.org/wiki/WebP).

The HTML `<img>`, `<picture>` and `<video>` elements allow webpages to [provide multiple sources for the same multimedia item](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/source) and let the browser pick the version of the appropriate format and size.
This allows us to cater to the needs of all users, by providing alternative versions of each image: Different resolutions for different screen sizes, and images in both modern, well-optimized file formats for new browsers and in older formats for legacy browsers.

As setting up a system that provides multiple sources for each image can be quite complex, many web frameworks and hosting services include image optimization tools to automate this task.

### Subsetting web font files

Web pages can use text fonts installed on users' systems or load custom web font files. [Web fonts](https://developer.mozilla.org/en-US/docs/Learn/CSS/Styling_text/Web_fonts) can be large, as they may include the glyphs of a very large set of Unicode characters to support many languages. To avoid loading glyphs that are never used on the web page, font files can be split into separate files that define the glyphs of subsets of Unicode characters (for example, only Latin characters or only Arabic characters). This process is called subsetting.

When a web font is defined by multiple subset files, the browser ensures it downloads only the files containing glyphs that actually appear on the page. Check out the MDN articles on [unicode-range](https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/unicode-range) and the section on [loading only the glyphs you need](https://developer.mozilla.org/en-US/docs/Learn/Performance/CSS#loading_only_the_glyphs_you_need).

### HTTP responses compression

[Compressing HTTP responses](https://developer.mozilla.org/en-US/docs/Web/HTTP/Compression) can substantially reduce network usage. This feature is implemented by practically all web browsers, as well as most popular web server stacks and web hosting services, making its activation a matter of proper server configuration.

HTTP response compression works through content negotiation between clients and servers:

- Clients send a list of supported compression formats using the `Accept-Encoding` request header,
- Servers can compress their responses using an algorithm that both they and the client support.
  - They indicate which algorithm they used with the `Content-Encoding` response header.
  - They also send the `Vary` response header to instruct caches to treat requests to the same URL with different `Accept-Encoding` header values as separately cacheable entities.

<figure id="figure-response-compression">
    <img
        alt="Cache busting"
        src="/blog/web-frontend-performance/content-negociation.svg"
        width="1000"
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

### HTTP headers compression

In addition to response body compression, [HTTP/2](https://en.wikipedia.org/wiki/HTTP/2) introduced header compression via the [HPACK](https://www.rfc-editor.org/rfc/rfc7541.html) format and later via the [QPACK](https://www.rfc-editor.org/rfc/rfc9204.html) format in [HTTP/3](https://en.wikipedia.org/wiki/HTTP/3). Header compression is implemented by browsers and the HTTP stack of web servers, requiring no effort from web developers. That said, knowing that it exists and how it works can inform some optimization decisions.

Header compression uses:

- A static dictionary containing a set of commonly used header fields,
- Per-connection dynamic dictionaries that are kept in sync between the client and the server, storing previously sent header fields.

Request and response header fields can be encoded either literally or, when possible, using indices that reference entries in the static or dynamic dictionaries. This translates to replacing potentially long strings with one or a few bytes.

Thanks to dynamic dictionaries, repeatedly sent headers such as cookies can be sent only once during the lifetime of an HTTP connection, reducing network usage compared to HTTP/1.1, where they need to be sent with every request. This makes it possible to forgo the practice of hosting static content in cookie-less domains to avoid the cost of cookie retransmission.

<figure id="figure-hpack">
    <img
        alt="HPack HTTP header compression"
        src="/blog/web-frontend-performance/hpack.svg"
        width="1000"
    />
    <figcaption>
        <p>
            <a href="#hpack">Header compression:</a> This example shows how headers in textual format are encoded using HPACK, replacing literal values with one-byte-sized indices to the static and dynamic tables whenever possible.
        </p>
    </figcaption>
</figure>

---

## Content Delivery Networks

The longer the distance between the client and the server, the more time it takes for data packets to travel between the two. The resulting time delays are called [network latency](https://developer.mozilla.org/en-US/docs/Web/Performance/Understanding_latency) and are the result of physical limits; it takes a beam of light approximately [130ms](https://blog.cloudflare.com/http-2-for-web-developers) to travel around the circumference of the Earth.

[Content Delivery Networks](https://en.wikipedia.org/wiki/Content_delivery_network) (CDNs) aim to address the issue of latency caused by the physical distance between servers and clients. A CDN is a group of geographically distributed proxy servers that sit between servers and clients, caching server responses when possible and delivering them to clients from a nearby node (called a PoP, or Point of Presence).

CDNs take care of [TLS termination](https://en.wikipedia.org/wiki/TLS_termination_proxy), HTTP caching, and compression, in addition to other features that vary from one provider to another.

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
       <a href="#world-map-no-cdn">With a CDN:</a> In this example, most requests are handled by PoP servers located close to the users, resulting in low latency for all users. However, a small proportion of requests can only be processed by the origin server, which means that distant users still experience high latency for these requests.
    </figcaption>
</figure>

---

## Bundling resources

Some network latency is introduced each time an HTML document or one of its resources loads other resources. This latency and network overhead can be avoided by embedding resources inline instead of referencing them by URL. Depending on the context, this is referred to as inlining, embedding, concatenation, or bundling. For example:

- HTML documents can contain inline `<script>`, `<style>` and `<svg>` tags.
- HTML, CSS and JavaScript files can embed multimedia files using [data URLs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URLs).
- Stylesheet files can be concatenated.
- JavaScript modules and their dependencies can be bundled together and sent as a single file to the client.
- Multiple images can be combined into a single sprite image that is split back into individual pieces using [CSS](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_images/Implementing_image_sprites_in_CSS) or [SVG](https://www.sitepoint.com/use-svg-image-sprites/) techniques.

<figure id="figure-no-resource-bundling">
    <img
        alt="Without resource bundling"
        src="/blog/web-frontend-performance/resource-bundling.svg"
        width="700"
        height="475"
    />
    <figcaption>
       <a href="#figure-no-resource-bundling">Without resource bundling:</a> In this example, the client requests a page. When it receives the HTML file, it discovers that it needs to load icons 1, 2, and 3, as well as a script file. The client fetches these resources via additional HTTP requests. Once the script is loaded, the client finds that it depends on another JavaScript module, necessitating yet another request to the server to load this module. The page finishes loading once all six resources are fully loaded.
    </figcaption>
</figure>

<figure id="figure-resource-bundling">
    <img
        alt="With resource bundling"
        src="/blog/web-frontend-performance/resource-bundling.svg"
        width="700"
        height="475"
    />
    <figcaption>
       <a href="#figure-resource-bundling">With resource bundling:</a> In this example, the client requests a page. When it receives the HTML file, it discovers that it needs to load the <code>icons_sprite.png</code> file, which contains icons 1, 2, and 3, as well as a script file that includes both the page's script and its dependencies. The page finishes loading once the HTML, the sprite, and the script are fully loaded.
    </figcaption>
</figure>

As stated previously, the main benefit of bundling is reducing network overhead. In addition to that:

- Concatenating textual files works well in conjunction with compression because compression algorithms can take advantage of redundancy across a whole set of files, yielding better compression ratios compared to when the files are compressed individually.
- JavaScript bundling tools implement optimizations that help reduce the sizes of bundles, as we will see in the section on [Using optimizing bundlers](#using-optimizing-bundlers)

However, these gains come at a cost:

- Bundling makes caching less efficient:
  - Resources that are bundled together can only be cached as much as the least cacheable resource. We discussed this earlier in the section [Caching static portions of webpages](#caching-static-portions-of-webpages) where dynamic content must be separated from static content to enable the caching of the static content.
  - If a resource is loaded on multiple pages, inlining it in HTML documents leads to it being downloaded and sometimes cached multiple times.
  - When a single resource inside a bundle is updated, the bundle is updated as a unit, and users have to download the whole thing again.
- Bundling resources together also gives them all the same priority, which can lead to worse loading performance. We will revisit properly prioritizing resources in the section [Loading resources at the right time](#loading-resources-at-the-right-time).

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

### Bundling in the HTTP/2+ era

With the advent of HTTP/2, many web articles declared the death of resource bundling, because:

- HTTP/2 can multiplex the loading of several resources using a single HTTP connection, significantly reducing network overhead. This is an improvement over HTTP/1.1, where HTTP connections can only transmit a single resource at a time and only a limited number of HTTP connections can be opened simultaneously.
- HTTP/2 defines the [server push extension](https://en.wikipedia.org/wiki/HTTP/2_Server_Push) which allows servers to push resources to the client before the client requests them. When a client requests a page, servers can push the page's sub-resources before the client discovers that it needs them, thereby eliminating latency without having to bundle files together and without compromising caching.

On this subject, I recommend [Smashing Magazine’s article series on HTTP/3](https://www.smashingmagazine.com/2021/08/http3-core-concepts-part1/) which explains that bundling is still relevant in HTTP/2 and HTTP/3. Some of the reasons are:

- Even with multiplexing, requests still incur overhead.
- HTTP Server Push support has been removed from [Chrome](https://developer.chrome.com/blog/removing-push) and [Firefox](https://www.mozilla.org/en-US/firefox/132.0/releasenotes/).

---

## Reducing client-side code size

### Using optimizing bundlers

Developers typically do not ship their source code unchanged to clients. Instead, they use bundling tools or frameworks that include such tools to transform the website's source code and its dependencies (such as libraries and assets) into bundle files that are ultimately served to the clients.

As we discussed in [Bundling resources](#bundling-resources), bundling reduces network overhead. Additionally, bundling tools implement features like [Minification](#minification) and [Tree-Shaking](#tree-shaking), which help reduce code size.

#### Minification

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

#### Tree-shaking

Bundlers can also reduce code size with [Tree-Shaking](https://en.wikipedia.org/wiki/Tree_shaking); by removing code that static analysis shows to be unreachable from the bundle's entry points. Outside web circles, this concept is more generally known as [Dead-code Elimination](https://en.wikipedia.org/wiki/Dead-code_elimination).

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

### Using small libraries and third-party scripts

When choosing libraries and third-party services, **code size** should be one of the selection criteria.

As a general rule, we should avoid using [kitchen sink libraries](https://www.quora.com/What-is-a-%E2%80%9Ckitchen-sink%E2%80%9D-in-the-context-of-programming) (i.e., libraries that integrate all sorts of features) and instead choose libraries that meet the specific needs of our applications. For example, the appropriate libraries will differ when rendering read-only tables versus editable ones. In the former case, a small and simple library may suffice, whereas in the latter case, a larger and more feature-rich library might be necessary.

Many tools can be used to determine the sizes of JavaScript libraries:

- [Webpack Bundle analyzer](https://www.npmjs.com/package/webpack-bundle-analyzer) and [Rollup Bundle Visualizer](https://www.npmjs.com/package/rollup-plugin-visualizer) provide an exact breakdown of the contribution of each JavaScript module and package to your application bundle.
- The [Bundle Size](https://marketplace.visualstudio.com/items?itemName=ambar.bundle-size) extension for VSCode displays the code size of npm packages based on your imports.
- The [bundlejs](https://bundlejs.com/) website lets you partially import code from many JavaScript packages and measures the bundle size for you.
- The [bundlephobia](https://bundlephobia.com/) website shows code size of npm packages.
- The network tab in the [DevTools](https://developer.mozilla.org/en-US/docs/Glossary/Developer_Tools) that come with web browsers provides the exact size of each resource a webpage loads.

In addition to library size, the ability to **tree-shake** should also be considered when choosing libraries.

For example, check out the [You-Dont-Need-Momentjs](https://github.com/you-dont-need/You-Dont-Need-Momentjs) page comparing Moment.js, a utility library for handling date objects, with alternative libraries that are smaller, and tree-shakable in the case of date-fns.

It is important to note that tree-shaking has its limits, as libraries typically contain a set of core modules that cannot be eliminated. For example, even though the MUI components library supports tree-shaking, using a single component from the library also loads the library's core modules, which include a style engine and various other utilities. Therefore, instead of reaching for MUI to use just one of its components, it is better to look for a specialized library.

TODO FIGURE LIBRARIES REACT + MOMENT + MUI (Button, Modal, Select, Input) + DATE_PICKER + GTM + Recaptcha vs LIGHTWEIGHT ALTERNATIVES

### Keeping code in the server

Another way to reduce the amount of code sent to the client is to keep as much of it as possible on the server, execute it there, and never send it to the client.

Offloading code to the server can sometimes worsen user experience due to the extra requests that have to go to the server, which add network latency. This is not a problem when the offloaded code's work involves reaching out to the server anyway, as no additional network requests may be required.

Offloading code to the server can also negatively impact developer experience (DX), as it can require tedious tasks such as creating API routes, modifying client code to call them, and managing serialization of inputs and outputs. However, this is not always an issue:

- If the offloaded code is executed during page loading, the server can run it without needing API routes. We will explore this further in the section on [server-side rendering](#server-side-rendering).
- If the offloaded code generates HTML fragments that require little to no processing on the client side, as with frameworks like [Hotwire](https://hotwired.dev/), [HTMX](https://htmx.org/) and [Unpoly](https://unpoly.com/) where developers can load these fragments without writing client-side JavaScript.

TODO ADD 2 FIGURES showcasing sending code or keeping it in the server

Some frameworks improve the DX of making API requests:

- [tRPC](https://trpc.io/) offers a simple API for creating both server and client sides of API routes, resulting in well-typed and readable code.
- [NextJS](https://nextjs.org/docs/app/api-reference/directives/use-server) and [SolidStart](https://docs.solidjs.com/solid-start/reference/server/use-server#use-server) provide server functions: developers can mark modules or individual functions as server-side only and call them from client code like regular asynchronous functions. The framework transparently splits the code into server-side and client-side parts, creates API routes, and transforms the client code to communicate with the server through these APIs.

#### Server-side rendering

In this section, alse generally in web frameworks circules, the word *rendering* refers to the transformation of data from a structured format (like JSON) into HTML that is displayed to the user. This is not not be confused by the rendering performed by [browser engines](https://en.wikipedia.org/wiki/Browser_engine).

Rendering can be done on the client or the server. Client-side rendering (CSR) requires the client to load rendering code. In contrast, with server-side rendering (SSR), in its pure form as we will see shortly, no rendering code has to be shipped to the client, thus reducing client-side code size. SSR also leads to better initial page-load times, which we will explore later in [section blah](#).

In traditional SSR approaches, a form of template language is used on the server to render HTML in a declarative style, while some less declarative JavaScript code is written to make the server-generated HTML interactive.

In contrast, many modern JavaScript frameworks are hybrids that do both SSR and CSR. These frameworks offer developers a better experience compared to traditional SSR approaches as they allow them to write a single codebase in a declarative style that works on both the server and the client. While these frameworks reduce initial page-load times through SSR, they also increase network usage compared to both pure SSR and pure CSR approaches:

- Since they also do CSR, the client has to download rendering code.
- The framework's code size is increased (compared to a pure CSR version) in order to support [hydration](<https://en.wikipedia.org/wiki/Hydration_(web_development)>): The process by which components rendered on the server are made interactive on the client.
- These frameworks also face what [Ryan Carniato](https://x.com/RyanCarniato) (the creator of SolidJS) calls [the double data problem](https://dev.to/this-is-learning/why-efficient-hydration-in-javascript-frameworks-is-so-challenging-1ca3): The server has to send data in two formats to the client. Once in HTML format to optimize page-load time, and a second time in JSON format serving as input and state initialization for client-side code.
- Finally, HTML templates that are reused multiple times on the same page are sent repeatedly in HTML, in addition to being sent again in CSR code. In contrast, with pure CSR, they are sent only once.

<figure id="figure-pure-ssr-vs-hydration-vs-pure-csr">
    <img alt="Pure SSR vs Hydration vs Pure CSR" href="/blog/web-frontend-performance/pure-ssr-vs-hydration-vs-pure-csr.svg" />
    <figcaption>
       <a href="#figure-pure-ssr-vs-hydration-vs-pure-csr">Pure SSR vs Hydration vs Pure CSR:</a> ...
    </figcaption>
</figure>

##### Partial hydration

To help reduce code size, some frameworks allow developers to control which parts of the application are rendered exclusively on the server (meaning that this code is never sent to the client) and which parts can be rendered on both the server and the client. The code for the components that are rendered only on the server does not need to be sent to the client, which reduces client-side code size. Additionally, server-only components do not need to be hydrated on page load, reducing initialization work. This feature is commonly referred to as partial or selective hydration.

Right now, the most popular frameworks supporting partial hydration are [Astro](https://astro.build/) via [Islands](https://docs.astro.build/en/concepts/islands/), and [NextJS](https://nextjs.org/) via [Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components).

<figure id="figure-full-vs-partial-hydration">
    <img alt="Full Hydration vs Partial Hydration" href="/blog/web-frontend-performance/full-vs-partial-hydration.svg" />
    <figcaption>
       <a href="#figure-full-vs-partial-hydration">Full Hydration vs Partial Hydration:</a> ...
    </figcaption>
</figure>

Note that partial hydration excels in larger applications. In a small application like the demo [Movies App](https://movies-app.zaps.dev/), the fully hydrated [SolidStart version](https://solid-movies.app/) is smaller than both the partially hydrated [Astro+Alpine](https://astro-movies-app.netlify.app/) and [NextJS](https://movies.sst.dev) versions. This is due to SolidStart being more lightweight compared to Alpine and Next.js, as well as the fact that the app itself isn't large enough for the code size savings from partial hydration to outweigh the overhead of larger frameworks.

<figure id="figure-movies-app">
    <table>
        <thead>
            <tr>
                <th>Framework</th>
                <th>Client bundle size (compressed)</th>
                <th>Hydration type</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>SolidStart</td>
                <td>15kB</td>
                <td>Full</td>
            </tr>
            <tr>
                <td>Astro+Alpine</td>
                <td>42kB</td>
                <td>Partial</td>
            </tr>
            <tr>
                <td>Next.js</td>
                <td>100kB</td>
                <td>Partial</td>
            </tr>
        </tbody>
    </table>
    <figcaption>
        <a href="#figure-movies-app">Comparison of the client-side code of multiple implementations of the Movies App demo:</a> . We can see that although the SolidJS version fully hydrates the page, it still loads less JavaScript code than the Astro+Alpine and the Next.js versions.
    </figcaption>
</figure>

---

## Reducing CPU work in the client

In order to display the page to the user, the browser has to construct the [DOM](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Introduction) (Document Object Model) and the [CSSOM](https://developer.mozilla.org/en-US/docs/Glossary/CSSOM) (CSS Object Model). It also has to calculate the positions and sizes of the elements on the page — a process commonly referred to as layout — and finally paint the result on the screen.
The browser has to repeat some of this work each time the page is manipulated by the user or by JavaScript code. Recalculating page layout is known as [reflow](https://developer.mozilla.org/en-US/docs/Glossary/Reflow).

To avoid overwhelming users' devices with CPU work, the DOM should be kept small, CSS rules should be simple, and JavaScript code should run as infrequently as possible and should avoid inducing unnecessary layouts and paints.

Browser DevTools can be used to determine where web pages spend their time: executing JavaScript code, calculating layout, doing garbage collection, etc.

If JavaScript execution is the performance bottleneck, profiling can help pinpoint the source of the problem. The solution will vary widely depending on your data, code, and libraries. But ultimately, it boils down to [algorithmic optimization](https://en.wikipedia.org/wiki/Algorithmic_efficiency).

If the performance problem comes from the browser repeatedly recalculating the layout, the cause may be inefficient JavaScript code that triggers unnecessary layout recalculations — a problem known as [layout thrashing](https://web.dev/articles/avoid-large-complex-layouts-and-layout-thrashing). This is showcased in the figures [Layout thrashing](#layout-thrashing) and [No layout thrashing](#no-layout-thrashing)). When JavaScript code writes to the DOM, the browser has to recalculate the layout, but it doesn't do this immediately. It waits to catch multiple DOM updates and then recalculates the layout once, repainting the page in its new state. However, when JavaScript code reads certain properties from the DOM, it forces the browser to calculate the layout immediately. Therefore, reading and writing to the DOM in a loop can result in more layout recalculations than necessary.

<figure id="layout-thrashing">
    <img
        alt="Layout thrashing"
        src="/blog/web-frontend-performance/waterfall-diagram/layout-thrashing.svg"
    />
    <figcaption>
       <a href="#layout-thrashing">Layout thrashing:</a> In this example, the click event handler writes to the DOM and then reads the state of the DOM repeatedly in a loop. Each DOM-write invalidates the current layout calculations, so each subsequent DOM-read requires the browser to recalculate layout to read the correct current state of the DOM. The result is that it takes the browser 1.2 seconds to process the click event handler, leaving it unresponsive to user events during this time.
    </figcaption>
</figure>

<figure id="no-layout-thrashing">
    <img
        alt="No layout thrashing"
        src="/blog/web-frontend-performance/waterfall-diagram/no-layout-thrashing.svg"
    />
    <figcaption>
       <a href="#no-layout-thrashing">No Layout thrashing:</a> In this example, the click event handler performs all the necessary DOM reads first. Then, it does all the DOM writes, invalidating the current layout calculations. Once the event handler has finished executing, the browser recalculates the layout once to render the final state to the user. The entire process takes 200 milliseconds to complete. Contrast it with the 1.2 seconds from the previous example.
    </figcaption>
</figure>

If no layout thrashing is occurring but the DOM is still being updated too frequently, forcing the browser to recalculate the layout repeatedly, it may be helpful to apply techniques such as [debouncing](https://developer.mozilla.org/en-US/docs/Glossary/Debounce) or [throttling](https://developer.mozilla.org/en-US/docs/Glossary/Throttle). These techniques are commonly used to avoid overwhelming the browser with work when the user is actively filling out inputs that trigger actions on the page.

Performance issues related to layout can arise from inefficient CSS, for instance, when using CSS animations or transitions on properties that trigger reflow. For more information on this, check out [Choosing properties to animate](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Performance/CSS#choosing_properties_to_animate) on MDN.

Finally, layout and reflow take longer as CSS rules become more complex and as the DOM grows in size. To address CSS complexity, I refer you to the [MDN section on CSS performance](https://developer.mozilla.org/en-US/docs/Learn/Performance/CSS). Regarding the size of the DOM, it can be reduced by employing techniques such as [pagination](https://en.wikipedia.org/wiki/Pagination) or [virtualization](https://web.dev/articles/virtualize-long-lists-react-window) (also known as windowing). A newer solution that became widely available recently (September 2024) is [CSS containment](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Using_CSS_containment), which allows developers to mark DOM sections that can be rendered independently from each other. This enables the browser to skip painting and calculating layout for offscreen sub-trees of the DOM.

### Client-side navigation

In web applications that load a lot of JavaScript code, re-executing the app's code on every page navigation is both slow and wasteful of CPU cycles. Client-side navigation, in contrast to traditional browser navigation, can help address this issue.

Let's first examine how browsers handle navigation by default. When a user clicks on a link:

- The browser fetches the new page and its resources from the server and renders it on the screen.
- The browser creates a new JavaScript execution context in which the scripts for the new page are executed.
  - The browser can freeze the execution context of the previous page, allowing it to be resumed later if the user clicks the back button, without having to reload the page. This is known as the [Back/Forward Cache (bfcache)](https://developer.mozilla.org/en-US/docs/Glossary/bfcache) and it is good practice to avoid APIs that disable it.
- The browser also updates its UI to reflect the URL change and to enable the user to navigate back to the previous page.

An alternative way to handle navigation is through client-side navigation (also referred to as soft navigation or client-side routing):

- The application installs event handlers that cancel the browser's default behavior when links are clicked.
  - The current JavaScript execution context is preserved, and live objects such as video/audio elements and WebSocket/WebRTC/EventSource connections are not interrupted.
- The application fetches the new page data and renders it into the DOM.
- The application uses the [History API](https://developer.mozilla.org/en-US/docs/Web/API/History_API) to:
  - Instruct the browser to update the URL in the address bar and the state of the back and forward buttons.
  - Install event handlers to intercept and handle clicks on the back and forward buttons.

It’s important to recognize that client-side navigation is not a silver bullet. Implementing it requires the application to load additional code to simulate browser behavior and manage routing on the client side, rather than relying on the server side as in traditional navigation. This can lead to increased client side code size and added complexity, which may be excessive for many websites and applications.

However, client-side navigation is essential for applications that need to support URL-based navigation while maintaining the state of the page. For instance, in an audio streaming website, users expect the audio to continue playing seamlessly as they navigate between different pages.

Moreover, client-side navigation is often a performance requirement in JavaScript-heavy [single-page applications](https://en.wikipedia.org/wiki/Single-page_application) (SPAs).

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
        <a href="#figure-soft-navigation">Client-side navigation:</a> In this example, a SPA handles navigation. To do so, it loads a client-side router script, which increases code size. Note that the shared resources of Page A and Page B are only loaded once.
    </figcaption>
</figure>

### Using WebAssembly

Yet another solution for reducing work on the CPU is to use a faster programming language. On the web, only two client side programming languages are supported: JavaScript and WebAssembly.

[WebAssembly](https://developer.mozilla.org/en-US/docs/WebAssembly) (abbreviated as Wasm for short) is a low lever language with features that are great for performance:

- It gives developers control over the layout of objects in memory.
- It doesn't have an automatic garbage collector.
- It is designed to be loaded and compiled fast.

I will try to detail these points in the following sections. I also highly recommend [Lin Clark](https://www.code-cartoons.com/)'s fun-to-read article series on Wasm: [A cartoon intro to WebAssembly Articles](https://hacks.mozilla.org/category/code-cartoons/a-cartoon-intro-to-webassembly/).

#### Optimizing data layout in memory

Optimal code process data by using the CPU and the RAM effectively. To do that data should be layed out in memory in a way such that processing it can use the CPU caches hierarchy and features such as CPU prefetching effectively. For more on this check out [Data-oriented design](https://en.wikipedia.org/wiki/Data-oriented_design).

JavaScript being a high level language provide developers with a simplistic object model where almost every variable or object field is a reference to data somewhere else in memory and developers have no control whatever on where that is. In contrast, WebAssembly code is usually generated from code in programming languages that give developers control over objects memory layout such as C, C++ and Rust. In these languages, developer have control wether an object is represented inline in the program's stack and inside other objects, or if it should be reached through a reference.
The ability to express both inline objects and references makes these languages' type system more complex compared to high lever languages such as JavaScript.
That is the price for precise control over performance.
Keep in mind that even in such languages, programmers can get lazy and use a simplified object model and therefore increasing complexity for programmers for no performance benefit. Maybe even for a loss.

Note that JavaScript does also give programmers control over the memory layout of objects if they really really wanted. That is, by writing JavaScript code that only reads and writes numbers in a typed array. That is in fact how C++ code was compiled to very fast [asm.js](https://en.wikipedia.org/wiki/Asm.js), a subset of JavaScript code doing exactly that. Many 3D game engines, Unreal engine [for instance](https://blog.mozilla.org/futurereleases/2013/05/02/epic-citadel-demo-shows-the-power-of-the-web-as-a-platform-for-gaming/), where compiled to JavaScript back in the days and run at incredible speeds. Technique from asm.js are still used today by [polywasm](https://github.com/evanw/polywasm) to polyfill WebAssembly using JavaScript code when browsers don't support it or disable it.

After the initial MVP implementation of Wasm which was basically a binary format for asm.js, [new features](https://webassembly.org/features/) were to added to Wasm giving it more capabilities like bulk memory operations and even SIMD support.

<figure id="figure-memory-layout-high-level-lang">
    <img
        alt="Memory layout in a high level language"
        src="/blog/web-frontend-performance/memory-layout-high-level-lang.svg"
        width="600"
        height="600"
 />
    <figcaption>
        <a href="#figure-soft-navigation">Memory layout in a high level language:</a> In this example, I show the memory layout of an object that can be typed in typescript as <code>Map&lt;[number, number], { id: number, name: string, tags: strings[] }&gt;</code>. Note all the indirections needed at each level to represent this data structure. This is not unique to JavaScript. Other high level languages like Java suffer from the same problem.
    </figcaption>
</figure>

<figure id="figure-memory-layout-low-level-lang">
    <img
        alt="Memory layout in a low level language"
        src="/blog/web-frontend-performance/memory-layout-low-level-lang.svg"
        width="600"
        height="600"
 />
    <figcaption>
        <a href="#figure-soft-navigation">Memory layout in a low level language:</a> In this example, I show the memory layout of an object that can be typed in Rust as <code>HashMap&lt;(i32, i32), Object&gt;</code> where <code>Object</code> is <code>struct { id: u32, name: String, tags: Vec&lt;String&gt; }</code>. Notice how little indirection there is compared to the previous example.
    </figcaption>
</figure>

#### No automatic garbage collection

WebAssembly doesn't offer automatic garbage collection. Although, it [recently](https://webassembly.org/features/) got the capability to hold garbage collected JavaScript object references. Developers have control about when and where new objects are allocated in memory and when they are freed, which is more control over performance and increased complexity.

During the execution of JavaScript code, and especially when it allocates a lot of memory, the browser can decide to pause the program to collect unused memory which can lead to delayed renders or unresponsiveness to user events. In contrast, Wasm code doesn't trigger browser's built in garbage collection. The developers has to manage the memory themselves though. When done correctly, this can lead to very low latency code. When done incorrectly it can be slower than browser garbage collection which is quite optimized. For example, check out SpiderMonkey's (Firefox's JavaScript engine) garbage collector [documentation page](https://firefox-source-docs.mozilla.org/js/gc.html) showcasing the features it implements.

#### Fast loading and compilation

When Wasm's binary format [was designed](https://github.com/WebAssembly/design/blob/main/Rationale.md#why-a-binary-encoding), many criteria where taken into account:

- Compact representation of code: Being a binary format, Wasm is more compact than if it represented code using a textual representation.
- Fast compilation: Unlike other preexisting binary code formats like JVM's, Wasm binary format is designed to be fast to parse and to validate.
- Compressibility: Wasm is compressible with gzip. More so than equivalent asm.js code, back when it was designed.
- [Streaming compilation](https://developer.mozilla.org/en-US/docs/WebAssembly/Reference/JavaScript_interface/instantiateStreaming_static): The browser can start compiling Wasm code as it receives it from the network.

Nowadays, browsers can even [parallelize](https://www.infoq.com/news/2018/01/firefox-58-web-assembly-gets-10x/) wasm code compilation.

#### Using WebAssembly vs JavaScript

Today, web frameworks like [Leptos](https://www.leptos.dev/) and [Sycamore](https://sycamore.dev/) let you write your client-side in Rust and compile it to WebAssembly. These framework implement high level features like components, fine-grained reactivity, SSR and hydration, making them technically a valid replacement for many of the modern JavaScript frameworks.

Performance-wise, Leptos and Sycamore are also among the best scoring frameworks in rendering speed according to the [JS framework benchmarks](https://krausest.github.io/js-framework-benchmark/current.html). Code-size-wise, I don't have proper benchmark at hands, but judging by the file size of the `.wasm` files loaded from these frameworks' websites, it looks like they are comparable to JavaScript frameworks or a little bigger.

Even though these frameworks can compete in the JavaScript framework scene, I would say that they add too much complexity from using a complex language like Rust without improving performance over JavaScript frameworks which are already quite fast:

- Performance depends not only on client side code but also on many other factors
- These frameworks focus on providing high level APIs to developers to allow them to write declarative code. This is great for developer experience, but is unlikely to lead to writing optimally performant code.
- These frameworks still generate JavaScript code because Wasm code cannot interact directly with the DOM. And there can be overhead in the communication between JavaScript and Wasm.

So although Wasm can replace JavaScript to a certain degree, I don't think that it should be seen as a replacement for it. It should rather be used when it shines the most: To process data very fast using very optimized code, and to make available to JavaScript code C, C++ or Rust libraries that are very well optimized.

---

## Reducing CPU work in the server

- Using faster languages and frameworks
- Using better algorithms
- Offloading code to the client

---

# Scheduling work to make users wait less

In this chapter, I present techniques that allow web sites and applications to minimize the time users have to wait, without reducing the the amount of work the sites/apps have to do, but by scheduling work smartly.

To visualize the effect of different scheduling strategies, I generated waterfall charts with fixed parameters such as file sizes, execution times and network bandwidth and latency. I set network parameters as to simulate [regular 3G performance](https://developer.mozilla.org/en-US/docs/Web/Performance/Understanding_latency#network_throttling), and I divided the network bandwidth between simultaneously sent resources equally.

Feel free to [download the code](#) and to generate charts with different parameters.

## Do not block the UI thread

The browser runs JavaScript code in an [event loop](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Event_loop). When the user manipulates the page and when input/output operations progress, events are generated and JavaScript event handlers are run.
The browser has to wait for any currently running JavaScript code to finish before it can respond to new events.
So if JavaScript code runs for too long without yielding control to the event loop, the page becomes unresponsive to users - a condition called [jank](https://developer.mozilla.org/en-US/docs/Glossary/Jank).

Therefore, JavaScript code should execute in brief bursts to keep the UI responsive. Two strategies can be used to handle long JavaScript tasks:

- Break them out into smaller tasks that interleave with other tasks running in the event loop, or
- Run them in a separate thread which runs concurrently with the event loop thread (also called the main thread or UI thread) without blocking it.

[Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers) enable the second option. A web worker runs JavaScript code in a separate thread that is isolated from the main thread and from other web workers. The main thread and web workers can communicate with each other using asynchronous message passing.

[Partytown](https://partytown.builder.io/) is an interesting application of web workers: It runs third-party scripts (analytics scripts for example) outside the main thread by simulating the DOM inside a web worker using proxy objects.

<figure id="figure-long-task">
    <img
        alt="Long task blocking the event loop"
        src="/blog/web-frontend-performance/waterfall-diagram/no-web-worker.svg"
    />
    <figcaption>
       <a href="#figure-long-task">Long task blocking the event loop:</a> In this example, before the browser handles the second click, it waits for the currently running event handler to finish, waiting 500ms.
    </figcaption>
</figure>

<figure id="figure-long-task-split">
    <img
        alt="Long task split into short ones to not block the event loop"
        src="/blog/web-frontend-performance/waterfall-diagram/no-web-worker.svg"
    />
    <figcaption>
       <a href="#figure-long-task-split">Long task split into short ones to not block the event loop:</a> In this example, when the second click event occurs, the browser can handle it after only ??ms.
    </figcaption>
</figure>

<figure id="figure-long-task-in-worker">
    <img
        alt="Long task running in a Web Worker"
        src="/blog/web-frontend-performance/waterfall-diagram/web-worker.svg"
    />
    <figcaption>
       <a href="#figure-long-task-in-worker">Long task running in a Web Worker to not block the event loop:</a> In this example, when the second click event occurs, the browser starts handling it immediately.
    </figcaption>
</figure>

---

## Optimizing resources loading

### Gradual content delivery with streaming

Dynamically generated web pages are sometimes composed of parts that are fast to generate and some other parts that take longer to generate.
It's desirable to deliver the parts that are ready to the user while the slower parts are still in the making. This way:

- The browser can start processing the page early,
- It can discover early the sub-resources to load like stylesheets, scripts and images, and
- The user gets to access and to interact with the parts that are ready without unnecessarily waiting for the whole page to load.

It is possible to do exactly that thanks to the streaming capability of HTTP (since version 1.1 of the protocol) and thanks to the HTML format being streaming-friendly (Browsers can process and show HTML documents progressively as they are received),

#### Unlocking Parallelism with Streaming

When the server receives a request for a page, it can:

- send a first chunk of HTML declaring the page's CSS and JavaScript resources,
- and, potentially in parallel, start fetching or generating the page's data.

This way, the client can start loading the page's sub-resources in parallel with the server generating and sending the rest of the page.

<figure id="figure-not-streaming-html">
    <img alt="Not streaming HTML diagram" src="/blog/web-frontend-performance/waterfall-diagram/not-streaming-html.svg" />
    <figcaption>
        <a href="#figure-not-streaming-html">Not streaming HTML:</a> In this example, the server waits for the whole page to be generated before it sends it to the client. The user gets to start interacting with the page after a loading time of <a href="/blog/web-frontend-performance/waterfall-diagram/not-streaming-html.json">1 second</a>.
    </figcaption>
</figure>

<figure id="figure-streaming-html">
    <img alt="Streaming HTML diagram" src="/blog/web-frontend-performance/waterfall-diagram/streaming-html.svg" />
    <figcaption>
        <a href="#figure-streaming-html">Streaming HTML:</a> In this example, the server streams the page parts as soon as they are ready. It starts by streaming the page head allowing the client to request <code>style.css</code> and <code>script.js</code> earlier than in the <a href="#figure-not-streaming-html">previous example</a>. The user gets to start interacting with the page after a loading time of <a href="/blog/web-frontend-performance/waterfall-diagram/not-streaming-html.json">785ms</a>.
    </figcaption>
</figure>

#### Out-Of-Order Streaming

Certain frameworks offer APIs that allow for the concurrent loading of page sections on the server, which can then be streamed to the client in any order as they become available.
These frameworks ensure that the page sections are rendered in the correct positions on the client side.

Ebay engineering wrote [an article in 2014](https://innovation.ebayinc.com/tech/engineering/async-fragments-rediscovering-progressive-html-rendering-with-marko/) about how they implemented this in [MarkoJS](https://markojs.com/#streaming).

HTML Streaming was rediscovered again in the last years by more popular JavaScript frameworks.
An interesting example among them is [SolidStart](https://start.solidjs.com/):

- It supports streaming in server-side rendering (SSR) and in client-side rendering (CSR) modes, showing that streaming is not specific to server-rendered web applications.
- Using the [Seroval](https://github.com/lxsmnsyc/seroval/blob/main/docs/compatibility.md#supported-types) library, SolidStart allows servers to send live objects (such as in-flight promises and ReadableStreams) to the clients, while transparently taking care of serialization, streaming, and deserialization.

<figure id="figure-no-ooo-streaming">
    <img alt="No Out-Of-Order Streaming diagram" src="/blog/web-frontend-performance/waterfall-diagram/multi-sections-page-no-streaming.svg" />
    <figcaption>
        <a href="#figure-no-ooo-streaming">No Out-Of-Order Streaming:</a> In this example, the server streams the head element of the page, loads the 3 sections of the page in parallel but waits for the first section to be ready before sending it and the two other sections to the client. The user gets an empty shell at 756ms, sees section 1 at 1436ms and the whole page at <a href="/blog/web-frontend-performance/waterfall-diagram/multi-sections-page-no-streaming.json">1536ms</a>.
    </figcaption>
</figure>

<figure id="figure-ooo-streaming">
    <img alt="Out-Of-Order Streaming diagram" src="/blog/web-frontend-performance/waterfall-diagram/multi-sections-page-streaming.svg" />
    <figcaption>
        <a href="#figure-ooo-streaming">Out-Of-Order Streaming:</a> In this example, the server streams the head element of the page, loads the 3 sections of the page in parallel and sends them to the client as they are ready. The user sees section 2 at 756ms, section 3 at 1036ms and the whole page at <a href="/blog/web-frontend-performance/waterfall-diagram/multi-sections-page-streaming.json">1436ms</a>.
    </figcaption>
</figure>

#### Beyond HTTP responses streaming

The Web platform provides APIs to stream data between the client and the server like:

- [Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events) for textual server sent data,
- [WebSockets](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_client_applications) for bidirectional communication between servers and clients, and
- [WebRTC](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API) for peer to peer data streaming between clients.

More recently, newer APIs arrived like:

- [Streams API](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API) which allows reading standard HTTP response bodies and writing to request bodies in a streaming fashion, and
- [WebTransport](https://developer.mozilla.org/en-US/docs/Web/API/WebTransport_API) which is the newer and more capable replacement of WebSockets.

---

### Loading resources at the right time

#### Preloading

In order to optimize the loading of webpages, browsers assign different loading priorities to different types of resources: The loading HTML document takes precedence over stylesheets, fonts and script files which themselves take precedence over images.

Browsers even go the extra mile to discover and to fetch hight priority resources as soon as possible: While the main thread parses the HTML document in order, a background [preload scanner](https://developer.mozilla.org/en-US/docs/Web/Performance/How_browsers_work#preload_scanner) process identifies and initiates the loading of high priority sub-resources in the yet to be processed HTML.

There are limits though to what browsers can do automatically for us. Say for example that we are loading a page which loads a CSS file which itself imports another CSS file. The browser may be able to discover the link to the first CSS file early by scanning the HTML document, but it has to fetch this file and to parse it before it discovers and fetches the second one.

```html
<!-- page1.html -->
<head>
  <link rel="stylesheet" href="/page1.css" />
</head>
```

```css
/* /page1.css */
@import "/page-type-1.css";
```

Thanks to the [preload tags](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/rel/preload) (`<link rel=preload>`), supported by all major browsers [since January 2021](https://caniuse.com/link-rel-preload), we can tell the browser to prefetch indirectly used sub-resources.
In the previous example, this would look like the following:

```html
<!-- page1.html -->
<head>
  <link rel="preload" as="style" href="/page-type-1.css" />
  <link rel="stylesheet" href="/page1.css" />
</head>
```

##### Preloading web fonts

By default, browsers load [web fonts](https://developer.mozilla.org/en-US/docs/Learn/CSS/Styling_text/Web_fonts) only when they determine that they are actually needed. This makes them a great candidate for preloading, as when they are loaded late, they cause layout shifts that disturb the user experience.
Also, it is [good practice](https://web.dev/learn/performance/optimize-web-fonts#self-host_your_web_fonts) to host web fonts on your own server, rather than relying on a third-party server, to minimize network latency caused by connection overhead.

<figure id="figure-font-no-preload">
    <img alt="No web fonts preloading diagram" src="/blog/web-frontend-performance/waterfall-diagram/font-no-preload.svg" />
    <figcaption>
        <a href="#figure-font-no-preload">No web fonts preloading:</a> In this example, the browser determines that it needs the two web font files only after it constructs the CSSOM (at 388ms). It start fetching them at that point, renders the page a first time with a system font, and later rerenders the page a second time using the web fonts, finishing at <a href="/blog/web-frontend-performance/waterfall-diagram/font-no-preload.json">665ms</a>.
    </figcaption>
</figure>

<figure id="figure-font-preload">
    <img alt="Web fonts preloading diagram" src="/blog/web-frontend-performance/waterfall-diagram/font-preload.svg" />
    <figcaption>
        <a href="#figure-font-preload">Web fonts preloading:</a> In this example, two web fonts are preloaded in the page head. The browser discovers them and starts fetching them at 112ms. It later renders the page once only using the loaded web fonts, finishing at <a href="/blog/web-frontend-performance/waterfall-diagram/font-preload.json">556ms</a>.
    </figcaption>
</figure>

##### Speeding up SPAs startup

In single-page applications that rely on client-side code for data retrieval, data fetching takes place only after the code has been fully loaded and executed. This process can be optimized using a preload tag, which instructs the browser to start loading the page's data as soon as it retrieves the head tag of the page. This allows the data fetching to occur concurrently with the loading of the client-side code.

This approach enables performance that closely approximates that of the streaming server-side solutions discussed in the [previous section](#gradual-content-delivery-with-streaming), where the server begins fetching data as soon as it receives a request for the page's URL.

The added cost of this preloading-enhanced client-side solution is limited to the latency involved in loading the page's head and making a second request. However, this cost is significantly reduced when the client application is served via a CDN. Furthermore, when the page is loaded from the client cache, this latency disappears entirely, leading to no additional delay compared to streaming server-side solutions.

<figure id="figure-spa-no-preload">
    <img alt="SPA without preloading diagram" src="/blog/web-frontend-performance/waterfall-diagram/spa-no-preload.svg" />
    <figcaption>
        <a href="#figure-spa-no-preload">SPA without preloading:</a> In this example, the client downloads and executes the JavaScript before realizing the need to load the page data. As a result, the data is rendered on the screen after <a href="/blog/web-frontend-performance/waterfall-diagram/spa-no-preload.json">1172ms</a>.
    </figcaption>
</figure>

<figure id="figure-spa-preload">
    <img alt="SPA with preloading diagram" src="/blog/web-frontend-performance/waterfall-diagram/spa-preload.svg" />
    <figcaption>
        <a href="#figure-spa-preload">SPA with preloading:</a> the client begins preloading the page data as soon as the head tag is downloaded, ultimately rendering the data on the screen in <a href="/blog/web-frontend-performance/waterfall-diagram/spa-preload.json">856ms</a>. 
    </figcaption>
</figure>

---

#### Deferring non-critical styles and scripts

CSS and JavaScript resources can be [render-blocking](https://developer.mozilla.org/en-US/docs/Glossary/Render_blocking), which means that the browser has to wait for these files to load before rendering the page to the user. This is necessary to prevent the [Flash Of Unstyled Content (FOUC)](https://en.wikipedia.org/wiki/Flash_of_unstyled_content), where users briefly see unstyled elements before the styles are applied.

Any CSS and JavaScript resources that are not needed for the initial rendering of the page, should ideally be loaded asynchronously in order to unclutter the [critical rendering path](https://developer.mozilla.org/en-US/docs/Web/Performance/Critical_rendering_path).
This can be achieved using:

- the `async` and `defer` attributes on [script tags](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#async), and
- media queries to [asynchronously load CSS files](https://css-tricks.com/the-simplest-way-to-load-css-asynchronously/),

<figure id="figure-render-blocking-script">
    <img alt="Using a single render-blocking script diagram" src="/blog/web-frontend-performance/waterfall-diagram/streaming-html.svg" />
    <figcaption>
        <a href="#figure-render-blocking-script">Using a single render-blocking script:</a> In this example, the user requests an HTML page
        which loads render blocking CSS and JavaScript files. The browser processes these files constructing CSSOM and
        executing JavaScript code before rendering the page, finishing at <a href="/blog/web-frontend-performance/waterfall-diagram/streaming-html.json">785ms</a>.
    </figcaption>
</figure>

<figure id="figure-async-script">
    <img alt="Asynchronously loading non-critical JavaScript diagram" src="/blog/web-frontend-performance/waterfall-diagram/split-render-blocking-resources.svg" />
    <figcaption>
            <a href="#figure-async-script">Asynchronously loading non-critical JavaScript:</a> In this example, the page's script is split into a render blocking one
            and a second asynchronously loaded script. As soon as the render blocking CSS and JavaScript resources are processed, the browser renders the page <a href="/blog/web-frontend-performance/waterfall-diagram/split-render-blocking-resources.json">at 572ms</a> (More than 200ms earlier than in the <a href="#figure-render-blocking-script">previous example</a>). As for the async script, the browser loads it with low priority, executes it and rerenders the page again, finishing completely at 885ms.
    </figcaption>
</figure>

---

#### Lazy loading

Loading content only when necessary, a technique known as [lazy loading](https://developer.mozilla.org/en-US/docs/Web/Performance/Lazy_loading), can enhance performance by allowing high-priority resources to load without the interference of low-priority ones.
This can be achieved in HTML by marking images and iframes with the attribute `loading="lazy"` to delay their loading until they appear on the screen.

Additionally, web frameworks offer means to lazily load code and data:

- Individual components can be marked as lazy which gets them extracted into a separate code bundle that is only loaded when the component is instantiated by the application.
- Client-side routers (previously discussed [here](#client-side-navigation)) often delay the loading of the code of different routes until the user navigates to them.
- Frameworks like [Astro](https://docs.astro.build/en/concepts/islands/#client-islands), [Nuxt](https://nuxt.com/modules/delay-hydration) and [Angular in developer preview mode](https://angular.dev/guide/incremental-hydration) support lazy hydration where certain server-rendered components are initialized (and their code is loaded) only on certain conditions such as when they appear on the screen or when the user interacts with them. The [Qwik](https://qwik.dev/) framework achieves something similar with its [resumability](https://qwik.dev/docs/concepts/resumable/)

Note that lazy loading has some drawbacks: It can result in users experiencing wait times when the lazily-loaded resources are eventually needed. To mitigate this, it's beneficial to pair lazy loading with preloading, especially when a user initiates an action that increases the likelihood of requiring those resources.

Consider an example involving a client-side router: when a user clicks a link, it triggers client-side navigation requiring both the JavaScript code and data for the next page. The Router API can be designed to make it possible preload the data even before the next page's code is downloaded, allowing both resources to be fetched concurrently.
A further optimization is to prefetch next page's code when the user hovers over the link, ensuring minimal wait time for the user when the actual click occurs.

<figure id="figure-client-side-navigation-no-preload">
    <img alt="Client-side navigation without preloading diagram" src="/blog/web-frontend-performance/waterfall-diagram/client-side-navigation-no-preload.svg" />
    <figcaption>
        <a href="#figure-client-side-navigation-no-preload">Client-side navigation without preloading:</a> In this example, when the user clicks the link, the client-side router downloads the code for the next page. Once the code is loaded, it fetches the data for that page, making it visible to the user <a href="/blog/web-frontend-performance/waterfall-diagram/client-side-navigation-no-preload.json">1 second</a> after the click.
    </figcaption>
</figure>

<figure id="figure-client-side-navigation-preload-data">
    <img alt="Waterfall diagram" src="/blog/web-frontend-performance/waterfall-diagram/client-side-navigation-preload-data.svg" />
    <figcaption>
        <a href="#figure-client-side-navigation-preload-data">Client-side navigation with data preloading:</a> In this example, when the user clicks the link, the client-side router downloads the code for the next page while simultaneously fetching its data. The page is then rendered to the user <a href="/blog/web-frontend-performance/waterfall-diagram/client-side-navigation-preload-data.json">690ms</a> after the click.
    </figcaption>
</figure>

<figure id="figure-client-side-navigation-preload-code-data">
    <img alt="Waterfall diagram" src="/blog/web-frontend-performance/waterfall-diagram/client-side-navigation-preload-code-data.svg" />
    <figcaption>
        <a href="#figure-client-side-navigation-preload-code-data">Client-side navigation with code and data preloading:</a>In this example, when the user hovers over the link, the client-side router begins preloading the code for the next page. Then, upon clicking the link, the router fetches the necessary data. As a result, the page is rendered to the user <a href="/blog/web-frontend-performance/waterfall-diagram/client-side-navigation-preload-code-data.json">563ms</a> after the click.
    </figcaption>
</figure>

---

## Conclusion

I encourage you to explore other important web performance topics:

- Measuring performance using DevTools and metrics like Core Web Vitals.
- Improving user experience to enhance perceived speed.
- And more generally, scalability and algorithmic and database optimization.
