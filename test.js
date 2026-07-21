/**
 * @file test.js
 * @fileoverview Jest black-box integration suite ("getting started guide") for the
 * nested Node.js/Express getting-started app. The suite does NOT import the Express
 * application object; instead it boots the app under test by spawning `node index.js`
 * (the sibling module documented in ./index.js) as a child process, then probes the
 * running HTTP server with real `GET /` requests over both IPv4 (`127.0.0.1`) and IPv6
 * (`[::1]`) loopback, asserting an HTTP 200 response together with the expected
 * landing-page title and heading.
 *
 * For process control and networking the suite relies on Node.js built-ins:
 * `child_process.spawn` launches the server (Source: test.js:23) and `http.request`,
 * wrapped by the Promise-based {@link get} helper, issues the requests
 * (Source: test.js:24). The test *structure* and *assertions*, by contrast, are
 * provided by Jest -- the `describe`/`beforeEach`/`afterEach`/`it` globals and the
 * `expect` matchers, backed by the declared `jest` dev dependency
 * (Source: package.json:L18). The target port is read from `process.env.PORT`,
 * falling back to 5006 to match the server default. This module exports nothing and
 * is executed directly by the Jest runner (`npm test`).
 *
 * Source: test.js:23-48
 */
const { spawn } = require('child_process')
const { request } = require('http')

/**
 * TCP port the suite targets when issuing HTTP requests to the spawned server.
 *
 * Resolves to `process.env.PORT` when that variable is set (truthy), otherwise falls
 * back to `5006`, mirroring the default used by the server in `index.js` so the tests
 * always connect to the port the application actually listens on.
 *
 * @constant {number|string} PORT
 * Source: test.js:36
 */
const PORT = process.env.PORT || 5006

/**
 * Top-level Jest suite for the getting-started guide.
 *
 * Manages the lifecycle of a freshly spawned server around every test case: a child
 * `node index.js` process is started before each test and terminated afterwards, while
 * the individual specs assert that the landing page renders correctly over both the
 * IPv4 and IPv6 loopback interfaces.
 *
 * Source: test.js:48
 */
describe('getting started guide', () => {
  let app

  /**
   * Per-test setup hook.
   *
   * Spawns `node index.js` as a child process to launch a fresh instance of the Express
   * server, forwards the child's stdout to the console for debugging, and then waits
   * roughly 500 ms (by resolving a timeout-backed Promise) so the HTTP server has time
   * to begin listening before any request is issued.
   *
   * @function beforeEach
   * @returns {Promise<void>} Resolves after the ~500 ms startup grace period.
   * Source: test.js:63-84
   */
  beforeEach(async () => {
    app = spawn('node', ['index.js'])
    /**
     * stdout forwarder for the spawned server. Prints each chunk the child
     * process writes to its standard output to the test console, giving the
     * running test visibility into the server's startup log.
     *
     * @param {Buffer} data - A chunk of the child process's stdout stream.
     * @returns {void}
     */
    app.stdout.on('data', (data) => console.log(data.toString()))
    // give the server a short time to start up
    /**
     * Startup grace-period Promise executor passed to `new Promise`: it hands the
     * Promise's `resolve` to `setTimeout` so the Promise settles after ~500 ms, letting
     * the spawned server begin listening first. As a concise arrow it implicitly returns
     * the `setTimeout` `Timeout` handle, which the `Promise` constructor ignores.
     *
     * @param {() => void} resolve - The Promise's resolve function, fired by `setTimeout`.
     */
    return new Promise(resolve => setTimeout(resolve, 500))
  })

  /**
   * Per-test teardown hook.
   *
   * When a child process was spawned, detaches all of its stdout listeners and sends
   * `SIGTERM` to the child, terminating the spawned server and exercising the app's
   * graceful-shutdown path between tests.
   *
   * @function afterEach
   * @returns {void}
   * Source: test.js:97-102
   */
  afterEach(() => {
    if (app) {
      app.stdout.removeAllListeners()
      app.kill('SIGTERM')
    }
  })

  /**
   * IPv4 landing-page test.
   *
   * Issues `GET http://127.0.0.1:${PORT}` against the spawned server and asserts an HTTP
   * `200` status code together with the expected page title
   * (`<title>Node.js Getting Started on Heroku</title>`) and heading
   * (`Getting Started on Heroku with Node.js`) in the response body.
   *
   * @returns {Promise<void>} Resolves once all assertions have passed.
   * Source: test.js:115-120
   */
  it('should bind to IPv4 and respond to GET /', async () => {
    const response = await get(`http://127.0.0.1:${PORT}`)
    expect(response.statusCode).toBe(200)
    expect(response.body).toMatch("<title>Node.js Getting Started on Heroku</title>")
    expect(response.body).toMatch("Getting Started on Heroku with Node.js")
  })

  /**
   * IPv6 landing-page test.
   *
   * Mirrors the IPv4 case but targets the IPv6 loopback address: issues
   * `GET http://[::1]:${PORT}` and asserts the same HTTP `200` status code, page title,
   * and heading, confirming the server also serves requests over IPv6.
   *
   * @returns {Promise<void>} Resolves once all assertions have passed.
   * Source: test.js:132-137
   */
  it('should bind to IPv6 and respond to GET /', async () => {
    const response = await get(`http://[::1]:${PORT}`)
    expect(response.statusCode).toBe(200)
    expect(response.body).toMatch("<title>Node.js Getting Started on Heroku</title>")
    expect(response.body).toMatch("Getting Started on Heroku with Node.js")
  })
})

