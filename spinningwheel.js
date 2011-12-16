/**
 * 
 * Spinning Wheel
 * 
 * Based on origonal by cubiq, 
 * http://cubiq.org/spinning-wheel-on-webkit-for-iphone-ipod-touch/11
 * 
 * Changes to make a bit more cross browser compatible. Based on code in iScroll 4.
 * Also added a 'container' property to allow the spinner to be embeded within an element.
 * Updated CSS to make use of gradients and data urls to reduce extra requests
 *
 * Changes by Fred Cox
 * Copyright (c) 2011 Fred Cox, http://fedr.co/
 * 
 * Origonal by Matteo Spinelli
 * Copyright (c) 2009 Matteo Spinelli, http://cubiq.org/
 * 
 * Released under MIT license
 * http://cubiq.org/dropbox/mit-license.txt
 * 
 * Version 2.0 - Last updated: 2011.12.16
 * 
 */
(function() {
	var vendor = (/webkit/i).test(navigator.appVersion) ? 'webkit' :
		(/firefox/i).test(navigator.userAgent) ? 'Moz' :
		'opera' in window ? 'O' : '',

	// Browser capabilities
	has3d = 'WebKitCSSMatrix' in window && 'm11' in new WebKitCSSMatrix(),
	hasTouch = 'ontouchstart' in window,
	hasTransform = vendor + 'Transform' in document.documentElement.style,
	
	RESIZE_EV = 'onorientationchange' in window ? 'orientationchange' : 'resize',
	START_EV = hasTouch ? 'touchstart' : 'mousedown',
	MOVE_EV = hasTouch ? 'touchmove' : 'mousemove',
	END_EV = hasTouch ? 'touchend' : 'mouseup',
	//CANCEL_EV = hasTouch ? 'touchcancel' : 'mouseup',
	//WHEEL_EV = vendor == 'Moz' ? 'DOMMouseScroll' : 'mousewheel',

	// Helpers
	trnOpen = 'translate' + (has3d ? '3d(' : '('),
	trnClose = has3d ? ',0)' : ')',
	trnEnd = (vendor == 'Moz') ? 'transitionend' : (vendor == 'O' ? 'o' : vendor) + 'TransitionEnd';

	var SpinningWheel = {
		cellHeight: 44,
		friction: 0.003,
		slotData: [],


		/**
		 *
		 * Event handler
		 *
		 */

		handleEvent: function (e) {
			if (e.type == START_EV) {
				this.lockScreen(e);
				if (e.currentTarget.id == 'sw-cancel' || e.currentTarget.id == 'sw-done') {
					this.tapDown(e);
				} else if (e.currentTarget.id == 'sw-frame') {
					this.scrollStart(e);
				}
			} else if (e.type == MOVE_EV) {
				this.lockScreen(e);

				if (e.currentTarget.id == 'sw-cancel' || e.currentTarget.id == 'sw-done') {
					this.tapCancel(e);
				} else if(this.scrollHasStarted/* || e.currentTarget.id == 'sw-frame'*/) {
					this.scrollMove(e);
				}
			} else if (e.type == END_EV) {
				if (e.currentTarget.id == 'sw-cancel' || e.currentTarget.id == 'sw-done') {
					this.tapUp(e);
				} else if (this.scrollHasStarted/* || e.currentTarget.id == 'sw-frame'*/) {
					this.scrollEnd(e);
				}
			} else if (e.type == trnEnd) {
				if (e.target.id == 'sw-wrapper') {
					this.destroy();
				} else {
					this.backWithinBoundaries(e);
				}
			} else if (e.type == RESIZE_EV) {
				this.onOrientationChange(e);
			} else if (e.type == 'scroll') {
				this.onScroll(e);
			}
		},


		/**
		 *
		 * Global events
		 *
		 */

		onOrientationChange: function (e) {
			window.scrollTo(0, 0);
			this.swWrapper.style.top = (this.container ? this.container.clientHeight : (window.innerHeight + window.pageYOffset)) + 'px';
			this.calculateSlotsWidth();
		},

		onScroll: function (e) {
			this.swWrapper.style.top = (this.container ? this.container.clientHeight : (window.innerHeight + window.pageYOffset)) + 'px';
		},

		lockScreen: function (e) {
			e.preventDefault();
			e.stopPropagation();
		},


		/**
		 *
		 * Initialization
		 *
		 */

		reset: function () {
			this.slotEl = [];

			this.activeSlot = null;

			this.swWrapper = undefined;
			this.swSlotWrapper = undefined;
			this.swSlots = undefined;
			this.swFrame = undefined;
		},

		calculateSlotsWidth: function () {
			var div = this.swSlots.getElementsByTagName('div');
			for (var i = 0; i < div.length; i += 1) {
				this.slotEl[i].slotWidth = div[i].offsetWidth;
			}
		},

		create: function () {
			var i, l, out, ul, div;

			this.reset();	// Initialize object variables

			// Create the Spinning Wheel main wrapper
			div = document.createElement('div');
			div.id = 'sw-wrapper';
			div.style.top = (this.container ? this.container.clientHeight : (window.innerHeight + window.pageYOffset)) + 'px';		// Place the SW down the actual viewing screen
			div.style[vendor + 'TransitionProperty'] = '-' + vendor.toLowerCase() + '-transform';
			div.innerHTML = '<div id="sw-header"><div id="sw-cancel">Cancel</' + 'div><div id="sw-done">Done</' + 'div></' + 'div><div id="sw-slots-wrapper"><div id="sw-slots"></' + 'div></' + 'div><div id="sw-frame"></' + 'div>';

			(this.container || document.body).appendChild(div);

			this.swWrapper = div;													// The SW wrapper
			this.swSlotWrapper = document.getElementById('sw-slots-wrapper');		// Slots visible area
			this.swSlots = document.getElementById('sw-slots');						// Pseudo table element (inner wrapper)
			this.swFrame = document.getElementById('sw-frame');						// The scrolling controller

			// Create HTML slot elements
			for (l = 0; l < this.slotData.length; l += 1) {
				// Create the slot
				ul = document.createElement('ul');
				out = '';
				for (i in this.slotData[l].values) {
					if(this.slotData[l].values.hasOwnProperty(i)) {
						out += '<li>' + this.slotData[l].values[i] + '<' + '/li>';
					}
				}
				ul.innerHTML = out;

				div = document.createElement('div');		// Create slot container
				div.className = this.slotData[l].style;		// Add styles to the container
				div.appendChild(ul);

				// Append the slot to the wrapper
				this.swSlots.appendChild(div);

				ul.slotPosition = l;			// Save the slot position inside the wrapper
				ul.slotYPosition = 0;
				ul.slotWidth = 0;
				ul.slotMaxScroll = this.swSlotWrapper.clientHeight - ul.clientHeight - 86;
				ul.style[vendor + 'TimingFunction'] = 'cubic-bezier(0, 0, 0.2, 1)';		// Add default transition

				this.slotEl.push(ul);			// Save the slot for later use

				// Place the slot to its default position (if other than 0)
				if (this.slotData[l].defaultValue) {
					this.scrollToValue(l, this.slotData[l].defaultValue);	
				}
			}

			this.calculateSlotsWidth();

			// Global events
			document.addEventListener(START_EV, this, false);			// Prevent page scrolling
			document.addEventListener(MOVE_EV, this, false);
			document.addEventListener(END_EV, this, false);			// Prevent page scrolling
			window.addEventListener('orientationchange', this, true);		// Optimize SW on orientation change
			window.addEventListener('scroll', this, true);				// Reposition SW on page scroll

			// Cancel/Done buttons events
			document.getElementById('sw-cancel').addEventListener(START_EV, this, false);
			document.getElementById('sw-done').addEventListener(START_EV, this, false);

			// Add scrolling to the slots
			this.swFrame.addEventListener(START_EV, this, false);
		},

		open: function () {
			this.create();

			this.swWrapper.style[vendor + 'TimingFunction'] = 'ease-out';
			this.swWrapper.style[vendor + 'TransitionDuration'] = '400ms';
			this.swWrapper.style[vendor + 'Transform'] = trnOpen + '0, -260px' + trnClose;
		},


		/**
		 *
		 * Unload
		 *
		 */

		destroy: function () {
			this.swWrapper.removeEventListener(trnEnd, this, false);

			this.swFrame.removeEventListener(START_EV, this, false);

			document.getElementById('sw-cancel').removeEventListener(START_EV, this, false);
			document.getElementById('sw-done').removeEventListener(START_EV, this, false);

			document.removeEventListener(START_EV, this, false);
			document.removeEventListener(MOVE_EV, this, false);
			window.removeEventListener('orientationchange', this, true);
			window.removeEventListener('scroll', this, true);

			this.slotData = [];
			this.cancelAction = function () {
				return false;
			};

			this.cancelDone = function () {
				return true;
			};

			this.reset();

			(this.container || document.body).removeChild(document.getElementById('sw-wrapper'));
		},

		close: function () {
			this.swWrapper.style[vendor + 'TimingFunction'] = 'ease-in';
			this.swWrapper.style[vendor + 'TransitionDuration'] = '400ms';
			this.swWrapper.style[vendor + 'Transform'] = trnOpen + '0, 0' + trnClose;

			this.swWrapper.addEventListener(trnEnd, this, false);
		},


		/**
		 *
		 * Generic methods
		 *
		 */

		addSlot: function (values, style, defaultValue) {
			if (!style) {
				style = '';
			}

			style = style.split(' ');

			for (var i = 0; i < style.length; i += 1) {
				style[i] = 'sw-' + style[i];
			}

			style = style.join(' ');

			var obj = { 'values': values, 'style': style, 'defaultValue': defaultValue };
			this.slotData.push(obj);
		},

		getSelectedValues: function () {
			var index, count,
				i, l,
				keys = [], values = [];

			for (i in this.slotEl) {
				if(this.slotEl.hasOwnProperty(i)) {
					// Remove any residual animation
					this.slotEl[i].removeEventListener(trnEnd, this, false);
					this.slotEl[i].style[vendor + 'TransitionDuration'] = '0';

					if (this.slotEl[i].slotYPosition > 0) {
						this.setPosition(i, 0);
					} else if (this.slotEl[i].slotYPosition < this.slotEl[i].slotMaxScroll) {
						this.setPosition(i, this.slotEl[i].slotMaxScroll);
					}

					index = -Math.round(this.slotEl[i].slotYPosition / this.cellHeight);

					count = 0;
					for (l in this.slotData[i].values) {
						if(this.slotData[i].values.hasOwnProperty(l)) {
							if (count == index) {
								keys.push(l);
								values.push(this.slotData[i].values[l]);
								break;
							}

							count += 1;
						}
					}
				}
			}

			return { 'keys': keys, 'values': values };
		},


		/**
		 *
		 * Rolling slots
		 *
		 */

		setPosition: function (slot, pos) {
			this.slotEl[slot].slotYPosition = pos;
			this.slotEl[slot].style[vendor + 'Transform'] = trnOpen + '0, ' + pos + 'px' + trnClose;
		},

		scrollStart: function (e) {
			// Find the clicked slot
			var point = hasTouch ? e.touches[0] : e;
			
			var l = 0, p = this.swSlots;
			while(p){
				l += p.offsetLeft;
				p = p.offsetParent;
			}
			
			var xPos = point.pageX - l;	// Clicked position minus left offset (should be 11px)

			// Find tapped slot
			var slot = 0;
			for (var i = 0; i < this.slotEl.length; i += 1) {
				slot += this.slotEl[i].slotWidth;

				if (xPos < slot) {
					this.activeSlot = i;
					break;
				}
			}

			// If slot is readonly do nothing
			if (this.slotData[this.activeSlot].style.match('readonly')) {
				//this.swFrame.removeEventListener(MOVE_EV, this, false);
				//this.swFrame.removeEventListener(END_EV, this, false);
				return false;
			}

			this.slotEl[this.activeSlot].removeEventListener(trnEnd, this, false);	// Remove transition event (if any)
			this.slotEl[this.activeSlot].style[vendor + 'TransitionDuration'] = '0';		// Remove any residual transition

			// Stop and hold slot position
			var theTransform = window.getComputedStyle(this.slotEl[this.activeSlot])[vendor + 'Transform'];
			//theTransform = new WebKitCSSMatrix(theTransform).m42;
			//if (theTransform != this.slotEl[this.activeSlot].slotYPosition) {
			//	this.setPosition(this.activeSlot, theTransform);
			//}

			this.startY = point.pageY;
			this.scrollStartY = this.slotEl[this.activeSlot].slotYPosition;
			this.scrollStartTime = e.timeStamp;

			//this.swFrame.addEventListener(MOVE_EV, this, false);
			//this.swFrame.addEventListener(END_EV, this, false);
			
			this.scrollHasStarted = true;
			
			return true;
		},

		scrollMove: function (e) {
			var point = hasTouch ? e.touches[0] : e;
			var topDelta = point.pageY - this.startY;

			if (this.slotEl[this.activeSlot].slotYPosition > 0 || this.slotEl[this.activeSlot].slotYPosition < this.slotEl[this.activeSlot].slotMaxScroll) {
				topDelta /= 2;
			}

			this.setPosition(this.activeSlot, this.slotEl[this.activeSlot].slotYPosition + topDelta);
			this.startY = point.pageY;

			// Prevent slingshot effect
			if (e.timeStamp - this.scrollStartTime > 80) {
				this.scrollStartY = this.slotEl[this.activeSlot].slotYPosition;
				this.scrollStartTime = e.timeStamp;
			}
		},

		scrollEnd: function (e) {
			//this.swFrame.removeEventListener(MOVE_EV, this, false);
			//this.swFrame.removeEventListener(END_EV, this, false);
			
			this.scrollHasStarted = false;

			// If we are outside of the boundaries, let's go back to the sheepfold
			if (this.slotEl[this.activeSlot].slotYPosition > 0 || this.slotEl[this.activeSlot].slotYPosition < this.slotEl[this.activeSlot].slotMaxScroll) {
				this.scrollTo(this.activeSlot, this.slotEl[this.activeSlot].slotYPosition > 0 ? 0 : this.slotEl[this.activeSlot].slotMaxScroll);
				return false;
			}

			// Lame formula to calculate a fake deceleration
			var scrollDistance = this.slotEl[this.activeSlot].slotYPosition - this.scrollStartY;

			// The drag session was too short
			if (scrollDistance < this.cellHeight / 1.5 && scrollDistance > -this.cellHeight / 1.5) {
				if (this.slotEl[this.activeSlot].slotYPosition % this.cellHeight) {
					this.scrollTo(this.activeSlot, Math.round(this.slotEl[this.activeSlot].slotYPosition / this.cellHeight) * this.cellHeight, '100ms');
				}

				return false;
			}

			var scrollDuration = e.timeStamp - this.scrollStartTime;

			var newDuration = (2 * scrollDistance / scrollDuration) / this.friction;
			var newScrollDistance = (this.friction / 2) * (newDuration * newDuration);

			if (newDuration < 0) {
				newDuration = -newDuration;
				newScrollDistance = -newScrollDistance;
			}

			var newPosition = this.slotEl[this.activeSlot].slotYPosition + newScrollDistance;

			if (newPosition > 0) {
				// Prevent the slot to be dragged outside the visible area (top margin)
				newPosition /= 2;
				newDuration /= 3;

				if (newPosition > this.swSlotWrapper.clientHeight / 4) {
					newPosition = this.swSlotWrapper.clientHeight / 4;
				}
			} else if (newPosition < this.slotEl[this.activeSlot].slotMaxScroll) {
				// Prevent the slot to be dragged outside the visible area (bottom margin)
				newPosition = (newPosition - this.slotEl[this.activeSlot].slotMaxScroll) / 2 + this.slotEl[this.activeSlot].slotMaxScroll;
				newDuration /= 3;

				if (newPosition < this.slotEl[this.activeSlot].slotMaxScroll - this.swSlotWrapper.clientHeight / 4) {
					newPosition = this.slotEl[this.activeSlot].slotMaxScroll - this.swSlotWrapper.clientHeight / 4;
				}
			} else {
				newPosition = Math.round(newPosition / this.cellHeight) * this.cellHeight;
			}

			this.scrollTo(this.activeSlot, Math.round(newPosition), Math.round(newDuration) + 'ms');

			return true;
		},

		scrollTo: function (slotNum, dest, runtime) {
			this.slotEl[slotNum].style[vendor + 'TransitionDuration'] = runtime ? runtime : '100ms';
			this.setPosition(slotNum, dest ? dest : 0);

			// If we are outside of the boundaries go back to the sheepfold
			if (this.slotEl[slotNum].slotYPosition > 0 || this.slotEl[slotNum].slotYPosition < this.slotEl[slotNum].slotMaxScroll) {
				this.slotEl[slotNum].addEventListener(trnEnd, this, false);
			}
		},

		scrollToValue: function (slot, value) {
			var yPos, count, i;

			this.slotEl[slot].removeEventListener(trnEnd, this, false);
			this.slotEl[slot].style[vendor + 'TransitionDuration'] = '0';

			count = 0;
			for (i in this.slotData[slot].values) {
				if(this.slotData[slot].values.hasOwnProperty(i)) {
					if (i == value) {
						yPos = count * this.cellHeight;
						this.setPosition(slot, yPos);
						break;
					}

					count -= 1;
				}
			}
		},

		backWithinBoundaries: function (e) {
			e.target.removeEventListener(trnEnd, this, false);

			this.scrollTo(e.target.slotPosition, e.target.slotYPosition > 0 ? 0 : e.target.slotMaxScroll, '150ms');
			return false;
		},


		/**
		 *
		 * Buttons
		 *
		 */

		tapDown: function (e) {
			e.currentTarget.addEventListener(MOVE_EV, this, false);
			e.currentTarget.addEventListener(END_EV, this, false);
			e.currentTarget.className = 'sw-pressed';
		},

		tapCancel: function (e) {
			e.currentTarget.removeEventListener(MOVE_EV, this, false);
			e.currentTarget.removeEventListener(END_EV, this, false);
			e.currentTarget.className = '';
		},

		tapUp: function (e) {
			this.tapCancel(e);

			if (e.currentTarget.id == 'sw-cancel') {
				this.cancelAction();
			} else {
				this.doneAction();
			}

			this.close();
		},

		setCancelAction: function (action) {
			this.cancelAction = action;
		},

		setDoneAction: function (action) {
			this.doneAction = action;
		},

		cancelAction: function () {
			return false;
		},

		cancelDone: function () {
			return true;
		}
	};
	window.SpinningWheel = SpinningWheel;
})();