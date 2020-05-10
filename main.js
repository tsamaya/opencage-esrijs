var OPENCAGEDATA_URL = 'https://api.opencagedata.com/geocode/v1/json';
var SUGGESTIONS_ENABLED = true;

// Get the user's w3w API key via prompt
var key = localStorage.getItem('OPENCAGE_API_KEY');
if (!key || key === 'null') {
  localStorage.setItem(
    'OPENCAGE_API_KEY',
    prompt(
      'What is your OpenCage Data API key? It will be stored only in your localStorage'
    )
  );
}

var API_KEY = localStorage.getItem('OPENCAGE_API_KEY');
if (!API_KEY || API_KEY === 'null') {
  // Test key always returns "Friedrich-Ebert-Straße 7, 48153 Münster, Germany"
  API_KEY = '6d0e711d72d74daeb2b0bfd2a5cdfdba';
}

require([
  'esri/config',
  'esri/Map',
  'esri/Graphic',
  'esri/portal/Portal',
  'esri/request',
  'esri/views/MapView',
  'esri/widgets/BasemapGallery',
  'esri/widgets/Expand',
  'esri/widgets/Search',
  'esri/widgets/Search/SearchSource',
  'esri/geometry/geometryEngine',
  'esri/geometry/Point',
], function (
  esriConfig,
  Map,
  Graphic,
  Portal,
  esriRequest,
  MapView,
  BasemapGallery,
  Expand,
  Search,
  SearchSource,
  geometryEngine,
  Point
) {
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

  esriConfig.portalUrl = 'https://jsapi.maps.arcgis.com';
  // Intialize a portal instance and load it
  var portal = new Portal();
  portal.load().then(function () {
    var basemap = portal.useVectorBasemaps
      ? portal.defaultVectorBasemap
      : portal.defaultBasemap;
    var map = new Map({
      basemap: basemap,
    });
    var view = new MapView({
      container: 'viewDiv',
      map: map,
      center: [-2.547855, 54.00366], // lon, lat
      scale: 4000000,
    });
    // The BasemapGallery will use the basemaps
    // configured by the Portal URL defined in esriConfig.portalUrl
    var basemapGallery = new BasemapGallery({
      view: view,
    });
    var bgExpand = new Expand({
      view: view,
      content: basemapGallery,
    });
    view.ui.add(bgExpand, 'bottom-left');

    // Custom SearchSource
    var opencageSearchSource = new SearchSource({
      placeholder: 'example: W10',
      suggestionsEnabled: SUGGESTIONS_ENABLED,
      minSuggestCharacters: 3,
      getSuggestions: function (params) {
        var address = params.suggestTerm.replace(/ /g, '+');
        return geocode({
          query: address,
          proximity: view.center.latitude + ',' + view.center.longitude,
        }).then(function (response) {
          // console.log('esri request response', response);
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
          // console.log('suggestions', suggestions);
          return suggestions;
        });
      },
      // Provide a getResults method to find
      // results from the suggestions, the device location or the text input
      getResults: function (params) {
        var query;
        // You can perform a different query if a location
        // is provided
        if (params.location) {
          query = params.location.latitude + ',' + params.location.longitude;
        } else {
          query = params.suggestResult.text.replace(/ /g, '+');
        }
        // console.log('query', query);
        return geocode({
          query: query,
        }).then(function (results) {
          console.log('getResults().esriRequest()', results);
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
            // console.log('searchResult', searchResult);
            return searchResult;
          });

          // console.log(searchResults);
          // Return an array of Search Results
          return searchResults;
        });
      },
    });

    // Create Search widget using custom SearchSource
    var searchWidget = new Search({
      view: view,
      sources: [opencageSearchSource],
      includeDefaultSources: false,
    });

    // Add the search widget to the top left corner of the view
    view.ui.add(searchWidget, {
      position: 'top-right',
    });
  });
});
