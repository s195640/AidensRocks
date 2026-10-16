// Which journey view a rock's stops are being looked at in (Site
// Tracking): RockJourneyDialog provides its open_id and source, so a stop's
// location / comment / photo views link to that rock_view. Stops shown
// straight in the Track the Rocks list have no open view.
import { createContext } from "react";

const JourneyActivityContext = createContext({ openId: null, source: "list" });

export default JourneyActivityContext;
