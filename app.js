/*
 * Created by bskipper on 3/4/2015.
 */

// Retrieve
var MongoClient = require('mongodb').MongoClient;

var host = "localhost";
var port = ":27017";
var dbName = "/mobileconnect";
var destination = "mongodb://" + host + port + dbName;

const SPRING_FORWARD = 0;
const FALL_BACK = 1;
var currentOperation = FALL_BACK;

// Connect to the db
    MongoClient.connect(destination, function (err, db) {

        err ? console.log(err) : console.log("We are connected");

        // Connect to Users collection
        var query = {'products.settings.timeZone.hours' : {'$exists' : true}};
        var users = db.collection('users').find(query);

        users.each(function(err, doc){

            if (err) throw err;

            if (doc == null) {
                return db.close;
            }

           query = {'_id' : doc['_id']};
           var products = doc.products;

           for(var i = 0; i < products.length; i++) {
               var timeZone = products[i].settings.timeZone;

               // If timeZone exists, spring forward/fall Back
               if (timeZone) {

                   var newTimeString = dstToggle(timeZone.hours, timeZone.operator);

                   //Set operator to + or -
                   timeZone.operator = newTimeString[0];

                   //Parse remainder of string into the hours field
                   timeZone.hours = newTimeString.slice(1);

                   //Recalculate the value field with the new parameters
                   timeZone.value = timeZone.operator + timeZone.hours + timeZone.minutes;

                   doc.products[i].settings.timeZone = timeZone;
               }

               //Update timeZone with new data
               db.collection('users').update(query, doc, function(err, updated) {
                   if (err) throw err;
                   console.dir("Updated " + updated + "documents");
               });
           }
        });
    });


/*
* This function alters a string representing the offset from GMT,
* either Springing Forward an hour, or Falling Back an hour,
* depending on the current value of the currentOperation global
* variable.
* @params: hoursInString is a string representing the number of
* hours currently offset from GMT
* operatorInString is a string representing if the offset from
* GMT is positive ('+') or negative ('-')
* @return: The altered string representing the new offset from GMT
* */
function dstToggle(hoursInString, operatorInString)
{
    var hoursInt = parseInt(hoursInString);
    var operatorOutString = operatorInString;
    var resultString = '';

    if (operatorInString == '-')
    {
        hoursInt = hoursInt * -1;
    }

    if (currentOperation == SPRING_FORWARD) {
        hoursInt++;

        // If we Spring Forward from GMT
        if (hoursInt == 1)
        {
            operatorOutString = '+'
        }

        // Else if we Spring Forward from UTC == 14:00
        else if (hoursInt == 15)
        {
            hoursInt = -12;
            operatorOutString = '-';
        }
    }

    else if (currentOperation == FALL_BACK)
    {
        hoursInt--;

        // If we Fall Back from GMT
        if (hoursInt == -1)
        {
            operatorOutString = '-'
        }

        // Else if we Fall Back from UTC == -12:00
        else if (hoursInt == -13)
        {
            hoursInt = 14;
            operatorOutString = '+';
        }
    }

    resultString += operatorOutString;

    //Add leading zero to single digit items
    if (Math.abs(hoursInt) < 10)
    {
        resultString += '0'
    }

    resultString += Math.abs(hoursInt);
    return resultString;
};
