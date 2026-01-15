// ajv2020-factory.cjs
const Ajv2020 = require("ajv/dist/2020");

module.exports = function (opts) {
  // opts は ajv-cli から渡ってくる
  return new Ajv2020(opts);
};
