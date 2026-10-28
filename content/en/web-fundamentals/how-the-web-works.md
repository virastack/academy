---
title: "How the web works"
description: "The browser, HTTP request/response and DevTools."
lastVerified: "2026-10-17"
translationKey: "web-fundamentals/how-the-web-works"
---

## Client and server

The web is a conversation between two sides. The **client** is your device and the browser running on it. The **server** is the computer that hosts pages and applications. When you open a page, a copy of its code travels from the server to your browser, and the browser draws it on screen.[^1]

A website is not a single file. **Code** files *(HTML, CSS, JavaScript)* and **assets** *(images, video, fonts, PDFs)* are downloaded separately and assembled in the browser.[^1]

## What happens when you open an address

When you type `https://example.com` and press Enter, roughly this happens:[^1][^2]

1. The browser decides whether what you typed is a search or an address.
2. It uses **DNS** to find the IP address of the server behind the domain name.
3. It opens a connection to the server; if the address is `https`, that connection is encrypted with **TLS**.
4. It sends an **HTTP request**.
5. The server returns an **HTTP response**; the data arrives in small *(packet)* pieces that the browser reassembles in the right order.
6. The browser reads the HTML, asks for the CSS, JavaScript and images it needs, and draws the page.

The sections below take these steps one at a time.

## The parts of a URL

Take `https://www.example.com:443/products/book?color=blue&page=2#reviews`:[^3]

| Part | Example | What it does |
| :-- | :-- | :-- |
| Scheme | `https` | Which protocol to ask with |
| Domain | `www.example.com` | Which server to go to |
| Port | `443` | The door on the server; left out for the standard ports *(HTTP 80, HTTPS 443)* |
| Path | `/products/book` | Where the resource sits on the server |
| Parameters | `?color=blue&page=2` | Key/value pairs sent to the server |
| Anchor | `#reviews` | A place inside the page; **never sent to the server** |

## DNS

**DNS** *(Domain Name System)* is the address book of the internet: it turns a readable name like `example.com` into a server's IP address, such as `192.0.2.172`.[^1] Large sites run on more than one server, so the same name can resolve to a different IP depending on where you are.[^1]

The browser looks for the answer in its own cache first, then in the operating system's. If it is in neither, the question goes to a **recursive resolver** *(usually your internet provider's, or a service such as `1.1.1.1` or `8.8.8.8`)*. The resolver asks a root server, then the server for the extension such as `.com`, and finally the domain's **authoritative** server, where the real record lives.[^4]

Every record has a **TTL** *(time to live)*, and caches keep the answer for that long. That is why a DNS change does not reach everyone at once. "No such domain" gets cached too.[^5]

## HTTP requests and responses

**HTTP** is the language the client and the server speak. The client always starts the request.[^6] Every message has a start line, **headers**, a blank line and an optional **body**.[^7]

```http
GET /products HTTP/1.1
Host: example.com
Accept-Language: en
```

```http
HTTP/1.1 200 OK
Content-Type: text/html
Content-Length: 29769

<!doctype html>…
```

The request line carries a **method** *(what to do)*, a target *(the path)* and the protocol version. The most common ones are `GET` to read data and `POST` to send it; a body is usually only there on `POST`, `PUT` and `PATCH` requests.[^7]

The **status code** in the response says how it went. The first digit gives the class:[^8]

| Code | Meaning | Common ones |
| :-- | :-- | :-- |
| `1xx` | Informational | |
| `2xx` | Success | `200 OK` |
| `3xx` | Redirection | `301` moved permanently, `304` the cached copy is still good |
| `4xx` | Client error | `404` not found, `403` no access |
| `5xx` | Server error | `500` the server did not know what to do |

HTTP is **stateless**: nothing connects two requests on its own. Staying logged in, or a cart that survives, is the work of **cookies**.[^6] There can also be **proxies** between the browser and the server: a cache, a load balancer, a security layer.[^6]

