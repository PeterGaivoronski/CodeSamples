//object keys shim
if (!Object.keys) {
    Object.keys = function (obj) {
        var keys = [],
            k;
        for (k in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, k)) {
                keys.push(k);
            }
        }
        return keys;
    };
}

(function(){

  var helpers = {}

  var root = this;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = helpers;
  }
  else {
    root.helpers = helpers;
  }

var defaultVal = function (variable, value){
  variable = typeof variable !== 'undefined' ? variable : value;
  return variable;
}
helpers.defaultVal = defaultVal;

var forceInt = function (number){
  if(typeof(number) === "string"){
    return parseInt(number);
  }else{
    return number;
  }
}
helpers.forceInt = forceInt;

helpers.mergeObjects = function(){
  var arr = Array.prototype.slice.apply(arguments)
  var mo = {}
  for (var i = 0; i < arr.length; i++) {
    for (var key in arr[i]){
      mo[key] = arr[i][key]
    }
  }
  return mo;
}

var deepClone = function(obj){
    var newObj;
    switch(typeof obj){
        case "object":
            //null is object for some arcane reason
            if(obj === null){
              newObj = null;
              break;
            }
            //determine whether array or object
            switch(typeof obj.length){
                case "undefined":
                    //object
                    newObj = {};
                    for(var key in obj){
                        newObj[key] = deepClone(obj[key])
                    }
                    break;
                default:
                    //array
                    newObj = [];
                    for (var i = 0; i < obj.length; i++) {
                        newObj.push(deepClone(obj[i]))
                    };
                    break;
            }
            break;
        default:
            //undefined, number, string
            newObj = obj;
            break;
    }
    return newObj;
}
helpers.deepClone = deepClone;

var classInheritance = function(newclass, superclass){
    for(var key in superclass){
        newclass[key] = deepClone(superclass[key])
    }
    return newclass;
}
helpers.classInheritance = classInheritance;

  var arrays = {}

  var sortByParam = function (arrayOfObjects, paramArray){
    if(arrayOfObjects.length < 2) return arrayOfObjects;
    var sortedArray = arrayOfObjects;
    for (var i = 0; i < paramArray.length; i++){
      var param = paramArray[i]["param"];
      var desc = paramArray[i]["desc"];
      sortedArray = sortedArray.mergeSort(function (a, b){
        var c1 = a[param];
        var c2 = b[param];
        if (typeof c1 === "string"){
          c1 = c1.toLowerCase();
          c2 = c2.toLowerCase();
        }
        if(desc === true){
          if (c1 < c2) return 1;
          if (c1 > c2) return -1;
        }else{
          if (c1 > c2) return 1;
          if (c1 < c2) return -1;
        }
        return 0;
      });
    }
    return sortedArray;
  }
  arrays.sortByParam = sortByParam;
  
  arrays.removeElement = function(arr, element){
    var newArr = []
    for (var i = 0; i < arr.length; i++) {
      if(arr[i] !== element){
        newArr.push(arr[i])
      }
    }
    return newArr
  }

  helpers.arrays = arrays;

  var stats = {};

  function leastSquares(points, twoDimensional){
    if(points.length < 2) return [0, 0];
    var x = [];
    var y = [];
    if(twoDimensional){
      for (var i = 0; i < points.length; i++){
	x.push(points[i][0]);
	y.push(points[i][1]);
      }
    }else{
      for (var i = 0; i < points.length; i++){
	x.push(i);
	y.push(points[i]);
      }
    }
    var sY = stats.sumV(y);
    var sX = stats.sumV(x);
    var x2 = [];
    for (var i = 0; i < x.length; i++){
      x2.push(Math.pow(x[i], 2));
    }
    var sX2 = stats.sumV(x2);
    var xy = [];
    for (var i = 0; i < x.length; i++){
     xy.push(x[i]*y[i]); 
    }
    var sXY = stats.sumV(xy);
    var denominator = points.length*sX2-Math.pow(sX, 2);
    var intercept = ((sY*sX2)-(sX*sXY))/(denominator);
    var slope = (points.length*sXY-(sX*sY))/(denominator);
    //pwconsole.log("slope: "+slope+" intercept: "+intercept);
    return [slope, intercept];
  }
  stats.leastSquares = leastSquares;

  function sumV(values){
    sum = 0;
    for (var i = 0; i < values.length; i++){
     sum += values[i]; 
    }
    return sum;
  }
  stats.sumV = sumV;
  

  function mod(a, b) {
    return (((a % b) + b) % b)
  }
  stats.mod = mod;
  
  function pad(number, digits) {
    var numberString = number.toString();
    for (var i = 1; i < digits; i++){
     if (number < Math.pow(10, i)){
       numberString = "0"+numberString;
     }
    }
    return numberString;
  }
  stats.pad = pad;
  
  function scale(value, oldMin, oldMax, newMin, newMax){
    var oldRange = oldMax - oldMin;
    var newRange = newMax - newMin;
    //respect boundaries
    if (value < oldMin) value = oldMin;
    if (value > oldMax) value = oldMax;
    
    if (newRange <= 0) return value;
    if(oldRange > 0) return ((value-oldMin)/oldRange)*newRange + newMin;
    return 0;
  }
  stats.scale = scale;

  function roundNumber(num, dec) {
    return Math.round(num*Math.pow(10,dec))/Math.pow(10,dec);
  }
  stats.roundNumber = roundNumber;
  
  stats.mod = function (a, b) {
    return (((a % b) + b) % b)
  }
  
  stats.rand = function (min, max){
    return Math.random()*(max-min)+min;
  }
  
  stats.intRand = function (min, max){
    return Math.floor(Math.random()*(max+1-min)+min);
  }
  
  stats.randomSign = function (n){
    if (stats.intRand(0, 1) === 0) return n;
    else return -n;
  }
  
  stats.randomElement = function (a){
    return a[stats.intRand(0, a.length-1)];
  }
  
  stats.distance = function(x1, y1, x2, y2){
    return Math.round(Math.sqrt(Math.pow(y1 - y2, 2) + Math.pow(x1 - x2, 2)));
  }
  
  stats.round = function(number, place){
    var factor = Math.pow(10, place);
    return Math.round(number*factor)/factor;
  }
  
  //t - thing, p - rarity (more is more rare)
  var precompWRandom = function(stuff){
    var sum = 0;
    var i, obj;
    var newstuff = [];
    for (i=0; i < stuff.length; i++){
      obj = {t: stuff[i].t, p: stuff[i].p}
      newstuff.push(obj)
    }
    //prime
    for (i=0; i < stuff.length; i++){
      newstuff[i]["p"] = 1/stuff[i]["p"]
      sum += newstuff[i]["p"]
    }
    //normalize
    for (i=0; i < newstuff.length; i++){
      newstuff[i]["p"] /= sum
      //accumulate
      if(i > 0){
        newstuff[i]["p"] += newstuff[i-1]["p"]
      }
    }
    return newstuff;
  }
  stats.precompWRandom = precompWRandom;

  var pickWRandom = function(stuff){
    var roll = Math.random()
    var pick = undefined;
    for (i=0; i < stuff.length; i++){
      if(stuff[i]["p"] >= roll){
        pick = stuff[i]
        break;
      }
    }
    //pick the last one if nothing else matches
    if(pick === undefined) pick = stuff[i]
    return pick.t
  }
  stats.pickWRandom = pickWRandom

  helpers.stats = stats;

  var spatial = {}

  spatial.pointBoxCollision = function(x, y, top, left, width, height){
    return spatial.boxCollision(x, y, 0, 0, top, left, width, height)
  }

  spatial.boxCollision = function(x1, y1, width1, height1, x2, y2, width2, height2){
    if(y1 + height1 < y2) return false;
    if(x1 + width1 < x2) return false;
    if(y2 + height2 < y1) return false;
    if(x2 + width2 < x1) return false;
    return true;
  }

  helpers.spatial = spatial


})()