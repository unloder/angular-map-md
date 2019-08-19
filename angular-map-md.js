(function () {
  'use strict';
  angular.module('angular-map-md', [
    'ui.bootstrap',
    'slug']);
})();

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

/**
 * Created by unloder on 4/18/18.
 */
(function () {
  'use strict';
  angular.module('angular-map-md').factory('AddressService', function ($location, geoMapSettings,
                                                                              growl, $q, mapMdGeoService,
                                                                              localStorageService
  ) {
    var addressTemplate = {
      addressString: '',
      city: '',
      country: '',
      street: '',
      number: '',
      latitude: null,
      longitude: null,
      geocoding_source: null, // point.md, user_input, google, custom_operator_entry (old), operator_backup_entry (new)
      geocoding_datetime: null,
      approximate_address: null,
      inside_delivery_area: null,
      comment: '',
    };
    var addressIsExact = function (address) {
      return !!(addressHasCoordinates(address) && addressHasNumber(address));
    };

    var testAddressIsSet = function(address){
      return !!(address !== undefined && address && (address.number || address.street));
    }

    var testAddressIsValid = function(address) {
      return !!(testAddressIsSet(address) && addressIsExact(address));
    };

    var testAddressIsAllowedForUse = function(address) {
      return testAddressIsValid(address) || (testAddressIsSet(address) && address.geocoding_source === 'operator_backup_entry');
    };
    
    var addressHasCoordinates = function (address) {
      return !!(testAddressIsSet(address) && (address.latitude && address.longitude))
    };

    var addressHasNumber = function (address) {
      return !!(testAddressIsSet(address) && address.number && address.street)
    };

    var isInsideDeliveryArea = function (address) {
        let result = false;
        if (address && address.latitude && address.longitude) {
          result = mapMdGeoService.isInDeliveryArea([address.longitude, address.latitude])
        }
        return result;
      };

    var addressesEqual = function (address1, address2) {
      let result = _.toString([address1.number, address1.street, address1.city, address1.latitude, address1.longitude]) ==
        _.toString([address2.number, address2.street, address2.city, address2.latitude, address2.longitude]);
      return result
    }

    var getAddressString = function(address){
       var addressArray = [];
       if (address.city){
         addressArray.push(address.city);
       }
       if (address.street){
         addressArray.push(address.street);
       }
       if (address.number){
         addressArray.push(address.number);
       }
       return addressArray.join(" ");
    };

    var updateFromObject = function (address, addressObject) {
      _.extend(address, addressObject);
      address.addressString = getAddressString(address);
      address.inside_delivery_area = isInsideDeliveryArea(address);
      address.addressString = getAddressString(address);
      return address;
    };


    function AddressContainer(address) {
      this.address = _.cloneDeep(addressTemplate);
      if (address) {
        updateFromObject(this.address, address);
        // _.merge(this.address, addressTemplate);
      }

      this.addressHasCoordinates = function () {
        return addressHasCoordinates(this.address);
      };
      this.isApproximate = function () {
        return !!this.address.approximate_address;
      };

      this.addressIsValid = function() {
        return testAddressIsValid(this.address);
      };

      this.testAddressIsSet = function() {
        return testAddressIsSet(this.address);
      };

      this.addressIsExact = function () {
        return addressIsExact(this.address);
      };

      this.addressHasNumber = function () {
        return addressHasNumber(this.address);
      };

      this.clearAddressCoordinates = function () {
        this.address.latitude = null;
        this.address.longitude = null;
        this.address.geocoding_source = null;
        this.address.approximate_address = null;
        this.address.comment = '';
        this.address.inside_delivery_area = null;
      };

      this.clearOrderCity = function () {
        this.address.city = null;
      };

      this.clearOrderCountry = function () {
        this.address.country = null;
      };

      this.clearPositionData = function () {
        this.clearAddressCoordinates();
        this.clearOrderCity();
        this.clearOrderCountry();
      };

      this.updatePositionData = function(geoData){
        if (geoData.coordinates){
          this.address.latitude = geoData.coordinates[1];
          this.address.longitude = geoData.coordinates[0];
        }else{
          this.clearAddressCoordinates();
        }
        if (geoData.city){
          this.address.city = geoData.city;
        }else{
          this.clearOrderCity();
        }
        if (geoData.country){
          this.address.country = geoData.country;
        }else{
          this.clearOrderCountry();
        }
        if (geoData.geocoding_source){
          this.address.geocoding_source = geoData.geocoding_source;
          this.address.geocoding_datetime = new Date();
        }
      };

      this.setApproximateFlag = function(comment){
        if (comment){
          this.address.comment = comment;
        }
        this.address.approximate_address = true;
      }

      this.getAddressString = function () {
        return getAddressString(this.address);
      };

      this.getAddressPrefix = function () {
        var addressPrefix = '';
        if (this.address.country) {
          addressPrefix += this.address.country;
        }
        if (this.address.city) {
          addressPrefix += " " + this.address.city;
        }
        return addressPrefix;
      };

      this.isInsideDeliveryArea = function () {
        return isInsideDeliveryArea(this.address);
      };

      this._getAddressCoordinates = function(){
        return this.address.longitude ? [this.address.longitude, this.address.latitude] : null;
      };

      this.updateFromGeoData = function (geoData) {
        this.address.street = null;
        this.address.number = null;
        this.address.addressString = null;
        if (geoData.street) {
          this.address.street = geoData.street;
        }
        if (geoData.buildingNumber) {
          this.address.number = geoData.buildingNumber;
        }
        this.address.addressString = this.getAddressString();
        this.updatePositionData(geoData);
        return this.address;
      };

      this.getAsGeoData = function () {
        return {
          'name': this.getAddressString(),
          'addressLine': this.getAddressPrefix() + " " + this.getAddressString(),
          'country': this.address.country,
          'city': this.address.city,
          'street': this.address.country,
          'buildingNumber': this.address.number,
          'coordinates': this._getAddressCoordinates(),
          'isPrecise': this.addressIsExact(),
          'isInsideDeliveryArea': this.isInsideDeliveryArea(),
          'geoResult': null,
          'geocoding_source': this.address.geocoding_source,
        };
      };


      this.updateFromObject = function (addressObject) {
        return updateFromObject(this.address, addressObject);
      };

      this.prepareAddress = function () {
        this.address.inside_delivery_area = this.isInsideDeliveryArea();
        this.address.addressString = this.getAddressString();
        return this.address;
      };

      this.clearAddressKeys = function () {
        this.address.street = null;
        this.address.number = null;
        this.address.addressString = null;
      };

      this.clearAddressFull = function () {
        this.address.street = null;
        this.address.number = null;
        this.address.addressString = null;
        this.clearPositionData();
      };

      return this;
    }

    return {
      AddressContainer: AddressContainer,
      addressHasCoordinates: addressHasCoordinates,
      addressIsExact: addressIsExact,
      testAddressIsValid: testAddressIsValid,
      addressesEqual: addressesEqual,
      testAddressIsAllowedForUse: testAddressIsAllowedForUse,
      isInsideDeliveryArea: isInsideDeliveryArea,
      testAddressIsSet: testAddressIsSet,
    }
  });
})();

