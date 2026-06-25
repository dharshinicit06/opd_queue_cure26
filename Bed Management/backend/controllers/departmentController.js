const db = require("../config/db");

// GET - Fetch All Departments
exports.getAllDepartments = (req, res) => {
  const query = "SELECT * FROM department ORDER BY deptId DESC";

  db.query(query, (err, result) => {
    if (err) {
      return res.status(500).json({
        message: "Error fetching departments",
        error: err.message,
      });
    }

    res.status(200).json({
      message: "Departments fetched successfully",
      departments: result,
    });
  });
};

// POST - Add Department
exports.addDepartment = (req, res) => {
  const { departmentName, description, location } = req.body;

  if (!departmentName || !departmentName.toString().trim()) {
    return res.status(400).json({
      message: "Department name is required.",
    });
  }

  const query = `
    INSERT INTO department (deptName, description, location)
    VALUES (?, ?, ?)
  `;

  db.query(query, [departmentName, description, location], (err, result) => {
    if (err) {
      return res.status(500).json({
        message: "Error adding department",
        error: err.message,
      });
    }

    // Fetch the newly created department row and return it for immediate frontend update
    db.query("SELECT * FROM department WHERE deptId = ?", [result.insertId], (err2, rows) => {
      if (err2) {
        return res.status(500).json({
          message: "Department added but failed to fetch new department",
          error: err2.message,
          departmentId: result.insertId,
        });
      }

      return res.status(201).json({
        message: "Department added successfully",
        department: rows[0],
      });
    });
  });
};

// PUT - Update Department
exports.updateDepartment = (req, res) => {
  const deptId = req.params.id;
  const { departmentName, description, location } = req.body;

  const query = `
    UPDATE department
    SET deptName = ?, description = ?, location = ?
    WHERE deptId = ?
  `;

  db.query(query, [departmentName, description, location, deptId], (err) => {
    if (err) {
      return res.status(500).json({
        message: "Error updating department",
        error: err.message,
      });
    }

    res.status(200).json({
      message: "Department updated successfully",
    });
  });
};

// DELETE - Delete Department
exports.deleteDepartment = (req, res) => {
  const deptId = req.params.id;

  const checkDoctorsQuery = "SELECT COUNT(*) AS doctorCount FROM doctor WHERE deptId = ?";
  const deleteDepartmentQuery = "DELETE FROM department WHERE deptId = ?";

  db.query(checkDoctorsQuery, [deptId], (err, result) => {
    if (err) {
      return res.status(500).json({
        message: "Error checking department dependencies",
        error: err.message,
      });
    }

    if (result[0]?.doctorCount > 0) {
      return res.status(400).json({
        message: "Cannot delete department while doctors are assigned to it. Remove or reassign doctors first.",
      });
    }

    db.query(deleteDepartmentQuery, [deptId], (err) => {
      if (err) {
        return res.status(500).json({
          message: "Error deleting department",
          error: err.message,
        });
      }

      res.status(200).json({
        message: "Department deleted successfully",
      });
    });
  });
};