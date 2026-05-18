# Preload As Fetch, In Practice

<time class="date" datetime="2026-05-25">2026-05-25</time>

## Introduction

You add `<link rel="preload" as="fetch">` to your HTML, expecting data fetches to start earlier and finish faster. 
You test it — and the browser sends two requests instead of reusing the preload. The data arrives no sooner than if you hadn't preloaded at all.

Getting preloading right is tricky. The `<link>` tag and `fetch()` use different knobs to control the same request behaviour, 
and the two need to match. In this article, I break down which option combinations work, which don't, and where browsers disagree.

## Table of contents

- [Introduction](#introduction)
- [Table of contents](#table-of-contents)
- [How preloading works](#how-preloading-works)
- [How to correctly preload data fetches](#how-to-correctly-preload-data-fetches)
    - [Fetch options](#fetch-options)
    - [Preload options](#preload-options)
    - [Passing the right options to allow fetch to reuse preloaded responses](#passing-the-right-options-to-allow-fetch-to-reuse-preloaded-responses)
- [Are preloads reused for fetches with custom headers](#are-preloads-reused-for-fetches-with-custom-headers)
- [Conclusion](#conclusion)


## How preloading works

The following code snippets show how to preload a resource using a link tag. 

```html
<!DOCTYPE html>
<html>
    <head>
        <link rel="preload" as="fetch" href="./resource" />
        <script src="./script.js"></script>
    </head>
    <body></body>
</html>
```

```js
/* script.js */
const response = await fetch('./resource', { mode: 'no-cors', credentials: 'include' });
/* Do something with response */
```

When the browser sees the link tag, it starts fetching the resource. This helps start data loading before the script that needs it has loaded.
Later, when some JavaScript fetches the same data, the browser can reuse the preload response if already ready
(figure: [Early preload response](#early-preload-response)) 
or wait for it to finish if not (figure: [Late preload response](#late-preload-response)).

<figure id="early-preload-response">
    <img
        alt="Early preload response sequence diagram"
        src="/blog/preload-as-fetch-in-practice/diagrams/early-preload-response.svg"
        width="735"
        height="817"
    />
    <figcaption>
       <p><a href="#early-preload-response">Early preload response:</a>
       In this example, the browser receives the response to the preloaded resource before the script attempts fetching it.
       The browser keeps the response in its cache and reuses it once the script requests it.
       </p>
    </figcaption>
</figure>

<figure id="late-preload-response">
    <img
        alt="Late preload response sequence diagram"
        src="/blog/preload-as-fetch-in-practice/diagrams/late-preload-response.svg"
        width="735"
        height="891"
    />
    <figcaption>
       <p><a href="#late-preload-response">Late preload response:</a>
       In this example, the script attempts fetching the resource before a response is received for the preloading fetch.
       The browser does not send a second request. Instead, it holds the second fetch until the preloading response is received, reusing it.
       </p>
    </figcaption>
</figure>

## How to correctly preload data fetches

When we preload data using link tags, we want the browser to reuse the response to our preload on later fetches.
For that to work, the preloading fetch and the fetch done by the JavaScript code have to have matching options, so 
that the browser considers them as the same request.

### Fetch options

Two `fetch()` options — `mode` and `credentials` — determine whether the browser treats a subsequent request as matching the preload:

- `fetch` supports 3 [modes](https://developer.mozilla.org/en-US/docs/Web/API/RequestInit#mode):
    - `same-origin`, which disallows cross-origin requests. We won't revisit it since `<link rel="preload">` never uses this mode.
    - `no-cors` strips custom headers from all requests. For cross-origin requests, it also returns an opaque response that JavaScript cannot read.
    - `cors` (for [Cross-Origin Resource Sharing](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS)), the default mode.
        - Cross-origin requests use the CORS mechanism.
        - Same-origin requests work normally and allow custom headers.

- `fetch` also accepts 3 possible values for the [credentials](https://developer.mozilla.org/en-US/docs/Web/API/RequestInit#credentials) parameter:
    - `same-origin` (default) only sends credentials for same-origin requests.
    - `include` always sends credentials.
    - `omit` never sends credentials.

### Preload options

Preload link tags for data fetches have the following form, accepting an optional `crossorigin` attribute:

```html
<link rel="preload" as="fetch" href="URL-of-data" crossorigin="use-credentials|anonymous" />
```

- `<link rel="preload">` accepts 3 possible values for the [crossorigin](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/crossorigin) attribute:
    - (none), that is, when the attribute `crossorigin` is not passed.
        - The browser fetches the `href` URL with mode `no-cors`.
        - Credentials (cookies) are always sent for same-origin and for cross-origin URLs (`credentials='include'`).
    - `use-credentials`:
        - The browser fetches URL with mode `cors`.
        - Credentials (cookies) are always sent (`credentials='include'`).
    - `anonymous`:
        - The browser fetches URL with mode `cors`.
        - Credentials are never sent (`credentials='omit'`).

If the value given for the `crossorigin` attribute is an invalid keyword or an empty string, it will be handled as `crossorigin="anonymous"`.
Notice also that `<link rel="preload">` does not have a way to send requests with `mode=no-cors` and `credentials=omit`.

Now that we've seen both sides — the `fetch()` options and the `<link>` attributes — the question is: which combinations actually work? I ran experiments to find out.

### Passing the right options to allow fetch to reuse preloaded responses

In the repo [preload-as-fetch-experiments](https://github.com/NawfelBgh/preload-as-fetch-experiments), I conducted two experiments 
to find out when browsers are able to reuse `<link rel="preload" as="fetch">` data by later `fetch()`s.

[Experiment 1](https://github.com/NawfelBgh/preload-as-fetch-experiments#preload-reuse-experiment-1) includes a matrix 
showing which combinations of `<link rel="preload">` and `fetch()` options allow preloaded data to be reliably reused across browsers.

The results show that preloaded data is reused when the following elements are consistent with each other:

- The preloaded URL's origin (same-origin or cross-origin) must match the mode implied by the `<link>` tag's `crossorigin` attribute and align with `fetch()`'s `mode`.
- The `<link>` tag's `crossorigin` attribute must match the `credentials` option passed to `fetch()`.

I derived the following rules:

- When the preloaded URL is from the same origin:
    - Do not pass the `crossorigin` attribute to `<link rel="preload">`.
    - Explicitly pass `mode: "no-cors"` to `fetch` (since `cors` is the default mode).
    - Explicitly pass `credentials: "include"` to `fetch`.
- When the preloaded URL is from a different origin:
    - Always pass the `crossorigin` attribute.
    - If you want to include credentials, you must pass `credentials: "include"` to `fetch`.
    - If you don't want to include credentials, leave `fetch`'s `credentials` option to its default value.

If you stray from these rules, some combinations might still work — but not reliably across all browsers:

- When the preloaded URL is from the same origin:
    - Safari never reuses same-origin preloads when `crossorigin` attribute is specified,
    whereas Firefox and Chrome sometimes reuse them and sometimes do not, in ways inconsistent with each other.
    - Leaving `credentials` to its default value works in Firefox and Safari but not in Chrome (which will not reuse the preload).
- When the preloaded URL is from a different origin:
    - Passing `credentials: "omit"` explicitly works in Firefox and Safari but not in Chrome (which will not reuse the preload).

To make things concrete, here are the three combinations that work reliably across Chrome, Firefox, and Safari:

#### Same-origin requests

```html
<link rel="preload" as="fetch" href="URL" />
<script>
    fetch("URL", { mode: "no-cors", credentials: "include" });
</script>
```

#### Cross-origin requests with credentials

```html
<link rel="preload" as="fetch" href="URL" crossorigin="use-credentials" />
<script>
    fetch("URL", { mode: "cors", credentials: "include" });
</script>
```

#### Cross-origin requests without credentials

```html
<link rel="preload" as="fetch" href="URL" crossorigin="anonymous" />
<script>
    fetch("URL", { mode: "cors" });
</script>
```

These three cover the standard case — no custom headers. But what happens when your `fetch()` sends custom request headers?

## Are preloads reused for fetches with custom headers

In [experiment 2](https://github.com/NawfelBgh/preload-as-fetch-experiments#preload-reuse-experiment-2), I tested 
if the browser reuses preloaded data when handling a `fetch()` which sends custom request headers.

Since we cannot specify custom request headers when using `<link rel="preload" as="fetch">`, you would expect the following 
`fetch()` with custom headers to trigger a new request, but testing showed a more complicated picture.

1. Chrome always reuses the preloaded data. If the preloading is in progress when the `fetch()` is triggered, 
Chrome waits for it to finish and reuses its response.
2. Firefox reuses preloaded data if it is cacheable. If the preloading is in progress when the `fetch()` is triggered, 
Firefox waits for it to finish.
   - If the preload response is cacheable, it is reused by the `fetch()`, completing the request sooner than if a second request were sent.
   - If the preload response is not cacheable, the browser sends a second separate request, completing later than if it had not waited for the preload.
3. Safari ignores the preload (whether finished or in progress) and sends a separate HTTP request for the `fetch()`.

Safari's behavior is restrictive but always correct: a fetch with custom headers is never considered the same request as a preload 
with standard headers.
Chrome's behavior can lead to showing the wrong data if the server response is different based on request headers.
As for Firefox, it lets the server decide whether the preloading response is cached or not. Since Firefox relies on explicit 
server response headers, its reuse of preloads is less error-prone than Chrome's.

## Conclusion

Preloading fetch data can be tricky. In this article, I documented the narrow set of options that allow you to do it reliably across Chrome, Firefox, and Safari.

To summarize the key takeaways:
- **Same-origin requests**: Omit the `crossorigin` attribute and use `mode: "no-cors"` with `credentials: "include"` in `fetch()`.
- **Cross-origin with credentials**: Use `crossorigin="use-credentials"` and `mode: "cors"` with `credentials: "include"`.
- **Cross-origin without credentials**: Use `crossorigin="anonymous"` and `mode: "cors"` (default credentials).

When custom request headers are involved, browser behavior diverges significantly:
- Chrome always reuses preloads, even when `fetch()` sends different headers — convenient but can serve incorrect data.
- Safari never reuses preloads for `fetch()` calls with custom headers — restrictive but always correct.
- Firefox takes a middle ground: it reuses preloads when the response is cacheable and sends a new request otherwise.

I observed these behaviors when implementing the pattern "SSR Publicly Cacheable Content And Preload Dynamic Content" using 
[TanStack Start](https://github.com/NawfelBgh/tanstack-start-solid-example-ssr-cacheable-preload-dynamic/tree/preload-server-functions) and 
[SolidStart](https://github.com/NawfelBgh/solid-start-example-ssr-cacheable-preload-dynamic/tree/preload-server-functions)'s server functions, 
which typically send custom request headers.

The code used to derive the findings of this article is available in the 
[preload-as-fetch-experiments repository](https://github.com/NawfelBgh/preload-as-fetch-experiments).
