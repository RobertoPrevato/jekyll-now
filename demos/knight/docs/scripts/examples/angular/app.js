(function () {
  var ug = window.ug = angular.module('ug', ['ngRoute'])
	.config(["$routeProvider", function (a) {
		//routes
    _.each([
      {
        r: "/dashboard",
        u: "dashboard",
        c: "dashboard"
      },
      {
        r: "/profile",
        u: "profile",
        c: "profile"
      }
    ], function (o) {
      a.when(o.r, {
        templateUrl: o.u,
        controller: o.c
      });

			a.otherwise({ redirectTo: '/dashboard' });
    });
	}]).run();
  
})();