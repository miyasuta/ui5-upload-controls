/*!
 * ${copyright}
 */

import RenderManager from "sap/ui/core/RenderManager";
import SingleFileUpload from "./SingleFileUpload";

/**
 * SingleFileUpload renderer.
 * @namespace
 */
const SingleFileUploadRenderer = {
	apiVersion: 2, // usage of DOM Patcher

	/**
	 * Renders the HTML for the given control, using the provided {@link RenderManager}.
	 *
	 * @param {RenderManager} rm The reference to the <code>sap.ui.core.RenderManager</code>
	 * @param {SingleFileUpload} control The control instance to be rendered
	 */
	render: function (rm: RenderManager, control: SingleFileUpload) {
		rm.openStart("div", control);
		rm.class("miyasutaSingleFileUpload");
		rm.openEnd();

		// Render filename download link (visible only when a file exists)
		const filenameLink = control.getAggregation("_filenameLink") as import("sap/m/Link").default;
		if (filenameLink) {
			rm.renderControl(filenameLink);
		}

		// Render the internal FileUploader
		const fileUploader = control.getAggregation("_fileUploader") as import("sap/ui/unified/FileUploader").default;
		if (fileUploader) {
			rm.renderControl(fileUploader);
		}

		rm.close("div");
	}
};

export default SingleFileUploadRenderer;
