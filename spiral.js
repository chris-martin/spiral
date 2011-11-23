init = (function() {

  var doc;
  var root;
  var xmlns = 'http://www.w3.org/2000/svg'

  var canvas;
  var context;

  function polar(radius, angle) {
    return [ radius * Math.cos(angle), radius * Math.sin(angle) ];
  }

  function spiralPoints(args) {

    args = args || {};

    var angle = args.initialAngle || 0;
    var radius = args.initialRadius || 0;
    var radiusOffset = args.radiusOffset || 0;
    var adjustmentArray = args.adjustmentArray;
    var adjustmentFunction = args.adjustmentFunction;

    var loopCondition;
    var i;
    if (adjustmentArray) {
      var adjustmentLength = adjustment.length;
      loopCondition = function() { i < adjustmentLength; };
    } else if (args.maxRadius) {
      var maxRadius = args.maxRadius;
      loopCondition = function() { return radius < maxRadius; };
    } else if (args.loops || args.maxAngle) {
      var maxAngle = args.maxAngle || (2 * Math.PI * args.loops);
      loopCondition = function() { return angle < maxAngle; };
    } else {
      throw 'spiral config lacks a terminating condition';
    }

    var points = [];
    for (; loopCondition(); i++) {
      var r = radius + radiusOffset + (adjustmentArray ? adjustmentArray[i] : 0);
      var p = polar(r, angle);
      if (adjustmentFunction) {
        adjustment = adjustmentFunction(p);
        if (adjustment) p = polar(r + adjustment, angle);
      }
      points.push(p);
      var inc = 2 / Math.max(radius, 50);
      angle += inc;
      radius += .6 * inc;
    }
    if (args.reverse) points.reverse();
    return points;

  }

  function spiralPath(args) {
    var points = spiralPoints(args);
    return points.map(function(p) { return p.join(','); }).join(' L ')
  }

  var sampleRadius = 2;

  function distance(a, b) {
    return Math.pow(Math.pow(a[0]-b[0], 2) + Math.pow(a[1]-b[1], 2), 0.5);
  }

  function constrain(x) {
    return Math.max(0, Math.min(x, 1));
  }

  function harshContrast(x) { // (0,1) -> (0,1)
    return constrain((Math.atan(5 * (2 * x - 1)) + (Math.PI / 2)) * 1.2 / Math.PI - 0.1);
  }

  // fn: a harsh contrast function
  // amount: (0,1) 0 does no adjustment, 1 does the full adjustment of fn
  function variableContrastAdjust(fn, amount) {
    return function(x) {
      return amount * fn(x) + (1 - amount) * x;
    };
  }

  function lightnessAdjust(fn, amount) {
    return function(x) {
      return constrain(fn(x) + amount);
    };
  }

  // memoize a function on the domain (0,1)
  function memoize(fn, precision) {
    var memo = [];
    return function(x) {
      var i = Math.floor(x / precision);
      var value = memo[i];
      if (value === undefined) {
        value = fn(i * precision);
        memo[i] = value;
      }
      return value;
    };
  }

  var contrastAdjust = memoize(variableContrastAdjust(lightnessAdjust(harshContrast, -0.1), 0.7), 0.01);

  function imageAdjustment(p) {
    var size = 2 * sampleRadius + 1;
    var pixels = context.getImageData(p[0] - sampleRadius + 150, p[1] - sampleRadius + 150, size, size).data;
    var count = 0;
    var sum = 0;
    for (var i = 0; i < size; i++) for (var j = 0; j < size; j++) {
      var proximity = (sampleRadius - distance([i,j], [0,0])) / sampleRadius; // (0,1)
      var k = 4 * ( size * i + j );
      count += proximity;
      var measure = (pixels[k] + pixels[k+1] + pixels[k+2]) / (3 * 255); // (0,1)
      sum += proximity * contrastAdjust(measure);
    }
    return 0.2 + 1.4 * (1 - sum/count);
  }

  function negate(fn) {
    return function() { return -1 * fn.apply(this, arguments); };
  }

  function afterImageDraw() {
    var maxRadius = 150 * 1.1 * Math.pow(2, .5);
    doc.getElementById('spiral').setAttribute('d', 
        'M ' + spiralPath({ maxRadius: maxRadius, adjustmentFunction: negate(imageAdjustment) }) 
      + ' L ' + spiralPath({ maxRadius: maxRadius, adjustmentFunction: imageAdjustment, reverse: true }));
  }

  return function() {
    doc = document.getElementsByTagName('svg')[0].ownerDocument;
    root = doc.documentElement;

    canvas = document.getElementsByTagName('canvas')[0];
    context = canvas.getContext('2d');
    canvas.width = 300;
    canvas.height = 300;
    var image = new Image();
    image.onload = function() {
      context.drawImage(image, 0, 0, 300, 300);
      afterImageDraw();
    };
    image.src = 'sample1.jpg';
  };

})();

