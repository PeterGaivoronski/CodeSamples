//Uses nodeunit for tests

var helpers = require('./helpers.js') 
, tests = {}

tests.testBasics = function(test){
	// test.expect(7)

	//default value
	var value1 = undefined;

	test.equal("one", helpers.defaultVal(value1, "one"))

	//force integer

	test.equal(1, helpers.forceInt("1"))

	test.equal(1, helpers.forceInt(1))

	//merge objects

	var o1 = {a: 1}
	, o2 = {b: 2}

	var merged = helpers.mergeObjects(o1, o2)

	test.equal(1, merged.a)

	test.equal(2, merged.b)

	test.done()

	//deep clone

	var o3 = {a: [1, 2], b: 2}

	var o4 = helpers.deepClone(o3)

	var o3iso4 = o3 === o4

	test.equal(false, o3 === o4)
	test.equal(true, o3.a[0] === o4.a[0])

}

tests.testStats = function(test){
	test.expect(7)

	//random number

	var randNum = helpers.stats.rand(4, 10)

	test.equal('number', typeof randNum)

	test.equal(true, randNum <= 10)

	test.equal(true, randNum >= 4)

	//random int

	var randInt = helpers.stats.intRand(4, 10)

	test.equal(randInt, parseInt(randInt))

	test.equal(true, randInt <= 10)

	test.equal(true, randInt >= 4)

	//random array element

	var a = [4, 5, 6]

	var randElement = helpers.stats.randomElement(a)

	test.notEqual(-1, a.indexOf(randElement))

	test.done()
}

tests.testSpatial = function(test){
	test.expect(2)

	//point-box collision

	var point = {
		x: 1,
		y: 5
	},
	point2 = {
		x: 20,
		y: 20
	}

	var box = {
		x: 0,
		y: 0,
		w: 10,
		h: 10
	}

	test.equal(true, helpers.spatial.pointBoxCollision(point.x, point.y, box.x, box.y, box.w, box.h) )
	test.equal(false, helpers.spatial.pointBoxCollision(point2.x, point2.y, box.x, box.y, box.w, box.h) )

	test.done()
}

module.exports = tests;