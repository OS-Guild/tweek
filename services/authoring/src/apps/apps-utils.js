const crypto = require('crypto');
const { promisify } = require('util');

const pbkdf2 = promisify(crypto.pbkdf2);

async function generateHash(secret, salt) {
  return await pbkdf2(secret, salt, 100, 512, 'sha512');
}

module.exports = {
  generateHash,
};
