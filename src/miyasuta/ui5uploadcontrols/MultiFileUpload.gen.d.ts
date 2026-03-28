import { PropertyBindingInfo } from "sap/ui/base/ManagedObject";
import { $ControlSettings } from "sap/ui/core/Control";

declare module "./MultiFileUpload" {

    /**
     * Interface defining the settings object used in constructor calls
     */
    interface $MultiFileUploadSettings extends $ControlSettings {

        /**
         * Navigation property segment name for the attachments composition (e.g. "attachments").
         */
        attachmentsSegment?: string | PropertyBindingInfo;

        /**
         * When true, upload/delete is enabled only when the entity is in draft mode (IsActiveEntity = false).
        When false, draft lifecycle is managed automatically.
         */
        draftOnly?: boolean | PropertyBindingInfo | `{${string}}`;

        /**
         * Controls whether upload and delete are enabled.
        When false, both are disabled regardless of draft state.
         */
        enabled?: boolean | PropertyBindingInfo | `{${string}}`;
    }

    export default interface MultiFileUpload {

        // property: attachmentsSegment

        /**
         * Gets current value of property "attachmentsSegment".
         *
         * Navigation property segment name for the attachments composition (e.g. "attachments").
         *
         * Default value is: "attachments"
         * @returns Value of property "attachmentsSegment"
         */
        getAttachmentsSegment(): string;

        /**
         * Sets a new value for property "attachmentsSegment".
         *
         * Navigation property segment name for the attachments composition (e.g. "attachments").
         *
         * When called with a value of "null" or "undefined", the default value of the property will be restored.
         *
         * Default value is: "attachments"
         * @param [attachmentsSegment="attachments"] New value for property "attachmentsSegment"
         * @returns Reference to "this" in order to allow method chaining
         */
        setAttachmentsSegment(attachmentsSegment: string): this;

        // property: draftOnly

        /**
         * Gets current value of property "draftOnly".
         *
         * When true, upload/delete is enabled only when the entity is in draft mode (IsActiveEntity = false).
        When false, draft lifecycle is managed automatically.
         *
         * Default value is: true
         * @returns Value of property "draftOnly"
         */
        getDraftOnly(): boolean;

        /**
         * Sets a new value for property "draftOnly".
         *
         * When true, upload/delete is enabled only when the entity is in draft mode (IsActiveEntity = false).
        When false, draft lifecycle is managed automatically.
         *
         * When called with a value of "null" or "undefined", the default value of the property will be restored.
         *
         * Default value is: true
         * @param [draftOnly=true] New value for property "draftOnly"
         * @returns Reference to "this" in order to allow method chaining
         */
        setDraftOnly(draftOnly: boolean): this;

        // property: enabled

        /**
         * Gets current value of property "enabled".
         *
         * Controls whether upload and delete are enabled.
        When false, both are disabled regardless of draft state.
         *
         * Default value is: true
         * @returns Value of property "enabled"
         */
        getEnabled(): boolean;

        /**
         * Sets a new value for property "enabled".
         *
         * Controls whether upload and delete are enabled.
        When false, both are disabled regardless of draft state.
         *
         * When called with a value of "null" or "undefined", the default value of the property will be restored.
         *
         * Default value is: true
         * @param [enabled=true] New value for property "enabled"
         * @returns Reference to "this" in order to allow method chaining
         */
        setEnabled(enabled: boolean): this;
    }
}
