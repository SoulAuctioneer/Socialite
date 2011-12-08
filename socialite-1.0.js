/*
 * Socialite v1.0
 * http://www.socialitejs.com
 * Copyright (c) 2011 David Bushell
 * Dual-licensed under the BSD or MIT licenses: http://socialitejs.com/license.txt
 */

window.Socialite = (function()
{
	var	Socialite = { },

		/* internal functions */
		_socialite = { },
		/* social networks and callback functions to initialise each instance */
		networks = { },
		/* remembers which scripts have been appended */
		appended = { },
		/* a collection of URLs for external scripts */
		sources = { },
		/* remember loaded scripts */
		loaded = { },
		/* all Socialite button instances */
		cache = { },

		doc = window.document,
		gcn = typeof doc.getElementsByClassName === 'function',
		euc = encodeURIComponent;

	/* append a known script element once to the document body */
	_socialite.appendScript = function(network, id)
	{
		if (typeof network !== 'string' || appended[network] || sources[network] === undefined) {
			return false;
		}
		var js = appended[network] = doc.createElement('script');
		js.async = true;
		js.src = js.data = sources[network];
		js.onload = js.onreadystatechange = function ()
		{
			if (_socialite.hasLoaded(network)) {
				return;
			}
			var rs = js.readyState;
			if ( ! rs || rs === 'loaded' || rs === 'complete') {
				loaded[network] = true;
				js.onload = js.onreadystatechange = null;			
				if (cache[network] !== undefined) {
					var len = cache[network].length;
					for (var i = 0; i < len; i++) {
						_socialite.onLoad(cache[network][i]);
					}
				}
			}
		};
		if (id) {
			js.id = id;
		}
		doc.body.appendChild(js);
		return true;
	};

	/* check if an appended script has loaded */
	_socialite.hasLoaded = function(network)
	{
		return (typeof network !== 'string') ? false : loaded[network] === true;
	};

	/* called once an instance is ready */
	_socialite.onLoad = function(instance)
	{
		if (instance.loaded) {
			return;
		}
		instance.loaded = true;
		instance.container.className += ' socialite-loaded';
	};

	// copy data-* attributes from one element to another
	_socialite.copyDataAtributes = function(from, to)
	{
		var i, attr = from.attributes;
		for (i = 0; i < attr.length; i++) {
			if (attr[i].name.indexOf('data-') === 0 && attr[i].value.length) {
				to.setAttribute(attr[i].name, attr[i].value);
			}
		}
	};

	// return data-* attributes from an element as a query string
	_socialite.getDataAttributes = function(from, noprefix)
	{
		var i, str = '', attr = from.attributes;
		for (i = 0; i < attr.length; i++) {
			if (attr[i].name.indexOf('data-') === 0 && attr[i].value.length) {
				if (noprefix === true) {
					str += euc(attr[i].name.substring(5)) + '=' + euc(attr[i].value) + '&';
				} else {
					str += euc(attr[i].name) + '=' + euc(attr[i].value) + '&';
				}
			}
		}
		return str;
	};

	/* get elements within context with a class name (with fallback for IE < 9) */
	_socialite.getElements = function(context, name)
	{
		if (gcn) {
			return context.getElementsByClassName(name);
		}
		var i = 0, elems = [], all = context.getElementsByTagName('*'), len = all.length;
		for (i = 0; i < len; i++) {
			var cname = ' ' + all[i].className + ' ';
			if (cname.indexOf(' ' + name + ' ') !== -1) {
				elems.push(all[i]);
			}
		}
		return elems;
	};

	// return an iframe element - do iframes need width and height?...
	_socialite.createIFrame = function(src)
	{
		var iframe = doc.createElement('iframe');
		iframe.style.cssText = 'overflow: hidden; border: none;';
		iframe.setAttribute('allowtransparency', 'true');
		iframe.setAttribute('frameborder', '0');
		iframe.setAttribute('scrolling', 'no');
		iframe.setAttribute('src', src);
		return iframe;
	};

	// load a single button
	Socialite.activate = function(elem, network)
	{
		Socialite.load(null, elem, network);
	};

	// load and initialise buttons (recursively)
	Socialite.load = function(context, elem, network)
	{
		// if no context use the document
		context = (typeof context === 'object' && context !== null && context.nodeType === 1) ? context : doc;

		// if no element then search the context for instances
		if (elem === undefined || elem === null) {
			var	find = _socialite.getElements(context, 'socialite'),
				elems = find, length = find.length;
			if (!length) {
				return;
			}
			// create a new array if we're dealing with a live NodeList
			if (typeof elems.item !== undefined) {
				elems = [];
				for (var i = 0; i < length; i++) {
					elems[i] = find[i];
				}
			}
			Socialite.load(context, elems, network);
			return;
		}

		// if an array of elements load individually
		if (typeof elem === 'object' && elem.length) {
			for (var j = 0; j < elem.length; j++) {
				Socialite.load(context, elem[j], network);
			}
			return;
		}

		// Not an element? Get outa here!
		if (typeof elem !== 'object' || elem.nodeType !== 1) {
			return;
		}

		// if no network is specified or recognised look for one in the class name
		if (typeof network !== 'string' || networks[network] === undefined) {
			var classes = elem.className.split(' ');
			for (var k = 0; k < classes.length; k++) {
				if (networks[classes[k]] !== undefined) {
					network = classes[k];
					break;
				}
			}
			if (typeof network !== 'string') {
				return;
			}
		}

		// create the button elements
		var	container = doc.createElement('div'),
			button = doc.createElement('div');
		container.className = 'socialised ' + network;
		button.className = 'socialite-button';

		// insert container before parent element, or append to the context
		var parent = elem.parentNode;
		if (parent === null) {
			parent = (context === doc) ? doc.body : context;
			parent.appendChild(container);
		} else {
			parent.insertBefore(container, elem);
		}

		// insert button and element into container
		container.appendChild(button);
		button.appendChild(elem);

		// hide element from future loading
		elem.className = elem.className.replace(/\bsocialite\b/, '');

		/* create the button instance and save it in cache */
		if (cache[network] === undefined) {
			cache[network] = [];
		}
		var instance = {
			elem: elem,
			button: button,
			container: container,
			parent: parent,
			loaded: false
		};
		cache[network].push(instance);

		// initialise the button
		networks[network](instance, _socialite);
	};

	// allow users to extend the list of supported networks
	Socialite.extend = function(network, callback, source)
	{
		if (typeof network !== 'string' || typeof callback !== 'function') {
			return false;
		}
		if (networks[network] !== undefined) {
			return false;
		}
		if (source !== undefined && typeof source === 'string') {
			sources[network] = source;
		}
		networks[network] = callback;
		return true;
	};

	// boom
	return Socialite;

})();


