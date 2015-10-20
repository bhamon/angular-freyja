'use strict';

angular
.module('freyja')
.factory('freyja-api', [
	'$q', '$http', '$resource', 'freyja-sessionHandler',
	function($q, $http, $resource, p_sessionHandler) {
		function injectSessionToken() {
			if(p_sessionHandler.isAuthenticated()) {
				return 'Bearer ' + p_sessionHandler.getSession().token;
			}
		}

		function handleAuthentication(p_response) {
			if(p_response.status == 401) {
				return p_sessionHandler.recover()
				.then(function() {
					p_response.config.headers['Authorization'] = injectSessionToken();
					return $http(p_response.config)
					.then(function(p_response) {
						return p_response.data;
					});
				}, function(p_error) {
					console.error('Error caught in session recovery attempt');
					console.error(p_error);

					return $q.reject(p_response);
				});
			}

			return $q.reject(p_response);
		}

		return {
			createResource:function(p_url, p_paramDefaults, p_actions, p_options) {
				var actions = {};
				Object.keys(p_actions).forEach(function(p_name) {
					var config = angular.merge({}, p_actions[p_name]);
					if(config.requiresAuth) {
						config.withCredentials = true;
						config.headers = {
							'Authorization':injectSessionToken
						};
						config.interceptor =  {
							responseError:handleAuthentication
						};
					}

					actions[p_name] = config;
				});

				var resource = $resource(p_url, p_paramDefaults, actions, p_options);
				Object.keys(actions).concat(['get', 'save', 'query', 'remove', 'delete']).forEach(function(p_name) {
					var customAction = p_actions[p_name];
					if(!customAction) {
						delete resource[p_name];
						delete resource.prototype[p_name];
					} else if(!customAction.member) {
						delete resource.prototype[p_name];
					}
				});

				return resource;
			}
		};
	}
]);