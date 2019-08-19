(function () {
  'use strict';
  angular.module('angular-map-md').provider('geoMapSettings', function (mapMdApiSettings) {

    var options = {
      deliveryAreaCoordinates: mapMdApiSettings.deliveryAreaCoordinates,
      chisinauBounds: [
        [28.75362396240234, 47.07152483385375],
        [28.91395568847656, 46.96080755772455]
        ],
      mapLocationPrefix: "Chisinau",
      chisinauCitySlugs: ['chisinau', 'chishinau', 'kishinyov', 'kishinev', 'kishineu'],
      validCitySlugs: ['chisinau', 'chishinau', 'moldova', 'durlesti',
          'durlesti', 'codru', 'dumbrava', 'stauceni', 'ialoveni',
          'gratiesti', 'aeroport', 'bubuieci', 'colonita', 'bacioi', 'kishinyov',
          'kishinev', 'kishineu'],
      locationPrefixRus: "Кишинев Молдова",
      defaultCenterCoordinates: [28.8334021, 47.0210986],
    };
    this.setDeliveryAreaCoordinates=function(data){
        options.deliveryAreaCoordinates=data;
        return this;
    };
    this.setChisinauBounds=function(data){
        options.chisinauBoundsrder = data;
        return this;
    };
    this.setMapLocationPrefix=function(data){
        options.mapLocationPrefix = data;
        return this;
    };
    this.setDefaultCenterCoordinates=function(data){
        options.defaultCenterCoordinates = data;
        return this;
    };
    this.$get=[function(){
        return options;
    }];
  });
})();