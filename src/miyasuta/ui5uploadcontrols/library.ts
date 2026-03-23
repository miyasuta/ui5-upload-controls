/*!
 * ${copyright}
 */

import Lib from "sap/ui/core/Lib";

/**
 * Initialization Code and shared classes of library miyasuta.ui5uploadcontrols.
 */

// delegate further initialization of this library to the Core
// Hint: sap.ui.getCore() must still be used here to support preload with sync bootstrap!
Lib.init({
	name: "miyasuta.ui5uploadcontrols",
	version: "${version}",
	dependencies: [ // keep in sync with the ui5.yaml and .library files
		"sap.ui.core",
		"sap.m",
		"sap.ui.unified"
	],
	types: [],
	interfaces: [],
	controls: [
		"miyasuta.ui5uploadcontrols.SingleFileUpload",
		"miyasuta.ui5uploadcontrols.MultiFileUpload"
	],
	elements: [],
	noLibraryCSS: false, // if no CSS is provided, you can disable the library.css load here
	apiVersion: 2,
});