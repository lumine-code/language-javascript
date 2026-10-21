let registration;

exports.activate = function () {
  registration?.dispose();
  registration = lumine.grammars.registerSyntaxModule(require.resolve("./injections"));
};

exports.deactivate = function () {
  registration?.dispose();
  registration = null;
};
