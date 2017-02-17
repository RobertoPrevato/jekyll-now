ug.controller("profile", ['$scope', function (scope) {

  _.extend(scope, {

		profile: {
			name: "Derp",
			birthdate: "30/05/1986",
			description: "Lorem ipsum dolor sit amet consectetur...",
			pictures: [
				{
					url: "images/derp.png",
					thumbnailUrl: "images/derp.jpg",
					alt: "Derp"
				}
			]
		}

  });

}]);