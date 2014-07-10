// Guided Tour to help users make their first edit.
// Designed to work on any Wikipedia article, and can work for other sites with minor message changes.

( function ( window, document, $, mw, gt ) {
	var hasEditSectionAtLoadTime, editSectionSelector = '.mw-editsection-visualeditor',
		tabMessages, editTabText, editSectionText, editPageDescription, editPageButtons = [],
		editSectionDescription, tour, introStep, editSectionStep,
		pointSavePageStep,
			// Work around jQueryMsg issue (\u00A0 is a non-breaking space (i.e. &nbsp;))
			NBSP = '\u00A0';

	function shouldShowForPage() {
		// Excludes pages outside the main namespace and pages with editing restrictions
		// Should be 'pages that are not in content namespaces'.
		// However, the list of content namespaces isn't currently exposed to JS.
		return ( mw.config.get( 'wgCanonicalNamespace' ) === '' && mw.config.get( 'wgIsProbablyEditable' ) );
	}

	// If we shouldn't show it, don't initialize the guiders
	if ( !shouldShowForPage() ) {
		return;
	}

	function hasEditSection() {
		return $( editSectionSelector ).length > 0;
	}

	function handleVeChange( transitionEvent ) {
		var isSaveButtonDisabled;

		if ( transitionEvent.type === gt.TransitionEvent.MW_HOOK ) {
			if ( transitionEvent.hookName === 've.toolbarSaveButton.stateChanged' ) {
				isSaveButtonDisabled = transitionEvent.hookArguments[0];
				if ( !isSaveButtonDisabled ) {
					return pointSavePageStep;
				}
			}

			return gt.TransitionAction.HIDE;
		}
	}


	hasEditSectionAtLoadTime = $( editSectionSelector ).length > 0;

	tabMessages = mw.config.get( 'wgVisualEditorConfig' ).tabMessages;

	editTabText = mw.message( 'vector-view-edit' ).parse();
	if ( tabMessages.editappendix !== null ) {
		editTabText += NBSP + mw.message( tabMessages.editappendix ).parse();
	}
	editPageDescription = mw.message( 'guidedtour-tour-firsteditve-edit-page-description', editTabText ).parse();

	editSectionText = mw.message( 'editsection' ).parse();
	if ( tabMessages.editsectionappendix !== null ) {
		editSectionText += NBSP + mw.message( tabMessages.editsectionappendix ).parse();
	}
	editSectionDescription = mw.message(
		'guidedtour-tour-firsteditve-edit-section-description', editSectionText
	).parse();

	// Setup edit page buttons
	if ( hasEditSectionAtLoadTime ) {
		editPageButtons.push( {
			action: 'next'
		} );
	} else {
		editPageButtons.push( {
			namemsg: 'guidedtour-okay-button',
			onclick: function () {
				if ( hasEditSection() ) {
					mw.libs.guiders.next();
				} else {
					mw.libs.guiders.hideAll();
				}
			}
		} );
	}

	tour = new gt.TourBuilder( {
		name: 'firsteditve',
		shouldLog: true,
		showConditionally: 'VisualEditor'
	} );

	introStep = tour.firstStep( {
		name: 'intro',
		titlemsg: 'guidedtour-tour-firstedit-edit-page-title',
		description: editPageDescription,
		position: 'bottom',
		attachTo: '#ca-ve-edit',
		buttons: editPageButtons,
		allowAutomaticNext: false,
		allowAutomaticOkay: false
	// Tour-level listeners would avoid repeating this for two steps
	} ).listenForMwHooks( 've.activationComplete', 've.toolbarSaveButton.stateChanged' )
		.transition( handleVeChange )
		.next( 'editSection' );

	editSectionStep = tour.step( {
		name: 'editSection',
		titlemsg: 'guidedtour-tour-firstedit-edit-section-title',
		description: editSectionDescription,
		position: 'right',
		attachTo: editSectionSelector,
		width: 300
	} ).listenForMwHooks( 've.activationComplete', 've.toolbarSaveButton.stateChanged' )
		.transition( function ( transitionEvent ) {
			if ( transitionEvent.type === gt.TransitionEvent.BUILTIN &&
			     !hasEditSection() ) {
				return gt.TransitionAction.HIDE;
			} else {
				return handleVeChange( transitionEvent );
			}
		} )
		.back( 'intro' );

	pointSavePageStep = tour.step( {
		name: 'pointSavePage',
		titlemsg: 'guidedtour-tour-firstedit-save-title',
		descriptionmsg: 'guidedtour-tour-firsteditve-save-description',
		attachTo: '.ve-ui-toolbar-saveButton',
		position: 'bottomRight',
		closeOnClickOutside: false
	} ).listenForMwHooks( 've.deactivationComplete' )
		.transition( function () {
			if ( !gt.isEditing() ) {
				return gt.TransitionAction.END;
			}
		} );

} (window, document, jQuery, mediaWiki, mediaWiki.guidedTour ) );
