import { ExampleColor } from 'miyasuta/ui5uploadcontrols/library';
import Example from 'miyasuta/ui5uploadcontrols/Example';

// Create a new instance of the Example control and
// place it into the DOM element with the id "content"
new Example({
  text: 'Example',
  color: ExampleColor.Highlight,
}).placeAt('content');
