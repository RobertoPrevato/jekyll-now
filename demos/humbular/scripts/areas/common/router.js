//
// Application router: load this file when the app.routes have been defined.
// for more information about Simrou, refer to the official GitHub repository https://github.com/buero-fuer-ideen/Simrou
R("router", ["app"], function (app) {

  var router = new Simrou(app.routes);
  // Start the engine!
  router.start('/');

  return router;
});
