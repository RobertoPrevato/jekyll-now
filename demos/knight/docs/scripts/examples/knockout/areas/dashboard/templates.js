//
//Knight generated templates file
//
"use strict";
if (!ko.templates) ko.templates = {};
(function (templates) {
	var o = {
		'dashboard': '<h2>Dashboard</h2> <!-- part one --> <div data-bind="template: { name: \'dashboard-part\', data: partOne }"></div> <!-- part two --> <div data-bind="template: { name: \'dashboard-part\', data: partTwo }"></div>',
		'dashboard-part': '<h3 data-bind="text: title"></h3> <p data-bind="text: content"></p>'
	};
	var x;
	for (x in o) {
		templates[x] = o[x];
	}
})(ko.templates);