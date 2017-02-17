$(document).ready(function () {
  R("ready", ["app"], function (app) {
    //
    //TODO: integrate your localization logic; i.e. how the server is returning the page language?
    //
    I.setLocale("en");
    var el = document.getElementById("content");
    el.setAttribute("data-bind", "template: 'view'");
    ko.bind(app, el);
  });
});
