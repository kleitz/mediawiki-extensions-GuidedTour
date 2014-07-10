( function ( mw, $ ) {
	'use strict';

	var gt, originalVE, originalGetParam, cookieConfig, cookieName, cookieParams,
		// Step specification as passed to the legacy defineTour method
		VALID_DEFINE_TOUR_STEP_SPEC = {
			titlemsg: 'guidedtour-tour-test-callouts',
			descriptionmsg: 'guidedtour-tour-test-portal-description',
			attachTo: '#n-portal a',
			position: '3',
			buttons: [ {
				action: 'next'
			} ]
		},
		// Step specification as used with the current builder API
		VALID_BUILDER_STEP_SPEC = {
			name: 'intro',
			titlemsg: 'guidedtour-tour-test-intro-title',
			descriptionmsg: 'guidedtour-tour-test-intro-description',
			position: 'bottom',
			attachTo: '#ca-edit'
		},
		validTourBuilder, validTour, firstStepBuilder, firstStep, otherTourBuilder, otherTourStepBuilder;

	gt = mw.guidedTour;
	cookieConfig = gt.getCookieConfiguration();
	cookieName = cookieConfig.name;
	cookieParams = cookieConfig.parameters;

	// QUnit's "throws" only lets you check one at a time
	function assertThrowsTypeAndMessage( assert, block, errorConstructor, regexErrorMessage, message ) {
		var actualException;
		try {
			block();
		} catch ( exc ) {
			actualException = exc;
		}

		assert.assertTrue( actualException instanceof errorConstructor, message + ': Actual exception is instanceof expected constructor' );
		assert.assertTrue( regexErrorMessage.test( actualException ), message + ': Text of actual exception matches expected message' );
	}

	QUnit.module( 'ext.guidedTour.lib', QUnit.newMwEnvironment( {
		setup: function () {
			originalGetParam = mw.util.getParamValue;
			originalVE = window.ve;

			validTourBuilder = new gt.TourBuilder( { name: 'placeholder' } );
			validTour = validTourBuilder.tour;
			firstStepBuilder = validTourBuilder.firstStep( VALID_BUILDER_STEP_SPEC );
			firstStep = firstStepBuilder.step;

			otherTourBuilder = new gt.TourBuilder( {
				name: 'upload'
			} );
			otherTourStepBuilder = otherTourBuilder.step( {
				name: 'filename'
			} );
		},
		teardown: function () {
			window.ve = originalVE;
			mw.util.getParamValue = originalGetParam;
		}
	} ) );

	QUnit.test( 'makeTourId', 4, function ( assert ) {
		assert.strictEqual(
			gt.makeTourId( {
				name: 'test',
				step: 3
			} ),
			'gt-test-3',
			'Successful makeTourId call'
		);

		assert.strictEqual(
			gt.makeTourId( 'test' ),
			null,
			'String input returns null'
		);

		assert.strictEqual(
			gt.makeTourId( null ),
			null,
			'null input returns null'
		);

		assert.strictEqual(
			gt.makeTourId(),
			null,
			'Missing parameter returns null'
		);
	} );


	QUnit.test( 'parseTourId', 1, function ( assert ) {
		var tourId = 'gt-test-2', expectedTourInfo;
		expectedTourInfo = {
			name: 'test',
			step: '2'
		};
		assert.deepEqual(
			gt.parseTourId(	tourId ),
			expectedTourInfo,
			'Simple tourId'
		);
	} );

	QUnit.test( 'isPage', 2, function ( assert ) {
		var PAGE_NAME_TO_SKIP = 'TestPage',
			OTHER_PAGE_NAME = 'WrongPage';

		mw.config.set( 'wgPageName', PAGE_NAME_TO_SKIP );
		assert.strictEqual(
			gt.isPage( PAGE_NAME_TO_SKIP ),
			true,
			'Page matches'
		);

		mw.config.set( 'wgPageName', OTHER_PAGE_NAME );
		assert.strictEqual(
			gt.isPage( PAGE_NAME_TO_SKIP ),
			false,
			'Page does match'
		);
	} );

	QUnit.test( 'hasQuery', 7, function ( assert ) {
		var paramMap,
			PAGE_NAME_TO_SKIP = 'RightPage',
			OTHER_PAGE_NAME = 'OtherPage';

		mw.util.getParamValue =	function ( param ) {
			return paramMap[param];
		};

		paramMap = { action: 'edit', debug: 'true' };

		assert.strictEqual(
			gt.hasQuery( { action: 'edit' } ),
			true,
			'Query matches, page name is undefined'
		);
		assert.strictEqual(
			gt.hasQuery( { action: 'edit' }, null ),
			true,
			'Query matches, page name is null'
		);

		mw.config.set( 'wgPageName', PAGE_NAME_TO_SKIP );
		assert.strictEqual(
			gt.hasQuery( { action: 'edit' }, PAGE_NAME_TO_SKIP ),
			true,
			'Query and page both match'
		);

		mw.config.set( 'wgPageName', OTHER_PAGE_NAME );
		assert.strictEqual(
			gt.hasQuery( { action: 'edit' }, PAGE_NAME_TO_SKIP ),
			false,
			'Query matches, but page does not');

		paramMap = { debug: 'true', somethingElse: 'medium' };

		assert.strictEqual(
			gt.hasQuery( { action: 'edit' } ),
			false,
			'Query does not match, page is undefined'
		);

		mw.config.set( 'wgPageName', PAGE_NAME_TO_SKIP );
		assert.strictEqual(
			gt.hasQuery( { action: 'edit' }, PAGE_NAME_TO_SKIP ),
			false,
			'Query does not match, although page does'
		);

		mw.config.set( 'wgPageName', OTHER_PAGE_NAME );
		assert.strictEqual(
			gt.hasQuery( { action: 'edit' }, PAGE_NAME_TO_SKIP ),
			false,
			'Neither query nor page match'
		);
	} );

	QUnit.test( 'getStepFromQuery', 2, function ( assert ) {
		var step;
		mw.util.getParamValue = function () {
			return step;
		};

		step = 6;
		assert.strictEqual(
			gt.getStepFromQuery(),
			step,
			'Step is returned correctly when present'
		);

		step = null;
		assert.strictEqual(
			gt.getStepFromQuery(),
			step,
			'Step is returned as null when not present'
		);
	} );

	QUnit.test( 'setTourCookie', 5, function ( assert ) {
		var firstTourName = 'foo',
			secondTourName = 'bar',
			numberStep = 5,
			stringStep = '3',
			oldCookieValue = $.cookie( cookieName );

		function assertValidCookie( expectedName, expectedStep, message ) {
			var cookieValue = $.cookie( cookieName ),
				userState = gt.internal.parseUserState( cookieValue );

			assert.strictEqual(
				userState.tours[expectedName].step,
				expectedStep,
				message
			);
		}

		function clearCookie() {
			$.cookie( cookieName, null, cookieParams );
		}

		gt.setTourCookie( firstTourName );
		assertValidCookie ( firstTourName, '1', 'Step defaults to 1' );
		clearCookie();

		gt.setTourCookie( firstTourName, numberStep );
		assertValidCookie ( firstTourName, String( numberStep ), 'setTourCookie accepts numeric step, which is converted to string' );
		clearCookie();

		gt.setTourCookie( firstTourName, stringStep );
		assertValidCookie( firstTourName, stringStep, 'setTourCookie accepts string step' );

		gt.setTourCookie( secondTourName, numberStep );
		assertValidCookie( firstTourName, stringStep, 'First tour is still remembered after second is stored' );
		assertValidCookie( secondTourName, String( numberStep ), 'Second tour is also remembered' );

		$.cookie( cookieName, oldCookieValue, cookieParams );
	} );

	QUnit.test( 'convertToNewCookieFormat', 6, function ( assert ) {
		var newCookie = $.toJSON( {
			version: 1,
			tours: {
				sometour: {
					step: 2
				}
			}
		} ), newCookieMultipleTours = $.toJSON( {
			version: 1,
			tours: {
				firsttour: {
					step: 4
				},
				secondtour: {
					step: 2
				},
				thirdtour: {
					step: 3,
					firstArticleId: 38333
				}
			}
		} );

		assert.strictEqual(
			gt.convertToNewCookieFormat( null ),
			null,
			'Returns null for null parameter'
		);

		assert.strictEqual(
			gt.convertToNewCookieFormat( 'gt-test-3' ),
			$.toJSON( {
				version: 1,
				tours: {
					test: {
						step: '3'
					}
				}
			} ),
			'Valid tour ID is upgraded correctly'
		);

		assert.strictEqual(
			gt.convertToNewCookieFormat( newCookie ),
			newCookie,
			'Valid JSON cookie with single tour is preserved intact'
		);

		assert.strictEqual(
			gt.convertToNewCookieFormat( newCookieMultipleTours ),
			newCookieMultipleTours,
			'Valid JSON cookie with multiple tours is preserved intact'
		);

		assert.strictEqual(
			gt.convertToNewCookieFormat( '{"bad": "cookie"}' ),
			null,
			'Valid JSON with missing version field returns null'
		);

		assert.strictEqual(
			gt.convertToNewCookieFormat( '<invalid: JSON>' ),
			null,
			'Invalid JSON returns null'
		);
	} );

	QUnit.test( 'shouldShow', 19, function ( assert ) {
		var visualEditorArgs, wikitextArgs, mockOpenVE;

		visualEditorArgs = {
			tourName: 'visualeditorintro',
			userState: {
				version: 1,
				tours: {}
			},
			pageName: 'Page',
			articleId: 123,
			condition: 'VisualEditor'
		};

		wikitextArgs = {
			tourName: 'wikitextintro',
			userState: {
				version: 1,
				tours: {}
			},
			pageName: 'Page',
			articleId: 123,
			condition: 'wikitext'
		};

		mockOpenVE = {
			instances: [ {} ]
		};

		assertThrowsTypeAndMessage(
			assert,
			function () {
				return gt.shouldShowTour( {
					tourName: 'test',
					userState: {
						version: 1,
						tours: {
							test: {
								step: 1
							}
						}
					},
					pageName: 'Foo',
					articleId: 123,
					condition: 'bogus'
				} );
			},
			gt.TourDefinitionError,
			/'bogus' is not a supported condition/,
			'gt.TourDefinitionError	with correct error message for invalid condition'
		);

		assert.strictEqual(
			gt.shouldShowTour( {
				tourName: 'test',
				userState: {
					version: 1,
					tours: {
						test: {
							firstArticleId: 123,
							step: 1
						}
					}
				},
				pageName: 'Foo',
				articleId: 123,
				condition: 'stickToFirstPage'
			} ),
			true,
			'Returns true for stickToFirstPage when on the original article'
		);

		assert.strictEqual(
			gt.shouldShowTour( {
				tourName: 'test',
				userState: {
					version: 1,
					tours: {
						test: {
							firstArticleId: 123,
							step: 1
						}
					}
				},
				pageName: 'Foo',
				articleId: 987,
				condition: 'stickToFirstPage'
			} ),
			false,
			'Returns false for stickToFirstPage when on a different article'
		);

		assert.strictEqual(
			gt.shouldShowTour( {
				tourName: 'test',
				userState: {
					version: 1,
					tours: {
						test: {
							step: 1
						}
					}
				},
				pageName: 'Bar',
				articleId: 123
			} ),
			true,
			'Returns true when there is no condition'
		);

		assert.strictEqual(
			gt.shouldShowTour( {
				tourName: 'test',
				userState: {
					version: 1,
					tours: {
						test: {
							firstArticleId: 234,
							step: 1
						}
					}
				},
				pageName: 'Bar',
				articleId: 123
			} ),
			true,
			'Returns true when there is no condition even when there is a non-matching article ID in the cookie'
		);

		assert.strictEqual(
			gt.shouldShowTour( {
				tourName: 'test',
				userState: {
					version: 1,
					tours: {
						test: {},
						othertour: {
							firstArticleId: 234,
							step: 1
						}
					}
				},
				pageName: 'Bar',
				articleId: 123
			} ),
			true,
			'Returns true when there is no condition even when there is a non-matching article ID in the cookie, for another tour'
		);

		assert.strictEqual(
			gt.shouldShowTour( {
				tourName: 'test',
				userState: {
					version: 1,
					tours: {
						test: {
							firstSpecialPageName: 'Special:ImportantTask',
							step: 1
						}
					}
				},
				pageName: 'Special:ImportantTask',
				articleId: 0,
				condition: 'stickToFirstPage'
			} ),
			true,
			'Returns true for stickToFirstPage and matching special page'
		);

		assert.strictEqual(
			gt.shouldShowTour( {
				tourName: 'test',
				userState: {
					version: 1,
					tours: {
						test: {
							firstSpecialPageName: 'Special:ImportantTask',
							step: 1
						}
					}
				},
				pageName: 'Special:OtherTask',
				articleId: 0,
				condition: 'stickToFirstPage'
			} ),
			false,
			'Returns false for stickToFirstPage and different special page'
		);

		assert.strictEqual(
			gt.shouldShowTour( {
				tourName: 'secondtour',
				userState: {
					version: 1,
					tours: {
						firsttour: {
							firstArticleId: 123,
							step: 1
						},
						secondtour: {
							firstArticleId: 234,
							step: 2
						}
					}
				},
				pageName: 'Foo',
				articleId: 123,
				condition: 'stickToFirstPage'
			} ),
			false,
			'Returns false for stickToFirstPage for non-matching article ID when another tour\'s article ID matches'
		);

		// Mock the ve global, and its array of instances.
		window.ve = mockOpenVE;
		assert.strictEqual(
			gt.shouldShowTour( visualEditorArgs ),
			true,
			'Returns true for VisualEditor condition when VisualEditor open'
		);

		// ve = undefined deliberately applies to all of the below until it is
		// reset to a mock instance for the expected false text
		window.ve = undefined;
		mw.config.set( 'wgAction', 'view' );
		assert.strictEqual(
			gt.shouldShowTour( visualEditorArgs ),
			true,
			'Returns true for VisualEditor condition when viewing page with VE closed'
		);

		mw.config.set( 'wgAction', 'edit' );
		assert.strictEqual(
			gt.shouldShowTour( visualEditorArgs ),
			false,
			'Returns false for VisualEditor condition when in wikitext editor'
		);

		mw.config.set( 'wgAction', 'submit' );
		assert.strictEqual(
			gt.shouldShowTour( visualEditorArgs ),
			false,
			'Returns false for VisualEditor condition when reviewing wikitext changes'
		);

		mw.config.set( 'wgAction', 'edit' );
		assert.strictEqual(
			gt.shouldShowTour( wikitextArgs ),
			true,
			'Returns true for wikitext condition when editing wikitext'
		);

		mw.config.set( 'wgAction', 'submit' );
		assert.strictEqual(
			gt.shouldShowTour( wikitextArgs ),
			true,
			'Returns true for wikitext condition when reviewing wikitext'
		);

		mw.config.set( 'wgAction', 'view' );
		assert.strictEqual(
			gt.shouldShowTour( wikitextArgs ),
			true,
			'Returns true for wikitext condition when viewing page with VE closed'
		);

		window.ve = mockOpenVE;
		mw.config.set( 'wgAction', 'view' );
		assert.strictEqual(
			gt.shouldShowTour( wikitextArgs ),
			false,
			'Returns false for wikitext condition when VisualEditor is open'
		);

		assert.strictEqual(
			gt.shouldShowTour( {
				tourName: 'firsttour',
				userState: {
					version: 1,
					tours: {
						firsttour: {
							firstSpecialPageName: 'Special:ImportantTask',
							step: 1
						},
						secondtour: {
							firstSpecialPageName: 'Special:OtherTask',
							step: 2
						}
					}
				},
				pageName: 'Special:OtherTask',
				articleId: 0,
				condition: 'stickToFirstPage'
			} ),
			false,
			'Returns false for non-matching article ID when another tour\'s special page matches'
		);
	} );

	QUnit.test( 'defineTour', 13, function ( assert ) {
		var SPEC_MUST_BE_OBJECT = /Check your syntax. There must be exactly one argument, 'tourSpec', which must be an object\./,
			NAME_MUST_BE_STRING = /'tourSpec.name' must be a string, the tour name\./,
			STEPS_MUST_BE_ARRAY = /'tourSpec.steps' must be an array, a list of one or more steps/,
			VALID_TOUR_SPEC = {
				name: 'valid',

				steps: [ {
					title: 'First step title',
					description: 'Second step title',
					overlay: true,
					buttons: [ {
						action: 'next'
					} ]
				}, {
					title: 'Second step title',
					description: 'Second step description',
					overlay: true,
					buttons: [ {
						action: 'end'
					} ]
				} ]
			};

		// Suppress warnings that defineTour is deprecated
		this.suppressWarnings();

		assertThrowsTypeAndMessage(
			assert,
			function () {
				return gt.defineTour();
			},
			gt.TourDefinitionError,
			SPEC_MUST_BE_OBJECT,
			'gt.TourDefinitionError with correct error message for empty call'
		);

		assertThrowsTypeAndMessage(
			assert,
			function () {
				return gt.defineTour( VALID_TOUR_SPEC, VALID_DEFINE_TOUR_STEP_SPEC );
			},
			gt.TourDefinitionError,
			SPEC_MUST_BE_OBJECT,
			'gt.TourDefinitionError with correct error message for multiple parameters'
		);

		assertThrowsTypeAndMessage(
			assert,
			function () {
				return gt.defineTour( null );
			},
			gt.TourDefinitionError,
			SPEC_MUST_BE_OBJECT,
			'gt.TourDefinitionError with correct error message for null call'
		);

		assertThrowsTypeAndMessage(
			assert,
			function () {
				return gt.defineTour( {
					steps: [ VALID_DEFINE_TOUR_STEP_SPEC ]
				} );
			},
			gt.TourDefinitionError,
			NAME_MUST_BE_STRING,
			'gt.TourDefinitionError with correct error message for missing name'
		);

		assertThrowsTypeAndMessage(
			assert,
			function () {
				return gt.defineTour( {
					name: 'test',
					steps: VALID_DEFINE_TOUR_STEP_SPEC
				} );
			},
			gt.TourDefinitionError,
			STEPS_MUST_BE_ARRAY,
			'gt.TourDefinitionError with correct error message for object passed for steps'
		);

		assertThrowsTypeAndMessage(
			assert,
			function () {
				return gt.defineTour( {
					name: 'test'
				} );
			},
			gt.TourDefinitionError,
			STEPS_MUST_BE_ARRAY,
			'gt.TourDefinitionError with correct error message for missing steps'
		);

		assert.strictEqual(
			gt.defineTour( VALID_TOUR_SPEC ),
			true,
			'Valid tour is defined successfully'
		);

		this.restoreWarnings();
	} );

	QUnit.test( 'StepBuilder.constructor', 5, function ( assert ) {
		var STEP_NAME_MUST_BE_STRING = /'stepSpec.name\' must be a string, the step name/;

		assert.strictEqual(
			firstStepBuilder.constructor,
			gt.StepBuilder,
			'Valid StepBuilder constructed in setup is constructed normally'
		);

		assertThrowsTypeAndMessage(
			assert,
			function () {
				/*jshint unused: false*/
				var missingNameBuilder = new gt.StepBuilder( validTour, {
					position: 'bottom',
					attachTo: '#ca-edit'
				} );
			},
			gt.TourDefinitionError,
			STEP_NAME_MUST_BE_STRING,
			'gt.TourDefinitionError when name is missing'
		);

		assertThrowsTypeAndMessage(
			assert,
			function () {
				/*jshint unused: false*/
				var numericNameBuilder = new gt.StepBuilder( validTour, {
					name: 1,
					position: 'bottom',
					attachTo: '#ca-edit'
				} );
			},
			gt.TourDefinitionError,
			STEP_NAME_MUST_BE_STRING,
			'gt.TourDefinitionError when name is a Number'
		);
	} );

	QUnit.test( 'StepBuilder.listenForMwHooks', 6, function ( assert ) {
		var listenForMwHookSpy = this.spy( firstStepBuilder.step, 'listenForMwHook' );

		firstStepBuilder.listenForMwHooks();
		assert.strictEqual(
			listenForMwHookSpy.callCount,
			0,
			'If no hook names are passed, step.listenForMwHook should not be called'
		);

		firstStepBuilder.listenForMwHooks( 'StepBuilder.listenForMwHooks.happened' );
		assert.strictEqual(
			listenForMwHookSpy.callCount,
			1,
			'step.listenMwHook should be called once if a single hook name is passed'
		);
		assert.assertTrue(
			listenForMwHookSpy.calledWithExactly( 'StepBuilder.listenForMwHooks.happened' ),
			'step.listenMwHook should be called once with the correct hook name if a single hook name is passed'
		);

		listenForMwHookSpy.reset();
		firstStepBuilder.listenForMwHooks( 'StepBuilder.listenForMwHooks.one', 'StepBuilder.listenForMwHooks.another' );
		assert.strictEqual(
			listenForMwHookSpy.callCount,
			2,
			'step.listenMwHook should be called twice if two hook names are passed'
		);
		assert.assertTrue(
			listenForMwHookSpy.calledWithExactly( 'StepBuilder.listenForMwHooks.one' ),
			'step.listenMwHook should be called with the first hook name if multiple are passed'
		);
		assert.assertTrue(
			listenForMwHookSpy.calledWithExactly( 'StepBuilder.listenForMwHooks.another' ),
			'step.listenMwHook should be called with the second hook name if multiple are passed'
		);
	} );

	QUnit.test( 'StepBuilder.next', 14, function ( assert ) {
		var editStepBuilder, linkStepBuilder, previewStepBuilder, saveStepBuilder,
			pointsInvalidNameStepBuilder, pointsOtherTourStepBuilder,
			returnsInvalidNameCallbackStepBuilder,
			returnsOtherTourCallbackStepBuilder, VALUE_PASSED_NEXT_NOT_VALID_STEP,
			CALLBACK_PASSED_NEXT_RETURNED_INVALID;

		VALUE_PASSED_NEXT_NOT_VALID_STEP = /Value passed to \.next\(\) does not refer to a valid step/;
		CALLBACK_PASSED_NEXT_RETURNED_INVALID = /Callback passed to \.next\(\) returned invalid value/;

		function stepBuilderCallback() {
			return saveStepBuilder;
		}

		linkStepBuilder = validTourBuilder.step( {
			name: 'link'
		} );

		editStepBuilder = validTourBuilder.step( {
			name: 'edit'
		} );

		previewStepBuilder = validTourBuilder.step( {
			name: 'preview'
		} );

		saveStepBuilder = validTourBuilder.step( {
			name: 'save'
		} );

		pointsInvalidNameStepBuilder = validTourBuilder.step( {
			name: 'returnsToInvalidName'
		} );
		pointsInvalidNameStepBuilder.next( 'bogus' );
		assertThrowsTypeAndMessage(
			assert,
			function () {
				pointsInvalidNameStepBuilder.step.nextCallback();
			},
			gt.TourDefinitionError,
			VALUE_PASSED_NEXT_NOT_VALID_STEP,
			'nextCallback throws if an invalid (not present in current tour) step name was passed to next'
		);

		firstStepBuilder.next( 'link' );
		assert.strictEqual(
			firstStepBuilder.step.nextCallback(),
			linkStepBuilder.step,
			'Registers a callback that returns the correct Step, given a step name'
		);

		assertThrowsTypeAndMessage(
			assert,
			function () {
				firstStepBuilder.next( stepBuilderCallback );
			},
			gt.TourDefinitionError,
			/\.next\(\) can not be called more than once per StepBuilder/,
			'Multiple calls should trigger an error'
		);

		pointsOtherTourStepBuilder = validTourBuilder.step( {
			name: 'returnsToOtherTour'
		} );
		pointsOtherTourStepBuilder.next( otherTourStepBuilder );
		assertThrowsTypeAndMessage(
			assert,
			function () {
				pointsOtherTourStepBuilder.step.nextCallback();
			},
			gt.TourDefinitionError,
			VALUE_PASSED_NEXT_NOT_VALID_STEP,
			'nextCallback throws if a StepBuilder from a different Tour was passed to next'
		);


		linkStepBuilder.next( editStepBuilder );
		assert.strictEqual(
			linkStepBuilder.step.nextCallback(),
			editStepBuilder.step,
			'Registers a callback that returns the correct Step, given a StepBuilder'
		);

		returnsInvalidNameCallbackStepBuilder = validTourBuilder.step( {
			name: 'returnsInvalidNameCallback'
		} );
		returnsInvalidNameCallbackStepBuilder.next( function () {
			return 'bogus';
		} );
		assertThrowsTypeAndMessage(
			assert,
			function () {
				returnsInvalidNameCallbackStepBuilder.step.nextCallback();
			},
			gt.TourDefinitionError,
			CALLBACK_PASSED_NEXT_RETURNED_INVALID,
			'nextCallback throws if a callback that returns an invalid step name was passed to next'
		);

		editStepBuilder.next( function () {
			return 'preview';
		} );
		assert.strictEqual(
			editStepBuilder.step.nextCallback(),
			previewStepBuilder.step,
			'Registers a callback that returns the correct Step, given a callback returning a step name'
		);

		returnsOtherTourCallbackStepBuilder = validTourBuilder.step( {
			name: 'returnsToOtherTourCallback'
		} );
		returnsOtherTourCallbackStepBuilder.next( function () {
			return otherTourStepBuilder;
		} );
		assertThrowsTypeAndMessage(
			assert,
			function () {
				returnsOtherTourCallbackStepBuilder.step.nextCallback();
			},
			gt.TourDefinitionError,
			CALLBACK_PASSED_NEXT_RETURNED_INVALID,
			'nextCallback throws if a callback that returns a StepBuilder from a different Tour was passed to next'
		);

		previewStepBuilder.next( stepBuilderCallback );
		assert.strictEqual(
			previewStepBuilder.step.nextCallback(),
			saveStepBuilder.step,
			'Registers a callback that returns the correct Step, given a callback returning a StepBuilder'
		);
	} );

	QUnit.test( 'StepBuilder.transition', 14, function ( assert ) {
		var linkStepBuilder, editStepBuilder, previewStepBuilder,
			returnsInvalidNameCallbackStepBuilder,
			returnsOtherTourCallbackStepBuilder,
			returnsInvalidTransitionActionStepBuilder,
			parameterNotFunctionStepBuilder,
			CALLBACK_PASSED_TRANSITION_RETURNED_INVALID;

		CALLBACK_PASSED_TRANSITION_RETURNED_INVALID = /Callback passed to \.transition\(\) returned invalid value/;

		linkStepBuilder = validTourBuilder.step( { name: 'link' } );
		firstStepBuilder.transition( function () {
			return linkStepBuilder;
		} );
		assert.strictEqual(
			firstStepBuilder.step.transitionCallback(),
			linkStepBuilder.step,
			'Registers a callback that returns the correct Step, given a callback returning a StepBuilder'
		);

		editStepBuilder = validTourBuilder.step( { name: 'edit' } );
		linkStepBuilder.transition( function () {
			return 'edit';
		} );
		assert.strictEqual(
			linkStepBuilder.step.transitionCallback(),
			editStepBuilder.step,
			'Registers a callback that returns the correct Step, given a callback returning a step name'
		);

		editStepBuilder.transition( function () {
			return gt.TransitionAction.HIDE;
		} );
		assert.strictEqual(
			editStepBuilder.step.transitionCallback(),
			gt.TransitionAction.HIDE,
			'Valid TransitionAction (HIDE) is preserved'
		);

		previewStepBuilder = validTourBuilder.step( { name: 'preview' } );
		previewStepBuilder.transition( $.noop );
		assert.strictEqual(
			previewStepBuilder.step.transitionCallback(),
			previewStepBuilder.step,
			'Callback without an explicit return value is treated as returning the current step'
		);

		returnsInvalidNameCallbackStepBuilder = validTourBuilder.step( {
			name: 'returnsInvalidNameCallback'
		} );
		returnsInvalidNameCallbackStepBuilder.transition( function () {
			return 'bogus';
		} );
		assertThrowsTypeAndMessage(
			assert,
			function () {
				returnsInvalidNameCallbackStepBuilder.step.transitionCallback();
			},
			gt.TourDefinitionError,
			CALLBACK_PASSED_TRANSITION_RETURNED_INVALID,
			'transitionCallback throws if a callback that returns an invalid step name was passed to transition'
		);

		returnsOtherTourCallbackStepBuilder = validTourBuilder.step( {
			name: 'returnsToOtherTourCallback'
		} );
		returnsOtherTourCallbackStepBuilder.transition( function () {
			return otherTourStepBuilder;
		} );
		assertThrowsTypeAndMessage(
			assert,
			function () {
				returnsOtherTourCallbackStepBuilder.step.transitionCallback();
			},
			gt.TourDefinitionError,
			CALLBACK_PASSED_TRANSITION_RETURNED_INVALID,
			'transitionCallback throws if a callback that returns a StepBuilder from a different Tour was passed to transition'
		);

		returnsInvalidTransitionActionStepBuilder = validTourBuilder.step( {
			name: 'returnsInvalidTransitionAction'
		} );
		returnsInvalidTransitionActionStepBuilder.transition( function () {
			return 3;
		} );
		assertThrowsTypeAndMessage(
			assert,
			function () {
				returnsInvalidTransitionActionStepBuilder.step.transitionCallback();
			},
			gt.TourDefinitionError,
			/Callback passed to \.transition\(\) returned a number that is not a valid TransitionAction/,
			'transitionCallback throws if a callback returns a number that is not a valid TransitionAction'
		);

		assertThrowsTypeAndMessage(
			assert,
			function () {
				firstStepBuilder.transition( function () {
					return editStepBuilder;
				} );
			},
			gt.TourDefinitionError,
			/\.transition\(\) can not be called more than once per StepBuilder/,
			'Multiple calls should trigger an error'
		);

		parameterNotFunctionStepBuilder = validTourBuilder.step( {
			name: 'parameterNotFunctionStepBuilder'
		} );
		assertThrowsTypeAndMessage(
			assert,
			function () {
				parameterNotFunctionStepBuilder.transition( linkStepBuilder );
			},
			gt.TourDefinitionError,
			/\.transition\(\) takes one argument, a function/,
			'Throws if callback is not a function'
		);
	} );

	QUnit.test( 'Step.constructor', 5, function ( assert ) {
		var step = new gt.Step( validTour, {
				name: 'first'
			} );

		assert.strictEqual(
			step.tour,
			validTour,
			'Step is associated with its tour'
		);

		assert.strictEqual(
			step.specification.id,
			'gt-placeholder-first',
			'Step ID is correct'
		);

		assertThrowsTypeAndMessage(
			assert,
			function () {
				step.nextCallback();
			},
			gt.TourDefinitionError,
			/action: "next" used without calling \.next\(\) when building step/,
			'Error is flagged if Step is constructed, the nextCallback is used without calling .next() on builder'
		);

		assert.strictEqual(
			step.transitionCallback(),
			step,
			'By default, the transition callback returns the step it was called on'
		);
	} );

	QUnit.test( 'Step.getButtons', 6, function ( assert ) {
		var buttons = [
				{ flagType: 'destructive' },
				{ action: 'wikiLink', flagType: 'constructive' },
				{ action: 'externalLink' },
				{ action: 'back' },
				{ action: 'okay', onclick: function() {} },
				{ action: 'next' }
			],
			spy = this.spy( gt.Step.prototype, 'getButtons' ),
			tourBuilder = new gt.TourBuilder( { name: 'buttonsTest' } ),
			firstStepBuilder = tourBuilder.firstStep( $.extend( true, {}, { buttons: buttons }, VALID_BUILDER_STEP_SPEC ) ),
			firstStep = firstStepBuilder.step,
			returnedButtons;

		tourBuilder.tour.showStep( firstStep );
		returnedButtons = spy.lastCall.args[0].buttons;

		assert.ok(
			returnedButtons[0].html['class'].indexOf( 'mw-ui-destructive' ) &&
			returnedButtons[0].html['class'].indexOf( 'mw-ui-button' ) !== -1,
			'Custom button flagged as destructive'
		);
		assert.ok(
			returnedButtons[1].html['class'].indexOf( 'mw-ui-constructive' ) !== -1,
			'Internal link button flagged as constructive'
		);
		assert.ok(
			returnedButtons[2].html['class'].indexOf( 'mw-ui-progressive' ) === -1,
			'External link button is not progressive by default'
		);
		assert.ok(
			returnedButtons[3].html['class'].indexOf( 'mw-ui-progressive' ) === -1,
			'Back button is not progressive by default'
		);
		assert.ok(
			returnedButtons[4].html['class'].indexOf( 'mw-ui-progressive' ) !== -1,
			'Okay button is progressive by default'
		);
		assert.ok(
			returnedButtons[5].html['class'].indexOf( 'mw-ui-progressive' ) !== -1,
			'Next button is progressive by default'
		);
	} );

	QUnit.test( 'Step.registerMwHookListener', 4, function ( assert ) {
		var step = firstStepBuilder.step,
			HOOK_NAME = 'Step.registerMwHookListener.happened',
			// This lets us verify checkTransition is called (and which
			// arguments), but ignore any further behavior (e.g. showing
			// a step and TRANSITION_BEFORE_SHOW)
			checkTransitionStub, actualTransitionEvent, expectedTransitionEvent;

		checkTransitionStub = this.stub( step, 'checkTransition' ).returns( null );

		mw.hook( HOOK_NAME ).fire( 'first', 1 );
		step.registerMwHookListener( HOOK_NAME );

		assert.strictEqual(
			checkTransitionStub.callCount,
			0,
			'Memory firing should be ignored'
		);

		mw.hook( HOOK_NAME ).fire( 'second', 2 );
		assert.strictEqual(
			checkTransitionStub.callCount,
			1,
			'checkTransition should be called exactly once when there is a single mw.hook firing'
		);

		actualTransitionEvent = checkTransitionStub.lastCall.args[0];
		expectedTransitionEvent = new gt.TransitionEvent();
		expectedTransitionEvent.type = gt.TransitionEvent.MW_HOOK;
		expectedTransitionEvent.hookName = HOOK_NAME;
		expectedTransitionEvent.hookArguments = ['second', 2];

		assert.deepEqual(
			actualTransitionEvent,
			expectedTransitionEvent,
			'checkTransition should be called with the right TransitionEvent'
		);

		checkTransitionStub.reset();
		mw.hook( 'Step.registerMwHookListener.otherHook' ).fire( 'third', 3 );
		assert.strictEqual(
			checkTransitionStub.callCount,
			0,
			'checkTransition should not be called for hooks that were not registered'
		);
	} );

	QUnit.test( 'Step.registerMwHooks', 3, function ( assert ) {
		var step = firstStepBuilder.step,
			registerMwHookListenerSpy;
		registerMwHookListenerSpy = this.spy( step, 'registerMwHookListener' );

		step.listenForMwHook( 'Step.registerMwHooks.something' );
		step.listenForMwHook( 'Step.registerMwHooks.another' );

		step.registerMwHooks();
		assert.strictEqual(
			registerMwHookListenerSpy.callCount,
			2,
			'registerMwHookListener called once for each hook the step is listening for'
		);

		assert.assertTrue(
			registerMwHookListenerSpy.calledWithExactly( 'Step.registerMwHooks.something' ),
			'registerMwHookListener called with the first hook that is being listened for'
		);

		assert.assertTrue(
			registerMwHookListenerSpy.calledWithExactly( 'Step.registerMwHooks.another' ),
			'registerMwHookListener called with the second hook that is being listened for'
		);
	} );

	QUnit.test( 'Step.handleOnShow', 5, function ( assert ) {
		var showChangesStepBuilder = validTourBuilder.step( {
			name: 'showChanges'
		} ),
			showChangesStep = showChangesStepBuilder.step,
			singlePageTourBuilder = new gt.TourBuilder( {
				name: 'singlePage',
				isSinglePage: true
			} ),
			singlePageStepBuilder = singlePageTourBuilder.step( {
				name: 'beginning'
			} ),
			singlePageStep = singlePageStepBuilder.step,
			updateUserStateSpy = this.spy( gt, 'updateUserStateForTour' ),
			unregisterSpy = this.spy( gt.Step.prototype, 'unregisterMwHooks' );

		// Use an empty jQuery context for elem since we're not testing the logging
		// event registration currently.
		firstStep.handleOnShow( { id: firstStep.specification.id, elem: $() } );
		assert.strictEqual(
			unregisterSpy.callCount,
			0,
			'unregisterMwHooks is not called when the first step is shown'
		);
		assert.deepEqual(
			updateUserStateSpy.callCount,
			1,
			'For a regular (isSinglePage false) tour, updateUserStateForTour is called'
		);
		assert.strictEqual(
			validTour.currentStep,
			firstStep,
			'currentStep is set after handleShow'
		);

		unregisterSpy.reset();
		showChangesStep.handleOnShow( { id: showChangesStep.specification.id, elem: $() } );
		assert.strictEqual(
			unregisterSpy.thisValues[0],
			firstStep,
			'mw.hook listeners for prior current step are unregistered'
		);

		updateUserStateSpy.reset();
		singlePageStep.handleOnShow( { id: singlePageStep.specification.id, elem: $() } );
		assert.strictEqual(
			updateUserStateSpy.callCount,
			0,
			'For an isSinglePage true tour, updateUserStateForTour is never called'
		);
	} );

	QUnit.test( 'TourBuilder.constructor', 7, function ( assert ) {
		var CHECK_YOUR_SYNTAX = /Check your syntax. There must be exactly one argument, 'tourSpec', which must be an object/;

		assertThrowsTypeAndMessage(
			assert,
			function () {
				/*jshint unused: false*/
				var tour = new gt.TourBuilder();
			},
			gt.TourDefinitionError,
			CHECK_YOUR_SYNTAX,
			'Throws if no tour specification is passed'
		);

		assertThrowsTypeAndMessage(
			assert,
			function () {
				/*jshint unused: false*/
				var tour = new gt.TourBuilder( 'test' );
			},
			gt.TourDefinitionError,
			CHECK_YOUR_SYNTAX,
			'Throws if the tour specification is not an object'
		);

		assertThrowsTypeAndMessage(
			assert,
			function () {
				/*jshint unused: false*/
				var tour = new gt.TourBuilder( {
					tourName: 'test'
				} );
			},
			gt.TourDefinitionError,
			/'tourSpec.name' must be a string, the tour name/
		);

		assert.strictEqual(
			validTourBuilder.constructor,
			gt.TourBuilder,
			'Valid TourBuilder constructed in setup is constructed normally'
		);
	} );

	QUnit.test( 'TourBuilder.step', 3, function ( assert ) {
		var save1, save2;

		validTourBuilder.step( { name: 'preview' } );

		save1 = validTourBuilder.step( { name: 'save' } );

		assert.strictEqual(
			validTour.stepCount,
			3,
			'stepCount is correct after multiple calls'
		);

		assertThrowsTypeAndMessage(
			assert,
			function () {
				save2 = validTourBuilder.step( { name: 'save' } );
			},
			gt.TourDefinitionError,
			/The name "save" is already taken\.  Two steps in a tour can not have the same name/,
			'Step cname can not repeat'
		);
	} );

	QUnit.test( 'TourBuilder.firstStep', 2, function ( assert ) {
		var previewStepSpec = $.extend( {}, VALID_BUILDER_STEP_SPEC, { name: 'preview' } );

		assertThrowsTypeAndMessage(
			assert,
			function () {
				validTourBuilder.firstStep( previewStepSpec );
			},
			gt.TourDefinitionError,
			/You can only specify one first step/,
			'Verify that TourBuilder.first can call once per candidate'
		);
	} );

	QUnit.test( 'Tour.constructor', 1, function ( assert ) {
		var tour = new gt.Tour( {
			name: 'addImage'
		} );

		assert.strictEqual(
			gt.internal.definedTours[tour.name],
			tour,
			'Tour is defined in internal list after constructor'
		);
	} );

	QUnit.test( 'Tour.getShouldFlipHorizontally', 8, function ( assert ) {
		// Full coverage of all code paths

		var getStateStub, EXTENSION_NAME = 'extension', ONWIKI_NAME = 'onwiki',
			extensionTour, onwikiTour, $body = $( document.body ),
			$html = $( 'html' ), originalSiteDir, originalInterfaceDir;

		getStateStub = this.stub( mw.loader, 'getState' );
		getStateStub.withArgs( gt.internal.getTourModuleName( ONWIKI_NAME ) )
			.returns( null );

		getStateStub.withArgs( gt.internal.getTourModuleName( EXTENSION_NAME ) )
			.returns( 'loaded' );

		extensionTour = new gt.Tour( {
			name: EXTENSION_NAME
		} );

		onwikiTour = new gt.Tour( {
			name: ONWIKI_NAME
		} );

		originalSiteDir = $body.is( '.sitedir-ltr' ) ? 'ltr' : 'rtl';
		originalInterfaceDir = $( 'html' ).attr( 'dir' );

		$body.removeClass( 'sitedir-rtl' ).addClass( 'sitedir-ltr' );

		// There are two different directionalities
		// * Site as a whole (sitedir- class)
		// * User interface (html[dir])
		//
		// On wiki tours use the site language as their tour direction.
		// Extension tours don't care about site language; tour direction is ltr
		// Should flip if interface direction is different from tour direction

		$html.attr( 'dir', 'ltr' );
		assert.strictEqual(
			extensionTour.getShouldFlipHorizontally(),
			false,
			'No flip for extension tour when interface language and site language are both ltr'
		);
		assert.strictEqual(
			onwikiTour.getShouldFlipHorizontally(),
			false,
			'No flip for onwiki tour when interface language and site language are both ltr'
		);

		$html.attr( 'dir', 'rtl' );
		assert.strictEqual(
			extensionTour.getShouldFlipHorizontally(),
			true,
			'Flip for extension tour when interface language is rtl and site language is ltr'
		);
		assert.strictEqual(
			onwikiTour.getShouldFlipHorizontally(),
			true,
			'Flip for onwiki tour when interface language is rtl and site language is ltr'
		);

		$body.removeClass( 'sitedir-ltr' ).addClass( 'sitedir-rtl' );

		$html.attr( 'dir', 'ltr' );
		assert.strictEqual(
			extensionTour.getShouldFlipHorizontally(),
			false,
			'No flip for extension tour when interface language is ltr and site language is rtl'
		);
		assert.strictEqual(
			onwikiTour.getShouldFlipHorizontally(),
			true,
			'Flip for onwiki tour when interface language is ltr and site language is rtl'
		);

		$html.attr( 'dir', 'rtl' );
		assert.strictEqual(
			extensionTour.getShouldFlipHorizontally(),
			true,
			'Flip for extension tour when interface language is rtl and site language is rtl'
		);
		assert.strictEqual(
			onwikiTour.getShouldFlipHorizontally(),
			false,
			'No flip for onwiki tour when interface language and site language are both rtl'
		);

		$body.removeClass( 'sitedir-ltr sitedir-rtl' )
			.addClass( 'sitedir-' + originalSiteDir );

		$html.attr( 'dir', originalInterfaceDir );
	} );

	QUnit.test( 'Tour.initialize', 3, function ( assert ) {
		var stepInitializeSpy, previewStepBuilder;

		stepInitializeSpy = this.spy( gt.Step.prototype, 'initialize' );

		previewStepBuilder = validTourBuilder.step( {
			name: 'preview'
		} );

		validTour.initialize();
		assert.assertTrue(
			stepInitializeSpy.calledOn( firstStep ),
			'Initializing tour first time initializes first step'
		);
		assert.assertTrue(
			stepInitializeSpy.calledOn( previewStepBuilder.step ),
			'Initializing tour first time initializes other steps'
		);

		stepInitializeSpy.reset();
		validTour.initialize();
		assert.strictEqual(
			stepInitializeSpy.callCount,
			0,
			'Steps are not reinitialized if Tour.initialize is called again'
		);
	} );

	QUnit.test( 'Tour.getStep', 6, function ( assert ) {
		assert.strictEqual(
			validTour.getStep( 'intro' ),
			firstStep,
			'getStep can find step by name'
		);

		assert.strictEqual(
			validTour.getStep( firstStep ),
			firstStep,
			'getStep can validate that a Step belongs to the tour and return it'
		);

		assertThrowsTypeAndMessage(
			assert,
			function () {
				validTour.getStep( 'bogus' );
			},
			gt.IllegalArgumentError,
			/Step "bogus" not found in the "placeholder" tour/,
			'Throws if a step name is not found in the tour'
		);

		assertThrowsTypeAndMessage(
			assert,
			function () {
				validTour.getStep( otherTourStepBuilder.step );
			},
			gt.IllegalArgumentError,
			/Step object must belong to this tour \("placeholder"\)/,
			'Throws if a step object does not belong to the tour'
		);
	} );

	QUnit.test( 'Tour.showStep', 1, function ( assert ) {
		var checkTransitionSpy = this.spy( firstStep, 'checkTransition' ),
			actualTransitionEvent, expectedTransitionEvent;

		validTour.showStep( firstStep );
		actualTransitionEvent = checkTransitionSpy.lastCall.args[0];

		expectedTransitionEvent = new gt.TransitionEvent();
		expectedTransitionEvent.type = gt.TransitionEvent.BUILTIN;
		expectedTransitionEvent.subtype = gt.TransitionEvent.TRANSITION_BEFORE_SHOW;

		assert.deepEqual(
			actualTransitionEvent,
			expectedTransitionEvent,
			'Calls checkTransition with expected event'
		);

		gt.endTour();
	} );

	QUnit.test( 'Tour.start', 2, function ( assert ) {
		var tourBuilder = new gt.TourBuilder( {
			name: 'reference'
		} );
		assertThrowsTypeAndMessage(
			assert,
			function () {
				tourBuilder.tour.start();
			},
			gt.TourDefinitionError,
			/The \.firstStep\(\) method must be called for all tours/,
			'Throws if firstStep was not called'
		);
	} );
} ( mediaWiki, jQuery ) );
