/*!
 * ${copyright}
 */

import RenderManager from "sap/ui/core/RenderManager";
import MultiFileUpload from "./MultiFileUpload";
import Table from "sap/m/Table";

/**
 * MultiFileUpload renderer.
 * @namespace
 */
const MultiFileUploadRenderer = {
	apiVersion: 2, // usage of DOM Patcher

	/**
	 * Renders the HTML for the given control, using the provided {@link RenderManager}.
	 *
	 * @param {RenderManager} rm The reference to the <code>sap.ui.core.RenderManager</code>
	 * @param {MultiFileUpload} control The control instance to be rendered
	 */
	render: function (rm: RenderManager, control: MultiFileUpload) {
		rm.openStart("div", control);
		rm.class("miyasutaMultiFileUpload");
		rm.openEnd();

		const table = control.getAggregation("_table") as Table;
		if (table) {
			rm.renderControl(table);
		}

		rm.close("div");
	}
};

export default MultiFileUploadRenderer;
