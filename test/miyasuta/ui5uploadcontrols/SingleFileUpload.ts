import SingleFileUpload from 'miyasuta/ui5uploadcontrols/SingleFileUpload';

// Create a new instance of the SingleFileUpload control and
// place it into the DOM element with the id "content"
new SingleFileUpload({
  fileNameProperty: "fileName",
  contentProperty: "content",
  draftOnly: true
}).placeAt('content');
