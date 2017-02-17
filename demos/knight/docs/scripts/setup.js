//common libraries setup
+function () {
	
	//UnderscoreJS template settings
	_.templateSettings = {
		escape: /@(.+?)@/g,//override to use @ signs, that makes is easier to generate Angular templates dynamically (with Knockout this can be used /\{\{(.+?)\}\}/g)
		evaluate: /\{%(.+?)%\}/g,
		interpolate: /\{#(.+?)#\}/g
	};
	
}();