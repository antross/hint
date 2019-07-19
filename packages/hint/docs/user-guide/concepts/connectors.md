# Connectors

A connector is the interface between a .hintrc's configured hints and
the website you are testing. It is responsible for loading and rendering
that site, then exposing collected information to webhint such as
resources, network data, etc.

To use a connector, first install its package. The package name should
start with `@hint/connector-`, `webhint-connector-`, or
`@namespace/webhint-connector-`. Then, add the package name to the
`connector` object within your .hintrc file. For example, if you
installed `@hint/connector-local`, add the following:

```json
{
    "connector": {
        "name": "@hint/connector-local"
    }
}
```

## Official connectors and platform support

All of the _built-in_ connectors run in any of webhint's supported
platforms: Linux, macOS, and Windows. The only caveat is that you need
to already have the browser or other binary utilized by that connector
installed; webhint cannot install it for you.

## List of official connectors

The officially supported connectors which can be installed using your
preferred package manager are:

* [`@hint/connector-chrome`][connector-chrome]. Uses Google Chrome via
  the [chrome debugging protocol][cdp].
* [`@hint/connector-jsdom`][connector-jsdom]. Uses [jsdom][].
* [`@hint/connector-local`][connector-local]. Analyzes the local files
  in your project.
* [`@hint/connector-puppeteer`][connector-puppeteer]. Uses [puppeteer][]
  to communicate with the browser specified in its options object.

## Configuration

Connectors can be configured. Maybe you want to make a request with
another userAgent, change some of the other defaults, etc. To customize
the behavior of your selected connector, add the property `options` to
your `connector` object with the values you want to modify:

```json
{
    "connector": {
        "name": "@hint/connector-name",
        "options": {}
    }
}
```

Check out the documentation for [each official connector][connectors]
for more information about the options available.

If you want to implement your own connector, visit the [contributor
guide][].

<!-- Link labels: -->

[cdp]: https://chromedevtools.github.io/devtools-protocol/
[connector-chrome]: https://webhint.io/docs/user-guide/connectors/connector-chrome/
[connector-jsdom]: https://webhint.io/docs/user-guide/connectors/connector-jsdom/
[connector-local]: https://webhint.io/docs/user-guide/connectors/connector-local/
[connector-puppeteer]: https://webhint.io/docs/user-guide/connectors/connector-puppeteer/
[connectors]: #list-of-official-connectors
[jsdom]: https://github.com/jsdom/jsdom
[puppeteer]: https://pptr.dev/
[contributor guide]: https://webhint.io/docs/contributor-guide/how-to/connector/
