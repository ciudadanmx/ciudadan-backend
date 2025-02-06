module.exports = {
  routes: [
    {
      method: "POST",
      path: "/conductores-cercanos",
      handler: "conductores-cercanos.conductoresCercanos",
      config: {
        policies: [],
        auth: false, // Cambia a true si necesitas autenticación
      },
    },
  ],
};
