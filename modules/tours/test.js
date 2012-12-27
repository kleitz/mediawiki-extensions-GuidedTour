/*
 * Guided Tour to test guided tour features.
 */
( function ( window, document, jQuery, mw, guiders ) {


var gt = mw.guidedTour = mw.guidedTour || {};

/*
 * This is the name of the tour.  It must be lowercase, without any hyphen (-) or
 * period (.) characters.
 *
 * If this is an on-wiki tour, it should match the MediaWiki page.  For instance,
 * if this were on-wiki, it would be MediaWiki:Guidedtour-tour-test.js
 *
 * The IDs below should use the same name in the middle (e.g. gt-test-2).
 */
guiders.currentTour = 'test';

/*
 * Show overlay
 */
guiders.initGuider({
	id: "gt-test-1",
	title: 'Testing',
	description: 'This is a test of the description. You can include <b>HTML</b> like bold. Lorem ipsum dolor sit!',

	// attachment
	overlay: true,

	next: "gt-test-2",
	buttons: [
		//{ name: 'Hide Tour', onclick: gt.hideTour, classString: "plain" },
		{ name: 'Start Tour', onclick: guiders.next }
	]
});

/*
 * Callout of left menu
 */
guiders.initGuider({
	id: "gt-test-2",
	title: 'Test callouts',
	description: 'This is the community portal page.',

	// attachment
	//overlay: true,
	attachTo: '#n-portal a',
	position: '3',


	next: "gt-test-3",
	buttons: [
		//{ name: 'Hide Tour', onclick: gt.hideTour, classString: "plain" },
		{ name: '→', onclick: guiders.next }
	]
});

/*
 * Test out mediawiki parsing
 */
guiders.initGuider({
	id: "gt-test-3",
	title: 'Test mediawiki parse',
	description: 'Your guider can contain wikitext using onShow. Use it to create an in-wiki link to the [[Guided tours]]. Or an external link [https://github.com/tychay/mwgadget.GuidedTour to github], for instance',

	// attachment
	//overlay: true,
	attachTo: '#searchInput',
	position: 'bottomRight', //try descriptive position (5'oclock)
	onShow: gt.parseDescription,

	next: "gt-test-4",
	buttons: [
		//{ name: 'Hide Tour', onclick: gt.hideTour, classString: "plain" },
		{ name: '→', onclick: guiders.next }
	]
});

/*
 * Test out mediawiki description pages
 */
guiders.initGuider({
	id: "gt-test-4",
	title: 'Test mediawiki description pages',
	description: 'Extension:Guided_tour',

	// attachment
	overlay: true,
	onShow: gt.getPageAsDescription,

	next: "gt-test-5",
	buttons: [
		//{ name: 'Hide Tour', onclick: gt.hideTour, classString: "plain" },
		{ name: 'Go to description page', onclick: function() { window.location = wgScript + 'Extension:GuidedTour'; return false; } },
		{ name: '→', onclick: guiders.next }
	]
});

/*
 * Test out tour launching
 */
guiders.initGuider({
	id: "gt-test-5",
	title: 'Test launch tour',
	description: 'Guiders can launch other guided tours. Pretty cool, huh?',

	// attachment
	overlay: true,
	//position: 'bottomRight', //try descriptive position (5'oclock)

	//next: "gt-test-2",
	buttons: [
		//{ name: 'Hide Tour', onclick: gt.hideTour, classString: "plain" },
		{ name: 'Launch a Tour on using Tours', onclick: function() { gt.launchTour('guidedtour'); } },
		{ name: 'End Tour', onclick: gt.endTour }
	]
});


} (window, document, jQuery, mediaWiki, mediaWiki.libs.guiders) );
