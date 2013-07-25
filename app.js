/*
Include all the neccessary
*/
var express = require('express')
  , engine  = require('ejs-locals')
  , rest    = require('restler')
  , ejs     = require('ejs');

/*
Create the application object
*/
var app = express();

/*
Configure the application with our template settings.
*/
app.engine('ejs', engine);
app.set('view engine', 'ejs');
app.use(express.static('public'));

/*
Set up the index page to render the index template.
*/
app.get('/', function(req, res){
  res.render("index");
});

/*
Set up the handler for the search request.
*/
app.get('/search', function(req, res){
  var query = req.query.q;

  /*
  If the user has not entered a search query, redirect them back to the index page.
  */
  if (query == "") {
    res.redirect("/");
    return;
  }

  /*
  Build the URL to the GOV.UK Search API using the query entered by the user
  */
  var search_endpoint = 'https://www.gov.uk/search.json?q='+ encodeURIComponent(query);

  console.log("GET "+ search_endpoint);

  /*
  Make the request to the GOV.UK Search API
  */
  rest.get(search_endpoint).on('complete', function(data, response) {
    /*
    If the connection to the search API failed, show the error message to the user.
    */
    if (data instanceof Error) {
      error = data.message;
      res.render("search", { query: query, results: null, error: error });

    /*
    If the GOV.UK Search API didn't return a successful response, show an error to the user.
    */
    } else if (response.statusCode != 200) {
      error = response.statusCode;
      res.render("search", { query: query, results: null, error: error });

    /*
    Otherwise, we assume that the query was successful and the GOV.UK API has returned us results.
    */
    } else {
      /*
      Only take the first five search results returned.
      */
      var results = data.results.slice(0,5);

      if (results.length > 0) {
        /*
        Loop over each result and make a request to the GOV.UK API for more information about the item (or 'artefact')
        */
        var artefactsReturned = 0;
        results.forEach(function(item) {
          console.log("GET "+ item.id);

          rest.get(item.id).on('complete', function(data, response) {
            /*
            Check that the request for the artefact is successful.
            */
            if (response.statusCode == 200 && data.related) {

              /*
              Take only the first three related links for the artefact
              */
              item.related = data.related.slice(0,3);

            } else {
              console.log("Error: "+ data);
            }

            /*
            Count the number of artefacts which have been returned from the API.
            If all the related links have been returned, let's go ahead and render the template.
            */
            artefactsReturned += 1;
            if (artefactsReturned == results.length) {
              /*
              Render the 'search' template, passing in the user's query, the results back, and a blank value for the error field.
              */
              res.render("search", { query: query, results: results, error: null });
            }
          });
        });
      } else {
        res.render("search", { query: query, results: results, error: null });
      }
    }

  });
});

/*
Now that we've defined what our application does, let's start it up.
First we need to set the port which our application will listen on. If you don't specify one, we'll default to port 3000.
*/
var port = process.env.PORT || 3000;

/*
Now we can make the app listen on the port we've selected.
*/
app.listen(port);

/*
Finally, log some information to the console about the running application.
*/

console.log('The app is now listening on port '+ port +'.');
console.log('To stop the application, press Ctrl+C.');

console.log('Visit http://localhost:'+ port +'/ in your web browser to see it running.');

