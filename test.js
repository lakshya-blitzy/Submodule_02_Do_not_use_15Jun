/**
 * @fileoverview Jest integration suite ("getting started guide") for the Express
 * getting-started app. Before each test it boots the app under test by spawning
 * `node index.js` (the sibling module documented in ./index.js) as a child process,
 * then issues real HTTP `GET /` requests over both IPv4 (`127.0.0.1`) and IPv6
 * (`[::1]`), asserting an HTTP 200 response together with the expected page title
 * and heading.
 *
 * The suite relies only on Node.js built-ins - `child_process.spawn` to launch the
 * server and `http.request` (via the Promise-based {@link get} helper) to make the
 * requests - with no third-party HTTP client. The target port is read from
 * `process.env.PORT`, falling back to 5006. This module exports nothing; it is run
 * directly by the Jest test runner (`npm test`).
 *
 * Source: test.js:L1-L103
 */

const { spawn } = require('child_process')
const { request } = require('http')

const PORT = process.env.PORT || 5006

// Integration test suite for the running Express app: it exercises the live server
// end to end by starting `node index.js` and asserting the real `GET /` HTTP contract.
// Source: test.js:L26-L65
describe('getting started guide', () => {
  let app

  // Spawn `node index.js` as a child process before each test, forward the child's
  // stdout to the console for debugging, and wait ~500ms so the HTTP server has time
  // to start listening before requests are made. Source: test.js:L32-L37
  beforeEach(async () => {
    app = spawn('node', ['index.js'])
    app.stdout.on('data', (data) => console.log(data.toString()))
    // give the server a short time to start up
    return new Promise(resolve => setTimeout(resolve, 500))
  })

  // Tear down after each test: detach the stdout listeners and send `SIGTERM` to the
  // child process, exercising the app's graceful-shutdown path. Source: test.js:L41-L46
  afterEach(() => {
    if (app) {
      app.stdout.removeAllListeners()
      app.kill('SIGTERM')
    }
  })

  // IPv4 case: GET http://127.0.0.1:${PORT} and expect HTTP 200 with the Heroku
  // getting-started page title and heading. Source: test.js:L50-L55
  it('should bind to IPv4 and respond to GET /', async () => {
    const response = await get(`http://127.0.0.1:${PORT}`)
    expect(response.statusCode).toBe(200)
    expect(response.body).toMatch("<title>Node.js Getting Started on Heroku</title>")
    expect(response.body).toMatch("Getting Started on Heroku with Node.js")
  })

  // IPv6 case: GET http://[::1]:${PORT} and assert the same HTTP 200, title, and
  // heading over the IPv6 loopback. Source: test.js:L59-L64
  it('should bind to IPv6 and respond to GET /', async () => {
    const response = await get(`http://[::1]:${PORT}`)
    expect(response.statusCode).toBe(200)
    expect(response.body).toMatch("<title>Node.js Getting Started on Heroku</title>")
    expect(response.body).toMatch("Getting Started on Heroku with Node.js")
  })
})

/**
 * Issues an HTTP `GET` request to the given URL and buffers the full response body.
 *
 * Wraps Node's `http.request` in a Promise: it sets the response encoding to UTF-8,
 * concatenates the streamed response chunks into a single string, resolves once the
 * response `end` event fires, and rejects if either the request or the response
 * stream emits an `error` event. Source: test.js:L86-L103
 *
 * @param {string} url - The absolute URL to GET (e.g. `http://127.0.0.1:5006`).
 * @returns {Promise<{statusCode: number, body: string}>} Resolves with the HTTP
 *   response status code and the full response body decoded as text.
 * @throws {Error} Rejects (rather than throwing synchronously) if the request emits
 *   `error` or the response stream emits `error` - e.g. connection refused or a
 *   network failure.
 * @example
 * const response = await get('http://127.0.0.1:5006')
 * // response.statusCode === 200
 * // response.body contains the rendered HTML page
 */
async function get(url) {
  return new Promise((resolve, reject) => {
    const req = request(url, {method: 'GET'}, (res) => {
      let body = ''
      res.setEncoding('utf-8')
      res.on('data', (data) => body += data)
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
