(function () {
  'use strict';
  angular.module('angular-map-mad-api-example', [
    'ui.bootstrap',
    'angular-map-md'
  ]);
})();
(function () {
  'use strict';
  angular.module('angular-map-mad-api-example')
    .config(function (mapMdApiSettings) {
      mapMdApiSettings.mapMdApiKey = "";
    });

  angular.module('angular-map-mad-api-example').controller('AngularMapMdDemoController',
    function ($scope, $filter, mapMdGeoService, mapMdApiSettings) {
      $scope.savedApiKey = '';
      $scope.saveApiKey = function(){
        if ($scope.mapMdApiKey){
          mapMdApiSettings.mapMdApiKey = $scope.mapMdApiKey;
          $scope.savedApiKey = $scope.mapMdApiKey;
        }
      };

      $scope.doForwardGeocode = function(){
        if ($scope.forwardGeocodeString){
          mapMdGeoService.forwardGeocode($scope.forwardGeocodeString).then(function(geoData){
            console.log("Forward geocode for string: ", $scope.forwardGeocodeString);
            console.log(geoData);
            $scope.forwardGeocodeResult = geoData;
          })
        }
      }

      $scope.clearForwardGeocode = function(){
        $scope.forwardGeocodeString = null;
        $scope.forwardGeocodeResult = null;
      }

      $scope.doReverseGeocode = function(){
        if ($scope.reverseGeocodeLat && $scope.reverseGeocodeLong){
          mapMdGeoService.reverseGeocode([$scope.reverseGeocodeLat, $scope.reverseGeocodeLong]).then(
            function(geoData){
              console.log("Reverse geocode for coords: ", [$scope.reverseGeocodeLat, $scope.reverseGeocodeLong]);
              console.log(geoData);
              $scope.ReverseGeocodeResult = geoData;
            })
          }
      }

      $scope.clearReverseGeocode = function(){
        $scope.reverseGeocodeLat = null;
        $scope.reverseGeocodeLong = null;
        $scope.ReverseGeocodeResult = null;
      }

      $scope.$watch('suggestionsString', function(newValue, oldValue) {
        if (newValue !== oldValue){
          mapMdGeoService.getSuggestions(newValue, 20).then(function(suggestions){
            console.log("Suggestions for string: ", newValue);
            console.log(suggestions);
            $scope.AutocompleteSuggestions = suggestions;
          });
        }
      });

      $scope.clearSuggestions = function(){
        $scope.suggestionsString = null;
        $scope.AutocompleteSuggestions = [];
      }
    });
})();
