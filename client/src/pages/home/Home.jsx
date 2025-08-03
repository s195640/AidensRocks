import BkgImage from "../../components/bkgimage/BkgImage";
import Counter from "../../components/counter/Counter";
import FloatingRockLink from "../../components/floating-rock-link/FloatingRockLink";
import "./Home.css";

const Home = () => {
  const backgroundImage = `/media/bkg/home_bkg.webp`;

  return (
    <div className="home-container">
      <FloatingRockLink />
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
            On September 14, 2022 at a mere 5lbs4oz at 3:02 pm, Aiden Asher
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
            lands in all the world’s.”
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
            he came out screaming. During his short 32 months of life he has
            seen 12 US national parks, 2 international national parks, 3
            international countries stamped on his Passport plus an additional
            island, and undocumented amount of US states. He had 8 more national
            parks planned for him the year he passed. We did some sort of
            activity every single day with him to keep him engaged, nurtured,
            and exposed to all areas of life.
          </p>
          <p>
            Not having him here to experience all we had planned for his life is
            the most unfathomable thought we live with every day.
          </p>
          <p>
            Living FOR Aiden instead of WITH Aiden…no parent should have to say
            those words about their child.
          </p>
          <p>So,</p>
          <p>
            We created this site because even though Aiden’s adventurous
            physical presence is not with us, we want to keep Aiden’s
            adventurous spirit alive.
          </p>
          <p>We want to keep our promise TO him and keep a purpose FOR him.</p>
          <p>
            We cannot watch him grow, but we can watch his adventures grow with
            his rocks.
          </p>
          <p>
            His daily experiences we promised him will be seen through the daily
            adventures of his rocks.
          </p>
          <p>
            This will be something we will look forward to seeing upon each
            awaking day as we await our reunion through Heaven’s doors.
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
