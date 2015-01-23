(function(angular) {
  'use strict';

  var module = angular.module('saTooltip', []),
      extend = angular.extend;

  module.provider('$saTooltip', function() {
    // Default template for tooltips.
    var defaultTemplateUrl = 'template/sa-tooltip.html';
    this.setDefaultTemplateUrl = function(templateUrl) {
      defaultTemplateUrl = templateUrl;
    };

    var defaultTetherOptions = {
      attachment: 'top middle',
      targetAttachment: 'bottom middle'
    };
    this.setDefaultTetherOptions = function(options) {
      extend(defaultTetherOptions, options);
    };

    this.$get = function($rootScope, $animate, $compile, $templateCache, $http, $timeout) {
      return function(options) {
        options = options || {};
        options = extend({ templateUrl: defaultTemplateUrl }, options);
        options.tether = extend({}, defaultTetherOptions, options.tether || {});

        var template = options.template || ( $templateCache.get(options.templateUrl) ? $templateCache.get(options.templateUrl)[1] : undefined ),
            scope    = options.scope || $rootScope.$new(),
            target   = options.target,
            tether, elem;

        if(!template && options.templateUrl) {
          $http.get(options.templateUrl, { cache: $templateCache }).then(function(resp) {
            template = resp.data;
          });
        }

        /**
         * Attach a tether to the tooltip and the target element.
         */
        function attachTether() {
          tether = new Tether(extend({
            element: elem,
            target: target
          }, options.tether));
        }

        /**
         * Detach the tether.
         */
        function detachTether() {
          if (tether) {
            tether.destroy();
            tether = undefined;
            angular.element(elem).scope().$destroy();
            angular.element(elem).remove();
          }
        }

        /**
         * Open the tooltip
         */
        function open() {
          var tetherScope = scope.$new();
          elem = $compile(template)(tetherScope)[0];
          if(!$rootScope.$$phase) {
            tetherScope.$digest();
          }
          result.elem = elem;
          $animate.enter(elem, null, target);
          attachTether();
          tether.position();
          return elem;
        }

        /**
         * Close the tooltip
         */
        function close() {
          delete result.elem;
          $animate.leave(elem);
          detachTether();
        }

        // Close the tooltip when the scope is destroyed.
        scope.$on('$destroy', close);

        var result = {
          open: open,
          close: close
        };

        return result;
      };
    };
  });

  module.service('$saTooltipInteractionSetup', function($timeout) {
    return {
      setup: function(tooltip, scope, elem) {
        var isOpen = false;
        var wasClicked = false;
        var isHoveringOverTooltip = false;
        var t;

        var openCallback = angular.noop;
        var closeCallback = angular.noop;

        var open = function() {
          if (!isOpen) {
            scope.$apply(function() {
              isOpen = true;
              openCallback();
              var e = tooltip.open();
              angular.element(e).hover(function() {
                isHoveringOverTooltip = true;
                if (t) {
                  $timeout.cancel(t);
                }
              }, function() {
                isHoveringOverTooltip = false;

                t = $timeout(function() {
                  closeCallback();
                  close();
                }, 300);
              });
            });
          }
        };

        var close = function() {
          if (isOpen && !wasClicked) {
            scope.$apply(function() {
              tooltip.close();
              isOpen = false;
            });
          }
        };

        elem.hover(function() {
          if (t) {
            $timeout.cancel(t);
          }
          open();
        }, function() {
          t = $timeout(function() {
            if (!isHoveringOverTooltip) {
              close();
            }
          }, 300);
        });

        elem.on('touchend', function(e) {
          /* prevent delay and simulated mouse events */
          e.preventDefault();
          /* trigger the actual behavior we bound to the 'click' event */
          e.target.click();
        });

        elem.click(function() {
          // if it's already open and it hasn't been locked open then lock it open
          if (isOpen && !wasClicked) {
            wasClicked = true;
          } else if (isOpen && wasClicked) {
            wasClicked = false;
            close();
          } else {
            wasClicked = true;
            open();
          }
        });

        return {
          setCallbacks: function(oc, cc) {
            if (!_.isUndefined(oc)) {
              openCallback = oc;
            }

            if (!_.isUndefined(cc)) {
              closeCallback = cc;
            }
          },
          isOpen: function() {
            return isOpen;
          },
          wasClicked: function() {
            return wasClicked;
          }
        };

      }
    };
  });

  module.provider('$saTooltipDirective', function() {

    /**
     * Returns a factory function for building a directive for tooltips.
     *
     * @param {String} name - The name of the directive.
     */
    this.$get = function($saTooltip) {
      return function(name, options) {
        return {
          restrict: 'EA',
          scope: {
            content:  '@' + name,
            tether:  '=?' + name + 'Tether'
          },
          link: function(scope, elem, attrs) {
            var tooltip = $saTooltip(extend({
              target: elem,
              scope: scope
            }, options, { tether: scope.tether }));

            /**
             * Toggle the tooltip.
             */
            elem.hover(function() {
              scope.$apply(tooltip.open);
            }, function() {
              scope.$apply(tooltip.close);
            });
          }
        };
      };
    };
  });

  module.directive('saTooltip', function($saTooltipDirective) {
    return $saTooltipDirective('saTooltip');
  });

  module.run(function($templateCache) {
    $templateCache.put('template/sa-tooltip.html', '<div class="tooltip">{{content}}</div>');
  });

})(angular);
