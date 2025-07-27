import BkgImage from "../../components/bkgimage/BkgImage";
import Counter from "../../components/counter/Counter";
import "./Home.css";

const Home = () => {
  const backgroundImage = `/media/bkg/homebkg1.jpg`;

  return (
    <div className="home-container">
      <Counter />
      <BkgImage
        backgroundImage={backgroundImage}
        scrollTargetSelector=".additional-content"
      >
        <h1>Aiden's Rocks</h1>
        <p>In Loving Memory of Aiden Armitage</p>
        <p>9/14/2022 - 5/20/2025</p>
      </BkgImage>

      {/* Scrollable content section */}
      <div className="additional-content">
        <div className="additional-content-inner">
          <h2>Journey Through the World With Aiden’s Rocks</h2>
          <p>
            On September 14, 2022 at a mere 5lbs 4oz at 3:02 pm, Aiden Asher
            Armitage was born into the world, our little AAA. This birthday was
            shared with his mommy; making her a first time mom on her 32nd
            birthday. He was loved deeply and utterly by mommy (Ashley) and
            daddy (Chris) Armitage and SOOOOO many others. He has a very large
            family in which he loved and adored.
          </p>
          <p>
            The afternoon of May 20, 2025, appeared to be a normal day. Aiden
            (2.5 years old) went down for his normal nap. The difference was
            this day, he did not wake up. Our anchor to this world, our purpose,
            swiftly disintegrated as we will forever grief the loss of our
            perfect little boy; “the greatest baby of all the babies in all the
            lands in all the world’s”
          </p>
          <p>
            Aiden was a lover of all life. He was a true adventurer, a traveler,
            and a perfect little healthy boy. He loved “paddle paddle”
            (swimming), he loved “jump jump” (gymnastics, trampoline), he loved
            “rocks”, he loved “park”, he loved “hike”, he loved “outside.” He
            just loved all aspects of life. He loved finding rocks and throwing
            them at any tree or to any body of water.
          </p>
          <p>
            At birth, we promised him a life of adventure, we promised to show
            him the world. Our first promises we whispered in his ear soon after
            he came out screaming. Mommy promised to have one type of adventure
            every day placed into his life. During his short 32 months of life
            he has seen 12 US national parks, 2 international national parks, 3
            international countries stamped on his Passport plus an additional
            island, and undocumented amount of US states. We did some sort of
            activity every single day with him to keep him engaged, nurtured,
            and exposed to all areas of life. There was already booked vacations
            for 8 more national parks and another international trip for the
            remainder of the year before his unexpected, agonizing passing. Not
            having him here to experience all we had planned for his life is the
            most unfathomable thought we must now live with each and every day
            for the rest of our lives. Living FOR Aiden instead of WITH Aiden is
            something that can not fill the huge void.
          </p>
          <p>So,</p>
          <p>
            We created this site because even though Aiden’s adventurous
            physical presence is not with us, we want to keep Aiden’s
            adventurous spirit alive. We want to keep our promise TO him and
            keep a purpose FOR him. We cannot watch him grow, but we can watch
            his adventures grow with his rocks. His daily experiences we
            promised him will be seen through the daily adventures of his rocks.
            This will be something we will look forward to seeing upon each
            awaking day as we await our reunion through Heaven’s doors.{" "}
          </p>
          <p>
            So we ask for your help. Take a look around this site. Share the
            rock you found, hey…even ask for another rock. Learn/Read/donate to
            the SUDC foundation to spread awareness.
          </p>
          <p>
            Looking for more adventures and want to share them with more of
            Aiden’s rocks? Getting the rocks will be completely free, just tell
            us how many and where to send them! Please take pictures in the
            places you may go; please help in keeping his memory alive for the
            rest of our days.{" "}
          </p>
          <p>
            Aiden Asher Armitage, Mr. A …this is for you….we love you & miss you
            more than words can say.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Home;
