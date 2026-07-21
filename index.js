/**
 * @file Barebones Node.js/Express web server for the Heroku
 *       "nodejs-getting-started" sample application.
 *
 * @description
 * Bootstraps an Express application that serves static browser assets from
 * `public/` and renders EJS templates from `views/`. This module is
 * side-effecting: importing/executing it immediately binds and starts the
 * HTTP server rather than exporting a factory (`Source: index.js:19-83`).
 *
 * Runtime contract: the server listens on `process.env.PORT || 5006`
 * (`Source: index.js:31`) and tunes the socket keep-alive timeout to sit above
 * the Heroku Router's keep-alive idle timeout (`Source: index.js:104`). A
 * `SIGTERM` handler performs a graceful shutdown (`Source: index.js:118-131`).
 *
 * @requires express
 * @requires path
 */
const express = require('express')
const path = require('path')

/**
 * HTTP port the server binds to. Resolved from the platform-provided `PORT`
 * environment variable (injected by Heroku and most PaaS hosts), falling back
 * to `5006` for local development.
 *
 * @constant {number|string} port
 * @default 5006
 * Source: index.js:31
 */
const port = process.env.PORT || 5006

/**
 * The Express application instance that wires up middleware, view rendering,
 * and route handlers for this service.
 *
 * @constant {import('express').Express} app
 * Source: index.js:40
 */
const app = express()

/**
 * Middleware and view-engine configuration:
 * - `express.static(public/)` serves static browser assets (images, CSS, JS,
 *   e.g. `public/lang-logo.png`) directly from the `public/` directory
 *   (`Source: index.js:52`).
 * - the `views/` directory is registered as the template root
 *   (`Source: index.js:53`).
 * - `ejs` is selected as the view engine used to render those templates
 *   (`Source: index.js:54`).
 */
app.use(express.static(path.join(__dirname, 'public')))
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')

/**
 * Handles HTTP `GET /` — the application's single public endpoint.
 *
 * Logs that it is rendering the home page, then renders the EJS template
 * `pages/index`, producing a `200 text/html` response
 * (`Source: index.js:67-70`).
 *
 * @param {express.Request} req - The incoming HTTP request.
 * @param {express.Response} res - The HTTP response used to render the view.
 * @returns {void}
 */
app.get('/', (req, res) => {
  console.log(`Rendering 'pages/index' for route '/'`)
  res.render('pages/index')
})

/**
 * Binds the HTTP server to `port` and begins accepting connections. The
 * returned server handle is retained in `server` so its keep-alive timeout can
 * be tuned (`Source: index.js:104`) and so it can be shut down gracefully on
 * `SIGTERM` (`Source: index.js:118-131`). The listen callback logs the chosen
 * port once the socket is bound (`Source: index.js:81-83`).
 *
 * @constant {import('http').Server} server
 */
const server = app.listen(port, () => {
  console.log(`Listening on ${port}`)
})

/**
 * Keep-Alive timeout for the HTTP server, set to 95 seconds (`95 * 1000` ms).
 *
 * Deliberately GREATER than the Heroku Router's 90-second keep-alive idle
 * timeout so that closing an idle connection is always initiated by the router
 * rather than the Node.js server. This prevents a race condition in which the
 * router forwards a request to the app just as Node is closing the socket. The
 * existing inline notes below document the same rationale and link the
 * authoritative docs (`Source: index.js:98-104`).
 *
 * @see https://devcenter.heroku.com/articles/http-routing#keepalives
 * @see https://nodejs.org/api/http.html#serverkeepalivetimeout
 */
// The number of seconds an idle Keep-Alive connection is kept open. This should be greater than the Heroku Router's
// Keep-Alive idle timeout of 90 seconds:
// - to ensure that the closing of idle connections is always initiated by the router and not the Node.js server
// - to prevent a race condition if the router sends a request to the app just as Node.js is closing the connection
// https://devcenter.heroku.com/articles/http-routing#keepalives
// https://nodejs.org/api/http.html#serverkeepalivetimeout
server.keepAliveTimeout = 95 * 1000

/**
 * Graceful-shutdown handler for the `SIGTERM` signal (sent by Heroku and most
 * process managers when a dyno/container is being stopped or recycled).
 *
 * On receipt it logs that shutdown has begun and, if the server was
 * successfully created, calls `server.close(...)` to stop accepting new
 * connections and to close the server once in-flight requests have drained
 * (`Source: index.js:118-131`).
 *
 * @listens process#SIGTERM
 * @returns {Promise<void>}
 */
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: gracefully shutting down')
  if (server) {
    /**
     * Completion callback invoked once the HTTP server has finished closing
     * (all connections drained); logs "HTTP server closed"
     * (`Source: index.js:126-128`).
     */
    server.close(() => {
      console.log('HTTP server closed')
    })
  }
  // Cleanup after server close
})
