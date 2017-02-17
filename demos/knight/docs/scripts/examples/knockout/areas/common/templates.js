//
//Knight generated templates file
//
"use strict";
if (!ko.templates) ko.templates = {};
(function (templates) {
	var o = {
		'view': '<!--ko if: template() && panel()--> <div data-bind="template: { name: template(), data: panel() }"></div> <!--/ko-->'
	};
	var x;
	for (x in o) {
		templates[x] = o[x];
	}
})(ko.templates);