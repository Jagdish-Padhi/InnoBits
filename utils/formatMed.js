const formatMed = (medicines) => {
  return medicines.map((med) => {
    if (med.expiryDate) {
      const date = new Date(med.expiryDate);
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = String(date.getFullYear()).slice(-2);

      return {
        ...med,
        expiryDate: `${day}-${month}-${year}`,
      };
    }
    return med;
  });
};

module.exports = formatMed;
