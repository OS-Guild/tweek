import path from 'path';
import http from 'http';
import express from 'express';
import socketio from 'socket.io';
import nconf from 'nconf';
import session from 'express-session';
import Promise from 'bluebird';
import bodyParser from 'body-parser';
import Rx from 'rxjs';
import serverRoutes from './serverRoutes';
import GitRepository from './repositories/git-repository';
import Transactor from './utils/transactor';
import KeysRepository from './repositories/keys-repository';
import TagsRepository from './repositories/tags-repository';
import GitContinuousUpdater from './repositories/git-continuous-updater';
import searchIndex from './searchIndex';
import * as Registration from './api/registration';

const crypto = require('crypto');
const passport = require('passport');
const selectAuthenticationProviders = require('./auth/providerSelector')
  .selectAuthenticationProviders;

nconf.argv().env().defaults({
  PORT: 3001,
  GIT_CLONE_TIMEOUT_IN_MINUTES: 1,
  TWEEK_API_HOSTNAME: 'https://api.playground.tweek.host',
});
nconf.required(['GIT_URL', 'GIT_USER']);

const PORT = nconf.get('PORT');
const gitCloneTimeoutInMinutes = nconf.get('GIT_CLONE_TIMEOUT_IN_MINUTES');
const tweekApiHostname = nconf.get('TWEEK_API_HOSTNAME');

const toFullPath = x => path.normalize(path.isAbsolute(x) ? x : `${process.cwd()}/${x}`);

const gitRepostoryConfig = {
  url: nconf.get('GIT_URL'),
  username: nconf.get('GIT_USER'),
  password: nconf.get('GIT_PASSWORD'),
  localPath: `${process.cwd()}/rulesRepository`,
  publicKey: toFullPath(nconf.get('GIT_PUBLIC_KEY_PATH') || ''),
  privateKey: toFullPath(nconf.get('GIT_PRIVATE_KEY_PATH') || ''),
};

const gitRepoCreationPromise = GitRepository.create(gitRepostoryConfig);
const gitRepoCreationPromiseWithTimeout = new Promise((resolve) => {
  gitRepoCreationPromise.then(() => resolve());
})
  .timeout(gitCloneTimeoutInMinutes * 60 * 1000)
  .catch(Promise.TimeoutError, () => {
    throw `git repository clonning timeout after ${gitCloneTimeoutInMinutes} minutes`;
  });

const gitTransactionManager = new Transactor(gitRepoCreationPromise, gitRepo => gitRepo.reset());
const keysRepository = new KeysRepository(gitTransactionManager);
const tagsRepository = new TagsRepository(gitTransactionManager);

GitContinuousUpdater.onUpdate(gitTransactionManager)
  .exhaustMap(_ =>
    Rx.Observable.defer(async () => searchIndex.refreshIndex(gitRepostoryConfig.localPath)),
  )
  .do(_ => console.log('index was refreshed'), err => console.log('error refreshing index', err))
  .retry()
  .map(Registration.notifyClients)
  .subscribe();

function addDirectoryTraversalProtection(server) {
  const DANGEROUS_PATH_PATTERN = /(?:^|[\\/])\.\.(?:[\\/]|$)/;
  server.use('*', (req, res, next) => {
    if (req.path.includes('\0') || DANGEROUS_PATH_PATTERN.test(req.path)) {
      return res.status(400).send({ error: 'Dangerous path' });
    }
    return next();
  });
}

function addAuthSupport(server) {
  server.use(passport.initialize());
  server.use(passport.session());

  const authProviders = selectAuthenticationProviders(server, nconf);
  server.use('/login', (req, res) => {
    res.send(authProviders.map(x => `<a href="${x.url}">login with ${x.name}</a>`).join('<br/>'));
  });

  server.use('*', (req, res, next) => {
    if (req.isAuthenticated() || req.path.startsWith('auth')) {
      return next();
    }
    if (req.originalUrl.startsWith('/api/')) {
      return res.sendStatus(403);
    }
    return res.redirect('/login');
  });
}

const startServer = () => {
  const app = express();
  const server = http.Server(app);

  app.use((req, res, next) => {
    console.log(req.method, req.originalUrl);
    next();
  });

  addDirectoryTraversalProtection(app);
  const cookieOptions = {
    secret: nconf.get('SESSION_COOKIE_SECRET_KEY') || crypto.randomBytes(20).toString('base64'),
    cookie: { httpOnly: true },
  };
  app.use(session(cookieOptions));
  if ((nconf.get('REQUIRE_AUTH') || '').toLowerCase() === 'true') {
    addAuthSupport(app);
  }
  app.use(bodyParser.json()); // for parsing application/json
  app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

  const io = socketio(server);
  io.on('connection', Registration.register);

  app.use('/api', serverRoutes({ tagsRepository, keysRepository, tweekApiHostname }));

  app.use(express.static(path.join(__dirname, 'build')));
  app.get('/*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
  });

  server.listen(PORT, () => console.log('Listening on port %d', server.address().port));
};

gitRepoCreationPromiseWithTimeout
  .then(() => console.log('indexing keys...'))
  .then(() => searchIndex.refreshIndex(gitRepostoryConfig.localPath))
  .then(() => console.log('starting tweek server'))
  .then(() => startServer())
  .catch((reason) => {
    console.error(reason);
    // process.exit();
  });
