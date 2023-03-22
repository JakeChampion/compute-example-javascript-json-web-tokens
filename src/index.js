import * as jose from 'jose'
import { ObjectStore } from 'fastly:object-store';
import { SecretStore } from 'fastly:secret-store';
import { cookieParser } from './cookieParser';


async function jsonSecret(key) {
  const secrets = new SecretStore('secrets')

  const secret = await secrets.get(key)
  return JSON.parse(secret.plaintext())
}


addEventListener("fetch", event => {
  event.respondWith(app(event))
})
/**
 * @param {FetchEvent} event
 * @returns {Response}
 */
async function app(event) {
  try {
    const path = (new URL(event.request.url)).pathname;
    if (routes.has(path)) {
      const routeHandler = routes.get(path);
      return await routeHandler(event)
    }
    return new Response(`${path} endpoint does not exist`, { status: 404 })
  } catch (error) {
    return new Response(`The routeHandler threw an error: ${error.message}` + '\n' + error.stack, { status: 500 })
  }
}

const alg = 'RS256'
const routes = new Map();
routes.set('/', () => {
  return new Response('<a href="/login">login</a><br/><a href="/authenticated">authenticated</a><br/><a href="/logout">logout</a><br/>', { 'headers': { 'content-type': 'text/html' } });
});
routes.set('/authenticated', async (event) => {
  /** @type {Request} */
  const request = event.request;
  if (request.headers.has('cookie')) {
    const cookies = cookieParser(request.headers.get('cookie'))
    const jwt = cookies['__Secure-JWT'];
    const publicKey = await jose.importJWK(await jsonSecret('public_key'), alg)

    try {
      const { payload, protectedHeader } = await jose.jwtVerify(jwt, publicKey, {
        issuer: 'urn:example:issuer',
        audience: 'urn:example:audience',
      })

      return new Response(JSON.stringify({ payload, protectedHeader }), { 'headers': { 'content-type': 'application/json' } });
    } catch (error) {
      if (!(error instanceof jose.errors.JWSInvalid)) {
        throw error;
      }
    }
  }
  return new Response('Please <a href="/login">login</a>.', { 'headers': { 'content-type': 'text/html' } });
});
routes.set('/login', async (event) => {
  /** @type {Request} */
  const request = event.request;
  if (event.request.method === "POST") {
    if (request.body) {
      const formData = new URLSearchParams(await request.text());
      const email = formData.get('email')
      const password = formData.get('current-password')
      if (email && password) {
        const privateKey = await jose.importJWK(await jsonSecret('private_key'), alg)
        const jwt = await new jose.SignJWT({ 'urn:example:claim': true, email })
          .setProtectedHeader({ alg })
          .setIssuedAt()
          .setIssuer('urn:example:issuer')
          .setAudience('urn:example:audience')
          .setExpirationTime('2h')
          .sign(privateKey)

        return new Response('success', {
          status: 307,
          headers: {
            "Set-Cookie": `__Secure-JWT=${jwt}; Secure; HttpOnly`,
            "Location": "/authenticated",
          }
        })
      }
    }
  }
  const staticFiles = new ObjectStore('static_files');

  const entry = await staticFiles.get('/login.html');
  return new Response(entry.body, { 'headers': { 'content-type': 'text/html' } });
});
routes.set('/logout', async () => {
  return new Response('success', {
    status: 307,
    headers: {
      "Clear-Site-Data": '"cookies"',
      "Location": "/login",
    }
  })
});
routes.set('/script.js', async () => {
  const staticFiles = new ObjectStore('static_files');

  const entry = await staticFiles.get('/script.js');
  return new Response(entry.body, { 'headers': { 'content-type': 'application/javascript' } });
});
routes.set('/style.css', async () => {
  const staticFiles = new ObjectStore('static_files');

  const entry = await staticFiles.get('/style.css');
  return new Response(entry.body, { 'headers': { 'content-type': 'text/css' } });
});

