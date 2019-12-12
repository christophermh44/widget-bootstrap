(function({finalResolve, self, globals}) {

  /**
   * Enregistrement des attributs appliqués au script
   * @returns {Promise<any>} Promesse de chargement des composants VueJS
   */
  function loadAttributes() {
    return new Promise((resolve) => {
      globals.attributes = {};
      Object.values(self.attributes).forEach(attr => {
        globals.attributes[attr.name] = attr.value;
      });
      resolve();
    });
  }

  loadAttributes().then(finalResolve);

})(api);
