"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var data_link_1 = require("./data-link");
exports.Reference = data_link_1.Reference;
function ModelFactory(mapper) {
    return {
        types: {},
        create() {
            return { blank: true };
        },
        placeholder() {
            return { blank: true };
        },
        fromDocument(source) {
            return Object.assign({ blank: false, id: source.id }, source.data());
        },
    };
}
exports.ModelFactory = ModelFactory;
//# sourceMappingURL=model-factory.js.map