What the messages mean stays the same across versions; what changes is how the data travels. In 2024, 70% of mobile home pages were served over HTTP/2, 9% over HTTP/3 and 21% over HTTP/1.1.[^9] That HTTP/3 figure looks lower than it is: a browser only uses HTTP/3 once the server has advertised support for it, so the measurement undercounts it. Counting sites by that advertisement instead brings the share close to 30%.[^9]

## HTTPS

**HTTPS** is HTTP encrypted with TLS; nobody in between can read or change the content.[^10] It is the default now: in 2024, 98% of mobile requests came over an encrypted connection.[^11]

Many browser features, among them the camera, the microphone and service workers, only work in a **secure context**, which means HTTPS. `http://localhost` counts as one, so you do not need a certificate while developing.[^12]

## How the browser draws the page

When the HTML arrives, the browser reads it and turns it into a tree, the **DOM** *(Document Object Model)*, where every element, attribute and piece of text becomes a **node**.[^13] As it reads, it fires off new requests for the `<link>`, `<script>` and `<img>` elements it meets.[^13]

It then attaches the CSS rules to the matching nodes, works out the size and position of every box *(layout)* and paints the pixels on screen *(paint)*. JavaScript runs alongside this and can change the DOM, and with it the picture. An **accessibility tree** is also built from the DOM, for screen readers.[^13]

> [!TIP]
>
> Browsers such as Chrome mostly run tabs in separate processes. That is why the others keep working when one tab freezes.[^14]

## DevTools

The browser's developer tools let you see everything this lesson describes with your own eyes. Open them with `Ctrl` + `Shift` + `I` or `F12` on Windows, `⌘` + `⌥` + `I` on macOS; right-clicking an element and choosing **Inspect** works too. In Safari you first have to turn on the Develop menu in the settings.[^15]

| Panel | What it's for |
| :-- | :-- |
| **Elements** | Seeing the live DOM and the CSS applied to it, and editing both on the spot |
| **Console** | Reading errors and running JavaScript on the page |
| **Sources** | Setting breakpoints in JavaScript and stepping through it |
| **Network** | Seeing every request the page makes, with its status, size and timing |

