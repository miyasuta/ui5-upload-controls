import fioriTools from '@sap-ux/eslint-plugin-fiori-tools';

export default [
    { ignores: ["dist/"] },
    ...fioriTools.configs.recommended,
];
