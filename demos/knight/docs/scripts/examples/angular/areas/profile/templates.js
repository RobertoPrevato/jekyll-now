//
//Knight generated templates file
//
"use strict";
(function () {
	var o = {
		'profile-pictures': '<ul class="images-list"> <li ng-repeat="pic in profile.pictures"> <img ng-src="{{pic.thumbnailUrl}}" alt="{{pic.alt}}" width="200" height="200" /> </li> </ul>',
		'profile-texts': '<div> <h3>Texts:</h3> <p>{{profile.description}}</p> </div>',
		'profile': '<h2>Profile</h2> <dl> <dt>Profile name:</dt> <dd>{{profile.name}}</dd> <dt>Birthdate:</dt> <dd>{{profile.birthdate}}</dd> </dl> <!-- pictures --> <div id="profile-pictures" ng-include ng-controller="profile-pictures" src="\'profile-pictures\'"></div> <!-- texts --> <div id="profile-texts" ng-include ng-controller="profile-texts" src="\'profile-texts\'"></div>'
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