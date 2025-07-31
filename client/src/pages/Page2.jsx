import RockJourney from "../components/rock-journey/RockJourney";

function Page2() {
  return (
    <div style={{ padding: "80px 20px", textAlign: "center" }}>
      <h1>Page 2</h1>
      <RockJourney
        rockNumber={1}
        collections={[
          {
            path: "/media/rocks/1/2025-07-09/e5533274-05f5-4d04-bb05-40989e2dc40d",
            imageNames: [
              "[1][2025-07-09][e5533274-05f5-4d04-bb05-40989e2dc40d][3].webp",
              "[1][2025-07-09][e5533274-05f5-4d04-bb05-40989e2dc40d][5].webp",
              "[1][2025-07-19][cbcb97e5-63b2-45a1-9eb9-2fe2e18c5574][1].webp",
              "[1][2025-07-19][cbcb97e5-63b2-45a1-9eb9-2fe2e18c5574][3].webp",
              "[1][2025-07-19][cbcb97e5-63b2-45a1-9eb9-2fe2e18c5574][4].webp",
            ],
            date: "3/15/2025",
            location:
              "New York, NY New York, NY New York, NY  New York, NY New York, NY",
            comment:
              "A windy day with clear skies.  A windy day with clear skies.  A windy day with clear skies.  A windy day with clear skies.  A windy day with clear skies.  A windy day with clear skies.  A windy day with clear skies.  A windy day with clear skies.  A windy day with clear skies.  A windy day with clear skies.  A windy day with clear skies.",
          },
          {
            path: "/media/rocks/1/2025-07-09/e5533274-05f5-4d04-bb05-40989e2dc40d",
            imageNames: [
              "[1][2025-07-19][cbcb97e5-63b2-45a1-9eb9-2fe2e18c5574][1].webp",
              "[1][2025-07-19][cbcb97e5-63b2-45a1-9eb9-2fe2e18c5574][4].webp",
            ],
            date: "4/10/2025",
            location: "Boston, MA",
            comment: "Found near the harbor.",
          },
        ]}
      />{" "}
    </div>
  );
}

export default Page2;
