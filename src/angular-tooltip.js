(function(angular) {
  'use strict';

  var module = angular.module('ngTooltip', ['ng']),
      extend = angular.extend;

  module.provider('$tooltip', function() {
    // Default template for tooltips.
    var defaultTemplateUrl = 'template/ng-tooltip.html';
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
            elem.remove();
            angular.element(elem).scope().$destroy();
          }
        }

        /**
         * Open the tooltip
         */
        function open() {
          elem = $compile(template)(scope.$new())[0];
          result.elem = elem;
          $animate.enter(elem, null, target);
          attachTether();
          $timeout(function() { tether.position(); }, 1);
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

        var result =  {
          open: open,
          close: close
        };

        return result;
      };
    };
  });

  module.provider('$tooltipDirective', function() {

    /**
     * Returns a factory function for building a directive for tooltips.
     *
     * @param {String} name - The name of the directive.
     */
    this.$get = function($tooltip) {
      return function(name, options) {
        return {
          restrict: 'EA',
          scope: {
            content:  '@' + name,
            tether:  '=?' + name + 'Tether'
          },
          link: function(scope, elem, attrs) {
            var tooltip = $tooltip(extend({
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

  module.directive('ngTooltip', function($tooltipDirective) {
    return $tooltipDirective('ngTooltip');
  });

  module.run(function($templateCache) {
    $templateCache.put('template/ng-tooltip.html', '<div class="tooltip">{{content}}</div>');
  });

})(angular);
