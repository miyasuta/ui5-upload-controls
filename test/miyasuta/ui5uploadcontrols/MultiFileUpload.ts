import MultiFileUpload from 'miyasuta/ui5uploadcontrols/MultiFileUpload';

// Create a new instance of the MultiFileUpload control and
// place it into the DOM element with the id "content"
new MultiFileUpload({
  attachmentsSegment: "attachments",
  draftOnly: true
}).placeAt('content');
