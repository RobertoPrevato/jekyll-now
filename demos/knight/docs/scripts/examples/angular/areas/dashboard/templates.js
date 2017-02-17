//
//Knight generated templates file
//
"use strict";
(function () {
	var o = {
		'dashboard-two': '<h3>Article Two</h3> <p>{{otherContent}}</p>',
		'dashboard': '<h2>Dashboard</h2> <!-- part one --> <div ng-include ng-controller="dashboard-one" src="\'dashboard-one\'"></div> <!-- part two --> <div ng-include ng-controller="dashboard-two" src="\'dashboard-two\'"></div> <!-- part three --> <div ng-include ng-controller="dashboard-three" src="\'dashboard-three\'"></div>',
		'dashboard-one': '<h3>Article One</h3> <p>{{content}}</p>',
		'dashboard-three': '<h3>Article Three</h3> <p>{{yetAnotherContent}}</p>'
	};
	var f = function(a) {
		var x;
		for (x in o) {
			a.put(x, o[x]);
		}
	};
	f.$inject = ['$templateCache'];
	ug.run(f);
})();