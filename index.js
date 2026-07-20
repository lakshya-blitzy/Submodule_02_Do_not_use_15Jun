/**
 * @fileoverview Express web-app entry point for the Heroku "Node.js Getting Started"
 * sample application. This CommonJS module bootstraps and runs the web server; it has
 * no exports and is executed directly (e.g. `node index.js`, as declared by the
 * Procfile's `web: node index.js`).
 *
 * Responsibilities, in source order:
 * - Imports the Express framework and Node's built-in `path` module.
 * - Derives the listening port from `process.env.PORT`, falling back to `5006`.
 * - Creates the Express application instance.
 * - Serves static assets from `public/`, registers `views/` as the views directory,
 *   and selects EJS as the view engine.
 * - Defines a single `GET /` route that renders the `pages/index` EJS view.
 * - Starts the HTTP listener and logs the bound port.
 * - Tunes `server.keepAliveTimeout` to 95 seconds so it exceeds the Heroku Router's
 *   90-second Keep-Alive idle timeout.
 * - Registers a `SIGTERM` handler for graceful HTTP-server shutdown.
 */
const express = require('express')
const path = require('path')

const port = process.env.PORT || 5006

const app = express()

app.use(express.static(path.join(__dirname, 'public')))
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')

/**
 * Express request handler for the application's root route (`GET /`).
 *
 * Logs that the index page is being rendered, then renders the `pages/index` EJS
 * template and sends the resulting HTML back to the client.
 *
 * @param {import('express').Request} req - The incoming HTTP request.
 * @param {import('express').Response} res - The HTTP response used to render the EJS view.
 * @returns {void}
 * @example
 * // GET / → 200 text/html (rendered pages/index)
 */
app.get('/', (req, res) => {
  console.log(`Rendering 'pages/index' for route '/'`)
  res.render('pages/index')
})

/**
 * Server-bootstrap callback for `app.listen`. Invoked once the HTTP server has bound
 * to the configured `port` and is ready to accept connections; it logs the bound port.
 *
 * @returns {void}
 */
const server = app.listen(port, () => {
  console.log(`Listening on ${port}`)
})

// The number of seconds an idle Keep-Alive connection is kept open. This should be greater than the Heroku Router's
// Keep-Alive idle timeout of 90 seconds:
// - to ensure that the closing of idle connections is always initiated by the router and not the Node.js server
// - to prevent a race condition if the router sends a request to the app just as Node.js is closing the connection
// https://devcenter.heroku.com/articles/http-routing#keepalives
// https://nodejs.org/api/http.html#serverkeepalivetimeout
server.keepAliveTimeout = 95 * 1000

/**
 * Graceful-shutdown handler for the `SIGTERM` signal (sent by Heroku when a dyno is
 * cycled or scaled down). Logs receipt of the signal, then calls `server.close()` to
 * stop accepting new connections and let in-flight requests finish, logging once the
 * HTTP server has fully closed.
 *
 * @async
 * @listens process#SIGTERM
 * @returns {Promise<void>} Resolves once the shutdown handler completes.
 */
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: gracefully shutting down')
  if (server) {
    server.close(() => {
      console.log('HTTP server closed')
    })
  }
  // Cleanup after server close
})