/**
 * Promisified HTTP `GET` client used by the tests.
 *
 * Wraps Node's event-driven `http.request` in a Promise: it opens a `GET` request to the
 * given URL, sets the response encoding to UTF-8 and accumulates the streamed response
 * chunks on each `data` event (Source: test.js:183-191), and resolves once the response
 * stream emits `end` (Source: test.js:199-204). The promise rejects if the response stream
 * emits an `error` (Source: test.js:205) or the request itself emits an `error`
 * (Source: test.js:207) - e.g. a connection refusal or other network failure.
 *
 * @param {string} url - The absolute URL to GET (e.g. `http://127.0.0.1:5006`).
 * @returns {Promise<{statusCode: number, body: string}>} Resolves with the HTTP response
 *   status code and the fully accumulated, UTF-8-decoded response body; rejects with an
 *   `Error` (rather than throwing synchronously) if the request or response stream emits
 *   an `error` event, e.g. a connection refusal or other network failure.
 * @example
 * const response = await get(`http://127.0.0.1:${PORT}`)
 * // response.statusCode === 200
 * // response.body contains the rendered HTML landing page
 * Source: test.js:161-210
 */
async function get(url) {
  /**
   * Promise executor for {@link get}. Receives the `resolve`/`reject` functions
   * used to settle the returned Promise: it opens the HTTP request and wires the
   * response- and error-event listeners that ultimately call them.
   *
   * @param {(value: {statusCode: number, body: string}) => void} resolve - Settles the Promise with the response.
   * @param {(reason?: any) => void} reject - Rejects the Promise on a request or response error.
   * @returns {void}
   */
  return new Promise((resolve, reject) => {
    /**
     * HTTP response callback for the outgoing `GET` request. Invoked once the
     * response headers arrive; sets the response encoding to UTF-8 and registers
     * the streaming `data`/`end`/`error` listeners that accumulate and resolve
     * the body.
     *
     * @param {import('http').IncomingMessage} res - The incoming HTTP response stream.
     * @returns {void}
     */
    const req = request(url, {method: 'GET'}, (res) => {
      let body = ''
      res.setEncoding('utf-8')
      /**
       * Response `data` accumulator. Appends each decoded chunk of the response
       * body to the `body` string as it streams in. Written as a concise arrow, it
       * implicitly returns the updated `body` string, a value the emitter ignores.
       *
       * @param {string} data - A UTF-8-decoded chunk of the response body.
       */
      res.on('data', (data) => body += data)
      /**
       * Response `end` handler. Fires once the full response body has been
       * received and resolves the Promise with the HTTP status code and the
       * fully accumulated body.
       *
       * @returns {void}
       */
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          body: body
        })
      })
      res.on('error', reject)
    })
    req.on('error', reject)
    req.end()
  })
}
