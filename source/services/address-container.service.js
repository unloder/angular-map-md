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
      apartment: '',
      entrance: '',
      floor: '',
      entrance_code: '',
      is_private_building: null,
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

      this.clearBuildingData = function(){
        this.address.apartment = null;
        this.address.entrance = null;
        this.address.floor = null;
        this.address.entrance_code = null;
        this.address.is_private_building = null;
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
