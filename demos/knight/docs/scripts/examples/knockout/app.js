+function () {



	var app = window.app = {

		template: ko.o(""),
		panel: ko.o(void(0)),
		models: {},

		routes: {
			"/": {
				get: function (e, params) {
					app.disposePanel();
					var newPanel = new app.models.Dashboard(params);
					app.template("dashboard").panel(newPanel);
				}
			},
			"/dashboard": {
				get: function (e, params) {
					app.disposePanel();
					var newPanel = new app.models.Dashboard(params);
					app.template("dashboard").panel(newPanel);
				}
			},
			"/profile": {
				get: function (e, params) {
					app.disposePanel();
					var newPanel = new app.models.Profile(params);
					app.template("profile").panel(newPanel);
				}
			}
		},

		disposePanel: function () {
			var currentPanel = this.panel();
			if (currentPanel) {
				if (currentPanel.dispose)
					currentPanel.dispose();
				this.panel(void(0));
			}
			return this;
		}

	};

}();