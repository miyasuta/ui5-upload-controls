// @ts-nocheck

/*global QUnit */
// eslint-disable-next-line no-undef
sap.ui.define([
	"sap/ui/qunit/utils/createAndAppendDiv",
	"miyasuta/ui5uploadcontrols/SingleFileUpload"
], function(createAndAppendDiv, SingleFileUpload) {
	"use strict";

	// prepare DOM
	createAndAppendDiv("uiArea1");

	QUnit.module("SingleFileUpload Tests");

	QUnit.test("Test get properties", function(assert) {
		assert.expect(3);
		const oControl = new SingleFileUpload({
			fileNameProperty: "fileName",
			contentProperty: "content",
			draftOnly: true
		});
		assert.equal(oControl.getFileNameProperty(), "fileName", "Check fileNameProperty");
		assert.equal(oControl.getContentProperty(), "content", "Check contentProperty");
		assert.equal(oControl.getDraftOnly(), true, "Check draftOnly");
	});

});
