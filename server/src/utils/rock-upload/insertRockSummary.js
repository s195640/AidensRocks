async function insertRockSummary(
  client,
  {
    rockNumber,
    rockNumberQr,
    location,
    date,
    comment,
    name,
    email,
    timestamp,
    uuid,
  }
) {
  const result = await client.query(
    `
  INSERT INTO journey (
    rock_qr_number, rock_number, location, date,
    comment, name, email, upload_timestamp, uuid
  )
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
  RETURNING rps_key
  `,
    [
      rockNumberQr,
      rockNumber,
      location,
      date,
      comment,
      name,
      email,
      timestamp,
      uuid,
    ]
  );
  return result.rows[0].rps_key;
}

module.exports = insertRockSummary;
