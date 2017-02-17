//
//Knight generated templates file
//
"use strict";
if (!ko.templates) ko.templates = {};
(function (templates) {
	var o = {
		'profile-pictures': '<ul class="images-list" data-bind="foreach: { data: profile.pictures }"> <li> <img data-bind="attr: { src: thumbnailUrl, alt: alt }" width="200" height="200" /> </li> </ul>',
		'profile-texts': '<div> <h3>Texts:</h3> <p data-bind="text: profile.description"></p> </div>',
		'profile': '<h2>Profile</h2> <dl> <dt>Profile name:</dt> <dd data-bind="text: profile.name"></dd> <dt>Birthdate:</dt> <dd data-bind="text: profile.birthdate"></dd> </dl> <!-- pictures --> <div id="profile-pictures" data-bind="template: \'profile-pictures\'"></div> <!-- texts --> <div id="profile-texts" data-bind="template: \'profile-texts\'"></div>'
	};
	var x;
	for (x in o) {
		templates[x] = o[x];
	}
})(ko.templates);