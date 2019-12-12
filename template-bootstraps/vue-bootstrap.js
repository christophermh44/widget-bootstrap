(function({finalResolve, finalReject, template, configuration, loadStylesheet, loadScript, element, sequentialPromises, globals}) {

	/**
	 * Chargement des ressources de Vue
	 * @returns {Promise<any>} Promesse de chargement du template HTML
	 */
	function loadResources() {
		return new Promise((resolve, reject) => {
			sequentialPromises(
				['vue.min.js']
				.map(script => configuration.resources + '/template-bootstraps/' + template.name + '-resources/' + script)
				.map(loadScript)
			)
			.then(resolve)
			.catch(reject);
		});
	}
	
	/**
	 * Création du template HTML pour l'application VueJS
	 * <>
	 *   <app :configuration="configuration"></app>
	 * </>
	 * @returns {Promise<any>} Promesse de chargement du template HTML
	 */
	function initTemplate() {
        return new Promise((resolve) => {
            let appElement = document.createElement('app');
            appElement.setAttribute(':configuration', 'configuration');
            appElement.setAttribute(':globals', 'globals');
            const wrapper = document.querySelector(template.settings.wrapper);
            wrapper.appendChild(appElement);
            resolve(configuration);
        });
	}

	/**
	 * Chargement des composants VueJS
	 * @returns {Promise<any>} Promesse de chargement des composants VueJS
	 */
	function loadComponents() {
		return new Promise((resolve) => {
			sequentialPromises(
				template.settings.components
				.map(comp => loadScript(configuration.resources + '/vue-components/' + comp + 'Component.js'))
			)
			.then(() => {
				resolve(new Vue({
					el: template.settings.wrapper,
					data: {
						configuration: configuration,
						globals: globals
					}
				}));
			});
		})
	}

	loadResources().then(initTemplate).then(loadComponents).then(finalResolve);

})(api);