// @ts-nocheck

/*global QUnit, sinon */
// eslint-disable-next-line no-undef
sap.ui.define([
	"sap/ui/qunit/utils/createAndAppendDiv",
	"miyasuta/ui5uploadcontrols/MultiFileUpload",
	"sap/ui/core/Core"
], function(createAndAppendDiv, MultiFileUpload, Core) {
	"use strict";

	// prepare DOM
	createAndAppendDiv("uiArea2");

	// ─── Properties ────────────────────────────────────────────────────────────

	QUnit.module("MultiFileUpload - Properties");

	QUnit.test("getters return configured values", function(assert) {
		const oControl = new MultiFileUpload({
			attachmentsSegment: "docs",
			draftOnly: false,
			enabled: false
		});
		assert.equal(oControl.getAttachmentsSegment(), "docs", "attachmentsSegment");
		assert.equal(oControl.getDraftOnly(), false, "draftOnly");
		assert.equal(oControl.getEnabled(), false, "enabled");
		oControl.destroy();
	});

	QUnit.test("default values are correct", function(assert) {
		const oControl = new MultiFileUpload();
		assert.equal(oControl.getAttachmentsSegment(), "attachments", "attachmentsSegment default is 'attachments'");
		assert.equal(oControl.getDraftOnly(), true, "draftOnly default is true");
		assert.equal(oControl.getEnabled(), true, "enabled default is true");
		oControl.destroy();
	});

	// ─── Rendering ─────────────────────────────────────────────────────────────

	QUnit.module("MultiFileUpload - Rendering", {
		beforeEach: function() {
			this.oControl = new MultiFileUpload();
			this.oControl.placeAt("uiArea2");
			Core.applyChanges();
		},
		afterEach: function() {
			this.oControl.destroy();
		}
	});

	QUnit.test("renders wrapper div with correct CSS class", function(assert) {
		const oDomRef = this.oControl.getDomRef();
		assert.ok(oDomRef, "DOM element exists after placeAt");
		assert.ok(oDomRef.classList.contains("miyasutaMultiFileUpload"), "wrapper div has miyasutaMultiFileUpload class");
	});

	QUnit.test("table is rendered inside wrapper", function(assert) {
		const oDomRef = this.oControl.getDomRef();
		const oTableDom = oDomRef.querySelector(".sapMList");
		assert.ok(oTableDom, "sap.m.Table element found inside wrapper div");
	});

	// ─── Upload Logic ──────────────────────────────────────────────────────────

	QUnit.module("MultiFileUpload - Upload Logic", {
		beforeEach: function() {
			this.oControl = new MultiFileUpload({ attachmentsSegment: "attachments" });
			this.fetchStub = sinon.stub(window, "fetch");
		},
		afterEach: function() {
			this.fetchStub.restore();
			this.oControl.destroy();
		}
	});

	QUnit.test("does nothing when no binding context", function(assert) {
		const done = assert.async();
		const mockFile = new File(["content"], "test.txt", { type: "text/plain" });

		this.oControl._handleUpload(mockFile).then(function() {
			assert.equal(this.fetchStub.callCount, 0, "fetch not called when binding context is absent");
			done();
		}.bind(this));
	});

	QUnit.test("fetches CSRF token from service URL before upload", function(assert) {
		const done = assert.async();

		const mockContext = {
			getPath: function() { return "/Quotes(ID=abc,IsActiveEntity=false)"; },
			getModel: function() { return { getServiceUrl: function() { return "/odata/v4/quote/"; } }; },
			getObject: function() { return { IsActiveEntity: false }; }
		};
		sinon.stub(this.oControl, "getBindingContext").returns(mockContext);
		sinon.stub(this.oControl, "getAggregation").returns(makeMockTable());

		// Call 0: CSRF token GET
		this.fetchStub.onCall(0).resolves(new Response(null, {
			status: 200,
			headers: { "x-csrf-token": "test-token" }
		}));
		// Call 1: POST create, Call 2: PUT content
		this.fetchStub.onCall(1).resolves(new Response(JSON.stringify({ ID: "att-001" }), { status: 201 }));
		this.fetchStub.resolves(new Response(null, { status: 200 }));

		const mockFile = new File(["hello"], "report.pdf", { type: "application/pdf" });

		this.oControl._handleUpload(mockFile).then(function() {
			const csrfCall = this.fetchStub.getCall(0);
			assert.equal(csrfCall.args[0], "/odata/v4/quote", "CSRF token fetched from service URL (trailing slash removed)");
			assert.equal(csrfCall.args[1].headers["x-csrf-token"], "Fetch", "CSRF request uses 'Fetch' header value");
			assert.equal(csrfCall.args[1].method, "GET", "CSRF request is GET");
			done();
		}.bind(this));
	});

	QUnit.test("POSTs metadata then PUTs binary content (draft mode)", function(assert) {
		const done = assert.async();

		const mockContext = {
			getPath: function() { return "/Quotes(ID=abc,IsActiveEntity=false)"; },
			getModel: function() { return { getServiceUrl: function() { return "/odata/v4/quote/"; } }; },
			getObject: function() { return { IsActiveEntity: false }; }
		};
		sinon.stub(this.oControl, "getBindingContext").returns(mockContext);
		sinon.stub(this.oControl, "getAggregation").returns(makeMockTable());

		// CSRF
		this.fetchStub.onCall(0).resolves(new Response(null, {
			status: 200,
			headers: { "x-csrf-token": "csrf-123" }
		}));
		// POST (create entity)
		this.fetchStub.onCall(1).resolves(new Response(JSON.stringify({ ID: "att-001" }), {
			status: 201,
			headers: { "Content-Type": "application/json" }
		}));
		// PUT (content)
		this.fetchStub.onCall(2).resolves(new Response(null, { status: 204 }));

		const mockFile = new File(["data"], "report.pdf", { type: "application/pdf" });

		this.oControl._handleUpload(mockFile).then(function() {
			assert.equal(this.fetchStub.callCount, 3, "fetch called 3 times: CSRF + POST + PUT");

			const postCall = this.fetchStub.getCall(1);
			assert.equal(postCall.args[0], "/odata/v4/quote/Quotes(ID=abc,IsActiveEntity=false)/attachments", "POST targets attachments URL");
			assert.equal(postCall.args[1].method, "POST", "second call is POST");
			assert.equal(postCall.args[1].headers["x-csrf-token"], "csrf-123", "POST sends CSRF token");

			const postBody = JSON.parse(postCall.args[1].body);
			assert.equal(postBody.filename, "report.pdf", "POST body contains filename");
			assert.equal(postBody.mimeType, "application/pdf", "POST body contains mimeType");

			const putCall = this.fetchStub.getCall(2);
			assert.equal(putCall.args[0], "/odata/v4/quote/Quotes(ID=abc,IsActiveEntity=false)/attachments(ID=att-001)/content", "PUT targets content URL with attachment ID");
			assert.equal(putCall.args[1].method, "PUT", "third call is PUT");
			assert.equal(putCall.args[1].headers["x-csrf-token"], "csrf-123", "PUT sends CSRF token");
			assert.strictEqual(putCall.args[1].body, mockFile, "PUT body is the File object");

			done();
		}.bind(this));
	});

	QUnit.test("upload with draftOnly=false and IsActiveEntity=true calls draftEdit first", function(assert) {
		const done = assert.async();

		const oControl = new MultiFileUpload({ attachmentsSegment: "attachments", draftOnly: false });
		const fetchStub = this.fetchStub;

		const mockContext = {
			getPath: function() { return "/Quotes(ID=abc,IsActiveEntity=true)"; },
			getModel: function() { return { getServiceUrl: function() { return "/odata/v4/quote/"; } }; },
			getObject: function() { return { IsActiveEntity: true }; }
		};
		sinon.stub(oControl, "getBindingContext").returns(mockContext);
		sinon.stub(oControl, "getAggregation").returns(makeMockTable());

		// Call 0: CSRF
		fetchStub.onCall(0).resolves(new Response(null, { status: 200, headers: { "x-csrf-token": "tok" } }));
		// Call 1: draftEdit
		fetchStub.onCall(1).resolves(new Response(null, { status: 200 }));
		// Call 2: POST (create attachment on draft)
		fetchStub.onCall(2).resolves(new Response(JSON.stringify({ ID: "att-001" }), { status: 201 }));
		// Call 3: PUT content
		fetchStub.onCall(3).resolves(new Response(null, { status: 204 }));
		// Call 4: draftActivate
		fetchStub.onCall(4).resolves(new Response(null, { status: 200 }));

		const mockFile = new File(["data"], "file.txt", { type: "text/plain" });

		oControl._handleUpload(mockFile).then(function() {
			assert.equal(fetchStub.callCount, 5, "fetch called 5 times: CSRF + draftEdit + POST + PUT + draftActivate");

			const draftEditCall = fetchStub.getCall(1);
			assert.equal(draftEditCall.args[0], "/odata/v4/quote/Quotes(ID=abc,IsActiveEntity=true)/draftEdit", "draftEdit called on active entity");
			assert.equal(draftEditCall.args[1].method, "POST", "draftEdit is POST");

			const postCall = fetchStub.getCall(2);
			assert.equal(postCall.args[0], "/odata/v4/quote/Quotes(ID=abc,IsActiveEntity=false)/attachments", "POST targets draft entity's attachments");

			const activateCall = fetchStub.getCall(4);
			assert.equal(activateCall.args[0], "/odata/v4/quote/Quotes(ID=abc,IsActiveEntity=false)/draftActivate", "draftActivate called on draft entity");

			oControl.destroy();
			done();
		});
	});

	QUnit.test("upload is suppressed when IsActiveEntity=true and draftOnly=true", function(assert) {
		const done = assert.async();

		// draftOnly=true (default), IsActiveEntity=true → _computeCanOperate returns false
		const mockContext = {
			getPath: function() { return "/Quotes(ID=abc,IsActiveEntity=true)"; },
			getModel: function() { return { getServiceUrl: function() { return "/odata/v4/quote/"; } }; },
			getObject: function() { return { IsActiveEntity: true }; }
		};
		sinon.stub(this.oControl, "getBindingContext").returns(mockContext);

		// Simulate _onBeforeUploadStarts: preventDefault is called, then _computeCanOperate check
		// Directly call _handleUpload would still run (it only checks context); the gate is in
		// _onBeforeUploadStarts. Verify _computeCanOperate returns false.
		assert.strictEqual(this.oControl._computeCanOperate(), false, "_computeCanOperate is false for active entity with draftOnly=true");
		assert.equal(this.fetchStub.callCount, 0, "no fetch called");
		done();
	});

	QUnit.test("custom attachmentsSegment is used in POST URL", function(assert) {
		const done = assert.async();

		const oControl = new MultiFileUpload({ attachmentsSegment: "docs" });
		const fetchStub = this.fetchStub;

		const mockContext = {
			getPath: function() { return "/Quotes(ID=abc,IsActiveEntity=false)"; },
			getModel: function() { return { getServiceUrl: function() { return "/odata/v4/quote/"; } }; },
			getObject: function() { return { IsActiveEntity: false }; }
		};
		sinon.stub(oControl, "getBindingContext").returns(mockContext);
		sinon.stub(oControl, "getAggregation").returns(makeMockTable());

		fetchStub.onCall(0).resolves(new Response(null, { status: 200, headers: { "x-csrf-token": "tok" } }));
		fetchStub.onCall(1).resolves(new Response(JSON.stringify({ ID: "att-001" }), { status: 201 }));
		fetchStub.resolves(new Response(null, { status: 204 }));

		const mockFile = new File(["data"], "file.txt", { type: "text/plain" });

		oControl._handleUpload(mockFile).then(function() {
			const postCall = fetchStub.getCall(1);
			assert.equal(postCall.args[0], "/odata/v4/quote/Quotes(ID=abc,IsActiveEntity=false)/docs", "POST URL uses custom attachmentsSegment");
			oControl.destroy();
			done();
		});
	});

	// ─── Delete Logic ──────────────────────────────────────────────────────────

	QUnit.module("MultiFileUpload - Delete Logic", {
		beforeEach: function() {
			this.oControl = new MultiFileUpload({ attachmentsSegment: "attachments" });
			this.fetchStub = sinon.stub(window, "fetch");
		},
		afterEach: function() {
			this.fetchStub.restore();
			this.oControl.destroy();
		}
	});

	QUnit.test("deletes attachment with DELETE request (draft mode)", function(assert) {
		const done = assert.async();

		// Parent context (draft entity)
		const mockParentContext = {
			getPath: function() { return "/Quotes(ID=abc,IsActiveEntity=false)"; },
			getObject: function() { return { IsActiveEntity: false }; }
		};
		sinon.stub(this.oControl, "getBindingContext").returns(mockParentContext);

		// Row context (attachment entity)
		const mockRowContext = {
			getPath: function() { return "/Quotes(ID=abc,IsActiveEntity=false)/attachments(ID=att-001)"; },
			getModel: function() { return { getServiceUrl: function() { return "/odata/v4/quote/"; } }; }
		};
		const mockButton = { getBindingContext: function() { return mockRowContext; } };
		const mockEvent = { getSource: function() { return mockButton; } };

		sinon.stub(this.oControl, "getAggregation").returns(makeMockTable());

		// CSRF
		this.fetchStub.onCall(0).resolves(new Response(null, { status: 200, headers: { "x-csrf-token": "tok" } }));
		// DELETE
		this.fetchStub.onCall(1).resolves(new Response(null, { status: 204 }));

		this.oControl._onRowDeletePress(mockEvent).then(function() {
			assert.equal(this.fetchStub.callCount, 2, "fetch called 2 times: CSRF + DELETE");

			const deleteCall = this.fetchStub.getCall(1);
			assert.equal(deleteCall.args[0], "/odata/v4/quote/Quotes(ID=abc,IsActiveEntity=false)/attachments(ID=att-001)", "DELETE targets attachment URL");
			assert.equal(deleteCall.args[1].method, "DELETE", "second call is DELETE");
			assert.equal(deleteCall.args[1].headers["x-csrf-token"], "tok", "DELETE sends CSRF token");

			done();
		}.bind(this));
	});

	QUnit.test("delete with draftOnly=false and IsActiveEntity=true calls draftEdit and draftActivate", function(assert) {
		const done = assert.async();

		const oControl = new MultiFileUpload({ attachmentsSegment: "attachments", draftOnly: false });
		const fetchStub = this.fetchStub;

		const mockParentContext = {
			getPath: function() { return "/Quotes(ID=abc,IsActiveEntity=true)"; },
			getObject: function() { return { IsActiveEntity: true }; }
		};
		sinon.stub(oControl, "getBindingContext").returns(mockParentContext);

		const mockRowContext = {
			getPath: function() { return "/Quotes(ID=abc,IsActiveEntity=true)/attachments(ID=att-001)"; },
			getModel: function() { return { getServiceUrl: function() { return "/odata/v4/quote/"; } }; }
		};
		const mockButton = { getBindingContext: function() { return mockRowContext; } };
		const mockEvent = { getSource: function() { return mockButton; } };

		sinon.stub(oControl, "getAggregation").returns(makeMockTable());

		// CSRF
		fetchStub.onCall(0).resolves(new Response(null, { status: 200, headers: { "x-csrf-token": "tok" } }));
		// draftEdit
		fetchStub.onCall(1).resolves(new Response(null, { status: 200 }));
		// DELETE
		fetchStub.onCall(2).resolves(new Response(null, { status: 204 }));
		// draftActivate
		fetchStub.onCall(3).resolves(new Response(null, { status: 200 }));

		oControl._onRowDeletePress(mockEvent).then(function() {
			assert.equal(fetchStub.callCount, 4, "fetch called 4 times: CSRF + draftEdit + DELETE + draftActivate");

			const draftEditCall = fetchStub.getCall(1);
			assert.equal(draftEditCall.args[0], "/odata/v4/quote/Quotes(ID=abc,IsActiveEntity=true)/draftEdit", "draftEdit called on active parent entity");

			const deleteCall = fetchStub.getCall(2);
			assert.equal(deleteCall.args[0], "/odata/v4/quote/Quotes(ID=abc,IsActiveEntity=false)/attachments(ID=att-001)", "DELETE targets draft attachment");

			const activateCall = fetchStub.getCall(3);
			assert.equal(activateCall.args[0], "/odata/v4/quote/Quotes(ID=abc,IsActiveEntity=false)/draftActivate", "draftActivate called on draft entity");

			oControl.destroy();
			done();
		});
	});

	QUnit.test("delete is suppressed when IsActiveEntity=true and draftOnly=true", function(assert) {
		const done = assert.async();

		const mockParentContext = {
			getPath: function() { return "/Quotes(ID=abc,IsActiveEntity=true)"; },
			getObject: function() { return { IsActiveEntity: true }; }
		};
		sinon.stub(this.oControl, "getBindingContext").returns(mockParentContext);

		const mockRowContext = {
			getPath: function() { return "/Quotes(ID=abc,IsActiveEntity=true)/attachments(ID=att-001)"; },
			getModel: function() { return { getServiceUrl: function() { return "/odata/v4/quote/"; } }; }
		};
		const mockButton = { getBindingContext: function() { return mockRowContext; } };
		const mockEvent = { getSource: function() { return mockButton; } };

		this.oControl._onRowDeletePress(mockEvent).then(function() {
			assert.equal(this.fetchStub.callCount, 0, "no fetch called when draftOnly=true and IsActiveEntity=true");
			done();
		}.bind(this));
	});

	// ─── _computeCanOperate ───────────────────────────────────────────────────

	QUnit.module("MultiFileUpload - _computeCanOperate");

	QUnit.test("returns true when IsActiveEntity=false (draft mode)", function(assert) {
		const oControl = new MultiFileUpload();
		sinon.stub(oControl, "getBindingContext").returns({
			getPath: function() { return "/Quotes(ID=abc,IsActiveEntity=false)"; },
			getObject: function() { return { IsActiveEntity: false }; }
		});
		assert.strictEqual(oControl._computeCanOperate(), true, "can operate in draft mode");
		oControl.destroy();
	});

	QUnit.test("returns true when IsActiveEntity is absent (non-draft entity)", function(assert) {
		const oControl = new MultiFileUpload();
		sinon.stub(oControl, "getBindingContext").returns({
			getPath: function() { return "/NonDraftEntity(ID=abc)"; },
			getObject: function() { return {}; }
		});
		assert.strictEqual(oControl._computeCanOperate(), true, "can operate for non-draft entity");
		oControl.destroy();
	});

	QUnit.test("returns true when draftOnly=false even if IsActiveEntity=true", function(assert) {
		const oControl = new MultiFileUpload({ draftOnly: false });
		sinon.stub(oControl, "getBindingContext").returns({
			getPath: function() { return "/Quotes(ID=abc,IsActiveEntity=true)"; },
			getObject: function() { return { IsActiveEntity: true }; }
		});
		assert.strictEqual(oControl._computeCanOperate(), true, "can operate when draftOnly=false");
		oControl.destroy();
	});

	QUnit.test("returns false when enabled=false regardless of draft state", function(assert) {
		const oControl = new MultiFileUpload({ enabled: false });
		sinon.stub(oControl, "getBindingContext").returns({
			getPath: function() { return "/Quotes(ID=abc,IsActiveEntity=false)"; },
			getObject: function() { return { IsActiveEntity: false }; }
		});
		assert.strictEqual(oControl._computeCanOperate(), false, "cannot operate when enabled=false");
		oControl.destroy();
	});

	QUnit.test("returns false when draftOnly=true and IsActiveEntity=true (active entity)", function(assert) {
		const oControl = new MultiFileUpload(); // draftOnly defaults to true
		sinon.stub(oControl, "getBindingContext").returns({
			getPath: function() { return "/Quotes(ID=abc,IsActiveEntity=true)"; },
			getObject: function() { return { IsActiveEntity: true }; }
		});
		assert.strictEqual(oControl._computeCanOperate(), false, "cannot operate for active entity when draftOnly=true");
		oControl.destroy();
	});

	QUnit.test("returns true when no binding context", function(assert) {
		const oControl = new MultiFileUpload();
		sinon.stub(oControl, "getBindingContext").returns(null);
		assert.strictEqual(oControl._computeCanOperate(), true, "can operate when no binding context");
		oControl.destroy();
	});

	// ─── setEnabled ───────────────────────────────────────────────────────────

	QUnit.module("MultiFileUpload - setEnabled");

	QUnit.test("setEnabled(false) disables delete buttons in all existing rows", function(assert) {
		const oControl = new MultiFileUpload();
		const mockDeleteButton = { setEnabled: sinon.spy() };
		const mockItem = { getCells: function() { return [null, null, null, mockDeleteButton]; } };
		const mockTable = { getItems: function() { return [mockItem]; } };
		sinon.stub(oControl, "getAggregation").returns(mockTable);
		sinon.stub(oControl, "getBindingContext").returns({
			getObject: function() { return { IsActiveEntity: false }; }
		});

		oControl.setEnabled(false);

		assert.ok(mockDeleteButton.setEnabled.calledOnce, "setEnabled called on delete button");
		assert.ok(mockDeleteButton.setEnabled.calledWith(false), "delete button is disabled");
		oControl.destroy();
	});

	QUnit.test("setEnabled(true) enables delete buttons when in draft mode", function(assert) {
		const oControl = new MultiFileUpload({ enabled: false });
		const mockDeleteButton = { setEnabled: sinon.spy() };
		const mockItem = { getCells: function() { return [null, null, null, mockDeleteButton]; } };
		const mockTable = { getItems: function() { return [mockItem]; } };
		sinon.stub(oControl, "getAggregation").returns(mockTable);
		sinon.stub(oControl, "getBindingContext").returns({
			getObject: function() { return { IsActiveEntity: false }; }
		});

		oControl.setEnabled(true);

		assert.ok(mockDeleteButton.setEnabled.calledOnce, "setEnabled called on delete button");
		assert.ok(mockDeleteButton.setEnabled.calledWith(true), "delete button is enabled");
		oControl.destroy();
	});

	// ─── Upload Button State ──────────────────────────────────────────────────

	QUnit.module("MultiFileUpload - Upload Button State");

	function makeMockContext(isActiveEntity) {
		return {
			getPath: function() { return "/Quotes(ID=abc,IsActiveEntity=" + isActiveEntity + ")"; },
			getModel: function() { return { getServiceUrl: function() { return "/odata/v4/quote/"; } }; },
			getObject: function() { return { IsActiveEntity: isActiveEntity }; }
		};
	}

	function makeMockTable() {
		return { setBindingContext: function() {}, bindItems: function() {} };
	}

	QUnit.test("upload button disabled after binding active entity with draftOnly=true", function(assert) {
		const oControl = new MultiFileUpload(); // draftOnly=true by default
		const mockContext = makeMockContext(true);
		sinon.stub(oControl, "getBindingContext").returns(mockContext);
		sinon.stub(oControl, "getAggregation").returns(makeMockTable());

		oControl._bindTableItems(mockContext);

		assert.strictEqual(oControl._uploadPlugin.getUploadEnabled(), false, "upload button disabled for active entity with draftOnly=true");
		oControl.destroy();
	});

	QUnit.test("upload button enabled after binding draft entity with draftOnly=true", function(assert) {
		const oControl = new MultiFileUpload(); // draftOnly=true by default
		const mockContext = makeMockContext(false);
		sinon.stub(oControl, "getBindingContext").returns(mockContext);
		sinon.stub(oControl, "getAggregation").returns(makeMockTable());

		oControl._bindTableItems(mockContext);

		assert.strictEqual(oControl._uploadPlugin.getUploadEnabled(), true, "upload button enabled for draft entity with draftOnly=true");
		oControl.destroy();
	});

	QUnit.test("upload button enabled after binding active entity with draftOnly=false", function(assert) {
		const oControl = new MultiFileUpload({ draftOnly: false });
		const mockContext = makeMockContext(true);
		sinon.stub(oControl, "getBindingContext").returns(mockContext);
		sinon.stub(oControl, "getAggregation").returns(makeMockTable());

		oControl._bindTableItems(mockContext);

		assert.strictEqual(oControl._uploadPlugin.getUploadEnabled(), true, "upload button enabled when draftOnly=false");
		oControl.destroy();
	});

	QUnit.test("upload button disabled after binding when enabled=false", function(assert) {
		const oControl = new MultiFileUpload({ enabled: false });
		const mockContext = makeMockContext(false);
		sinon.stub(oControl, "getBindingContext").returns(mockContext);
		sinon.stub(oControl, "getAggregation").returns(makeMockTable());

		oControl._bindTableItems(mockContext);

		assert.strictEqual(oControl._uploadPlugin.getUploadEnabled(), false, "upload button disabled when enabled=false");
		oControl.destroy();
	});

	// ─── Error Handling ───────────────────────────────────────────────────────

	QUnit.module("MultiFileUpload - Error Handling", {
		beforeEach: function() {
			this.oControl = new MultiFileUpload({ attachmentsSegment: "attachments" });
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
			getPath: function() { return "/Quotes(ID=abc,IsActiveEntity=false)"; },
			getModel: function() { return { getServiceUrl: function() { return "/odata/v4/quote/"; } }; },
			getObject: function() { return { IsActiveEntity: false }; }
		};
		sinon.stub(this.oControl, "getBindingContext").returns(mockContext);

		this.fetchStub.rejects(new Error("Network error"));

		const mockFile = new File(["data"], "file.txt", { type: "text/plain" });

		this.oControl._handleUpload(mockFile).then(function() {
			assert.ok(true, "_handleUpload resolved without throwing when fetch fails");
			done();
		});
	});

	QUnit.test("delete failure is caught and promise resolves without throwing", function(assert) {
		const done = assert.async();

		const mockParentContext = {
			getPath: function() { return "/Quotes(ID=abc,IsActiveEntity=false)"; },
			getObject: function() { return { IsActiveEntity: false }; }
		};
		sinon.stub(this.oControl, "getBindingContext").returns(mockParentContext);

		const mockRowContext = {
			getPath: function() { return "/Quotes(ID=abc,IsActiveEntity=false)/attachments(ID=att-001)"; },
			getModel: function() { return { getServiceUrl: function() { return "/odata/v4/quote/"; } }; }
		};
		const mockButton = { getBindingContext: function() { return mockRowContext; } };
		const mockEvent = { getSource: function() { return mockButton; } };

		this.fetchStub.rejects(new Error("Network error"));

		this.oControl._onRowDeletePress(mockEvent).then(function() {
			assert.ok(true, "_onRowDeletePress resolved without throwing when fetch fails");
			done();
		});
	});

	// ─── Context Detection ───────────────────────────────────────────────────

	QUnit.module("MultiFileUpload - Context Detection", {
		beforeEach: function() {
			this.oControl = new MultiFileUpload();
		},
		afterEach: function() {
			this.oControl.destroy();
		}
	});

	QUnit.test("calls _bindTableItems when context becomes available via onBeforeRendering", function(assert) {
		const mockContext = makeMockContext(false);
		sinon.stub(this.oControl, "getBindingContext").returns(mockContext);
		sinon.stub(this.oControl, "getAggregation").returns(makeMockTable());

		this.oControl.onBeforeRendering();

		assert.equal(this.oControl._lastBoundPath, "/Quotes(ID=abc,IsActiveEntity=false)", "_lastBoundPath set when context is available in onBeforeRendering");
	});

	QUnit.test("does not call _bindTableItems when context is absent in onBeforeRendering", function(assert) {
		sinon.stub(this.oControl, "getBindingContext").returns(null);

		this.oControl.onBeforeRendering();

		assert.strictEqual(this.oControl._lastBoundPath, undefined, "_lastBoundPath remains undefined when no context");
	});
});
