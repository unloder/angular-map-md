module.exports = function (grunt) {
  'use strict';
  grunt.config.init({
    concat: {
      dist: {
        files: {
          'angular-map-md.js': [
            'source/angular-map-md.module.js',
            'source/**/**/*.js'
          ],
          'dist/vendor.js': [
            'bower_components/jquery/dist/jquery.js',
            'bower_components/lodash/dist/lodash.min.js',
            'bower_components/bootstrap/dist/js/bootstrap.min.js',
            'bower_components/angular/angular.min.js',
            'bower_components/angular-bootstrap/ui-bootstrap.js',
            'bower_components/slug/slug.js',
            'bower_components/angular-slug/angular-slug.js',
            'angular-map-md.js'
          ],
          'dist/vendor.css': [
            'bower_components/bootstrap/dist/css/bootstrap.min.css',
          ]
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.registerTask('default', ['concat']);
};