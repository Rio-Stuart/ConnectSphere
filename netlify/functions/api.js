// netlify/functions/api.js — Netlify Serverless Function Wrapper for ConnectSphere Express
const serverless = require('serverless-http');
const app = require('../../server');

// Wrap Express app with serverless-http
const handler = serverless(app);

module.exports.handler = async (event, context) => {
  // Allow Netlify Function to complete without waiting for the MySQL pool connection loop
  context.callbackWaitsForEmptyEventLoop = false;
  return await handler(event, context);
};
