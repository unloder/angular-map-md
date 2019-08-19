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
      return GeoCalc.pointInPolygon(pointCoords, mapMdApiSettings.deliveryAreaCoordinates);
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
