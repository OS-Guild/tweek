import jwt from 'jsonwebtoken';
import nconf from 'nconf';
import fs from 'fs';
import {promisify} from 'bluebird';

const jwtSign = promisify(jwt.sign);
const readFile = promisify(fs.readFile);

const jwtOptions = {
  algorithm: 'RS256',
  issuer: 'tweek',
  expiresIn: "5m"
};

async function getAuthKey() {
  const keyPath = nconf.get('GIT_PRIVATE_KEY_PATH');
  if (!keyPath || !fs.existsSync(keyPath)) {
    console.warn('private key not found');
    return undefined;
  }
  return await readFile(keyPath);
}

let authKeyPromise;

export default async function generateToken() {
  authKeyPromise = authKeyPromise || getAuthKey();
  try {
    const authKey = await authKeyPromise;
    if (!authKey) return undefined;
    return await jwtSign({}, authKey, jwtOptions);
  } catch (err) {
    console.error('failed to generate token', err);
  }
}
