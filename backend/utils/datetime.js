function logInsertedTime(label) {
  console.log(`[TIME] ${label}:`, new Date().toISOString());
}

function serializeTimestamp(value) {
  if (!value) {
    return value;
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toISOString();
}

function serializeRows(rows, keys = ["created_at", "updated_at", "remind_at"]) {
  return rows.map((row) => {
    const nextRow = { ...row };

    for (const key of keys) {
      if (key in nextRow) {
        nextRow[key] = serializeTimestamp(nextRow[key]);
      }
    }

    return nextRow;
  });
}

module.exports = { logInsertedTime, serializeRows, serializeTimestamp };
