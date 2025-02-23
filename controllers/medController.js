const Medicine = require("../models/medicine");
const formatMed = require("../utils/formatMed");
const checkMedStatus = require("../utils/medStatus");
const moment = require("moment");

//adding new medicine to Mongodb
exports.addMedicine = async (req, res) => {
  const {
    name,
    numberOfTablet,
    doseQuantity,
    expiryDate,
    time1,
    time2,
    time3,
  } = req.body;

  try {
    // Checking if medicine already registered
    const existingMedicine = await Medicine.findOne(req.body);

    if (existingMedicine) {
      return res.render("addProduct", {
        scsMsg: null,
        errMsg: "Medicine already registered!",
      });
    }

    const medicine = new Medicine(req.body);
    await medicine.save();

    res.render("home", {
      scsMsg: "Medicine has been added successfully!",
      errMsg: null,
    });
  } catch (error) {
    console.log(error);
    res.render("addProduct", {
      scsMsg: null,
      errMsg: "Something went wrong. Try again!",
    });
  }
};

//after taking medicine update Quantity in database
exports.updateMedAmount = async (req, res) => {
  try {
    const { status } = req.body; // Should be "Upcoming"
    const medId = req.params.id;

    const medicine = await Medicine.findById(medId);
    if (!medicine) {
      return res
        .status(404)
        .json({ success: false, message: "Medicine not found" });
    }

    const doseQuantity = Number(medicine.doseQuantity) || 0;
    const currentTablets = Number(medicine.numberOfTablets) || 0;

    if (currentTablets < doseQuantity) {
      return res.json({ success: false, message: "Medicine is out of stock!" });
    }

    // Updating both status and numberOfTablets
    const updatedMedicine = await Medicine.findByIdAndUpdate(
      medId,
      {
        $set: { status: status },
        $inc: { numberOfTablets: -doseQuantity },
      },
      { new: true } // Ensures the updated document is returned
    );

    res.json({ success: true, updatedMedicine });
  } catch (error) {
    console.log(error);
    res.json({ success: false });
  }
};

//Updating table when changing data in MongoDB
exports.updateProductList = async (req, res) => {
  try {
    const medicines = await Medicine.find().lean();
    const checkedMed = checkMedStatus(medicines);

    const formattedDateMed = formatMed(checkedMed);
    res.render("productList", { Medicines: formattedDateMed });
  } catch (err) {
    console.log(err);
  }
};

// INVENTORY SECTION
exports.updateInventory = (req, res) => {
  try {
    const topTwoMed = req.checkedMed
      .filter((med) =>
        med.status !== "Upcoming" ? true : med.status == "Upcoming"
      )
      .slice(0, 2);

    const formattedDateMed = formatMed(topTwoMed);
    return formattedDateMed;
  } catch (err) {
    console.log(err);
  }
};

//EXPIRATION AND ALERT SECTION
exports.updateAlerts = async () => {
  try {
    const medicines = await Medicine.find();

    const alerts = medicines.flatMap((med) => {
      const alertsList = [];

      // Low Stock Alert
      if (med.numberOfTablets < 5) {
        alertsList.push({
          medicineName: med.name,
          type: "low-stock", 
          stock: med.numberOfTablets,
        });
      }

      // Expiring Soon Alert
      const today = moment();
      const expiryDate = moment(med.expiryDate);
      if (expiryDate.diff(today, "days") <= 10) {
        alertsList.push({
          medicineName: med.name,
          type: "expiring-soon", 
          expiryDate: expiryDate.format("DD-MM-YY"),
        });
      }
      return alertsList;
    });
    return alerts;
  } catch (err) {
    console.error("Error fetching alerts:", err);
  }
};

// REMAINDER SECTION
exports.updateReminders = async () => {
  try {
    const medicines = await Medicine.find();

    const currentTime = moment();
    const upcomingThresholdMinutes = 60; // Doses within next 1 hour

    const reminderAlerts = medicines.flatMap((med) => {
      // Collecting available times
      const doseTimes = [med.time1, med.time2, med.time3].filter(Boolean);

      return doseTimes
        .map((time) => {
          // Parsing dose time for today
          const doseMoment = moment(time, "HH:mm"); // Assuming "HH:mm" format in DB
          const now = moment();

          // If the dose time is in the past today, shift to tomorrow
          if (doseMoment.isBefore(now, "minute")) {
            doseMoment.add(1, "day");
          }

          const diffMinutes = doseMoment.diff(now, "minutes");

          if (diffMinutes < 0) {
            return {
              medicineName: med.name,
              type: "missed",
              time: moment(time, "HH:mm").format("hh:mm A"),
            };
          } else if (diffMinutes <= upcomingThresholdMinutes) {
            return {
              medicineName: med.name,
              type: "upcoming",
              time: doseMoment.format("hh:mm A"),
            };
          }

          return null; // Skip if not missed or upcoming
        })
        .filter(Boolean); // Remove nulls
    });

    return reminderAlerts;
  } catch (err) {
    console.error("Error fetching reminders:", err);
    throw new Error("Failed to fetch reminders");
  }
};

//USAGE SECTION
exports.updateRecentUsage = async (req, res) => {
  const { medicineId } = req.params;

  try {
    const med = await Medicine.findById(medicineId);
    if (!med) return { error: "Medicine not found" };

    med.lastUsedDate = new Date();
    await med.save();

    return { message: "Recent usage updated", lastUsedDate: med.lastUsedDate };
  } catch (err) {
    console.error("Error updating recent usage:", err);
    return { error: "Failed to update usage" };
  }
};


//WHOLE DASHBOARD RENDERING
exports.updateDashboard = async (req, res) => {
  try {
    // Fetch all section data in parallel
    const [inventoryData, alertData, reminderData] = await Promise.all([
      exports.updateInventory(req, res), // Pass req, res for inventory
      exports.updateAlerts(),
      exports.updateReminders(),
      exports.updateRecentUsage(req, res),
    ]);

    // Render dashboard with all data
    res.render("dashboard", {
      Medicines: inventoryData, // For inventory section
      Alerts: alertData, // For alerts section
      Reminders: reminderData, // For reminders section
    });
  } catch (err) {
    console.error("Error rendering dashboard:", err);
    res.status(500).send("Server Error");
  }
};
