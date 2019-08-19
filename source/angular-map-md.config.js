(function () {
  'use strict';
  angular.module('angular-map-md')
    .constant('mapMdApiSettings', {
      mapMdApiKey: '',
      reverseGeocodeUrl: 'https://map.md/api/companies/webmap/near',
      forwardGeocodeUrl: 'https://map.md/api/companies/webmap/search',
      getStreetUrl: 'https://map.md/api/companies/webmap/get_street',
    })
})();
