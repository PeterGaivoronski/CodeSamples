$(document).ready(function(){

	window.mouseX = 0;
	window.mouseY = 0;

	var prevWidth = 0, prevHeight = 0, preferredWidth = 0, preferredHeight = 0;

	var body = $("body"), fontSizeString = "font-size", preferredRatio = 1.7777;

	body.on('mousemove', function(e){
		//get the mouse coords
		mouseX = e.pageX;
		mouseY = e.pageY;
	})

	// console.log(body.height())

	var adjustScreen = function(){

		var curWidth = body.width()
		var curHeight = body.height()

		if(curWidth !== prevWidth || curHeight !== prevHeight){
			//screen size changed

			preferredWidth = Math.round(curHeight*preferredRatio)
		
			// console.log("current width: "+curWidth)
			// console.log("current height: "+curHeight)
			// console.log("preferred width: "+preferredWidth)

			if(preferredWidth <= curWidth){
				body.css(fontSizeString, 100*preferredWidth/1600+"pt")
			}else{
				//if non-horizontal resolution, use the width as a baseline
				preferredHeight = Math.round(curWidth/preferredRatio)

				body.css(fontSizeString, 100*preferredHeight/900+"pt")
			}

			prevWidth = curWidth
			prevHeight = curHeight
		}

		setTimeout(adjustScreen, 1000)
	}

	setTimeout(adjustScreen, 1000)

	var determineFontSize = function(factor){
		return factor+"em"
	}

	var calcOffsets = function(topOffset, leftOffset, selectFactor){
		if(this.hasClass("selected")){
			this.css("top",  topOffset*selectFactor+"em")
			this.css("left", leftOffset*selectFactor+"em")
		}else{
			this.css("top",  topOffset+"em")
			this.css("left", leftOffset+"em")
		}
	}
	window.calcOffsets = calcOffsets

	var selectionOverlay = $("#selectionOverlay")
	, playerContainer = $(".playerContainer")
	, cards = $(".card")

	playerContainer.on("click", function(){
		var self = $(this)
		if(self.hasClass("selected")){
			selectionOverlay.hide()
			self.removeClass("selected")
			// self.css(fontSizeString, determineFontSize(1))
		}else{
			selectionOverlay.show()
			self.addClass("selected")
			// self.css(fontSizeString, determineFontSize(2))
		}
		//calcOffsets.prototype.constructor.apply(self, [3, 0.2, 0.5])
	})

	cards.on("click", function(e){
		e.stopPropagation()
	})

	var fullscreen = false
	, fullscreenButton = $("#fullscreen")

	fullscreenButton.on("click", function(){
		if(fullscreen === false){
			$("#header").hide();
			$("#footer").hide();
			fullscreen = true;
		}else{
			$("#header").show();
			$("#footer").show();
			fullscreen = false;
		}
		
	})

	var largeCardContainer = $(".cardLargeViewContainer")
	, cardZoomState = false
	, zoomGlass = $(".uiActionImage.glass")
	, deckSlots = $(".deckSlot")

	zoomGlass.on("click", function(e){
		e.stopPropagation()
		if(largeCardContainer.is(":visible") === false){
			largeCardContainer.show()
		}
	})
	deckSlots.on("mouseover", function(){
		$(this).find(".uiActionContainer").show()
	})
	deckSlots.on("mouseout", function(){
		$(this).find(".uiActionContainer").hide()
	})


	body.on("click", function(){
		if(largeCardContainer.is(":visible") === true){
			largeCardContainer.hide()
		}
	})

	var uiAction = $(".uiAction")

	uiAction.children(".dark").hide();
	uiAction.on("mouseover", function(){
		$(this).children(".light").hide();
		$(this).children(".dark").show();
	})
	uiAction.on("mouseout", function(){
		$(this).children(".light").show();
		$(this).children(".dark").hide();
	})


})
 

