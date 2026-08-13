import ContentBody from "../../components/content-body/ContentBody";
import RichText from "../../adminContent/RichText";
import { usePageContent } from "../../adminContent/usePageContent";

const HonoringAiden = () => {
  const { body, loading } = usePageContent("honoring-aiden");
  const useRichText = !loading && body;

  return (
    <div>
      <ContentBody fullHeight={false}>
        {useRichText ? <RichText html={body} /> : <p>More about Aiden, coming soon.</p>}
      </ContentBody>
    </div>
  );
};

export default HonoringAiden;
