module.exports = {
    routes: [
      {
        method: "GET",
        path: "/autocomplete",
        handler: "autocomplete.autocomplete",
        config: {
          auth: false, // Puedes protegerlo con auth si lo necesitas
        },
      },
    ],
  };
  