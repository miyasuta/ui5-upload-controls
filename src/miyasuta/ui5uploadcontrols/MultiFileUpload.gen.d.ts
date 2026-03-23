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
         * Navigation property segment name for the attachments composition (e.g. "attachments").
         */
        getAttachmentsSegment(): string;

        /**
         * Navigation property segment name for the attachments composition (e.g. "attachments").
         */
        setAttachmentsSegment(attachmentsSegment: string): this;

        // property: draftOnly

        /**
         * When true, upload/delete is enabled only when the entity is in draft mode (IsActiveEntity = false).
        When false, draft lifecycle is managed automatically.
         */
        getDraftOnly(): boolean;

        /**
         * When true, upload/delete is enabled only when the entity is in draft mode (IsActiveEntity = false).
        When false, draft lifecycle is managed automatically.
         */
        setDraftOnly(draftOnly: boolean): this;

        // property: enabled

        /**
         * Controls whether upload and delete are enabled.
        When false, both are disabled regardless of draft state.
         */
        getEnabled(): boolean;

        /**
         * Controls whether upload and delete are enabled.
        When false, both are disabled regardless of draft state.
         */
        setEnabled(enabled: boolean): this;
    }
}
