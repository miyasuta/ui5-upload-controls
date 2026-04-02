// karma-ui5 usage: https://github.com/SAP/karma-ui5
module.exports = function (config) {
    config.set({
        frameworks: ["ui5"],
        ui5: {
            configPath: "ui5.dev.yaml"
        },
        customContextFile: "test/karma-context.html",
        browsers: ["Chrome"]
    });
};