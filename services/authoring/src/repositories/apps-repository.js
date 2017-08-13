const R = require('ramda');

class AppsRepository {
  constructor(gitTransactionManager) {
    this._gitTransactionManager = gitTransactionManager;
  }

  getApp(appId) {
    return this.apps[appId];
  }

  async refresh() {
    await this._gitTransactionManager.with(async (repo) => {
      const externalAppsFiles = await repo.listFiles('external_apps');
      this.apps = (await Promise.all(
        externalAppsFiles.map(async appFile => ({
          name: appFile.split('.')[0],
          data: JSON.parse(await repo.readFile(`external_apps/${appFile}`)),
        })),
      )).reduce((acc, { name, data }) => R.assoc(name, data)(acc), {});
    });
  }

  async saveApp(appId, manifest, author) {
    await this._gitTransactionManager.write(async (repo) => {
      await repo.updateFile(`external_apps/${appId}.json`, JSON.stringify(manifest, null, 4));
      await repo.commitAndPush(`created app ${appId}`, author);
      await this.refresh();
    });
  }
}

module.exports = AppsRepository;