![Chrome DevTools Elements panel: the page's DOM tree on the left, the CSS rules applied to the selected body element in the middle, the margin, border and padding box on the right](https://raw.githubusercontent.com/virastack/academy/main/assets/web-fundamentals/how-the-web-works/devtools-elements.png)

Click a request in the Network panel and the **Headers** tab shows the request and response headers, while the **Response** tab shows what the server returned. The **Status** column gives the response code, and **Initiator** says what started the request.[^16]

![Chrome DevTools Network panel: Preserve log, Disable cache and throttling controls along the top, and below them a list giving the method, status, type and duration of every request](https://raw.githubusercontent.com/virastack/academy/main/assets/web-fundamentals/how-the-web-works/devtools-network.png)

> [!DO]
>
> - Open the panel before you load the page; DevTools only records requests made while it is open.[^16]
> - Tick **Disable cache** to see what a first-time visitor gets.[^17]
> - Turn on **Preserve log** so requests survive a redirect.[^17]
> - Pick 3G from the throttling menu to try a slow connection.[^16]

## Going deeper

- **The whole page load:** MDN's guide to every step from DNS to paint, from a performance angle.[^18]
- **Inside the browser:** [Mariko Kosaka](https://kosamari.com/)'s four-part, illustrated series on Chrome's architecture.[^14][^2]
- **The network layer:** [Ilya Grigorik](https://ilya.grigorik.com/)'s free book *High Performance Browser Networking*, on TCP, TLS and HTTP/2.[^19]
- **Try DNS by hand:** [Julia Evans](https://jvns.ca/)'s Mess With DNS, where you get your own subdomain, add records and watch the queries arrive live.[^20]
- **Talk:** [Julia Evans](https://jvns.ca/)'s RubyConf Mini 2022 keynote on DNS and on learning hard subjects.[^5]

## Sources

1. [MDN: How the web works](https://developer.mozilla.org/en-US/docs/Learn_web_development/Getting_started/Web_standards/How_the_web_works) *(doc)* — Client and server, what happens when you type an address, DNS, TCP/IP, packets, code and asset files.
2. [Mariko Kosaka: Inside look at modern web browser, part 2](https://developer.chrome.com/blog/inside-browser-part2) *(article)* — Search or address, DNS and TLS, reading the response and handing the page to the renderer.
3. [MDN: What is a URL?](https://developer.mozilla.org/en-US/docs/Learn_web_development/Howto/Web_mechanics/What_is_a_URL) *(doc)* — Scheme, domain, port, path, parameters and the anchor that never reaches the server.
4. [Cloudflare Learning: What is DNS?](https://www.cloudflare.com/learning/dns/what-is-dns/) *(article)* — Recursive resolver, root, TLD and authoritative servers; browser and operating system caches.
5. [Julia Evans: Learning DNS (RubyConf Mini 2022)](https://www.youtube.com/watch?v=tsxjNsFu_2g) *(video)* — Keynote. Resolver caches, TTL and the caching of "no such domain"; there is a written summary on [her blog](https://jvns.ca/blog/2023/05/08/new-talk-learning-dns-in-10-years/).
6. [MDN: Overview of HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Overview) *(doc)* — The client always starting the request, the stateless design and cookies, proxies.
7. [MDN: HTTP messages](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Messages) *(doc)* — The shape of a request and a response: start line, method, headers, body.
8. [MDN: HTTP response status codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status) *(doc)* — The five status code classes and what each code means.
9. [Web Almanac 2024: HTTP](https://almanac.httparchive.org/en/2024/http) *(research)* — Robin Marx. 70% HTTP/2, 9% HTTP/3 and 21% HTTP/1.1 on mobile home pages; HTTP/3 undercounted because of `alt-svc` discovery, with the real share close to 30%.
10. [MDN: HTTPS](https://developer.mozilla.org/en-US/docs/Glossary/HTTPS) *(doc)* — HTTP encrypted with TLS.
11. [Web Almanac 2024: Security](https://almanac.httparchive.org/en/2024/security) *(research)* — 98% of mobile requests over TLS.
12. [MDN: Secure contexts](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Secure_Contexts) *(doc)* — Which features require HTTPS, and `localhost` counting as secure.
13. [MDN: How browsers load websites](https://developer.mozilla.org/en-US/docs/Learn_web_development/Getting_started/Web_standards/How_browsers_load_websites) *(doc)* — HTML to DOM, applying CSS, layout, paint, JavaScript and the accessibility tree.
14. [Mariko Kosaka: Inside look at modern web browser, part 1](https://developer.chrome.com/blog/inside-browser-part1) *(article)* — The browser, renderer and GPU processes; why each tab runs in its own process.
15. [MDN: What are browser developer tools?](https://developer.mozilla.org/en-US/docs/Learn_web_development/Howto/Tools_and_setup/What_are_browser_developer_tools) *(doc)* — Opening DevTools; the Elements, Console and Sources panels.
16. [Chrome DevTools: Inspect network activity](https://developer.chrome.com/docs/devtools/network) *(doc)* — The Network panel's columns, the Headers and Response tabs, throttling.
17. [Chrome DevTools: Network features reference](https://developer.chrome.com/docs/devtools/network/reference) *(doc)* — Disable cache and Preserve log.
18. [MDN: Populating the page: how browsers work](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/How_browsers_work) *(doc)* — DNS, TCP, TLS, parsing, layout, paint and compositing, from a performance angle.
19. [Ilya Grigorik: High Performance Browser Networking](https://hpbn.co/) *(article)* — A book you can read for free: TCP, UDP, TLS, HTTP/1.x, HTTP/2 and browser APIs.
20. [Mess With DNS](https://messwithdns.net/) *(doc)* — Wizard Zines' tool for experimenting safely with DNS records.
