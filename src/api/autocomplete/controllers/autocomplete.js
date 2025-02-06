const fetch = require("node-fetch");

module.exports = {
  async autocomplete(ctx) {
    try {
      const { input } = ctx.query;
      const API_KEY = process.env.GOOGLE_API_KEY; // Guarda tu clave en .env
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${input}&key=${API_KEY}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error("Error en la API de Google");

      const data = await response.json();
      return data;
    } catch (error) {
      ctx.response.status = 500;
      return { error: "No se pudo obtener las sugerencias" };
    }
  },
};
