import Ember             from 'ember';
import layout            from './template';
import { task, timeout } from 'ember-concurrency';

const {
  getOwner,
  computed,
  inject: {service},
  Component,
  get,
  testing
} = Ember;

let taskRunCounter = 0;

const MAX_COUNT_IN_TESTING = 10;

export default Component.extend({
  layout: layout,

  ajax: service(),

  updateInterval   : testing ? 0 : 60000, // One Minute Default
  versionFileName  : "/VERSION.txt",
  updateMessage    : "This application has been updated from version {{oldVersion}} to {{newVersion}}. Please save any work, then refresh browser to see changes.",
  showReload       : true,
  reloadButtonText : "Reload",
  lastVersion      : null,
  version          : null,

  url: computed('versionFileName', function () {
    const config          = getOwner(this).resolveRegistration('config:environment');
    const versionFileName = get(config, 'newVersion.fileName') || this.get('versionFileName');
    const baseUrl         = config.rootURL || config.baseURL;

    if (!config || baseUrl === '/') {
      return versionFileName;
    }

    return baseUrl + versionFileName;
  }).readOnly(),

  init () {
    this._super(...arguments);

    if (testing) { taskRunCounter = 0; }

    this.get('updateVersion').perform();
  },

  updateVersion: task(function * () {
    const url = this.get('url');

    yield this.get('ajax')
      .request(url, { cache: false, dataType: 'text' })
      .then(res => {
        const currentVersion = this.get('version');
        const newVersion     = res && res.trim();

        if (currentVersion && newVersion !== currentVersion) {
          const message = this.get('updateMessage')
            .replace('{{oldVersion}}', currentVersion)
            .replace('{{newVersion}}', newVersion);

          this.setProperties({
            message,
            lastVersion: currentVersion
          });
        }

        this.set('version', newVersion);
      });

    const updateInterval = this.get('updateInterval');
    yield timeout(updateInterval);

    if (testing && ++taskRunCounter > MAX_COUNT_IN_TESTING) { return; }

    this.get('updateVersion').perform();
  }),


  actions: {
    reload() {
      window.location.reload(true);
    },

    close() {
      this.set('message', undefined);
    }
  }
});
