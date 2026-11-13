// netlify/functions/api.mjs — Netlify Functions v2 Wrapper for ConnectSphere
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const serverless = require('serverless-http');
const app = require('../../server.js');

const lambdaHandler = serverless(app);

export default async (req, context) => {
  // Bridge Netlify runtime environment variables (e.g. NETLIFY_DB_URL) to process.env
  if (typeof Netlify !== 'undefined' && Netlify.env) {
    const dbUrl = Netlify.env.get('NETLIFY_DB_URL');
    if (dbUrl && !process.env.NETLIFY_DB_URL) {
      process.env.NETLIFY_DB_URL = dbUrl;
    }
  }

  const url = new URL(req.url);
  const headers = {};
  for (const [k, v] of req.headers.entries()) {
    headers[k] = v;
  }

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  const bodyText = hasBody ? await req.text() : null;

  const event = {
    httpMethod: req.method,
    path: url.pathname,
    queryStringParameters: Object.fromEntries(url.searchParams.entries()),
    headers,
    body: bodyText,
    isBase64Encoded: false
  };

  const lambdaRes = await lambdaHandler(event, context || {});
  
  const resHeaders = new Headers();
  if (lambdaRes.headers) {
    for (const [k, v] of Object.entries(lambdaRes.headers)) {
      if (v !== undefined && v !== null) {
        resHeaders.set(k, String(v));
      }
    }
  }

  return new Response(lambdaRes.body, {
    status: lambdaRes.statusCode || 200,
    headers: resHeaders
  });
};

export const config = {
  path: "/api/*",
  preferStatic: false
};
