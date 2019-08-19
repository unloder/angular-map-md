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
