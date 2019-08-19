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
