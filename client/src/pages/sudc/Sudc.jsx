import "./Sudc.css";

const Sudc = () => {
  return (
    <div className="sudc-page">
      <div className="sudc-banner-wrapper">
        <div className="sudc-banner" />
      </div>

      <div className="sudc-container">
        <p>
          Being a part of the medical community for over 15 years, I have never
          heard of Sudden Unexpected Death in Child. I wasn’t aware it was even
          a discussion amongst the medical community at all. So I wanted to
          share a few facts:
        </p>

        <ul>
          <li>
            SUDC is a category of death in children between the ages of 1–18
            that remains unexplained after investigations, including autopsy.
          </li>
          <li>
            It affects approximately 450+ children aged 1–18 years in the US
            annually (approximately 1 in every 100,000).
          </li>
          <li>
            It is most common in toddlers; it is the 5th leading category of
            death in children ages 1–4.
            <ul>
              <li>
                Most are predominantly males (60%) born at term as singletons.
              </li>
              <li>Some research has association with febrile seizures.</li>
              <li>Most are unwitnessed during sleep period.</li>
              <li>Most found prone.</li>
            </ul>
          </li>
        </ul>

        <p>
          Please, if possible, help us share and spread awareness to the
          communities. Our hope is that no parents will ever have to go through
          this agony. Hopefully this website will bring some awareness, but if
          you would like to impact the SUDC Foundation — who help other families
          directly impacted by SUDC and support research studies to stop it from
          happening — you can donate at the following website:{" "}
          <a
            href="https://sudc.org/donate/"
            target="_blank"
            rel="noopener noreferrer"
            className="sudc-link"
          >
            https://sudc.org/donate/
          </a>
        </p>
      </div>
    </div>
  );
};

export default Sudc;
