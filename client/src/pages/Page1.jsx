import TestDatabase from "../components/testdatabase/TestDatabase";

function Page1() {
  return (
    <div style={{ padding: "80px 20px", textAlign: "center" }}>
      <TestDatabase />
      <h1>Page 1</h1>
      <p>This is the content for Page 1.</p>
    </div>
  );
}

export default Page1;