// functions taken from ctrl+c from stackoverflow
(function () {
  'use strict';
  angular.module('angular-map-md').factory('GeoCalc', function () {
    // TODO: publish this as a fork to github and bower, there are very few libraries that do this for the browser side, wow

    function scalar(x, y) {
      return (x[0] * y[0] + x[1] * y[1]);
    }

    function det(x, y) {
      return (x[0] * y[1] - x[1] * y[0]);
    }

    function circular(l, i) {
      if ((i > 0) && (i <= l - 2)) {
        return ([i - 1, i + 1]);
      } else if (i == 0) {
        return ([l - 2, 1]);
      } else if (i == l - 1) {
        return ([l - 2, 1]);
      }
    }

    function unit(v) {
      var sr = Math.sqrt(scalar(v, v));
      return ([v[0] / sr, v[1] / sr]);
    }

    function vector(x, y) {
      return ([y[0] - x[0], y[1] - x[1]]);
    }

    function sum(a, b) {
      return ([a[0] + b[0], a[1] + b[1]]);
    }

    function vct_max(jad, point, p, saver) {
      var s;
      var tsd = scalar(vector(point, p), vector(point, p));
      saver[0] = vector(jad[0][0], jad[0][1]);
      var masafa = scalar(saver[0], saver[0]);
      var pid = 1;
      var vs = [0, 0];
      for (var i = 1; i < jad[0].length - 1; i++) {
        vs = sum(vs, saver[i - 1]);
        saver[saver.length] = vector(jad[0][i], jad[0][i + 1]);
        s = scalar(vs, vs);
        if (s > masafa) {
          pid = i;
          masafa = s;
        }
      }
      if (tsd <= masafa) {
        return pid;
      }
      else {
        return -1;
      }
    }

    function filter(jad, point, p, saver) {
      var b;
      var s;
      var tsd = scalar(vector(point, p), vector(point, jad[0][1]));
      saver[0] = vector(jad[0][0], jad[0][1]);
      var masafa = scalar(saver[0], saver[0]);
      var vs = [0, 0];
      for (var i = 1; i < jad[0].length - 1; i++) {
        vs = sum(vs, saver[i - 1]);
        saver[saver.length] = vector(jad[0][i], jad[0][i + 1]);
        s = scalar(vector(point, p), unit(vs));
        if (s > tsd) {
          tsd = s;
          if (scalar(vector(point, p), vs) <= scalar(vs, vs)) {
            b = true;
          } else {
            b = false;
          }
        }
      }
      return b;
    }

    function distance(jad, p) {
      var v = vector(jad, p);
      return scalar(v, v);
    }

    function sort_feacher(GeoJSON, p) {
      var sorted = new Array();
      for (var i = 0; i < GeoJSON.features.length; i++) {
        if (GeoJSON.features[i].geometry.type == 'Polygon') {
          sorted[i] = {
            distance: distance(GeoJSON.features[i].geometry.coordinates[0][0], p),
            id: i
          };
        } else {
          sorted[i] = {
            distance: distance(GeoJSON.features[i].geometry.coordinates[0][0][0], p),
            id: i
          };
        }
      }
      return sorted.sort(function (a, b) {
        return (a.distance - b.distance);
      });
    }

    function normal_ref_vector(jad, mix) {
      var n = unit(vector(jad[0][mix], jad[0][circular(jad[0].length, mix)[1]]));
      if (scalar([n[1], -n[0]], vector(jad[0][mix], jad[0][circular(jad[0].length, mix)[0]])) <= 0) {
        return ([n[1], -n[0]]);
      } else {
        return ([-n[1], n[0]]);
      }
    }

    function normal(v) {
      return [-v[1], v[0]];
    }

    function delation(v, k) {
      return [v[0] * k, v[1] * k]
    }

    function normal_vector(jad, i, mx, mix) {
      var d = vector(jad[0][mix], jad[0][circular(jad[0].length, mix)[1]]);
      var f = vector(jad[0][i], jad[0][circular(jad[0].length, i)[1]]);
      var cosine = scalar(d, f);
      var sine = det(d, f);
      var r = [(mx[0] * cosine - mx[1] * sine), (mx[0] * sine + mx[1] * cosine)];
      return r;
    }

    function normalv(jad, i, mx, mix) {
      var cosine = scalar(unit(mix), unit(i));
      var sine = det(unit(mix), unit(i));
      return ([(mx[0] * cosine - mx[1] * sine), (mx[0] * sine + mx[1] * cosine)]);
    }

    function sort_vector(jad, p, saver) {
      var srt = new Array();
      var v = new Array();
      var d = new Array();
      var viv;
      var bln = true;
      var u = 1000000;
      srt[0] = [u, -1];
      for (var i = 0; i < jad[0].length - 1; i++) {
        d = saver[i];
        v = vector(jad[0][i], p);
        if (scalar(v, d) >= 0) {
          var ti = (new Date()).getTime();
          if (scalar(v, d) <= scalar(d, d)) {
            var f = det(v, unit(d));
            if (Math.pow(f, 2) <= srt[0][0]) {
              srt[0][0] = Math.pow(f, 2);
              srt[0][1] = i;
            }
            bln = false;
          } else {
            bln = true;
          }
        } else {
          if (bln) {
            if (scalar(v, v) <= u) {
              u = scalar(v, v);
              viv = i;
            }
          }
        }
      }
      srt[1] = new Array();
      srt[1][0] = u;
      srt[1][1] = viv;
      return srt;
    }

    function getDistanceFromLatLonInKm(lat1,lon1,lat2,lon2) {
      var R = 6371; // Radius of the earth in km
      var dLat = deg2rad(lat2-lat1);  // deg2rad below
      var dLon = deg2rad(lon2-lon1);
      var a =
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon/2) * Math.sin(dLon/2)
        ;
      var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      var d = R * c; // Distance in km
      return d;
    }

    function deg2rad(deg) {
      return deg * (Math.PI/180)
    }

    function fixCoord(coord, pixels){
        // mb (pixels / Math.pow(2, _map.getZoom()) + 8 )
        return coord + (pixels / Math.pow(2, _map.getZoom()))
      }

    return {
      distanceInKm: function(coords1, coords2){
        return getDistanceFromLatLonInKm(coords1[1], coords1[0], coords2[1], coords2[0]);
      },

      pointInPolygon: function (p, jad) {
          var intern = false;
          var saver = new Array();
          var threshold = vct_max(jad, jad[0][0], p, saver);
          if (threshold != -1) {
            var mx = normal_ref_vector(jad, threshold);
            var ti = (new Date()).getTime();
            var tbs = sort_vector(jad, p, saver);
            if (tbs[0][0] <= tbs[1][0]) {
              if (tbs[0][0] <= tbs[1][0]) {
                if (scalar(normal_vector(jad, tbs[0][1], mx, threshold), vector(jad[0][tbs[0][1]], p)) <= 0) {
                  intern = true;
                }
              }
            }
            else {
              var v = vector(jad[0][tbs[1][1]], p);
              if (Math.abs(det(v, unit(saver[tbs[1][1]]))) > Math.abs(det(v, unit(saver[((tbs[1][1] > 0) ? tbs[1][1] - 1 : saver.length - 1)])))) {
                if (scalar(normal_vector(jad, tbs[1][1], mx, threshold), v) <= 0) {
                  intern = true;
                }
              }
              else {
                if (scalar(normal_vector(jad, circular(jad[0].length, tbs[1][1])[0], mx, threshold), v) <= 0) {
                  intern = true;
                }
              }
            }
          }
          return intern;
        },
      pointInFeature: function (p, GeoJSON) {
        var a;
        var sort = sort_feacher(GeoJSON, p);
        for (var i = 0; i < sort.length; i++) {
          if (GeoJSON.features[sort[i].id].geometry.type == 'Polygon') {
            if (this.pointInPolygon(p, GeoJSON.features[sort[i].id].geometry.coordinates)) {
              a = {
                id: sort[i].id,
                properties: GeoJSON.features[sort[i].id].properties,
                type: 'Polygon'
              };
              break;
            }
          } else {
            for (var j = 0; j < GeoJSON.features[sort[i].id].geometry.coordinates.length; j++) {
              if (this.pointInPolygon(p, GeoJSON.features[sort[i].id].geometry.coordinates[j])) {
                a = {
                  id: sort[i].id,
                  properties: GeoJSON.features[sort[i].id].properties,
                  type: 'MultiPolygon',
                  polygon: j
                };
                break;
              }
            }
            if (a) {
              break;
            }
          }
        }
        if (a) {
          return a;
        } else {
          return -1;
        }
      },
      fixCoord: fixCoord
    };
  }).service('stringCompare', function ($filter, growl) {
    // code snippet from overlord1234
    // https://stackoverflow.com/questions/10473745/compare-strings-javascript-return-of-likely

    function similarity(s1, s2) {
      var longer = s1;
      var shorter = s2;
      if (s1.length < s2.length) {
        longer = s2;
        shorter = s1;
      }
      var longerLength = longer.length;
      if (longerLength == 0) {
        return 1.0;
      }
      return (longerLength - _editDistance(longer, shorter)) / parseFloat(longerLength);
    }
    function _editDistance(s1, s2) {
      if (!(s1 && s2)){
        return 0;
      }
      try{
        s1 = s1.toLowerCase();
        s2 = s2.toLowerCase();

        var costs = new Array();
        for (var i = 0; i <= s1.length; i++) {
          var lastValue = i;
          for (var j = 0; j <= s2.length; j++) {
            if (i == 0)
              costs[j] = j;
            else {
              if (j > 0) {
                var newValue = costs[j - 1];
                if (s1.charAt(i - 1) != s2.charAt(j - 1))
                  newValue = Math.min(Math.min(newValue, lastValue),
                    costs[j]) + 1;
                costs[j - 1] = lastValue;
                lastValue = newValue;
              }
            }
          }
          if (i > 0)
            costs[s2.length] = lastValue;
        }
        return costs[s2.length];
      }catch(e) {
        return 0;
      }
    }
    return {
      similarity: similarity
    };
  });
})();

