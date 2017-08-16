import Locker = require('lock-queue');

export default class Transactor {
  _lock: Locker;
  constructor(private _contextPromise, private _cleanupAction) {
    // this._contextPromise = contextPromise;
    // this._cleanupAction = cleanupAction;

    this._lock = new Locker();
  }

  async read(readAction) {
    let context = await this._contextPromise;
    return await this._lock.run(() => readAction(context));
  }

  async with(action) {
    let context = await this._contextPromise;
    return await action(context);
  }

  async write(transactionAction) {
    let context = await this._contextPromise;
    return await this._lock.lock(async () => {
      try {
        return await transactionAction(context);
      } finally {
        if (this._cleanupAction) await this._cleanupAction(context);
      }
    });
  }
}
