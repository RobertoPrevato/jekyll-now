_.extend(app.models, {

	Profile: function () {
		//constructor

		//set dummy data
		this.profile = {
			name: ko.o("Derp"),
			birthdate: ko.o("30/05/86"),
			description: ko.o("Lorem ipsum dolor sit amet consectetur..."),
			pictures: ko.o([
				{
					url: "images/derp.png",
					thumbnailUrl: "images/derp.jpg",
					alt: "Derp"
				}
			])
		};
	}

});
