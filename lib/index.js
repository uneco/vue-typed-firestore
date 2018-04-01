"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
const streamManager = require("./stream-manager");
const dataLink = require("./data-link");
__export(require("./model-factory"));
require("./vue");
exports.default = {
    link: dataLink.VuePlugin,
    stream: streamManager.VuePlugin,
};
//# sourceMappingURL=index.js.map