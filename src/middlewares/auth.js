// src/middlewares/auth.js
const jwksRsa = require('jwks-rsa');
const jwt = require('jsonwebtoken');
const { get } = require('lodash');

// Configura el cliente JWKS con la URI para obtener las claves públicas
const client = jwksRsa({
  jwksUri: 'https://ciudadan.us.auth0.com/.well-known/jwks.json',
});

// Función para obtener la clave pública a partir del encabezado del token
const getKey = (header, callback) => {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      console.error('Error obteniendo la clave:', err);
      callback(err);
    } else {
      const signingKey = key.getPublicKey();
      callback(null, signingKey);
    }
  });
};

module.exports = (options, { strapi }) => {
  return async (ctx, next) => {
    const token = get(ctx.request.headers, 'authorization', '').replace('Bearer ', '');
    console.log('Token recibido:', token); // Depuración

    if (!token) {
      console.log('No token provided');
      return ctx.unauthorized('No token provided');
    }

    try {
      // Verifica el token usando la clave pública obtenida de JWKS
      const decoded = await new Promise((resolve, reject) => {
        jwt.verify(token, getKey, {
          audience: 'za265MeRdxMKuPqzdPSTL7lHL0yyg5bd',
          issuer: 'https://ciudadan.us.auth0.com/',
        }, (err, decoded) => {
          if (err) {
            console.error('Error verificando el token:', err);
            reject(err);
          } else {
            resolve(decoded);
          }
        });
      });

      ctx.state.user = decoded; // Guarda la información del usuario en ctx.state
      console.log('Usuario decodificado:', decoded); // Depuración
    } catch (err) {
      console.error('Error verificando el token:', err);
      return ctx.unauthorized('Invalid token');
    }

    await next();
  };
};
