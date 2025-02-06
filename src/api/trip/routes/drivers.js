module.exports = {
    routes: [
      {
        method: "POST",
        path: "/find-nearby-drivers",
        handler: "driver.findNearbyDrivers",
        config: {
          auth: false, // Cambiar a true si necesitas autenticación
        },
      },
    ],
  };
  