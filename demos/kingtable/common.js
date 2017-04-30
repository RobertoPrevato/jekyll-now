(function () {
  var a = document.getElementById("theme");
  a.addEventListener("change", function (e) {
    var v = a.value;
    document.body.className = v;
  }, true);
})();
