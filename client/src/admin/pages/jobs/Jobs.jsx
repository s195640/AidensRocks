import CreateImages from "../../components/create-images/CreateImages";
import CreateQRCodes from "../../components/create-qr-codes/CreateQRCodes";
import PrintMultiImages from "../../components/print-multi-images/PrintMultiImages";
import styles from "./Jobs.module.css";

const Jobs = () => {
  return (
    <div className={styles.jobsContainer}>
      <div className={styles.jobsStack}>
        <CreateImages />
        <CreateQRCodes />
        <PrintMultiImages />
      </div>
    </div>
  );
};

export default Jobs;