/*
 * Socialite Extensions - Pick 'n' Mix!
 * 
 */

(function()
{

	var s = window.Socialite;

	// Twitter
	// https://twitter.com/about/resources/
	s.extend('twitter', function(instance, _s)
	{
		if ( ! _s.hasLoaded('twitter')) {
			var el = document.createElement('a');
			el.className = 'twitter-share-button';
			_s.copyDataAtributes(instance.elem, el);
			instance.button.replaceChild(el, instance.elem);
			_s.appendScript('twitter');
		} else {
			var src = '//platform.twitter.com/widgets/tweet_button.html?';
			src += _s.getDataAttributes(instance.elem, true);
			var iframe = _s.createIFrame(src);
			instance.button.replaceChild(iframe, instance.elem);
			_s.onLoad(instance);
		}
	}, '//platform.twitter.com/widgets.js');

	// Google+
	//http://www.google.com/webmasters/+1/button/
	s.extend('plusone', function(instance, _s)
	{
		var el = document.createElement('div');
		el.className = 'g-plusone';
		_s.copyDataAtributes(instance.elem, el);
		instance.button.replaceChild(el, instance.elem);
		if ( ! _s.hasLoaded('plusone')) {
			_s.appendScript('plusone');
		} else {
			if (typeof window.gapi === 'object' && typeof window.gapi.plusone === 'object' && typeof gapi.plusone.go === 'function') {
				window.gapi.plusone.go();
				_s.onLoad(instance);

			} // else - fallback to iframe?
		}
	}, '//apis.google.com/js/plusone.js');

	// Facebook
	// http://developers.facebook.com/docs/reference/plugins/like/
	s.extend('facebook', function(instance, _s)
	{
		var el = document.createElement('div');
		if ( ! _s.hasLoaded('facebook')) {
			el.className = 'fb-like';
			_s.copyDataAtributes(instance.elem, el);
			instance.button.replaceChild(el, instance.elem);
			_s.appendScript('facebook', 'facebook-jssdk');
		} else {
			var src = '//www.facebook.com/plugins/like.php?';
			src += _s.getDataAttributes(instance.elem, true);
			var iframe = _s.createIFrame(src);
			instance.button.replaceChild(iframe, instance.elem);
			_s.onLoad(instance);
		}
	}, '//connect.facebook.net/en_US/all.js#xfbml=1');

	// LinkedIn
	// http://developer.linkedin.com/plugins/share-button/
	s.extend('linkedin', function(instance, _s)
	{
		var attr = instance.elem.attributes;
		var el = document.createElement('script');
		el.type = 'IN/Share';
		_s.copyDataAtributes(instance.elem, el);
		instance.button.replaceChild(el, instance.elem);
		if (!_s.hasLoaded('linkedin')) {
			_s.appendScript('linkedin');
		} else {
			if (typeof window.IN === 'object' && typeof window.IN.init === 'function') {
				window.IN.init();
				_s.onLoad(instance);
			} // else fallback to iframe?
		}
	}, '//platform.linkedin.com/in.js');

	// StumbleUpon
	// http://www.stumbleupon.com/badges/
	s.extend('stumbleupon', function(instance, _s)
	{
		var r = instance.elem.attributes['data-r'] ? instance.elem.attributes['data-r'].value : '1';
		var src = '//www.stumbleupon.com/badge/embed/' + r + '/?';
		instance.elem.removeAttribute('data-r');
		src += _s.getDataAttributes(instance.elem, true);
		var iframe = _s.createIFrame(src);
		instance.button.replaceChild(iframe, instance.elem);
		_s.onLoad(instance);
	});


})();
