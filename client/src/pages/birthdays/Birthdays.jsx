import ContentBody from "../../components/content-body/ContentBody";
import RichText from "../../adminContent/RichText";
import { usePageContent } from "../../adminContent/usePageContent";
import BirthdayAlbums from "../../components/birthday-albums/BirthdayAlbums";

const Birthdays = () => {
  const { body, loading } = usePageContent("birthdays");
  const useRichText = !loading && body;

  return (
    <div>
      <ContentBody fullHeight={false}>
        {useRichText ? (
          <RichText html={body} />
        ) : (
          <p>
            Every year, we celebrate Aiden’s birthday by sending more of his
            rocks out into the world in his memory. These are the albums from
            those celebrations.
          </p>
        )}
      </ContentBody>
      <BirthdayAlbums title="Birthday Albums" />
    </div>
  );
};

export default Birthdays;
