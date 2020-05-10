# How to use the OpenCage Data Geocoder API with ArcGIS API for JavaScript

This tutorial will walk you through how to create a map with [ArcGIS API for JavaScript](https://developers.arcgis.com/javascript/) and a custom search widget using [OpenCage Data Geocoder API](https://opencagedata.com/).

## Get started

1. We will need a OpenCage Data API key, it is free, signup for your own key [here](https://opencagedata.com/users/sign_up)

2. Your favorite editor: local or online

**Local**

- [VS Code](https://code.visualstudio.com/)
- [Atom](https://atom.io/)
- [Sublime Text](https://www.sublimetext.com/)
- ...

The Mozilla Developer Network has an excellent guide on setting up a [local development server](https://developer.mozilla.org/en-US/docs/Learn/Common_questions/set_up_a_local_testing_server).

**Online**

You can use sites such as [CodesSndbox](https://codesandbox.io/), [JS Bin](https://jsbin.com/), [CodePen](https://codepen.io/) and our own [ArcGIS API for JavaScript sandbox](https://developers.arcgis.com/javascript/latest/sample-code/sandbox/index.html?sample=intro-mapview)

## Tutorial

### Reference the ArcGIS API for JavaScript

First, set up a basic HTML document:

```html
<html>
  <head>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="initial-scale=1,maximum-scale=1,user-scalable=no"
    />
    <title>Arcgis Search widget with OpenCAge Data API</title>
  </head>

  <body></body>
</html>
```

Inside the `<head>` tag, reference the ArcGIS API for JavaScript using a `<link>` tag:

```html
<link
  rel="stylesheet"
  href="https://js.arcgis.com/4.15/esri/themes/light/main.css"
/>
```

Inside the `<body>` tag, reference the ArcGIS API for JavaScript using `<script>` tag:

```html
<script src="https://js.arcgis.com/4.15/"></script>
```

### Create a map

In the `<head>` section add a style tag:

```html
<style>
  html,
  body,
  #viewDiv {
    padding: 0;
    margin: 0;
    height: 100%;
    width: 100%;
  }
</style>
```

In the `<body>` section add a `<div>` tag before the `<script`> tage. This `<div>` will be the map view container:

```html
<div id="viewDiv"></div>
```

At the end of the `<body>`, add a <`script>` tag and an [AMD](https://dojotoolkit.org/documentation/tutorials/1.10/modules/index.html) `require` statement to load the Map and MapView

```html
<script>
  require(['esri/Map', 'esri/views/MapView'], function (Map, MapView) {
    var map = new Map({
      basemap: 'topo',
    });

    var view = new MapView({
      container: 'viewDiv',
      map: map,
      center: [-2.547855, 54.00366], // lon, lat
      scale: 4000000,
    });
  });
</script>
```

Run your code to view a map centered on the United Kingdom

### Add the search widget

In the `require` statement, add a reference to the [Search](https://developers.arcgis.com/javascript/latest/api-reference/esri-widgets-Search.html) module.

```javascript
require([ 'esri/Map', 'esri/views/MapView', 'esri/widgets/Search' ],
function(Map, MapView, Search) {
```

At the end of the code in the main function, create a `Search` widget and set the view. Add the widget to the top right corner of the view.

```javasript
// Search widget
var searchWidget = new Search({
    view: view
});

view.ui.add(searchWidget, "top-right");
```

Run the code and try searching for the following:

- London
- Buckingham Palace
- index.home.raft (sorry joking, it is a different [example](https://github.com/what3words/arcgis-javascript-samples))
- -0.20358600,51.521251

### Add the custom source : OpenCage Data

In the `require` statement, add references to the modules:

- [SearchSource](https://developers.arcgis.com/javascript/latest/api-reference/esri-widgets-Search-SearchSource.html) the custom source,
- [Graphic](https://developers.arcgis.com/javascript/latest/api-reference/esri-Graphic.html) so the Search widget can display a point result,
- [Point](https://developers.arcgis.com/javascript/latest/api-reference/esri-geometry-Point.html) used with the Graphic,
- [geometryEngine](https://developers.arcgis.com/javascript/latest/api-reference/esri-geometry-geometryEngine.html) to compute a buffer around the searhed location,
- [request](https://developers.arcgis.com/javascript/latest/api-reference/esri-request.html) for the API request to OpenCage Data API.

```javascript
require([
  'esri/Map',
  'esri/views/MapView',
  'esri/widgets/Search',
  'esri/widgets/Search/SearchSource',
  'esri/Graphic',
  'esri/geometry/Point',
  'esri/geometry/geometryEngine',
  'esri/request',
], function (
  Map,
  MapView,
  Search,
  SearchSource,
  Graphic,
  Point,
  geometryEngine,
  esriRequest
) {
  // ...
});
```

Create a function for the geocoding operations at the begining of the module (AMD require is only here for hint purpose):

```javascript
require([
  // ...
  'esri/request',
], function (
  // ...
  esriRequest
) {
  var API_KEY = 'YOUR-API-KEY';
  var OPENCAGEDATA_URL = 'https://api.opencagedata.com/geocode/v1/json';

  function geocode(options) {
    return esriRequest(OPENCAGEDATA_URL, {
      query: {
        key: API_KEY,
        q: options.query,
        proximity: options.proximity,
        no_annotations: 1,
        limit: 6,
      },
      responseType: 'json',
    });
  }
  // ...
});
```

Before the Search widget create custom SearchSource:

```javascript
// Custom SearchSource
var opencageSearchSource = new SearchSource({
  placeholder: 'example: W10',
  minSuggestCharacters: 3,
  getSuggestions: function (params) {
    var address = params.suggestTerm.replace(/ /g, '+');
    return geocode({
      query: address,
      proximity: view.center.latitude + ',' + view.center.longitude,
    }).then(function (response) {
      var suggestions = response.data.results.map(function (feature) {
        return {
          key: 'name',
          text: feature.formatted,
          location: {
            longitude: feature.geometry.lng,
            latitude: feature.geometry.lat,
          },
          sourceIndex: params.sourceIndex,
        };
      });
      return suggestions;
    });
  },
  // Provide a getResults method to find
  // results from the suggestions, the device location or the text input
  getResults: function (params) {
    var query;
    // Perform a different query if a location is provided
    // HTML5 device location or suggestion selected
    if (params.location) {
      query = params.location.latitude + ',' + params.location.longitude;
    } else {
      query = params.suggestResult.text.replace(/ /g, '+');
    }

    return geocode({
      query: query,
    }).then(function (results) {
      // Parse the results of your custom search
      var searchResults = results.data.results.map(function (feature) {
        // Create a Graphic the Search widget can display
        var graphic = new Graphic({
          geometry: new Point({
            x: feature.geometry.lng,
            y: feature.geometry.lat,
          }),
          attributes: {
            name: feature.formatted,
            label: feature.formatted,
            props: feature.properties,
          },
        });
        var buffer = geometryEngine.geodesicBuffer(
          graphic.geometry,
          250,
          'meters'
        );
        // Return a Search Result
        var searchResult = {
          extent: buffer.extent,
          feature: graphic,
          name: feature.formatted,
        };
        return searchResult;
      });

      // Return an array of Search Results
      return searchResults;
    });
  },
});
```

Update the search widget disabling the Esri's world geocoder:

```javascript
var searchWidget = new Search({
  view: view,
  sources: [opencageSearchSource],
  includeDefaultSources: false,
});
```

### Congratulations, you're done!

Your app should look something like this:
Inline-style:
![Screenshot](./resources/screenshot.png 'Arcgis Search widget with OpenCAge Data API')

## Final note

You can find the sources in this [GitHub repository](https://github.com/tsamaya/opencage-esrijs)

- [tutorial.html](./tutorial.html) this step by step tutorial
- [index.html](./index.html) an advanced version with an API key prompt, using localStorage for further usage and a basemap widget, as you can aslo be an addict to the National Geophic basemap, and split files (html, css, js).

## Thank for reading 🙏

Was this post helpful? Don't forget to share because Sharing is Caring.

## Resources

- cover image : Photo by [Vincent Guth](https://unsplash.com/@vingtcent?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText) on [Unsplash](https://unsplash.com/t/travel?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText)
- OpenCage Data API [documentation](https://opencagedata.com/api)
- ArcGIS API for Javascript [Search widget with custom source](https://developers.arcgis.com/javascript/latest/sample-code/widgets-search-customsource/index.html)
