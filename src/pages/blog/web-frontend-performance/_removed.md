## Scaling the server

There are 2 axis along which [servers computational resources can be increased](https://en.wikipedia.org/wiki/Scalability):

- Vertical Scaling which is basically replacing the server machine with a more powerful one.
- Horizontal Scaling where multiple servers are used instead of a single one to split the load over many machines.

Vertical scaling usually requires little or no changes to the software. Maybe only some configuration to make it take advantage of the new available resources.

On the other hand, horizontally scaling a previously single machine server usually requires some software adjustments to make sure that users requests can be handled by any of the available servers. This usually require moving to a [stateless architecture](https://en.wikipedia.org/wiki/Service_statelessness_principle) where server state is stored in a shared database.

Externalizing server state can introduce new delays that did not exist in the mono-server architecture. For example, in a single server environment, since server can keep the active user sessions in an internal cache to speed up the authorization checking of incoming requests. When using multiple stateless servers, an internal cache cannot be used for this purpose: When a user logs in or out, all the server instances should respond to them is a consistent manner. The straight-forward stateless solution is to validate every incoming user request by querying a central database. A more efficient solution which eliminate delays from querying a central database is to replace the use of session IDs with [JSON Web Tokens (JWT)](https://en.wikipedia.org/wiki/JSON_Web_Token). This is illustrated in the 2 following figures:

<figure id="figure-auth-session-id">
    <img
        alt="Authorization using session IDs"
        src="/blog/web-frontend-performance/auth-with-session-id.svg"
        width="750"
        height="650"
    />
    <figcaption>
       <a href="#figure-auth-session-id">Authorization using session IDs:</a> When the user is logged in, the server gives them a session ID. On every subsequent request the client sends that session ID to the server which queries the database to get session information and determine if the user is authorized to access the resources they requested.
    </figcaption>
</figure>

<figure id="figure-auth-jwt">
    <img
        alt="Authorization using JWTs"
        src="/blog/web-frontend-performance/auth-with-jwt.svg"
        width="750"
        height="650"
    />
    <figcaption>
       <a href="#figure-auth-jwt">Authorization using JWTs:</a> When the user is logged in, they get a JWT which encode the user permissions and which are cryptographically signed by an authorization authority. On every subsequent request the client sends this JWT to the server which internally verifies that the JWT is properly signed and which reads user permissions directly from the JWT.
    </figcaption>
</figure>

### Scaling different services as needed

Traditionally, a single server would handle a variety of services - Say for example, a dashboard for website editors and a frontend for site visitors.
As our visitor base grows, horizontally scaling our server results in not only the addition of multiple frontend servers (which is necessary) but also an excess of dashboard servers that are wastefully allocated. This can motivate us to break our system into distinct services that can be scaled independently.

<!--
  - Making them wait as little as possible
  - Not draining the battery of their devices
  - Not making their laptops hot and their fans loud

  - Reducing the workload of servers, networks and user devices
  - Not giving users incentive to switch to newer hardware
-->

- HTML documents contain page text and reference other _resources_. That is: files to fetch from the server.
- CSS style sheets describe how the browser should format web pages content
- JavaScript files, or simply scripts, contain code that the browser executes in user devices. Scripts can respond to user interactions with the page by modifying the page, by fetching more resources from the server or by sending action requests to the server.
- Image files (in formats like JPEG and PNG).
- JSON data. That is data which is serialized in a format that is easily parsable by JavaScript

We will explore optimization techniques affecting web frontends. That is: the content that gets displayed in user screens, the code that is executed in their devices, and also frontend servers.
