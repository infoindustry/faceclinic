'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = require("crypto");
/**
 *
 * @param {Buffer} buffer
 * @returns {string}
 */
function getBufferHash(buffer) {
    // creating hash
    const sha = crypto_1.createHash('sha1');
    sha.update(buffer);
    return sha.digest('hex');
}
exports.getBufferHash = getBufferHash;
//# sourceMappingURL=getBufferHash.js.map