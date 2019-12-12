(function(self) {
  let globals = {};

  /**
   * Helper : appel séquentiel de promesses
   */
  function sequentialPromises(promises) {
    return new Promise((resolve, reject) => {
      const values = [];
      let i = 0;

      const save = value => values.push(value);
      const iterate = () => i++;

      const loop = () => {
        if (i < promises.length) {
          const entry = promises[i];
          const promise = typeof entry === "function" ? entry() : entry;

          return promise
            .then(save)
            .then(iterate)
            .then(() => setTimeout(loop, 0))
            .catch(e => {
              reject(e);
              return Promise.reject(e);
            });
        } else {
          return resolve(values);
        }
      };
      loop();
    });
  }

  /**
   * Chargement de la configuration
   * @returns {Promise<any>} Promesse de chargement de la configuration
   */
  function loadConfiguration() {
    return new Promise((resolve, reject) => {
      if (self) {
        let confPath = self.getAttribute('data-conf');
        if (confPath) {
          fetch(confPath, {
            mode: 'cors'
          })
          .then(r => r.json())
          .then(resolve)
          .catch(e => {
            console.error(e);
            reject('Error while loading configuration');
          });
        } else {
          resolve(null);
        }
      } else {
        reject('Configuration not found');
      }
    });
  }

  /**
   * Chargement d'un script JS
   * @param path URL du script JS
   * @returns {Promise<any>} Promesse de chargement du script JS
   */
  function loadScript(path) {
    return new Promise((resolve, reject) => {
      let scriptElement = document.createElement('script');
      scriptElement.setAttribute('crossorigin', 'anonymous');
      scriptElement.addEventListener('load', resolve);
      scriptElement.addEventListener('error', e => {
        reject('Cannot load script "' + e.target.src + '"');
      });
      scriptElement.src = path;
      document.body.appendChild(scriptElement);
    });
  }

  /**
   * Chargement d'une feuille de style CSS
   * @param path URL de la feuille de style
   * @param media Attribut média à définir (par défaut "all")
   * @returns {Promise<any>} Promesse de chargement de la feuille de style
   */
  function loadStylesheet(path, media = 'all') {
    return new Promise((resolve, reject) => {
      let linkElement = document.createElement('link');
      linkElement.setAttribute('crossorigin', 'anonymous');
      linkElement.addEventListener('load', resolve);
      linkElement.addEventListener('error', e => {
        reject('Cannot load stylesheet "' + e.target.src + '"');
      });
      linkElement.rel = 'stylesheet';
      linkElement.href = path;
      linkElement.media = media;
      document.head.appendChild(linkElement);
    });
  }

  /**
   * Charge la liste des feuilles de styles déclarées dans la configuration
   * @param configuration Données de paramétrage de l'application
   * @param step Étape de chargement
   * @returns {Promise<any>} Promesse de chargement des feuilles de styles
   */
  function loadDeclaredStylesheets(configuration, step) {
    return new Promise((resolve, reject) => {
      if (configuration[step] && configuration[step].css) {
        sequentialPromises(configuration[step].css.map(sheet => {
          if (typeof sheet === typeof '') {
            return loadStylesheet(sheet);
          } else if (typeof sheet === typeof {}) {
            return loadStylesheet(sheet.href, sheet.media);
          } else {
            return null;
          }
        }))
        .then(resolve)
        .catch(reject);
      } else {
        resolve();
      }
    });
  }

  /**
   * Charge la liste des scripts déclarés dans la configuration
   * @param configuration Données de paramétrage de l'application
   * @param step Étape de chargement
   * @returns {Promise<any>} Promesse de chargement des feuilles de styles
   */
  function loadDeclaredScripts(configuration, step) {
    return new Promise((resolve, reject) => {
      if (configuration[step] && configuration[step].js) {
        sequentialPromises(configuration[step].js.map(script => {
          if (/^(https?:\/\/|\/\/)/.test(script)) {
            return loadScript(script);
          } else {
            return loadScript(configuration.resources + '/' + script);
          }
        }))
        .then(resolve)
        .catch(reject);
      } else {
        resolve();
      }
    });
  }

  /**
   * Chargement des librairies du projet
   * @param configuration Données de paramétrage de l'application
   * @param step "pre" ou "post" (étape de chargement des ressources)
   * @returns {Promise<any>} Promesse de chargement des ressources
   */
  function loadResources(configuration, step) {
    return new Promise((resolve, reject) => {
      Promise.all([
        loadDeclaredStylesheets(configuration, step),
        loadDeclaredScripts(configuration, step)
      ]).then(() => {
        resolve(configuration);
      }).catch(e => {
        console.error(e);
        reject('Cannot load resources');
      });
    });
  }

  /**
   * Chargement des ressources nécessaires avant le chargement des bootstraps
   * @param configuration Données de paramétrage de l'application
   * @returns {Promise<any>} Promesse de chargement des ressources
   */
  function loadPre(configuration) {
    return loadResources(configuration, 'pre');
  }

  /**
   * Chargement des ressources nécessaires après le chargement des bootstraps
   * @param configuration Données de paramétrage de l'application
   * @returns {Promise<any>} Promesse de chargement des ressources
   */
  function loadPost(configuration) {
    return loadResources(configuration, 'post');
  }

  /**
   * Chargement d'un modèle de l'application
   * @param template Modèle de l'application
   * @param configuration Données de paramétrage de l'application
   * @returns {Promise<any>} Promesse de chargement des ressources
   */
  function loadBootstrap(template, configuration) {
    return new Promise((resolve, reject) => {
      fetch(configuration.resources + '/template-bootstraps/' + template.name + '-bootstrap.js')
      .then(r => r.text())
      .then(body => {
        const templateFunc = new Function('api', 'return ' + body);
        templateFunc({
          finalResolve: () => {
            resolve(configuration);
          },
          finalReject: (e) => {
            reject(e);
          },
          template,
          configuration,
          loadStylesheet,
          loadScript,
          sequentialPromises,
          self,
          globals
        });
      })
      .catch(e => {
        console.error(e);
        reject('Unable to load template');
      });
    });
  }

  /**
   * Chargement des modèles d'application
   * @param configuration Données de paramétrage de l'application
   * @returns {Promise<any>} Promesse de fin de chargement
   */
  function loadTemplates(configuration) {
    return new Promise((resolve, reject) => {
      sequentialPromises(
        configuration.templates
        .map(template => loadBootstrap(template, configuration))
      ).then(() => {
        resolve(configuration);
      });
    });
  }

  /**
   * Finalisation
   */
  function finish() {
    console.info('Widget loaded!');
  }

  /**
   * Lancement de l'application
   */
  window.addEventListener('load', () => {
    loadConfiguration().then(loadPre).then(loadTemplates).then(loadPost).then(finish);
  });

})(document.currentScript);