(function () {
  'use strict';
  angular.module('angular-map-md').provider('geoMapSettings', function (mapMdApiSettings) {

    var options = {
      deliveryAreaCoordinates: mapMdApiSettings.deliveryAreaCoordinates,
      deliveryAreaCoordinates: [],
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
/**
 * Created by unloder on 4/18/18.
 */
(function () {
  'use strict';
  angular.module('angular-map-md').service('GeoUtils', function () {
    function LockerClass() {
      this.isActive = false;
      this.activate = function () {
        this.isActive = true;
      };
      this.deactivate = function () {
        this.isActive = false;
      };
      this.activeWhilePromise = function (promiseCallback) {
        let _this = this;
        _this.activate();
        let promise = promiseCallback();
        promise.then(function () {
          _this.deactivate();
        }, function () {
          _this.deactivate();
        });
      }
    }

    return {
      LockerClass: LockerClass,
    };
  })
    angular.module('angular-map-md').service('stringCompare', function () {

    // code snippet from overlord1234
    // https://stackoverflow.com/questions/10473745/compare-strings-javascript-return-of-likely

    function similarity(s1, s2) {
      var longer = s1;
      var shorter = s2;
      if (s1.length < s2.length) {
        longer = s2;
        shorter = s1;
      }
      var longerLength = longer.length;
      if (longerLength == 0) {
        return 1.0;
      }
      return (longerLength - _editDistance(longer, shorter)) / parseFloat(longerLength);
    }
    function _editDistance(s1, s2) {
      if (!(s1 && s2)){
        return 0;
      }
      try{
        s1 = s1.toLowerCase();
        s2 = s2.toLowerCase();

        var costs = new Array();
        for (var i = 0; i <= s1.length; i++) {
          var lastValue = i;
          for (var j = 0; j <= s2.length; j++) {
            if (i == 0)
              costs[j] = j;
            else {
              if (j > 0) {
                var newValue = costs[j - 1];
                if (s1.charAt(i - 1) != s2.charAt(j - 1))
                  newValue = Math.min(Math.min(newValue, lastValue),
                    costs[j]) + 1;
                costs[j - 1] = lastValue;
                lastValue = newValue;
              }
            }
          }
          if (i > 0)
            costs[s2.length] = lastValue;
        }
        return costs[s2.length];
      }catch(e) {
        return 0;
      }
    }
    return {
      similarity: similarity
    };
  }).service('addressNumberCompareService', function (stringCompare) {
    function _getDelta(numStr1, numStr2){
      var r = /^[\d]+/;
      let delta = Infinity;
      let num1 = r.exec(numStr1);
      let num2 = r.exec(numStr2);
      if (num1 && num2){
        let result = Math.abs(parseInt(num1[0]) - parseInt(num2[0]));
        if (result || result === 0){
          delta = result;
        }
      }
      return delta
    }
    function _getSimilarity(numStr1, numStr2){
      if (numStr1 && numStr2){
        return stringCompare.similarity(numStr1, numStr2);
      }
      return 0
    }

    function findClosestMatch(numberList, addressNumber, minQuality){
      minQuality = minQuality || 0.25;
      let topMatch = {
        quality: 0,
        delta: 0,
        match: null,
      };
      _.each(numberList, function(item){
        let similarity = _getSimilarity(addressNumber, item);
        let closeness = _getDelta(addressNumber, item);
        let matchQuality = (similarity * 0.5) + (0.5 / (1 + closeness));
        if (matchQuality && matchQuality >= topMatch.quality){
          topMatch.match = item;
          topMatch.quality = matchQuality;
        }
      });
      if (topMatch.quality > minQuality){
        return topMatch.match;
      }
      return null;
    }

    function findTopMatches(numberList, addressNumber, maxNumbers, minQuality){
      minQuality = minQuality || 0.25;
      maxNumbers = maxNumbers || 4;
      let matches = [];
      _.each(numberList, function(item){
        let similarity = _getSimilarity(addressNumber, item);
        let closeness = _getDelta(addressNumber, item);
        let matchQuality = (similarity * 0.5) + (0.5 / (1 + closeness));
        if (matchQuality && matchQuality >= minQuality){
          matches.push({
            match: item,
            quality: matchQuality,
          });
        }
      });
      if (matches){
        return _.reverse(_.sortBy(matches, ['quality', 'age'])).slice(0, maxNumbers);
      }
      return [];
    }

    return {
      findClosestMatch: findClosestMatch,
      findTopMatches: findTopMatches,
    };
  })
})();

/**
 * Created by unloder on 4/18/18.
 */
(function () {
  'use strict';
  angular.module('angular-map-md').factory('mapMdGeoService', function (
    geoMapSettings, GeoCalc, $q, mapMdApiSettings,
    addressNumberCompareService, slug) {
    const MAP_MD_KEY = mapMdApiSettings.mapMdApiKey;
    const POINT_MD_REVERSE_GEOCODE_URL = mapMdApiSettings.reverseGeocodeUrl;
    const POINT_MD_FORWARD_GEOCODE_URL = mapMdApiSettings.forwardGeocodeUrl;
    const POINT_MD_GET_STREET_URL = mapMdApiSettings.getStreetUrl;
    let NO_RESULT_STRING = "no results";

    function isInDeliveryArea (pointCoords){
      return GeoCalc.pointInPolygon(pointCoords, geoMapSettings.deliveryAreaCoordinates);
    }

    function getBuildingNumber(suggestResult) {
      var r = /[\d\/]+[\w]?$/;
      let found = r.exec(suggestResult);
      if (found){
        return found[0];
      }
      return null;
    }

    function fixGeocodeString(string) {
      // Point md only works for Moldova(Chisinau) and additional keywords break the search
      var stringParts = string.split(" ");
      var slugString = string;
      slugString = slug(slugString.toLowerCase(), ' ');
      var slugParts = slugString.split(" ");
      let hasCity = false;
      _.each(geoMapSettings.validCitySlugs, function(kw){
        if (slugString.includes(kw)){
          let _index = _.indexOf(slugParts, kw);
          let stringKey = stringParts[_index];
          string = string.replace(stringKey, stringKey + ', ');
          hasCity = true;
        }
      });
      // if (!hasCity){
      //   string = geoMapSettings.mapLocationPrefix + ', ' + string
      // }
      return string;
    }

    function removeCity(string, citySlugs) {
      // removes identifiable city name form query string
      var stringParts = string.replace(",", " ").split(" ");
      var slugString = string;
      slugString = slug(slugString.toLowerCase(), ' ');
      var slugParts = slugString.split(" ");
      let hasCity = false;
      _.each((citySlugs || geoMapSettings.validCitySlugs), function(kw){
        if (slugString.includes(kw)){
          let _index = _.indexOf(slugParts, kw);
          let stringKey = stringParts[_index];
          string = string.replace(stringKey, '');
        }
      });
      return string;
    }
    function removeChisinauCity(string) {
      return removeCity(string, geoMapSettings.chisinauCitySlugs);
    }


    function _getNames(selected){
      let data = {
        addressList: '',
        _addressNameList: '',
      };
      let addressList = [];
      let _addressNameList = [];
      if (selected.location) {
        addressList.push(selected.location);
      }
      if (selected.street_name) {
        addressList.push(selected.street_name);
        _addressNameList.push(selected.street_name);
      }
      if (selected.number) {
        addressList.push(selected.number);
        _addressNameList.push(selected.number);
      }
      data.addressLine = addressList.join(' ');
      data.addressName = _addressNameList.join(' ');
      return data;
    }

    function _getCoordinates(resultObject){
      return resultObject.centroid.lon ?
        [parseFloat(resultObject.centroid.lon),
          parseFloat(resultObject.centroid.lat)] : null;
    }

    function _geodataFromStreetObject(resultObject){
      let coordinates = _getCoordinates(resultObject);
      return {
        'name': resultObject.name,
        'addressLine': resultObject.location + " " + resultObject.name,
        'country': "Moldova",
        'countryCode': "MD",
        'city': resultObject.location,
        'street': resultObject.name,
        'buildingNumber': '',
        'coordinates': coordinates,
        'isPrecise': false,
        'geoResult': resultObject,
        'geocoding_source': "point.md",
      };
    }

    function _geodataFromBuildingObject(resultObject){
      let coordinates = _getCoordinates(resultObject);
      let names = _getNames(resultObject);
      return {
        'name': names.addressName,
        'addressLine': names.addressLine,
        'country': "Moldova",
        'countryCode': "MD",
        'city': resultObject.location,
        'street': resultObject.street_name,
        'buildingNumber': resultObject.number,
        'coordinates': coordinates,
        'isPrecise': !!(resultObject.street_name && coordinates),
        'geoResult': resultObject,
        'geocoding_source': "point.md",
      };
    }


    function _findStreet(list){
      let selected = null;
      _.each(list, function(item){
        if (!selected){
          if (item.type=="street" && (geoMapSettings.chisinauCitySlugs.indexOf(
            slug(item.parent_name.toLowerCase(), ' ')) >= 0)){
            selected = item;
          }
        }
      });
      _.each(list, function(item){
        if (!selected){
          if (item.type=="street" && (geoMapSettings.validCitySlugs.indexOf(
            slug(item.parent_name.toLowerCase(), ' ')) >= 0)){
            selected = item;
          }
        }
      });
      return selected
    }

    function loadStreet(streetId) {
      let defer = $q.defer();
      let promise = defer.promise;
      $.ajax({
        url: POINT_MD_GET_STREET_URL,
        data: {"id": streetId},
        headers: {
            'Authorization': 'Basic ' + btoa((MAP_MD_KEY || '') + ":")
        },
        success: function(selected){
          if (selected && !_.isEmpty(selected)){
            let geoData = _geodataFromStreetObject(selected);
            defer.resolve(geoData);
          }else{
            defer.reject(NO_RESULT_STRING);
          }
        },
        error:function(error){
          defer.reject(error);
        }
      });
      return promise;
    }

    function _forwardGeocode(string, stopRecursion) {
      stopRecursion = !!stopRecursion;
      let defer = $q.defer();
      let promise = defer.promise;
      $.ajax({
        url: POINT_MD_FORWARD_GEOCODE_URL,
        headers: {
            'Authorization': 'Basic ' + btoa((MAP_MD_KEY || '') + ":")
        },
        data: {"q": fixGeocodeString(string)},
        success: function(result){
          let selected = result.selected;
          if (selected){
            let geoData = _geodataFromBuildingObject(selected);
            defer.resolve(geoData);
          }else if (result.list && result.list.length && !stopRecursion){
            let selectedStreet = _findStreet(result.list);
            if (selectedStreet){
                loadStreet(selectedStreet.id).then(function (geoData) {
                defer.resolve(geoData);
              }, function (error) {
                defer.reject(error);
              });
            }
          }else{
            defer.reject(NO_RESULT_STRING);
          }
        },
        error:function(error){
          defer.reject(error);
        }
      });
      return promise;
    }

    function forwardGeocode(string, stopRecursion){
      var deferred = $q.defer();
      _forwardGeocode(string, stopRecursion).then(function(geoData){
        deferred.resolve(geoData)
      }, function(error){
        deferred.reject(error)
      });
      return deferred.promise;
    }

    function _reverseGeocode(LatLong) {
      let defer = $q.defer();
      let promise = defer.promise;
      $.ajax({
        url: POINT_MD_REVERSE_GEOCODE_URL,
        headers: {
            'Authorization': 'Basic ' + btoa((MAP_MD_KEY || '') + ":")
        },
        data: {
          lat: LatLong[1],
          lon: LatLong[0],
        },
        success: function(result){
          let selected = result.building;
          let geoData = {};
          if (selected){
            geoData = _geodataFromBuildingObject(selected);
          }
          defer.resolve(geoData);
        },
        error:function(error){
          defer.reject(error);
        }
      });
      return promise;
    }

    function reverseGeocode(LatLong){
      var deferred = $q.defer();
      _reverseGeocode(LatLong).then(function(geoData){
        deferred.resolve(geoData)
      }, function(error){
        deferred.reject(error);
      });
      return deferred.promise;
    }

    function reverseGeocodeLongLat(LongLat){
      // uses Long Lat coord array for yandex maps compatibility
      return reverseGeocode([LongLat[1], LongLat[0]]);
    }

    function _formatSuggestionItems(data) {
      let items = [];
      _.each(data, function (dataItem) {
        if (dataItem.parent_name && dataItem.name) {
          items.push({
            value: dataItem.name,
            prefix: dataItem.parent_name,
            displayName: dataItem.parent_name + " " + dataItem.name,
          })
        }
      });
      return items;
    }

    function _formatSelectedSuggestionItems(selected) {
      let items = [];
      if (selected){
        items.push({
          value: selected.street_name + " " + selected.number,
          prefix: selected.location,
          displayName: selected.location + " " + selected.street_name + " " + selected.number,
          selected: selected,
        });
      }
      return items;
    }

    function _formatNumberResults(numbers, street){
      let items = [];
      _.each(numbers, function (number) {
        items.push({
          value: street.name + " " + number,
          prefix: street.parent_name,
          displayName: street.parent_name + " " + street.name + " " + number,
        });
      });
      return items;
    }

    function _groupResults(results){
      let items = {
        'chisinau': [],
        'other': [],
      };
      _.each(results, function(result){
        if (result.type == 'street'){
          if (geoMapSettings.chisinauCitySlugs.indexOf(
              slug(result.parent_name.toLowerCase(), ' ')) >= 0){
            items.chisinau.push(result);
          }else{
            items.other.push(result);
          }
        }
      });
      return items;
    }

    function _getNumberResults(resultGroups, number){
      var numberMatches = [];
      let bestGroup = {};
      if (resultGroups.chisinau.length && resultGroups.chisinau[0].buildings){
        bestGroup = resultGroups.chisinau[0];
      }else if(resultGroups.other.length){
        _.each(resultGroups.other, function(value){
          if (!bestGroup.buildings && value.buildings){
            bestGroup = value;
          }
        });
      }
      if (bestGroup.buildings){
        if (number) {
          _.each(addressNumberCompareService.findTopMatches(bestGroup.buildings, number, 10), function(item){
            numberMatches.push(item.match);
          });
        }else{
          _.each(bestGroup.buildings.slice(0, 10), function(item){
            numberMatches.push(item);
          });
        }
        return _formatNumberResults(numberMatches, bestGroup);
      }
      return [];
    }

    function searchForSuggestions(string, maxSuggestions){
      maxSuggestions = maxSuggestions || 20;
      // suggestions must follow the city input of the user, not default to chisinau as first city
      var defer = $q.defer();
      var promise = defer.promise;
      var number = getBuildingNumber(string);
      var fixedString = fixGeocodeString(string);
      $.ajax({
        url: POINT_MD_FORWARD_GEOCODE_URL,
        headers: {
            'Authorization': 'Basic ' + btoa((MAP_MD_KEY || '') + ":")
        },
        data: {"q": fixedString},
        success: function(data){
          if (data.list && (data.list.length || data.selected)){
            let items = [];
            if (data.selected){
              items.concat(_formatSelectedSuggestionItems(data.selected))
            }
            let resultGroups = _groupResults(data.list);
            var numberResults = _getNumberResults(resultGroups, number);
            if (number) {
              items = items.concat(numberResults);
              items = items.concat(_formatSuggestionItems(resultGroups.chisinau));
            }else{
              items = items.concat(_formatSuggestionItems(resultGroups.chisinau));
              items = items.concat(numberResults);
            }
            items = items.concat(_formatSuggestionItems(resultGroups.other));
            defer.resolve(items.slice(0, maxSuggestions));
          }else{
            defer.resolve([]);
          }
        },
        error:function(error){
          defer.reject(error);
        }
      });
      return promise;
    }

    var cachedSuggestions = {};

    // WORKING AROUND POINT MD API LIMITATIONS
    function getFromCachedSuggestions(string){
      // why? to show the best possible match without calling point md api
      // helps show suggestions even after the client made a spelling mistake or wrong number
      // in address string
      let bestMatch = [];
      let matchLength = 0;
      let matchKey = '';
      _.each(cachedSuggestions, function(value, key){
        if (string.indexOf(key) !== -1 && key.length > matchLength){
          bestMatch = value;
          matchKey = key;
        }
      })
      return bestMatch;
    }

    function checkClearSuggestion(string){
      // performance overflow prevention
      let suggestionsLength = _.values(cachedSuggestions).length;
      if (suggestionsLength > 50){
        let filteredMatches = {};
        _.each(cachedSuggestions, function(value, key){
          if (string.indexOf(key) !== -1){
            filteredMatches[key] = value;
          }
        })
        cachedSuggestions = filteredMatches;
      }
    }

    function getSuggestions(string, maxSuggestions){
      let defer = $q.defer();
      let promise = defer.promise;
      let suggestions = cachedSuggestions[string];
      let number = getBuildingNumber(string);
      if (suggestions && suggestions.length){
        defer.resolve(suggestions);
      }else{
        let suggestionsPromise = searchForSuggestions(string, maxSuggestions);
        suggestionsPromise.then(function(suggestions){
          if (suggestions.length){
            cachedSuggestions[string] = suggestions;
            checkClearSuggestion(string);
          }else{
            suggestions = getFromCachedSuggestions(string);
          }
          // repeated calls to api with part of string to increase chance of suggestions
          if (!suggestions.length){
            let halfString = removeCity(string);
            halfString = halfString.slice(0, halfString.length / 2) + " " + number;
            searchForSuggestions(halfString, maxSuggestions).then(function(suggestions){
              if (suggestions.length){
                cachedSuggestions[halfString] = suggestions;
                checkClearSuggestion(halfString);
                defer.resolve(suggestions);
              }else{
                halfString = halfString.slice(0, halfString.length / 2) + " " + number;
                searchForSuggestions(halfString, maxSuggestions).then(
                  function(suggestions){
                    if (suggestions.length){
                      cachedSuggestions[halfString] = suggestions;
                      checkClearSuggestion(halfString);
                      defer.resolve(suggestions);
                    }else{
                      defer.resolve([]);
                    }
                  }
                )
              }
            })
          }else{
            defer.resolve(suggestions);
          }
        })
      }
      return promise;
    }

    function getClientLocation() {
      let deferredGeolocation = $q.defer();
      if (navigator.geolocation) {
        var options = {
          // enableHighAccuracy: true,
          timeout: 5000
        };
        navigator.geolocation.getCurrentPosition(function(position){
          reverseGeocode([
            parseFloat(position.coords.longitude),
            parseFloat(position.coords.latitude)]).then(
            function(geoData){
              deferredGeolocation.resolve(geoData);
            }, function(error){
              deferredGeolocation.reject(error);
            }
          )
        }, function(geolocationError){
          deferredGeolocation.reject(geolocationError);
        }, options);
      }else{
        deferredGeolocation.reject('Geolocation not supported by this browser.');
      }
      return deferredGeolocation.promise;
    }

    return {
      getBuildingNumber: getBuildingNumber,
      forwardGeocode: forwardGeocode,
      reverseGeocode: reverseGeocode,
      reverseGeocodeLongLat: reverseGeocodeLongLat,
      getSuggestions: getSuggestions,
      getClientLocation: getClientLocation,
      fixGeocodeString: fixGeocodeString,
      isInDeliveryArea: isInDeliveryArea,
      fixGeocodeString: fixGeocodeString,
      removeChisinauCity: removeChisinauCity,
    };
  })
})();
