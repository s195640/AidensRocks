import CreateImages from "../../components/create-images/CreateImages";
import CreateQRCodes from "../../components/create-qr-codes/CreateQRCodes";
import CreateSingleQRCode from "../../components/create-single-qr-code/CreateSingleQRCode";
import PrintMultiImages from "../../components/print-multi-images/PrintMultiImages";
import SendEmailsCatchup from "../../components/send-emails-catchup/SendEmailsCatchup";
import styles from "./Jobs.module.css";

const Jobs = () => {
  return (
    <div className={styles.jobsContainer}>
      <div className={styles.jobsStack}>
        <CreateImages />
        <CreateQRCodes />
        <CreateSingleQRCode />
        <PrintMultiImages />
        <SendEmailsCatchup />
      </div>
    </div>
  );
};

export default Jobs;
