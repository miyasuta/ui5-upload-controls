// @ts-nocheck

/*global QUnit, sinon */
// eslint-disable-next-line no-undef
sap.ui.define([
	"sap/ui/qunit/utils/createAndAppendDiv",
	"miyasuta/ui5uploadcontrols/SingleFileUpload",
	"sap/ui/core/Core"
], function(createAndAppendDiv, SingleFileUpload, Core) {
	"use strict";

	// prepare DOM
	createAndAppendDiv("uiArea1");

	// ─── Properties ────────────────────────────────────────────────────────────

	QUnit.module("SingleFileUpload - Properties");

	QUnit.test("getters return configured values", function(assert) {
		const oControl = new SingleFileUpload({
			fileNameProperty: "fileName",
			contentProperty: "content",
			draftOnly: true
		});
		assert.equal(oControl.getFileNameProperty(), "fileName", "fileNameProperty");
		assert.equal(oControl.getContentProperty(), "content", "contentProperty");
		assert.equal(oControl.getDraftOnly(), true, "draftOnly");
		oControl.destroy();
	});

	QUnit.test("default values are correct", function(assert) {
		const oControl = new SingleFileUpload();
		assert.strictEqual(oControl.getFileNameProperty(), "", "fileNameProperty default is empty string (UI5 normalizes null to '' for string type)");
		assert.strictEqual(oControl.getContentProperty(), "content", "contentProperty default is 'content'");
		assert.strictEqual(oControl.getDraftOnly(), true, "draftOnly default is true");
		oControl.destroy();
	});

	// ─── Rendering ─────────────────────────────────────────────────────────────

	QUnit.module("SingleFileUpload - Rendering", {
		beforeEach: function() {
			this.oControl = new SingleFileUpload({
				fileNameProperty: "fileName",
				contentProperty: "content"
			});
			this.oControl.placeAt("uiArea1");
			Core.applyChanges();
		},
		afterEach: function() {
			this.oControl.destroy();
		}
	});

	QUnit.test("renders wrapper div with correct CSS class", function(assert) {
		const oDomRef = this.oControl.getDomRef();
		assert.ok(oDomRef, "DOM element exists after placeAt");
		assert.ok(oDomRef.classList.contains("miyasutaSingleFileUpload"), "wrapper div has miyasutaSingleFileUpload class");
	});

	QUnit.test("internal FileUploader is rendered inside wrapper", function(assert) {
		const oDomRef = this.oControl.getDomRef();
		const oFileUploaderDom = oDomRef.querySelector(".sapUiFileUploader, input[type='file']");
		assert.ok(oFileUploaderDom, "FileUploader element found inside wrapper div");
	});

	// ─── Upload Logic ──────────────────────────────────────────────────────────

	QUnit.module("SingleFileUpload - Upload Logic", {
		beforeEach: function() {
			this.oControl = new SingleFileUpload({
				fileNameProperty: "fileName",
				contentProperty: "content"
			});
			this.fetchStub = sinon.stub(window, "fetch");
		},
		afterEach: function() {
			this.fetchStub.restore();
			this.oControl.destroy();
		}
	});

	QUnit.test("does nothing when file list is empty", function(assert) {
		const done = assert.async();
		const mockEvent = { getParameter: () => [] };

		this.oControl._onFileChange(mockEvent).then(function() {
			assert.equal(this.fetchStub.callCount, 0, "fetch not called when files is empty");
			done();
		}.bind(this));
	});

	QUnit.test("does nothing when no binding context", function(assert) {
		const done = assert.async();
		const mockFile = new File(["content"], "test.txt", { type: "text/plain" });
		const mockEvent = { getParameter: () => [mockFile] };

		this.oControl._onFileChange(mockEvent).then(function() {
			assert.equal(this.fetchStub.callCount, 0, "fetch not called when binding context is absent");
			done();
		}.bind(this));
	});

	QUnit.test("fetches CSRF token from service URL before upload", function(assert) {
		const done = assert.async();

		const mockContext = {
			getPath: function() { return "/Quotations(guid'123')"; },
			getModel: function() { return { getServiceUrl: function() { return "/odata/v4/quote/"; } }; },
			getObject: function() { return { IsActiveEntity: false }; }
		};
		sinon.stub(this.oControl, "getBindingContext").returns(mockContext);

		// Call 0: CSRF token GET
		this.fetchStub.onCall(0).resolves(new Response(null, {
			status: 200,
			headers: { "x-csrf-token": "test-token" }
		}));
		// Call 1: PATCH, Call 2: PUT
		this.fetchStub.resolves(new Response(null, { status: 200 }));

		const mockFile = new File(["hello"], "myfile.txt", { type: "text/plain" });
		const mockEvent = { getParameter: () => [mockFile] };

		this.oControl._onFileChange(mockEvent).then(function() {
			const csrfCall = this.fetchStub.getCall(0);
			assert.equal(csrfCall.args[0], "/odata/v4/quote", "CSRF token fetched from service URL (trailing slash removed)");
			assert.equal(csrfCall.args[1].headers["x-csrf-token"], "Fetch", "CSRF request uses 'Fetch' header value");
			assert.equal(csrfCall.args[1].method, "GET", "CSRF request is GET");
			done();
		}.bind(this));
	});

	QUnit.test("clears FileUploader after successful upload", function(assert) {
		const done = assert.async();

		const mockContext = {
			getPath: function() { return "/Quotations(guid'123')"; },
			getModel: function() { return { getServiceUrl: function() { return "/odata/v4/quote/"; } }; },
			getObject: function() { return { IsActiveEntity: false }; },
			refresh: function() {}
		};
		sinon.stub(this.oControl, "getBindingContext").returns(mockContext);

		this.fetchStub.onCall(0).resolves(new Response(null, {
			status: 200,
			headers: { "x-csrf-token": "test-token" }
		}));
		this.fetchStub.resolves(new Response(null, { status: 200 }));

		const oFileUploader = this.oControl.getAggregation("_fileUploader");
		const clearSpy = sinon.spy(oFileUploader, "clear");

		const mockFile = new File(["hello"], "myfile.txt", { type: "text/plain" });
		const mockEvent = { getParameter: () => [mockFile] };

		this.oControl._onFileChange(mockEvent).then(function() {
			assert.ok(clearSpy.calledOnce, "FileUploader.clear() called once after upload");
			done();
		}.bind(this));
	});

	QUnit.test("shows delete button after successful upload", function(assert) {
		const done = assert.async();

		const mockContext = {
			getPath: function() { return "/Quotations(guid'123')"; },
			getModel: function() { return { getServiceUrl: function() { return "/odata/v4/quote/"; } }; },
			getObject: function() { return { IsActiveEntity: false }; },
			refresh: function() {}
		};
		sinon.stub(this.oControl, "getBindingContext").returns(mockContext);

		this.fetchStub.onCall(0).resolves(new Response(null, {
			status: 200,
			headers: { "x-csrf-token": "test-token" }
		}));
		this.fetchStub.resolves(new Response(null, { status: 200 }));

		const mockFile = new File(["hello"], "myfile.txt", { type: "text/plain" });
		const mockEvent = { getParameter: () => [mockFile] };

		this.oControl._onFileChange(mockEvent).then(function() {
			const oButton = this.oControl.getAggregation("_deleteButton");
			assert.strictEqual(oButton.getVisible(), true, "delete button is visible after upload");
			assert.strictEqual(oButton.getEnabled(), true, "delete button is enabled after upload");
			done();
		}.bind(this));
	});

	QUnit.test("PATCHes filename then PUTs binary content with CSRF token", function(assert) {
		const done = assert.async();

		const mockContext = {
			getPath: function() { return "/Quotations(guid'123')"; },
			getModel: function() { return { getServiceUrl: function() { return "/odata/v4/quote/"; } }; },
			getObject: function() { return { IsActiveEntity: false }; }
		};
		sinon.stub(this.oControl, "getBindingContext").returns(mockContext);

		this.fetchStub.onCall(0).resolves(new Response(null, {
			status: 200,
			headers: { "x-csrf-token": "test-token" }
		}));
		this.fetchStub.resolves(new Response(null, { status: 200 }));

		const mockFile = new File(["hello"], "myfile.txt", { type: "text/plain" });
		const mockEvent = { getParameter: () => [mockFile] };

		this.oControl._onFileChange(mockEvent).then(function() {
			assert.equal(this.fetchStub.callCount, 3, "fetch called 3 times: CSRF + PATCH + PUT");

			const patchCall = this.fetchStub.getCall(1);
			assert.equal(patchCall.args[0], "/odata/v4/quote/Quotations(guid'123')", "PATCH targets entity URL");
			assert.equal(patchCall.args[1].method, "PATCH", "second call is PATCH");
			assert.equal(patchCall.args[1].headers["x-csrf-token"], "test-token", "PATCH sends CSRF token");

			const patchBody = JSON.parse(patchCall.args[1].body);
			assert.equal(patchBody.fileName, "myfile.txt", "PATCH body contains file name under fileNameProperty key");

			const putCall = this.fetchStub.getCall(2);
			assert.equal(putCall.args[0], "/odata/v4/quote/Quotations(guid'123')/content", "PUT targets content property URL");
			assert.equal(putCall.args[1].method, "PUT", "third call is PUT");
			assert.equal(putCall.args[1].headers["x-csrf-token"], "test-token", "PUT sends CSRF token");
			assert.strictEqual(putCall.args[1].body, mockFile, "PUT body is the File object");

			done();
		}.bind(this));
	});

	QUnit.test("uses custom contentProperty in PUT URL", function(assert) {
		const done = assert.async();

		const oControl = new SingleFileUpload({
			fileNameProperty: "attachmentName",
			contentProperty: "binaryData"
		});
		const fetchStub = this.fetchStub;

		const mockContext = {
			getPath: function() { return "/Items(1)"; },
			getModel: function() { return { getServiceUrl: function() { return "/odata/v4/items/"; } }; },
			getObject: function() { return {}; }
		};
		sinon.stub(oControl, "getBindingContext").returns(mockContext);

		fetchStub.onCall(0).resolves(new Response(null, {
			status: 200,
			headers: { "x-csrf-token": "tok" }
		}));
		fetchStub.resolves(new Response(null, { status: 200 }));

		const mockFile = new File(["data"], "report.pdf", { type: "application/pdf" });
		const mockEvent = { getParameter: () => [mockFile] };

		oControl._onFileChange(mockEvent).then(function() {
			const putCall = fetchStub.getCall(2);
			assert.equal(putCall.args[0], "/odata/v4/items/Items(1)/binaryData", "PUT URL uses custom contentProperty");
			assert.equal(putCall.args[1].headers["Content-Type"], "application/pdf", "PUT Content-Type matches file type");
			oControl.destroy();
			done();
		});
	});

	// ─── draftOnly=false Flow ─────────────────────────────────────────────────

	QUnit.module("SingleFileUpload - draftOnly=false Flow", {
		beforeEach: function() {
			this.oControl = new SingleFileUpload({ fileNameProperty: "fileName", contentProperty: "content", draftOnly: false });
			this.fetchStub = sinon.stub(window, "fetch");
		},
		afterEach: function() {
			this.fetchStub.restore();
			this.oControl.destroy();
		}
	});

QUnit.test("full lifecycle: draftEdit → PATCH → PUT → draftActivate (5 fetch calls)", function(assert) {
		const done = assert.async();

		// Arrange: stub binding context (IsActiveEntity=true → active entity)
		sinon.stub(this.oControl, "getBindingContext").returns({
			getPath: function() { return "/Quotations(ID=guid'123',IsActiveEntity=true)"; },
			getModel: function() { return { getServiceUrl: function() { return "/odata/v4/quote/"; } }; },
			getObject: function() { return { IsActiveEntity: true }; }
		});

		// Use plain mock objects to avoid potential browser issues with Response bodies
		this.fetchStub.callsFake(function(url, options) {
			const count = this.fetchStub.callCount - 1;
			if (count === 0) {
				// CSRF
				return Promise.resolve({ ok: true, status: 200, headers: { get: function(name) { return name === "x-csrf-token" ? "csrf-token" : null; } } });
			} else if (count === 1) {
				// draftEdit
				return Promise.resolve({ ok: true, status: 200, json: function() { return Promise.resolve({ "@odata.id": "Quotations(ID=guid'123',IsActiveEntity=false)" }); } });
			}
			return Promise.resolve({ ok: true, status: 200 });
		}.bind(this));

		const mockFile = new File(["hello"], "report.pdf", { type: "application/pdf" });
		const mockEvent = { getParameter: () => [mockFile] };

		this.oControl._onFileChange(mockEvent).then(function() {
			assert.equal(this.fetchStub.callCount, 5, "fetch called 5 times");

			// Call 0: CSRF
			assert.equal(this.fetchStub.getCall(0).args[1].method, "GET", "call 0 is CSRF GET");

			// Call 1: draftEdit
			const draftEditCall = this.fetchStub.getCall(1);
			assert.equal(draftEditCall.args[0], "/odata/v4/quote/Quotations(ID=guid'123',IsActiveEntity=true)/draftEdit", "call 1 is draftEdit");
			assert.equal(draftEditCall.args[1].method, "POST", "draftEdit is POST");
			assert.equal(draftEditCall.args[1].headers["x-csrf-token"], "csrf-token", "draftEdit sends CSRF token");

			// Call 2: PATCH to draft entity URL
			const patchCall = this.fetchStub.getCall(2);
			assert.equal(patchCall.args[0], "/odata/v4/quote/Quotations(ID=guid'123',IsActiveEntity=false)", "call 2 PATCHes draft entity URL");
			assert.equal(patchCall.args[1].method, "PATCH", "call 2 is PATCH");
			assert.equal(patchCall.args[1].headers["x-csrf-token"], "csrf-token", "PATCH sends CSRF token");
			const patchBody = JSON.parse(patchCall.args[1].body);
			assert.equal(patchBody.fileName, "report.pdf", "PATCH body contains file name");

			// Call 3: PUT to draft content URL
			const putCall = this.fetchStub.getCall(3);
			assert.equal(putCall.args[0], "/odata/v4/quote/Quotations(ID=guid'123',IsActiveEntity=false)/content", "call 3 PUTs to draft content URL");
			assert.equal(putCall.args[1].method, "PUT", "call 3 is PUT");
			assert.strictEqual(putCall.args[1].body, mockFile, "PUT body is the File object");

			// Call 4: draftActivate
			const activateCall = this.fetchStub.getCall(4);
			assert.equal(activateCall.args[0], "/odata/v4/quote/Quotations(ID=guid'123',IsActiveEntity=false)/draftActivate", "call 4 is draftActivate");
			assert.equal(activateCall.args[1].method, "POST", "draftActivate is POST");
			assert.equal(activateCall.args[1].headers["x-csrf-token"], "csrf-token", "draftActivate sends CSRF token");

			done();
		}.bind(this)).catch(function(err) {
			assert.ok(false, "Promise rejected: " + (err && err.message || err));
			done();
		});
	});

	QUnit.test("does NOT call draftEdit when IsActiveEntity=false (already in draft mode)", function(assert) {
		const done = assert.async();

		sinon.stub(this.oControl, "getBindingContext").returns({
			getPath: function() { return "/Quotations(ID=guid'123',IsActiveEntity=false)"; },
			getModel: function() { return { getServiceUrl: function() { return "/odata/v4/quote/"; } }; },
			getObject: function() { return { IsActiveEntity: false }; }
		});
		this.fetchStub.callsFake(function() {
			const count = this.fetchStub.callCount - 1;
			if (count === 0) {
				return Promise.resolve({ ok: true, status: 200, headers: { get: function(name) { return name === "x-csrf-token" ? "tok" : null; } } });
			}
			return Promise.resolve({ ok: true, status: 200 });
		}.bind(this));

		const mockFile = new File(["hello"], "report.pdf", { type: "application/pdf" });
		const mockEvent = { getParameter: () => [mockFile] };

		this.oControl._onFileChange(mockEvent).then(function() {
			assert.equal(this.fetchStub.callCount, 3, "fetch called 3 times (CSRF + PATCH + PUT), no draftEdit");
			assert.equal(this.fetchStub.getCall(1).args[1].method, "PATCH", "second call is PATCH (not draftEdit)");
			done();
		}.bind(this)).catch(function(err) {
			assert.ok(false, "Promise rejected: " + (err && err.message || err));
			done();
		});
	});

	QUnit.test("does NOT call draftEdit for non-draft entity (IsActiveEntity absent)", function(assert) {
		const done = assert.async();

		sinon.stub(this.oControl, "getBindingContext").returns({
			getPath: function() { return "/Items(1)"; },
			getModel: function() { return { getServiceUrl: function() { return "/odata/v4/items/"; } }; },
			getObject: function() { return {}; }
		});
		this.fetchStub.callsFake(function() {
			const count = this.fetchStub.callCount - 1;
			if (count === 0) {
				return Promise.resolve({ ok: true, status: 200, headers: { get: function(name) { return name === "x-csrf-token" ? "tok" : null; } } });
			}
			return Promise.resolve({ ok: true, status: 200 });
		}.bind(this));

		const mockFile = new File(["hello"], "report.pdf", { type: "application/pdf" });
		const mockEvent = { getParameter: () => [mockFile] };

		this.oControl._onFileChange(mockEvent).then(function() {
			assert.equal(this.fetchStub.callCount, 3, "fetch called 3 times (CSRF + PATCH + PUT), no draftEdit");
			done();
		}.bind(this)).catch(function(err) {
			assert.ok(false, "Promise rejected: " + (err && err.message || err));
			done();
		});
	});

	// ─── Draft Detection ───────────────────────────────────────────────────────

	QUnit.module("SingleFileUpload - Draft Detection");

	QUnit.test("FileUploader disabled when IsActiveEntity=true and draftOnly=true", function(assert) {
		const oControl = new SingleFileUpload({ fileNameProperty: "fileName", draftOnly: true });
		sinon.stub(oControl, "getBindingContext").returns({
			getPath: function() { return "/Items(1)"; },
			getModel: function() { return { getServiceUrl: function() { return "/odata/v4/items/"; } }; },
			getObject: function() { return { IsActiveEntity: true, fileName: "" }; }
		});
		oControl.placeAt("uiArea1");
		Core.applyChanges();

		assert.strictEqual(oControl.getAggregation("_fileUploader").getEnabled(), false, "FileUploader is disabled in display mode");
		oControl.destroy();
	});

	QUnit.test("FileUploader enabled when IsActiveEntity=false (draft mode)", function(assert) {
		const oControl = new SingleFileUpload({ draftOnly: true });
		sinon.stub(oControl, "getBindingContext").returns({
			getPath: function() { return "/Items(1)"; },
			getModel: function() { return { getServiceUrl: function() { return "/odata/v4/items/"; } }; },
			getObject: function() { return { IsActiveEntity: false }; }
		});
		oControl.placeAt("uiArea1");
		Core.applyChanges();

		assert.strictEqual(oControl.getAggregation("_fileUploader").getEnabled(), true, "FileUploader is enabled in draft (edit) mode");
		oControl.destroy();
	});

	QUnit.test("FileUploader enabled when IsActiveEntity is not present (non-draft entity)", function(assert) {
		const oControl = new SingleFileUpload({ draftOnly: true });
		sinon.stub(oControl, "getBindingContext").returns({
			getPath: function() { return "/Items(1)"; },
			getModel: function() { return { getServiceUrl: function() { return "/odata/v4/items/"; } }; },
			getObject: function() { return {}; }
		});
		oControl.placeAt("uiArea1");
		Core.applyChanges();

		assert.strictEqual(oControl.getAggregation("_fileUploader").getEnabled(), true, "FileUploader is enabled for non-draft entity");
		oControl.destroy();
	});

	QUnit.test("FileUploader enabled when draftOnly=false even if IsActiveEntity=true", function(assert) {
		const oControl = new SingleFileUpload({ draftOnly: false });
		sinon.stub(oControl, "getBindingContext").returns({
			getPath: function() { return "/Items(1)"; },
			getModel: function() { return { getServiceUrl: function() { return "/odata/v4/items/"; } }; },
			getObject: function() { return { IsActiveEntity: true }; }
		});
		oControl.placeAt("uiArea1");
		Core.applyChanges();

		assert.strictEqual(oControl.getAggregation("_fileUploader").getEnabled(), true, "FileUploader is enabled when draftOnly=false");
		oControl.destroy();
	});

	// ─── Filename Display ──────────────────────────────────────────────────────

	QUnit.module("SingleFileUpload - Filename Display");

	QUnit.test("filename link is visible with correct text when file exists", function(assert) {
		const oControl = new SingleFileUpload({ fileNameProperty: "fileName", contentProperty: "content" });
		sinon.stub(oControl, "getBindingContext").returns({
			getPath: function() { return "/Items(1)"; },
			getModel: function() { return { getServiceUrl: function() { return "/odata/v4/items/"; } }; },
			getObject: function() { return { IsActiveEntity: false, fileName: "report.pdf" }; }
		});
		oControl.placeAt("uiArea1");
		Core.applyChanges();

		const oLink = oControl.getAggregation("_filenameLink");
		assert.ok(oLink, "_filenameLink aggregation exists");
		assert.strictEqual(oLink.getVisible(), true, "link is visible");
		assert.equal(oLink.getText(), "report.pdf", "link text is the file name");
		oControl.destroy();
	});

	QUnit.test("filename link href points to content stream URL", function(assert) {
		const oControl = new SingleFileUpload({ fileNameProperty: "fileName", contentProperty: "content" });
		sinon.stub(oControl, "getBindingContext").returns({
			getPath: function() { return "/Items(1)"; },
			getModel: function() { return { getServiceUrl: function() { return "/odata/v4/items/"; } }; },
			getObject: function() { return { fileName: "report.pdf" }; }
		});
		oControl.placeAt("uiArea1");
		Core.applyChanges();

		const oLink = oControl.getAggregation("_filenameLink");
		assert.equal(oLink.getHref(), "/odata/v4/items/Items(1)/content", "link href is the content stream URL");
		oControl.destroy();
	});

	QUnit.test("requests object data asynchronously when context has no data and invalidates when fileName loads", function(assert) {
		const done = assert.async();
		const oControl = new SingleFileUpload({ fileNameProperty: "fileName", contentProperty: "content" });

		const mockContext = {
			getPath: function() { return "/Items(1)"; },
			getModel: function() { return { getServiceUrl: function() { return "/odata/v4/items/"; } }; },
			getObject: function() { return undefined; },
			requestObject: function(path) { return path === "fileName" ? Promise.resolve("report.pdf") : Promise.resolve(undefined); }
		};
		sinon.stub(oControl, "getBindingContext").returns(mockContext);
		const invalidateSpy = sinon.spy(oControl, "invalidate");

		oControl.onBeforeRendering();

		Promise.resolve().then(function() {
			assert.ok(invalidateSpy.calledOnce, "invalidate() called after async data load with fileName");
			oControl.destroy();
			done();
		});
	});

	QUnit.test("does not invalidate when async data has no fileName", function(assert) {
		const done = assert.async();
		const oControl = new SingleFileUpload({ fileNameProperty: "fileName", contentProperty: "content" });

		const mockContext = {
			getPath: function() { return "/Items(1)"; },
			getModel: function() { return { getServiceUrl: function() { return "/odata/v4/items/"; } }; },
			getObject: function() { return undefined; },
			requestObject: function(path) { return path === "fileName" ? Promise.resolve("") : Promise.resolve(undefined); }
		};
		sinon.stub(oControl, "getBindingContext").returns(mockContext);
		const invalidateSpy = sinon.spy(oControl, "invalidate");

		oControl.onBeforeRendering();

		Promise.resolve().then(function() {
			assert.ok(invalidateSpy.notCalled, "invalidate() not called when no fileName in loaded data");
			oControl.destroy();
			done();
		});
	});

	QUnit.test("filename link is hidden when fileName is empty", function(assert) {
		const oControl = new SingleFileUpload({ fileNameProperty: "fileName", contentProperty: "content" });
		sinon.stub(oControl, "getBindingContext").returns({
			getPath: function() { return "/Items(1)"; },
			getModel: function() { return { getServiceUrl: function() { return "/odata/v4/items/"; } }; },
			getObject: function() { return { fileName: "" }; }
		});
		oControl.placeAt("uiArea1");
		Core.applyChanges();

		const oLink = oControl.getAggregation("_filenameLink");
		assert.strictEqual(oLink.getVisible(), false, "link is hidden when no file exists");
		oControl.destroy();
	});

	// ─── File Deletion ─────────────────────────────────────────────────────────

	QUnit.module("SingleFileUpload - File Deletion", {
		beforeEach: function() {
			this.oControl = new SingleFileUpload({ fileNameProperty: "fileName", contentProperty: "content", draftOnly: true });
			this.fetchStub = sinon.stub(window, "fetch");
		},
		afterEach: function() {
			this.fetchStub.restore();
			this.oControl.destroy();
		}
	});

	QUnit.test("delete button is hidden when no file exists", function(assert) {
		sinon.stub(this.oControl, "getBindingContext").returns({
			getPath: function() { return "/Items(1)"; },
			getModel: function() { return { getServiceUrl: function() { return "/odata/v4/items/"; } }; },
			getObject: function() { return { IsActiveEntity: false, fileName: "" }; }
		});
		this.oControl.placeAt("uiArea1");
		Core.applyChanges();

		const oButton = this.oControl.getAggregation("_deleteButton");
		assert.strictEqual(oButton.getVisible(), false, "delete button is hidden when no file");
	});

	QUnit.test("delete button is visible when file exists", function(assert) {
		sinon.stub(this.oControl, "getBindingContext").returns({
			getPath: function() { return "/Items(1)"; },
			getModel: function() { return { getServiceUrl: function() { return "/odata/v4/items/"; } }; },
			getObject: function() { return { IsActiveEntity: false, fileName: "report.pdf" }; }
		});
		this.oControl.placeAt("uiArea1");
		Core.applyChanges();

		const oButton = this.oControl.getAggregation("_deleteButton");
		assert.strictEqual(oButton.getVisible(), true, "delete button is visible when file exists");
	});

	QUnit.test("delete button is enabled when FileUploader is enabled", function(assert) {
		sinon.stub(this.oControl, "getBindingContext").returns({
			getPath: function() { return "/Items(1)"; },
			getModel: function() { return { getServiceUrl: function() { return "/odata/v4/items/"; } }; },
			getObject: function() { return { IsActiveEntity: false, fileName: "report.pdf" }; }
		});
		this.oControl.placeAt("uiArea1");
		Core.applyChanges();

		const oButton = this.oControl.getAggregation("_deleteButton");
		assert.strictEqual(oButton.getEnabled(), true, "delete button is enabled in edit mode");
	});

	QUnit.test("delete button is disabled when FileUploader is disabled (active entity + draftOnly)", function(assert) {
		sinon.stub(this.oControl, "getBindingContext").returns({
			getPath: function() { return "/Items(1)"; },
			getModel: function() { return { getServiceUrl: function() { return "/odata/v4/items/"; } }; },
			getObject: function() { return { IsActiveEntity: true, fileName: "report.pdf" }; }
		});
		this.oControl.placeAt("uiArea1");
		Core.applyChanges();

		const oButton = this.oControl.getAggregation("_deleteButton");
		assert.strictEqual(oButton.getEnabled(), false, "delete button is disabled in display mode");
	});

	QUnit.test("delete sends CSRF token fetch then PATCH with contentProperty=null", function(assert) {
		const done = assert.async();

		const mockContext = {
			getPath: function() { return "/Items(1)"; },
			getModel: function() { return { getServiceUrl: function() { return "/odata/v4/items/"; } }; },
			getObject: function() { return { IsActiveEntity: false, fileName: "report.pdf" }; },
			refresh: function() {}
		};
		sinon.stub(this.oControl, "getBindingContext").returns(mockContext);

		this.fetchStub.onCall(0).resolves({ ok: true, status: 200, headers: { get: function(name) { return name === "x-csrf-token" ? "del-token" : null; } } });
		this.fetchStub.resolves({ ok: true, status: 200 });

		this.oControl._onDeletePress().then(function() {
			assert.equal(this.fetchStub.callCount, 2, "fetch called 2 times: CSRF + PATCH");

			const csrfCall = this.fetchStub.getCall(0);
			assert.equal(csrfCall.args[1].method, "GET", "first call is CSRF GET");
			assert.equal(csrfCall.args[1].headers["x-csrf-token"], "Fetch", "CSRF header is 'Fetch'");

			const patchCall = this.fetchStub.getCall(1);
			assert.equal(patchCall.args[0], "/odata/v4/items/Items(1)", "PATCH targets entity URL");
			assert.equal(patchCall.args[1].method, "PATCH", "second call is PATCH");
			assert.equal(patchCall.args[1].headers["x-csrf-token"], "del-token", "PATCH sends CSRF token");

			const patchBody = JSON.parse(patchCall.args[1].body);
			assert.strictEqual(patchBody.content, null, "PATCH body sets contentProperty to null");
			assert.strictEqual(patchBody.fileName, null, "PATCH body sets fileNameProperty to null");
			done();
		}.bind(this)).catch(function(err) {
			assert.ok(false, "Promise rejected: " + (err && err.message || err));
			done();
		});
	});

	QUnit.test("delete calls context.refresh() after successful PATCH", function(assert) {
		const done = assert.async();

		const refreshSpy = sinon.spy();
		const mockContext = {
			getPath: function() { return "/Items(1)"; },
			getModel: function() { return { getServiceUrl: function() { return "/odata/v4/items/"; } }; },
			getObject: function() { return { IsActiveEntity: false, fileName: "report.pdf" }; },
			refresh: refreshSpy
		};
		sinon.stub(this.oControl, "getBindingContext").returns(mockContext);

		this.fetchStub.onCall(0).resolves({ ok: true, status: 200, headers: { get: function(name) { return name === "x-csrf-token" ? "tok" : null; } } });
		this.fetchStub.resolves({ ok: true, status: 200 });

		this.oControl._onDeletePress().then(function() {
			assert.ok(refreshSpy.calledOnce, "context.refresh() called once after delete");
			done();
		}.bind(this)).catch(function(err) {
			assert.ok(false, "Promise rejected: " + (err && err.message || err));
			done();
		});
	});

	QUnit.test("delete hides link and delete button after successful PATCH", function(assert) {
		const done = assert.async();

		const mockContext = {
			getPath: function() { return "/Items(1)"; },
			getModel: function() { return { getServiceUrl: function() { return "/odata/v4/items/"; } }; },
			getObject: function() { return { IsActiveEntity: false, fileName: "report.pdf" }; },
			refresh: function() {}
		};
		sinon.stub(this.oControl, "getBindingContext").returns(mockContext);

		this.fetchStub.onCall(0).resolves({ ok: true, status: 200, headers: { get: function(name) { return name === "x-csrf-token" ? "tok" : null; } } });
		this.fetchStub.resolves({ ok: true, status: 200 });

		this.oControl._onDeletePress().then(function() {
			const oLink = this.oControl.getAggregation("_filenameLink");
			const oButton = this.oControl.getAggregation("_deleteButton");
			assert.strictEqual(oLink.getVisible(), false, "filename link is hidden after delete");
			assert.strictEqual(oButton.getVisible(), false, "delete button is hidden after delete");
			done();
		}.bind(this)).catch(function(err) {
			assert.ok(false, "Promise rejected: " + (err && err.message || err));
			done();
		});
	});

	QUnit.test("delete with draftOnly=false and active entity calls draftEdit, clears file on draft, then activates (4 fetch calls)", function(assert) {
		const done = assert.async();

		const oControl = new SingleFileUpload({ fileNameProperty: "fileName", contentProperty: "content", draftOnly: false });
		const fetchStub = this.fetchStub;

		sinon.stub(oControl, "getBindingContext").returns({
			getPath: function() { return "/Items(ID=guid'1',IsActiveEntity=true)"; },
			getModel: function() { return { getServiceUrl: function() { return "/odata/v4/items/"; } }; },
			getObject: function() { return { IsActiveEntity: true, fileName: "old.pdf" }; },
			refresh: function() {}
		});

		// Call 0: CSRF
		fetchStub.onCall(0).resolves({ ok: true, status: 200, headers: { get: function(name) { return name === "x-csrf-token" ? "tok" : null; } } });
		// Call 1: draftEdit
		fetchStub.onCall(1).resolves({ ok: true, status: 200 });
		// Call 2: PATCH (clear file on draft)
		fetchStub.onCall(2).resolves({ ok: true, status: 200 });
		// Call 3: draftActivate
		fetchStub.onCall(3).resolves({ ok: true, status: 200 });

		oControl._onDeletePress().then(function() {
			assert.equal(fetchStub.callCount, 4, "fetch called 4 times: CSRF + draftEdit + PATCH + draftActivate");

			const draftEditCall = fetchStub.getCall(1);
			assert.equal(draftEditCall.args[0], "/odata/v4/items/Items(ID=guid'1',IsActiveEntity=true)/draftEdit", "draftEdit called on active entity");
			assert.equal(draftEditCall.args[1].method, "POST", "draftEdit is POST");

			const patchCall = fetchStub.getCall(2);
			assert.equal(patchCall.args[0], "/odata/v4/items/Items(ID=guid'1',IsActiveEntity=false)", "PATCH targets draft entity URL");
			const patchBody = JSON.parse(patchCall.args[1].body);
			assert.strictEqual(patchBody.content, null, "PATCH sets content to null");
			assert.strictEqual(patchBody.fileName, null, "PATCH sets fileName to null");

			const activateCall = fetchStub.getCall(3);
			assert.equal(activateCall.args[0], "/odata/v4/items/Items(ID=guid'1',IsActiveEntity=false)/draftActivate", "draftActivate called on draft entity");

			oControl.destroy();
			done();
		});
	});

	// ─── setEnabled ───────────────────────────────────────────────────────────

	QUnit.module("SingleFileUpload - setEnabled");

	QUnit.test("setEnabled(false) disables file upload and hides delete button regardless of draft state", function(assert) {
		const oControl = new SingleFileUpload({ fileNameProperty: "fileName", contentProperty: "content" });
		sinon.stub(oControl, "getBindingContext").returns({
			getPath: function() { return "/Items(1)"; },
			getModel: function() { return { getServiceUrl: function() { return "/odata/v4/items/"; } }; },
			getObject: function() { return { IsActiveEntity: false, fileName: "report.pdf" }; }
		});
		oControl.placeAt("uiArea1");
		Core.applyChanges();

		oControl.setEnabled(false);

		const fileUploader = oControl.getAggregation("_fileUploader");
		const deleteButton = oControl.getAggregation("_deleteButton");
		assert.strictEqual(fileUploader.getEnabled(), false, "file upload is disabled");
		assert.strictEqual(deleteButton.getEnabled(), false, "delete button is disabled");
		oControl.destroy();
	});

	QUnit.test("setEnabled(true) re-enables file upload when in draft mode", function(assert) {
		const oControl = new SingleFileUpload({ fileNameProperty: "fileName", contentProperty: "content", enabled: false });
		sinon.stub(oControl, "getBindingContext").returns({
			getPath: function() { return "/Items(1)"; },
			getModel: function() { return { getServiceUrl: function() { return "/odata/v4/items/"; } }; },
			getObject: function() { return { IsActiveEntity: false, fileName: "report.pdf" }; }
		});
		oControl.placeAt("uiArea1");
		Core.applyChanges();

		oControl.setEnabled(true);

		const fileUploader = oControl.getAggregation("_fileUploader");
		const deleteButton = oControl.getAggregation("_deleteButton");
		assert.strictEqual(fileUploader.getEnabled(), true, "file upload is re-enabled");
		assert.strictEqual(deleteButton.getEnabled(), true, "delete button is re-enabled");
		oControl.destroy();
	});

	// ─── Error Handling ───────────────────────────────────────────────────────

	QUnit.module("SingleFileUpload - Error Handling", {
		beforeEach: function() {
			this.oControl = new SingleFileUpload({ fileNameProperty: "fileName", contentProperty: "content" });
			this.fetchStub = sinon.stub(window, "fetch");
		},
		afterEach: function() {
			this.fetchStub.restore();
			this.oControl.destroy();
		}
	});

	QUnit.test("upload failure is caught and promise resolves without throwing", function(assert) {
		const done = assert.async();

		const mockContext = {
			getPath: function() { return "/Items(1)"; },
			getModel: function() { return { getServiceUrl: function() { return "/odata/v4/items/"; } }; },
			getObject: function() { return { IsActiveEntity: false }; }
		};
		sinon.stub(this.oControl, "getBindingContext").returns(mockContext);

		this.fetchStub.rejects(new Error("Network error"));

		const mockFile = new File(["data"], "file.txt", { type: "text/plain" });
		const mockEvent = { getParameter: () => [mockFile] };

		this.oControl._onFileChange(mockEvent).then(function() {
			assert.ok(true, "_onFileChange resolved without throwing when fetch fails");
			done();
		});
	});

	QUnit.test("delete failure is caught and promise resolves without throwing", function(assert) {
		const done = assert.async();

		sinon.stub(this.oControl, "getBindingContext").returns({
			getPath: function() { return "/Items(1)"; },
			getModel: function() { return { getServiceUrl: function() { return "/odata/v4/items/"; } }; },
			getObject: function() { return { IsActiveEntity: false, fileName: "report.pdf" }; },
			refresh: function() {}
		});

		this.fetchStub.rejects(new Error("Network error"));

		this.oControl._onDeletePress().then(function() {
			assert.ok(true, "_onDeletePress resolved without throwing when fetch fails");
			done();
		});
	});

	// ─── Context Detection ───────────────────────────────────────────────────

	QUnit.module("SingleFileUpload - Context Detection", {
		beforeEach: function() {
			this.oControl = new SingleFileUpload({ fileNameProperty: "fileName", contentProperty: "content" });
		},
		afterEach: function() {
			this.oControl.destroy();
		}
	});

	QUnit.test("calls invalidate when modelContextChange fires with context", function(assert) {
		const mockContext = {
			getPath: function() { return "/Quotes(ID=abc,IsActiveEntity=false)"; },
			getObject: function() { return {}; },
			getModel: function() { return { getServiceUrl: function() { return "/odata/v4/quote/"; } }; }
		};
		sinon.stub(this.oControl, "getBindingContext").returns(mockContext);
		const invalidateStub = sinon.stub(this.oControl, "invalidate");

		this.oControl._onModelContextChange();

		assert.ok(invalidateStub.called, "invalidate called when context is available");
		invalidateStub.restore();
	});

	QUnit.test("does not call invalidate when modelContextChange fires without context", function(assert) {
		sinon.stub(this.oControl, "getBindingContext").returns(null);
		const invalidateStub = sinon.stub(this.oControl, "invalidate");

		this.oControl._onModelContextChange();

		assert.notOk(invalidateStub.called, "invalidate not called when context is absent");
		invalidateStub.restore();
	});

});
