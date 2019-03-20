(function (window, undefined) {
  var MapsLib = function (options) {
    var self = this;

    options = options || {};

    this.recordName = options.recordName || "result"; //for showing a count of results
    this.recordNamePlural = options.recordNamePlural || "results";
    this.searchRadius = options.searchRadius || 1610; //in meters ~ 1 mile

    // the encrypted Table ID of your Fusion Table (found under File => About)
    this.fusionTableId = options.fusionTableId || "",

    // EDIT to add more if you have additional polygon layers
    this.polygon1TableId = options.polygon1TableId || "",
    // To add a second polygon layer
    this.polygon2TableId = options.polygon2TableId || "",

    // Found at https://console.developers.google.com/
    // Important! this key is for demonstration purposes. please register your own.
    this.googleApiKey = options.googleApiKey || "",

    // name of the location column in your Fusion Table.
    // NOTE: if your location column name has spaces in it, surround it with single quotes
    // example: locationColumn:     "'my location'",
    this.locationColumn = options.locationColumn || "";

    // appends to all address searches if not present
    this.locationScope = options.locationScope || "";

    // zoom level when map is loaded (bigger is more zoomed in)
    this.defaultZoom = options.defaultZoom || 13;

    // center that your map defaults to
    this.map_centroid = new google.maps.LatLng(options.map_center[0], options.map_center[1]);

    // marker image for your searched address
    if (typeof options.addrMarkerImage !== 'undefined') {
      if (options.addrMarkerImage != "")
      this.addrMarkerImage = options.addrMarkerImage;
      else
      this.addrMarkerImage = ""
    }
    else
    this.addrMarkerImage = "images/blue-pushpin.png"

    this.currentPinpoint = null;
    $("#result_count").html("");

    this.myOptions = {
      zoom: this.defaultZoom,
      center: this.map_centroid,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    this.geocoder = new google.maps.Geocoder();
    this.map = new google.maps.Map($("#map_canvas")[0], this.myOptions);

    // maintains map centerpoint for responsive design
    google.maps.event.addDomListener(self.map, 'idle', function () {
      self.calculateCenter();
    });
    google.maps.event.addDomListener(window, 'resize', function () {
      self.map.setCenter(self.map_centroid);
    });
    self.searchrecords = null;

    // EDIT to define background of polygon layers
    self.polygon1 = new google.maps.FusionTablesLayer({
      query: {
        from:   self.polygon1TableId,
        select: "geometry"
      },
        styleId: 2,
        templateId: 2
    });
    self.polygon2 = new google.maps.FusionTablesLayer({
      query: {
        from:   self.polygon2TableId,
        select: "geometry"
      },
        styleId: 2,
        templateId: 2
    });

    //reset filters
    $("#search_address").val(self.convertToPlainString($.address.parameter('address')));
    var loadRadius = self.convertToPlainString($.address.parameter('radius'));
    if (loadRadius != "")
      $("#search_radius").val(loadRadius);
    else
      $("#search_radius").val(self.searchRadius);

    // disable checkboxes
    //$(":checkbox").prop("disabled", false);
    // enable checkboxes
    $(":checkbox").prop("checked", "checked");
    $("#result_box").hide();

    //-----custom initializers-----

    // EDIT to display Polygon1 by default
    $("#rbPolygon1").attr("checked", "checked");

    //-----end of custom initializers-----

    //run the default search when page loads
    self.doSearch();
    if (options.callback) options.callback(self);
  };

  //-----custom functions-----


  //-----end of custom functions-----

  MapsLib.prototype.submitSearch = function (whereClause, map) {
    var self = this;
    //get using all filters
    //NOTE: styleId and templateId are recently added attributes to load custom marker styles and info windows
    //you can find your Ids inside the link generated by the 'Publish' option in Fusion Tables
    //for more details, see https://developers.google.com/fusiontables/docs/v1/using#WorkingStyles
    self.searchrecords = new google.maps.FusionTablesLayer({
      query: {
        from: self.fusionTableId,
        select: self.locationColumn,
        where: whereClause
      },
      styleId: 2,
      templateId: 2
    });
    self.fusionTable = self.searchrecords;
    self.searchrecords.setMap(map);
    self.getCount(whereClause);
  };


  MapsLib.prototype.getgeoCondition = function (address, callback) {
    var self = this;
    if (address !== "") {
      if (address.toLowerCase().indexOf(self.locationScope) === -1) {
        address = address + " " + self.locationScope;
      }
      self.geocoder.geocode({
        'address': address
      }, function (results, status) {
        if (status === google.maps.GeocoderStatus.OK) {
          self.currentPinpoint = results[0].geometry.location;
          var map = self.map;

          $.address.parameter('address', encodeURIComponent(address));
          $.address.parameter('radius', encodeURIComponent(self.searchRadius));
          map.setCenter(self.currentPinpoint);
          // set zoom level based on search radius
          if (self.searchRadius >= 1610000) map.setZoom(4); // 1,000 miles
          else if (self.searchRadius >= 805000) map.setZoom(5); // 500 miles
          else if (self.searchRadius >= 402500) map.setZoom(6); // 250 miles
          else if (self.searchRadius >= 161000) map.setZoom(7); // 100 miles
          else if (self.searchRadius >= 80500) map.setZoom(8); // 100 miles
          else if (self.searchRadius >= 40250) map.setZoom(9); // 100 miles
          else if (self.searchRadius >= 16100) map.setZoom(11); // 10 miles
          else if (self.searchRadius >= 8050) map.setZoom(12); // 5 miles
          else if (self.searchRadius >= 3220) map.setZoom(13); // 2 miles
          else if (self.searchRadius >= 1610) map.setZoom(14); // 1 mile
          else if (self.searchRadius >= 805) map.setZoom(15); // 1/2 mile
          else if (self.searchRadius >= 400) map.setZoom(16); // 1/4 mile
          else self.map.setZoom(17);

          if (self.addrMarkerImage != '') {
            self.addrMarker = new google.maps.Marker({
              position: self.currentPinpoint,
              map: self.map,
              icon: self.addrMarkerImage,
              animation: google.maps.Animation.DROP,
              title: address
            });
          }
          var geoCondition = " AND ST_INTERSECTS(" + self.locationColumn + ", CIRCLE(LATLNG" + self.currentPinpoint.toString() + "," + self.searchRadius + "))";
          callback(geoCondition);
          self.drawSearchRadiusCircle(self.currentPinpoint);
        } else {
          alert("We could not find your address: " + status);
          callback('');
        }
      });
    } else {
      callback('');
    }
  };

  MapsLib.prototype.doSearch = function () {
    var self = this;
    self.clearSearch();
    var address = $("#search_address").val();
    self.searchRadius = $("#search_radius").val();
    self.whereClause = self.locationColumn + " not equal to ''";

    //-----custom filters-----
    // NUMERICAL OPTION to filter checkboxes by numerical type
    // EDIT type_column and numbers to match your Google Fusion Table points AND index.html
    var type_column = "'TypeNum'";
    var searchType = type_column + " IN (-1,";
    if ( $("#cbType1").is(':checked')) searchType += "1,";
    if ( $("#cbType2").is(':checked')) searchType += "2,";
    if ( $("#cbType3").is(':checked')) searchType += "3,";
    if ( $("#cbType4").is(':checked')) searchType += "4,";
    if ( $("#cbType5").is(':checked')) searchType += "5,";
    if ( $("#cbType6").is(':checked')) searchType += "6,";
    if ( $("#cbType7").is(':checked')) searchType += "7,";
    if ( $("#cbType8").is(':checked')) searchType += "8,";
    if ( $("#cbType9").is(':checked')) searchType += "9,";
    if ( $("#cbType10").is(':checked')) searchType += "10,";
    if ( $("#cbType11").is(':checked')) searchType += "11,";
    if ( $("#cbType12").is(':checked')) searchType += "12,";
    if ( $("#cbType13").is(':checked')) searchType += "13,";
    if ( $("#cbType14").is(':checked')) searchType += "14,";
    if ( $("#cbType15").is(':checked')) searchType += "15,";
    if ( $("#cbType16").is(':checked')) searchType += "16,";
    if ( $("#cbType17").is(':checked')) searchType += "17,";
    if ( $("#cbType18").is(':checked')) searchType += "18,";
    if ( $("#cbType19").is(':checked')) searchType += "19,";
    if ( $("#cbType20").is(':checked')) searchType += "20,";
    if ( $("#cbType21").is(':checked')) searchType += "21,";
    if ( $("#cbType22").is(':checked')) searchType += "22,";
    if ( $("#cbType23").is(':checked')) searchType += "23,";
    if ( $("#cbType24").is(':checked')) searchType += "24,";
    if ( $("#cbType25").is(':checked')) searchType += "25,";
    if ( $("#cbType26").is(':checked')) searchType += "26,";
    if ( $("#cbType27").is(':checked')) searchType += "27,";
    if ( $("#cbType28").is(':checked')) searchType += "28,";
    if ( $("#cbType29").is(':checked')) searchType += "29,";
    if ( $("#cbType30").is(':checked')) searchType += "30,";
    if ( $("#cbType31").is(':checked')) searchType += "31,";
    if ( $("#cbType32").is(':checked')) searchType += "32,";
    if ( $("#cbType33").is(':checked')) searchType += "33,";
    if ( $("#cbType34").is(':checked')) searchType += "34,";
    if ( $("#cbType35").is(':checked')) searchType += "35,";
    if ( $("#cbType36").is(':checked')) searchType += "36,";
    if ( $("#cbType37").is(':checked')) searchType += "37,";
    if ( $("#cbType38").is(':checked')) searchType += "38,";
    if ( $("#cbType39").is(':checked')) searchType += "39,";
    if ( $("#cbType40").is(':checked')) searchType += "40,";
    if ( $("#cbType41").is(':checked')) searchType += "41,";
    if ( $("#cbType42").is(':checked')) searchType += "42,";
    if ( $("#cbType43").is(':checked')) searchType += "43,";
    if ( $("#cbType44").is(':checked')) searchType += "44,";
    if ( $("#cbType45").is(':checked')) searchType += "45,";
    if ( $("#cbType47").is(':checked')) searchType += "47,";
    if ( $("#cbType48").is(':checked')) searchType += "48,";
    if ( $("#cbType49").is(':checked')) searchType += "49,";
    if ( $("#cbType50").is(':checked')) searchType += "50,";
    if ( $("#cbType51").is(':checked')) searchType += "51,";
    if ( $("#cbType52").is(':checked')) searchType += "52,";
    if ( $("#cbType53").is(':checked')) searchType += "53,";
    if ( $("#cbType54").is(':checked')) searchType += "54,";
    if ( $("#cbType55").is(':checked')) searchType += "55,";
    if ( $("#cbType56").is(':checked')) searchType += "56,";
    if ( $("#cbType57").is(':checked')) searchType += "57,";
        self.whereClause += " AND " + searchType.slice(0, searchType.length - 1) + ")";

    // TEXTUAL OPTION to filter checkboxes by text type
    // EDIT type_column and EXACT words to match your Google Fusion Table points AND index.html
    // var type_column = "'TypeText'";
    // var tempWhereClause = [];
    // if ( $("#cbType1").is(':checked')) tempWhereClause.push('District');
    // if ( $("#cbType2").is(':checked')) tempWhereClause.push('Interdistrict Magnet');
    // if ( $("#cbType3").is(':checked')) tempWhereClause.push('Charter');
    // if ( $("#cbType4").is(':checked')) tempWhereClause.push('Technical');
    // if ( $("#cbType5").is(':checked')) tempWhereClause.push('Other');
    // self.whereClause += " AND " + type_column + " IN ('" + tempWhereClause.join("','") + "')";

    // EDIT to show polygon layer if checkbox is selected; add more if other polygons
    if ($("#rbPolygon1").is(':checked')) {
      self.polygon1.setMap(self.map);
    }
    // use if adding another polygon layer
    else if ($("#rbPolygon2").is(':checked')) {
    self.polygon2.setMap(self.map);

  }
    //-----end of custom filters-----

    self.getgeoCondition(address, function (geoCondition) {
      self.whereClause += geoCondition;
      self.submitSearch(self.whereClause, self.map);
    });

  };

  MapsLib.prototype.reset = function () {
    $.address.parameter('address','');
    $.address.parameter('radius','');
    window.location.reload();
  };


  MapsLib.prototype.getInfo = function (callback) {
    var self = this;
    jQuery.ajax({
      url: 'https://www.googleapis.com/fusiontables/v1/tables/' + self.fusionTableId + '?key=' + self.googleApiKey,
      dataType: 'json'
    }).done(function (response) {
      if (callback) callback(response);
    });
  };

  MapsLib.prototype.addrFromLatLng = function (latLngPoint) {
    var self = this;
    self.geocoder.geocode({
      'latLng': latLngPoint
    }, function (results, status) {
      if (status === google.maps.GeocoderStatus.OK) {
        if (results[1]) {
          $('#search_address').val(results[1].formatted_address);
          $('.hint').focus();
          self.doSearch();
        }
      } else {
        alert("Geocoder failed due to: " + status);
      }
    });
  };

  MapsLib.prototype.drawSearchRadiusCircle = function (point) {
    var self = this;
    var circleOptions = {
      strokeColor: "#4b58a6",
      strokeOpacity: 0.3,
      strokeWeight: 1,
      fillColor: "#4b58a6",
      fillOpacity: 0.05,
      map: self.map,
      center: point,
      clickable: false,
      zIndex: -1,
      radius: parseInt(self.searchRadius)
    };
    self.searchRadiusCircle = new google.maps.Circle(circleOptions);
  };

  MapsLib.prototype.query = function (query_opts, callback) {
    var queryStr = [],
    self = this;
    queryStr.push("SELECT " + query_opts.select);
    queryStr.push(" FROM " + self.fusionTableId);
    // where, group and order clauses are optional
    if (query_opts.where && query_opts.where != "") {
      queryStr.push(" WHERE " + query_opts.where);
    }
    if (query_opts.groupBy && query_opts.groupBy != "") {
      queryStr.push(" GROUP BY " + query_opts.groupBy);
    }
    if (query_opts.orderBy && query_opts.orderBy != "") {
      queryStr.push(" ORDER BY " + query_opts.orderBy);
    }
    if (query_opts.offset && query_opts.offset !== "") {
      queryStr.push(" OFFSET " + query_opts.offset);
    }
    if (query_opts.limit && query_opts.limit !== "") {
      queryStr.push(" LIMIT " + query_opts.limit);
    }
    var theurl = {
      base: "https://www.googleapis.com/fusiontables/v1/query?sql=",
      queryStr: queryStr,
      key: self.googleApiKey
    };
    $.ajax({
      url: [theurl.base, encodeURIComponent(theurl.queryStr.join(" ")), "&key=", theurl.key].join(''),
      dataType: "json"
    }).done(function (response) {
      //console.log(response);
      if (callback) callback(response);
    }).fail(function(response) {
      self.handleError(response);
    });
  };

  MapsLib.prototype.handleError = function (json) {
    if (json.error !== undefined) {
      var error = json.responseJSON.error.errors;
      console.log("Error in Fusion Table call!");
      for (var row in error) {
        console.log(" Domain: " + error[row].domain);
        console.log(" Reason: " + error[row].reason);
        console.log(" Message: " + error[row].message);
      }
    }
  };
  MapsLib.prototype.getCount = function (whereClause) {
    var self = this;
    var selectColumns = "Count()";
    self.query({
      select: selectColumns,
      where: whereClause
    }, function (json) {
      self.displaySearchCount(json);
    });
  };

  MapsLib.prototype.displaySearchCount = function (json) {
    var self = this;

    var numRows = 0;
    if (json["rows"] != null) {
      numRows = json["rows"][0];
    }
    var name = self.recordNamePlural;
    if (numRows == 1) {
      name = self.recordName;
    }
    $("#result_box").fadeOut(function () {
      $("#result_count").html(self.addCommas(numRows) + " " + name + " found");
    });
    $("#result_box").fadeIn();
  };

  MapsLib.prototype.addCommas = function (nStr) {
    nStr += '';
    x = nStr.split('.');
    x1 = x[0];
    x2 = x.length > 1 ? '.' + x[1] : '';
    var rgx = /(\d+)(\d{3})/;
    while (rgx.test(x1)) {
      x1 = x1.replace(rgx, '$1' + ',' + '$2');
    }
    return x1 + x2;
  };

  // maintains map centerpoint for responsive design
  MapsLib.prototype.calculateCenter = function () {
    var self = this;
    center = self.map.getCenter();
  };

  //converts a slug or query string in to readable text
  MapsLib.prototype.convertToPlainString = function (text) {
    if (text === undefined) return '';
    return decodeURIComponent(text);
  };

  // EDIT if adding more than polygon1
  MapsLib.prototype.clearSearch = function () {
    var self = this;
    if (self.searchrecords && self.searchrecords.getMap)
        self.searchrecords.setMap(null);
    if (self.addrMarker && self.addrMarker.getMap)
        self.addrMarker.setMap(null);
    if (self.polygon1 && self.polygon1.getMap)
        self.polygon1.setMap(null);
    if (self.polygon2 && self.polygon2.getMap)
        self.polygon2.setMap(null);
    if (self.searchRadiusCircle && self.searchRadiusCircle.getMap)
        self.searchRadiusCircle.setMap(null);
  };

  MapsLib.prototype.findMe = function () {
    var self = this;
    var foundLocation;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function (position) {
        var latitude = position.coords.latitude;
        var longitude = position.coords.longitude;
        var accuracy = position.coords.accuracy;
        var coords = new google.maps.LatLng(latitude, longitude);
        self.map.panTo(coords);
        self.addrFromLatLng(coords);
        self.map.setZoom(14);
        jQuery('#map_canvas').append('<div id="myposition"><i class="fontello-target"></i></div>');
        setTimeout(function () {
          jQuery('#myposition').remove();
        }, 3000);
      }, function error(msg) {
        alert('Please enable your GPS position future.');
      }, {
        //maximumAge: 600000,
        //timeout: 5000,
        enableHighAccuracy: true
      });
    } else {
      alert("Geolocation API is not supported in your browser.");
    }
  };
  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = MapsLib;
  } else if (typeof define === 'function' && define.amd) {
    define(function () {
      return MapsLib;
    });
  } else {
    window.MapsLib = MapsLib;
  }

})(window);
