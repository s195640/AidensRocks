import RockBanner from "../components/rock-journey/rock-banner/RockBanner";
import RockCollection from "../components/rock-journey/rock-collection/RockCollection";

function Page1() {
  return (
    <div style={{ padding: "80px 20px", textAlign: "center" }}>
      <h1>Page 1</h1>
      <RockBanner
        rockNumber={1}
        totalTrips={2}
        startDate="2022-01-01"
        latestDate="2025-07-28"
      />
      <br></br>
      <br></br>
      <br></br>
      <RockCollection
        path="/media/rocks/1/2025-07-09/e5533274-05f5-4d04-bb05-40989e2dc40d"
        imageNames={[
          "[1][2025-07-09][e5533274-05f5-4d04-bb05-40989e2dc40d][3].webp",
          "[1][2025-07-09][e5533274-05f5-4d04-bb05-40989e2dc40d][5].webp",
          "[1][2025-07-19][cbcb97e5-63b2-45a1-9eb9-2fe2e18c5574][1].webp",
          "[1][2025-07-19][cbcb97e5-63b2-45a1-9eb9-2fe2e18c5574][3].webp",
          "[1][2025-07-19][cbcb97e5-63b2-45a1-9eb9-2fe2e18c5574][4].webp",
        ]}
        date="7/27/2025"
        location="Blue Ridge Park"
        comment="This was an amazing journey through the ridge with some incredible finds!"
      />{" "}
    </div>
  );
}

export default Page1;
