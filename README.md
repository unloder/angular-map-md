# angular-map-md

## Angular map.md geocoding api (for use in Moldova)

Requires you to get an api access key from  [https://map.md/ru/api/](https://map.md/ru/api/).
The api will require a contract with Sympals SRL for commercial use.

This geocoding api is limited and will only work for locations in the Republic of Moldova

Will require you to register a sympals account first.

Designed for straus.md.

Will separate custom api logic into separate project without angular dependency

## Forward Geocoding

```js
  mapMdGeoService.forwardGeocode($scope.forwardGeocodeString).then(function(geoData){
    console.log("Forward geocode for string: ", $scope.forwardGeocodeString);
    console.log(geoData);
    $scope.forwardGeocodeResult = geoData;
  })
```

Involves custom logic and returns a returns a custom data object, not the usual point.md api result:

```js
{
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
  'geocoding_source': this.address.geocoding_source
};
```

## Forward Geocoding
Also returns a custom data object
```js
  mapMdGeoService.reverseGeocode([$scope.reverseGeocodeLat, $scope.reverseGeocodeLong]).then(
    function(geoData){
      console.log("Reverse geocode for coords: ", [$scope.reverseGeocodeLat, $scope.reverseGeocodeLong]);
      console.log(geoData);
      $scope.ReverseGeocodeResult = geoData;
    })
```

has yandex maps (Long/ lat) compatible method "mapMdGeoService.reverseGeocodeLongLat"

## Autocomplete Geocoding
Custom logic not available in map.md api (yet), selects the most relevant results on the clientside, makes more requests then normal geocode
is samewhat fault tolerant. Designed for typeahead use, selecting street in typeahead results will start showing
 suggestions with numbers for this street.
Intended to be used with debounce no less then 200 ms.
 
```js
mapMdGeoService.getSuggestions(newValue, 20).then(function(suggestions){
    console.log("Suggestions for string: ", newValue);
    console.log(suggestions);
    $scope.AutocompleteSuggestions = suggestions;
});
```

