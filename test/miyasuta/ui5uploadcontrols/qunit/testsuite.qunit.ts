// eslint-disable-next-line no-undef
sap.ui.define(function() {
	"use strict";

	return {
		name: "QUnit TestSuite for miyasuta.ui5uploadcontrols",
		defaults: {
			bootCore: true,
			ui5: {
				libs: "sap.ui.core,miyasuta.ui5uploadcontrols",
				theme: "sap_fiori_3",
				noConflict: true,
				preload: "auto"
			},
			qunit: {
				version: 2,
				reorder: false
			},
			sinon: {
				version: 4,
				qunitBridge: true,
				useFakeTimers: false
			},
			module: "./{name}.qunit"
		},
		tests: {
			// test file for the SingleFileUpload control
			SingleFileUpload: {
				title: "QUnit Test for SingleFileUpload",
				_alternativeTitle: "QUnit tests: miyasuta.ui5uploadcontrols.SingleFileUpload"
			}
		}
	};

});
